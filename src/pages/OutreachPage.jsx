import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mail, Send, CheckCircle2, MessageSquare, X, ArrowRight } from 'lucide-react';
import { ApplyDirLoader } from '../components/ui/ApplyDirLoader';
import { getDraftEmails, getSentEmails, approveEmail, queueEmail, editEmail } from '../services/apiOutreach';
import { getGmailAccounts } from '../services/apiGmail';

// ── Introductions — the Outreach Review ───────────────────────────────────
// One calm, scrollable view: review the drafts your headhunter wrote, tweak
// anything (the IKEA effect), and approve them to send from your own inbox.
// No tabs, no jargon. Three sections: Pending Review → Recently Sent → Replies.

const contactName = (email) => {
  const c = email.contact || {};
  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return name || c.email || 'the team';
};

// ═══════════════════════════════════════════════════════════════════════════
// Draft card — inline editable, approve & send
// ═══════════════════════════════════════════════════════════════════════════
function DraftCard({ email, canSend, onNeedConnect, onSaveEdit, onApproveSend }) {
  const [subject, setSubject] = useState(email.subject || '');
  const [body, setBody] = useState(email.body || '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [approving, setApproving] = useState(false);
  const dirty = useRef(false);

  // Re-seed if the underlying draft changes identity.
  useEffect(() => {
    setSubject(email.subject || '');
    setBody(email.body || '');
    dirty.current = false;
  }, [email.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveIfDirty = async () => {
    if (!dirty.current) return;
    setSaving(true);
    try {
      await onSaveEdit(email.id, subject, body);
      dirty.current = false;
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
    } catch {
      toast.error('Could not save your edit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!canSend) { onNeedConnect(); return; }
    setApproving(true);
    try {
      await saveIfDirty();
      await onApproveSend(email.id);
    } catch {
      /* surfaced by the parent mutation's onError */
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6">
      {/* Recipient */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-secondary-dark min-w-0">
          To: <span className="font-semibold text-black-light">{contactName(email)}</span>
          {email.job_title && (
            <span className="text-secondary-dark"> ({email.job_title}{email.company_name ? ` · ${email.company_name}` : ''})</span>
          )}
        </p>
        {justSaved && (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Subject */}
      <div className="mt-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => { setSubject(e.target.value); dirty.current = true; }}
          onBlur={saveIfDirty}
          className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
        />
      </div>

      {/* Body — fully editable */}
      <div className="mt-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); dirty.current = true; }}
          onBlur={saveIfDirty}
          rows={9}
          className="w-full px-3.5 py-3 rounded-xl border border-neutral-dark bg-white text-sm text-black leading-relaxed outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all resize-y"
        />
        <p className="text-xs text-secondary-dark/60 mt-1.5">Edits save automatically — make it sound like you.</p>
      </div>

      {/* Action */}
      <div className="mt-4 flex items-center justify-end gap-3">
        {saving && <span className="text-xs text-secondary-dark">Saving…</span>}
        <button
          onClick={handleApprove}
          disabled={approving}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-primary-dark/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {approving
            ? <><ApplyDirLoader.Button variant="light" /> Sending…</>
            : <>Approve &amp; Send <Send className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sent / queued — compact row
// ═══════════════════════════════════════════════════════════════════════════
function SentRow({ email }) {
  const queued = email.is_queued && email.status === 'approved';
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-neutral-dark shadow-sm px-4 py-3">
      <span className="w-9 h-9 rounded-lg bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center shrink-0 font-montserrat font-bold text-sm">
        {(email.company_name || '?').trim().charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-black-light truncate">{contactName(email)}</p>
        <p className="text-xs text-secondary-dark truncate">{email.company_name || email.job_title || '—'}</p>
      </div>
      {queued ? (
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          🟡 Queued
        </span>
      ) : (
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          🟢 Sent
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Reply — the hero moment
// ═══════════════════════════════════════════════════════════════════════════
function ReplyCard({ email }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900 truncate">{contactName(email)} replied!</p>
          <p className="text-xs text-emerald-700/80 truncate">
            {email.company_name}{email.job_title ? ` · ${email.job_title}` : ''}
          </p>
        </div>
      </div>
      <a
        href="https://mail.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
      >
        Check your Gmail to continue the conversation <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Connect-inbox gate modal
// ═══════════════════════════════════════════════════════════════════════════
function ConnectInboxModal({ onClose, onConnect }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-dark shadow-2xl p-6 md:p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-secondary-dark/60 hover:text-black-light hover:bg-neutral transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary-light to-primary-dark flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary-light/30">
          <Mail className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold font-montserrat text-black-light">
          Connect your email to send
        </h2>
        <p className="mt-2 text-sm text-secondary-dark leading-relaxed">
          Your introductions are sent directly from your real inbox. That&rsquo;s why
          hiring managers reply.
        </p>
        <button
          onClick={onConnect}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-3 shadow-sm hover:opacity-90 transition-all"
        >
          Connect Gmail <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <h2 className="font-montserrat text-xl font-bold text-black-light">{title}</h2>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-neutral text-secondary-dark text-xs font-bold">
          {count}
        </span>
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
  const [showConnectModal, setShowConnectModal] = useState(false);

  // ── Data (preserved: /api/outreach/emails/ via draft + sent fetchers) ─────
  const { data: drafts = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['outreach-drafts'],
    queryFn: getDraftEmails,
    // Drafts arrive a few seconds after "Reach Out" (auto-draft runs in the
    // background), so poll while the page is open and refetch on focus.
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const { data: sentEmails = [], isLoading: loadingSent } = useQuery({
    queryKey: ['outreach-sent'],
    queryFn: getSentEmails,
  });
  const { data: inboxData } = useQuery({
    queryKey: ['gmailAccounts'],
    queryFn: getGmailAccounts,
  });
  const connectedInboxes = Array.isArray(inboxData) ? inboxData : (inboxData?.results ?? []);
  const canSend = connectedInboxes.length > 0;

  const loading = loadingDrafts || loadingSent;

  // ── Derived sections ──────────────────────────────────────────────────────
  const pending = drafts; // status === 'draft'
  const queued  = sentEmails.filter(e => e.is_queued && e.status === 'approved');
  const sent    = sentEmails.filter(e => ['sent', 'opened', 'bounced'].includes(e.status));
  const replies = sentEmails.filter(e => e.status === 'replied');
  const recentlySent = [...queued, ...sent];

  // ── Mutations (preserved: edit + approve) ─────────────────────────────────
  const editMutation = useMutation({
    mutationFn: ({ id, subject, body }) => editEmail(id, { subject, body }),
  });

  const approveSendMutation = useMutation({
    mutationFn: async (id) => {
      await approveEmail(id);
      await queueEmail(id);
    },
    onSuccess: () => {
      toast.success('Introduction approved — it’s on its way from your inbox.');
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-counts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('inbox') || msg.includes('gmail')) { setShowConnectModal(true); return; }
      toast.error(err?.message || 'Could not send. Please try again.');
    },
  });

  const handleSaveEdit = (id, subject, body) => editMutation.mutateAsync({ id, subject, body });
  const handleApproveSend = (id) => approveSendMutation.mutateAsync(id);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in font-roboto">

      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-black-light">
          Introductions
        </h1>
        <p className="text-sm text-secondary-dark mt-1">
          Review what your headhunter wrote, tweak anything, and send from your inbox.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6 animate-pulse">
              <div className="h-3 w-1/3 rounded bg-neutral-dark" />
              <div className="h-9 w-full rounded-xl bg-neutral-dark mt-4" />
              <div className="h-32 w-full rounded-xl bg-neutral-dark/70 mt-3" />
              <div className="flex justify-end mt-4"><div className="h-10 w-36 rounded-xl bg-neutral-dark" /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1: Pending Review ─────────────────────────────────── */}
          <section>
            <SectionHeader title="Pending Review" count={pending.length} />
            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-8 text-center">
                <p className="text-sm text-secondary-dark">
                  No introductions waiting. Approve more opportunities to generate drafts.
                </p>
                <button
                  onClick={() => navigate('/dashboard/opportunities')}
                  className="mt-4 inline-flex items-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-4 py-2 text-sm transition-all"
                >
                  View Opportunities <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {pending.map(email => (
                  <DraftCard
                    key={email.id}
                    email={email}
                    canSend={canSend}
                    onNeedConnect={() => setShowConnectModal(true)}
                    onSaveEdit={handleSaveEdit}
                    onApproveSend={handleApproveSend}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Section 2: Recently Sent ──────────────────────────────────── */}
          <section>
            <SectionHeader title="Recently Sent" count={recentlySent.length} />
            {recentlySent.length === 0 ? (
              <p className="text-sm text-secondary-dark">Nothing sent yet — approve a draft above to get going.</p>
            ) : (
              <div className="space-y-2.5">
                {recentlySent.map(email => <SentRow key={email.id} email={email} />)}
              </div>
            )}
          </section>

          {/* ── Section 3: Replies & Next Steps ───────────────────────────── */}
          <section>
            <SectionHeader title="Replies & Next Steps" count={replies.length} />
            {replies.length === 0 ? (
              <p className="text-sm text-secondary-dark">
                No replies yet — we&rsquo;ll surface them here the moment someone writes back.
              </p>
            ) : (
              <div className="space-y-3">
                {replies.map(email => <ReplyCard key={email.id} email={email} />)}
              </div>
            )}
          </section>
        </>
      )}

      {/* Gmail connection gate */}
      {showConnectModal && (
        <ConnectInboxModal
          onClose={() => setShowConnectModal(false)}
          onConnect={() => { setShowConnectModal(false); navigate('/dashboard/settings'); }}
        />
      )}
    </div>
  );
};

export default OutreachPage;
