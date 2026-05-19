// === Countdown to 22-jun-2026 23:59:59 Chile (UTC-4) ===
// Defensive: each element may or may not exist depending on which sections are rendered.
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function updateCountdown() {
  const target = new Date('2026-06-22T23:59:59-04:00').getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  // Last-call XL countdown (puede no existir si sacaron la sección)
  setText('cd-days',  String(days).padStart(2, '0'));
  setText('cd-hours', String(hours).padStart(2, '0'));
  setText('cd-mins',  String(mins).padStart(2, '0'));
  setText('cd-secs',  String(secs).padStart(2, '0'));
  // Hero countdown
  setText('cd-hero-days',  days);
  setText('cd-hero-hours', String(hours).padStart(2, '0'));
  setText('cd-hero-mins',  String(mins).padStart(2, '0'));
  // Header mini pill
  setText('cd-mini', days + 'd');
}
updateCountdown();
setInterval(updateCountdown, 1000);

// === Pricing toggle (Pago completo vs Pago mensual) ===
(function initPricingToggle() {
  const card = document.getElementById('pricing-card');
  if (!card) return;
  const buttons = card.querySelectorAll('.pricing-toggle-option');
  const amountEl = document.getElementById('pricing-amount');
  const suffixEl = document.getElementById('pricing-suffix');
  const finePrint = document.getElementById('pricing-fine-print');
  if (!buttons.length || !amountEl || !suffixEl) return;

  const modes = {
    upfront: {
      amount: 'US$279',
      suffix: 'por mes · pago único · <strong>US$837 total · 3 meses</strong>',
      fine: 'Asegura tu cupo hasta el final del programa con descuento. Money Back 14 días sin requisito de asistencia. Si pides reembolso pasados los 14 días, no aplica devolución parcial.'
    },
    mensual: {
      amount: 'US$349',
      suffix: 'por mes · pago mensual · <strong>US$1.047 total · 3 meses</strong>',
      fine: 'Cancela cuando quieras: si lo haces dentro de los primeros 14 días, te devolvemos lo pagado. Pasados los 14 días, no hay devolución de mensualidades ya cobradas — pero al cancelar, mantienes acceso hasta terminar el mes que ya pagaste.'
    }
  };

  function setMode(mode) {
    const m = modes[mode]; if (!m) return;
    amountEl.textContent = m.amount;
    suffixEl.innerHTML = m.suffix;
    if (finePrint) finePrint.textContent = m.fine;
    buttons.forEach(b => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
})();

// === Count-up animation on stats ===
const observerOptions = { threshold: 0.3 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      if (el.dataset.animated) return;
      el.dataset.animated = 'true';
      const target = parseInt(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(target * eased);
        el.textContent = prefix + current + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
  });
}, observerOptions);
document.querySelectorAll('.proof-value').forEach(el => observer.observe(el));

// === FAQ accordion ===
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// === Rotating word en H2 Recorrido (¿Qué vas a [lograr/experimentar/vivir/hacer/aprender]?) ===
(function initRotatingWord() {
  const el = document.getElementById('rotating-word');
  if (!el) return;
  const words = (el.dataset.words || '').split(',').map(s => s.trim()).filter(Boolean);
  if (words.length < 2) return;
  let idx = 0;
  el.classList.add('fade-in');
  setInterval(() => {
    el.classList.add('fade-out');
    el.classList.remove('fade-in');
    setTimeout(() => {
      idx = (idx + 1) % words.length;
      el.textContent = words[idx];
      el.classList.remove('fade-out');
      el.classList.add('fade-in');
    }, 320);
  }, 2800);
})();

// === Testimonios carousel ===
(function initCarousel() {
  const carousel = document.getElementById('testimonios-carousel');
  if (!carousel) return;
  const slides = carousel.querySelectorAll('.testimonio-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  const prev = carousel.querySelector('.carousel-arrow-prev');
  const next = carousel.querySelector('.carousel-arrow-next');
  let current = 0;
  let autoTimer = null;

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, idx) => s.classList.toggle('active', idx === current));
    dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
  }
  function restartAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 7000);
  }

  prev.addEventListener('click', () => { goTo(current - 1); restartAuto(); });
  next.addEventListener('click', () => { goTo(current + 1); restartAuto(); });
  dots.forEach((d, idx) => d.addEventListener('click', () => { goTo(idx); restartAuto(); }));

  restartAuto();
})();
