import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Mail, Send, CheckCircle2, ArrowRight, ChevronDown, ChevronUp,
  Pencil, Trash2, Eye, Clock, PartyPopper, Linkedin, ExternalLink, Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import GenerateCvButton from '../components/GenerateCvButton';
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
const TAB_TONE = {
  pending: { active: 'bg-primary-light/10 text-primary-dark border-primary-light/40', badge: 'bg-primary-light text-white' },
  sent:    { active: 'bg-blue-50 text-blue-700 border-blue-200',                       badge: 'bg-blue-500 text-white' },
  replies: { active: 'bg-emerald-50 text-emerald-700 border-emerald-200',              badge: 'bg-emerald-500 text-white' },
};

function TabButton({ id, label, count, active, pulse, onClick }) {
  const tone = TAB_TONE[id];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold font-montserrat transition-all min-w-0 flex-1 ${
        active ? tone.active : 'bg-white text-secondary-dark border-neutral-dark hover:text-black-light hover:border-primary-light/30'
      }`}
    >
      {pulse && count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      )}
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold ${active ? tone.badge : 'bg-neutral text-secondary-dark'}`}>
          {count}
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
function IntroCard({ email, canSend, onApprove, onDiscard, onSaveEdit, busy }) {
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
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm hover:shadow-md transition-all p-5 sm:p-6">

      {/* HEADER — which job this intro is for */}
      <div>
        <h3 className="font-montserrat text-base font-bold text-black-light leading-snug">
          <span>{email.company_name || 'Company'}</span>
          {email.job_title && <span className="text-secondary-dark font-semibold"> · {email.job_title}</span>}
        </h3>
        {(email.job_location || email.job_salary_info) && (
          <p className="text-xs text-secondary-dark mt-0.5">
            {[email.job_location, email.job_salary_info].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* RECIPIENT */}
      <div className="mt-4">
        {r.name ? (
          <>
            <p className="text-sm text-secondary-dark">
              To: <span className="text-base font-bold text-black-light">{r.name}</span>
            </p>
            {r.title && <p className="text-sm text-secondary-dark">{r.title}</p>}
            {r.email && <p className="text-xs text-secondary-dark/80 truncate">{r.email}</p>}
          </>
        ) : (
          <p className="text-sm text-secondary-dark">
            To: <span className="font-semibold text-black-light break-all">{r.email || 'the team'}</span>
          </p>
        )}
      </div>

      <div className="my-4 border-t border-neutral-dark" />

      {/* EMAIL — preview, or editable in edit mode */}
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

      {/* FOOTER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-secondary-dark">
          {strategy ? <span>Strategy: <span className="font-semibold text-black-light">{strategy}</span></span> : <span />}
          <GenerateCvButton
            job={{ id: email.job_id, title: email.job_title, company_name: email.company_name }}
            hasCv={email.job_has_cv}
          />
        </div>

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
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {acting
                  ? <><ApplyDirLoader.Button variant="light" /> {canSend ? 'Sending…' : 'Approving…'}</>
                  : canSend
                    ? <>Approve &amp; Send <Send className="w-4 h-4" /></>
                    : <>Approve <CheckCircle2 className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
const OutreachPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [bulking, setBulking] = useState(false);

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

  // ── Mutations (preserved) ─────────────────────────────────────────────────
  const editMutation = useMutation({ mutationFn: ({ id, subject, body }) => editEmail(id, { subject, body }) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
    queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    queryClient.invalidateQueries({ queryKey: ['outreach-counts'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  // Approve one intro. With an inbox → approve + queue (sends). Without → just
  // approve; it sends from the queue once an inbox is connected.
  const approveOne = async (email) => {
    try {
      await approveEmail(email.id);
      if (canSend) await queueEmail(email.id);
      refresh();
      toast.success(canSend
        ? 'Introduction approved — it’s on its way from your inbox.'
        : 'Approved. Connect your inbox to send it.');
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
    setBulking(true);
    try {
      for (const email of pending) {
        await approveEmail(email.id);
        if (canSend) await queueEmail(email.id);
      }
      refresh();
      toast.success(`${pending.length} introductions approved${canSend ? ' — sending now.' : '.'}`);
    } catch (err) {
      toast.error(err?.message || 'Some introductions could not be approved.');
      refresh();
    } finally {
      setBulking(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in font-roboto">

      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">Introductions</h1>
        <p className="text-sm text-secondary-dark mt-1">
          Polished letters your headhunter wrote — review, tweak, and approve.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-stretch gap-2">
        <TabButton id="pending" label="Pending Review" count={pending.length} active={tab === 'pending'} onClick={() => setTab('pending')} />
        <TabButton id="sent"    label="Sent"           count={sentList.length} active={tab === 'sent'}    onClick={() => setTab('sent')} />
        <TabButton id="replies" label="Got Replies"    count={replies.length}  active={tab === 'replies'} pulse onClick={() => setTab('replies')} />
      </div>

      {/* Connect-inbox nudge — approving works without it, but sending needs it */}
      {!canSend && pending.length > 0 && tab === 'pending' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Mail className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 flex-1 min-w-0">
            You can approve now, but introductions send from your own inbox. Connect it to start sending.
          </p>
          <button onClick={() => navigate('/dashboard/settings')} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900">
            Connect <ArrowRight className="w-3.5 h-3.5" />
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
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-6 h-6" />}
            title="No introductions waiting. Head to Opportunities to reach out to more roles."
            action="Go to Opportunities"
            onAction={() => navigate('/dashboard/opportunities')}
          />
        ) : (
          <div className="space-y-4">
            {pending.length >= 3 && (
              <div className="rounded-2xl border border-neutral-dark bg-white shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <button
                    onClick={approveAll}
                    disabled={bulking}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-4 py-2 text-sm shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {bulking ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : <>Approve all {pending.length} introductions</>}
                  </button>
                </div>
                <p className="text-xs text-secondary-dark flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  Review each one first — your headhunter recommends a quick scan.
                </p>
              </div>
            )}
            {pending.map((email) => (
              <IntroCard
                key={email.id}
                email={email}
                canSend={canSend}
                busy={bulking}
                onApprove={approveOne}
                onDiscard={discardOne}
                onSaveEdit={handleSaveEdit}
              />
            ))}
          </div>
        )
      ) : tab === 'sent' ? (
        sentList.length === 0 ? (
          <EmptyState icon={<Send className="w-6 h-6" />} title="No introductions sent yet. Approve a pending introduction to get started." />
        ) : (
          <div className="space-y-4">
            {sentList.map((email) => <SentCard key={email.id} email={email} />)}
          </div>
        )
      ) : (
        replies.length === 0 ? (
          <EmptyState icon={<PartyPopper className="w-6 h-6" />} title="No replies yet. They’re coming — most replies arrive within 3–7 days of sending." />
        ) : (
          <div className="space-y-4">
            {replies.map((email) => <ReplyCard key={email.id} email={email} reachedCount={reachedCount} />)}
          </div>
        )
      )}
    </div>
  );
};

export default OutreachPage;
