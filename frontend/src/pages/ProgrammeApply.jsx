import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowUpRight, Check, CalendarDays, Loader2, LogOut, ShieldCheck, AlertTriangle } from "lucide-react";
import { Seo } from "@/components/Seo";
import { LineReveal, Reveal } from "@/components/motion/Reveal";
import { Countdown } from "@/components/programme/Countdown";
import { GoogleSignInButton, googleSignOut } from "@/components/programme/GoogleSignInButton";
import { CurriculumOverview } from "@/components/programme/CurriculumOverview";
import { useFee } from "@/components/programme/useFee";
import { PaymentPanel } from "@/components/programme/PaymentPanel";
import {
  useProgrammeConfig,
  programmeSession,
  submitProgrammeApplication,
  reportProgrammePayment,
  apiErrorMessage,
} from "@/lib/api";
import { SITE } from "@/lib/site";
import {
  PROGRAMME_PATH,
  PROGRAMME_CONTACT,
  START_LABEL,
  YEARS,
  PYTHON_LEVELS,
  HEARD_FROM,
  FEE,
  inr,
} from "@/lib/programme";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, "Please enter a valid phone number"),
  college: z.string().trim().min(2, "Please enter your college").max(160),
  year_of_study: z.enum(YEARS, { errorMap: () => ({ message: "Please select your year" }) }),
  branch: z.string().trim().min(1, "Please enter your branch").max(80),
  city: z.string().trim().max(80).optional().default(""),
  python_level: z.union([z.enum(PYTHON_LEVELS), z.literal("")]).optional().default(""),
  goals: z.string().trim().max(2000).optional().default(""),
  heard_from: z.string().max(80).optional().default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree to be contacted about your application" }) }),
  website: z.string().max(0).optional(),
});

const EMPTY = {
  full_name: "",
  phone: "",
  college: "",
  year_of_study: "",
  branch: "",
  city: "",
  python_level: "",
  goals: "",
  heard_from: "",
  consent: false,
  website: "",
};

