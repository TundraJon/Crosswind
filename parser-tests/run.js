/* Parser regression check. Run from anywhere: node parser-tests/run.js
   Parses every text in samples/ with booking-parser.js (the date fixed at 19 Nov 2026 so the year-from-weekday logic is repeatable),
   compares it with expected.json, and exits with an error if anything differs. No dependencies. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
eval(fs.readFileSync(path.join(root, 'airports.js'), 'utf8').replace('window.CROSSWIND_AIRPORTS', 'global.window.CROSSWIND_AIRPORTS'));
const airports = global.window.CROSSWIND_AIRPORTS.map(a => ({ code: a[0], city: a[1], state: a[2], size: a[5] }));
const bookingPath = process.env.PARSER_FILE || path.join(root, 'booking-parser.js');
require(bookingPath); const B = global.window.CrosswindBooking;
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected.json'), 'utf8'));
const ctx = () => ({ airports, today: new Date('2026-11-19T12:00:00') });
const shape = r => ({
  rides: r.rides.map(x => [x.date, x.pickTime, x.dropTime, x.pickAddr, x.dropAddr]),
  flights: r.flights.map(f => [f.code + f.number, f.from, f.to, f.date, f.dep, f.arrDate, f.arr, f.conf || '', f.seat || '']),
  cars: r.cars.map(c => [c.company, c.conf, c.pickDate, c.pickTime, c.retDate, c.retTime, c.location]),
  hotels: r.hotels.map(h => [h.name, h.address, h.checkIn, h.checkOut, h.conf]),
  warnings: r.warnings
});
let failed = 0, total = 0;
Object.keys(expected).forEach(name => {
  const e = expected[name]; total++;
  const inputs = e.samples.map(s => ({ name: s, kind: 'text', text: fs.readFileSync(path.join(__dirname, 'samples', s + '.txt'), 'utf8') }));
  let got; try { got = shape(B.parse(inputs, ctx())); } catch (err) { got = { error: String(err) }; }
  const bad = Object.keys(e.expect).filter(k => JSON.stringify(got[k]) !== JSON.stringify(e.expect[k]));
  if (!bad.length) console.log('PASS ' + name);
  else { failed++; console.log('FAIL ' + name); bad.forEach(k => { console.log('  ' + k + ' expected: ' + JSON.stringify(e.expect[k])); console.log('  ' + k + '      got: ' + JSON.stringify(got[k])); }); }
});
console.log(failed ? '\n' + failed + ' of ' + total + ' FAILED' : '\nAll ' + total + ' passed');
process.exit(failed ? 1 : 0);
