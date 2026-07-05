/* =============================================================
   chemistry.js  —  the conversion engine (pure logic, no UI)

   Everything here is about the chemistry, not the page.
   app.js reads from this file to build the interface and to
   generate the step-by-step working.

   The five measures we support:
     molarity        M   mol dm⁻³   (moles solute per litre of solution)
     molality        m   mol kg⁻¹   (moles solute per kg of solvent)
     mass_percent    %   %          (mass solute / mass solution × 100)
     volume_percent  %   %          (vol  solute / vol  solution × 100)
     mole_fraction   x   —          (moles solute / total moles)

   Every conversion uses the "basis" method taught in SK015: pick a
   convenient fixed amount of solution (1 L, 1 kg solvent, 100 g,
   100 mL, or 1 mol total), work out the pieces, then recombine.
   ============================================================= */

/* ---------- the five measures ---------- */
const MEASURES = {
  molarity: {
    id: 'molarity', name: 'Molarity', symbol: 'M', unit: 'mol dm⁻³', formulaSymbol: 'M',
    valueLabel: 'Molarity', min: 0, max: Infinity, rangeHint: 'a value greater than 0'
  },
  molality: {
    id: 'molality', name: 'Molality', symbol: '𝑚', unit: 'mol kg⁻¹', formulaSymbol: '<i>m</i>',
    valueLabel: 'Molality', min: 0, max: Infinity, rangeHint: 'a value greater than 0'
  },
  mass_percent: {
    id: 'mass_percent', name: 'Percentage by mass', symbol: '% w/w', unit: '%', formulaSymbol: '% w/w',
    valueLabel: 'Percentage by mass', min: 0, max: 100, rangeHint: 'a value between 0 and 100'
  },
  volume_percent: {
    id: 'volume_percent', name: 'Percentage by volume', symbol: '% V/V', unit: '%', formulaSymbol: '% V/V',
    valueLabel: 'Percentage by volume', min: 0, max: 100, rangeHint: 'a value between 0 and 100'
  },
  mole_fraction: {
    id: 'mole_fraction', name: 'Mole fraction', symbol: 'X', unit: '', formulaSymbol: 'X<sub>solute</sub>',
    valueLabel: 'Mole fraction of solute', min: 0, max: 1, rangeHint: 'a value between 0 and 1'
  }
};

/* order used in dropdowns */
const MEASURE_ORDER = ['molarity', 'molality', 'volume_percent', 'mass_percent', 'mole_fraction'];

/* ---------- the extra data fields a conversion might need ---------- */
const FIELDS = {
  Ms: { id: 'Ms', label: 'Molar mass of solute',    unit: 'g mol⁻¹', placeholder: 'e.g. 36.46' },
  Mv: { id: 'Mv', label: 'Molar mass of solvent',   unit: 'g mol⁻¹', placeholder: 'e.g. 18.02' },
  d:  { id: 'd',  label: 'Density of the solution', unit: 'g mL⁻¹',  placeholder: 'e.g. 1.18'  },
  ds: { id: 'ds', label: 'Density of pure solute',  unit: 'g mL⁻¹',  placeholder: 'e.g. 0.789' },
  dv: { id: 'dv', label: 'Density of pure solvent', unit: 'g mL⁻¹',  placeholder: 'e.g. 1.00'  }
};

/* ---------- number formatting for display ---------- */
function fmt(x, sig = 4) {
  if (!isFinite(x)) return '—';
  if (x === 0) return '0';
  // round to `sig` significant figures, drop trailing zeros
  const rounded = Number(x.toPrecision(sig));
  return String(rounded);
}

/* render "num ÷ den" as a stacked fraction (numerator over denominator,
   with a bar) instead of an inline ÷ symbol, so the working reads the
   way it would on paper. num/den are plain HTML strings — usually the
   output of fmt(), sometimes a short expression like "1.08 × 1000". */
function frac(num, den) {
  return `<span class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></span>`;
}

/* small helper so the additivity caveat reads the same everywhere */
const ADDITIVITY_NOTE =
  'Note: percentage-by-volume conversions assume the volumes add up (V₍solution₎ = V₍solute₎ + V₍solvent₎). ' +
  'This is a good approximation but not exact for real liquids.';

/* =============================================================
   THE CONVERTERS
   Keyed "from|to". Each has:
     requires : which FIELDS the user must supply
     compute  : (v, p) => { steps:[{strategy, math}], answer, answerText }
                v = source value, p = { Ms, Mv, d, ds, dv }
   ============================================================= */
