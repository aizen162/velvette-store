/* ============================================================
   VELVETTE REWARDS — stateless loyalty code validation
   ------------------------------------------------------------
   Code format:  VLVT-XXXXXX
                 └─ 5 random base36 chars + 1 check digit

   Check digit:  h = 0
                 for ch in (SECRET + first5chars):
                     h = (h * 31 + charCode(ch)) >>> 0   (32-bit)
                 check = BASE36[h % 36]

   The owner generates codes with tools/gen_code.py (same algorithm)
   and sends one per confirmed WhatsApp order. A customer enters 5
   unused, distinct, valid codes to unlock 1 free product ≤ Rs 500.
   Used codes are stored in localStorage so a code can't be reused.
   IMPORTANT: change LOYALTY_SECRET here AND in tools/gen_code.py
   (keep them identical). This is a deterrent, not bank-grade crypto —
   the owner always re-confirms every order on WhatsApp anyway.
   ============================================================ */
const LOYALTY_SECRET="vv-563ec189f67bc7aa10dd28faf4d62075";
const LOYALTY_MAX_GIFT = 500;
const LOYALTY_NEEDED = 5;
const USED_KEY = "velvette_used_codes_v1";
const B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function loyaltyCheckDigit(payload5) {
  let h = 0;
  const s = LOYALTY_SECRET + payload5;
  for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) >>> 0);
  return B36[h % 36];
}

// Accepts "VLVT-ABCDEF", "vlvt abcdef", "ABCDEF" -> "VLVT-ABCDEF" or null
function loyaltyNormalize(raw) {
  let s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("VLVT")) s = s.slice(4);
  if (s.length !== 6) return null;
  for (const ch of s) if (!B36.includes(ch)) return null;
  return "VLVT-" + s;
}

function loyaltyValidate(raw) {
  const code = loyaltyNormalize(raw);
  if (!code) return { ok: false, reason: "Code must look like VLVT-XXXXXX", code: null };
  const payload = code.slice(5); // after "VLVT-"
  const expected = loyaltyCheckDigit(payload.slice(0, 5));
  if (payload[5] !== expected) return { ok: false, reason: "Invalid code — check and try again", code };
  if (loyaltyUsedCodes().includes(code)) return { ok: false, reason: "This code was already used", code };
  return { ok: true, reason: "Valid ✓", code };
}

function loyaltyUsedCodes() {
  try { return JSON.parse(localStorage.getItem(USED_KEY)) || []; } catch { return []; }
}
function loyaltyMarkUsed(codes) {
  const used = loyaltyUsedCodes();
  for (const c of codes) if (!used.includes(c)) used.push(c);
  localStorage.setItem(USED_KEY, JSON.stringify(used));
}

/* ---------------- page logic ---------------- */
let giftProducts = [];
let selectedGift = null;
let unlockedCodes = [];

async function initLoyaltyPage() {
  const entry = $("#code-entry");
  if (!entry) return;

  const products = await getProducts();
  giftProducts = products.filter((p) => p.price <= LOYALTY_MAX_GIFT);

  const inputsWrap = $("#code-inputs");
  inputsWrap.innerHTML = Array.from({ length: LOYALTY_NEEDED }, (_, i) =>
    `<input maxlength="12" placeholder="VLVT-XXXXXX" data-idx="${i}" autocomplete="off" spellcheck="false">`
  ).join("");
  const inputs = [...inputsWrap.querySelectorAll("input")];
  inputs.forEach((inp, i) => {
    inp.addEventListener("input", () => { validateAll(inputs); });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); (inputs[i + 1] || inputs[0]).focus(); }
    });
  });
  $("#claim-box").innerHTML = claimFormHTML();
  $("#claim-btn").addEventListener("click", claimGift);
}

