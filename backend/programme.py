"""AI Engineering Programme — student applications with Google Sign-In.

Students sign in with Google in the browser (Google Identity Services), which
hands the page a signed ID token. Every write sends that token back; the API
verifies it against Google's public keys and the configured client ID, so the
stored email and Google account ID are proven, not typed in.

Pure helpers live here; the routes are wired in server.py next to the rest.
"""

from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import io
import json
import re
import time
from typing import Literal, Optional

from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, Field, field_validator

COHORT = "batch-01"

# Early-bird fee applies to the first N confirmed (fully paid) admissions.
EARLY_BIRD_SEATS = 20

YEARS = ("1st year", "2nd year", "3rd year", "4th year", "Graduated", "Other")
PYTHON_LEVELS = ("New to programming", "Beginner", "Comfortable", "Advanced")

PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-]{6,18}[0-9]$")

# --- Fee -------------------------------------------------------------------
# Amounts in paise to avoid float rounding. Early-bird ₹14,999, flat.
# GST is off for now (payments go to a personal Razorpay account); set
# GST_RATE_PERCENT to 18 once collecting through the corporate account — every
# total, summary and dashboard figure follows from these two numbers.
FEE_BASE_PAISE = 1_499_900          # early-bird
REGULAR_FEE_PAISE = 1_799_900       # after the early-bird seats are taken
GST_RATE_PERCENT = 0

# Pricing plans. A student's plan is locked when they submit their first payment
# (see server.py → _assign_fee_plan), so a deposit holds the early-bird price.
PLANS = {"early_bird": FEE_BASE_PAISE, "regular": REGULAR_FEE_PAISE}
# Plans that count as holding an early-bird seat.
ACTIVE_PAYMENT_STATES = ("reported", "partial", "verified")


def fee_breakdown(plan: str = "early_bird") -> dict:
    base_paise = PLANS.get(plan, FEE_BASE_PAISE)
    gst = base_paise * GST_RATE_PERCENT // 100
    total = base_paise + gst
    return {
        "plan": plan,
        "currency": "INR",
        "base": base_paise / 100,
        "gst_rate": GST_RATE_PERCENT,
        "gst": gst / 100,
        "total": total / 100,
        "total_paise": total,
    }


# --- Statuses ----------------------------------------------------------------
# Where the student is in admissions (set by the team). "revoked" cancels a seat:
# the student is told so and can no longer submit payments.
STATUSES = ("applied", "contacted", "confirmed", "not_interested", "revoked")

# Payments are made through a Razorpay payment link (until API keys), so the site
# can't see them. Each transaction the student reports is a separate entry the
# team verifies against the Razorpay dashboard. A student may pay in parts
# (e.g. a deposit to hold the seat, then the balance).
TXN_STATUSES = ("reported", "verified", "rejected")

# Overall payment state, derived from the transactions — never set directly:
#   unpaid   no transactions reported (or all rejected)
#   reported at least one transaction waiting for the team
#   partial  verified money < fee, nothing waiting
#   verified verified money >= fee — seat paid for
PAYMENT_STATUSES = ("unpaid", "reported", "partial", "verified")

# Razorpay payment IDs look like pay_XXXXXXXXXXXXXX; bank UTRs are 12–22 digits.
PAYMENT_REF_RE = re.compile(r"^[A-Za-z0-9_\-]{6,40}$")

# One shared transport: reuses the HTTPS connection to Google's cert endpoint.
_google_transport = google_requests.Request()


class GoogleAuthError(Exception):
    """The presented Google credential is missing, invalid, expired or unverified."""


class GoogleUnavailableError(Exception):
    """Google's signing keys could not be fetched — not the student's fault."""


def verify_google_credential(credential: str, client_id: str) -> dict:
    """Verify a Google Identity Services ID token. Blocking — call in a threadpool.

    Checks signature, expiry, issuer and audience (our OAuth client ID), and that
    Google has verified the email address. Returns the token claims.
    """
    if not credential:
        raise GoogleAuthError("Missing Google credential.")
    try:
        claims = google_id_token.verify_oauth2_token(
            credential, _google_transport, audience=client_id, clock_skew_in_seconds=10
        )
    except google_exceptions.TransportError as e:
        raise GoogleUnavailableError(str(e)) from e
    # google-auth signals a bad token with ValueError (malformed, bad signature,
    # expired) or its own GoogleAuthError (wrong issuer, invalid claims).
    except (ValueError, google_exceptions.GoogleAuthError) as e:
        raise GoogleAuthError(str(e)) from e
    if not claims.get("sub") or not claims.get("email"):
        raise GoogleAuthError("Google credential has no account or email.")
    if not claims.get("email_verified"):
        raise GoogleAuthError("Google has not verified this email address.")
    return claims


