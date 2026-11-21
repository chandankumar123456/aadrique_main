"""Tests for AI Engineering Programme applications (Google Sign-In).

Three layers:
- TestGoogleVerification: the real google-auth verification path, with tokens
  signed by a locally generated key and Google's cert fetch pointed at it.
- TestProgrammeApiLive: the running API (same setup as backend_test.py).
- TestProgrammeFlowInProcess: the full sign-in → apply → update → admin export
  flow in-process, with token verification stubbed (no real Google account).
"""
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from cryptography import x509  # noqa: E402
from cryptography.hazmat.primitives import hashes, serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from cryptography.x509.oid import NameOID  # noqa: E402
from google.auth import crypt, jwt  # noqa: E402

import programme  # noqa: E402

# Captured before any fixture stubs it, so verification tests always exercise the
# real google-auth path regardless of test order.
REAL_VERIFY = programme.verify_google_credential

BASE_URL = os.environ.get(
    "API_BASE_URL", os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000")
).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
admin_only = pytest.mark.skipif(not ADMIN_TOKEN, reason="ADMIN_TOKEN not set")

CLIENT_ID = "1234567890-test.apps.googleusercontent.com"

VALID_FORM = {
    "full_name": "Test Student",
    "phone": "+91 98765 43210",
    "college": "Test Institute of Technology",
    "year_of_study": "3rd year",
    "branch": "CSE",
    "city": "Hyderabad",
    "python_level": "Beginner",
    "goals": "Build a RAG assistant.",
    "heard_from": "Instagram",
    "consent": True,
}


# ---------- Google ID token verification ----------
@pytest.fixture(scope="module")
def google_keys(monkeypatch_module):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test")])
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    pem_key = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    signer = crypt.RSASigner.from_string(pem_key, key_id="test-kid")
    certs = {"test-kid": cert.public_bytes(serialization.Encoding.PEM).decode()}
    monkeypatch_module.setattr("google.oauth2.id_token._fetch_certs", lambda *a, **k: certs)
    return signer


@pytest.fixture(scope="module")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


def make_token(signer, **overrides):
    now = int(time.time())
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "1100220033",
        "email": "Student@Example.com",
        "email_verified": True,
        "name": "Test Student",
        "picture": "https://example.com/p.png",
        "iat": now,
        "exp": now + 3600,
    }
    claims.update(overrides)
    return jwt.encode(signer, claims).decode()


class TestGoogleVerification:
    def test_valid_token(self, google_keys):
        claims = REAL_VERIFY(make_token(google_keys), CLIENT_ID)
        assert claims["sub"] == "1100220033"
        assert programme.profile_from_claims(claims)["email"] == "student@example.com"

    def test_wrong_audience_rejected(self, google_keys):
        with pytest.raises(programme.GoogleAuthError):
            REAL_VERIFY(make_token(google_keys, aud="someone-else"), CLIENT_ID)

    def test_expired_rejected(self, google_keys):
        old = int(time.time()) - 7200
        with pytest.raises(programme.GoogleAuthError):
            REAL_VERIFY(make_token(google_keys, iat=old, exp=old + 3600), CLIENT_ID)

    def test_wrong_issuer_rejected(self, google_keys):
        with pytest.raises(programme.GoogleAuthError):
            REAL_VERIFY(make_token(google_keys, iss="https://evil.example"), CLIENT_ID)

    def test_unverified_email_rejected(self, google_keys):
        with pytest.raises(programme.GoogleAuthError):
            REAL_VERIFY(make_token(google_keys, email_verified=False), CLIENT_ID)

    def test_garbage_rejected(self, google_keys):
        with pytest.raises(programme.GoogleAuthError):
            REAL_VERIFY("not-a-jwt", CLIENT_ID)


class TestCsv:
    def test_formula_injection_neutralised(self):
        out = programme.applications_csv([{"full_name": "=HYPERLINK(\"x\")", "phone": "+91 1"}])
        assert "'=HYPERLINK" in out
        assert "'+91 1" in out
        assert out.startswith("﻿Applied at,")


