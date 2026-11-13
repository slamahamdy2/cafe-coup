// الطلبات
// POST  /api/orders            (الزبون) تسجيل طلب عند إرساله إلى واتساب أو عرضه على النادل
// GET   /api/orders?day=...    (صاحب المقهى) طلبات يوم معيّن، اليوم افتراضياً
// GET   /api/orders?archive=1  (صاحب المقهى) قائمة الأيام السابقة مع عدد الطلبات والمبالغ
// PATCH /api/orders            (صاحب المقهى) تغيير حالة طلب: جديد / قُدِّم / مدفوع / ملغى
import { sessionRole, fromPanel, json } from "./_lib/auth.js";
import { loadMenu } from "./_lib/store.js";
import { hget, hset, hgetall, incr, incrWithExpiry, sadd, smembers } from "./_lib/kv.js";

const STATUSES = ["new", "served", "paid", "cancelled"];
const today = () => new Date().toISOString().slice(0, 10); // نواكشوط على توقيت غرينتش
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};
const parse = v => (typeof v === "string" ? JSON.parse(v) : v);
const toLatinDigits = s => String(s ?? "")
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
// سطر في سجلات Vercel لكل طلب (رمز وطاولة وعدد أصناف فقط، بلا بيانات شخصية)
const log = (what, info) => console.log(`[orders] ${what} ${JSON.stringify(info)}`);

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

/* ── تسجيل طلب من الزبون ── */
export async function POST(request) {
  const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  try {
    if (await incrWithExpiry(`rl:orders:${ip}`, 600) > 40) { log("rejected", { reason: "too-many" }); return json({ error: "too-many" }, 429, CORS); }
    const body = await request.json();
    const code = String(body.code || "").toUpperCase();
    // لوحة المفاتيح العربية تكتب الأرقام هكذا: ٠١٢٣٤٥٦٧٨٩ (والفارسية ۰-۹) ← نحوّلها إلى 0-9
    const table = toLatinDigits(body.table).replace(/[^0-9]/g, "").slice(0, 4);
    if (!/^[A-Z0-9]{4,8}$/.test(code) || !table) { log("rejected", { reason: !table ? "no-table" : "bad-code", code }); return json({ error: "invalid" }, 400, CORS); }
    if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length > 60) { log("rejected", { reason: "no-lines", code }); return json({ error: "invalid" }, 400, CORS); }

    // الأسعار تُحسب هنا من المنيو المحفوظ، لا من هاتف الزبون
    const menu = await loadMenu().catch(() => null);
    const byId = new Map((menu?.items || []).map(i => [i.id, i]));
    const passPrice = menu?.gamesPassPrice ?? 200;
    const lines = [];
    for (const l of body.lines) {
      const q = Math.round(+l.q);
      if (!(q >= 1 && q <= 99)) continue;
      if (l.id === "games-pass") {
        lines.push({ id: "games-pass", name_ar: "ألعاب بوقت مفتوح", name_fr: "Jeux à volonté", q, price: passPrice });
        continue;
      }
      const it = byId.get(String(l.id));
      if (it) lines.push({ id: it.id, name_ar: it.name_ar, name_fr: it.name_fr, q, price: it.price });
      else if (!menu && typeof l.name_ar === "string") // لم يُحفظ منيو بعد: نقبل ما أرسله الهاتف
        lines.push({ id: String(l.id).slice(0, 60), name_ar: l.name_ar.slice(0, 80), name_fr: String(l.name_fr || "").slice(0, 80), q, price: Math.max(0, Math.round(+l.price) || 0) });
    }
    if (!lines.length) { log("rejected", { reason: "unknown-items", code, ids: body.lines.map(l => String(l.id)).slice(0, 10), menuItems: byId.size }); return json({ error: "invalid" }, 400, CORS); }
    const total = lines.reduce((s, l) => s + l.q * l.price, 0);

    const day = today(), key = `orders:${day}`, now = new Date().toISOString();
    const existing = parse(await hget(key, code));
    // نفس الطلب أُرسل مرة ثانية (مثلاً: عرض على النادل ثم واتساب) وما زال جديداً ← تحديثه بدل تكراره
    if (existing && existing.status === "new") {
      Object.assign(existing, { table, lines, total, updatedAt: now });
      await hset(key, code, JSON.stringify(existing));
      log("updated", { code, table, no: existing.no, day, items: lines.length });
      return json({ ok: true, no: existing.no }, 200, CORS);
    }
    const id = existing ? `${code}-${Date.now() % 100000}` : code;
    const no = await incr(`orders:count:${day}`);
    const order = { id, code, no, day, table, lang: body.lang === "fr" ? "fr" : "ar", at: now, updatedAt: now, lines, total, status: "new" };
    await hset(key, id, JSON.stringify(order));
    await sadd("orders:days", day);
    log("created", { code, id, table, no, day, items: lines.length });
    return json({ ok: true, no }, 200, CORS);
  } catch (e) {
    console.error("[orders] POST failed", e);
    return json({ error: "server", detail: String(e.message || e) }, 500, CORS);
  }
}

