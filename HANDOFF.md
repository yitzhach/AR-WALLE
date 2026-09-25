# AR WALLE — handoff
Updated 2026-09-25. Read this first to continue without repeating prior work.

## Goal
Place uploaded artwork at entered physical dimensions on iPhone walls using
Apple AR Quick Look and browser-generated USDZ. Static frontend; no AI or backend.

## Now
- Source of truth: https://github.com/yitzhach/AR-WALLE, branch `main`.
- Continued main from `cb7773e`; this commit includes focused panorama and pinch-control fixes.
- Newer label/texture fixes ARE present on main. The previous handoff's claim
  that work existed only on `claude/clever-gauss-d9yxje` was stale.
- Cloudflare deployment is unverified; no live Cloudflare URL was supplied here.
- Real iPhone wall placement, physical scale, pinch/reset and shadows remain unverified.
- This update: 13/13 Node tests and production build pass.
- Browser smoke test blocked: Chromium unavailable and its download failed.

## Done
- Dark default/light toggle; original artwork sample; JPG/PNG uploads.
- Up to 8 pieces, row/column/grid arrangements, spacing and duplication.
- Manual inch dimensions/aspect lock; 3.5-inch default thickness; side-color eyedropper.
- Default shadow on, soft side/bottom shadow, 0.5-inch modeled rear mounting gap.
- Non-AI image adjustments/flips; optional simulated gallery lighting.
- Browser-local saved library, portable backup/import, soft removal/undo.
- AR dimensions and measured-wall guide; pinch mode and reset to entered size.
- Pinch control now unchecks when overlays lock scale; enabling pinch hides overlays.
  Launch URLs explicitly request scaling on/off. Native pinch still needs iPhone retest.
- Panorama default fixed: 48-inch longest edge; 6:1 uploads start at 48 × 8 inches.
- Latest main: labels preserve 8:1 ratio; art material opaque; textures capped at
  4096 pixels; originals unchanged in library; derivatives JPEG .92 or PNG.
- Prior session reports 11/11 tests, build and OpenUSD validation passing.
- Browser checks covered sizing, duplication, themes, save/reload and scale-lock UI.
  Upload/download automation stalled; do not claim those workflows passed.

## Decisions
- Keep Quick Look/USDZ. No custom tracking, Android AR engine or native app.
- Meter units; inches × .0254. Anchor-local XZ; front normal +Y; image top -Z.
- Latest user authorized image edits and unlocked proportions; preserve originals.
- Pinch defaults on. Labels or wall guide force scale lock; turn pinch off for
  true-size placement. Quick Look cannot report final pinched dimensions to the page.
- Multiple artworks move as one AR object. Wall guide is not camera calibration.
- Lighting/shadow effects are approximations, not paint-relief reconstruction.
- Library is browser/domain-local. Export before changing domain/clearing storage.
- Sample's actual dimensions are unknown; initial 48-inch height is illustrative.
- User authorized fixes and pushing completed work to main; user plans Cloudflare setup.

## Next
1. Fetch current main; read README/DECISIONS. Preserve any newer work.
2. Retest reported pinch issue on iPhone with measurements off and pinch on.
   Confirm a fresh launch URL ends in `#allowsContentScaling=1`.
3. Test upload, image edits, export USDZ, library save/reload, backup/restore and
   mobile layout. Investigate failures; add focused regression tests.
4. Confirm Cloudflare URL/settings with user if not available. Pages: branch main,
   root repository, build `npm run build`, output `dist`. Workers alternative:
   build `npm run build`, deploy `npx wrangler deploy`. Serve dist only.
5. Run README acceptance checklist on a real iPhone/Safari: portrait/landscape,
   blank/featured indoor walls, near/far distances, upright parallel placement,
   tape-measured scale, thickness/gap, texture, lighting, drift and diptychs.
   Specifically verify Blob URL launch with download attribute, scale-lock fragment,
   pinch response and reset/relaunch. Use native screenshots; no webpage capture API.

## A–F status / Backlog — after functional validation
- A: fixed and regression tested in this update.
- B: performance work below remains pending; soft delete/undo is intentional.
- C: backup validation/copy import exists; field whitelisting and PWA remain pending.
- D: Node tests/build exist; lint/type checks/CI/browser suite remain pending.
- E: dark/light toggle, limits and metadata exist; polish below remains pending.
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
