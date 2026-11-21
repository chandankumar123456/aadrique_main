import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Info, X, CalendarDays, Phone } from "lucide-react";
import { Seo } from "@/components/Seo";
import { LineReveal, Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Countdown } from "@/components/programme/Countdown";
import { useProgrammeConfig } from "@/lib/api";
import { useFee } from "@/components/programme/useFee";
import { SITE } from "@/lib/site";
import {
  HERO,
  DIFFERENTIATORS,
  PROBLEM,
  OUTCOMES,
  OUTCOMES_NOTE,
  WHY,
  LIVE_MEANS,
  MENTOR_HELPS,
  PROJECTS,
  PORTFOLIO_NOTE,
  PROJECTS_NOTE,
  MONTHS,
  TOOLS,
  TOOLS_NOTE,
  WEEK_SCHEDULE,
  CLASS_STRUCTURE,
  ASSESSMENT,
  INTERNSHIP_STEPS,
  INTERNSHIP_CRITERIA,
  NETWORK_TYPES,
  COMPARE,
  WHO,
  NOT_FIT,
  DETAILS,
  ENROL_STEPS,
  FAQS,
  FINAL,
  EARLY_BIRD_SEATS,
  PRIMARY_CTA,
  PROGRAMME_APPLY,
  START_DATE,
  START_LABEL,
} from "@/lib/programme";

const Wrap = ({ children, className = "" }) => (
  <div className={`max-w-7xl mx-auto px-6 lg:px-10 ${className}`}>{children}</div>
);

const Tick = () => <span className="inline-block h-4 w-px rotate-[30deg] bg-accent" />;

const SubHead = ({ children }) => <p className="label-tech text-accentText mb-6">{children}</p>;

/** Two-line section title: solid line, then outlined line. */
const BigTitle = ({ label, lines, children, className = "max-w-3xl" }) => (
  <Reveal className={className}>
    <SubHead>{label}</SubHead>
    <h2 className="font-grotesk font-semibold tracking-tight text-4xl md:text-5xl">
      {lines[0]}
      {lines[1] && (
        <>
          <br />
          <span className="text-outline">{lines[1]}</span>
        </>
      )}
    </h2>
    {children && <div className="mt-6 text-mutedInk text-base md:text-lg leading-relaxed space-y-4">{children}</div>}
  </Reveal>
);

/** Left-column heading. */
const SectionHead = ({ label, title, children }) => (
  <Reveal>
    <SubHead>{label}</SubHead>
    <h2 className="font-grotesk font-semibold tracking-tight text-3xl md:text-4xl max-w-sm">{title}</h2>
    {children && <div className="mt-4 text-sm text-mutedInk leading-relaxed max-w-sm space-y-3">{children}</div>}
  </Reveal>
);

const Note = ({ children, strong }) => (
  <p className={`mt-6 flex items-start gap-3 text-xs md:text-sm leading-relaxed ${strong ? "border border-accent bg-surface p-5 text-inkStrong" : "text-mutedInk"}`}>
    <Info className="w-4 h-4 text-accentText mt-0.5 shrink-0" />
    <span>{children}</span>
  </p>
);

const ApplyButton = ({ testId, children = PRIMARY_CTA, className = "" }) => (
  <Link
    to={PROGRAMME_APPLY}
    data-testid={testId}
    className={`group inline-flex items-center justify-center gap-3 bg-accent text-[#0A0A0A] px-8 py-4 font-grotesk font-medium tracking-wide hover:bg-inkStrong hover:text-bg transition-colors duration-300 ${className}`}
  >
    {children}
    <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  </Link>
);

const GhostButton = ({ href, to, testId, children }) => {
  const cls =
    "inline-flex items-center justify-center gap-3 border border-lineStrong px-8 py-4 font-grotesk font-medium tracking-wide text-inkStrong hover:border-accent hover:text-accentText transition-colors duration-300";
  return to ? (
    <Link to={to} data-testid={testId} className={cls}>{children}</Link>
  ) : (
    <a href={href} data-testid={testId} className={cls}>{children}</a>
  );
};

const CheckList = ({ items, className = "" }) => (
  <ul className={`border-t border-line ${className}`}>
    {items.map((w) => (
      <li key={w} className="py-4 border-b border-line flex items-start gap-4 text-inkStrong leading-relaxed">
        <Check className="w-4 h-4 text-accentText mt-1 shrink-0" /> {w}
      </li>
    ))}
  </ul>
);

