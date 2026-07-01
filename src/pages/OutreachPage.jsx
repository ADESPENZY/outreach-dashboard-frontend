import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  Mail, Send, CheckCircle2, ArrowRight, ChevronDown, ChevronUp,
  Pencil, Trash2, Eye, Clock, PartyPopper, Linkedin, ExternalLink, Loader2,
  AlertTriangle, MapPin, Wallet,
} from 'lucide-react';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import GenerateCvButton from '../components/GenerateCvButton';
import NoInboxModal from '../components/NoInboxModal';
import {
  getDraftEmails, getSentEmails, approveEmail, queueEmail, editEmail, deleteEmail,
} from '../services/apiOutreach';
import { getGmailAccounts } from '../services/apiGmail';

// ── Introductions — review what your headhunter wrote ─────────────────────
// An assistant presenting polished letters for approval, not an email editor.
// Three tabs: Pending Review → Sent → Got Replies. Narrow column (emails read
// better that way). All data + actions reuse the existing /api/outreach/ layer.

// Friendly names for the cold-email strategies (model keys → human label).
const STRATEGY_LABELS = {
  problem_first:   'Problem first',
  proof_first:     'Proof first',
  their_work:      'Their world first',
  direct:          'Short & direct',
  value_upfront:   'Value upfront',
  question_opener: 'Question opener',
};

// Names that aren't really a person — show only the email address for these.
const GENERIC_NAME = /^(hiring|manager|team|recruiting|recruiter|hr|talent|the team|hiring manager|hiring team)$/i;

// Resolve the recipient into { name, title, email }. When the contact has no
// real name (or a generic one), name is '' so the card shows just the email.
const recipientOf = (email) => {
  const c = email.contact || {};
  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return {
    name:  name && !GENERIC_NAME.test(name) ? name : '',
    title: c.title || '',
    email: c.email || '',
  };
};

