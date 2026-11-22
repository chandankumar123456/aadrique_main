import { useState } from "react";
import { ChevronDown, Check, BookOpen, Layers } from "lucide-react";
import { MONTHS, PROJECTS, START_LABEL, inr } from "@/lib/programme";
import { useFee } from "@/components/programme/useFee";

const FACTS = [
  ["Starts", START_LABEL],
  ["Duration", "16 weeks · ~80 hrs live"],
  ["Format", "Live classes + 1:1 mentoring"],
  ["Projects", "5 core + deployed capstone"],
];

/** "What you're enrolling in" — the whole curriculum, compact, before applying. */
export const CurriculumOverview = () => {
  const [open, setOpen] = useState(false);
  const fee = useFee();
  const facts = [...FACTS, [fee.open ? "Early-bird fee" : "Fee", inr(fee.price, 0)]];

  return (
    <section className="py-12 md:py-16 border-b border-line bg-surface" data-testid="apply-curriculum">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="label-tech text-accentText mb-2">What you're enrolling in</p>
            <h2 className="font-grotesk font-semibold text-2xl md:text-3xl text-inkStrong">
              The complete 16-week curriculum.
            </h2>
            <p className="mt-2 text-sm text-mutedInk max-w-xl leading-relaxed">
              Every week builds toward a real project. You graduate with a portfolio that proves what you can ship.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            data-testid="apply-curriculum-toggle"
            className="inline-flex items-center gap-2 border border-line px-4 py-2 text-xs uppercase tracking-[0.15em] text-mutedInk hover:border-accent hover:text-accentText transition-colors duration-300"
          >
            <Layers className="w-3.5 h-3.5" />
            {open ? "Hide" : "Show"} all topics
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Key stats bar */}
        <dl className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line border border-line">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-bg px-5 py-5 hover:bg-surface transition-colors duration-200">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-mutedInk">{k}</dt>
              <dd className="mt-1.5 font-grotesk font-semibold text-inkStrong leading-snug">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Month cards — always visible weeks, optional topics */}
        <div className="mt-px grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line border-t-0">
          {MONTHS.map((m, mi) => (
            <div
              key={m.month}
              className="bg-bg p-6 hover:bg-surface transition-colors duration-200 group"
            >
              {/* Month badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="label-tech text-accentText">{m.month}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-mutedInk border border-line px-2 py-0.5">
                  Wk {(mi * 4) + 1}–{(mi * 4) + 4}
                </span>
              </div>

              {/* Month title */}
              <h3 className="font-grotesk font-semibold text-inkStrong leading-snug text-base">
                {m.title}
              </h3>

              {/* Week list */}
              <ol className="mt-4 space-y-3 border-t border-line pt-4">
                {m.weeks.map((w) => (
                  <li key={w.week}>
                    <p className="flex gap-2 text-sm text-inkStrong">
                      <span className="text-accentText tabular-nums shrink-0 font-semibold">
                        W{String(w.week).padStart(2, "0")}
                      </span>
                      {w.title}
                    </p>
                    {open && (
                      <ul className="mt-2 ml-9 space-y-1">
                        {w.topics.map((t) => (
                          <li key={t} className="text-xs text-mutedInk leading-relaxed flex items-start gap-1.5">
                            <span className="mt-1 h-1 w-1 rounded-full bg-accentText shrink-0" />
                            {t}
                          </li>
                        ))}
                        <li className="text-xs text-inkStrong leading-relaxed pt-1 flex items-start gap-1.5">
                          <BookOpen className="w-3 h-3 text-accentText mt-0.5 shrink-0" />
                          <span>
                            <span className="text-accentText">{w.deliverable.kind}:</span>{" "}
                            {w.deliverable.text}
                          </span>
                        </li>
                      </ul>
                    )}
                  </li>
                ))}
              </ol>

              {/* Month outcome */}
              <p className="mt-5 pt-4 border-t border-line flex items-start gap-2 text-xs text-mutedInk leading-relaxed">
                <Check className="w-3.5 h-3.5 text-accentText mt-0.5 shrink-0" />
                <span>{m.outcome}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Portfolio strip */}
        <div className="mt-px border border-line border-t-0 bg-bg px-6 py-4 flex flex-wrap items-center gap-3">
          <span className="label-tech text-mutedInk shrink-0">Portfolio projects:</span>
          <div className="flex flex-wrap gap-2">
            {PROJECTS.map((p) => (
              <span
                key={p.title}
                className="text-xs border border-line px-3 py-1 text-inkStrong hover:border-accent hover:text-accentText transition-colors duration-200 cursor-default"
              >
                {p.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurriculumOverview;
