const cfg = window.SHOP_CONFIG;
const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const PRODUCTS = [
  { id: "cap-classic", name: "Classic Cap", category: "caps", price: 15, icon: "🧢", sizes: ["One size"] },
  { id: "cap-snap", name: "Snapback Cap", category: "caps", price: 18, icon: "🧢", sizes: ["One size"] },
  { id: "sweat-hood", name: "Hooded Sweatshirt", category: "sweatshirts", price: 45, icon: "🧥", sizes: ["S", "M", "L", "XL"] },
  { id: "sweat-crew", name: "Crewneck Sweatshirt", category: "sweatshirts", price: 38, icon: "👕", sizes: ["S", "M", "L", "XL"] },
  { id: "knit-top", name: "Knitted Top", category: "knitted", price: 32, icon: "🧶", sizes: ["S", "M", "L"] },
  { id: "knit-cardi", name: "Knitted Cardigan", category: "knitted", price: 52, icon: "🧶", sizes: ["S", "M", "L"] }
];

const money = n => "$" + n.toFixed(2);
const getCart = () => JSON.parse(localStorage.getItem("cart") || "[]");
const saveCart = c => { localStorage.setItem("cart", JSON.stringify(c)); updateCount(); };
function updateCount() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = getCart().reduce((s, i) => s + i.qty, 0);
}
function addToCart(id, size) {
  const cart = getCart();
  const hit = cart.find(i => i.id === id && i.size === size);
  hit ? hit.qty++ : cart.push({ id, size, qty: 1 });
  saveCart(cart);
}
const cartLines = () => getCart().map(i => ({ ...i, product: PRODUCTS.find(p => p.id === i.id) })).filter(l => l.product);
const cartTotal = () => cartLines().reduce((s, l) => s + l.product.price * l.qty, 0);

async function signIn() {
  await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href } });
}
async function signOut() { await sb.auth.signOut(); location.reload(); }
async function renderAuth() {
  const { data: { session } } = await sb.auth.getSession();
  const el = document.getElementById("auth");
  if (!el) return session;
  el.innerHTML = "";
  const b = document.createElement("button");
  b.className = "alt";
  b.textContent = session ? `Sign out (${session.user.email})` : "Sign in with Google";
  b.onclick = session ? signOut : signIn;
  el.appendChild(b);
  return session;
}

function renderProducts(filter = "all") {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  PRODUCTS.filter(p => filter === "all" || p.category === filter).forEach(p => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<div class="img">${p.icon}</div><h3></h3><p class="price">${money(p.price)}</p>
      <select>${p.sizes.map(s => `<option>${s}</option>`).join("")}</select><button>Add to cart</button>`;
    d.querySelector("h3").textContent = p.name;
    d.querySelector("button").onclick = () => addToCart(p.id, d.querySelector("select").value);
    grid.appendChild(d);
  });
}

function renderCart() {
  const box = document.getElementById("cartItems");
  box.innerHTML = "";
  const lines = cartLines();
  if (!lines.length) box.textContent = "Your cart is empty.";
  lines.forEach(l => {
    const r = document.createElement("div");
    r.className = "row";
    const t = document.createElement("span");
    t.textContent = `${l.product.name} (${l.size}) × ${l.qty} — ${money(l.product.price * l.qty)}`;
    const b = document.createElement("button");
    b.className = "alt"; b.textContent = "Remove";
    b.onclick = () => { saveCart(getCart().filter(i => !(i.id === l.id && i.size === l.size))); renderCart(); };
    r.append(t, b);
    box.appendChild(r);
  });
  document.getElementById("total").textContent = money(cartTotal());
}

async function placeOrder(form, session) {
  const msg = document.getElementById("msg");
  const lines = cartLines();
  if (!lines.length) { msg.textContent = "Cart is empty."; return; }
  if (!session) { msg.textContent = "Please sign in with Google first."; return; }
  const f = new FormData(form);
  const items = lines.map(l => ({ id: l.id, name: l.product.name, size: l.size, qty: l.qty, price: l.product.price }));
  const order = {
    user_id: session.user.id,
    email: session.user.email,
    full_name: f.get("name"),
    address: f.get("address"),
    items,
    total: cartTotal(),
    status: "pending_payment"
  };
  msg.textContent = "Placing order…";
  const { data, error } = await sb.from("orders").insert(order).select("id").single();
  if (error) { msg.textContent = "Error: " + error.message; return; }
  // Payment + confirmation email are completed server-side (see README).
  const { error: fnErr } = await sb.functions.invoke("send-order-email", { body: { order_id: data.id } });
  saveCart([]);
  renderCart();
  msg.textContent = fnErr
    ? `Order ${data.id} saved, but the confirmation email failed.`
    : `Thank you! Order ${data.id} placed. A confirmation email is on its way.`;
}

document.addEventListener("DOMContentLoaded", async () => {
  updateCount();
  const session = await renderAuth();
  if (document.getElementById("grid")) {
    renderProducts();
    document.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => renderProducts(b.dataset.filter));
  }
  if (document.getElementById("checkoutForm")) {
    renderCart();
    document.getElementById("checkoutForm").onsubmit = e => { e.preventDefault(); placeOrder(e.target, session); };
  }
});
