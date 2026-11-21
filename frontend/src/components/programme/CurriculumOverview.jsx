import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
    <section className="py-10 md:py-12 border-b border-line bg-surface" data-testid="apply-curriculum">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-tech text-accentText">What you're enrolling in</p>
            <h2 className="mt-3 font-grotesk font-semibold text-2xl md:text-3xl">The complete 16-week curriculum.</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            data-testid="apply-curriculum-toggle"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-accentText transition-colors duration-300"
          >
            {open ? "Hide" : "Show"} every topic
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        <dl className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-px bg-line border border-line">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-bg px-5 py-4">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-mutedInk">{k}</dt>
              <dd className="mt-1 font-grotesk font-semibold text-inkStrong leading-snug">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-px grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line border-t-0">
          {MONTHS.map((m) => (
            <div key={m.month} className="bg-bg p-6">
              <p className="label-tech text-accentText">{m.month}</p>
              <h3 className="mt-2 font-grotesk font-semibold text-inkStrong leading-snug">{m.title}</h3>
              <ol className="mt-4 space-y-3">
                {m.weeks.map((w) => (
                  <li key={w.week}>
                    <p className="flex gap-2 text-sm text-inkStrong">
                      <span className="text-accentText tabular-nums shrink-0">W{String(w.week).padStart(2, "0")}</span>
                      {w.title}
                    </p>
                    {open && (
                      <ul className="mt-2 ml-9 space-y-1">
                        {w.topics.map((t) => (
                          <li key={t} className="text-xs text-mutedInk leading-relaxed">
                            {t}
                          </li>
                        ))}
                        <li className="text-xs text-inkStrong leading-relaxed pt-1">
                          <span className="text-accentText">{w.deliverable.kind}:</span> {w.deliverable.text}
                        </li>
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-5 pt-4 border-t border-line flex items-start gap-2 text-xs text-mutedInk leading-relaxed">
                <Check className="w-3.5 h-3.5 text-accentText mt-0.5 shrink-0" /> {m.outcome}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm text-mutedInk">
          <span className="text-inkStrong">Portfolio projects:</span> {PROJECTS.map((p) => p.title).join(" · ")}
        </p>
      </div>
    </section>
  );
};

export default CurriculumOverview;
