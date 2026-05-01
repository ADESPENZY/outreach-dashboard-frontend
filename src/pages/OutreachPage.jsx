import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Send, Users, FileText, CheckCircle, Search,
  Building, Mail, Loader2, ChevronDown,
  ChevronUp, Sparkles, Pencil, X, UserCheck,
  MailOpen, MessageSquare, ShieldCheck, Download,
  Clock, ListOrdered,
} from 'lucide-react';
import {
  getContacts, getDraftEmails, getSentEmails, getHunterQuota,
  findContacts, generateEmail, approveEmail, sendEmail,
  markEmailReplied, runFollowups, generateJobCV, editEmail,
  queueEmail, queueAllEmails,
} from '../services/apiOutreach';

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'contacts', label: 'Contacts',       icon: Users },
  { key: 'drafts',   label: 'Email Drafts',   icon: FileText },
  { key: 'sent',     label: 'Approved / Sent', icon: Send },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
const statusColors = {
  draft:    'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  sent:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  opened:   'bg-purple-50 text-purple-700 border-purple-200',
  replied:  'bg-green-50 text-green-700 border-green-200',
  bounced:  'bg-red-50 text-red-700 border-red-200',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border shadow-sm ${statusColors[status] || 'bg-neutral-dark text-secondary-dark border-neutral-dark'}`}>
      {status}
    </span>
  );
}

function ConfidenceBadge({ score }) {
  if (score == null) return <span className="text-xs text-secondary-dark/60">—</span>;
  const color = score >= 80 ? 'text-green-600 bg-green-50 border-green-200'
              : score >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
              : 'text-red-500 bg-red-50 border-red-200';
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${color}`}>
      {score}%
    </span>
  );
}

