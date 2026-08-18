// project_highlights — reading and writing the shapes that actually exist.
//
// WHAT IS STORED (verified against production, 29 items across 8 profiles):
// every single item is a STRING containing a Python dict repr, e.g.
//   "{'name': 'FumiSync', 'role': 'Founder', 'description': '...', ...}"
// not a dict. Backend/accounts/services.py does
//   profile.project_highlights = [str(p).strip() for p in projects ...]
// and str() on the dict the extractor returns produces exactly that.
//
// Four different key sets are in the wild, so nothing can assume one:
//   x20  name, role, description, challenge, tools
//   x3   name, role, description, tools_skills_methods
//   x3   name, role, description
//   x3   Name/role, what they did or built,
//        specific challenge or responsibility, tools, skills or methods used
// (the last is the model having echoed the prompt's WORDING back as keys)
//
// Plain prose strings are also legal — none exist today, but the extractor's
// prompt permits them and older rows may still appear.

// Canonical field ids used by the UI. Storage keys are never renamed: each
// entry is written back under the key names it arrived with.
export const PROJECT_FIELDS = ['name', 'role', 'description', 'challenge', 'tools'];

// Storage key -> canonical id. Lower-cased on lookup so casing never matters.
const KEY_ALIASES = {
  'name': 'name',
  'projectname': 'name',
  'project': 'name',
  'title': 'name',
  'name/role': 'name',
  'role': 'role',
  'your role': 'role',
  'description': 'description',
  'desc': 'description',
  'summary': 'description',
  'what they did or built': 'description',
  'challenge': 'challenge',
  'the hard part': 'challenge',
  'specific challenge or responsibility': 'challenge',
  'tools': 'tools',
  'stack': 'tools',
  'tools_skills_methods': 'tools',
  'tools, skills or methods used': 'tools',
};

const PY_LITERALS = { None: 'null', True: 'true', False: 'false' };

/**
 * Parse a Python dict repr into an object.
 *
 * Deliberately a character scanner rather than a chain of .replace() calls: an
 * apostrophe inside a value ("didn't ship") is not a delimiter, an escaped \'
 * has to survive, and None/True/False must only be rewritten OUTSIDE strings —
 * a regex pass gets all three wrong and silently corrupts the user's text.
 */
function parsePyDict(text) {
  const s = (text || '').trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;

  let out = '';
  let quote = '';   // '' = outside a string, otherwise the delimiter that opened it

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];

    if (!quote) {
      // Python's repr switches to DOUBLE quotes when the value contains an
      // apostrophe — repr({'n': "O'Brien"}) is {'n': "O'Brien"} — so both
      // delimiters have to be recognised or every name with an apostrophe
      // fails to parse and dumps raw braces on screen.
      if (c === "'" || c === '"') { quote = c; out += '"'; continue; }
      // Bare Python literals, only ever outside a quoted value.
      let matched = false;
      for (const [py, js] of Object.entries(PY_LITERALS)) {
        if (s.startsWith(py, i)) { out += js; i += py.length - 1; matched = true; break; }
      }
      if (!matched) out += c;
      continue;
    }

    // Inside a string opened by `quote`.
    if (c === '\\') {
      const next = s[i + 1] || '';
      // \' and \" are only escapes for their own delimiter; as JSON content the
      // apostrophe is plain and the double quote must stay escaped.
      if (next === "'") out += "'";
      else if (next === '"') out += '\\"';
      else out += c + next;
      i += 1;
    } else if (c === quote) {
      quote = ''; out += '"';                 // closing delimiter
    } else if (c === '"') {
      out += '\\"';                           // a literal " inside a '...' string
    } else if (c === '\n') {
      out += '\\n';
    } else if (c === '\t') {
      out += '\\t';
    } else {
      out += c;
    }
  }

  try {
    const obj = JSON.parse(out);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

function fromObject(obj) {
  const fields = { name: '', role: '', description: '', challenge: '', tools: '' };
  const keyMap = {};      // canonical id -> the ORIGINAL storage key
  const extras = {};      // anything unrecognised, preserved verbatim

  for (const [rawKey, rawVal] of Object.entries(obj)) {
    const canonical = KEY_ALIASES[String(rawKey).trim().toLowerCase()];
    const val = rawVal == null ? '' : String(rawVal);
    if (canonical && !fields[canonical]) {
      fields[canonical] = val;
      keyMap[canonical] = rawKey;
    } else if (!canonical) {
      extras[rawKey] = rawVal;
    }
  }
  return { fields, keyMap, extras, legacyString: false };
}

/**
 * One stored entry -> { fields, keyMap, extras }. `fields` is keyed by canonical
 * id for the UI; `keyMap` remembers the ORIGINAL storage keys so a save writes
 * back under exactly the names it came with.
 */
export function parseProject(entry) {
  const empty = { name: '', role: '', description: '', challenge: '', tools: '' };

  if (entry && typeof entry === 'object' && !Array.isArray(entry)) return fromObject(entry);

  if (typeof entry === 'string') {
    const obj = parsePyDict(entry);
    if (obj) return fromObject(obj);
    // Plain prose: it is a description and nothing else. Never show braces.
    return {
      fields: { ...empty, description: entry.trim() },
      keyMap: { description: 'description' },
      extras: {},
      legacyString: true,
    };
  }
  return { fields: { ...empty }, keyMap: {}, extras: {}, legacyString: false };
}

/**
 * Write one edited project back to storage.
 *
 * Returns a real object, not a re-stringified dict. The column is a JSONField,
 * so an object is what it is for; and Backend/outreach/email_service.py's
 * _normalize_projects reads a real dict properly ("Name — Description") whereas
 * a stringified one falls through its isinstance(str) branch and reaches the
 * writer as literal `{'name': ...}` text. Storing objects fixes that without
 * touching a line of backend code.
 *
 * Key NAMES are preserved exactly as they arrived; unrecognised keys ride along
 * untouched. Nothing is renamed.
 */
export function serializeProject(parsed) {
  const { fields, keyMap, extras } = parsed;
  const out = { ...(extras || {}) };
  for (const id of PROJECT_FIELDS) {
    const value = (fields[id] || '').trim();
    const storageKey = (keyMap && keyMap[id]) || id;
    // Keep a key that already existed even if emptied, so the shape stays
    // stable across saves; skip ones that never existed and are still blank.
    if (value || (keyMap && keyMap[id])) out[storageKey] = value;
  }
  return out;
}

/** True when every field is blank — used to drop empties on save. */
export function isProjectEmpty(parsed) {
  return PROJECT_FIELDS.every((id) => !(parsed.fields[id] || '').trim());
}

/** Blank project in the dominant CV-extraction shape (20 of 29 items). */
export function emptyProject() {
  return {
    fields: { name: '', role: '', description: '', challenge: '', tools: '' },
    keyMap: { name: 'name', role: 'role', description: 'description', challenge: 'challenge', tools: 'tools' },
    extras: {},
    legacyString: false,
  };
}

/** Summary line for a collapsed card. Never leaks braces or key names. */
export function projectSummary(fields) {
  const name = (fields.name || '').trim();
  const role = (fields.role || '').trim();
  if (name && role) return `${name} — ${role}`;
  if (name) return name;
  if (role) return role;
  const desc = (fields.description || '').trim();
  return desc ? (desc.length > 60 ? `${desc.slice(0, 60)}…` : desc) : 'Untitled project';
}
