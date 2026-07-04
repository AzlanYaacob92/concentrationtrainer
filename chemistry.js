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
    id: 'molality', name: 'Molality', symbol: 'm', unit: 'mol kg⁻¹', formulaSymbol: 'm',
    valueLabel: 'Molality', min: 0, max: Infinity, rangeHint: 'a value greater than 0'
  },
  mass_percent: {
    id: 'mass_percent', name: 'Percentage by mass', symbol: '% w/w', unit: '%', formulaSymbol: 'P<sub>m</sub>',
    valueLabel: 'Percentage by mass', min: 0, max: 100, rangeHint: 'a value between 0 and 100'
  },
  volume_percent: {
    id: 'volume_percent', name: 'Percentage by volume', symbol: '% v/v', unit: '%', formulaSymbol: 'P<sub>v</sub>',
    valueLabel: 'Percentage by volume', min: 0, max: 100, rangeHint: 'a value between 0 and 100'
  },
  mole_fraction: {
    id: 'mole_fraction', name: 'Mole fraction', symbol: 'x', unit: '', formulaSymbol: 'x',
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
    oneLine: frac('1000 · M', '1000 · ρ − M · M(solute)'),
    compute: (v, p) => {
      const massSol = 1000 * p.d;            // g of solution in 1 L
      const massSolute = v * p.Ms;           // g of solute
      const massSolvent = massSol - massSolute;
      const ans = 1000 * v / (1000 * p.d - v * p.Ms);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 1 L (1000 mL) of solution as the basis. Molarity tells us how many moles of solute are in that 1 L.',
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Use the density to find the mass of the whole solution, then subtract the mass of solute to get the mass of solvent (molality needs mass of solvent).',
            math: `mass(solution) = 1000 mL × ${fmt(p.d)} g mL⁻¹ = ${fmt(massSol)} g<br>mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>mass(solvent) = ${fmt(massSol)} − ${fmt(massSolute)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `m = ${frac(fmt(v), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'molarity|mass_percent': {
    requires: ['Ms', 'd'],
    oneLine: frac('M · M(solute)', '10 · ρ'),
    compute: (v, p) => {
      const massSol = 1000 * p.d;
      const massSolute = v * p.Ms;
      const ans = massSolute / massSol * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 L of solution as the basis. Molarity gives the moles of solute in it.',
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Find the mass of solute (moles × molar mass) and the mass of the whole solution (volume × density).',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>mass(solution) = 1000 × ${fmt(p.d)} = ${fmt(massSol)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ mass of solution × 100.',
            math: `% w/w = ${frac(fmt(massSolute), fmt(massSol))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'molarity|mole_fraction': {
    requires: ['Ms', 'Mv', 'd'],
    oneLine: frac('M · M(solvent)', 'M · M(solvent) + 1000 · ρ − M · M(solute)'),
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
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Get the mass of solvent (density → mass of solution, minus mass of solute), then convert it to moles using the solvent’s molar mass.',
            math: `mass(solution) = 1000 × ${fmt(p.d)} = ${fmt(massSol)} g<br>mass(solvent) = ${fmt(massSol)} − ${fmt(massSolute)} = ${fmt(massSolvent)} g<br>n(solvent) = ${frac(fmt(massSolvent), fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `x = ${frac(fmt(v), fmt(v) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  'molarity|volume_percent': {
    requires: ['Ms', 'ds'],
    oneLine: frac('M · M(solute)', '10 · ρ(solute)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const volSolute = massSolute / p.ds;      // mL, within the 1000 mL basis
      const ans = volSolute / 1000 * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 L (1000 mL) of solution. Molarity gives the moles of solute in it. ' + ADDITIVITY_NOTE,
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Find the mass of solute, then convert to a volume using the solute’s own density.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>V(solute) = ${frac(fmt(massSolute), fmt(p.ds))} = ${fmt(volSolute)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ volume of solution × 100.',
            math: `% v/v = ${frac(fmt(volSolute), '1000')} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  /* ---------- FROM MOLALITY (basis: 1 kg = 1000 g of solvent) ---------- */
  'molality|molarity': {
    requires: ['Ms', 'd'],
    oneLine: frac('1000 · m · ρ', '1000 + m · M(solute)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const massSol = 1000 + massSolute;
      const volSol = massSol / p.d / 1000;      // L
      const ans = v / volSol;
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent as the basis. Molality gives the moles of solute dissolved in it.',
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Find the total mass of solution (solvent + solute), then use density to get its volume in litres (molarity needs volume of solution).',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>mass(solution) = 1000 + ${fmt(massSolute)} = ${fmt(massSol)} g<br>V(solution) = ${frac(fmt(massSol), fmt(p.d) + ' × 1000')} = ${fmt(volSol)} L` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac(fmt(v), fmt(volSol))} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'molality|mass_percent': {
    requires: ['Ms'],
    oneLine: frac('100 · m · M(solute)', '1000 + m · M(solute)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const massSol = 1000 + massSolute;
      const ans = massSolute / massSol * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent. Molality gives the moles of solute in it. No density is needed — both quantities here are masses.',
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Find the mass of solute, then the mass of the whole solution.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>mass(solution) = 1000 + ${fmt(massSolute)} = ${fmt(massSol)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ mass of solution × 100.',
            math: `% w/w = ${frac(fmt(massSolute), fmt(massSol))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'molality|mole_fraction': {
    requires: ['Mv'],
    oneLine: frac('m · M(solvent)', 'm · M(solvent) + 1000'),
    compute: (v, p) => {
      const nSolvent = 1000 / p.Mv;
      const ans = v / (v + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent. Molality gives the moles of solute directly.',
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Convert the 1000 g of solvent into moles using the solvent’s molar mass.',
            math: `n(solvent) = ${frac('1000', fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `x = ${frac(fmt(v), fmt(v) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  'molality|volume_percent': {
    requires: ['Ms', 'ds', 'dv'],
    oneLine: frac('100 · m · M(solute) · ρ(solvent)', 'm · M(solute) · ρ(solvent) + 1000 · ρ(solute)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const volSolute = massSolute / p.ds;
      const volSolvent = 1000 / p.dv;          // 1000 g of solvent → volume
      const ans = volSolute / (volSolute + volSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 kg (1000 g) of solvent. Molality gives the moles of solute. ' + ADDITIVITY_NOTE,
            math: `n(solute) = ${fmt(v)} mol` },
          { strategy: 'Convert the solute to a volume (via its mass and density), and convert the 1000 g of solvent to a volume too.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>V(solute) = ${frac(fmt(massSolute), fmt(p.ds))} = ${fmt(volSolute)} mL<br>V(solvent) = ${frac('1000', fmt(p.dv))} = ${fmt(volSolvent)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ total volume × 100.',
            math: `% v/v = ${frac(fmt(volSolute), fmt(volSolute) + ' + ' + fmt(volSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  /* ---------- FROM PERCENTAGE BY MASS (basis: 100 g of solution) ---------- */
  'mass_percent|molarity': {
    requires: ['Ms', 'd'],
    oneLine: frac('10 · P<sub>m</sub> · ρ', 'M(solute)'),
    compute: (v, p) => {
      const massSolute = v;                    // g in 100 g solution
      const nSolute = massSolute / p.Ms;
      const volSol = 100 / p.d / 1000;         // L
      const ans = nSolute / volSol;
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 100 g of solution as the basis. The percentage by mass is then simply the number of grams of solute.',
            math: `mass(solute) = ${fmt(v)} g` },
          { strategy: 'Convert that mass to moles, and use density to find the volume of the 100 g of solution in litres.',
            math: `n(solute) = ${frac(fmt(v), fmt(p.Ms))} = ${fmt(nSolute)} mol<br>V(solution) = ${frac('100', fmt(p.d) + ' × 1000')} = ${fmt(volSol)} L` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac(fmt(nSolute), fmt(volSol))} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'mass_percent|molality': {
    requires: ['Ms'],
    oneLine: frac('1000 · P<sub>m</sub>', 'M(solute) · (100 − P<sub>m</sub>)'),
    compute: (v, p) => {
      const massSolute = v;
      const massSolvent = 100 - v;
      const nSolute = massSolute / p.Ms;
      const ans = nSolute / (massSolvent / 1000);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 100 g of solution. The percentage by mass is the grams of solute; the rest is solvent. No density needed.',
            math: `mass(solute) = ${fmt(v)} g<br>mass(solvent) = 100 − ${fmt(v)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg` },
          { strategy: 'Convert the mass of solute to moles.',
            math: `n(solute) = ${frac(fmt(v), fmt(p.Ms))} = ${fmt(nSolute)} mol` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `m = ${frac(fmt(nSolute), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'mass_percent|mole_fraction': {
    requires: ['Ms', 'Mv'],
    oneLine: frac('P<sub>m</sub> · M(solvent)', 'P<sub>m</sub> · M(solvent) + (100 − P<sub>m</sub>) · M(solute)'),
    compute: (v, p) => {
      const nSolute = v / p.Ms;
      const nSolvent = (100 - v) / p.Mv;
      const ans = nSolute / (nSolute + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 100 g of solution. The percentage by mass gives grams of solute; the remainder is solvent.',
            math: `mass(solute) = ${fmt(v)} g, mass(solvent) = ${fmt(100 - v)} g` },
          { strategy: 'Convert each mass to moles using its molar mass.',
            math: `n(solute) = ${frac(fmt(v), fmt(p.Ms))} = ${fmt(nSolute)} mol<br>n(solvent) = ${frac(fmt(100 - v), fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `x = ${frac(fmt(nSolute), fmt(nSolute) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  'mass_percent|volume_percent': {
    requires: ['ds', 'dv'],
    oneLine: frac('100 · P<sub>m</sub> · ρ(solvent)', 'P<sub>m</sub> · ρ(solvent) + (100 − P<sub>m</sub>) · ρ(solute)'),
    compute: (v, p) => {
      const volSolute = v / p.ds;
      const volSolvent = (100 - v) / p.dv;
      const ans = volSolute / (volSolute + volSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 100 g of solution. The percentage by mass gives grams of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `mass(solute) = ${fmt(v)} g, mass(solvent) = ${fmt(100 - v)} g` },
          { strategy: 'Convert each mass to a volume using its own density.',
            math: `V(solute) = ${frac(fmt(v), fmt(p.ds))} = ${fmt(volSolute)} mL<br>V(solvent) = ${frac(fmt(100 - v), fmt(p.dv))} = ${fmt(volSolvent)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ total volume × 100.',
            math: `% v/v = ${frac(fmt(volSolute), fmt(volSolute) + ' + ' + fmt(volSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  /* ---------- FROM PERCENTAGE BY VOLUME (basis: 100 mL of solution) ---------- */
  'volume_percent|molarity': {
    requires: ['ds', 'Ms'],
    oneLine: frac('10 · P<sub>v</sub> · ρ(solute)', 'M(solute)'),
    compute: (v, p) => {
      const volSolute = v;                     // mL in 100 mL solution
      const massSolute = volSolute * p.ds;
      const nSolute = massSolute / p.Ms;
      const ans = nSolute / 0.1;                // 100 mL = 0.1 L
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume is the millilitres of solute. ' + ADDITIVITY_NOTE,
            math: `V(solute) = ${fmt(v)} mL, V(solution) = 100 mL = 0.1 L` },
          { strategy: 'Turn the volume of solute into a mass (its own density) and then into moles.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.ds)} = ${fmt(massSolute)} g<br>n(solute) = ${frac(fmt(massSolute), fmt(p.Ms))} = ${fmt(nSolute)} mol` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac(fmt(nSolute), '0.1')} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'volume_percent|molality': {
    requires: ['ds', 'dv', 'Ms'],
    oneLine: frac('1000 · P<sub>v</sub> · ρ(solute)', 'M(solute) · (100 − P<sub>v</sub>) · ρ(solvent)'),
    compute: (v, p) => {
      const massSolute = v * p.ds;
      const massSolvent = (100 - v) * p.dv;
      const nSolute = massSolute / p.Ms;
      const ans = nSolute / (massSolvent / 1000);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume gives mL of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `V(solute) = ${fmt(v)} mL, V(solvent) = ${fmt(100 - v)} mL` },
          { strategy: 'Convert both volumes to masses using their densities, then convert the solute mass to moles.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.ds)} = ${fmt(massSolute)} g<br>mass(solvent) = ${fmt(100 - v)} × ${fmt(p.dv)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg<br>n(solute) = ${frac(fmt(massSolute), fmt(p.Ms))} = ${fmt(nSolute)} mol` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `m = ${frac(fmt(nSolute), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'volume_percent|mass_percent': {
    requires: ['ds', 'dv'],
    oneLine: frac('100 · P<sub>v</sub> · ρ(solute)', 'P<sub>v</sub> · ρ(solute) + (100 − P<sub>v</sub>) · ρ(solvent)'),
    compute: (v, p) => {
      const massSolute = v * p.ds;
      const massSolvent = (100 - v) * p.dv;
      const ans = massSolute / (massSolute + massSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume gives mL of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `V(solute) = ${fmt(v)} mL, V(solvent) = ${fmt(100 - v)} mL` },
          { strategy: 'Convert each volume to a mass using its density.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.ds)} = ${fmt(massSolute)} g<br>mass(solvent) = ${fmt(100 - v)} × ${fmt(p.dv)} = ${fmt(massSolvent)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ total mass × 100.',
            math: `% w/w = ${frac(fmt(massSolute), fmt(massSolute) + ' + ' + fmt(massSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'volume_percent|mole_fraction': {
    requires: ['ds', 'dv', 'Ms', 'Mv'],
    oneLine: frac('P<sub>v</sub> · ρ(solute) · M(solvent)', 'P<sub>v</sub> · ρ(solute) · M(solvent) + (100 − P<sub>v</sub>) · ρ(solvent) · M(solute)'),
    compute: (v, p) => {
      const nSolute = (v * p.ds) / p.Ms;
      const nSolvent = ((100 - v) * p.dv) / p.Mv;
      const ans = nSolute / (nSolute + nSolvent);
      return {
        answer: ans, answerText: `Mole fraction of solute = ${fmt(ans)}`,
        steps: [
          { strategy: 'Take 100 mL of solution. The percentage by volume gives mL of solute; the rest is solvent. ' + ADDITIVITY_NOTE,
            math: `V(solute) = ${fmt(v)} mL, V(solvent) = ${fmt(100 - v)} mL` },
          { strategy: 'Convert each volume → mass (density) → moles (molar mass).',
            math: `n(solute) = ${frac(fmt(v) + ' × ' + fmt(p.ds), fmt(p.Ms))} = ${fmt(nSolute)} mol<br>n(solvent) = ${frac(fmt(100 - v) + ' × ' + fmt(p.dv), fmt(p.Mv))} = ${fmt(nSolvent)} mol` },
          { strategy: 'Mole fraction of solute = moles of solute ÷ total moles.',
            math: `x = ${frac(fmt(nSolute), fmt(nSolute) + ' + ' + fmt(nSolvent))} = ${fmt(ans)}` }
        ]
      };
    }
  },

  /* ---------- FROM MOLE FRACTION (basis: 1 mol of solution total) ---------- */
  'mole_fraction|molarity': {
    requires: ['Ms', 'Mv', 'd'],
    oneLine: frac('1000 · x · ρ', 'x · M(solute) + (1 − x) · M(solvent)'),
    compute: (v, p) => {
      const nSolute = v, nSolvent = 1 - v;
      const massSol = nSolute * p.Ms + nSolvent * p.Mv;
      const volSol = massSol / p.d / 1000;     // L
      const ans = nSolute / volSol;
      return {
        answer: ans, answerText: `Molarity = ${fmt(ans)} mol dm⁻³`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction splits it into moles of solute and moles of solvent.',
            math: `n(solute) = ${fmt(v)} mol, n(solvent) = ${fmt(1 - v)} mol` },
          { strategy: 'Find the total mass (each moles × molar mass), then use density to get the volume of solution in litres.',
            math: `mass(solution) = ${fmt(v)}×${fmt(p.Ms)} + ${fmt(1 - v)}×${fmt(p.Mv)} = ${fmt(massSol)} g<br>V(solution) = ${frac(fmt(massSol), fmt(p.d) + ' × 1000')} = ${fmt(volSol)} L` },
          { strategy: 'Molarity = moles of solute ÷ litres of solution.',
            math: `M = ${frac(fmt(v), fmt(volSol))} = ${fmt(ans)} mol dm⁻³` }
        ]
      };
    }
  },

  'mole_fraction|molality': {
    requires: ['Mv'],
    oneLine: frac('1000 · x', '(1 − x) · M(solvent)'),
    compute: (v, p) => {
      const nSolute = v, nSolvent = 1 - v;
      const massSolvent = nSolvent * p.Mv;
      const ans = nSolute / (massSolvent / 1000);
      return {
        answer: ans, answerText: `Molality = ${fmt(ans)} mol kg⁻¹`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction gives moles of solute and moles of solvent.',
            math: `n(solute) = ${fmt(v)} mol, n(solvent) = ${fmt(1 - v)} mol` },
          { strategy: 'Convert the moles of solvent into a mass in kilograms.',
            math: `mass(solvent) = ${fmt(1 - v)} × ${fmt(p.Mv)} = ${fmt(massSolvent)} g = ${fmt(massSolvent/1000)} kg` },
          { strategy: 'Molality = moles of solute ÷ kilograms of solvent.',
            math: `m = ${frac(fmt(v), fmt(massSolvent/1000))} = ${fmt(ans)} mol kg⁻¹` }
        ]
      };
    }
  },

  'mole_fraction|mass_percent': {
    requires: ['Ms', 'Mv'],
    oneLine: frac('100 · x · M(solute)', 'x · M(solute) + (1 − x) · M(solvent)'),
    compute: (v, p) => {
      const massSolute = v * p.Ms;
      const massSolvent = (1 - v) * p.Mv;
      const ans = massSolute / (massSolute + massSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by mass = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction gives moles of solute and solvent.',
            math: `n(solute) = ${fmt(v)} mol, n(solvent) = ${fmt(1 - v)} mol` },
          { strategy: 'Convert each to a mass using its molar mass.',
            math: `mass(solute) = ${fmt(v)} × ${fmt(p.Ms)} = ${fmt(massSolute)} g<br>mass(solvent) = ${fmt(1 - v)} × ${fmt(p.Mv)} = ${fmt(massSolvent)} g` },
          { strategy: 'Percentage by mass = mass of solute ÷ total mass × 100.',
            math: `% w/w = ${frac(fmt(massSolute), fmt(massSolute) + ' + ' + fmt(massSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  },

  'mole_fraction|volume_percent': {
    requires: ['Ms', 'Mv', 'ds', 'dv'],
    oneLine: frac('100 · x · M(solute) · ρ(solvent)', 'x · M(solute) · ρ(solvent) + (1 − x) · M(solvent) · ρ(solute)'),
    compute: (v, p) => {
      const volSolute = (v * p.Ms) / p.ds;
      const volSolvent = ((1 - v) * p.Mv) / p.dv;
      const ans = volSolute / (volSolute + volSolvent) * 100;
      return {
        answer: ans, answerText: `Percentage by volume = ${fmt(ans)} %`,
        steps: [
          { strategy: 'Take 1 mol of solution in total. The mole fraction gives moles of solute and solvent. ' + ADDITIVITY_NOTE,
            math: `n(solute) = ${fmt(v)} mol, n(solvent) = ${fmt(1 - v)} mol` },
          { strategy: 'Convert each to a volume: moles → mass (molar mass) → volume (density).',
            math: `V(solute) = ${frac(fmt(v) + ' × ' + fmt(p.Ms), fmt(p.ds))} = ${fmt(volSolute)} mL<br>V(solvent) = ${frac(fmt(1 - v) + ' × ' + fmt(p.Mv), fmt(p.dv))} = ${fmt(volSolvent)} mL` },
          { strategy: 'Percentage by volume = volume of solute ÷ total volume × 100.',
            math: `% v/v = ${frac(fmt(volSolute), fmt(volSolute) + ' + ' + fmt(volSolvent))} × 100 = ${fmt(ans)} %` }
        ]
      };
    }
  }
};

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
