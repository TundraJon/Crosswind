(function(){
  'use strict';

  /* ============ SCREEN NAV ============ */
  const screens = document.querySelectorAll('.screen');
  const navBtns = document.querySelectorAll('#devNav button');
  function showScreen(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === id));
    window.scrollTo(0, 0);
  }
  navBtns.forEach(b => b.addEventListener('click', () => showScreen(b.dataset.screen)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.goto)));

  /* ============ SETUP: unit toggles ============ */
  document.querySelectorAll('.unit-switch').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => { group.querySelectorAll('button').forEach(b => b.classList.remove('on')); btn.classList.add('on'); });
    });
  });

  document.getElementById('suggestAirportBtn').addEventListener('click', () => {
    document.getElementById('homeAirportInput').value = 'Orlando (MCO)';
  });

  /* ============ SMART DATE/TIME PARSING ENGINE ============ */
  function nearestFutureYearForMD(month, day, today) {
    let y = today.getFullYear();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let candidate = new Date(y, month - 1, day);
    if (candidate < todayMid) y += 1;
    return y;
  }
  function resolveTwoDigitYearNearestFuture(yy, month, day, today) {
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const cand1900 = new Date(1900 + yy, month - 1, day);
    const cand2000 = new Date(2000 + yy, month - 1, day);
    const options = [cand1900, cand2000].filter(d => !isNaN(d));
    const future = options.filter(d => d >= todayMid).sort((a, b) => a - b);
    if (future.length) return future[0].getFullYear();
    const past = options.sort((a, b) => b - a);
    return past.length ? past[0].getFullYear() : today.getFullYear();
  }
  function parseSmartDate(raw, today, startDate) {
    today = today || new Date();
    const s = (raw || '').trim();
    if (!s) return null;
    let m = s.match(/^([TNWMY])\s*(\+\s*(\d+))?$/i);
    if (m) {
      const code = m[1].toUpperCase(), offset = m[3] ? parseInt(m[3], 10) : 0;
      const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (code === 'T' || code === 'N') { base.setDate(base.getDate() + offset); return base; }
      if (code === 'W') { base.setDate(base.getDate() + offset * 7); return base; }
      if (code === 'M') { base.setMonth(base.getMonth() + offset); return base; }
      if (code === 'Y') { base.setFullYear(base.getFullYear() + offset); return base; }
    }
    m = s.match(/^S\s*(\+\s*(\d+))?$/i);
    if (m) {
      if (!startDate) return null;
      const base = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      base.setDate(base.getDate() + (m[2] ? parseInt(m[2], 10) : 0));
      return base;
    }
    m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) { const d = new Date(+m[3], +m[1] - 1, +m[2]); if (!isNaN(d)) return d; }
    m = s.match(/^(\d{2})(\d{2})(\d{2})$/);
    if (m) { const yr = resolveTwoDigitYearNearestFuture(+m[3], +m[1], +m[2], today); const d = new Date(yr, +m[1] - 1, +m[2]); if (!isNaN(d)) return d; }
    m = s.match(/^(\d{2})(\d{2})$/);
    if (m) { const yr = nearestFutureYearForMD(+m[1], +m[2], today); const d = new Date(yr, +m[1] - 1, +m[2]); if (!isNaN(d)) return d; }
    m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (m) { const yr = nearestFutureYearForMD(+m[1], +m[2], today); const d = new Date(yr, +m[1] - 1, +m[2]); if (!isNaN(d)) return d; }
    m = s.match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),\s*(\d{4})$/);
    if (m) {
      const mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].toLowerCase());
      if (mi >= 0) { const d = new Date(+m[3], mi, +m[2]); if (d.getMonth() === mi && d.getDate() === +m[2]) return d; }
    }
    return null;
  }
  function parseSmartTime(raw, now) {
    now = now || new Date();
    const s = (raw || '').trim();
    if (!s) return null;
    let m = s.match(/^([NH])\s*(\+\s*(\d+))?$/i);
    if (m) {
      const code = m[1].toUpperCase(), offset = m[3] ? parseInt(m[3], 10) : 0;
      const base = new Date(now);
      if (code === 'N') { base.setMinutes(base.getMinutes() + offset); return base; }
      if (code === 'H') { base.setHours(base.getHours() + offset); return base; }
    }
    m = s.match(/^(\d{1,2}):?(\d{2})?\s*([ap])m?$/i);
    if (m) {
      let hh = +m[1]; const mm = m[2] ? +m[2] : 0; const ap = m[3].toLowerCase();
      if (hh === 12) hh = 0;
      if (ap === 'p') hh += 12;
      const d = new Date(now); d.setHours(hh, mm, 0, 0); return d;
    }
    m = s.match(/^(\d{2})(\d{2})$/);
    if (m) { const hh = +m[1], mm = +m[2]; if (hh < 24 && mm < 60) { const d = new Date(now); d.setHours(hh, mm, 0, 0); return d; } }
    return null;
  }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtTime(d) { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function wireSmartDateInput(el, getStart) {
    el.addEventListener('blur', () => { const p = parseSmartDate(el.value, new Date(), getStart ? getStart() : null); if (p) el.value = fmtDate(p); });
  }
  function wireSmartTimeInput(el) {
    el.addEventListener('blur', () => { const p = parseSmartTime(el.value, new Date()); if (p) el.value = fmtTime(p); });
  }

  /* ============ CALENDAR WIDGET (single-date or range mode) ============ */
  const calModal = document.getElementById('calModal');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calGrid = document.getElementById('calGrid');
  let calState = { mode: 'single', month: new Date(), rangeStart: null, rangeEnd: null, onConfirm: null };

  function openCalendar(mode, initial, onConfirm) {
    calState.mode = mode;
    calState.onConfirm = onConfirm;
    const base = (initial && initial.start) ? new Date(initial.start) : new Date();
    calState.month = new Date(base.getFullYear(), base.getMonth(), 1);
    calState.rangeStart = (initial && initial.start) ? new Date(initial.start) : null;
    calState.rangeEnd = (initial && initial.end) ? new Date(initial.end) : (mode === 'single' ? calState.rangeStart : null);
    renderCalendar();
    calModal.classList.add('open');
  }
  function closeCalendar() { calModal.classList.remove('open'); }
  function renderCalendar() {
    const y = calState.month.getFullYear(), mo = calState.month.getMonth();
    calMonthLabel.textContent = calState.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calGrid.innerHTML = '';
    const firstDay = new Date(y, mo, 1).getDay();
    const totalDays = new Date(y, mo + 1, 0).getDate();
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    for (let i = 0; i < firstDay; i++) { const b = document.createElement('div'); b.className = 'cal-day blank'; calGrid.appendChild(b); }
    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(y, mo, d);
      const btn = document.createElement('div');
      btn.className = 'cal-day';
      btn.textContent = d;
      if (cellDate.getTime() === todayMid.getTime()) btn.classList.add('today-marker');
      if (calState.rangeStart && cellDate.getTime() === new Date(calState.rangeStart.getFullYear(), calState.rangeStart.getMonth(), calState.rangeStart.getDate()).getTime()) btn.classList.add('endpoint');
      if (calState.rangeEnd && cellDate.getTime() === new Date(calState.rangeEnd.getFullYear(), calState.rangeEnd.getMonth(), calState.rangeEnd.getDate()).getTime()) btn.classList.add('endpoint');
      if (calState.rangeStart && calState.rangeEnd && cellDate > calState.rangeStart && cellDate < calState.rangeEnd) btn.classList.add('in-range');
      btn.addEventListener('click', () => {
        if (calState.mode === 'single') { calState.rangeStart = cellDate; calState.rangeEnd = cellDate; }
        else {
          if (!calState.rangeStart || (calState.rangeStart && calState.rangeEnd)) { calState.rangeStart = cellDate; calState.rangeEnd = null; }
          else if (cellDate < calState.rangeStart) { calState.rangeEnd = calState.rangeStart; calState.rangeStart = cellDate; }
          else { calState.rangeEnd = cellDate; }
        }
        renderCalendar();
      });
      calGrid.appendChild(btn);
    }
  }
  document.getElementById('calPrev').addEventListener('click', () => { calState.month.setMonth(calState.month.getMonth() - 1); renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { calState.month.setMonth(calState.month.getMonth() + 1); renderCalendar(); });
  document.getElementById('calCancelBtn').addEventListener('click', closeCalendar);
  document.getElementById('calConfirmBtn').addEventListener('click', () => { if (calState.onConfirm) calState.onConfirm(calState.rangeStart, calState.rangeEnd); closeCalendar(); });
  calModal.addEventListener('click', (e) => { if (e.target === calModal) closeCalendar(); });

  /* ============ WIRE: KTN Expiration (single-date smart field) ============ */
  const ktnExpInput = document.getElementById('ktnExp');
  wireSmartDateInput(ktnExpInput);
  document.getElementById('ktnExpCalBtn').addEventListener('click', () => {
    const parsed = parseSmartDate(ktnExpInput.value, new Date());
    openCalendar('single', { start: parsed }, (start) => { if (start) ktnExpInput.value = fmtDate(start); });
  });

  /* ============ LOYALTY PROGRAMS + TSA AIRLINES: shared state ============ */
  let programs = [
    { type: 'airline', name: 'Southwest', id: 'A-List 12345' },
    { type: 'rental',  name: 'National',  id: 'Emerald Club' },
    { type: 'hotel',   name: 'Marriott',  id: 'Bonvoy Gold' }
  ];
  let touchless = { 'southwest': true };
  const loyaltyList = document.getElementById('loyaltyList');
  const loyaltyFilter = document.getElementById('loyaltyFilter');
  const tsaAirlineList = document.getElementById('tsaAirlineList');
  function typeLabel(t) { return t === 'airline' ? 'Airline' : t === 'rental' ? 'Rental' : 'Hotel'; }
  function sortedByType(t) { return programs.filter(p => p.type === t).sort((a,b) => a.name.localeCompare(b.name)); }

  function renderLoyaltyList() {
    const filter = loyaltyFilter.value;
    const types = filter === 'all' ? ['airline','rental','hotel'] : [filter];
    loyaltyList.innerHTML = '';
    types.forEach(t => {
      const rows = sortedByType(t);
      if (!rows.length) return;
      const header = document.createElement('div');
      header.className = 'loyalty-group-header';
      header.textContent = typeLabel(t) + ' (' + rows.length + ')';
      loyaltyList.appendChild(header);
      rows.forEach(p => {
        const idx = programs.indexOf(p);
        const row = document.createElement('div');
        row.className = 'loyalty-row';
        row.innerHTML = '<span class="lname">' + p.name + '</span>';
        const editBtn = document.createElement('button');
        editBtn.className = 'ledit'; editBtn.textContent = '✎';
        editBtn.addEventListener('click', () => openProgramModal(idx));
        row.appendChild(editBtn);
        loyaltyList.appendChild(row);
      });
    });
  }

  function renderTsaAirlines() {
    const airlines = sortedByType('airline').sort((a, b) => {
      const aOn = !!touchless[a.name.toLowerCase()], bOn = !!touchless[b.name.toLowerCase()];
      if (aOn !== bOn) return aOn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    tsaAirlineList.innerHTML = '';
    if (!airlines.length) { tsaAirlineList.innerHTML = '<div class="empty-row">No airline programs yet</div>'; return; }
    airlines.forEach(a => {
      const on = !!touchless[a.name.toLowerCase()];
      const row = document.createElement('div');
      row.className = 'airline-row' + (on ? ' touchless' : '');
      row.innerHTML = '<span class="dot"></span>' + a.name;
      row.addEventListener('click', () => { touchless[a.name.toLowerCase()] = !touchless[a.name.toLowerCase()]; renderTsaAirlines(); });
      tsaAirlineList.appendChild(row);
    });
  }

  function renderAll() { renderLoyaltyList(); renderTsaAirlines(); renderStepForm(); }
  loyaltyFilter.addEventListener('change', renderLoyaltyList);

  /* ============ ADD/EDIT PROGRAM MODAL ============ */
  const modal = document.getElementById('programModal');
  const modalTitle = document.getElementById('programModalTitle');
  const typeBtnRow = document.getElementById('typeBtnRow');
  const existingTable = document.getElementById('existingTable');
  const existingLabel = document.getElementById('existingLabel');
  const programNameInput = document.getElementById('programNameInput');
  const programIdInput = document.getElementById('programIdInput');
  const programNamesList = document.getElementById('programNames');
  const dupWarning = document.getElementById('dupWarning');
  const deleteBtn = document.getElementById('programDeleteBtn');
  let modalType = 'airline', editingIndex = null;

  function openProgramModal(idx) {
    editingIndex = (typeof idx === 'number') ? idx : null;
    if (editingIndex !== null) {
      const p = programs[editingIndex];
      modalTitle.textContent = 'Edit Loyalty Program'; deleteBtn.style.display = 'inline-block';
      setModalType(p.type); programNameInput.value = p.name; programIdInput.value = p.id || '';
    } else {
      modalTitle.textContent = 'Add Loyalty Program'; deleteBtn.style.display = 'none';
      setModalType('airline'); programNameInput.value = ''; programIdInput.value = '';
    }
    dupWarning.style.display = 'none';
    modal.classList.add('open');
  }
  function closeProgramModal() { modal.classList.remove('open'); }
  function setModalType(t) {
    modalType = t;
    typeBtnRow.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('on', b.dataset.type === t));
    existingLabel.textContent = 'Existing ' + typeLabel(t) + ' Programs';
    renderExistingTable(); renderNameDatalist(); checkDuplicate();
  }
  function renderExistingTable() {
    const rows = sortedByType(modalType);
    const tbody = document.createElement('tbody');
    if (!rows.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.className = 'empty-row'; td.colSpan = 2; td.textContent = 'None added yet';
      tr.appendChild(td); tbody.appendChild(tr);
    } else {
      rows.forEach(p => { const tr = document.createElement('tr'); tr.innerHTML = '<td class="pname">' + p.name + '</td><td>' + (p.id || '—') + '</td>'; tbody.appendChild(tr); });
    }
    existingTable.querySelector('tbody').replaceWith(tbody);
  }
  function renderNameDatalist() {
    programNamesList.innerHTML = '';
    const names = [...new Set(programs.filter(p => p.type === modalType).map(p => p.name))];
    names.forEach(n => { const opt = document.createElement('option'); opt.value = n; opt.textContent = n; programNamesList.appendChild(opt); });
  }
  function checkDuplicate() {
    const name = programNameInput.value.trim().toLowerCase(), id = programIdInput.value.trim().toLowerCase();
    if (!name && !id) { dupWarning.style.display = 'none'; return; }
    const match = programs.some((p, i) => i !== editingIndex && p.type === modalType && ((name && p.name.trim().toLowerCase() === name) || (id && p.id && p.id.trim().toLowerCase() === id)));
    dupWarning.style.display = match ? 'block' : 'none';
  }
  typeBtnRow.querySelectorAll('.type-btn').forEach(b => b.addEventListener('click', () => setModalType(b.dataset.type)));
  programNameInput.addEventListener('input', checkDuplicate);
  programIdInput.addEventListener('input', checkDuplicate);
  document.getElementById('addProgramBtn').addEventListener('click', () => openProgramModal(null));
  document.getElementById('programCancelBtn').addEventListener('click', closeProgramModal);
  deleteBtn.addEventListener('click', () => { if (editingIndex !== null) { programs.splice(editingIndex, 1); closeProgramModal(); renderAll(); } });

  function commitProgramEntry() {
    const name = programNameInput.value.trim();
    if (!name) { programNameInput.focus(); return false; }
    const id = programIdInput.value.trim();
    if (editingIndex !== null) programs[editingIndex] = { type: modalType, name, id };
    else programs.push({ type: modalType, name, id });
    return true;
  }
  document.getElementById('programSaveBtn').addEventListener('click', () => {
    if (!commitProgramEntry()) return;
    closeProgramModal(); renderAll();
  });
  document.getElementById('programSaveNextBtn').addEventListener('click', () => {
    if (!commitProgramEntry()) return;
    editingIndex = null;
    deleteBtn.style.display = 'none';
    modalTitle.textContent = 'Add Loyalty Program';
    programNameInput.value = ''; programIdInput.value = '';
    dupWarning.style.display = 'none';
    renderAll();
    renderExistingTable(); renderNameDatalist();
    programNameInput.focus();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) closeProgramModal(); });

  /* ============ TRIP STEP DEFAULTS ============ */
  const stepDefaults = [
    { sys: 'Home', name: 'Home', icon: '🏠' }, { sys: 'Uber', name: 'Uber', icon: '🚙' },
    { sys: 'Flight (Initial)', name: 'Flight (Initial)', icon: '🛫' }, { sys: 'Layover', name: 'Layover', icon: '🧳' },
    { sys: 'Connection', name: 'Connection', icon: '✈️' }, { sys: 'Flight (Final)', name: 'Flight (Final)', icon: '🛬' },
    { sys: 'Rental', name: 'Rental', icon: '🚗' }, { sys: 'Hotel', name: 'Hotel', icon: '🏨' }, { sys: 'Objective / To', name: 'Objective / To', icon: '🏥' }
  ];
  const defaultsBody = document.querySelector('#defaultsTable tbody');
  stepDefaults.forEach(step => {
    const tr = document.createElement('tr');
    const tdSys = document.createElement('td'); tdSys.className = 'sysname'; tdSys.textContent = step.sys;
    const tdName = document.createElement('td'); const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.value = step.name; tdName.appendChild(nameInput);
    const tdIcon = document.createElement('td'); const iconInput = document.createElement('input'); iconInput.type = 'text'; iconInput.className = 'icon-input'; iconInput.value = step.icon; iconInput.maxLength = 4; tdIcon.appendChild(iconInput);
    tr.appendChild(tdSys); tr.appendChild(tdName); tr.appendChild(tdIcon);
    defaultsBody.appendChild(tr);
  });

  /* ============ PIPELINE FOOTER ============ */
  const projectModal = document.getElementById('projectModal');
  const pipelineList = document.getElementById('pipelineList');
  const projStartInput = document.getElementById('projStartInput');
  const projEndInput = document.getElementById('projEndInput');
  const projDateNote = document.getElementById('projDateNote');
  const projEndClearedMsg = projDateNote.textContent;

  wireSmartDateInput(projStartInput);
  wireSmartDateInput(projEndInput, () => parseSmartDate(projStartInput.value, new Date()));
  function checkProjDates() {
    const s = parseSmartDate(projStartInput.value, new Date());
    if (s && /^S/i.test(projEndInput.value.trim())) { const r = parseSmartDate(projEndInput.value, new Date(), s); if (r) projEndInput.value = fmtDate(r); }
    const e = parseSmartDate(projEndInput.value, new Date());
    if (s && e && e < s) { projEndInput.value = ''; projDateNote.textContent = projEndClearedMsg; projDateNote.style.display = 'block'; setTimeout(() => projDateNote.style.display = 'none', 3000); }
  }
  projStartInput.addEventListener('blur', checkProjDates);
  projEndInput.addEventListener('blur', checkProjDates);
  document.getElementById('projCalBtn').addEventListener('click', () => {
    const s = parseSmartDate(projStartInput.value, new Date());
    const e = parseSmartDate(projEndInput.value, new Date());
    openCalendar('range', { start: s, end: e }, (start, end) => {
      if (start) projStartInput.value = fmtDate(start);
      if (end) projEndInput.value = fmtDate(end);
    });
  });

  document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('projNameInput').value = ''; projStartInput.value = ''; projEndInput.value = ''; projDateNote.style.display = 'none';
    projectModal.classList.add('open');
  });
  document.getElementById('projCancelBtn').addEventListener('click', () => projectModal.classList.remove('open'));
  projectModal.addEventListener('click', (e) => { if (e.target === projectModal) projectModal.classList.remove('open'); });
  document.getElementById('projSaveBtn').addEventListener('click', () => {
    const name = document.getElementById('projNameInput').value.trim();
    if (!name) { document.getElementById('projNameInput').focus(); return; }
    if (/^S\s*(\+\s*\d+)?$/i.test(projEndInput.value.trim()) && !parseSmartDate(projEndInput.value, new Date(), parseSmartDate(projStartInput.value, new Date()))) {
      projDateNote.textContent = 'Start date was never filled in — S+N needs a start date';
      projDateNote.style.display = 'block'; setTimeout(() => projDateNote.style.display = 'none', 3000);
      projStartInput.focus(); return;
    }
    const start = projStartInput.value || '—', end = projEndInput.value || '—';
    const row = document.createElement('div');
    row.className = 'proj-row';
    row.innerHTML = '<div class="proj-dot"></div><div class="proj-name"><div class="nm">' + name + '</div><div class="dt">' + start + ' – ' + end + '</div></div><div class="proj-bar"><i style="width:0%"></i></div>';
    wirePipelineRowSelect(row);
    pipelineList.appendChild(row);
    projectModal.classList.remove('open');
  });
  document.getElementById('whatsappReportBtn').addEventListener('click', () => {
    alert('WhatsApp Report layout/content is a Step 4 item — not designed yet.');
  });

  /* Tapping a pipeline row (dot or name) selects/highlights it — visual only for now */
  function wirePipelineRowSelect(row) {
    row.addEventListener('click', () => {
      pipelineList.querySelectorAll('.proj-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    });
  }
  pipelineList.querySelectorAll('.proj-row').forEach(wirePipelineRowSelect);

  /* ============ TRIP WIZARD: full round-trip, multi-stop state ============ */
  function newStop() {
    return {
      destination: { name: '', address: '', contact: '', phone: '' },
      flights: [ { airline: '', flightNum: '', conf: '', seat: '' } ],
      rental: { company: '', cls: 'Economy', color: '', plate: '' },
      hotel: { chain: '', name: '', address: '', room: '' }
    };
  }
  const wizardState = {
    selected: 'uber-out',
    uberOut: { pickup: '', dropoff: '' },
    stops: [ newStop() ],
    returnFlights: [ { airline: '', flightNum: '', conf: '', seat: '' } ],
    uberHome: { pickup: '', dropoff: '' },
    editingPins: {}
  };

  function flightNodeMeta(flights, fi) {
    const n = flights.length;
    if (n === 1) return { icon: '🛫', base: 'Flight' };
    if (fi === 0) return { icon: '🛫', base: 'Flight 1' };
    if (fi === n - 1) return { icon: '🛬', base: 'Flight ' + (fi + 1) };
    return { icon: '✈️', base: 'Flight ' + (fi + 1) };
  }

  function buildNodes() {
    const nodes = [];
    nodes.push({ key: 'home', icon: '🏠', label: 'Home', type: 'home' });
    nodes.push({ key: 'uber-out', icon: '🚙', label: 'Uber', type: 'uberOut' });
    const multi = wizardState.stops.length > 1;

    wizardState.stops.forEach((stop, si) => {
      const tag = stop.destination.name ? stop.destination.name : ('Stop ' + (si + 1));
      stop.flights.forEach((f, fi) => {
        const m = flightNodeMeta(stop.flights, fi);
        const label = multi ? (m.base + ' — ' + tag) : m.base;
        nodes.push({ key: 'stop' + si + '-flight-' + fi, icon: m.icon, label, type: 'flight', stopIndex: si, flightIndex: fi });
        if (fi < stop.flights.length - 1) nodes.push({ key: 'stop' + si + '-layover-' + fi, icon: '🧳', label: 'Layover', type: 'layover', optional: true, stopIndex: si, betweenIndex: fi });
      });
      nodes.push({ key: 'stop' + si + '-rental', icon: '🚗', label: multi ? ('Rental — ' + tag) : 'Rental', type: 'rental', stopIndex: si });
      nodes.push({ key: 'stop' + si + '-hotel', icon: '🏨', label: multi ? ('Hotel — ' + tag) : 'Hotel', type: 'hotel', stopIndex: si });
      nodes.push({ key: 'stop' + si + '-destination', icon: '🏥', label: multi ? ('Destination ' + (si + 1)) : 'To', type: 'destination', stopIndex: si });
      nodes.push({ key: 'stop' + si + '-rentalreturn', icon: '🚗', label: multi ? ('Return — ' + tag) : 'Rental Return', type: 'rentalReturn', stopIndex: si, optional: true });
    });

    wizardState.returnFlights.forEach((f, fi) => {
      const m = flightNodeMeta(wizardState.returnFlights, fi);
      nodes.push({ key: 'return-flight-' + fi, icon: m.icon, label: 'Return: ' + m.base, type: 'returnFlight', flightIndex: fi });
      if (fi < wizardState.returnFlights.length - 1) nodes.push({ key: 'return-layover-' + fi, icon: '🧳', label: 'Layover', type: 'layover', optional: true, betweenIndex: fi, isReturn: true });
    });

    nodes.push({ key: 'uber-home', icon: '🚙', label: 'Uber Home', type: 'uberHome' });
    return nodes;
  }

  const nodeTrack = document.getElementById('nodeTrack');
  function renderNodeTrack() {
    const nodes = buildNodes();
    const selIdx = nodes.findIndex(n => n.key === wizardState.selected);
    nodeTrack.innerHTML = '';
    nodes.forEach((n, idx) => {
      const div = document.createElement('div');
      let cls = 'node';
      if (n.optional) cls += ' optional';
      if (idx < selIdx) cls += ' done'; else if (idx === selIdx) cls += ' current';
      div.className = cls; div.dataset.key = n.key;
      const pinEditing = wizardState.editingPins[n.key];
      div.innerHTML = '<div class="nd">' + n.icon + '</div><div class="nl">' + n.label +
        (n.type !== 'home' ? ' <button class="edit-pin' + (pinEditing ? ' editing' : '') + '" title="Rename / change icon">' + (pinEditing ? '✓' : '✎') + '</button>' : '') + '</div>';
      div.addEventListener('click', () => { wizardState.selected = n.key; renderNodeTrack(); renderStepForm(); });
      const pin = div.querySelector('.edit-pin');
      if (pin) pin.addEventListener('click', (e) => { e.stopPropagation(); wizardState.editingPins[n.key] = !wizardState.editingPins[n.key]; renderNodeTrack(); });
      nodeTrack.appendChild(div);
    });
  }

  function parserButtonHTML(label) {
    return '<button class="parser-btn" onclick="return false;">Text Clipboard Parser<small>Paste ' + label + ' confirmation — Pattern Matching / Regex</small></button>';
  }

  const stepFormContainer = document.getElementById('stepFormContainer');

  function flightFormHTML(f, dateNote) {
    const airlines = sortedByType('airline');
    const airlineOpts = airlines.map(a => '<option' + (a.name === f.airline ? ' selected' : '') + '>' + a.name + '</option>').join('');
    return '<div class="fld-grid">' +
      '<div><label class="fld">Date</label><input type="text" value="' + dateNote.value + '" disabled><div class="fld-note">' + dateNote.note + '</div></div>' +
      '<div><label class="fld">Airline</label><select id="wf-flight-airline">' + (airlineOpts || '<option>No airlines yet — add in Setup</option>') + '</select></div>' +
      '</div>' +
      '<div class="flight-row3">' +
      '<div class="fnum"><label class="fld">Flight #</label><input type="text" id="wf-flight-num" placeholder="402" maxlength="6" value="' + f.flightNum + '"></div>' +
      '<div class="fconf"><label class="fld">Confirmation #</label><input type="text" id="wf-flight-conf" placeholder="NZ82X1" maxlength="8" value="' + f.conf + '"></div>' +
      '<div class="fseat"><label class="fld">Seat #</label><input type="text" id="wf-flight-seat" placeholder="4C" maxlength="3" value="' + f.seat + '"></div>' +
      '</div>' +
      '<div class="autofill-box"><div class="af-label">Auto-Filled via Flight Tracker API</div><div class="fld-grid">' +
      '<div><label class="fld">Gate</label><input type="text" value="—" disabled></div>' +
      '<div><label class="fld">Destination</label><input type="text" value="—" disabled></div>' +
      '<div><label class="fld">Departure Time</label><input type="text" value="—" disabled></div>' +
      '<div><label class="fld">Landing Time</label><input type="text" value="—" disabled></div></div></div>';
  }

  function renderStepForm() {
    const nodes = buildNodes();
    const node = nodes.find(n => n.key === wizardState.selected);
    if (!node) return;
    let html = '';

    if (node.type === 'home') {
      html = '<div class="step-head">HOME</div><div class="home-note">This is your saved Home Base from Setup. Edit it there if it needs to change.</div>';
    }

    else if (node.type === 'uberOut') {
      html = '<div class="step-head">UBER</div>' +
        '<label class="fld">Date</label><input type="text" value="Trip Start Date" disabled><div class="fld-note">Computed from Active Pipeline</div>' +
        '<div class="fld-grid">' +
        '<div><label class="fld">Pickup Time</label><input type="text" id="wf-uber-pickup" placeholder="e.g. 4:30 PM" value="' + wizardState.uberOut.pickup + '"></div>' +
        '<div><label class="fld">Drop-off Time <span class="fld-opt">(optional)</span></label><input type="text" id="wf-uber-dropoff" placeholder="e.g. 5:10 PM" value="' + wizardState.uberOut.dropoff + '"></div>' +
        '</div>' + parserButtonHTML('Uber');
    }

    else if (node.type === 'flight') {
      const f = wizardState.stops[node.stopIndex].flights[node.flightIndex];
      const isFirstStopFirstFlight = node.stopIndex === 0 && node.flightIndex === 0;
      const dateNote = isFirstStopFirstFlight
        ? { value: 'Trip Start Date', note: 'Computed from Active Pipeline' }
        : { value: 'Apr 29, 2026', note: 'Computed from previous leg' };
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        flightFormHTML(f, dateNote) + parserButtonHTML('Flight') +
        (node.flightIndex === wizardState.stops[node.stopIndex].flights.length - 1 ? '<button class="add-flight-btn" id="wf-add-flight">+ Add Another Flight</button>' : '');
    }

    else if (node.type === 'layover') {
      const i = node.betweenIndex;
      const label1 = node.isReturn ? 'Return Flight ' + (i + 1) : 'Flight ' + (i + 1);
      const label2 = node.isReturn ? 'Return Flight ' + (i + 2) : 'Flight ' + (i + 2);
      html = '<div class="step-head">LAYOVER</div>' +
        '<div class="layover-strip">🧳 Calculated: <b>' + label1 + ' Landing</b> → <b>' + label2 + ' Boarding</b></div>' +
        '<div class="fld-note" style="margin-top:8px;">Example once flight times are auto-filled: SEA Landing 6:40 PM → MCI Boarding 8:22 PM = <b style="color:var(--amber);">1h 42m layover</b>. Real calculation activates once the Flight Tracker API auto-fill is wired in (Step 4).</div>';
    }

    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental;
      const companies = sortedByType('rental');
      const compOpts = companies.map(c => '<option' + (c.name === r.company ? ' selected' : '') + '>' + c.name + '</option>').join('');
      const classes = ['Economy','Compact','Intermediate/Midsize','Standard','Full-Size','Premium','Luxury','SUV (Compact)','SUV (Standard/Full-Size)','Minivan'];
      const classOpts = classes.map(c => '<option' + (c === r.cls ? ' selected' : '') + '>' + c + '</option>').join('');
      html = '<div class="step-head">RENTAL</div><div class="fld-grid">' +
        '<div><label class="fld">Company</label><select id="wf-rental-company">' + (compOpts || '<option>No rental programs yet</option>') + '</select></div>' +
        '<div><label class="fld">Class</label><select id="wf-rental-class">' + classOpts + '</select></div>' +
        '<div><label class="fld">Color <span class="fld-opt">(at pickup)</span></label><input type="text" id="wf-rental-color" placeholder="—" value="' + r.color + '"></div>' +
        '<div><label class="fld">License Plate <span class="fld-opt">(at pickup)</span></label><input type="text" id="wf-rental-plate" placeholder="—" value="' + r.plate + '"></div>' +
        '</div>' + parserButtonHTML('Rental');
    }

    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel;
      const chains = sortedByType('hotel');
      const chainOpts = chains.map(c => '<option' + (c.name === h.chain ? ' selected' : '') + '>' + c.name + '</option>').join('');
      html = '<div class="step-head">HOTEL</div><div class="fld-grid">' +
        '<div><label class="fld">Chain</label><select id="wf-hotel-chain">' + (chainOpts || '<option>No hotel programs yet</option>') + '</select></div>' +
        '<div><label class="fld">Hotel Name</label><input type="text" id="wf-hotel-name" placeholder="e.g. Lambeau Field Hilton" value="' + h.name + '"></div>' +
        '</div>' +
        '<label class="fld">Address</label><input type="text" id="wf-hotel-address" placeholder="—" value="' + h.address + '">' +
        '<button class="suggest-btn" id="wf-hotel-suggest">📍 Suggest Address</button>' +
        '<div class="fld-grid"><div><label class="fld">Room # <span class="fld-opt">(at check-in)</span></label><input type="text" id="wf-hotel-room" placeholder="—" value="' + h.room + '"></div><div></div></div>' +
        parserButtonHTML('Hotel');
    }

    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      html = '<div class="step-head">DESTINATION</div>' +
        '<label class="fld">Place Name</label><input type="text" id="wf-dest-name" placeholder="e.g. Hollywood Health Center" value="' + d.name + '">' +
        '<label class="fld">Address</label><input type="text" id="wf-dest-address" placeholder="—" value="' + d.address + '">' +
        '<button class="suggest-btn" id="wf-dest-suggest">📍 Suggest Address</button>' +
        '<div class="fld-grid"><div><label class="fld">Contact Name</label><input type="text" id="wf-dest-contact" value="' + d.contact + '"></div><div><label class="fld">Contact Phone</label><input type="text" id="wf-dest-phone" value="' + d.phone + '"></div></div>' +
        parserButtonHTML('Destination');
    }

    else if (node.type === 'rentalReturn') {
      const r = wizardState.stops[node.stopIndex].rental;
      const isLastStop = node.stopIndex === wizardState.stops.length - 1;
      html = '<div class="step-head">RENTAL RETURN</div>' +
        '<div class="return-ref">Returning: ' + (r.company || '—') + ' — ' + r.cls +
        '<div class="rr-sub">No time needed — inferred from the next flight\'s boarding time.</div></div>' +
        (isLastStop ? '<button class="add-flight-btn" id="wf-add-stop">+ Add Another Stop</button>' : '');
    }

    else if (node.type === 'returnFlight') {
      const f = wizardState.returnFlights[node.flightIndex];
      const isFirst = node.flightIndex === 0;
      const dateNote = { value: isFirst ? 'Trip End Date' : 'Apr 29, 2026', note: isFirst ? 'Computed from Active Pipeline' : 'Computed from previous leg' };
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        flightFormHTML(f, dateNote) + parserButtonHTML('Flight') +
        (node.flightIndex === wizardState.returnFlights.length - 1 ? '<button class="add-flight-btn" id="wf-add-return-flight">+ Add Another Flight</button>' : '');
    }

    else if (node.type === 'uberHome') {
      html = '<div class="step-head">UBER HOME</div>' +
        '<label class="fld">Date</label><input type="text" value="Trip End Date" disabled><div class="fld-note">Computed from Active Pipeline</div>' +
        '<div class="fld-grid">' +
        '<div><label class="fld">Pickup Time <span class="fld-opt">(usually set live at baggage claim)</span></label><input type="text" id="wf-uberhome-pickup" placeholder="e.g. 6:15 PM" value="' + wizardState.uberHome.pickup + '"></div>' +
        '<div><label class="fld">Drop-off Time <span class="fld-opt">(optional)</span></label><input type="text" id="wf-uberhome-dropoff" placeholder="e.g. 6:50 PM" value="' + wizardState.uberHome.dropoff + '"></div>' +
        '</div>';
    }

    stepFormContainer.innerHTML = html;
    wireStepFormInputs(node);
  }

  function wireStepFormInputs(node) {
    if (node.type === 'uberOut') {
      const pu = document.getElementById('wf-uber-pickup'), doff = document.getElementById('wf-uber-dropoff');
      pu.addEventListener('input', e => wizardState.uberOut.pickup = e.target.value);
      doff.addEventListener('input', e => wizardState.uberOut.dropoff = e.target.value);
      wireSmartTimeInput(pu); wireSmartTimeInput(doff);
      pu.addEventListener('blur', () => wizardState.uberOut.pickup = pu.value);
      doff.addEventListener('blur', () => wizardState.uberOut.dropoff = doff.value);
    }
    else if (node.type === 'flight') {
      const f = wizardState.stops[node.stopIndex].flights[node.flightIndex];
      const sel = document.getElementById('wf-flight-airline');
      if (sel) sel.addEventListener('change', e => f.airline = e.target.value);
      document.getElementById('wf-flight-num').addEventListener('input', e => f.flightNum = e.target.value);
      document.getElementById('wf-flight-conf').addEventListener('input', e => f.conf = e.target.value);
      document.getElementById('wf-flight-seat').addEventListener('input', e => f.seat = e.target.value);
      const addBtn = document.getElementById('wf-add-flight');
      if (addBtn) addBtn.addEventListener('click', () => {
        const flights = wizardState.stops[node.stopIndex].flights;
        flights.push({ airline: '', flightNum: '', conf: '', seat: '' });
        wizardState.selected = 'stop' + node.stopIndex + '-flight-' + (flights.length - 1);
        renderNodeTrack(); renderStepForm();
      });
    }
    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental;
      const compSel = document.getElementById('wf-rental-company');
      if (compSel) compSel.addEventListener('change', e => r.company = e.target.value);
      document.getElementById('wf-rental-class').addEventListener('change', e => r.cls = e.target.value);
      document.getElementById('wf-rental-color').addEventListener('input', e => r.color = e.target.value);
      document.getElementById('wf-rental-plate').addEventListener('input', e => r.plate = e.target.value);
    }
    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel;
      const chainSel = document.getElementById('wf-hotel-chain');
      if (chainSel) chainSel.addEventListener('change', e => h.chain = e.target.value);
      document.getElementById('wf-hotel-name').addEventListener('input', e => h.name = e.target.value);
      document.getElementById('wf-hotel-address').addEventListener('input', e => h.address = e.target.value);
      document.getElementById('wf-hotel-room').addEventListener('input', e => h.room = e.target.value);
      document.getElementById('wf-hotel-suggest').addEventListener('click', () => { h.address = '1265 Lombardi Ave, Green Bay, WI'; renderStepForm(); });
    }
    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      document.getElementById('wf-dest-name').addEventListener('input', e => { d.name = e.target.value; renderNodeTrack(); });
      document.getElementById('wf-dest-address').addEventListener('input', e => d.address = e.target.value);
      document.getElementById('wf-dest-contact').addEventListener('input', e => d.contact = e.target.value);
      document.getElementById('wf-dest-phone').addEventListener('input', e => d.phone = e.target.value);
      document.getElementById('wf-dest-suggest').addEventListener('click', () => { d.address = '1000 Universal Studios Plaza, Orlando, FL'; renderStepForm(); });
    }
    else if (node.type === 'rentalReturn') {
      const addStopBtn = document.getElementById('wf-add-stop');
      if (addStopBtn) addStopBtn.addEventListener('click', () => {
        wizardState.stops.push(newStop());
        const newIdx = wizardState.stops.length - 1;
        wizardState.selected = 'stop' + newIdx + '-flight-0';
        renderNodeTrack(); renderStepForm();
      });
    }
    else if (node.type === 'returnFlight') {
      const f = wizardState.returnFlights[node.flightIndex];
      const sel = document.getElementById('wf-flight-airline');
      if (sel) sel.addEventListener('change', e => f.airline = e.target.value);
      document.getElementById('wf-flight-num').addEventListener('input', e => f.flightNum = e.target.value);
      document.getElementById('wf-flight-conf').addEventListener('input', e => f.conf = e.target.value);
      document.getElementById('wf-flight-seat').addEventListener('input', e => f.seat = e.target.value);
      const addBtn = document.getElementById('wf-add-return-flight');
      if (addBtn) addBtn.addEventListener('click', () => {
        wizardState.returnFlights.push({ airline: '', flightNum: '', conf: '', seat: '' });
        wizardState.selected = 'return-flight-' + (wizardState.returnFlights.length - 1);
        renderNodeTrack(); renderStepForm();
      });
    }
    else if (node.type === 'uberHome') {
      const pu = document.getElementById('wf-uberhome-pickup'), doff = document.getElementById('wf-uberhome-dropoff');
      pu.addEventListener('input', e => wizardState.uberHome.pickup = e.target.value);
      doff.addEventListener('input', e => wizardState.uberHome.dropoff = e.target.value);
      wireSmartTimeInput(pu); wireSmartTimeInput(doff);
      pu.addEventListener('blur', () => wizardState.uberHome.pickup = pu.value);
      doff.addEventListener('blur', () => wizardState.uberHome.dropoff = doff.value);
    }
  }

  renderNodeTrack();
  renderStepForm();

  /* ============ DASHBOARD ============ */
  const cardGround = document.getElementById('cardGround');
  const cardAir = document.getElementById('cardAir');
  let airborne = false;
  document.getElementById('stateToggle').addEventListener('click', () => {
    airborne = !airborne;
    cardGround.style.display = airborne ? 'none' : 'block';
    cardAir.style.display = airborne ? 'block' : 'none';
  });
  const groundSpeedVal = document.getElementById('groundSpeedVal');
  let gsPrimaryIsMph = true;
  const gsMph = 580, gsKph = Math.round(580 * 1.60934);
  function renderGroundSpeed() {
    if (gsPrimaryIsMph) groundSpeedVal.innerHTML = gsMph + ' <small style="font-size:0.7rem;">MPH</small><span class="unit-pill" id="groundSpeedPill" title="Tap to swap primary unit">(kph)</span>';
    else groundSpeedVal.innerHTML = gsKph + ' <small style="font-size:0.7rem;">KPH</small><span class="unit-pill" id="groundSpeedPill" title="Tap to swap primary unit">(mph)</span>';
    document.getElementById('groundSpeedPill').addEventListener('click', () => { gsPrimaryIsMph = !gsPrimaryIsMph; renderGroundSpeed(); });
  }
  renderGroundSpeed();
  const copyAddrBtn = document.getElementById('copyAddrBtn');
  copyAddrBtn.addEventListener('click', async () => {
    const addr = '123 N Main St, Excelsior Springs, MO';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(addr);
      else { const ta = document.createElement('textarea'); ta.value = addr; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      const original = copyAddrBtn.innerHTML;
      copyAddrBtn.classList.add('copied');
      copyAddrBtn.innerHTML = '[ ✓ Copied ]<small>Paste into your GPS app</small>';
      setTimeout(() => { copyAddrBtn.classList.remove('copied'); copyAddrBtn.innerHTML = original; }, 1600);
    } catch (e) {}
  });

  /* ============ IN-FLIGHT REQUEST ============ */
  const reqText = document.getElementById('reqText');
  const reqDisplay = document.getElementById('reqDisplay');
  const reqDisplayText = document.getElementById('reqDisplayText');
  const rotateOverlay = document.getElementById('rotateOverlay');
  const reqBackBtn = document.getElementById('reqBackBtn');
  const lastUsedBtn = document.getElementById('lastUsedBtn');
  let lastMessage = null;
  try { lastMessage = localStorage.getItem('crosswindLastRequest'); } catch(e) {}
  function updateLastUsed() {
    if (lastMessage) { const preview = lastMessage.length > 42 ? lastMessage.slice(0, 42) + '...' : lastMessage; lastUsedBtn.textContent = '↻ Repeat: ' + preview; lastUsedBtn.style.display = 'block'; }
    else lastUsedBtn.style.display = 'none';
  }
  function saveLast(msg) { lastMessage = msg; try { localStorage.setItem('crosswindLastRequest', msg); } catch(e) {} updateLastUsed(); }
  function fitText() {
    const maxWidth = reqDisplay.clientWidth * 0.96, maxHeight = reqDisplay.clientHeight * 0.96;
    let lo = 10, hi = 800, best = lo;
    while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); reqDisplayText.style.fontSize = mid + 'px'; const fits = reqDisplayText.scrollWidth <= maxWidth && reqDisplayText.scrollHeight <= maxHeight; if (fits) { best = mid; lo = mid + 1; } else hi = mid - 1; }
    reqDisplayText.style.fontSize = best + 'px';
  }
  function checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) { rotateOverlay.style.display = 'none'; reqDisplayText.style.visibility = 'visible'; reqBackBtn.style.display = 'flex'; fitText(); }
    else { rotateOverlay.style.display = 'flex'; reqDisplayText.style.visibility = 'hidden'; reqBackBtn.style.display = 'none'; }
  }
  async function showRequestDisplay(msg) {
    if (!msg) { reqText.focus(); return; }
    saveLast(msg); reqDisplayText.textContent = msg; reqDisplay.style.display = 'flex';
    try { if (reqDisplay.requestFullscreen) await reqDisplay.requestFullscreen(); else if (reqDisplay.webkitRequestFullscreen) reqDisplay.webkitRequestFullscreen(); } catch(e) {}
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch(e) {}
    checkOrientation();
  }
  function hideRequestDisplay() {
    reqDisplay.style.display = 'none';
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(e) {}
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch(e) {}
  }
  document.querySelectorAll('.req-btn').forEach(b => b.addEventListener('click', () => showRequestDisplay(b.dataset.msg)));
  document.getElementById('reqDisplayBtn').addEventListener('click', () => showRequestDisplay(reqText.value.trim()));
  document.getElementById('reqClearBtn').addEventListener('click', () => { reqText.value = ''; reqText.focus(); });
  lastUsedBtn.addEventListener('click', () => { if (lastMessage) showRequestDisplay(lastMessage); });
  reqBackBtn.addEventListener('click', hideRequestDisplay);
  window.addEventListener('resize', () => { if (reqDisplay.style.display === 'flex') checkOrientation(); });
  window.addEventListener('orientationchange', () => { if (reqDisplay.style.display === 'flex') setTimeout(checkOrientation, 100); });

  /* ============ IN-FLIGHT REQUEST: FAVORITES (3 user-defined slots) ============ */
  let favorites = [null, null, null];
  try {
    const stored = localStorage.getItem('crosswindFavorites');
    if (stored) favorites = JSON.parse(stored);
  } catch(e) {}
  const favGrid = document.getElementById('favGrid');
  const favModal = document.getElementById('favModal');
  const favIconInput = document.getElementById('favIconInput');
  const favCaptionInput = document.getElementById('favCaptionInput');
  const favMessageInput = document.getElementById('favMessageInput');
  const favDeleteBtn = document.getElementById('favDeleteBtn');
  let favEditingIndex = null;

  function saveFavorites() { try { localStorage.setItem('crosswindFavorites', JSON.stringify(favorites)); } catch(e) {} }

  function renderFavorites() {
    favGrid.innerHTML = '';
    favorites.forEach((fav, i) => {
      const btn = document.createElement('button');
      if (fav) {
        btn.className = 'req-btn fav-filled';
        btn.innerHTML = '<span class="ri">' + fav.icon + '</span><span class="rl">' + fav.caption + '</span><span class="fav-edit-pin">✎</span>';
        btn.addEventListener('click', (e) => {
          if (e.target.closest('.fav-edit-pin')) { openFavModal(i); return; }
          showRequestDisplay(fav.message);
        });
      } else {
        btn.className = 'req-btn fav-empty';
        btn.innerHTML = '<span class="ri">+</span>';
        btn.addEventListener('click', () => openFavModal(i));
      }
      favGrid.appendChild(btn);
    });
  }

  function openFavModal(i) {
    favEditingIndex = i;
    const fav = favorites[i];
    favIconInput.value = fav ? fav.icon : '';
    favCaptionInput.value = fav ? fav.caption : '';
    favMessageInput.value = fav ? fav.message : '';
    favDeleteBtn.style.display = fav ? 'inline-block' : 'none';
    favModal.classList.add('open');
  }
  function closeFavModal() { favModal.classList.remove('open'); }
  document.getElementById('favCancelBtn').addEventListener('click', closeFavModal);
  favModal.addEventListener('click', (e) => { if (e.target === favModal) closeFavModal(); });
  favDeleteBtn.addEventListener('click', () => {
    if (favEditingIndex !== null) { favorites[favEditingIndex] = null; saveFavorites(); renderFavorites(); closeFavModal(); }
  });
  document.getElementById('favSaveBtn').addEventListener('click', () => {
    const icon = favIconInput.value.trim() || '⭐';
    const caption = favCaptionInput.value.trim();
    const message = favMessageInput.value.trim();
    if (!caption || !message) { (caption ? favMessageInput : favCaptionInput).focus(); return; }
    favorites[favEditingIndex] = { icon, caption, message };
    saveFavorites(); renderFavorites(); closeFavModal();
  });

  updateLastUsed();
  renderFavorites();
  renderAll();
})();
