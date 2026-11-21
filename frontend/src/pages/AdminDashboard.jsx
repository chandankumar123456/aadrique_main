import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download, Loader2, LogOut, Search, RefreshCw, X, Phone, Mail, Check, Ban, ExternalLink, KeyRound, Copy,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { GoogleSignInButton, googleSignOut } from "@/components/programme/GoogleSignInButton";
import {
  useProgrammeConfig,
  adminSession,
  fetchProgrammeApplications,
  fetchProgrammeTransactions,
  fetchProgrammeStats,
  updateProgrammeApplication,
  reviewProgrammePayment,
  downloadProgrammeApplicationsCsv,
  downloadProgrammeTransactionsCsv,
  apiErrorMessage,
} from "@/lib/api";
import { getLocal, setLocal } from "@/lib/storage";
import { SITE } from "@/lib/site";
import { inr } from "@/lib/programme";

const SESSION_KEY = "aad-admin-session";
const PAGE = 100;
const EARLY_BIRD_SEATS = 20;

// ── Session storage ────────────────────────────────────────────
const loadSession = () => {
  try {
    const s = JSON.parse(getLocal(SESSION_KEY) || "null");
    if (s?.token && (!s.expires_at || s.expires_at * 1000 > Date.now())) return s;
  } catch {
    /* corrupt — fall through */
  }
  return null;
};
const saveSession = (s) => setLocal(SESSION_KEY, s ? JSON.stringify(s) : "");

// ── Labels & badges ────────────────────────────────────────────
const SEAT_PAYMENT = {
  unpaid: ["Unpaid", "border-lineStrong text-mutedInk"],
  reported: ["To verify", "bg-accent text-[#0A0A0A] border-accent"],
  partial: ["Partly paid", "border-sky-400/70 text-sky-300"],
  verified: ["Fully paid", "border-emerald-500/70 text-emerald-400"],
};
const TXN = {
  reported: ["To verify", "bg-accent text-[#0A0A0A] border-accent"],
  verified: ["Verified", "border-emerald-500/70 text-emerald-400"],
  rejected: ["Rejected", "border-red-400/70 text-red-400"],
};
const STATUS = {
  applied: "Applied",
  contacted: "Contacted",
  confirmed: "Confirmed",
  not_interested: "Not interested",
  revoked: "Revoked",
};
const STUDENT_TABS = [
  ["", "All"],
  ["reported", "To verify"],
  ["partial", "Partly paid"],
  ["verified", "Fully paid"],
  ["unpaid", "Unpaid"],
];
const TXN_TABS = [
  ["", "All"],
  ["reported", "To verify"],
  ["verified", "Verified"],
  ["rejected", "Rejected"],
];