function validateAll(inputs) {
  const status = $("#code-status");
  const codes = [];
  const seen = new Set();
  let allOk = true;

  inputs.forEach((inp) => {
    inp.classList.remove("valid", "invalid", "used");
    const v = inp.value.trim();
    if (!v) { allOk = false; return; }
    const r = loyaltyValidate(v);
    const norm = r.code || loyaltyNormalize(v);
    if (seen.has(norm)) {
      inp.classList.add("invalid"); allOk = false; return;
    }
    seen.add(norm);
    if (r.ok) { inp.classList.add("valid"); codes.push(norm); }
    else {
      inp.classList.add(r.reason.includes("already used") ? "used" : "invalid");
      allOk = false;
    }
  });

  if (codes.length === LOYALTY_NEEDED) {
    status.textContent = "🎉 All 5 codes accepted — pick your FREE gift below!";
    status.className = "code-status ok";
    unlockedCodes = codes;
    showGiftPicker();
  } else {
    const n = codes.length;
    status.textContent = n ? `${n} of ${LOYALTY_NEEDED} codes valid — keep going…` : "Enter the 5 order codes you received on WhatsApp.";
    status.className = "code-status";
    $("#gift-picker").classList.remove("show");
  }
}

function showGiftPicker() {
  const picker = $("#gift-picker");
  picker.classList.add("show");
  const grid = $("#gift-grid");
  grid.innerHTML = giftProducts.map((p) => `
    <div class="gift-card" data-gift="${p.id}">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <div class="g-body">
        <div class="g-name">${p.name}</div>
        <div class="g-price"><s>Rs ${p.price.toLocaleString("en-PK")}</s><span class="g-free">FREE 🎁</span></div>
      </div>
    </div>`).join("");
  [...grid.querySelectorAll(".gift-card")].forEach((card) => {
    card.addEventListener("click", () => {
      [...grid.querySelectorAll(".gift-card")].forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedGift = giftProducts.find((p) => p.id === card.dataset.gift);
      $("#claim-box").classList.add("show");
      $("#claim-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function claimFormHTML() {
  return `
    <h3 class="serif" style="margin-bottom:6px">Claim Your Free Gift 🎁</h3>
    <p style="color:var(--plum-soft);font-size:.92rem;margin-bottom:18px">Tell us where to send it — delivery is on us!</p>
    <div class="checkout-form" style="max-width:440px;margin:0 auto;text-align:left">
      <div class="field"><input id="claim-name" placeholder="Full Name *"></div>
      <div class="field"><input id="claim-phone" placeholder="Phone / WhatsApp *"></div>
      <div class="field"><input id="claim-address" placeholder="House, street, area *"></div>
      <div class="field"><input id="claim-city" placeholder="City *"></div>
      <button class="btn btn-gold btn-block" id="claim-btn" style="margin-top:6px">🎁 Claim Free Gift on WhatsApp</button>
      <p class="form-note">Your 5 codes will be marked as used after claiming.</p>
    </div>`;
}

async function claimGift() {
  if (!selectedGift || unlockedCodes.length !== LOYALTY_NEEDED) {
    toast("Pick your gift first 💝");
    return;
  }
  const name = $("#claim-name").value.trim();
  const phone = $("#claim-phone").value.trim();
  const address = $("#claim-address").value.trim();
  const city = $("#claim-city").value.trim();
  if (!name || !phone || !address || !city) { toast("Please fill in all delivery details 📝"); return; }

  const msg =
`🎁 *VELVETTE REWARDS — FREE GIFT CLAIM*
--------------------------------
Codes redeemed:
${unlockedCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}
--------------------------------
🎁 Free gift: ${selectedGift.name}
(Delivery: FREE)

👤 Name: ${name}
📞 Phone: ${phone}
📍 Address: ${address}
🏙️ City: ${city}`;
  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  loyaltyMarkUsed(unlockedCodes);
  toast("Opening WhatsApp… your codes are now used ✅");
}

document.addEventListener("DOMContentLoaded", initLoyaltyPage);
