(function(){
  'use strict';

  /* ============ SCREEN NAV ============ */
  const screens = document.querySelectorAll('.screen');
  const navBtns = document.querySelectorAll('#devNav button');
  let rttOn = false, rttKey = '';
  function showScreen(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === id));
    window.scrollTo(0, 0);
    if (id === 'screenWizard') refreshWizardSpacer();
    if (id !== 'screenDash') { stopAir(); stopDrive(); rttOn = false; }
    if (id === 'screenSetup') updateOfflineStatus();
    if (id === 'screenDash') { renderDash(); refreshHomeDist(); }
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
  /* A 🕐 button beside a time field opens the phone's own time picker; the pick is written back in the field's format */
  function timeFieldHTML(id, placeholder, value, after) {
    return '<div style="display:flex; gap:6px; align-items:center;"><input type="text" id="' + id + '" placeholder="' + placeholder + '" value="' + esc(value) + '"><button class="suggest-btn" id="' + id + '-clk" style="margin-top:0;" aria-label="Pick a time">🕐</button></div>' +
      '<input type="time" class="time-pick" id="' + id + '-tp" tabindex="-1" aria-hidden="true">' + (after || '');
  }
  function wireTimePicker(input) {
    const btn = document.getElementById(input.id + '-clk'), tp = document.getElementById(input.id + '-tp');
    if (!btn || !tp) return;
    btn.addEventListener('click', () => {
      const p = parseSmartTime(input.value, new Date());
      tp.value = p ? String(p.getHours()).padStart(2, '0') + ':' + String(p.getMinutes()).padStart(2, '0') : '';
      try { if (tp.showPicker) tp.showPicker(); else { tp.focus(); tp.click(); } } catch (e) { tp.focus(); }
    });
    tp.addEventListener('change', () => {
      if (!tp.value) return;
      const hm = tp.value.split(':'), d = new Date(); d.setHours(+hm[0], +hm[1], 0, 0);
      input.value = fmtTime(d);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      tp.blur();
    });
    tp.addEventListener('cancel', () => tp.blur());
  }
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
  let homeLat = null, homeLon = null; /* the home address, looked up once (driving compass) */
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
  function cleanText(t) { return String(t); }
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
    return { v: 1, address: '', addrLat: null, addrLon: null, homeAirport: '', programs: [], touchless: {}, ktn: '', ktnExp: '',
      units: { speed: 'mph', temp: 'f', dist: 'mi' }, stepDefaults: {}, modified: '' };
  }
  function normalizeProfile(raw) {
    const p = emptyProfile();
    if (!raw || typeof raw !== 'object') return p;
    const str = v => typeof v === 'string' ? v : '';
    p.address = str(raw.address); p.homeAirport = str(raw.homeAirport);
    p.addrLat = coordOrNull(raw.addrLat, 90); p.addrLon = coordOrNull(raw.addrLon, 180);
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
    return { v: 1, address: addrInput.value, addrLat: homeLat, addrLon: homeLon, homeAirport: homeAirportInput.value,
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
    addrInput.value = p.address; homeAirportInput.value = p.homeAirport; homeLat = p.addrLat; homeLon = p.addrLon;
    ktnInput.value = p.ktn; ktnExpInput.value = p.ktnExp;
    programs = p.programs; touchless = p.touchless; stepCustom = p.stepDefaults;
    unitGroups.forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.val === p.units[g.dataset.unitGroup])));
    stepSystem.forEach(r => { const c = stepCustom[r.sys] || { name: '', icon: '' }; defaultsInputs[r.sys].name.value = c.name; defaultsInputs[r.sys].icon.value = c.icon; });
    updateKtn();
    profileModified = p.modified || ''; lastProfileSnap = JSON.stringify(profileContent());
    renderLoyaltyList(); renderTsaAirlines(); renderNodeTrack(); renderStepForm();
  }
  addrInput.addEventListener('input', () => { homeLat = homeLon = null; setLocNote(document.getElementById('addrLoc'), addrInput.value.trim() ? 'pending' : ''); saveProfile(); });
  addrInput.addEventListener('blur', () => locatePlace(homePlace()));
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
  /* An airport code from what is typed or stored ("MCO", "mco", "MCO - Orlando FL"); anything else gives '' */
  function airportCode(text) { const m = String(text || '').trim().match(/^([A-Za-z]{3})(?:\s*[-–]|$)/); return m ? m[1].toUpperCase() : ''; }
  function airportByCode(code) { return airportData.find(a => a.code === code) || null; }
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
        row.innerHTML = '<span class="lname">' + esc(p.name) + '</span>';
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
      row.innerHTML = '<span class="dot"></span>' + esc(a.name);
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
      rows.forEach(p => { const tr = document.createElement('tr'); tr.innerHTML = '<td class="pname">' + esc(p.name) + '</td><td>' + esc(p.id || '—') + '</td>'; tbody.appendChild(tr); });
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
  function newFlight() { return { airline: '', flightNum: '', conf: '', seat: '', date: '', from: '', to: '', dep: '', arr: '', arrDay: 0 }; }
  function newStop() {
    return {
      destination: { name: '', address: '', contact: '', phone: '', lat: null, lon: null },
      flights: [ newFlight() ],
      rental: { company: '', cls: 'Economy', color: '', plate: '', pickup: '', ret: '', conf: '', pickupTime: '', retTime: '' },
      hotel: { chain: '', brand: '', name: '', address: '', room: '', checkIn: '', checkOut: '', conf: '', lat: null, lon: null }
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

  /* Step completion, worked out from the saved fields (never stored). Layover and Rental Return fill when the steps on both sides are complete. */
  function itineraryProgress(it, startsHome, endsHome) {
    const has = v => typeof v === 'string' && v.trim() !== '';
    const flightOk = f => has(f.airline) && has(f.flightNum);
    const done = {}; let counted = 0, complete = 0;
    const own = (key, ok) => { done[key] = !!ok; counted++; if (ok) complete++; };
    if (startsHome) { done['home'] = true; own('uber-out', has(it.uberOut.pickup)); }
    const firstOfStop = i => it.stops[i] && it.stops[i].flights.length ? 'stop' + i + '-flight-0' : null;
    it.stops.forEach((stop, si) => {
      stop.flights.forEach((f, fi) => own('stop' + si + '-flight-' + fi, flightOk(f)));
      stop.flights.forEach((f, fi) => { if (fi < stop.flights.length - 1) done['stop' + si + '-layover-' + fi] = done['stop' + si + '-flight-' + fi] && done['stop' + si + '-flight-' + (fi + 1)]; });
      own('stop' + si + '-rental', has(stop.rental.company)); own('stop' + si + '-hotel', has(stop.hotel.name)); own('stop' + si + '-destination', has(stop.destination.name));
    });
    if (endsHome) {
      it.returnFlights.forEach((f, fi) => own('return-flight-' + fi, flightOk(f)));
      it.returnFlights.forEach((f, fi) => { if (fi < it.returnFlights.length - 1) done['return-layover-' + fi] = done['return-flight-' + fi] && done['return-flight-' + (fi + 1)]; });
      own('uber-home', has(it.uberHome.pickup));
    }
    it.stops.forEach((stop, si) => {
      const next = si < it.stops.length - 1 ? firstOfStop(si + 1) : (endsHome && it.returnFlights.length ? 'return-flight-0' : null);
      done['stop' + si + '-rentalreturn'] = done['stop' + si + '-destination'] && (next ? done[next] : true);
    });
    const all = counted > 0 && complete === counted;
    const everything = Object.keys(done).every(k => done[k]);
    if (endsHome) done['home-end'] = everything && all;
    return { done, counted, complete, all };
  }
  function tripProgressInfo(t) { return itineraryProgress(t.itinerary, t.startsAtHome, t.endsAtHome); }

  function firstStepKey(nodes) { return (nodes[0].type === 'home' && nodes[1]) ? nodes[1].key : nodes[0].key; }
  function ensureWizardSelection() {
    const nodes = buildNodes();
    if (!nodes.some(n => n.key === wizardState.selected)) wizardState.selected = firstStepKey(nodes);
  }
  const nodeTrack = document.getElementById('nodeTrack');
  function renderNodeTrack(center) {
    const keepLeft = nodeTrack.scrollLeft;
    ensureWizardSelection();
    const nodes = buildNodes();
    const selIdx = nodes.findIndex(n => n.key === wizardState.selected);
    const tr = activeTrip(), prog = itineraryProgress(wizardState, !tr || tr.startsAtHome, !tr || tr.endsAtHome);
    nodeTrack.innerHTML = '';
    nodes.forEach((n, idx) => {
      const div = document.createElement('div');
      let cls = 'node';
      if (n.optional) cls += ' optional';
      if (prog.done[n.key]) cls += ' done';
      if (idx === selIdx) cls += ' current';
      div.className = cls; div.dataset.key = n.key;
      div.innerHTML = '<div class="nd">' + esc(n.icon) + '</div><div class="nl">' + esc(n.label) + '</div>';
      div.addEventListener('click', () => { wizardState.selected = n.key; renderNodeTrack(); renderStepForm(); });
      nodeTrack.appendChild(div);
    });
    /* centre the selected step when the app changed the selection (add, move, remove, open a trip); a tap leaves the row where it is */
    const cur = nodeTrack.querySelector('.node.current');
    if (center && cur) nodeTrack.scrollLeft += (cur.getBoundingClientRect().left + cur.offsetWidth / 2) - (nodeTrack.getBoundingClientRect().left + nodeTrack.clientWidth / 2);
    else nodeTrack.scrollLeft = keepLeft;
    refreshWizardProgress();
  }
  /* Live step completion: node fills, the counter under the row, and the active trip's bar in the list (no re-draw, so the form keeps focus) */
  function setBuildBar(bar, info) {
    const pct = info.counted ? Math.round(info.complete / info.counted * 100) : 0;
    bar.classList.toggle('amber', pct < 100); bar.classList.toggle('green', pct === 100);
    bar.querySelector('i').style.width = pct + '%';
  }
  function refreshWizardProgress() {
    const tr = activeTrip();
    if (!tr) return;
    const prog = itineraryProgress(wizardState, tr.startsAtHome, tr.endsAtHome);
    const els = Array.from(nodeTrack.querySelectorAll('.node'));
    els.forEach(n => n.classList.toggle('done', !!prog.done[n.dataset.key]));
    /* a line is drawn between two complete steps (the current step included) */
    els.forEach((n, i) => n.classList.toggle('linked', i > 0 && !!prog.done[els[i - 1].dataset.key] && !!prog.done[n.dataset.key]));
    const counter = document.getElementById('wizProgress');
    if (counter) { counter.classList.toggle('complete', prog.all); counter.textContent = prog.all ? 'Itinerary complete' : prog.complete + ' of ' + prog.counted + ' steps complete'; }
    const bar = document.querySelector('#pipelineList .proj-row.selected .proj-bar');
    if (bar) setBuildBar(bar, prog);
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
  /* From / To airport of every flight: what was typed, else a default (shown, not stored): the first outbound flight leaves the Home Airport only when the trip starts at home, each later flight leaves where the one before landed, and the last return flight lands at the Home Airport only when the trip ends at home */
  function effAirports() {
    const trip = activeTrip(), out = {};
    if (!trip) return out;
    const home = airportCode(homeAirportInput.value);
    const seq = [];
    wizardState.stops.forEach((st, si) => st.flights.forEach((f, fi) => seq.push({ key: 'f:' + si + ':' + fi, f, last: false })));
    wizardState.returnFlights.forEach((f, fi) => seq.push({ key: 'rf:' + fi + ':0', f, last: fi === wizardState.returnFlights.length - 1 }));
    let prevTo = trip.startsAtHome ? home : '';
    seq.forEach(x => {
      const from = x.f.from || prevTo, to = x.f.to || ((x.last && trip.endsAtHome) ? home : '');
      out[x.key] = { from, to }; prevTo = to;
    });
    return out;
  }
  /* The airport the rental car is picked up at: where the last flight before the Rental step lands */
  function rentalAirportCode(si) {
    const fl = wizardState.stops[si] && wizardState.stops[si].flights;
    if (!fl || !fl.length) return '';
    const e = effAirports()['f:' + si + ':' + (fl.length - 1)];
    return e ? e.to : '';
  }
  /* Layover: the next flight's departure minus the previous flight's arrival (both local to the layover airport) */
  function layoverInfo(isReturn, si, i) {
    const list = isReturn ? wizardState.returnFlights : wizardState.stops[si].flights, a = list[i], b = list[i + 1];
    const eff = effDates(), ap = effAirports(), ka = isReturn ? 'rf:' + i + ':0' : 'f:' + si + ':' + i, kb = isReturn ? 'rf:' + (i + 1) + ':0' : 'f:' + si + ':' + (i + 1);
    const airport = (ap[ka] && ap[ka].to) || (ap[kb] && ap[kb].from) || '';
    const arrT = parseSmartTime(a.arr, new Date()), depT = parseSmartTime(b.dep, new Date()), da = eff[ka], db = eff[kb];
    if (!arrT || !depT || !da || !db) return { state: 'missing', airport };
    const arrAt = new Date(da.getFullYear(), da.getMonth(), da.getDate() + (a.arrDay ? 1 : 0), arrT.getHours(), arrT.getMinutes());
    const depAt = new Date(db.getFullYear(), db.getMonth(), db.getDate(), depT.getHours(), depT.getMinutes());
    const mins = Math.round((depAt - arrAt) / 60000);
    if (mins < 0) return { state: 'bad', airport };
    return { state: 'ok', mins, airport, short: mins < 45 };
  }
  function fmtLayover(m) { const h = Math.floor(m / 60), r = m % 60; return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm'; }
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
    /* a flight dated earlier than the flight before it (outbound by stop, then return) is flagged red */
    const order = [];
    wizardState.stops.forEach((stop, si) => stop.flights.forEach((fl, fi) => order.push('f:' + si + ':' + fi)));
    wizardState.returnFlights.forEach((fl, fi) => order.push('rf:' + fi + ':0'));
    const orderNote = document.getElementById('wf-order-note');
    stepDateFields.forEach(f => {
      const i = order.indexOf(f.key), el = document.getElementById(f.id);
      const bad = i > 0 && eff[f.key] && eff[order[i - 1]] && eff[f.key] < eff[order[i - 1]];
      if (el) el.classList.toggle('val-bad', !!bad);
      if (orderNote && i >= 0) orderNote.style.display = bad ? 'block' : 'none';
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
    if (label === 'Flight' || label === 'Rental' || label === 'Hotel' || label === 'Uber') return '<button class="parser-btn" data-parser="' + label.toLowerCase() + '">Text Clipboard Parser<small>Reads what you copied</small></button>';
    return '<button class="parser-btn" disabled title="Coming soon">Text Clipboard Parser<small>Coming soon</small></button>';
  }

  /* Move earlier / later within the flight's own group; none at the ends or with a single flight */
  function moveButtonsHTML(index, count) {
    if (count < 2) return '';
    return '<div class="move-row">' +
      (index > 0 ? '<button class="add-flight-btn" id="wf-move-earlier">◀ Move earlier</button>' : '') +
      (index < count - 1 ? '<button class="add-flight-btn" id="wf-move-later">Move later ▶</button>' : '') + '</div>';
  }
  function moveFlight(list, index, delta, keyFor) {
    const j = index + delta;
    if (j < 0 || j >= list.length) return;
    const t = list[index]; list[index] = list[j]; list[j] = t;
    wizardState.selected = keyFor(j);
    renderNodeTrack(true); renderStepForm(); commitTrips();
  }
  function layoverStripHTML(info) {
    if (info.state === 'ok') return '<div class="layover-strip' + (info.short ? ' short' : '') + '">🧳 Layover' + (info.airport ? ' at <b>' + esc(info.airport) + '</b>' : '') + ': <b>' + fmtLayover(info.mins) + '</b>' + (info.short ? ' — <b class="amb">Short layover</b>' : '') + '</div>';
    if (info.state === 'bad') return '<div class="layover-strip short">🧳 <b class="amb">Check the times:</b> the next flight leaves before this one lands</div>';
    return '<div class="layover-strip">🧳 Add both flights\' times to see the layover</div>';
  }
  function flightFormHTML(f, dateKey) {
    const airlineOpts = selectOptionsHTML(sortedByType('airline').map(a => a.name), f.airline, 'No airlines yet — add in Setup');
    return '<div class="fld-grid">' +
      '<div>' + dateFieldHTML('wf-date', 'Date', dateKey) + '</div>' +
      '<div><label class="fld">Airline</label><select id="wf-flight-airline">' + airlineOpts + '</select></div>' +
      '</div>' +
      '<div class="fld-grid">' +
      '<div><label class="fld">From</label><input type="text" id="wf-from" placeholder="MCO" autocomplete="off"></div>' +
      '<div><label class="fld">To</label><input type="text" id="wf-to" placeholder="SFO" autocomplete="off"></div>' +
      '</div>' +
      '<div class="suggest-list" id="wf-from-suggest" style="display:none;"></div><div class="suggest-list" id="wf-to-suggest" style="display:none;"></div>' +
      '<div class="fld-grid">' +
      '<div><label class="fld">Departure Time</label>' + timeFieldHTML('wf-dep', 'e.g. 8:35 AM', f.dep) + '</div>' +
      '<div><label class="fld">Arrival Time</label>' + timeFieldHTML('wf-arr', 'e.g. 9:45 AM', f.arr) + '<label class="chk-line"><input type="checkbox" id="wf-arr-next"' + (f.arrDay ? ' checked' : '') + '> +1 day</label></div>' +
      '</div>' +
      '<div class="fld-note val-note" id="wf-order-note" style="display:none;">Earlier than the flight before it</div>' +
      '<div class="flight-row3">' +
      '<div class="fnum"><label class="fld">Flight #</label><input type="text" id="wf-flight-num" placeholder="402" maxlength="6" value="' + esc(f.flightNum) + '"></div>' +
      '<div class="fconf"><label class="fld">Confirmation #</label><input type="text" id="wf-flight-conf" placeholder="NZ82X1" maxlength="8" value="' + esc(f.conf) + '"></div>' +
      '<div class="fseat"><label class="fld">Seat #</label><input type="text" id="wf-flight-seat" placeholder="4C" maxlength="3" value="' + esc(f.seat) + '"></div>' +
      '</div>' +
      '<div class="fld-note val-note" id="wf-conf-note" style="display:none;">Confirmation is usually 6 letters/numbers</div>' +
      '<div class="fld-note" id="wf-copy-note" style="display:none;"></div>' +
      '<div class="autofill-box"><div class="af-label">Auto-Filled via Flight Tracker API</div><div class="fld-grid">' +
      '<div><label class="fld">Gate</label><input type="text" value="—" disabled></div></div></div>';
  }

  function stepFormHTML(node) {
    let html = '';

    if (node.type === 'home') {
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div><div class="home-note">This is your saved Home Base from Setup. Edit it there if it needs to change.</div>';
    }

    else if (node.type === 'uberOut') {
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        dateFieldHTML('wf-date', 'Date', 'uberOut') +
        '<div class="fld-grid">' +
        '<div><label class="fld">Pickup Time</label>' + timeFieldHTML('wf-uber-pickup', 'e.g. 4:30 PM', wizardState.uberOut.pickup) + '</div>' +
        '<div><label class="fld">Drop-off Time <span class="fld-opt">(optional)</span></label>' + timeFieldHTML('wf-uber-dropoff', 'e.g. 5:10 PM', wizardState.uberOut.dropoff) + '</div>' +
        '</div>' + parserButtonHTML('Uber');
    }

    else if (node.type === 'flight') {
      const f = wizardState.stops[node.stopIndex].flights[node.flightIndex];
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        flightFormHTML(f, 'f:' + node.stopIndex + ':' + node.flightIndex) + parserButtonHTML('Flight') +
        '<button class="add-flight-btn" id="wf-add-flight">+ Add Flight After This One</button>' +
        moveButtonsHTML(node.flightIndex, wizardState.stops[node.stopIndex].flights.length) +
        (wizardState.stops[node.stopIndex].flights.length > 1 ? '<button class="add-flight-btn remove-btn" id="wf-remove-flight">Remove this flight</button>' : '');
    }

    else if (node.type === 'layover') {
      const i = node.betweenIndex;
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        layoverStripHTML(layoverInfo(!!node.isReturn, node.stopIndex, i));
    }

    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental, si = node.stopIndex;
      const compOpts = selectOptionsHTML(sortedByType('rental').map(c => c.name), r.company, 'No rental programs yet');
      const classes = ['Economy','Compact','Intermediate/Midsize','Standard','Full-Size','Premium','Luxury','SUV (Compact)','SUV (Standard/Full-Size)','Minivan'];
      const classOpts = classes.map(c => '<option' + (c === r.cls ? ' selected' : '') + '>' + c + '</option>').join('');
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' + pickupAirportNote(si) + '<div class="fld-grid">' +
        '<div><label class="fld">Company</label><select id="wf-rental-company">' + compOpts + '</select></div>' +
        '<div><label class="fld">Class</label><select id="wf-rental-class">' + classOpts + '</select></div>' +
        '<div>' + dateFieldHTML('wf-rental-pick', 'Pickup Date', 'rPick:' + si + ':0') + '</div>' +
        '<div>' + dateFieldHTML('wf-rental-ret', 'Return Date', 'rRet:' + si + ':0') + '</div>' +
        '<div><label class="fld">Pickup Time</label>' + timeFieldHTML('wf-rental-picktime', 'e.g. 2:00 PM', r.pickupTime) + '</div>' +
        '<div><label class="fld">Return Time</label>' + timeFieldHTML('wf-rental-rettime', 'e.g. 6:00 PM', r.retTime) + '</div>' +
        '<div><label class="fld">Confirmation # <span class="fld-opt">(optional)</span></label><input type="text" id="wf-rental-conf" placeholder="—" value="' + esc(r.conf) + '"></div><div></div>' +
        '<div><label class="fld">Color <span class="fld-opt">(at pickup)</span></label><input type="text" id="wf-rental-color" placeholder="—" value="' + esc(r.color) + '"></div>' +
        '<div><label class="fld">License Plate <span class="fld-opt">(at pickup)</span></label><input type="text" id="wf-rental-plate" placeholder="—" value="' + esc(r.plate) + '"></div>' +
        '</div>' + parserButtonHTML('Rental');
    }

    else if (node.type === 'hotel') {
      const h = wizardState.stops[node.stopIndex].hotel, si = node.stopIndex;
      const chainOpts = hotelChainOptionsHTML(sortedByType('hotel').map(c => c.name), h.chain);
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div><div class="fld-grid">' +
        '<div><label class="fld">Chain</label><select id="wf-hotel-chain">' + chainOpts + '</select></div>' +
        '<div><label class="fld">Brand</label><input type="text" id="wf-hotel-brand" placeholder="e.g. Courtyard" autocomplete="off" value="' + esc(h.brand) + '"></div>' +
        '</div>' +
        '<div class="suggest-list" id="wf-brand-suggest" style="display:none;"></div>' +
        '<label class="fld">Hotel Name</label><input type="text" id="wf-hotel-name" autocapitalize="words" placeholder="e.g. Lambeau Field Hilton" value="' + esc(h.name) + '">' +
        '<label class="fld">Address</label><input type="text" id="wf-hotel-address" placeholder="—" value="' + esc(h.address) + '"><div class="fld-note" id="wf-hotel-loc"></div>' +
        '<button class="suggest-btn" id="wf-hotel-suggest" disabled title="Needs online lookup — coming soon">📍 Suggest Address</button>' +
        '<div class="fld-note">Needs online lookup — coming soon</div>' +
        '<div class="fld-grid">' +
        '<div>' + dateFieldHTML('wf-hotel-in', 'Check-in Date', 'hIn:' + si + ':0') + '</div>' +
        '<div>' + dateFieldHTML('wf-hotel-out', 'Check-out Date', 'hOut:' + si + ':0') + '</div>' +
        '<div><label class="fld">Room # <span class="fld-opt">(at check-in)</span></label><input type="text" id="wf-hotel-room" placeholder="—" value="' + esc(h.room) + '"></div>' +
        '<div><label class="fld">Confirmation # <span class="fld-opt">(optional)</span></label><input type="text" id="wf-hotel-conf" placeholder="—" value="' + esc(h.conf) + '"></div>' +
        '</div>' + parserButtonHTML('Hotel');
    }

    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        '<label class="fld">Place Name</label><input type="text" id="wf-dest-name" autocapitalize="words" placeholder="e.g. Hollywood Health Center" value="' + esc(d.name) + '">' +
        '<label class="fld">Address</label><input type="text" id="wf-dest-address" placeholder="—" value="' + esc(d.address) + '"><div class="fld-note" id="wf-dest-loc"></div>' +
        '<button class="suggest-btn" id="wf-dest-suggest" disabled title="Needs online lookup — coming soon">📍 Suggest Address</button>' +
        '<div class="fld-note">Needs online lookup — coming soon</div>' +
        '<div class="fld-grid"><div><label class="fld">Contact Name</label><input type="text" id="wf-dest-contact" autocapitalize="words" value="' + esc(d.contact) + '"></div><div><label class="fld">Contact Phone</label><input type="text" id="wf-dest-phone" value="' + esc(formatPhone(d.phone)) + '"></div></div>' +
        parserButtonHTML('Destination');
    }

    else if (node.type === 'rentalReturn') {
      const r = wizardState.stops[node.stopIndex].rental;
      const isLastStop = node.stopIndex === wizardState.stops.length - 1;
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        '<div class="return-ref">Returning: ' + esc(r.company || '—') + ' — ' + esc(r.cls) +
        (rentalAirportCode(node.stopIndex) ? '<div class="rr-sub">Return to airport: <b>' + esc(rentalAirportCode(node.stopIndex)) + '</b></div>' : '') +
        '<div class="rr-sub">Return date: ' + (effDateText('rRet:' + node.stopIndex + ':0') || '—') + '</div>' +
        '<div class="rr-sub">No time needed — inferred from the next flight\'s boarding time.</div></div>' +
        (isLastStop ? '<button class="add-flight-btn" id="wf-add-stop">+ Add Another Stop</button>' : '') +
        (wizardState.stops.length > 1 ? '<button class="add-flight-btn remove-btn" id="wf-remove-stop">Remove this stop</button>' : '');
    }

    else if (node.type === 'returnFlight') {
      const f = wizardState.returnFlights[node.flightIndex];
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        flightFormHTML(f, 'rf:' + node.flightIndex + ':0') + parserButtonHTML('Flight') +
        '<button class="add-flight-btn" id="wf-add-return-flight">+ Add Flight After This One</button>' +
        moveButtonsHTML(node.flightIndex, wizardState.returnFlights.length) +
        (wizardState.returnFlights.length > 1 ? '<button class="add-flight-btn remove-btn" id="wf-remove-flight">Remove this flight</button>' : '');
    }

    else if (node.type === 'uberHome') {
      html = '<div class="step-head">' + esc(node.label.toUpperCase()) + '</div>' +
        dateFieldHTML('wf-date', 'Date', 'uberHome') +
        '<div class="fld-grid">' +
        '<div><label class="fld">Pickup Time</label>' + timeFieldHTML('wf-uberhome-pickup', 'e.g. 6:15 PM', wizardState.uberHome.pickup, '<div class="fld-note">(usually set live at baggage claim)</div>') + '</div>' +
        '<div><label class="fld">Drop-off Time <span class="fld-opt">(optional)</span></label>' + timeFieldHTML('wf-uberhome-dropoff', 'e.g. 6:50 PM', wizardState.uberHome.dropoff) + '</div>' +
        '</div>' + parserButtonHTML('Uber');
    }

    return html;
  }

  /* Every step gets the same total page height (tallest step + a quarter screen), so the step row stays put as the user taps through steps of different heights */
  let tallestWindow = 0; /* the window is shorter while the keyboard is open; use the tallest seen */
  function refreshWizardSpacer() {
    const nodes = buildNodes();
    const node = nodes.find(n => n.key === wizardState.selected);
    if (node) equalizeStepHeight(nodes, node);
  }
  function equalizeStepHeight(nodes, node) {
    const spacer = document.getElementById('wizSpacer');
    if (!spacer || !stepFormContainer.getBoundingClientRect().width) return;
    const saveFields = stepDateFields;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute; left:-9999px; top:0; visibility:hidden; width:' + stepFormContainer.getBoundingClientRect().width + 'px;';
    stepFormContainer.parentNode.appendChild(probe);
    let tallest = 0;
    nodes.forEach(n => { stepDateFields = []; probe.innerHTML = stepFormHTML(n); tallest = Math.max(tallest, probe.getBoundingClientRect().height); });
    probe.remove();
    stepDateFields = saveFields;
    const current = stepFormContainer.getBoundingClientRect().height;
    tallestWindow = Math.max(tallestWindow, window.innerHeight);
    spacer.style.height = Math.round(Math.max(0, tallest - current) + tallestWindow * 0.25) + 'px';
  }

  function renderStepForm() {
    ensureWizardSelection();
    stepDateFields = [];
    const nodes = buildNodes();
    const node = nodes.find(n => n.key === wizardState.selected);
    if (!node) return;
    stepFormContainer.innerHTML = stepFormHTML(node);
    wireStepFormInputs(node);
    const parserBtn = stepFormContainer.querySelector('.parser-btn[data-parser]'); if (parserBtn) parserBtn.addEventListener('click', () => startClipParser(node));
    wireDateFields();
    equalizeStepHeight(nodes, node);
  }

  /* From / To airport fields of the flight on screen: autocomplete, stored as a code when left, defaults shown until typed */
  function pickupAirportNote(si) { const c = rentalAirportCode(si); return c ? '<div class="fld-note" id="wf-pickup-airport">Pickup airport: <b>' + esc(c) + '</b></div>' : ''; }
  /* Departure / Arrival time of the flight on screen, with the phone time picker; "+1 day" for an overnight arrival */
  function wireFlightTimes(f) {
    const dep = document.getElementById('wf-dep'), arr = document.getElementById('wf-arr'), nx = document.getElementById('wf-arr-next');
    dep.addEventListener('input', () => { f.dep = dep.value; }); arr.addEventListener('input', () => { f.arr = arr.value; });
    wireSmartTimeInput(dep); wireSmartTimeInput(arr); wireTimePicker(dep); wireTimePicker(arr);
    dep.addEventListener('blur', () => { f.dep = dep.value; }); arr.addEventListener('blur', () => { f.arr = arr.value; });
    nx.addEventListener('change', () => { f.arrDay = nx.checked ? 1 : 0; });
  }
  function wireFlightAirports(f, key) {
    const fromEl = document.getElementById('wf-from'), toEl = document.getElementById('wf-to');
    const show = () => {
      const e = effAirports()[key] || { from: '', to: '' };
      if (document.activeElement !== fromEl) fromEl.value = f.from || e.from;
      if (document.activeElement !== toEl) toEl.value = f.to || e.to;
    };
    [[fromEl, 'from', 'wf-from-suggest'], [toEl, 'to', 'wf-to-suggest']].forEach(([el, prop, listId]) => {
      let dirty = false;
      el.addEventListener('input', () => { dirty = true; });
      attachSuggest(el, document.getElementById(listId), { find: findAirports, onPick: a => { el.value = a.code; f[prop] = a.code; dirty = false; show(); } });
      el.addEventListener('blur', () => { if (dirty) { dirty = false; f[prop] = airportCode(el.value); } show(); });
    });
    show();
  }
  function wireStepFormInputs(node) {
    if (node.type === 'uberOut') {
      const pu = document.getElementById('wf-uber-pickup'), doff = document.getElementById('wf-uber-dropoff');
      pu.addEventListener('input', e => wizardState.uberOut.pickup = e.target.value);
      doff.addEventListener('input', e => wizardState.uberOut.dropoff = e.target.value);
      wireSmartTimeInput(pu); wireSmartTimeInput(doff); wireTimePicker(pu); wireTimePicker(doff);
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
      wireFlightAirports(f, 'f:' + node.stopIndex + ':' + node.flightIndex);
      wireFlightTimes(f);
      const addBtn = document.getElementById('wf-add-flight');
      if (addBtn) addBtn.addEventListener('click', () => {
        const flights = wizardState.stops[node.stopIndex].flights;
        flights.splice(node.flightIndex + 1, 0, newFlight());
        wizardState.selected = 'stop' + node.stopIndex + '-flight-' + (node.flightIndex + 1);
        renderNodeTrack(true); renderStepForm(); commitTrips();
      });
      const mvE = document.getElementById('wf-move-earlier'), mvL = document.getElementById('wf-move-later'), fl = wizardState.stops[node.stopIndex].flights, fkey = j => 'stop' + node.stopIndex + '-flight-' + j;
      if (mvE) mvE.addEventListener('click', () => moveFlight(fl, node.flightIndex, -1, fkey));
      if (mvL) mvL.addEventListener('click', () => moveFlight(fl, node.flightIndex, 1, fkey));
      const rmBtn = document.getElementById('wf-remove-flight');
      if (rmBtn) twoTap(rmBtn, 'Tap again to remove', () => {
        wizardState.stops[node.stopIndex].flights.splice(node.flightIndex, 1);
        wizardState.selected = 'stop' + node.stopIndex + '-flight-' + Math.max(0, node.flightIndex - 1);
        renderNodeTrack(true); renderStepForm(); commitTrips();
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
      const pt = document.getElementById('wf-rental-picktime'), rt = document.getElementById('wf-rental-rettime');
      pt.addEventListener('input', () => { r.pickupTime = pt.value; }); rt.addEventListener('input', () => { r.retTime = rt.value; });
      wireSmartTimeInput(pt); wireSmartTimeInput(rt); wireTimePicker(pt); wireTimePicker(rt);
      pt.addEventListener('blur', () => { r.pickupTime = pt.value; }); rt.addEventListener('blur', () => { r.retTime = rt.value; });
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
      document.getElementById('wf-hotel-address').addEventListener('input', e => { h.address = e.target.value; h.lat = h.lon = null; setLocNote(document.getElementById('wf-hotel-loc'), h.address.trim() ? 'pending' : ''); });
      document.getElementById('wf-hotel-address').addEventListener('blur', () => locatePlace(hotelPlace(h)));
      setLocNote(document.getElementById('wf-hotel-loc'), !h.address.trim() ? '' : (h.lat != null ? 'ok' : 'pending'));
      document.getElementById('wf-hotel-room').addEventListener('input', e => h.room = e.target.value);
      upperInput(document.getElementById('wf-hotel-conf'), v => h.conf = v);
    }
    else if (node.type === 'destination') {
      const d = wizardState.stops[node.stopIndex].destination;
      document.getElementById('wf-dest-name').addEventListener('input', e => { d.name = e.target.value; renderNodeTrack(); });
      document.getElementById('wf-dest-address').addEventListener('input', e => { d.address = e.target.value; d.lat = d.lon = null; setLocNote(document.getElementById('wf-dest-loc'), d.address.trim() ? 'pending' : ''); });
      document.getElementById('wf-dest-address').addEventListener('blur', () => locatePlace(destPlace(d)));
      setLocNote(document.getElementById('wf-dest-loc'), !d.address.trim() ? '' : (d.lat != null ? 'ok' : 'pending'));
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
        renderNodeTrack(true); renderStepForm();
      });
      const rmStop = document.getElementById('wf-remove-stop');
      if (rmStop) twoTap(rmStop, 'Tap again to remove', () => {
        wizardState.stops.splice(node.stopIndex, 1);
        wizardState.selected = node.stopIndex > 0 ? 'stop' + (node.stopIndex - 1) + '-rentalreturn' : 'stop0-flight-0';
        dashSelected = '';
        renderNodeTrack(true); renderStepForm(); commitTrips();
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
      wireFlightAirports(f, 'rf:' + node.flightIndex + ':0');
      wireFlightTimes(f);
      const addBtn = document.getElementById('wf-add-return-flight');
      if (addBtn) addBtn.addEventListener('click', () => {
        wizardState.returnFlights.splice(node.flightIndex + 1, 0, newFlight());
        wizardState.selected = 'return-flight-' + (node.flightIndex + 1);
        renderNodeTrack(true); renderStepForm(); commitTrips();
      });
      const mvE = document.getElementById('wf-move-earlier'), mvL = document.getElementById('wf-move-later'), rfl = wizardState.returnFlights, rkey = j => 'return-flight-' + j;
      if (mvE) mvE.addEventListener('click', () => moveFlight(rfl, node.flightIndex, -1, rkey));
      if (mvL) mvL.addEventListener('click', () => moveFlight(rfl, node.flightIndex, 1, rkey));
      const rmBtn = document.getElementById('wf-remove-flight');
      if (rmBtn) twoTap(rmBtn, 'Tap again to remove', () => {
        wizardState.returnFlights.splice(node.flightIndex, 1);
        wizardState.selected = 'return-flight-' + Math.max(0, node.flightIndex - 1);
        renderNodeTrack(true); renderStepForm(); commitTrips();
      });
    }
    else if (node.type === 'uberHome') {
      const pu = document.getElementById('wf-uberhome-pickup'), doff = document.getElementById('wf-uberhome-dropoff');
      pu.addEventListener('input', e => wizardState.uberHome.pickup = e.target.value);
      doff.addEventListener('input', e => wizardState.uberHome.dropoff = e.target.value);
      wireSmartTimeInput(pu); wireSmartTimeInput(doff); wireTimePicker(pu); wireTimePicker(doff);
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
  const cardGround = document.getElementById('cardGround');
  let dashSelected = 'uber-out';
  const GROUND_RTT_TYPES = ['uberOut', 'rental', 'hotel', 'destination', 'rentalReturn', 'uberHome', 'home', 'layover'];
  const COPY_ADDR_TYPES = ['hotel', 'destination', 'home', 'uberHome'];
  let dashAddr = '';
  /* ---- Distance to Home (Dashboard header): one GPS reading when the Dashboard opens, when the step viewed changes, and when the number is tapped ---- */
  let homeDistM = null, homeDistState = '', homeDistBusy = false;
  const HOME_DIST_REASON = { nohome: 'no home address', notlocated: 'home not located', denied: 'location off', nogps: 'no GPS signal' };
  function fmtHomeDist(m) {
    if (currentUnits().dist === 'km') return m < 100 ? Math.round(m) + ' M' : (m < 100000 ? (m / 1000).toFixed(1) : Math.round(m / 1000).toLocaleString('en-US')) + ' KM';
    const mi = m / 1609.344;
    return mi < 0.1 ? Math.round(m * 3.28084) + ' FT' : (mi < 100 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-US')) + ' MI';
  }
  function renderHomeDist() {
    const el = document.getElementById('homeDistVal'); if (!el) return;
    el.textContent = homeDistState === 'busy' ? '…' : homeDistState === 'ok' && homeDistM != null ? fmtHomeDist(homeDistM) : (HOME_DIST_REASON[homeDistState] || '—');
  }
  function setHomeDist(state) { homeDistState = state; renderHomeDist(); }
  function refreshHomeDist() {
    if (homeDistBusy) return;
    if (!addrInput.value.trim()) { setHomeDist('nohome'); return; }
    if (homeLat == null || homeLon == null) { setHomeDist('notlocated'); return; }
    if (!navigator.geolocation) { setHomeDist('nogps'); return; }
    homeDistBusy = true; setHomeDist('busy');
    navigator.geolocation.getCurrentPosition(pos => { homeDistBusy = false; homeDistM = distanceM(pos.coords.latitude, pos.coords.longitude, homeLat, homeLon); setHomeDist('ok'); },
      err => { homeDistBusy = false; setHomeDist(err && err.code === 1 ? 'denied' : 'nogps'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }
  document.getElementById('homeDistBtn').addEventListener('click', refreshHomeDist);
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
      const ap = effAirports()[dateKey] || { from: '', to: '' };
      html += '<div class="qc-route"><span class="apt">' + esc(ap.from || '—') + '</span><span class="arr">⟶</span><span class="apt">' + esc(ap.to || '—') + '</span></div>' +
        line('DATE: <b>' + dv(effDateText(dateKey)) + '</b>') +
        line('FLIGHT: <b>' + dv(fl) + '</b> | SEAT: <b>' + dv(f.seat) + '</b>') +
        line('CONFIRMATION: <b>' + dv(f.conf) + '</b> | GATE: <b>—</b>') +
        line('BOARDING: <b>' + dv(f.dep) + '</b> | LANDING: <b>' + dv(f.arr ? f.arr + (f.arrDay ? ' (+1)' : '') : '') + '</b>') +
        line('TSA PRECHECK: <span class="wt">' + dv(document.getElementById('ktnInput').value) + '</span>');
    }
    else if (node.type === 'layover') {
      const lo = layoverInfo(!!node.isReturn, node.stopIndex, node.betweenIndex);
      html += line(lo.state === 'ok' ? 'LAYOVER' + (lo.airport ? ' AT <b>' + esc(lo.airport) + '</b>' : '') + ': <b>' + fmtLayover(lo.mins) + '</b>' + (lo.short ? ' <b style="color:var(--red)">(SHORT)</b>' : '') : lo.state === 'bad' ? '<b style="color:var(--red)">CHECK THE TIMES</b>' : 'LAYOVER: <b>—</b>');
    }
    else if (node.type === 'rental') {
      const r = wizardState.stops[node.stopIndex].rental;
      html += line('COMPANY: <b>' + dv(r.company) + '</b> | CLASS: <b>' + dv(r.cls) + '</b>') +
        line('PICKUP: <b>' + dv([effDateText('rPick:' + node.stopIndex + ':0'), r.pickupTime].filter(Boolean).join(' ')) + '</b> | RETURN: <b>' + dv([effDateText('rRet:' + node.stopIndex + ':0'), r.retTime].filter(Boolean).join(' ')) + '</b>') +
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
    const dashBar = document.getElementById('dashBar');
    dashBar.style.display = at ? '' : 'none';
    if (at) dashBar.querySelector('i').style.width = tripProgress(at) + '%';
    if (!at) {
      dashTrack.innerHTML = '';
      dashCard.innerHTML = '<div class="qc-line">No active trip — create one in Trip Wizard</div>';
      dashCard.style.display = 'block'; cardAir.style.display = 'none';
      dashAddr = ''; dashDock.style.display = 'none'; stopAir(); stopDrive(); cardGround.style.display = 'none';
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
      if (idx < selIdx) cls += ' done passed'; else if (idx === selIdx) cls += ' current';
      div.className = cls; div.dataset.key = n.key;
      div.innerHTML = '<div class="nd">' + esc(n.icon) + '</div><div class="nl">' + esc(n.label) + '</div>';
      div.addEventListener('click', () => { const changed = n.key !== dashSelected; if (changed) rttOn = false; dashSelected = n.key; renderDash(); if (changed) refreshHomeDist(); });
      dashTrack.appendChild(div);
    });
    const cur = dashTrack.querySelector('.node.current');
    if (cur) dashTrack.scrollLeft = cur.getBoundingClientRect().left - dashTrack.getBoundingClientRect().left + dashTrack.scrollLeft - (dashTrack.clientWidth - cur.offsetWidth) / 2;
    dashCard.innerHTML = dashCardHTML(node);
    wireDashInputs(node);
    const isFlight = node.type === 'flight' || node.type === 'returnFlight';
    dashAddr = (dashAddressFor(node) || '').trim();
    dashCompass = isFlight ? null : dashCompassTarget(node);
    rttMode = isFlight ? 'air' : (GROUND_RTT_TYPES.indexOf(node.type) >= 0 ? 'ground' : '');
    const on = rttOn && rttKey === node.key, showAir = on && rttMode === 'air', showGround = on && rttMode === 'ground' && !!dashCompass;
    dashCard.style.display = (showAir || showGround) ? 'none' : 'block';
    cardAir.style.display = showAir ? 'block' : 'none';
    cardGround.style.display = showGround ? 'block' : 'none';
    if (showAir) { airNode = node; airJourney = journeyInfo(node); startAir(); } else { airNode = null; airJourney = null; stopAir(); }
    if (showGround) startDrive(dashCompass); else stopDrive();
    const copyShown = COPY_ADDR_TYPES.indexOf(node.type) >= 0;
    copyAddrBtn.style.display = copyShown ? '' : 'none';
    copyAddrBtn.disabled = !dashAddr;
    copyAddrBtn.innerHTML = '[ Copy Address ]<small>' + (dashAddr ? 'Paste into your GPS app' : (node.type === 'home' || node.type === 'uberHome' ? 'Add home address in Setup' : 'Add an address')) + '</small>';
    rttBtn.style.display = rttMode ? '' : 'none';
    rttBtn.disabled = rttMode === 'ground' && !dashCompass;
    rttBtn.innerHTML = rttMode === 'air' ? (showAir ? '📋 Flight Details<small>Back to the flight card</small>' : '✈ Airborne RTT<small>Live GPS speed and heading</small>') : (showGround ? '📋 Step Details<small>Back to the step card</small>' : '🧭 Ground RTT<small>' + (dashCompass ? 'Works offline' : dashRttReason(node)) + '</small>');
    dashDock.style.display = (copyShown || rttMode) ? 'flex' : 'none';
  }
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
  function coordOrNull(v, max) { return (typeof v === 'number' && isFinite(v) && Math.abs(v) <= max) ? v : null; }
  function normalizeFlight(f) {
    const s = v => typeof v === 'string' ? cleanText(v) : '';
    f = (f && typeof f === 'object') ? f : {};
    return { airline: s(f.airline), flightNum: s(f.flightNum), conf: s(f.conf), seat: s(f.seat), date: isoOrBlank(f.date), from: airportCode(s(f.from)), to: airportCode(s(f.to)), dep: s(f.dep), arr: s(f.arr), arrDay: f.arrDay === 1 ? 1 : 0 };
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
        destination: { name: s(d.name), address: s(d.address), contact: s(d.contact), phone: parsePhone(s(d.phone)), lat: coordOrNull(d.lat, 90), lon: coordOrNull(d.lon, 180) },
        flights: flights.length ? flights : [ normalizeFlight() ],
        rental: { company: s(r.company), cls: s(r.cls) || 'Economy', color: s(r.color), plate: s(r.plate).toUpperCase(), pickup: isoOrBlank(r.pickup), ret: isoOrBlank(r.ret), conf: s(r.conf), pickupTime: s(r.pickupTime), retTime: s(r.retTime) },
        hotel: { chain: s(h.chain), brand: s(h.brand), name: s(h.name), address: s(h.address), room: s(h.room), checkIn: isoOrBlank(h.checkIn), checkOut: isoOrBlank(h.checkOut), conf: s(h.conf), lat: coordOrNull(h.lat, 90), lon: coordOrNull(h.lon, 180) }
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
      agencyRef: typeof raw.agencyRef === 'string' ? cleanText(raw.agencyRef).slice(0, 12) : '',
      colorIdx: (Number.isInteger(raw.colorIdx) && raw.colorIdx >= 0 && raw.colorIdx < 12) ? raw.colorIdx : null,
      itinerary: normalizeItinerary(raw.itinerary)
    };
  }
  /* A trip's calendar colour (0 to 11) is set once, when it is created, from a counter that only moves forward */
  let nextColor = 0;
  function giveColor(t) { if (t.colorIdx == null) { t.colorIdx = nextColor % 12; nextColor++; } }
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
  function saveTrips() { try { localStorage.setItem(TRIPS_KEY, JSON.stringify({ v: 1, trips, nextColor })); } catch (e) {} }
  function saveActive() { try { localStorage.setItem(ACTIVE_KEY, activeTripId); } catch (e) {} }
  function commitTrips(e) {
    if (!e || e.type !== 'input') refreshWizardProgress(); /* progress updates when a field is left, not on every keystroke */
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
    const row = document.createElement('div');
    row.className = 'proj-row' + (t.id === activeTripId ? ' selected' : '');
    row.dataset.id = t.id;
    row.innerHTML = '<div class="proj-dot"></div><div class="proj-name"><div class="nm"></div><div class="dt"></div></div><button class="proj-edit" title="Edit project">✎</button><div class="proj-bar"><i></i></div>';
    row.querySelector('.nm').textContent = t.name;
    row.querySelector('.dt').textContent = fmtTripDates(t);
    setBuildBar(row.querySelector('.proj-bar'), tripProgressInfo(t));
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
  /* ============ AIRBORNE PANEL: airspeed tape + heading compass, live from GPS (one ping every 3 seconds) ============ */
  /* ---- GPS noise filter: movement only counts when several samples in a row agree ---- */
  const MPH_MS = 0.44704, FLOOR_MS = 0.894 /* 2 mph */, FLOOR_WALK_MS = 0.3126 /* 0.7 mph */, FAST_MS = 4.4704 /* 10 mph */;
  function newMotion() { return { buf: [], moving: false, fails: 0, lastSpd: null, lastHdg: null }; }
  function angDiff(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }
  /* Two samples agree when both are above the speed floor, their headings are within 30 degrees, their speeds within max(1 mph, 25%),
     and the ground really covered between them fits that speed and points the way the heading says (jitter in place does not). */
  function motionPairAgree(a, b, floor) {
    if (a.spd == null || b.spd == null || a.hdg == null || b.hdg == null || a.spd < floor || b.spd < floor) return false;
    if (angDiff(a.hdg, b.hdg) > 30 || Math.abs(a.spd - b.spd) > Math.max(MPH_MS, 0.25 * Math.max(a.spd, b.spd))) return false;
    const dt = (b.t - a.t) / 1000, covered = distanceM(a.lat, a.lon, b.lat, b.lon), expect = (a.spd + b.spd) / 2 * dt;
    if ((expect >= 6 && covered < 0.5 * expect) || covered > 2 * expect + 3) return false; /* slow walking covers too little ground to judge the low end against GPS noise */
    if (covered >= 3 && angDiff(bearingDeg(a.lat, a.lon, b.lat, b.lon), b.hdg) > 45) return false;
    return true;
  }
  /* is there a run of n agreeing samples ending at buf[end]? (one sample may be skipped between two members, so a single wild fix does not break a run) */
  function motionChain(buf, end, n, floor) {
    if (n <= 1) return true;
    for (let j = end - 1; j >= 0 && j >= end - 2; j--) if (motionPairAgree(buf[j], buf[end], floor) && motionChain(buf, j, n - 1, floor)) return true;
    return false;
  }
  /* c = the device's coords, fix = { lat, lon, t }, o = { floor, bypassMs }. Returns { moving, speed (m/s), heading (deg or null) }.
     Not moving = stationary: the caller shows speed 0 and holds the heading. bypassMs: at or above this speed a sample counts at once (the plane in flight).
     Needs 3 agreeing samples below 10 mph and 2 from 10 mph up (4 when the device gives no speed, because jitter then looks like speed); once moving, 2 failed samples in a row stop it. */
  function gpsMotion(m, c, fix, o) {
    let prev = m.buf.length ? m.buf[m.buf.length - 1] : null;
    if (prev && (fix.t <= prev.t || (fix.t - prev.t) / 1000 > 8)) { m.buf = []; m.moving = false; m.fails = 0; prev = null; }
    let spd = (typeof c.speed === 'number' && isFinite(c.speed)) ? c.speed : null, hdg = (typeof c.heading === 'number' && isFinite(c.heading)) ? c.heading : null;
    if (prev) {
      const dt = (fix.t - prev.t) / 1000, d = distanceM(prev.lat, prev.lon, fix.lat, fix.lon);
      if (spd == null) spd = d / dt;
      if (hdg == null && d >= 1) hdg = bearingDeg(prev.lat, prev.lon, fix.lat, fix.lon);
    }
    const s = { lat: fix.lat, lon: fix.lon, t: fix.t, spd, hdg }, derived = !(typeof c.speed === 'number' && isFinite(c.speed)); /* derived: the device gave no speed, so it comes from position jumps */
    m.buf.push(s); if (m.buf.length > 7) m.buf.shift();
    let agree = false;
    if (o.bypassMs != null && spd != null && spd >= o.bypassMs) agree = true;
    else agree = motionChain(m.buf, m.buf.length - 1, derived ? 4 : ((spd != null && spd >= FAST_MS) ? 2 : 3), o.floor);
    if (agree) { m.moving = true; m.fails = 0; m.lastSpd = spd; if (hdg != null) m.lastHdg = hdg; }
    else if (m.moving) { m.fails++; if (m.fails >= 2) { m.moving = false; m.fails = 0; } }
    return { moving: m.moving, speed: m.lastSpd, heading: m.lastHdg };
  }
  const KT_PER_MS = 1.943844;
  let airTimer = null, airStatusTimer = null, airFix = null, airMotion = newMotion(), airKnots = null, airHdg = null, airDenied = false, airBuilt = false;
  function dialMarkup() {
    let d = '<circle r="90"/>';
    for (let a = 0; a < 360; a += 5) { const maj = a % 10 === 0; d += '<line class="' + (maj ? 'mj' : '') + '" x1="0" y1="-90" x2="0" y2="' + (maj ? -78 : -84) + '" transform="rotate(' + a + ')"/>'; }
    for (let a = 0; a < 360; a += 30) {
      const card = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[a];
      d += '<text class="' + (card ? 'card' : '') + '" transform="rotate(' + a + ') translate(0,-62)">' + (card || (a / 10)) + '</text>';
    }
    return d;
  }
  /* ---- Itinerary clock: US time zones by airport state, so a flight's local departure and landing times become real moments ---- */
  const STATE_ZONE = {};
  'CT DE DC GA MA MD ME NC NH NJ NY OH PA RI SC VA VT WV MI IN FL KY'.split(' ').forEach(s => { STATE_ZONE[s] = [-5, true]; });
  'AL AR IL IA LA MN MS MO OK WI KS NE ND SD TX TN'.split(' ').forEach(s => { STATE_ZONE[s] = [-6, true]; });
  'CO MT NM UT WY ID'.split(' ').forEach(s => { STATE_ZONE[s] = [-7, true]; });
  'CA OR WA NV'.split(' ').forEach(s => { STATE_ZONE[s] = [-8, true]; });
  STATE_ZONE.AZ = [-7, false]; STATE_ZONE.AK = [-9, true]; STATE_ZONE.HI = [-10, false];
  const CODE_ZONE = { PNS: [-6, true], VPS: [-6, true], ECP: [-6, true], PAH: [-6, true], OWB: [-6, true], BWG: [-6, true], EVV: [-6, true], GYY: [-6, true], IMT: [-6, true], IWD: [-6, true],
    TYS: [-5, true], TRI: [-5, true], CHA: [-5, true], ELP: [-7, true], DIK: [-7, true], RAP: [-7, true], BFF: [-7, true], GLD: [-7, true], ENV: [-7, true], LWS: [-8, true], COE: [-8, true], ADK: [-10, true] };
  function airportZone(code) { const ap = airportByCode(code); return ap ? (CODE_ZONE[code] || STATE_ZONE[ap.state] || null) : null; }
  function nthSunday(y, month, n) { const first = (7 - new Date(Date.UTC(y, month, 1)).getUTCDay()) % 7; return 1 + first + 7 * (n - 1); }
  /* the real moment (ms) of a wall-clock time at an airport; without a zone the phone's own zone is used */
  function wallToMs(y, mo, d, h, mi, zone) {
    if (!zone) return new Date(y, mo, d, h, mi).getTime();
    const wall = Date.UTC(y, mo, d, h, mi);
    let off = zone[0];
    if (zone[1]) { const yy = new Date(wall).getUTCFullYear(); if (wall >= Date.UTC(yy, 2, nthSunday(yy, 2, 2), 2) && wall < Date.UTC(yy, 10, nthSunday(yy, 10, 1), 2)) off += 1; }
    return wall - off * 3600000;
  }
  /* the journey that contains the viewed flight: that stop's flights, or the return flights; first departure to final landing */
  function journeyInfo(node) {
    const isRet = node.type === 'returnFlight', list = isRet ? wizardState.returnFlights : wizardState.stops[node.stopIndex].flights;
    const eff = effDates(), ap = effAirports(), legs = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i], key = isRet ? 'rf:' + i + ':0' : 'f:' + node.stopIndex + ':' + i, d = eff[key];
      const depT = parseSmartTime(f.dep, new Date()), arrT = parseSmartTime(f.arr, new Date());
      if (!d || !depT || !arrT) return { ok: false };
      const from = (ap[key] && ap[key].from) || '', to = (ap[key] && ap[key].to) || '';
      let zf = airportZone(from), zt = airportZone(to); if (!zf) zf = zt; if (!zt) zt = zf;
      const depAt = wallToMs(d.getFullYear(), d.getMonth(), d.getDate(), depT.getHours(), depT.getMinutes(), zf);
      const arrAt = wallToMs(d.getFullYear(), d.getMonth(), d.getDate() + (f.arrDay ? 1 : 0), arrT.getHours(), arrT.getMinutes(), zt);
      const a1 = airportByCode(from), a2 = airportByCode(to);
      legs.push({ from, to, depAt, arrAt, len: a1 && a2 ? distanceM(a1.lat, a1.lon, a2.lat, a2.lon) : null, toAp: a2 });
    }
    if (!legs.length || legs.some(l => l.arrAt <= l.depAt)) return { ok: false };
    return { ok: true, key: (isRet ? 'R' : 'S' + node.stopIndex) + ':' + legs.map(l => l.depAt).join(','), legs, first: legs[0].depAt, last: legs[legs.length - 1].arrAt, finalCode: legs[legs.length - 1].to };
  }
  function fmtHM(ms, up) { const m = up ? Math.ceil(ms / 60000) : Math.floor(ms / 60000), h = Math.floor(m / 60); return h ? h + 'h ' + (m % 60) + 'm' : m + 'm'; } /* up: round a countdown up, so it reads 1m until it is gone */
  let airNode = null, airJourney = null, airShift = null, airAvgMs = null, airAvgAt = null;
  /* Flight Log, ETA, and Distance to Target: from the itinerary (flights on time); GPS at cruise speed corrects the ETA by a shift */
  function renderAirTrip() {
    const g = id => document.getElementById(id), J = airJourney, now = Date.now();
    const put = (log, etaLab, eta, etaSub, distLab, dist, distSub) => { g('airLog').textContent = log; g('airEtaLab').textContent = etaLab; g('airEta').textContent = eta; g('airEtaSub').textContent = etaSub; g('airDistLab').textContent = distLab; g('airDist').textContent = dist; g('airDistSub').textContent = distSub; };
    if (!J || !J.ok) { put('—', 'ETA', '—', J ? 'add flight times' : '', 'Distance to Target', '—', J ? 'add flight times' : ''); return; }
    const legs = J.legs, code = J.finalCode, airIdx = legs.findIndex(l => now >= l.depAt && now < l.arrAt);
    let lastDone = -1; legs.forEach((l, i) => { if (now >= l.arrAt) lastDone = i; });
    const fixAge = airFix ? now - airFix.at : Infinity;
    const cruise = airAvgMs != null && airAvgMs >= 67.056 /* 150 mph */ && airMotion.moving && fixAge < 120000 && airIdx >= 0 && !!legs[airIdx].toAp;
    let dGps = null;
    if (cruise) {
      const L = legs[airIdx]; dGps = distanceM(airFix.lat, airFix.lon, L.toAp.lat, L.toAp.lon);
      let shift = airFix.at + dGps / airAvgMs * 1000 - L.arrAt; if (airIdx < legs.length - 1) shift = Math.max(0, shift);
      airShift = { key: J.key, leg: airIdx, ms: shift };
    }
    const cur = airIdx >= 0 ? airIdx : lastDone, hasShift = !!(airShift && airShift.key === J.key && airShift.leg === cur), sh = hasShift ? airShift.ms : 0;
    /* Flight Log: counts up from the first departure and stops at the final landing */
    const log = now < J.first ? '—' : fmtHM(Math.min(now, J.last) - J.first);
    /* ETA: time remaining to the final landing */
    const rem = J.last + sh - now, eta = now < J.first ? '—' : rem <= 0 ? 'landed' : rem < 60000 ? '<1m' : fmtHM(rem, true);
    const etaSub = hasShift ? (Math.abs(sh) < 60000 ? 'on schedule' : 'GPS: ' + fmtHM(Math.abs(sh)) + (sh > 0 ? ' late' : ' early')) : '';
    /* Distance to Target: what is left of the journey to the final airport */
    let dist = '—', distSub = 'airport not in list';
    if (!legs.some(l => l.len == null)) {
      let left = 0; legs.forEach(l => { if (now >= l.arrAt) return; left += now <= l.depAt ? l.len : l.len * (1 - (now - l.depAt) / (l.arrAt - l.depAt)); });
      distSub = 'by schedule';
      if (dGps != null) { left = dGps; for (let j = airIdx + 1; j < legs.length; j++) left += legs[j].len; distSub = fixAge < 60000 ? 'GPS just now' : 'GPS ' + Math.round(fixAge / 60000) + ' min ago'; }
      dist = fmtHomeDist(left);
    }
    put(log, code ? 'ETA ' + code : 'ETA', eta, etaSub, code ? 'Distance to ' + code : 'Distance to Target', dist, distSub);
  }

  /* the airborne speed tape looks like the Ground RTT's: 40 knots in view, its real height read from the page */
  let airTapeKey = '';
  function airTapeH() { return document.getElementById('airTape').clientHeight || 150; }
  function buildAirTape() {
    const H = airTapeH(); if (airTapeKey === String(H)) return; airTapeKey = String(H);
    const k = H / 40, strip = document.getElementById('airStrip'); let html = '';
    for (let v = 900; v >= 0; v -= 5) {
      const y = Math.round((900 - v) * k * 100) / 100;
      if (v % 10 === 0) html += '<div class="tk" style="top:' + y + 'px"></div><div class="tl" style="top:' + y + 'px">' + v + '</div>'; else html += '<div class="tk5" style="top:' + y + 'px"></div>';
    }
    strip.innerHTML = html; strip.style.height = Math.round(900 * k) + 'px';
  }
  function buildAir() {
    if (airBuilt) return; airBuilt = true;
    document.getElementById('airDial').innerHTML = dialMarkup();
  }
  function airStatusNow() {
    if (airDenied || !airFix) return 'red';
    const age = (Date.now() - airFix.at) / 1000;
    return age <= 3.5 ? 'green' : age <= 9 ? 'yellow' : 'red';
  }
  function renderAir() {
    buildAir(); buildAirTape();
    const st = airStatusNow(), live = st !== 'red' && airKnots != null;
    const box = document.getElementById('airStatus'); box.querySelector('i').className = 'air-dot ' + st; box.querySelector('span').textContent = st === 'green' ? 'GPS LOCK' : st === 'yellow' ? 'GPS STALE' : 'NO GPS';
    const kt = live ? Math.round(airKnots) : null;
    document.getElementById('airPtr').textContent = live ? kt : '—';
    document.getElementById('airKph').textContent = live ? Math.round(airKnots * 1.852) + ' km/h' : '— km/h';
    document.getElementById('airMph').textContent = live ? Math.round(airKnots * 1.150779) + ' mph' : '— mph';
    const v = Math.max(0, Math.min(900, live ? airKnots : 0));
    const H = airTapeH();
    document.getElementById('airStrip').style.transform = 'translateY(' + (H / 2 - (900 - v) * (H / 40)) + 'px)';
    const hdg = (st !== 'red' && airHdg != null) ? airHdg : null;
    document.getElementById('airHdg').textContent = hdg == null ? '---' : String(Math.round(hdg) % 360 === 0 ? 360 : Math.round(hdg) % 360).padStart(3, '0');
    document.getElementById('airDial').setAttribute('transform', 'rotate(' + (hdg == null ? 0 : -hdg) + ')');
    const c = document.getElementById('cardAir'); c.dataset.status = st; c.dataset.knots = live ? kt : ''; c.dataset.heading = hdg == null ? '' : Math.round(hdg) % 360;
    renderAirTrip();
  }
  function onAirPos(pos) {
    const c = pos.coords, t = pos.timestamp || Date.now(), fix = { lat: c.latitude, lon: c.longitude, t, at: Date.now() };
    const r = gpsMotion(airMotion, c, fix, { floor: FLOOR_MS, bypassMs: FAST_MS });
    if (r.moving && r.speed != null) {
      const kn = r.speed * KT_PER_MS; airKnots = (airKnots == null || airKnots < 0.5 || r.speed < 0.3) ? kn : 0.5 * airKnots + 0.5 * kn; if (r.heading != null) airHdg = r.heading;
      const a = airAvgAt ? 1 - Math.exp(-(fix.at - airAvgAt) / 300000) : 1; airAvgMs = airAvgMs == null ? r.speed : airAvgMs + a * (r.speed - airAvgMs); airAvgAt = fix.at; /* ground speed averaged over about 5 minutes, for the ETA */
    } else { airKnots = 0; airAvgMs = null; airAvgAt = null; } /* not confirmed as moving: reads 0 and the heading is held */
    airFix = fix; airDenied = false;
    const m = document.getElementById('airMsg'); m.style.display = 'none';
    renderAir();
  }
  /* Airborne full screen (same look and rules as the Ground RTT: tap the card, X to close; true full screen when allowed, else it fills the window) */
  let airTrueFs = false;
  function airRerender() { requestAnimationFrame(() => { buildAirTape(); renderAir(); }); }
  function openAirFull() {
    cardAir.classList.add('ground-full');
    try { const p = cardAir.requestFullscreen && cardAir.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    airRerender();
  }
  function closeAirFull() {
    if (!cardAir.classList.contains('ground-full')) return;
    cardAir.classList.remove('ground-full'); airTrueFs = false;
    try { if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    airRerender();
  }
  cardAir.addEventListener('click', e => { if (e.target.closest('#airFullX')) return; if (!cardAir.classList.contains('ground-full')) openAirFull(); });
  document.getElementById('airFullX').addEventListener('click', e => { e.stopPropagation(); closeAirFull(); });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === cardAir) airTrueFs = true;
    else if (airTrueFs) { airTrueFs = false; cardAir.classList.remove('ground-full'); airRerender(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAirFull(); });
  window.addEventListener('resize', () => { if (cardAir.style.display !== 'none') airRerender(); });
  function onAirErr(e) {
    if (e && e.code === 1) { airDenied = true; const m = document.getElementById('airMsg'); m.textContent = 'Location is turned off for this site. Allow it to see speed and heading.'; m.style.display = 'block'; }
    renderAir();
  }
  function pingAir() { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(onAirPos, onAirErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 }); }
  function startAir() {
    buildAir();
    if (airTimer) return;
    airFix = null; airMotion = newMotion(); airKnots = null; airHdg = null; airDenied = false;
    if (!navigator.geolocation) { const m = document.getElementById('airMsg'); m.textContent = 'This device has no GPS.'; m.style.display = 'block'; renderAir(); return; }
    renderAir(); pingAir();
    airTimer = setInterval(pingAir, 3000); airStatusTimer = setInterval(renderAir, 1000);
  }
  function stopAir() { closeAirFull(); if (airTimer) { clearInterval(airTimer); clearInterval(airStatusTimer); airTimer = airStatusTimer = null; } }

  /* ============ PLACE LOOKUP + DRIVING COMPASS (works offline once an address is located) ============ */
  /* An address is turned into coordinates once, while online (OpenStreetMap Nominatim, address text only, one request at a time), and saved with the address. */
  let geoChain = Promise.resolve(), geoLast = 0;
  function geocodeAddress(addr) {
    const run = async () => {
      const wait = geoLast + 1100 - Date.now();
      if (wait > 0) await new Promise(res => setTimeout(res, wait));
      geoLast = Date.now();
      const resp = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(addr), { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error('lookup failed');
      const a = await resp.json();
      if (!Array.isArray(a) || !a.length) return null;
      const lat = parseFloat(a[0].lat), lon = parseFloat(a[0].lon);
      return (isFinite(lat) && isFinite(lon)) ? { lat, lon } : null;
    };
    const p = geoChain.then(run, run);
    geoChain = p.catch(() => {});
    return p;
  }
  function setLocNote(el, state) {
    if (!el) return;
    const t = { ok: '📍 Located', pending: 'Not located yet', busy: 'Looking up…', offline: 'Not located yet — will retry when online', notfound: 'Address not found — adjust it', error: 'Not located yet — will retry' };
    el.textContent = t[state] || '';
    el.classList.toggle('val-note', state === 'notfound');
  }
  function quietSaveTrip(t) { tripSnaps[t.id] = tripContent(t); saveTrips(); }
  function hotelPlace(h, t) { return { addr: () => h.address, has: () => h.lat != null && h.lon != null, set: (a, o) => { h.lat = a; h.lon = o; }, note: () => document.getElementById('wf-hotel-loc'), persist: () => quietSaveTrip(t || activeTrip()) }; }
  function destPlace(d, t) { return { addr: () => d.address, has: () => d.lat != null && d.lon != null, set: (a, o) => { d.lat = a; d.lon = o; }, note: () => document.getElementById('wf-dest-loc'), persist: () => quietSaveTrip(t || activeTrip()) }; }
  function homePlace() { return { addr: () => addrInput.value, has: () => homeLat != null && homeLon != null, set: (a, o) => { homeLat = a; homeLon = o; }, note: () => document.getElementById('addrLoc'), persist: () => { lastProfileSnap = JSON.stringify(profileContent()); try { localStorage.setItem(PROFILE_KEY, JSON.stringify(snapshotProfile())); } catch (e) {} } }; }
  async function locatePlace(place, silent) {
    const addr = place.addr().trim(), note = () => silent ? null : place.note();
    if (!addr) { place.set(null, null); setLocNote(note(), ''); return false; }
    if (place.has()) { setLocNote(note(), 'ok'); return false; }
    if (!navigator.onLine) { setLocNote(note(), 'offline'); return false; }
    setLocNote(note(), 'busy');
    try {
      const res = await geocodeAddress(addr);
      if (place.addr().trim() !== addr) return false; /* the address changed while looking */
      if (res) { place.set(res.lat, res.lon); place.persist(); setLocNote(note(), 'ok'); return true; }
      place.set(null, null); setLocNote(note(), 'notfound'); return false;
    } catch (e) { setLocNote(note(), 'error'); return false; }
  }
  /* Addresses saved while offline (or when a lookup failed) are tried again when the app opens online or the phone comes back online */
  let retrying = false;
  async function retryLocations() {
    if (retrying || !navigator.onLine) return;
    retrying = true;
    try {
      let found = false;
      if (addrInput.value.trim() && homeLat == null) found = (await locatePlace(homePlace())) || found;
      for (const t of trips) for (const st of t.itinerary.stops) {
        if (st.hotel.address.trim() && st.hotel.lat == null) found = (await locatePlace(hotelPlace(st.hotel, t), true)) || found;
        if (st.destination.address.trim() && st.destination.lat == null) found = (await locatePlace(destPlace(st.destination, t), true)) || found;
      }
      if (found && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { renderStepForm(); renderDash(); }
    } finally { retrying = false; }
  }
  window.addEventListener('online', () => retryLocations());

  /* ---- Great-circle maths ---- */
  const EARTH_M = 6371000, toRad = d => d * Math.PI / 180;
  function distanceM(la1, lo1, la2, lo2) {
    const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1);
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
    return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function bearingDeg(la1, lo1, la2, lo2) {
    const y = Math.sin(toRad(lo2 - lo1)) * Math.cos(toRad(la2));
    const x = Math.cos(toRad(la1)) * Math.sin(toRad(la2)) - Math.sin(toRad(la1)) * Math.cos(toRad(la2)) * Math.cos(toRad(lo2 - lo1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /* ---- Where the Compass button on the Dashboard points ---- */
  const rttBtn = document.getElementById('rttBtn');
  let dashCompass = null, rttMode = '';
  /* Why the Ground RTT button is greyed out on this step */
  function dashRttReason(node) {
    if (node.type === 'hotel' || node.type === 'destination') { const o = node.type === 'hotel' ? wizardState.stops[node.stopIndex].hotel : wizardState.stops[node.stopIndex].destination; return o.address.trim() ? 'Address not located yet' : 'Add an address'; }
    if (node.type === 'home' || node.type === 'uberHome') return addrInput.value.trim() ? 'Address not located yet' : 'Add home address in Setup';
    if (node.type === 'uberOut') { const e = effAirports()['f:0:0']; return e && e.from ? 'Airport not found' : 'Add the first flight\'s From airport'; }
    if (node.type === 'rental' || node.type === 'rentalReturn') return rentalAirportCode(node.stopIndex) ? 'Airport not found' : 'Add the flight\'s To airport';
    return 'Nothing to point at';
  }
  function dashCompassTarget(node) {
    let name = '', lat = null, lon = null;
    if (node.type === 'hotel') { const h = wizardState.stops[node.stopIndex].hotel; name = h.name.trim() || 'Hotel'; lat = h.lat; lon = h.lon; }
    else if (node.type === 'destination') { const d = wizardState.stops[node.stopIndex].destination; name = d.name.trim() || 'Objective'; lat = d.lat; lon = d.lon; }
    else if (node.type === 'home' || node.type === 'uberHome') { name = 'Home'; lat = homeLat; lon = homeLon; }
    else if (node.type === 'layover') return { name: 'Layover', walk: true };
    else if (node.type === 'uberOut') { const e = effAirports()['f:0:0'], ap = e && e.from ? airportByCode(e.from) : null; if (ap) { name = 'Airport — ' + e.from; lat = ap.lat; lon = ap.lon; } }
    else if (node.type === 'rental') { const code = rentalAirportCode(node.stopIndex), ap = airportByCode(code); if (ap) { name = 'Pick up rental — ' + code; lat = ap.lat; lon = ap.lon; } }
    else if (node.type === 'rentalReturn') { const code = rentalAirportCode(node.stopIndex), ap = airportByCode(code); if (ap) { name = 'Return rental — ' + code; lat = ap.lat; lon = ap.lon; } }
    return (lat != null && lon != null) ? { name, lat, lon } : null;
  }

  /* ---- The driving screen: arrow to the destination, relative to the direction of travel (GPS course only), ground speed, distance ---- */
  let driveDestFull = '', drivePing = null, driveStatusTimer = null, driveFixAt = null, driveDenied = false, driveBuiltUnit = '', driveDest = null, driveMotion = newMotion(), driveHold = null, driveSpeed = null, driveCourse = null, driveMph = true;
  function fmtDriveDist(m) {
    const km = currentUnits().dist === 'km';
    if (km) return m < 100 ? Math.round(m) + ' <small>M</small>' : (m / 1000).toFixed(1) + ' <small>KM</small>';
    const mi = m / 1609.344;
    return mi < 0.1 ? Math.round(m * 3.28084) + ' <small>FT</small>' : mi.toFixed(1) + ' <small>MI</small>';
  }
  const DRIVE_H_FALLBACK = 150; /* the tape's real height is read from the page (taller in full screen) */
  function driveTapeH() { return document.getElementById('driveTape').clientHeight || DRIVE_H_FALLBACK; }
  document.getElementById('drivePill').addEventListener('click', () => { driveMph = !driveMph; renderDrive(driveLastFix); });
  function driveWalk() { return !!(driveDest && driveDest.walk); }
  /* Tape scale: window = units visible top to bottom, tick / lab = spacing, dec = decimals shown. Layover (walking) uses a fine scale. */
  function driveScale() {
    const w = driveWalk();
    return driveMph ? (w ? { max: 60, win: 5, tick: 1, lab: 5, dec: 1 } : { max: 120, win: 40, tick: 5, lab: 10, dec: 0 })
                    : (w ? { max: 100, win: 5, tick: 1, lab: 5, dec: 1 } : { max: 200, win: 40, tick: 5, lab: 10, dec: 0 });
  }
  function buildDriveTape() {
    const sc = driveScale(), H = driveTapeH(), key = (driveMph ? 'mph' : 'kph') + (driveWalk() ? 'w' : '') + H; if (driveBuiltUnit === key) return; driveBuiltUnit = key;
    const k = H / sc.win; let html = '';
    for (let v = sc.max; v >= 0; v -= sc.tick) {
      const y = Math.round((sc.max - v) * k * 100) / 100;
      if (v % sc.lab === 0) html += '<div class="tk" style="top:' + y + 'px"></div><div class="tl" style="top:' + y + 'px">' + v + '</div>'; else html += '<div class="tk5" style="top:' + y + 'px"></div>';
    }
    const strip = document.getElementById('driveStrip'); strip.innerHTML = html; strip.style.height = Math.round(sc.max * k) + 'px';
  }
  let driveLastFix = null;
  function driveStatusNow() {
    if (driveDenied || driveFixAt == null) return 'red';
    const age = (Date.now() - driveFixAt) / 1000;
    return age <= 3.5 ? 'green' : age <= 9 ? 'yellow' : 'red';
  }
  function renderDriveStatus() {
    const st = driveStatusNow(), box = document.getElementById('driveStatus');
    box.querySelector('i').className = 'air-dot ' + st; box.querySelector('span').textContent = st === 'green' ? 'GPS LOCK' : st === 'yellow' ? 'GPS STALE' : 'NO GPS';
    cardGround.dataset.status = st;
  }
  function setDriveRel(r) { document.getElementById('driveArrow').setAttribute('transform', 'rotate(' + r + ')'); }
  function renderDrive(fix) {
    driveLastFix = fix;
    const course = driveCourse == null ? 0 : driveCourse;
    const hdg = driveCourse, h3 = hdg == null ? 0 : Math.round(hdg) % 360;
    document.getElementById('driveHdg').textContent = hdg == null ? '---' : String(h3 === 0 ? 360 : h3).padStart(3, '0');
    document.getElementById('driveDial').setAttribute('transform', 'rotate(' + (hdg == null ? 0 : -hdg) + ')');
    cardGround.dataset.course = driveCourse == null ? '' : Math.round(driveCourse);
    const spd = document.getElementById('driveSpeed');
    const ms = (driveSpeed == null || driveSpeed < (driveWalk() ? 0.1 : 0.5)) ? 0 : driveSpeed;
    buildDriveTape();
    const sc = driveScale(), sp = driveMph ? ms * 2.23694 : ms * 3.6, spMax = sc.max;
    spd.textContent = sp.toFixed(sc.dec);
    document.getElementById('drivePill').textContent = driveMph ? 'MPH' : 'KPH';
    document.getElementById('driveAlt').textContent = (driveMph ? (ms * 3.6).toFixed(sc.dec) + ' km/h' : (ms * 2.23694).toFixed(sc.dec) + ' mph');
    document.getElementById('driveStrip').style.transform = 'translateY(' + (driveTapeH() / 2 - (spMax - Math.max(0, Math.min(spMax, sp))) * driveTapeH() / sc.win) + 'px)';
    cardGround.dataset.speed = sp.toFixed(sc.dec);
    if (!fix) { document.getElementById('driveDist').innerHTML = '—'; return; }
    if (driveWalk()) { setDriveRel(0); document.getElementById('driveDist').innerHTML = '—'; cardGround.dataset.rel = '0'; cardGround.dataset.dist = ''; return; }
    const dist = distanceM(fix.lat, fix.lon, driveDest.lat, driveDest.lon), brg = bearingDeg(fix.lat, fix.lon, driveDest.lat, driveDest.lon);
    const rel = (brg - course + 360) % 360;
    setDriveRel(rel);
    document.getElementById('driveDist').innerHTML = fmtDriveDist(dist);
    cardGround.dataset.rel = Math.round(rel); cardGround.dataset.bearing = Math.round(brg); cardGround.dataset.dist = Math.round(dist);
  }
  function driveMessage(t) { const m = document.getElementById('driveMsg'); m.textContent = t || ''; m.style.display = t ? 'block' : 'none'; }
  function onDrivePos(pos) {
    const c = pos.coords, now = pos.timestamp || Date.now(), fix = { lat: c.latitude, lon: c.longitude, t: now };
    driveMessage(''); driveFixAt = Date.now(); driveDenied = false; renderDriveStatus();
    const r = gpsMotion(driveMotion, c, fix, { floor: driveWalk() ? FLOOR_WALK_MS : FLOOR_MS });
    if (r.moving && r.speed != null) {
      driveSpeed = (driveSpeed == null || driveSpeed < 0.3 || r.speed < 0.3) ? r.speed : 0.6 * driveSpeed + 0.4 * r.speed; /* smoothed while moving */
      if (r.heading != null) driveCourse = r.heading;
      driveHold = fix;
    } else { driveSpeed = 0; if (!driveHold) driveHold = fix; } /* stationary: reads 0, the heading, arrow and Distance stay where they were */
    renderDrive(driveHold || fix);
  }
  function onDriveErr(e) {
    if (e && e.code === 1) { driveDenied = true; renderDriveStatus(); driveMessage('Location is turned off for this site. Allow it in the browser settings to use the compass.'); }
    else if (e && e.code === 2) driveMessage('No GPS position yet. Try again with a clear view of the sky.');
    else driveMessage('Waiting for GPS…');
  }
  let driveDialBuilt = false;
  function startDrive(target) {
    if (drivePing) { driveDest = target; driveDestFull = target.name; fitDriveDest(); renderDrive(driveLastFix); return; }
    driveDest = target; driveMotion = newMotion(); driveHold = null; driveFixAt = null; driveDenied = false; driveSpeed = null; driveCourse = null; driveMph = currentUnits().speed !== 'kph'; driveBuiltUnit = '';
    if (!driveDialBuilt) { document.getElementById('driveDial').innerHTML = dialMarkup(); driveDialBuilt = true; }
    driveDestFull = target.name; fitDriveDest();
    cardGround.dataset.rel = ''; cardGround.dataset.dist = '';
    renderDrive(null);
    if (!navigator.geolocation) { driveMessage('This device has no GPS.'); return; }
    driveMessage('Waiting for GPS…');
    renderDriveStatus();
    const pingDrive = () => navigator.geolocation.getCurrentPosition(onDrivePos, onDriveErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 3000 });
    pingDrive(); drivePing = setInterval(pingDrive, 1000); driveStatusTimer = setInterval(renderDriveStatus, 1000);
  }
  /* Full screen: tap the card (not the unit pill). True browser full screen when allowed, otherwise the card fills the app window. */
  let groundTrueFs = false;
  /* The place name wraps to at most 3 lines; if it is longer the last words are dropped and "…" is added. Done here because the CSS ellipsis is clipped on right-justified text. */
  function fitDriveDest() {
    const el = document.getElementById('driveDest'); if (!el) return;
    el.textContent = driveDestFull;
    if (!driveDestFull || !el.clientWidth) return;
    const over = () => el.scrollHeight > el.clientHeight + 1;
    if (!over()) return;
    const words = driveDestFull.split(/\s+/); let n = words.length;
    while (n > 1) { n--; el.textContent = words.slice(0, n).join(' ') + '…'; if (!over()) return; }
    let s = words[0]; while (s.length > 1) { s = s.slice(0, -1); el.textContent = s + '…'; if (!over()) return; }
  }
  function groundRerender() { requestAnimationFrame(() => { fitDriveDest(); if (drivePing || driveLastFix) renderDrive(driveLastFix); }); }
  function openGroundFull() {
    cardGround.classList.add('ground-full');
    try { const p = cardGround.requestFullscreen && cardGround.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    groundRerender();
  }
  function closeGroundFull() {
    if (!cardGround.classList.contains('ground-full')) return;
    cardGround.classList.remove('ground-full'); groundTrueFs = false;
    try { if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    groundRerender();
  }
  cardGround.addEventListener('click', e => { if (e.target.closest('#drivePill') || e.target.closest('#groundFullX')) return; if (!cardGround.classList.contains('ground-full')) openGroundFull(); });
  document.getElementById('groundFullX').addEventListener('click', e => { e.stopPropagation(); closeGroundFull(); });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === cardGround) groundTrueFs = true;
    else if (groundTrueFs) { groundTrueFs = false; cardGround.classList.remove('ground-full'); groundRerender(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGroundFull(); });
  window.addEventListener('resize', () => { if (cardGround.style.display !== 'none') groundRerender(); });
  function stopDrive() { closeGroundFull(); if (drivePing) { clearInterval(drivePing); clearInterval(driveStatusTimer); } drivePing = driveStatusTimer = null; }
  rttBtn.addEventListener('click', () => {
    if (!rttMode || rttBtn.disabled) return;
    rttOn = !(rttOn && rttKey === dashSelected); rttKey = dashSelected; renderDash();
  });

  /* ============ IMPORT A BOOKING (.ics, PDF, or pasted text) ============ */
  const itinModal = document.getElementById('itinModal');
  let itinFiles = [], itinModel = null, itinLayout = null, itinRows = [], itinExisting = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'lib/pdf.min.js?v=1'; sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js?v=1'; res(); }; sc.onerror = () => rej(new Error('The PDF reader could not be loaded (it needs the app files, so open the app once online).')); document.head.appendChild(sc); });
  }
  async function pdfToText(file) {
    await loadPdfJs();
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; let out = '';
    for (let p = 1; p <= doc.numPages; p++) { const tc = await (await doc.getPage(p)).getTextContent(); out += window.CrosswindBooking.rowsFromItems(tc.items.map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5] }))) + '\n'; }
    return out;
  }
  function itinMsg(text) { ['itinMsg', 'itinMsg2'].forEach(id => { const m = document.getElementById(id); m.textContent = text || ''; m.style.display = text ? 'block' : 'none'; }); }
  function niceCase(t) {
    const letters = t.replace(/[^A-Za-z]/g, '');
    if (!letters || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.8) return t;
    return t.toLowerCase().replace(/\b[a-z]+/g, w => (w.length === 2 && STATE_CODES.indexOf(w.toUpperCase()) >= 0) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).replace(/\b(\d+)(st|nd|rd|th)\b/gi, (m0, n, x) => n + x.toLowerCase());
  }
  const STATE_CODES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC US'.split(' ');
  function programMatch(type, word) {
    const w = String(word || '').toLowerCase().split(' ')[0]; if (!w) return '';
    const p = programs.find(x => x.type === type && x.name.toLowerCase().indexOf(w) >= 0); return p ? p.name : '';
  }
  function hotelChainAndBrand(name) {
    const n = String(name || '').toLowerCase(); const hit = hotelBrandData.find(x => x.match.some(k => n.indexOf(k) >= 0));
    if (!hit) return { chain: '', brand: '' };
    const prog = programs.find(x => x.type === 'hotel' && hit.match.some(k => x.name.toLowerCase().indexOf(k) >= 0));
    const major = majorHotelChains.find(m => m.match.some(k => hit.match.indexOf(k) >= 0));
    const brand = hit.brands.slice().sort((a, b) => b.length - a.length).find(b => n.indexOf(b.toLowerCase()) >= 0) || '';
    return { chain: prog ? prog.name : (major ? major.name : ''), brand };
  }
  function itinFlightObj(f) {
    return Object.assign(newFlight(), { airline: programMatch('airline', f.airline || CrosswindBooking.CARRIERS[f.code]) || f.airline || CrosswindBooking.CARRIERS[f.code] || '', flightNum: f.number, conf: f.conf || '', seat: f.seat || '', date: f.date || '', from: f.from || '', to: f.to || '', dep: f.dep || '', arr: f.arr || '', arrDay: (f.arrDate && f.date && f.arrDate > f.date) ? 1 : 0 });
  }
  /* parsed hotel / car to the Wizard's fields (used by Import Itinerary and the Text Clipboard Parser) */
  function itinHotelObj(h) { const cb = hotelChainAndBrand(h.name); return { chain: cb.chain, brand: cb.brand, name: niceCase(h.name), address: niceCase(h.address), checkIn: h.checkIn || '', checkOut: h.checkOut || '', conf: h.conf || '' }; }
  function itinRideObj(r) { return { date: r.date || '', pickup: r.pickTime || '', dropoff: r.dropTime || '' }; }
  function itinCarObj(c) { return { company: programMatch('rental', c.company) || c.company || '', conf: c.conf || '', pickup: c.pickDate || '', ret: c.retDate || '', pickupTime: c.pickTime || '', retTime: c.retTime || '' }; }
  function itineraryFromLayout(L, keep) {
    const it = newItinerary(); it.stops = [];
    L.stops.forEach(sp => {
      const st = newStop(); st.flights = sp.flights.filter(keep).map(itinFlightObj); if (!st.flights.length) st.flights = [newFlight()];
      if (sp.hotel && keep(sp.hotel)) Object.assign(st.hotel, itinHotelObj(sp.hotel));
      if (sp.car && keep(sp.car)) Object.assign(st.rental, itinCarObj(sp.car));
      it.stops.push(st);
    });
    if (!it.stops.length) it.stops.push(newStop());
    it.returnFlights = L.returns.filter(keep).map(itinFlightObj); if (!it.returnFlights.length) it.returnFlights = [newFlight()];
    return normalizeItinerary(it);
  }
  /* field-by-field changes an updated booking would make to a trip saved from the same reference */
  function itineraryDiff(oldIt, newIt) {
    const out = [], same = oldIt.stops.length === newIt.stops.length && oldIt.stops.every((s, i) => s.flights.length === newIt.stops[i].flights.length) && oldIt.returnFlights.length === newIt.returnFlights.length;
    if (!same) return { same: false, rows: out };
    const cmp = (label, o, n, keys) => keys.forEach(k => { if (n[k] !== '' && n[k] != null && n[k] !== o[k]) out.push({ label: label + ' ' + k, from: o[k], to: n[k], apply: () => { o[k] = n[k]; } }); });
    oldIt.stops.forEach((s, i) => { s.flights.forEach((f, j) => cmp('Stop ' + (i + 1) + ' flight ' + (j + 1), f, newIt.stops[i].flights[j], ['airline', 'flightNum', 'conf', 'seat', 'date', 'from', 'to', 'dep', 'arr', 'arrDay'])); cmp('Stop ' + (i + 1) + ' hotel', s.hotel, newIt.stops[i].hotel, ['chain', 'brand', 'name', 'address', 'checkIn', 'checkOut', 'conf']); cmp('Stop ' + (i + 1) + ' rental', s.rental, newIt.stops[i].rental, ['company', 'conf', 'pickup', 'ret', 'pickupTime', 'retTime']); });
    oldIt.returnFlights.forEach((f, j) => cmp('Return flight ' + (j + 1), f, newIt.returnFlights[j], ['airline', 'flightNum', 'conf', 'seat', 'date', 'from', 'to', 'dep', 'arr', 'arrDay']));
    return { same: true, rows: out };
  }
  function itinAddRow(list, text, small, checked, extra) {
    const row = document.createElement('label'); row.className = 'restore-row check';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = checked;
    const info = document.createElement('div'); const b = document.createElement('b'); b.textContent = text; info.appendChild(b);
    if (small) { const sm = document.createElement('small'); sm.textContent = small; info.appendChild(sm); }
    if (extra) info.appendChild(extra);
    row.appendChild(cb); row.appendChild(info); list.appendChild(row); return cb;
  }
  function airportEditor(f, prop) {
    const wrap = document.createElement('div'), inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = (prop === 'from' ? 'From' : 'To') + ' airport'; inp.value = f[prop] || ''; inp.style.maxWidth = '120px';
    inp.addEventListener('input', () => { f[prop] = airportCode(inp.value); });
    wrap.appendChild(inp); return wrap;
  }
  function showItinPreview() {
    const m = itinModel, L = itinLayout = CrosswindBooking.layout(m), sum = CrosswindBooking.tripSummary(m);
    document.getElementById('itinStep1').style.display = 'none'; document.getElementById('itinStep2').style.display = 'block';
    const warn = document.getElementById('itinWarn'); warn.innerHTML = '';
    m.warnings.forEach(w => { const d = document.createElement('div'); d.className = 'fld-note val-note'; d.textContent = '⚠ ' + w; warn.appendChild(d); });
    const dest = m.flights.length ? m.flights[0] : null;
    const city = niceCase(sum.city || (dest && dest.toName ? dest.toName.split(',')[0] : ''));
    document.getElementById('itinName').value = (city ? city + ' ' : '') + (sum.start ? fmtShortDate(sum.start) + (sum.end && sum.end !== sum.start ? '–' + (sum.end.slice(0, 7) === sum.start.slice(0, 7) ? String(+sum.end.slice(8)) : fmtShortDate(sum.end)) : '') : '');
    document.getElementById('itinStart').value = sum.start ? fmtDate(fromISODate(sum.start)) : ''; document.getElementById('itinEnd').value = sum.end ? fmtDate(fromISODate(sum.end)) : '';
    document.getElementById('itinRef').textContent = m.ref ? 'Agency reference: ' + m.ref : '';
    const list = document.getElementById('itinList'); list.innerHTML = ''; itinRows = [];
    const add = (obj, text, small, extra) => { const cb = itinAddRow(list, text, small, true, extra); itinRows.push({ obj, cb }); };
    L.stops.forEach((sp, i) => {
      if (L.stops.length > 1 || sp.hotel) { const h = document.createElement('div'); h.className = 'card-sub'; h.textContent = 'Stop ' + (i + 1) + (sp.hotel ? ' — ' + niceCase(sp.hotel.name) : ''); list.appendChild(h); }
      sp.flights.forEach(f => add(f, f.code + f.number + '  ' + (f.from || '?') + ' ⟶ ' + (f.to || '?'), [f.date ? fmtDate(fromISODate(f.date)) : '', (f.dep || '') + (f.arr ? '–' + f.arr + (f.arrDate && f.date && f.arrDate > f.date ? ' (+1)' : '') : ''), f.seat ? 'seat ' + f.seat : '', f.conf ? 'conf ' + f.conf : '', f.inferredNextDay ? '(next day inferred)' : ''].filter(Boolean).join(' · '), (!f.from || !f.to) ? (function () { const w = document.createElement('div'); if (!f.from) w.appendChild(airportEditor(f, 'from')); if (!f.to) w.appendChild(airportEditor(f, 'to')); const n = document.createElement('small'); n.className = 'warn'; n.textContent = 'airport not identified: type a code'; w.appendChild(n); return w; })() : null));
      if (sp.car) add(sp.car, 'Rental car — ' + (sp.car.company || '?'), [(sp.car.pickDate ? fmtDate(fromISODate(sp.car.pickDate)) : '') + ' ' + (sp.car.pickTime || ''), '→ ' + (sp.car.retDate ? fmtDate(fromISODate(sp.car.retDate)) : '') + ' ' + (sp.car.retTime || ''), sp.car.conf ? 'conf ' + sp.car.conf : ''].join(' ').replace(/\s+/g, ' ').trim());
      if (sp.hotel) add(sp.hotel, 'Hotel — ' + niceCase(sp.hotel.name), [(sp.hotel.checkIn ? fmtDate(fromISODate(sp.hotel.checkIn)) : '') + ' → ' + (sp.hotel.checkOut ? fmtDate(fromISODate(sp.hotel.checkOut)) : ''), sp.hotel.conf ? 'conf ' + sp.hotel.conf : '', sp.hotel.address ? niceCase(sp.hotel.address) : 'no address in this booking'].join(' · '));
    });
    if (L.returns.length) { const h = document.createElement('div'); h.className = 'card-sub'; h.textContent = 'Return flights'; list.appendChild(h); L.returns.forEach(f => add(f, f.code + f.number + '  ' + (f.from || '?') + ' ⟶ ' + (f.to || '?'), [f.date ? fmtDate(fromISODate(f.date)) : '', (f.dep || '') + (f.arr ? '–' + f.arr + (f.arrDate && f.date && f.arrDate > f.date ? ' (+1)' : '') : ''), f.seat ? 'seat ' + f.seat : '', f.conf ? 'conf ' + f.conf : ''].filter(Boolean).join(' · '), (!f.from || !f.to) ? (function () { const w = document.createElement('div'); if (!f.from) w.appendChild(airportEditor(f, 'from')); if (!f.to) w.appendChild(airportEditor(f, 'to')); return w; })() : null)); }
    const miss = []; if (!m.flights.some(f => f.seat)) miss.push('seats'); if (!m.flights.some(f => f.conf)) miss.push('flight confirmation'); if (m.hotels.length && !m.hotels.some(h => h.address)) miss.push('hotel address');
    document.getElementById('itinMissing').textContent = miss.length ? 'Not in this booking: ' + miss.join(', ') + '.' : '';
    itinExisting = m.ref ? trips.find(t => t.agencyRef === m.ref) : null;
    const ex = document.getElementById('itinExisting'); ex.innerHTML = '';
    if (itinExisting) {
      ex.style.display = 'block';
      const lab = document.createElement('div'); lab.className = 'card-sub'; lab.textContent = 'You already have a trip from this booking: ' + itinExisting.name; ex.appendChild(lab);
      [['update', 'Update that trip'], ['new', 'Create a separate trip']].forEach(([v, t], i) => { const l = document.createElement('label'); l.className = 'chk-line'; const r = document.createElement('input'); r.type = 'radio'; r.name = 'itinMode'; r.value = v; r.checked = i === 0; l.appendChild(r); l.appendChild(document.createTextNode(' ' + t)); ex.appendChild(l); });
    } else ex.style.display = 'none';
    document.getElementById('itinImportBtn').disabled = !(m.flights.length || m.cars.length || m.hotels.length);
    document.getElementById('itinImportBtn').textContent = itinExisting ? 'Continue' : 'Import trip';
  }
  function fmtShortDate(iso) { return fromISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  async function readItinerary() {
    itinMsg(''); const inputs = [];
    const btn = document.getElementById('itinRead'); btn.disabled = true; btn.textContent = 'Reading…';
    try {
      for (const f of itinFiles) {
        const name = f.name || 'file';
        if (/\.pdf$/i.test(name) || f.type === 'application/pdf') { let t = ''; try { t = await pdfToText(f); } catch (e) { itinMsg(name + ': ' + (e.message || 'could not be read as a PDF.')); return; } if (!t.replace(/\s/g, '')) { itinMsg(name + ' has no readable text (it may be a scan). Try the .ics file or paste the text.'); return; } inputs.push({ name, kind: 'text', text: t }); }
        else { const t = await f.text(); inputs.push({ name, kind: /\.ics$/i.test(name) || /BEGIN:VCALENDAR/i.test(t) ? 'ics' : 'text', text: t }); }
      }
      const pasted = document.getElementById('itinPaste').value; if (pasted.trim()) inputs.push({ name: 'pasted text', kind: /BEGIN:VCALENDAR/i.test(pasted) ? 'ics' : 'text', text: pasted });
      if (!inputs.length) { itinMsg('Choose a file or paste some booking text first.'); return; }
      itinModel = CrosswindBooking.parse(inputs, { airports: airportData, today: new Date() });
      if (!itinModel.flights.length && !itinModel.cars.length && !itinModel.hotels.length) { itinMsg(itinModel.rides.length ? 'This looks like an Uber ride. Use the Text Clipboard Parser on the Uber step.' : 'Nothing could be read from this. ' + (itinModel.warnings[0] || 'The layout was not recognised.')); return; }
      showItinPreview();
    } finally { btn.disabled = false; btn.textContent = 'Read'; }
  }
  function applyItinerary() {
    const kept = new Set(itinRows.filter(r => r.cb.checked).map(r => r.obj)), keep = o => kept.has(o);
    const it = itineraryFromLayout(itinLayout, keep), mode = (document.querySelector('input[name="itinMode"]:checked') || {}).value;
    if (itinExisting && mode === 'update') {
      const d = itineraryDiff(itinExisting.itinerary, it);
      if (d.same) { showItinUpdate(d); return; }
      showItinUpdate({ same: false, rows: [] }); return;
    }
    const name = cleanText(document.getElementById('itinName').value).trim() || 'Imported trip';
    const s = parseSmartDate(document.getElementById('itinStart').value, new Date(), null), e = parseSmartDate(document.getElementById('itinEnd').value, new Date(), null);
    if (!s || !e || e < s) { itinMsg('Check the trip dates (start before end).'); return; }
    const home = airportCode(homeAirportInput.value), fl = itinLayout.stops.reduce((a, x) => a.concat(x.flights), []).concat(itinLayout.returns).filter(keep);
    const t = { id: newTripId(), name, start: toISODate(s), end: toISODate(e), startsAtHome: home && fl.length ? fl[0].from === home : true, endsAtHome: home && fl.length ? fl[fl.length - 1].to === home : true, modified: new Date().toISOString(), colorIdx: null, agencyRef: itinModel.ref || '', itinerary: it };
    giveColor(t); trips.push(t); tripSnaps[t.id] = tripContent(t); activeTripId = t.id; saveActive(); saveTrips(); dashSelected = ''; loadItinerary(); refreshTripUI(); closeItin(); retryLocations();
  }
  function showItinUpdate(d) {
    const list = document.getElementById('itinList'); list.innerHTML = ''; itinRows = [];
    document.getElementById('itinExisting').style.display = 'none'; document.getElementById('itinMissing').textContent = '';
    const t = itinExisting;
    if (!d.same) {
      const n = document.createElement('div'); n.className = 'fld-note'; n.textContent = 'The number of flights or stops changed since you imported this booking, so it cannot be compared field by field.'; list.appendChild(n);
      const imp = document.getElementById('itinImportBtn'); imp.textContent = 'Replace the trip\'s itinerary'; imp.disabled = false;
      imp.onclick = () => { const kept = new Set(); const it = itineraryFromLayout(itinLayout, () => true); t.itinerary = it; t.modified = new Date().toISOString(); tripSnaps[t.id] = tripContent(t); saveTrips(); activeTripId = t.id; saveActive(); loadItinerary(); refreshTripUI(); closeItin(); retryLocations(); };
      return;
    }
    if (!d.rows.length) { const n = document.createElement('div'); n.className = 'fld-note'; n.textContent = 'Nothing has changed since you imported this booking.'; list.appendChild(n); }
    d.rows.forEach(r => { r.cb = itinAddRow(list, r.label, (r.from === '' ? '(empty)' : r.from) + ' → ' + r.to, true); });
    const imp = document.getElementById('itinImportBtn'); imp.textContent = 'Apply selected changes'; imp.disabled = !d.rows.length;
    imp.onclick = () => { d.rows.forEach(r => { if (r.cb.checked) r.apply(); }); t.modified = new Date().toISOString(); tripSnaps[t.id] = tripContent(t); saveTrips(); activeTripId = t.id; saveActive(); loadItinerary(); refreshTripUI(); closeItin(); retryLocations(); };
  }
  function openItin() {
    itinFiles = []; itinModel = null; document.getElementById('itinFiles').value = ''; document.getElementById('itinFileList').textContent = ''; document.getElementById('itinPaste').value = ''; itinMsg('');
    document.getElementById('itinStep1').style.display = 'block'; document.getElementById('itinStep2').style.display = 'none';
    const imp = document.getElementById('itinImportBtn'); imp.onclick = applyItinerary; itinModal.classList.add('open');
  }
  function closeItin() { itinModal.classList.remove('open'); }
  document.getElementById('importItinBtn').addEventListener('click', openItin);
  document.getElementById('itinChoose').addEventListener('click', () => document.getElementById('itinFiles').click());
  document.getElementById('itinFiles').addEventListener('change', e => { itinFiles = Array.from(e.target.files); document.getElementById('itinFileList').textContent = itinFiles.map(f => f.name).join(', '); });
  document.getElementById('itinRead').addEventListener('click', readItinerary);
  document.getElementById('itinCancel').addEventListener('click', closeItin);
  document.getElementById('itinBack').addEventListener('click', () => { document.getElementById('itinStep1').style.display = 'block'; document.getElementById('itinStep2').style.display = 'none'; });
  itinModal.addEventListener('click', e => { if (e.target === itinModal) closeItin(); });

  /* ============ TEXT CLIPBOARD PARSER (Flight, Rental, and Hotel steps) ============ */
  /* One tap reads the clipboard (a paste box if that is refused), the Build 58 parser reads it, a pick list if there are several matches, a preview of what changes, then Fill. */
  const clipModal = document.getElementById('clipModal');
  let clipKind = '', clipNode = null, clipMatches = [], clipChanges = null;
  const CLIP_FIELDS = {
    flight: [['Airline', 'airline'], ['Flight #', 'flightNum'], ['Confirmation #', 'conf'], ['Seat #', 'seat'], ['Date', 'date'], ['From', 'from'], ['To', 'to'], ['Departure time', 'dep'], ['Arrival time', 'arr'], ['+1 day', 'arrDay']],
    uber: [['Date', 'date'], ['Pickup time', 'pickup'], ['Drop-off time', 'dropoff']],
    rental: [['Company', 'company'], ['Confirmation #', 'conf'], ['Pickup date', 'pickup'], ['Pickup time', 'pickupTime'], ['Return date', 'ret'], ['Return time', 'retTime']],
    hotel: [['Chain', 'chain'], ['Brand', 'brand'], ['Hotel name', 'name'], ['Address', 'address'], ['Check-in', 'checkIn'], ['Check-out', 'checkOut'], ['Confirmation #', 'conf']]
  };
  /* which fields hold a date (the Uber "pickup" is a time, the rental "pickup" is a date) */
  function clipIsDate(key) { return key === 'date' || key === 'checkIn' || key === 'checkOut' || (clipKind === 'rental' && (key === 'pickup' || key === 'ret')); }
  function clipWord() { return clipKind === 'rental' ? 'rental car' : clipKind === 'hotel' ? 'hotel' : clipKind === 'uber' ? 'Uber ride' : 'flight'; }
  function clipTarget() {
    if (clipKind === 'uber') return clipNode.type === 'uberHome' ? wizardState.uberHome : wizardState.uberOut;
    if (clipKind === 'rental') return wizardState.stops[clipNode.stopIndex].rental;
    if (clipKind === 'hotel') return wizardState.stops[clipNode.stopIndex].hotel;
    return clipNode.type === 'returnFlight' ? wizardState.returnFlights[clipNode.flightIndex] : wizardState.stops[clipNode.stopIndex].flights[clipNode.flightIndex];
  }
  function clipShow(which) { ['clipPaste', 'clipPick', 'clipPreview'].forEach(id => { document.getElementById(id).style.display = id === which ? 'block' : 'none'; }); }
  function clipMsg(text) { const m = document.getElementById('clipMsg'); m.textContent = text || ''; m.style.display = text ? 'block' : 'none'; }
  function clipShowPaste(msg, keepText) {
    const word = clipWord();
    document.getElementById('clipTitle').textContent = 'Text Clipboard Parser: ' + word.replace(/^./, c => c.toUpperCase());
    document.getElementById('clipHelp').textContent = 'Paste the ' + word + (clipKind === 'uber' ? ' reservation or receipt' : ' booking') + ' text for this step. It is read on this phone.';
    if (!keepText) document.getElementById('clipText').value = '';
    clipMsg(msg); clipShow('clipPaste'); clipModal.classList.add('open');
  }
  function clipClose() { clipModal.classList.remove('open'); clipMatches = []; clipChanges = null; }
  function clipDate(iso) { const d = iso && fromISODate(iso); return d ? fmtDate(d) : ''; }
  function clipLine(m) {
    if (clipKind === 'uber') return [m.date ? clipDate(m.date) : '', [m.pickTime, m.dropTime].filter(Boolean).join(' to '), [m.pickAddr, m.dropAddr].filter(Boolean).join(' to ')].filter(Boolean).join(', ');
    if (clipKind === 'flight') return [(m.code || '') + (m.number || ''), (m.from || m.fromName || '?') + ' to ' + (m.to || m.toName || '?') + (m.date ? ', ' + clipDate(m.date) : ''), [m.dep, m.arr].filter(Boolean).join(' to ')].filter(Boolean).join(' ');
    if (clipKind === 'rental') return (m.company || 'Rental car') + (m.pickDate ? ', pickup ' + clipDate(m.pickDate) : '') + (m.pickTime ? ' ' + m.pickTime : '');
    return (m.name || 'Hotel') + (m.checkIn ? ', ' + clipDate(m.checkIn) + (m.checkOut ? ' to ' + clipDate(m.checkOut) : '') : '');
  }
  async function startClipParser(node) {
    clipNode = node; clipKind = node.type === 'hotel' ? 'hotel' : node.type === 'rental' ? 'rental' : (node.type === 'uberOut' || node.type === 'uberHome') ? 'uber' : 'flight';
    let text = '';
    try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
    if (text && text.trim()) clipProcess(text);
    else clipShowPaste(navigator.clipboard && navigator.clipboard.readText ? 'Nothing could be read from the clipboard. Paste the text here.' : 'This browser cannot read the clipboard. Paste the text here.');
  }
  function clipProcess(text) {
    let model; try { model = CrosswindBooking.parse([{ name: 'clipboard', kind: 'text', text }], { airports: airportData, today: new Date() }); } catch (e) { model = { flights: [], cars: [], hotels: [], warnings: [] }; }
    clipMatches = clipKind === 'flight' ? model.flights : clipKind === 'rental' ? model.cars : clipKind === 'uber' ? model.rides : model.hotels;
    clipModel = model;
    if (!clipMatches.length) {
      const word = clipWord();
      document.getElementById('clipText').value = text;
      clipShowPaste('Nothing for ' + (clipKind === 'uber' ? 'an ' : 'a ') + word + ' was found in what you copied.' + (model.warnings.length ? ' ' + model.warnings.join(' ') : '') + ' Paste other text, or Cancel.', true); return;
    }
    if (clipMatches.length === 1) clipPreview(clipMatches[0]); else clipPickList();
  }
  let clipModel = null;
  function clipPickList() {
    document.getElementById('clipTitle').textContent = 'Text Clipboard Parser';
    document.getElementById('clipList').innerHTML = clipMatches.map((m, i) => '<label class="clip-pick"><input type="radio" name="clipPick" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(clipLine(m)) + '</span></label>').join('');
    clipShow('clipPick'); clipModal.classList.add('open');
  }
  function clipPreview(m) {
    const cur = clipTarget(); const nw = clipKind === 'flight' ? itinFlightObj(m) : clipKind === 'rental' ? itinCarObj(m) : clipKind === 'uber' ? itinRideObj(m) : itinHotelObj(m);
    clipChanges = {}; const rows = [];
    CLIP_FIELDS[clipKind].forEach(([label, key]) => {
      const nv = nw[key], cv = cur[key];
      if (key === 'arrDay') { if (nv === 1 && cv !== 1) { clipChanges.arrDay = 1; rows.push([label, cv === 1 ? 'yes' : 'no', 'yes', '']); } return; }
      if (nv == null || nv === '' || nv === cv) return;
      clipChanges[key] = nv; const show = v => clipIsDate(key) ? clipDate(v) : v; rows.push([label, show(cv || ''), show(nv), '']);
    });
    if (clipKind === 'flight') {
      if (!m.from && (m.fromName || m.fromOptions)) rows.push(['From', '', 'not identified', 'nid']);
      if (!m.to && (m.toName || m.toOptions)) rows.push(['To', '', 'not identified', 'nid']);
    }
    if (clipKind === 'uber') { if (m.pickAddr) rows.push(['Pickup at', '', m.pickAddr + ' (not saved)', 'ref']); if (m.dropAddr) rows.push(['Drop-off at', '', m.dropAddr + ' (not saved)', 'ref']); }
    const warn = (clipModel && clipModel.warnings || []).filter(Boolean);
    document.getElementById('clipWarn').innerHTML = warn.map(w => '<div class="fld-note val-note">' + esc(w) + '</div>').join('');
    document.getElementById('clipTitle').textContent = 'Text Clipboard Parser';
    const changing = Object.keys(clipChanges).length > 0;
    document.getElementById('clipPrevHelp').textContent = changing ? 'This will change:' : 'Everything in the text already matches this step.';
    document.getElementById('clipRows').innerHTML = rows.map(r => '<div class="clip-row"><div class="cl">' + esc(r[0]) + '</div><div>' + (r[1] ? '<span class="old">' + esc(r[1]) + '</span>' : '') + '<span class="' + (r[3] || 'new') + '">' + esc(r[2]) + '</span></div></div>').join('');
    document.getElementById('clipFill').style.display = changing ? '' : 'none';
    clipShow('clipPreview'); clipModal.classList.add('open');
  }
  function clipApply() {
    const cur = clipTarget(); if (!cur || !clipChanges) { clipClose(); return; }
    Object.assign(cur, clipChanges);
    if (clipKind === 'hotel' && 'address' in clipChanges) { cur.lat = null; cur.lon = null; }
    const hotelCur = clipKind === 'hotel' ? cur : null;
    clipClose(); renderNodeTrack(true); renderStepForm(); commitTrips();
    if (hotelCur && hotelCur.address.trim()) locatePlace(hotelPlace(hotelCur));
  }
  document.getElementById('clipRead').addEventListener('click', () => { const t = document.getElementById('clipText').value; if (!t.trim()) { clipMsg('Paste some text first.'); return; } clipProcess(t); });
  document.getElementById('clipUse').addEventListener('click', () => { const r = document.querySelector('input[name="clipPick"]:checked'); if (r) clipPreview(clipMatches[+r.value]); });
  document.getElementById('clipFill').addEventListener('click', clipApply);
  ['clipCancel1', 'clipCancel2', 'clipCancel3'].forEach(id => document.getElementById(id).addEventListener('click', clipClose));
  clipModal.addEventListener('click', e => { if (e.target === clipModal) clipClose(); });

  /* ============ TRAVEL HORIZON CALENDAR (Dashboard popup, read-only) ============ */
  const horizonModal = document.getElementById('horizonModal');
  const hzPalette = ['#ff5c5c', '#4de88a', '#4d8dff', '#f0a832', '#9b7bff', '#4dd8ff', '#e85dd0', '#b5e84d', '#ff8a4d', '#2fbfa5', '#ff9ec7', '#f3e45a'];
  let hzMonth = new Date();
  function hzTripsByStart() { return trips.slice().sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (a.id < b.id ? -1 : 1)); }
  function hzColor(t) { return hzPalette[(t.colorIdx == null ? 0 : t.colorIdx) % hzPalette.length]; }
  function openTripFromHorizon(t) { closeHorizon(); setActiveTrip(t.id); showScreen('screenWizard'); }
  function closeHorizon() { horizonModal.classList.remove('open'); }
  function renderHorizon() {
    const y = hzMonth.getFullYear(), mo = hzMonth.getMonth(), sorted = hzTripsByStart();
    document.getElementById('hzMonthLabel').textContent = hzMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const grid = document.getElementById('hzGrid'), legend = document.getElementById('hzLegend'), away = document.getElementById('hzDaysAway');
    grid.innerHTML = ''; legend.innerHTML = '';
    const firstDay = new Date(y, mo, 1).getDay(), totalDays = new Date(y, mo + 1, 0).getDate(), today = dayStart(new Date());
    const cells = Math.ceil((firstDay + totalDays) / 7) * 7;
    const gridStart = new Date(y, mo, 1 - firstDay), gridEnd = new Date(y, mo, cells - firstDay);
    let awayDays = 0;
    for (let i = 0; i < cells; i++) {
      const date = new Date(y, mo, 1 - firstDay + i), inMonth = date.getMonth() === mo, cell = document.createElement('div');
      cell.className = 'cal-day' + (inMonth ? '' : ' dim'); cell.textContent = date.getDate();
      if (date.getTime() === today.getTime()) cell.classList.add('today-marker');
      const cover = sorted.filter(t => fromISODate(t.start) <= date && date <= fromISODate(t.end));
      if (cover.length) {
        if (inMonth) awayDays++;
        cell.classList.add('hz-trip');
        const cols = cover.map(hzColor);
        cell.style.background = cols.length === 1 ? cols[0] : 'linear-gradient(135deg, ' + cols.map((c, k) => c + ' ' + (k * 100 / cols.length) + '% ' + ((k + 1) * 100 / cols.length) + '%').join(', ') + ')';
        const starting = cover.filter(t => fromISODate(t.start).getTime() === date.getTime());
        const pick = starting.length ? starting[starting.length - 1] : cover[cover.length - 1];
        cell.addEventListener('click', () => openTripFromHorizon(pick));
      }
      grid.appendChild(cell);
    }
    away.textContent = trips.length ? 'Days away this month: ' + awayDays + ' of ' + totalDays : '';
    /* legend: every trip visible on the grid (dimmed days included), as coloured name cells in date order */
    const visible = sorted.filter(t => fromISODate(t.start) <= gridEnd && fromISODate(t.end) >= gridStart);
    if (!visible.length) { const e = document.createElement('div'); e.className = 'hz-empty'; e.textContent = trips.length ? 'No trips this month' : 'No trips yet — create one in Trip Wizard'; legend.appendChild(e); }
    visible.forEach(t => {
      const item = document.createElement('div'); item.className = 'hz-item';
      const nm = t.name.toUpperCase(); item.textContent = nm.length > 12 ? nm.slice(0, 12).trimEnd() + '…' : nm;
      item.style.color = hzColor(t); item.title = t.name;
      item.addEventListener('click', () => openTripFromHorizon(t));
      legend.appendChild(item);
    });
  }
  document.getElementById('horizonBtn').addEventListener('click', () => { const n = new Date(); hzMonth = new Date(n.getFullYear(), n.getMonth(), 1); renderHorizon(); horizonModal.classList.add('open'); });
  document.getElementById('hzPrev').addEventListener('click', () => { hzMonth = new Date(hzMonth.getFullYear(), hzMonth.getMonth() - 1, 1); renderHorizon(); });
  document.getElementById('hzNext').addEventListener('click', () => { hzMonth = new Date(hzMonth.getFullYear(), hzMonth.getMonth() + 1, 1); renderHorizon(); });
  document.getElementById('hzCloseBtn').addEventListener('click', closeHorizon);
  horizonModal.addEventListener('click', e => { if (e.target === horizonModal) closeHorizon(); });

  function refreshTripUI() { renderPipeline(); renderWizardShell(); renderNodeTrack(true); renderStepForm(); }
  function setActiveTrip(id) { activeTripId = id; saveActive(); dashSelected = ''; loadItinerary(); refreshTripUI(); }
  function loadTrips() {
    let list = [], act = '';
    let counter = 0;
    try { const raw = JSON.parse(localStorage.getItem(TRIPS_KEY)); if (raw && Array.isArray(raw.trips)) { list = normalizeTripList(raw.trips); if (Number.isInteger(raw.nextColor) && raw.nextColor > 0) counter = raw.nextColor; } } catch (e) {}
    try { act = localStorage.getItem(ACTIVE_KEY) || ''; } catch (e) {}
    nextColor = Math.max(counter, list.reduce((m, t) => t.colorIdx == null ? m : Math.max(m, t.colorIdx + 1), 0));
    const uncoloured = list.filter(t => t.colorIdx == null).sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
    uncoloured.forEach(giveColor);
    trips = list; tripSnaps = {};
    if (uncoloured.length || nextColor !== counter) saveTrips();
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
      const t = { id: newTripId(), name, start: toISODate(s), end: toISODate(e), startsAtHome, endsAtHome, modified: new Date().toISOString(), colorIdx: null, agencyRef: '', itinerary: newItinerary() };
      giveColor(t); trips.push(t); tripSnaps[t.id] = tripContent(t);
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
        btn.innerHTML = '<span class="ri">' + esc(fav.icon) + '</span><span class="rl">' + esc(fav.caption) + '</span><span class="fav-edit-pin">✎</span>';
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
        if (t.colorIdx == null) { const same = trips.find(x => x.id === t.id); if (same && same.colorIdx != null) t.colorIdx = same.colorIdx; else giveColor(t); }
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

  /* ============ OFFLINE MODE: sw.js saves the app on the phone; the badge and the Setup card show its state ============ */
  const OFFLINE_CACHE = 'crosswind-app';
  const offlineBadge = document.getElementById('offlineBadge'), offlineStatus = document.getElementById('offlineStatus'), clearCacheBtn = document.getElementById('clearCacheBtn'), offlineNote = document.getElementById('offlineNote');
  function offlineAvailable() { return 'serviceWorker' in navigator && !!window.caches && (location.protocol === 'https:' || location.hostname === 'localhost') && !window.Capacitor; }
  async function updateOfflineStatus() {
    offlineBadge.style.display = navigator.onLine ? 'none' : '';
    if (!offlineAvailable()) { offlineStatus.textContent = 'Offline mode is not available here (it needs the app opened from its https address).'; clearCacheBtn.disabled = true; return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) { offlineStatus.textContent = 'Not ready yet: open the app once while online and wait a moment.'; clearCacheBtn.disabled = true; return; }
      const cache = await caches.open(OFFLINE_CACHE), keys = await cache.keys(); let bytes = 0;
      for (const k of keys) { const r = await cache.match(k); if (r) bytes += (await r.clone().blob()).size; }
      let ver = ''; const page = await cache.match(new URL('index.html', document.baseURI).href);
      if (page) { const m = (await page.text()).match(/\(v(\d+\.\d+)\)/); if (m) ver = ', version v' + m[1]; }
      offlineStatus.textContent = keys.length ? 'Ready offline: ' + keys.length + ' files cached, ' + (bytes / 1048576).toFixed(1) + ' MB' + ver : 'Not ready yet: the offline copy is still downloading.';
      clearCacheBtn.disabled = !navigator.onLine || !keys.length;
      offlineNote.style.display = navigator.onLine ? 'none' : 'block'; if (!navigator.onLine) offlineNote.textContent = 'Clear cache needs an internet connection.';
    } catch (e) { offlineStatus.textContent = 'Could not read the offline copy.'; }
  }
  clearCacheBtn.addEventListener('click', async () => {
    if (!confirm('This removes the offline copy and downloads it again. Your trips and settings are not touched.')) return;
    clearCacheBtn.disabled = true; offlineNote.style.display = 'block'; offlineNote.textContent = 'Downloading the offline copy again…';
    try {
      await caches.delete(OFFLINE_CACHE);
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) throw new Error('no worker');
      const done = new Promise((res, rej) => { const on = ev => { if (ev.data === 'refilled') { navigator.serviceWorker.removeEventListener('message', on); res(); } else if (ev.data === 'refill-failed') { navigator.serviceWorker.removeEventListener('message', on); rej(new Error('failed')); } }; navigator.serviceWorker.addEventListener('message', on); setTimeout(() => rej(new Error('timeout')), 30000); });
      reg.active.postMessage('refill'); await done;
      offlineNote.textContent = '✓ Offline copy downloaded again';
    } catch (e) { offlineNote.textContent = 'Could not download the offline copy. Try again while online.'; }
    updateOfflineStatus();
  });
  window.addEventListener('online', updateOfflineStatus); window.addEventListener('offline', updateOfflineStatus);
  if (offlineAvailable()) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => setTimeout(updateOfflineStatus, 800), () => {}); });
  updateOfflineStatus();

  applyProfile(loadProfile());
  loadTrips();
  setTimeout(retryLocations, 1500);
  updateLastUsed();
  renderFavorites();
  renderAll();
})();
