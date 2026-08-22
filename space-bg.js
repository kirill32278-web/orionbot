/* Анимированный космический фон: звёздное поле с параллаксом,
   медленно вращающаяся спиральная галактика и редкие падающие звёзды.
   Полностью процедурный canvas — без внешних изображений. */
(function () {
  const canvas = document.getElementById('space-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- звёздные слои (параллакс) ---------- */
  function makeStars(count, sizeRange, speed, hue) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        r: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        baseAlpha: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.6 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * speed,
        vy: speed * (0.25 + Math.random() * 0.5),
        hue
      });
    }
    return stars;
  }
  const layers = [
    { stars: makeStars(140, [0.5, 1.2], 0.9, '255,255,255'), twinkle: true },
    { stars: makeStars(90, [0.8, 1.8], 1.8, '160,190,255'), twinkle: true },
    { stars: makeStars(55, [1.2, 2.6], 3.2, '210,175,255'), twinkle: false }
  ];

  function wrap(v, min, max) {
    const range = max - min;
    if (v < min) return v + range;
    if (v > max) return v - range;
    return v;
  }

  /* ---------- галактика (процедурная спираль) ---------- */
  const galaxy = { angle: 0, cx: 0.78, cy: 0.28, scale: 1 };
  function drawGalaxy(t) {
    const cx = W * galaxy.cx, cy = H * galaxy.cy;
    const baseR = Math.max(W, H) * 0.42;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(galaxy.angle);

    // мягкое ядро
    let core = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 0.32);
    core.addColorStop(0, 'rgba(255,244,214,0.32)');
    core.addColorStop(0.35, 'rgba(210,170,255,0.16)');
    core.addColorStop(1, 'rgba(120,90,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // спиральные рукава — вытянутые полупрозрачные эллипсы, разнесённые по кругу
    const arms = 3;
    const armPoints = 26;
    for (let a = 0; a < arms; a++) {
      const armOffset = (a / arms) * Math.PI * 2;
      for (let i = 0; i < armPoints; i++) {
        const p = i / armPoints;
        const radius = baseR * (0.12 + p * 0.88);
        const ang = armOffset + p * 3.4 + Math.sin(t * 0.05 + a) * 0.05;
        const x = Math.cos(ang) * radius;
        const y = Math.sin(ang) * radius * 0.42; // приплюснуто для перспективы
        const size = (1 - p) * 26 + 6;
        const alpha = (1 - p) * 0.09;
        if (alpha <= 0.003) continue;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        grad.addColorStop(0, 'rgba(200,190,255,' + alpha + ')');
        grad.addColorStop(1, 'rgba(90,70,180,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- падающие звёзды ---------- */
  let shootingStars = [];
  function maybeSpawnShootingStar() {
    if (reduceMotion) return;
    if (Math.random() < 0.006 && shootingStars.length < 2) {
      const startX = Math.random() * W * 0.7 + W * 0.15;
      const startY = Math.random() * H * 0.3;
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
      const speed = 9 + Math.random() * 6;
      shootingStars.push({
        x: startX, y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0, maxLife: 40 + Math.random() * 20
      });
    }
  }
  function drawShootingStars() {
    shootingStars.forEach(s => {
      const tailX = s.x - s.vx * 3.2, tailY = s.y - s.vy * 3.2;
      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      const fade = 1 - s.life / s.maxLife;
      grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * fade) + ')');
      grad.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      s.x += s.vx; s.y += s.vy; s.life++;
    });
    shootingStars = shootingStars.filter(s => s.life < s.maxLife && s.y < H + 50 && s.x < W + 50);
  }

  /* ---------- основной рендер ---------- */
  function drawStatic() {
    ctx.fillStyle = '#020309';
    ctx.fillRect(0, 0, W, H);
    drawGalaxy(0);
    layers.forEach(layer => {
      layer.stars.forEach(s => {
        const x = wrap(s.x, -50, W + 50);
        const y = wrap(s.y, -50, H + 50);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + s.hue + ',' + s.baseAlpha + ')';
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  let t = 0;
  let running = false;
  function frame() {
    if (!running) return;
    t += 1;
    ctx.fillStyle = '#020309';
    ctx.fillRect(0, 0, W, H);

    galaxy.angle += 0.00035;
    drawGalaxy(t);

    layers.forEach(layer => {
      layer.stars.forEach(s => {
        s.x += s.vx * 0.05;
        s.y += s.vy * 0.05;
        s.x = wrap(s.x, -1000, 1000);
        s.y = wrap(s.y, -1000, 1000);
        const sx = wrap(s.x, -50, W + 50);
        const sy = wrap(s.y, -50, H + 50);
        let alpha = s.baseAlpha;
        if (layer.twinkle) {
          alpha *= 0.55 + 0.45 * Math.sin(t * 0.02 * s.twinkleSpeed + s.phase);
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + s.hue + ',' + Math.max(0, alpha) + ')';
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    maybeSpawnShootingStar();
    drawShootingStars();

    requestAnimationFrame(frame);
  }

  // нормализуем координаты звёзд под текущий размер экрана один раз при старте
  function seedPositions() {
    layers.forEach(layer => {
      layer.stars.forEach(s => {
        s.x = Math.random() * (W + 100) - 50;
        s.y = Math.random() * (H + 100) - 50;
      });
    });
  }
  seedPositions();
  window.addEventListener('resize', () => { seedPositions(); });

  if (reduceMotion) {
    drawStatic();
  } else {
    running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);
  }
})();
