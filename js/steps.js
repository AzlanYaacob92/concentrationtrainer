/* ============================================================
   steps.js — CHEMISTRY: step-by-step worked solutions
   ------------------------------------------------------------
   What lives here: BASIS (the "assume 100 g / 1 L / 1 kg…"
   opening step for each starting measure) and STEPS (the full
   basis-method working for every from|to pair).
   Who edits this: the chemistry-content owner — this is where
   the pedagogy lives.
   Depends on: format.js (fmt via g). Used by: ui.js.
   ============================================================ */

/* ---------- step-by-step builders (basis method) ---------- */
const g = x => fmt(x);
const S = (title,formula,subst,result)=>({title,formula,subst,result});
const BASIS = {
  pmass:["Assume 100 g of solution.","Percentage by mass is defined per 100 g, so the mass of solute is immediate. The basis cancels later, so any mass gives the same answer."],
  pvol:["Assume 100 mL of solution.","Percentage by volume is defined per 100 mL of solution, so the volume of solute is immediate. The basis cancels later, so any volume gives the same answer."],
  molarity:["Assume 1 L (1000 mL) of solution.","Molarity is defined per litre, so the moles of solute are immediate. The basis cancels later, so any volume gives the same answer."],
  molality:["Assume 1 kg (1000 g) of solvent.","Molality is defined per kg of solvent, so the moles of solute are immediate. The basis cancels later, so any mass gives the same answer."],
  molefrac:["Assume 1 mol of solution in total.","Mole fraction is defined per total moles, so the moles of solute and solvent are immediate. The basis cancels later, so any total gives the same answer."]
};

