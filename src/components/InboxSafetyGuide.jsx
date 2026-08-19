import {
 X, Mail, ShieldCheck, Sparkles, UserPlus, Coffee, KeyRound,
 ArrowRight, CheckCircle2, Clock, Rocket, Heart,
} from'lucide-react';

// ── InboxSafetyGuide ───────────────────────────────────────────────────────
// A warm, motivating walkthrough that makes a job seeker *want* to connect a
// few Gmail inboxes — and shows them how to do it safely so their emails land
// in the hiring manager's inbox. Content mirrors CONNECTING_YOUR_INBOXES.md.
//
// Props:
// onClose() — dismiss the guide
// onConnect() — (optional) jump straight into the Connect-Gmail flow
//
// Rendered at z-[60] so it can sit cleanly above the connect modal (z-50).

const STEPS = [
 {
 icon: UserPlus,
 tag:'Step 1',
 title:'Create 2–4 free Gmails — the right way',
 points: [
'Space them out — make one today, another tomorrow. Google is wary of many new accounts at once.',
'Use a real name (e.g. firstname.lastname.jobs@gmail.com). You’re a real person applying for jobs.',
'Add a profile photo and fill in the basics. An empty, faceless account looks suspicious.',
'Verify with a phone number if Google asks.',
 ],
 },
 {
 icon: Coffee,
 tag:'Step 2',
 title:'Let each one settle for a day or two',
 points: [
'Log in and send 2–3 normal emails — to a friend, or to yourself.',
'Reply to a message or two.',
'Then let it rest a day. This tells Google “a real human uses this.”',
 ],
 },
 {
 icon: KeyRound,
 tag:'Step 3',
 title:'Connect it to ApplyDir',
 points: [
'Turn on 2-Step Verification in your Google account.',
'Create an App Password (Google → Security → App Passwords).',
'Paste the email + App Password here. Done — repeat for each inbox.',
 ],
 },
];

const AUTOPILOT = [
 { icon: Clock, text:'Starts slow, speeds up safely — ~5/day at first, ramping on its own as the inbox earns trust.' },
 { icon: Sparkles, text:'Spaces every email out like a person typing them one at a time — never a burst.' },
 { icon: Mail, text:'Rotates between your inboxes so no single one does all the work.' },
 { icon: ShieldCheck, text:'Sends only during business hours, and only about roles you genuinely match.' },
 { icon: Heart, text:'Follows up politely (day 3, 7, 14), stops the instant someone replies, and honours “no” forever.' },
];

function ReachMeter() {
 // A tiny, friendly visual: more inboxes → more hiring managers reached, calmly.
 const rows = [
 { n: 1, reach: 6, w:'25%' },
 { n: 2, reach: 12, w:'50%' },
 { n: 3, reach: 18, w:'75%' },
 { n: 4, reach: 24, w:'100%' },
 ];
 return (
 <div className="rounded-2xl border border-neutral-dark bg-neutral p-5">
 <p className="text-[11px] font-bold uppercase tracking-widest text-secondary-dark/60 mb-3">
 More inboxes → more hiring managers reached (safely)
 </p>
 <div className="space-y-2.5">
 {rows.map(({ n, reach, w }) => (
 <div key={n} className="flex items-center gap-3">
 <div className="flex items-center gap-1 w-16 shrink-0">
 {Array.from({ length: n }).map((_, i) => (
 <Mail key={i} className="w-3.5 h-3.5 text-primary-dark" />
 ))}
 </div>
 <div className="flex-1 h-2.5 rounded-full bg-neutral-dark overflow-hidden">
 <div
 className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary-dark transition-all"
 style={{ width: w }}
 />
 </div>
 <span className="w-24 shrink-0 text-right text-xs font-semibold text-black">
 ~{reach} emails/day
 </span>
 </div>
 ))}
 </div>
 <p className="text-xs text-secondary-dark mt-3 leading-relaxed">
 Each inbox stays calm and trusted (~6/day). Together, they open a lot more doors —
 <span className="font-semibold text-black"> for free, no domain to buy.</span>
 </p>
 </div>
 );
}