# ---------- Live API ----------
@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


class TestProgrammeApiLive:
    def test_config_is_public(self, s):
        r = s.get(f"{API}/programme/config")
        assert r.status_code == 200
        body = r.json()
        assert set(body) == {"enabled", "google_client_id", "cohort", "fee", "payment_link", "early_bird", "regular_fee"}
        assert body["regular_fee"]["total"] == 17999.0
        assert body["early_bird"]["total"] == 20 and 0 <= body["early_bird"]["left"] <= 20
        assert body["fee"]["total"] == 14999.0

    def test_invalid_credential_rejected(self, s):
        enabled = s.get(f"{API}/programme/config").json()["enabled"]
        r = s.post(f"{API}/programme/session", json={"credential": "x" * 40})
        assert r.status_code == (401 if enabled else 503)

    def test_application_validation(self, s):
        r = s.post(f"{API}/programme/applications", json={**VALID_FORM, "credential": "x" * 40, "consent": False})
        assert r.status_code == 422
        r = s.post(f"{API}/programme/applications", json={**VALID_FORM, "credential": "x" * 40, "phone": "abc"})
        assert r.status_code == 422

    def test_forged_application_not_stored(self, s):
        r = s.post(f"{API}/programme/applications", json={**VALID_FORM, "credential": "x" * 40})
        assert r.status_code in (401, 503)

    def test_admin_list_requires_token(self, s):
        assert s.get(f"{API}/programme/applications").status_code in (401, 503)
        assert s.get(f"{API}/programme/applications.csv").status_code in (401, 503)

    @admin_only
    def test_admin_list_and_csv(self, s):
        h = {"X-Admin-Token": ADMIN_TOKEN}
        r = s.get(f"{API}/programme/applications", headers=h)
        assert r.status_code == 200
        assert r.headers.get("cache-control") == "no-store"
        assert {"total", "items"} <= set(r.json())
        r = s.get(f"{API}/programme/applications.csv", headers=h)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/csv")
        assert "attachment" in r.headers["content-disposition"]


# ---------- Full flow, in-process ----------
@pytest.fixture(scope="module")
def flow_client():
    os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
    os.environ.setdefault("ADMIN_TOKEN", "test-token-long-enough-for-validation")
    from fastapi.testclient import TestClient

    import server

    mp = pytest.MonkeyPatch()
    mp.setattr(server.settings, "google_client_id", CLIENT_ID)
    mp.setattr(server.settings, "seed_on_startup", False)
    mp.setattr(server.settings, "resend_api_key", "")
    mp.setattr(server.settings, "admin_token", "test-token-long-enough-for-validation")
    mp.setattr(server.settings, "admin_emails", ["boss@example.com"])
    sub = f"flow-{uuid.uuid4().hex}"
    people = {
        "good-credential-for-flow-test": {"sub": sub, "email": "Flow@Example.com", "name": "Flow Student"},
        "admin-credential-for-flow-test": {"sub": "admin-1", "email": "Boss@Example.com", "name": "Boss"},
        "outsider-credential-for-flow-test": {"sub": "out-1", "email": "nosy@example.com", "name": "Nosy"},
    }

    def fake_verify(credential, client_id):
        if credential.startswith("bulk-student-"):
            n = credential.split("-")[2]
            return {"sub": f"bulk-{n}", "email": f"bulk{n}@example.com", "name": f"Bulk {n}", "email_verified": True}
        if credential not in people:
            raise programme.GoogleAuthError("bad")
        return {**people[credential], "email_verified": True}

    mp.setattr(programme, "verify_google_credential", fake_verify)
    # Each xdist worker gets its own throwaway database, so seat counts and
    # payment state from tests running in parallel can't interfere.
    worker = os.environ.get("PYTEST_XDIST_WORKER", "main")
    db_name = f"{server.settings.db_name}_flow_{worker}"
    mp.setattr(server, "db", server.client[db_name])
    with TestClient(server.app) as c:
        try:
            c.get("/api/health").raise_for_status()
        except Exception:  # noqa: BLE001
            pytest.skip("MongoDB not reachable for the in-process flow test")
        c.portal.call(server.client.drop_database, db_name)
        c.portal.call(server.ensure_indexes)
        yield c, sub, server
        c.portal.call(server.client.drop_database, db_name)
    mp.undo()