/* ── قراءة الطلبات (صاحب المقهى فقط) ── */
function summarize(orders) {
  const s = { count: 0, paid: 0, unpaid: 0, byStatus: { new: 0, served: 0, paid: 0, cancelled: 0 } };
  for (const o of orders) {
    s.byStatus[o.status] = (s.byStatus[o.status] || 0) + 1;
    if (o.status === "cancelled") continue;
    s.count++;
    if (o.status === "paid") s.paid += o.total; else s.unpaid += o.total;
  }
  return s;
}
async function dayOrders(day) {
  const all = await hgetall(`orders:${day}`);
  return Object.values(all).map(parse).filter(Boolean).sort((a, b) => b.no - a.no);
}

export async function GET(request) {
  const role = await sessionRole(request);
  if (!role) return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  try {
    // العمال: طلبات اليوم فقط، بدون مبالغ مالية
    if (role === "staff") {
      const orders = await dayOrders(today());
      const s = summarize(orders);
      return json({ day: today(), today: today(), orders, summary: { count: s.count, byStatus: s.byStatus }, role });
    }
    if (url.searchParams.get("archive")) {
      const days = (await smembers("orders:days")).filter(d => DAY_RE.test(d)).sort().reverse().slice(0, 120);
      const list = [];
      for (const d of days) list.push({ day: d, ...summarize(await dayOrders(d)) });
      return json({ today: today(), days: list });
    }
    const day = DAY_RE.test(url.searchParams.get("day") || "") ? url.searchParams.get("day") : today();
    const orders = await dayOrders(day);
    log("listed", { role, day, count: orders.length });
    return json({ day, today: today(), orders, summary: summarize(orders), role });
  } catch (e) {
    console.error("[orders] GET failed", e);
    return json({ error: "server", detail: String(e.message || e) }, 500);
  }
}

/* ── تغيير الحالة (صاحب المقهى فقط) ── */
export async function PATCH(request) {
  const role = await sessionRole(request);
  if (!fromPanel(request) || !role) return json({ error: "unauthorized" }, 401);
  try {
    const { day, id, status } = await request.json();
    if (!DAY_RE.test(day || "") || !STATUSES.includes(status)) return json({ error: "invalid" }, 400);
    if (role === "staff" && day !== today()) return json({ error: "forbidden" }, 403); // العمال: اليوم فقط
    const key = `orders:${day}`;
    const o = parse(await hget(key, String(id)));
    if (!o) return json({ error: "not-found" }, 404);
    o.status = status; o.updatedAt = new Date().toISOString();
    await hset(key, o.id, JSON.stringify(o));
    return json({ ok: true, order: o });
  } catch (e) {
    return json({ error: "server", detail: String(e.message || e) }, 500);
  }
}