def profile_from_claims(claims: dict) -> dict:
    return {
        "name": claims.get("name") or "",
        "email": claims["email"].lower(),
        "picture": claims.get("picture") or "",
    }


class CredentialIn(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)


class PaymentReport(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)
    reference: str = Field(min_length=6, max_length=40)
    amount: float = Field(gt=0, le=100_000)

    @field_validator("reference", mode="before")
    @classmethod
    def _clean_ref(cls, v):
        return v.strip().replace(" ", "") if isinstance(v, str) else v

    @field_validator("reference")
    @classmethod
    def _valid_ref(cls, v: str) -> str:
        if not PAYMENT_REF_RE.match(v):
            raise ValueError("Enter the payment ID from Razorpay (starts with pay_) or your UPI/bank reference number")
        return v


class AdminUpdate(BaseModel):
    status: Optional[Literal[STATUSES]] = None  # type: ignore[valid-type]
    admin_notes: Optional[str] = Field(default=None, max_length=2000)


class TxnUpdate(BaseModel):
    """Team decision on one reported transaction."""
    status: Literal["verified", "rejected"]
    # The amount actually seen in Razorpay; defaults to what the student reported.
    amount: Optional[float] = Field(default=None, gt=0, le=100_000)
    note: Optional[str] = Field(default=None, max_length=300)


def summarize_payments(payments: list, plan: str = "early_bird") -> dict:
    """Derived payment fields stored on the application for filtering and display."""
    fee_total = fee_breakdown(plan)["total"]
    payments = payments or []
    paid = round(sum(p.get("amount_verified") or 0 for p in payments if p.get("status") == "verified"), 2)
    pending = [p for p in payments if p.get("status") == "reported"]
    if paid >= fee_total:
        status = "verified"
    elif pending:
        status = "reported"
    elif paid > 0:
        status = "partial"
    else:
        status = "unpaid"
    refs = [p["reference"] for p in payments if p.get("status") != "rejected"]
    return {
        "payment_status": status,
        "amount_paid": paid,
        "amount_pending": round(sum(p.get("amount_reported") or 0 for p in pending), 2),
        "balance_due": round(max(0.0, fee_total - paid), 2),
        "payment_references": [p["reference"] for p in payments],
        "payment_reference": refs[-1] if refs else "",
    }


class ProgrammeApplication(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=20)
    college: str = Field(min_length=2, max_length=160)
    year_of_study: Literal[YEARS]  # type: ignore[valid-type]
    branch: str = Field(min_length=1, max_length=80)
    city: str = Field(default="", max_length=80)
    python_level: Literal[PYTHON_LEVELS + ("",)] = ""  # type: ignore[valid-type]  # optional: keep the first form short
    goals: str = Field(default="", max_length=2000)
    heard_from: str = Field(default="", max_length=80)
    consent: bool
    website: str = Field(default="", max_length=200)  # honeypot

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("phone")
    @classmethod
    def _valid_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Please enter a valid phone number")
        return v

    @field_validator("consent")
    @classmethod
    def _must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Please agree to be contacted about your application")
        return v


# Fields a student controls; everything else on the record is set by the server.
APPLICATION_FIELDS = (
    "full_name", "phone", "college", "year_of_study", "branch",
    "city", "python_level", "goals", "heard_from", "consent",
)

# Columns for the admin view and CSV export, in order.
EXPORT_COLUMNS = [
    ("Applied at", "created_at"),
    ("Updated at", "updated_at"),
    ("Status", "status"),
    ("Payment status", "payment_status"),
    ("Fee plan", "fee_plan"),
    ("Fee", "fee_total"),
    ("Amount paid (verified)", "amount_paid"),
    ("Balance due", "balance_due"),
    ("Transactions", "transactions"),
    ("Full name", "full_name"),
    ("Email", "email"),
    ("Phone", "phone"),
    ("College", "college"),
    ("Year", "year_of_study"),
    ("Branch", "branch"),
    ("City", "city"),
    ("Python level", "python_level"),
    ("Goals", "goals"),
    ("Heard from", "heard_from"),
    ("Admin notes", "admin_notes"),
    ("Cohort", "cohort"),
    ("Google name", "google_name"),
    ("ID", "id"),
]


def application_plan(doc: dict, current_plan: str) -> str:
    """The plan this student pays: their locked plan, or today's price if not locked yet."""
    return doc.get("fee_plan") or current_plan


def public_application(doc: Optional[dict], current_plan: str = "early_bird") -> Optional[dict]:
    """What the student is shown about their own application."""
    if not doc:
        return None
    keep = APPLICATION_FIELDS + ("id", "email", "status", "cohort", "created_at", "updated_at")
    out = {k: doc.get(k) for k in keep}
    plan = application_plan(doc, current_plan)
    out.update(summarize_payments(doc.get("payments"), plan))
    out["fee"] = fee_breakdown(plan)
    out["fee_locked"] = bool(doc.get("fee_plan"))
    # Students see their own transactions, minus who on the team handled them.
    out["payments"] = [
        {k: p.get(k) for k in ("id", "reference", "amount_reported", "amount_verified", "status", "reported_at", "note")}
        for p in doc.get("payments") or []
    ]
    return out


