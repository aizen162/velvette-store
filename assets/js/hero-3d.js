/* ============================================================
   VELVETTE — 3D rotating product showcase (homepage hero)
   Three.js r128. Pattern: ring of product cards, drag to spin,
   auto-rotate, tap/click a card -> opens that product page.
   ============================================================ */
(function () {
  const canvas = document.getElementById("hero-3d");
  if (!canvas || typeof THREE === "undefined") return;

  const RADIUS = 7.2;
  const CARD_W = 3.1, CARD_H = 3.9;
  const N_CARDS = 10;

  let scene, camera, renderer, group, raycaster, pointer;
  let products = [];
  let rotSpeed = 0.0035;       // auto-rotate
  let dragging = false, lastX = 0, moved = 0, velocity = 0;
  const cards = [];

  function pickProducts(all) {
    const preferred = all.filter((p) => p.badge === "bestseller" || p.badge === "new");
    const rest = all.filter((p) => !preferred.includes(p));
    return [...preferred, ...rest].slice(0, N_CARDS);
  }

  function init() {
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 480;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(0, 0.6, 14.5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xfff2f7, 0.9);
    key.position.set(4, 6, 8);
    scene.add(key);
    const rim = new THREE.PointLight(0xd4af37, 0.7, 40);
    rim.position.set(-6, -2, 6);
    scene.add(rim);

    group = new THREE.Group();
    scene.add(group);
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    loadProducts().then(() => {
      buildCards();
      bindPointer();
      animate();
    });

    window.addEventListener("resize", () => {
      const nw = canvas.clientWidth || 600, nh = canvas.clientHeight || 480;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
  }

  function loadProducts() {
    return fetch("assets/products.json")
      .then((r) => r.json())
      .then((all) => { products = pickProducts(all); });
  }

  // fallback card face when a texture fails (rose-gold gradient + initial)
  function fallbackTexture(p) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 320;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 256, 320);
    grad.addColorStop(0, "#f9dbe4"); grad.addColorStop(1, "#e9b8c9");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 320);
    g.strokeStyle = "#d4af37"; g.lineWidth = 6; g.strokeRect(12, 12, 232, 296);
    g.fillStyle = "#b76e79";
    g.font = "italic 120px Georgia"; g.textAlign = "center";
    g.fillText(p.name[0].toUpperCase(), 128, 205);
    g.font = "20px Georgia"; g.fillText("Velvette", 128, 262);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function buildCards() {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    products.forEach((p, i) => {
      const angle = (i / products.length) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.rotation.y = angle;

      const tex = loader.load(p.image, undefined, undefined, () => {
        card.material.map = fallbackTexture(p);
        card.material.needsUpdate = true;
      });
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: false });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
      card.position.set(Math.sin(0) * RADIUS, 0, Math.cos(0) * RADIUS); // at +z before pivot rotation
      card.position.set(0, 0, RADIUS);
      card.userData.productId = p.id;

      // soft gold frame behind the card
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W + 0.28, CARD_H + 0.28),
        new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide })
      );
      frame.position.set(0, 0, RADIUS - 0.02);

      pivot.add(frame);
      pivot.add(card);
      group.add(pivot);
      cards.push(card);
    });
  }

  function bindPointer() {
    const onDown = (x) => { dragging = true; lastX = x; moved = 0; velocity = 0; };
    const onMove = (x) => {
      if (!dragging) return;
      const dx = x - lastX;
      moved += Math.abs(dx);
      group.rotation.y += dx * 0.006;
      velocity = dx * 0.006;
      lastX = x;
    };
    const onUp = (x, y) => {
      dragging = false;
      if (moved < 8) handleTap(x, y); // a tap, not a drag
    };

    canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); onDown(e.clientX); });
    canvas.addEventListener("pointermove", (e) => onMove(e.clientX));
    canvas.addEventListener("pointerup", (e) => onUp(e.clientX, e.clientY));
    canvas.addEventListener("pointercancel", () => { dragging = false; });
  }

  function handleTap(x, y) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((y - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cards);
    if (hits.length) {
      const id = hits[0].object.userData.productId;
      window.location.href = "product.html?id=" + encodeURIComponent(id);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!dragging) {
      // inertia glide then settle back to auto-rotate
      group.rotation.y += velocity;
      velocity *= 0.95;
      if (Math.abs(velocity) < 0.0004) velocity = 0;
      group.rotation.y += rotSpeed;
    }
    const t = performance.now() / 1000;
    group.position.y = Math.sin(t * 0.8) * 0.15;
    renderer.render(scene, camera);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
