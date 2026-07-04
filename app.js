/* =============================================================
   app.js  —  behaviour: navigation, forms, and the reveal flow.
   Reads chemistry.js for all conversion logic; this file only
   builds the interface and wires up interactions.
   ============================================================= */

(function () {
  const { MEASURES, MEASURE_ORDER, FIELDS, getConverter, fmt } = window.CHEM;

  /* ---------------- reduced motion ---------------- */
  let prefersReducedMotion = false;
  try {
    prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* matchMedia unavailable — treat as full motion */ }

  /* ---------------- animation helpers ----------------
     Every pan pairs a real CSS animation with a timed fallback, so
     navigation never gets stuck — if the animation doesn't fire
     (reduced motion, a hidden ancestor, a slow device), the
     fallback timer moves things along anyway. */
  function onAnimEnd(el, fallbackMs, cb) {
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener('animationend', onEnd);
      clearTimeout(timer);
      cb();
    }
    function onEnd(e) { if (e.target === el) finish(); }
    el.addEventListener('animationend', onEnd);
    const timer = setTimeout(finish, fallbackMs);
  }

  // Pan a card into view. direction 'forward' enters from the right
  // (the normal progress direction); 'back' enters from the left.
  function enterCard(el, direction) {
    if (!el) return;
    el.hidden = false;
    if (prefersReducedMotion) return;
    const cls = direction === 'back' ? 'anim-pan-in-left' : 'anim-pan-in-right';
    el.classList.remove('anim-pan-in-left', 'anim-pan-in-right');
    void el.offsetWidth; // force reflow so a repeated class name restarts the animation
    el.classList.add(cls);
    onAnimEnd(el, 700, () => el.classList.remove(cls));
  }

  // Pan a card out of view, then call back.
  function exitCard(el, direction, cb) {
    if (!el) { if (cb) cb(); return; }
    if (prefersReducedMotion) { el.hidden = true; if (cb) cb(); return; }
    const cls = direction === 'back' ? 'anim-pan-out-right' : 'anim-pan-out-left';
    el.classList.remove('anim-pan-out-left', 'anim-pan-out-right');
    void el.offsetWidth;
    el.classList.add(cls);
    onAnimEnd(el, 550, () => {
      el.hidden = true;
      el.classList.remove(cls);
      if (cb) cb();
    });
  }

  // The one wizard transition primitive used throughout: pan `fromEl`
  // out (if there is one), run `updateFn` (e.g. fill in the next
  // step's content — fromEl and toEl are often the same element,
  // refreshed in place), then pan `toEl` in.
  function panTransition(fromEl, toEl, direction, updateFn) {
    function doEnter() {
      if (updateFn) updateFn();
      enterCard(toEl, direction);
    }
    if (fromEl) exitCard(fromEl, direction, doEnter);
    else doEnter();
  }

  // Reveal an HTML string into `el` as if it were being typed —
  // characters appear one at a time, but a whole <br> or a whole
  // fraction (<span class="frac">…</span>) appears as one atomic
  // unit instead of getting typed apart.
  function typewriterReveal(el, html, speed) {
    if (prefersReducedMotion) { el.innerHTML = html; return; }
    speed = speed || 16;
    const tokens = [];
    let i = 0;
    while (i < html.length) {
      if (html.startsWith('<br>', i)) { tokens.push('<br>'); i += 4; continue; }
      if (html.startsWith('<span class="frac">', i)) {
        const closeAt = html.indexOf('</span></span>', i);
        const end = closeAt === -1 ? html.length : closeAt + '</span></span>'.length;
        tokens.push(html.slice(i, end));
        i = end;
        continue;
      }
      tokens.push(html[i]);
      i += 1;
    }
    el.innerHTML = '';
    let idx = 0;
    (function step() {
      if (idx >= tokens.length) return;
      el.innerHTML += tokens[idx];
      idx += 1;
      setTimeout(step, speed);
    })();
  }

  /* ---------------- screen navigation ---------------- */
  const screens = {
    landing: document.getElementById('screen-landing'),
    learn: document.getElementById('screen-learn'),
    check: document.getElementById('screen-check')
  };
  const landingContent = document.getElementById('landing-content');

  // The landing choices grow in one at a time; the headline pans in
  // from the right. Runs on first load and every time we come back.
  function playLandingEntrance() {
    if (prefersReducedMotion) return;
    const hero = landingContent.querySelector('.hero-lead');
    const cards = landingContent.querySelectorAll('.choice-card');
    hero.classList.remove('anim-hero-in');
    void hero.offsetWidth;
    hero.classList.add('anim-hero-in');
    cards.forEach((card, i) => {
      card.classList.remove('anim-grow-in');
      card.style.animationDelay = `${0.45 + i * 0.18}s`;
      void card.offsetWidth;
      card.classList.add('anim-grow-in');
    });
  }

  function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'learn') resetLearn();
    if (name === 'check') resetCheck();
    if (name === 'landing') playLandingEntrance();
  }

  // Leaving the landing screen pans its whole content out to the
  // left first; every other switch happens straight away (the
  // target screen still fades in via .screen.is-active).
  function goto(name) {
    if (screens.landing.classList.contains('is-active') && name !== 'landing') {
      if (prefersReducedMotion) { switchScreen(name); return; }
      landingContent.classList.remove('anim-landing-out');
      void landingContent.offsetWidth;
      landingContent.classList.add('anim-landing-out');
      onAnimEnd(landingContent, 500, () => {
        landingContent.classList.remove('anim-landing-out');
        switchScreen(name);
      });
    } else {
      switchScreen(name);
    }
  }

  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => goto(el.dataset.goto));
  });

  /* ---------------- shared helpers ---------------- */

  // Build a <select> full of measure options, optionally excluding one id.
  function fillMeasureSelect(select, excludeId, placeholder) {
    select.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder;
    ph.disabled = true;
    ph.selected = true;
    select.appendChild(ph);
    MEASURE_ORDER.forEach(id => {
      if (id === excludeId) return;
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${MEASURES[id].name} (${MEASURES[id].symbol})`;
      select.appendChild(opt);
    });
  }

  // Render the field list (source value + any extra required data fields).
  // `prefix` scopes element ids to their section (learn/check) so the two
  // forms never collide, since both sections remain in the DOM at once.
  // Returns the list of {id, el, isSourceValue} for later reading.
  function renderFieldList(container, sourceMeasure, extraFieldIds, prefix) {
    container.innerHTML = '';
    const inputs = [];

    // the source value itself
    const row = document.createElement('div');
    row.className = 'field-row';
    const m = MEASURES[sourceMeasure];
    row.innerHTML = `
      <label class="field-label" for="${prefix}-f-sourceValue">${m.valueLabel}
        <span class="field-unit">${m.unit ? '(' + m.unit + ')' : '(0–1)'}</span>
      </label>
      <input class="num-input" id="${prefix}-f-sourceValue" type="number" step="any"
             placeholder="${m.rangeHint}" />`;
    container.appendChild(row);
    inputs.push({ id: 'sourceValue', isSourceValue: true, el: row.querySelector('input') });

    // the extra required fields (molar masses, densities)
    extraFieldIds.forEach(fid => {
      const f = FIELDS[fid];
      const r = document.createElement('div');
      r.className = 'field-row';
      r.innerHTML = `
        <label class="field-label" for="${prefix}-f-${fid}">${f.label}
          <span class="field-unit">(${f.unit})</span>
        </label>
        <input class="num-input" id="${prefix}-f-${fid}" type="number" step="any"
               placeholder="${f.placeholder}" />`;
      container.appendChild(r);
      inputs.push({ id: fid, isSourceValue: false, el: r.querySelector('input') });
    });

    return inputs;
  }

  // Validate the rendered inputs. Returns {ok, values, message}.
  function validateInputs(inputs, sourceMeasure) {
    const values = {};
    for (const inp of inputs) {
      const raw = inp.el.value.trim();
      if (raw === '') return { ok: false, message: 'Please fill in every field before continuing.' };
      const num = Number(raw);
      if (!isFinite(num)) return { ok: false, message: `"${raw}" is not a valid number.` };
      if (inp.isSourceValue) {
        const m = MEASURES[sourceMeasure];
        if (num < m.min || num > m.max) {
          return { ok: false, message: `${m.valueLabel} should be ${m.rangeHint}.` };
        }
      } else if (num <= 0) {
        return { ok: false, message: `${FIELDS[inp.id].label} must be greater than 0.` };
      }
      values[inp.id] = num;
    }
    return { ok: true, values };
  }

  // Every converter's working follows the same three-move method taught
  // in SK015: pick a basis, bridge to what's missing, apply the definition.
  // These generic instructions are shown first, above the specific
  // reasoning for the step, so students read "what move is this" before
  // "why does it work here".
  const STEP_INSTRUCTIONS = [
    'Find a suitable basis for assumption.',
    'Bridge to what the target measure needs.',
    'Apply the definition of the target measure.'
  ];

  // Build a strategy card element. `stepIndex` (0, 1, 2…) picks the
  // instruction line that gets revealed above the specific reasoning.
  function strategyCard(text, stepIndex) {
    const d = document.createElement('div');
    d.className = 'strategy-card';
    const instruction = STEP_INSTRUCTIONS[stepIndex];
    d.innerHTML = `
      <span class="strategy-eyebrow">Strategy</span>
      ${instruction ? `<p class="strategy-instruction">${instruction}</p>` : ''}
      <p class="strategy-text">${text}</p>`;
    return d;
  }
  // Build a math card element.
  function mathCard(html) {
    const d = document.createElement('div');
    d.className = 'math-card';
    d.innerHTML = `<span class="math-eyebrow">Calculation</span>${html}`;
    return d;
  }
  // Build the final answer callout.
  function answerCallout(text) {
    const d = document.createElement('div');
    d.className = 'answer-callout';
    d.innerHTML = `<span class="answer-eyebrow">Final answer</span><p class="answer-value">${text}</p>`;
    return d;
  }

  /* =============================================================
     CHECK-MODE WORKSHEET
     Short bold titles for each of the three working steps, keyed by
     "from|to". These are presentation labels only (the chemistry and
     the numbers live in chemistry.js); they head each numbered step
     in the redesigned Check-my-answers worksheet.
     ============================================================= */
  const STEP_TITLES = {
    'molarity|molality':          ['Moles of solute in 1 L', 'Mass of solvent', 'Molality'],
    'molarity|mass_percent':      ['Moles of solute in 1 L', 'Mass of solute and solution', 'Percentage by mass'],
    'molarity|mole_fraction':     ['Moles of solute in 1 L', 'Moles of solvent', 'Mole fraction'],
    'molarity|volume_percent':    ['Moles of solute in 1 L', 'Volume of solute', 'Percentage by volume'],
    'molality|molarity':          ['Moles of solute per kg solvent', 'Volume of solution', 'Molarity'],
    'molality|mass_percent':      ['Moles of solute per kg solvent', 'Mass of solute and solution', 'Percentage by mass'],
    'molality|mole_fraction':     ['Moles of solute per kg solvent', 'Moles of solvent', 'Mole fraction'],
    'molality|volume_percent':    ['Moles of solute per kg solvent', 'Volume of solute and solvent', 'Percentage by volume'],
    'mass_percent|molarity':      ['Mass of solute in 100 g', 'Moles of solute and volume', 'Molarity'],
    'mass_percent|molality':      ['Masses in 100 g of solution', 'Moles of solute', 'Molality'],
    'mass_percent|mole_fraction': ['Masses in 100 g of solution', 'Moles of each', 'Mole fraction'],
    'mass_percent|volume_percent':['Masses in 100 g of solution', 'Volume of each', 'Percentage by volume'],
    'volume_percent|molarity':    ['Volume of solute in 100 mL', 'Mass, then moles of solute', 'Molarity'],
    'volume_percent|molality':    ['Volumes in 100 mL of solution', 'Masses, then moles', 'Molality'],
    'volume_percent|mass_percent':['Volumes in 100 mL of solution', 'Mass of each', 'Percentage by mass'],
    'volume_percent|mole_fraction':['Volumes in 100 mL of solution', 'Moles of each', 'Mole fraction'],
    'mole_fraction|molarity':     ['Moles in 1 mol total', 'Mass, then volume of solution', 'Molarity'],
    'mole_fraction|molality':     ['Moles in 1 mol total', 'Mass of solvent', 'Molality'],
    'mole_fraction|mass_percent': ['Moles in 1 mol total', 'Mass of each', 'Percentage by mass'],
    'mole_fraction|volume_percent':['Moles in 1 mol total', 'Volume of each', 'Percentage by volume']
  };

  // Split one equation on the '=' signs that sit OUTSIDE any HTML tag, so
  // markup like class="frac" is never split. Returns trimmed segments.
  function splitTopLevelEquals(line) {
    const parts = [];
    let depth = 0, cur = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '<') depth++;
      else if (c === '>') depth = Math.max(0, depth - 1);
      if (c === '=' && depth === 0) { parts.push(cur); cur = ''; }
      else cur += c;
    }
    parts.push(cur);
    return parts.map(s => s.trim());
  }

  // Lay a math string out so every '=' stacks in its own column. Each
  // <br>-separated equation becomes a grid row; the label (left of the first
  // '=') is right-aligned to hug the '=', results are left-aligned.
  function mathGrid(html) {
    const lines = String(html).split(/<br\s*\/?>/i);
    const rows = lines.map(splitTopLevelEquals);
    const maxSegs = Math.max(1, ...rows.map(r => r.length));
    const cols = 2 * maxSegs - 1;
    let cells = '';
    rows.forEach((segs, ri) => {
      const multi = segs.length > 1;
      segs.forEach((seg, si) => {
        if (si > 0) {
          cells += `<span class="eq-op" style="grid-column:${2 * si};grid-row:${ri + 1}">=</span>`;
        }
        const cls = !multi ? 'eq-solo' : (si === 0 ? 'eq-lhs' : 'eq-rhs');
        cells += `<span class="eq-seg ${cls}" style="grid-column:${2 * si + 1};grid-row:${ri + 1}">${seg}</span>`;
      });
    });
    return `<span class="eqgrid" style="grid-template-columns:repeat(${cols}, auto)">${cells}</span>`;
  }

  // Render a math grid into an element, revealing its equation rows with a
  // gentle stagger (the calculation "reveal" for the Learn combo card).
  function revealMathGrid(el, html) {
    el.innerHTML = mathGrid(html);
    if (prefersReducedMotion) return;
    try {
      const grid = el.querySelector('.eqgrid');
      if (!grid) return;
      const byRow = new Map();
      Array.from(grid.children).forEach(c => {
        const r = c.style.gridRow || '1';
        if (!byRow.has(r)) byRow.set(r, []);
        byRow.get(r).push(c);
      });
      let delay = 0;
      byRow.forEach(rowCells => {
        rowCells.forEach(c => {
          c.style.opacity = '0';
          c.style.transform = 'translateY(4px)';
          c.style.transition = 'opacity .28s var(--ease-buttery), transform .28s var(--ease-buttery)';
        });
        setTimeout(() => rowCells.forEach(c => {
          c.style.opacity = '1';
          c.style.transform = 'none';
        }), delay);
        delay += 150;
      });
    } catch (e) { /* content already shown; animation is best-effort */ }
  }

  // Build the redesigned worksheet card: a deep-teal result header,
  // then the numbered step-by-step working, then the one-line formula.
  function renderWorksheet(fromId, toId, result) {
    const target = MEASURES[toId];
    const key = `${fromId}|${toId}`;
    const titles = STEP_TITLES[key] || [];
    const converter = getConverter(fromId, toId);
    // mole fraction has no unit — show just the number
    const unit = target.unit === '' ? '' : target.symbol;

    const stepsHtml = result.steps.map((step, i) => `
      <li class="worksheet-step">
        <span class="worksheet-step-num">${i + 1}</span>
        <div class="worksheet-step-main">
          ${titles[i] ? `<p class="worksheet-step-title">${titles[i]}</p>` : ''}
          <div class="worksheet-step-math">${mathGrid(step.math)}</div>
          ${step.strategy ? `<p class="worksheet-step-note">${step.strategy}</p>` : ''}
        </div>
      </li>`).join('');

    const oneLineHtml = (converter && converter.oneLine)
      ? `<div class="worksheet-oneline">
           <span class="worksheet-oneline-label">In one line:</span>
           <span class="worksheet-oneline-formula">${target.formulaSymbol} = ${converter.oneLine}</span>
         </div>`
      : '';

    const card = document.createElement('div');
    card.className = 'worksheet';
    card.innerHTML = `
      <div class="worksheet-header">
        <span class="worksheet-eyebrow">${target.name}</span>
        <p class="worksheet-result">
          <span class="worksheet-num">${fmt(result.answer)}</span>${unit ? `<span class="worksheet-unit">${unit}</span>` : ''}
        </p>
      </div>
      <div class="worksheet-body">
        <span class="worksheet-section">Step-by-step working</span>
        <ol class="worksheet-steps">${stepsHtml}</ol>
        ${oneLineHtml}
      </div>`;
    return card;
  }

  /* =============================================================
     LEARN MODE
     A single-card-at-a-time wizard: three prompt cards (target,
     source, fields) pan through in sequence, each with a Back
     button to the previous one. "Work it out" hands off to a
     combined strategy+calculation card, one per step — the
     calculation types itself in on demand. The last step hands
     off to a big final-answer card, which can expand into a pure
     working summary (calculations only, no strategy) at the end.
     ============================================================= */
  const learnTargetSel = document.getElementById('learn-target');
  const learnSourceSel = document.getElementById('learn-source');
  const promptTarget = document.getElementById('learn-prompt-target');
  const promptSource = document.getElementById('learn-prompt-source');
  const fieldsCard = document.getElementById('learn-fields');
  const fieldsTitle = document.getElementById('learn-fields-title');
  const fieldList = document.getElementById('learn-field-list');
  const learnError = document.getElementById('learn-error');
  const learnStartBtn = document.getElementById('learn-start');
  const backTo1Btn = document.getElementById('learn-back-to-1');
  const backTo2Btn = document.getElementById('learn-back-to-2');

  const comboCard = document.getElementById('learn-combo');
  const comboInstruction = document.getElementById('learn-combo-instruction');
  const comboStrategy = document.getElementById('learn-combo-strategy');
  const comboMath = document.getElementById('learn-combo-math');
  const comboNextBtn = document.getElementById('learn-combo-next');

  const answerCard = document.getElementById('learn-answer');
  const answerValueEl = document.getElementById('learn-answer-value');
  const revealWorkingBtn = document.getElementById('learn-reveal-working');

  const fullWorkingCard = document.getElementById('learn-full-working');
  const fullWorkingList = document.getElementById('learn-full-working-list');
  const restartBtn = document.getElementById('learn-restart');

  const learnWizardCards = [promptTarget, promptSource, fieldsCard, comboCard, answerCard, fullWorkingCard];

  let learnInputs = [];
  let learnState = null; // { steps, answerText, stepIndex, calcShown }

  // One "pure working" card — calculation only, no strategy — used
  // in the final overall-working summary.
  function pureWorkingCard(html, grid) {
    const d = document.createElement('div');
    d.className = 'full-working-item';
    d.innerHTML = grid ? mathGrid(html) : html;
    return d;
  }

  function resetLearn() {
    fillMeasureSelect(learnTargetSel, null, 'Choose what you want to find…');
    learnSourceSel.innerHTML = '';
    learnError.hidden = true;
    learnState = null;

    learnWizardCards.forEach(el => {
      el.hidden = true;
      el.classList.remove('anim-pan-in-left', 'anim-pan-in-right', 'anim-pan-out-left', 'anim-pan-out-right');
    });
    enterCard(promptTarget, 'forward');
  }

  learnTargetSel.addEventListener('change', () => {
    fillMeasureSelect(learnSourceSel, learnTargetSel.value, 'Choose what you already have…');
    panTransition(promptTarget, promptSource, 'forward');
  });

  backTo1Btn.addEventListener('click', () => {
    panTransition(promptSource, promptTarget, 'back');
  });

  learnSourceSel.addEventListener('change', () => {
    const from = learnSourceSel.value, to = learnTargetSel.value;
    const converter = getConverter(from, to);
    if (!converter) return; // safety: shouldn't happen, all 20 pairs exist
    fieldsTitle.textContent = `You are making a conversion between "${MEASURES[from].name}" to "${MEASURES[to].name}"`;
    learnInputs = renderFieldList(fieldList, from, converter.requires, 'learn');
    learnError.hidden = true;
    panTransition(promptSource, fieldsCard, 'forward');
  });

  backTo2Btn.addEventListener('click', () => {
    panTransition(fieldsCard, promptSource, 'back');
  });

  // Fill the combo card with a given step's strategy, and clear its
  // calculation zone ready for the next reveal.
  function renderComboStep() {
    const { steps, stepIndex } = learnState;
    comboInstruction.textContent = STEP_INSTRUCTIONS[stepIndex] || '';
    comboStrategy.textContent = steps[stepIndex].strategy;
    comboMath.innerHTML = '';
    comboNextBtn.textContent = 'Show the calculation';
    learnState.calcShown = false;
  }

  learnStartBtn.addEventListener('click', () => {
    const from = learnSourceSel.value, to = learnTargetSel.value;
    const check = validateInputs(learnInputs, from);
    if (!check.ok) {
      learnError.textContent = check.message;
      learnError.hidden = false;
      return;
    }
    learnError.hidden = true;
    const converter = getConverter(from, to);
    const result = converter.compute(check.values.sourceValue, check.values);
    learnState = { steps: result.steps, answerText: result.answerText, stepIndex: 0, calcShown: false };

    panTransition(fieldsCard, comboCard, 'forward', renderComboStep);
  });

  comboNextBtn.addEventListener('click', () => {
    if (!learnState) return;
    const { steps, stepIndex, calcShown } = learnState;

    if (!calcShown) {
      // reveal the calculation as a stacked-equation grid in the same card
      revealMathGrid(comboMath, steps[stepIndex].math);
      learnState.calcShown = true;
      const isLast = stepIndex === steps.length - 1;
      comboNextBtn.textContent = isLast ? 'Reveal final answer' : 'Reveal next step';
      return;
    }

    if (stepIndex + 1 < steps.length) {
      // pan the combo card out, refresh it for the next step, pan it back in
      panTransition(comboCard, comboCard, 'forward', () => {
        learnState.stepIndex = stepIndex + 1;
        renderComboStep();
      });
    } else {
      // last step's calculation is shown — hand off to the final answer
      answerValueEl.textContent = learnState.answerText;
      panTransition(comboCard, answerCard, 'forward');
    }
  });

  revealWorkingBtn.addEventListener('click', () => {
    if (!learnState) return;
    fullWorkingList.innerHTML = '';
    learnState.steps.forEach(step => fullWorkingList.appendChild(pureWorkingCard(step.math, true)));
    fullWorkingList.appendChild(pureWorkingCard(
      `<span class="full-working-answer-label">Final answer</span>${learnState.answerText}`, false
    ));
    panTransition(answerCard, fullWorkingCard, 'forward');
  });

  restartBtn.addEventListener('click', resetLearn);

  /* =============================================================
     CHECK MY ANSWERS MODE
     From/to pickers -> fields -> Convert reveals full working
     immediately (no click-through), matching the original tool.
     ============================================================= */
  const checkFrom = document.getElementById('check-from');
  const checkTo = document.getElementById('check-to');
  const checkFieldsCard = document.getElementById('check-fields');
  const checkFieldList = document.getElementById('check-field-list');
  const checkError = document.getElementById('check-error');
  const checkRunBtn = document.getElementById('check-run');
  const checkClearBtn = document.getElementById('check-clear');
  const checkSolution = document.getElementById('check-solution');
  const checkRevealList = document.getElementById('check-reveal-list');

  let checkInputs = [];

  function resetCheck() {
    fillMeasureSelect(checkFrom, null, 'Choose a measure…');
    checkTo.innerHTML = '<option value="">Choose a measure…</option>';
    checkTo.disabled = true;
    checkFieldsCard.hidden = true;
    checkSolution.hidden = true;
    checkError.hidden = true;
  }

  checkFrom.addEventListener('change', () => {
    checkTo.disabled = false;
    fillMeasureSelect(checkTo, checkFrom.value, 'Choose a measure…');
    checkFieldsCard.hidden = true;
    checkSolution.hidden = true;
  });

  checkTo.addEventListener('change', () => {
    const from = checkFrom.value, to = checkTo.value;
    if (!from || !to) return;
    const converter = getConverter(from, to);
    if (!converter) return;
    checkInputs = renderFieldList(checkFieldList, from, converter.requires, 'check');
    checkFieldsCard.hidden = false;
    checkSolution.hidden = true;
    checkError.hidden = true;
  });

  checkRunBtn.addEventListener('click', () => {
    const from = checkFrom.value, to = checkTo.value;
    const check = validateInputs(checkInputs, from);
    if (!check.ok) {
      checkError.textContent = check.message;
      checkError.hidden = false;
      return;
    }
    checkError.hidden = true;
    const converter = getConverter(from, to);
    const result = converter.compute(check.values.sourceValue, check.values);

    checkRevealList.innerHTML = '';
    checkRevealList.appendChild(renderWorksheet(from, to, result));
    checkSolution.hidden = false;
    checkSolution.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  checkClearBtn.addEventListener('click', () => {
    checkInputs.forEach(i => i.el.value = '');
    checkSolution.hidden = true;
    checkError.hidden = true;
  });

  /* ---------------- boot ---------------- */
  resetLearn();
  resetCheck();
  playLandingEntrance();
})();
