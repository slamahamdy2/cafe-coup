// POST /api/account — إعدادات الأمان (للمالك فقط)
//   { action:"owner-password", current, next }  تغيير كلمة سر المالك
//   { action:"staff-password", next }           تحديد أو تغيير كلمة سر العمال
//   { action:"staff-disable" }                  إيقاف حساب العمال
//   { action:"recovery-code" }                  إنشاء رمز استرجاع جديد (يُعرض مرة واحدة)
import { sessionRole, fromPanel, json, roleForPassword, setRecord, clearRecord, newRecoveryCode, sessionCookie } from "./_lib/auth.js";
import { configured } from "./_lib/kv.js";

export async function POST(request) {
  if (!fromPanel(request) || (await sessionRole(request)) !== "owner") return json({ error: "unauthorized" }, 401);
  if (!configured()) return json({ error: "db-not-configured" }, 503);
  let b = {};
  try { b = await request.json(); } catch {}
  const strong = p => typeof p === "string" && p.length >= 6 && p.length <= 100;

  switch (b.action) {
    case "owner-password": {
      if ((await roleForPassword(b.current)) !== "owner") { await new Promise(r => setTimeout(r, 800)); return json({ error: "wrong-current" }, 401); }
      if (!strong(b.next)) return json({ error: "weak-password" }, 400);
      if ((await roleForPassword(b.next)) === "staff") return json({ error: "same-as-staff" }, 400);
      await setRecord("owner", b.next);
      // كل الأجهزة الأخرى تخرج تلقائياً؛ هذا الجهاز يبقى داخلاً
      return json({ ok: true }, 200, { "set-cookie": await sessionCookie("owner") });
    }
    case "staff-password": {
      if (!strong(b.next)) return json({ error: "weak-password" }, 400);
      if ((await roleForPassword(b.next)) === "owner") return json({ error: "same-as-owner" }, 400);
      await setRecord("staff", b.next); // العمال الداخلون بكلمة السر القديمة يخرجون
      return json({ ok: true });
    }
    case "staff-disable":
      await clearRecord("staff");
      return json({ ok: true });
    case "recovery-code":
      return json({ ok: true, recoveryCode: await newRecoveryCode() });
    default:
      return json({ error: "invalid" }, 400);
  }
}
