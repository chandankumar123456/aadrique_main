import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { EASE } from "@/lib/site";
import { getSession, setSession } from "@/lib/storage";
import { PROGRAMME_PATH, PROGRAMME_APPLY, START_DATE, START_SHORT, START_LABEL, PRIMARY_CTA } from "@/lib/programme";
import { useCountdown, pad } from "@/components/programme/useCountdown";
import { useFee } from "@/components/programme/useFee";

const DISMISS_KEY = "aad-programme-bar";
const HIDDEN_ON = ["/contact", PROGRAMME_APPLY];

/**
 * Site-wide announcement for the AI Engineering Programme, pinned to the bottom.
 * Elsewhere it shows immediately and can be dismissed for the session; on the
 * programme page itself it acts as a sticky "Apply" bar once the hero is passed.
 */
export const ProgrammePromoBar = () => {
  const { pathname } = useLocation();
  const onProgramme = pathname === PROGRAMME_PATH;
  const [dismissed, setDismissed] = useState(() => getSession(DISMISS_KEY) === "1");
  const [scrolled, setScrolled] = useState(false);
  const left = useCountdown(START_DATE, 30000);
  const fee = useFee();

  useEffect(() => {
    if (!onProgramme) return;
    const onScroll = () => setScrolled(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onProgramme]);

  const visible = !HIDDEN_ON.includes(pathname) && !pathname.startsWith("/admin") && (onProgramme ? scrolled : !dismissed);

  const dismiss = () => {
    setSession(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      {/* Keeps the footer's last row reachable while the bar is pinned over it. */}
      {visible && <div aria-hidden="true" className="h-[72px] md:h-16" />}
      <AnimatePresence>
        {visible && (
          <motion.aside
            key="programme-bar"
            data-testid="programme-promo-bar"
            aria-label="AI Engineering Programme announcement"
            className="fixed bottom-0 inset-x-0 z-40 border-t border-accent backdrop-blur-xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="absolute inset-y-0 left-0 w-1/4 hatch-accent opacity-20 pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-[72px] md:h-16 flex items-center gap-3 md:gap-6">
              <span className="hidden sm:inline-flex items-center gap-2 shrink-0 px-2.5 py-1 bg-accent text-[#0A0A0A] text-[10px] font-grotesk font-semibold uppercase tracking-[0.18em]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
                {left.done ? "Live now" : "Admissions open"}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-grotesk font-semibold text-inkStrong text-sm md:text-base leading-tight truncate">
                  {left.done ? (
                    "AI Engineering Programme — Batch 01 is live"
                  ) : (
                    <>
                      <span className="sm:hidden">Batch starts {START_SHORT}</span>
                      <span className="hidden sm:inline">Complete AI Engineering Programme · Batch 01 starts {START_LABEL}</span>
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] md:text-xs text-mutedInk truncate">
                  {left.done
                    ? "Register your interest for the next batch."
                    : (
                      <>
                        <span className="sm:hidden">
                          {left.days > 0 ? `${left.days} days left · ` : ""}{fee.open ? "Early-bird ₹14,999" : "Fee ₹17,999"}
                        </span>
                        <span className="hidden sm:inline">{fee.open ? "Early-bird fee ₹14,999 for the first 20 admissions" : "Early-bird seats are full · Fee ₹17,999"} · Live classes · 1:1 weekend mentor sessions</span>
                      </>
                    )}
                </p>
              </div>

              {!left.done && (
                <div className="hidden lg:flex items-baseline gap-3 shrink-0 font-grotesk" data-testid="programme-bar-countdown">
                  {[
                    [left.days, "days"],
                    [pad(left.hours), "hrs"],
                    [pad(left.minutes), "min"],
                  ].map(([v, u]) => (
                    <span key={u} className="text-inkStrong">
                      <span className="text-xl font-semibold tabular-nums">{v}</span>
                      <span className="ml-1 text-[10px] uppercase tracking-[0.15em] text-mutedInk">{u}</span>
                    </span>
                  ))}
                </div>
              )}

              <Link
                to={left.done ? PROGRAMME_APPLY : onProgramme ? PROGRAMME_APPLY : PROGRAMME_PATH}
                data-testid="programme-bar-cta"
                className="group shrink-0 inline-flex items-center gap-2 bg-accent text-[#0A0A0A] px-4 md:px-5 py-2.5 font-grotesk font-medium text-sm tracking-wide whitespace-nowrap hover:bg-inkStrong hover:text-bg transition-colors duration-300"
              >
                {onProgramme || left.done ? (<><span className="sm:hidden">Apply</span><span className="hidden sm:inline">{PRIMARY_CTA}</span></>) : "View programme"}
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              {!onProgramme && (
                <button
                  onClick={dismiss}
                  data-testid="programme-bar-dismiss"
                  aria-label="Dismiss announcement"
                  className="shrink-0 p-1.5 text-mutedInk hover:text-inkStrong transition-colors duration-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProgrammePromoBar;
