// الدخول والصلاحيات
// ─────────────────────────────────────────────────────────────
// حسابان:
//   owner (المالك): كل شيء.
//   staff (العمال): طلبات اليوم وتغيير حالتها فقط.
// كلمات السر تُحفظ في قاعدة البيانات مُشفّرة باتجاه واحد (scrypt) — لا يمكن قراءتها.
// قبل أن يغيّر المالك كلمة سره أول مرة، تعمل كلمة السر الموجودة في Vercel (ADMIN_PASSWORD).
// ADMIN_PASSWORD يبقى دائماً «مفتاحاً رئيسياً» لاسترجاع حساب المالك إن نُسيت كلمة السر ورمز الاسترجاع معاً.
import crypto from "node:crypto";
import { get, set, del, configured as dbConfigured } from "./kv.js";

const COOKIE = "coup_admin";
const DAYS = 30;
export const ROLES = ["owner", "staff"];
const envPassword = () => process.env.ADMIN_PASSWORD || "";
const secureFlag = () => (process.env.VERCEL ? "; Secure" : "");
const sha = s => crypto.createHash("sha256").update(String(s)).digest();
const parse = v => { if (!v) return null; try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };

/* ── تشفير كلمات السر ── */
export function hashSecret(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(plain), salt, 32).toString("hex");
  return { salt, hash };
}
function verifySecret(plain, rec) {
  if (!rec || typeof plain !== "string") return false;
  const a = crypto.scryptSync(plain, rec.salt, 32), b = Buffer.from(rec.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function matchesMasterKey(plain) {
  return envPassword().length > 0 && typeof plain === "string" && crypto.timingSafeEqual(sha(plain), sha(envPassword()));
}

export async function getRecord(name) { return dbConfigured() ? parse(await get(`auth:${name}`)) : null; }
export async function setRecord(name, plain) { await set(`auth:${name}`, JSON.stringify(hashSecret(plain))); }
export async function clearRecord(name) { await del(`auth:${name}`); }

/* ── هل كلمة السر لمالك أم لعامل؟ ── */
export async function roleForPassword(plain) {
  const owner = await getRecord("owner");
  if (owner ? verifySecret(plain, owner) : matchesMasterKey(plain)) return "owner";
  const staff = await getRecord("staff");
  if (staff && verifySecret(plain, staff)) return "staff";
  return null;
}
export async function checkRecoveryCode(plain) {
  const rec = await getRecord("recovery");
  return !!rec && verifySecret(String(plain || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), rec);
}
export async function newRecoveryCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = Array.from(crypto.randomBytes(12), b => A[b % A.length]).join("");
  await setRecord("recovery", raw);
  return raw.match(/.{4}/g).join("-"); // يُعرض مرة واحدة فقط
}
export async function passwordConfigured() { return !!(await getRecord("owner")) || envPassword().length > 0; }

/* ── الجلسة: ختم موقّع، يبطل تلقائياً إذا تغيّرت كلمة سر صاحبه ── */
async function signingKey(role) {
  let secret = dbConfigured() ? await get("auth:secret") : null;
  if (!secret && dbConfigured()) { secret = crypto.randomBytes(32).toString("hex"); await set("auth:secret", secret); }
  const rec = await getRecord(role);
  return `${secret || "coup"}:${role}:${rec ? rec.hash : "env:" + envPassword()}`;
}
const sign = async (role, exp) => crypto.createHmac("sha256", await signingKey(role)).update(`${role}.${exp}`).digest("base64url");

export async function sessionCookie(role) {
  const exp = Date.now() + DAYS * 864e5;
  return `${COOKIE}=${role}.${exp}.${await sign(role, exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DAYS * 86400}${secureFlag()}`;
}
export function clearCookie() { return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag()}`; }

// يُرجع "owner" أو "staff" أو null
export async function sessionRole(request) {
  const raw = request.headers.get("cookie") || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [role, exp, sig] = m[1].split(".");
  if (!ROLES.includes(role) || !sig || !(Number(exp) > Date.now())) return null;
  if (role === "staff" && !(await getRecord("staff"))) return null; // حساب العمال أُوقف
  const a = Buffer.from(sig), b = Buffer.from(await sign(role, exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? role : null;
}

// طلبات التعديل يجب أن تأتي من اللوحة نفسها (حماية من صفحات خارجية)
export function fromPanel(request) { return request.headers.get("x-coup-admin") === "1"; }

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
