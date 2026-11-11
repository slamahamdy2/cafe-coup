// قاعدة بيانات صغيرة للطلبات.
// على Vercel: Upstash Redis (المتغيرات KV_REST_API_URL / KV_REST_API_TOKEN تضيفها Vercel تلقائياً).
// على هذا الحاسوب فقط (للتجربة): ملف JSON داخل LOCAL_STORE_DIR.
import { Redis } from "@upstash/redis";
import fs from "node:fs/promises";
import path from "node:path";

const LOCAL = process.env.LOCAL_STORE_DIR || "";
let redis = null;
function r() {
  if (!redis) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("orders-db-not-configured");
    redis = new Redis({ url, token });
  }
  return redis;
}

/* ── نسخة محلية بسيطة بنفس العمليات ── */
const FILE = () => path.join(LOCAL, "kv.json");
let mem = null;
async function db() { if (!mem) mem = JSON.parse(await fs.readFile(FILE(), "utf8").catch(() => "{}")); return mem; }
async function flush() { await fs.mkdir(LOCAL, { recursive: true }); await fs.writeFile(FILE(), JSON.stringify(mem)); }

export async function get(key) {
  if (LOCAL) { const d = await db(); return d[key] ?? null; }
  return r().get(key);
}
export async function set(key, value) {
  if (LOCAL) { const d = await db(); d[key] = value; return flush(); }
  return r().set(key, value);
}
export async function del(key) {
  if (LOCAL) { const d = await db(); delete d[key]; return flush(); }
  return r().del(key);
}
export function configured() {
  return !!(LOCAL || ((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)));
}

export async function hget(key, field) {
  if (LOCAL) { const d = await db(); return d[key]?.[field] ?? null; }
  return r().hget(key, field);
}
export async function hset(key, field, value) {
  if (LOCAL) { const d = await db(); (d[key] ||= {})[field] = value; return flush(); }
  return r().hset(key, { [field]: value });
}
export async function hgetall(key) {
  if (LOCAL) { const d = await db(); return d[key] || {}; }
  return (await r().hgetall(key)) || {};
}
export async function incr(key) {
  if (LOCAL) { const d = await db(); d[key] = (+d[key] || 0) + 1; await flush(); return d[key]; }
  return r().incr(key);
}
export async function incrWithExpiry(key, seconds) {
  if (LOCAL) return 1; // لا حدّ للطلبات أثناء التجربة المحلية
  const n = await r().incr(key);
  if (n === 1) await r().expire(key, seconds);
  return n;
}
export async function sadd(key, member) {
  if (LOCAL) { const d = await db(); const s = new Set(d[key] || []); s.add(member); d[key] = [...s]; return flush(); }
  return r().sadd(key, member);
}
export async function smembers(key) {
  if (LOCAL) { const d = await db(); return d[key] || []; }
  return (await r().smembers(key)) || [];
}