/** Horizontal weight bars, shared by assessment and internship criteria. */
const WeightBars = ({ items, testId }) => (
  <div className="border-t border-line" data-testid={testId}>
    {items.map((it) => (
      <div key={it.label} className="py-5 border-b border-line">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-grotesk text-inkStrong">{it.label}</p>
          <p className="font-grotesk font-semibold text-accentText">{it.weight}%</p>
        </div>
        <div className="mt-3 h-1 bg-line">
          <div className="h-full bg-accent" style={{ width: `${(it.weight / 30) * 100}%`, maxWidth: "100%" }} />
        </div>
      </div>
    ))}
    <div className="py-4 flex items-baseline justify-between text-xs uppercase tracking-[0.15em] text-mutedInk">
      <span>Total</span>
      <span>{items.reduce((s, it) => s + it.weight, 0)}%</span>
    </div>
  </div>
);

/** Early-bird seats left — from real confirmed (paid) admissions, never a made-up number. */
const SeatsLeft = ({ className = "" }) => {
  const { data } = useProgrammeConfig();
  const left = data?.early_bird?.left;
  if (left == null) return null;
  return (
    <p className={`text-xs uppercase tracking-[0.15em] ${left > 0 ? "text-accentText" : "text-red-400"} ${className}`} data-testid="programme-seats-left">
      {left > 0 ? `${left} of ${EARLY_BIRD_SEATS} early-bird seats left` : "Early-bird seats are full — regular fee applies"}
    </p>
  );
};

const RefundNote = ({ className = "" }) => (
  <p className={`text-xs text-mutedInk ${className}`}>
    All fees are non-refundable.{" "}
    <Link to="/refund-policy" className="text-accentText link-underline">Refund policy</Link>
  </p>
);

