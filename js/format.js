/* ============================================================
   format.js — UTILITIES: number & HTML formatting helpers
   ------------------------------------------------------------
   What lives here: fmt() for significant-figure display,
   fracHTML() for stacked fractions, stepHTML() for one
   worked-solution step.
   Who edits this: whoever tunes how numbers/steps look.
   Depends on: nothing. Used by: steps.js, ui.js.
   ============================================================ */

/* ---------- formatting ---------- */
function fmt(n){
  if(!isFinite(n))return "—";
  const a=Math.abs(n);
  if(a!==0&&(a<1e-4||a>=1e6))return n.toExponential(3);
  let s=n.toPrecision(5);
  if(s.indexOf(".")>-1)s=s.replace(/0+$/,"").replace(/\.$/,"");
  return s;
}
function fracHTML(t,b){return `<span class="frac"><span class="top">${t}</span><span class="bot">${b}</span></span>`;}
function stepHTML(title,formula,subst,result,note){
  const segs=[];
  if(formula)segs.push(formula);
  if(subst)segs.push(subst);
  let math=segs.join('<span class="eq">=</span>');
  if(result)math+=`<span class="eq">=</span><span class="sval">${result}</span>`;
  return `<li class="step"><span class="num"></span><div class="body">
     <div class="stitle">${title}</div>
     ${math?`<div class="smath">${math}</div>`:''}
     ${note?`<div class="basis-note">${note}</div>`:''}
   </div></li>`;
}
