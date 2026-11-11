/* Perla Dental · booking.js
   Cita guiada en 3 pasos (demo: no se envía nada), resumen con descarga de .ics
   y etiqueta "Abierto ahora". Sin dependencias. */

(() => {
  'use strict';

  /* ---------- Datos de la clínica (demo) ---------- */
  const TREATMENTS = {
    consulta: 'Primera consulta gratuita',
    ortodoncia: 'Ortodoncia',
    alineadores: 'Alineadores transparentes',
    protesis: 'Prótesis dentales',
    implantes: 'Implantes dentales',
    limpieza: 'Higiene y blanqueamiento'
  };
  const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00'];
  const OPEN = { from: 9, to: 19, days: [1, 2, 3, 4, 5] }; // lunes a viernes, 9:00 a 19:00
  const MIN_ADVANCE_MIN = 30; // hoy solo se piden horas con al menos 30 min de margen
  const PLACE = 'Calle de la Demo 12, 28000 Ciudad';

  const DOW_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const DOW_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MON_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MON_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* ============================================================
     "Abierto ahora" (se recalcula cada minuto con la hora del visitante)
     ============================================================ */
  const badge = document.querySelector('[data-open]');

  if (badge) {
    const main = badge.querySelector('[data-open-main]');
    const sub = badge.querySelector('[data-open-sub]');

    const nextOpening = (now) => {
      const d = new Date(now);
      const hour = now.getHours() + now.getMinutes() / 60;
      if (OPEN.days.includes(d.getDay()) && hour < OPEN.from) return 'hoy a las 9:00';
      for (let i = 1; i <= 7; i++) {
        d.setDate(d.getDate() + 1);
        if (OPEN.days.includes(d.getDay())) return i === 1 ? 'mañana a las 9:00' : `el ${DOW_LONG[d.getDay()]} a las 9:00`;
      }
      return 'pronto';
    };

    const paint = () => {
      const now = new Date();
      const hour = now.getHours() + now.getMinutes() / 60;
      const isOpen = OPEN.days.includes(now.getDay()) && hour >= OPEN.from && hour < OPEN.to;
      badge.classList.toggle('is-closed', !isOpen);
      main.textContent = isOpen ? 'Abierto ahora' : 'Cerrado ahora';
      sub.textContent = isOpen ? ' y cerramos a las 19:00' : ` y abrimos ${nextOpening(now)}`;
    };

    paint();
    setInterval(paint, 60000);
  }

  /* ============================================================
     Cita guiada
     ============================================================ */
  const form = document.querySelector('.wizard');
  if (!form) return;

  const host = form.closest('.booking__form');
  const panels = Array.from(form.querySelectorAll('.step'));
  const items = Array.from(host.querySelectorAll('.stepper__item'));
  const btnPrev = form.querySelector('[data-prev]');
  const btnNext = form.querySelector('[data-next]');
  const btnSubmit = form.querySelector('[data-submit]');
  const status = form.querySelector('.form__status');
  const announce = host.querySelector('[data-announce]');
  const daysBox = form.querySelector('[data-days]');
  const hoursBox = form.querySelector('[data-hours]');
  const hoursHint = form.querySelector('[data-hours-hint]');
  const confirmBox = host.querySelector('.confirm');
  const last = panels.length - 1;
  let current = 0;
  let booking = null; // la última solicitud, para generar el .ics

  const checked = (name) => form.querySelector(`input[name="${name}"]:checked`);

  /* ---------- Días laborables próximos ---------- */
  const lastSlotHour = parseInt(SLOTS[SLOTS.length - 1], 10);

  const nextDays = () => {
    const now = new Date();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const out = [];
    while (out.length < 8) {
      const isToday = iso(d) === iso(now);
      const todayStillOpen = !isToday || now.getHours() + now.getMinutes() / 60 < lastSlotHour - MIN_ADVANCE_MIN / 60;
      if (OPEN.days.includes(d.getDay()) && todayStillOpen) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  };

  const renderDays = () => {
    daysBox.replaceChildren();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    nextDays().forEach((d) => {
      const label = el('label', 'day');
      const input = el('input');
      input.type = 'radio';
      input.name = 'fecha';
      input.value = iso(d);
      const card = el('span', 'day__card');
      card.append(el('span', 'day__dow', DOW_SHORT[d.getDay()]), el('span', 'day__num', String(d.getDate())), el('span', 'day__mon', MON_SHORT[d.getMonth()]));
      if (iso(d) === iso(now)) card.append(el('span', 'day__tag', 'Hoy'));
      else if (iso(d) === iso(tomorrow)) card.append(el('span', 'day__tag', 'Mañana'));
      label.append(input, card);
      daysBox.appendChild(label);
    });
  };

  /* ---------- Horas (las pasadas de hoy quedan desactivadas) ---------- */
  const slotAvailable = (dateISO, slot) => {
    const now = new Date();
    if (dateISO !== iso(now)) return true;
    const [h, m] = slot.split(':').map(Number);
    const t = new Date(now);
    t.setHours(h, m, 0, 0);
    return t.getTime() - now.getTime() > MIN_ADVANCE_MIN * 60000;
  };

  const renderHours = () => {
    const day = checked('fecha');
    const keep = checked('hora') ? checked('hora').value : null;
    hoursBox.replaceChildren();

    SLOTS.forEach((slot) => {
      const label = el('label', 'hour');
      const input = el('input');
      input.type = 'radio';
      input.name = 'hora';
      input.value = slot;
      input.disabled = !day || !slotAvailable(day.value, slot);
      if (keep === slot && !input.disabled) input.checked = true;
      label.append(input, el('span', 'hour__card', slot));
      hoursBox.appendChild(label);
    });

    hoursHint.textContent = day
      ? 'Las horas atenuadas ya no están disponibles ese día.'
      : 'Elige un día para ver las horas disponibles.';
  };

  /* ---------- Validación ---------- */
  const fields = {
    nombre: form.elements.nombre,
    telefono: form.elements.telefono,
    email: form.elements.email
  };

  const messages = {
    nombre: 'Escribe tu nombre.',
    telefono: 'Escribe un teléfono para confirmar la cita.',
    email: 'Escribe un correo válido, por ejemplo nombre@correo.com.'
  };

  const fieldOk = (f) => {
    const v = f.value.trim();
    if (f.name === 'nombre') return v.length >= 2;
    if (f.name === 'telefono') return v.replace(/\D/g, '').length >= 7;
    return v !== '' && f.checkValidity();
  };

  const setError = (field, message) => {
    const wrap = field.closest('.field');
    let error = wrap.querySelector('.field__error');
    if (!message) {
      wrap.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      if (error) error.remove();
      return;
    }
    wrap.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    if (!error) {
      error = el('p', 'field__error');
      error.id = `${field.id}-error`;
      wrap.appendChild(error);
    }
    error.textContent = message;
    field.setAttribute('aria-describedby', error.id);
  };

  const validateField = (f) => {
    const ok = fieldOk(f);
    setError(f, ok ? '' : messages[f.name]);
    return ok;
  };

  Object.values(fields).forEach((f) => {
    f.addEventListener('blur', () => { if (f.value) validateField(f); });
    f.addEventListener('input', () => { if (f.closest('.field').classList.contains('is-invalid')) validateField(f); });
  });

  const stepValid = (i) => {
    if (i === 0) return !!checked('tratamiento');
    if (i === 1) return !!checked('fecha') && !!checked('hora');
    return true;
  };

  const stepMessage = (i) =>
    i === 0 ? 'Elige un tratamiento para continuar.' : 'Elige un día y una hora para continuar.';

  /* ---------- Navegación entre pasos ---------- */
  const sync = () => {
    btnNext.disabled = !stepValid(current);
  };

  const go = (n, { focus = true } = {}) => {
    const previous = current;
    current = Math.max(0, Math.min(last, n));
    form.dataset.dir = current >= previous ? 'fwd' : 'back';

    panels.forEach((panel, i) => { panel.hidden = i !== current; });
    items.forEach((item, i) => {
      item.classList.toggle('is-current', i === current);
      item.classList.toggle('is-done', i < current);
      if (i === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });

    btnPrev.hidden = current === 0;
    btnNext.hidden = current === last;
    btnSubmit.hidden = current !== last;
    status.textContent = '';
    status.classList.remove('is-error');
    sync();

    const title = panels[current].querySelector('.step__title');
    announce.textContent = `Paso ${current + 1} de ${panels.length}: ${title.textContent}`;
    if (focus) title.focus({ preventScroll: true });
  };

  btnNext.addEventListener('click', () => {
    if (!stepValid(current)) {
      status.classList.add('is-error');
      status.textContent = stepMessage(current);
      return;
    }
    go(current + 1);
  });

  btnPrev.addEventListener('click', () => go(current - 1));

  form.addEventListener('change', (e) => {
    if (e.target.name === 'fecha') renderHours();
    status.textContent = '';
    status.classList.remove('is-error');
    sync();
  });

  // Intro dentro de un campo: avanza o envía, según el paso
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement) || e.target.type === 'radio') return;
    e.preventDefault();
    if (current === last) form.requestSubmit();
    else if (stepValid(current)) go(current + 1);
  });

  /* ---------- Resumen final ---------- */
  const longDate = (d) => `${DOW_LONG[d.getDay()]} ${d.getDate()} de ${MON_LONG[d.getMonth()]}`;

  const showConfirm = () => {
    const date = parseISO(checked('fecha').value);
    const time = checked('hora').value;
    const treatment = TREATMENTS[checked('tratamiento').value];
    const name = fields.nombre.value.trim();
    const email = fields.email.value.trim();

    booking = { date, time, treatment, name };

    confirmBox.querySelector('[data-c-name]').textContent = name.split(/\s+/)[0];
    confirmBox.querySelector('[data-c-treatment]').textContent = treatment;
    confirmBox.querySelector('[data-c-date]').textContent = longDate(date);
    confirmBox.querySelector('[data-c-time]').textContent = `${time} h`;
    confirmBox.querySelector('[data-c-contact]').textContent = email;

    host.dataset.state = 'done';
    form.hidden = true;
    confirmBox.hidden = false;
    confirmBox.querySelector('.confirm__title').focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('booking:success', { detail: { origin: confirmBox.querySelector('.confirm__badge') } }));
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.classList.remove('is-error');
    status.textContent = '';

    if (current !== last) {
      if (stepValid(current)) go(current + 1);
      return;
    }

    const invalid = Object.values(fields).filter((f) => !validateField(f));
    if (invalid.length) {
      invalid[0].focus();
      status.classList.add('is-error');
      status.textContent = invalid.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${invalid.length} campos marcados.`;
      return;
    }
    showConfirm();
  });

  /* ---------- Añadir al calendario: el visitante elige cuál (la cita aún no está confirmada) ----------
     Google y Outlook abren el evento ya rellenado en una pestaña nueva, sin descargar nada.
     Solo la opción "Apple Calendar u otro" descarga un archivo .ics. */
  const icsText = (s) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const floating = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const enc = encodeURIComponent;

  const eventData = () => {
    if (!booking) return null;
    const [h, m] = booking.time.split(':').map(Number);
    const start = new Date(booking.date);
    start.setHours(h, m, 0, 0);
    return {
      start,
      end: new Date(start.getTime() + 60 * 60000),
      title: `Cita en Perla Dental (por confirmar): ${booking.treatment}`,
      place: PLACE,
      details: 'Solicitud de cita. La clínica la confirmará por teléfono o correo en menos de 24 horas laborables.'
    };
  };

  const calMenu = confirmBox.querySelector('.calmenu');
  const calToggle = confirmBox.querySelector('[data-cal-toggle]');
  const calPanel = confirmBox.querySelector('.calmenu__panel');
  const calGoogle = confirmBox.querySelector('[data-cal="google"]');
  const calOutlook = confirmBox.querySelector('[data-cal="outlook"]');

  const setCalendarLinks = () => {
    const ev = eventData();
    if (!ev) return;
    // Hora "flotante" (sin zona): cada calendario la interpreta en la zona del propio usuario
    calGoogle.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(ev.title)}&dates=${floating(ev.start)}/${floating(ev.end)}&details=${enc(ev.details)}&location=${enc(ev.place)}`;
    calOutlook.href = `https://outlook.live.com/calendar/0/deeplink/compose?path=${enc('/calendar/action/compose')}&rru=addevent&subject=${enc(ev.title)}&startdt=${enc(isoLocal(ev.start))}&enddt=${enc(isoLocal(ev.end))}&body=${enc(ev.details)}&location=${enc(ev.place)}`;
  };

  const openCalendarMenu = (open, { focusFirst = false } = {}) => {
    calPanel.hidden = !open;
    calToggle.setAttribute('aria-expanded', String(open));
    if (open && focusFirst) calPanel.querySelector('a, button').focus();
  };

  calToggle.addEventListener('click', () => {
    const willOpen = calPanel.hidden;
    if (willOpen) setCalendarLinks();
    openCalendarMenu(willOpen, { focusFirst: willOpen });
  });

  // se cierra al pulsar fuera, con Escape (devolviendo el foco al botón) o al salir con el tabulador
  document.addEventListener('click', (e) => {
    if (!calPanel.hidden && !e.target.closest('.calmenu')) openCalendarMenu(false);
  });
  confirmBox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !calPanel.hidden) {
      openCalendarMenu(false);
      calToggle.focus();
    }
  });
  calMenu.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !calMenu.contains(e.relatedTarget)) openCalendarMenu(false);
  });
  [calGoogle, calOutlook].forEach((link) =>
    link.addEventListener('click', () => setTimeout(() => openCalendarMenu(false), 150)) // ya se abrió en otra pestaña
  );

  confirmBox.querySelector('[data-ics]').addEventListener('click', () => {
    const ev = eventData();
    if (!ev) return;
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@perladental.demo`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Perla Dental//Demo//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${floating(ev.start)}`,
      `DTEND:${floating(ev.end)}`,
      `SUMMARY:${icsText(ev.title)}`,
      `LOCATION:${icsText(ev.place)}`,
      `DESCRIPTION:${icsText(ev.details)}`,
      'STATUS:TENTATIVE',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'cita-perla-dental.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    openCalendarMenu(false);
    calToggle.focus();
  });

  /* ---------- Empezar de nuevo ---------- */
  const reset = () => {
    form.reset();
    Object.values(fields).forEach((f) => setError(f, ''));
    delete host.dataset.state;
    openCalendarMenu(false);
    confirmBox.hidden = true;
    form.hidden = false;
    booking = null;
    renderDays();
    renderHours();
    go(0, { focus: false });
  };

  confirmBox.querySelector('[data-again]').addEventListener('click', () => {
    reset();
    panels[0].querySelector('.step__title').focus({ preventScroll: true });
  });

  /* ---------- Los botones "Pedir cita para este tratamiento" llegan con el tratamiento elegido ---------- */
  document.querySelectorAll('[data-tratamiento]').forEach((link) => {
    link.addEventListener('click', () => {
      const key = link.dataset.tratamiento;
      const radio = form.querySelector(`input[name="tratamiento"][value="${key}"]`);
      if (!radio) return;
      if (host.dataset.state === 'done') reset();
      radio.checked = true;
      go(1, { focus: false });
    });
  });

  /* ---------- Arranque ---------- */
  renderDays();
  renderHours();
  go(0, { focus: false });
})();
