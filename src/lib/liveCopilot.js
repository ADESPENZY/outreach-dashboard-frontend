// Live copilot — pure pieces (no browser APIs), shared by useLiveCopilot and
// the page. Kept free of side effects so they can be exercised against a real
// sidecar stream outside the browser.

/** `${base}/ws/interview/<id>?ticket=<ticket>` — base is VITE_COPILOT_WS_URL. */
export function copilotSocketUrl(base, sessionId, ticket) {
  const root = (base || '').trim().replace(/\/+$/, '');
  return `${root}/ws/interview/${encodeURIComponent(sessionId)}?ticket=${encodeURIComponent(ticket)}`;
}

export const initialLiveState = {
  role: null,          // from "ready"
  bankSize: 0,
  caption: '',         // "partial": the question forming right now
  question: '',        // last completed question
  answer: '',          // streaming or final answer text
  answerDone: false,
  source: null,        // 'cached' | 'live' once final
  latencyMs: null,
  notice: '',          // last non-fatal "error" detail
};

/**
 * Fold one sidecar message into the view state. Unknown types (e.g. "echo")
 * leave the state untouched.
 */
export function liveReducer(state, msg) {
  switch (msg?.type) {
    case 'ready':
      return { ...state, role: msg.role ?? null, bankSize: msg.bank_size ?? 0 };
    case 'partial':
      return { ...state, caption: msg.text || '' };
    case 'question':
      // A new question supersedes whatever was being answered.
      return {
        ...state, question: msg.text || '', caption: '', notice: '',
        answer: '', answerDone: false, source: null, latencyMs: null,
      };
    case 'answer_delta':
      if (state.answerDone) return state;          // late piece of a finished answer
      return { ...state, answer: state.answer + (msg.text || '') };
    case 'answer':
      return {
        ...state, answer: msg.text || state.answer, answerDone: true,
        source: msg.source || null, latencyMs: msg.latency_ms ?? null,
      };
    case 'error':
      return { ...state, notice: msg.detail || 'Something went wrong.' };
    case 'reset':
      return initialLiveState;
    default:
      return state;
  }
}

const STAR = { S: 'Situation', T: 'Task', A: 'Action', R: 'Result' };
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;
const STAR_LABEL = /^(?:\*\*)?([STAR])(?:\*\*)?\s*[:–-]\s*(.*)$/;

/**
 * The answer format is fixed by the prompts (lead line + 3-5 "- " bullets,
 * "- S: …" for STAR), so this reads exactly that — a deliberate tiny subset of
 * markdown rendered as React text, never as HTML. Works on a half-streamed
 * answer too: an unfinished last line simply shows as it grows.
 *
 * → { lead: string[], bullets: { label: string|null, text: string }[] }
 */
export function parseAnswer(text) {
  const lead = [];
  const bullets = [];
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(BULLET);
    if (bullet) {
      const star = bullet[1].match(STAR_LABEL);
      bullets.push(star ? { label: STAR[star[1]], text: star[2] } : { label: null, text: bullet[1] });
    } else if (bullets.length) {
      // Prose after the bullets: keep it with the last bullet rather than lose it.
      bullets[bullets.length - 1].text += ` ${line}`;
    } else {
      lead.push(line.replace(/^#+\s*/, ''));
    }
  }
  return { lead, bullets };
}

/** "**bold** plain" → [{text, bold}] — the only inline markdown answers use. */
export function inlineSegments(text) {
  return (text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? { text: part.slice(2, -2), bold: true }
      : { text: part.replace(/\*\*/g, ''), bold: false });
}
