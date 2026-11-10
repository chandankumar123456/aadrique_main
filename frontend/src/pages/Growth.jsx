import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Check, Quote } from "lucide-react";
import { Seo } from "@/components/Seo";
import { LineReveal, Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { CTABand } from "@/components/CTABand";
import { useGrowth } from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const GROWTH_CONTACT = "/contact?interest=growth";

const Wrap = ({ children, className = "" }) => (
  <div className={`max-w-7xl mx-auto px-6 lg:px-10 ${className}`}>{children}</div>
);

const Tick = () => <span className="inline-block h-4 w-px rotate-[30deg] bg-accent" />;

const ExternalLink = ({ href, children, testId }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    data-testid={testId}
    className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-accentText transition-colors duration-300"
  >
    {children}
    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  </a>
);

/** Shared opener for each of the three pipeline chapters. */
const ChapterHead = ({ stage, lines, partnerLine, intro, links }) => (
  <div className="grid lg:grid-cols-12 gap-10">
    <div className="lg:col-span-4">
      <Reveal>
        <p className="font-grotesk font-semibold text-7xl md:text-8xl text-outline leading-none">{stage.step}</p>
        <p className="mt-6 label-tech text-accentText flex items-center gap-3">
          <Tick /> {stage.verb} — {stage.title}
        </p>
      </Reveal>
    </div>
    <div className="lg:col-span-8">
      <Reveal>
        <h2 className="font-grotesk font-semibold tracking-tight text-4xl md:text-5xl max-w-3xl">
          {lines[0]}
          <br />
          <span className="text-outline">{lines[1]}</span>
        </h2>
        <p className="mt-6 label-tech text-inkStrong">{partnerLine}</p>
        <p className="mt-5 max-w-2xl text-mutedInk leading-relaxed">{intro}</p>
        {links && <div className="mt-6 flex flex-wrap gap-6">{links}</div>}
      </Reveal>
    </div>
  </div>
);

const SubHead = ({ children }) => <p className="label-tech text-accentText mb-6">{children}</p>;

const StatGrid = ({ items, testId }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line" data-testid={testId}>
    {items.map((h) => (
      <div key={h.label} className="p-6 md:p-8 bg-bg">
        <p className="font-grotesk font-semibold text-2xl md:text-3xl text-inkStrong">{h.value}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.15em] text-mutedInk leading-tight">{h.label}</p>
      </div>
    ))}
  </div>
);

const Chips = ({ items }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((c) => (
      <span key={c} className="px-3 py-1.5 border border-line text-xs text-mutedInk">
        {c}
      </span>
    ))}
  </div>
);

const TIER_STYLE = {
  Hot: "bg-accent text-[#0A0A0A] border-accent",
  Warm: "border-accent text-accentText",
  Nurture: "border-lineStrong text-mutedInk",
};

