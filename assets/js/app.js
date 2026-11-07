/* ============================================================
   VELVETTE — shared storefront logic
   Products: assets/products.json | Cart: site-wide drawer
   Checkout: WhatsApp order message -> wa.me/923335017388
   ============================================================ */
const CONFIG = {
  storeName: "Velvette",
  whatsappNumber: "923335017388",
  shippingFee: 90,
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

/* Unique order number for WhatsApp orders (also the Velvette Rewards ref) */
function newOrderNo() {
  return "VLVT-" + Math.floor(100000 + Math.random() * 900000);
}

const CATEGORIES = {
  makeup: { label: "Makeup", icon: "💄" },
  skincare: { label: "Skincare", icon: "🧴" },
  necklaces: { label: "Necklaces & Chains", icon: "💎" },
  bracelets: { label: "Bracelets", icon: "📿" },
  accessories: { label: "Accessories", icon: "👜" },
  babies: { label: "Babies", icon: "🍼" },
};

/* Shop sections: two top-level tabs. A product's section comes from its
   category; unknown categories default to beauty. Add future baby
   sub-categories to the babies list and they land in the Babies tab. */
const SECTIONS = {
  beauty: { label: "Cosmetics & Makeup", icon: "💄", cats: ["makeup", "skincare", "necklaces", "bracelets", "accessories"] },
  babies: { label: "Babies", icon: "🍼", cats: ["babies"] },
};

function sectionOf(cat) {
  for (const [key, s] of Object.entries(SECTIONS)) if (s.cats.includes(cat)) return key;
  return "beauty";
}

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

/* % OFF badge from oldPrice (struck-through "was" price hook) */
function offBadgeHTML(p) {
  if (!p.oldPrice || p.oldPrice <= p.price) return "";
  const pct = Math.round((1 - p.price / p.oldPrice) * 100);
  return `<span class="badge sale">${pct}% OFF</span>`;
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
    ${badgeHTML(p)}${offBadgeHTML(p)}${p.video ? `<span class="badge video">▶ Video</span>` : ""}
    <a href="product.html?id=${esc(p.id)}" class="pc-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></a>
    <div class="pc-body">
      <div class="pc-cat">${esc(catLabel(p.category))}</div>
      <a href="product.html?id=${esc(p.id)}"><div class="pc-name">${esc(p.name)}</div></a>
      <div class="pc-code">Code: ${esc(p.id.toUpperCase())}</div>
      <div class="pc-stars">★★★★★<span>4.8</span></div>
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
  $("#featured-grid").innerHTML = featured.map((p) => productCard(p, true)).join("");
  bindAddButtons($("#featured-grid"));
  initTilt($("#featured-grid"));

  const viewAll = $("#view-all-link");
  if (viewAll) viewAll.textContent = `View All ${products.length} Products →`;

  // category tiles + pills derived from the REAL catalog categories only
  const counts = {};
  products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const cats = Object.keys(counts);
  const catGrid = $("#cat-grid");
  if (catGrid) {
    // Babies teaser: visible before the first baby product lands, so the
    // section is discoverable; hidden automatically once real baby
    // products appear in the catalog (they get their own tile above).
    const babiesTeaser = cats.includes("babies") ? "" :
      `<a class="cat-tile" href="shop.html?section=babies"><div class="icon">🍼</div><h3>Babies</h3><small>Coming soon</small></a>`;
    catGrid.innerHTML = cats.map((c) => `
      <a class="cat-tile" href="shop.html?cat=${esc(c)}"><div class="icon">${CATEGORIES[c]?.icon || "✨"}</div><h3>${esc(catLabel(c))}</h3><small>${counts[c]} product${counts[c] > 1 ? "s" : ""}</small></a>`).join("") + babiesTeaser;
  }
  const homePills = $("#home-pills");
  if (homePills) {
    const babiesPill = cats.includes("babies") ? "" : `<a class="pill" href="shop.html?section=babies">🍼 Babies</a>`;
    homePills.innerHTML = [`<a class="pill active" href="shop.html">All</a>`,
      ...cats.map((c) => `<a class="pill" href="shop.html?cat=${esc(c)}">${CATEGORIES[c]?.icon || "✨"} ${esc(catLabel(c))}</a>`),
      babiesPill
    ].join("");
  }

  initHeroSlider(products);
  initHeroParallax();
  observeReveals();
}

/* hero photo slider: crossfades through the real product photos */
function initHeroSlider(products) {
  const slidesEl = $("#hero-slides");
  const dotsEl = $("#hero-dots");
  if (!slidesEl || !dotsEl || !products.length) return;
  slidesEl.innerHTML = products.map((p, i) => `
    <a href="product.html?id=${esc(p.id)}" class="hero-slide${i === 0 ? " active" : ""}" aria-label="${esc(p.name)}">
      <img src="${esc(p.image)}" alt="${esc(p.name)}">
      <div class="hs-cap"><b>${esc(p.name)}</b><span>${fmtRs(p.price)}${p.oldPrice ? ` <s>${fmtRs(p.oldPrice)}</s> · ${Math.round((1 - p.price / p.oldPrice) * 100)}% OFF` : ""}</span></div>
    </a>`).join("");
  dotsEl.innerHTML = products.map((_, i) => `<button data-slide="${i}" class="${i === 0 ? "active" : ""}" aria-label="Slide ${i + 1}"></button>`).join("");
  const slides = $$(".hero-slide", slidesEl);
  const dots = $$("button", dotsEl);
  let cur = 0, timer = null;
  function go(i) {
    slides[cur].classList.remove("active"); dots[cur].classList.remove("active");
    cur = (i + slides.length) % slides.length;
    slides[cur].classList.add("active"); dots[cur].classList.add("active");
  }
  function play() { timer = setInterval(() => go(cur + 1), 4500); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  dots.forEach((d) => d.addEventListener("click", () => { stop(); go(Number(d.dataset.slide)); play(); }));
  const slider = $("#hero-slider");
  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", play);
  play();
}

/* floating orbs follow the mouse gently (desktop only) */
function initHeroParallax() {
  const hero = $("#hero");
  if (!hero || matchMedia("(hover: none)").matches) return;
  const orbs = $$(".orb", hero);
  if (!orbs.length) return;
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    orbs.forEach((o) => {
      const d = Number(o.dataset.depth || 20);
      o.style.transform = `translate(${x * d}px, ${y * d}px)`;
    });
  });
  hero.addEventListener("mouseleave", () => orbs.forEach((o) => { o.style.transform = ""; }));
}

