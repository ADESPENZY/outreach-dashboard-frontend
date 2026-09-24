// Live copilot — pure state (no browser APIs), shared by the hook, the in-page
// panel and the floating window. Kept side-effect free so it can be exercised
// against a real sidecar stream outside the browser.
//
// The sidecar tags every message with a question_id, and answers are never
// thrown away: each question becomes an entry in `history`, and `index` says
// which one is on screen.

/** `${base}/ws/interview/<id>?ticket=<ticket>` — base is VITE_COPILOT_WS_URL. */
export function copilotSocketUrl(base, sessionId, ticket) {
  const root = (base || '').trim().replace(/\/+$/, '');
  return `${root}/ws/interview/${encodeURIComponent(sessionId)}?ticket=${encodeURIComponent(ticket)}`;
}

export const ANSWER_STYLES = ['direct', 'experience', 'story'];
export const STYLE_LABELS = { direct: 'Direct', experience: 'Experience', story: 'Story' };

export const initialLiveState = {
  role: null,             // from "ready"
  bankSize: 0,
  style: 'experience',    // the style in force (from /context/, then "style" acks)
  caption: '',            // "partial": the question forming right now
  history: [],            // [{question_id, question, raw, lead, body, cues, status, source, style, error}]
  index: -1,              // which entry is on screen; -1 = none yet
  autoFollow: true,       // new questions jump to the newest answer
  pendingNew: 0,          // new questions that arrived while auto-follow was paused
  notice: '',             // last non-fatal error with no question attached
};

const CUES = /^\s*cues\s*:\s*(.*)$/i;

/**
 * Split an answer into the shape the UI renders: the first line is the lead the
 * user can say straight away, then the spoken body, then optional keyword cues.
 * Works on a half-streamed answer — the last line simply grows.
 */
export function parseAnswer(text) {
  const lines = (text || '').split('\n');
  let lead = '';
  const bodyLines = [];
  let cues = [];
  for (const raw of lines) {
    const line = raw.trim();
    const cueMatch = line.match(CUES);
    if (cueMatch) {
      cues = cueMatch[1].split(/[·•|,]|\s+-\s+/).map((c) => c.trim()).filter(Boolean);
      continue;
    }
    if (!line) {
      if (lead && bodyLines.length) bodyLines.push('');   // keep paragraph breaks
      continue;
    }
    if (!lead) lead = line.replace(/^#+\s*/, '');
    else bodyLines.push(line);
  }
  // Collapse runs of blank lines, then group into paragraphs.
  const body = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { lead, body, cues };
}

function withEntry(state, questionId, update) {
  const i = state.history.findIndex((e) => e.question_id === questionId);
  if (i === -1) return state;
  const history = [...state.history];
  history[i] = { ...history[i], ...update(history[i]) };
  return { ...state, history };
}

/**
 * Fold one sidecar message — or one UI action — into the view state.
 * Unknown types leave the state untouched.
 */
export function liveReducer(state, msg) {
  switch (msg?.type) {
    // ── from the sidecar ────────────────────────────────────────────────────
    case 'ready':
      return { ...state, role: msg.role ?? null, bankSize: msg.bank_size ?? 0 };

    case 'partial':
      return { ...state, caption: msg.text || '' };

    case 'question': {
      const entry = {
        question_id: msg.question_id ?? (state.history.length + 1),
        question: msg.text || '',
        raw: '', lead: '', body: '', cues: [],
        status: 'streaming', source: null, style: state.style, error: '',
      };
      const history = [...state.history, entry];
      const last = history.length - 1;
      return {
        ...state, history, caption: '', notice: '',
        index: state.autoFollow ? last : state.index,
        pendingNew: state.autoFollow ? 0 : state.pendingNew + 1,
      };
    }

    case 'answer_delta':
      return withEntry(state, msg.question_id, (entry) => {
        // A delta for a finished answer means it is being rewritten: start over.
        const raw = (entry.status === 'streaming' ? entry.raw : '') + (msg.text || '');
        return { raw, ...parseAnswer(raw), status: 'streaming', error: '' };
      });

    case 'answer':
      return withEntry(state, msg.question_id, (entry) => {
        const raw = msg.text || entry.raw;
        return {
          raw, ...parseAnswer(raw), status: 'done',
          source: msg.source || null, style: msg.style || entry.style,
        };
      });

    case 'answer_cancelled':
      return withEntry(state, msg.question_id, () => ({ status: 'cancelled' }));

    case 'style':
      return { ...state, style: msg.style || state.style };

    case 'error':
      if (msg.question_id) {
        return withEntry(state, msg.question_id, () => ({
          status: 'cancelled', error: msg.detail || 'Something went wrong.',
        }));
      }
      return { ...state, notice: msg.detail || 'Something went wrong.' };

    // ── from the UI ─────────────────────────────────────────────────────────
    case 'ui/back':
      // Stepping back pauses auto-follow: the user is reading, not watching.
      if (state.index <= 0) return { ...state, autoFollow: false };
      return { ...state, index: state.index - 1, autoFollow: false };

    case 'ui/forward': {
      const next = Math.min(state.index + 1, state.history.length - 1);
      const caughtUp = next === state.history.length - 1;
      return { ...state, index: next, pendingNew: caughtUp ? 0 : state.pendingNew };
    }

    case 'ui/latest':      // "Latest" also resumes following
      return { ...state, index: state.history.length - 1, autoFollow: true, pendingNew: 0 };

    case 'ui/switch':      // the banner's [Switch]: jump there, stay paused
      return { ...state, index: state.history.length - 1, pendingNew: 0 };

    case 'ui/stay':        // the banner's [Stay]: dismiss, keep reading
      return { ...state, pendingNew: 0 };

    case 'ui/autofollow':
      return msg.on
        ? { ...state, autoFollow: true, pendingNew: 0, index: state.history.length - 1 }
        : { ...state, autoFollow: false };

    case 'ui/style':       // local echo; the sidecar confirms with "style"
      return { ...state, style: msg.style || state.style };

    case 'ui/dismiss-notice':
      return { ...state, notice: '' };

    case 'reset':
      return { ...initialLiveState };

    default:
      return state;
  }
}

/** The entry on screen, or null. */
export function currentEntry(state) {
  return state.index >= 0 && state.index < state.history.length ? state.history[state.index] : null;
}

/** "**bold** plain" → [{text, bold}] — the only inline markdown answers use. */
export function inlineSegments(text) {
  return (text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? { text: part.slice(2, -2), bold: true }
      : { text: part.replace(/\*\*/g, ''), bold: false });
}