export default function Growth() {
  const { data, isLoading, isError } = useGrowth();
  const { hash } = useLocation();

  // Chapters only exist once content has loaded, so a /growth#qualify link from
  // another page has nothing to land on at first paint — scroll once it does.
  useEffect(() => {
    if (!data || !hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }), 400);
    return () => clearTimeout(t);
  }, [data, hash]);

  if (isLoading)
    return <div className="pt-32 pb-20 text-center text-mutedInk" data-testid="growth-loading">Loading…</div>;
  if (isError || !data)
    return (
      <div className="pt-32 pb-20 text-center text-mutedInk" data-testid="growth-error">
        This page couldn't be loaded. Please refresh, or{" "}
        <Link to="/contact" className="text-accentText link-underline">contact us</Link>.
      </div>
    );

  const { hero, stages = [], marketing: mk = {}, qualify: q = {}, close: cl = {}, loop = {}, faqs = [] } = data;
  const stage = Object.fromEntries(stages.map((s) => [s.key, s]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AADRIQUE Growth Ecosystem",
    serviceType: "Marketing, lead qualification and sales",
    description: hero.summary,
    provider: { "@type": "Organization", name: "AADRIQUE TECH PVT LTD" },
    areaServed: "IN",
  };

  return (
    <div data-testid="growth-page">
      <Seo title="Growth Ecosystem" description={hero.summary} jsonLd={jsonLd} />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="pt-24 md:pt-28 pb-12 md:pb-14 border-b border-line relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-20 hatch-accent opacity-25 pointer-events-none" />
        <Wrap>
          <p className="label-tech text-accentText mb-6 flex items-center gap-3">
            <Tick /> {hero.label}
          </p>
          <LineReveal
            as="h1"
            className="font-grotesk font-semibold tracking-tight leading-[1.02] text-5xl sm:text-6xl lg:text-7xl"
            lines={hero.lines}
          />
          <Reveal delay={0.4} className="mt-8 max-w-2xl">
            <p className="text-mutedInk text-base md:text-lg leading-relaxed">{hero.summary}</p>
          </Reveal>
          <Reveal delay={0.5} className="mt-9 flex flex-wrap gap-4">
            <Link
              to={GROWTH_CONTACT}
              data-testid="growth-hero-cta"
              className="group inline-flex items-center gap-3 bg-accent text-[#0A0A0A] px-8 py-4 font-grotesk font-medium tracking-wide hover:bg-inkStrong hover:text-bg transition-colors duration-300"
            >
              Build my pipeline
              <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#pipeline"
              data-testid="growth-hero-how-link"
              className="inline-flex items-center gap-3 border border-lineStrong px-8 py-4 font-grotesk font-medium tracking-wide text-inkStrong hover:border-accent hover:text-accentText transition-colors duration-300"
            >
              See the pipeline
            </a>
          </Reveal>
        </Wrap>
      </section>

      {/* ── Pipeline overview ────────────────────────── */}
      <section id="pipeline" className="py-12 md:py-16 border-b border-line scroll-mt-20" data-testid="growth-pipeline">
        <Wrap>
          <Reveal>
            <SubHead>How a lead moves</SubHead>
          </Reveal>
          <Stagger className="grid md:grid-cols-3 gap-px bg-line border border-line" stagger={0.1}>
            {stages.map((s, i) => (
              <StaggerItem key={s.key} className="h-full">
                <a
                  href={`#${s.key}`}
                  data-testid={`growth-stage-${s.key}`}
                  className="group relative flex h-full flex-col bg-bg p-8 md:p-10 hover:bg-surface transition-colors duration-300"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="label-tech text-accentText">{s.step}</span>
                    <span className="label-tech text-mutedInk">{s.partner}</span>
                  </div>
                  <p className="mt-8 font-grotesk font-semibold text-4xl md:text-5xl tracking-tight group-hover:text-accentText transition-colors duration-300">
                    {s.verb}
                  </p>
                  <p className="mt-3 font-grotesk font-medium text-inkStrong">{s.title}</p>
                  <p className="mt-4 text-sm text-mutedInk leading-relaxed flex-1">{s.summary}</p>
                  <p className="mt-8 pt-5 border-t border-line flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-inkStrong">
                    <ArrowRight className="w-3.5 h-3.5 text-accentText" /> {s.output}
                  </p>
                  {i < stages.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden md:grid absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 place-items-center border border-line bg-bg text-accentText"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </Wrap>
      </section>

      {/* ── 01 Marketing ─────────────────────────────── */}
      {stage.marketing && (
        <section id="marketing" className="py-12 md:py-16 border-b border-line scroll-mt-20" data-testid="growth-marketing">
          <Wrap>
            <ChapterHead
              stage={stage.marketing}
              lines={stage.marketing.headline}
              partnerLine={`Delivered by ${mk.partner} · ${mk.base}`}
              intro={mk.intro}
              links={
                <>
                  <ExternalLink href={mk.url} testId="growth-accura8-site">theaccura8agency.com</ExternalLink>
                  <ExternalLink href={mk.instagram} testId="growth-accura8-instagram">Instagram</ExternalLink>
                </>
              }
            />

            <Reveal className="mt-12">
              <StatGrid items={mk.stats || []} testId="growth-marketing-stats" />
              <p className="mt-3 text-xs text-mutedInk">{mk.stats_note}</p>
            </Reveal>

            {/* Services */}
            <div className="mt-14">
              <Reveal><SubHead>What marketing covers</SubHead></Reveal>
              <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line" stagger={0.06}>
                {(mk.services || []).map((sv) => (
                  <StaggerItem key={sv.title} className="h-full">
                    <div className="h-full p-8 bg-bg">
                      <h3 className="font-grotesk font-semibold text-lg">{sv.title}</h3>
                      <p className="mt-3 text-sm text-mutedInk leading-relaxed">{sv.desc}</p>
                      <p className="mt-5 text-[11px] uppercase tracking-[0.15em] text-accentText">{sv.tags.join(" · ")}</p>
                    </div>
                  </StaggerItem>
                ))}
                <StaggerItem className="h-full">
                  <div className="h-full p-8 bg-surface">
                    <h3 className="font-grotesk font-semibold text-lg">Channels</h3>
                    <p className="mt-3 mb-5 text-sm text-mutedInk leading-relaxed">Where campaigns run and leads come from.</p>
                    <Chips items={mk.channels || []} />
                  </div>
                </StaggerItem>
              </Stagger>
            </div>

            {/* Client portfolio */}
            <div className="mt-14 grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <Reveal>
                  <SubHead>Client portfolio</SubHead>
                  <h3 className="font-grotesk font-semibold text-2xl md:text-3xl max-w-xs">Brands built with Accura8.</h3>
                  <p className="mt-4 text-sm text-mutedInk leading-relaxed max-w-xs">
                    Businesses across {mk.reach} that trust Accura8 with how they look and how they're found.
                  </p>
                </Reveal>
              </div>
              <div className="lg:col-span-8">
                <Stagger className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line" stagger={0.04}>
                  {(mk.clients || []).map((c) => (
                    <StaggerItem key={c.name} className="h-full">
                      <div className="h-full min-h-[120px] p-5 md:p-6 bg-bg flex flex-col justify-between" data-testid="growth-client">
                        <p className="font-grotesk font-semibold text-base md:text-lg leading-tight text-inkStrong">{c.name}</p>
                        {(c.work || c.location) && (
                          <div className="mt-4">
                            {c.work && <p className="text-[11px] uppercase tracking-[0.12em] text-accentText leading-snug">{c.work}</p>}
                            {c.location && <p className="mt-1 text-xs text-mutedInk">{c.location}</p>}
                          </div>
                        )}
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
                <Reveal className="mt-px">
                  <div className="grid sm:grid-cols-3 gap-px bg-line border border-line border-t-0">
                    {(mk.portfolio || []).map((pf) => (
                      <div key={pf.title} className="p-5 md:p-6 bg-surface">
                        <p className="font-grotesk font-semibold text-2xl text-inkStrong">{pf.count}</p>
                        <p className="mt-1 text-sm font-grotesk text-inkStrong">{pf.title}</p>
                        <p className="mt-2 text-xs text-mutedInk">{pf.tags.join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Testimonials */}
            <Stagger className="mt-14 grid md:grid-cols-2 gap-px bg-line border border-line" stagger={0.1}>
              {(mk.testimonials || []).map((t) => (
                <StaggerItem key={t.name} className="h-full">
                  <figure className="h-full p-8 md:p-10 bg-bg flex flex-col" data-testid="growth-testimonial">
                    <Quote className="w-6 h-6 text-accentText" strokeWidth={1.5} />
                    <blockquote className="mt-5 font-grotesk text-lg md:text-xl leading-snug text-inkStrong flex-1">
                      “{t.quote}”
                    </blockquote>
                    <figcaption className="mt-8 pt-5 border-t border-line">
                      <p className="font-grotesk font-medium text-inkStrong">{t.name}</p>
                      <p className="text-xs text-mutedInk mt-1">
                        {t.role}, {t.company} · {t.location}
                      </p>
                    </figcaption>
                  </figure>
                </StaggerItem>
              ))}
            </Stagger>
          </Wrap>
        </section>
      )}

      {/* ── 02 Qualify ───────────────────────────────── */}
      {stage.qualify && (
        <section id="qualify" className="py-12 md:py-16 border-b border-line bg-surface scroll-mt-20" data-testid="growth-qualify">
          <Wrap>
            <ChapterHead
              stage={stage.qualify}
              lines={stage.qualify.headline}
              partnerLine={`Powered by ${q.partner} · Meet ${q.agent}, the voice agent`}
              intro={q.intro}
              links={<ExternalLink href={q.url} testId="growth-varavox-site">Hear Vara at varavox.in</ExternalLink>}
            />

            <Reveal className="mt-12">
              <StatGrid items={q.highlights || []} testId="growth-qualify-highlights" />
            </Reveal>

            {/* Call flow */}
            <div className="mt-14">
              <Reveal><SubHead>From form fill to booked visit</SubHead></Reveal>
              <Stagger className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line" stagger={0.07}>
                {(q.call_flow || []).map((f, i) => (
                  <StaggerItem key={f.title} className="h-full">
                    <div className="h-full p-6 md:p-7 bg-bg">
                      <span className="grid h-9 w-9 place-items-center border border-accent text-accentText font-grotesk font-semibold text-sm">
                        {i + 1}
                      </span>
                      <h3 className="mt-5 font-grotesk font-semibold">{f.title}</h3>
                      <p className="mt-2 text-sm text-mutedInk leading-relaxed">{f.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>

            {/* Sample call + what is captured */}
            <div className="mt-14 grid lg:grid-cols-12 gap-10">
              <Reveal className="lg:col-span-7">
                <div className="border border-line bg-bg" data-testid="growth-sample-call">
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
                    <p className="label-tech text-mutedInk">{q.sample_call?.context}</p>
                    <span className="flex items-center gap-2 text-xs text-accentText">
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Live call
                    </span>
                  </div>
                  <div className="p-6 space-y-3">
                    {(q.sample_call?.lines || []).map((l, i) => {
                      const agent = l.speaker !== "Caller";
                      return (
                        <div key={i} className={`flex ${agent ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                              agent ? "border border-line text-inkStrong" : "bg-accent text-[#0A0A0A]"
                            }`}
                          >
                            <span className={`block text-[10px] uppercase tracking-[0.15em] mb-1 ${agent ? "text-accentText" : "text-[#0A0A0A]/60"}`}>
                              {l.speaker}
                            </span>
                            {l.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="px-6 py-4 border-t border-line flex items-start gap-3 text-sm text-inkStrong">
                    <Check className="w-4 h-4 text-accentText mt-0.5 shrink-0" /> {q.sample_call?.outcome}
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1} className="lg:col-span-5">
                <SubHead>What Vara qualifies on</SubHead>
                <div className="border-t border-line">
                  {(q.qualifies_on || []).map((c) => (
                    <div key={c.title} className="py-5 border-b border-line">
                      <p className="font-grotesk font-semibold text-inkStrong">{c.title}</p>
                      <p className="mt-1 text-sm text-mutedInk leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-mutedInk leading-relaxed">
                  The answers become a score — hot, warm or nurture — that decides what sales does next.
                </p>
              </Reveal>
            </div>

            {/* Capabilities */}
            <Stagger className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line" stagger={0.06}>
              {(q.capabilities || []).map((c) => (
                <StaggerItem key={c.title} className="h-full">
                  <div className="h-full p-8 bg-bg">
                    <span className="inline-block h-6 w-px rotate-[30deg] bg-accent mb-6" />
                    <h3 className="font-grotesk font-semibold text-lg leading-snug">{c.title}</h3>
                    <p className="mt-3 text-sm text-mutedInk leading-relaxed">{c.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            {/* Languages, compliance, integrations */}
            <Reveal className="mt-px">
              <div className="grid md:grid-cols-3 gap-px bg-line border border-line border-t-0">
                {[
                  ["Languages", q.languages],
                  ["Compliant from day one", q.compliance],
                  ["Works with", q.integrations],
                ].map(([title, items]) => (
                  <div key={title} className="p-8 bg-bg">
                    <p className="label-tech text-mutedInk mb-5">{title}</p>
                    <Chips items={items || []} />
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Pricing */}
            <div className="mt-14">
              <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <SubHead>Voice agent pricing</SubHead>
                <p className="text-xs text-mutedInk max-w-md">{q.pricing_note}</p>
              </Reveal>
              <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line" stagger={0.07}>
                {(q.pricing || []).map((p) => (
                  <StaggerItem key={p.name} className="h-full">
                    <div
                      className={`relative h-full p-8 flex flex-col ${p.featured ? "bg-bg outline outline-1 outline-accent -outline-offset-1" : "bg-bg"}`}
                      data-testid={`growth-price-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-grotesk font-semibold text-inkStrong">{p.name}</p>
                        {p.featured && (
                          <span className="px-2 py-0.5 bg-accent text-[#0A0A0A] text-[10px] uppercase tracking-[0.15em]">Popular</span>
                        )}
                      </div>
                      <p className="mt-6 font-grotesk font-semibold text-4xl text-inkStrong">{p.price}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.15em] text-mutedInk">{p.unit}</p>
                      <p className="mt-5 text-sm text-mutedInk">{p.for}</p>
                      <ul className="mt-6 pt-6 border-t border-line space-y-3 flex-1">
                        {p.items.map((it) => (
                          <li key={it} className="flex items-start gap-3 text-sm text-inkStrong">
                            <Check className="w-4 h-4 text-accentText mt-0.5 shrink-0" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Wrap>
        </section>
      )}

      {/* ── 03 Close ─────────────────────────────────── */}
      {stage.close && (
        <section id="close" className="py-12 md:py-16 border-b border-line scroll-mt-20" data-testid="growth-close">
          <Wrap>
            <ChapterHead
              stage={stage.close}
              lines={stage.close.headline}
              partnerLine="Run by the AADRIQUE sales team"
              intro={cl.intro}
            />

            {/* Hand-off card + routing */}
            <div className="mt-12 grid lg:grid-cols-12 gap-10">
              <Reveal className="lg:col-span-5">
                <div className="border border-accent bg-surface" data-testid="growth-lead-card">
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
                    <p className="label-tech text-mutedInk">{cl.lead_card?.label}</p>
                    <span className={`px-2.5 py-1 border text-[10px] uppercase tracking-[0.15em] ${TIER_STYLE[cl.lead_card?.score] || ""}`}>
                      {cl.lead_card?.score}
                    </span>
                  </div>
                  <dl className="divide-y divide-[var(--line)]">
                    {(cl.lead_card?.fields || []).map((f) => (
                      <div key={f.k} className="grid grid-cols-3 gap-4 px-6 py-3.5">
                        <dt className="text-xs uppercase tracking-[0.12em] text-mutedInk pt-0.5">{f.k}</dt>
                        <dd className="col-span-2 text-sm text-inkStrong">{f.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="px-6 py-4 border-t border-line flex items-center gap-3 text-sm text-accentText">
                    <ArrowRight className="w-4 h-4" /> {cl.lead_card?.owner}
                  </p>
                </div>
                <p className="mt-3 text-xs text-mutedInk">Sample record from the call above.</p>
              </Reveal>

              <Reveal delay={0.1} className="lg:col-span-7">
                <SubHead>What sales does with each score</SubHead>
                <div className="border-t border-line" data-testid="growth-routing">
                  {(cl.routing || []).map((r) => (
                    <div key={r.tier} className="grid sm:grid-cols-12 gap-4 py-6 border-b border-line">
                      <div className="sm:col-span-3">
                        <span className={`inline-block px-3 py-1 border text-xs uppercase tracking-[0.15em] ${TIER_STYLE[r.tier] || ""}`}>
                          {r.tier}
                        </span>
                      </div>
                      <div className="sm:col-span-9">
                        <p className="text-sm text-mutedInk">{r.rule}</p>
                        <p className="mt-2 font-grotesk text-inkStrong leading-snug">{r.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Playbook */}
            <div className="mt-14">
              <Reveal><SubHead>The sales playbook</SubHead></Reveal>
              <Stagger className="border-t border-line" stagger={0.07}>
                {(cl.playbook || []).map((p, i) => (
                  <StaggerItem key={p.title}>
                    <div className="grid md:grid-cols-12 gap-4 md:gap-10 py-7 border-b border-line">
                      <p className="md:col-span-1 label-tech text-accentText pt-1">{String(i + 1).padStart(2, "0")}</p>
                      <h3 className="md:col-span-4 font-grotesk font-semibold text-xl md:text-2xl">{p.title}</h3>
                      <p className="md:col-span-7 text-mutedInk leading-relaxed">{p.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>

            {/* Commitments */}
            <Stagger className="mt-14 grid md:grid-cols-3 gap-px bg-line border border-line" stagger={0.08}>
              {(cl.commitments || []).map((c) => (
                <StaggerItem key={c.title} className="h-full">
                  <div className="h-full p-8 bg-bg">
                    <span className="inline-block h-6 w-px rotate-[30deg] bg-accent mb-6" />
                    <h3 className="font-grotesk font-semibold text-lg leading-snug">{c.title}</h3>
                    <p className="mt-3 text-sm text-mutedInk leading-relaxed">{c.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Wrap>
        </section>
      )}

      {/* ── The loop ─────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line bg-surface" data-testid="growth-loop">
        <div className="absolute inset-y-0 right-0 w-1/3 hatch opacity-40 pointer-events-none" />
        <Wrap className="py-12 md:py-16 relative">
          <Reveal className="max-w-3xl">
            <p className="label-tech text-accentText mb-6 flex items-center gap-3">
              <Tick /> Attract → Qualify → Close → Attract
            </p>
            <h2 className="font-grotesk font-semibold tracking-tight text-4xl md:text-5xl">{loop.title}</h2>
            <p className="mt-6 text-mutedInk text-base md:text-lg leading-relaxed">{loop.desc}</p>
          </Reveal>
        </Wrap>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="py-12 md:py-16" data-testid="growth-faq">
          <Wrap className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <Reveal>
                <SubHead>Questions</SubHead>
                <h2 className="font-grotesk font-semibold text-3xl md:text-4xl max-w-xs">Before you start.</h2>
              </Reveal>
            </div>
            <div className="lg:col-span-8">
              <Accordion type="single" collapsible className="border-t border-line">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`} className="border-b border-line">
                    <AccordionTrigger
                      data-testid={`growth-faq-trigger-${i}`}
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
      )}

      <CTABand
        to={GROWTH_CONTACT}
        title="Turn attention into customers."
        subtitle="Tell us what you sell and where your leads come from today. We'll map the marketing, the voice agent and the sales hand-off for your business — in one free consultation."
      />
    </div>
  );
}
