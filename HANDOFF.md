# AR WALLE — handoff
Updated 2026-09-25. Read this first to continue without repeating prior work.

## Goal
Place uploaded artwork at entered physical dimensions on iPhone walls using
Apple AR Quick Look and browser-generated USDZ. Static frontend; no AI or backend.

## Now
- Source of truth: https://github.com/yitzhach/AR-WALLE, branch `main`.
- Continued main from `2bfd929`; this update adds iPhone photo intake and bottom editor tabs.
- Cloudflare deployment is unverified; no live Cloudflare URL was supplied here.
- User confirmed native pinch works on iPhone. Physical scale, reset and shadows remain unverified.
- This update: 14/14 Node tests and production build pass.
- Browser retest blocked: Chromium unavailable.

## Done
- Dark default/light toggle; artwork sample; JPG/PNG uploads.
- Up to 8 pieces, row/column/grid arrangements, spacing and duplication.
- Manual inch dimensions/aspect lock; 3.5-inch default thickness; side-color eyedropper.
- Default shadow on, soft side/bottom shadow, 0.5-inch modeled rear mounting gap.
- Non-AI image adjustments/flips; optional simulated gallery lighting.
- Browser-local saved library, portable backup/import, soft removal/undo.
- AR dimensions and measured-wall guide; pinch mode and reset to entered size.
- Pinch control hides measurement overlays; launch URL requests scaling on/off.
- Panorama default fixed: 48-inch longest edge; 6:1 uploads start at 48 × 8 inches.
- Photos/camera accept JPG/PNG and browser-decodable HEIC/HEIF; HEIC converts
  locally to JPEG (phone source untouched). Five bottom editor tabs support keyboard use.
- Labels preserve 8:1 ratio; art opaque; textures capped at 4096 pixels.
  JPEG/PNG originals retained; imported HEIC is saved as JPEG. Prior OpenUSD passed.
- Browser checks covered sizing, duplication, themes, save/reload and scale-lock UI.
  Upload/download automation stalled; do not claim those workflows passed.

## Decisions
- Keep Quick Look/USDZ. No custom tracking, Android AR engine or native app.
- Meter units; inches × .0254. Anchor-local XZ; front normal +Y; image top -Z.
- Image edits and unlocked proportions preserve JPG/PNG originals.
- Pinch defaults on; measurement overlays lock scale for true-size placement.
  Quick Look cannot report final pinch size or change percentage overlay timing.
  Live inches and a two-second hold require a different AR architecture.
- Multiple artworks move as one AR object. Wall guide is not camera calibration.
- Lighting/shadow effects are approximations, not paint-relief reconstruction.
- Library is browser/domain-local. Export before changing domain/clearing storage.
- Sample's actual dimensions are unknown; initial 48-inch height is illustrative.
- User authorized fixes and pushing completed work to main; user plans Cloudflare setup.

## Next
1. Fetch current main; read README/DECISIONS; preserve newer work.
2. On iPhone Safari, test a camera photo and a native HEIC from Photos, including
   orientation, dimensions, saved library, backup and AR texture. Test the new
   bottom tabs and upload picker at narrow phone widths.
3. Test image edits, export USDZ, library save/reload, backup/restore and
   mobile layout. Investigate failures; add focused regression tests.
4. Confirm Cloudflare URL/settings with user if not available. Pages: branch main,
   root repository, build `npm run build`, output `dist`. Workers alternative:
   build `npm run build`, deploy `npx wrangler deploy`. Serve dist only.
5. Run README iPhone checklist: orientation, wall placement, measured scale,
   depth/gap, texture, lighting, drift, diptychs, scale lock and reset.
   Use native screenshots; no webpage capture API.

## A–F / Backlog
- A: fixed and regression tested in this update.
- B: performance work below remains pending; soft delete/undo is intentional.
- C: backup validation/copy import exists; field whitelisting and PWA remain pending.
- D: Node tests/build exist; lint/type checks/CI/browser suite remain pending.
- E: bottom editor tabs, dark/light toggle, limits and metadata exist; polish below remains pending.
- F: Cloudflare deployment and real-iPhone acceptance remain unverified.
- Performance: CRC lookup table; cache texture bytes/CRCs; precompute edit constants;
  consider workers only if measured stalls justify them; small library thumbnails.
- Data safety: whitelist imported fields; explore persistent-storage/PWA support.
  Browser storage can be evicted; no fixed retention guarantee. Keep export guidance.
  Do not silently purge recoverable library originals to optimize refresh.
- Maintainability: readable formatting, focused modules, CI with USD validation,
  mesh extents/type checks if validators require them; avoid a broad rewrite.
- Polish: favicon/touch icon, metadata, arrangement persistence, partial batch uploads.
  Keep user-requested dark default. Evaluate security headers without breaking Blob AR.

## Files
public/app.mjs (UI/AR/library), model.mjs (USD/ZIP), images.mjs (textures/edits),
state.mjs (units/layout), storage.mjs (IndexedDB), index.html/style.css (interface).
README.md: hosting/testing/limits. DECISIONS.md: architecture.

## Verify
`npm test`; `npm run build`; `npm run dev` (4173).
Optional: `pip install usd-core`; `python scripts/validate-usdz.py FILE.usdz`.
OpenUSD validation is not physical iPhone validation.
## Resume
Continue existing main, resolve the Next list, and push verified fixes to main.
Keep usage low: targeted reads/tests, brief updates, no repeated architecture research.
Update this handoff at meaningful milestones; do not call Phase 1 complete until
the real-device acceptance checks pass.
