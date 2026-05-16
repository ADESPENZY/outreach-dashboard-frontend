import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Send, Users, FileText, CheckCircle, Search, Building, Mail,
  Loader2, ChevronDown, ChevronUp, Sparkles, Pencil, X, UserCheck,
  MailOpen, MessageSquare, ShieldCheck, Download, Clock, ListOrdered,
  Trash2, CalendarClock, Ban, ExternalLink,
} from 'lucide-react';
import {
  getContacts, getDraftEmails, getSentEmails, getHunterQuota,
  findContacts, generateEmail, approveEmail,
  markEmailReplied, runFollowups, generateJobCV, editEmail,
  queueEmail, queueAllEmails,
  deleteEmail, unqueueEmail, rescheduleEmail,
} from '../services/apiOutreach';
import TailoredCVPreview from '../components/TailoredCVPreview';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'contacts', label: 'Contacts',        icon: Users },
  { key: 'drafts',   label: 'Drafts',          icon: FileText },
  { key: 'queue',    label: 'Queue & Sent',    icon: Send },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  draft:    { pill: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  approved: { pill: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-400' },
  sent:     { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  opened:   { pill: 'bg-purple-50 text-purple-700 border-purple-200',  dot: 'bg-purple-500' },
  replied:  { pill: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500' },
  bounced:  { pill: 'bg-red-50 text-red-600 border-red-200',         dot: 'bg-red-500' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { pill: 'bg-neutral-dark text-secondary-dark border-neutral-dark', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtShortTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const OutreachPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]     = useState('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [editModal, setEditModal]     = useState(null);

  // Legacy loading states for non-mutation actions
  const [findingContacts, setFindingContacts] = useState(false);
  const [generatingAll, setGeneratingAll]     = useState(false);
  const [generatingFor, setGeneratingFor]     = useState(null);
  const [approvingId, setApprovingId]         = useState(null);
  const [replyingId, setReplyingId]           = useState(null);
  const [runningFollowups, setRunningFollowups] = useState(false);
  const [generatingCvFor, setGeneratingCvFor] = useState(null);
  const [cvPreviewModal, setCvPreviewModal]   = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: contacts = [],   isLoading: loadingContacts } = useQuery({ queryKey: ['outreach-contacts'], queryFn: getContacts });
  const { data: drafts = [],     isLoading: loadingDrafts }   = useQuery({ queryKey: ['outreach-drafts'],   queryFn: getDraftEmails });
  const { data: sentEmails = [], isLoading: loadingSent }     = useQuery({ queryKey: ['outreach-sent'],     queryFn: getSentEmails });
  const { data: hunterQuota = null } = useQuery({
    queryKey: ['hunter-quota'],
    queryFn: () => getHunterQuota().catch(() => null),
  });

  const loading = loadingContacts || loadingDrafts || loadingSent;

  // ── Queue mutations ────────────────────────────────────────────────────────
  const queueSingleMutation = useMutation({
    mutationFn: (id) => queueEmail(id),
    onSuccess: (data) => {
      if (data.status === 'already_sent') return toast.info('Already sent.');
      if (data.status === 'already_queued') return toast.info('Already in queue.');
      const t = fmtTime(data.scheduled_send_at);
      toast.success(`Queued! Sends ${t}`);
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    },
    onError: (err) => toast.error('Queue failed: ' + err.message),
  });

  const queueAllMutation = useMutation({
    mutationFn: queueAllEmails,
    onSuccess: (data) => {
      if (!data.queued) return toast.info('No approved emails to queue.');
      toast.success(`${data.queued} emails queued. Last one: ${data.estimated_completion}`, { autoClose: 8000 });
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    },
    onError: (err) => toast.error('Queue all failed: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteEmail(id),
    onSuccess: (_, id) => {
      toast.success('Email removed.');
      queryClient.setQueryData(['outreach-drafts'], old => (old || []).filter(e => e.id !== id));
      queryClient.setQueryData(['outreach-sent'],   old => (old || []).filter(e => e.id !== id));
    },
    onError: (err) => toast.error('Delete failed: ' + err.message),
  });

  const unqueueMutation = useMutation({
    mutationFn: (id) => unqueueEmail(id),
    onSuccess: () => {
      toast.success('Removed from queue.');
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    },
    onError: (err) => toast.error('Unqueue failed: ' + err.message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, sendAt }) => rescheduleEmail(id, sendAt),
    onSuccess: (data) => {
      toast.success(`Rescheduled → ${fmtTime(data.scheduled_send_at)}`);
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    },
    onError: (err) => toast.error('Reschedule failed: ' + err.message),
  });

  // ── Other handlers ─────────────────────────────────────────────────────────
  const handleFindContacts = async () => {
    setFindingContacts(true);
    try {
      const d = await findContacts(10);
      if (d.new_contacts_found === 0 && d.skipped_already_searched > 0) {
        toast.info(`Skipped ${d.skipped_already_searched} jobs we already checked. No new contacts found.`);
      } else if (d.new_contacts_found > 0) {
        toast.success(`Found ${d.new_contacts_found} new decision makers! (Skipped ${d.skipped_already_searched || 0} already checked)`);
      } else {
        toast.success(`Search complete. No new contacts found.`);
      }
      queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setFindingContacts(false); }
  };

  const handleGenerateEmail = async (jobId) => {
    setGeneratingFor(jobId);
    try {
      await generateEmail(jobId);
      toast.success('Draft generated!');
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setGeneratingFor(null); }
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    let ok = 0, fail = 0;
    const pending = contacts.filter(c =>
      !drafts.some(d => d.job_id === c.job?.id) &&
      !sentEmails.some(s => s.job_id === c.job?.id)
    );
    for (const c of pending) {
      try { await generateEmail(c.job?.id); ok++; } catch { fail++; }
    }
    toast.success(`Generated ${ok} drafts${fail ? `, ${fail} failed` : ''}`);
    queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
    setGeneratingAll(false);
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await approveEmail(id);
      toast.success('Approved → go to Queue & Sent to schedule it.');
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setApprovingId(null); }
  };

  const handleMarkReplied = async (id) => {
    setReplyingId(id);
    try {
      await markEmailReplied(id);
      toast.success('Marked as replied!');
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setReplyingId(null); }
  };

  const handleRunFollowups = async () => {
    setRunningFollowups(true);
    try {
      const d = await runFollowups();
      toast.success(`Follow-ups: ${d.sent} sent, ${d.errors} errors, ${d.skipped} skipped`);
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setRunningFollowups(false); }
  };

  const handleGenerateCv = async (jobId) => {
    setGeneratingCvFor(jobId);
    try {
      const cvData = await generateJobCV(jobId);
      setCvPreviewModal({ jobId, data: cvData });
      toast.success('CV generated — preview ready!');
    } catch (err) { toast.error('CV failed: ' + err.message); }
    finally { setGeneratingCvFor(null); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filteredContacts = contacts.filter(c =>
    !q ||
    (c.job?.company_name || '').toLowerCase().includes(q) ||
    (c.job?.title || '').toLowerCase().includes(q) ||
    (c.first_name || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );

  const hasEmailForJob = (jobId) =>
    drafts.some(d => d.job_id === jobId) || sentEmails.some(s => s.job_id === jobId);

  // Stats
  const stats = {
    contacts: contacts.length,
    drafts:   drafts.length,
    queued:   sentEmails.filter(e => e.is_queued && e.status === 'approved').length,
    sent:     sentEmails.filter(e => e.status === 'sent').length,
    opened:   sentEmails.filter(e => e.status === 'opened').length,
    replied:  sentEmails.filter(e => e.status === 'replied').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in font-roboto">

      {/* CV Preview Modal */}
      {cvPreviewModal && (
        <TailoredCVPreview
          jobId={cvPreviewModal.jobId}
          data={cvPreviewModal.data}
          onClose={() => setCvPreviewModal(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
          Outreach
        </h1>
        <p className="text-sm text-secondary-dark mt-1">Find contacts → generate emails → queue to send during business hours</p>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Contacts', value: stats.contacts, color: 'text-accent-teal',    bg: 'bg-accent-teal/10' },
            { label: 'Drafts',   value: stats.drafts,   color: 'text-amber-600',       bg: 'bg-amber-50' },
            { label: 'Queued',   value: stats.queued,   color: 'text-secondary-dark',  bg: 'bg-neutral' },
            { label: 'Sent',     value: stats.sent,     color: 'text-emerald-600',     bg: 'bg-emerald-50' },
            { label: 'Opened',   value: stats.opened,   color: 'text-purple-600',      bg: 'bg-purple-50' },
            { label: 'Replied',  value: stats.replied,  color: 'text-green-600',       bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-neutral-dark flex flex-col items-center`}>
              <span className={`text-2xl font-bold font-montserrat ${s.color}`}>{s.value}</span>
              <span className="text-[11px] text-secondary-dark font-medium mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
        <div className="flex border-b border-neutral-dark">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = tab.key === 'contacts' ? contacts.length
                        : tab.key === 'drafts'   ? drafts.length
                        : sentEmails.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                  isActive
                    ? 'text-primary-dark border-primary-light bg-primary-light/5'
                    : 'text-secondary-dark border-transparent hover:bg-neutral'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-primary-light/20 text-primary-dark' : 'bg-neutral-dark text-secondary-dark'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-light" />
              <p className="mt-3 text-sm text-secondary-dark animate-pulse">Loading…</p>
            </div>
          ) : (
            <>
              {activeTab === 'contacts' && (
                <ContactsTab
                  contacts={filteredContacts}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onFindContacts={handleFindContacts}
                  findingContacts={findingContacts}
                  onGenerateEmail={handleGenerateEmail}
                  generatingFor={generatingFor}
                  hasEmailForJob={hasEmailForJob}
                  hunterQuota={hunterQuota}
                />
              )}
              {activeTab === 'drafts' && (
                <DraftsTab
                  drafts={drafts}
                  onApprove={handleApprove}
                  approvingId={approvingId}
                  onGenerateAll={handleGenerateAll}
                  generatingAll={generatingAll}
                  onEdit={setEditModal}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  deleting={deleteMutation.isPending ? deleteMutation.variables : null}
                  onGenerateCv={handleGenerateCv}
                  generatingCvFor={generatingCvFor}
                />
              )}
              {activeTab === 'queue' && (
                <QueueTab
                  emails={sentEmails}
                  onQueueSingle={(id) => queueSingleMutation.mutate(id)}
                  queuingId={queueSingleMutation.isPending ? queueSingleMutation.variables : null}
                  onQueueAll={() => queueAllMutation.mutate()}
                  queuingAll={queueAllMutation.isPending}
                  onUnqueue={(id) => unqueueMutation.mutate(id)}
                  unqueuingId={unqueueMutation.isPending ? unqueueMutation.variables : null}
                  onReschedule={(id, sendAt) => rescheduleMutation.mutate({ id, sendAt })}
                  reschedulingId={rescheduleMutation.isPending ? rescheduleMutation.variables?.id : null}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  deleting={deleteMutation.isPending ? deleteMutation.variables : null}
                  onMarkReplied={handleMarkReplied}
                  replyingId={replyingId}
                  onRunFollowups={handleRunFollowups}
                  runningFollowups={runningFollowups}
                  onGenerateCv={handleGenerateCv}
                  generatingCvFor={generatingCvFor}
                />
              )}
            </>
          )}
        </div>
      </div>

      {editModal && (
        <EditEmailModal
          email={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => {
            setEditModal(null);
            queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
          }}
        />
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1 — CONTACTS
// ═════════════════════════════════════════════════════════════════════════════
function HunterQuotaBadge({ quota }) {
  if (!quota) return null;
  const { searches_remaining, searches_limit, plan, dry_run } = quota;
  const color = searches_remaining > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : searches_remaining >= 5  ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-red-50 text-red-600 border-red-200';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${color}`}>
      <ShieldCheck className="w-3.5 h-3.5" />
      Hunter.io ({plan}): {searches_remaining}/{searches_limit} remaining
      {dry_run && <span className="ml-1 px-1.5 py-0.5 bg-neutral-dark text-secondary-dark rounded text-[10px] font-bold">DRY RUN</span>}
    </div>
  );
}

function ContactsTab({ contacts, searchQuery, setSearchQuery, onFindContacts, findingContacts, onGenerateEmail, generatingFor, hasEmailForJob, hunterQuota }) {
  return (
    <div className="space-y-4">
      <HunterQuotaBadge quota={hunterQuota} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-dark/50 w-4 h-4" />
          <input
            type="text" placeholder="Search contacts…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/40 outline-none"
          />
        </div>
        <button
          onClick={onFindContacts} disabled={findingContacts}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-black/10 hover:bg-black/80 transition-all active:scale-95 disabled:opacity-60"
        >
          {findingContacts ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          {findingContacts ? 'Scanning LinkedIn & Hunter...' : 'Find Decision Makers'}
        </button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts yet" subtitle="Approve jobs on the Jobs page, then click Find Contacts." />
      ) : (
        <div className="w-full overflow-x-auto overflow-y-hidden border border-neutral-dark sm:rounded-xl">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-neutral/70 border-b border-neutral-dark text-[11px] uppercase tracking-wider text-secondary-dark font-semibold font-montserrat">
                <th className="p-3.5 pl-4">Company</th>
                <th className="p-3.5 hidden lg:table-cell">Contact</th>
                <th className="p-3.5 hidden md:table-cell">Email</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-neutral/40 transition-colors">
                  <td className="p-3.5 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center shrink-0">
                        <Building className="w-3.5 h-3.5 text-accent-teal" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-black line-clamp-1">{c.job?.company_name || '—'}</p>
                        <p className="text-[11px] text-secondary-dark line-clamp-1">{c.job?.title || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 hidden lg:table-cell">
                    <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                    <p className="text-[11px] text-secondary-dark">{c.title || '—'}</p>
                  </td>
                  <td className="p-3.5 hidden md:table-cell">
                    <a href={`mailto:${c.email}`} className="text-sm text-primary-dark hover:underline">{c.email}</a>
                  </td>
                  <td className="p-3.5">
                    {c.confidence_score != null ? (
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                        c.confidence_score >= 80 ? 'text-green-600 bg-green-50 border-green-200'
                        : c.confidence_score >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                        : 'text-red-500 bg-red-50 border-red-200'
                      }`}>{c.confidence_score}%</span>
                    ) : <span className="text-secondary-dark/40 text-xs">—</span>}
                  </td>
                  <td className="p-3.5 pr-4 text-right">
                    {hasEmailForJob(c.job?.id) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Generated
                      </span>
                    ) : (
                      <button
                        onClick={() => onGenerateEmail(c.job?.id)}
                        disabled={generatingFor === c.job?.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
                      >
                        {generatingFor === c.job?.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Generate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2 — DRAFTS
// ═════════════════════════════════════════════════════════════════════════════
function DraftsTab({ drafts, onApprove, approvingId, onGenerateAll, generatingAll, onEdit, onDelete, deleting, onGenerateCv, generatingCvFor }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onGenerateAll} disabled={generatingAll}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-orange-100 transition-all active:scale-95 disabled:opacity-70"
        >
          {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate All
        </button>
      </div>

      {drafts.length === 0 ? (
        <EmptyState icon={FileText} title="No drafts yet" subtitle="Visit the Contacts tab and click Generate for a contact." />
      ) : (
        <div className="grid gap-3">
          {drafts.map(email => (
            <EmailCard
              key={email.id}
              email={email}
              onApprove={() => onApprove(email.id)}
              approving={approvingId === email.id}
              onEdit={() => onEdit(email)}
              onDelete={() => onDelete(email.id)}
              deleting={deleting === email.id}
              onGenerateCv={onGenerateCv}
              generatingCvFor={generatingCvFor}
              showApprove
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3 — QUEUE & SENT
// ═════════════════════════════════════════════════════════════════════════════
function QueueTab({
  emails, onQueueSingle, queuingId, onQueueAll, queuingAll,
  onUnqueue, unqueuingId, onReschedule, reschedulingId,
  onDelete, deleting, onMarkReplied, replyingId, onRunFollowups,
  runningFollowups, onGenerateCv, generatingCvFor,
}) {
  const approvedUnqueued = emails.filter(e => e.status === 'approved' && !e.is_queued);
  const queued           = emails.filter(e => e.is_queued && e.status === 'approved').sort((a, b) => new Date(a.scheduled_send_at) - new Date(b.scheduled_send_at));
  const sent             = emails.filter(e => ['sent','opened','replied','bounced'].includes(e.status));
  const dueFollowups     = sent.filter(e => ['sent','opened'].includes(e.status) && e.next_followup_at && new Date(e.next_followup_at) <= new Date()).length;

  const nextSlot = queued[0]?.scheduled_send_at;

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {approvedUnqueued.length > 0 && (
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
              {approvedUnqueued.length} approved, not queued
            </span>
          )}
          {queued.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral border border-neutral-dark rounded-full text-xs font-semibold text-secondary-dark">
              <Clock className="w-3 h-3" /> {queued.length} queued
              {nextSlot && <span className="text-secondary-dark/60">· next {fmtShortTime(nextSlot)}</span>}
            </span>
          )}
          {dueFollowups > 0 && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
              {dueFollowups} follow-up{dueFollowups > 1 ? 's' : ''} due
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {approvedUnqueued.length > 0 && (
            <button
              onClick={onQueueAll} disabled={queuingAll}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-black/10 hover:bg-black/80 transition-all active:scale-95 disabled:opacity-60"
            >
              {queuingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListOrdered className="w-4 h-4" />}
              {queuingAll ? 'Queuing…' : `Queue All (${approvedUnqueued.length})`}
            </button>
          )}
          <button
            onClick={onRunFollowups} disabled={runningFollowups}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-violet-200 hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
          >
            {runningFollowups ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Follow-ups
          </button>
        </div>
      </div>

      {/* Business hours notice */}
      <div className="flex items-center gap-2 text-xs text-secondary-dark/70 bg-neutral border border-neutral-dark rounded-xl px-4 py-2.5">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Emails send Mon–Fri, 8:00 AM – 5:00 PM UTC · one email per 5 minutes · never batched
      </div>

      {/* Not queued yet */}
      {approvedUnqueued.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-dark mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Ready to queue ({approvedUnqueued.length})
          </h3>
          <div className="grid gap-3">
            {approvedUnqueued.map(email => (
              <EmailCard
                key={email.id}
                email={email}
                onQueue={() => onQueueSingle(email.id)}
                queueing={queuingId === email.id}
                onDelete={() => onDelete(email.id)}
                deleting={deleting === email.id}
                onGenerateCv={onGenerateCv}
                generatingCvFor={generatingCvFor}
                showQueue
              />
            ))}
          </div>
        </section>
      )}

      {/* Queued */}
      {queued.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-dark mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" /> Scheduled ({queued.length})
          </h3>
          <div className="grid gap-3">
            {queued.map(email => (
              <EmailCard
                key={email.id}
                email={email}
                onUnqueue={() => onUnqueue(email.id)}
                unqueueing={unqueuingId === email.id}
                onReschedule={(sendAt) => onReschedule(email.id, sendAt)}
                rescheduling={reschedulingId === email.id}
                onDelete={() => onDelete(email.id)}
                deleting={deleting === email.id}
                onGenerateCv={onGenerateCv}
                generatingCvFor={generatingCvFor}
                showScheduled
              />
            ))}
          </div>
        </section>
      )}

      {/* Sent / Opened / Replied */}
      {sent.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-dark mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sent history ({sent.length})
          </h3>
          <div className="grid gap-3">
            {sent.map(email => (
              <EmailCard
                key={email.id}
                email={email}
                onMarkReplied={() => onMarkReplied(email.id)}
                markingReplied={replyingId === email.id}
                showMarkReplied={['sent','opened'].includes(email.status)}
                onGenerateCv={onGenerateCv}
                generatingCvFor={generatingCvFor}
                showTimestamps
              />
            ))}
          </div>
        </section>
      )}

      {approvedUnqueued.length === 0 && queued.length === 0 && sent.length === 0 && (
        <EmptyState icon={Send} title="Nothing here yet" subtitle="Approve email drafts then queue them to send." />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL CARD
// ═════════════════════════════════════════════════════════════════════════════
function EmailCard({
  email,
  onApprove, approving, onEdit,
  onQueue, queueing, showQueue,
  onUnqueue, unqueueing,
  onReschedule, rescheduling,
  onDelete, deleting,
  onMarkReplied, markingReplied, showMarkReplied,
  showApprove, showScheduled, showTimestamps,
  onGenerateCv, generatingCvFor,
}) {
  const [expanded, setExpanded]       = useState(false);
  const [confirmDelete, setConfirm]   = useState(false);
  const [rescheduleOpen, setReschOpen] = useState(false);
  const [rescheduleVal, setReschVal]  = useState('');

  const lines   = (email.body || '').split('\n');
  const preview = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  const handleDelete = () => {
    if (!confirmDelete) { setConfirm(true); return; }
    onDelete();
    setConfirm(false);
  };

  const handleReschedule = () => {
    if (!rescheduleVal) return;
    onReschedule(new Date(rescheduleVal).toISOString());
    setReschOpen(false);
    setReschVal('');
  };

  // Min datetime for the picker — now + 1 minute
  const minDT = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="bg-white border border-neutral-dark rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-dark">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary-light/10 border border-primary-light/20 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-primary-light" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-black truncate">{email.company_name || '—'}</p>
            <p className="text-[11px] text-secondary-dark truncate">{email.job_title || '—'}</p>
            {email.contact && (
              <p className="text-[11px] text-secondary-dark/60 truncate">
                → <span className="font-medium text-secondary-dark">{email.contact.first_name} {email.contact.last_name}</span>
                {' '}({email.contact.email})
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          {email.followup_count > 0 && (
            <span className="px-2 py-0.5 bg-primary-light/10 text-primary-dark border border-primary-light/20 rounded-full text-[10px] font-bold uppercase">
              Follow-up {email.followup_count}
            </span>
          )}
          <StatusPill status={email.status} />
          {/* Queue time chip */}
          {email.is_queued && email.scheduled_send_at && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-neutral border border-neutral-dark rounded-full text-[10px] font-semibold text-secondary-dark">
              <Clock className="w-3 h-3" /> {fmtTime(email.scheduled_send_at)}
            </span>
          )}
        </div>
      </div>

      {/* Subject + body */}
      <div className="px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-dark/50 mb-0.5">Subject</p>
        <p className="text-sm font-semibold text-black mb-3">{email.subject}</p>
        <div className="bg-neutral rounded-xl p-3.5 text-sm text-secondary-dark leading-relaxed whitespace-pre-wrap font-mono border border-neutral-dark text-[12px]">
          {expanded ? email.body : preview}
          {hasMore && !expanded && '…'}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary-light mt-1.5 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Show full email</>}
          </button>
        )}
      </div>

      {/* Timestamps */}
      {showTimestamps && (
        <div className="px-5 pb-2 flex flex-wrap gap-3">
          {email.sent_at && (
            <span className="flex items-center gap-1 text-[11px] text-secondary-dark">
              <Send className="w-3 h-3" /> Sent {fmtTime(email.sent_at)}
            </span>
          )}
          {email.opened_at && (
            <span className="flex items-center gap-1 text-[11px] text-purple-600">
              <MailOpen className="w-3 h-3" /> Opened {fmtTime(email.opened_at)}
            </span>
          )}
          {email.replied_at && (
            <span className="flex items-center gap-1 text-[11px] text-green-600">
              <MessageSquare className="w-3 h-3" /> Replied {fmtTime(email.replied_at)}
            </span>
          )}
          {email.next_followup_at && !email.replied_at && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${new Date(email.next_followup_at) <= new Date() ? 'text-amber-600' : 'text-secondary-dark/50'}`}>
              ⏰ Follow-up {new Date(email.next_followup_at) <= new Date() ? 'due now' : `due ${new Date(email.next_followup_at).toLocaleDateString()}`}
            </span>
          )}
        </div>
      )}

      {/* Reschedule picker (inline) */}
      {rescheduleOpen && (
        <div className="mx-5 mb-3 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <CalendarClock className="w-4 h-4 text-blue-600 shrink-0" />
          <input
            type="datetime-local"
            min={minDT}
            value={rescheduleVal}
            onChange={e => setReschVal(e.target.value)}
            className="flex-1 text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleReschedule}
            disabled={!rescheduleVal || rescheduling}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-1"
          >
            {rescheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Set
          </button>
          <button onClick={() => setReschOpen(false)} className="text-secondary-dark hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Actions bar */}
      <div className="px-5 py-3 border-t border-neutral-dark flex items-center gap-2 justify-between flex-wrap">
        {/* Left: CV */}
        <div className="flex items-center gap-2">
          {onGenerateCv && email.job_id && (
            <button
              onClick={() => onGenerateCv(email.job_id)}
              disabled={generatingCvFor === email.job_id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral border border-neutral-dark text-xs font-semibold text-secondary-dark rounded-lg hover:bg-neutral-dark transition-all disabled:opacity-60"
            >
              {generatingCvFor === email.job_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              CV
            </button>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Edit */}
          {onEdit && (
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary-dark bg-neutral border border-neutral-dark rounded-xl hover:bg-neutral-dark transition-all">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {/* Approve */}
          {showApprove && (
            <button
              onClick={onApprove} disabled={approving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-all disabled:opacity-60"
            >
              {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Approve
            </button>
          )}
          {/* Queue single */}
          {showQueue && (
            <button
              onClick={onQueue} disabled={queueing}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-60"
            >
              {queueing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              Queue
            </button>
          )}
          {/* Reschedule + Unqueue for queued emails */}
          {showScheduled && (
            <>
              <button
                onClick={() => setReschOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
              >
                <CalendarClock className="w-3.5 h-3.5" /> Reschedule
              </button>
              <button
                onClick={onUnqueue} disabled={unqueueing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary-dark bg-neutral border border-neutral-dark rounded-xl hover:bg-neutral-dark transition-all disabled:opacity-60"
              >
                {unqueueing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Unqueue
              </button>
            </>
          )}
          {/* Mark replied */}
          {showMarkReplied && (
            <button
              onClick={onMarkReplied} disabled={markingReplied}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-all disabled:opacity-60"
            >
              {markingReplied ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              Mark Replied
            </button>
          )}
          {/* Delete */}
          {onDelete && !['sent','opened','replied'].includes(email.status) && (
            <button
              onClick={handleDelete} disabled={deleting}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all disabled:opacity-60 ${
                confirmDelete
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  : 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100'
              }`}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
          )}
          {confirmDelete && (
            <button onClick={() => setConfirm(false)} className="text-xs text-secondary-dark hover:text-black underline">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ═════════════════════════════════════════════════════════════════════════════
function EditEmailModal({ email, onClose, onSaved }) {
  const [subject, setSubject] = useState(email.subject || '');
  const [body, setBody]       = useState(email.body || '');
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await editEmail(email.id, { subject, body });
      toast.success('Saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-neutral-dark relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary-dark/60 hover:bg-neutral-dark rounded-full p-1.5">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold font-montserrat mb-5 flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary-light" /> Edit Draft
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark mb-1.5">Subject</label>
            <input
              type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-light/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark mb-1.5">Body</label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)} rows={12}
              className="w-full p-3 bg-neutral border border-neutral-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-light/30 resize-none font-mono leading-relaxed"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral">Cancel</button>
            <button
              onClick={save} disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-black rounded-xl hover:bg-black/80 disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═════════════════════════════════════════════════════════════════════════════
function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-neutral border border-neutral-dark flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-secondary-dark/30" />
      </div>
      <p className="text-base font-semibold text-secondary-dark">{title}</p>
      <p className="text-sm text-secondary-dark/60 mt-1 max-w-xs mx-auto">{subtitle}</p>
    </div>
  );
}

export default OutreachPage;