def describe_transactions(payments: list) -> str:
    """One-line summary of every transaction, for the CSV export."""
    return "; ".join(
        f"{p['reference']} ₹{(p.get('amount_verified') or p.get('amount_reported') or 0):,.2f} {p.get('status')}"
        for p in payments or []
    )


# --------------------------------------------------------------------------------------
# Admin sessions (Sign in with Google, allow-listed emails)
# --------------------------------------------------------------------------------------
# A signed, expiring token issued after the API has verified an admin's Google ID
# token. Stateless: HMAC-SHA256 over {email, exp}. The key is derived from
# ADMIN_TOKEN, so rotating ADMIN_TOKEN signs everyone out.

ADMIN_SESSION_HOURS = 12
_SESSION_PREFIX = "as1."


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _session_key(admin_token: str) -> bytes:
    return hashlib.sha256(b"aadrique-admin-session:" + admin_token.encode()).digest()


def issue_admin_session(email: str, admin_token: str, now: Optional[float] = None) -> dict:
    exp = int((now or time.time()) + ADMIN_SESSION_HOURS * 3600)
    body = _b64(json.dumps({"e": email, "x": exp}, separators=(",", ":")).encode())
    sig = _b64(hmac.new(_session_key(admin_token), body.encode(), hashlib.sha256).digest())
    return {"token": f"{_SESSION_PREFIX}{body}.{sig}", "email": email, "expires_at": exp}


