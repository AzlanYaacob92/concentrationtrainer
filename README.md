/* ============================================================
   config.js — DATA: measure & parameter definitions
   ------------------------------------------------------------
   What lives here: the five concentration measures (names,
   units, placeholder examples), their display order, and the
   extra input parameters (densities, molar masses).
   Who edits this: anyone adding a new measure or changing
   labels/units — no coding logic here.
   ============================================================ */

/* ---------- measures ---------- */
const M = {
  molarity:{name:"Molarity",unit:"mol L⁻¹",ph:"e.g. 12.08"},
  molality:{name:"Molality",unit:"mol kg⁻¹",ph:"e.g. 16.10"},
  pmass:{name:"Percentage by mass",unit:"% (w/w)",ph:"e.g. 37"},
  pvol:{name:"Percentage by volume",unit:"% (v/v)",ph:"e.g. 40"},
  molefrac:{name:"Mole fraction (solute)",unit:"",ph:"e.g. 0.25"}
};
const order=["molarity","molality","pmass","pvol","molefrac"];

/* ---------- parameters ---------- */
const P = {
  rho:{cap:"Density of solution",unit:"g mL⁻¹",ph:"e.g. 1.19"},
  rhos:{cap:"Density of pure solute",unit:"g mL⁻¹",ph:"e.g. 0.79"},
  Ms:{cap:"Molar mass of solute",unit:"g mol⁻¹",ph:"e.g. 36.46"},
  Mw:{cap:"Molar mass of solvent",unit:"g mol⁻¹",ph:"e.g. 18.02"}
};
