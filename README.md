# Chemculate Concentration

Interconverts the five ways of expressing solution concentration, showing the full working:

| Measure | Symbol | Unit |
|---|---|---|
| Molarity | M | mol dm⁻³ |
| Molality | *m* | mol kg⁻¹ |
| Percentage by mass | % w/w | % |
| Percentage by volume | % V/V | % |
| Mole fraction of solute | X | — |

All 20 directed pairs are supported. Part of the [Chemculator](https://azlanyaacob92.github.io/) suite.

## Two modes

- **Learn** — pick the target measure, then the source, then fill in what you know. Each step shows the *strategy* first; a click reveals the *arithmetic*. Ends with the answer and an optional full-working summary.
- **Check my answers** — a straight from → to converter that shows every step at once, for comparing against work you have already done.

## The method

Every conversion uses the basis method taught in SK015: pick a convenient fixed amount of solution (1 L, 1 kg of solvent, 100 g, 100 mL, or 1 mol total), work out the pieces, then recombine. The three strategy lines a student sees are always the same three moves — find a basis, bridge to what the target needs, apply the definition.

Field requirements are derived per pair, so only the data a given conversion actually needs is asked for.

## Known limitations

- Percentage-by-volume conversions assume volumes are additive (V<sub>solution</sub> = V<sub>solute</sub> + V<sub>solvent</sub>). Standard at this level, not exact for real liquids. The app says so on screen.
- Answers are given to 4 significant figures.
- Input ranges are open at both ends — 0 % and 100 % (and X = 0 or 1) describe a pure substance rather than a solution, and every conversion from them divides by zero.
- Inputs that cannot all be true of the same solution (for example a molarity too high for the density given) are rejected with an explanation rather than being reported as a negative answer.
- This tool shows the method. Always re-check against your own mark scheme.

## Running it

Static HTML/CSS/JS, no build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

`index.html` loads `chemistry.js` before `app.js` — that order matters.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure — landing, Learn, Check my answers |
| `styles.css` | All appearance, including the light/dark themes |
| `chemistry.js` | The chemistry: every conversion, its step text, and the plausibility guard. No UI code. |
| `app.js` | The behaviour: screen switching, form building, the reveal flow |
| `test-chemistry.js` | Smoke test for the engine |

## Tests

```bash
node test-chemistry.js
```

Checks all 20 pairs against one realistic solution and confirms the plausibility guard catches impossible inputs. Exits non-zero on failure.
