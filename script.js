(function(){
  'use strict';

  /* ============ SCREEN NAV ============ */
  const screens = document.querySelectorAll('.screen');
  const navBtns = document.querySelectorAll('#devNav button');
  function showScreen(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === id));
    window.scrollTo(0, 0);
    if (id === 'screenDash') { gsPrimaryIsMph = currentUnits().speed !== 'kph'; renderGroundSpeed(); renderDash(); }
  }
  navBtns.forEach(b => b.addEventListener('click', () => showScreen(b.dataset.screen)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.goto)));

  /* ============ SETUP: unit toggles ============ */
  document.querySelectorAll('#screenSetup .unit-switch').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => { group.querySelectorAll('button').forEach(b => b.classList.remove('on')); btn.classList.add('on'); saveProfile(); });
    });
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
  ktnExpInput.addEventListener('input', saveProfile);
  ktnExpInput.addEventListener('blur', saveProfile);
  document.getElementById('ktnExpCalBtn').addEventListener('click', () => {
    const parsed = parseSmartDate(ktnExpInput.value, new Date());
    openCalendar('single', { start: parsed }, (start) => { if (start) { ktnExpInput.value = fmtDate(start); saveProfile(); } });
  });

  /* ============ PROFILE: saving, loading, KTN colour ============ */
  const PROFILE_KEY = 'crosswindProfile';
  const addrInput = document.getElementById('addrInput');
  const homeAirportInput = document.getElementById('homeAirportInput');
  const ktnInput = document.getElementById('ktnInput');
  const ktnNote = document.getElementById('ktnNote');
  const unitGroups = document.querySelectorAll('#screenSetup .unit-switch');
  const stepSystem = [
    { sys: 'Home', icon: '🏠' }, { sys: 'Uber', icon: '🚙' },
    { sys: 'Flight (Initial)', icon: '🛫' }, { sys: 'Layover', icon: '🧳' },
    { sys: 'Connection', icon: '✈️' }, { sys: 'Flight (Final)', icon: '🛬' },
    { sys: 'Rental', icon: '🚗' }, { sys: 'Hotel', icon: '🏨' }, { sys: 'Objective / To', icon: '🏥' },
    { sys: 'Rental Return', icon: '🚗' }, { sys: 'Uber Home', icon: '🚙' }
  ];
  let stepCustom = {};
  function cleanText(t) { return String(t).replace(/[<>]/g, ''); }
  /* One visible icon = one grapheme (multi-part emoji, flags, and skin tones count as one) */
  const graphemeSegmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function iconParts(text) {
    const t = String(text == null ? '' : text).trim();
    if (!t) return [];
    if (graphemeSegmenter) return Array.from(graphemeSegmenter.segment(t), x => x.segment).filter(g => g.trim());
    const out = [];
    let prev = 0;
    Array.from(t).forEach(ch => {
      const c = ch.codePointAt(0);
      const joiner = c === 0x200D || (c >= 0xFE00 && c <= 0xFE0F) || (c >= 0x1F3FB && c <= 0x1F3FF) || c === 0x20E3 || (c >= 0xE0020 && c <= 0xE007F);
      const regional = c >= 0x1F1E6 && c <= 0x1F1FF;
      const lastCps = out.length ? Array.from(out[out.length - 1]) : [];
      const pairsFlag = regional && lastCps.length === 1 && lastCps[0].codePointAt(0) >= 0x1F1E6 && lastCps[0].codePointAt(0) <= 0x1F1FF;
      if (out.length && (joiner || prev === 0x200D || pairsFlag)) out[out.length - 1] += ch; else out.push(ch);
      prev = c;
    });
    return out.filter(g => g.trim());
  }
  function firstIcon(text) { const p = iconParts(text); return p.length ? p[0] : ''; }
  function lastIcon(text) { const p = iconParts(text); return p.length ? p[p.length - 1] : ''; }
  function keepOneIcon(input) { const k = lastIcon(input.value); if (input.value !== k) input.value = k; }
  function stepName(sys) { const c = stepCustom[sys]; return (c && c.name && c.name.trim()) ? cleanText(c.name.trim()) : sys; }
  function stepIcon(sys) { const c = stepCustom[sys]; const ic = (c && c.icon) ? firstIcon(cleanText(c.icon)) : ''; return ic || stepSystem.find(r => r.sys === sys).icon; }

  function emptyProfile() {
    return { v: 1, address: '', homeAirport: '', programs: [], touchless: {}, ktn: '', ktnExp: '',
      units: { speed: 'mph', temp: 'f', dist: 'mi' }, stepDefaults: {}, modified: '' };
  }
  function normalizeProfile(raw) {
    const p = emptyProfile();
    if (!raw || typeof raw !== 'object') return p;
    const str = v => typeof v === 'string' ? v : '';
    p.address = str(raw.address); p.homeAirport = str(raw.homeAirport);
    p.ktn = str(raw.ktn).toUpperCase().slice(0, 9); p.ktnExp = str(raw.ktnExp);
    p.modified = (typeof raw.modified === 'string' && !isNaN(Date.parse(raw.modified))) ? raw.modified : '';
    if (Array.isArray(raw.programs)) {
      p.programs = raw.programs
        .filter(x => x && ['airline', 'rental', 'hotel'].indexOf(x.type) >= 0 && typeof x.name === 'string' && cleanText(x.name).trim())
        .map(x => ({ type: x.type, name: cleanText(x.name).trim(), id: cleanText(str(x.id)) }));
    }
    if (raw.touchless && typeof raw.touchless === 'object') Object.keys(raw.touchless).forEach(k => { if (raw.touchless[k] === true) p.touchless[k] = true; });
    if (raw.units && typeof raw.units === 'object') {
      if (['mph', 'kph'].indexOf(raw.units.speed) >= 0) p.units.speed = raw.units.speed;
      if (['f', 'c'].indexOf(raw.units.temp) >= 0) p.units.temp = raw.units.temp;
      if (['mi', 'km'].indexOf(raw.units.dist) >= 0) p.units.dist = raw.units.dist;
    }
    if (raw.stepDefaults && typeof raw.stepDefaults === 'object') {
      stepSystem.forEach(r => {
        const c = raw.stepDefaults[r.sys];
        if (c && typeof c === 'object') {
          const n = cleanText(str(c.name)).trim(), i = firstIcon(cleanText(str(c.icon)));
          if (n || i) p.stepDefaults[r.sys] = { name: n, icon: i };
        }
      });
    }
    return p;
  }
  function loadProfile() {
    try { const raw = localStorage.getItem(PROFILE_KEY); if (raw) return normalizeProfile(JSON.parse(raw)); } catch (e) {}
    return emptyProfile();
  }
  function currentUnits() {
    const u = {};
    unitGroups.forEach(g => { u[g.dataset.unitGroup] = g.querySelector('button.on').dataset.val; });
    return u;
  }
  let profileModified = '';
  let lastProfileSnap = '';
  function profileContent() {
    const t = {}; Object.keys(touchless).forEach(k => { if (touchless[k]) t[k] = true; });
    return { v: 1, address: addrInput.value, homeAirport: homeAirportInput.value,
      programs: programs.map(p => ({ type: p.type, name: p.name, id: p.id })), touchless: t,
      ktn: ktnInput.value, ktnExp: ktnExpInput.value, units: currentUnits(), stepDefaults: JSON.parse(JSON.stringify(stepCustom)) };
  }
  function snapshotProfile() { return Object.assign(profileContent(), { modified: profileModified }); }
  function saveProfile() {
    const c = JSON.stringify(profileContent());
    if (c !== lastProfileSnap) { if (lastProfileSnap !== '') profileModified = new Date().toISOString(); lastProfileSnap = c; }
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(snapshotProfile())); } catch (e) {}
  }
  function touchProfile() { profileModified = new Date().toISOString(); saveProfile(); }
  function updateKtn() {
    const v = ktnInput.value, good = /^[A-Z0-9]{9}$/.test(v);
    ktnInput.classList.toggle('ktn-ok', good);
    ktnInput.classList.toggle('ktn-bad', !!v && !good);
    ktnNote.style.display = (v && !good) ? 'block' : 'none';
  }
  function applyProfile(p) {
    addrInput.value = p.address; homeAirportInput.value = p.homeAirport;
    ktnInput.value = p.ktn; ktnExpInput.value = p.ktnExp;
    programs = p.programs; touchless = p.touchless; stepCustom = p.stepDefaults;
    unitGroups.forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.val === p.units[g.dataset.unitGroup])));
    stepSystem.forEach(r => { const c = stepCustom[r.sys] || { name: '', icon: '' }; defaultsInputs[r.sys].name.value = c.name; defaultsInputs[r.sys].icon.value = c.icon; });
    updateKtn();
    profileModified = p.modified || ''; lastProfileSnap = JSON.stringify(profileContent());
    renderLoyaltyList(); renderTsaAirlines(); renderNodeTrack(); renderStepForm();
  }
  addrInput.addEventListener('input', saveProfile);
  homeAirportInput.addEventListener('input', saveProfile);
  ktnInput.addEventListener('input', () => {
    const pos = ktnInput.selectionStart;
    ktnInput.value = ktnInput.value.toUpperCase();
    try { ktnInput.setSelectionRange(pos, pos); } catch (e) {}
    updateKtn(); saveProfile();
  });

  /* ============ AIRPORT AUTOCOMPLETE (US table in airports.js) ============ */
  const airportData = (window.CROSSWIND_AIRPORTS || []).map(a => ({ code: a[0], city: a[1], state: a[2], lat: a[3], lon: a[4], size: a[5], label: a[0] + ' - ' + a[1] + ' ' + a[2] }));
  const airportSizeRank = { L: 0, M: 1, S: 2 };
  function findAirports(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const code = raw.replace(/\s+/g, '').toUpperCase(), city = raw.replace(/\s+/g, ' ').toLowerCase();
    const rank = (a, b) => (airportSizeRank[a.size] - airportSizeRank[b.size]) || a.code.localeCompare(b.code);
    const byCode = airportData.filter(a => a.code.startsWith(code)).sort((a, b) => ((b.code === code) - (a.code === code)) || rank(a, b));
    const byCity = airportData.filter(a => !a.code.startsWith(code) && a.city.toLowerCase().startsWith(city)).sort(rank);
    return byCode.concat(byCity).slice(0, 8);
  }
  /* Shared suggestion list. opts: find(text) -> [{ label }], onPick(item), showOnFocus (show the list when the field is focused),
     exactOnBlur(text) -> item (expand text left in the field to that item when leaving it) */
  function attachSuggest(input, listEl, opts) {
    let items = [], hl = -1, closeTimer = null;
    function close() { listEl.style.display = 'none'; listEl.innerHTML = ''; items = []; hl = -1; }
    function paint() { listEl.querySelectorAll('.suggest-item').forEach((el, i) => el.classList.toggle('hl', i === hl)); }
    function pick(a) { clearTimeout(closeTimer); input.value = a.label; close(); opts.onPick(a); input.blur(); }
    function show(whole) {
      clearTimeout(closeTimer);
      items = opts.find(whole === true ? '' : input.value); hl = -1; listEl.innerHTML = '';
      if (!items.length) { listEl.style.display = 'none'; return; }
      items.forEach(a => {
        const d = document.createElement('div'); d.className = 'suggest-item'; d.textContent = a.label;
        d.addEventListener('mousedown', e => e.preventDefault());
        d.addEventListener('click', () => pick(a));
        listEl.appendChild(d);
      });
      listEl.style.display = 'block';
    }
    input.addEventListener('input', () => show());
    if (opts.showOnFocus) input.addEventListener('focus', () => show(true));
    input.addEventListener('keydown', e => {
      if (!items.length) return;
      if (e.key === 'ArrowDown') { hl = (hl + 1) % items.length; paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hl = (hl - 1 + items.length) % items.length; paint(); e.preventDefault(); }
      else if (e.key === 'Enter' && hl >= 0) { pick(items[hl]); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    input.addEventListener('blur', () => {
      const exact = opts.exactOnBlur ? opts.exactOnBlur(input.value) : null;
      if (exact && input.value !== exact.label) { input.value = exact.label; opts.onPick(exact); }
      closeTimer = setTimeout(close, 150);
    });
  }
  attachSuggest(homeAirportInput, document.getElementById('airportSuggest'), {
    find: findAirports,
    onPick: () => saveProfile(),
    exactOnBlur: text => airportData.find(a => a.code === text.trim().toUpperCase())
  });

  /* ============ LOYALTY PROGRAMS + TSA AIRLINES: shared state ============ */
  let programs = [];
  let touchless = {};
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
    if (!programs.length) { const e = document.createElement('div'); e.className = 'empty-row'; e.textContent = 'No programs yet'; loyaltyList.appendChild(e); }
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
      row.addEventListener('click', () => { touchless[a.name.toLowerCase()] = !touchless[a.name.toLowerCase()]; saveProfile(); renderTsaAirlines(); });
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
  let deleteArmTimer = null;
  function disarmDelete() { clearTimeout(deleteArmTimer); deleteArmTimer = null; deleteBtn.textContent = 'Delete'; }

  function openProgramModal(idx) {
    disarmDelete();
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
  function closeProgramModal() { disarmDelete(); modal.classList.remove('open'); }
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
  deleteBtn.addEventListener('click', () => {
    if (editingIndex === null) return;
    if (!deleteArmTimer) { deleteBtn.textContent = 'Tap again to delete'; deleteArmTimer = setTimeout(disarmDelete, 3000); return; }
    disarmDelete(); programs.splice(editingIndex, 1); closeProgramModal(); saveProfile(); renderAll();
  });

  function commitProgramEntry() {
    const name = programNameInput.value.trim();
    if (!name) { programNameInput.focus(); return false; }
    const id = programIdInput.value.trim();
    if (editingIndex !== null) programs[editingIndex] = { type: modalType, name, id };
    else programs.push({ type: modalType, name, id });
    saveProfile();
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
  const defaultsBody = document.querySelector('#defaultsTable tbody');
  const defaultsInputs = {};
  function updateStepCustom(sys) {
    const n = defaultsInputs[sys].name.value.trim(), i = defaultsInputs[sys].icon.value.trim();
    if (n || i) stepCustom[sys] = { name: n, icon: i }; else delete stepCustom[sys];
    saveProfile(); renderNodeTrack(); renderStepForm();
  }
  stepSystem.forEach(step => {
    const tr = document.createElement('tr');
    const tdSys = document.createElement('td'); tdSys.className = 'sysname'; tdSys.textContent = step.sys;
    const tdName = document.createElement('td'); const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.placeholder = step.sys; tdName.appendChild(nameInput);
    const tdIcon = document.createElement('td'); const iconInput = document.createElement('input'); iconInput.type = 'text'; iconInput.className = 'icon-input'; iconInput.placeholder = step.icon; tdIcon.appendChild(iconInput);
    const tdReset = document.createElement('td'); const resetBtn = document.createElement('button'); resetBtn.className = 'reset-btn'; resetBtn.textContent = '↺'; resetBtn.title = 'Reset to default'; tdReset.appendChild(resetBtn);
    defaultsInputs[step.sys] = { name: nameInput, icon: iconInput };
    nameInput.addEventListener('input', () => updateStepCustom(step.sys));
    iconInput.addEventListener('input', () => keepOneIcon(iconInput));
    iconInput.addEventListener('input', () => updateStepCustom(step.sys));
    resetBtn.addEventListener('click', () => { nameInput.value = ''; iconInput.value = ''; updateStepCustom(step.sys); });
    tr.appendChild(tdSys); tr.appendChild(tdName); tr.appendChild(tdIcon); tr.appendChild(tdReset);
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

  /* ============ TRIP WIZARD: full round-trip, multi-stop state ============ */
  let trips = [];
  let activeTripId = '';
  function newFlight() { return { airline: '', flightNum: '', conf: '', seat: '', date: '' }; }
  function newStop() {
    return {
      destination: { name: '', address: '', contact: '', phone: '' },
      flights: [ newFlight() ],
      rental: { company: '', cls: 'Economy', color: '', plate: '', pickup: '', ret: '', conf: '' },
      hotel: { chain: '', brand: '', name: '', address: '', room: '', checkIn: '', checkOut: '', conf: '' }
    };
  }
  const wizardState = {
    selected: 'uber-out',
    uberOut: { pickup: '', dropoff: '', date: '' },
    stops: [ newStop() ],
    returnFlights: [ newFlight() ],
    uberHome: { pickup: '', dropoff: '', date: '' }
  };

  function flightNodeMeta(flights, fi) {
    const n = flights.length;
    let sys = 'Flight (Initial)', num = '';
    if (n > 1) {
      if (fi === 0) sys = 'Flight (Initial)';
      else if (fi === n - 1) sys = 'Flight (Final)';
      else { sys = 'Connection'; if (n > 3) num = ' ' + fi; }
    }
    return { icon: stepIcon(sys), base: stepName(sys) + num };
  }

  function buildNodes() {
    const nodes = [];
    const trip = activeTrip();
    const startsHome = !trip || trip.startsAtHome, endsHome = !trip || trip.endsAtHome;
    if (startsHome) {
      nodes.push({ key: 'home', icon: stepIcon('Home'), label: stepName('Home'), type: 'home' });
      nodes.push({ key: 'uber-out', icon: stepIcon('Uber'), label: stepName('Uber'), type: 'uberOut' });
    }
    const multi = wizardState.stops.length > 1;

    wizardState.stops.forEach((stop, si) => {
      const tag = stop.destination.name ? stop.destination.name : ('Stop ' + (si + 1));
      stop.flights.forEach((f, fi) => {
        const m = flightNodeMeta(stop.flights, fi);
        const label = multi ? (m.base + ' — ' + tag) : m.base;
        nodes.push({ key: 'stop' + si + '-flight-' + fi, icon: m.icon, label, type: 'flight', stopIndex: si, flightIndex: fi });
        if (fi < stop.flights.length - 1) nodes.push({ key: 'stop' + si + '-layover-' + fi, icon: stepIcon('Layover'), label: stepName('Layover'), type: 'layover', optional: true, stopIndex: si, betweenIndex: fi });
      });
      nodes.push({ key: 'stop' + si + '-rental', icon: stepIcon('Rental'), label: multi ? (stepName('Rental') + ' — ' + tag) : stepName('Rental'), type: 'rental', stopIndex: si });
      nodes.push({ key: 'stop' + si + '-hotel', icon: stepIcon('Hotel'), label: multi ? (stepName('Hotel') + ' — ' + tag) : stepName('Hotel'), type: 'hotel', stopIndex: si });
      nodes.push({ key: 'stop' + si + '-destination', icon: stepIcon('Objective / To'), label: multi ? (stepName('Objective / To') + ' ' + (si + 1)) : stepName('Objective / To'), type: 'destination', stopIndex: si });
      nodes.push({ key: 'stop' + si + '-rentalreturn', icon: stepIcon('Rental Return'), label: multi ? (stepName('Rental Return') + ' — ' + tag) : stepName('Rental Return'), type: 'rentalReturn', stopIndex: si, optional: true });
    });

    if (endsHome) {
      wizardState.returnFlights.forEach((f, fi) => {
        const m = flightNodeMeta(wizardState.returnFlights, fi);
        nodes.push({ key: 'return-flight-' + fi, icon: m.icon, label: 'Return: ' + m.base, type: 'returnFlight', flightIndex: fi });
        if (fi < wizardState.returnFlights.length - 1) nodes.push({ key: 'return-layover-' + fi, icon: stepIcon('Layover'), label: stepName('Layover'), type: 'layover', optional: true, betweenIndex: fi, isReturn: true });
      });

      nodes.push({ key: 'uber-home', icon: stepIcon('Uber Home'), label: stepName('Uber Home'), type: 'uberHome' });
      nodes.push({ key: 'home-end', icon: stepIcon('Home'), label: stepName('Home'), type: 'home' });
    }
    return nodes;
  }

  function firstStepKey(nodes) { return (nodes[0].type === 'home' && nodes[1]) ? nodes[1].key : nodes[0].key; }
  function ensureWizardSelection() {
    const nodes = buildNodes();
    if (!nodes.some(n => n.key === wizardState.selected)) wizardState.selected = firstStepKey(nodes);
  }
  const nodeTrack = document.getElementById('nodeTrack');
  function renderNodeTrack() {
    ensureWizardSelection();
    const nodes = buildNodes();
    const selIdx = nodes.findIndex(n => n.key === wizardState.selected);
    nodeTrack.innerHTML = '';
    nodes.forEach((n, idx) => {
      const div = document.createElement('div');
      let cls = 'node';
      if (n.optional) cls += ' optional';
      if (idx < selIdx) cls += ' done'; else if (idx === selIdx) cls += ' current';
      div.className = cls; div.dataset.key = n.key;
      div.innerHTML = '<div class="nd">' + n.icon + '</div><div class="nl">' + n.label + '</div>';
      div.addEventListener('click', () => { wizardState.selected = n.key; renderNodeTrack(); renderStepForm(); });
      nodeTrack.appendChild(div);
    });
  }

  /* ---- Step dates: smart defaults, user entries kept ---- */
  let stepDateFields = [];
  function dateRef(key) {
    const k = key.split(':'), i = +k[1], j = +k[2];
    switch (k[0]) {
      case 'uberOut': return { o: wizardState.uberOut, p: 'date' };
      case 'uberHome': return { o: wizardState.uberHome, p: 'date' };
      case 'f': return { o: wizardState.stops[i].flights[j], p: 'date' };
      case 'rf': return { o: wizardState.returnFlights[i], p: 'date' };
      case 'hIn': return { o: wizardState.stops[i].hotel, p: 'checkIn' };
      case 'hOut': return { o: wizardState.stops[i].hotel, p: 'checkOut' };
      case 'rPick': return { o: wizardState.stops[i].rental, p: 'pickup' };
      default: return { o: wizardState.stops[i].rental, p: 'ret' };
    }
  }
  /* Effective date of every date field: what the user entered, else the default worked out from the trip */
  function effDates() {
    const trip = activeTrip(), out = {};
    if (!trip) return out;
    const start = fromISODate(trip.start), end = fromISODate(trip.end);
    const user = (o, p) => fromISODate(o[p]);
    out.uberOut = user(wizardState.uberOut, 'date') || start;
    let prev = null;
    wizardState.stops.forEach((st, si) => {
      st.flights.forEach((f, fi) => {
        let def;
        if (si === 0 && fi === 0) def = start;
        else if (fi === 0) def = user(wizardState.stops[si - 1].hotel, 'checkOut') || prev;
        else def = prev;
        prev = user(f, 'date') || def;
        out['f:' + si + ':' + fi] = prev;
      });
    });
    let prevR = null;
    wizardState.returnFlights.forEach((f, fi) => {
      prevR = user(f, 'date') || (fi === 0 ? end : prevR);
      out['rf:' + fi + ':0'] = prevR;
    });
    out.uberHome = user(wizardState.uberHome, 'date') || out['rf:' + (wizardState.returnFlights.length - 1) + ':0'];
    wizardState.stops.forEach((st, si) => {
      const arrival = out['f:' + si + ':' + (st.flights.length - 1)];
      out['hIn:' + si + ':0'] = user(st.hotel, 'checkIn') || arrival;
      const nextFlight = si < wizardState.stops.length - 1 ? out['f:' + (si + 1) + ':0'] : (trip.endsAtHome ? out['rf:0:0'] : end);
      out['hOut:' + si + ':0'] = user(st.hotel, 'checkOut') || nextFlight;
      out['rPick:' + si + ':0'] = user(st.rental, 'pickup') || out['hIn:' + si + ':0'];
      out['rRet:' + si + ':0'] = user(st.rental, 'ret') || out['hOut:' + si + ':0'];
    });
    return out;
  }
  function effDateText(key) { const d = effDates()[key]; return d ? fmtDate(d) : ''; }
  function dateFieldHTML(id, label, key) {
    stepDateFields.push({ id, key });
    return '<label class="fld">' + label + '</label><div style="display:flex; gap:6px; align-items:center;"><input type="text" id="' + id + '" placeholder="e.g. T+1">' +
      '<button class="suggest-btn" id="' + id + '-cal" style="margin-top:0;">📅</button></div>' +
      '<div class="fld-note date-note" id="' + id + '-note" style="display:none;">Outside the trip dates</div>';
  }
  function refreshStepDates() {
    const trip = activeTrip();
    if (!trip) return;
    const eff = effDates(), s0 = fromISODate(trip.start), e0 = fromISODate(trip.end);
    stepDateFields.forEach(f => {
      const el = document.getElementById(f.id), d = eff[f.key];
      if (!el) return;
      if (document.activeElement !== el) el.value = d ? fmtDate(d) : '';
      document.getElementById(f.id + '-note').style.display = (d && (d < s0 || d > e0)) ? 'block' : 'none';
    });
  }
  function wireDateFields() {
    stepDateFields.forEach(f => {
      const el = document.getElementById(f.id), cal = document.getElementById(f.id + '-cal');
      let dirty = false;
      el.addEventListener('input', () => { dirty = true; });
      el.addEventListener('blur', () => {
        if (!dirty) return;
        dirty = false;
        const txt = el.value.trim(), ref = dateRef(f.key);
        if (!txt) ref.o[ref.p] = '';
        else { const d = parseSmartDate(txt, new Date(), fromISODate(activeTrip().start)); if (d) ref.o[ref.p] = toISODate(d); }
        refreshStepDates();
      });
      cal.addEventListener('click', () => {
        openCalendar('single', { start: effDates()[f.key] }, (start) => {
          if (start) { const ref = dateRef(f.key); ref.o[ref.p] = toISODate(start); refreshStepDates(); commitTrips(); }
        });
      });
    });
    refreshStepDates();
  }
  /* Dropdowns start on a blank "Select…" so what is shown is what is stored */
  function selectOptionsHTML(names, current, emptyText) {
    if (!names.length && !current) return '<option value="">' + emptyText + '</option>';
    const list = names.slice();
    if (current && list.indexOf(current) < 0) list.unshift(current);
    return '<option value="">Select…</option>' + list.map(n => '<option' + (n === current ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
  }
  /* Auto-uppercase while typing (cursor kept); optional live check after each change */
  function upperInput(el, setter, live) {
    el.addEventListener('input', () => {
      const pos = el.selectionStart;
      el.value = el.value.toUpperCase();
      try { el.setSelectionRange(pos, pos); } catch (e) {}
      setter(el.value);
      if (live) live();
    });
  }
  function updateConfColor(el, noteEl) {
    const v = el.value, good = /^[A-Z0-9]{6}$/.test(v);
    el.classList.toggle('val-ok', good);
    el.classList.toggle('val-bad', !!v && !good);
    noteEl.style.display = (v && !good) ? 'block' : 'none';
  }

  /* ---- Phone numbers: stored as digits (plus an extension), shown in telephone format ---- */
  function parsePhone(text) {
    let t = String(text == null ? '' : text), ext = '';
    const m = t.match(/(?<![A-Za-z])(?:extension|ext\.?|x)\s*[:#.]?\s*(\d+)\s*$/i);
    if (m) { ext = m[1]; t = t.slice(0, m.index); }
    let digits = t.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
    return digits ? digits + (ext ? 'x' + ext : '') : '';
  }
  function formatPhone(stored) {
    const p = parsePhone(stored), i = p.indexOf('x');
    const num = i >= 0 ? p.slice(0, i) : p, ext = i >= 0 ? p.slice(i + 1) : '';
    let f = num;
    if (num.length === 10) f = '(' + num.slice(0, 3) + ') ' + num.slice(3, 6) + '-' + num.slice(6);
    else if (num.length === 7) f = num.slice(0, 3) + '-' + num.slice(3);
    return f + (ext ? ' x' + ext : '');
  }

  /* ---- Two-tap confirm on a button: first tap arms it, second tap does it, reverts after 3 seconds ---- */
  function twoTap(btn, armedText, onConfirm) {
    const normal = btn.textContent;
    let timer = null;
    btn.addEventListener('click', () => {
      if (!timer) { btn.textContent = armedText; timer = setTimeout(() => { timer = null; btn.textContent = normal; }, 3000); return; }
      clearTimeout(timer); timer = null; btn.textContent = normal; onConfirm();
    });
  }

  /* ---- Hotel brands for the chain the user picked (keyword match against their own chain name) ---- */
  const hotelBrandData = window.CROSSWIND_HOTEL_BRANDS || [];
  function brandListFor(chain) {
    const c = String(chain || '').toLowerCase();
    if (!c) return null;
    const hit = hotelBrandData.find(x => x.match.some(k => c.indexOf(k) >= 0));
    return hit ? hit.brands : null;
  }
  /* Chain dropdown: the user's programs first, a dashed line, then major chains none of their programs cover */
  const majorHotelChains = window.CROSSWIND_MAJOR_HOTEL_CHAINS || [];
  function hotelChainOptionsHTML(programNames, current) {
    const lc = programNames.map(n => n.toLowerCase());
    const majors = majorHotelChains.filter(m => !lc.some(p => m.match.some(k => p.indexOf(k) >= 0))).map(m => m.name);
    const first = programNames.slice();
    if (current && first.indexOf(current) < 0 && majors.indexOf(current) < 0) first.unshift(current);
    const opt = n => '<option' + (n === current ? ' selected' : '') + '>' + esc(n) + '</option>';
    return '<option value="">Select…</option>' + first.map(opt).join('') +
      (first.length && majors.length ? '<option disabled>──────────</option>' : '') + majors.map(opt).join('');
  }
  function brandItems(chain, text) {
    const list = brandListFor(chain);
    if (!list) return [];
    const t = String(text || '').trim().toLowerCase();
    return list.filter(b => !t || b.toLowerCase().indexOf(t) >= 0).map(b => ({ label: b }));
  }

  /* ---- Flight confirmation: copy it from the nearest earlier flight with the same airline ---- */
  function allFlightsInOrder() {
    const list = [];
    wizardState.stops.forEach((st, si) => st.flights.forEach((f, fi) => list.push({ f, key: 'stop' + si + '-flight-' + fi })));
    wizardState.returnFlights.forEach((f, fi) => list.push({ f, key: 'return-flight-' + fi }));
    return list;
  }
  function copyConfirmationFrom(f) {
    if (!f.airline || f.conf) return null;
    const list = allFlightsInOrder(), idx = list.findIndex(x => x.f === f);
    for (let i = idx - 1; i >= 0; i--) {
      if (list[i].f.airline === f.airline && list[i].f.conf) {
        f.conf = list[i].f.conf;
        const node = buildNodes().find(n => n.key === list[i].key);
        return node ? node.label : 'an earlier flight';
      }
    }
    return null;
  }
  function onAirlineChosen(f) {
    const from = copyConfirmationFrom(f);
    if (!from) return;
    const confEl = document.getElementById('wf-flight-conf'), note = document.getElementById('wf-copy-note');
    confEl.value = f.conf; updateConfColor(confEl, document.getElementById('wf-conf-note'));
    note.textContent = 'Copied from ' + from + ' — change it if this is a separate booking';
    note.style.display = 'block';
  }

  function parserButtonHTML(label) {
    return '<button class="parser-btn" disabled title="Coming soon">Text Clipboard Parser<small>Coming soon</small></button>';
  }

  function flightFormHTML(f, dateKey) {
    const airlineOpts = selectOptionsHTML(sortedByType('airline').map(a => a.name), f.airline, 'No airlines yet — add in Setup');
    return '<div class="fld-grid">' +
      '<div>' + dateFieldHTML('wf-date', 'Date', dateKey) + '</div>' +
      '<div><label class="fld">Airline</label><select id="wf-flight-airline">' + airlineOpts + '</select></div>' +
      '</div>' +
      '<div class="flight-row3">' +
      '<div class="fnum"><label class="fld">Flight #</label><input type="text" id="wf-flight-num" placeholder="402" maxlength="6" value="' + f.flightNum + '"></div>' +
      '<div class="fconf"><label class="fld">Confirmation #</label><input type="text" id="wf-flight-conf" placeholder="NZ82X1" maxlength="8" value="' + f.conf + '"></div>' +
      '<div class="fseat"><label class="fld">Seat #</label><input type="text" id="wf-flight-seat" placeholder="4C" maxlength="3" value="' + f.seat + '"></div>' +
      '</div>' +
      '<div class="fld-note val-note" id="wf-conf-note" style="display:none;">Confirmation is usually 6 letters/numbers</div>' +
      '<div class="fld-note" id="wf-copy-note" style="display:none;"></div>' +
      '<div class="autofill-box"><div class="af-label">Auto-Filled via Flight Tracker API</div><div class="fld-grid">' +
      '<div><label class="fld">Gate</label><input type="text" value="—" disabled></div>' +
      '<div><label class="fld">Destination</label><input type="text" value="—" disabled></div>' +
      '<div><label class="fld">Departure Time</label><input type="text" value="—" disabled></div>' +
      '<div><label class="fld">Landing Time</label><input type="text" value="—" disabled></div></div></div>';
  }

  function stepFormHTML(node) {
    let html = '';

    if (node.type === 'home') {
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div><div class="home-note">This is your saved Home Base from Setup. Edit it there if it needs to change.</div>';
    }

    else if (node.type === 'uberOut') {
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        dateFieldHTML('wf-date', 'Date', 'uberOut') +
        '<div class="fld-grid">' +
        '<div><label class="fld">Pickup Time</label><input type="text" id="wf-uber-pickup" placeholder="e.g. 4:30 PM" value="' + wizardState.uberOut.pickup + '"></div>' +
        '<div><label class="fld">Drop-off Time <span class="fld-opt">(optional)</span></label><input type="text" id="wf-uber-dropoff" placeholder="e.g. 5:10 PM" value="' + wizardState.uberOut.dropoff + '"></div>' +
        '</div>' + parserButtonHTML('Uber');
    }

    else if (node.type === 'flight') {
      const f = wizardState.stops[node.stopIndex].flights[node.flightIndex];
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        flightFormHTML(f, 'f:' + node.stopIndex + ':' + node.flightIndex) + parserButtonHTML('Flight') +
        (node.flightIndex === wizardState.stops[node.stopIndex].flights.length - 1 ? '<button class="add-flight-btn" id="wf-add-flight">+ Add Another Flight</button>' : '') +
        (wizardState.stops[node.stopIndex].flights.length > 1 ? '<button class="add-flight-btn remove-btn" id="wf-remove-flight">Remove this flight</button>' : '');
    }

    else if (node.type === 'layover') {
      const i = node.betweenIndex;
      const list = node.isReturn ? wizardState.returnFlights : wizardState.stops[node.stopIndex].flights;
      const pre = node.isReturn ? 'Return: ' : '';
      const label1 = pre + flightNodeMeta(list, i).base;
      const label2 = pre + flightNodeMeta(list, i + 1).base;
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        '<div class="layover-strip">🧳 Calculated: <b>' + label1 + ' Landing</b> → <b>' + label2 + ' Boarding</b></div>' +
        '<div class="fld-note" style="margin-top:8px;">Example once flight times are auto-filled: SEA Landing 6:40 PM → MCI Boarding 8:22 PM = <b style="color:var(--amber);">1h 42m layover</b>. Real calculation activates once the Flight Tracker API auto-fill is wired in (Step 4).</div>';
    }

    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental, si = node.stopIndex;
      const compOpts = selectOptionsHTML(sortedByType('rental').map(c => c.name), r.company, 'No rental programs yet');
      const classes = ['Economy','Compact','Intermediate/Midsize','Standard','Full-Size','Premium','Luxury','SUV (Compact)','SUV (Standard/Full-Size)','Minivan'];
      const classOpts = classes.map(c => '<option' + (c === r.cls ? ' selected' : '') + '>' + c + '</option>').join('');
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div><div class="fld-grid">' +
        '<div><label class="fld">Company</label><select id="wf-rental-company">' + compOpts + '</select></div>' +
        '<div><label class="fld">Class</label><select id="wf-rental-class">' + classOpts + '</select></div>' +
        '<div>' + dateFieldHTML('wf-rental-pick', 'Pickup Date', 'rPick:' + si + ':0') + '</div>' +
        '<div>' + dateFieldHTML('wf-rental-ret', 'Return Date', 'rRet:' + si + ':0') + '</div>' +
        '<div><label class="fld">Confirmation # <span class="fld-opt">(optional)</span></label><input type="text" id="wf-rental-conf" placeholder="—" value="' + r.conf + '"></div><div></div>' +
        '<div><label class="fld">Color <span class="fld-opt">(at pickup)</span></label><input type="text" id="wf-rental-color" placeholder="—" value="' + r.color + '"></div>' +
        '<div><label class="fld">License Plate <span class="fld-opt">(at pickup)</span></label><input type="text" id="wf-rental-plate" placeholder="—" value="' + r.plate + '"></div>' +
        '</div>' + parserButtonHTML('Rental');
    }

    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel, si = node.stopIndex;
      const chainOpts = hotelChainOptionsHTML(sortedByType('hotel').map(c => c.name), h.chain);
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div><div class="fld-grid">' +
        '<div><label class="fld">Chain</label><select id="wf-hotel-chain">' + chainOpts + '</select></div>' +
        '<div><label class="fld">Brand</label><input type="text" id="wf-hotel-brand" placeholder="e.g. Courtyard" autocomplete="off" value="' + esc(h.brand) + '"></div>' +
        '</div>' +
        '<div class="suggest-list" id="wf-brand-suggest" style="display:none;"></div>' +
        '<label class="fld">Hotel Name</label><input type="text" id="wf-hotel-name" placeholder="e.g. Lambeau Field Hilton" value="' + h.name + '">' +
        '<label class="fld">Address</label><input type="text" id="wf-hotel-address" placeholder="—" value="' + h.address + '">' +
        '<button class="suggest-btn" id="wf-hotel-suggest" disabled title="Needs online lookup — coming soon">📍 Suggest Address</button>' +
        '<div class="fld-note">Needs online lookup — coming soon</div>' +
        '<div class="fld-grid">' +
        '<div>' + dateFieldHTML('wf-hotel-in', 'Check-in Date', 'hIn:' + si + ':0') + '</div>' +
        '<div>' + dateFieldHTML('wf-hotel-out', 'Check-out Date', 'hOut:' + si + ':0') + '</div>' +
        '<div><label class="fld">Room # <span class="fld-opt">(at check-in)</span></label><input type="text" id="wf-hotel-room" placeholder="—" value="' + h.room + '"></div>' +
        '<div><label class="fld">Confirmation # <span class="fld-opt">(optional)</span></label><input type="text" id="wf-hotel-conf" placeholder="—" value="' + h.conf + '"></div>' +
        '</div>' + parserButtonHTML('Hotel');
    }

    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        '<label class="fld">Place Name</label><input type="text" id="wf-dest-name" placeholder="e.g. Hollywood Health Center" value="' + d.name + '">' +
        '<label class="fld">Address</label><input type="text" id="wf-dest-address" placeholder="—" value="' + d.address + '">' +
        '<button class="suggest-btn" id="wf-dest-suggest" disabled title="Needs online lookup — coming soon">📍 Suggest Address</button>' +
        '<div class="fld-note">Needs online lookup — coming soon</div>' +
        '<div class="fld-grid"><div><label class="fld">Contact Name</label><input type="text" id="wf-dest-contact" value="' + d.contact + '"></div><div><label class="fld">Contact Phone</label><input type="text" id="wf-dest-phone" value="' + formatPhone(d.phone) + '"></div></div>' +
        parserButtonHTML('Destination');
    }

    else if (node.type === 'rentalReturn') {
      const r = wizardState.stops[node.stopIndex].rental;
      const isLastStop = node.stopIndex === wizardState.stops.length - 1;
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        '<div class="return-ref">Returning: ' + (r.company || '—') + ' — ' + r.cls +
        '<div class="rr-sub">Return date: ' + (effDateText('rRet:' + node.stopIndex + ':0') || '—') + '</div>' +
        '<div class="rr-sub">No time needed — inferred from the next flight\'s boarding time.</div></div>' +
        (isLastStop ? '<button class="add-flight-btn" id="wf-add-stop">+ Add Another Stop</button>' : '') +
        (wizardState.stops.length > 1 ? '<button class="add-flight-btn remove-btn" id="wf-remove-stop">Remove this stop</button>' : '');
    }

    else if (node.type === 'returnFlight') {
      const f = wizardState.returnFlights[node.flightIndex];
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        flightFormHTML(f, 'rf:' + node.flightIndex + ':0') + parserButtonHTML('Flight') +
        (node.flightIndex === wizardState.returnFlights.length - 1 ? '<button class="add-flight-btn" id="wf-add-return-flight">+ Add Another Flight</button>' : '') +
        (wizardState.returnFlights.length > 1 ? '<button class="add-flight-btn remove-btn" id="wf-remove-flight">Remove this flight</button>' : '');
    }

    else if (node.type === 'uberHome') {
      html = '<div class="step-head">' + node.label.toUpperCase() + '</div>' +
        dateFieldHTML('wf-date', 'Date', 'uberHome') +
        '<div class="fld-grid">' +
        '<div><label class="fld">Pickup Time</label><input type="text" id="wf-uberhome-pickup" placeholder="e.g. 6:15 PM" value="' + wizardState.uberHome.pickup + '"><div class="fld-note">(usually set live at baggage claim)</div></div>' +
        '<div><label class="fld">Drop-off Time <span class="fld-opt">(optional)</span></label><input type="text" id="wf-uberhome-dropoff" placeholder="e.g. 6:50 PM" value="' + wizardState.uberHome.dropoff + '"></div>' +
        '</div>';
    }

    return html;
  }

  /* Every step gets the same total page height (tallest step + a quarter screen), so the step row stays put as the user taps through steps of different heights */
  function equalizeStepHeight(nodes, node) {
    const spacer = document.getElementById('wizSpacer');
    if (!spacer) return;
    const saveFields = stepDateFields;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute; left:-9999px; top:0; visibility:hidden; width:' + stepFormContainer.getBoundingClientRect().width + 'px;';
    stepFormContainer.parentNode.appendChild(probe);
    let tallest = 0;
    nodes.forEach(n => { stepDateFields = []; probe.innerHTML = stepFormHTML(n); tallest = Math.max(tallest, probe.getBoundingClientRect().height); });
    probe.remove();
    stepDateFields = saveFields;
    const current = stepFormContainer.getBoundingClientRect().height;
    spacer.style.height = Math.round(Math.max(0, tallest - current) + window.innerHeight * 0.25) + 'px';
  }

  function renderStepForm() {
    ensureWizardSelection();
    stepDateFields = [];
    const nodes = buildNodes();
    const node = nodes.find(n => n.key === wizardState.selected);
    if (!node) return;
    stepFormContainer.innerHTML = stepFormHTML(node);
    wireStepFormInputs(node);
    wireDateFields();
    equalizeStepHeight(nodes, node);
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
      if (sel) sel.addEventListener('change', e => { f.airline = e.target.value; onAirlineChosen(f); });
      document.getElementById('wf-flight-num').addEventListener('input', e => f.flightNum = e.target.value);
      const confEl = document.getElementById('wf-flight-conf'), confNote = document.getElementById('wf-conf-note');
      upperInput(confEl, v => f.conf = v, () => { updateConfColor(confEl, confNote); document.getElementById('wf-copy-note').style.display = 'none'; });
      updateConfColor(confEl, confNote);
      upperInput(document.getElementById('wf-flight-seat'), v => f.seat = v);
      const addBtn = document.getElementById('wf-add-flight');
      if (addBtn) addBtn.addEventListener('click', () => {
        const flights = wizardState.stops[node.stopIndex].flights;
        flights.push(newFlight());
        wizardState.selected = 'stop' + node.stopIndex + '-flight-' + (flights.length - 1);
        renderNodeTrack(); renderStepForm();
      });
      const rmBtn = document.getElementById('wf-remove-flight');
      if (rmBtn) twoTap(rmBtn, 'Tap again to remove', () => {
        wizardState.stops[node.stopIndex].flights.splice(node.flightIndex, 1);
        wizardState.selected = 'stop' + node.stopIndex + '-flight-' + Math.max(0, node.flightIndex - 1);
        renderNodeTrack(); renderStepForm(); commitTrips();
      });
    }
    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental;
      const compSel = document.getElementById('wf-rental-company');
      if (compSel) compSel.addEventListener('change', e => r.company = e.target.value);
      document.getElementById('wf-rental-class').addEventListener('change', e => r.cls = e.target.value);
      upperInput(document.getElementById('wf-rental-conf'), v => r.conf = v);
      document.getElementById('wf-rental-color').addEventListener('input', e => r.color = e.target.value);
      upperInput(document.getElementById('wf-rental-plate'), v => r.plate = v);
    }
    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel;
      const chainSel = document.getElementById('wf-hotel-chain');
      if (chainSel) chainSel.addEventListener('change', e => h.chain = e.target.value);
      const nameEl = document.getElementById('wf-hotel-name'), brandEl = document.getElementById('wf-hotel-brand');
      nameEl.addEventListener('input', e => h.name = e.target.value);
      brandEl.addEventListener('input', e => h.brand = e.target.value);
      attachSuggest(brandEl, document.getElementById('wf-brand-suggest'), {
        find: text => brandItems(h.chain, text),
        showOnFocus: true,
        onPick: item => {
          h.brand = item.label;
          if (!h.name.trim()) { h.name = item.label + ' '; nameEl.value = h.name; nameEl.focus(); nameEl.setSelectionRange(h.name.length, h.name.length); }
          commitTrips();
        }
      });
      document.getElementById('wf-hotel-address').addEventListener('input', e => h.address = e.target.value);
      document.getElementById('wf-hotel-room').addEventListener('input', e => h.room = e.target.value);
      upperInput(document.getElementById('wf-hotel-conf'), v => h.conf = v);
    }
    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      document.getElementById('wf-dest-name').addEventListener('input', e => { d.name = e.target.value; renderNodeTrack(); });
      document.getElementById('wf-dest-address').addEventListener('input', e => d.address = e.target.value);
      document.getElementById('wf-dest-contact').addEventListener('input', e => d.contact = e.target.value);
      const phoneEl = document.getElementById('wf-dest-phone');
      phoneEl.addEventListener('input', e => { d.phone = parsePhone(e.target.value); });
      phoneEl.addEventListener('blur', () => { phoneEl.value = formatPhone(d.phone); });
    }
    else if (node.type === 'rentalReturn') {
      const addStopBtn = document.getElementById('wf-add-stop');
      if (addStopBtn) addStopBtn.addEventListener('click', () => {
        wizardState.stops.push(newStop());
        const newIdx = wizardState.stops.length - 1;
        wizardState.selected = 'stop' + newIdx + '-flight-0';
        renderNodeTrack(); renderStepForm();
      });
      const rmStop = document.getElementById('wf-remove-stop');
      if (rmStop) twoTap(rmStop, 'Tap again to remove', () => {
        wizardState.stops.splice(node.stopIndex, 1);
        wizardState.selected = node.stopIndex > 0 ? 'stop' + (node.stopIndex - 1) + '-rentalreturn' : 'stop0-flight-0';
        dashSelected = '';
        renderNodeTrack(); renderStepForm(); commitTrips();
      });
    }
    else if (node.type === 'returnFlight') {
      const f = wizardState.returnFlights[node.flightIndex];
      const sel = document.getElementById('wf-flight-airline');
      if (sel) sel.addEventListener('change', e => { f.airline = e.target.value; onAirlineChosen(f); });
      document.getElementById('wf-flight-num').addEventListener('input', e => f.flightNum = e.target.value);
      const confEl = document.getElementById('wf-flight-conf'), confNote = document.getElementById('wf-conf-note');
      upperInput(confEl, v => f.conf = v, () => { updateConfColor(confEl, confNote); document.getElementById('wf-copy-note').style.display = 'none'; });
      updateConfColor(confEl, confNote);
      upperInput(document.getElementById('wf-flight-seat'), v => f.seat = v);
      const addBtn = document.getElementById('wf-add-return-flight');
      if (addBtn) addBtn.addEventListener('click', () => {
        wizardState.returnFlights.push(newFlight());
        wizardState.selected = 'return-flight-' + (wizardState.returnFlights.length - 1);
        renderNodeTrack(); renderStepForm();
      });
      const rmBtn = document.getElementById('wf-remove-flight');
      if (rmBtn) twoTap(rmBtn, 'Tap again to remove', () => {
        wizardState.returnFlights.splice(node.flightIndex, 1);
        wizardState.selected = 'return-flight-' + Math.max(0, node.flightIndex - 1);
        renderNodeTrack(); renderStepForm(); commitTrips();
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
  const dashProject = document.getElementById('dashProject');
  const dashTrack = document.getElementById('dashTrack');
  const dashCard = document.getElementById('dashCard');
  const dashDock = document.getElementById('dashDock');
  const cardAir = document.getElementById('cardAir');
  let airborne = false;
  let dashSelected = 'uber-out';
  let dashAddr = '';
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function dv(t) { const s = (t == null ? '' : String(t)).trim(); return s ? esc(s) : '—'; }
  function dashFlightFor(node) {
    return node.type === 'flight' ? wizardState.stops[node.stopIndex].flights[node.flightIndex] : wizardState.returnFlights[node.flightIndex];
  }
  function dashAddressFor(node) {
    if (node.type === 'home' || node.type === 'uberHome') return document.getElementById('addrInput').value;
    if (node.type === 'hotel') return wizardState.stops[node.stopIndex].hotel.address;
    if (node.type === 'destination') return wizardState.stops[node.stopIndex].destination.address;
    return '';
  }
  function dashCardHTML(node) {
    const line = (html) => '<div class="qc-line">' + html + '</div>';
    let html = '<div class="qc-title">' + node.icon + ' ' + esc(node.label.toUpperCase()) + '</div>';
    if (node.type === 'home') {
      html += line('ADDRESS: <b>' + dv(document.getElementById('addrInput').value) + '</b>') +
        line('HOME AIRPORT: <b>' + dv(document.getElementById('homeAirportInput').value) + '</b>');
    }
    else if (node.type === 'uberOut' || node.type === 'uberHome') {
      const u = node.type === 'uberOut' ? wizardState.uberOut : wizardState.uberHome;
      html += line('DATE: <b>' + dv(effDateText(node.type === 'uberOut' ? 'uberOut' : 'uberHome')) + '</b>') +
        line('PICKUP: <b>' + dv(u.pickup) + '</b> | DROP-OFF: <b>' + dv(u.dropoff) + '</b>');
    }
    else if (node.type === 'flight' || node.type === 'returnFlight') {
      const f = dashFlightFor(node);
      const fl = [f.airline, f.flightNum].filter(x => x && String(x).trim()).join(' ');
      const dateKey = node.type === 'flight' ? 'f:' + node.stopIndex + ':' + node.flightIndex : 'rf:' + node.flightIndex + ':0';
      html += '<div class="qc-route"><span class="apt">—</span><span class="arr">⟶</span><span class="apt">—</span></div>' +
        line('DATE: <b>' + dv(effDateText(dateKey)) + '</b>') +
        line('FLIGHT: <b>' + dv(fl) + '</b> | SEAT: <b>' + dv(f.seat) + '</b>') +
        line('CONFIRMATION: <b>' + dv(f.conf) + '</b> | GATE: <b>—</b>') +
        line('BOARDING: <b>—</b> | LANDING: <b>—</b>') +
        line('TSA PRECHECK: <span class="wt">' + dv(document.getElementById('ktnInput').value) + '</span>');
    }
    else if (node.type === 'layover') {
      html += line('LANDING → NEXT BOARDING: <b>—</b>');
    }
    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental;
      html += line('COMPANY: <b>' + dv(r.company) + '</b> | CLASS: <b>' + dv(r.cls) + '</b>') +
        line('PICKUP: <b>' + dv(effDateText('rPick:' + node.stopIndex + ':0')) + '</b> | RETURN: <b>' + dv(effDateText('rRet:' + node.stopIndex + ':0')) + '</b>') +
        line('CONFIRMATION: <b>' + dv(r.conf) + '</b>') +
        '<div class="qc-inputs"><div><label class="fld">Plate #</label><input type="text" id="dash-plate"></div>' +
        '<div><label class="fld">Color</label><input type="text" id="dash-color"></div></div>';
    }
    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel;
      html += line('CHAIN: <b>' + dv(h.chain) + '</b> | BRAND: <b>' + dv(h.brand) + '</b>') + line('NAME: <b>' + dv(h.name) + '</b>') + line('ADDRESS: <b>' + dv(h.address) + '</b>') +
        line('CHECK-IN: <b>' + dv(effDateText('hIn:' + node.stopIndex + ':0')) + '</b> | CHECK-OUT: <b>' + dv(effDateText('hOut:' + node.stopIndex + ':0')) + '</b>') +
        line('CONFIRMATION: <b>' + dv(h.conf) + '</b>') +
        '<div class="qc-inputs one"><div><label class="fld">Room #</label><input type="text" id="dash-room"></div></div>';
    }
    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      html += line('PLACE: <b>' + dv(d.name) + '</b>') + line('ADDRESS: <b>' + dv(d.address) + '</b>') +
        line('CONTACT: <b>' + dv(d.contact) + '</b> | PHONE: <b>' + dv(formatPhone(d.phone)) + '</b>');
    }
    else if (node.type === 'rentalReturn') {
      const r = wizardState.stops[node.stopIndex].rental;
      html += line('RETURNING: <b>' + dv(r.company) + ' — ' + dv(r.cls) + '</b>');
    }
    return html;
  }
  function wireDashInputs(node) {
    if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental;
      const plate = document.getElementById('dash-plate'), color = document.getElementById('dash-color');
      plate.value = r.plate; color.value = r.color;
      upperInput(plate, v => r.plate = v);
      color.addEventListener('input', e => r.color = e.target.value);
    }
    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel;
      const room = document.getElementById('dash-room');
      room.value = h.room;
      room.addEventListener('input', e => h.room = e.target.value);
    }
  }
  function renderDash() {
    const at = activeTrip();
    dashProject.textContent = 'Active: ' + (at ? at.name : '—');
    if (!at) {
      dashTrack.innerHTML = '';
      dashCard.innerHTML = '<div class="qc-line">No active trip — create one in Trip Wizard</div>';
      dashCard.style.display = 'block'; cardAir.style.display = 'none';
      dashAddr = ''; dashDock.style.display = 'none';
      return;
    }
    const nodes = buildNodes();
    if (!nodes.some(n => n.key === dashSelected)) dashSelected = firstStepKey(nodes);
    const selIdx = nodes.findIndex(n => n.key === dashSelected);
    const node = nodes[selIdx];
    dashTrack.innerHTML = '';
    nodes.forEach((n, idx) => {
      const div = document.createElement('div');
      let cls = 'node';
      if (n.optional) cls += ' optional';
      if (idx < selIdx) cls += ' done'; else if (idx === selIdx) cls += ' current';
      div.className = cls; div.dataset.key = n.key;
      div.innerHTML = '<div class="nd">' + n.icon + '</div><div class="nl">' + esc(n.label) + '</div>';
      div.addEventListener('click', () => { dashSelected = n.key; renderDash(); });
      dashTrack.appendChild(div);
    });
    const cur = dashTrack.querySelector('.node.current');
    if (cur) dashTrack.scrollLeft = cur.getBoundingClientRect().left - dashTrack.getBoundingClientRect().left + dashTrack.scrollLeft - (dashTrack.clientWidth - cur.offsetWidth) / 2;
    dashCard.innerHTML = dashCardHTML(node);
    wireDashInputs(node);
    const showAir = airborne && (node.type === 'flight' || node.type === 'returnFlight');
    dashCard.style.display = showAir ? 'none' : 'block';
    cardAir.style.display = showAir ? 'block' : 'none';
    dashAddr = (dashAddressFor(node) || '').trim();
    dashDock.style.display = dashAddr ? 'flex' : 'none';
  }
  document.getElementById('stateToggle').addEventListener('click', () => {
    airborne = !airborne;
    renderDash();
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
    const addr = dashAddr;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(addr);
      else { const ta = document.createElement('textarea'); ta.value = addr; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      const original = copyAddrBtn.innerHTML;
      copyAddrBtn.classList.add('copied');
      copyAddrBtn.innerHTML = '[ ✓ Copied ]<small>Paste into your GPS app</small>';
      setTimeout(() => { copyAddrBtn.classList.remove('copied'); copyAddrBtn.innerHTML = original; }, 1600);
    } catch (e) {}
  });

  /* ============ TRIPS: projects, pipeline, saving ============ */
  const TRIPS_KEY = 'crosswindTrips', ACTIVE_KEY = 'crosswindActiveTrip';
  const wizTitle = document.getElementById('wizTitle');
  const wizardEmpty = document.getElementById('wizardEmpty');
  const wizardBody = document.getElementById('wizardBody');
  const projModalTitle = document.getElementById('projModalTitle');
  const projNameInput = document.getElementById('projNameInput');
  const projDeleteBtn = document.getElementById('projDeleteBtn');
  let tripSnaps = {};
  let editingTripId = null;
  let pastOpen = false;

  function newItinerary() {
    return { uberOut: { pickup: '', dropoff: '', date: '' }, stops: [ newStop() ], returnFlights: [ newFlight() ], uberHome: { pickup: '', dropoff: '', date: '' } };
  }
  function newTripId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fromISODate(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
  }
  function activeTrip() { return trips.find(t => t.id === activeTripId) || null; }

  function isoOrBlank(v) { return (typeof v === 'string' && fromISODate(v)) ? v : ''; }
  function normalizeFlight(f) {
    const s = v => typeof v === 'string' ? cleanText(v) : '';
    f = (f && typeof f === 'object') ? f : {};
    return { airline: s(f.airline), flightNum: s(f.flightNum), conf: s(f.conf), seat: s(f.seat), date: isoOrBlank(f.date) };
  }
  function normalizeItinerary(raw) {
    if (!raw || typeof raw !== 'object') return newItinerary();
    const s = v => typeof v === 'string' ? cleanText(v) : '';
    const times = o => ({ pickup: s(o && o.pickup), dropoff: s(o && o.dropoff), date: isoOrBlank(o && o.date) });
    const out = { uberOut: times(raw.uberOut), uberHome: times(raw.uberHome), stops: [], returnFlights: [] };
    (Array.isArray(raw.stops) ? raw.stops : []).forEach(st => {
      if (!st || typeof st !== 'object') return;
      const d = st.destination || {}, r = st.rental || {}, h = st.hotel || {};
      const flights = (Array.isArray(st.flights) ? st.flights : []).map(normalizeFlight);
      out.stops.push({
        destination: { name: s(d.name), address: s(d.address), contact: s(d.contact), phone: parsePhone(s(d.phone)) },
        flights: flights.length ? flights : [ normalizeFlight() ],
        rental: { company: s(r.company), cls: s(r.cls) || 'Economy', color: s(r.color), plate: s(r.plate).toUpperCase(), pickup: isoOrBlank(r.pickup), ret: isoOrBlank(r.ret), conf: s(r.conf) },
        hotel: { chain: s(h.chain), brand: s(h.brand), name: s(h.name), address: s(h.address), room: s(h.room), checkIn: isoOrBlank(h.checkIn), checkOut: isoOrBlank(h.checkOut), conf: s(h.conf) }
      });
    });
    if (!out.stops.length) out.stops.push(newStop());
    out.returnFlights = (Array.isArray(raw.returnFlights) ? raw.returnFlights : []).map(normalizeFlight);
    if (!out.returnFlights.length) out.returnFlights.push(normalizeFlight());
    return out;
  }
  function normalizeTrip(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = typeof raw.name === 'string' ? cleanText(raw.name).trim() : '';
    const s = fromISODate(raw.start), e = fromISODate(raw.end);
    if (!name || !s || !e || e < s) return null;
    return {
      id: (typeof raw.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(raw.id)) ? raw.id : newTripId(),
      name, start: raw.start, end: raw.end,
      startsAtHome: raw.startsAtHome !== false, endsAtHome: raw.endsAtHome !== false,
      modified: (typeof raw.modified === 'string' && !isNaN(Date.parse(raw.modified))) ? raw.modified : '',
      itinerary: normalizeItinerary(raw.itinerary)
    };
  }
  function normalizeTripList(list) {
    const seen = {}, out = [];
    (Array.isArray(list) ? list : []).forEach(raw => {
      const t = normalizeTrip(raw);
      if (!t) return;
      if (seen[t.id]) t.id = newTripId();
      seen[t.id] = true; out.push(t);
    });
    return out;
  }

  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function tripStatus(t, now) {
    const today = dayStart(now || new Date()), s = fromISODate(t.start), e = fromISODate(t.end);
    if (today < s) return 'upcoming';
    if (today > e) return 'done';
    return 'active';
  }
  function tripProgress(t, now) {
    const st = tripStatus(t, now);
    if (st === 'upcoming') return 0;
    if (st === 'done') return 100;
    const today = dayStart(now || new Date()), s = fromISODate(t.start), e = fromISODate(t.end);
    const total = Math.round((e - s) / 864e5) + 1, elapsed = Math.round((today - s) / 864e5) + 1;
    return Math.max(0, Math.min(100, Math.round(elapsed / total * 100)));
  }
  function splitTrips() {
    const now = new Date();
    const byStart = (a, b) => fromISODate(a.start) - fromISODate(b.start);
    return {
      active: trips.filter(t => tripStatus(t, now) === 'active').sort(byStart),
      upcoming: trips.filter(t => tripStatus(t, now) === 'upcoming').sort(byStart),
      past: trips.filter(t => tripStatus(t, now) === 'done').sort((a, b) => fromISODate(b.end) - fromISODate(a.end))
    };
  }
  function defaultActiveId() { const g = splitTrips(); const l = g.active.concat(g.upcoming); return l.length ? l[0].id : ''; }

  function tripContent(t) { return JSON.stringify([t.name, t.start, t.end, t.startsAtHome, t.endsAtHome, t.itinerary]); }
  function saveTrips() { try { localStorage.setItem(TRIPS_KEY, JSON.stringify({ v: 1, trips })); } catch (e) {} }
  function saveActive() { try { localStorage.setItem(ACTIVE_KEY, activeTripId); } catch (e) {} }
  function commitTrips() {
    let changed = false;
    trips.forEach(t => {
      const c = tripContent(t);
      if (tripSnaps[t.id] !== c) {
        if (tripSnaps[t.id] !== undefined) t.modified = new Date().toISOString();
        tripSnaps[t.id] = c; changed = true;
      }
    });
    if (changed) saveTrips();
  }

  function loadItinerary() {
    const t = activeTrip(), it = t ? t.itinerary : newItinerary();
    wizardState.uberOut = it.uberOut; wizardState.stops = it.stops; wizardState.returnFlights = it.returnFlights; wizardState.uberHome = it.uberHome;
    wizardState.selected = '';
  }
  function renderWizardShell() {
    const t = activeTrip();
    wizTitle.textContent = t ? t.name + ' Itinerary Wizard' : 'Itinerary Wizard';
    wizardBody.style.display = t ? '' : 'none';
    wizardEmpty.style.display = t ? 'none' : 'block';
  }
  function fmtTripDates(t) { return fmtDate(fromISODate(t.start)) + ' – ' + fmtDate(fromISODate(t.end)); }
  function tripRow(t) {
    const st = tripStatus(t), row = document.createElement('div');
    row.className = 'proj-row' + (t.id === activeTripId ? ' selected' : '');
    row.dataset.id = t.id;
    row.innerHTML = '<div class="proj-dot"></div><div class="proj-name"><div class="nm"></div><div class="dt"></div></div><button class="proj-edit" title="Edit project">✎</button><div class="proj-bar' + (st === 'upcoming' ? ' amber' : '') + '"><i></i></div>';
    row.querySelector('.nm').textContent = t.name;
    row.querySelector('.dt').textContent = fmtTripDates(t);
    row.querySelector('.proj-bar i').style.width = tripProgress(t) + '%';
    row.addEventListener('click', () => setActiveTrip(t.id));
    row.querySelector('.proj-edit').addEventListener('click', (e) => { e.stopPropagation(); openProjectModal(t.id); });
    return row;
  }
  function renderPipeline() {
    pipelineList.innerHTML = '';
    if (!trips.length) { const e = document.createElement('div'); e.className = 'empty-row'; e.textContent = 'No trips yet — create one'; pipelineList.appendChild(e); return; }
    const g = splitTrips();
    g.active.concat(g.upcoming).forEach(t => pipelineList.appendChild(tripRow(t)));
    if (g.past.length) {
      const tg = document.createElement('div'); tg.className = 'past-toggle';
      tg.textContent = 'Past trips (' + g.past.length + ') ' + (pastOpen ? '▾' : '▸');
      tg.addEventListener('click', () => { pastOpen = !pastOpen; renderPipeline(); });
      pipelineList.appendChild(tg);
      if (pastOpen) g.past.forEach(t => pipelineList.appendChild(tripRow(t)));
    }
  }
  function refreshTripUI() { renderPipeline(); renderWizardShell(); renderNodeTrack(); renderStepForm(); }
  function setActiveTrip(id) { activeTripId = id; saveActive(); dashSelected = ''; loadItinerary(); refreshTripUI(); }
  function loadTrips() {
    let list = [], act = '';
    try { const raw = JSON.parse(localStorage.getItem(TRIPS_KEY)); if (raw && Array.isArray(raw.trips)) list = normalizeTripList(raw.trips); } catch (e) {}
    try { act = localStorage.getItem(ACTIVE_KEY) || ''; } catch (e) {}
    trips = list; tripSnaps = {};
    trips.forEach(t => { tripSnaps[t.id] = tripContent(t); });
    activeTripId = trips.some(t => t.id === act) ? act : defaultActiveId();
    dashSelected = ''; loadItinerary(); refreshTripUI();
  }

  /* ---- Create / Edit project popup ---- */
  function getYN(id) { return document.querySelector('#' + id + ' button.on').dataset.val === 'yes'; }
  function setYN(id, yes) { document.querySelectorAll('#' + id + ' button').forEach(b => b.classList.toggle('on', (b.dataset.val === 'yes') === yes)); }
  ['projStartsHome', 'projEndsHome'].forEach(id => {
    document.querySelectorAll('#' + id + ' button').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('#' + id + ' button').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }));
  });
  let projDeleteTimer = null;
  function disarmProjDelete() { clearTimeout(projDeleteTimer); projDeleteTimer = null; projDeleteBtn.textContent = 'Delete'; }
  function showProjNote(text) { projDateNote.textContent = text; projDateNote.style.display = 'block'; setTimeout(() => projDateNote.style.display = 'none', 3000); }
  function openProjectModal(id) {
    disarmProjDelete();
    editingTripId = id || null;
    const t = id ? trips.find(x => x.id === id) : null;
    projModalTitle.textContent = t ? 'Edit Project' : 'Create New Project';
    projNameInput.value = t ? t.name : '';
    projStartInput.value = t ? fmtDate(fromISODate(t.start)) : '';
    projEndInput.value = t ? fmtDate(fromISODate(t.end)) : '';
    setYN('projStartsHome', t ? t.startsAtHome : true); setYN('projEndsHome', t ? t.endsAtHome : true);
    projDateNote.style.display = 'none';
    projDeleteBtn.style.display = t ? 'inline-block' : 'none';
    projectModal.classList.add('open');
  }
  function closeProjectModal() { disarmProjDelete(); projectModal.classList.remove('open'); }
  document.getElementById('newProjectBtn').addEventListener('click', () => openProjectModal(null));
  document.getElementById('projCancelBtn').addEventListener('click', closeProjectModal);
  projectModal.addEventListener('click', (e) => { if (e.target === projectModal) closeProjectModal(); });
  document.getElementById('projSaveBtn').addEventListener('click', () => {
    const name = cleanText(projNameInput.value).trim();
    if (name && /^S\s*(\+\s*\d+)?$/i.test(projEndInput.value.trim()) && !parseSmartDate(projEndInput.value, new Date(), parseSmartDate(projStartInput.value, new Date()))) {
      showProjNote('Start date was never filled in — S+N needs a start date');
      projStartInput.focus(); return;
    }
    const s = parseSmartDate(projStartInput.value, new Date());
    const e = parseSmartDate(projEndInput.value, new Date(), s);
    const missing = [];
    if (!name) missing.push('Trip Name'); if (!s) missing.push('Start Date'); if (!e) missing.push('End Date');
    if (missing.length) { showProjNote('Missing: ' + missing.join(', ')); (!name ? projNameInput : !s ? projStartInput : projEndInput).focus(); return; }
    if (e < s) { showProjNote(projEndClearedMsg); return; }
    const startsAtHome = getYN('projStartsHome'), endsAtHome = getYN('projEndsHome');
    if (editingTripId) {
      const t = trips.find(x => x.id === editingTripId);
      t.name = name; t.start = toISODate(s); t.end = toISODate(e); t.startsAtHome = startsAtHome; t.endsAtHome = endsAtHome;
      commitTrips();
    } else {
      const t = { id: newTripId(), name, start: toISODate(s), end: toISODate(e), startsAtHome, endsAtHome, modified: new Date().toISOString(), itinerary: newItinerary() };
      trips.push(t); tripSnaps[t.id] = tripContent(t);
      activeTripId = t.id; saveActive(); saveTrips(); dashSelected = ''; loadItinerary();
    }
    closeProjectModal(); refreshTripUI();
  });
  projDeleteBtn.addEventListener('click', () => {
    if (!editingTripId) return;
    if (!projDeleteTimer) { projDeleteBtn.textContent = 'Tap again to delete'; projDeleteTimer = setTimeout(disarmProjDelete, 3000); return; }
    const id = editingTripId;
    trips = trips.filter(t => t.id !== id); delete tripSnaps[id];
    if (activeTripId === id) { activeTripId = defaultActiveId(); saveActive(); dashSelected = ''; loadItinerary(); }
    saveTrips(); closeProjectModal(); refreshTripUI();
  });

  /* Wizard and Dashboard edits write straight into the active trip; save whenever something really changed */
  ['input', 'change', 'focusout', 'click'].forEach(ev => {
    document.getElementById('stepFormContainer').addEventListener(ev, commitTrips);
    dashCard.addEventListener(ev, commitTrips);
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
    if (stored) favorites = normalizeFavorites(JSON.parse(stored));
  } catch(e) {}
  const favGrid = document.getElementById('favGrid');
  const favModal = document.getElementById('favModal');
  const favIconInput = document.getElementById('favIconInput');
  const favCaptionInput = document.getElementById('favCaptionInput');
  const favMessageInput = document.getElementById('favMessageInput');
  const favDeleteBtn = document.getElementById('favDeleteBtn');
  let favEditingIndex = null;
  favIconInput.addEventListener('input', () => keepOneIcon(favIconInput));

  function saveFavorites() { try { localStorage.setItem('crosswindFavorites', JSON.stringify(favorites)); } catch(e) {} touchProfile(); }

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
    const icon = lastIcon(favIconInput.value) || '⭐';
    const caption = favCaptionInput.value.trim();
    const message = favMessageInput.value.trim();
    if (!caption || !message) { (caption ? favMessageInput : favCaptionInput).focus(); return; }
    favorites[favEditingIndex] = { icon, caption, message };
    saveFavorites(); renderFavorites(); closeFavModal();
  });

  /* ============ BACKUP: export, restore points, import ============ */
  const RESTORE_KEY = 'crosswindRestorePoints';
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const backupNote = document.getElementById('backupNote');
  const importModal = document.getElementById('importModal');
  const restoreList = document.getElementById('restoreList');
  const importNote = document.getElementById('importNote');
  const importConfirmModal = document.getElementById('importConfirmModal');
  const restoreChecklist = document.getElementById('restoreChecklist');
  const importReplaceBtn = document.getElementById('importReplaceBtn');
  let pendingImport = null;
  let backupNoteTimer = null;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fileStamp(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()); }
  function fmtStamp(iso) {
    const d = new Date(iso);
    return isNaN(d) ? 'unknown date' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function shortDate(iso, withYear, withTime) {
    const d = new Date(iso);
    if (isNaN(d)) return 'unknown';
    const day = d.toLocaleDateString('en-US', withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
    return withTime ? day + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : day;
  }
  function normalizeFavorites(raw) {
    const out = [null, null, null];
    if (Array.isArray(raw)) {
      for (let i = 0; i < 3; i++) {
        const f = raw[i];
        if (f && typeof f === 'object' && typeof f.caption === 'string' && cleanText(f.caption).trim() && typeof f.message === 'string' && f.message.trim()) {
          out[i] = { icon: (typeof f.icon === 'string' && firstIcon(cleanText(f.icon))) ? firstIcon(cleanText(f.icon)) : '⭐', caption: cleanText(f.caption).trim(), message: f.message };
        }
      }
    }
    return out;
  }
  function buildBackup() {
    return { app: 'crosswind', version: 2, created: new Date().toISOString(), profile: snapshotProfile(), favorites: favorites.slice(),
      trips: JSON.parse(JSON.stringify(trips)), activeTrip: activeTripId };
  }
  function readRestorePoints() {
    try {
      const a = JSON.parse(localStorage.getItem(RESTORE_KEY));
      return Array.isArray(a) ? a.filter(x => x && typeof x.label === 'string' && x.profile && typeof x.profile === 'object') : [];
    } catch (e) { return []; }
  }
  function addRestorePoint(label, backup) {
    const pts = readRestorePoints();
    pts.unshift({ label, created: backup.created, profile: backup.profile, favorites: backup.favorites, trips: backup.trips || [], activeTrip: backup.activeTrip || '' });
    try { localStorage.setItem(RESTORE_KEY, JSON.stringify(pts.slice(0, 3))); } catch (e) {}
  }
  function summarize(profile, favs, tr) {
    const np = (profile.programs || []).length, nf = (favs || []).filter(Boolean).length, nt = (tr || []).length;
    return np + (np === 1 ? ' program' : ' programs') + ' · ' + nf + (nf === 1 ? ' favorite' : ' favorites') + ' · ' + nt + (nt === 1 ? ' trip' : ' trips');
  }
  function showBackupNote(text) {
    backupNote.textContent = text; backupNote.style.display = 'block';
    clearTimeout(backupNoteTimer); backupNoteTimer = setTimeout(() => { backupNote.style.display = 'none'; }, 4000);
  }
  function showImportNote(text) { importNote.textContent = text; importNote.style.display = 'block'; }
  function pendingFrom(name, created, rawProfile, rawFavorites, rawTrips) {
    return { name, created, profile: normalizeProfile(rawProfile), favorites: normalizeFavorites(rawFavorites), trips: normalizeTripList(rawTrips), rows: [] };
  }
  function renderRestoreList() {
    restoreList.innerHTML = '';
    const pts = readRestorePoints();
    if (!pts.length) { const e = document.createElement('div'); e.className = 'empty-row'; e.textContent = 'None yet'; restoreList.appendChild(e); return; }
    pts.forEach(pt => {
      const row = document.createElement('div'); row.className = 'restore-row';
      const info = document.createElement('div');
      const b = document.createElement('b'); b.textContent = pt.label;
      info.appendChild(b); info.appendChild(document.createTextNode(' — ' + fmtStamp(pt.created)));
      const sm = document.createElement('small'); sm.textContent = summarize(pt.profile, pt.favorites, pt.trips); info.appendChild(sm);
      const btn = document.createElement('button'); btn.className = 'btn ghost small'; btn.textContent = 'Restore';
      btn.addEventListener('click', () => askImport(pendingFrom(pt.label, pt.created, pt.profile, pt.favorites, pt.trips)));
      row.appendChild(info); row.appendChild(btn); restoreList.appendChild(row);
    });
  }
  /* Compare a backup item with the copy on the device: older backups start unticked with a warning */
  function compareItem(backupIso, currentIso, existsHere) {
    if (!existsHere) return { text: 'New', checked: true, warn: false };
    const b = Date.parse(backupIso), c = currentIso ? Date.parse(currentIso) : NaN;
    if (isNaN(b)) return { text: 'Backup date unknown', checked: false, warn: true };
    if (isNaN(c) || b >= c) return { text: 'Replaces your copy', checked: true, warn: false };
    const withYear = new Date(backupIso).getFullYear() !== new Date(currentIso).getFullYear();
    const sameDay = shortDate(backupIso, true) === shortDate(currentIso, true);
    return { text: 'Backup is older (' + shortDate(backupIso, withYear, sameDay) + ' vs. your current ' + shortDate(currentIso, withYear, sameDay) + ')', checked: false, warn: true };
  }
  function updateRestoreButton() { importReplaceBtn.disabled = !(pendingImport && pendingImport.rows.some(r => r.cb.checked)); }
  function addCheckRow(pending, kind, label, cmp, trip) {
    const row = document.createElement('label'); row.className = 'restore-row check';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = cmp.checked;
    cb.addEventListener('change', updateRestoreButton);
    const info = document.createElement('div');
    const b = document.createElement('b'); b.textContent = label;
    const sm = document.createElement('small'); sm.textContent = cmp.text; if (cmp.warn) sm.className = 'warn';
    info.appendChild(b); info.appendChild(sm);
    row.appendChild(cb); row.appendChild(info); restoreChecklist.appendChild(row);
    pending.rows.push({ kind, cb, trip });
  }
  function askImport(pending) {
    pendingImport = pending;
    document.getElementById('importConfirmName').textContent = pending.name;
    document.getElementById('importConfirmDate').textContent = fmtStamp(pending.created);
    restoreChecklist.innerHTML = '';
    addCheckRow(pending, 'setup', 'Setup & Favorites', compareItem(pending.profile.modified || pending.created, profileModified, true));
    pending.trips.forEach(t => {
      const cur = trips.find(x => x.id === t.id);
      addCheckRow(pending, 'trip', t.name, compareItem(t.modified || pending.created, cur ? cur.modified : '', !!cur), t);
    });
    updateRestoreButton();
    importModal.classList.remove('open');
    importConfirmModal.classList.add('open');
  }
  exportBtn.addEventListener('click', () => {
    const backup = buildBackup();
    const name = 'crosswind-backup-' + fileStamp(new Date(backup.created)) + '.json';
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addRestorePoint('Export', backup);
    showBackupNote('✓ Exported ' + name + ' — restore point saved');
  });
  importBtn.addEventListener('click', () => { importNote.style.display = 'none'; renderRestoreList(); importModal.classList.add('open'); });
  document.getElementById('importCancelBtn').addEventListener('click', () => importModal.classList.remove('open'));
  importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.classList.remove('open'); });
  document.getElementById('importChooseBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const f = importFile.files[0];
    if (!f) return;
    let obj = null;
    try { obj = JSON.parse(await f.text()); } catch (e) {}
    importFile.value = '';
    if (!obj || obj.app !== 'crosswind' || !obj.profile || typeof obj.profile !== 'object') { showImportNote("That file isn't a Crosswind backup."); return; }
    askImport(pendingFrom(f.name, obj.created, obj.profile, obj.favorites, obj.trips));
  });
  function closeImportConfirm() { pendingImport = null; importConfirmModal.classList.remove('open'); }
  document.getElementById('importConfirmCancel').addEventListener('click', closeImportConfirm);
  importConfirmModal.addEventListener('click', (e) => { if (e.target === importConfirmModal) closeImportConfirm(); });
  importReplaceBtn.addEventListener('click', () => {
    if (!pendingImport) return;
    const chosen = pendingImport.rows.filter(r => r.cb.checked);
    if (!chosen.length) return;
    addRestorePoint('Before import', buildBackup());
    const now = new Date().toISOString();
    let firstRestored = '';
    chosen.forEach(r => {
      if (r.kind === 'setup') {
        applyProfile(pendingImport.profile); profileModified = now; saveProfile();
        favorites = pendingImport.favorites; saveFavorites(); renderFavorites();
      } else {
        const t = r.trip; t.modified = now;
        const i = trips.findIndex(x => x.id === t.id);
        if (i >= 0) trips[i] = t; else trips.push(t);
        tripSnaps[t.id] = tripContent(t);
        if (!firstRestored) firstRestored = t.id;
      }
    });
    if (!trips.some(t => t.id === activeTripId)) activeTripId = firstRestored || defaultActiveId();
    saveActive(); saveTrips(); dashSelected = ''; loadItinerary(); refreshTripUI();
    closeImportConfirm();
    showBackupNote('✓ Backup restored');
  });

  applyProfile(loadProfile());
  loadTrips();
  updateLastUsed();
  renderFavorites();
  renderAll();
})();