const Pill = ({ map, value, fallback }) => {
  const [label, cls] = map[value] || map[fallback];
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 border text-[10px] uppercase tracking-[0.14em] ${cls}`}>{label}</span>;
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const waLink = (phone) => {
  const d = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`;
};

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${text}`);
  } catch {
    toast.error("Couldn't copy");
  }
};

const CopyRef = ({ value }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      copy(value);
    }}
    title="Copy transaction ID"
    className="group inline-flex items-center gap-1.5 font-mono text-inkStrong hover:text-accentText"
  >
    {value}
    <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100" />
  </button>
);

// ── Sign-in screen ─────────────────────────────────────────────
const SignIn = ({ onSession }) => {
  const { data: config, isLoading } = useProgrammeConfig();
  const [busy, setBusy] = useState(false);
  const [useToken, setUseToken] = useState(false);
  const [token, setToken] = useState("");

  const onCredential = async (cred) => {
    setBusy(true);
    try {
      onSession(await adminSession(cred));
    } catch (e) {
      googleSignOut();
      toast.error(apiErrorMessage(e, "Sign-in failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6" data-testid="admin-signin">
      <div className="w-full max-w-md border border-line bg-surface p-8 md:p-10">
        <p className="font-grotesk font-semibold tracking-[0.35em] text-inkStrong">AADRIQUE</p>
        <p className="mt-1 label-tech text-accentText">Admin dashboard</p>
        <h1 className="mt-8 font-grotesk font-semibold text-2xl">Sign in to continue.</h1>
        <p className="mt-3 text-sm text-mutedInk leading-relaxed">
          Only approved team accounts can open the dashboard. Everyone else is refused by the server.
        </p>
        <div className="mt-8 min-h-[44px]">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-mutedInk" />
          ) : config?.google_client_id ? (
            busy ? (
              <p className="flex items-center gap-2 text-sm text-mutedInk"><Loader2 className="w-4 h-4 animate-spin" /> Checking access…</p>
            ) : (
              <GoogleSignInButton clientId={config.google_client_id} onCredential={onCredential} theme="dark" text="signin_with" />
            )
          ) : (
            <p className="text-sm text-mutedInk">Google sign-in isn't configured on this server — use the admin token.</p>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-line">
          {useToken ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (token.trim()) onSession({ token: token.trim(), email: "Admin token" });
              }}
            >
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ADMIN_TOKEN"
                autoComplete="current-password"
                data-testid="admin-token-input"
                className="w-full bg-transparent border-b border-line py-3 text-inkStrong placeholder:text-mutedInk focus:border-accent focus:outline-none"
              />
              <button type="submit" data-testid="admin-token-submit" className="mt-4 border border-line px-4 py-2 text-sm text-inkStrong hover:border-accent">
                Open with token
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setUseToken(true)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-inkStrong"
            >
              <KeyRound className="w-3.5 h-3.5" /> Use admin token instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Stats ──────────────────────────────────────────────────────
const StatCard = ({ label, value, hint, accent, onClick, testId }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    data-testid={testId}
    className={`text-left p-5 transition-colors duration-300 ${accent ? "bg-accent text-[#0A0A0A]" : "bg-bg hover:bg-surface disabled:hover:bg-bg"}`}
  >
    <p className={`text-[10px] uppercase tracking-[0.18em] ${accent ? "text-[#0A0A0A]/70" : "text-mutedInk"}`}>{label}</p>
    <p className={`mt-2 font-grotesk font-semibold text-2xl md:text-3xl tabular-nums ${accent ? "" : "text-inkStrong"}`}>{value}</p>
    {hint && <p className={`mt-1 text-xs ${accent ? "text-[#0A0A0A]/70" : "text-mutedInk"}`}>{hint}</p>}
  </button>
);

const Breakdown = ({ title, data = {} }) => {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="bg-bg p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mutedInk mb-4">{title}</p>
      {rows.length === 0 && <p className="text-sm text-mutedInk">No data yet.</p>}
      <div className="space-y-2.5">
        {rows.map(([k, n]) => (
          <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <span className="text-sm text-inkStrong truncate">{k}</span>
            <span className="text-sm tabular-nums text-mutedInk">{n}</span>
            <div className="col-span-2 h-1 bg-line">
              <div className="h-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Transaction review (inside the drawer) ─────────────────────
const TxnRow = ({ app, txn, token, onSaved }) => {
  const [amount, setAmount] = useState(String(txn.amount_reported ?? ""));
  const [busy, setBusy] = useState("");

  const decide = async (status) => {
    let note;
    if (status === "verified") {
      const amt = Number(amount);
      if (!(amt > 0)) return toast.error("Enter the amount you received.");
      if (!window.confirm(`Verify ${txn.reference} for ${inr(amt)} from ${app.full_name}?\n\nCheck it matches your Razorpay dashboard.`)) return;
    } else {
      note = window.prompt("Reason (shown to the student):", "We couldn't find this transaction in our records.");
      if (note === null) return;
    }
    setBusy(status);
    try {
      const res = await reviewProgrammePayment(token, app.id, txn.id, {
        status,
        ...(status === "verified" ? { amount: Number(amount) } : { note }),
      });
      toast.success(status === "verified" ? "Transaction verified" : "Transaction rejected");
      onSaved(res.application);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Couldn't save."));
    } finally {
      setBusy("");
    }
  };

  return (
    <li className={`p-4 border ${txn.status === "reported" ? "border-accent" : "border-line"}`} data-testid="admin-txn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CopyRef value={txn.reference} />
        <Pill map={TXN} value={txn.status} fallback="reported" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-mutedInk">Student says they paid</dt>
        <dd className="text-inkStrong tabular-nums text-right">{inr(txn.amount_reported)}</dd>
        {txn.amount_verified != null && (
          <>
            <dt className="text-mutedInk">Verified amount</dt>
            <dd className="text-emerald-400 tabular-nums text-right">{inr(txn.amount_verified)}</dd>
          </>
        )}
        <dt className="text-mutedInk">Reported</dt>
        <dd className="text-inkStrong text-right">{fmt(txn.reported_at)}</dd>
        {txn.verified_at && (
          <>
            <dt className="text-mutedInk">{txn.status === "rejected" ? "Rejected" : "Verified"}</dt>
            <dd className="text-inkStrong text-right">{fmt(txn.verified_at)} · {txn.verified_by}</dd>
          </>
        )}
        {txn.note && (
          <>
            <dt className="text-mutedInk">Note</dt>
            <dd className="text-inkStrong text-right">{txn.note}</dd>
          </>
        )}
      </dl>
      {txn.status === "reported" && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-mutedInk">
            Amount received (₹)
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="admin-txn-amount"
              className="mt-1 block w-32 bg-bg border border-line px-2 py-1.5 text-sm text-inkStrong tabular-nums focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => decide("verified")}
            data-testid="admin-verify"
            className="inline-flex items-center gap-2 bg-accent text-[#0A0A0A] px-3 py-2 text-sm font-grotesk font-medium hover:bg-inkStrong hover:text-bg disabled:opacity-50"
          >
            {busy === "verified" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verify
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => decide("rejected")}
            data-testid="admin-reject"
            className="inline-flex items-center gap-2 border border-red-400/60 text-red-400 px-3 py-2 text-sm hover:bg-red-400/10 disabled:opacity-50"
          >
            <Ban className="w-4 h-4" /> Not found
          </button>
        </div>
      )}
    </li>
  );
};

// ── Detail drawer ──────────────────────────────────────────────
const Field = ({ k, v }) => (
  <div className="grid grid-cols-3 gap-3 py-2.5 border-b border-line text-sm">
    <dt className="text-mutedInk">{k}</dt>
    <dd className="col-span-2 text-inkStrong break-words">{v || "—"}</dd>
  </div>
);

const Drawer = ({ app, token, fee, onClose, onSaved }) => {
  const [notes, setNotes] = useState(app.admin_notes || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setNotes(app.admin_notes || ""), [app.id, app.admin_notes]);

  const save = async (changes, label, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true);
    try {
      const res = await updateProgrammeApplication(token, app.id, changes);
      toast.success(`${label} — saved`);
      onSaved(res.application);
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, "Couldn't save."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onStatus = (value) => {
    if (value === "revoked") {
      save(
        { status: "revoked" },
        "Seat revoked",
        `Revoke ${app.full_name}'s seat?\n\nThey'll see that their application is cancelled and can't submit payments. Any refund is handled outside the site.`
      );
    } else {
      save({ status: value }, "Status updated");
    }
  };

  const payments = app.payments || [];
  const revoked = app.status === "revoked";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="admin-drawer">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <aside className="relative w-full max-w-xl h-full overflow-y-auto bg-surface border-l border-line">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-5 border-b border-line bg-surface">
          <div className="min-w-0">
            <p className="font-grotesk font-semibold text-xl text-inkStrong truncate">{app.full_name}</p>
            <p className="text-sm text-mutedInk truncate">{app.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-mutedInk hover:text-inkStrong" aria-label="Close panel">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {revoked && (
            <p className="flex items-start gap-3 border border-red-400/60 p-4 text-sm text-inkStrong" data-testid="admin-revoked-banner">
              <Ban className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              Seat revoked {app.revoked_at ? `on ${fmt(app.revoked_at)}` : ""} {app.revoked_by ? `by ${app.revoked_by}` : ""}. Change
              the status below to restore it.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <a href={`tel:${app.phone}`} className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm text-inkStrong hover:border-accent">
              <Phone className="w-4 h-4" /> {app.phone}
            </a>
            <a href={waLink(app.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm text-inkStrong hover:border-accent">
              WhatsApp
            </a>
            <a href={`mailto:${app.email}`} className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm text-inkStrong hover:border-accent">
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>

          {/* Payments */}
          <section data-testid="admin-payment">
            <div className="flex items-center justify-between gap-3">
              <p className="label-tech text-mutedInk">Payments</p>
              <Pill map={SEAT_PAYMENT} value={app.payment_status} fallback="unpaid" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-px bg-line border border-line text-center">
              {[
                [app.fee_plan === "regular" ? "Fee (regular)" : app.fee_plan ? "Fee (early-bird)" : "Fee (not locked)", inr(app.fee_total ?? fee?.total ?? 0)],
                ["Verified paid", inr(app.amount_paid || 0)],
                ["Balance", inr(app.fee_total != null ? app.balance_due : (fee?.total ?? 0) - (app.amount_paid || 0))],
              ].map(([k, v]) => (
                <div key={k} className="bg-bg px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-mutedInk">{k}</p>
                  <p className="mt-1 font-grotesk font-semibold text-inkStrong tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-mutedInk">No transactions submitted yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {[...payments].reverse().map((t) => (
                  <TxnRow key={t.id} app={app} txn={t} token={token} onSaved={onSaved} />
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-mutedInk leading-relaxed">
              Search the ID, email or phone in the{" "}
              <a href="https://dashboard.razorpay.com/app/payments" target="_blank" rel="noopener noreferrer" className="text-accentText inline-flex items-center gap-1">
                Razorpay dashboard <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and verify with the amount you actually received. A seat is confirmed once verified payments cover the fee.
            </p>
          </section>

          {/* Status */}
          <section>
            <label htmlFor="admin-status" className="label-tech text-mutedInk block mb-2">Admission status</label>
            <select
              id="admin-status"
              value={app.status || "applied"}
              disabled={busy}
              data-testid="admin-status"
              onChange={(e) => onStatus(e.target.value)}
              className="w-full bg-bg border border-line px-3 py-2.5 text-inkStrong focus:border-accent focus:outline-none"
            >
              {Object.entries(STATUS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {!revoked && (
              <button
                type="button"
                onClick={() => onStatus("revoked")}
                disabled={busy}
                data-testid="admin-revoke"
                className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-red-400 hover:text-red-300"
              >
                <Ban className="w-3.5 h-3.5" /> Revoke seat
              </button>
            )}
          </section>

          {/* Notes */}
          <section>
            <label htmlFor="admin-notes" className="label-tech text-mutedInk block mb-2">Team notes</label>
            <textarea
              id="admin-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Called 22 Nov — paid ₹2,000 deposit, balance after exams"
              data-testid="admin-notes"
              className="w-full bg-bg border border-line p-3 text-sm text-inkStrong placeholder:text-mutedInk focus:border-accent focus:outline-none resize-none"
            />
            <button
              type="button"
              disabled={busy || notes === (app.admin_notes || "")}
              onClick={() => save({ admin_notes: notes }, "Notes")}
              data-testid="admin-notes-save"
              className="mt-2 border border-line px-4 py-2 text-sm text-inkStrong hover:border-accent disabled:opacity-40"
            >
              Save notes
            </button>
          </section>

          {/* Application */}
          <section>
            <p className="label-tech text-mutedInk mb-2">Application</p>
            <dl>
              <Field k="College" v={app.college} />
              <Field k="Year · branch" v={`${app.year_of_study} · ${app.branch}`} />
              <Field k="City" v={app.city} />
              <Field k="Python" v={app.python_level} />
              <Field k="Heard from" v={app.heard_from} />
              <Field k="Goals" v={app.goals && <span className="whitespace-pre-wrap">{app.goals}</span>} />
              <Field k="Google name" v={app.google_name} />
              <Field k="Applied" v={fmt(app.created_at)} />
              <Field k="Last updated" v={fmt(app.updated_at)} />
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────
export default function AdminDashboard() {
  const qc = useQueryClient();
  const [session, setSession] = useState(loadSession);
  const [view, setView] = useState("students"); // students | transactions
  const [tab, setTab] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  // Its own copy so the panel stays open even if a save moves the row out of the current filter.
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const token = session?.token;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const students = useQuery({
    queryKey: ["admin-apps", token, debouncedQ, tab, statusFilter, page],
    queryFn: () =>
      fetchProgrammeApplications(token, {
        q: debouncedQ || undefined,
        payment_status: tab || undefined,
        status: statusFilter || undefined,
        limit: PAGE,
        skip: page * PAGE,
      }),
    enabled: Boolean(token) && view === "students",
    placeholderData: keepPreviousData,
    retry: false,
    refetchInterval: 60_000,
  });
  const txns = useQuery({
    queryKey: ["admin-txns", token, debouncedQ, tab],
    queryFn: () => fetchProgrammeTransactions(token, { q: debouncedQ || undefined, status: tab || undefined }),
    enabled: Boolean(token) && view === "transactions",
    placeholderData: keepPreviousData,
    retry: false,
    refetchInterval: 60_000,
  });
  const stats = useQuery({
    queryKey: ["admin-stats", token],
    queryFn: () => fetchProgrammeStats(token),
    enabled: Boolean(token),
    retry: false,
    refetchInterval: 60_000,
  });

  const signOut = () => {
    googleSignOut();
    saveSession(null);
    setSession(null);
    qc.removeQueries({ queryKey: ["admin-apps"] });
    qc.removeQueries({ queryKey: ["admin-txns"] });
    qc.removeQueries({ queryKey: ["admin-stats"] });
  };

  const active = view === "students" ? students : txns;
  const unauthorized = [students, txns, stats].some((x) => x.error?.response?.status === 401);
  useEffect(() => {
    if (unauthorized) {
      toast.error("Your admin session has ended. Please sign in again.");
      signOut();
    }
  }, [unauthorized]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSession = (s) => {
    saveSession(s);
    setSession(s);
    toast.success(`Signed in as ${s.email}`);
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-apps"] });
    qc.invalidateQueries({ queryKey: ["admin-txns"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const onSaved = (app) => {
    setSelected(app);
    refreshAll();
  };

  // Opening a student from the transactions ledger: fetch their full record.
  const openApplication = async (applicationId, email) => {
    try {
      const res = await fetchProgrammeApplications(token, { q: email, limit: 50 });
      const app = res.items.find((a) => a.id === applicationId);
      if (app) setSelected(app);
      else toast.error("Couldn't load that student.");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const switchView = (v) => {
    setView(v);
    setTab("");
    setPage(0);
  };

  const exportCsv = async () => {
    setDownloading(true);
    try {
      await (view === "students" ? downloadProgrammeApplicationsCsv(token) : downloadProgrammeTransactionsCsv(token));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Download failed."));
    } finally {
      setDownloading(false);
    }
  };

  const studentItems = useMemo(() => students.data?.items || [], [students.data]);
  const txnItems = useMemo(() => txns.data?.items || [], [txns.data]);
  const total = students.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const st = stats.data;
  const toVerify = st?.by_payment?.reported || 0;
  const seatsPaid = st?.seats_paid || 0;

  if (!token) {
    return (
      <>
        <Seo title="Admin" description="Admin" noindex />
        <SignIn onSession={onSession} />
      </>
    );
  }

  const tabs = view === "students" ? STUDENT_TABS : TXN_TABS;
  const filtered = debouncedQ || tab || statusFilter;

  return (
    <div className="min-h-screen" data-testid="admin-dashboard">
      <Seo title="Admin — Applications" description="Admin" noindex />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="font-grotesk font-semibold tracking-[0.35em] text-inkStrong text-sm">AADRIQUE</span>
            <span className="label-tech text-accentText hidden sm:inline">Admin · AI Engineering Programme</span>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            {session.picture && <img src={session.picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border border-line" />}
            <span className="hidden md:block text-sm text-mutedInk truncate max-w-[220px]" data-testid="admin-who">{session.email}</span>
            <Link to="/ai-engineering" target="_blank" className="hidden sm:inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-inkStrong">
              Site <ExternalLink className="w-3 h-3" />
            </Link>
            <button onClick={signOut} data-testid="admin-signout" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-mutedInk hover:text-inkStrong">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-line border border-line" data-testid="admin-stats">
          <StatCard label="Applications" value={st?.total ?? "—"} hint={st ? `${st.today} today` : ""} onClick={() => { switchView("students"); setStatusFilter(""); }} testId="admin-stat-total" />
          <StatCard
            label="Payments to verify"
            value={toVerify}
            hint={toVerify ? `${inr(st?.pending_amount || 0, 0)} waiting` : "All caught up"}
            accent={toVerify > 0}
            onClick={() => { switchView("transactions"); setTab("reported"); }}
            testId="admin-stat-reported"
          />
          <StatCard label="Seats fully paid" value={seatsPaid} hint="Excludes revoked" onClick={() => { switchView("students"); setTab("verified"); }} testId="admin-stat-verified" />
          <StatCard label="Partly paid" value={st?.by_payment?.partial || 0} hint="Balance pending" onClick={() => { switchView("students"); setTab("partial"); }} testId="admin-stat-partial" />
          <StatCard
            label="Early-bird seats left"
            value={st ? Math.max(0, (st.early_bird_seats ?? EARLY_BIRD_SEATS) - (st.early_bird_claimed ?? 0)) : "—"}
            hint={st ? `of ${st.early_bird_seats ?? EARLY_BIRD_SEATS} · deposits hold a seat · now ${inr(st.fee.total, 0)}` : ""}
            testId="admin-stat-early-bird"
          />
          <StatCard label="Collected (verified)" value={st ? inr(st.collected, 0) : "—"} hint={st ? `Fee ${inr(st.fee.total, 0)} per seat` : ""} testId="admin-stat-collected" />
        </section>

        <section className="grid md:grid-cols-3 gap-px bg-line border border-line">
          <Breakdown title="Year of study" data={st?.by_year} />
          <Breakdown title="Python experience" data={st?.by_python} />
          <Breakdown
            title="Admission status"
            data={Object.fromEntries(Object.entries(st?.by_status || {}).map(([k, v]) => [STATUS[k] || k, v]))}
          />
        </section>

        {/* View switch + filters */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex border border-line" role="tablist" aria-label="View">
              {[["students", "Students"], ["transactions", "Transactions"]].map(([v, l]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => switchView(v)}
                  data-testid={`admin-view-${v}`}
                  className={`px-5 py-2.5 font-grotesk font-medium text-sm ${view === v ? "bg-inkStrong text-bg" : "bg-bg text-mutedInk hover:text-inkStrong"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {view === "students" && (
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  className="bg-bg border border-line px-3 py-2 text-sm text-inkStrong"
                  aria-label="Admission status filter"
                >
                  <option value="">Any status</option>
                  {Object.entries(STATUS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 border border-line px-3 bg-bg">
                <Search className="w-4 h-4 text-mutedInk" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={view === "students" ? "Name, email, phone, college, transaction ID" : "Transaction ID, name, email, phone"}
                  data-testid="admin-search"
                  className="w-72 bg-transparent py-2 text-sm text-inkStrong placeholder:text-mutedInk focus:outline-none"
                />
              </label>
              <button onClick={refreshAll} className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm text-inkStrong hover:border-accent" aria-label="Refresh">
                <RefreshCw className={`w-4 h-4 ${active.isFetching ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={exportCsv}
                disabled={downloading}
                data-testid="admin-export-csv"
                className="inline-flex items-center gap-2 bg-accent text-[#0A0A0A] px-4 py-2 text-sm font-grotesk font-medium hover:bg-inkStrong hover:text-bg disabled:opacity-60"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {view === "students" ? "Students CSV" : "Transactions CSV"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-px bg-line border border-line w-fit" role="tablist" aria-label="Payment filter">
            {tabs.map(([v, l]) => (
              <button
                key={l}
                role="tab"
                aria-selected={tab === v}
                onClick={() => { setTab(v); setPage(0); }}
                data-testid={`admin-tab-${l.toLowerCase().replace(/\s+/g, "-")}`}
                className={`px-4 py-2 text-sm transition-colors ${tab === v ? "bg-accent text-[#0A0A0A]" : "bg-bg text-mutedInk hover:text-inkStrong"}`}
              >
                {l}
                {v === "reported" && toVerify > 0 && <span className="ml-1.5 tabular-nums">({toVerify})</span>}
              </button>
            ))}
          </div>
        </section>

        {active.error && !unauthorized && <p className="text-sm text-red-400">{apiErrorMessage(active.error, "Could not load data.")}</p>}

        {/* Students */}
        {view === "students" && (
          <section className="border border-line overflow-x-auto">
            <table className="w-full text-sm min-w-[1040px]" data-testid="admin-table">
              <thead>
                <tr className="border-b border-line bg-surface text-left">
                  {["Applied", "Student", "Phone", "College · year · branch", "Payment", "Transaction IDs", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-mutedInk font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.isLoading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-mutedInk"><Loader2 className="inline w-4 h-4 animate-spin" /></td></tr>
                )}
                {!students.isLoading && studentItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-mutedInk">
                      {filtered ? "Nothing matches these filters." : "No applications yet — share the programme link to get started."}
                    </td>
                  </tr>
                )}
                {studentItems.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    data-testid="admin-row"
                    className={`border-b border-line cursor-pointer align-top hover:bg-surface ${a.payment_status === "reported" ? "bg-accent/[0.04]" : ""} ${a.status === "revoked" ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-mutedInk">{fmt(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-inkStrong font-medium whitespace-nowrap">{a.full_name}</p>
                      <p className="text-xs text-mutedInk">{a.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-inkStrong">{a.phone}</td>
                    <td className="px-4 py-3 text-mutedInk">
                      <p className="text-inkStrong">{a.college}</p>
                      <p className="text-xs">{a.year_of_study} · {a.branch} · {a.python_level}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill map={SEAT_PAYMENT} value={a.payment_status} fallback="unpaid" />
                      <p className="mt-1 text-xs tabular-nums text-mutedInk">
                        {inr(a.amount_paid || 0, 0)} / {inr(a.fee_total ?? st?.fee?.total ?? 14999, 0)}
                        {a.fee_plan === "regular" && <span className="ml-1 text-[10px] uppercase tracking-[0.12em]">regular</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {(a.payments || []).length === 0 ? (
                        <span className="text-mutedInk">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {a.payments.map((t) => (
                            <li key={t.id} className={`text-xs ${t.status === "rejected" ? "line-through opacity-60" : ""}`}>
                              <CopyRef value={t.reference} />{" "}
                              <span className="text-mutedInk tabular-nums">{inr(t.amount_verified ?? t.amount_reported, 0)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${a.status === "revoked" ? "text-red-400" : "text-mutedInk"}`}>{STATUS[a.status] || a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Transactions ledger */}
        {view === "transactions" && (
          <section className="border border-line overflow-x-auto">
            <table className="w-full text-sm min-w-[1040px]" data-testid="admin-txn-table">
              <thead>
                <tr className="border-b border-line bg-surface text-left">
                  {["Reported", "Transaction ID", "Amount", "Status", "Student", "Phone", "Seat"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-mutedInk font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.isLoading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-mutedInk"><Loader2 className="inline w-4 h-4 animate-spin" /></td></tr>
                )}
                {!txns.isLoading && txnItems.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-mutedInk">{filtered ? "No transactions match." : "No transactions submitted yet."}</td></tr>
                )}
                {txnItems.map((r) => (
                  <tr
                    key={r.txn.id}
                    onClick={() => openApplication(r.application_id, r.email)}
                    data-testid="admin-txn-row"
                    className={`border-b border-line cursor-pointer hover:bg-surface ${r.txn.status === "reported" ? "bg-accent/[0.04]" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-mutedInk">{fmt(r.txn.reported_at)}</td>
                    <td className="px-4 py-3"><CopyRef value={r.txn.reference} /></td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <p className="text-inkStrong">{inr(r.txn.amount_reported)}</p>
                      {r.txn.amount_verified != null && r.txn.amount_verified !== r.txn.amount_reported && (
                        <p className="text-xs text-emerald-400">verified {inr(r.txn.amount_verified)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><Pill map={TXN} value={r.txn.status} fallback="reported" /></td>
                    <td className="px-4 py-3">
                      <p className="text-inkStrong font-medium whitespace-nowrap">{r.full_name}</p>
                      <p className="text-xs text-mutedInk">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-inkStrong">{r.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill map={SEAT_PAYMENT} value={r.payment_status} fallback="unpaid" />
                      <p className={`mt-1 text-xs ${r.status === "revoked" ? "text-red-400" : "text-mutedInk"}`}>
                        {r.status === "revoked" ? "Revoked" : `Balance ${inr(r.balance_due ?? 0, 0)}`}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {view === "students" && pages > 1 && (
          <div className="flex items-center gap-4 text-sm">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="border border-line px-4 py-2 disabled:opacity-40">Previous</button>
            <span className="text-mutedInk">Page {page + 1} of {pages} · {total} results</span>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="border border-line px-4 py-2 disabled:opacity-40">Next</button>
          </div>
        )}

        <p className="text-xs text-mutedInk">
          Data refreshes every minute. Click any row for full details, contact buttons, payment verification and revoking a
          seat. Questions about access: {SITE.email}
        </p>
      </main>

      {selected && <Drawer app={selected} token={token} fee={st?.fee} onClose={() => setSelected(null)} onSaved={onSaved} />}
    </div>
  );
}
