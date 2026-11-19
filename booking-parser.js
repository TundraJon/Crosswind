/* Booking parser: turns calendar (.ics) files, booking PDFs' text, and pasted booking text into one trip model.
   Pure functions, no page access. window.CrosswindBooking.parse(inputs, ctx) where inputs = [{ name, kind: 'ics' | 'text', text }]
   and ctx = { airports: [{ code, city, state, size }], today: Date }.
   Model: { ref, flights, cars, hotels, warnings, stats }. Dates are ISO (YYYY-MM-DD); times are "h:mm AM". */
(function (root) {
  'use strict';

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const MON_RE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';
  const WD_RE = '(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)[a-z]*\\.?';
  const WEEKDAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const TIME_RE = '\\d{1,2}:\\d{2}\\s*[AaPp]\\.?[Mm]\\.?';
  const DATE_RE = '(?:' + WD_RE + ',?\\s+)?' + MON_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}';
  const NUMDATE_RE = '\\d{1,2}/\\d{1,2}/\\d{4}';
  const STATES = { alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC' };
  const STATE_ABBR = {}; Object.keys(STATES).forEach(k => STATE_ABBR[STATES[k]] = true);
  const CARRIERS = { WN: 'Southwest', DL: 'Delta', UA: 'United', AA: 'American', B6: 'JetBlue', AS: 'Alaska', NK: 'Spirit', F9: 'Frontier', G4: 'Allegiant', HA: 'Hawaiian', SY: 'Sun Country', MX: 'Breeze', QX: 'Horizon', OO: 'SkyWest', YX: 'Republic', '9E': 'Endeavor', AC: 'Air Canada', BA: 'British Airways', LH: 'Lufthansa', AF: 'Air France', KL: 'KLM', EK: 'Emirates', QR: 'Qatar', VS: 'Virgin Atlantic', WS: 'WestJet' };
  const RENTALS = ['Hertz', 'Avis', 'Budget', 'Enterprise', 'National', 'Alamo', 'Dollar', 'Thrifty', 'Sixt', 'Payless', 'Fox', 'Advantage', 'Zipcar', 'Turo'];
  const PREFERRED = ['MCO', 'CVG', 'ATL', 'DFW', 'ORD', 'LAX', 'JFK', 'EWR', 'IAD', 'DCA', 'BWI', 'MIA', 'SEA', 'SFO', 'PHX', 'DEN', 'DTW', 'MSP', 'BOS', 'PHL', 'LAS', 'SLC', 'IAH', 'FLL', 'TPA', 'SAN', 'PDX', 'STL', 'MDW', 'LGA', 'OAK', 'SJC', 'HOU', 'DAL'];

  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const flat = s => clean(String(s).replace(/\*+/g, ' '));
  function fmtTime(h, m, ap) { let hh = h % 12; if (hh === 0) hh = 12; return hh + ':' + pad(m) + ' ' + ap; }

  function parseTime(str) {
    const m = String(str || '').match(new RegExp('(\\d{1,2}):(\\d{2})\\s*([AaPp])\\.?[Mm]?\\.?'));
    if (!m) return null;
    let h = +m[1]; const mi = +m[2], ap = m[3].toUpperCase() + 'M';
    if (h < 1 || h > 12 || mi > 59) return null;
    return { h24: (h % 12) + (ap === 'PM' ? 12 : 0), m: mi, text: fmtTime(h, mi, ap) };
  }
  function weekdayIndex(s) { const m = String(s || '').match(/(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i); return m ? WEEKDAYS[m[1].toLowerCase()] : null; }
  /* A date from text: "Dec 06, 2026", "Sun Dec 06, 2026", "12/06/2026", "Saturday, August 1, 2026"; without a year ("Friday October 30") the weekday picks the year */
  function parseDate(str, today) {
    str = String(str || '');
    let m = str.match(new RegExp('(' + WD_RE + ')?,?\\s*(' + MON_RE + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})'));
    if (m) { const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; return iso(+m[4], mo, +m[3]); }
    m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return iso(+m[3], +m[1] - 1, +m[2]);
    m = str.match(new RegExp('(' + WD_RE + ')?,?\\s*(' + MON_RE + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b'));
    if (m) {
      const mo = MONTHS[m[2].slice(0, 3).toLowerCase()], day = +m[3], wd = weekdayIndex(m[1]), t = today || new Date();
      const ys = [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1, t.getFullYear() + 2];
      const ok = ys.filter(y => wd == null || new Date(y, mo, day).getDay() === wd);
      const future = ok.filter(y => new Date(y, mo, day) >= new Date(t.getFullYear(), t.getMonth(), t.getDate() - 30));
      const y = (future[0] != null ? future[0] : ok[0]); return y != null ? iso(y, mo, day) : null;
    }
    return null;
  }
  const addDays = (isoDate, n) => { const p = isoDate.split('-'); const d = new Date(+p[0], +p[1] - 1, +p[2] + n); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
  const minutes = t => { const p = parseTime(t); return p ? p.h24 * 60 + p.m : null; };

  /* ---- Airports: a name like "Cincinnati/N Kentucky" or "Orlando Intl, Florida" to a code ---- */
  function normName(s) { return String(s || '').toLowerCase().replace(/\b(intl|international|metropolitan|metro|airport|regional|municipal|field|memorial)\b/g, ' ').replace(/[^a-z/ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function resolveAirport(name, airports) {
    name = String(name || '').replace(/\*+/g, '').trim();
    if (!name || !airports || !airports.length) return { code: '', ambiguous: false };
    let state = '', rest = name;
    const sm = name.match(/,\s*([A-Za-z .]+)$/);
    if (sm) { const t = sm[1].trim(); if (STATE_ABBR[t.toUpperCase()] && t.length === 2) { state = t.toUpperCase(); rest = name.slice(0, sm.index); } else if (STATES[t.toLowerCase()]) { state = STATES[t.toLowerCase()]; rest = name.slice(0, sm.index); } }
    const hint = (/\b(?:n|north|northern)\.?\s+kentucky\b/i.test(rest) ? 'KY' : '');
    const first = normName(rest).split('/')[0].trim();
    if (!first) return { code: '', ambiguous: false };
    const intl = /\bint(?:l|ernational)\b/i.test(rest);
    let c = airports.filter(a => normName(a.city).split('/')[0].trim() === first);
    if (!c.length) c = airports.filter(a => normName(a.city).split('/')[0].trim().startsWith(first) || first.startsWith(normName(a.city).split('/')[0].trim()));
    const want = state || hint;
    if (want) { const s = c.filter(a => a.state === want); if (s.length) c = s; }
    if (!c.length) return { code: '', ambiguous: false };
    if (c.length === 1) return { code: c[0].code, ambiguous: false };
    const pref = c.filter(a => PREFERRED.indexOf(a.code) >= 0).sort((a, b) => PREFERRED.indexOf(a.code) - PREFERRED.indexOf(b.code));
    if (pref.length === 1 || (pref.length && intl)) return { code: pref[0].code, ambiguous: false };
    const rank = { L: 0, M: 1, S: 2 }, sorted = c.slice().sort((a, b) => (rank[a.size] - rank[b.size]));
    if (sorted.length > 1 && rank[sorted[0].size] < rank[sorted[1].size]) return { code: sorted[0].code, ambiguous: false };
    return { code: '', ambiguous: true, options: c.map(a => a.code) };
  }

  /* ---- Label / value reading: known labels divide a block; a value is whatever sits between one label and the next ---- */
  function splitLabels(text, labels) {
    const sorted = labels.slice().sort((a, b) => b.length - a.length);
    const re = new RegExp('(^|[\\s:])(' + sorted.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+').replace(/-/g, '[-\\s]?')).join('|') + ')(?=[\\s:]|$)', 'gi');
    const hits = []; let m;
    while ((m = re.exec(text))) hits.push({ label: m[2].replace(/\s+/g, ' ').toLowerCase().replace(/-/g, ''), start: m.index + m[1].length, end: m.index + m[0].length });
    const out = { _pre: clean(hits.length ? text.slice(0, hits[0].start) : text) };
    hits.forEach((h, i) => { const v = clean(text.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : text.length).replace(/^[\s:]+/, '')); if (out[h.label] == null) out[h.label] = v; });
    return out;
  }
  const firstDate = (s, today) => parseDate(s, today);

  /* ---- .ics ---- */
  function unfoldIcs(text) { return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n'); }
  function icsUnescape(s) { return String(s).replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\'); }
  function icsPairs(desc) {
    const out = {};
    icsUnescape(desc).split('\n').forEach(l => { const m = l.match(/^\s*([^:]{1,40}?)\s:\s*(.*)$/); if (m && out[m[1].trim().toLowerCase()] == null) out[m[1].trim().toLowerCase()] = m[2].trim(); });
    return out;
  }
  function parseIcs(text, ctx, res) {
    const lines = unfoldIcs(text); let ev = null;
    const events = [];
    lines.forEach(l => {
      if (/^BEGIN:VEVENT/i.test(l)) ev = {};
      else if (/^END:VEVENT/i.test(l)) { if (ev) events.push(ev); ev = null; }
      else if (ev && l.trim()) { const i = l.indexOf(':'); if (i > 0) { const k = l.slice(0, i).split(';')[0].toUpperCase(); if (ev[k] == null) ev[k] = l.slice(i + 1); } }
    });
    if (!events.length) res.warnings.push('No calendar events were found in the .ics file.');
    events.forEach(e => {
      const p = icsPairs(e.DESCRIPTION || ''), uid = e.UID || '';
      const um = uid.match(/_([A-Z0-9]{5,8})_\d+_\d+_\w+_(AIR|CAR|HOTEL)_?([^@]*)@/i) || uid.match(/^[a-z]+_([A-Z0-9]{5,8})_.*?_(AIR|CAR|HOTEL)_([^@]*)@/i);
      const type = um ? um[2].toUpperCase() : (p['flight no.'] ? 'AIR' : p['pick up'] ? 'CAR' : p['check-in'] ? 'HOTEL' : '');
      const ref = p['agency reference'] || (um ? um[1] : ''); if (ref && !res.ref) res.ref = ref;
      if (type === 'AIR') {
        const fn = String(p['flight no.'] || '').replace(/\s+/g, '').match(/^([A-Z0-9]{2})(\d{1,4})$/);
        if (!fn) { res.warnings.push('A flight event had no readable flight number.'); return; }
        const dep = String(p['departs'] || ''), arr = String(p['arrives'] || '');
        const ucode = (uid.match(/_([A-Z]{3})@/) || [])[1] || '';
        res.flights.push({ code: fn[1], number: String(+fn[2]), airline: p['carrier'] || '', date: parseDate(dep, ctx.today), dep: (parseTime(dep) || {}).text || '', arrDate: parseDate(arr, ctx.today), arr: (parseTime(arr) || {}).text || '',
          fromName: p['departure airport'] || '', toName: p['arrival airport'] || '', from: ucode, to: '', seat: p['seat'] || '', conf: p['airline check-in id'] || '', cls: p['class'] || '', src: 'ics' });
      } else if (type === 'CAR') {
        const pk = String(p['pick up'] || ''), dr = String(p['drop off'] || '');
        res.cars.push({ company: clean(String(p['company'] || '').replace(/\([^)]*\)/, '')) || clean((e.SUMMARY || '').split(' ')[3] || ''), conf: p['reference'] || '', pickDate: parseDate(pk, ctx.today), pickTime: (parseTime(pk) || {}).text || '', retDate: parseDate(dr, ctx.today), retTime: (parseTime(dr) || {}).text || '', location: p['rental location'] || '', retLocation: p['return location'] || '', src: 'ics' });
      } else if (type === 'HOTEL') {
        res.hotels.push({ name: p['name'] || '', address: p['address'] || '', checkIn: parseDate(p['check-in'] || '', ctx.today), checkOut: parseDate(p['check-out'] || '', ctx.today), conf: p['reference'] || '', src: 'ics' });
      } else res.warnings.push('A calendar event was not a flight, car, or hotel and was skipped.');
    });
  }

  /* ---- Text layouts ---- */
  function addFlight(res, f) { f.src = f.src || 'text'; res.flights.push(f); }

  /* Agency summary table (pasted or in the PDF text): Flight date From(MCO) - To(BNA) Carrier WN2816 8:35 AM- 9:45 AM */
  function agencySummary(t, ctx, res) {
    const T = TIME_RE;
    const re = new RegExp('Flight\\s+(' + DATE_RE + ')\\s+(.+?)\\(([A-Z]{3})\\)\\s*-\\s*(.+?)\\(([A-Z]{3})\\)\\s+(.+?)\\s+([A-Z0-9]{2})\\s?(\\d{1,4})\\s+(' + T + ')\\s*-\\s*(' + T + ')(?:\\s*\\((\\d)\\))?', 'g');
    let m, n = 0;
    while ((m = re.exec(t))) {
      if (m[2].length > 80 || m[4].length > 80) continue;
      n++;
      const date = parseDate(m[1], ctx.today), dep = parseTime(m[9]), arr = parseTime(m[10]);
      addFlight(res, { code: m[7], number: String(+m[8]), airline: clean(m[6]), date, dep: dep.text, arrDate: m[11] ? addDays(date, +m[11]) : null, arr: arr.text, from: m[3], to: m[5], fromName: clean(m[2]), toName: clean(m[4]), summary: true });
    }
    const hot = t.match(new RegExp('Hotel\\s+(' + DATE_RE + ')\\s*-\\s*(' + DATE_RE + ')\\s+(.+?)(?=\\s+(?:Flight|Car|Hotel)\\s+(?:' + WD_RE + ',?\\s+)?' + MON_RE + '|\\s*$)'));
    if (hot) {
      const toks = clean(hot[3]).split(' '); let k = toks.length; while (k > 0 && /^[A-Z0-9&'.\/#-]+$/.test(toks[k - 1])) k--;
      const name = toks.slice(k).join(' ') || clean(hot[3]);
      if (name && name.length < 80) res.hotels.push({ name, address: '', checkIn: parseDate(hot[1], ctx.today), checkOut: parseDate(hot[2], ctx.today), conf: '', summary: true, src: 'text' });
    }
    const car = t.match(new RegExp('Car\\s+(' + DATE_RE + ')\\s*-\\s*(' + DATE_RE + ')\\s+(.+?)\\s+(' + TIME_RE + ')\\s*-\\s*(' + TIME_RE + ')'));
    if (car) {
      const seg = car[3]; let comp = '';
      RENTALS.forEach(r => { if (!comp && new RegExp('\\b' + r + '\\b', 'i').test(seg)) comp = r; });
      const addr = clean(seg.replace(new RegExp('\\b' + comp + '\\b', 'i'), ''));
      res.cars.push({ company: comp, conf: '', pickDate: parseDate(car[1], ctx.today), pickTime: parseTime(car[4]).text, retDate: parseDate(car[2], ctx.today), retTime: parseTime(car[5]).text, location: addr, retLocation: addr, summary: true, src: 'text' });
    }
    return n;
  }
  /* Agency flight detail blocks in the PDF text: header rows "WN ..." / "2816 Orlando (MCO) Nashville ... (BNA)" then Departure / Arrival / Seat / check-in ID */
  function agencyDetail(rows, ctx, res) {
    const text = rows.join('\n');
    const re = /(?:^|\n)([A-Z0-9]{2})[ \t][^\n]*\n(\d{1,4})[ \t][^\n]*?\(([A-Z]{3})\)[^\n]*?\(([A-Z]{3})\)/g;
    const heads = []; let m;
    while ((m = re.exec(text))) heads.push({ code: m[1], number: String(+m[2]), from: m[3], to: m[4], start: m.index, end: re.lastIndex });
    heads.forEach((h, i) => {
      const body = text.slice(h.end, i + 1 < heads.length ? heads[i + 1].start : text.length).split(/\n(?:Invoice|General remarks)/)[0];
      const flatBody = body.replace(/\n/g, ' ');
      const dm = flatBody.match(new RegExp('Departure\\s+(' + DATE_RE + ')\\s+(' + TIME_RE + ')\\s+Arrival\\s+(' + DATE_RE + ')\\s+(' + TIME_RE + ')'));
      const seat = flatBody.match(/\bSeat\s+(\d{1,2}[A-Z])\b/), conf = flatBody.match(/Airline check-in ID\s+([A-Z0-9]{5,8})/), cls = flatBody.match(/\bClass\s+(.+?)\s+Seat\b/);
      if (!dm) { res.warnings.push('Flight ' + h.code + h.number + ' has a detail block with no readable departure and arrival.'); return; }
      addFlight(res, { code: h.code, number: h.number, date: parseDate(dm[1], ctx.today), dep: parseTime(dm[2]).text, arrDate: parseDate(dm[3], ctx.today), arr: parseTime(dm[4]).text, from: h.from, to: h.to, seat: seat ? seat[1] : '', conf: conf ? conf[1] : '', cls: cls ? clean(cls[1]) : '', detail: true });
    });
    return heads.length;
  }
  /* A car block and a hotel block pasted from the agency page (and the same blocks in the PDF text) */
  const CAR_LABELS = ['Pick up', 'Drop off charge', 'Drop off', 'Rental location', 'Return location', 'Type', 'Confirmation', 'Phone', 'Rate', 'Name', 'Approx. total', 'Corporate discount', 'Frequent renter ID', 'Special requests', 'Special info.'];
  const HOTEL_LABELS = ['Check-in', 'Check-out', 'Status', 'No of rooms', 'Phone', 'Guests', 'Fax', 'Rooms', 'Name', 'Rate', 'Approx. total', 'Confirmation', 'Guarantee', 'Corporate discount', 'Frequent guest ID', 'Special info.', 'Cancellation policy', 'Remarks'];
  function carBlock(t, ctx, res) {
    if (!/\bPick\s*up\b/i.test(t) || !/\bDrop\s*off\b/i.test(t)) return false;
    const s = splitLabels(t, CAR_LABELS);
    const pk = s['pick up'] || '', dr = s['drop off'] || '';
    const pre = (s._pre || '').split(/\n/)[0];
    let comp = ''; RENTALS.forEach(r => { if (!comp && new RegExp('\\b' + r + '\\b', 'i').test(s._pre)) comp = r; });
    if (!parseDate(pk, ctx.today)) return false;
    res.cars.push({ company: comp, conf: (s['confirmation'] || '').split(' ')[0], pickDate: parseDate(pk, ctx.today), pickTime: (parseTime(pk) || {}).text || '', retDate: parseDate(dr, ctx.today), retTime: (parseTime(dr) || {}).text || '', location: s['rental location'] || '', retLocation: s['return location'] || '', src: 'text', detail: true });
    return true;
  }
  /* Hotels: agency block, Marriott / brand emails, "Your Stay", motel emails with an "Arrival - Departure" table */
  function hotelEmail(raw, ctx, res) {
    const t = raw.replace(/\r/g, '');
    const f = flat(t);
    let cin = null, cout = null;
    let m = f.match(new RegExp('Check-?\\s?in\\W+(' + DATE_RE + ')\\s*(?:(' + TIME_RE + ')\\s*)?.{0,40}?Check-?\\s?out\\W+(' + DATE_RE + ')'));
    if (m) { cin = parseDate(m[1], ctx.today); cout = parseDate(m[3], ctx.today); }
    if (!cin) { m = f.match(new RegExp('Your Stay\\W+(' + DATE_RE + ')\\s*-\\s*(' + DATE_RE + ')', 'i')); if (m) { cin = parseDate(m[1], ctx.today); cout = parseDate(m[2], ctx.today); } }
    if (!cin) { m = f.match(new RegExp('Arrival\\s*-\\s*Departure.{0,120}?(' + NUMDATE_RE + ')\\s*-\\s*(' + NUMDATE_RE + ')')); if (m) { cin = parseDate(m[1], ctx.today); cout = parseDate(m[2], ctx.today); } }
    if (!cin) { m = f.match(new RegExp('Check-?\\s?in\\W+(' + DATE_RE + ').{0,60}?Check-?\\s?out\\W+(' + DATE_RE + ')', 'i')); if (m) { cin = parseDate(m[1], ctx.today); cout = parseDate(m[2], ctx.today); } }
    if (!cin || !cout) return false;
    /* confirmation: the labelled numbers must agree */
    const confs = []; let cm; const cre = /(?:Confirmation(?: number| code| #)?|Res Id|Reservation(?: number| #)?)\s*:?\s*\n?\s*([A-Z0-9][A-Z0-9-]{4,})/gi;
    while ((cm = cre.exec(t))) { const v = cm[1].toUpperCase(); if (!/^(NUMBER|CODE|DETAILS|POLICY|POLICIES)$/.test(v) && /\d/.test(v)) confs.push(v); }
    const conf = confs[0] || '';
    if (confs.some(c => c !== conf)) res.warnings.push('The hotel confirmation numbers in the text do not all match: ' + Array.from(new Set(confs)).join(', ') + '.');
    /* name */
    let name = '';
    const nameRes = [/Thank you for choosing\s+([^,.\n]+?)(?:,|\s+located|\.|\n)/i, /\bstay at\s+([^.\n]+?)\s+(?:is|will|has)\b/i, /\breservation at\s+([^.\n]+?)\s+(?:is|has|was)\b/i, /\bwelcome to\s+([^.\n!]+)/i];
    for (const r of nameRes) { const nm = t.match(r); if (nm) { name = clean(nm[1]); break; } }
    const lines = t.split('\n').map(clean).filter(Boolean);
    let address = '';
    const am = t.match(/(?:^|\n)\s*Address\s*[\t :]+(.+)/i);
    if (am) { address = clean(am[1]); const idx = lines.findIndex(l => /^Address\b/i.test(l)); if (!name && idx > 0) name = lines[idx - 1]; }
    if (!address) { const lm = t.match(/located at\s+(.+?)\s+in\s+([A-Za-z .'-]+?),\s*([A-Za-z ]+?)\s+for\b/i); if (lm) address = lm[1] + ', ' + lm[2] + ', ' + (STATES[lm[3].toLowerCase()] || lm[3]); }
    if (!address) { const ai = lines.findIndex((l, i) => /^\d{1,6}\s+\S+/.test(l) && i + 1 < lines.length && /^[A-Za-z .'-]+,?\s+[A-Za-z ]+?\s+\d{5}/.test(lines[i + 1])); if (ai >= 0) address = lines[ai] + ', ' + lines[ai + 1]; }
    if (!name) { const split = splitLabels(t, HOTEL_LABELS); const pre = String(split._pre || '').split(/\n/).map(clean).filter(Boolean); const pl = t.split('\n').map(clean).filter(Boolean); if (/\bCheck-?in\b/i.test(t) && pl.length && !/^(Check|Name|Status)/i.test(pl[0])) name = pl[0]; if (!address && pl[1] && /\d/.test(pl[1])) address = pl[1]; }
    if (!name) { const first = lines.find(l => l.length < 60 && !/^(hello|dear|hi)\b/i.test(l)); if (first) name = first; }
    res.hotels.push({ name: clean(name), address: clean(address), checkIn: cin, checkOut: cout, conf, src: 'text' });
    return true;
  }
  /* Southwest "Your itinerary": Flight 1: Sunday, 12/06/2026 ... FLIGHT WN #0843 DEPARTS BNA 10:50AM Nashville ARRIVES CVG 01:05PM */
  function southwest(t, ctx, res) {
    if (!/DEPARTS/.test(t) || !/ARRIVES/.test(t)) return 0;
    const f = flat(t); let n = 0;
    const heads = []; let m; const hre = new RegExp('Flight\\s+\\d+\\s*:\\s*(?:' + WD_RE + ',?\\s*)?(' + NUMDATE_RE + ')', 'g');
    while ((m = hre.exec(f))) heads.push({ date: parseDate(m[1], ctx.today), start: m.index, end: hre.lastIndex });
    const re = new RegExp('FLIGHT\\s+([A-Z0-9]{2})\\s*#\\s*(\\d+)\\s+DEPARTS\\s+([A-Z]{3})\\s+(' + TIME_RE.replace(/\\s\*/, '\\s*') + ')\\s+(.+?)\\s+ARRIVES\\s+([A-Z]{3})\\s+(' + TIME_RE + ')', 'g');
    while ((m = re.exec(f))) {
      const head = heads.filter(h => h.start < m.index).pop(); if (!head) { res.warnings.push('A flight in the itinerary had no date heading.'); continue; }
      n++;
      const d = parseTime(m[4]), a = parseTime(m[7]);
      const next = (a.h24 * 60 + a.m) < (d.h24 * 60 + d.m);
      addFlight(res, { code: m[1], number: String(+m[2]), date: head.date, dep: d.text, arrDate: next ? addDays(head.date, 1) : head.date, arr: a.text, from: m[3], to: m[6], inferredNextDay: next });
    }
    return n;
  }
  /* Delta "TRIP" page: DL 2058 / Operated by ... / City, State / 06:15 pm / City, State / 08:08 pm / seat */
  function delta(t, ctx, res) {
    if (!/\bDEPART\b/.test(t) || !/\bARRIVE\b/.test(t) || !/Operated by/i.test(t)) return 0;
    const f = flat(t); let n = 0;
    const states = Object.keys(STATES).map(s => s.replace(/ /g, '\\s+')).join('|');
    const dre = new RegExp('(' + WD_RE + ')\\s+(' + MON_RE + ')\\s+(\\d{1,2})', 'g'); const dates = []; let m;
    while ((m = dre.exec(f))) dates.push({ date: parseDate(m[0], ctx.today), start: m.index });
    const re = new RegExp('([A-Z0-9]{2})\\s(\\d{1,4})\\s+Operated by\\s+(.+?)\\s+(' + TIME_RE + ')\\s+(.+?)\\s+(' + TIME_RE + ')(?:\\s+on\\s+(' + MON_RE + '\\s+\\d{1,2}))?\\s+(\\d{1,2}[A-Z])\\b', 'gi');
    while ((m = re.exec(f))) {
      const head = dates.filter(d => d.start < m.index).pop(); if (!head || !head.date) { res.warnings.push('A Delta flight had no readable date.'); continue; }
      const seg = m[3], opEnd = seg.search(/(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Air Lines?|Airlines|Airways)(?![A-Za-z])(?!.*(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Air Lines?|Airlines|Airways)(?![A-Za-z]))/i);
      let fromName = seg; if (opEnd >= 0) fromName = seg.slice(opEnd).replace(/^(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Air Lines?|Airlines|Airways)\s*/i, '');
      n++;
      const d = parseTime(m[4]), a = parseTime(m[6]);
      let arrDate = head.date; if (m[7]) arrDate = parseDate(m[7] + ' ' + head.date.slice(0, 4), ctx.today) || head.date; else if (a.h24 * 60 + a.m < d.h24 * 60 + d.m) arrDate = addDays(head.date, 1);
      addFlight(res, { code: m[1].toUpperCase(), number: String(+m[2]), date: head.date, dep: d.text, arrDate, arr: a.text, fromName: clean(fromName), toName: clean(m[5]), seat: m[8].toUpperCase(), airline: /Delta/i.test(seg) ? 'Delta' : '' });
    }
    return n;
  }
  /* American check-in email: Confirmation code: X, a date, then CODE City TIME / AA 5795 ... destination / CODE City TIME */
  function american(t, ctx, res) {
    const cm = t.match(/Confirmation code:\s*([A-Z0-9]{5,8})/i); if (!cm || !/destination/i.test(t)) return 0;
    const f = flat(t); const dm = f.match(new RegExp('(' + DATE_RE + ')')); if (!dm) return 0;
    const date = parseDate(dm[1], ctx.today); let n = 0, m;
    const re = new RegExp('\\b([A-Z]{3})\\s+([A-Za-z][A-Za-z.\\/\' -]*?)\\s+(' + TIME_RE + ')\\s+([A-Z0-9]{2})\\s(\\d{1,4})\\b.*?\\bdestination\\s+([A-Z]{3})\\s+([A-Za-z][A-Za-z.\\/\' -]*?)\\s+(' + TIME_RE + ')', 'g');
    let day = date;
    while ((m = re.exec(f))) {
      const d = parseTime(m[3]), a = parseTime(m[8]); n++;
      addFlight(res, { code: m[4], number: String(+m[5]), date: day, dep: d.text, arrDate: (a.h24 * 60 + a.m) < (d.h24 * 60 + d.m) ? addDays(day, 1) : day, arr: a.text, from: m[1], to: m[6], fromName: clean(m[2]), toName: clean(m[7]), conf: cm[1].toUpperCase(), inferredNextDay: (a.h24 * 60 + a.m) < (d.h24 * 60 + d.m) });
    }
    return n;
  }

  /* Car and hotel blocks inside a longer text (the PDF) or alone (pasted): a name row, an address row, then a Pick up / Check-in row with its date on the same row */
  function findBlocks(text) {
    const marks = []; let m;
    const car = new RegExp('(?:^|\\n)([^\\n]+)\\n([^\\n]+)\\n(?=Pick[ \\t]*up[ \\t]+' + DATE_RE + ')', 'g');
    const hot = new RegExp('(?:^|\\n)([^\\n]+)\\n([^\\n]+)\\n(?=Check-?[ \\t]?in[ \\t]+' + DATE_RE + ')', 'gi');
    const fl = /(?:^|\n)[A-Z0-9]{2}[ \t][^\n]*\n\d{1,4}[ \t][^\n]*?\([A-Z]{3}\)/g;
    const st = m0 => m0.index + (m0[0].charAt(0) === '\n' ? 1 : 0);
    while ((m = car.exec(text))) marks.push({ type: 'car', start: st(m) });
    while ((m = hot.exec(text))) marks.push({ type: 'hotel', start: st(m) });
    while ((m = fl.exec(text))) marks.push({ type: 'flight', start: st(m) });
    marks.sort((a, b) => a.start - b.start);
    const endMark = (text.slice(0).search(/\n(?:Invoice\/Ticket|General remarks)/));
    return marks.map((mk, i) => ({ type: mk.type, text: text.slice(mk.start, i + 1 < marks.length ? marks[i + 1].start : (endMark > mk.start ? endMark : text.length)) })).filter(b => b.type !== 'flight');
  }

  /* ---- Merging and assembling ---- */
  function key(f) { return f.code + f.number + '|' + (f.date || ''); }
  function mergeFlights(list) {
    const map = {}, order = [];
    list.forEach(f => { const k = key(f); if (!map[k]) { map[k] = Object.assign({}, f); order.push(k); } else { const o = map[k]; Object.keys(f).forEach(p => { if (f[p] !== '' && f[p] != null && (o[p] === '' || o[p] == null)) o[p] = f[p]; }); if (f.detail) o.detail = true; } });
    return order.map(k => map[k]);
  }
  function parse(inputs, ctx) {
    ctx = ctx || {}; ctx.today = ctx.today || new Date();
    const res = { ref: '', flights: [], cars: [], hotels: [], rides: [], warnings: [], stats: { inputs: inputs.length } };
    let summaryCount = 0, detailCount = 0;
    inputs.forEach(inp => {
      let text = String(inp.text || '');
      if (inp.kind === 'ics' || /BEGIN:VCALENDAR/i.test(text)) { parseIcs(text, ctx, res); return; }
      text = joinLabelLines(text);
      const before = res.flights.length + res.cars.length + res.hotels.length + res.rides.length;
      const rm = text.match(/Agency reference:?\s*([A-Z0-9]{5,8})/i); if (rm && !res.ref) res.ref = rm[1].toUpperCase();
      const f = flat(text);
      summaryCount += agencySummary(f, ctx, res);
      detailCount += agencyDetail(text.split('\n').map(l => l.replace(/\s+$/, '')), ctx, res);
      southwest(text, ctx, res); delta(text, ctx, res); american(text, ctx, res);
      detailCount += bookingPageFlights(text, ctx, res); uber(text, ctx, res);
      const blocks = findBlocks(text); let gotHotel = false;
      blocks.forEach(b => { if (b.type === 'car') carBlock(b.text, ctx, res); else if (b.type === 'hotel') { if (hotelEmail(b.text, ctx, res)) gotHotel = true; } });
      if (!gotHotel && /\bCheck-?\s?in\b|Your Stay|Arrival\s*-\s*Departure/i.test(text) && !blocks.some(b => b.type === 'hotel')) hotelEmail(text, ctx, res);
      if (res.flights.length + res.cars.length + res.hotels.length + res.rides.length === before) res.warnings.push((inp.name ? inp.name + ': ' : '') + 'This layout was not recognised, so nothing was read from it.');
    });
    /* cross-check the agency summary against the detail blocks */
    if (summaryCount && detailCount && summaryCount !== detailCount) res.warnings.push('The itinerary summary lists ' + summaryCount + ' flights but the detail pages have ' + detailCount + '.');
    res.flights = mergeFlights(res.flights);
    /* airports: codes from names where missing; arrival from the next flight's departure when it connects */
    res.flights.sort((a, b) => ((a.date || '') + toMin(a.dep)).localeCompare((b.date || '') + toMin(b.dep)));
    res.flights.forEach((f, i) => {
      if (!f.from && f.fromName) { const r = resolveAirport(f.fromName, ctx.airports); f.from = r.code; if (r.ambiguous) f.fromOptions = r.options; }
      if (!f.to) { const nx = res.flights[i + 1]; if (nx && nx.from && nx.date && f.arrDate && (nx.date === f.arrDate || nx.date === f.date)) f.to = nx.from; }
      if (!f.to && f.toName) { const r = resolveAirport(f.toName, ctx.airports); f.to = r.code; if (r.ambiguous) f.toOptions = r.options; }
      if (!f.arrDate && f.date) f.arrDate = f.date;
      if (!f.airline && CARRIERS[f.code]) f.airline = CARRIERS[f.code];
      if (f.toName === '' && !f.to) f.to = '';
    });
    res.flights.forEach((f, i) => { const nx = res.flights[i + 1]; if (nx && f.to && nx.from && f.to !== nx.from && nx.date && nx.date === f.arrDate) res.warnings.push('Flight ' + f.code + f.number + ' lands at ' + f.to + ' but the next flight leaves from ' + nx.from + '.'); });
    res.cars = dedupeCars(res.cars);
    res.hotels = dedupeHotels(res.hotels);
    return res;
  }
  function toMin(t) { const m = minutes(t); return m == null ? '00000' : String(m).padStart(5, '0'); }
  function dedupeCars(list) { const out = []; list.forEach(c => { const o = out.find(x => x.pickDate === c.pickDate && (!x.company || !c.company || x.company.toLowerCase() === c.company.toLowerCase())); if (!o) out.push(Object.assign({}, c)); else Object.keys(c).forEach(p => { if (c[p] !== '' && c[p] != null && (o[p] === '' || o[p] == null)) o[p] = c[p]; }); }); return out; }
  function dedupeHotels(list) { const out = []; list.forEach(h => { const o = out.find(x => x.checkIn === h.checkIn); if (!o) out.push(Object.assign({}, h)); else Object.keys(h).forEach(p => { if (h[p] !== '' && h[p] != null && (o[p] === '' || o[p] == null || (p === 'name' && h[p].length > o[p].length))) o[p] = h[p]; }); }); return out; }

  /* ---- Trip layout: which flights belong to which stop, outbound or return ---- */
  function layout(model) {
    const flights = model.flights.slice(), hotels = model.hotels.slice().sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || '')), cars = model.cars.slice();
    const stops = [], returns = [];
    if (hotels.length) {
      hotels.forEach((h, i) => stops.push({ hotel: h, car: null, flights: [] }));
      flights.forEach(f => {
        const last = hotels[hotels.length - 1];
        if (last.checkOut && f.date >= last.checkOut) { returns.push(f); return; }
        let idx = hotels.findIndex(h => f.date <= h.checkIn);
        if (idx < 0) idx = hotels.length - 1;
        stops[idx].flights.push(f);
      });
      cars.forEach(c => { let idx = stops.findIndex(s => c.pickDate && s.hotel.checkIn && c.pickDate <= s.hotel.checkIn && !s.car); if (idx < 0) idx = stops.findIndex(s => !s.car); if (idx >= 0) stops[idx].car = c; else model.warnings.push('A rental car did not match a hotel stop and was left out.'); });
    } else {
      const s = { hotel: null, car: cars[0] || null, flights: [] }; stops.push(s);
      let gap = -1, gi = -1;
      for (let i = 1; i < flights.length; i++) { const g = (new Date(flights[i].date) - new Date(flights[i - 1].arrDate || flights[i - 1].date)) / 864e5; if (g > gap) { gap = g; gi = i; } }
      flights.forEach((f, i) => { if (gap >= 1 && i >= gi) returns.push(f); else s.flights.push(f); });
      if (cars.length > 1) model.warnings.push('There is more than one rental car and no hotel to place them; only the first is used.');
    }
    return { stops, returns };
  }
  function tripSummary(model) {
    const dates = []; model.flights.forEach(f => { if (f.date) dates.push(f.date); }); model.cars.forEach(c => { if (c.pickDate) dates.push(c.pickDate); if (c.retDate) dates.push(c.retDate); }); model.hotels.forEach(h => { if (h.checkIn) dates.push(h.checkIn); if (h.checkOut) dates.push(h.checkOut); });
    dates.sort(); const start = dates[0] || '', end = dates[dates.length - 1] || '';
    let city = ''; const h = model.hotels[0]; if (h && h.address) { const p = h.address.split(','); if (p.length >= 3) city = clean(p[p.length - 3 >= 0 ? p.length - 3 : 0]); const cm = h.address.match(/,\s*([A-Za-z .'-]+?),?\s+[A-Z]{2}\b/); if (cm) city = clean(cm[1]); }
    return { start, end, city };
  }

  /* PDF text items [{ s, x, y }] to lines: items on the same row (y within 3) joined left to right */
  function rowsFromItems(items) {
    const its = items.filter(i => String(i.s).trim()).slice().sort((a, b) => b.y - a.y || a.x - b.x), rows = [];
    its.forEach(i => { const r = rows.find(r => Math.abs(r.y - i.y) <= 3); if (r) r.items.push(i); else rows.push({ y: i.y, items: [i] }); });
    rows.sort((a, b) => b.y - a.y);
    return rows.map(r => r.items.sort((a, b) => a.x - b.x).map(i => String(i.s).trim()).join(' ')).join('\n');
  }


  /* ---- Booking text copied from a booking page: each label on its own line, its value on the next ---- */
  const LABEL_LINES = CAR_LABELS.concat(HOTEL_LABELS).map(l => l.toLowerCase().replace(/\.$/, ''));
  function isLabelLine(l) { return LABEL_LINES.indexOf(String(l).trim().toLowerCase().replace(/\.$/, '')) >= 0; }
  /* a line that is exactly a known label is joined to the line after it, unless that line is empty or is itself a label (a label with no value stays as it is) */
  function joinLabelLines(text) {
    const lines = String(text).split('\n'), out = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (isLabelLine(l) && i + 1 < lines.length && lines[i + 1].trim() && !isLabelLine(lines[i + 1])) { out.push(l.trim() + ' ' + lines[i + 1].trim()); i++; } else out.push(l);
    }
    return out.join('\n');
  }
  /* Flights in a booking page copy: airline code and number on their own lines, then city and airport (CODE) twice, then Departure and Arrival with a date and time on the next line, Seat, and the airline check-in ID */
  function bookingPageFlights(text, ctx, res) {
    const DT = '(?:' + WD_RE + ',?\\s+)?' + MON_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}';
    const re = new RegExp('(?:^|\\n)([A-Z0-9]{2})[ \\t]*\\n(\\d{1,4})[ \\t]*\\n[^\\n]+\\n[^\\n]*\\(([A-Z]{3})\\)[ \\t]*\\n+[^\\n]+\\n[^\\n]*\\(([A-Z]{3})\\)[ \\t]*\\nDeparture[ \\t]*\\n(' + DT + ')[ \\t]+(?:Time[ \\t]+)?(' + TIME_RE + ')[ \\t]*\\nArrival[ \\t]*\\n(' + DT + ')[ \\t]+(?:Time[ \\t]+)?(' + TIME_RE + ')([\\s\\S]*?)(?=\\n[A-Z0-9]{2}[ \\t]*\\n\\d{1,4}[ \\t]*\\n|$)', 'g');
    let m, n = 0;
    while ((m = re.exec(text))) {
      const date = parseDate(m[5], ctx.today), arrDate = parseDate(m[7], ctx.today), dep = parseTime(m[6]), arr = parseTime(m[8]); if (!date || !dep || !arr) continue;
      const seat = (m[9].match(/\nSeat[ \t]*\n(\d{1,2}[A-Z])/) || [])[1] || '', conf = (m[9].match(/Airline check-in ID\s+([A-Z0-9]{5,8})/) || [])[1] || '';
      n++; addFlight(res, { code: m[1], number: String(+m[2]), date, dep: dep.text, arrDate: arrDate || date, arr: arr.text, from: m[3], to: m[4], seat: seat.replace(/^0/, ''), conf, detail: true });
    }
    return n;
  }
  /* Uber: a reservation email ("Scheduled for", "Pickup at", "Dropoff at") or a trip receipt (a time and an address, twice, after "Trip details"); several emails in one text give several rides */
  function uber(text, ctx, res) {
    if (!/Uber/i.test(text)) return 0;
    const all = String(text).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim());
    const TM = new RegExp('(' + TIME_RE + ')', 'i'), MD = new RegExp('(?:' + WD_RE + ',?\\s*)?' + MON_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?', 'i');
    const isTime = l => new RegExp('^' + TIME_RE + '$', 'i').test(l), MILES = /\d+(?:\.\d+)?\s*miles?,\s*\d+\s*min/i;
    const starts = (re) => all.map((l, i) => re.test(l) ? i : -1).filter(i => i >= 0);
    let n = 0;
    const resStarts = starts(/^Scheduled for\b/i);
    resStarts.forEach((si, k) => {
      const lines = all.slice(si, k + 1 < resStarts.length ? resStarts[k + 1] : all.length);
      if (!lines.some(l => /^Pickup at\b/i.test(l))) return;
      const dl = lines.slice(1, 4).find(l => MD.test(l) && TM.test(l)); if (!dl) return;
      const after = i => { const out = []; for (let j = i + 1; j < lines.length; j++) { if (!lines[j] || /^(Pickup at|Dropoff at|Payment information)\b/i.test(lines[j])) break; out.push(lines[j]); } return out; };
      let dropTime = '', dropAddr = '', pickAddr = '';
      lines.forEach((l, i) => {
        if (/^Pickup at\b/i.test(l)) pickAddr = after(i).join(', ');
        else if (/^Dropoff at\b/i.test(l)) { const nx = MD.test(l) && TM.test(l) ? l : lines.slice(i + 1, i + 3).find(x => x); if (nx && MD.test(nx) && TM.test(nx)) dropTime = (parseTime(nx.match(TM)[1]) || {}).text || ''; else dropAddr = after(i).join(', '); }
      });
      res.rides.push({ date: parseDate(dl.match(MD)[0], ctx.today), pickTime: (parseTime(dl.match(TM)[1]) || {}).text || '', dropTime, pickAddr, dropAddr, src: 'text' }); n++;
    });
    const rcStarts = all.map((l, i) => /^Trip details\b/i.test(l) && all.slice(i, i + 6).some(x => MILES.test(x)) ? i : -1).filter(i => i >= 0);
    rcStarts.forEach((ti, k) => {
      const lines = all.slice(ti, k + 1 < rcStarts.length ? rcStarts[k + 1] : all.length), mi = lines.findIndex(l => MILES.test(l)), rest = lines.slice(mi + 1).filter(Boolean), a = rest.findIndex(isTime);
      if (a < 0 || !rest[a + 1] || !isTime(rest[a + 2] || '')) return;
      const body = lines.join('\n'), dm = body.match(new RegExp('(?:' + WD_RE + ',?\\s*)?' + MON_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}', 'i')) || body.match(new RegExp(WD_RE + ',?\\s+' + MON_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?\\b', 'i'));
      res.rides.push({ date: dm ? parseDate(dm[0], ctx.today) : '', pickTime: (parseTime(rest[a]) || {}).text || '', dropTime: (parseTime(rest[a + 2]) || {}).text || '', pickAddr: rest[a + 1], dropAddr: rest[a + 3] || '', src: 'text' }); n++;
    });
    return n;
  }

  root.CrosswindBooking = { parse, rowsFromItems, layout, tripSummary, parseDate, parseTime, resolveAirport, splitLabels, addDays, CARRIERS, STATES };
})(typeof window !== 'undefined' ? window : this);
