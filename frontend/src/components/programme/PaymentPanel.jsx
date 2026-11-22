import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Ban,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Star,
  Users,
  Lock,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { START_LABEL, inr } from "@/lib/programme";

const REF_RE = /^[A-Za-z0-9_-]{6,40}$/;

const TXN_LABEL = {
  reported: ["Verifying", "border-accent text-accentText"],
  verified: ["Received", "border-emerald-500/70 text-emerald-400"],
  rejected: ["Not found", "border-red-400/70 text-red-400"],
};

const copy = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy — please select and copy it manually.");
  }
};

const Row = ({ k, v, strong, accent }) => (
  <div className={`flex items-baseline justify-between gap-4 py-3 ${strong ? "" : "border-b border-line"}`}>
    <dt className={strong ? "font-grotesk font-semibold text-inkStrong" : "text-sm text-mutedInk"}>{k}</dt>
    <dd
      className={
        strong
          ? "font-grotesk font-semibold text-2xl text-inkStrong tabular-nums"
          : `text-sm tabular-nums text-right ${accent ? "text-emerald-400" : "text-inkStrong"}`
      }
    >
      {v}
    </dd>
  </div>
);

const Transactions = ({ payments }) =>
  payments?.length ? (
    <div className="mt-6" data-testid="pay-transactions">
      <p className="label-tech text-mutedInk mb-2">Your transactions</p>
      <ul className="border-t border-line">
        {payments.map((p) => {
          const [label, cls] = TXN_LABEL[p.status] || TXN_LABEL.reported;
          return (
            <li key={p.id} className="py-3 border-b border-line flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block font-mono text-inkStrong truncate">{p.reference}</span>
                {p.status === "rejected" && p.note && <span className="block text-xs text-mutedInk">{p.note}</span>}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums text-inkStrong">{inr(p.amount_verified ?? p.amount_reported)}</span>
                <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-[0.14em] ${cls}`}>{label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  ) : null;

/** Payment method icons — reinforces that all standard Indian methods are supported. */
const PaymentMethods = () => (
  <div className="mt-4 flex items-center gap-3 flex-wrap">
    <span className="text-xs text-mutedInk">Pay via</span>
    {[
      [Smartphone, "UPI"],
      [CreditCard, "Card"],
      [Landmark, "Net banking"],
      [Wallet, "Wallet"],
    ].map(([Icon, label]) => (
      <span
        key={label}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-line text-[10px] uppercase tracking-[0.12em] text-mutedInk"
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
    ))}
  </div>
);

/** Social proof micro-strip */
const SocialProof = () => (
  <div className="mt-5 flex flex-wrap gap-4">
    <span className="inline-flex items-center gap-1.5 text-xs text-mutedInk">
      <Users className="w-3.5 h-3.5 text-accentText" /> Batch 01 · limited seats
    </span>
    <span className="inline-flex items-center gap-1.5 text-xs text-mutedInk">
      <Star className="w-3.5 h-3.5 text-accentText" /> First 20 get early-bird price
    </span>
    <span className="inline-flex items-center gap-1.5 text-xs text-mutedInk">
      <Lock className="w-3.5 h-3.5 text-accentText" /> Secure · Razorpay encrypted
    </span>
  </div>
);

/**
 * Step 3: order summary → pay through the Razorpay payment link → report the
 * transaction ID and amount. The team verifies each transaction in /admin; a
 * student may pay in parts. Fully verified = seat confirmed.
 */
export const PaymentPanel = ({ application, fee: fallbackFee, paymentLink, onReport, onEdit, reauth }) => {
  // The API sends each student's own fee: a locked early-bird price, or today's price.
  const fee = application.fee || fallbackFee;
  const status = application.payment_status || "unpaid";
  const [agreed, setAgreed] = useState(Boolean(application.payments?.length));
  const balance = application.balance_due ?? fee.total;
  const pending = application.amount_pending || 0;
  const toPay = Math.max(0, balance - pending);
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState(String(toPay || ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => setAmount(String(toPay || "")), [toPay]);

  const submit = async (e) => {
    e.preventDefault();
    const clean = ref.replace(/\s+/g, "");
    const amt = Number(amount);
    if (!REF_RE.test(clean)) {
      setError("Enter the transaction ID from Razorpay (starts with pay_) or your UPI reference number.");
      return;
    }
    if (!(amt > 0) || amt > 100000) {
      setError("Enter the amount you paid.");
      return;
    }
    if (!agreed) {
      setError("Please confirm you understand the fee is non-refundable.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (await onReport(clean, Math.round(amt * 100) / 100)) {
        setRef("");
        setAdding(false);
      }
    } finally {
      setBusy(false);
    }
  };

  // ── Seat cancelled by the team ─────────────────────────────
  if (application.status === "revoked") {
    return (
      <div className="p-8 md:p-10" data-testid="pay-revoked">
        <span className="grid h-12 w-12 place-items-center border border-red-400/70 text-red-400">
          <Ban className="w-6 h-6" />
        </span>
        <h2 className="mt-6 font-grotesk font-semibold text-2xl md:text-3xl">This application has been cancelled.</h2>
        <p className="mt-4 text-mutedInk leading-relaxed max-w-xl">
          If you think this is a mistake, contact us at{" "}
          <a href={`mailto:${SITE.email}`} className="text-accentText">
            {SITE.email}
          </a>{" "}
          or{" "}
          <a href={`tel:${SITE.phoneHref}`} className="text-accentText">
            {SITE.phone}
          </a>
          .
        </p>
        <Transactions payments={application.payments} />
      </div>
    );
  }

  // ── Fully paid ─────────────────────────────────────────────
  if (status === "verified") {
    return (
      <div className="p-8 md:p-10" data-testid="pay-verified">
        <span className="grid h-12 w-12 place-items-center bg-accent text-[#0A0A0A]">
          <Check className="w-6 h-6" />
        </span>
        <h2 className="mt-6 font-grotesk font-semibold text-3xl md:text-4xl">Your seat is confirmed. 🎉</h2>
        <p className="mt-4 text-mutedInk leading-relaxed max-w-xl">
          We've received {inr(application.amount_paid)}. Classes begin on {START_LABEL} — we'll share onboarding details and
          joining links before the first session.
        </p>
        <Transactions payments={application.payments} />
      </div>
    );
  }

  const showForm = Boolean(paymentLink) && (status !== "reported" || adding);
  const firstName = application.full_name?.split(" ")[0] || "there";

  return (
    <div className="p-6 md:p-10" data-testid="pay-panel">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-tech text-accentText">Step 3 of 3 · Pay to confirm your seat</p>
          <h2 className="mt-3 font-grotesk font-semibold text-2xl md:text-3xl">
            {status === "reported"
              ? "Payment received — we're verifying it."
              : status === "partial"
                ? `${inr(balance)} left to confirm your seat.`
                : `You're almost in, ${firstName}.`}
          </h2>
          {status === "unpaid" && (
            <p className="mt-2 text-sm text-mutedInk max-w-sm leading-relaxed">
              One payment secures your seat. The whole process takes under two minutes.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          data-testid="pay-edit-application"
          className="text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-accentText transition-colors duration-300"
        >
          Edit application
        </button>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-8">

        {/* ── Left: Order summary ───────────────────────────────── */}
        <div>
          <div className="border border-line bg-bg" data-testid="pay-summary">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-4">
              <p className="label-tech text-mutedInk">Order summary</p>
              <p className="label-tech text-accentText">Batch 01</p>
            </div>
            <div className="px-5 py-4 border-b border-line text-sm">
              <p className="font-grotesk font-semibold text-inkStrong">Complete AI Engineering Programme</p>
              <p className="mt-1 text-mutedInk">Starts {START_LABEL} · 16 weeks · Live + 1:1 mentoring</p>
              <p className="mt-3 text-mutedInk">
                For <span className="text-inkStrong">{application.full_name}</span> · {application.email} · {application.phone}
              </p>
            </div>
            <dl className="px-5">
              <Row k={fee.plan === "regular" ? "Programme fee" : "Programme fee (early-bird)"} v={inr(fee.base)} />
              {fee.gst > 0 && <Row k={`GST @ ${fee.gst_rate ?? fee.gstRate}%`} v={inr(fee.gst)} />}
              {application.amount_paid > 0 && <Row k="Paid so far" v={`− ${inr(application.amount_paid)}`} accent />}
              {pending > 0 && <Row k="Being verified" v={inr(pending)} />}
              <Row k={application.amount_paid > 0 ? "Balance due" : "Total payable"} v={inr(balance)} strong />
            </dl>
          </div>

          {/* What's included — value reinforcement before payment */}
          <div className="mt-4 border border-line bg-bg px-5 py-4">
            <p className="label-tech text-mutedInk mb-3">What's included</p>
            <ul className="space-y-2">
              {[
                "16 weeks of live instructor-led classes",
                "1:1 mentor sessions every weekend",
                "5 real portfolio projects + capstone",
                "80+ hours of recorded sessions",
                "Programme completion certificate",
                "Access to 20+ partner company network",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-mutedInk leading-relaxed">
                  <Check className="w-3.5 h-3.5 text-accentText mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Transactions payments={application.payments} />
        </div>

        {/* ── Right: Pay + report ───────────────────────────────── */}
        <div>
          {status === "reported" && !adding ? (
            <div data-testid="pay-reported">
              <div className="border border-accent bg-bg p-5">
                <p className="flex items-start gap-3 text-sm text-inkStrong">
                  <Clock className="w-4 h-4 text-accentText mt-0.5 shrink-0" />
                  <span>
                    We've received your transaction details. Our team verifies payments within one business day and emails
                    you when your seat is confirmed.
                  </span>
                </p>
              </div>
              {paymentLink && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  data-testid="pay-add-another"
                  className="mt-4 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-accentText transition-colors duration-300"
                >
                  Made another payment? Add it
                </button>
              )}
            </div>
          ) : !paymentLink ? (
            <div className="border border-line bg-bg p-5 text-sm text-mutedInk leading-relaxed" data-testid="pay-offline">
              Online payment isn't available right now. Our team will contact you on{" "}
              <span className="text-inkStrong">{application.phone}</span> with payment details, or call us on{" "}
              <a href={`tel:${SITE.phoneHref}`} className="text-accentText">
                {SITE.phone}
              </a>
              .
            </div>
          ) : (
            <div>
              {application.payments?.some((p) => p.status === "rejected") && status === "unpaid" && (
                <p
                  className="mb-5 flex items-start gap-3 border border-red-400/60 p-4 text-sm text-inkStrong"
                  data-testid="pay-rejected"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  We couldn't find one of your transactions in our records. Please check the ID and submit it again, or
                  call {SITE.phone}.
                </p>
              )}

              {/* Refund acknowledgement FIRST — reduces surprise, builds commitment */}
              <label
                className="flex items-start gap-3 cursor-pointer text-sm text-mutedInk leading-relaxed"
                data-testid="pay-refund-ack"
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#FA942C] shrink-0"
                />
                <span>
                  I understand that programme fees, including part-payments, are{" "}
                  <span className="text-inkStrong">non-refundable</span>{" "}
                  (<Link to="/refund-policy" target="_blank" className="text-accentText link-underline">refund policy</Link>).
                </span>
              </label>

              {/* CTA button — prominent, only unlocks after checkbox */}
              <a
                href={agreed ? paymentLink : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!agreed}
                onClick={(e) => {
                  if (!agreed) {
                    e.preventDefault();
                    toast.error("Please tick the box to confirm you've read the refund policy.");
                  }
                }}
                data-testid="pay-razorpay-link"
                className={`mt-4 group flex w-full items-center justify-center gap-3 px-8 py-5 font-grotesk font-semibold tracking-wide transition-colors duration-300 text-lg ${
                  agreed
                    ? "bg-accent text-[#0A0A0A] hover:bg-inkStrong hover:text-bg cursor-pointer"
                    : "bg-accent/40 text-[#0A0A0A]/60 cursor-not-allowed"
                }`}
              >
                Pay {inr(toPay)} · Confirm my seat
                <ArrowUpRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              {/* Trust badges */}
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-mutedInk">
                <ShieldCheck className="w-3.5 h-3.5 text-accentText" /> Secure payment · Razorpay encrypted
              </p>

              {/* Payment method icons */}
              <PaymentMethods />

              {/* How to pay steps — numbered, tight */}
              <div className="mt-6 border-t border-line pt-6">
                <p className="label-tech text-mutedInk mb-4">How it works</p>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center border border-accent text-accentText text-xs font-semibold">
                      1
                    </span>
                    <span className="text-mutedInk leading-relaxed">
                      Click <span className="text-inkStrong">Pay · Confirm my seat</span> above — it opens Razorpay in
                      a new tab. Enter{" "}
                      <button
                        type="button"
                        onClick={() => copy(toPay.toFixed(2), "Amount")}
                        className="inline-flex items-center gap-1 font-semibold text-inkStrong underline decoration-accent underline-offset-4"
                        data-testid="pay-copy-amount"
                      >
                        {inr(toPay)} <Copy className="w-3 h-3" />
                      </button>{" "}
                      and use <span className="text-inkStrong">{application.email}</span> so we can match it.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center border border-accent text-accentText text-xs font-semibold">
                      2
                    </span>
                    <span className="text-mutedInk leading-relaxed">
                      Pay with UPI, card, net banking or wallet.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center border border-accent text-accentText text-xs font-semibold">
                      3
                    </span>
                    <span className="text-mutedInk leading-relaxed">
                      Come back here and enter the transaction ID and amount below — takes 30 seconds.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Social proof */}
              <SocialProof />
            </div>
          )}

          {showForm && (
            <form onSubmit={submit} className="mt-8 border-t border-line pt-8" data-testid="pay-ref-form" noValidate>
              <p className="label-tech text-accentText mb-4">Report your payment</p>
              <div className="grid sm:grid-cols-[1fr_140px] gap-4">
                <div>
                  <label htmlFor="payment_ref" className="label-tech text-mutedInk block mb-2">
                    Transaction ID *
                  </label>
                  <input
                    id="payment_ref"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    placeholder="pay_XXXXXXXXXXXXXX"
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="pay-ref-input"
                    className="w-full bg-transparent border-b border-line py-3 text-inkStrong font-mono placeholder:text-mutedInk focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="payment_amount" className="label-tech text-mutedInk block mb-2">
                    Amount paid (₹) *
                  </label>
                  <input
                    id="payment_amount"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="pay-amount-input"
                    className="w-full bg-transparent border-b border-line py-3 text-inkStrong tabular-nums focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-400" data-testid="pay-ref-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !!reauth}
                data-testid="pay-ref-submit"
                className="mt-5 inline-flex items-center gap-2 bg-accent text-[#0A0A0A] px-6 py-3 font-grotesk font-medium hover:bg-inkStrong hover:text-bg transition-colors duration-300 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} I've paid —
                confirm my seat
              </button>
              <p className="mt-3 text-xs text-mutedInk leading-relaxed">
                The transaction ID is on Razorpay's success screen and in the receipt email/SMS — it starts with{" "}
                <span className="font-mono">pay_</span>. Paying in parts? Submit each payment separately.
              </p>
              {reauth}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPanel;
