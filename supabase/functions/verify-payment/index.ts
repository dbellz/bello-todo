// Verifies the payment with the provider, marks the order paid, and emails a Mailgun confirmation.
// Secrets: PAYSTACK_SECRET_KEY, FLUTTERWAVE_SECRET_KEY, PAYMENT_CURRENCY, MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM
import { admin, asUser, cors, currency, esc, json } from "../_shared/util.ts";

async function verified(o: any): Promise<boolean> {
  const ref = encodeURIComponent(o.payment_reference);
  if (o.payment_provider === "paystack") {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, { headers: { Authorization: "Bearer " + Deno.env.get("PAYSTACK_SECRET_KEY") } });
    const d = (await r.json())?.data;
    return d?.status === "success" && d.currency === currency() && d.amount >= Math.round(Number(o.total) * 100);
  }
  if (o.payment_provider === "flutterwave") {
    const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${ref}`, { headers: { Authorization: "Bearer " + Deno.env.get("FLUTTERWAVE_SECRET_KEY") } });
    const d = (await r.json())?.data;
    return d?.status === "successful" && d.currency === currency() && Number(d.amount) >= Number(o.total);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { order_id } = await req.json();
    const { data: o } = await asUser(req).from("orders").select("*").eq("id", order_id).single();
    if (!o) return json({ error: "Order not found" }, 404);
    if (o.status === "paid") return json({ status: "paid" });
    if (!(await verified(o))) return json({ status: "unpaid" });

    // Only the request that flips the status sends the email.
    const { data: upd } = await admin().from("orders").update({ status: "paid" }).eq("id", o.id).eq("status", "pending_payment").select("id");
    if (upd?.length) {
      const lines = (o.items as any[]).map((i) => `<li>${esc(i.name)} (${esc(i.size)}) × ${Number(i.qty)}</li>`).join("");
      const form = new FormData();
      form.set("from", Deno.env.get("MAILGUN_FROM")!);
      form.set("to", o.email);
      form.set("subject", `Order confirmation ${o.id}`);
      form.set("html", `<h2>Thanks for your order, ${esc(o.full_name)}!</h2><ul>${lines}</ul><p><b>Total paid: ${currency()} ${Number(o.total).toFixed(2)}</b></p><p>Order ID: ${o.id}</p>`);
      const r = await fetch(`https://api.mailgun.net/v3/${Deno.env.get("MAILGUN_DOMAIN")}/messages`, {
        method: "POST",
        headers: { Authorization: "Basic " + btoa("api:" + Deno.env.get("MAILGUN_API_KEY")) },
        body: form,
      });
      if (!r.ok) return json({ status: "paid", email: false });
    }
    return json({ status: "paid", email: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
