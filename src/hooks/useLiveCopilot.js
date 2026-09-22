import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
// no-inline: emit a real file — addModule() on an inlined data: URL isn't reliable across browsers.
import workletUrl from '../lib/pcmWorklet.js?url&no-inline';
import { copilotSocketUrl, initialLiveState, liveReducer } from '../lib/liveCopilot';
import { endInterviewSession, mintInterviewTicket } from '../services/apiInterview';

// ── useLiveCopilot — the live interview audio loop ───────────────────────────
//
//   Start ─► getDisplayMedia (the meeting TAB, with its audio; video dropped)
//         ─► AudioContext(16 kHz) → pcm16-encoder worklet → 80 ms Int16 frames
//         ─► POST ws-ticket (90 s) ─► WebSocket to the copilot sidecar
//         ◄─ ready / partial / question / answer_delta / answer / error
//
//   Stop  ─► {"type":"end"} (the ONLY thing that ends the interview), then the
//            tracks, the AudioContext and the socket are all closed.
//
// Everything else is resumable, matching the sidecar: a dropped socket shows
// "Reconnect" (fresh ticket, same audio), the browser's "Stop sharing" returns
// to Start, and leaving the page just closes the socket.
//
// status: idle | starting | connecting | listening | dropped | stopping | finished

const WS_BASE = (import.meta.env.VITE_COPILOT_WS_URL || '').trim();
const TARGET_RATE = 16000;
const MAX_BUFFERED_BYTES = 256 * 1024;   // ~8 s of audio; beyond this the network is stalled — drop frames
const END_GRACE_MS = 4000;               // wait this long for the server to close after "end"

const NO_TAB_AUDIO =
  "We can't hear the interview yet. Pick your meeting tab and tick “Share tab audio”, then try again.";

function closeReason(code) {
  if (code === 4401) return 'Your connection pass expired.';
  if (code === 1011) return "We couldn't load this interview.";
  return 'The connection dropped.';
}

/**
 * options.onAudioShared(): called once the tab's audio has been shared, still
 * inside Start. The page uses it to try opening the floating window.
 */
