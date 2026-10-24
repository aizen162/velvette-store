/* ============================================================
   VELVETTE — shared storefront logic
   Products: assets/products.json | Cart: site-wide drawer
   Checkout: WhatsApp order message -> wa.me/923335017388
   ============================================================ */
const CONFIG = {
  storeName: "Velvette",
  whatsappNumber: "923335017388",
  shippingFee: 180,
  freeShippingOver: 2500,
  // Launch offer deadline (PKT). Change here and it updates everywhere.
  launchDeadline: "2026-10-31T23:59:59+05:00",
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

function fmtRs(n) {
  return "Rs " + Number(n).toLocaleString("en-PK");
}

const CATEGORIES = {
  makeup: { label: "Makeup", icon: "💄" },
  skincare: { label: "Skincare", icon: "🧴" },
  necklaces: { label: "Necklaces & Chains", icon: "💎" },
  bracelets: { label: "Bracelets", icon: "📿" },
  accessories: { label: "Accessories", icon: "👜" },
};

function catLabel(cat) { return CATEGORIES[cat]?.label || cat; }

let _products = null;
async function getProducts() {
  if (_products) return _products;
  const res = await fetch("assets/products.json");
  _products = await res.json();
  return _products;
}

/* ---------------- toast ---------------- */
function toast(msg) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------------- cart ---------------- */
const Cart = {
  key: "velvette_cart_v1",
  items() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  save(items) { localStorage.setItem(this.key, JSON.stringify(items)); updateCartBadge(); },
  add(id, qty = 1) {
    const items = this.items();
    const line = items.find((i) => i.id === id);
    if (line) line.qty += qty; else items.push({ id, qty });
    this.save(items);
    toast("Added to bag 🛍️");
  },
  setQty(id, qty) {
    let items = this.items();
    if (qty <= 0) items = items.filter((i) => i.id !== id);
    else { const l = items.find((i) => i.id === id); if (l) l.qty = qty; }
    this.save(items);
  },
  remove(id) { this.save(this.items().filter((i) => i.id !== id)); },
  clear() { this.save([]); },
  count() { return this.items().reduce((a, i) => a + i.qty, 0); },
};

function updateCartBadge() {
  $$(".cart-count").forEach((el) => { el.textContent = Cart.count(); });
}

function totalsFor(items, products) {
  const lines = items
    .map((i) => ({ ...i, p: products.find((x) => x.id === i.id) }))
    .filter((i) => i.p);
  const subtotal = lines.reduce((a, i) => a + i.p.price * i.qty, 0);
  const shipping = subtotal === 0 ? 0 : (subtotal >= CONFIG.freeShippingOver ? 0 : CONFIG.shippingFee);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

/* ---------------- shared chrome: nav, drawer ---------------- */
function initNav() {
  updateCartBadge();
  const burger = $(".hamburger");
  const links = $(".nav-links");
  if (burger && links) burger.addEventListener("click", (e) => { e.stopPropagation(); links.classList.toggle("open"); });
  document.addEventListener("click", () => links?.classList.remove("open"));
  const path = location.pathname.split("/").pop() || "index.html";
  $$(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
}


/* ---------------- product cards ---------------- */
function badgeHTML(p) {
  if (!p.badge) return "";
  return `<span class="badge ${esc(p.badge)}">${esc(p.badge)}</span>`;
}

function priceHTML(p) {
  return `<div class="pc-price">
    <span class="now">${fmtRs(p.price)}</span>
    ${p.oldPrice ? `<span class="was">${fmtRs(p.oldPrice)}</span>` : ""}
  </div>`;
}

function productCard(p, tiltable = false) {
  return `
  <div class="product-card${tiltable ? " tiltable" : ""}">
    ${badgeHTML(p)}
    <a href="product.html?id=${esc(p.id)}" class="pc-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></a>
    <div class="pc-body">
      <div class="pc-cat">${esc(catLabel(p.category))}</div>
      <a href="product.html?id=${esc(p.id)}"><div class="pc-name">${esc(p.name)}</div></a>
      ${priceHTML(p)}
      <button class="btn btn-sm pc-add" data-add="${esc(p.id)}">Add to Bag 🛍️</button>
    </div>
  </div>`;
}

function bindAddButtons(scope = document) {
  $$("[data-add]", scope).forEach((b) => {
    if (b._bound) return; b._bound = true;
    b.addEventListener("click", () => { Cart.add(b.dataset.add); });
  });
}

/* ---------------- homepage ---------------- */
async function initHome() {
  if (!$("#featured-grid")) return;
  const products = await getProducts();
  const featured = products.filter((p) => p.badge === "bestseller" || p.badge === "new").slice(0, 8);
  $("#featured-grid").innerHTML = featured.map((p) => productCard(p)).join("");
  bindAddButtons($("#featured-grid"));
}

/* ---------------- shop page ---------------- */
async function initShop() {
  const grid = $("#shop-grid");
  if (!grid) return;
  const products = await getProducts();
  const params = new URLSearchParams(location.search);
  let state = {
    cat: params.get("cat") || "all",
    q: params.get("q") || "",
    sort: "featured",
  };

  const pills = $("#filter-pills");
  pills.innerHTML = [`<button class="pill" data-cat="all">All</button>`,
    ...Object.entries(CATEGORIES).map(([k, v]) => `<button class="pill" data-cat="${k}">${v.icon} ${v.label}</button>`)
  ].join("");
  $$(".pill", pills).forEach((p) => p.addEventListener("click", () => {
    state.cat = p.dataset.cat;
    $$(".pill", pills).forEach((x) => x.classList.toggle("active", x === p));
    render();
  }));

  const searchInput = $("#shop-search");
  searchInput.value = state.q;
  searchInput.addEventListener("input", () => { state.q = searchInput.value.trim(); render(); });
  $("#shop-sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  function render() {
    $$(".pill", pills).forEach((x) => x.classList.toggle("active", x.dataset.cat === state.cat));
    let list = products.filter((p) =>
      (state.cat === "all" || p.category === state.cat) &&
      (!state.q || (p.name + " " + p.description).toLowerCase().includes(state.q.toLowerCase()))
    );
    if (state.sort === "low") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "high") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));

    $("#results-note").textContent = list.length
      ? `Showing ${list.length} of ${products.length} products`
      : "No products found — try a different search.";
    grid.innerHTML = list.length
      ? list.map((p) => productCard(p, true)).join("")
      : `<div class="empty-state" style="grid-column:1/-1"><div class="big">🔍</div><h3>Nothing found</h3><p>Try searching for lipstick, serum, necklace…</p></div>`;
    bindAddButtons(grid);
    initTilt(grid);
  }
  render();
}

