import { useCallback, useEffect, useRef, useState } from'react';
import { createPortal } from'react-dom';
import { X, Download, LayoutTemplate, AlignLeft, FileText, PenLine, Check, AlertCircle } from'lucide-react';
import { toast } from'react-toastify';
import { ApplyDirLoader } from'./ui/ApplyDirLoader';
import { getCvTemplates, renderCvPdf } from'../services/apiOutreach';
import ResumeStylePrompt from'./ResumeStylePrompt';

/*
 Tailored CV preview + style switcher.

 THE PREVIEW SHOWS THE REAL PDF. It fetches the same bytes the Download button
 hands you and displays them in an iframe, so what you see is what you get —
 byte for byte, not an approximation.

 It used to render hand-written React/Tailwind rebuilds of each design — four
 *CVTemplate.jsx components, now DELETED. They were a second, parallel
 representation of every template, and they drifted: the Modern PDF is laid out
 with a fixed sidebar and a 72mm main-column margin, while its React twin still
 used`grid-cols-[30%_70%]` with the sidebar as a grid item. Same data, two
 layout engines, guaranteed to disagree — and they did.

 Do not reintroduce them. Rendering the PDF makes that class of bug
 structurally impossible rather than something to keep in sync by hand.

 Each template's PDF is fetched once and cached for the life of the modal, so
 flipping back and forth is instant and Download reuses the bytes already on
 screen — one render per style, never two.

 RENDERED THROUGH A PORTAL, and it must stay that way. This mounts inside
 GenerateCvButton, which lives inside JobDetailDrawer's <motion.aside>.
 Framer-motion keeps a`transform` on that element, and a transformed ancestor
 becomes the containing block for`position: fixed` descendants — without the
 portal this overlay is positioned and clipped relative to the drawer.

 ADDING A STYLE is now purely a backend change: the option list comes from the
 API and the preview renders whatever PDF it returns. Only the icon below is
 cosmetic and optional.
*/
const TEMPLATE_ICONS = {
 modern: LayoutTemplate,
 executive: AlignLeft,
 minimal: FileText,
 signature: PenLine,
};

/*
 Where each design is the right choice. Kept here rather than in the API
`description` because it is guidance about WHERE TO SEND the file, not a
 description of the design, and the two read better as separate lines.

 Grounded in an extraction audit (Aug 2026), not taste: the three single-column
 designs extract in clean reading order, so a parser sees the document the way
 a human does. Modern is the two-column one — its sidebar carries the name,
 contact block and competencies, and a resume parser is far likelier to
 mis-order or skip a sidebar than a single column, so it is steered towards
 human readers rather than portals.

 Keyed by template id; an unknown id from the API simply renders no caption.
*/
const TEMPLATE_ATS_HINT = {
 modern:'Best for email & direct attachments',
 executive:'Best for online applications (ATS)',
 minimal:'Best for online applications (ATS)',
 signature:'Best for online applications (ATS)',
};

// Used until the backend list arrives, so the switcher never renders empty.
const FALLBACK_TEMPLATES = [
 { id:'modern', label:'Modern', description:'Two-column with branded sidebar' },
 { id:'executive', label:'Executive', description:'ATS-strict single column' },
 { id:'minimal', label:'Minimal', description:'Plain text, maximum ATS safety' },
 { id:'signature', label:'Signature', description:'Single column with a brand accent' },
];

// Chrome/Edge honour these; other viewers ignore them harmlessly.
const VIEWER_PARAMS ='#toolbar=0&navpanes=0&statusbar=0&view=FitH';

