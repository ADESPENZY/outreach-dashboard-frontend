import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Send, Users, FileText, CheckCircle, Search, Building, Mail,
  Loader2, ChevronDown, ChevronUp, Sparkles, Pencil, X,
  MailOpen, MessageSquare, Download, Clock, ListOrdered,
  Trash2, CalendarClock, Ban, ExternalLink, AlertTriangle, MapPin,
  DollarSign, Briefcase, Layers, ArrowRight, Zap,
} from 'lucide-react';
import {
  getContacts, getDraftEmails, getSentEmails,
  generateEmail, approveEmail,
  markEmailReplied, runFollowups, generateJobCV, editEmail,
  queueEmail, queueAllEmails,
  deleteEmail, unqueueEmail, rescheduleEmail,
  bulkContactSearch,
} from '../services/apiOutreach';
import { getManualApplyJobs, getApprovedJobs } from '../services/apiJobs';
import { getGmailAccounts } from '../services/apiGmail';
import TailoredCVPreview from '../components/TailoredCVPreview';
import NoInboxModal from '../components/NoInboxModal';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'staging',  label: 'Staging',         icon: Layers },
  { key: 'contacts', label: 'Contacts',        icon: Users },
  { key: 'drafts',   label: 'Drafts',          icon: FileText },
  { key: 'queue',    label: 'Sending',         icon: Send },
  { key: 'manual',   label: 'Manual Apply',    icon: AlertTriangle },
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
// SKELETON LOADER
// ═════════════════════════════════════════════════════════════════════════════
function OutreachSkeleton() {
  return (
    <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-neutral-dark">
      <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2.5 min-w-0">
        <div className="h-3.5 bg-slate-200 animate-pulse rounded-full w-2/5" />
        <div className="h-3 bg-slate-200 animate-pulse rounded-full w-3/5" />
      </div>
      <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-xl shrink-0" />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const OutreachPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]       = useState('staging');
  const [searchQuery, setSearchQuery]   = useState('');
  const [editModal, setEditModal]       = useState(null);
  const [bulkResultModal, setBulkResultModal] = useState(null);
  const [noInboxModal, setNoInboxModal] = useState(false);

  // Loading states
  const [generatingAll, setGeneratingAll]         = useState(false);
  const [generatingFor, setGeneratingFor]         = useState(new Set());
  const [generateModalFor, setGenerateModalFor]   = useState(null);
  const [approvingId, setApprovingId]             = useState(null);
  const [replyingId, setReplyingId]           = useState(null);
  const [runningFollowups, setRunningFollowups] = useState(false);
  const [generatingCvFor, setGeneratingCvFor] = useState(null);
  const [cvPreviewModal, setCvPreviewModal]   = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: contacts = [],        isLoading: loadingContacts } = useQuery({ queryKey: ['outreach-contacts'],   queryFn: getContacts });
  const { data: drafts = [],          isLoading: loadingDrafts }   = useQuery({ queryKey: ['outreach-drafts'],     queryFn: getDraftEmails });
  const { data: sentEmails = [],      isLoading: loadingSent }     = useQuery({ queryKey: ['outreach-sent'],       queryFn: getSentEmails });
  const { data: manualApplyJobs = [], isLoading: loadingManual }   = useQuery({ queryKey: ['manual-apply-jobs'],   queryFn: getManualApplyJobs });
  const { data: approvedJobs = [],    isLoading: loadingApproved } = useQuery({ queryKey: ['approved-jobs'],       queryFn: getApprovedJobs });

  // Staging = approved jobs that don't have a contact yet
  const contactedJobIds = new Set(contacts.map(c => c.job?.id ?? c.job));
  const stagingJobs = approvedJobs.filter(j => !contactedJobIds.has(j.id));

  const { data: connectedInboxes = [], isLoading: loadingInboxes } = useQuery({
    queryKey: ['gmail-accounts'],
    queryFn: getGmailAccounts,
  });

  // Auto-show add-inbox modal the moment user lands on Sending tab with no inbox
  React.useEffect(() => {
    if (activeTab === 'queue' && !loadingInboxes && connectedInboxes.length === 0) {
      setNoInboxModal(true);
    }
  }, [activeTab, loadingInboxes, connectedInboxes.length]);

  const requireInbox = (action) => {
    if (connectedInboxes.length === 0) { setNoInboxModal(true); return; }
    action();
  };

  const loading = loadingContacts || loadingDrafts || loadingSent || loadingManual || loadingApproved;

  // ── Bulk contact search mutation ───────────────────────────────────────────
  const bulkSearchMutation = useMutation({
    mutationFn: bulkContactSearch,
    onSuccess: (data) => {
      if (data.status === 'started') {
        toast.success(`Searching contacts for ${data.total} jobs in the background. Check the Contacts tab in ~2 minutes.`);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
          queryClient.invalidateQueries({ queryKey: ['approved-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['manual-apply-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['hunter-quota'] });
        }, 120_000);
      } else {
        setBulkResultModal(data);
        queryClient.invalidateQueries({ queryKey: ['approved-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['manual-apply-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
        queryClient.invalidateQueries({ queryKey: ['hunter-quota'] });
      }
    },
    onError: (err) => toast.error(err.message || 'Bulk search failed. Please try again.'),
  });

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

  // ── Generate handlers ──────────────────────────────────────────────────────
  const handleGenerateEmail = (jobId) => {
    const contact = contacts.find(c => c.job?.id === jobId);
    setGenerateModalFor({ jobId, contact, bulk: false });
  };

  const handleGenerateAll = () => {
    const pending = contacts.filter(c =>
      !drafts.some(d => d.job_id === c.job?.id) &&
      !sentEmails.some(s => s.job_id === c.job?.id)
    );
    if (pending.length === 0) {
      toast.info('No pending contacts — all have drafts already.');
      return;
    }
    setGenerateModalFor({ bulk: true, pendingContacts: pending });
  };

  const handleGenerateConfirm = async ({ highlight, tone_override }) => {
    if (!generateModalFor) return;
    const { jobId, bulk, pendingContacts } = generateModalFor;
    setGenerateModalFor(null);

    if (bulk) {
      setGeneratingAll(true);
      let ok = 0, fail = 0;
      for (const c of pendingContacts) {
        const id = c.job?.id;
        setGeneratingFor(prev => new Set([...prev, id]));
        try {
          await generateEmail(id, { highlight, tone_override });
          ok++;
        } catch { fail++; }
        finally {
          setGeneratingFor(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
      }
      toast.success(`Generated ${ok} drafts${fail ? `, ${fail} failed` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
      setGeneratingAll(false);
    } else {
      setGeneratingFor(prev => new Set([...prev, jobId]));
      try {
        await generateEmail(jobId, { highlight, tone_override });
        toast.success('Draft generated!');
        queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
      } catch (err) { toast.error('Failed: ' + err.message); }
      finally {
        setGeneratingFor(prev => { const s = new Set(prev); s.delete(jobId); return s; });
      }
    }
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

  const getEmailForJob = (jobId) =>
    drafts.find(d => d.job_id === jobId) || sentEmails.find(s => s.job_id === jobId) || null;

  // Stats
  const stats = {
    staging:  stagingJobs.length,
    contacts: contacts.length,
    drafts:   drafts.length,
    queued:   sentEmails.filter(e => e.is_queued && e.status === 'approved').length,
    sent:     sentEmails.filter(e => e.status === 'sent').length,
    opened:   sentEmails.filter(e => e.status === 'opened').length,
    replied:  sentEmails.filter(e => e.status === 'replied').length,
    manual:   manualApplyJobs.length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in font-roboto">

      {/* No inbox gatekeeper modal */}
      {noInboxModal && <NoInboxModal onClose={() => setNoInboxModal(false)} />}

      {/* Pre-generation questionnaire */}
      {generateModalFor && (
        <GenerateModal
          contact={generateModalFor.contact}
          bulkCount={generateModalFor.bulk ? generateModalFor.pendingContacts?.length : null}
          onConfirm={handleGenerateConfirm}
          onClose={() => setGenerateModalFor(null)}
        />
      )}

      {/* Bulk search result modal */}
      {bulkResultModal && (
        <BulkSearchResultModal
          result={bulkResultModal}
          onClose={() => setBulkResultModal(null)}
          onGoToContacts={() => { setBulkResultModal(null); setActiveTab('contacts'); }}
          onGoToManual={() => { setBulkResultModal(null); setActiveTab('manual'); }}
        />
      )}

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
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {[
            { label: 'Staging',  value: stats.staging,  color: 'text-blue-600',        bg: 'bg-blue-50',       highlight: stats.staging > 0 },
            { label: 'Contacts', value: stats.contacts, color: 'text-accent-teal',      bg: 'bg-accent-teal/10' },
            { label: 'Drafts',   value: stats.drafts,   color: 'text-amber-600',         bg: 'bg-amber-50' },
            { label: 'Queued',   value: stats.queued,   color: 'text-secondary-dark',    bg: 'bg-neutral' },
            { label: 'Sent',     value: stats.sent,     color: 'text-emerald-600',       bg: 'bg-emerald-50' },
            { label: 'Opened',   value: stats.opened,   color: 'text-purple-600',        bg: 'bg-purple-50' },
            { label: 'Replied',  value: stats.replied,  color: 'text-green-600',         bg: 'bg-green-50' },
            { label: 'Manual',   value: stats.manual,   color: 'text-orange-600',        bg: 'bg-orange-50',     highlight: stats.manual > 0 },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border ${s.highlight ? (s.label === 'Staging' ? 'border-blue-300' : 'border-orange-300') : 'border-neutral-dark'} flex flex-col items-center`}>
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
            const count = tab.key === 'staging'  ? stagingJobs.length
                        : tab.key === 'contacts' ? contacts.length
                        : tab.key === 'drafts'   ? drafts.length
                        : tab.key === 'manual'   ? manualApplyJobs.length
                        : sentEmails.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                  isActive
                    ? tab.key === 'staging'
                      ? 'text-blue-700 border-blue-500 bg-blue-50/50'
                      : tab.key === 'manual'
                        ? 'text-orange-700 border-orange-500 bg-orange-50/50'
                        : 'text-primary-dark border-primary-light bg-primary-light/5'
                    : tab.key === 'staging' && stagingJobs.length > 0
                      ? 'text-blue-600 border-transparent hover:bg-blue-50/30'
                      : tab.key === 'manual' && manualApplyJobs.length > 0
                        ? 'text-orange-600 border-transparent hover:bg-orange-50/30'
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
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <OutreachSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {activeTab === 'staging' && (
                <StagingTab
                  jobs={stagingJobs}
                  onRunBulkSearch={() => requireInbox(() => bulkSearchMutation.mutate())}
                  isSearching={bulkSearchMutation.isPending}
                />
              )}
              {activeTab === 'contacts' && (
                <ContactsTab
                  contacts={filteredContacts}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onGenerateEmail={handleGenerateEmail}
                  onGenerateAll={handleGenerateAll}
                  generatingAll={generatingAll}
                  generatingFor={generatingFor}
                  getEmailForJob={getEmailForJob}
                  onSwitchTab={setActiveTab}
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
                  connectedInboxes={connectedInboxes}
                  onAddInbox={() => setNoInboxModal(true)}
                  onQueueSingle={(id) => requireInbox(() => queueSingleMutation.mutate(id))}
                  queuingId={queueSingleMutation.isPending ? queueSingleMutation.variables : null}
                  onQueueAll={() => requireInbox(() => queueAllMutation.mutate())}
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
              {activeTab === 'manual' && (
                <ManualApplyTab
                  jobs={manualApplyJobs}
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
function ContactPipelineAction({ email, jobId, onGenerateEmail, generatingFor, onSwitchTab }) {
  if (!email) {
    return (
      <button
        onClick={() => onGenerateEmail(jobId)}
        disabled={generatingFor.has(jobId)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
      >
        {generatingFor.has(jobId) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {generatingFor.has(jobId) ? 'Writing…' : 'Write Email'}
      </button>
    );
  }
  if (email.status === 'draft') {
    return (
      <button
        onClick={() => onSwitchTab('drafts')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all"
      >
        Review Draft <ArrowRight className="w-3 h-3" />
      </button>
    );
  }
  if (email.status === 'approved' && !email.is_queued) {
    return (
      <button
        onClick={() => onSwitchTab('queue')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all"
      >
        Schedule to Send <ArrowRight className="w-3 h-3" />
      </button>
    );
  }
  if (email.is_queued && email.status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral border border-neutral-dark text-secondary-dark text-xs font-semibold rounded-full">
        <Clock className="w-3 h-3" /> Scheduled
      </span>
    );
  }
  if (['sent', 'opened', 'replied'].includes(email.status)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">
        <CheckCircle className="w-3 h-3" /> Sent
      </span>
    );
  }
  return null;
}

function ContactsTab({ contacts, searchQuery, setSearchQuery, onGenerateEmail, onGenerateAll, generatingAll, generatingFor, getEmailForJob, onSwitchTab }) {
  const pendingGenerate = contacts.filter(c => !getEmailForJob(c.job?.id)).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-dark/50 w-4 h-4" />
          <input
            type="text" placeholder="Search contacts…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/40 outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          {pendingGenerate > 0 && (
            <span className="text-sm text-secondary-dark">
              <span className="font-semibold text-black">{pendingGenerate}</span> ready to generate
            </span>
          )}
          {pendingGenerate > 0 && (
            <button
              onClick={onGenerateAll} disabled={generatingAll}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-orange-100 transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap"
            >
              {generatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generatingAll ? 'Generating…' : `Generate All (${pendingGenerate})`}
            </button>
          )}
        </div>
      </div>

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts yet" subtitle="Approve jobs on the Jobs page, then run the contact search." />
      ) : (
        <div className="w-full overflow-x-auto overflow-y-hidden border border-neutral-dark sm:rounded-xl">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-neutral/70 border-b border-neutral-dark text-[11px] uppercase tracking-wider text-secondary-dark font-semibold font-montserrat">
                <th className="p-3.5 pl-4">Company</th>
                <th className="p-3.5 hidden lg:table-cell">Contact</th>
                <th className="p-3.5 hidden md:table-cell">Email</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5 text-right pr-4">Next Step</th>
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
                    <ContactPipelineAction
                      email={getEmailForJob(c.job?.id)}
                      jobId={c.job?.id}
                      onGenerateEmail={onGenerateEmail}
                      generatingFor={generatingFor}
                      onSwitchTab={onSwitchTab}
                    />
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
  emails, connectedInboxes, onAddInbox, onQueueSingle, queuingId, onQueueAll, queuingAll,
  onUnqueue, unqueuingId, onReschedule, reschedulingId,
  onDelete, deleting, onMarkReplied, replyingId, onRunFollowups,
  runningFollowups, onGenerateCv, generatingCvFor,
}) {
  const noInbox          = !connectedInboxes || connectedInboxes.length === 0;
  const approvedUnqueued = emails.filter(e => e.status === 'approved' && !e.is_queued);
  const scheduled        = emails.filter(e => e.is_queued && e.status === 'approved').sort((a, b) => new Date(a.scheduled_send_at) - new Date(b.scheduled_send_at));
  const sent             = emails.filter(e => ['sent','opened','replied','bounced'].includes(e.status));
  const dueFollowups     = sent.filter(e => ['sent','opened'].includes(e.status) && e.next_followup_at && new Date(e.next_followup_at) <= new Date()).length;
  const nextSlot         = scheduled[0]?.scheduled_send_at;

  return (
    <div className="space-y-6">

      {/* No inbox warning — shown prominently if inbox not connected */}
      {noInbox && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">No email account connected</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need to connect your Gmail before we can send anything. It only takes 30 seconds.
            </p>
          </div>
          <button
            onClick={onAddInbox}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap"
          >
            + Connect Gmail
          </button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {approvedUnqueued.length > 0 && (
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
              {approvedUnqueued.length} email{approvedUnqueued.length !== 1 ? 's' : ''} approved, not scheduled yet
            </span>
          )}
          {scheduled.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral border border-neutral-dark rounded-full text-xs font-semibold text-secondary-dark">
              <Clock className="w-3 h-3" /> {scheduled.length} scheduled
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
              {queuingAll ? 'Scheduling…' : `Schedule All (${approvedUnqueued.length})`}
            </button>
          )}
          <button
            onClick={onRunFollowups} disabled={runningFollowups}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-violet-200 hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
          >
            {runningFollowups ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Follow-ups
          </button>
        </div>
      </div>

      {/* How it works notice */}
      <div className="flex items-center gap-2 text-xs text-secondary-dark/70 bg-neutral border border-neutral-dark rounded-xl px-4 py-2.5">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Emails go out Mon–Fri, 8 AM – 5 PM · one every 5 minutes so they don't look like spam
      </div>

      {/* Approved but not scheduled yet */}
      {approvedUnqueued.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-dark mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Ready to schedule ({approvedUnqueued.length})
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

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-dark mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" /> Scheduled to send ({scheduled.length})
          </h3>
          <div className="grid gap-3">
            {scheduled.map(email => (
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

      {/* Sent history */}
      {sent.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-dark mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sent ({sent.length})
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

      {approvedUnqueued.length === 0 && scheduled.length === 0 && sent.length === 0 && (
        <EmptyState icon={Send} title="Nothing here yet" subtitle="Go to Drafts, approve an email, then come back here to schedule it." />
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
  const [expanded, setExpanded]         = useState(false);
  const [confirmDelete, setConfirm]     = useState(false);
  const [rescheduleOpen, setReschOpen]  = useState(false);
  const [rescheduleVal, setReschVal]    = useState('');
  const [showJobDetails, setShowJobDetails] = useState(false);

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
    <>
    {showJobDetails && (
      <JobDetailsModal email={email} onClose={() => setShowJobDetails(false)} />
    )}
    <div className="bg-white border border-neutral-dark rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-dark">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary-light/10 border border-primary-light/20 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-primary-light" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-black truncate">{email.company_name || '—'}</p>
            <button
              onClick={() => setShowJobDetails(true)}
              className="text-[11px] text-primary-dark hover:underline truncate text-left block max-w-full"
              title="View job details"
            >
              {email.job_title || '—'}
            </button>
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
          {/* Schedule single */}
          {showQueue && (
            <button
              onClick={onQueue} disabled={queueing}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-60"
            >
              {queueing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              {queueing ? 'Scheduling…' : 'Schedule'}
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
                Cancel
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
    </>
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

// ═════════════════════════════════════════════════════════════════════════════
// STAGING TAB — approved jobs waiting for bulk contact search
// ═════════════════════════════════════════════════════════════════════════════
function StagingTab({ jobs, onRunBulkSearch, isSearching }) {
  return (
    <div className="space-y-5">
      {/* Action banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-blue-900">Batch Contact Search</p>
            <p className="text-xs text-blue-700 mt-0.5 max-w-md">
              Uses our AI contact discovery engine to find a decision-maker at each approved company.
              Contacts found move to the <strong>Contacts</strong> tab. Jobs with no email move to <strong>Manual Apply</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={onRunBulkSearch}
          disabled={isSearching || jobs.length === 0}
          className="shrink-0 flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95 whitespace-nowrap"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching for Contacts…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Bulk Contact Search ({jobs.length} Job{jobs.length !== 1 ? 's' : ''})
            </>
          )}
        </button>
      </div>

      {isSearching && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Processing jobs — this can take 30–90 seconds depending on how many companies need a domain lookup. Please wait…</span>
        </div>
      )}

      {/* Job list */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Staging area is empty"
          subtitle="Approve jobs on the Jobs page and they'll appear here, ready for bulk contact search."
        />
      ) : (
        <div className="w-full overflow-x-auto border border-neutral-dark rounded-xl">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-neutral/70 border-b border-neutral-dark text-[11px] uppercase tracking-wider text-secondary-dark font-semibold font-montserrat">
                <th className="p-3.5 pl-4">Company</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5 hidden md:table-cell">Location</th>
                <th className="p-3.5 hidden lg:table-cell">Salary</th>
                <th className="p-3.5 text-right pr-4">AI Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral">
              {jobs.map(job => {
                const scoreBg = job.fit_score >= 80 ? 'bg-green-50 text-green-700 border-green-200'
                              : job.fit_score >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : job.fit_score != null ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-neutral text-secondary-dark border-neutral-dark';
                return (
                  <tr key={job.id} className="hover:bg-neutral/40 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <Building className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <span className="font-semibold text-sm text-black line-clamp-1">{job.company_name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-sm text-secondary-dark line-clamp-1">{job.title}</span>
                    </td>
                    <td className="p-3.5 hidden md:table-cell">
                      {job.location ? (
                        <span className="flex items-center gap-1 text-xs text-secondary-dark">
                          <MapPin className="w-3 h-3 shrink-0" />{job.location}
                        </span>
                      ) : <span className="text-secondary-dark/40 text-xs">—</span>}
                    </td>
                    <td className="p-3.5 hidden lg:table-cell">
                      <span className="text-xs text-secondary-dark">{job.salary_info || '—'}</span>
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      {job.fit_score != null ? (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${scoreBg}`}>
                          {job.fit_score}%
                        </span>
                      ) : <span className="text-secondary-dark/40 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BULK SEARCH RESULT MODAL
// ═════════════════════════════════════════════════════════════════════════════
function BulkSearchResultModal({ result, onClose, onGoToContacts, onGoToManual }) {
  const { total_processed, contacts_found, manual_apply, skipped = 0, errors = 0 } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-neutral-dark relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary-dark/50 hover:bg-neutral-dark rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-black font-montserrat">Search Complete!</h2>
          <p className="text-sm text-secondary-dark mt-1">
            Processed <span className="font-bold text-black">{total_processed}</span> approved job{total_processed !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Result cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            onClick={contacts_found > 0 ? onGoToContacts : undefined}
            className={`flex flex-col items-center p-4 rounded-2xl border ${contacts_found > 0 ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors' : 'bg-neutral border-neutral-dark'}`}
          >
            <span className={`text-3xl font-bold font-montserrat ${contacts_found > 0 ? 'text-emerald-600' : 'text-secondary-dark'}`}>
              {contacts_found}
            </span>
            <span className="text-[11px] font-semibold text-secondary-dark mt-0.5">Contacts Found</span>
            {contacts_found > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold mt-1">
                View <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>

          <div
            onClick={manual_apply > 0 ? onGoToManual : undefined}
            className={`flex flex-col items-center p-4 rounded-2xl border ${manual_apply > 0 ? 'bg-orange-50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors' : 'bg-neutral border-neutral-dark'}`}
          >
            <span className={`text-3xl font-bold font-montserrat ${manual_apply > 0 ? 'text-orange-600' : 'text-secondary-dark'}`}>
              {manual_apply}
            </span>
            <span className="text-[11px] font-semibold text-secondary-dark mt-0.5">Manual Apply</span>
            {manual_apply > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-orange-600 font-bold mt-1">
                View <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Secondary info */}
        {(skipped > 0 || errors > 0) && (
          <div className="flex gap-3 mb-5">
            {skipped > 0 && (
              <div className="flex-1 text-center px-3 py-2 bg-neutral border border-neutral-dark rounded-xl">
                <p className="text-base font-bold text-secondary-dark">{skipped}</p>
                <p className="text-[10px] text-secondary-dark/60">Quota limited</p>
              </div>
            )}
            {errors > 0 && (
              <div className="flex-1 text-center px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-base font-bold text-red-600">{errors}</p>
                <p className="text-[10px] text-red-400">Errors</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-semibold text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MANUAL APPLY TAB
// ═════════════════════════════════════════════════════════════════════════════
function ManualApplyTab({ jobs, onGenerateCv, generatingCvFor }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No manual-apply jobs"
        subtitle="When automated contact search can't find an email, jobs appear here so you don't lose track of them."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-800">Automated contact search failed for these roles</p>
          <p className="text-xs text-orange-700 mt-0.5">
            No decision-maker email was found. Apply directly via LinkedIn or the company portal using the links below.
            You can still generate a tailored CV for each role.
          </p>
        </div>
      </div>

      {/* Job cards */}
      <div className="grid gap-3">
        {jobs.map(job => (
          <ManualApplyCard
            key={job.id}
            job={job}
            onGenerateCv={onGenerateCv}
            generatingCvFor={generatingCvFor}
          />
        ))}
      </div>
    </div>
  );
}

function ManualApplyCard({ job, onGenerateCv, generatingCvFor }) {
  const [expanded, setExpanded] = useState(false);
  const desc      = job.description || '';
  const shortDesc = desc.slice(0, 300);
  const hasMore   = desc.length > 300;
  const isGenCV   = generatingCvFor === job.id;

  const scoreBg = job.fit_score >= 80 ? 'bg-green-50 text-green-700 border-green-200'
                : job.fit_score >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : job.fit_score != null ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-neutral text-secondary-dark border-neutral-dark';

  return (
    <div className="bg-white border border-orange-100 rounded-2xl shadow-sm overflow-hidden">
      {/* ── Body row ── */}
      <div className="px-5 py-4 flex flex-col md:flex-row md:items-start justify-between gap-3">

        {/* Job info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            <Briefcase className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-bold text-sm text-black">{job.title}</p>
            <p className="text-xs font-semibold text-secondary-dark">{job.company_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {job.location && (
                <span className="flex items-center gap-1 text-[11px] text-secondary-dark">
                  <MapPin className="w-3 h-3" /> {job.location}
                </span>
              )}
              {job.salary_info && (
                <span className="flex items-center gap-1 text-[11px] text-secondary-dark">
                  <DollarSign className="w-3 h-3" /> {job.salary_info}
                </span>
              )}
              {job.fit_score != null && (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${scoreBg}`}>
                  {job.fit_score}% match
                </span>
              )}
            </div>
            {desc && (
              <div className="mt-2 text-[11px] text-secondary-dark leading-relaxed">
                {expanded ? desc : shortDesc}
                {hasMore && !expanded && '…'}
                {hasMore && (
                  <button
                    onClick={() => setExpanded(v => !v)}
                    className="ml-1.5 text-primary-dark hover:underline font-semibold"
                  >
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — stacked vertically on mobile, side-by-side on md+ */}
        <div className="shrink-0 flex flex-row md:flex-col items-center md:items-stretch gap-2">
          {/* Tailored CV button */}
          <button
            onClick={() => onGenerateCv && onGenerateCv(job.id)}
            disabled={isGenCV || !onGenerateCv}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border-2 border-black text-black text-xs font-bold rounded-xl hover:bg-black hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isGenCV
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />
            }
            {isGenCV ? 'Generating…' : 'Tailored CV'}
          </button>

          {/* Apply Now / no-url fallback */}
          {job.apply_url ? (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-orange-200 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Apply Now
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral border border-neutral-dark rounded-xl text-[11px] text-secondary-dark font-medium">
              No URL
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// GENERATE MODAL — pre-generation questionnaire
// ═════════════════════════════════════════════════════════════════════════════
const HIGHLIGHT_CHIPS = [
  { label: "I genuinely care about what they're building", value: "I genuinely care about the problem they're solving — this isn't just another application" },
  { label: 'I learn fast and figure things out',           value: 'I learn fast, figure things out, and never wait to be told what to do next' },
  { label: 'I have done this exact type of work before',   value: 'I have done this exact type of work before and can hit the ground running' },
  { label: 'I ship things and get results',                value: 'I ship things, not just plans — I have real results to show for my work' },
  { label: 'I work great without hand-holding',            value: 'I work independently, communicate clearly, and do not need to be micromanaged' },
  { label: 'I have a relevant project to show',            value: 'I have a relevant project or piece of work that speaks directly to what they need' },
  { label: 'Available to start soon',                      value: 'I am available to start soon and can commit fully to the role' },
  { label: 'I am a culture and mission fit',               value: 'I connect with their mission and think I would fit the team well' },
];

function GenerateModal({ contact, bulkCount, onConfirm, onClose }) {
  const [highlight, setHighlight] = useState('');
  const [tone, setTone]           = useState('professional');

  const companyName = contact?.job?.company_name;

  const addChip = (val) => {
    setHighlight(prev => prev.trim() ? `${prev.trim()}, ${val}` : val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-neutral-dark relative animate-fade-in max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary-dark/50 hover:bg-neutral-dark rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-9 w-9 rounded-xl bg-primary-light/10 border border-primary-light/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-light" />
          </div>
          <h2 className="text-base font-bold font-montserrat text-black">
            {bulkCount ? `Generate ${bulkCount} Emails` : 'Generate Email'}
          </h2>
        </div>
        <p className="text-xs text-secondary-dark mb-5 ml-11">
          {bulkCount
            ? `These settings apply to all ${bulkCount} pending contacts.`
            : companyName
              ? `for ${companyName}`
              : 'Customise before generating'
          }
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
              What do you want to highlight?
            </label>
            <textarea
              value={highlight}
              onChange={e => setHighlight(e.target.value)}
              placeholder="e.g. I genuinely love what they're building, I've done this exact work before, I'm available to start soon..."
              rows={3}
              className="w-full p-3 bg-neutral border border-neutral-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-light/30 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-secondary-dark/60 mt-1.5">Optional — leave blank to let the AI decide</p>

            {/* Quick-pick chips */}
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-dark/50 mb-2">Quick picks — tap to add</p>
              <div className="flex flex-wrap gap-1.5">
                {HIGHLIGHT_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => addChip(chip.value)}
                    className="px-2.5 py-1 bg-neutral border border-neutral-dark rounded-full text-[11px] font-medium text-secondary-dark hover:bg-primary-light/10 hover:border-primary-light/40 hover:text-primary-dark transition-all active:scale-95"
                  >
                    + {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark mb-1.5">
              Tone
            </label>
            <div className="flex gap-2">
              {[
                { key: 'professional', label: 'Professional' },
                { key: 'warm',         label: 'Warm' },
                { key: 'direct',       label: 'Direct' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTone(t.key)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    tone === t.key
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-secondary-dark border-neutral-dark hover:bg-neutral'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ highlight: highlight.trim(), tone_override: tone })}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-light to-primary-dark rounded-xl shadow-md shadow-orange-100 hover:opacity-90 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// JOB DETAILS MODAL  (opened from EmailCard job-title click)
// ═════════════════════════════════════════════════════════════════════════════
function JobDetailsModal({ email, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-neutral-dark relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary-dark/60 hover:bg-neutral-dark rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary-light/10 border border-primary-light/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-primary-light" />
          </div>
          <div>
            <h2 className="text-base font-bold text-black font-montserrat leading-tight">{email.job_title || '—'}</h2>
            <p className="text-sm text-secondary-dark mt-0.5">{email.company_name || '—'}</p>
          </div>
        </div>

        <div className="space-y-3">
          {email.job_location && (
            <div className="flex items-center gap-2 text-sm text-secondary-dark">
              <MapPin className="w-4 h-4 shrink-0 text-secondary-dark/50" />
              {email.job_location}
            </div>
          )}
          {email.job_salary_info && (
            <div className="flex items-center gap-2 text-sm text-secondary-dark">
              <DollarSign className="w-4 h-4 shrink-0 text-secondary-dark/50" />
              {email.job_salary_info}
            </div>
          )}
          {email.job_fit_score != null && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                email.job_fit_score >= 80 ? 'bg-green-50 text-green-700 border-green-200'
                : email.job_fit_score >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {email.job_fit_score}% AI match
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
          >
            Close
          </button>
          {email.job_apply_url && (
            <a
              href={email.job_apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/80 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <ExternalLink className="w-4 h-4" /> View Job Posting
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default OutreachPage;
