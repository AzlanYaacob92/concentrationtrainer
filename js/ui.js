/* ============================================================
   ui.js — BEHAVIOUR: DOM wiring, input building, rendering
   ------------------------------------------------------------
   What lives here: dropdown population, dynamic parameter
   fields, input validation, the render() pipeline that shows
   the answer card + working, and all event listeners.
   Who edits this: the front-end/interaction owner.
   Depends on: config.js, format.js, conversions.js, steps.js.
   Load this file LAST (see index.html script order).
   ============================================================ */

/* ---------- build dropdowns ---------- */
const fromSel=document.getElementById("from"),toSel=document.getElementById("to"),
      paramsBox=document.getElementById("params"),out=document.getElementById("output");
order.forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=M[k].name;fromSel.appendChild(o);});
function rebuildTo(){
  const from=fromSel.value,prev=toSel.value;
  toSel.innerHTML='<option value="" disabled>Choose a measure…</option>';let kept=false;
  order.forEach(k=>{if(k===from)return;const o=document.createElement("option");o.value=k;o.textContent=M[k].name;
    if(k===prev){o.selected=true;kept=true;}toSel.appendChild(o);});
  toSel.disabled=!from;if(!kept)toSel.value="";
}
function fieldHTML(key,cap,unit,ph,full){
  const u=unit?` <span class="unit">/ ${unit}</span>`:"";
  return `<label class="fld${full?' full':''}"><span class="cap">${cap}${u}</span>
    <input type="number" step="any" inputmode="decimal" data-k="${key}" placeholder="${ph}"></label>`;
}
function buildParams(){
  const from=fromSel.value,to=toSel.value;paramsBox.innerHTML="";
  if(!from||!to||!C[from+"|"+to]){render();return;}
  const conv=C[from+"|"+to],fM=M[from];let html=`<div class="params-grid">`;
  html+=fieldHTML("value",`Value of ${fM.name}`,fM.unit,fM.ph,true);
  conv.p.forEach(k=>{html+=fieldHTML(k,P[k].cap,P[k].unit,P[k].ph,false);});
  html+=`</div><p class="hint"><b>Needed:</b> the ${fM.name.toLowerCase()} value`+
        (conv.p.length?`, plus `+conv.p.map(k=>P[k].cap.toLowerCase()).join(", "):``)+`.</p>`;
  paramsBox.innerHTML=html;
  paramsBox.querySelectorAll("input").forEach(i=>i.addEventListener("input",render));
  render();
}

/* ---------- render ---------- */
let lastKey="";
function render(){
  const from=fromSel.value,to=toSel.value,key=from+"|"+to;
  if(!from||!to||!C[key]){out.innerHTML=`<div class="placeholder">Pick what to convert <b>from</b> and <b>to</b> to begin.</div>`;lastKey="";return;}
  const conv=C[key],inputs={};let allFilled=true,anyTyped=false;
  paramsBox.querySelectorAll("input").forEach(i=>{const raw=i.value.trim();
    if(raw!=="")anyTyped=true;const val=parseFloat(raw);
    if(raw===""||isNaN(val))allFilled=false;inputs[i.dataset.k]=val;});
  if(!anyTyped){out.innerHTML=`<div class="placeholder">Enter the values above to see the answer and the full working.</div>`;lastKey="";return;}
  if(!allFilled){out.innerHTML=`<div class="warn">Fill in every field with a number to compute the result.</div>`;lastKey="";return;}

  const v=inputs.value,p={rho:inputs.rho,rhos:inputs.rhos,Ms:inputs.Ms,Mw:inputs.Mw};
  const res=conv.fn(v,p),target=M[to];
  let problem=null;
  if(!isFinite(res))problem="These values divide by zero. Check the figures you entered.";
  else if(res<0)problem="These values give a negative result, which isn't physically possible — re-check the inputs (often a percentage or density that's too high).";
  else if((to==="pmass"||to==="pvol")&&res>100)problem="The result exceeds 100%, which isn't physically possible. Re-check the density and molar-mass values.";
  else if(to==="molefrac"&&res>1)problem="A mole fraction can't exceed 1. Re-check your inputs.";

  const [lhs,top,bot]=conv.f;
  if(problem){out.innerHTML=`<div class="warn">${problem}</div>`;lastKey="";return;}

  const animate=key!==lastKey;lastKey=key;
  const rows=STEPS[key](v,p);
  let stepsHTML=stepHTML("Choose a convenient basis",BASIS[from][0],null,null,BASIS[from][1]);
  rows.forEach(s=>stepsHTML+=stepHTML(s.title,s.formula,s.subst,s.result));

  out.innerHTML=`
    <div class="result">
      <div class="answer">
        <div class="rlabel">${target.name}</div>
        <div class="rval">${fmt(res)}<span class="runit">${target.unit}</span></div>
      </div>
      <div class="work">
        <div class="wlabel">Step-by-step working</div>
        <ol class="steps ${animate?'animate':''}">${stepsHTML}</ol>
        <div class="condensed">In one line: ${lhs} = ${fracHTML(top,bot)}</div>
      </div>
    </div>`;
}
/* ---------- wiring ---------- */
fromSel.addEventListener("change",()=>{rebuildTo();buildParams();});
toSel.addEventListener("change",buildParams);
document.getElementById("reset").addEventListener("click",()=>{
  fromSel.selectedIndex=0;toSel.innerHTML='<option value="" disabled selected>Choose a measure…</option>';
  toSel.disabled=true;paramsBox.innerHTML="";lastKey="";render();});
render();
