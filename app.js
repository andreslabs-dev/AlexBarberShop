/* =========================================================
   ALEX BARBERSHOP · app.js (Vanilla JS, SPA simulada)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  /* ---------- MARCADORES BASE64 DE SERVICIOS ----------
     Pega tu imagen Base64 en el campo "image" de cada servicio.
     Formato: 'data:image/jpeg;base64,XXXXX' */
  const BARBERS = ['Barbero 1', 'Barbero 2', 'Barbero 3'];

  const SERVICES = [
    { name: 'Servicio de corte', image: 'data:image/jpeg;base64,[PEGAR_BASE64_SERVICIO_CORTE_AQUI]' },
    { name: 'Barba',             image: 'data:image/jpeg;base64,[PEGAR_BASE64_BARBA_AQUI]' },
    { name: 'Servicio completo', image: 'data:image/jpeg;base64,[PEGAR_BASE64_SERVICIO_COMPLETO_AQUI]' }
  ];

  const SLOTS = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
  ];

  const YEAR = 2026, MONTH = 9, TOTAL_DAYS = 31; // Octubre 2026
  const state = { barber: null, service: null, day: 16, slot: null };

  /* ---------- 1. NAVEGACIÓN SPA ---------- */
  const history = ['home'];

  function showView(id, pushHistory = true) {
    const next = $(id);
    if (!next || next.classList.contains('active')) return;
    document.querySelectorAll('.view.active').forEach((v) => v.classList.remove('active'));
    next.classList.add('active');
    if (pushHistory) history.push(id);
    window.scrollTo(0, 0);
  }

  // Botones "data-go" avanzan a la vista indicada
  document.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.go));
  });

  // Botones "data-back" regresan a la vista anterior
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (history.length > 1) {
        history.pop();
        showView(history[history.length - 1], false);
      }
    });
  });

  /* ---------- 2. CARRUSELES ---------- */
  function makeCard(label, image) {
    const card = document.createElement('div');
    card.className = 'card' + (image ? ' has-photo' : '');
    card.setAttribute('role', 'button');
    card.tabIndex = 0;

    if (image) {
      const photo = document.createElement('div');
      photo.className = 'card-photo';
      photo.style.backgroundImage = `url('${image}')`;
      card.appendChild(photo);
    }

    const span = document.createElement('span');
    span.className = 'card-label';
    span.textContent = label;
    card.appendChild(span);
    return card;
  }

  function setupCarousel({ trackId, prevId, nextId, items, toCard, isSelected, onPick }) {
    const track = $(trackId);
    let order = [...items];

    function draw(animate) {
      track.innerHTML = '';
      order.forEach((item, i) => {
        const card = toCard(item);
        if (animate) {
          card.classList.add('enter');
          card.style.animationDelay = `${i * 80}ms`;
        }
        if (isSelected(item)) card.classList.add('selected');

        const pick = () => {
          onPick(item);
          track.querySelectorAll('.card').forEach((c, idx) => {
            c.classList.toggle('selected', isSelected(order[idx]));
          });
        };
        card.addEventListener('click', pick);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
        track.appendChild(card);
      });
    }

    $(prevId).addEventListener('click', () => { order.push(order.shift()); draw(true); });
    $(nextId).addEventListener('click', () => { order.unshift(order.pop()); draw(true); });

    draw(true);
  }

  setupCarousel({
    trackId: 'barberCards', prevId: 'barberPrev', nextId: 'barberNext',
    items: BARBERS,
    toCard: (name) => makeCard(name, null),
    isSelected: (name) => state.barber === name,
    onPick: (name) => { state.barber = name; }
  });

  setupCarousel({
    trackId: 'serviceCards', prevId: 'servicePrev', nextId: 'serviceNext',
    items: SERVICES,
    toCard: (s) => makeCard(s.name, s.image),
    isSelected: (s) => state.service === s.name,
    onPick: (s) => { state.service = s.name; }
  });

  /* ---------- 3. CALENDARIO Y HORARIOS ---------- */
  function renderCalendar() {
    const box = $('calendarDays');
    box.innerHTML = '';

    const offset = (new Date(YEAR, MONTH, 1).getDay() + 6) % 7; // semana inicia en lunes
    for (let i = 0; i < offset; i++) box.appendChild(document.createElement('span'));

    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day' + (d === state.day ? ' selected' : '');
      btn.textContent = d;
      btn.addEventListener('click', () => {
        state.day = d;
        state.slot = null;
        renderCalendar();
        renderSlots();
        updateConfirm();
      });
      box.appendChild(btn);
    }
  }

  function renderSlots() {
    $('slotsDate').textContent = new Date(YEAR, MONTH, state.day).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const box = $('slots');
    box.innerHTML = '';
    SLOTS.forEach((label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot' + (state.slot === label ? ' selected' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        state.slot = label;
        renderSlots();
        updateConfirm();
      });
      box.appendChild(btn);
    });
  }

  function updateConfirm() {
    $('confirmBtn').disabled = !state.slot;
  }

  /* ---------- 4. CONFIRMACIÓN ---------- */
  let toastTimer = null;
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  $('confirmBtn').addEventListener('click', () => {
    if (!state.slot) return;
    const barber = state.barber || 'Cualquier barbero';
    const service = state.service || 'Servicio por definir';
    const fecha = new Date(YEAR, MONTH, state.day).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
    showToast(`Reserva confirmada: ${service} con ${barber}, ${fecha} a las ${state.slot}`);
  });

  /* ---------- 5. INICIALIZACIÓN ---------- */
  renderCalendar();
  renderSlots();
  updateConfirm();
});