class TestProgrammeFlowInProcess:
    CRED = "good-credential-for-flow-test"

    def test_full_flow(self, flow_client):
        c, sub, server = flow_client
        admin = {"X-Admin-Token": server.settings.admin_token}

        r = c.post("/api/programme/session", json={"credential": self.CRED})
        assert r.status_code == 200, r.text
        assert r.json() == {
            "profile": {"name": "Flow Student", "email": "flow@example.com", "picture": ""},
            "application": None,
        }

        r = c.post("/api/programme/applications", json={**VALID_FORM, "credential": self.CRED})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["created"] is True
        app_id = body["application"]["id"]
        assert body["application"]["email"] == "flow@example.com"
        assert "google_sub" not in body["application"]

        # Re-applying updates the same record instead of creating a duplicate.
        r = c.post("/api/programme/applications", json={**VALID_FORM, "credential": self.CRED, "branch": "ECE"})
        assert r.status_code == 200
        assert r.json()["created"] is False
        assert r.json()["application"]["id"] == app_id
        assert r.json()["application"]["branch"] == "ECE"

        r = c.post("/api/programme/session", json={"credential": self.CRED})
        assert r.json()["application"]["branch"] == "ECE"

        r = c.get("/api/programme/applications", params={"q": "flow@example"}, headers=admin)
        assert r.status_code == 200
        matches = [i for i in r.json()["items"] if i["id"] == app_id]
        assert len(matches) == 1 and "google_sub" not in matches[0]

        r = c.get("/api/programme/applications.csv", headers=admin)
        assert app_id in r.text

    def test_bad_credential_cannot_write(self, flow_client):
        c, _, _ = flow_client
        r = c.post("/api/programme/applications", json={**VALID_FORM, "credential": "x" * 40})
        assert r.status_code == 401


class TestGoogleUnavailable:
    def test_cert_fetch_failure_is_distinct(self, monkeypatch):
        from google.auth import exceptions

        def boom(*a, **k):
            raise exceptions.TransportError("network down")

        monkeypatch.setattr("google.oauth2.id_token._fetch_certs", boom)
        # A well-formed (unsigned-check) token reaches the cert fetch step.
        with pytest.raises(programme.GoogleUnavailableError):
            REAL_VERIFY("eyJhbGciOiJSUzI1NiIsImtpZCI6IngifQ.eyJ4IjoxfQ.c2ln", CLIENT_ID)