const CONVERTERS = {

  /* ---------- FROM MOLARITY (basis: 1 L = 1000 mL of solution) ---------- */
  'molarity|molality': {
    requires: ['Ms', 'd'],
    oneLine: frac('1000 · M', '1000 · ρ<sub>solution</sub> − M · M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const massSol = 1000 * p.d;            // g of solution in 1 L
      const massSolute = v * p.Ms;           // g of solute
      const massSolvent = massSol - massSolute;
      const ans = 1000 * v / (1000 * p.d - v * p.Ms);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 1 L (1000 mL) of solution as the basis. Molarity tells us how many moles of solute are in that 1 L.',
            math: `n<sub>solute</sub> = M × V<sub>solution</sub> = ${fmt(v)} mol dm⁻³ × 1 dm³ = ${fmt(v)} mol` },
          { strategy: 'Use the density to find the mass of the whole solution, then subtract the mass of solute to get the mass of solvent (molality needs mass of solvent).',
            math: `m<sub>solution</sub> = V<sub>solution</sub> × ρ<sub>solution</sub> = 1000 mL × ${fmt(p.d)} g mL⁻¹ = ${fmt(massSol)} g<br>m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>m<sub>solvent</sub> = m<sub>solution</sub> − m<sub>solute</sub> = ${fmt(massSol)} − ${fmt(massSolute)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `<i>m</i> = ${frac('n<sub>solute</sub>', 'm<sub>solvent</sub>')} = ${frac(fmt(v), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'molarity|mass_percent': {
    requires: ['Ms', 'd'],
    oneLine: frac('M · M<sub>r</sub>(solute)', '10 · ρ<sub>solution</sub>'),
    compute: (v, p) => {
      const massSol = 1000 * p.d;
      const massSolute = v * p.Ms;
      const ans = massSolute / massSol * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 L of solution as the basis. Molarity gives the moles of solute in it.',
            math: `n<sub>solute</sub> = M × V<sub>solution</sub> = ${fmt(v)} mol dm⁻³ × 1 dm³ = ${fmt(v)} mol` },
          { strategy: 'Find the mass of solute (moles × molar mass) and the mass of the whole solution (volume × density).',
            math: `m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>m<sub>solution</sub> = V<sub>solution</sub> × ρ<sub>solution</sub> = 1000 × ${fmt(p.d)} = ${fmt(massSol)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ mass of solution × 100.',
            math: `% w/w = ${frac('m<sub>solute</sub>', 'm<sub>solution</sub>')} × 100 = ${frac(fmt(massSolute), fmt(massSol))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'molarity|mole_fraction': {
    requires: ['Ms', 'Mv', 'd'],
    oneLine: frac('M · M<sub>r</sub>(solvent)', 'M · M<sub>r</sub>(solvent) + 1000 · ρ<sub>solution</sub> − M · M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const massSol = 1000 * p.d;
      const massSolute = v * p.Ms;
      const massSolvent = massSol - massSolute;
      const nSolvent = massSolvent / p.Mv;
      const ans = v / (v + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 1 L of solution. Molarity gives the moles of solute directly.',
            math: `n<sub>solute</sub> = M × V<sub>solution</sub> = ${fmt(v)} mol dm⁻³ × 1 dm³ = ${fmt(v)} mol` },
          { strategy: 'Get the mass of solvent (density → mass of solution, minus mass of solute), then convert it to moles using the solvent’s molar mass.',
            math: `m<sub>solution</sub> = V<sub>solution</sub> × ρ<sub>solution</sub> = 1000 × ${fmt(p.d)} = ${fmt(massSol)} g<br>m<sub>solvent</sub> = m<sub>solution</sub> − m<sub>solute</sub> = ${fmt(massSol)} − ${fmt(massSolute)} = ${fmt(massSolvent)} g<br>n<sub>solvent</sub> = ${frac('m<sub>solvent</sub>', 'M<sub>r</sub>(solvent)')} = ${frac(fmt(massSolvent), fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `X<sub>solute</sub> = ${frac('n<sub>solute</sub>', 'n<sub>solute</sub> + n<sub>solvent</sub>')} = ${frac(fmt(v), fmt(v) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  'molarity|volume_percent': {
    requires: ['Ms', 'ds'],
    oneLine: frac('M · M<sub>r</sub>(solute)', '10 · ρ<sub>solute</sub>'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const volSolute = massSolute / p.ds;      // mL, within the 1000 mL basis
      const ans = volSolute / 1000 * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 L (1000 mL) of solution. Molarity gives the moles of solute in it. ' + ADDITIVITY_NOTE,
            math: `n<sub>solute</sub> = M × V<sub>solution</sub> = ${fmt(v)} mol dm⁻³ × 1 dm³ = ${fmt(v)} mol` },
          { strategy: 'Find the mass of solute, then convert to a volume using the solute’s own density.',
            math: `m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>V<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'ρ<sub>solute</sub>')} = ${frac(fmt(massSolute), fmt(p.ds))} = ${fmt(volSolute)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ volume of solution × 100.',
            math: `% V/V = ${frac('V<sub>solute</sub>', 'V<sub>solution</sub>')} × 100 = ${frac(fmt(volSolute), '1000')} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  /* ---------- FROM MOLALITY (basis: 1 kg = 1000 g of solvent) ---------- */
  'molality|molarity': {
    requires: ['Ms', 'd'],
    oneLine: frac('1000 · <i>m</i> · ρ<sub>solution</sub>', '1000 + <i>m</i> · M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const massSol = 1000 + massSolute;
      const volSol = massSol / p.d / 1000;      // L
      const ans = v / volSol;
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent as the basis. Molality gives the moles of solute dissolved in it directly with this assumption.',
            math: `n<sub>solute</sub> = <i>m</i> × m<sub>solvent</sub> = ${fmt(v)} mol kg⁻¹ × 1 kg = ${fmt(v)} mol` },
          { strategy: 'Find the total mass of solution (solvent + solute), then use density to get its volume in litres (molarity needs volume of solution).',
            math: `m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>m<sub>solution</sub> = m<sub>solvent</sub> + m<sub>solute</sub> = 1000 + ${fmt(massSolute)} = ${fmt(massSol)} g<br>V<sub>solution</sub> = ${frac('m<sub>solution</sub>', 'ρ<sub>solution</sub> × 1000')} = ${frac(fmt(massSol), fmt(p.d) + ' × 1000')} = ${fmt(volSol)} L` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac('n<sub>solute</sub>', 'V<sub>solution</sub>')} = ${frac(fmt(v), fmt(volSol))} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'molality|mass_percent': {
    requires: ['Ms'],
    oneLine: frac('100 · <i>m</i> · M<sub>r</sub>(solute)', '1000 + <i>m</i> · M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const massSol = 1000 + massSolute;
      const ans = massSolute / massSol * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent. Molality gives the moles of solute in it. No density is needed — both quantities here are masses.',
            math: `n<sub>solute</sub> = <i>m</i> × m<sub>solvent</sub> = ${fmt(v)} mol kg⁻¹ × 1 kg = ${fmt(v)} mol` },
          { strategy: 'Find the mass of solute, then the mass of the whole solution.',
            math: `m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>m<sub>solution</sub> = m<sub>solvent</sub> + m<sub>solute</sub> = 1000 + ${fmt(massSolute)} = ${fmt(massSol)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ mass of solution × 100.',
            math: `% w/w = ${frac('m<sub>solute</sub>', 'm<sub>solution</sub>')} × 100 = ${frac(fmt(massSolute), fmt(massSol))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'molality|mole_fraction': {
    requires: ['Mv'],
    oneLine: frac('<i>m</i> · M<sub>r</sub>(solvent)', '<i>m</i> · M<sub>r</sub>(solvent) + 1000'),
    compute: (v, p) => {
      const nSolvent = 1000 / p.Mv;
      const ans = v / (v + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent. Molality gives the moles of solute directly.',
            math: `n<sub>solute</sub> = <i>m</i> × m<sub>solvent</sub> = ${fmt(v)} mol kg⁻¹ × 1 kg = ${fmt(v)} mol` },
          { strategy: 'Convert the 1000 g of solvent into moles using the solvent’s molar mass.',
            math: `n<sub>solvent</sub> = ${frac('m<sub>solvent</sub>', 'M<sub>r</sub>(solvent)')} = ${frac('1000', fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `X<sub>solute</sub> = ${frac('n<sub>solute</sub>', 'n<sub>solute</sub> + n<sub>solvent</sub>')} = ${frac(fmt(v), fmt(v) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  'molality|volume_percent': {
    requires: ['Ms', 'ds', 'dv'],
    oneLine: frac('100 · <i>m</i> · M<sub>r</sub>(solute) · ρ<sub>solvent</sub>', '<i>m</i> · M<sub>r</sub>(solute) · ρ<sub>solvent</sub> + 1000 · ρ<sub>solute</sub>'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const volSolute = massSolute / p.ds;
      const volSolvent = 1000 / p.dv;          // 1000 g of solvent → volume
      const ans = volSolute / (volSolute + volSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent. Molality gives the moles of solute. ' + ADDITIVITY_NOTE,
            math: `n<sub>solute</sub> = <i>m</i> × m<sub>solvent</sub> = ${fmt(v)} mol kg⁻¹ × 1 kg = ${fmt(v)} mol` },
          { strategy: 'Convert the solute to a volume (via its mass and density), and convert the 1000 g of solvent to a volume too.',
            math: `m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>V<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'ρ<sub>solute</sub>')} = ${frac(fmt(massSolute), fmt(p.ds))} = ${fmt(volSolute)} mL<br>V<sub>solvent</sub> = ${frac('m<sub>solvent</sub>', 'ρ<sub>solvent</sub>')} = ${frac('1000', fmt(p.dv))} = ${fmt(volSolvent)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ total volume × 100.',
            math: `% V/V = ${frac('V<sub>solute</sub>', 'V<sub>solute</sub> + V<sub>solvent</sub>')} × 100 = ${frac(fmt(volSolute), fmt(volSolute) + ' + ' + fmt(volSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  /* ---------- FROM PERCENTAGE BY MASS (basis: 100 g of solution) ---------- */
  'mass_percent|molarity': {
    requires: ['Ms', 'd'],
    oneLine: frac('10 · % w/w · ρ<sub>solution</sub>', 'M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const massSolute = v;                    // g in 100 g solution
      const nSolute = massSolute / p.Ms;
      const volSol = 100 / p.d / 1000;         // L
      const ans = nSolute / volSol;
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 100 g of solution as the basis. The percentage by mass is then simply the number of grams of solute.',
            math: `m<sub>solute</sub> = % w/w × m<sub>solution</sub> = ${fmt(v)}% × 100 g = ${fmt(v)} g` },
          { strategy: 'Convert that mass to moles, and use density to find the volume of the 100 g of solution in litres.',
            math: `n<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'M<sub>r</sub>(solute)')} = ${frac(fmt(v), fmt(p.Ms))} = ${fmt(nSolute)} mol<br>V<sub>solution</sub> = ${frac('m<sub>solution</sub>', 'ρ<sub>solution</sub> × 1000')} = ${frac('100', fmt(p.d) + ' × 1000')} = ${fmt(volSol)} L` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac('n<sub>solute</sub>', 'V<sub>solution</sub>')} = ${frac(fmt(nSolute), fmt(volSol))} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'mass_percent|molality': {
    requires: ['Ms'],
    oneLine: frac('1000 · % w/w', 'M<sub>r</sub>(solute) · (100 − % w/w)'),
    compute: (v, p) => {
      const massSolute = v;
      const massSolvent = 100 - v;
      const nSolute = massSolute / p.Ms;
      const ans = nSolute / (massSolvent / 1000);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 100 g of solution. The percentage by mass is the grams of solute; the rest is solvent. No density needed.',
            math: `m<sub>solute</sub> = % w/w × m<sub>solution</sub> = ${fmt(v)}% × 100 g = ${fmt(v)} g<br>m<sub>solvent</sub> = m<sub>solution</sub> − m<sub>solute</sub> = 100 − ${fmt(v)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg` },
          { strategy: 'Convert the mass of solute to moles.',
            math: `n<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'M<sub>r</sub>(solute)')} = ${frac(fmt(v), fmt(p.Ms))} = ${fmt(nSolute)} mol` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `<i>m</i> = ${frac('n<sub>solute</sub>', 'm<sub>solvent</sub>')} = ${frac(fmt(nSolute), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'mass_percent|mole_fraction': {
    requires: ['Ms', 'Mv'],
    oneLine: frac('% w/w · M<sub>r</sub>(solvent)', '% w/w · M<sub>r</sub>(solvent) + (100 − % w/w) · M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const nSolute = v / p.Ms;
      const nSolvent = (100 - v) / p.Mv;
      const ans = nSolute / (nSolute + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 100 g of solution. The percentage by mass gives grams of solute; the remainder is solvent.',
            math: `m<sub>solute</sub> = % w/w × m<sub>solution</sub> = ${fmt(v)}% × 100 g = ${fmt(v)} g<br>m<sub>solvent</sub> = m<sub>solution</sub> − m<sub>solute</sub> = 100 − ${fmt(v)} = ${fmt(100 - v)} g` },
          { strategy: 'Convert each mass to moles using its molar mass.',
            math: `n<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'M<sub>r</sub>(solute)')} = ${frac(fmt(v), fmt(p.Ms))} = ${fmt(nSolute)} mol<br>n<sub>solvent</sub> = ${frac('m<sub>solvent</sub>', 'M<sub>r</sub>(solvent)')} = ${frac(fmt(100 - v), fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `X<sub>solute</sub> = ${frac('n<sub>solute</sub>', 'n<sub>solute</sub> + n<sub>solvent</sub>')} = ${frac(fmt(nSolute), fmt(nSolute) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  'mass_percent|volume_percent': {
    requires: ['ds', 'dv'],
    oneLine: frac('100 · % w/w · ρ<sub>solvent</sub>', '% w/w · ρ<sub>solvent</sub> + (100 − % w/w) · ρ<sub>solute</sub>'),
    compute: (v, p) => {
      const volSolute = v / p.ds;
      const volSolvent = (100 - v) / p.dv;
      const ans = volSolute / (volSolute + volSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 100 g of solution. The percentage by mass gives grams of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `m<sub>solute</sub> = % w/w × m<sub>solution</sub> = ${fmt(v)}% × 100 g = ${fmt(v)} g<br>m<sub>solvent</sub> = m<sub>solution</sub> − m<sub>solute</sub> = 100 − ${fmt(v)} = ${fmt(100 - v)} g` },
          { strategy: 'Convert each mass to a volume using its own density.',
            math: `V<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'ρ<sub>solute</sub>')} = ${frac(fmt(v), fmt(p.ds))} = ${fmt(volSolute)} mL<br>V<sub>solvent</sub> = ${frac('m<sub>solvent</sub>', 'ρ<sub>solvent</sub>')} = ${frac(fmt(100 - v), fmt(p.dv))} = ${fmt(volSolvent)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ total volume × 100.',
            math: `% V/V = ${frac('m<sub>solute</sub>', 'm<sub>solute</sub> + m<sub>solvent</sub>')} × 100 = ${frac(fmt(volSolute), fmt(volSolute) + ' + ' + fmt(volSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  /* ---------- FROM PERCENTAGE BY VOLUME (basis: 100 mL of solution) ---------- */
  'volume_percent|molarity': {
    requires: ['ds', 'Ms'],
    oneLine: frac('10 · % V/V · ρ<sub>solute</sub>', 'M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const volSolute = v;                     // mL in 100 mL solution
      const massSolute = volSolute * p.ds;
      const nSolute = massSolute / p.Ms;
      const ans = nSolute / 0.1;                // 100 mL = 0.1 L
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume is the millilitres of solute. ' + ADDITIVITY_NOTE,
            math: `V<sub>solute</sub> = % V/V × V<sub>solution</sub> = ${fmt(v)}% × 100 mL = ${fmt(v)} mL<br>V<sub>solution</sub> = 100 mL = 0.1 L` },
          { strategy: 'Turn the volume of solute into a mass (its own density) and then into moles.',
            math: `m<sub>solute</sub> = V<sub>solute</sub> × ρ<sub>solute</sub> = ${fmt(v)} × ${fmt(p.ds)} = ${fmt(massSolute)} g<br>n<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'M<sub>r</sub>(solute)')} = ${frac(fmt(massSolute), fmt(p.Ms))} = ${fmt(nSolute)} mol` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac('n<sub>solute</sub>', 'V<sub>solution</sub>')} = ${frac(fmt(nSolute), '0.1')} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'volume_percent|molality': {
    requires: ['ds', 'dv', 'Ms'],
    oneLine: frac('1000 · % V/V · ρ<sub>solute</sub>', 'M<sub>r</sub>(solute) · (100 − % V/V) · ρ<sub>solvent</sub>'),
    compute: (v, p) => {
      const massSolute = v * p.ds;
      const massSolvent = (100 - v) * p.dv;
      const nSolute = massSolute / p.Ms;
      const ans = nSolute / (massSolvent / 1000);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume gives mL of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `V<sub>solute</sub> = % V/V × V<sub>solution</sub> = ${fmt(v)}% × 100 mL = ${fmt(v)} mL<br>V<sub>solvent</sub> = V<sub>solution</sub> − V<sub>solute</sub> = 100 − ${fmt(v)} = ${fmt(100 - v)} mL` },
          { strategy: 'Convert both volumes to masses using their densities, then convert the solute mass to moles.',
            math: `m<sub>solute</sub> = V<sub>solute</sub> × ρ<sub>solute</sub> = ${fmt(v)} × ${fmt(p.ds)} = ${fmt(massSolute)} g<br>m<sub>solvent</sub> = V<sub>solvent</sub> × ρ<sub>solvent</sub> = ${fmt(100 - v)} × ${fmt(p.dv)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg<br>n<sub>solute</sub> = ${frac('m<sub>solute</sub>', 'M<sub>r</sub>(solute)')} = ${frac(fmt(massSolute), fmt(p.Ms))} = ${fmt(nSolute)} mol` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `<i>m</i> = ${frac('n<sub>solute</sub>', 'm<sub>solvent</sub>')} = ${frac(fmt(nSolute), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'volume_percent|mass_percent': {
    requires: ['ds', 'dv'],
    oneLine: frac('100 · % V/V · ρ<sub>solute</sub>', '% V/V · ρ<sub>solute</sub> + (100 − % V/V) · ρ<sub>solvent</sub>'),
    compute: (v, p) => {
      const massSolute = v * p.ds;
      const massSolvent = (100 - v) * p.dv;
      const ans = massSolute / (massSolute + massSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume gives mL of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `V<sub>solute</sub> = % V/V × V<sub>solution</sub> = ${fmt(v)}% × 100 mL = ${fmt(v)} mL<br>V<sub>solvent</sub> = V<sub>solution</sub> − V<sub>solute</sub> = 100 − ${fmt(v)} = ${fmt(100 - v)} mL` },
          { strategy: 'Convert each volume to a mass using its density.',
            math: `m<sub>solute</sub> = V<sub>solute</sub> × ρ<sub>solute</sub> = ${fmt(v)} × ${fmt(p.ds)} = ${fmt(massSolute)} g<br>m<sub>solvent</sub> = V<sub>solvent</sub> × ρ<sub>solvent</sub> = ${fmt(100 - v)} × ${fmt(p.dv)} = ${fmt(massSolvent)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ total mass × 100.',
            math: `% w/w = ${frac('m<sub>solute</sub>', 'm<sub>solute</sub> + m<sub>solvent</sub>')} × 100 = ${frac(fmt(massSolute), fmt(massSolute) + ' + ' + fmt(massSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'volume_percent|mole_fraction': {
    requires: ['ds', 'dv', 'Ms', 'Mv'],
    oneLine: frac('% V/V · ρ<sub>solute</sub> · M<sub>r</sub>(solvent)', '% V/V · ρ<sub>solute</sub> · M<sub>r</sub>(solvent) + (100 − % V/V) · ρ<sub>solvent</sub> · M<sub>r</sub>(solute)'),
    compute: (v, p) => {
      const nSolute = (v * p.ds) / p.Ms;
      const nSolvent = ((100 - v) * p.dv) / p.Mv;
      const ans = nSolute / (nSolute + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume gives mL of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `V<sub>solute</sub> = % V/V × V<sub>solution</sub> = ${fmt(v)}% × 100 mL = ${fmt(v)} mL<br>V<sub>solvent</sub> = V<sub>solution</sub> − V<sub>solute</sub> = 100 − ${fmt(v)} = ${fmt(100 - v)} mL` },
          { strategy: 'Convert each volume → mass (density) → moles (molar mass).',
            math: `n<sub>solute</sub> = ${frac('V<sub>solute</sub> × ρ<sub>solute</sub>', 'M<sub>r</sub>(solute)')} = ${frac(fmt(v) + ' × ' + fmt(p.ds), fmt(p.Ms))} = ${fmt(nSolute)} mol<br>n<sub>solvent</sub> = ${frac('V<sub>solvent</sub> × ρ<sub>solvent</sub>', 'M<sub>r</sub>(solvent)')} = ${frac(fmt(100 - v) + ' × ' + fmt(p.dv), fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `X<sub>solute</sub> = ${frac('n<sub>solute</sub>', 'n<sub>solute</sub> + n<sub>solvent</sub>')} = ${frac(fmt(nSolute), fmt(nSolute) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  /* ---------- FROM MOLE FRACTION (basis: 1 mol of solution total) ---------- */
  'mole_fraction|molarity': {
    requires: ['Ms', 'Mv', 'd'],
    oneLine: frac('1000 · X<sub>solute</sub> · ρ<sub>solution</sub>', 'X<sub>solute</sub> · M<sub>r</sub>(solute) + (1 − X<sub>solute</sub>) · M<sub>r</sub>(solvent)'),
    compute: (v, p) => {
      const nSolute = v, nSolvent = 1 - v;
      const massSol = nSolute * p.Ms + nSolvent * p.Mv;
      const volSol = massSol / p.d / 1000;     // L
      const ans = nSolute / volSol;
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction splits it into moles of solute and moles of solvent.',
            math: `n<sub>solute</sub> = X<sub>solute</sub> × n<sub>total</sub> = ${fmt(v)} × 1 = ${fmt(v)} mol<br>n<sub>solvent</sub> = (1 − X<sub>solute</sub>) × n<sub>total</sub> = (1 − ${fmt(v)}) × 1 = ${fmt(1 - v)} mol` },
          { strategy: 'Find the total mass (each moles × molar mass), then use density to get the volume of solution in litres.',
            math: `m<sub>solution</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) + n<sub>solvent</sub> × M<sub>r</sub>(solvent) = ${fmt(v)}×${fmt(p.Ms)} + ${fmt(1 - v)}×${fmt(p.Mv)} = ${fmt(massSol)} g<br>V<sub>solution</sub> = ${frac('m<sub>solution</sub>', 'ρ<sub>solution</sub> × 1000')} = ${frac(fmt(massSol), fmt(p.d) + ' × 1000')} = ${fmt(volSol)} L` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac('n<sub>solute</sub>', 'V<sub>solution</sub>')} = ${frac(fmt(v), fmt(volSol))} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'mole_fraction|molality': {
    requires: ['Mv'],
    oneLine: frac('1000 · X<sub>solute</sub>', '(1 − X<sub>solute</sub>) · M<sub>r</sub>(solvent)'),
    compute: (v, p) => {
      const nSolute = v, nSolvent = 1 - v;
      const massSolvent = nSolvent * p.Mv;
      const ans = nSolute / (massSolvent / 1000);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction gives moles of solute and moles of solvent.',
            math: `n<sub>solute</sub> = X<sub>solute</sub> × n<sub>total</sub> = ${fmt(v)} × 1 = ${fmt(v)} mol<br>n<sub>solvent</sub> = (1 − X<sub>solute</sub>) × n<sub>total</sub> = (1 − ${fmt(v)}) × 1 = ${fmt(1 - v)} mol` },
          { strategy: 'Convert the moles of solvent into a mass in kilograms.',
            math: `m<sub>solvent</sub> = n<sub>solvent</sub> × M<sub>r</sub>(solvent) = ${fmt(1 - v)} × ${fmt(p.Mv)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `<i>m</i> = ${frac('n<sub>solute</sub>', 'm<sub>solvent</sub>')} = ${frac(fmt(v), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'mole_fraction|mass_percent': {
    requires: ['Ms', 'Mv'],
    oneLine: frac('100 · X<sub>solute</sub> · M<sub>r</sub>(solute)', 'X<sub>solute</sub> · M<sub>r</sub>(solute) + (1 − X<sub>solute</sub>) · M<sub>r</sub>(solvent)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const massSolvent = (1 - v) * p.Mv;
      const ans = massSolute / (massSolute + massSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction gives moles of solute and solvent.',
            math: `n<sub>solute</sub> = X<sub>solute</sub> × n<sub>total</sub> = ${fmt(v)} × 1 = ${fmt(v)} mol<br>n<sub>solvent</sub> = (1 − X<sub>solute</sub>) × n<sub>total</sub> = (1 − ${fmt(v)}) × 1 = ${fmt(1 - v)} mol` },
          { strategy: 'Convert each to a mass using its molar mass.',
            math: `m<sub>solute</sub> = n<sub>solute</sub> × M<sub>r</sub>(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>m<sub>solvent</sub> = n<sub>solvent</sub> × M<sub>r</sub>(solvent) = ${fmt(1 - v)} × ${fmt(p.Mv)} = ${fmt(massSolvent)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ total mass × 100.',
            math: `% w/w = ${frac('m<sub>solute</sub>', 'm<sub>solute</sub> + m<sub>solvent</sub>')} × 100 = ${frac(fmt(massSolute), fmt(massSolute) + ' + ' + fmt(massSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'mole_fraction|volume_percent': {
    requires: ['Ms', 'Mv', 'ds', 'dv'],
    oneLine: frac('100 · X<sub>solute</sub> · M<sub>r</sub>(solute) · ρ<sub>solvent</sub>', 'X<sub>solute</sub> · M<sub>r</sub>(solute) · ρ<sub>solvent</sub> + (1 − X<sub>solute</sub>) · M<sub>r</sub>(solvent) · ρ<sub>solute</sub>'),
    compute: (v, p) => {
      const volSolute = (v * p.Ms) / p.ds;
      const volSolvent = ((1 - v) * p.Mv) / p.dv;
      const ans = volSolute / (volSolute + volSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction gives moles of solute and solvent. ' + ADDITIVITY_NOTE,
            math: `n<sub>solute</sub> = X<sub>solute</sub> × n<sub>total</sub> = ${fmt(v)} × 1 = ${fmt(v)} mol<br>n<sub>solvent</sub> = (1 − X<sub>solute</sub>) × n<sub>total</sub> = (1 − ${fmt(v)}) × 1 = ${fmt(1 - v)} mol` },
          { strategy: 'Convert each to a volume: moles → mass (molar mass) → volume (density).',
            math: `V<sub>solute</sub> = ${frac('n<sub>solute</sub> × M<sub>r</sub>(solute)', 'ρ<sub>solute</sub>')} = ${frac(fmt(v) + ' × ' + fmt(p.Ms), fmt(p.ds))} = ${fmt(volSolute)} mL<br>V<sub>solvent</sub> = ${frac('n<sub>solvent</sub> × M<sub>r</sub>(solvent)', 'ρ<sub>solvent</sub>')} = ${frac(fmt(1 - v) + ' × ' + fmt(p.Mv), fmt(p.dv))} = ${fmt(volSolvent)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ total volume × 100.',
            math: `% V/V = ${frac('V<sub>solute</sub>', 'V<sub>solute</sub> + V<sub>solvent</sub>')} × 100 = ${frac(fmt(volSolute), fmt(volSolute) + ' + ' + fmt(volSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  }
};

/* ---------- basis-assumption footnotes ----------
   Every conversion's first working step picks a convenient basis amount
   (1 L of solution, 1 kg of solvent, 100 g of solution, 100 mL of
   solution, or 1 mol in total). That amount is a free choice — the final
   concentration is intensive, so the answer is identical whatever you
   pick — and each basis step carries a short note explaining why THAT
   particular amount is the simplest one. The basis depends only on the
   SOURCE measure, so the notes are keyed by "from". Injected onto steps[0]
   automatically below, so the individual compute functions stay focused
   on the chemistry and there is only one place to edit the wording. */
const BASIS_FOOTNOTES = {
  molarity:       'Any volume of solution works and the final answer is the same, but 1 L is simplest because molarity already gives the moles of solute in exactly 1 L.',
  molality:       'Any mass of solvent works and the final answer is the same, but 1 kg is simplest because molality is defined per kilogram of solvent.',
  mass_percent:   'Any mass of solution works and the final answer is the same, but 100 g is simplest because the percentage by mass then reads straight off as grams of solute.',
  volume_percent: 'Any volume of solution works and the final answer is the same, but 100 mL is simplest because the percentage by volume then reads straight off as millilitres of solute.',
  mole_fraction:  'Any total amount works and the final answer is the same, but 1 mol total is simplest because the mole fractions then read straight off as the moles of solute and solvent.'
};

// Wrap every converter's compute so its basis step (step 1) gains the
// footnote for its source measure, without touching 20 step definitions.
Object.keys(CONVERTERS).forEach(key => {
  const from = key.split('|')[0];
  const note = BASIS_FOOTNOTES[from];
  if (!note) return;
  const conv = CONVERTERS[key];
  const originalCompute = conv.compute;
  conv.compute = function (v, p) {
    const result = originalCompute(v, p);
    if (result && result.steps && result.steps[0] && !result.steps[0].footnote) {
      result.steps[0] = Object.assign({}, result.steps[0], { footnote: note });
    }
    return result;
  };
});

/* ---------- helper: look up a converter and its required fields ---------- */
function getConverter(fromId, toId) {
  return CONVERTERS[`${fromId}|${toId}`] || null;
}

/* Expose to the browser (app.js) and to Node (for testing) */
if (typeof window !== 'undefined') {
  window.CHEM = { MEASURES, MEASURE_ORDER, FIELDS, CONVERTERS, getConverter, fmt, frac };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MEASURES, MEASURE_ORDER, FIELDS, CONVERTERS, getConverter, fmt, frac };
}
