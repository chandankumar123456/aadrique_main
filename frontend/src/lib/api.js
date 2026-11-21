import axios from "axios";
import { useQuery } from "@tanstack/react-query";

// An unset REACT_APP_BACKEND_URL used to produce "undefined/api/..." and break every
// request. Falling back to the current origin is the right default behind a reverse
// proxy that forwards /api to the backend.
const BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
export const API = `${BASE}/api`;

const http = axios.create({ baseURL: API, timeout: 20000 });

const get = (path) => http.get(path).then((r) => r.data);

export const useServices = () =>
  useQuery({ queryKey: ["services"], queryFn: () => get("/services") });

export const useService = (slug) =>
  useQuery({ queryKey: ["service", slug], queryFn: () => get(`/services/${slug}`), enabled: !!slug });

export const useIndustries = () =>
  useQuery({ queryKey: ["industries"], queryFn: () => get("/industries") });

export const useIndustry = (slug) =>
  useQuery({ queryKey: ["industry", slug], queryFn: () => get(`/industries/${slug}`), enabled: !!slug });

export const useCaseStudies = () =>
  useQuery({ queryKey: ["case-studies"], queryFn: () => get("/case-studies") });

export const useCaseStudy = (slug) =>
  useQuery({ queryKey: ["case-study", slug], queryFn: () => get(`/case-studies/${slug}`), enabled: !!slug });

export const useProducts = () =>
  useQuery({ queryKey: ["products"], queryFn: () => get("/products") });

export const useProduct = (slug) =>
  useQuery({ queryKey: ["product", slug], queryFn: () => get(`/products/${slug}`), enabled: !!slug });

export const useGrowth = () =>
  useQuery({ queryKey: ["growth"], queryFn: () => get("/growth") });

export const usePosts = () =>
  useQuery({ queryKey: ["posts"], queryFn: () => get("/posts") });

export const usePost = (slug) =>
  useQuery({ queryKey: ["post", slug], queryFn: () => get(`/posts/${slug}`), enabled: !!slug });

export const useFaqs = () =>
  useQuery({ queryKey: ["faqs"], queryFn: () => get("/faqs") });

export const useTestimonials = () =>
  useQuery({ queryKey: ["testimonials"], queryFn: () => get("/testimonials") });

export const submitContact = (payload) =>
  http.post("/contact", payload).then((r) => r.data);

// ── AI Engineering Programme ────────────────────────────────────────────────
// `credential` is the Google ID token from Sign in with Google; the API verifies it.

export const useProgrammeConfig = () =>
  useQuery({ queryKey: ["programme-config"], queryFn: () => get("/programme/config"), staleTime: Infinity });

export const programmeSession = (credential) =>
  http.post("/programme/session", { credential }).then((r) => r.data);

export const submitProgrammeApplication = (payload) =>
  http.post("/programme/applications", payload).then((r) => r.data);

const adminHeaders = (token) => ({ headers: { "X-Admin-Token": token } });

export const fetchProgrammeApplications = (token, params = {}) =>
  http.get("/programme/applications", { ...adminHeaders(token), params }).then((r) => r.data);

export const fetchProgrammeTransactions = (token, params = {}) =>
  http.get("/programme/transactions", { ...adminHeaders(token), params }).then((r) => r.data);

export const downloadProgrammeApplicationsCsv = (token) => downloadAdminCsv(token, "/programme/applications.csv");
export const downloadProgrammeTransactionsCsv = (token) => downloadAdminCsv(token, "/programme/transactions.csv");

const downloadAdminCsv = async (token, path) => {
  const r = await http.get(path, { ...adminHeaders(token), responseType: "blob" });
  const name = /filename="([^"]+)"/.exec(r.headers["content-disposition"] || "")?.[1] || "export.csv";
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Readable message from an API error (FastAPI returns a string or a list of field errors). */
export const apiErrorMessage = (e, fallback = "Something went wrong. Please try again.") => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg.replace(/^Value error, /, "");
  return fallback;
};

export const reportProgrammePayment = (credential, reference, amount) =>
  http.post("/programme/payment", { credential, reference, amount }).then((r) => r.data);

// ── Admin dashboard (session from Sign in with Google, allow-listed emails) ──
export const adminSession = (credential) => http.post("/admin/session", { credential }).then((r) => r.data);

export const fetchProgrammeStats = (token) => http.get("/programme/stats", adminHeaders(token)).then((r) => r.data);

export const reviewProgrammePayment = (token, appId, txnId, decision) =>
  http
    .post(`/programme/applications/${encodeURIComponent(appId)}/payments/${encodeURIComponent(txnId)}`, decision, adminHeaders(token))
    .then((r) => r.data);

export const updateProgrammeApplication = (token, id, changes) =>
  http.post(`/programme/applications/${encodeURIComponent(id)}/update`, changes, adminHeaders(token)).then((r) => r.data);