# ---------- Fee, payment reports, admin sessions ----------
class TestFeeAndSessions:
    def test_fee_is_flat_while_gst_is_off(self):
        fee = programme.fee_breakdown()
        assert fee["base"] == 14999.0
        assert fee["gst"] == 0
        assert fee["total"] == 14999.0
        assert fee["total_paise"] == 1499900

    def test_gst_switch_still_computes(self, monkeypatch):
        monkeypatch.setattr(programme, "GST_RATE_PERCENT", 18)
        fee = programme.fee_breakdown()
        assert (fee["gst"], fee["total"]) == (2699.82, 17698.82)

    def test_short_application_is_enough(self):
        minimal = {k: v for k, v in VALID_FORM.items() if k not in ("python_level", "city", "goals", "heard_from")}
        app = programme.ProgrammeApplication(credential="x" * 30, **minimal)
        assert app.python_level == ""
        with pytest.raises(ValueError):
            programme.ProgrammeApplication(credential="x" * 30, **{**minimal, "python_level": "Wizard"})

    def test_payment_report_validation(self):
        ok = programme.PaymentReport(credential="x" * 30, reference=" pay_N8x2 kd93LmQ1 ", amount=2000)
        assert ok.reference == "pay_N8x2kd93LmQ1"
        with pytest.raises(ValueError):
            programme.PaymentReport(credential="x" * 30, reference="<script>", amount=10)
        with pytest.raises(ValueError):
            programme.PaymentReport(credential="x" * 30, reference="pay_OK1234567", amount=0)

    def test_summarize_payments(self):
        s = programme.summarize_payments
        assert s([])["payment_status"] == "unpaid"
        part = [{"reference": "pay_A", "status": "verified", "amount_verified": 2000}]
        assert s(part) | {} == {**s(part)}
        assert s(part)["payment_status"] == "partial" and s(part)["balance_due"] == 12999
        pending = part + [{"reference": "pay_B", "status": "reported", "amount_reported": 12999}]
        assert s(pending)["payment_status"] == "reported" and s(pending)["amount_pending"] == 12999
        full = part + [{"reference": "pay_B", "status": "verified", "amount_verified": 12999}]
        assert s(full)["payment_status"] == "verified" and s(full)["balance_due"] == 0
        rejected = [{"reference": "pay_C", "status": "rejected", "amount_reported": 14999}]
        assert s(rejected)["payment_status"] == "unpaid"

    def test_admin_session_roundtrip(self):
        key = "test-token-long-enough-for-validation"
        s = programme.issue_admin_session("boss@example.com", key)
        assert programme.read_admin_session(s["token"], key, ["boss@example.com"]) == "boss@example.com"

    def test_admin_session_rejects_tampering_expiry_and_removal(self):
        key = "test-token-long-enough-for-validation"
        tok = programme.issue_admin_session("boss@example.com", key)["token"]
        allowed = ["boss@example.com"]
        body, sig = tok[len("as1."):].split(".")
        forged_body = programme._b64(b'{"e":"boss@example.com","x":9999999999}')
        assert programme.read_admin_session(f"as1.{forged_body}.{sig}", key, allowed) is None
        assert programme.read_admin_session(tok, "a-different-admin-token-value", allowed) is None
        assert programme.read_admin_session(tok, key, ["someone@else.com"]) is None
        assert programme.read_admin_session(tok, key, allowed, now=time.time() + 13 * 3600) is None
        assert programme.read_admin_session("garbage", key, allowed) is None


