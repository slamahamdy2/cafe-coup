// GET /api/stats?period=today|7|30|month — إحصائيات المال والأصناف (للمالك فقط)
// المبيعات = كل الطلبات غير الملغاة. المدفوع = الطلبات بحالة «مدفوع».
import { sessionRole, json } from "./_lib/auth.js";
import { hgetall, smembers } from "./_lib/kv.js";
import { loadMenu } from "./_lib/store.js";

const parse = v => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
const iso = d => d.toISOString().slice(0, 10);

function rangeFor(period) {
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  if (period === "month") start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - ((+period || 1) - 1));
  const days = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(iso(d));
  return days;
}

export async function GET(request) {
  if ((await sessionRole(request)) !== "owner") return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  const period = ["today", "7", "30", "month"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "7";
  try {
    const days = rangeFor(period === "today" ? 1 : period);
    const known = new Set(await smembers("orders:days"));
    const menu = await loadMenu().catch(() => null);
    const sectionOf = new Map((menu?.items || []).map(i => [i.id, i.section]));

    const t = { sales: 0, paid: 0, unpaid: 0, orders: 0, cancelled: 0, cancelledValue: 0 };
    const daily = [], items = new Map(), sections = { drinks: 0, food: 0, games: 0, other: 0 }, hours = Array(24).fill(0);

    for (const day of days) {
      const row = { day, sales: 0, paid: 0, orders: 0 };
      const all = known.has(day) ? Object.values(await hgetall(`orders:${day}`)).map(parse).filter(Boolean) : [];
      for (const o of all) {
        if (o.status === "cancelled") { t.cancelled++; t.cancelledValue += o.total; continue; }
        t.orders++; t.sales += o.total; row.orders++; row.sales += o.total;
        if (o.status === "paid") { t.paid += o.total; row.paid += o.total; } else t.unpaid += o.total;
        hours[new Date(o.at).getUTCHours()]++;
        for (const l of o.lines) {
          const v = l.q * l.price;
          const it = items.get(l.id) || { id: l.id, name_ar: l.name_ar, name_fr: l.name_fr, q: 0, sales: 0 };
          it.q += l.q; it.sales += v; items.set(l.id, it);
          const sec = l.id === "games-pass" ? "games" : (sectionOf.get(l.id) || "other");
          sections[sec] += v;
        }
      }
      daily.push(row);
    }
    t.average = t.orders ? Math.round(t.sales / t.orders) : 0;
    const top = [...items.values()].sort((a, b) => b.sales - a.sales || b.q - a.q).slice(0, 10);
    return json({ period, from: days[0], to: days[days.length - 1], totals: t, daily, sections, top, hours });
  } catch (e) {
    return json({ error: "server", detail: String(e.message || e) }, 500);
  }
}
