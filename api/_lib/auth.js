// دخول صاحب المقهى: كلمة سر واحدة محفوظة في Vercel باسم ADMIN_PASSWORD (لا تُكتب في الكود أبداً).
// بعد الدخول يُحفظ في المتصفح «ختم» موقّع صالح 30 يوماً. تغيير كلمة السر يُبطل كل الأختام القديمة.
import crypto from "node:crypto";

const COOKIE = "coup_admin";
const DAYS = 30;
const password = () => process.env.ADMIN_PASSWORD || "";
const secureFlag = () => (process.env.VERCEL ? "; Secure" : "");
const sign = exp => crypto.createHmac("sha256", "coup-admin:" + password()).update(String(exp)).digest("base64url");
const sha = s => crypto.createHash("sha256").update(String(s)).digest();

export function passwordConfigured() { return password().length > 0; }

export function checkPassword(input) {
  if (!passwordConfigured() || typeof input !== "string") return false;
  return crypto.timingSafeEqual(sha(input), sha(password()));
}

export function sessionCookie() {
  const exp = Date.now() + DAYS * 864e5;
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DAYS * 86400}${secureFlag()}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag()}`;
}

export function isAuthed(request) {
  if (!passwordConfigured()) return false;
  const raw = request.headers.get("cookie") || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// طلبات التعديل يجب أن تأتي من اللوحة نفسها (حماية من صفحات خارجية)
export function fromPanel(request) { return request.headers.get("x-coup-admin") === "1"; }

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
