import { useState } from 'react';
import { Section, Eyebrow, Heading, Reveal } from './primitives';
import { FAQS } from './faqData';

function Item({ item, open, onToggle }) {
  return (
    <div className="border-b border-stone-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-6 py-5 text-left"
      >
        <span className="text-[16.5px] font-semibold tracking-[-0.015em]">{item.q}</span>
        <span
          aria-hidden="true"
          className={`mt-1 shrink-0 text-[20px] leading-none text-primary-light transition-transform duration-200 ${
            open ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      {open ? (
        <p className="max-w-[70ch] pb-6 text-[14.5px] leading-relaxed text-[#57534E]">{item.a}</p>
      ) : null}
    </div>
  );
}

export default function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <Section id="faq" tone="paper">
      <Reveal>
        <Eyebrow>Questions</Eyebrow>
        <Heading>The things people ask first.</Heading>
      </Reveal>
      <Reveal delay={90}>
        <div className="mt-12 border-t border-stone-line">
          {FAQS.map((item, i) => (
            <Item key={item.q} item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