class TestPaymentAndAdminInProcess:
    STUDENT = "good-credential-for-flow-test"

    def _ref(self):
        return f"pay_T{uuid.uuid4().hex[:13].upper()}"

    def test_partial_payments_verify_and_revoke(self, flow_client):
        c, _, server = flow_client
        r = c.post("/api/programme/applications", json={**VALID_FORM, "credential": self.STUDENT})
        assert r.status_code == 200, r.text
        app_id = r.json()["application"]["id"]
        assert c.get("/api/programme/config").json()["fee"]["total"] == 14999.0

        # Deposit, then balance — two transactions.
        dep, bal = self._ref(), self._ref()
        r = c.post("/api/programme/payment", json={"credential": self.STUDENT, "reference": dep, "amount": 2000})
        assert r.status_code == 200, r.text
        app = r.json()["application"]
        assert app["payment_status"] == "reported" and app["amount_pending"] == 2000
        assert c.post("/api/programme/payment", json={"credential": self.STUDENT, "reference": dep, "amount": 2000}).status_code == 409

        r = c.post("/api/admin/session", json={"credential": "outsider-credential-for-flow-test"})
        assert r.status_code == 403
        r = c.post("/api/admin/session", json={"credential": "admin-credential-for-flow-test"})
        assert r.status_code == 200, r.text
        auth = {"Authorization": f"Bearer {r.json()['token']}"}
        assert c.get("/api/admin/me", headers=auth).json() == {"email": "boss@example.com"}

        txn_id = c.get("/api/programme/applications", params={"q": dep}, headers=auth).json()["items"][0]["payments"][0]["id"]
        r = c.post(f"/api/programme/applications/{app_id}/payments/{txn_id}", json={"status": "verified"}, headers=auth)
        assert r.status_code == 200, r.text
        app = r.json()["application"]
        assert app["payment_status"] == "partial" and app["amount_paid"] == 2000 and app["balance_due"] == 12999
        assert app["status"] == "applied"
        assert app["payments"][0]["verified_by"] == "boss@example.com"

        r = c.post("/api/programme/payment", json={"credential": self.STUDENT, "reference": bal, "amount": 12999})
        assert r.json()["application"]["payment_status"] == "reported"
        listed = c.get("/api/programme/applications", params={"payment_status": "reported", "q": bal}, headers=auth).json()["items"]
        assert len(listed) == 1
        txn2 = [p for p in listed[0]["payments"] if p["reference"] == bal][0]["id"]
        r = c.post(f"/api/programme/applications/{app_id}/payments/{txn2}", json={"status": "verified"}, headers=auth)
        app = r.json()["application"]
        assert app["payment_status"] == "verified" and app["balance_due"] == 0
        assert app["status"] == "confirmed"

        # Fully paid: no more payments accepted.
        assert c.post("/api/programme/payment", json={"credential": self.STUDENT, "reference": self._ref(), "amount": 1}).status_code == 409

        stats = c.get("/api/programme/stats", headers=auth).json()
        assert stats["seats_paid"] >= 1 and stats["collected"] >= 14999
        assert c.get("/api/programme/config").json()["early_bird"]["left"] == 20 - stats["seats_paid"]

        # Revoke the seat: recorded, excluded from paid seats, student can't pay.
        before = stats["seats_paid"]
        r = c.post(f"/api/programme/applications/{app_id}/update", json={"status": "revoked", "admin_notes": "Duplicate account"}, headers=auth)
        assert r.json()["application"]["revoked_by"] == "boss@example.com"
        assert c.get("/api/programme/stats", headers=auth).json()["seats_paid"] == before - 1
        r = c.post("/api/programme/session", json={"credential": self.STUDENT})
        assert r.json()["application"]["status"] == "revoked"

        assert c.post(f"/api/programme/applications/{app_id}/update", json={"status": "bogus"}, headers=auth).status_code == 422
        assert c.post("/api/programme/applications/nope/update", json={"status": "contacted"}, headers=auth).status_code == 404
        assert c.post(f"/api/programme/applications/{app_id}/payments/nope", json={"status": "verified"}, headers=auth).status_code == 404
        assert c.get("/api/programme/stats", headers={"Authorization": "Bearer as1.e30.sig"}).status_code == 401

        csv_text = c.get("/api/programme/applications.csv", headers=auth).text
        assert dep in csv_text and bal in csv_text

        ledger = c.get("/api/programme/transactions", params={"q": dep}, headers=auth).json()["items"]
        assert len(ledger) == 1 and ledger[0]["txn"]["reference"] == dep and ledger[0]["full_name"] == VALID_FORM["full_name"]
        assert "google_sub" not in ledger[0]
        tcsv = c.get("/api/programme/transactions.csv", headers=auth)
        assert tcsv.headers["content-type"].startswith("text/csv") and dep in tcsv.text and bal in tcsv.text
        assert c.get("/api/programme/transactions").status_code == 401

    def test_rejected_transaction_and_clash_across_students(self, flow_client):
        c, _, server = flow_client
        auth = {"X-Admin-Token": server.settings.admin_token}
        # The outsider applies and tries to claim the boss's... no: claims a fresh ID,
        # then the flow student can't reuse it.
        outsider = "outsider-credential-for-flow-test"
        r = c.post("/api/programme/applications", json={**VALID_FORM, "credential": outsider, "full_name": "Other Student"})
        app_id = r.json()["application"]["id"]
        ref = self._ref()
        assert c.post("/api/programme/payment", json={"credential": outsider, "reference": ref, "amount": 14999}).status_code == 200
        r = c.post("/api/programme/payment", json={"credential": self.STUDENT, "reference": ref.lower(), "amount": 14999})
        assert r.status_code in (403, 409)  # 409 clash (or 403 if the flow student was revoked earlier)

        txn = c.get("/api/programme/applications", params={"q": ref}, headers=auth).json()["items"][0]["payments"][0]["id"]
        r = c.post(f"/api/programme/applications/{app_id}/payments/{txn}", json={"status": "rejected", "note": "Not in Razorpay"}, headers=auth)
        app = r.json()["application"]
        assert app["payment_status"] == "unpaid" and app["payments"][0]["note"] == "Not in Razorpay"
        c.portal.call(server.db.programme_applications.delete_many, {"id": app_id})

    def test_payment_report_requires_application(self, flow_client):
        c, _, server = flow_client
        r = c.post("/api/programme/payment", json={"credential": "admin-credential-for-flow-test", "reference": self._ref(), "amount": 100})
        assert r.status_code == 404


