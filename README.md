[README.md](https://github.com/user-attachments/files/29619140/README.md)
# Concentration Converter — SK015

Converts between molarity, molality, % by mass, % by volume, and mole fraction,
with full step-by-step working (basis method).

## Folder structure

```
concentration-converter/
├── index.html          ← STRUCTURE: page skeleton only (no CSS, no JS)
├── css/
│   └── styles.css      ← STYLING: colours, fonts, layout, animations
└── js/
    ├── config.js       ← DATA: measure names, units, parameter labels
    ├── format.js       ← UTILITIES: number formatting, step/fraction HTML
    ├── conversions.js  ← CHEMISTRY: the 20 direct conversion formulas
    ├── steps.js        ← CHEMISTRY: step-by-step worked solutions
    └── ui.js           ← BEHAVIOUR: DOM wiring, validation, rendering
```

## Who works where

| Task | File(s) to edit |
|---|---|
| Change colours, fonts, spacing | `css/styles.css` only |
| Rename a measure, fix a unit or placeholder | `js/config.js` |
| Correct a conversion formula | `js/conversions.js` |
| Improve the worked-solution steps or pedagogy | `js/steps.js` |
| Change number rounding / sig. figs | `js/format.js` (the `fmt` function) |
| Add validation, change interactions | `js/ui.js` |
| Add/remove page elements | `index.html` (+ matching CSS/JS) |

## Script load order (important)

The `<script>` tags in `index.html` must stay in this order, because later
files use variables defined in earlier ones:

1. `config.js` → 2. `format.js` → 3. `conversions.js` → 4. `steps.js` → 5. `ui.js`

`ui.js` must always be **last** — it reads the DOM and wires everything up.

## Adding a new measure (e.g. ppm)

1. `config.js` — add an entry to `M` and its key to `order`.
2. `conversions.js` — add `"newkey|other"` and `"other|newkey"` entries to `C`.
3. `steps.js` — add a `BASIS` entry and matching `STEPS` builders.
4. No changes needed in `ui.js` — it builds everything from the data tables.

## Running locally

Plain script tags (no ES modules), so it works by simply opening
`index.html` in a browser — no server needed. Also deploys as-is to
GitHub Pages.
