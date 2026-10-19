# Stereochemistry Studio

A companion to Organic Nomenclature Studio and the SN1/SN2/E1/E2 practice program.

## Run the program

Install Node.js 22 or newer, run `npm ci`, then `npm run dev`. To publish on Cloudflare, follow [DEPLOYMENT.md](DEPLOYMENT.md). The separate downloadable ZIP includes an offline HTML edition.

The default set is **Mixed / Progressive / 50 questions**. Students can choose Assign R/S, Draw from a Name, or Compare Compounds. Hints, three attempts, worked explanations, saved progress, and a separate report page are included. The report can be printed to PDF or exported as JSON. Instructor preview uses the same report flow and is labeled in the report.

## Student and instructor pages

- Student practice: append `/#/student` to the site address (the default page). It always opens on practice settings. An unfinished set can be resumed; completed reports remain available through Results.
- Instructor problem bank: append `/#/instructor` to the site address.

The instructor page lists each unique R/S assignment (55), every R/S drawing prompt
(55), and every unordered compound pairing (2,850). R/S and pair selectors expose alternate projections without counting them as
separate questions. Progressive sets use unused eligible molecules before
repeating a structure. Fixed difficulty or projection restrictions may exhaust
the eligible pool in longer sets. Filter by task, difficulty, projection,
relationship, or search by name, formula, answer, or stable problem ID. Answers
can be shown or hidden. Instructor preview sets use separate saved progress;
students do not see the instructor solution toggle. The instructor page is
accessible to anyone with its link and is not password protected.

## Optional E/Z coverage

The practice setup includes an **Include E/Z isomers** checkbox (on by default).
Turn it off to exclude all E/Z alkene records from new sets and remove E/Z from
the relationship answer choices and practice guide. The setting is saved with
the set and listed in its report. Existing sets keep their original setting.
The complete instructor problem bank remains available for preview.

## Chemistry coverage

- Assign configurations at labeled tetrahedral carbons in line-angle, Fischer, and Newman views.
- Draw named R/S stereoisomers in the embedded Ketcher editor.
- Compare same compounds, enantiomers, diastereomers, E/Z isomers, constitutional isomers, and compounds with different molecular formulas.
- Recognize meso symmetry and equivalent drawings in different orientations.
- 75 molecular records and 360 validated drawing views. Intro, Intermediate, Advanced, and Progressive sets are randomized. Repetition is possible when the selected question count exceeds the eligible pool.

E/Z isomers are a subset of diastereomers. This program asks students to select **E/Z isomers** when the only difference is the alkene geometry. **Not isomers** means different formulas; same-formula compounds with different connectivity are **constitutional isomers**.

Newman projections view C2 toward C3, with the dot as C2 and the circle as C3. The current Newman bank uses two-center structures even in an Intro set. Alkene comparisons use line-angle views. When line-angle views are disabled, unavailable comparison types are omitted. Drawing answers always use Ketcher, independent of the selected question perspectives.

The drawing checker compares molecular graphs including absolute stereochemistry. It accepts equivalent atom ordering and orientation, explicit hydrogens, and meso-equivalent configurations. It rejects incorrect connectivity, absent or inverted required stereochemistry, and relative/racemic stereo groups.

## Hosting

`npm run build:cloudflare` creates a self-contained static website in `dist`, with locally bundled dependencies and assets sized for Cloudflare. No chemistry server or paid API is required. See [DEPLOYMENT.md](DEPLOYMENT.md) for the build and deploy settings.

The activity stores practice information in the current browser, provides no login or central student database, and does not provide Canvas LTI grade passback. Instructor preview is a teaching convenience, not an access-controlled exam mode.

## Source and maintenance

This repository contains the complete React/Vite source, pinned dependencies, checked-in molecule bank, generator, and tests. Node.js 22 or newer is recommended.

```sh
npm ci
npm run dev
npm test
npm run build:cloudflare
```

`npm run build` writes the website to `dist`. `npm run build:offline` creates a single-file version. The build can take several minutes because Ketcher includes its chemistry engine and editor assets.

`python scripts/generate_bank.py` regenerates the bank using RDKit. It requires `rdkit==2026.9.1` and NumPy. The website itself does not require Python. Projection geometry is converted into molecular chirality by RDKit before the view is matched to its canonical molecular record. Mirror classification uses graph inversion and canonicalization, preserving meso symmetry.

After `npm run build:offline`, `npm run test:ui` runs the end-to-end browser verification. Install the Playwright browser first with `npx playwright install chromium`, or set `CHROMIUM_EXECUTABLE` to an existing compatible Chromium binary.

## Projection drawing checks

Fischer and Newman condensed groups anchor the bonded C or O independently
from the remaining text. Left-side hydroxyl groups appear as HO so that O
faces the bond. `CHROMIUM_EXECUTABLE=/path/to/chromium node
scripts/verify-projections.mjs` checks all 142 projection views for clipped
labels and bonds passing through text. The generator retains the same
verified stereochemistry, atom numbering, question IDs, and view order.

## Third-party software

Ketcher 3.13.0 (Apache-2.0), RDKit.js 2025.3.4 (BSD-3-Clause), React (MIT), and other open-source dependencies are included. See `THIRD_PARTY_NOTICES.txt` for retained licenses. Build-time RDKit is 2026.9.1; the molecule bank is also checked against the browser engine.