class TestEarlyBirdCap:
    """The early-bird price holds for the first N seats claimed, then switches to regular."""

    def test_price_switches_after_seats_claimed_and_reopens_on_release(self, flow_client, monkeypatch):
        c, _, server = flow_client
        auth = {"X-Admin-Token": server.settings.admin_token}
        run = uuid.uuid4().hex[:6]
        creds = [f"bulk-student-{run}{i}-credential-x" for i in range(3)]
        claimed_now = c.get("/api/programme/stats", headers=auth).json()["early_bird_claimed"]
        # Leave exactly two early-bird seats so the third student hits the regular price.
        monkeypatch.setattr(programme, "EARLY_BIRD_SEATS", claimed_now + 2)
        ids = []
        try:
            for cred in creds:
                r = c.post("/api/programme/applications", json={**VALID_FORM, "credential": cred})
                assert r.status_code == 200, r.text
                ids.append(r.json()["application"]["id"])
                assert r.json()["application"]["fee"]["total"] in (14999.0, 17999.0)

            # Two deposits claim the last two early-bird seats.
            for cred in creds[:2]:
                r = c.post("/api/programme/payment", json={"credential": cred, "reference": f"pay_EB{uuid.uuid4().hex[:10]}", "amount": 1000})
                assert r.status_code == 200, r.text
                app = r.json()["application"]
                assert app["fee"]["plan"] == "early_bird" and app["fee_locked"] and app["balance_due"] == 14999

            cfg = c.get("/api/programme/config").json()
            assert cfg["early_bird"]["left"] == 0 and cfg["early_bird"]["open"] is False
            assert cfg["fee"]["total"] == 17999.0

            # The third student now pays the regular fee.
            r = c.post("/api/programme/session", json={"credential": creds[2]})
            assert r.json()["application"]["fee"]["total"] == 17999.0
            r = c.post("/api/programme/payment", json={"credential": creds[2], "reference": f"pay_RG{uuid.uuid4().hex[:10]}", "amount": 17999})
            app = r.json()["application"]
            assert app["fee"]["plan"] == "regular" and app["balance_due"] == 17999

            # A locked early-bird student keeps their price even though seats are full.
            r = c.post("/api/programme/session", json={"credential": creds[0]})
            assert r.json()["application"]["fee"]["total"] == 14999.0

            # Revoking an early-bird student releases the seat.
            c.post(f"/api/programme/applications/{ids[0]}/update", json={"status": "revoked"}, headers=auth)
            cfg = c.get("/api/programme/config").json()
            assert cfg["early_bird"]["left"] == 1 and cfg["fee"]["total"] == 14999.0

            # Rejecting a student's only payment also releases their seat (and price lock).
            doc = c.get("/api/programme/applications", params={"q": f"bulk{run}1@"}, headers=auth).json()["items"][0]
            r = c.post(f"/api/programme/applications/{ids[1]}/payments/{doc['payments'][0]['id']}", json={"status": "rejected"}, headers=auth)
            assert r.json()["application"]["fee_plan"] is None
            assert c.get("/api/programme/config").json()["early_bird"]["left"] == 2
        finally:
            c.portal.call(server.db.programme_applications.delete_many, {"id": {"$in": ids}})