const inputCls =
  "w-full bg-transparent border-b border-line py-3 text-inkStrong placeholder:text-mutedInk focus:border-accent focus:outline-none transition-colors duration-300";
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-surface [&>option]:text-ink`;
const labelCls = "label-tech text-mutedInk block mb-2";

const FieldError = ({ error, id }) =>
  error ? (
    <p className="mt-2 text-xs text-red-400" data-testid={`apply-${id}-error`}>
      {error.message}
    </p>
  ) : null;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

const currentTheme = () => (document.documentElement.classList.contains("light") ? "light" : "dark");

const STEPS = [
  ["Sign in with Google", "Verifies your email in one tap. We never see your password."],
  ["Fill your details", "College, year, branch and your Python level — about two minutes."],
  ["Pay & confirm your seat", "Pay securely through Razorpay. We verify it and confirm your seat by email within one business day."],
];

export default function ProgrammeApply() {
  const { data: config, isLoading: configLoading, isError: configError } = useProgrammeConfig();
  const [credential, setCredential] = useState(null);
  const [profile, setProfile] = useState(null);
  const [existing, setExisting] = useState(null);
  const [phase, setPhase] = useState("signin"); // signin | loading | form | pay
  const [expired, setExpired] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const onCredential = useCallback(
    async (cred) => {
      const resuming = expired && Boolean(profile);
      if (!resuming) setPhase("loading");
      try {
        const res = await programmeSession(cred);
        if (resuming && profile && res.profile.email !== profile.email) {
          toast.error(`Please sign in again as ${profile.email}, or use "Switch account".`);
          return;
        }
        setCredential(cred);
        setProfile(res.profile);
        setExpired(false);
        if (!resuming) {
          setExisting(res.application);
          reset({
            ...EMPTY,
            full_name: res.profile.name,
            ...(res.application || {}),
            consent: Boolean(res.application?.consent),
          });
          // Returning applicants land on payment; new ones on the form.
          setPhase(res.application ? "pay" : "form");
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, "Sign-in failed. Please try again."));
        if (!resuming) setPhase("signin");
      }
    },
    [expired, profile, reset]
  );

  const signOut = () => {
    googleSignOut();
    setCredential(null);
    setProfile(null);
    setExisting(null);
    setExpired(false);
    reset(EMPTY);
    setPhase("signin");
  };

  const onSubmit = async (values) => {
    if (!credential) return;
    try {
      const res = await submitProgrammeApplication({ ...values, credential });
      setExisting(res.application);
      setPhase("pay");
      toast.success(res.created ? "Application saved — one step left." : "Your application has been updated.");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (e?.response?.status === 401) {
        // Google ID tokens last about an hour; keep the typed answers and re-verify.
        setCredential(null);
        setExpired(true);
        toast.error("Your sign-in expired. Sign in again to submit — your answers are kept.");
        return;
      }
      toast.error(apiErrorMessage(e));
    }
  };

  const onReport = async (reference, amount) => {
    if (!credential) return false;
    try {
      const res = await reportProgrammePayment(credential, reference, amount);
      setExisting(res.application);
      toast.success("Thanks! We'll verify your payment and confirm your seat by email.");
      return true;
    } catch (e) {
      if (e?.response?.status === 401) {
        setCredential(null);
        setExpired(true);
        toast.error("Your sign-in expired. Sign in again to submit your payment ID.");
        return false;
      }
      toast.error(apiErrorMessage(e));
      return false;
    }
  };

  const theme = useMemo(currentTheme, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const fee = config?.fee || { ...FEE, gst_rate: FEE.gstRate };
  const live = useFee();

  const reauthBox = expired && config?.enabled ? (
    <div className="mt-8 border border-accent bg-bg p-5" data-testid="apply-expired">
      <p className="flex items-start gap-3 text-sm text-inkStrong">
        <AlertTriangle className="w-4 h-4 text-accentText mt-0.5 shrink-0" />
        Your Google sign-in expired. Sign in again as {profile?.email} to continue — nothing you typed is lost.
      </p>
      <div className="mt-4">
        <GoogleSignInButton clientId={config.google_client_id} onCredential={onCredential} theme={theme} text="signin_with" />
      </div>
    </div>
  ) : null;

  const shareText = encodeURIComponent(
    `I just applied for the Complete AI Engineering Programme by AADRIQUE — live classes + 1:1 mentoring, starts ${START_LABEL}. Early-bird ₹14,999 for the first 20 seats: ${SITE.url}${PROGRAMME_PATH}`
  );

  return (
    <div data-testid="programme-apply-page">
      <Seo
        title="Apply — Complete AI Engineering Programme"
        description={`Apply for Batch 01 of the Complete AI Engineering Programme, starting ${START_LABEL}. Sign in with Google and apply in two minutes.`}
        image="/og-ai-engineering.png"
      />

      <section className="pt-24 md:pt-28 pb-10 border-b border-line relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-20 hatch-accent opacity-25 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="flex flex-wrap items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-[#0A0A0A] text-[10px] font-grotesk font-semibold uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A] animate-pulse" />
              Admissions open
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-accent text-accentText text-[10px] font-grotesk font-semibold uppercase tracking-[0.2em]">
              <CalendarDays className="w-3.5 h-3.5" /> Batch starts {START_LABEL}
            </span>
          </Reveal>
          <LineReveal
            as="h1"
            className="font-grotesk font-semibold tracking-tight leading-[1.02] text-4xl sm:text-5xl lg:text-6xl"
            lines={["Apply for Batch 01."]}
          />
          <Reveal delay={0.3} className="mt-5 max-w-2xl">
            <p className="text-mutedInk md:text-lg leading-relaxed">
              Complete AI Engineering Programme — live classes, 1:1 mentor interactions and five real projects.{" "}
              <Link to={PROGRAMME_PATH} className="text-accentText link-underline">
                See full programme details
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <CurriculumOverview />

      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Side: steps, countdown, fee */}
          <aside className="lg:col-span-4 order-2 lg:order-1">
            <Reveal>
              <p className="label-tech text-accentText mb-5">How applying works</p>
              <ol className="border-t border-line">
                {STEPS.map(([t, d], i) => (
                  <li key={t} className="flex gap-4 py-5 border-b border-line">
                    <span className="grid h-8 w-8 shrink-0 place-items-center border border-accent text-accentText font-grotesk font-semibold text-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-grotesk font-semibold text-inkStrong">{t}</p>
                      <p className="mt-1 text-sm text-mutedInk leading-relaxed">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-8 label-tech text-mutedInk mb-3">Classes begin in</p>
              <Countdown testId="apply-countdown" />
              <div className="mt-6 border border-accent bg-surface p-5">
                <p className="label-tech text-accentText">{live.open ? "Early-bird fee" : "Programme fee"}</p>
                <p className="mt-1 font-grotesk font-semibold text-4xl text-inkStrong">
                  {inr(fee.base, 0)}
                  {fee.gst_rate > 0 && <span className="ml-2 text-sm font-normal text-mutedInk">+ {fee.gst_rate}% GST</span>}
                </p>
                <p className="mt-1 text-sm text-mutedInk">
                  {fee.gst_rate > 0 && `Total ${inr(fee.total)} · `}
                  {live.open ? (
                    <>
                      regular <span className="line-through">₹17,999</span> ·{" "}
                      {live.left != null ? `${live.left} of ${live.total} early-bird seats left` : "first 20 admissions"}
                    </>
                  ) : (
                    "Early-bird seats are full"
                  )}
                </p>
                <p className="mt-2 text-xs text-mutedInk">
                  Non-refundable ·{" "}
                  <Link to="/refund-policy" className="text-accentText link-underline">refund policy</Link>
                </p>
              </div>
            </Reveal>
          </aside>

          {/* Main card */}
          <div className="lg:col-span-8 order-1 lg:order-2">
            <Reveal>
              <div className="border border-line bg-surface" data-testid="apply-card">
                {configLoading && (
                  <div className="p-10 flex items-center gap-3 text-mutedInk">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                )}

                {!configLoading && (configError || !config?.enabled) && (
                  <div className="p-8 md:p-10" data-testid="apply-unavailable">
                    <h2 className="font-grotesk font-semibold text-2xl md:text-3xl">Apply through our team.</h2>
                    <p className="mt-4 text-mutedInk leading-relaxed max-w-xl">
                      Online applications aren't available right now. Send us your details and our team will get back to
                      you about Batch 01 within one business day.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <Link
                        to={PROGRAMME_CONTACT}
                        className="group inline-flex items-center gap-3 bg-accent text-[#0A0A0A] px-8 py-4 font-grotesk font-medium tracking-wide hover:bg-inkStrong hover:text-bg transition-colors duration-300"
                      >
                        Send your details <ArrowUpRight className="w-4 h-4" />
                      </Link>
                      <a
                        href={`tel:${SITE.phoneHref}`}
                        className="inline-flex items-center gap-3 border border-lineStrong px-8 py-4 font-grotesk font-medium tracking-wide text-inkStrong hover:border-accent hover:text-accentText transition-colors duration-300"
                      >
                        Call {SITE.phone}
                      </a>
                    </div>
                  </div>
                )}

                {config?.enabled && phase === "signin" && (
                  <div className="p-8 md:p-10" data-testid="apply-signin">
                    <p className="label-tech text-accentText">Step 1 of 3</p>
                    <h2 className="mt-3 font-grotesk font-semibold text-2xl md:text-3xl">Sign in to start your application.</h2>
                    <p className="mt-4 text-mutedInk leading-relaxed max-w-xl">
                      Use the Google account you check most often — we'll send your application confirmation there. Already
                      applied? Sign in with the same account to view or update it.
                    </p>
                    <div className="mt-8">
                      <GoogleSignInButton clientId={config.google_client_id} onCredential={onCredential} theme={theme} />
                    </div>
                    <p className="mt-8 flex items-start gap-3 text-xs text-mutedInk leading-relaxed max-w-xl">
                      <ShieldCheck className="w-4 h-4 text-accentText shrink-0" />
                      <span>
                        We only receive your name, email address and profile picture from Google. Your details are used to
                        process your application — see our{" "}
                        <Link to="/privacy-policy" className="text-accentText link-underline">
                          privacy policy
                        </Link>
                        .
                      </span>
                    </p>
                  </div>
                )}

                {phase === "loading" && (
                  <div className="p-10 flex items-center gap-3 text-mutedInk" data-testid="apply-loading">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying your Google account…
                  </div>
                )}

                {profile && (phase === "form" || phase === "pay") && (
                  <div className="flex flex-wrap items-center justify-between gap-4 px-6 md:px-10 py-5 border-b border-line" data-testid="apply-identity">
                    <div className="flex items-center gap-3 min-w-0">
                      {profile.picture ? (
                        <img src={profile.picture} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full border border-line" />
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-[#0A0A0A] font-grotesk font-semibold">
                          {(profile.name || profile.email)[0].toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-grotesk font-semibold text-inkStrong truncate">{profile.name || profile.email}</p>
                        <p className="text-xs text-mutedInk truncate">{profile.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={signOut}
                      data-testid="apply-signout"
                      className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-accentText transition-colors duration-300"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Switch account
                    </button>
                  </div>
                )}

                {phase === "pay" && existing && (
                  <>
                    <PaymentPanel
                      application={existing}
                      fee={fee}
                      paymentLink={config?.payment_link}
                      onReport={onReport}
                      onEdit={() => setPhase("form")}
                      reauth={reauthBox}
                    />
                    {(existing.payment_status === "reported" || existing.payment_status === "verified") && (
                      <div className="mx-6 md:mx-10 mb-8 border-t border-line pt-6 flex flex-wrap items-center justify-between gap-4">
                        <p className="label-tech text-mutedInk">Know someone who should join?</p>
                        <a
                          href={`https://wa.me/?text=${shareText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="apply-share-whatsapp"
                          className="inline-flex items-center gap-2 border border-lineStrong px-5 py-2.5 text-sm font-grotesk font-medium text-inkStrong hover:border-accent hover:text-accentText transition-colors duration-300"
                        >
                          Share on WhatsApp <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </>
                )}

                {phase === "form" && (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 md:p-10" data-testid="apply-form">
                    {existing ? (
                      <p className="mb-8 flex items-start gap-3 border border-accent bg-bg p-4 text-sm text-inkStrong" data-testid="apply-existing">
                        <Check className="w-4 h-4 text-accentText mt-0.5 shrink-0" />
                        You applied on {fmtDate(existing.created_at)}. Update anything below and resubmit.
                      </p>
                    ) : (
                      <p className="label-tech text-accentText mb-6">Step 2 of 3 · Your details</p>
                    )}

                    <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" {...register("website")} />

                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7">
                      <div>
                        <label htmlFor="full_name" className={labelCls}>Full name *</label>
                        <input id="full_name" autoComplete="name" data-testid="apply-name" className={inputCls} {...register("full_name")} />
                        <FieldError error={errors.full_name} id="name" />
                      </div>
                      <div>
                        <label htmlFor="phone" className={labelCls}>Phone (WhatsApp preferred) *</label>
                        <input id="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" data-testid="apply-phone" className={inputCls} {...register("phone")} />
                        <FieldError error={errors.phone} id="phone" />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="college" className={labelCls}>College / university *</label>
                        <input id="college" autoComplete="organization" data-testid="apply-college" className={inputCls} {...register("college")} />
                        <FieldError error={errors.college} id="college" />
                      </div>
                      <div>
                        <label htmlFor="year_of_study" className={labelCls}>Year of study *</label>
                        <select id="year_of_study" data-testid="apply-year" className={selectCls} {...register("year_of_study")}>
                          <option value="">Select…</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <FieldError error={errors.year_of_study} id="year" />
                      </div>
                      <div>
                        <label htmlFor="branch" className={labelCls}>Branch *</label>
                        <input id="branch" placeholder="e.g. CSE, AI & ML, ECE" data-testid="apply-branch" className={inputCls} {...register("branch")} />
                        <FieldError error={errors.branch} id="branch" />
                      </div>
                      <div className="sm:col-span-2 pt-2 border-t border-line">
                        <p className="label-tech text-mutedInk">Optional</p>
                      </div>
                      <div>
                        <label htmlFor="city" className={labelCls}>City</label>
                        <input id="city" autoComplete="address-level2" data-testid="apply-city" className={inputCls} {...register("city")} />
                      </div>
                      <div>
                        <label htmlFor="python_level" className={labelCls}>Python experience</label>
                        <select id="python_level" data-testid="apply-python" className={selectCls} {...register("python_level")}>
                          <option value="">Select…</option>
                          {PYTHON_LEVELS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <FieldError error={errors.python_level} id="python" />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="goals" className={labelCls}>What do you want to build or achieve?</label>
                        <textarea
                          id="goals"
                          rows={4}
                          data-testid="apply-goals"
                          className={`${inputCls} resize-none border border-line p-4`}
                          placeholder="e.g. Land an AI internship, build a RAG chatbot for my college, prepare for placements…"
                          {...register("goals")}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="heard_from" className={labelCls}>How did you hear about us?</label>
                        <select id="heard_from" data-testid="apply-heard" className={selectCls} {...register("heard_from")}>
                          <option value="">Select…</option>
                          {HEARD_FROM.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="flex items-start gap-3 cursor-pointer text-sm text-mutedInk leading-relaxed">
                          <input type="checkbox" data-testid="apply-consent" className="mt-1 h-4 w-4 accent-[#FA942C] shrink-0" {...register("consent")} />
                          <span>
                            I agree that AADRIQUE may contact me by phone, WhatsApp and email about this application, and I
                            have read the{" "}
                            <Link to="/privacy-policy" className="text-accentText link-underline">privacy policy</Link>. *
                          </span>
                        </label>
                        <FieldError error={errors.consent} id="consent" />
                      </div>
                    </div>

                    {reauthBox}

                    <div className="mt-10 flex flex-wrap items-center gap-6">
                      <button
                        type="submit"
                        disabled={isSubmitting || !credential}
                        data-testid="apply-submit"
                        className="group inline-flex items-center gap-3 bg-accent text-[#0A0A0A] px-8 py-4 font-grotesk font-medium tracking-wide hover:bg-inkStrong hover:text-bg transition-colors duration-300 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                          </>
                        ) : (
                          <>
                            {existing ? "Save & continue to payment" : "Continue to payment"}
                            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </>
                        )}
                      </button>
                      {existing && (
                        <button
                          type="button"
                          onClick={() => {
                            reset({ ...getValues(), ...existing, consent: Boolean(existing.consent) });
                            setPhase("pay");
                          }}
                          className="text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-accentText transition-colors duration-300"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