/* scroll-reveal for sections */
let _revealObs = null;
function revealInView() {
  $$(".reveal:not(.visible)").forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("visible");
  });
}
function observeReveals() {
  const els = $$(".reveal:not([data-obs])");
  if (!els.length) return;
  if (!_revealObs) {
    _revealObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("visible"); _revealObs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    // fast-scroll safety: reveal anything already above the fold bottom
    window.addEventListener("scroll", revealInView, { passive: true });
  }
  els.forEach((el) => { el.dataset.obs = "1"; _revealObs.observe(el); });
  revealInView();
}

/* ---------------- shop page ---------------- */
async function initShop() {
  const grid = $("#shop-grid");
  if (!grid) return;
  const products = await getProducts();
  const params = new URLSearchParams(location.search);
  const sectionParam = params.get("section");
  const catParam = params.get("cat") || "all";
  let state = {
    // ?section= wins; otherwise the section follows the ?cat= link
    // (a baby category opens the Babies tab); default is beauty.
    section: SECTIONS[sectionParam] ? sectionParam : sectionOf(catParam === "all" ? "" : catParam),
    cat: catParam,
    q: params.get("q") || "",
    sort: "featured",
  };

  const toggle = $("#section-toggle");
  const pills = $("#filter-pills");

  function renderToggle() {
    if (!toggle) return;
    toggle.innerHTML = Object.entries(SECTIONS).map(([key, s]) =>
      `<button class="pill${state.section === key ? " active" : ""}" data-section="${key}">${s.icon} ${s.label}</button>`).join("");
    $$(".pill", toggle).forEach((b) => b.addEventListener("click", () => {
      state.section = b.dataset.section;
      state.cat = "all";
      renderSection();
      render();
    }));
  }

  // Rebuilds the toggle + category pills for the current section and keeps
  // the URL shareable (?section= + ?cat=) without reloading the page.
  function renderSection() {
    // A ?cat= link pointing outside the current section falls back to All
    // instead of showing an empty grid.
    if (state.cat !== "all" && sectionOf(state.cat) !== state.section) state.cat = "all";
    renderToggle();
    const catsInSection = [...new Set(products.filter((p) => sectionOf(p.category) === state.section).map((p) => p.category))];
    pills.innerHTML = [`<button class="pill" data-cat="all">All</button>`,
      ...catsInSection.map((k) => `<button class="pill" data-cat="${k}">${CATEGORIES[k]?.icon || "✨"} ${catLabel(k)}</button>`)
    ].join("");
    $$(".pill", pills).forEach((p) => p.addEventListener("click", () => {
      state.cat = p.dataset.cat;
      $$(".pill", pills).forEach((x) => x.classList.toggle("active", x === p));
      render();
    }));
    const url = new URL(location);
    url.searchParams.set("section", state.section);
    if (state.cat === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", state.cat);
    history.replaceState(null, "", url);
  }

  const searchInput = $("#shop-search");
  searchInput.value = state.q;
  searchInput.addEventListener("input", () => { state.q = searchInput.value.trim(); render(); });
  if (location.hash === "#search") searchInput.focus();
  $("#shop-sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  function render() {
    $$(".pill", pills).forEach((x) => x.classList.toggle("active", x.dataset.cat === state.cat));
    // A search (name or product code) spans both sections, so codes work from anywhere
    const sectionProducts = state.q ? products : products.filter((p) => sectionOf(p.category) === state.section);
    let list = sectionProducts.filter((p) =>
      (state.cat === "all" || p.category === state.cat) &&
      (!state.q || (p.name + " " + p.description + " " + p.id).toLowerCase().includes(state.q.toLowerCase()))
    );
    if (state.sort === "low") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "high") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));

    const sectionEmpty = sectionProducts.length === 0 && !state.q;
    $("#results-note").textContent = list.length
      ? `Showing ${list.length} of ${sectionProducts.length} products`
      : (sectionEmpty && state.section === "babies"
          ? "Baby essentials are on their way — check back soon!"
          : "No products found — try a different search.");
    grid.innerHTML = list.length
      ? list.map((p) => productCard(p, true)).join("")
      : (sectionEmpty && state.section === "babies"
          ? `<div class="empty-state" style="grid-column:1/-1"><div class="big">🍼</div><h3>Baby collection coming soon</h3><p>Adorable baby essentials are on their way to Velvette. Message us on WhatsApp and we'll let you know the moment they land.</p><a class="btn" href="https://wa.me/${CONFIG.whatsappNumber}" target="_blank" rel="noopener">Notify Me on WhatsApp 💬</a></div>`
          : `<div class="empty-state" style="grid-column:1/-1"><div class="big">🔍</div><h3>Nothing found</h3><p>Try searching for lipstick, serum, necklace…</p></div>`);
    bindAddButtons(grid);
    initTilt(grid);
  }
  renderSection();
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
      ${p.video ? `<video id="pd-main-video" controls preload="metadata" poster="${esc(p.image)}" src="${esc(p.video)}" style="display:none"></video>` : ""}
      ${(p.video || (p.images && p.images.length > 1)) ? `<div class="pd-thumbs">${p.video ? `<button class="pd-thumb-video" data-video="1" aria-label="Play product video"><span class="pv-play">▶</span><span class="pv-label">Video</span></button>` : ""}${(p.images || []).map((src, i) => `<img src="${esc(src)}" data-full="${esc(src)}" class="${i === 0 ? "active" : ""}" alt="View ${i + 1}">`).join("")}</div>` : ""}
    </div>
    <div class="pd-info">
      <div class="pc-cat">${esc(catLabel(p.category))}</div>
      <h1>${esc(p.name)}</h1>
      <div class="pd-rating">★★★★★ <span style="color:var(--muted)">(4.8 · loved by customers)</span></div>
      <div class="pd-price"><span class="now">${fmtRs(p.price)}</span>${p.oldPrice ? `<span class="was">${fmtRs(p.oldPrice)}</span>` : ""}</div>
      ${p.oldPrice ? `<span class="pd-save">SAVE ${savePct}%</span>` : ""}
      <div class="pd-code">Product Code: <b>${esc(p.id.toUpperCase())}</b></div>
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
  ${p.reviews && p.reviews.length ? `<div class="pd-reviews">
    <div class="section-head"><div class="kicker">CUSTOMER LOVE</div><h2>What Buyers Say</h2></div>
    <div class="review-list">
      ${p.reviews.slice(0, 3).map((r) => `<div class="review">
        ${r.image ? `<img class="review-img" src="${esc(r.image)}" alt="Customer review photo" loading="lazy">` : ""}
        <div class="review-stars">${"★".repeat(r.rating || 5)}${"☆".repeat(5 - (r.rating || 5))}</div>
        <p class="review-text">"${esc(r.text)}"</p>
        <div class="review-name">— ${esc(r.name || "Verified buyer")}</div>
      </div>`).join("")}
    </div>
  </div>` : ""}
  <div id="related-wrap" style="padding-bottom:50px">
    <div class="section-head"><div class="kicker">YOU MAY ALSO LOVE</div><h2>Related Beauties</h2></div>
    <div class="grid" id="related-grid"></div>
  </div>`;

  let qty = 1;
  const mainImg = $("#pd-main-img");
  const mainVideo = $("#pd-main-video");
  const videoThumb = wrap.querySelector(".pd-thumb-video");
  const thumbs = wrap.querySelectorAll(".pd-thumbs img");
  function clearThumbActive() {
    thumbs.forEach((x) => x.classList.remove("active"));
    if (videoThumb) videoThumb.classList.remove("active");
  }
  thumbs.forEach((t) => t.addEventListener("click", () => {
    clearThumbActive();
    t.classList.add("active");
    if (mainVideo) { mainVideo.pause(); mainVideo.style.display = "none"; }
    if (mainImg) { mainImg.style.display = "block"; mainImg.src = t.dataset.full; }
  }));
  if (videoThumb) videoThumb.addEventListener("click", () => {
    clearThumbActive();
    videoThumb.classList.add("active");
    if (mainImg) mainImg.style.display = "none";
    if (mainVideo) { mainVideo.style.display = "block"; mainVideo.play().catch(() => {}); }
  });
  $("#q-inc").addEventListener("click", () => { qty = Math.min(10, qty + 1); $("#q-val").textContent = qty; });
  $("#q-dec").addEventListener("click", () => { qty = Math.max(1, qty - 1); $("#q-val").textContent = qty; });
  $("#pd-add").addEventListener("click", () => { Cart.add(p.id, qty); });
  $("#pd-buy").addEventListener("click", (e) => {
    e.preventDefault();
    const orderNo = newOrderNo();
    const msg =
`✨ *VELVETTE — New Order* ✨
━━━━━━━━━━━━━━━━━━━━
🧾 Order No: *${orderNo}*
━━━━━━━━━━━━━━━━━━━━
🛍️ *Your Item*
1. ${p.name} (Code: ${p.id.toUpperCase()}) x${qty} — ${fmtRs(p.price * qty)}
━━━━━━━━━━━━━━━━━━━━
💰 *Bill*
Item total: ${fmtRs(p.price * qty)}
Delivery: ${fmtRs(CONFIG.shippingFee)} (FREE over ${fmtRs(CONFIG.freeShippingOver)})
💵 Cash on Delivery
━━━━━━━━━━━━━━━━━━━━
👤 *My Details*
Name:
Phone:
Address:
City:
━━━━━━━━━━━━━━━━━━━━
💖 Thank you for shopping with Velvette! We will confirm your order shortly. Please keep your order number safe for tracking.
🎁 Velvette Rewards: 5 orders = 1 FREE gift!`;
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
      tag: "COMPLETE SET", name: "Velvette Complete Set",
      items: ["v25", "v26", "v27"], price: 3999,
      note: "Daisy jewelry set + makeup deal + pearl set. The full Velvette look.",
    },
    {
      tag: "JEWELRY COMBO", name: "Date-Night Jewelry Duo",
      items: ["v25", "v27"], price: 2799,
      note: "Gold-plated daisy set + white pearl set. Unforgettable.",
    },
    {
      tag: "GLOW DUO", name: "Glow Duo",
      items: ["v26", "v27"], price: 2499,
      note: "Makeup deal + pearl set. Base routine and timeless pearls.",
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
    const orderNo = newOrderNo();
    const msg =
`✨ *VELVETTE — New Order* ✨
━━━━━━━━━━━━━━━━━━━━
🧾 Order No: *${orderNo}*
━━━━━━━━━━━━━━━━━━━━
🎁 *Bundle: ${b.name}*
${b.qtyNote ? `- ${b.qtyNote}` : items.map((p) => `- ${p.name} (Code: ${p.id.toUpperCase()})`).join("\n")}
━━━━━━━━━━━━━━━━━━━━
💰 *Bundle Price (Cash on Delivery): ${fmtRs(b.price)}*
Delivery: ${fmtRs(CONFIG.shippingFee)} (FREE over ${fmtRs(CONFIG.freeShippingOver)})
━━━━━━━━━━━━━━━━━━━━
👤 *My Details*
Name:
Phone:
Address:
City:
━━━━━━━━━━━━━━━━━━━━
💖 Thank you for shopping with Velvette! We will confirm your order shortly. Please keep your order number safe for tracking.
🎁 Velvette Rewards: 5 orders = 1 FREE gift!`;
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
      const orderNo = newOrderNo();
      const orderLines = lines.map((i, n) => `${n + 1}. ${i.p.name} (Code: ${i.p.id.toUpperCase()}) x${i.qty} — ${fmtRs(i.p.price * i.qty)}`);
      const msg =
`✨ *VELVETTE — New Order* ✨
━━━━━━━━━━━━━━━━━━━━
🧾 Order No: *${orderNo}*
━━━━━━━━━━━━━━━━━━━━
🛍️ *Your Items*
${orderLines.join("\n")}
━━━━━━━━━━━━━━━━━━━━
💰 *Bill*
Subtotal: ${fmtRs(subtotal)}
Delivery: ${shipping === 0 ? "FREE 🎉" : fmtRs(shipping)}
*Total (Cash on Delivery): ${fmtRs(total)}*
━━━━━━━━━━━━━━━━━━━━
👤 *Delivery Details*
Name: ${fd.get("name")}
Phone: ${fd.get("phone")}
Address: ${fd.get("address")}
City: ${fd.get("city")}
━━━━━━━━━━━━━━━━━━━━
💖 Thank you for shopping with Velvette! We will confirm your order shortly. Please keep your order number safe for tracking.
🎁 Velvette Rewards: 5 orders = 1 FREE gift!`;
      window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
      toast(`Order ${orderNo} — opening WhatsApp… send the message to confirm ✅`);
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
  observeReveals();
  initHome();
  initShop();
  initProductPage();
  initOffers();
  initCountdown();
  initCartPage();
});

/* ---------------- lipstick sparkle trail ---------------- */
(function initLipstickTrail() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const GLYPHS = ["✦", "✧", "✦", "•"];
  const COLORS = ["#e05575", "#d4af37", "#f4a7bb", "#b76e79"];
  let last = 0;
  document.addEventListener("mousemove", (e) => {
    const now = performance.now();
    if (now - last < 60) return;
    last = now;
    const s = document.createElement("span");
    s.className = "velvette-sparkle";
    s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    const size = 8 + Math.random() * 8;
    s.style.left = e.clientX + (Math.random() * 14 - 7) + "px";
    s.style.top = e.clientY + (Math.random() * 10 - 2) + "px";
    s.style.fontSize = size + "px";
    s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
    setTimeout(() => s.remove(), 1000);
  }, { passive: true });
})();

/* ---------- floating social rail: WhatsApp + Instagram, bottom-right ---------- */
(function () {
  if (document.querySelector(".social-rail")) return;
  var WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
  var IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg>';
  var rail = document.createElement("div");
  rail.className = "social-rail";
  rail.innerHTML =
    '<a class="wa" href="https://wa.me/923335017388" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">' + WA + '</a>' +
    '<a class="ig" href="https://www.instagram.com/velvette.pk1/" target="_blank" rel="noopener" aria-label="Follow us on Instagram">' + IG + '</a>';
  document.body.appendChild(rail);
})();
