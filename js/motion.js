/* Perla Dental · motion.js
   Entradas, micro-interacciones y scroll suave. Va aparte de main.js: si falla,
   la web sigue funcionando completa (todo el contenido es visible por defecto).
   Tesis: "la sonrisa se enfoca". */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- 1. Máscaras de título: cada línea queda envuelta para poder "subir" ---------- */
  const wrapLines = (spans) =>
    spans.forEach((span) => {
      if (span.querySelector('.mask')) return;
      const inner = document.createElement('span');
      inner.className = 'mask__in';
      while (span.firstChild) inner.appendChild(span.firstChild);
      const mask = document.createElement('span');
      mask.className = 'mask';
      mask.appendChild(inner);
      span.appendChild(mask);
    });

  wrapLines($$('.hero__title > span'));
  wrapLines($$('.title > span'));

  /* ---------- 2. Momento estrella: el hero arranca cuando su foto está lista ---------- */
  const ready = () => root.classList.add('is-ready');
  const heroPhoto = $('.hero__photo');
  const go = () => requestAnimationFrame(() => requestAnimationFrame(ready));

  if (heroPhoto && !heroPhoto.complete) {
    heroPhoto.addEventListener('load', go, { once: true });
    heroPhoto.addEventListener('error', go, { once: true });
    setTimeout(go, 1500);
  } else {
    go();
  }

  /* ---------- 3. Cifra del hero: cuenta hasta su valor ---------- */
  const num = $('.hero__num');

  if (num && !reduce) {
    const final = num.textContent.trim(); // "8.000+"
    const target = parseInt(final.replace(/\D/g, ''), 10);
    const plus = final.endsWith('+') ? '+' : '';
    const format = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + plus;

    num.style.minWidth = `${num.offsetWidth}px`; // evita que la tarjeta cambie de ancho mientras cuenta
    num.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = final; // los lectores de pantalla leen el valor final, no los intermedios
    const shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = format(0);
    num.append(sr, shown);

    const run = () => {
      const t0 = performance.now();
      const duration = 1900;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        shown.textContent = format(Math.round(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const arm = () => setTimeout(run, 1100);
    if (root.classList.contains('is-ready')) arm();
    else new MutationObserver((_, obs) => { if (root.classList.contains('is-ready')) { obs.disconnect(); arm(); } })
      .observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- 4. Entradas al hacer scroll ---------- */
  const reveals = [
    ['.section-head .title', 'title'],
    ['.section-head__text', 'fade'],
    ['.svc__list', 'stagger'],
    ['.svc__foot', 'fade'],
    ['.tile--clinic', 'curtain-l'],
    ['.tile--smile', 'curtain-r'],
    ['.tile--senior', 'curtain-b'],
    ['.tile--chair', 'curtain-r'],
    ['.promo__copy', 'stagger'],
    ['.promo__mascot', 'pop'],
    ['.team__track', 'stagger'],
    ['.team__nav', 'fade'],
    ['.booking__form > .title', 'title'],
    ['.booking__intro', 'fade'],
    ['.stepper', 'fade'],
    ['.wizard', 'fade'],
    ['.open', 'fade'],
    ['.aside__title', 'fade'],
    ['.aside__list', 'stagger'],
    ['.footer__bigname', 'wipe'],
    ['.footer__grid', 'stagger'],
    ['.legal', 'fade']
  ];

  const targets = [];
  reveals.forEach(([selector, type]) =>
    $$(selector).forEach((el) => {
      el.dataset.rv = type;
      if (type === 'stagger') Array.from(el.children).forEach((child, i) => child.style.setProperty('--i', Math.min(i, 7)));
      targets.push(el);
    })
  );

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    // sin margen inferior: la barra final de la página no puede subir más de lo que el scroll permite
    }, { threshold: 0.12 });
    targets.forEach((el) => io.observe(el));

    // La mascota flota solo mientras se ve (un bucle no esencial se detiene fuera de pantalla)
    const mascot = $('.promo__mascot');
    if (mascot) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => mascot.classList.toggle('is-visible', entry.isIntersecting));
      }).observe(mascot);
    }
  } else {
    targets.forEach((el) => el.classList.add('is-in')); // sin IntersectionObserver: todo visible
  }

  /* ---------- 5. Scroll suave con inercia (Lenis) + progreso de lectura ---------- */
  const header = $('.header');
  let lenis = null;

  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    // el panel del chat tiene su propio scroll: Lenis no debe interceptarlo
    const chatPanel = $('.chat__panel');
    if (chatPanel) chatPanel.setAttribute('data-lenis-prevent', '');
  }

  if (header) {
    let queued = false;
    const progress = () => {
      queued = false;
      const total = root.scrollHeight - window.innerHeight;
      header.style.setProperty('--progress', total > 0 ? (window.scrollY / total).toFixed(4) : '0');
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(progress); }
    }, { passive: true });
    window.addEventListener('resize', progress);
    progress();
  }

  // Los enlaces internos se deslizan con la misma suavidad (y descuentan la cabecera fija)
  $$('a[href^="#"]').forEach((link) => {
    if (link.classList.contains('skip-link')) return;
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href');
      if (!hash || hash.length < 2) return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      const offset = (header ? header.offsetHeight : 0) + 16;
      // El destino se calcula con el scroll REAL de este instante (no con el estado interno de Lenis,
      // que puede ir un fotograma por detrás si algo movió la página justo antes del clic)
      const y = hash === '#inicio' ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
      if (lenis) lenis.scrollTo(y, { duration: 1.5 });
      else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', hash);
    });
  });

  /* ---------- 5b. Enlaces en frases: efecto "roll" (la palabra sube y entra su gemela) ---------- */
  const rollLink = (link) => {
    if (link.querySelector('.roll')) return;
    const hint = link.querySelector('.visually-hidden'); // aviso para lectores de pantalla: se conserva
    const nodes = Array.from(link.childNodes).filter((n) => n !== hint);
    const label = nodes.map((n) => n.textContent).join('').trim();
    if (!label) return;
    nodes.forEach((n) => link.removeChild(n));
    const wrap = document.createElement('span');
    wrap.className = 'roll';
    const a = document.createElement('span');
    a.className = 'roll__a';
    a.textContent = label;
    const b = document.createElement('span');
    b.className = 'roll__b';
    b.setAttribute('aria-hidden', 'true'); // la gemela es solo visual
    b.textContent = label;
    wrap.append(a, b);
    link.insertBefore(wrap, link.firstChild);
  };
  window.rollLink = rollLink; // main.js lo usa para el enlace que crea el chat
  $$('.hero__call a, .svc__hint a, .credit-link').forEach(rollLink);

  /* ---------- 6. Botones: segunda flecha para el intercambio, y atracción magnética ---------- */
  $$('.btn__icon').forEach((icon) => {
    const arrow = icon.querySelector('svg');
    if (!arrow) return;
    const twin = arrow.cloneNode(true);
    twin.setAttribute('aria-hidden', 'true');
    icon.appendChild(twin);
  });

  if (fine && !reduce) {
    $$('.btn').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        btn.style.setProperty('--mx', `${(x * 0.7).toFixed(2)}rem`);
        btn.style.setProperty('--my', `${(y * 0.7).toFixed(2)}rem`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.removeProperty('--mx');
        btn.style.removeProperty('--my');
      });
    });
  }

  /* ---------- 7. Ráfaga de perlas cuando se pide la cita con éxito (la dispara booking.js) ---------- */
  const burst = (origin) => {
    const r = origin.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'burst';
    box.setAttribute('aria-hidden', 'true');
    box.style.left = `${r.left + r.width / 2}px`;
    box.style.top = `${r.top + r.height / 2}px`;
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.className = 'burst__p';
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      const dist = 3.5 + Math.random() * 3.5;
      p.style.setProperty('--dx', `${(Math.cos(angle) * dist).toFixed(2)}rem`);
      p.style.setProperty('--dy', `${(Math.sin(angle) * dist - 1).toFixed(2)}rem`);
      p.style.animationDelay = `${Math.random() * 0.12}s`;
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1500);
  };

  if (!reduce) {
    document.addEventListener('booking:success', (e) => {
      const origin = e.detail && e.detail.origin;
      if (origin) requestAnimationFrame(() => burst(origin)); // un fotograma después, cuando el resumen ya ocupa su sitio
    });
  }
})();
