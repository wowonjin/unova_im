'use client';

import { useState, useRef, useEffect } from 'react';

export type FAQItem = {
  label: string;
  labelColor: 'blue' | 'purple' | 'orange';
  question: string;
  answer: React.ReactNode;
};

type Props = {
  title?: string;
  items: FAQItem[];
};

export default function FAQSection({ title = "문의사항.", items }: Props) {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleToggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  useEffect(() => {
    wrapRefs.current.forEach((wrap, idx) => {
      if (!wrap) return;
      if (idx === openIndex) {
        wrap.style.height = `${wrap.scrollHeight}px`;
      } else {
        wrap.style.height = '0px';
      }
    });
  }, [openIndex]);

  const getLabelClass = (color: string) => {
    switch (color) {
      case 'blue': return 'label-blue';
      case 'purple': return 'label-purple';
      case 'orange': return 'label-orange';
      default: return 'label-blue';
    }
  };

  return (
    <section className="unova-faq unova-faq--dark">
      <div className="unova-faq__header">
        <h2 className="unova-faq__section-title">{title}</h2>
      </div>
      <div className="unova-faq__wrap">
        {items.map((item, idx) => (
          <div key={idx} className={`unova-faq__item ${openIndex === idx ? 'is-open' : ''}`}>
            <button
              type="button"
              className="unova-faq__q"
              aria-expanded={openIndex === idx}
              onClick={() => handleToggle(idx)}
            >
              <span className={`unova-faq__label ${getLabelClass(item.labelColor)}`}>
                {item.label}
              </span>
              <span className="unova-faq__title">{item.question}</span>
              <span className="unova-faq__chev" aria-hidden="true" />
            </button>
            <div
              ref={(el) => { wrapRefs.current[idx] = el; }}
              className="unova-faq__aWrap"
              style={{ height: idx === openIndex ? 'auto' : 0 }}
            >
              <div className="unova-faq__a">
                {item.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