// Match strength pill from the job's fit score — carries the Opportunities
// signal into Introductions so the two pages feel like one continuous story.
const matchPill = (score) => {
  if (score == null) return null;
  if (score >= 80) return { label: 'Strong match', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 60) return { label: 'Good match',   cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (score >= 45) return { label: 'Fair match',   cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return null;
};

// Staggered entrance for the pending grid (mirrors the Opportunities feed).
const LIST_STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const CARD_ITEM = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

// Relative time that also reads the future ("in 3 days", "tomorrow").
const timeAgo = (iso) => {
  if (!iso) return '';
  const diffSec = Math.round((new Date(iso) - new Date()) / 1000);
  const future = diffSec < 0;
  const abs = Math.abs(diffSec);
  const phrase = (n, unit) => `${future ? 'in ' : ''}${n} ${unit}${n === 1 ? '' : 's'}${future ? '' : ' ago'}`;
  if (abs < 60)    return future ? 'shortly' : 'just now';
  if (abs < 3600)  return phrase(Math.round(abs / 60), 'minute');
  if (abs < 86400) return phrase(Math.round(abs / 3600), 'hour');
  const days = Math.round(abs / 86400);
  if (days === 1)  return future ? 'tomorrow' : 'yesterday';
  if (days < 30)   return phrase(days, 'day');
  return new Date(iso).toLocaleDateString();
};

// The viral-loop LinkedIn post (the user copies it). `reached` personalises the
// count when we know it; falls back to a clean generic line.
const linkedinPost = (reached) => {
  const n = reached && reached > 1 ? reached : 5;
  return (
    `Applied to 0 job forms this week. Instead, I emailed ${n} hiring managers directly. ` +
    `One replied within 24 hours.\n\n` +
    `Sometimes it's not about applying more — it's about reaching the right person.`
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab button
// ═══════════════════════════════════════════════════════════════════════════
// Badge colour per tab (always coloured, per the spec): pending orange, sent
// blue, replies green (with a pulse when > 0).
const TAB_BADGE = {
  pending: 'bg-primary-light text-white',
  sent:    'bg-blue-500 text-white',
  replies: 'bg-emerald-500 text-white',
};

function TabButton({ id, label, count, active, pulse, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px inline-flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-bold font-montserrat transition-colors ${
        active ? 'text-primary-light border-primary-light' : 'text-secondary-dark border-transparent hover:text-black-light'
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      {count > 0 && (
        <span className="relative">
          <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold ${TAB_BADGE[id]}`}>
            {count}
          </span>
          {pulse && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Email body preview — collapsed to a few lines with Read more
// ═══════════════════════════════════════════════════════════════════════════
function BodyPreview({ body }) {
  const [expanded, setExpanded] = useState(false);
  const text = (body || '').trim();
  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 260;

  if (!isLong) {
    return <p className="text-sm text-black-light leading-relaxed whitespace-pre-line">{text}</p>;
  }
  return (
    <div>
      <p className={`text-sm text-black-light leading-relaxed whitespace-pre-line ${expanded ? 'max-h-80 overflow-y-auto pr-1' : 'line-clamp-4'}`}>
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary-light transition-colors"
      >
        {expanded ? <>Show less <ChevronUp className="w-3.5 h-3.5" /></> : <>Read more <ChevronDown className="w-3.5 h-3.5" /></>}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — Pending Review card
// ═══════════════════════════════════════════════════════════════════════════
function IntroCard({ email, onApprove, onDiscard, onSaveEdit, busy }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(email.subject || '');
  const [body, setBody] = useState(email.body || '');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  // Re-seed if the underlying draft identity changes (e.g. background refresh).
  useEffect(() => {
    if (!editing) { setSubject(email.subject || ''); setBody(email.body || ''); }
  }, [email.id, email.subject, email.body]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = recipientOf(email);
  const strategy = STRATEGY_LABELS[email.strategy] || '';
  const match = matchPill(email.job_fit_score);
  const initial = (email.company_name || '?').trim().charAt(0).toUpperCase();

  const cancelEdit = () => {
    setSubject(email.subject || '');
    setBody(email.body || '');
    setEditing(false);
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      await onSaveEdit(email.id, subject, body);
      setEditing(false);
    } catch {
      toast.error('Could not save your edit. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const approve = async () => {
    setActing(true);
    try { await onApprove(email); } finally { setActing(false); }
  };

  return (
    <motion.div
      variants={CARD_ITEM}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-dark shadow-sm hover:shadow-xl hover:shadow-primary-light/10 hover:border-primary-light/30 transition-all"
    >
      {/* Warm signature stripe down the left edge — the envelope feel */}
      <span aria-hidden="true" className="absolute left-0 inset-y-0 w-1.5 bg-gradient-to-b from-primary-light via-primary-light/50 to-primary-dark/30" />

      <div className="md:flex">
        {/* ── LEFT RAIL — the address panel (the "who") ─────────────────── */}
        <div className="md:w-60 lg:w-64 shrink-0 bg-neutral/40 border-b md:border-b-0 md:border-r border-neutral-dark p-5 pl-6">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-primary-light/20 to-primary-light/5 text-primary-dark border border-primary-light/20 flex items-center justify-center font-montserrat font-bold text-lg">
              {initial}
            </span>
            <div className="min-w-0">
              <h3 className="font-montserrat text-base font-bold text-black-light leading-snug truncate">
                {email.company_name || 'Company'}
              </h3>
              {email.job_title && <p className="text-xs text-secondary-dark leading-snug line-clamp-2">{email.job_title}</p>}
            </div>
          </div>

          {(email.job_location || email.job_salary_info) && (
            <div className="mt-3 space-y-1">
              {email.job_location && (
                <p className="flex items-center gap-1.5 text-xs text-secondary-dark min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{email.job_location}</span>
                </p>
              )}
              {email.job_salary_info && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 min-w-0">
                  <Wallet className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{email.job_salary_info}</span>
                </p>
              )}
            </div>
          )}

          {match && (
            <span className={`mt-3 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${match.cls}`}>
              {match.label}
            </span>
          )}

          <div className="my-4 border-t border-neutral-dark" />

          {/* Recipient */}
          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">To</p>
          {r.name ? (
            <>
              <p className="text-base font-bold text-black-light leading-snug">{r.name}</p>
              {r.title && <p className="text-sm text-secondary-dark leading-snug">{r.title}</p>}
              {r.email && <p className="text-xs text-secondary-dark/80 truncate mt-0.5">{r.email}</p>}
            </>
          ) : (
            <p className="text-sm font-semibold text-black-light break-all">{r.email || 'the team'}</p>
          )}

          {strategy && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white border border-neutral-dark px-2.5 py-1 text-[11px] font-medium text-secondary-dark">
              {strategy}
            </span>
          )}
        </div>

        {/* ── RIGHT — the letter ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 p-5 sm:p-6">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={9}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-dark bg-white text-sm text-black leading-relaxed outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all resize-y"
                />
                <p className="text-xs text-secondary-dark/60 mt-1.5">Edits save automatically — make it sound like you.</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={cancelEdit} disabled={saving} className="text-secondary-dark hover:text-black-light hover:bg-neutral font-semibold rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-60">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-4 py-2 text-sm transition-all disabled:opacity-60">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Save</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {email.subject && <p className="text-sm font-bold text-black-light leading-snug">Subject: {email.subject}</p>}
              <BodyPreview body={email.body} />
            </div>
          )}

          <div className="my-4 border-t border-neutral-dark" />

          {/* Footer — CV on the left, actions on the right */}
          <div className="space-y-3">
            <GenerateCvButton
              job={{ id: email.job_id, title: email.job_title, company_name: email.company_name }}
              hasCv={email.job_has_cv}
            />
            {!editing && (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => onDiscard(email)}
                  disabled={busy || acting}
                  className="inline-flex items-center gap-1.5 text-secondary-dark hover:text-red-600 hover:bg-red-50 font-semibold rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> Discard
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    disabled={busy || acting}
                    className="inline-flex items-center gap-1.5 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-3.5 py-2 text-sm transition-all disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={approve}
                    disabled={busy || acting}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all active:scale-95 hover:shadow-lg hover:shadow-primary-dark/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {acting
                      ? <><ApplyDirLoader.Button variant="light" /> Sending…</>
                      : <>Approve &amp; Send <Send className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — Sent timeline card
// ═══════════════════════════════════════════════════════════════════════════
function sentStatus(email) {
  if (email.status === 'approved' && email.is_queued) return { label: 'Scheduled to send', cls: 'text-amber-600', Icon: Clock };
  if (email.status === 'bounced') return { label: "Couldn't deliver", cls: 'text-red-600', Icon: AlertTriangle };
  if (email.status === 'failed')  return { label: 'Send failed', cls: 'text-red-600', Icon: AlertTriangle };
  if ((email.followup_count || 0) > 0) return { label: `Follow-up #${email.followup_count} sent`, cls: 'text-blue-600', Icon: Send };
  if (email.status === 'opened' || email.opened_at) return { label: 'Opened', cls: 'text-purple-600', Icon: Eye };
  if (email.status === 'sent') return { label: 'Delivered', cls: 'text-emerald-600', Icon: CheckCircle2 };
  return { label: 'No response yet', cls: 'text-secondary-dark', Icon: Send };
}

function SentCard({ email }) {
  const [open, setOpen] = useState(false);
  const r = recipientOf(email);
  const who = r.name || r.email || 'the team';
  const st = sentStatus(email);
  const when = email.sent_at ? `Sent ${timeAgo(email.sent_at)}`
    : (email.is_queued && email.scheduled_send_at) ? `Sending ${timeAgo(email.scheduled_send_at)}`
    : 'Queued';

  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm hover:shadow-md transition-all p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center shrink-0">
          <st.Icon className={`w-4 h-4 ${st.cls}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-black-light truncate">
            {who} <span className="text-secondary-dark font-normal">· {email.company_name || email.job_title || '—'}</span>
          </p>
          <p className="text-xs text-secondary-dark">{when}</p>
          {email.subject && <p className="text-sm text-black-light truncate mt-1">Subject: {email.subject}</p>}
          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
            <span className={`inline-flex items-center gap-1 font-semibold ${st.cls}`}>
              <st.Icon className="w-3.5 h-3.5" /> {st.label}
            </span>
            {email.next_followup_at && new Date(email.next_followup_at) > new Date() && (
              <span className="text-secondary-dark">Next follow-up: {timeAgo(email.next_followup_at)}</span>
            )}
          </div>
        </div>
      </div>

      {open && email.body && (
        <div className="mt-3 pt-3 border-t border-neutral-dark">
          <p className="text-sm text-black-light leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto pr-1">{email.body}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-dark hover:text-black-light transition-colors"
        >
          {open ? <>Hide email <ChevronUp className="w-4 h-4" /></> : <>View email <ChevronDown className="w-4 h-4" /></>}
        </button>
        <GenerateCvButton
          job={{ id: email.job_id, title: email.job_title, company_name: email.company_name }}
          hasCv={email.job_has_cv}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — Reply (the celebration)
// ═══════════════════════════════════════════════════════════════════════════
function ReplyCard({ email, reachedCount }) {
  const r = recipientOf(email);
  const who = r.name || r.email || 'They';
  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(linkedinPost(reachedCount));
      toast.success('Post copied — paste it on LinkedIn 🎉');
    } catch {
      toast.error('Could not copy. Long-press to copy it manually.');
    }
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <PartyPopper className="w-5 h-5 text-emerald-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-900">{who} replied!</p>
          <p className="text-xs text-emerald-700/90 truncate">
            {[r.title, email.company_name].filter(Boolean).join(' · ') || email.job_title}
          </p>
          {email.replied_at && <p className="text-xs text-emerald-700/70 mt-0.5">Replied {timeAgo(email.replied_at)}</p>}
        </div>
      </div>

      {/* We don't store the reply text — point them to Gmail to read it. */}
      <p className="mt-3 text-sm text-emerald-900/80 leading-relaxed">
        They wrote back. Open your inbox to read it and keep the conversation going.
      </p>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <a
          href="https://mail.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white text-emerald-700 border border-emerald-200 font-semibold rounded-xl px-3.5 py-2 text-sm hover:bg-emerald-100 transition-colors"
        >
          Open in Gmail <ExternalLink className="w-4 h-4" />
        </a>
        <GenerateCvButton
          job={{ id: email.job_id, title: email.job_title, company_name: email.company_name }}
          hasCv={email.job_has_cv}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-emerald-200">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700/70 mb-2">Share your win</p>
        <button
          onClick={copyPost}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all"
        >
          <Linkedin className="w-4 h-4" /> Post on LinkedIn 🎉
        </button>
        <p className="text-xs text-emerald-700/70 mt-1.5">We&rsquo;ll copy a ready-to-paste post for you.</p>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, action, onAction }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-8 text-center">
      <span className="w-12 h-12 rounded-2xl bg-neutral border border-neutral-dark flex items-center justify-center mx-auto mb-3 text-secondary-dark">
        {icon}
      </span>
      <p className="text-sm text-secondary-dark leading-relaxed max-w-sm mx-auto">{title}</p>
      {action && (
        <button onClick={onAction} className="mt-4 inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-4 py-2 text-sm transition-all">
          {action} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DESKTOP master–detail (lg:) — list on the left, live preview on the right
// ═══════════════════════════════════════════════════════════════════════════

// One compact row in the left list. Active row gets the orange rail + tint.
function PreviewListItem({ email, tab, active, onClick }) {
  const initial = (email.company_name || '?').trim().charAt(0).toUpperCase();
  const match = matchPill(email.job_fit_score);
  const st = tab === 'pending'
    ? { label: 'Pending review', cls: 'text-primary-dark', dot: 'bg-primary-light' }
    : tab === 'replies'
      ? { label: 'Replied', cls: 'text-emerald-600', dot: 'bg-emerald-500' }
      : (() => { const s = sentStatus(email); return { label: s.label, cls: s.cls, dot: 'bg-neutral-dark' }; })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 bg-white transition-all ${
        active
          ? 'border-primary-light ring-1 ring-primary-light/40 bg-primary-light/[0.04] shadow-sm'
          : 'border-neutral-dark hover:border-primary-light/30 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-primary-light/20 to-primary-light/5 text-primary-dark border border-primary-light/20 flex items-center justify-center font-montserrat font-bold text-base">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-black-light truncate">{email.company_name || 'Company'}</p>
          {email.job_title && <p className="text-xs text-secondary-dark truncate mt-0.5">{email.job_title}</p>}
          {(email.job_location || email.job_salary_info) && (
            <p className="text-xs text-secondary-dark/80 truncate mt-1">
              {[email.job_location, email.job_salary_info].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {match && (
              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${match.cls}`}>{match.label}</span>
            )}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} /> {st.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Right-panel empty state (nothing selected).
function EmptyPreview() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <span className="w-14 h-14 rounded-2xl bg-neutral border border-neutral-dark flex items-center justify-center mb-3">
        <Mail className="w-7 h-7 text-secondary-dark" />
      </span>
      <p className="text-sm text-secondary-dark max-w-xs">Select an introduction from the left to preview it.</p>
    </div>
  );
}

// The right preview panel — full letter with a sticky footer of actions. Keyed
// by email id in the parent so its edit state resets when the selection changes.
function PreviewPane({ email, tab, onApprove, onDiscard, onSaveEdit, reachedCount }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(email.subject || '');
  const [body, setBody] = useState(email.body || '');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  const r = recipientOf(email);
  const match = matchPill(email.job_fit_score);
  const strategy = STRATEGY_LABELS[email.strategy] || '';

  const cancelEdit = () => { setSubject(email.subject || ''); setBody(email.body || ''); setEditing(false); };
  const saveEdit = async () => {
    setSaving(true);
    try { await onSaveEdit(email.id, subject, body); setEditing(false); }
    catch { toast.error('Could not save your edit. Please try again.'); }
    finally { setSaving(false); }
  };
  const approve = async () => { setActing(true); try { await onApprove(email); } finally { setActing(false); } };
  const copyPost = async () => {
    try { await navigator.clipboard.writeText(linkedinPost(reachedCount)); toast.success('Post copied — paste it on LinkedIn 🎉'); }
    catch { toast.error('Could not copy. Long-press to copy it manually.'); }
  };
  const st = tab === 'sent' ? sentStatus(email) : null;

  return (
    <div className="flex flex-col h-full bg-neutral/50">
      {/* Stacked cards on a light canvas — airy, sectioned, intentional */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4">

        {/* ── Card 1 — company, role, chips, recipient ─────────────────── */}
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 lg:p-6">
          <div className="flex items-start gap-3">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-primary-light/20 to-primary-light/5 text-primary-dark border border-primary-light/20 flex items-center justify-center font-montserrat font-bold text-lg">
              {(email.company_name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="font-montserrat text-xl font-bold text-black-light leading-snug">{email.company_name || 'Company'}</h2>
              {email.job_title && <p className="text-sm text-secondary-dark">{email.job_title}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {email.job_location && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral border border-neutral-dark px-2.5 py-1 text-xs font-medium text-secondary-dark">
                <MapPin className="w-3.5 h-3.5" /> {email.job_location}
              </span>
            )}
            {email.job_salary_info && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <Wallet className="w-3.5 h-3.5" /> {email.job_salary_info}
              </span>
            )}
            {match && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${match.cls}`}>{match.label}</span>
            )}
          </div>

          <div className="my-5 border-t border-neutral-dark" />

          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1.5 font-montserrat">To</p>
          {r.name ? (
            <>
              <p className="text-base font-bold text-black-light">{r.name}</p>
              {r.title && <p className="text-sm text-secondary-dark">{r.title}</p>}
              {r.email && <p className="text-sm text-secondary-dark/80 break-all">{r.email}</p>}
            </>
          ) : (
            <p className="text-base font-semibold text-black-light break-all">{r.email || 'the team'}</p>
          )}
        </div>

        {/* ── Card 2 — the letter ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 lg:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-3 font-montserrat">The introduction</p>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">Message</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-dark bg-white text-sm text-black leading-relaxed outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all resize-y" />
                <p className="text-xs text-secondary-dark/60 mt-1.5">Edits save automatically — make it sound like you.</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={cancelEdit} disabled={saving} className="text-secondary-dark hover:text-black-light hover:bg-neutral font-semibold rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-60">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-4 py-2 text-sm transition-all disabled:opacity-60">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Save</>}
                </button>
              </div>
            </div>
          ) : (
            <>
              {email.subject && <p className="text-lg font-bold font-montserrat text-black-light leading-snug mb-3">{email.subject}</p>}
              <p className="text-sm text-black-light leading-relaxed whitespace-pre-line font-roboto">{email.body}</p>
            </>
          )}
        </div>

        {/* ── Card 3 — reply celebration ───────────────────────────────── */}
        {tab === 'replies' && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-5 lg:p-6">
            <p className="text-sm font-bold text-emerald-900 flex items-center gap-2"><PartyPopper className="w-4 h-4" /> They replied!</p>
            <p className="text-sm text-emerald-900/80 mt-1">Open your inbox to read it and keep the conversation going.</p>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white text-emerald-700 border border-emerald-200 font-semibold rounded-xl px-3.5 py-2 text-sm hover:bg-emerald-100 transition-colors">
                Open in Gmail <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={copyPost}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all">
                <Linkedin className="w-4 h-4" /> Post on LinkedIn 🎉
              </button>
            </div>
          </div>
        )}

        {/* ── Card 3 — sent status ─────────────────────────────────────── */}
        {tab === 'sent' && st && (
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 lg:p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-2 font-montserrat">Status</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${st.cls}`}><st.Icon className="w-4 h-4" /> {st.label}</span>
              {email.sent_at && <span className="text-xs text-secondary-dark">Sent {timeAgo(email.sent_at)}</span>}
              {email.next_followup_at && new Date(email.next_followup_at) > new Date() && (
                <span className="text-xs text-secondary-dark">Next follow-up: {timeAgo(email.next_followup_at)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer — actions always in reach */}
      <div className="shrink-0 border-t border-neutral-dark bg-white px-5 lg:px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-secondary-dark min-w-0">
            {strategy && <span className="hidden xl:inline">Strategy: <span className="font-semibold text-black-light">{strategy}</span></span>}
            <GenerateCvButton job={{ id: email.job_id, title: email.job_title, company_name: email.company_name }} hasCv={email.job_has_cv} />
          </div>
          {tab === 'pending' && !editing && (
            <div className="flex items-center gap-2">
              <button onClick={() => onDiscard(email)} disabled={acting}
                className="inline-flex items-center gap-1.5 text-secondary-dark hover:text-red-600 hover:bg-red-50 font-semibold rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Discard
              </button>
              <button onClick={() => setEditing(true)} disabled={acting}
                className="inline-flex items-center gap-1.5 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-3.5 py-2 text-sm transition-all disabled:opacity-50">
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button onClick={approve} disabled={acting}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {acting
                  ? <><ApplyDirLoader.Button variant="light" /> Sending…</>
                  : <>Approve &amp; Send <Send className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
const OutreachPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [bulking, setBulking] = useState(false);
  const [selectedId, setSelectedId] = useState(null);   // desktop master–detail selection
  const [showConnect, setShowConnect] = useState(false); // Gmail-connect gate modal
  const selectTab = (id) => { setTab(id); setSelectedId(null); };

  // ── Data (preserved API layer) ────────────────────────────────────────────
  const { data: drafts = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['outreach-drafts'],
    queryFn: getDraftEmails,
    refetchInterval: 15000,      // drafts arrive a few seconds after Reach Out
    refetchOnWindowFocus: true,
  });
  const { data: sentEmails = [], isLoading: loadingSent } = useQuery({
    queryKey: ['outreach-sent'],
    queryFn: getSentEmails,
  });
  const { data: inboxData } = useQuery({ queryKey: ['gmailAccounts'], queryFn: getGmailAccounts });
  const connectedInboxes = Array.isArray(inboxData) ? inboxData : (inboxData?.results ?? []);
  const canSend = connectedInboxes.length > 0;
  const loading = loadingDrafts || loadingSent;

  // ── Derived lists ───────────────────────────────────────────────────────
  const pending = drafts; // status === 'draft'
  const replies = sentEmails.filter((e) => e.status === 'replied');
  const sentList = sentEmails
    .filter((e) => e.status !== 'replied')
    .sort((a, b) => new Date(b.sent_at || b.scheduled_send_at || 0) - new Date(a.sent_at || a.scheduled_send_at || 0));
  const reachedCount = sentList.length + replies.length;

  // Active tab's list + the selected email for the desktop preview panel.
  const activeList = tab === 'pending' ? pending : tab === 'sent' ? sentList : replies;
  const selectedEmail = activeList.find((e) => e.id === selectedId) || null;

  // ── Mutations (preserved) ─────────────────────────────────────────────────
  const editMutation = useMutation({ mutationFn: ({ id, subject, body }) => editEmail(id, { subject, body }) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
    queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    queryClient.invalidateQueries({ queryKey: ['outreach-counts'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  // Approve one intro → approve + queue (it sends from your inbox). PRINCIPLE:
  // you can't send without a connected Gmail, so if none is connected we open
  // the connect gate instead of approving (nothing moves to "sent").
  const approveOne = async (email) => {
    if (!canSend) { setShowConnect(true); return; }
    try {
      await approveEmail(email.id);
      await queueEmail(email.id);
      refresh();
      toast.success('Introduction approved — it’s on its way from your inbox.');
    } catch (err) {
      toast.error(err?.message || 'Could not approve. Please try again.');
      throw err;
    }
  };

  const discardOne = async (email) => {
    try {
      await deleteEmail(email.id);
      refresh();
      toast.success('Discarded. Your headhunter will keep looking.');
    } catch (err) {
      toast.error(err?.message || 'Could not discard. Please try again.');
    }
  };

  const handleSaveEdit = (id, subject, body) => editMutation.mutateAsync({ id, subject, body });

  const approveAll = async () => {
    if (!canSend) { setShowConnect(true); return; }   // gate: no inbox = no send
    setBulking(true);
    try {
      for (const email of pending) {
        await approveEmail(email.id);
        await queueEmail(email.id);
      }
      refresh();
      toast.success(`${pending.length} introductions approved — sending now.`);
    } catch (err) {
      toast.error(err?.message || 'Some introductions could not be approved.');
      refresh();
    } finally {
      setBulking(false);
    }
  };

  // Full-width empty state for the active tab (shared by mobile + desktop).
  const emptyStateFor = (t) => (
    t === 'pending'
      ? <EmptyState icon={<Mail className="w-6 h-6" />} title="No introductions waiting. Head to Opportunities to reach out to more roles." action="Go to Opportunities" onAction={() => navigate('/dashboard/opportunities')} />
      : t === 'sent'
        ? <EmptyState icon={<Send className="w-6 h-6" />} title="No introductions sent yet. Approve a pending introduction to get started." />
        : <EmptyState icon={<PartyPopper className="w-6 h-6" />} title="No replies yet. They’re coming — most replies arrive within 3–7 days of sending." />
  );

  return (
    <div className="w-full max-w-4xl lg:max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in font-roboto">

      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">Introductions</h1>
        <p className="text-sm text-secondary-dark mt-1">
          Polished letters your headhunter wrote — review, tweak, and approve.
        </p>
      </header>

      {/* Tabs — bottom-border style */}
      <div className="flex items-center gap-6 border-b border-neutral-dark overflow-x-auto">
        <TabButton id="pending" label="Pending Review" count={pending.length} active={tab === 'pending'} onClick={() => selectTab('pending')} />
        <TabButton id="sent"    label="Sent"           count={sentList.length} active={tab === 'sent'}    onClick={() => selectTab('sent')} />
        <TabButton id="replies" label="Got Replies"    count={replies.length}  active={tab === 'replies'} pulse onClick={() => selectTab('replies')} />
      </div>

      {/* Prominent connect gate — introductions can't send without a Gmail. */}
      {!loading && !canSend && pending.length > 0 && tab === 'pending' && (
        <div className="flex items-center gap-4 rounded-2xl border border-primary-light/30 bg-primary-light/5 p-4 md:p-5">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shrink-0 shadow-sm shadow-primary-light/30">
            <Mail className="w-5 h-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold font-montserrat text-black-light">Connect your inbox to start sending</p>
            <p className="text-xs text-secondary-dark mt-0.5 leading-relaxed">
              Introductions send from your own Gmail — that’s why hiring managers reply. Takes under a minute.
            </p>
          </div>
          <button
            onClick={() => setShowConnect(true)}
            className="shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90 transition-all"
          >
            Connect Gmail <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 animate-pulse">
              <div className="h-4 w-2/3 rounded bg-neutral-dark" />
              <div className="h-3 w-1/3 rounded bg-neutral-dark mt-3" />
              <div className="h-24 w-full rounded-xl bg-neutral-dark/70 mt-4" />
              <div className="flex justify-end mt-4"><div className="h-9 w-40 rounded-xl bg-neutral-dark" /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── MOBILE + TABLET (< lg): stacked cards ─────────────────────── */}
          <div className="lg:hidden space-y-6">
            {tab === 'pending' ? (
              pending.length === 0 ? emptyStateFor('pending') : (
                <div className="space-y-4">
                  {pending.length >= 3 && (
                    <div className="rounded-2xl border border-neutral-dark bg-white shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                      <button onClick={approveAll} disabled={bulking} className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all disabled:opacity-60">
                        {bulking ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : <>Approve all {pending.length} introductions</>}
                      </button>
                      <p className="text-xs text-secondary-dark flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        Review each one first — your headhunter recommends a quick scan.
                      </p>
                    </div>
                  )}
                  <motion.div variants={LIST_STAGGER} initial="hidden" animate="show" className="space-y-4">
                    {pending.map((email) => (
                      <IntroCard key={email.id} email={email} busy={bulking} onApprove={approveOne} onDiscard={discardOne} onSaveEdit={handleSaveEdit} />
                    ))}
                  </motion.div>
                </div>
              )
            ) : tab === 'sent' ? (
              sentList.length === 0 ? emptyStateFor('sent') : (
                <div className="space-y-4">{sentList.map((email) => <SentCard key={email.id} email={email} />)}</div>
              )
            ) : (
              replies.length === 0 ? emptyStateFor('replies') : (
                <div className="space-y-4">{replies.map((email) => <ReplyCard key={email.id} email={email} reachedCount={reachedCount} />)}</div>
              )
            )}
          </div>

          {/* ── DESKTOP (>= lg): master–detail ────────────────────────────── */}
          <div className="hidden lg:block">
            {activeList.length === 0 ? emptyStateFor(tab) : (
              <div className="flex rounded-2xl border border-neutral-dark overflow-hidden bg-white shadow-sm h-[calc(100vh-15rem)] min-h-[540px] max-h-[860px]">
                {/* LEFT — scrollable list of spaced cards on a light canvas */}
                <div className="w-[38%] shrink-0 border-r border-neutral-dark overflow-y-auto bg-neutral/50 p-3 space-y-3">
                  {tab === 'pending' && pending.length >= 2 && (
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 font-montserrat">Pending</span>
                      <button onClick={approveAll} disabled={bulking} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark hover:text-primary-light transition-colors disabled:opacity-60">
                        {bulking ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving…</> : `Approve all (${pending.length})`}
                      </button>
                    </div>
                  )}
                  {activeList.map((email) => (
                    <PreviewListItem key={email.id} email={email} tab={tab} active={selectedEmail?.id === email.id} onClick={() => setSelectedId(email.id)} />
                  ))}
                </div>
                {/* RIGHT — fixed preview */}
                <div className="flex-1 min-w-0">
                  {selectedEmail ? (
                    <div key={selectedEmail.id} className="h-full animate-in fade-in duration-200">
                      <PreviewPane
                        email={selectedEmail}
                        tab={tab}
                        onApprove={approveOne}
                        onDiscard={discardOne}
                        onSaveEdit={handleSaveEdit}
                        reachedCount={reachedCount}
                      />
                    </div>
                  ) : (
                    <EmptyPreview />
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Gmail-connect gate — opens the branded connect flow. On success the
          gmailAccounts query refetches, canSend flips true, and Approve sends. */}
      {showConnect && <NoInboxModal onClose={() => setShowConnect(false)} />}
    </div>
  );
};

export default OutreachPage;