const STEPS = {
  /* ===== from % mass (basis 100 g solution) ===== */
  "pmass|molarity":(v,p)=>{const ms=v,n=ms/p.Ms,Vml=100/p.rho,VL=Vml/1000,M=n/VL;return[
    S("Mass of solute","m(solute) = (Pₘ ÷ 100) × m(soln)",`(${g(v)} ÷ 100) × 100`,`${g(ms)} g`),
    S("Moles of solute","n = m(solute) ÷ M(solute)",`${g(ms)} ÷ ${g(p.Ms)}`,`${g(n)} mol`),
    S("Volume of solution","V(soln) = m(soln) ÷ ρ",`100 ÷ ${g(p.rho)}`,`${g(Vml)} mL = ${g(VL)} L`),
    S("Molarity","M = n ÷ V(soln in L)",`${g(n)} ÷ ${g(VL)}`,`${g(M)} mol L⁻¹`)];},
  "pmass|molality":(v,p)=>{const ms=v,msolv=100-v,n=ms/p.Ms,b=n/(msolv/1000);return[
    S("Mass of solute","m(solute) = (Pₘ ÷ 100) × m(soln)",`(${g(v)} ÷ 100) × 100`,`${g(ms)} g`),
    S("Mass of solvent","m(solvent) = m(soln) − m(solute)",`100 − ${g(ms)}`,`${g(msolv)} g = ${g(msolv/1000)} kg`),
    S("Moles of solute","n = m(solute) ÷ M(solute)",`${g(ms)} ÷ ${g(p.Ms)}`,`${g(n)} mol`),
    S("Molality","m = n ÷ mass of solvent (kg)",`${g(n)} ÷ ${g(msolv/1000)}`,`${g(b)} mol kg⁻¹`)];},
  "pmass|pvol":(v,p)=>{const ms=v,Vsolute=ms/p.rhos,Vsoln=100/p.rho,Pv=Vsolute/Vsoln*100;return[
    S("Mass of solute","m(solute) = (Pₘ ÷ 100) × m(soln)",`(${g(v)} ÷ 100) × 100`,`${g(ms)} g`),
    S("Volume of solute","V(solute) = m(solute) ÷ ρ(solute)",`${g(ms)} ÷ ${g(p.rhos)}`,`${g(Vsolute)} mL`),
    S("Volume of solution","V(soln) = m(soln) ÷ ρ",`100 ÷ ${g(p.rho)}`,`${g(Vsoln)} mL`),
    S("Percentage by volume","P(v) = V(solute) ÷ V(soln) × 100",`${g(Vsolute)} ÷ ${g(Vsoln)} × 100`,`${g(Pv)} %`)];},
  "pmass|molefrac":(v,p)=>{const ns=v/p.Ms,nsolv=(100-v)/p.Mw,x=ns/(ns+nsolv);return[
    S("Masses from the percentage","m(solute) = Pₘ g,  m(solvent) = (100 − Pₘ) g",`${g(v)} g and ${g(100-v)} g`,null),
    S("Moles of solute","n(solute) = m(solute) ÷ M(solute)",`${g(v)} ÷ ${g(p.Ms)}`,`${g(ns)} mol`),
    S("Moles of solvent","n(solvent) = m(solvent) ÷ M(solvent)",`${g(100-v)} ÷ ${g(p.Mw)}`,`${g(nsolv)} mol`),
    S("Mole fraction","x = n(solute) ÷ (n(solute) + n(solvent))",`${g(ns)} ÷ (${g(ns)} + ${g(nsolv)})`,`${g(x)}`)];},

  /* ===== from % volume (basis 100 mL solution) ===== */
  "pvol|molarity":(v,p)=>{const Vs=v,ms=v*p.rhos,n=ms/p.Ms,M=n/0.1;return[
    S("Volume of solute","V(solute) = (P(v) ÷ 100) × V(soln)",`(${g(v)} ÷ 100) × 100`,`${g(Vs)} mL`),
    S("Mass of solute","m(solute) = V(solute) × ρ(solute)",`${g(Vs)} × ${g(p.rhos)}`,`${g(ms)} g`),
    S("Moles of solute","n = m(solute) ÷ M(solute)",`${g(ms)} ÷ ${g(p.Ms)}`,`${g(n)} mol`),
    S("Volume of solution","V(soln) = 100 mL",`100 mL`,`0.1 L`),
    S("Molarity","M = n ÷ V(soln in L)",`${g(n)} ÷ 0.1`,`${g(M)} mol L⁻¹`)];},
  "pvol|molality":(v,p)=>{const ms=v*p.rhos,msoln=100*p.rho,msolv=msoln-ms,n=ms/p.Ms,b=n/(msolv/1000);return[
    S("Volume of solute","V(solute) = (P(v) ÷ 100) × V(soln)",`(${g(v)} ÷ 100) × 100`,`${g(v)} mL`),
    S("Mass of solute","m(solute) = V(solute) × ρ(solute)",`${g(v)} × ${g(p.rhos)}`,`${g(ms)} g`),
    S("Mass of solution","m(soln) = V(soln) × ρ",`100 × ${g(p.rho)}`,`${g(msoln)} g`),
    S("Mass of solvent","m(solvent) = m(soln) − m(solute)",`${g(msoln)} − ${g(ms)}`,`${g(msolv)} g = ${g(msolv/1000)} kg`),
    S("Moles of solute","n = m(solute) ÷ M(solute)",`${g(ms)} ÷ ${g(p.Ms)}`,`${g(n)} mol`),
    S("Molality","m = n ÷ mass of solvent (kg)",`${g(n)} ÷ ${g(msolv/1000)}`,`${g(b)} mol kg⁻¹`)];},
  "pvol|pmass":(v,p)=>{const ms=v*p.rhos,msoln=100*p.rho,Pm=ms/msoln*100;return[
    S("Volume of solute","V(solute) = (P(v) ÷ 100) × V(soln)",`(${g(v)} ÷ 100) × 100`,`${g(v)} mL`),
    S("Mass of solute","m(solute) = V(solute) × ρ(solute)",`${g(v)} × ${g(p.rhos)}`,`${g(ms)} g`),
    S("Mass of solution","m(soln) = V(soln) × ρ",`100 × ${g(p.rho)}`,`${g(msoln)} g`),
    S("Percentage by mass","Pₘ = m(solute) ÷ m(soln) × 100",`${g(ms)} ÷ ${g(msoln)} × 100`,`${g(Pm)} %`)];},
  "pvol|molefrac":(v,p)=>{const ms=v*p.rhos,msoln=100*p.rho,msolv=msoln-ms,ns=ms/p.Ms,nsolv=msolv/p.Mw,x=ns/(ns+nsolv);return[
    S("Volume of solute","V(solute) = (P(v) ÷ 100) × V(soln)",`(${g(v)} ÷ 100) × 100`,`${g(v)} mL`),
    S("Mass of solute","m(solute) = V(solute) × ρ(solute)",`${g(v)} × ${g(p.rhos)}`,`${g(ms)} g`),
    S("Mass of solvent","m(solvent) = (V(soln) × ρ) − m(solute)",`(100 × ${g(p.rho)}) − ${g(ms)}`,`${g(msolv)} g`),
    S("Moles of solute","n(solute) = m(solute) ÷ M(solute)",`${g(ms)} ÷ ${g(p.Ms)}`,`${g(ns)} mol`),
    S("Moles of solvent","n(solvent) = m(solvent) ÷ M(solvent)",`${g(msolv)} ÷ ${g(p.Mw)}`,`${g(nsolv)} mol`),
    S("Mole fraction","x = n(solute) ÷ (n(solute) + n(solvent))",`${g(ns)} ÷ (${g(ns)} + ${g(nsolv)})`,`${g(x)}`)];},

  /* ===== from molarity (basis 1 L = 1000 mL solution) ===== */
  "molarity|molality":(v,p)=>{const n=v,ms=v*p.Ms,msoln=1000*p.rho,msolv=msoln-ms,b=n/(msolv/1000);return[
    S("Moles of solute","n = M × 1 L",`${g(v)} × 1`,`${g(n)} mol`),
    S("Mass of solute","m(solute) = n × M(solute)",`${g(n)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Mass of solution","m(soln) = V × ρ",`1000 × ${g(p.rho)}`,`${g(msoln)} g`),
    S("Mass of solvent","m(solvent) = m(soln) − m(solute)",`${g(msoln)} − ${g(ms)}`,`${g(msolv)} g = ${g(msolv/1000)} kg`),
    S("Molality","m = n ÷ mass of solvent (kg)",`${g(n)} ÷ ${g(msolv/1000)}`,`${g(b)} mol kg⁻¹`)];},
  "molarity|pmass":(v,p)=>{const n=v,ms=v*p.Ms,msoln=1000*p.rho,Pm=ms/msoln*100;return[
    S("Moles of solute","n = M × 1 L",`${g(v)} × 1`,`${g(n)} mol`),
    S("Mass of solute","m(solute) = n × M(solute)",`${g(n)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Mass of solution","m(soln) = V × ρ",`1000 × ${g(p.rho)}`,`${g(msoln)} g`),
    S("Percentage by mass","Pₘ = m(solute) ÷ m(soln) × 100",`${g(ms)} ÷ ${g(msoln)} × 100`,`${g(Pm)} %`)];},
  "molarity|pvol":(v,p)=>{const n=v,ms=v*p.Ms,Vs=ms/p.rhos,Pv=Vs/1000*100;return[
    S("Moles of solute","n = M × 1 L",`${g(v)} × 1`,`${g(n)} mol`),
    S("Mass of solute","m(solute) = n × M(solute)",`${g(n)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Volume of solute","V(solute) = m(solute) ÷ ρ(solute)",`${g(ms)} ÷ ${g(p.rhos)}`,`${g(Vs)} mL`),
    S("Volume of solution","V(soln) = 1 L",`1 L`,`1000 mL`),
    S("Percentage by volume","P(v) = V(solute) ÷ V(soln) × 100",`${g(Vs)} ÷ 1000 × 100`,`${g(Pv)} %`)];},
  "molarity|molefrac":(v,p)=>{const n=v,ms=v*p.Ms,msoln=1000*p.rho,msolv=msoln-ms,nsolv=msolv/p.Mw,x=n/(n+nsolv);return[
    S("Moles of solute","n(solute) = M × 1 L",`${g(v)} × 1`,`${g(n)} mol`),
    S("Mass of solute","m(solute) = n × M(solute)",`${g(n)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Mass of solvent","m(solvent) = (V × ρ) − m(solute)",`(1000 × ${g(p.rho)}) − ${g(ms)}`,`${g(msolv)} g`),
    S("Moles of solvent","n(solvent) = m(solvent) ÷ M(solvent)",`${g(msolv)} ÷ ${g(p.Mw)}`,`${g(nsolv)} mol`),
    S("Mole fraction","x = n(solute) ÷ (n(solute) + n(solvent))",`${g(n)} ÷ (${g(n)} + ${g(nsolv)})`,`${g(x)}`)];},

  /* ===== from molality (basis 1 kg = 1000 g solvent) ===== */
  "molality|molarity":(v,p)=>{const n=v,ms=v*p.Ms,msoln=1000+ms,Vml=msoln/p.rho,VL=Vml/1000,M=n/VL;return[
    S("Moles of solute","n = m × 1 kg",`${g(v)} × 1`,`${g(n)} mol`),
    S("Mass of solute","m(solute) = n × M(solute)",`${g(n)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Mass of solution","m(soln) = mass of solvent + mass of solute",`1000 + ${g(ms)}`,`${g(msoln)} g`),
    S("Volume of solution","V(soln) = m(soln) ÷ ρ",`${g(msoln)} ÷ ${g(p.rho)}`,`${g(Vml)} mL = ${g(VL)} L`),
    S("Molarity","M = n ÷ V(soln in L)",`${g(n)} ÷ ${g(VL)}`,`${g(M)} mol L⁻¹`)];},
  "molality|pmass":(v,p)=>{const ms=v*p.Ms,msoln=1000+ms,Pm=ms/msoln*100;return[
    S("Mass of solute","m(solute) = (m × 1 kg) × M(solute)",`${g(v)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Mass of solution","m(soln) = mass of solvent + mass of solute",`1000 + ${g(ms)}`,`${g(msoln)} g`),
    S("Percentage by mass","Pₘ = m(solute) ÷ m(soln) × 100",`${g(ms)} ÷ ${g(msoln)} × 100`,`${g(Pm)} %`)];},
  "molality|pvol":(v,p)=>{const ms=v*p.Ms,Vs=ms/p.rhos,msoln=1000+ms,Vsoln=msoln/p.rho,Pv=Vs/Vsoln*100;return[
    S("Mass of solute","m(solute) = (m × 1 kg) × M(solute)",`${g(v)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Volume of solute","V(solute) = m(solute) ÷ ρ(solute)",`${g(ms)} ÷ ${g(p.rhos)}`,`${g(Vs)} mL`),
    S("Mass of solution","m(soln) = mass of solvent + mass of solute",`1000 + ${g(ms)}`,`${g(msoln)} g`),
    S("Volume of solution","V(soln) = m(soln) ÷ ρ",`${g(msoln)} ÷ ${g(p.rho)}`,`${g(Vsoln)} mL`),
    S("Percentage by volume","P(v) = V(solute) ÷ V(soln) × 100",`${g(Vs)} ÷ ${g(Vsoln)} × 100`,`${g(Pv)} %`)];},
  "molality|molefrac":(v,p)=>{const n=v,nsolv=1000/p.Mw,x=n/(n+nsolv);return[
    S("Moles of solute","n(solute) = m × 1 kg",`${g(v)} × 1`,`${g(n)} mol`),
    S("Moles of solvent","n(solvent) = mass of solvent ÷ M(solvent)",`1000 ÷ ${g(p.Mw)}`,`${g(nsolv)} mol`),
    S("Mole fraction","x = n(solute) ÷ (n(solute) + n(solvent))",`${g(n)} ÷ (${g(n)} + ${g(nsolv)})`,`${g(x)}`)];},

  /* ===== from mole fraction (basis 1 mol total) ===== */
  "molefrac|molarity":(v,p)=>{const ns=v,ms=v*p.Ms,msolv=(1-v)*p.Mw,msoln=ms+msolv,Vml=msoln/p.rho,VL=Vml/1000,M=ns/VL;return[
    S("Moles of each component","n(solute) = x,  n(solvent) = 1 − x",`${g(v)} mol and ${g(1-v)} mol`,null),
    S("Mass of solute","m(solute) = n(solute) × M(solute)",`${g(v)} × ${g(p.Ms)}`,`${g(ms)} g`),
    S("Mass of solvent","m(solvent) = n(solvent) × M(solvent)",`${g(1-v)} × ${g(p.Mw)}`,`${g(msolv)} g`),
    S("Mass of solution","m(soln) = m(solute) + m(solvent)",`${g(ms)} + ${g(msolv)}`,`${g(msoln)} g`),
    S("Volume of solution","V(soln) = m(soln) ÷ ρ",`${g(msoln)} ÷ ${g(p.rho)}`,`${g(Vml)} mL = ${g(VL)} L`),
    S("Molarity","M = n(solute) ÷ V(soln in L)",`${g(v)} ÷ ${g(VL)}`,`${g(M)} mol L⁻¹`)];},
  "molefrac|molality":(v,p)=>{const msolv=(1-v)*p.Mw,b=v/(msolv/1000);return[
    S("Moles of each component","n(solute) = x,  n(solvent) = 1 − x",`${g(v)} mol and ${g(1-v)} mol`,null),
    S("Mass of solvent","m(solvent) = n(solvent) × M(solvent)",`${g(1-v)} × ${g(p.Mw)}`,`${g(msolv)} g = ${g(msolv/1000)} kg`),
    S("Molality","m = n(solute) ÷ mass of solvent (kg)",`${g(v)} ÷ ${g(msolv/1000)}`,`${g(b)} mol kg⁻¹`)];},
  "molefrac|pmass":(v,p)=>{const ms=v*p.Ms,msolv=(1-v)*p.Mw,msoln=ms+msolv,Pm=ms/msoln*100;return[
    S("Masses of components","m(solute) = x·M(solute),  m(solvent) = (1−x)·M(solvent)",`${g(ms)} g and ${g(msolv)} g`,null),
    S("Mass of solution","m(soln) = m(solute) + m(solvent)",`${g(ms)} + ${g(msolv)}`,`${g(msoln)} g`),
    S("Percentage by mass","Pₘ = m(solute) ÷ m(soln) × 100",`${g(ms)} ÷ ${g(msoln)} × 100`,`${g(Pm)} %`)];},
  "molefrac|pvol":(v,p)=>{const ms=v*p.Ms,msolv=(1-v)*p.Mw,msoln=ms+msolv,Vs=ms/p.rhos,Vsoln=msoln/p.rho,Pv=Vs/Vsoln*100;return[
    S("Masses of components","m(solute) = x·M(solute),  m(solvent) = (1−x)·M(solvent)",`${g(ms)} g and ${g(msolv)} g`,null),
    S("Volume of solute","V(solute) = m(solute) ÷ ρ(solute)",`${g(ms)} ÷ ${g(p.rhos)}`,`${g(Vs)} mL`),
    S("Mass of solution","m(soln) = m(solute) + m(solvent)",`${g(ms)} + ${g(msolv)}`,`${g(msoln)} g`),
    S("Volume of solution","V(soln) = m(soln) ÷ ρ",`${g(msoln)} ÷ ${g(p.rho)}`,`${g(Vsoln)} mL`),
    S("Percentage by volume","P(v) = V(solute) ÷ V(soln) × 100",`${g(Vs)} ÷ ${g(Vsoln)} × 100`,`${g(Pv)} %`)];}
};
