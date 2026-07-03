/* ============================================================
   conversions.js — CHEMISTRY: direct conversion formulas
   ------------------------------------------------------------
   What lives here: the C lookup table. Each "from|to" entry
   declares p (required extra parameters), f (the condensed
   one-line formula shown to students), and fn (the function
   that computes the final numeric answer).
   Who edits this: the chemistry-content owner.
   Depends on: config.js (parameter keys). Used by: ui.js.
   ============================================================ */

/* ---------- required params + condensed formula + final-answer fn ---------- */
const C = {
  "molarity|molality":{p:["rho","Ms"],f:["m","1000·M","1000·ρ − M·M(solute)"],fn:(v,p)=>1000*v/(1000*p.rho-v*p.Ms)},
  "molarity|pmass":{p:["rho","Ms"],f:["Pₘ","M·M(solute)","10·ρ"],fn:(v,p)=>v*p.Ms/(10*p.rho)},
  "molarity|pvol":{p:["rhos","Ms"],f:["P(v)","M·M(solute)","10·ρ(solute)"],fn:(v,p)=>v*p.Ms/(10*p.rhos)},
  "molarity|molefrac":{p:["rho","Ms","Mw"],f:["x","M·M(solvent)","M·M(solvent) + 1000·ρ − M·M(solute)"],fn:(v,p)=>v*p.Mw/(v*p.Mw+1000*p.rho-v*p.Ms)},
  "molality|molarity":{p:["rho","Ms"],f:["M","1000·m·ρ","1000 + m·M(solute)"],fn:(v,p)=>1000*v*p.rho/(1000+v*p.Ms)},
  "molality|pmass":{p:["Ms"],f:["Pₘ","100·m·M(solute)","1000 + m·M(solute)"],fn:(v,p)=>100*v*p.Ms/(1000+v*p.Ms)},
  "molality|pvol":{p:["rho","rhos","Ms"],f:["P(v)","100·m·M(solute)·ρ","ρ(solute)·(1000 + m·M(solute))"],fn:(v,p)=>100*v*p.Ms*p.rho/(p.rhos*(1000+v*p.Ms))},
  "molality|molefrac":{p:["Mw"],f:["x","m·M(solvent)","m·M(solvent) + 1000"],fn:(v,p)=>v*p.Mw/(v*p.Mw+1000)},
  "pmass|molarity":{p:["rho","Ms"],f:["M","10·ρ·Pₘ","M(solute)"],fn:(v,p)=>10*p.rho*v/p.Ms},
  "pmass|molality":{p:["Ms"],f:["m","1000·Pₘ","M(solute)·(100 − Pₘ)"],fn:(v,p)=>1000*v/(p.Ms*(100-v))},
  "pmass|pvol":{p:["rho","rhos"],f:["P(v)","Pₘ·ρ","ρ(solute)"],fn:(v,p)=>v*p.rho/p.rhos},
  "pmass|molefrac":{p:["Ms","Mw"],f:["x","Pₘ / M(solute)","Pₘ/M(solute) + (100−Pₘ)/M(solvent)"],fn:(v,p)=>(v/p.Ms)/((v/p.Ms)+(100-v)/p.Mw)},
  "pvol|molarity":{p:["rhos","Ms"],f:["M","10·P(v)·ρ(solute)","M(solute)"],fn:(v,p)=>10*v*p.rhos/p.Ms},
  "pvol|molality":{p:["rho","rhos","Ms"],f:["m","1000·P(v)·ρ(solute)","M(solute)·(100·ρ − P(v)·ρ(solute))"],fn:(v,p)=>1000*v*p.rhos/(p.Ms*(100*p.rho-v*p.rhos))},
  "pvol|pmass":{p:["rho","rhos"],f:["Pₘ","P(v)·ρ(solute)","ρ"],fn:(v,p)=>v*p.rhos/p.rho},
  "pvol|molefrac":{p:["rho","rhos","Ms","Mw"],f:["x","P(v)·ρ(solute)/M(solute)","P(v)·ρ(solute)/M(solute) + (100·ρ−P(v)·ρ(solute))/M(solvent)"],fn:(v,p)=>(v*p.rhos/p.Ms)/((v*p.rhos/p.Ms)+(100*p.rho-v*p.rhos)/p.Mw)},
  "molefrac|molarity":{p:["rho","Ms","Mw"],f:["M","1000·x·ρ","x·M(solute) + (1−x)·M(solvent)"],fn:(v,p)=>1000*v*p.rho/(v*p.Ms+(1-v)*p.Mw)},
  "molefrac|molality":{p:["Mw"],f:["m","1000·x","(1−x)·M(solvent)"],fn:(v,p)=>1000*v/((1-v)*p.Mw)},
  "molefrac|pmass":{p:["Ms","Mw"],f:["Pₘ","100·x·M(solute)","x·M(solute) + (1−x)·M(solvent)"],fn:(v,p)=>100*v*p.Ms/(v*p.Ms+(1-v)*p.Mw)},
  "molefrac|pvol":{p:["rho","rhos","Ms","Mw"],f:["P(v)","100·x·M(solute)·ρ","ρ(solute)·(x·M(solute)+(1−x)·M(solvent))"],fn:(v,p)=>100*v*p.Ms*p.rho/(p.rhos*(v*p.Ms+(1-v)*p.Mw))}
};