export default function InboxSafetyGuide({ onClose, onConnect }) {
 return (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="w-full max-w-2xl relative overflow-hidden rounded-2xl bg-white border border-neutral-dark shadow-2xl max-h-[92vh] flex flex-col">
 {/* Warm glow */}
 <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary-light/10 blur-3xl" />

 {/* Close */}
 <button
 onClick={onClose}
 aria-label="Close"
 className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-secondary-dark/60 hover:text-black-light hover:bg-neutral transition-colors"
 >
 <X className="w-5 h-5" />
 </button>

 {/* Hero */}
 <div className="px-6 md:px-8 pt-8 pb-5 relative z-10">
 <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light/15 to-primary-light/5 border border-primary-light/20 mb-4">
 <Rocket className="w-7 h-7 text-primary-dark" />
 </div>
 <h2 className="text-2xl font-bold text-black-light leading-snug">
 Reach more hiring managers — safely.
 </h2>
 <p className="text-sm text-secondary-dark mt-1.5 leading-relaxed">
 The smartest move you can make takes 3 minutes and costs nothing: connect a few
 Gmail inboxes so your introductions land in the inbox, not spam. Here’s exactly how.
 </p>
 </div>

 {/* Scrollable body */}
 <div className="px-6 md:px-8 pb-4 space-y-6 relative z-10 overflow-y-auto">

 <ReachMeter />

 {/* Steps */}
 <div className="space-y-3">
 {STEPS.map((s) => (
 <div key={s.tag} className="rounded-2xl border border-neutral-dark bg-white p-4 shadow-sm">
 <div className="flex items-center gap-3 mb-2.5">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary-light/10 border border-primary-light/20 shrink-0">
 <s.icon className="w-4 h-4 text-primary-dark" />
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-primary-dark">{s.tag}</p>
 <p className="text-sm font-bold text-black-light leading-tight">{s.title}</p>
 </div>
 </div>
 <ul className="space-y-1.5 pl-1">
 {s.points.map((p, i) => (
 <li key={i} className="flex items-start gap-2 text-xs text-secondary-dark leading-relaxed">
 <CheckCircle2 className="w-3.5 h-3.5 text-primary-light shrink-0 mt-0.5" />
 <span>{p}</span>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>

 {/* What we do for you */}
 <div className="rounded-2xl border border-primary-light/20 bg-primary-light/5 p-5">
 <div className="flex items-center gap-2 mb-3">
 <ShieldCheck className="w-4 h-4 text-primary-dark" />
 <p className="text-sm font-bold text-black-light">
 Then ApplyDir protects them for you — automatically
 </p>
 </div>
 <ul className="space-y-2">
 {AUTOPILOT.map((item, i) => (
 <li key={i} className="flex items-start gap-2.5 text-xs text-secondary-dark leading-relaxed">
 <item.icon className="w-4 h-4 text-primary-dark shrink-0 mt-0.5" />
 <span>{item.text}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* The honest note */}
 <div className="flex items-start gap-3 rounded-2xl border border-neutral-dark bg-neutral p-4">
 <Heart className="w-4 h-4 text-primary-dark shrink-0 mt-0.5" />
 <p className="text-xs text-secondary-dark leading-relaxed">
 You’re a job seeker reaching real people about real roles you’d be great for. Keep it that
 way and this works beautifully — genuine, relevant, one human to another. We handle the rest
 so you can focus on landing the interview.
 </p>
 </div>
 </div>

 {/* Sticky footer CTA */}
 <div className="px-6 md:px-8 py-4 border-t border-neutral-dark bg-white/80 backdrop-blur flex flex-col sm:flex-row gap-3 relative z-10">
 {onConnect && (
 <button
 onClick={onConnect}
 className="group flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-primary-light to-primary-dark shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
 >
 <Mail className="w-4 h-4" /> Connect an inbox now
 <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
 </button>
 )}
 <button
 onClick={onClose}
 className={`py-3 px-5 rounded-xl text-sm font-semibold transition-colors ${
 onConnect
 ?'text-secondary-dark hover:text-black-light hover:bg-neutral'
 :'flex-1 text-white bg-gradient-to-r from-primary-light to-primary-dark hover:opacity-90'
 }`}
 >
 {onConnect ?'Maybe later' :'Got it'}
 </button>
 </div>
 </div>
 </div>
 );
}
