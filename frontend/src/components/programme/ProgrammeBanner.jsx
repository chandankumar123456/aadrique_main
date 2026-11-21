import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Countdown } from "@/components/programme/Countdown";
import { PROGRAMME_PATH, PROGRAMME_APPLY, START_LABEL, PRIMARY_CTA } from "@/lib/programme";
import { useFee } from "@/components/programme/useFee";

const HIGHLIGHTS = ["Live classes", "1:1 mentor interactions", "5 portfolio projects", "Paid internship pathway*"];

/** Feature banner promoting the AI Engineering Programme on other pages (e.g. Home). */
export const ProgrammeBanner = () => {
  const fee = useFee();
  return (
  <section className="py-12 md:py-16 border-b border-line" data-testid="programme-banner">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <Reveal>
        <div className="relative overflow-hidden border border-accent bg-surface">
          <div className="absolute inset-y-0 right-0 w-1/2 hatch-accent opacity-15 pointer-events-none" />
          <p
            aria-hidden="true"
            className="absolute -right-6 -bottom-16 font-grotesk font-semibold text-[16rem] leading-none text-outline-accent opacity-40 pointer-events-none select-none hidden md:block"
          >
            AI
          </p>

          <div className="relative grid lg:grid-cols-12 gap-10 p-8 md:p-12">
            <div className="lg:col-span-7">
              <p className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-[#0A0A0A] text-[10px] font-grotesk font-semibold uppercase tracking-[0.2em]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
                Now enrolling · Batch 01
              </p>
              <h2 className="mt-6 font-grotesk font-semibold tracking-tight text-4xl md:text-5xl">
                Complete AI Engineering
                <br />
                <span className="text-outline">Programme.</span>
              </h2>
              <p className="mt-5 max-w-xl text-mutedInk leading-relaxed">
                A four-month, live programme for BTech 2nd- and 3rd-year students — Python to machine learning, deep learning,
                LLMs, RAG, AI agents and deployment. Build five real projects with industry mentors.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {HIGHLIGHTS.map((h) => (
                  <span key={h} className="px-3 py-1.5 border border-line text-xs text-inkStrong bg-bg">
                    {h}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to={PROGRAMME_APPLY}
                  data-testid="programme-banner-apply"
                  className="group inline-flex items-center gap-3 bg-accent text-[#0A0A0A] px-8 py-4 font-grotesk font-medium tracking-wide hover:bg-inkStrong hover:text-bg transition-colors duration-300"
                >
                  {PRIMARY_CTA}
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  to={PROGRAMME_PATH}
                  data-testid="programme-banner-details"
                  className="inline-flex items-center gap-3 border border-lineStrong px-8 py-4 font-grotesk font-medium tracking-wide text-inkStrong hover:border-accent hover:text-accentText transition-colors duration-300"
                >
                  See full details
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 lg:pl-6 flex flex-col justify-center">
              <p className="label-tech text-mutedInk mb-3">Batch starts {START_LABEL}</p>
              <Countdown testId="programme-banner-countdown" />
              <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
                <div>
                  <p className="label-tech text-accentText">{fee.open ? "Early-bird fee" : "Programme fee"}</p>
                  <p className="mt-1 font-grotesk font-semibold text-4xl text-inkStrong">₹{fee.price.toLocaleString("en-IN")}</p>
                </div>
                <p className="text-right text-xs text-mutedInk leading-relaxed">
                  {fee.open ? (
                    <>
                      <span className="line-through">₹17,999</span>
                      <br />
                      {fee.left != null ? `${fee.left} of ${fee.total} early-bird seats left` : "First 20 admissions"}
                    </>
                  ) : (
                    "Early-bird seats are full"
                  )}
                </p>
              </div>
              <p className="mt-4 text-[11px] text-mutedInk">*Competitive, for selected top performers — not guaranteed.</p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
  );
};

export default ProgrammeBanner;
