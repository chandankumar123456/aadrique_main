from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
import logging
import re
import time
import uuid

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

from config import settings
import programme
from programme import (
    AdminUpdate,
    CredentialIn,
    GoogleAuthError,
    GoogleUnavailableError,
    PaymentReport,
    ProgrammeApplication,
    TxnUpdate,
)
from seed_data import SEED_VERSION, SERVICES, INDUSTRIES, CASE_STUDIES, PRODUCTS, GROWTH, POSTS, FAQS, TESTIMONIALS

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aadrique")

for _warning in settings.validate():
    logger.warning(_warning)

client = AsyncIOMotorClient(settings.mongo_url, serverSelectionTimeoutMS=5000, tz_aware=True)
db = client[settings.db_name]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# --------------------------------------------------------------------------------------
# Email
# --------------------------------------------------------------------------------------

async def send_email(to: str, subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    if not settings.email_enabled:
        logger.warning("Email disabled — skipping '%s' to %s", subject, to)
        return False
    payload = {
        "from": f"{settings.email_from_name} <{settings.email_from_address}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = [reply_to]
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=payload,
            )
        if resp.status_code >= 400:
            # Resend explains the refusal in the body (unverified domain, bad
            # from-address, revoked key). raise_for_status() discards it, which
            # makes a misconfigured deploy look like a silent no-op.
            logger.error(
                "Email send failed to %s (%s): Resend returned %s — %s",
                to, subject, resp.status_code, resp.text[:500],
            )
            return False
        logger.info("Email sent to %s (%s)", to, subject)
        return True
    except Exception as e:  # noqa: BLE001 — email must never break the request
        logger.error("Email send failed to %s: %s", to, e)
        return False


def _esc(v: Optional[str]) -> str:
    """Escape untrusted form input before it goes into an HTML email body."""
    if not v:
        return "—"
    return (
        v.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def owner_notification_html(d: dict) -> str:
    rows = "".join(
        f'<tr><td style="padding:10px 16px;border-bottom:1px solid #eee;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:150px;">{label}</td>'
        f'<td style="padding:10px 16px;border-bottom:1px solid #eee;color:#0a0a0a;font-size:14px;">{_esc(d.get(key))}</td></tr>'
        for label, key in [
            ("Name", "name"), ("Company", "company"), ("Role", "role"), ("Email", "email"),
            ("Phone", "phone"), ("Service interest", "service_interest"), ("Budget range", "budget_range"),
        ]
    )
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0de;padding:32px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e0d0;">
          <tr><td style="background:#060606;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;letter-spacing:6px;font-weight:bold;">AADRIQUE</span><br/>
            <span style="color:#fa942c;font-size:10px;letter-spacing:3px;">NEW WEBSITE ENQUIRY</span>
          </td></tr>
          <tr><td style="padding:24px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
            <div style="margin:20px 16px 8px;padding:16px;background:#faf7ee;border-left:3px solid #fa942c;color:#0a0a0a;font-size:14px;line-height:1.6;">
              {_esc(d.get("message"))}
            </div>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #eee;color:#999;font-size:12px;">
            Reply directly to this email to respond to {_esc(d.get("name"))}.
          </td></tr>
        </table>
      </td></tr>
    </table>"""


def auto_reply_html(d: dict) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0de;padding:32px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e0d0;">
          <tr><td style="background:#060606;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;letter-spacing:6px;font-weight:bold;">AADRIQUE</span><br/>
            <span style="color:#fa942c;font-size:10px;letter-spacing:3px;">BUILD. TRANSFORM. SCALE.</span>
          </td></tr>
          <tr><td style="padding:32px;color:#0a0a0a;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hello {_esc(d.get("name"))},</p>
            <p style="margin:0 0 16px;">Thank you for reaching out to AADRIQUE. We've received your enquiry and a member of our team will reply within <strong>one business day</strong>.</p>
            <div style="margin:0 0 16px;padding:16px;background:#faf7ee;border-left:3px solid #fa942c;color:#555;font-size:13px;line-height:1.6;">
              <strong style="color:#0a0a0a;">Your message:</strong><br/>{_esc(d.get("message"))}
            </div>
            <p style="margin:0 0 16px;">If it's urgent, call us directly at <a href="tel:+919652886208" style="color:#fa942c;text-decoration:none;">+91 96528 86208</a> or reply to this email.</p>
            <p style="margin:0;">— The AADRIQUE team</p>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #eee;color:#999;font-size:12px;">
            AADRIQUE TECH PVT LTD · info@aadrique.in · www.aadrique.in
          </td></tr>
        </table>
      </td></tr>
    </table>"""


# --------------------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------------------

class ContactEnquiry(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    company: str = Field(default="", max_length=160)
    role: str = Field(default="", max_length=120)
    email: str = Field(max_length=254)
    phone: str = Field(default="", max_length=40)
    service_interest: str = Field(default="", max_length=120)
    budget_range: str = Field(default="", max_length=60)
    message: str = Field(min_length=10, max_length=5000)
    website: str = Field(default="", max_length=200)  # honeypot

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        if not EMAIL_RE.match(v):
            raise ValueError("Please provide a valid email address")
        return v.lower()


# --------------------------------------------------------------------------------------
# Rate limiting
# --------------------------------------------------------------------------------------

_rate: dict = {}
_rate_last_prune = 0.0
_RATE_MAX_KEYS = 10_000


def client_ip(request: Request) -> str:
    """Resolve the caller's IP, honouring X-Forwarded-For only behind a trusted proxy.

    Without TRUST_PROXY the header is ignored — otherwise any client could spoof it
    and walk straight past the rate limiter.
    """
    if settings.trust_proxy:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
        real = request.headers.get("x-real-ip", "")
        if real:
            return real.strip()
    return request.client.host if request.client else "unknown"


def rate_limit_exceeded(ip: str, limit: Optional[int] = None) -> bool:
    """Sliding-window limiter with bounded memory (single-process; see DEPLOYMENT.md).

    `ip` is the bucket key; callers may namespace it (e.g. "programme:<ip>") to get
    a separate budget with its own `limit`.
    """
    global _rate_last_prune
    now = time.time()
    window = settings.contact_rate_window

    if now - _rate_last_prune > window or len(_rate) > _RATE_MAX_KEYS:
        for key, stamps in list(_rate.items()):
            fresh = [t for t in stamps if now - t < window]
            if fresh:
                _rate[key] = fresh
            else:
                del _rate[key]
        _rate_last_prune = now

    hits = [t for t in _rate.get(ip, []) if now - t < window]
    if len(hits) >= (limit or settings.contact_rate_limit):
        _rate[ip] = hits
        return True
    hits.append(now)
    _rate[ip] = hits
    return False


# --------------------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------------------

async def require_admin(
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
) -> str:
    """Guard for endpoints exposing stored personal data. Returns who is acting.

    Accepts the static ADMIN_TOKEN (scripts, curl) or an admin session issued by
    /api/admin/session after a Google sign-in by an ADMIN_EMAILS account — either
    as `Authorization: Bearer <token>` or `X-Admin-Token: <token>`.
    """
    if not settings.admin_token:
        raise HTTPException(503, "Admin API is not configured on this deployment.")
    presented = ""
    if authorization and authorization.lower().startswith("bearer "):
        presented = authorization[7:].strip()
    elif x_admin_token:
        presented = x_admin_token.strip()
    if settings.check_admin_token(presented):
        return "admin-token"
    email = programme.read_admin_session(presented, settings.admin_token, settings.admin_emails)
    if email:
        return email
    raise HTTPException(401, "Unauthorized")


# --------------------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------------------

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "AADRIQUE API", "status": "ok", "version": SEED_VERSION}


@api_router.get("/health")
async def health():
    """Liveness + database readiness. Used by containers, load balancers and uptime checks."""
    try:
        await client.admin.command("ping")
        database = "ok"
    except Exception as e:  # noqa: BLE001
        logger.error("Health check DB ping failed: %s", e)
        database = "unavailable"
    payload = {
        "status": "ok" if database == "ok" else "degraded",
        "database": database,
        "email": "enabled" if settings.email_enabled else "disabled",
        "environment": settings.environment,
        "time": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(payload, status_code=200 if database == "ok" else 503)


@api_router.get("/services")
async def list_services():
    return await db.services.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/services/{slug}")
async def get_service(slug: str):
    doc = await db.services.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Service not found")
    return doc


@api_router.get("/industries")
async def list_industries():
    return await db.industries.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/industries/{slug}")
async def get_industry(slug: str):
    doc = await db.industries.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Industry not found")
    return doc


@api_router.get("/case-studies")
async def list_case_studies(sector: Optional[str] = Query(default=None, max_length=80)):
    q = {"sector": sector} if sector else {}
    return await db.case_studies.find(q, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/case-studies/{slug}")
async def get_case_study(slug: str):
    doc = await db.case_studies.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Case study not found")
    return doc


@api_router.get("/products")
async def list_products():
    return await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Product not found")
    return doc


@api_router.get("/growth")
async def get_growth():
    """The growth ecosystem page: marketing → voice qualification → sales close."""
    doc = await db.growth.find_one({}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Growth content not found")
    return doc


@api_router.get("/posts")
async def list_posts(category: Optional[str] = Query(default=None, max_length=80)):
    q = {"category": category} if category else {}
    return await db.posts.find(q, {"_id": 0}).sort("date", -1).to_list(100)


@api_router.get("/posts/{slug}")
async def get_post(slug: str):
    doc = await db.posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Post not found")
    return doc


@api_router.get("/faqs")
async def list_faqs():
    return await db.faqs.find({}, {"_id": 0}).sort("order", 1).to_list(50)


@api_router.get("/testimonials")
async def list_testimonials():
    return await db.testimonials.find({}, {"_id": 0}).to_list(20)


@api_router.post("/contact")
async def submit_contact(enquiry: ContactEnquiry, request: Request, background: BackgroundTasks):
    if enquiry.website:
        logger.info("Honeypot triggered from %s", client_ip(request))
        return {"ok": True}  # silently accept so the bot does not retry

    if rate_limit_exceeded(client_ip(request)):
        raise HTTPException(429, "Too many requests. Please try again in a minute.")

    doc = enquiry.model_dump(exclude={"website"})
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.enquiries.insert_one(dict(doc))

    if settings.email_enabled:
        background.add_task(
            send_email,
            settings.owner_email,
            f"New enquiry from {doc['name']}" + (f" — {doc['company']}" if doc.get("company") else ""),
            owner_notification_html(doc),
            doc["email"],
        )
        background.add_task(
            send_email,
            doc["email"],
            "We've received your enquiry — AADRIQUE",
            auto_reply_html(doc),
            settings.owner_email,
        )

    return {"ok": True, "id": doc["id"]}


@api_router.get("/enquiries", dependencies=[Depends(require_admin)])
async def list_enquiries(
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
):
    """Stored enquiries — personal data, admin token required."""
    total = await db.enquiries.count_documents({})
    items = (
        await db.enquiries.find({}, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {"total": total, "limit": limit, "skip": skip, "items": items}


# --------------------------------------------------------------------------------------
# AI Engineering Programme — Google Sign-In applications
# --------------------------------------------------------------------------------------

# Higher than the contact form's: a whole college lab can share one public IP, and
# each applicant makes two calls (sign-in lookup + submit). Google verification is
# the real gate against abuse here.
PROGRAMME_RATE_LIMIT = 30


async def google_claims(credential: str) -> dict:
    """Verify a Google ID token or fail the request with a clear status."""
    if not settings.google_client_id:
        raise HTTPException(503, "Applications are not open online yet. Please use the contact form.")
    try:
        return await run_in_threadpool(
            programme.verify_google_credential, credential, settings.google_client_id
        )
    except GoogleAuthError as e:
        logger.info("Rejected Google credential: %s", e)
        raise HTTPException(401, "Your Google sign-in has expired or is invalid. Please sign in again.")
    except GoogleUnavailableError as e:
        logger.error("Could not reach Google to verify a sign-in: %s", e)
        raise HTTPException(503, "We couldn't reach Google to verify your sign-in. Please try again shortly.")


async def _seats_paid() -> int:
    """Confirmed admissions: fully paid and not revoked."""
    return await db.programme_applications.count_documents({"payment_status": "verified", "status": {"$ne": "revoked"}})


async def _early_bird_claimed() -> int:
    """Early-bird seats held: early-bird plan, a live payment (reported/partial/paid), not revoked."""
    return await db.programme_applications.count_documents({
        "fee_plan": "early_bird",
        "status": {"$ne": "revoked"},
        "payment_status": {"$in": list(programme.ACTIVE_PAYMENT_STATES)},
    })


async def _current_plan() -> str:
    """Today's price: early-bird until its seats are claimed, then regular."""
    return "early_bird" if await _early_bird_claimed() < programme.EARLY_BIRD_SEATS else "regular"


@api_router.get("/programme/config")
async def programme_config():
    """Public: Sign-in config, fee, payment link and real early-bird availability."""
    try:
        claimed = await _early_bird_claimed()
    except Exception as e:  # noqa: BLE001 — availability is a nice-to-have; never break the page
        logger.error("Could not count early-bird seats: %s", e)
        claimed = None
    plan = "early_bird" if claimed is None or claimed < programme.EARLY_BIRD_SEATS else "regular"
    return {
        "early_bird": {
            "total": programme.EARLY_BIRD_SEATS,
            "left": None if claimed is None else max(0, programme.EARLY_BIRD_SEATS - claimed),
            "open": plan == "early_bird",
        },
        "regular_fee": programme.fee_breakdown("regular"),
        "enabled": bool(settings.google_client_id),
        "google_client_id": settings.google_client_id or None,
        "cohort": programme.COHORT,
        "fee": programme.fee_breakdown(plan),
        "payment_link": settings.razorpay_payment_link or None,
    }


@api_router.post("/programme/session")
async def programme_session(body: CredentialIn, request: Request):
    """Exchange a Google credential for the student's profile and any existing application."""
    if rate_limit_exceeded(f"programme:{client_ip(request)}", PROGRAMME_RATE_LIMIT):
        raise HTTPException(429, "Too many requests. Please try again in a minute.")
    claims = await google_claims(body.credential)
    doc = await db.programme_applications.find_one({"google_sub": claims["sub"]}, {"_id": 0})
    return {
        "profile": programme.profile_from_claims(claims),
        "application": programme.public_application(doc, await _current_plan()),
    }


@api_router.post("/programme/applications")
async def submit_programme_application(
    app_in: ProgrammeApplication, request: Request, background: BackgroundTasks
):
    """Create or update the signed-in student's application (one per Google account)."""
    if app_in.website:
        logger.info("Programme honeypot triggered from %s", client_ip(request))
        return {"ok": True}
    if rate_limit_exceeded(f"programme:{client_ip(request)}", PROGRAMME_RATE_LIMIT):
        raise HTTPException(429, "Too many requests. Please try again in a minute.")

    claims = await google_claims(app_in.credential)
    profile = programme.profile_from_claims(claims)
    now = datetime.now(timezone.utc).isoformat()
    fields = {k: getattr(app_in, k) for k in programme.APPLICATION_FIELDS}

    result = await db.programme_applications.update_one(
        {"google_sub": claims["sub"]},
        {
            "$set": {
                **fields,
                "email": profile["email"],
                "google_name": profile["name"],
                "picture": profile["picture"],
                "updated_at": now,
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "google_sub": claims["sub"],
                "cohort": programme.COHORT,
                "status": "applied",
                "payments": [],
                "payment_status": "unpaid",
                "amount_paid": 0,
                "amount_pending": 0,
                "created_at": now,
            },
        },
        upsert=True,
    )
    is_new = result.upserted_id is not None
    doc = await db.programme_applications.find_one({"google_sub": claims["sub"]}, {"_id": 0})

    if settings.email_enabled:
        background.add_task(
            send_email,
            settings.owner_email,
            ("New programme application: " if is_new else "Programme application updated: ")
            + f"{doc['full_name']} — {doc['college']}",
            programme.owner_application_html(doc, is_new),
            doc["email"],
        )
        if is_new:
            background.add_task(
                send_email,
                doc["email"],
                "Application received — Complete AI Engineering Programme",
                programme.student_confirmation_html(doc),
                settings.owner_email,
            )

    return {"ok": True, "created": is_new, "application": programme.public_application(doc, await _current_plan())}


async def _save_payments(app_id: str, payments: list, plan: str, extra: Optional[dict] = None) -> dict:
    """Persist the transactions, the fields derived from them and the price plan.

    The plan stays locked while the student has a live payment; if every payment is
    rejected the lock (and any early-bird seat it held) is released.
    """
    now = datetime.now(timezone.utc).isoformat()
    summary = programme.summarize_payments(payments, plan)
    locked = summary["payment_status"] in programme.ACTIVE_PAYMENT_STATES
    await db.programme_applications.update_one(
        {"id": app_id},
        {"$set": {
            "payments": payments, **summary,
            "fee_plan": plan if locked else None,
            "fee_total": programme.fee_breakdown(plan)["total"] if locked else None,
            **(extra or {}), "updated_at": now,
        }},
    )
    return await db.programme_applications.find_one({"id": app_id}, {"_id": 0})


@api_router.post("/programme/payment")
async def report_programme_payment(body: PaymentReport, request: Request, background: BackgroundTasks):
    """The signed-in student reports a Razorpay transaction for the team to verify.

    A student may report several (e.g. a deposit, then the balance). Each transaction
    ID can be claimed once across all applications.
    """
    if rate_limit_exceeded(f"programme:{client_ip(request)}", PROGRAMME_RATE_LIMIT):
        raise HTTPException(429, "Too many requests. Please try again in a minute.")
    claims = await google_claims(body.credential)
    doc = await db.programme_applications.find_one({"google_sub": claims["sub"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Please submit your application before reporting a payment.")
    if doc.get("status") == "revoked":
        raise HTTPException(403, "This application has been cancelled. Please contact us.")
    locked = doc.get("fee_plan") and doc.get("payment_status") in programme.ACTIVE_PAYMENT_STATES
    # First live payment locks today's price (early-bird while seats remain). Two
    # students claiming the last seat in the same instant could both get it; at
    # this volume that's an acceptable edge, and the team sees it in /admin.
    plan = doc["fee_plan"] if locked else await _current_plan()
    if programme.summarize_payments(doc.get("payments"), plan)["payment_status"] == "verified":
        raise HTTPException(409, "Your fee is fully paid — your seat is confirmed.")

    ref_rx = {"$regex": f"^{re.escape(body.reference)}$", "$options": "i"}
    clash = await db.programme_applications.find_one({"payments.reference": ref_rx}, {"_id": 0, "id": 1, "google_sub": 1})
    if clash:
        if clash.get("google_sub") == claims["sub"]:
            raise HTTPException(409, "You've already submitted this transaction ID.")
        logger.warning("Transaction %s claimed by %s but already on application %s", body.reference, claims["email"], clash["id"])
        raise HTTPException(409, "This transaction ID has already been submitted. If it's yours, please contact us.")

    txn = {
        "id": str(uuid.uuid4()),
        "reference": body.reference,
        "amount_reported": round(body.amount, 2),
        "amount_verified": None,
        "status": "reported",
        "reported_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": None,
        "verified_by": None,
        "note": None,
    }
    doc = await _save_payments(doc["id"], (doc.get("payments") or []) + [txn], plan)
    if settings.email_enabled:
        background.add_task(
            send_email,
            settings.owner_email,
            f"Payment reported: {doc['full_name']} — ₹{txn['amount_reported']:,.2f} — {txn['reference']}",
            programme.owner_payment_html(doc, txn),
            doc["email"],
        )
    return {"ok": True, "application": programme.public_application(doc, plan)}


# ---- Admin dashboard ----

@api_router.post("/admin/session")
async def admin_session(body: CredentialIn, request: Request):
    """Exchange a Google sign-in for an admin session — only for ADMIN_EMAILS accounts."""
    if rate_limit_exceeded(f"admin:{client_ip(request)}", PROGRAMME_RATE_LIMIT):
        raise HTTPException(429, "Too many requests. Please try again in a minute.")
    if not settings.admin_token or not settings.admin_emails:
        raise HTTPException(503, "Admin sign-in is not configured on this deployment.")
    claims = await google_claims(body.credential)
    email = claims["email"].lower()
    if email not in settings.admin_emails:
        logger.warning("Admin sign-in refused for %s", email)
        raise HTTPException(403, f"{email} doesn't have admin access.")
    session = programme.issue_admin_session(email, settings.admin_token)
    return {**session, "name": claims.get("name") or "", "picture": claims.get("picture") or ""}


@api_router.get("/admin/me")
async def admin_me(who: str = Depends(require_admin)):
    return {"email": who}


def _application_query(
    q: Optional[str], status: Optional[str] = None, payment_status: Optional[str] = None
) -> dict:
    clauses = []
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        clauses.append(
            {"$or": [{k: rx} for k in ("full_name", "email", "phone", "college", "branch", "city", "payments.reference")]}
        )
    if status:
        clauses.append({"status": status})
    if payment_status:
        # Records created before payment tracking have no field — they're unpaid.
        clauses.append(
            {"payment_status": {"$in": [None, "unpaid"]}} if payment_status == "unpaid" else {"payment_status": payment_status}
        )
    return {"$and": clauses} if clauses else {}


@api_router.get("/programme/stats", dependencies=[Depends(require_admin)])
async def programme_stats():
    """Headline numbers for the admin dashboard."""
    col = db.programme_applications
    since = (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)).isoformat()

    async def group(field: str) -> dict:
        rows = await col.aggregate([{"$group": {"_id": f"${field}", "n": {"$sum": 1}}}]).to_list(50)
        # Missing values (records older than the field) count as the default.
        blank = "unpaid" if field == "payment_status" else "—"
        out: dict = {}
        for r in rows:
            key = r["_id"] or blank
            out[key] = out.get(key, 0) + r["n"]
        return out

    sums = await col.aggregate([
        {"$match": {"status": {"$ne": "revoked"}}},
        {"$group": {"_id": None, "paid": {"$sum": {"$ifNull": ["$amount_paid", 0]}},
                    "pending": {"$sum": {"$ifNull": ["$amount_pending", 0]}}}},
    ]).to_list(1)
    return {
        "total": await col.count_documents({}),
        "today": await col.count_documents({"created_at": {"$gte": since}}),
        "by_status": await group("status"),
        "by_payment": await group("payment_status"),
        "by_year": await group("year_of_study"),
        "by_python": await group("python_level"),
        "seats_paid": await _seats_paid(),
        "early_bird_claimed": await _early_bird_claimed(),
        "early_bird_seats": programme.EARLY_BIRD_SEATS,
        "collected": round(sums[0]["paid"], 2) if sums else 0,
        "pending_amount": round(sums[0]["pending"], 2) if sums else 0,
        "fee": programme.fee_breakdown(await _current_plan()),
    }


@api_router.post("/programme/applications/{app_id}/update")
async def update_programme_application(app_id: str, body: AdminUpdate, who: str = Depends(require_admin)):
    """Team updates: admission status (incl. revoking a seat) and notes."""
    doc = await db.programme_applications.find_one({"id": app_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Application not found.")
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    now = datetime.now(timezone.utc).isoformat()
    if changes.get("status") == "revoked" and doc.get("status") != "revoked":
        changes["revoked_at"] = now
        changes["revoked_by"] = who
    changes["updated_at"] = now
    await db.programme_applications.update_one({"id": app_id}, {"$set": changes})
    doc = await db.programme_applications.find_one({"id": app_id}, {"_id": 0, "google_sub": 0})
    logger.info("Application %s updated by %s: %s", app_id, who, sorted(changes))
    return {"ok": True, "application": doc}


@api_router.post("/programme/applications/{app_id}/payments/{txn_id}")
async def review_programme_payment(
    app_id: str, txn_id: str, body: TxnUpdate, background: BackgroundTasks, who: str = Depends(require_admin)
):
    """Verify (with the amount actually received) or reject one reported transaction."""
    doc = await db.programme_applications.find_one({"id": app_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Application not found.")
    payments = doc.get("payments") or []
    txn = next((p for p in payments if p.get("id") == txn_id), None)
    if not txn:
        raise HTTPException(404, "Transaction not found.")

    plan = doc.get("fee_plan") or await _current_plan()
    was_paid = programme.summarize_payments(payments, plan)["payment_status"] == "verified"
    now = datetime.now(timezone.utc).isoformat()
    txn.update({
        "status": body.status,
        "amount_verified": round(body.amount if body.amount is not None else txn["amount_reported"], 2)
        if body.status == "verified" else None,
        "verified_at": now,
        "verified_by": who,
        "note": body.note if body.note is not None else txn.get("note"),
    })
    now_paid = programme.summarize_payments(payments, plan)["payment_status"] == "verified"
    extra = {}
    # Paying in full confirms the seat (unless the team has revoked it).
    if now_paid and not was_paid and doc.get("status") not in ("revoked", "confirmed"):
        extra["status"] = "confirmed"
    doc = await _save_payments(app_id, payments, plan, extra)
    doc.pop("google_sub", None)

    if now_paid and not was_paid and settings.email_enabled and doc.get("status") != "revoked":
        background.add_task(
            send_email,
            doc["email"],
            "Seat confirmed — Complete AI Engineering Programme",
            programme.student_payment_verified_html(doc),
            settings.owner_email,
        )
    logger.info("Transaction %s on %s marked %s by %s", txn["reference"], app_id, body.status, who)
    return {"ok": True, "application": doc}


async def _transactions(q: Optional[str], status: Optional[str], limit: int) -> list:
    pipeline: list = [{"$unwind": "$payments"}]
    match: dict = {}
    if status:
        match["payments.status"] = status
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        match["$or"] = [{"payments.reference": rx}, {"full_name": rx}, {"email": rx}, {"phone": rx}, {"college": rx}]
    if match:
        pipeline.append({"$match": match})
    pipeline += [
        {"$sort": {"payments.reported_at": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0, "application_id": "$id", "full_name": 1, "email": 1, "phone": 1, "college": 1,
            "status": 1, "payment_status": 1, "amount_paid": 1, "balance_due": 1, "txn": "$payments",
        }},
    ]
    return await db.programme_applications.aggregate(pipeline).to_list(limit)


@api_router.get("/programme/transactions", dependencies=[Depends(require_admin)])
async def list_programme_transactions(
    q: Optional[str] = Query(default=None, max_length=120),
    status: Optional[str] = Query(default=None, max_length=20),
    limit: int = Query(default=500, ge=1, le=2000),
):
    """Every reported Razorpay transaction with the student beside it — for reconciliation."""
    return {"items": await _transactions(q, status, limit)}


@api_router.get("/programme/transactions.csv", dependencies=[Depends(require_admin)])
async def export_programme_transactions():
    rows = await _transactions(None, None, 100_000)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    return Response(
        programme.transactions_csv(rows),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="programme-transactions-{stamp}.csv"'},
    )


@api_router.get("/programme/applications", dependencies=[Depends(require_admin)])
async def list_programme_applications(
    q: Optional[str] = Query(default=None, max_length=120),
    status: Optional[str] = Query(default=None, max_length=40),
    payment_status: Optional[str] = Query(default=None, max_length=40),
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    """Student applications — personal data, admin token required."""
    query = _application_query(q, status, payment_status)
    total = await db.programme_applications.count_documents(query)
    items = (
        await db.programme_applications.find(query, {"_id": 0, "google_sub": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {"total": total, "limit": limit, "skip": skip, "items": items}


@api_router.get("/programme/applications.csv", dependencies=[Depends(require_admin)])
async def export_programme_applications():
    """All applications as a spreadsheet-ready CSV — admin token required."""
    docs = (
        await db.programme_applications.find({}, {"_id": 0, "google_sub": 0})
        .sort("created_at", -1)
        .to_list(None)
    )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    return Response(
        programme.applications_csv(docs),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="programme-applications-{stamp}.csv"'},
    )


# --------------------------------------------------------------------------------------
# Startup / seeding
# --------------------------------------------------------------------------------------

async def ensure_indexes():
    await db.meta.create_index("key", unique=True)
    for name in ("services", "industries", "case_studies", "products", "posts"):
        await db[name].create_index("slug", unique=True)
    await db.case_studies.create_index("sector")
    await db.posts.create_index([("date", -1)])
    await db.enquiries.create_index([("created_at", -1)])
    await db.enquiries.create_index("email")
    await db.programme_applications.create_index("google_sub", unique=True)
    await db.programme_applications.create_index([("created_at", -1)])
    await db.programme_applications.create_index("email")
    await db.programme_applications.create_index("payments.reference")


async def seed_database():
    """Idempotent seed. The meta lock makes it safe to run with multiple workers."""
    meta = await db.meta.find_one({"key": "seed_version"})
    if meta and meta.get("value") == SEED_VERSION:
        return

    try:
        # Unique index on meta.key turns concurrent claims into a DuplicateKeyError
        # for every worker but the winner.
        await db.meta.update_one(
            {"key": "seed_lock", "version": {"$ne": SEED_VERSION}},
            {"$set": {"version": SEED_VERSION, "at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    except DuplicateKeyError:
        logger.info("Seed already claimed by another worker — skipping.")
        return

    for name in ("services", "industries", "case_studies", "products", "growth", "posts", "faqs", "testimonials"):
        await db[name].delete_many({})
    await db.services.insert_many([{**s, "order": i} for i, s in enumerate(SERVICES)])
    await db.industries.insert_many([{**s, "order": i} for i, s in enumerate(INDUSTRIES)])
    await db.case_studies.insert_many([{**s, "order": i} for i, s in enumerate(CASE_STUDIES)])
    await db.products.insert_many([{**s, "order": i} for i, s in enumerate(PRODUCTS)])
    await db.growth.insert_one(dict(GROWTH))
    await db.posts.insert_many([dict(p) for p in POSTS])
    await db.faqs.insert_many([{**s, "order": i} for i, s in enumerate(FAQS)])
    await db.testimonials.insert_many([dict(t) for t in TESTIMONIALS])
    await db.meta.update_one({"key": "seed_version"}, {"$set": {"value": SEED_VERSION}}, upsert=True)
    logger.info("Seeded database, version %s", SEED_VERSION)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await client.admin.command("ping")
        logger.info("Connected to MongoDB database '%s'", settings.db_name)
        await ensure_indexes()
        if settings.seed_on_startup:
            await seed_database()
    except Exception as e:  # noqa: BLE001 — never block boot; /api/health reports the truth
        logger.error("Startup database work failed: %s", e)
    yield
    client.close()


app = FastAPI(
    title="AADRIQUE API",
    version=SEED_VERSION,
    lifespan=lifespan,
    docs_url=settings.docs_url,
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
    # Lets the admin page read the CSV export's filename when the API is cross-origin.
    expose_headers=["Content-Disposition"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    # Stored enquiries and student applications must never sit in a shared cache.
    if request.url.path.startswith(("/api/enquiries", "/api/programme/", "/api/admin/")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the detail, return an opaque message — stack traces are not a public API."""
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse({"detail": "Internal server error"}, status_code=500)
