/* Smoke test for the conversion engine — run with `node test-chemistry.js`.
   Checks that all 20 measure pairs give a sane answer for one realistic
   solution, and that the plausibility guard catches impossible inputs. */
const { MEASURES, MEASURE_ORDER, getConverter } = require('./chemistry.js');

// A realistic-ish ethanol/water solution, plus a plausible source value per measure.
const p = { Ms: 46.07, Mv: 18.02, d: 0.97, ds: 0.789, dv: 1.00 };
const src = { molarity: 2.0, molality: 2.2, mass_percent: 10, volume_percent: 12, mole_fraction: 0.04 };

let fail = 0;
for (const from of MEASURE_ORDER) {
  for (const to of MEASURE_ORDER) {
    if (from === to) continue;
    const c = getConverter(from, to);
    if (!c) { console.log(`MISSING ${from}|${to}`); fail++; continue; }
    const r = c.compute(src[from], p);
    if (r.error) { console.log(`ERR  ${from}->${to}: ${r.error.slice(0, 60)}…`); fail++; continue; }
    const m = MEASURES[to];
    const ok = isFinite(r.answer) && r.answer > 0 && r.answer < m.max;
    if (!ok) { console.log(`BAD  ${from}->${to} = ${r.answer}`); fail++; }
    else console.log(`ok   ${from}->${to} = ${Number(r.answer.toPrecision(4))} ${m.unit}`);
  }
}

console.log('\n--- guard should now catch these ---');
// Molarity far too high for the stated density: solvent mass goes negative.
const bad1 = getConverter('molarity', 'molality').compute(30, p);
console.log('M=30 -> molality :', bad1.error ? 'CAUGHT' : `LEAKED ${bad1.answer}`);
// Exactly enough solute to use up the whole solution mass: divide by zero.
const bad2 = getConverter('molarity', 'molality').compute(1000 * p.d / p.Ms, p);
console.log('no solvent left  :', bad2.error ? 'CAUGHT' : `LEAKED ${bad2.answer}`);
// Solute volume exceeds the 1 L basis -> over 100 % by volume.
const bad3 = getConverter('molarity', 'volume_percent').compute(18, p);
console.log('%V/V over 100    :', bad3.error ? 'CAUGHT' : `LEAKED ${bad3.answer}`);

process.exit(fail ? 1 : 0);
