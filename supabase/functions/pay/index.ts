// Starts a Paystack or Flutterwave payment. Totals are recomputed server-side from the products table.
// Secrets: PAYSTACK_SECRET_KEY, FLUTTERWAVE_SECRET_KEY, PAYMENT_CURRENCY (default NGN)
import { admin, asUser, cors, currency, json } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { order_id, provider, return_url } = await req.json();
    if (!["paystack", "flutterwave"].includes(provider)) return json({ error: "Unknown provider" }, 400);
    const { data: o } = await asUser(req).from("orders").select("*").eq("id", order_id).single();
    if (!o) return json({ error: "Order not found" }, 404);
    if (o.status !== "pending_payment") return json({ error: "Order already processed" }, 409);

    const db = admin();
    const { data: prods } = await db.from("products").select("id,price").in("id", (o.items as any[]).map((i) => i.id));
    const price = new Map((prods ?? []).map((p: any) => [p.id, Number(p.price)]));
    let total = 0;
    for (const i of o.items as any[]) {
      const qty = Number(i.qty);
      if (!price.has(i.id) || !Number.isInteger(qty) || qty < 1) return json({ error: "Invalid item" }, 400);
      total += price.get(i.id)! * qty;
    }
    const reference = `${o.id}_${Date.now()}`;
    await db.from("orders").update({ total, payment_provider: provider, payment_reference: reference }).eq("id", o.id);

    const redirect = new URL(return_url);
    redirect.searchParams.set("order", o.id);
    let link: string | undefined;
    if (provider === "paystack") {
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: "Bearer " + Deno.env.get("PAYSTACK_SECRET_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({ email: o.email, amount: Math.round(total * 100), currency: currency(), reference, callback_url: redirect.toString() }),
      });
      link = (await r.json())?.data?.authorization_url;
    } else {
      const r = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: "Bearer " + Deno.env.get("FLUTTERWAVE_SECRET_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({ tx_ref: reference, amount: total, currency: currency(), redirect_url: redirect.toString(), customer: { email: o.email, name: o.full_name } }),
      });
      link = (await r.json())?.data?.link;
    }
    return link ? json({ link }) : json({ error: "Could not start payment" }, 502);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
