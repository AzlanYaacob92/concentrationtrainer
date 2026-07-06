# Concentration Trainer — deployment package

This replaces your current site at **azlanyaacob92.github.io/concentrationtrainer**.

## What's changed

- **New landing page** — "I am here today to…" with two buttons: **Learn** and **Check My Answers**.
- **Learn mode** — two prompts (target measure, then source measure) → data-entry fields → a
  step-by-step reveal where each step shows the **strategy first**, then a click reveals the
  **arithmetic**, working through all steps, then a final **answer callout**.
- **Check My Answers mode** — same from/to converter as your current site, all working shown at
  once after you press Convert.
- All **20 directed conversion pairs** (molarity, molality, %w/w, %v/v, mole fraction) verified
  against textbook values and cross-checked with round-trip tests (A→B→A returns the start value).
- Same teal/amber visual identity, Georgia display type, clean multi-file structure.

## Files in this package

| File | Purpose |
|---|---|
| `index.html` | Page structure — landing, Learn, Check My Answers |
| `styles.css` | All appearance (teal/amber theme) |
| `chemistry.js` | The chemistry — every conversion formula and its step text, no UI code |
| `app.js` | The behaviour — screen switching, form building, the reveal flow |

Load order matters: `index.html` loads `chemistry.js` before `app.js`.

## How to upload to your existing repository

You already have the repo `azlanyaacob92/concentrationtrainer` connected to GitHub Pages, so you
are just replacing the files inside it.

1. Go to **https://github.com/azlanyaacob92/concentrationtrainer**
2. For **each of the 4 files** in this package:
   - Click on the file with the same name in your repo (e.g. `index.html`). If a file doesn't
     exist yet (e.g. `chemistry.js`), click **Add file → Create new file** instead and type the
     filename.
   - Click the **pencil (✎) icon** to edit (skip this for new files).
   - Select all existing content and delete it.
   - Open the corresponding file from this package, copy everything, and paste it in.
   - Scroll down, add a short commit message like `Rebuild: landing page + Learn/Check modes`,
     and click **Commit changes** (commit directly to `main`).
3. Repeat for `styles.css`, `app.js`, and `chemistry.js`.
4. If your repo has any **old files** this version doesn't use (e.g. leftover `config.js`,
   `format.js`, `conversions.js`, `steps.js`, `ui.js` from the earlier multi-file version), delete
   them from the repo so nothing conflicting is left over — open each one, click the trash icon,
   commit the deletion.
5. Wait about 30–60 seconds, then visit **https://azlanyaacob92.github.io/concentrationtrainer/**
   (a hard refresh — Ctrl/Cmd+Shift+R — helps if you still see the old version, since GitHub Pages
   and browsers both cache).

### Alternative: upload as a batch (faster)

Instead of editing file-by-file:
1. On the repo's main page, click **Add file → Upload files**.
2. Drag in all 4 files from this package at once — GitHub will overwrite any existing files with
   the same names automatically.
3. Delete the leftover old files mentioned in step 4 above if present.
4. Commit directly to `main`.

## Testing it yourself before/after upload

If you want to preview locally first: put all 4 files in one folder, then open `index.html`
directly in a browser (double-click it), or run a tiny local server from that folder
(e.g. `python3 -m http.server 8000` then visit `http://localhost:8000`) — either works since
there's no build step.

## Notes on the chemistry

- Every conversion works from a **fixed basis** (1 L of solution, 1 kg of solvent, 100 g of
  solution, 100 mL of solution, or 1 mol total) — the same method used in the SK015 course, and
  the same reasoning shown to students in each strategy line.
- Percentage-by-volume conversions carry a visible note that they assume volumes are additive
  (a standard simplifying assumption at this level, not exact for all real liquid pairs).
- Field requirements are computed automatically per conversion pair — e.g. molarity→molality only
  asks for molar mass and density; molarity→mole fraction also asks for the solvent's molar mass.
  Only what's needed for a given conversion appears. 
