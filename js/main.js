/* Perla Dental · main.js
   Demo de Astravia Studio. Sin dependencias. */

(() => {
  'use strict';

  /* ---------- Hero: usa la foto solo si existe assets/img/hero.jpg ---------- */
  const heroPhoto = document.querySelector('.hero__photo');

  if (heroPhoto) {
    const hero = heroPhoto.closest('.hero');
    const show = () => hero.classList.add('has-photo');
    if (heroPhoto.complete && heroPhoto.naturalWidth > 0) show();
    else heroPhoto.addEventListener('load', show);
  }

  /* ---------- Cabecera fija: transparente arriba del todo, sólida en cuanto hay scroll ---------- */
  const header = document.querySelector('.header');

  if (header) {
    let ticking = false;
    const updateHeader = () => {
      ticking = false;
      // Sólida desde el primer scroll: así el contenido que pasa por debajo no choca con el menú
      header.classList.toggle('is-solid', window.scrollY > 32);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
    }, { passive: true });
    updateHeader();
  }

  /* ---------- Enlace activo según la sección visible (scrollspy) ---------- */
  const navLinks = Array.from(document.querySelectorAll('.nav__list a[href^="#"]'));

  if (navLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = Array.from(byId.keys()).map((id) => document.getElementById(id)).filter(Boolean);

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute('aria-current'));
        byId.get(entry.target.id).setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-45% 0px -50% 0px' }); // la sección que cruza el centro de la ventana

    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Collage: la foto se desplaza suavemente en sentido contrario al cursor (parallax) ---------- */
  const collage = document.querySelector('.collage');

  if (collage && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    collage.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        // máx. ±0,45rem: queda dentro del margen que deja el zoom (scale 1.07)
        tile.style.setProperty('--px', `${(-x * 0.9).toFixed(2)}rem`);
        tile.style.setProperty('--py', `${(-y * 0.9).toFixed(2)}rem`);
      });
      tile.addEventListener('pointerleave', () => {
        tile.style.removeProperty('--px');
        tile.style.removeProperty('--py');
      });
    });
  }

  /* ---------- Menú móvil ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');

  if (menuBtn && menu) {
    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.querySelector('.visually-hidden').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    };

    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- Tratamientos: acordeón ---------- */
  const svc = document.querySelector('[data-svc]');

  if (svc) {
    const items = Array.from(svc.querySelectorAll('.svc__item'));
    const buttons = items.map((item) => item.querySelector('.svc__btn'));
    let current = Math.max(0, items.findIndex((item) => item.classList.contains('is-active')));

    const setActive = (n) => {
      current = (n + items.length) % items.length;
      items.forEach((item, k) => {
        const on = k === current;
        item.classList.toggle('is-active', on);
        buttons[k].setAttribute('aria-expanded', String(on));
      });
    };

    buttons.forEach((btn, k) => {
      btn.addEventListener('click', () => setActive(k));
      btn.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        buttons[(k + dir + buttons.length) % buttons.length].focus();
      });
    });

    svc.querySelectorAll('[data-svc-dir]').forEach((btn) =>
      btn.addEventListener('click', () => setActive(current + Number(btn.dataset.svcDir)))
    );

    setActive(current);
  }

  /* ---------- Equipo: carrusel infinito con tarjeta central destacada ----------
     Se duplican las tarjetas a ambos lados. Cuando el carrusel se detiene dentro de una copia,
     salta (sin que se note) a la misma tarjeta del juego central: nunca hay un borde vacío. */
  const team = document.querySelector('[data-team]');

  if (team) {
    const track = team.querySelector('.team__track');
    const originals = Array.from(track.querySelectorAll('.doc'));
    const n = originals.length;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SETS = 2; // juegos de copias a cada lado: margen de sobra para un gesto rápido

    const copySet = () =>
      originals.map((card) => {
        const copy = card.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true'); // los lectores de pantalla solo ven las 5 reales
        copy.setAttribute('inert', '');
        copy.classList.add('doc--clone');
        return copy;
      });

    const before = [];
    const after = [];
    for (let s = 0; s < SETS; s++) {
      before.push(...copySet());
      after.push(...copySet());
    }
    track.prepend(...before);
    track.append(...after);

    const cards = Array.from(track.querySelectorAll('.doc'));
    const home = SETS * n; // posición de la primera tarjeta real
    let current = -1;
    let holding = false; // dedo o ratón sujetando el carrusel: no se salta mientras tanto

    // Si falta la foto de un especialista, se ve el busto ilustrado de respaldo
    cards.forEach((card) => {
      const img = card.querySelector('img');
      if (!img) return;
      const drop = () => img.remove();
      if (img.complete && img.naturalWidth === 0) drop();
      else img.addEventListener('error', drop);
    });

    const centerOn = (card, smooth) =>
      track.scrollTo({
        left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
        behavior: smooth && !reduceMotion ? 'smooth' : 'auto'
      });

    // La tarjeta activa es la más cercana al centro del carrusel
    const update = () => {
      const middle = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, k) => {
        const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
        if (distance < bestDistance) { bestDistance = distance; best = k; }
      });
      if (best === current) return;
      current = best;
      cards.forEach((card, k) => card.classList.toggle('is-active', k === best));
    };

    // Salto invisible: la copia y la original son idénticas, así que la tarjeta queda en el mismo sitio de la pantalla
    const recenter = () => {
      if (holding || current < 0) return;
      const setWidth = cards[n].offsetLeft - cards[0].offsetLeft;
      if (current < home) track.scrollLeft += setWidth * Math.ceil((home - current) / n);
      else if (current >= home + n) track.scrollLeft -= setWidth * Math.floor((current - home) / n);
      else return;
      update();
    };

    let settleTimer;
    track.addEventListener('scroll', () => {
      requestAnimationFrame(update);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(recenter, 140); // cuando el desplazamiento se detiene
    }, { passive: true });

    track.addEventListener('pointerdown', () => { holding = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) =>
      track.addEventListener(type, () => {
        if (!holding) return;
        holding = false;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(recenter, 200);
      })
    );

    window.addEventListener('resize', () => { if (current > -1) centerOn(cards[current], false); });

    cards.forEach((card) => card.addEventListener('click', () => centerOn(card, true)));

    // Los clics rápidos se acumulan: cada uno parte del destino pendiente, no de donde está el scroll
    let pending = null;
    let pendingTimer;
    const step = (dir) => {
      const base = pending === null ? current : pending;
      pending = Math.min(cards.length - 1, Math.max(0, base + dir));
      centerOn(cards[pending], true);
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { pending = null; }, 900);
    };

    team.querySelectorAll('[data-team-dir]').forEach((btn) =>
      btn.addEventListener('click', () => step(Number(btn.dataset.teamDir)))
    );

    // Con el carrusel enfocado, las flechas del teclado también avanzan de tarjeta en tarjeta
    track.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    });

    centerOn(cards[home + Math.floor(n / 2)], false);
    update();
  }

  /* ---------- Chat flotante (respuestas guionizadas) ---------- */
  const chat = document.querySelector('[data-chat]');

  if (chat) {
    const toggle = chat.querySelector('.chat__toggle');
    const panel = chat.querySelector('.chat__panel');
    const close = chat.querySelector('.chat__close');
    const log = chat.querySelector('.chat__log');
    const chatForm = chat.querySelector('.chat__form');
    const input = chat.querySelector('#chat-input');

    const answers = {
      horario: 'Abrimos de lunes a viernes, de 9:00 a 19:00. Los sábados atendemos urgencias con cita previa.',
      tratamientos: 'Hacemos ortodoncia, alineadores transparentes, prótesis, implantes, blanqueamiento y limpiezas. Puedes ver cada uno en la sección Tratamientos.',
      consulta: 'La primera consulta es gratuita: incluye revisión, radiografía y un plan de tratamiento con presupuesto.',
      cita: 'Puedes pedir cita en el formulario de esta página. Te confirmamos en menos de 24 horas laborables.',
      demo: 'Soy un asistente de demostración creado por {astravia}. En una web real, aquí te respondería el equipo de la clínica.'
    };

    const guess = (text) => {
      const t = text.toLowerCase();
      if (/(hora|abr|cerr|cuando)/.test(t)) return 'horario';
      if (/(trat|brackets|implante|limpieza|blanque|ortodon|alineador|pr[oó]tesis)/.test(t)) return 'tratamientos';
      if (/(gratis|gratuit|primera|consulta|precio|cuesta|presupuesto)/.test(t)) return 'consulta';
      if (/(cita|reserv|agendar|pedir)/.test(t)) return 'cita';
      return 'demo';
    };

    // Fuente única del enlace de la agencia: el crédito del footer
    const agencyLink = document.querySelector('.credit-link');

    const add = (text, who) => {
      const msg = document.createElement('p');
      msg.className = `msg msg--${who}`;

      if (text.includes('{astravia}') && agencyLink) {
        const [before, after] = text.split('{astravia}');
        const a = document.createElement('a');
        a.className = 'credit-link';
        a.href = agencyLink.href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Astravia Studio';
        const hint = document.createElement('span');
        hint.className = 'visually-hidden';
        hint.textContent = ' (abre WhatsApp en una pestaña nueva)';
        a.appendChild(hint);
        if (window.rollLink) window.rollLink(a); // mismo hover que el resto de enlaces en frases
        msg.append(before, a, after);
      } else {
        msg.textContent = text.replace('{astravia}', 'Astravia Studio');
      }

      log.appendChild(msg);
      log.scrollTop = log.scrollHeight;
    };

    const reply = (key) => setTimeout(() => add(answers[key], 'bot'), 450);

    const setOpen = (open) => {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        if (!log.children.length) add('¡Hola! Soy el asistente de Perla Dental. ¿En qué te puedo ayudar?', 'bot');
        input.focus();
      }
    };

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => { setOpen(false); toggle.focus(); });
    chat.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
    });

    chat.querySelectorAll('[data-q]').forEach((btn) =>
      btn.addEventListener('click', () => {
        add(btn.textContent, 'me');
        reply(btn.dataset.q);
      })
    );

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      add(text, 'me');
      input.value = '';
      reply(guess(text));
    });
  }
})();
