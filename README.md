# 💖 Velvette — Beauty & Jewelry

A complete static e-commerce website for **Velvette**, a beauty & jewelry store for girls (cosmetics, skincare, chains/necklaces, bracelets, accessories). Pakistan-wide delivery, PKR pricing, WhatsApp checkout.

**Live stack:** plain HTML/CSS/JS — no build step, no backend. Drop the folder contents into a GitHub repo and enable GitHub Pages.

## 📁 File map

| File | What it does |
|---|---|
| `index.html` | Homepage — hero with 3D rotating product showcase (drag to spin, tap to view), category tiles, bestsellers, offer banner with live countdown |
| `shop.html` | Shop — live search, category filter pills, price/name sorting |
| `product.html?id=…` | Product detail — PKR price, quantity, Add to Bag, "Order Now on WhatsApp", related products |
| `offers.html` | Dedicated offers page — launch offer with live countdown + claimable bundle deals |
| `loyalty.html` | **Velvette Rewards** — enter 5 order codes → unlock free-gift picker (products ≤ Rs 500) → claim on WhatsApp |
| `assets/products.json` | The entire catalog (edit this to change products) |
| `assets/css/style.css` | Full theme (blush pink / rose gold / cream / deep plum / gold) |
| `assets/js/app.js` | Store config, product cards, site-wide **cart drawer**, WhatsApp checkout builder, search/filter, countdown, 3D tilt-on-hover |
| `assets/js/hero-3d.js` | Three.js (r128) rotating 3D product ring on the homepage |
| `assets/js/loyalty.js` | Rewards code validation, used-code tracking, gift picker, WhatsApp claim |
| `assets/img/vNN.svg` | Elegant **placeholder** product covers (replace with real photos) |
| `tools/gen_code.py` | Generate Velvette Rewards order codes |
| `tools/make_placeholders.py` | Regenerate the placeholder SVG covers |

## 🛒 Store settings (in `assets/js/app.js`, top of file)

```js
const CONFIG = {
  whatsappNumber: "923335017388", // WhatsApp checkout number
  shippingFee: 180,               // flat Rs 180 nationwide
  freeShippingOver: 2500,         // free delivery over Rs 2,500
  launchDeadline: "2026-10-31T23:59:59+05:00", // launch offer countdown
};
```

Change the deadline here and it updates on **both** the homepage banner and `offers.html`.

## 📦 Editing products (`assets/products.json`)

⚠️ **The 24 products in the catalog are SAMPLES** — replace them with real inventory before launch.

Each product:

```json
{
  "id": "v01",
  "name": "Velvet Matte Lipstick — Rose Desire",
  "category": "makeup",          // makeup | skincare | necklaces | bracelets | accessories
  "price": 450,                  // PKR, integer
  "oldPrice": 990,               // optional — shows strikethrough + SAVE %
  "badge": "bestseller",         // optional: new | bestseller | sale
  "description": "…",
  "image": "assets/img/v01.svg"  // path to product image
}
```

Rules: `id` unique, `price` in PKR (no decimals), keep `category` to one of the 5 values, and keep **at least a few products at Rs 500 or below** — those are the free-gift pool for Velvette Rewards.

## 🖼️ Swapping in real product images

1. Save real photos as `assets/img/v01.jpg` (same filename, `.jpg` instead of `.svg`).
2. In `assets/products.json`, change `"image": "assets/img/v01.svg"` → `"assets/img/v01.jpg"`.
3. Delete the old `v01.svg` (optional — harmless if left).

Recommended: square-ish photos, ~1200×1500px, under 300 KB each.

## 🎁 Velvette Rewards — the order-code scheme

**The deal:** after 5 purchases the customer picks **any 1 product worth ≤ Rs 500 FREE** (delivery free too).

**How it works (stateless — no server needed):**
- When you confirm an order on WhatsApp, generate a code and send it to the customer.
- Codes look like `VLVT-XXXXXX` (e.g. `VLVT-85GFOH`).
- On `loyalty.html` the customer enters 5 codes. The page validates each code's **check digit** in the browser, rejects fake/duplicate codes, and remembers used codes in `localStorage` so a code can't be claimed twice.
- With 5 valid unused codes, the gift picker unlocks showing only products ≤ Rs 500. The claim button builds a WhatsApp message listing all 5 codes (so you can double-check them).

**Exact scheme** (identical in `assets/js/loyalty.js` and `tools/gen_code.py`):

```
code = "VLVT-" + <5 random base36 chars> + <check digit>
check:  h = 0
        for ch in (SECRET + first5chars):
            h = (h*31 + charCode(ch)) mod 2^32
        check = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[h mod 36]
```

**Issuing codes — do this per confirmed order:**

```bash
cd tools
python3 gen_code.py 5      # prints 5 codes — send one per customer order
```

⚠️ **Before launch, change the secret** — it's currently `"VELVETTE-CHANGE-ME-2026"`. Pick something private and set it in **both**:
- `assets/js/loyalty.js` → `const LOYALTY_SECRET = "…"`
- `tools/gen_code.py` → `LOYALTY_SECRET = "…"`

Codes generated with the old secret will stop validating — that's the point.

**Honest limitation:** the secret lives in client-side JS, so this is a *deterrent*, not bank-grade security. It stops casual code-guessing; you always re-verify codes against your own order records on WhatsApp before shipping the free gift.

## 🚀 Deploy to GitHub Pages

1. Create a repo (e.g. `aizen162/velvette-store`) — **do not push without the owner's go-ahead**.
2. Upload the **contents** of this folder to the repo **root** (so `index.html` is at the top level, not inside a subfolder).
3. Repo → Settings → Pages → Deploy from branch → `main` / `(root)` → Save.
4. Site goes live at `https://<username>.github.io/velvette-store/`.

## 🧪 Local testing

```bash
cd velvette-store
python3 -m http.server 8000
# then open http://localhost:8000/
```

## 🎨 3D notes

- Homepage hero uses Three.js **r128** from cdnjs (allowed CDN). If the CDN is blocked, the rest of the site still works — only the hero canvas stays empty.
- `hero-3d.js`: 10 product cards on a ring — auto-rotates, drag to spin (with inertia), tap a card to open its product page. SVG covers load as card textures; if one fails, a rose-gold fallback face is drawn.
- Shop cards have a subtle 3D tilt-on-hover (desktop only, disabled on touch devices).

## ✅ Pre-launch checklist

- [ ] Replace the 24 sample products with real inventory + real photos
- [ ] Change `LOYALTY_SECRET` in both `loyalty.js` and `gen_code.py`
- [ ] Set the real launch-offer deadline in `app.js` (`CONFIG.launchDeadline`)
- [ ] Confirm WhatsApp number `923335017388` is correct
- [ ] Test an order + a rewards claim end-to-end on your phone