export function useLiveCopilot(sessionId, options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [status, setStatus] = useState('idle');
  const [problem, setProblem] = useState('');       // shown with Start / Reconnect
  const [view, dispatch] = useReducer(liveReducer, initialLiveState);
  const r = useRef({ ctx: null, stream: null, track: null, source: null, node: null, ws: null,
                     stopping: false, unmounted: false });

  const configured = WS_BASE.length > 0;

  // ── audio ─────────────────────────────────────────────────────────────────
  const teardownAudio = useCallback(() => {
    const a = r.current;
    if (a.node) { a.node.port.onmessage = null; a.node.disconnect(); }
    if (a.source) a.source.disconnect();
    if (a.stream) a.stream.getTracks().forEach((t) => t.stop());
    if (a.ctx && a.ctx.state !== 'closed') a.ctx.close().catch(() => {});
    Object.assign(a, { ctx: null, stream: null, track: null, source: null, node: null });
  }, []);

  const buildAudioGraph = useCallback(async (ctx, stream) => {
    let context = ctx;
    await context.audioWorklet.addModule(workletUrl);
    let source;
    try {
      source = context.createMediaStreamSource(stream);
    } catch {
      // Some browsers refuse to connect a stream into a context at another
      // rate. Fall back to the native rate; the worklet downsamples to 16 kHz.
      await context.close();
      context = new AudioContext();
      await context.audioWorklet.addModule(workletUrl);
      source = context.createMediaStreamSource(stream);
    }
    const node = new AudioWorkletNode(context, 'pcm16-encoder', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    });
    node.port.onmessage = (e) => {
      const ws = r.current.ws;
      if (ws && ws.readyState === WebSocket.OPEN && ws.bufferedAmount < MAX_BUFFERED_BYTES) {
        ws.send(e.data);
      }
    };
    // The graph must reach the destination to be pulled, but the user must not
    // hear the tab twice — route it through a muted gain.
    const mute = context.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(context.destination);
    if (context.state === 'suspended') await context.resume();
    Object.assign(r.current, { ctx: context, source, node });
  }, []);

  // ── socket ────────────────────────────────────────────────────────────────
  const closeSocket = useCallback(() => {
    const ws = r.current.ws;
    r.current.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000);
    }
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setProblem('');
    let ticket;
    try {
      ({ ticket } = await mintInterviewTicket(sessionId));   // right before connecting: it lasts 90 s
    } catch (err) {
      if (r.current.unmounted) return;
      if (err.status === 409) {
        teardownAudio();
        setStatus('finished');
        return;
      }
      setProblem(err.status === 503 ? "Live help isn't available right now." : err.message);
      setStatus('dropped');
      return;
    }
    if (r.current.unmounted || r.current.stopping) return;

    const ws = new WebSocket(copilotSocketUrl(WS_BASE, sessionId, ticket));
    r.current.ws = ws;
    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type === 'ready') setStatus('listening');
      dispatch(msg);
    };
    ws.onerror = () => {};              // always followed by onclose, which decides
    ws.onclose = (event) => {
      if (r.current.ws !== ws) return;  // an old socket we already replaced
      r.current.ws = null;
      if (r.current.unmounted) return;
      if (r.current.stopping || event.code === 1000) {
        teardownAudio();
        setStatus('finished');
        return;
      }
      setProblem(closeReason(event.code));
      setStatus('dropped');
    };
  }, [sessionId, teardownAudio]);

  // ── public actions ────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!configured) return;
    setProblem('');
    setStatus('starting');
    r.current.stopping = false;

    // Created inside the click, before the picker, so the browser counts it as
    // user-started audio and doesn't leave it suspended.
    let ctx;
    try {
      ctx = new AudioContext({ sampleRate: TARGET_RATE });
    } catch {
      ctx = new AudioContext();
    }

    let stream;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw Object.assign(new Error(), { name: 'NotSupportedError' });
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        // Hints (ignored where unsupported): don't offer this ApplyDir tab,
        // and allow system audio for desktop meeting apps.
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      });
    } catch (err) {
      ctx.close().catch(() => {});
      setStatus('idle');
      setProblem(err?.name === 'NotAllowedError'
        ? 'Sharing was cancelled. Press Start when your interview begins.'
        : "Your browser can't share tab audio. Use Chrome or Edge on a computer.");
      return;
    }

    // Only the sound is needed — drop the picture at once.
    stream.getVideoTracks().forEach((t) => t.stop());
    const [track] = stream.getAudioTracks();
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
      setStatus('idle');
      setProblem(NO_TAB_AUDIO);
      return;
    }
    const audioOnly = new MediaStream([track]);
    Object.assign(r.current, { stream: audioOnly, track });
    optionsRef.current.onAudioShared?.();

    // The browser's own "Stop sharing" bar: stop listening, but don't end the
    // interview — they can press Start again.
    track.addEventListener('ended', () => {
      if (r.current.stopping || r.current.unmounted || r.current.track !== track) return;
      teardownAudio();
      closeSocket();
      setStatus('idle');
      setProblem('Sharing stopped. Press Start and pick your meeting tab to keep going.');
    });

    try {
      await buildAudioGraph(ctx, audioOnly);
    } catch {
      teardownAudio();
      setStatus('idle');
      setProblem("We couldn't start listening in this browser. Try Chrome or Edge.");
      return;
    }
    await connect();
  }, [configured, buildAudioGraph, closeSocket, connect, teardownAudio]);

  const reconnect = useCallback(async () => {
    closeSocket();
    if (!r.current.track || r.current.track.readyState !== 'live') {
      teardownAudio();
      setStatus('idle');
      setProblem('Press Start and pick your meeting tab again.');
      return;
    }
    await connect();
  }, [closeSocket, connect, teardownAudio]);

  const stop = useCallback(async () => {
    r.current.stopping = true;
    setStatus('stopping');
    teardownAudio();                    // stop listening immediately
    const ws = r.current.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // The sidecar ends the interview in Django, then closes with 1000.
      ws.send(JSON.stringify({ type: 'end' }));
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, END_GRACE_MS);
        ws.addEventListener('close', () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    } else {
      // No live socket to carry "end" — end it over REST instead.
      try { await endInterviewSession(sessionId); } catch { /* shown as finished either way */ }
    }
    closeSocket();
    if (!r.current.unmounted) setStatus('finished');
  }, [closeSocket, sessionId, teardownAudio]);

  // Leaving the page is not "Stop": close quietly, the interview stays resumable.
  useEffect(() => {
    const refs = r.current;
    refs.unmounted = false;
    return () => {
      refs.unmounted = true;
      closeSocket();
      teardownAudio();
    };
  }, [closeSocket, teardownAudio]);

  return { status, problem, view, configured, start, stop, reconnect };
}