export default function Programme() {
  const fee = useFee();
  const [active, setActive] = useState(0);
  const month = MONTHS[active];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Complete AI Engineering Programme",
    description: `${HERO.subhead} ${HERO.summary}`,
    provider: { "@type": "Organization", name: SITE.legalName, sameAs: SITE.url },
    educationalLevel: "Undergraduate (BTech 2nd and 3rd year)",
    timeRequired: "P16W",
    inLanguage: "en-IN",
    offers: [
      { "@type": "Offer", name: "Early-bird fee", price: "14999", priceCurrency: "INR", category: "Early bird" },
      { "@type": "Offer", name: "Regular fee", price: "17999", priceCurrency: "INR" },
    ],
    hasCourseInstance: {
      "@type": "CourseInstance",
      startDate: START_DATE.toISOString().slice(0, 10),
      courseWorkload: "PT80H",
    },
  };

  return (
    <div data-testid="programme-page">
      <Seo
        title="Complete AI Engineering Programme"
        description="Don't just learn AI — learn to build with it. A four-month live AI Engineering programme for BTech 2nd- and 3rd-year students: industry mentors, 1:1 interaction, five portfolio projects. Batch 01 starts 15 Dec 2026. Early-bird ₹14,999."
        jsonLd={jsonLd}
        image="/og-ai-engineering.png"
      />

      {/* ── 1. Hero ──────────────────────────────────── */}
      <section className="pt-24 md:pt-28 pb-12 md:pb-14 border-b border-line relative overflow-hidden" data-testid="programme-hero">
        <div className="absolute right-0 top-0 h-full w-20 md:w-28 hatch-accent opacity-25 pointer-events-none" />
        <p
          aria-hidden="true"
          className="absolute right-4 md:right-16 top-20 font-grotesk font-semibold text-[11rem] md:text-[20rem] leading-none text-outline-accent opacity-25 pointer-events-none select-none"
        >
          AI
        </p>
        <Wrap className="relative">
          <Reveal className="flex flex-wrap items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-[#0A0A0A] text-[10px] font-grotesk font-semibold uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
              Admissions open
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-accent text-accentText text-[10px] font-grotesk font-semibold uppercase tracking-[0.2em]">
              <CalendarDays className="w-3.5 h-3.5" /> Batch 01 starts {START_LABEL}
            </span>
          </Reveal>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <p className="label-tech text-accentText mb-6 flex items-center gap-3">
                <Tick /> {HERO.label}
              </p>
              <LineReveal
                as="h1"
                className="font-grotesk font-semibold tracking-tight leading-[1.02] text-5xl sm:text-6xl xl:text-[4rem]"
                lines={HERO.lines}
              />
              <Reveal delay={0.4} className="mt-8 max-w-2xl">
                <p className="font-grotesk text-inkStrong text-lg md:text-xl leading-snug">{HERO.subhead}</p>
                <p className="mt-5 text-mutedInk text-base md:text-lg leading-relaxed">{HERO.summary}</p>
              </Reveal>
              <Reveal delay={0.5} className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line">
                {HERO.facts.map(([k, v]) => (
                  <div key={k} className="bg-bg px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-mutedInk">{k}</p>
                    <p className="mt-1 font-grotesk font-semibold text-inkStrong leading-snug">{v}</p>
                  </div>
                ))}
              </Reveal>
              <Reveal delay={0.55} className="mt-9 flex flex-wrap gap-4">
                <ApplyButton testId="programme-hero-apply">{fee.open ? "Apply for an early-bird seat" : PRIMARY_CTA}</ApplyButton>
                <GhostButton href="#curriculum" testId="programme-hero-curriculum-link">Explore the 16-week curriculum</GhostButton>
              </Reveal>
              <p className="mt-5 text-xs text-mutedInk max-w-xl">{HERO.disclaimer}</p>
            </div>

            <Reveal delay={0.6} className="lg:col-span-5 lg:mt-10">
              <div className="border border-accent bg-surface" data-testid="programme-hero-fee">
                <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-4">
                  <p className="label-tech text-mutedInk">Classes begin in</p>
                  <p className="label-tech text-accentText">{START_LABEL}</p>
                </div>
                <div className="p-6">
                  <Countdown testId="programme-hero-countdown" />
                </div>
                {fee.open ? (
                  <div className="px-6 pb-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="label-tech text-accentText">Early-bird fee</p>
                      <p className="mt-1 font-grotesk font-semibold text-5xl text-inkStrong">₹14,999</p>
                      <p className="mt-1 text-sm text-mutedInk">
                        Regular fee <span className="line-through">₹17,999</span>
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-accent text-[#0A0A0A] text-[10px] uppercase tracking-[0.15em] whitespace-nowrap">Save ₹3,000</span>
                  </div>
                ) : (
                  <div className="px-6 pb-6">
                    <p className="label-tech text-accentText">Programme fee</p>
                    <p className="mt-1 font-grotesk font-semibold text-5xl text-inkStrong">₹17,999</p>
                    <p className="mt-1 text-sm text-mutedInk">Early-bird seats are full.</p>
                  </div>
                )}
                <div className="px-6 py-4 border-t border-line space-y-1">
                  <SeatsLeft />
                  {fee.open && <p className="text-xs text-mutedInk">First 20 admissions, subject to availability.</p>}
                  <RefundNote />
                </div>
              </div>
            </Reveal>
          </div>
        </Wrap>
      </section>

      {/* ── 2. What makes it different ───────────────── */}
      <section className="border-b border-line bg-surface" data-testid="programme-different">
        <Wrap className="py-10 md:py-12">
          <Reveal><SubHead>What makes this programme different?</SubHead></Reveal>
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line" stagger={0.05}>
            {DIFFERENTIATORS.map(([t, d], i) => (
              <StaggerItem key={t} className="h-full">
                <div className="h-full p-6 bg-bg flex gap-4">
                  <span className="label-tech text-accentText pt-1">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-grotesk font-semibold text-inkStrong">{t}</h3>
                    <p className="mt-1.5 text-sm text-mutedInk leading-relaxed">{d}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Wrap>
      </section>

      {/* ── 3. The student problem ───────────────────── */}
      <section className="py-12 md:py-16 border-b border-line" data-testid="programme-problem">
        <Wrap className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <BigTitle label="The gap" lines={PROBLEM.title} className="">
              {PROBLEM.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </BigTitle>
          </div>
          <Reveal delay={0.1} className="lg:col-span-5 flex items-end">
            <div className="w-full border border-accent bg-surface p-8">
              <p className="label-tech text-accentText">The goal</p>
              <p className="mt-4 font-grotesk font-semibold text-2xl md:text-3xl text-inkStrong leading-snug">{PROBLEM.goal}</p>
            </div>
          </Reveal>
        </Wrap>
      </section>

      {/* ── 4. Outcomes ──────────────────────────────── */}
      <section className="py-12 md:py-16 border-b border-line" data-testid="programme-outcomes">
        <Wrap>
          <BigTitle label="Programme outcomes" lines={["Four months of learning.", "Work you can show."]}>
            <p>By the end of the 16 weeks, you will have worked across the core stages of an AI engineering workflow.</p>
          </BigTitle>
          <Stagger className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line" stagger={0.07}>
            {OUTCOMES.map((o, i) => (
              <StaggerItem key={o.title} className="h-full">
                <div className="h-full p-7 bg-bg">
                  <p className="font-grotesk font-semibold text-5xl text-outline-accent leading-none">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-6 font-grotesk font-semibold text-lg leading-snug">{o.title}</h3>
                  <p className="mt-2 text-sm text-mutedInk leading-relaxed">{o.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <Note>{OUTCOMES_NOTE}</Note>
        </Wrap>
      </section>

      {/* ── 5. Why AADRIQUE ──────────────────────────── */}
      <section className="py-12 md:py-16 border-b border-line bg-surface" data-testid="programme-why">
        <Wrap>
          <BigTitle label="Why AADRIQUE's programme" lines={["More than content.", "Guidance, practice and feedback."]} />
          <Stagger className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line" stagger={0.06}>
            {WHY.map((w, i) => (
              <StaggerItem key={w.title} className="h-full">
                <div className="h-full p-8 bg-bg">
                  <span className="label-tech text-accentText">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-5 font-grotesk font-semibold text-lg leading-snug">{w.title}</h3>
                  <p className="mt-3 text-sm text-mutedInk leading-relaxed">{w.desc}</p>
                </div>
              </StaggerItem>
            ))}
            <StaggerItem className="h-full">
              <div className="h-full p-8 bg-accent text-[#0A0A0A] flex flex-col justify-between">
                <p className="font-grotesk font-semibold text-2xl leading-snug">Learn AI Engineering through real-world industry practice.</p>
                <Link
                  to={PROGRAMME_APPLY}
                  data-testid="programme-why-apply"
                  className="mt-8 inline-flex items-center gap-2 font-grotesk font-medium text-sm uppercase tracking-[0.15em]"
                >
                  {PRIMARY_CTA} <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </StaggerItem>
          </Stagger>
        </Wrap>
      </section>

      {/* ── 6. Mentorship & live interaction ─────────── */}
      <section className="py-12 md:py-16 border-b border-line" data-testid="programme-mentorship">
        <Wrap>
          <BigTitle label="Mentorship and live interaction" lines={["Ask questions while you're learning —", "not weeks later."]}>
            <p>
              A common frustration with self-paced learning is getting stuck and not knowing what to do next. This programme is
              built around live instruction and interaction: follow the instructor's implementation, raise doubts during the
              session and learn how technical problems are approached.
            </p>
          </BigTitle>
          <div className="mt-12 grid md:grid-cols-2 gap-10">
            <Reveal>
              <SubHead>What live learning means here</SubHead>
              <CheckList items={LIVE_MEANS} />
            </Reveal>
            <Reveal delay={0.1}>
              <SubHead>What mentor interaction helps with</SubHead>
              <CheckList items={MENTOR_HELPS} />
              <div className="mt-8">
                <ApplyButton testId="programme-mentorship-apply" />
              </div>
            </Reveal>
          </div>
        </Wrap>
      </section>

      {/* ── 7. Projects ──────────────────────────────── */}
      <section className="py-12 md:py-16 border-b border-line bg-surface" data-testid="programme-projects">
        <Wrap className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <SectionHead label="What you will build" title="Five projects. One portfolio that tells a story.">
              <p>
                <span className="text-inkStrong">Your portfolio:</span> {PORTFOLIO_NOTE}
              </p>
            </SectionHead>
          </div>
          <div className="lg:col-span-8">
            <Stagger className="border-t border-line" stagger={0.07}>
              {PROJECTS.map((p, i) => (
                <StaggerItem key={p.title}>
                  <div className="grid md:grid-cols-12 gap-3 md:gap-8 py-6 border-b border-line">
                    <p className="md:col-span-2 label-tech text-accentText pt-1">Project {String(i + 1).padStart(2, "0")}</p>
                    <h3 className="md:col-span-4 font-grotesk font-semibold text-xl">{p.title}</h3>
                    <p className="md:col-span-6 text-mutedInk leading-relaxed">{p.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
            <Note>{PROJECTS_NOTE}</Note>
          </div>
        </Wrap>
      </section>

      {/* ── 8. Curriculum ────────────────────────────── */}
      <section id="curriculum" className="py-12 md:py-16 border-b border-line scroll-mt-20" data-testid="programme-curriculum">
        <Wrap>
          <BigTitle label="Complete 16-week curriculum" lines={["From Python foundations", "to production AI engineering."]} />

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line" role="tablist" aria-label="Curriculum months">
            {MONTHS.map((m, i) => (
              <button
                key={m.month}
                role="tab"
                aria-selected={active === i}
                aria-controls="curriculum-panel"
                onClick={() => setActive(i)}
                data-testid={`programme-month-tab-${i + 1}`}
                className={`flex flex-col items-start justify-start text-left p-6 md:p-7 transition-colors duration-300 ${
                  active === i ? "bg-surface outline outline-1 outline-accent -outline-offset-1" : "bg-bg hover:bg-surface"
                }`}
              >
                <span className={`label-tech ${active === i ? "text-accentText" : "text-mutedInk"}`}>
                  {m.month} · Weeks {m.weeks[0].week}–{m.weeks[m.weeks.length - 1].week}
                </span>
                <p className="mt-4 font-grotesk font-semibold text-inkStrong leading-snug">{m.title}</p>
              </button>
            ))}
          </div>

          <div id="curriculum-panel" role="tabpanel" className="mt-10" data-testid="programme-month-panel">
            <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 pb-8 border-b border-line">
              <div className="lg:col-span-6">
                <p className="label-tech text-mutedInk mb-2">Learning objective</p>
                <p className="text-inkStrong leading-relaxed">{month.objective}</p>
              </div>
              <div className="lg:col-span-6">
                <p className="label-tech text-mutedInk mb-2">Month-end outcome</p>
                <p className="flex items-start gap-3 text-inkStrong leading-relaxed">
                  <Check className="w-4 h-4 text-accentText mt-1 shrink-0" /> {month.outcome}
                </p>
              </div>
            </div>

            <div key={month.month} className="mt-8 grid md:grid-cols-2 gap-px bg-line border border-line">
              {month.weeks.map((w) => (
                <article key={w.week} className="p-8 bg-bg flex flex-col" data-testid={`programme-week-${w.week}`}>
                  <div className="flex items-baseline gap-5">
                    <p className="font-grotesk font-semibold text-5xl text-outline leading-none">{String(w.week).padStart(2, "0")}</p>
                    <div>
                      <p className="label-tech text-accentText">Week {w.week}</p>
                      <h3 className="mt-1 font-grotesk font-semibold text-xl leading-snug">{w.title}</h3>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-2 flex-1">
                    {w.topics.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-mutedInk leading-relaxed">
                        <span className="mt-2 h-px w-3 bg-accent shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 pt-5 border-t border-line text-sm text-inkStrong leading-relaxed">
                    <span className="block text-[11px] uppercase tracking-[0.15em] text-accentText mb-1">{w.deliverable.kind}</span>
                    {w.deliverable.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── 9. Tools ─────────────────────────────────── */}
      <section className="py-12 md:py-14 border-b border-line bg-surface" data-testid="programme-tools-section">
        <Wrap className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <SectionHead label="Tools and technologies" title="Work with tools used across modern AI development." />
          </div>
          <Reveal className="lg:col-span-8">
            <div className="flex flex-wrap gap-2" data-testid="programme-tools">
              {TOOLS.map((t) => (
                <span key={t} className="px-3 py-1.5 border border-line bg-bg text-sm text-inkStrong">
                  {t}
                </span>
              ))}
            </div>
            <Note>{TOOLS_NOTE}</Note>
          </Reveal>
        </Wrap>
      </section>

      {/* ── 10. Weekly experience ────────────────────── */}
      <section className="py-12 md:py-16 border-b border-line" data-testid="programme-schedule">
        <Wrap>
          <BigTitle label="Weekly learning experience" lines={["One focused live hour every weekday.", "Practical work throughout the week."]}>
            <p>The programme is designed around approximately one hour of live instruction per weekday over 16 weeks.</p>
          </BigTitle>

          <Stagger className="mt-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-line border border-line" stagger={0.05}>
            {WEEK_SCHEDULE.map((d) => (
              <StaggerItem key={d.day} className="h-full">
                <div className={`h-full p-6 ${d.optional ? "bg-surface" : "bg-bg"}`}>
                  <p className={`font-grotesk font-semibold text-2xl ${d.optional ? "text-mutedInk" : "text-inkStrong"}`}>{d.day}</p>
                  <p className="mt-3 text-sm text-mutedInk leading-relaxed">{d.focus}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-14 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <SectionHead label="Inside a live class" title="How each hour is spent." />
            </div>
            <div className="lg:col-span-8">
              <Reveal>
                <div className="flex h-2 gap-px" aria-hidden="true">
                  {CLASS_STRUCTURE.map((c, i) => {
                    const [a, b] = c.time.split("–").map(Number);
                    return <div key={c.time} className={i === 2 ? "bg-accent" : "bg-lineStrong"} style={{ flex: b - a }} />;
                  })}
                </div>
                <div className="mt-6 border-t border-line">
                  {CLASS_STRUCTURE.map((c) => (
                    <div key={c.time} className="grid grid-cols-12 gap-4 py-4 border-b border-line">
                      <p className="col-span-4 sm:col-span-3 label-tech text-accentText pt-0.5">{c.time} min</p>
                      <p className="col-span-8 sm:col-span-9 font-grotesk text-inkStrong">{c.activity}</p>
                    </div>
                  ))}
                </div>
                <Note>
                  Plan additional weekly time for coding practice, assignments and project development. The approximately 80
                  live teaching hours are supported by independent practice.
                </Note>
              </Reveal>
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── 11. Assessment & certificate ─────────────── */}
      <section className="py-12 md:py-16 border-b border-line bg-surface" data-testid="programme-assessment">
        <Wrap className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <SectionHead label="How your progress is evaluated" title="Your work matters more than simply attending sessions." />
            <Reveal delay={0.1} className="mt-10 border border-line bg-bg p-7" >
              <p className="label-tech text-accentText">Your programme completion certificate</p>
              <p className="mt-4 text-sm text-inkStrong leading-relaxed">
                Students who satisfy the programme's attendance, assessment and project-completion requirements receive an
                AADRIQUE programme completion certificate issued in their name.
              </p>
              <p className="mt-3 text-sm text-mutedInk leading-relaxed">
                The certificate confirms programme completion — your projects and ability to explain your work are what
                demonstrate your practical skills.
              </p>
            </Reveal>
          </div>
          <Reveal className="lg:col-span-7">
            <WeightBars items={ASSESSMENT} testId="programme-assessment-weights" />
          </Reveal>
        </Wrap>
      </section>

      {/* ── 12. Internship ───────────────────────────── */}
      <section id="internship" className="py-12 md:py-16 border-b border-line scroll-mt-20" data-testid="programme-internship">
        <Wrap>
          <BigTitle label="Paid internship opportunities" lines={["Turn strong performance", "into an opportunity."]}>
            <p>
              The programme includes a competitive pathway for selected high-performing students to be considered for available
              paid internship opportunities. You'll demonstrate your abilities through assignments, practical assessments and
              project work.
            </p>
          </BigTitle>

          <div className="mt-12 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <Reveal><SubHead>How the selection process works</SubHead></Reveal>
              <Stagger className="border-t border-line" stagger={0.07}>
                {INTERNSHIP_STEPS.map(([t, d], i) => (
                  <StaggerItem key={t}>
                    <div className="flex gap-5 py-5 border-b border-line">
                      <span className="grid h-9 w-9 shrink-0 place-items-center border border-accent text-accentText font-grotesk font-semibold text-sm">
                        {i + 1}
                      </span>
                      <div className="pt-1">
                        <p className="font-grotesk font-semibold text-inkStrong">{t}</p>
                        <p className="mt-1 text-sm text-mutedInk leading-relaxed">{d}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
            <Reveal delay={0.1} className="lg:col-span-6">
              <SubHead>Selection criteria</SubHead>
              <WeightBars items={INTERNSHIP_CRITERIA} testId="programme-internship-criteria" />
            </Reveal>
          </div>

          <Note strong>
            <span className="font-grotesk font-semibold">Please read:</span> paid internships are competitive opportunities for
            selected students, not a guaranteed benefit for every enrollee. The number of positions, stipend, duration and
            responsibilities depend on actual availability and the terms communicated by the internship provider.
          </Note>
          <div className="mt-8">
            <ApplyButton testId="programme-internship-apply">Apply and work towards the opportunity</ApplyButton>
          </div>
        </Wrap>
      </section>

      {/* ── 13. Industry network ─────────────────────── */}
      <section className="relative overflow-hidden border-b border-line bg-surface" data-testid="programme-network">
        <div className="absolute inset-y-0 right-0 w-1/3 hatch opacity-40 pointer-events-none" />
        <Wrap className="py-12 md:py-16 relative grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-7">
            <p className="label-tech text-accentText mb-6 flex items-center gap-3">
              <Tick /> Industry network
            </p>
            <h2 className="font-grotesk font-semibold tracking-tight text-4xl md:text-5xl">
              Industry exposure <span className="text-outline">beyond the classroom.</span>
            </h2>
            <p className="mt-6 text-mutedInk text-base md:text-lg leading-relaxed">
              AADRIQUE is associated with a network of <span className="text-inkStrong">20+ partner companies</span>. Depending on each
              organisation's confirmed role, the network may contribute to industry interactions, project insights, mentoring,
              technology collaboration or relevant career opportunities.
            </p>
            <Note>
              A company association does not by itself guarantee recruitment, placement or internship selection. Only confirmed
              opportunities will be described as available.
            </Note>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <SubHead>Partnerships can take different forms</SubHead>
            <div className="border-t border-line">
              {NETWORK_TYPES.map((t) => (
                <p key={t} className="py-4 border-b border-line font-grotesk text-inkStrong flex items-center gap-3">
                  <Tick /> {t}
                </p>
              ))}
            </div>
          </Reveal>
        </Wrap>
      </section>

      {/* ── 14. Free videos vs this programme ────────── */}
      <section className="py-12 md:py-16 border-b border-line" data-testid="programme-compare">
        <Wrap className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <SectionHead label="Why not just learn from free videos?" title="Free content teaches a topic. A programme helps you build.">
              <p>
                Free learning resources are valuable. This programme is for students who want structure, live interaction,
                practical work and guidance while they learn.
              </p>
            </SectionHead>
          </div>
          <Reveal className="lg:col-span-8">
            <div className="border border-line overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="w-1/2 p-4 text-left label-tech text-mutedInk font-normal">{COMPARE.them}</th>
                    <th className="p-4 text-left label-tech text-accentText font-normal bg-surface border-l border-accent">{COMPARE.us}</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.rows.map(([them, us], i) => (
                    <tr key={us} className={i < COMPARE.rows.length - 1 ? "border-b border-line" : ""}>
                      <td className="p-4 text-mutedInk align-top">
                        <span className="flex items-start gap-2">
                          <X className="w-4 h-4 mt-0.5 shrink-0 opacity-50" /> {them}
                        </span>
                      </td>
                      <td className="p-4 text-inkStrong align-top bg-surface border-l border-accent">
                        <span className="flex items-start gap-2">
                          <Check className="w-4 h-4 mt-0.5 shrink-0 text-accentText" /> {us}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </Wrap>
      </section>

      {/* ── 15. Who should apply ─────────────────────── */}
      <section className="py-12 md:py-16 border-b border-line bg-surface" data-testid="programme-who">
        <Wrap className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <SectionHead label="Who should apply?" title="Built for BTech students who are ready to practise." />
          </div>
          <div className="lg:col-span-8">
            <Reveal>
              <CheckList items={WHO} />
            </Reveal>
            <div className="mt-10 grid md:grid-cols-2 gap-8">
              <Reveal>
                <p className="label-tech text-accentText">Do I need prior AI knowledge?</p>
                <p className="mt-3 text-inkStrong leading-relaxed">No prior AI experience is required. Python foundations are included.</p>
                <p className="mt-2 text-sm text-mutedInk leading-relaxed">
                  You should, however, be ready to practise regularly, write code and spend additional time on assignments and
                  projects outside the live sessions.
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="label-tech text-mutedInk">This may not be the right fit if</p>
                <ul className="mt-3 space-y-2" data-testid="programme-not-fit">
                  {NOT_FIT.map((n) => (
                    <li key={n} className="flex items-start gap-3 text-sm text-mutedInk leading-relaxed">
                      <X className="w-4 h-4 mt-0.5 shrink-0 opacity-60" /> {n}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── 16. Details & fees ───────────────────────── */}
      <section id="fees" className="py-12 md:py-16 border-b border-line scroll-mt-20" data-testid="programme-fees">
        <Wrap>
          <BigTitle label="Programme details and fees" lines={["Start building", "with Batch 01."]} />
          <div className="mt-12 grid lg:grid-cols-12 gap-10">
            <Reveal className="lg:col-span-5">
              <dl className="border-t border-line" data-testid="programme-details">
                {DETAILS.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-5 gap-4 py-3.5 border-b border-line">
                    <dt className="col-span-2 text-xs uppercase tracking-[0.12em] text-mutedInk pt-0.5">{k}</dt>
                    <dd className="col-span-3 text-sm text-inkStrong">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <div className="lg:col-span-7">
              <Stagger className="grid sm:grid-cols-2 gap-px bg-line border border-line" stagger={0.08}>
                <StaggerItem className="h-full">
                  <div
                    className={`relative h-full p-8 bg-bg flex flex-col ${fee.open ? "outline outline-1 outline-accent -outline-offset-1" : "opacity-60"}`}
                    data-testid="programme-fee-early-bird"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-grotesk font-semibold text-inkStrong">Early-bird admission</p>
                      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${fee.open ? "bg-accent text-[#0A0A0A]" : "border border-red-400/60 text-red-400"}`}>
                        {fee.open ? "Save ₹3,000" : "Full"}
                      </span>
                    </div>
                    <p className={`mt-6 font-grotesk font-semibold text-5xl text-inkStrong ${fee.open ? "" : "line-through"}`}>₹14,999</p>
                    <p className="mt-4 text-sm text-inkStrong">For the first 20 admissions, subject to availability.</p>
                    <SeatsLeft className="mt-3" />
                    {fee.open && (
                      <>
                        <p className="mt-6 label-tech text-mutedInk mb-3">Batch starts in</p>
                        <Countdown testId="programme-fee-countdown" />
                        <div className="mt-8 flex-1" />
                        <ApplyButton testId="programme-fee-apply">Apply for the ₹14,999 early-bird fee</ApplyButton>
                      </>
                    )}
                  </div>
                </StaggerItem>
                <StaggerItem className="h-full">
                  <div
                    className={`h-full p-8 bg-bg flex flex-col ${fee.open ? "" : "outline outline-1 outline-accent -outline-offset-1"}`}
                    data-testid="programme-fee-regular"
                  >
                    <p className="font-grotesk font-semibold text-inkStrong">{fee.open ? "Regular admission" : "Admission fee"}</p>
                    <p className="mt-6 font-grotesk font-semibold text-5xl text-inkStrong">₹17,999</p>
                    <p className="mt-4 text-sm text-mutedInk leading-relaxed">
                      {fee.open
                        ? "Applies once the 20 early-bird seats are taken. "
                        : "The early-bird seats are taken — this is the current fee for Batch 01. "}
                      The fee covers the live programme and everything listed on this page. Pay online through Razorpay — UPI,
                      cards or net banking.
                    </p>
                    <div className="mt-8 flex-1" />
                    {fee.open ? (
                      <GhostButton to={PROGRAMME_APPLY} testId="programme-fee-regular-apply">{PRIMARY_CTA}</GhostButton>
                    ) : (
                      <ApplyButton testId="programme-fee-regular-apply" />
                    )}
                  </div>
                </StaggerItem>
              </Stagger>
              <RefundNote className="mt-4" />
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── 17. Admissions process ───────────────────── */}
      <section id="enrol" className="py-12 md:py-16 border-b border-line bg-surface scroll-mt-20" data-testid="programme-enrol">
        <Wrap>
          <BigTitle label="Admissions process" lines={["Three steps", "to get started."]} />
          <Stagger className="mt-12 grid sm:grid-cols-3 gap-px bg-line border border-line" stagger={0.08}>
            {ENROL_STEPS.map((st, i) => (
              <StaggerItem key={st.title} className="h-full">
                <div className="h-full p-8 bg-bg">
                  <span className="grid h-10 w-10 place-items-center border border-accent text-accentText font-grotesk font-semibold">{i + 1}</span>
                  <h3 className="mt-6 font-grotesk font-semibold text-xl">{st.title}</h3>
                  <p className="mt-2 text-sm text-mutedInk leading-relaxed">{st.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-8">
            <ApplyButton testId="programme-enrol-apply">Start your application</ApplyButton>
          </div>
        </Wrap>
      </section>

      {/* ── 18. FAQ ──────────────────────────────────── */}
      <section className="py-12 md:py-16 border-b border-line" data-testid="programme-faq">
        <Wrap className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <SectionHead label="Frequently asked questions" title="Before you apply." />
          </div>
          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="border-t border-line">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`f${i}`} className="border-b border-line">
                  <AccordionTrigger
                    data-testid={`programme-faq-trigger-${i}`}
                    className="font-grotesk text-left text-base md:text-lg text-inkStrong hover:text-accentText hover:no-underline py-6"
                  >
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-mutedInk leading-relaxed pb-6 text-sm md:text-base">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Wrap>
      </section>

      {/* ── 19. Final CTA ────────────────────────────── */}
      <section className="relative bg-[#FA942C] text-[#0A0A0A] overflow-hidden" data-testid="programme-final-cta">
        <div className="absolute inset-y-0 right-0 w-1/3 hatch opacity-30 pointer-events-none" style={{ "--line": "rgba(10,10,10,0.4)" }} />
        <Wrap className="relative py-12 md:py-16 grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-8">
            <p className="label-tech mb-6 text-[#0A0A0A]/70">Batch 01 starts {START_LABEL}</p>
            <h2 className="font-grotesk font-semibold tracking-tight text-4xl md:text-5xl max-w-3xl text-[#0A0A0A]">{FINAL.title}</h2>
            <p className="mt-6 max-w-2xl text-[#0A0A0A]/75 text-base md:text-lg leading-relaxed">{FINAL.body}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={PROGRAMME_APPLY}
                data-testid="programme-final-apply"
                className="group inline-flex items-center gap-3 bg-[#0A0A0A] text-[#F6F0DE] px-8 py-4 font-grotesk font-medium tracking-wide hover:bg-white hover:text-[#0A0A0A] transition-colors duration-300"
              >
                {PRIMARY_CTA}
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="#curriculum"
                data-testid="programme-final-curriculum"
                className="inline-flex items-center gap-3 border border-[#0A0A0A]/40 px-8 py-4 font-grotesk font-medium tracking-wide hover:border-[#0A0A0A] transition-colors duration-300"
              >
                See the curriculum
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 flex flex-col justify-end">
            <div className="border border-[#0A0A0A]/30 p-6">
              <p className="font-grotesk font-semibold text-4xl">₹{fee.price.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-sm text-[#0A0A0A]/75">
                {fee.open ? "Early-bird · regular fee ₹17,999" : "Early-bird seats are full"}
              </p>
              {fee.open && <p className="mt-1 text-sm text-[#0A0A0A]/75">First 20 admissions qualify.</p>}
              <div className="mt-5 pt-5 border-t border-[#0A0A0A]/20 space-y-2 text-sm">
                <a href={`mailto:${SITE.email}`} className="block hover:underline">{SITE.email}</a>
                <a href={`tel:${SITE.phoneHref}`} className="flex items-center gap-2 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> {SITE.phone}
                </a>
              </div>
            </div>
          </Reveal>
          <p className="lg:col-span-12 text-xs text-[#0A0A0A]/65 max-w-4xl">{FINAL.disclaimer}</p>
        </Wrap>
      </section>
    </div>
  );
}