// Only needs the job id now. The CV JSON is no longer passed in (the server
// renders it), and the filename comes back on Content-Disposition rather than
// being rebuilt from the job.
export default function TailoredCVPreview({ jobId, onClose }) {
 const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);
 const [active, setActive] = useState('modern');
 const [downloading, setDownloading] = useState(false);
 const [showPrompt, setShowPrompt] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 // { [templateId]: { url, blob, filename } } — one render per style.
 const [cache, setCache] = useState({});
 // Object URLs must be revoked on unmount; a ref keeps the cleanup accurate
 // even though`cache` changes identity on every fetch.
 const urlsRef = useRef([]);

 useEffect(() => {
 let cancelled = false;
 getCvTemplates()
 .then((res) => {
 if (cancelled) return;
 if (Array.isArray(res?.templates) && res.templates.length) setTemplates(res.templates);
 if (res?.default) setActive(res.default);
 if (!res?.has_chosen) setShowPrompt(true);
 })
 .catch(() => { /* keep the fallback list; the preview still works */ });
 return () => { cancelled = true; };
 }, []);

 // Fetch the selected style's PDF once, then serve it from cache.
 const ensureRendered = useCallback(async (template) => {
 if (!template || !jobId) return;
 if (cache[template]) return;
 setLoading(true);
 setError('');
 try {
 const { blob, filename } = await renderCvPdf(jobId, template);
 const pdf = new Blob([blob], { type:'application/pdf' });
 const url = URL.createObjectURL(pdf);
 urlsRef.current.push(url);
 setCache((prev) => ({ ...prev, [template]: { url, blob: pdf, filename } }));
 } catch (err) {
 setError(err?.message ||'Could not render this style.');
 } finally {
 setLoading(false);
 }
 }, [jobId, cache]);

 useEffect(() => { ensureRendered(active); }, [active, ensureRendered]);

 useEffect(() => () => {
 urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
 urlsRef.current = [];
 }, []);

 useEffect(() => {
 const onKey = (e) => { if (e.key ==='Escape' && !showPrompt) onClose(); };
 window.addEventListener('keydown', onKey);
 return () => window.removeEventListener('keydown', onKey);
 }, [onClose, showPrompt]);

 // The page behind must not scroll while the overlay is open.
 useEffect(() => {
 const previous = document.body.style.overflow;
 document.body.style.overflow ='hidden';
 return () => { document.body.style.overflow = previous; };
 }, []);

 const handleDownload = async () => {
 setDownloading(true);
 try {
 // Reuse the exact bytes already on screen — no second render, and the
 // file can never differ from the preview.
 const entry = cache[active];
 const { blob, filename } = entry || await (async () => {
 const fresh = await renderCvPdf(jobId, active);
 return { blob: new Blob([fresh.blob], { type:'application/pdf' }), filename: fresh.filename };
 })();
 const url = URL.createObjectURL(blob);
 const a = Object.assign(document.createElement('a'), { href: url });
 a.setAttribute('download', filename);
 document.body.appendChild(a); a.click(); a.remove();
 URL.revokeObjectURL(url);
 toast.success('CV downloaded.');
 } catch (err) {
 toast.error(err?.message ||'PDF download failed.');
 } finally {
 setDownloading(false);
 }
 };

 const activeEntry = cache[active];
 const activeLabel = templates.find((t) => t.id === active)?.label || active;

 const overlay = (
 <>
 {showPrompt && (
 <ResumeStylePrompt
 templates={templates}
 initial={active}
 onSaved={(choice) => { setActive(choice); setShowPrompt(false); }}
 onSkip={() => setShowPrompt(false)}
 />
 )}

 <div
 className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-stretch justify-center p-0 sm:items-center sm:p-4 md:p-6"
 onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
 >
 {/*
 SIZING — the PDF pane needs a DEFINITE height, not a max.

 This used to be`max-h-[92vh]` with no`h-*`. A max-height alone leaves
 the flex column's height indefinite, so`flex-1` on the PDF pane had
 nothing to distribute and the iframe's`h-full` resolved against
 nothing — collapsing to the iframe intrinsic default of 150px.
 Measured: pane was 896x150 at 1440w and 351x150 at 375w, which is the
 cramped, half-scrolled sliver users were seeing.

`h-full` (mobile, full-bleed) and`sm:h-[90vh]` give the column a real
 height, so flex-1 has something to fill. Keep a definite height here.
 */}
 <div className="bg-white shadow-2xl flex flex-col overflow-hidden min-w-0 w-full h-full rounded-none sm:h-[90vh] sm:max-h-[900px] sm:max-w-3xl sm:rounded-2xl md:max-w-5xl">

 {/* ── TITLE ROW ─────────────────────────────────────────────── */}
 <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 flex-shrink-0">
 <div className="min-w-0">
 <h2 className="font-bold text-black text-base leading-tight">
 Tailored CV Preview
 </h2>
 <p className="text-secondary-dark text-xs mt-0.5">
 This is the actual PDF — what you see is what downloads.
 </p>
 </div>
 <button
 onClick={onClose}
 aria-label="Close preview"
 /* 44x44 minimum touch target (DESIGN_GUIDE §5); negative margins
 keep it optically aligned with the heading despite the padding. */
 className="-mr-1.5 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary-dark hover:bg-neutral-dark hover:text-black transition-all"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* ── STYLE PICKER ──────────────────────────────────────────── */}
 <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex-shrink-0 border-b border-neutral-dark">
 <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-secondary-dark mb-2">
 Choose a style · {templates.length} available
 </p>
 {/* One row of four once there is room, so the picker costs the
 preview less vertical space on a wide screen. */}
 <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
 {templates.map(({ id, label, description }) => {
 const Icon = TEMPLATE_ICONS[id] || LayoutTemplate;
 const isActive = active === id;
 return (
 <button
 key={id}
 onClick={() => setActive(id)}
 aria-pressed={isActive}
 className={`
 relative flex items-start gap-2.5 min-h-[44px] px-3 py-2 rounded-xl border-2 text-left
 transition-all duration-150
 ${isActive
 ?'border-primary-dark bg-primary-dark/5 shadow-sm'
 :'border-neutral-dark hover:border-secondary-dark/40 bg-white'}
`}
 >
 <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ?'text-primary-dark' :'text-secondary-dark'}`} />
 <span className="min-w-0">
 <span className="block text-xs font-bold text-black truncate">{label}</span>
 <span className="block text-[11px] text-secondary-dark leading-snug">{description}</span>
 {TEMPLATE_ATS_HINT[id] && (
 <span className={`mt-1 block text-[10px] font-semibold leading-snug ${
 isActive ?'text-primary-dark' :'text-secondary-dark/80'}`}>
 {TEMPLATE_ATS_HINT[id]}
 </span>
 )}
 </span>
 {isActive && (
 <Check className="w-3.5 h-3.5 text-primary-dark shrink-0 absolute top-2 right-2" />
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* ── THE ACTUAL PDF ────────────────────────────────────────── */}
 {/* min-w-0 alongside min-h-0: a flex child defaults to min-width:auto,
 which lets wide iframe content push the modal wider than the
 viewport on a phone. */}
 <div className="flex-1 min-h-0 min-w-0 bg-neutral-dark/20 relative">
 {activeEntry && (
 <iframe
 key={active}
 src={`${activeEntry.url}${VIEWER_PARAMS}`}
 title={`${activeLabel} CV preview`}
 /*`block` kills the inline-element baseline gap that would
 otherwise leave a few stray pixels under the iframe. */
 className="block w-full h-full border-0"
 />
 )}

 {loading && (
 /* Inline, not Screen — Screen is a`fixed inset-0` full-page
 overlay and would escape this container entirely. */
 <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark/20">
 <ApplyDirLoader.Inline message={`Rendering ${activeLabel}…`} />
 </div>
 )}

 {!loading && !activeEntry && error && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
 <AlertCircle className="w-6 h-6 text-primary-dark" />
 <p className="text-sm font-semibold text-black">Could not render {activeLabel}</p>
 <p className="text-xs text-secondary-dark max-w-sm">{error}</p>
 <button
 onClick={() => ensureRendered(active)}
 className="mt-1 px-4 py-2 text-xs font-semibold rounded-lg border-2 border-neutral-dark hover:border-secondary-dark/40 transition-colors"
 >
 Try again
 </button>
 </div>
 )}
 </div>

 {/* ── ACTION BAR ────────────────────────────────────────────── */}
 <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-neutral-dark bg-neutral flex-shrink-0">
 <p className="text-xs text-secondary-dark truncate min-w-0">
 Downloading <span className="font-semibold text-black">{activeLabel}</span>
 </p>
 <button
 onClick={handleDownload}
 disabled={downloading || loading || (!activeEntry && !!error)}
 className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
 >
 {downloading
 ? <ApplyDirLoader.Button variant="light" />
 : <Download className="w-4 h-4" />}
 Download PDF
 </button>
 </div>
 </div>
 </div>
 </>
 );

 // Portal to <body> — see the note at the top of this file.
 return createPortal(overlay, document.body);
}