// ─── Queue status pill ────────────────────────────────────────────────────────
function QueueStatusPill({ email }) {
  if (email.status === 'sent') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle className="w-3.5 h-3.5" /> Sent {email.sent_at ? new Date(email.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </span>
    );
  }
  if (email.status === 'opened') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-600">
        <MailOpen className="w-3.5 h-3.5" /> Opened
      </span>
    );
  }
  if (email.status === 'replied') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
        <MessageSquare className="w-3.5 h-3.5" /> Replied
      </span>
    );
  }
  if (email.is_queued && email.scheduled_send_at) {
    const t = new Date(email.scheduled_send_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary-dark">
        <Clock className="w-3.5 h-3.5 text-secondary-dark/60" /> Queued — sends at {t}
      </span>
    );
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const OutreachPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]   = useState('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [editModal, setEditModal]   = useState(null);

  const [findingContacts, setFindingContacts] = useState(false);
  const [generatingAll, setGeneratingAll]     = useState(false);
  const [generatingFor, setGeneratingFor]     = useState(null);
  const [approvingId, setApprovingId]         = useState(null);
  const [replyingId, setReplyingId]           = useState(null);
  const [runningFollowups, setRunningFollowups] = useState(false);
  const [generatingCvFor, setGeneratingCvFor] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['outreach-contacts'],
    queryFn: getContacts,
  });

  const { data: drafts = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['outreach-drafts'],
    queryFn: getDraftEmails,
  });

  const { data: sentEmails = [], isLoading: loadingSent } = useQuery({
    queryKey: ['outreach-sent'],
    queryFn: getSentEmails,
  });

  const { data: hunterQuota = null } = useQuery({
    queryKey: ['hunter-quota'],
    queryFn: () => getHunterQuota().catch(() => null),
  });

  const loading = loadingContacts && loadingDrafts && loadingSent;

  // ── Queue mutations ────────────────────────────────────────────────────────

  const queueSingleMutation = useMutation({
    mutationFn: (emailId) => queueEmail(emailId),
    onSuccess: (data, emailId) => {
      if (data.status === 'already_sent') {
        toast.info('This email was already sent.');
      } else if (data.status === 'already_queued') {
        const t = data.scheduled_send_at
          ? new Date(data.scheduled_send_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        toast.info(`Already queued${t ? ` — sends at ${t}` : ''}`);
      } else {
        const t = new Date(data.scheduled_send_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        toast.success(`Queued! Sends at ${t}`);
        queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
      }
    },
    onError: (err) => toast.error('Queue failed: ' + err.message),
  });

  const queueAllMutation = useMutation({
    mutationFn: queueAllEmails,
    onSuccess: (data) => {
      if (data.queued === 0) {
        toast.info('No approved emails to queue.');
      } else {
        toast.success(
          `${data.queued} email${data.queued > 1 ? 's' : ''} queued. Last one sends at ${data.estimated_completion}.`,
          { autoClose: 7000 }
        );
        queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
      }
    },
    onError: (err) => toast.error('Queue all failed: ' + err.message),
  });

  // ── Other actions ──────────────────────────────────────────────────────────

  const handleFindContacts = async () => {
    setFindingContacts(true);
    try {
      const d = await findContacts(10);
      toast.success(`Processed ${d.processed} jobs — ${d.contacts_found} contacts found, ${d.manual_apply} manual apply`);
      queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
    } catch (err) {
      toast.error('Failed to find contacts: ' + err.message);
    } finally {
      setFindingContacts(false);
    }
  };

  const handleGenerateEmail = async (jobId) => {
    setGeneratingFor(jobId);
    try {
      await generateEmail(jobId);
      toast.success('Email draft generated!');
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-contacts'] });
    } catch (err) {
      toast.error('Failed to generate email: ' + err.message);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerateAllEmails = async () => {
    setGeneratingAll(true);
    let success = 0, fail = 0;
    const contactsWithoutEmails = contacts.filter(c =>
      !drafts.some(d => d.job_id === c.job?.id) &&
      !sentEmails.some(s => s.job_id === c.job?.id)
    );
    for (const contact of contactsWithoutEmails) {
      try { await generateEmail(contact.job?.id); success++; }
      catch { fail++; }
    }
    toast.success(`Generated ${success} emails${fail > 0 ? `, ${fail} failed` : ''}`);
    queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
    setGeneratingAll(false);
  };

  const handleApprove = async (emailId) => {
    setApprovingId(emailId);
    try {
      await approveEmail(emailId);
      toast.success('Email approved — go to Approved / Sent tab to queue it.');
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    } catch (err) {
      toast.error('Failed to approve: ' + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRunFollowups = async () => {
    setRunningFollowups(true);
    try {
      const d = await runFollowups();
      toast.success(`Follow-ups: ${d.sent} sent, ${d.errors} errors, ${d.skipped} skipped`);
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    } catch (err) {
      toast.error('Follow-up run failed: ' + err.message);
    } finally {
      setRunningFollowups(false);
    }
  };

  const handleMarkReplied = async (emailId) => {
    setReplyingId(emailId);
    try {
      await markEmailReplied(emailId);
      toast.success('Marked as replied!');
      queryClient.invalidateQueries({ queryKey: ['outreach-sent'] });
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setReplyingId(null);
    }
  };

  const handleGenerateCv = async (jobId) => {
    setGeneratingCvFor(jobId);
    try {
      const blob = await generateJobCV(jobId);
      const url  = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tailored_cv_${jobId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tailored CV downloaded!');
    } catch (err) {
      toast.error('CV generation failed: ' + err.message);
    } finally {
      setGeneratingCvFor(null);
    }
  };

  // ── Filtered contacts ──────────────────────────────────────────────────────

  const q = searchQuery.toLowerCase();
  const filteredContacts = contacts.filter(c => {
    if (!q) return true;
    return (c.job?.company_name || '').toLowerCase().includes(q) ||
           (c.job?.title || '').toLowerCase().includes(q) ||
           (c.first_name || '').toLowerCase().includes(q) ||
           (c.last_name || '').toLowerCase().includes(q) ||
           (c.email || '').toLowerCase().includes(q);
  });

  const hasEmailForJob = (jobId) =>
    drafts.some(d => d.job_id === jobId) || sentEmails.some(s => s.job_id === jobId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-roboto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
            Outreach
          </h1>
          <p className="text-sm text-secondary-dark mt-1">Find contacts, generate cold emails, and queue them to send</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-dark overflow-hidden">
        <div className="flex border-b border-neutral-dark">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = tab.key === 'contacts' ? contacts.length
                        : tab.key === 'drafts' ? drafts.length
                        : sentEmails.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all border-b-2 ${
                  isActive
                    ? 'text-primary-dark border-primary-light bg-primary-light/5'
                    : 'text-secondary-dark border-transparent hover:text-black-light hover:bg-neutral'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-primary-light/20 text-primary-dark' : 'bg-neutral-dark text-secondary-dark'
                  }`}>
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
              <p className="mt-3 text-sm font-medium text-secondary-dark animate-pulse">Loading outreach data...</p>
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
                  onGenerateAll={handleGenerateAllEmails}
                  generatingAll={generatingAll}
                  onEdit={(email) => setEditModal(email)}
                  onGenerateCv={handleGenerateCv}
                  generatingCvFor={generatingCvFor}
                />
              )}
              {activeTab === 'sent' && (
                <SentTab
                  emails={sentEmails}
                  onQueueSingle={(id) => queueSingleMutation.mutate(id)}
                  queuingId={queueSingleMutation.isPending ? queueSingleMutation.variables : null}
                  onQueueAll={() => queueAllMutation.mutate()}
                  queuingAll={queueAllMutation.isPending}
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
  const color = searches_remaining > 10
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : searches_remaining >= 5
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${color}`}>
      <ShieldCheck className="w-3.5 h-3.5" />
      Hunter.io ({plan}): {searches_remaining}/{searches_limit} searches remaining
      {dry_run && <span className="ml-1 px-1.5 py-0.5 bg-neutral-dark text-secondary-dark rounded-md text-[10px] font-bold">DRY RUN</span>}
    </div>
  );
}

function ContactsTab({ contacts, searchQuery, setSearchQuery, onFindContacts, findingContacts, onGenerateEmail, generatingFor, hasEmailForJob, hunterQuota }) {
  return (
    <div className="space-y-4">
      <HunterQuotaBadge quota={hunterQuota} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-dark/60 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/50 focus:border-primary-light transition-all outline-none text-secondary-dark"
          />
        </div>
        <button
          onClick={onFindContacts}
          disabled={findingContacts}
          className="flex items-center gap-2 bg-gradient-to-r from-black to-black-light hover:from-black-light hover:to-black text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-black/10 transition-all active:scale-95 disabled:opacity-75"
        >
          {findingContacts ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          Find Contacts
        </button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts found yet" subtitle="Go to the Jobs page, approve some jobs, then click Find Contacts." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-dark">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral/70 border-b border-neutral-dark text-xs uppercase tracking-wider text-secondary-dark font-semibold font-montserrat">
                <th className="p-3.5 pl-4">Company & Role</th>
                <th className="p-3.5 hidden lg:table-cell">Contact</th>
                <th className="p-3.5 hidden md:table-cell">Email</th>
                <th className="p-3.5">Score</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral">
              {contacts.map(contact => (
                <tr key={contact.id} className="group hover:bg-neutral/50 transition-colors">
                  <td className="p-3.5 pl-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 min-w-9 rounded-xl bg-gradient-to-tr from-accent-teal/10 to-accent-teal/20 flex items-center justify-center border border-accent-teal/30 shadow-sm">
                        <Building className="w-4 h-4 text-accent-teal" />
                      </div>
                      <div>
                        <p className="font-semibold text-black text-sm line-clamp-1">{contact.job?.company_name || '—'}</p>
                        <p className="text-xs text-secondary-dark mt-0.5 line-clamp-1">{contact.job?.title || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 align-top hidden lg:table-cell">
                    <p className="text-sm font-medium text-black-light">{contact.first_name} {contact.last_name}</p>
                    <p className="text-xs text-secondary-dark mt-0.5">{contact.title || '—'}</p>
                  </td>
                  <td className="p-3.5 align-top hidden md:table-cell">
                    <a href={`mailto:${contact.email}`} className="text-sm text-primary-dark hover:underline font-medium">
                      {contact.email}
                    </a>
                  </td>
                  <td className="p-3.5 align-top">
                    <ConfidenceBadge score={contact.confidence_score} />
                  </td>
                  <td className="p-3.5 pr-4 align-top text-right">
                    {hasEmailForJob(contact.job?.id) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Email generated
                      </span>
                    ) : (
                      <button
                        onClick={() => onGenerateEmail(contact.job?.id)}
                        disabled={generatingFor === contact.job?.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
                      >
                        {generatingFor === contact.job?.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Sparkles className="w-3 h-3" />}
                        Generate Email
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
// TAB 2 — EMAIL DRAFTS
// ═════════════════════════════════════════════════════════════════════════════

function DraftsTab({ drafts, onApprove, approvingId, onGenerateAll, generatingAll, onEdit, onGenerateCv, generatingCvFor }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onGenerateAll}
          disabled={generatingAll}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-orange-200 transition-all active:scale-95 disabled:opacity-75"
        >
          {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate All Emails
        </button>
      </div>

      {drafts.length === 0 ? (
        <EmptyState icon={FileText} title="No email drafts" subtitle="Go to the Contacts tab and click Generate Email for a contact." />
      ) : (
        <div className="grid gap-4">
          {drafts.map(email => (
            <EmailCard
              key={email.id}
              email={email}
              onApprove={() => onApprove(email.id)}
              approving={approvingId === email.id}
              onEdit={() => onEdit(email)}
              showApprove
              onGenerateCv={onGenerateCv}
              generatingCvFor={generatingCvFor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3 — APPROVED / SENT
// ═════════════════════════════════════════════════════════════════════════════

function SentTab({ emails, onQueueSingle, queuingId, onQueueAll, queuingAll, onMarkReplied, replyingId, onRunFollowups, runningFollowups, onGenerateCv, generatingCvFor }) {
  const approvedUnqueued = emails.filter(e => e.status === 'approved' && !e.is_queued).length;
  const queuedCount      = emails.filter(e => e.is_queued && e.status === 'approved').length;
  const dueCount         = emails.filter(e =>
    ['sent', 'opened'].includes(e.status) &&
    e.next_followup_at &&
    new Date(e.next_followup_at) <= new Date()
  ).length;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {approvedUnqueued > 0 && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
              {approvedUnqueued} ready to queue
            </span>
          )}
          {queuedCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-neutral border border-neutral-dark rounded-full text-xs font-semibold text-secondary-dark">
              <Clock className="w-3 h-3" /> {queuedCount} queued
            </span>
          )}
          {dueCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
              {dueCount} follow-up{dueCount > 1 ? 's' : ''} due now
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Queue All Approved */}
          {approvedUnqueued > 0 && (
            <button
              onClick={onQueueAll}
              disabled={queuingAll}
              className="flex items-center gap-2 bg-gradient-to-r from-black to-black-light text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-black/10 transition-all active:scale-95 disabled:opacity-70"
            >
              {queuingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListOrdered className="w-4 h-4" />}
              {queuingAll ? 'Queuing...' : `Queue All (${approvedUnqueued})`}
            </button>
          )}
          {/* Follow-ups */}
          <button
            onClick={onRunFollowups}
            disabled={runningFollowups}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-violet-200 transition-all active:scale-95 disabled:opacity-70"
          >
            {runningFollowups ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {runningFollowups ? 'Sending...' : 'Run Follow-ups'}
          </button>
        </div>
      </div>

      {emails.length === 0 ? (
        <EmptyState icon={Send} title="No approved or sent emails" subtitle="Approve some email drafts to see them here." />
      ) : (
        <div className="grid gap-4">
          {emails.map(email => (
            <EmailCard
              key={email.id}
              email={email}
              onQueueSingle={() => onQueueSingle(email.id)}
              queueing={queuingId === email.id}
              showQueue={email.status === 'approved' && !email.is_queued}
              onMarkReplied={() => onMarkReplied(email.id)}
              markingReplied={replyingId === email.id}
              showMarkReplied={['sent', 'opened'].includes(email.status)}
              showTimestamps
              onGenerateCv={onGenerateCv}
              generatingCvFor={generatingCvFor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL CARD
// ═════════════════════════════════════════════════════════════════════════════

function EmailCard({
  email,
  onApprove, approving, onEdit, showApprove,
  onQueueSingle, queueing, showQueue,
  onMarkReplied, markingReplied, showMarkReplied,
  showTimestamps, onGenerateCv, generatingCvFor,
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyLines = (email.body || '').split('\n');
  const preview   = bodyLines.slice(0, 3).join('\n');
  const hasMore   = bodyLines.length > 3;

  return (
    <div className="bg-white border border-neutral-dark rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-dark flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 min-w-10 rounded-xl bg-gradient-to-tr from-primary-light/10 to-primary-light/20 flex items-center justify-center border border-primary-light/30 shadow-sm">
            <Mail className="w-4 h-4 text-primary-light" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-black text-sm">{email.company_name || '—'}</p>
            <p className="text-xs text-secondary-dark mt-0.5 truncate">{email.job_title || '—'}</p>
            {email.contact && (
              <p className="text-xs text-secondary-dark/60 mt-0.5">
                To: <span className="font-medium text-secondary-dark">{email.contact.first_name} {email.contact.last_name}</span>
                {' '}<span className="text-secondary-dark/60">({email.contact.email})</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {email.followup_count > 0 && (
            <span className="px-2 py-0.5 bg-primary-light/10 text-primary-dark border border-primary-light/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Follow-up {email.followup_count}
            </span>
          )}
          <StatusBadge status={email.status} />
          <QueueStatusPill email={email} />
        </div>
      </div>

      {/* Subject */}
      <div className="px-5 pt-4">
        <p className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-1">Subject</p>
        <p className="text-sm font-semibold text-black-light">{email.subject}</p>
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        <p className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-1.5">Body</p>
        <div className="bg-neutral rounded-xl p-4 text-sm text-secondary-dark leading-relaxed whitespace-pre-wrap font-mono border border-neutral-dark">
          {expanded ? email.body : preview}
          {hasMore && !expanded && '...'}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary-light mt-2 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show full email</>}
          </button>
        )}
      </div>

      {/* Timestamps */}
      {showTimestamps && (
        <div className="px-5 pb-2 flex flex-wrap gap-3">
          {email.sent_at && (
            <span className="flex items-center gap-1 text-xs text-secondary-dark">
              <Send className="w-3 h-3" /> Sent: {new Date(email.sent_at).toLocaleString()}
            </span>
          )}
          {email.opened_at && (
            <span className="flex items-center gap-1 text-xs text-purple-600">
              <MailOpen className="w-3 h-3" /> Opened: {new Date(email.opened_at).toLocaleString()}
            </span>
          )}
          {email.replied_at && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <MessageSquare className="w-3 h-3" /> Replied: {new Date(email.replied_at).toLocaleString()}
            </span>
          )}
          {email.next_followup_at && !email.replied_at && (
            <span className={`flex items-center gap-1 text-xs font-medium ${
              new Date(email.next_followup_at) <= new Date() ? 'text-amber-600' : 'text-secondary-dark/60'
            }`}>
              ⏰ Follow-up {new Date(email.next_followup_at) <= new Date() ? 'due now' : `due ${new Date(email.next_followup_at).toLocaleDateString()}`}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-neutral-dark flex items-center gap-2 justify-end flex-wrap">
        {onGenerateCv && email.job_id && (
          <button
            onClick={() => onGenerateCv(email.job_id)}
            disabled={generatingCvFor === email.job_id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
          >
            {generatingCvFor === email.job_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {generatingCvFor === email.job_id ? 'Generating...' : 'Generate CV'}
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-secondary-dark bg-neutral border border-neutral-dark rounded-xl hover:bg-neutral-dark transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {showApprove && (
          <button
            onClick={onApprove}
            disabled={approving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-60"
          >
            {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Approve
          </button>
        )}
        {/* Queue for Sending — replaces old Send button */}
        {showQueue && (
          <button
            onClick={onQueueSingle}
            disabled={queueing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-60"
          >
            {queueing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            {queueing ? 'Queuing...' : 'Queue for Sending'}
          </button>
        )}
        {/* Already queued — show scheduled time, no button needed */}
        {email.is_queued && email.status === 'approved' && email.scheduled_send_at && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary-dark px-3 py-2 bg-neutral border border-neutral-dark rounded-xl">
            <Clock className="w-3.5 h-3.5 text-secondary-dark/50" />
            Sends at {new Date(email.scheduled_send_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {showMarkReplied && (
          <button
            onClick={onMarkReplied}
            disabled={markingReplied}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-sm hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-60"
          >
            {markingReplied ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
            {markingReplied ? 'Marking...' : 'Mark Replied'}
          </button>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EDIT EMAIL MODAL
// ═════════════════════════════════════════════════════════════════════════════

function EditEmailModal({ email, onClose, onSaved }) {
  const [subject, setSubject] = useState(email.subject || '');
  const [body, setBody]       = useState(email.body || '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await editEmail(email.id, { subject, body });
      toast.success('Email updated');
      onSaved();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-neutral-dark relative slide-in-bottom max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary-dark/60 hover:bg-neutral-dark rounded-full p-1">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold font-montserrat text-black mb-5 flex items-center gap-2">
          <Pencil className="w-5 h-5 text-primary-light" /> Edit Email Draft
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Subject</label>
            <input
              type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-dark uppercase tracking-wider mb-1.5">Body</label>
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)} rows={12}
              className="w-full p-3 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light outline-none resize-none font-mono leading-relaxed"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-black to-black-light rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Changes
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
        <Icon className="w-7 h-7 text-secondary-dark/40" />
      </div>
      <p className="text-base font-semibold text-secondary-dark">{title}</p>
      <p className="text-sm text-secondary-dark/60 mt-1 max-w-md mx-auto">{subtitle}</p>
    </div>
  );
}

export default OutreachPage;
