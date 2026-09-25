# AR WALLE — handoff

## Goal
Place uploaded artwork at entered physical dimensions on iPhone walls using Apple AR Quick Look/USDZ.

## Now
Source of truth: https://github.com/yitzhach/AR-WALLE, branch main.
Expanded studio implemented; Cloudflare connection and physical iPhone acceptance test remain.
Do not declare native wall placement/true scale validated from desktop checks.

## Done
- Dark default/light toggle; original artwork bundled as sample.
- Upload JPG/PNG; up to 8 pieces; row/column/grid diptychs and spacing.
- Manual inches, aspect lock, 3.5-inch default depth, sampled side color.
- Shadows on by default; 0.5-inch rear mounting gap; soft side/bottom shadow.
- Deterministic image adjustments/flips; optional simulated gallery lighting.
- Browser-local saved library, backup/import, remove/undo.
- Optional AR dimensions and measured-wall reference.
- Pinch enabled unless true-size mode or measurement overlays lock it.
- Fresh Blob URL per AR launch and reset to entered dimensions.
- 8 Node tests passed; build passed; OpenUSD parsed a 48 × 60-inch export.
- Browser checked manual sizing, diptych, library save/reload, themes and scale-lock UI.

## Decisions
Native Quick Look only. No AI. Originals preserved; authorized edits create derivatives.
Geometry uses anchor-local XZ, front normal +Y, top -Z; vertical anchor metadata.
Dimensions normalized to meters. Multiple pieces are one native AR object.
Wall reference is not camera calibration. Lighting/shadow are visual approximations.
Library is local to browser/domain; export before changing domains or clearing storage.
Actual bundled art dimensions unknown; default sample height 48 in is illustrative.

## Next
1. Connect Cloudflare to main. Pages: build `npm run build`, output `dist`, root repo.
   Workers alternative: build `npm run build`, deploy `npx wrangler deploy`.
2. Run README iPhone acceptance checklist, especially vertical orientation, real size,
   half-inch separation, pinch/reset, shadows and multipiece placement.
3. Manual upload/download/backup/restore and mobile layout smoke test: automated
   browser file workflow stalled. Do not claim those workflows were browser-verified.
4. Fix only observed issues; avoid rebuilding the AR engine or adding scope.

## Files
- public/app.mjs: UI, arrangement, AR launch, library workflows.
- public/model.mjs: USD geometry/materials, aligned stored ZIP writer.
- public/images.mjs: original image handling, edits, shadow/label textures.
- public/state.mjs / storage.mjs: dimensions/layout and IndexedDB.
- public/index.html / style.css: responsive studio.
- README.md: Cloudflare setup, limitations, iPhone test steps.
- DECISIONS.md: architecture rationale.

## Verify
`npm test` and `npm run build`; `npm run dev` serves port 4173.
Optional OpenUSD: `python -m pip install usd-core`, then
`python scripts/validate-usdz.py FILE.usdz`.
A USD shader newline parse error was fixed during validation; preserve valid syntax.
No iPhone or Cloudflare deployment test has been performed in this session.

## Resume
Read this file and README from GitHub main. Continue from the existing code.
User wants usage-efficient continuation, not a new architecture/research cycle.
User already authorized pushing completed changes to main. User will connect Cloudflare.
