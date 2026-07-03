/* =============================================================
   app.js  —  behaviour: navigation, forms, and the reveal flow.
   Reads chemistry.js for all conversion logic; this file only
   builds the interface and wires up interactions.
   ============================================================= */

(function () {
  const { MEASURES, MEASURE_ORDER, FIELDS, getConverter, fmt } = window.CHEM;

  /* ---------------- screen navigation ---------------- */
  const screens = {
    landing: document.getElementById('screen-landing'),
    learn: document.getElementById('screen-learn'),
    check: document.getElementById('screen-check')
  };

  function goto(name) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'learn') resetLearn();
    if (name === 'check') resetCheck();
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
     LEARN MODE
     Two prompts (target, then source) -> fields -> progressive
     click-to-reveal: strategy, then math, per step, then the
     final answer callout at the end.
     ============================================================= */
  const learnTargetSel = document.getElementById('learn-target');
  const learnSourceSel = document.getElementById('learn-source');
  const promptSource = document.getElementById('learn-prompt-source');
  const fieldsCard = document.getElementById('learn-fields');
  const fieldsTitle = document.getElementById('learn-fields-title');
  const fieldList = document.getElementById('learn-field-list');
  const learnError = document.getElementById('learn-error');
  const learnStartBtn = document.getElementById('learn-start');
  const solutionBox = document.getElementById('learn-solution');
  const revealList = document.getElementById('learn-reveal-list');
  const revealNextBtn = document.getElementById('learn-reveal-next');
  const restartBtn = document.getElementById('learn-restart');

  let learnInputs = [];
  let learnState = null; // { steps, answerText, stepIndex, phase }

  function resetLearn() {
    fillMeasureSelect(learnTargetSel, null, 'Choose what you want to find…');
    promptSource.hidden = true;
    fieldsCard.hidden = true;
    solutionBox.hidden = true;
    learnError.hidden = true;
    revealList.innerHTML = '';
    revealNextBtn.hidden = false;
    restartBtn.hidden = true;
    learnSourceSel.innerHTML = '';
  }

  learnTargetSel.addEventListener('change', () => {
    fillMeasureSelect(learnSourceSel, learnTargetSel.value, 'Choose what you already have…');
    promptSource.hidden = false;
    fieldsCard.hidden = true;
    solutionBox.hidden = true;
  });

  learnSourceSel.addEventListener('change', () => {
    const from = learnSourceSel.value, to = learnTargetSel.value;
    const converter = getConverter(from, to);
    if (!converter) return; // safety: shouldn't happen, all 20 pairs exist
    fieldsTitle.textContent = `Convert ${MEASURES[from].name} → ${MEASURES[to].name}`;
    learnInputs = renderFieldList(fieldList, from, converter.requires, 'learn');
    fieldsCard.hidden = false;
    solutionBox.hidden = true;
    learnError.hidden = true;
  });

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

    learnState = { steps: result.steps, answerText: result.answerText, stepIndex: 0, phase: 'strategy' };
    revealList.innerHTML = '';
    revealNextBtn.hidden = false;
    revealNextBtn.textContent = 'Reveal the strategy';
    restartBtn.hidden = true;
    solutionBox.hidden = false;
    solutionBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  revealNextBtn.addEventListener('click', () => {
    if (!learnState) return;
    const { steps, stepIndex, phase } = learnState;

    if (phase === 'strategy') {
      // reveal the strategy card for the current step
      const block = document.createElement('div');
      block.className = 'step-block';
      block.id = `learn-step-${stepIndex}`;
      block.appendChild(strategyCard(steps[stepIndex].strategy, stepIndex));
      revealList.appendChild(block);
      block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      learnState.phase = 'math';
      revealNextBtn.textContent = 'Show the calculation';
      return;
    }

    if (phase === 'math') {
      // reveal the math card under the same step block
      const block = document.getElementById(`learn-step-${stepIndex}`);
      block.appendChild(mathCard(steps[stepIndex].math));
      const nextIndex = stepIndex + 1;
      if (nextIndex < steps.length) {
        learnState.stepIndex = nextIndex;
        learnState.phase = 'strategy';
        revealNextBtn.textContent = 'Reveal next step';
      } else {
        learnState.phase = 'answer';
        revealNextBtn.textContent = 'Reveal the final answer';
      }
      return;
    }

    if (phase === 'answer') {
      revealList.appendChild(answerCallout(learnState.answerText));
      revealList.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      revealNextBtn.hidden = true;
      restartBtn.hidden = false;
      learnState.phase = 'done';
    }
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
    result.steps.forEach((step, i) => {
      const block = document.createElement('div');
      block.className = 'step-block';
      block.appendChild(strategyCard(step.strategy, i));
      block.appendChild(mathCard(step.math));
      checkRevealList.appendChild(block);
    });
    checkRevealList.appendChild(answerCallout(result.answerText));
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
})();
