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
  function pureWorkingCard(html) {
    const d = document.createElement('div');
    d.className = 'full-working-item';
    d.innerHTML = html;
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
      // type the calculation into the same card — no pan for this part
      typewriterReveal(comboMath, steps[stepIndex].math);
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
    learnState.steps.forEach(step => fullWorkingList.appendChild(pureWorkingCard(step.math)));
    fullWorkingList.appendChild(pureWorkingCard(
      `<span class="full-working-answer-label">Final answer</span>${learnState.answerText}`
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
  playLandingEntrance();
})();
