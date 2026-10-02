import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import LandingNav from '../components/landing/LandingNav';
import HeroVoid from '../components/landing/hero/HeroVoid';
import JourneySection from '../components/landing/journey/JourneySection';
import OtherWaySection from '../components/landing/otherway/OtherWaySection';
import ReachSection from '../components/landing/reach/ReachSection';
import useReducedMotion from '../components/landing/hero/useReducedMotion';
import { registerLenis } from '../components/landing/hero/smoothScroll';
import loadMotion from '../components/landing/motion/loadMotion';
import EmailShowcase from '../components/landing/EmailShowcase';
import TrustSection from '../components/landing/TrustSection';
import AudienceSection from '../components/landing/AudienceSection';
import PricingSection from '../components/landing/PricingSection';
import FaqSection from '../components/landing/FaqSection';
import LandingFooter from '../components/landing/LandingFooter';
import { FAQS } from '../components/landing/faqData';
import { Section, Eyebrow, Heading, Lead, Reveal } from '../components/landing/primitives';
import { useAuth } from '../context/AuthContext';

const SITE = 'https://applydir.com';

/**
 * Structured data. Emitted from the same FAQ array the section renders, so the
 * two can never drift. Injected into <head> on mount and removed on unmount —
 * this is a SPA, so the tag must not survive a route change.
 */
function useStructuredData() {
  useEffect(() => {
    const payload = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ApplyDir',
        url: SITE,
        logo: SITE + '/applydir-app-icon-512.png',
        email: 'support@applydir.com',
        sameAs: ['https://www.linkedin.com/in/joshuaatoyebi'],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ApplyDir',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE,
        description:
          'ApplyDir finds who is hiring, identifies the person who does the hiring, and sends your introduction from your own inbox.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ];
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.dataset.landing = 'true';
    el.textContent = JSON.stringify(payload);
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

/**
 * Smooth scrolling, and the ScrollTrigger handshake.
 *
 * Lenis replaces the browser's scroll with an interpolated one, which means
 * ScrollTrigger's own scroll listener would read a stale position — so Lenis
 * drives ScrollTrigger.update, and gsap's ticker drives Lenis' rAF rather than
 * the two running separate loops against each other.
 *
 * Dynamically imported: neither library is on the landing page's critical path,
 * and someone who asked for reduced motion never downloads Lenis at all.
 */
function useSmoothScroll(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let lenis;
    let tick;
    let gsapRef;
    let unregister;

    Promise.all([import('lenis'), loadMotion()])
      .then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
        if (cancelled) return;
        gsapRef = gsap;

        lenis = new Lenis({ duration: 1.05, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        // The hero's "See how it works" needs to scroll through Lenis rather
        // than around it; this is the handoff.
        unregister = registerLenis(lenis);

        tick = (time) => lenis.raf(time * 1000);   // gsap ticker is in seconds
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      })
      .catch(() => { /* native scrolling is a fine fallback */ });

    return () => {
      cancelled = true;
      unregister?.();
      if (gsapRef && tick) gsapRef.ticker.remove(tick);
      lenis?.destroy();
    };
  }, [enabled]);
}

/**
 * The problem, stated once, in the reader's own words.
 *
 * Out of the render since the void hero says this visually. Kept until the
 * redesign is signed off.
 */
function ProblemSection() {
  return (
    <Section tone="ink">
      <div className="grid gap-10 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-20">
        <Reveal>
          <Eyebrow tone="ink">The problem</Eyebrow>
          <Heading>Applying is a black hole. You already knew that.</Heading>
        </Reveal>
        <Reveal delay={90}>
          <p className="text-[clamp(1rem,1.35vw,1.15rem)] leading-relaxed text-white/65 lg:pt-2">
            Your CV goes into an applicant tracking system and gets scored on keywords
            before a person ever reads your name. You do it eighty times and hear
            nothing &mdash; and the silence does not even tell you whether you were close.
          </p>
          <p className="mt-5 text-[clamp(1rem,1.35vw,1.15rem)] leading-relaxed text-white/65">
            Meanwhile the roles that get filled quietly get filled by someone who knew
            someone. That is not luck. That is a warm introduction, and it is the only
            part of hiring that has never been automated well.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

/** The wedge: fields where the work itself fits inside the email. */
function NicheSection() {
  return (
    <Section tone="paper">
      <div className="grid gap-10 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20">
        <Reveal>
          <Eyebrow>Copywriters and marketers</Eyebrow>
          <Heading>When your work fits in an email, nobody has to take your word for it.</Heading>
        </Reveal>
        <Reveal delay={90}>
          <p className="text-[clamp(1rem,1.35vw,1.15rem)] leading-relaxed text-[#3A3632] lg:pt-2">
            A developer has to describe what they built. A copywriter can just write the
            better headline in the body of the message. There is nothing to verify and
            no portfolio to click &mdash; a marketing lead reads it in eight seconds and
            either likes the line or does not.
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-[#57534E]">
            Reading a prospect&rsquo;s live page and drafting that rewrite is the next
            thing we ship. Today ApplyDir writes the introduction that gets you read.
          </p>
          <a
            href="#email"
            className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-primary-dark transition-colors hover:text-primary-light"
          >
            See the example
            <span aria-hidden="true">&rarr;</span>
          </a>
        </Reveal>
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <Section tone="ink">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <Heading className="mx-auto">They never saw your application. They will see this.</Heading>
          <Lead tone="ink" className="mx-auto text-center">
            Upload your CV and let it run overnight. Tomorrow morning there will be
            introductions waiting for you to approve.
          </Lead>
        </Reveal>
        <Reveal delay={110}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary-light px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-primary-dark sm:w-auto"
            >
              Get introduced
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/20 px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:border-white/45 hover:bg-white/[0.06] sm:w-auto"
            >
              I already have an account
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-white/40">
            Free while we&rsquo;re in early access. No card.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

export default function LandingPage() {
  useStructuredData();

  const reduced = useReducedMotion();
  useSmoothScroll(!reduced);

  // Shared with the nav so it can stay transparent for exactly as long as the
  // dark hero is on screen.
  const heroRef = useRef(null);

  // AuthProvider has already run its boot check by the time this renders, so
  // reading it costs nothing extra. While it is still resolving we show the
  // signed-out nav rather than flashing "Go to dashboard" at a stranger.
  const { isAuthenticated, isLoading } = useAuth();
  const signedIn = !isLoading && isAuthenticated;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* Targets the hero's primary CTA — it is focusable, so the browser moves
          focus there rather than just scrolling past the headline. */}
      <a
        href="#hero-cta"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[14px] focus:text-white"
      >
        Skip to content
      </a>
      <LandingNav signedIn={signedIn} overRef={heroRef} />
      <main>
        <HeroVoid sectionRef={heroRef} />
        <JourneySection />
        <OtherWaySection />
        <ReachSection />
        <EmailShowcase />
        <TrustSection />
        <AudienceSection />
        <NicheSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