/* 3D tilt-on-hover for shop cards */
function initTilt(scope = document) {
  if (matchMedia("(hover: none)").matches) return;
  $$(".tiltable", scope).forEach((card) => {
    if (card._tilt) return; card._tilt = true;
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 12;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* ---------------- product page ---------------- */
async function initProductPage() {
  const wrap = $("#product-wrap");
  if (!wrap) return;
  const products = await getProducts();
  const id = new URLSearchParams(location.search).get("id");
  const p = products.find((x) => x.id === id);

  if (!p) {
    wrap.innerHTML = `<div class="empty-state"><div class="big">💔</div><h2>Product not found</h2><p style="margin:10px 0 24px">This beauty may have sold out or moved.</p><a class="btn" href="shop.html">Back to Shop</a></div>`;
    return;
  }
  document.title = `${p.name} — Velvette`;

  const savePct = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  wrap.innerHTML = `
  <div class="pd-layout">
    <div class="pd-gallery">
      <img id="pd-main-img" src="${esc(p.image)}" alt="${esc(p.name)}">
      ${(p.images && p.images.length > 1) ? `<div class="pd-thumbs">${p.images.map((src, i) => `<img src="${esc(src)}" data-full="${esc(src)}" class="${i === 0 ? "active" : ""}" alt="View ${i + 1}">`).join("")}</div>` : ""}
    </div>
    <div class="pd-info">
      <div class="pc-cat">${esc(catLabel(p.category))}</div>
      <h1>${esc(p.name)}</h1>
      <div class="pd-rating">★★★★★ <span style="color:var(--muted)">(4.8 · loved by customers)</span></div>
      <div class="pd-price"><span class="now">${fmtRs(p.price)}</span>${p.oldPrice ? `<span class="was">${fmtRs(p.oldPrice)}</span>` : ""}</div>
      ${p.oldPrice ? `<span class="pd-save">SAVE ${savePct}%</span>` : ""}
      <p class="pd-desc">${esc(p.description)}</p>
      <div class="pd-meta">
        <div>🚚 <span>Delivery <b>all over Pakistan</b> — flat ${fmtRs(CONFIG.shippingFee)}, FREE over ${fmtRs(CONFIG.freeShippingOver)}</span></div>
        <div>💵 <span><b>Cash on Delivery</b> available</span></div>
        <div>🎁 <span>Eligible for <a href="loyalty.html" style="color:var(--rose);font-weight:600">Velvette Rewards</a> — 5 orders = 1 free gift</span></div>
      </div>
      <div class="qty-row">
        <div class="qty"><button id="q-dec">−</button><span id="q-val">1</span><button id="q-inc">+</button></div>
        <button class="btn" id="pd-add" style="flex:1;min-width:200px">Add to Bag 🛍️</button>
      </div>
      <a class="btn btn-outline btn-block" id="pd-buy">💬 Order Now on WhatsApp</a>
      <div class="pd-trust">
        <div><b>🚚</b>Nationwide delivery</div>
        <div><b>💵</b>Cash on delivery</div>
        <div><b>↩️</b>7-day easy exchange</div>
      </div>
    </div>
  </div>
  <div id="related-wrap" style="padding-bottom:50px">
    <div class="section-head"><div class="kicker">YOU MAY ALSO LOVE</div><h2>Related Beauties</h2></div>
    <div class="grid" id="related-grid"></div>
  </div>`;

  let qty = 1;
  const thumbs = wrap.querySelectorAll(".pd-thumbs img");
  thumbs.forEach((t) => t.addEventListener("click", () => {
    thumbs.forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const main = $("#pd-main-img");
    if (main) main.src = t.dataset.full;
  }));
  $("#q-inc").addEventListener("click", () => { qty = Math.min(10, qty + 1); $("#q-val").textContent = qty; });
  $("#q-dec").addEventListener("click", () => { qty = Math.max(1, qty - 1); $("#q-val").textContent = qty; });
  $("#pd-add").addEventListener("click", () => { Cart.add(p.id, qty); });
  $("#pd-buy").addEventListener("click", (e) => {
    e.preventDefault();
    const msg = `💖 *I want to order from VELVETTE*\n\n${p.name} x${qty} — ${fmtRs(p.price * qty)}\n\nMy name:\nMy address:\nMy city:`;
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  });

  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const rg = $("#related-grid");
  if (related.length) { rg.innerHTML = related.map((x) => productCard(x)).join(""); bindAddButtons(rg); }
  else $("#related-wrap").remove();
}

/* ---------------- countdown ---------------- */
function initCountdown() {
  const els = $$("[data-countdown]");
  if (!els.length) return;
  const deadline = new Date(CONFIG.launchDeadline).getTime();
  function tick() {
    const now = Date.now();
    let diff = Math.max(0, deadline - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;
    els.forEach((el) => {
      el.innerHTML = `
        <div class="cd-box"><b>${d}</b><small>DAYS</small></div>
        <div class="cd-box"><b>${String(h).padStart(2, "0")}</b><small>HRS</small></div>
        <div class="cd-box"><b>${String(m).padStart(2, "0")}</b><small>MIN</small></div>
        <div class="cd-box"><b>${String(s).padStart(2, "0")}</b><small>SEC</small></div>`;
      if (diff === 0) el.innerHTML = `<div class="cd-box" style="min-width:100%"><b>ENDED</b></div>`;
    });
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------------- offers page ---------------- */
async function initOffers() {
  const grid = $("#bundle-grid");
  if (!grid) return;
  const products = await getProducts();
  const byId = (id) => products.find((p) => p.id === id);
  const bundles = [
    {
      tag: "SKINCARE RITUAL", name: "Glow-Up Skincare Trio",
      items: ["v10", "v06", "v08"], price: 1600,
      note: "Cleanse → tone → hydrate. The complete daily glow routine.",
    },
    {
      tag: "JEWELRY COMBO", name: "Date-Night Jewelry Duo",
      items: ["v11", "v19"], price: 2700,
      note: "Rose gold pendant + pearl tennis bracelet. Unforgettable.",
    },
    {
      tag: "MAKEUP ESSENTIALS", name: "Lipstick Lover Set",
      items: ["v01", "v01"], price: 800, qtyNote: "2 × Velvet Matte Lipstick",
      note: "Two shades, endless looks. Gift one, keep one.",
    },
  ];
  grid.innerHTML = bundles.map((b, i) => {
    const items = b.items.map(byId).filter(Boolean);
    const was = items.reduce((a, p) => a + p.price, 0);
    return `
    <div class="bundle-card">
      <div class="bc-top"><div class="tag">${b.tag}</div><h3>${b.name}</h3></div>
      <div class="bc-body">
        <ul>${b.qtyNote ? `<li>${b.qtyNote}</li>` : items.map((p) => `<li>${esc(p.name)}</li>`).join("")}</ul>
        <p style="font-size:.9rem;color:var(--plum-soft);margin-bottom:12px">${b.note}</p>
        <div class="bundle-price"><span class="now">${fmtRs(b.price)}</span><span class="was">${fmtRs(was)}</span></div>
        <button class="btn btn-gold btn-block" data-bundle="${i}">Claim on WhatsApp 💬</button>
      </div>
    </div>`;
  }).join("");

  $$("[data-bundle]", grid).forEach((btn) => btn.addEventListener("click", () => {
    const b = bundles[Number(btn.dataset.bundle)];
    const items = b.items.map(byId).filter(Boolean);
    const msg =
`🎁 *VELVETTE BUNDLE OFFER*
I want the *${b.name}* bundle:
${b.qtyNote ? `- ${b.qtyNote}` : items.map((p) => `- ${p.name}`).join("\n")}

Bundle price: ${fmtRs(b.price)}

My name:
My address:
My city:`;
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
    toast("Opening WhatsApp… 💬");
  }));
}

/* ---------------- cart page ---------------- */
async function initCartPage() {
  const wrap = $("#cart-wrap");
  if (!wrap) return;
  const products = await getProducts();

  function render() {
    const { lines, subtotal, shipping, total } = totalsFor(Cart.items(), products);

    if (!lines.length) {
      wrap.innerHTML = `
        <div class="cart-empty">
          <div class="big">🛍️</div>
          <h2 class="serif">Your bag is empty</h2>
          <p>Pretty things are waiting for you…</p>
          <a class="btn" href="shop.html" style="margin-top:14px">Shop Now 💖</a>
        </div>`;
      updateCartBadge();
      return;
    }

    wrap.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">
        ${lines.map((i) => `
        <div class="cart-item">
          <a href="product.html?id=${esc(i.p.id)}"><img src="${esc(i.p.image)}" alt="${esc(i.p.name)}"></a>
          <div class="ci-info">
            <a href="product.html?id=${esc(i.p.id)}" class="ci-name">${esc(i.p.name)}</a>
            <div class="ci-price">${fmtRs(i.p.price)} each</div>
            <div class="qty-stepper">
              <button data-dec="${esc(i.id)}" aria-label="decrease">−</button>
              <span>${i.qty}</span>
              <button data-inc="${esc(i.id)}" aria-label="increase">+</button>
            </div>
          </div>
          <div class="ci-right">
            <div class="ci-total">${fmtRs(i.p.price * i.qty)}</div>
            <button class="ci-remove" data-del="${esc(i.id)}">remove</button>
          </div>
        </div>`).join("")}
        <a href="shop.html" class="continue-link">← Continue shopping</a>
      </div>
      <aside class="cart-summary">
        <h3 class="serif">Order Summary</h3>
        ${shipping > 0 ? `<div class="free-ship">Add ${fmtRs(CONFIG.freeShippingOver - subtotal)} more for <b>FREE delivery</b> 🚚</div>` : ""}
        <div class="sum-row"><span>Subtotal (${Cart.count()} items)</span><span>${fmtRs(subtotal)}</span></div>
        <div class="sum-row"><span>Delivery (all Pakistan)</span><span>${shipping === 0 ? "FREE 🎉" : fmtRs(shipping)}</span></div>
        <div class="sum-row total"><span>Total</span><span>${fmtRs(total)}</span></div>
        <form class="checkout-form" id="cart-checkout-form">
          <h4>Delivery Details</h4>
          <div class="field"><input name="name" required placeholder="Full Name *" autocomplete="name"></div>
          <div class="field"><input name="phone" required placeholder="Phone / WhatsApp *" autocomplete="tel"></div>
          <div class="field"><input name="address" required placeholder="House, street, area *"></div>
          <div class="field"><input name="city" required placeholder="City *"></div>
          <div class="cod-note">💵 <b>Cash on Delivery</b> available — pay when your order arrives.</div>
          <button type="submit" class="btn wa-btn btn-block" style="margin-top:4px">📲 Order via WhatsApp</button>
          <p class="form-note">You'll be redirected to WhatsApp with your order pre-written.</p>
        </form>
      </aside>
    </div>`;

    $$("[data-inc]", wrap).forEach((b) => b.addEventListener("click", () => {
      const l = Cart.items().find((x) => x.id === b.dataset.inc);
      Cart.setQty(b.dataset.inc, (l?.qty || 0) + 1);
      render();
    }));
    $$("[data-dec]", wrap).forEach((b) => b.addEventListener("click", () => {
      const l = Cart.items().find((x) => x.id === b.dataset.dec);
      Cart.setQty(b.dataset.dec, (l?.qty || 1) - 1);
      render();
    }));
    $$("[data-del]", wrap).forEach((b) => b.addEventListener("click", () => {
      Cart.remove(b.dataset.del);
      render();
    }));

    $("#cart-checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const orderLines = lines.map((i, n) => `${n + 1}. ${i.p.name} x${i.qty} — ${fmtRs(i.p.price * i.qty)}`);
      const msg =
`🛍️ *NEW ORDER — VELVETTE*
--------------------------
${orderLines.join("\n")}
--------------------------
Subtotal: ${fmtRs(subtotal)}
Delivery: ${shipping === 0 ? "FREE" : fmtRs(shipping)}
*Total (COD): ${fmtRs(total)}*

👤 Name: ${fd.get("name")}
📞 Phone: ${fd.get("phone")}
📍 Address: ${fd.get("address")}
🏙️ City: ${fd.get("city")}

🎁 Ask us for your *Velvette Rewards* order code after confirmation — 5 orders = 1 FREE gift!`;
      window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
      toast("Opening WhatsApp… send the message to confirm ✅");
      Cart.clear();
      render();
    });
    updateCartBadge();
  }

  render();
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initHome();
  initShop();
  initProductPage();
  initOffers();
  initCountdown();
  initCartPage();
});