def read_admin_session(token: str, admin_token: str, allowed: list, now: Optional[float] = None) -> Optional[str]:
    """Return the admin email if the session token is genuine, unexpired and still allowed."""
    if not token.startswith(_SESSION_PREFIX) or not admin_token:
        return None
    try:
        body, sig = token[len(_SESSION_PREFIX):].split(".", 1)
        expected = _b64(hmac.new(_session_key(admin_token), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_unb64(body))
    except (ValueError, TypeError):
        return None
    if data.get("x", 0) < (now or time.time()):
        return None
    email = data.get("e", "")
    return email if email in allowed else None


def _csv_safe(v) -> str:
    """Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell)."""
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s


def applications_csv(docs: list) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([label for label, _ in EXPORT_COLUMNS])
    for d in docs:
        row = {**d, "transactions": describe_transactions(d.get("payments"))}
        w.writerow([_csv_safe(row.get(key)) for _, key in EXPORT_COLUMNS])
    # BOM so Excel opens UTF-8 (names, ₹) correctly.
    return "﻿" + buf.getvalue()


def transactions_csv(rows: list) -> str:
    """One row per transaction, student details alongside — matches a Razorpay export by ID."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "Reported at", "Transaction ID", "Amount reported", "Amount verified", "Transaction status",
        "Verified at", "Verified by", "Note", "Student", "Email", "Phone", "College",
        "Seat payment status", "Paid total", "Balance due", "Admission status", "Application ID",
    ])
    for r in rows:
        t = r.get("txn") or {}
        w.writerow([_csv_safe(v) for v in (
            t.get("reported_at"), t.get("reference"), t.get("amount_reported"), t.get("amount_verified"),
            t.get("status"), t.get("verified_at"), t.get("verified_by"), t.get("note"),
            r.get("full_name"), r.get("email"), r.get("phone"), r.get("college"),
            r.get("payment_status"), r.get("amount_paid"), r.get("balance_due"), r.get("status"),
            r.get("application_id"),
        )])
    return "\ufeff" + buf.getvalue()


# --------------------------------------------------------------------------------------
# Emails
# --------------------------------------------------------------------------------------

def _esc(v) -> str:
    if v is None or v == "":
        return "—"
    return (
        str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace('"', "&quot;").replace("'", "&#x27;")
    )


def _shell(kicker: str, body: str, footer: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0de;padding:32px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e0d0;">
          <tr><td style="background:#060606;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;letter-spacing:6px;font-weight:bold;">AADRIQUE</span><br/>
            <span style="color:#fa942c;font-size:10px;letter-spacing:3px;">{kicker}</span>
          </td></tr>
          {body}
          <tr><td style="padding:16px 32px;border-top:1px solid #eee;color:#999;font-size:12px;">{footer}</td></tr>
        </table>
      </td></tr>
    </table>"""


def owner_application_html(d: dict, is_new: bool) -> str:
    rows = "".join(
        f'<tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:150px;">{label}</td>'
        f'<td style="padding:10px 16px;border-bottom:1px solid #eee;color:#0a0a0a;font-size:14px;">{_esc(d.get(key))}</td></tr>'
        for label, key in EXPORT_COLUMNS
        if key not in ("updated_at", "goals", "id", "cohort", "status")
    )
    body = f"""
          <tr><td style="padding:24px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
            <div style="margin:20px 16px 8px;padding:16px;background:#faf7ee;border-left:3px solid #fa942c;color:#0a0a0a;font-size:14px;line-height:1.6;">
              <strong>What they want to build:</strong><br/>{_esc(d.get("goals"))}
            </div>
          </td></tr>"""
    kicker = "NEW PROGRAMME APPLICATION" if is_new else "PROGRAMME APPLICATION UPDATED"
    return _shell(kicker, body, f"Reply directly to this email to respond to {_esc(d.get('full_name'))}.")


def student_confirmation_html(d: dict) -> str:
    body = f"""
          <tr><td style="padding:32px;color:#0a0a0a;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi {_esc(d.get("full_name"))},</p>
            <p style="margin:0 0 16px;">Thank you for applying to the <strong>Complete AI Engineering Programme</strong>. Your application is saved — complete your payment on the apply page to confirm your seat. Once we verify it, we'll email your confirmation.</p>
            <div style="margin:0 0 16px;padding:16px;background:#faf7ee;border-left:3px solid #fa942c;color:#555;font-size:13px;line-height:1.8;">
              <strong style="color:#0a0a0a;">Batch 01 starts 15 December 2026</strong><br/>
              Live classes · 1:1 mentor interactions · 16 weeks<br/>
              Early-bird fee ₹14,999 for the first 20 admissions (regular ₹17,999) · fees are non-refundable
            </div>
            <p style="margin:0 0 16px;">You can pay, review or update your details any time at <a href="https://www.aadrique.in/ai-engineering/apply" style="color:#fa942c;text-decoration:none;">aadrique.in/ai-engineering/apply</a> by signing in with the same Google account.</p>
            <p style="margin:0 0 16px;">Questions? Call <a href="tel:+919652886208" style="color:#fa942c;text-decoration:none;">+91 96528 86208</a> or reply to this email.</p>
            <p style="margin:0;">— The AADRIQUE team</p>
          </td></tr>"""
    return _shell("COMPLETE AI ENGINEERING PROGRAMME", body, "AADRIQUE TECH PVT LTD · info@aadrique.in · www.aadrique.in")


def owner_payment_html(d: dict, txn: dict) -> str:
    fee = fee_breakdown(d.get("fee_plan") or "early_bird")
    body = f"""
          <tr><td style="padding:32px;color:#0a0a0a;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;"><strong>{_esc(d.get("full_name"))}</strong> ({_esc(d.get("email"))}, {_esc(d.get("phone"))}) reports a payment for Batch 01.</p>
            <div style="margin:0 0 16px;padding:16px;background:#faf7ee;border-left:3px solid #fa942c;font-size:14px;line-height:1.8;">
              Transaction ID: <strong>{_esc(txn.get("reference"))}</strong><br/>
              Amount reported: <strong>₹{txn.get("amount_reported", 0):,.2f}</strong> of ₹{fee["total"]:,.2f}<br/>
              Already verified: ₹{d.get("amount_paid", 0):,.2f}
            </div>
            <p style="margin:0;">Check it in the Razorpay dashboard, then mark it <strong>Verified</strong> in the admin dashboard.</p>
          </td></tr>"""
    return _shell("PAYMENT REPORTED", body, "Admin dashboard: https://www.aadrique.in/admin")


def student_payment_verified_html(d: dict) -> str:
    body = f"""
          <tr><td style="padding:32px;color:#0a0a0a;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi {_esc(d.get("full_name"))},</p>
            <p style="margin:0 0 16px;">Your payment has been verified — <strong>your seat in Batch 01 of the Complete AI Engineering Programme is confirmed.</strong></p>
            <div style="margin:0 0 16px;padding:16px;background:#faf7ee;border-left:3px solid #fa942c;color:#555;font-size:13px;line-height:1.8;">
              <strong style="color:#0a0a0a;">Classes begin 15 December 2026</strong><br/>
              Paid: ₹{d.get("amount_paid", 0):,.2f} · Transaction(s): {_esc(", ".join(p["reference"] for p in d.get("payments") or [] if p.get("status") == "verified"))}
            </div>
            <p style="margin:0 0 16px;">We'll share onboarding details, the class schedule and joining links before the first session.</p>
            <p style="margin:0;">— The AADRIQUE team</p>
          </td></tr>"""
    return _shell("SEAT CONFIRMED", body, "AADRIQUE TECH PVT LTD · info@aadrique.in · www.aadrique.in")
