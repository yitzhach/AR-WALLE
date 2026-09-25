# AR WALLE — handoff

## Goal
Place uploaded artwork at entered physical dimensions on iPhone walls using Apple AR Quick Look and USDZ generated in the browser. Static site, no backend, no AI.

## State
- Repo: https://github.com/yitzhach/AR-WALLE. Working branch `claude/clever-gauss-d9yxje` (not yet merged to `main`, no PR opened).
- `npm test` passes 11/11; `npm run build` passes; exported USDZs pass `scripts/validate-usdz.py` (OpenUSD).
- Not done yet: Cloudflare deploy, physical iPhone acceptance test (README checklist). Do not claim true-scale or wall placement is validated.

## Done in the last session (review section 1)
- AR dimension and wall-reference labels now keep the 8:1 label texture ratio (`LABEL_ASPECT` in `state.mjs`), so text is no longer distorted.
- Artwork material no longer uses texture alpha for opacity; only the shadow and labels do.
- All AR textures are capped at 4096 px on the long edge (`MAX_TEXTURE`); library originals are unchanged.
- Edited, gallery-lit and EXIF-normalized textures use the same 4096 cap (was 2048). Photos are saved as JPEG at 0.92, PNG sources stay PNG. The per-pixel pass is skipped when only a flip or resize is needed.
- Tests added for label aspect, artwork opacity and texture caps.

## Next, in priority order

### A. Open bug (small, needs owner OK because it changes a documented default)
- `createPiece` (`state.mjs`) always defaults to 48 in tall. A panorama (e.g. 6:1) starts at 288 in wide, over the 240 in limit, so AR stays disabled until the user edits the size. Fix: set the longest edge to 48 in. Update README "initial 48-inch height" wording. This is also why automated upload tests previously looked like they "stalled".

### B. Performance on iPhone
1. `crc32` in `model.mjs` is bit-by-bit (~8 steps per byte) and re-runs on every rebuild. Switch to a 256-entry lookup table, and cache each asset's bytes and CRC by texture key.
2. `prepare()` in `app.mjs` re-reads every image's bytes on every change. Cache them alongside the texture cache.
3. Move texture rendering and USDZ building to a Web Worker with `OffscreenCanvas`, so the page doesn't freeze. In `adjustPixel`, compute the hue cos/sin and other per-image constants once, not per pixel.
4. Library thumbnails decode full originals. Store a ~256 px thumbnail with each saved record.
5. Soft-deleted ("trashed") records stay in IndexedDB forever and are loaded on every refresh. Hard-delete once undo is no longer available.

### C. Data safety
1. Safari deletes site storage after 7 days without a visit unless the site is added to the Home Screen. Call `navigator.storage.persist()`, add a web app manifest and `apple-touch-icon`, and prompt users to export their library after saving.
2. Library import (`app.mjs`, backup-file handler) spreads each backup entry wholesale. Build clean records with only known fields (like `recordFromPiece`).

### D. Engineering maturity
1. Code is written minified-style (very long single lines in `app.mjs`, 3-line `style.css`). Add Prettier and ESLint, reformat once in its own commit, then split `app.mjs` into modules (library, inspector, preview, AR launch).
2. Add GitHub Actions CI: `npm test`, `npm run build`, generate a sample USDZ, run `validate-usdz.py` and `usdchecker --arkit` (from `usd-core`). Expect `usdchecker` to flag missing mesh `extent`s; add them.
3. Add `// @ts-check` plus JSDoc for editor type checking.
4. Break the one-line tests into readable cases. Add Playwright end-to-end tests for upload, edit, export USDZ, save, reload, export/import library. Chromium works in this environment (`executablePath: '/opt/pw-browsers/chromium'`); collapsed `<details>` panels must be opened before interacting with sliders.

### E. Polish
- `public/_headers`: change `Permissions-Policy` to `camera=()` (the app never uses the camera); add a CSP such as `default-src 'self'; img-src 'self' blob: data:`.
- Add a favicon (currently a 404 on every load), `apple-touch-icon`, and link-preview meta tags.
- Respect the system light/dark setting when no theme is saved.
- Uploading more files than the 8-piece limit rejects the whole batch; add as many as fit instead.
- The arrangement isn't saved, so a reload loses the layout. Persist it (and later, shareable layouts).
- Rename the sample piece from "Uploaded artwork · sample".
- Add to the README iPhone checklist: confirm Quick Look honours `#allowsContentScaling=0` on a blob URL, and that launch works with the link's `download` attribute set.

### F. Still required before calling Phase 1 done
1. Deploy to Cloudflare (Pages: build `npm run build`, output `dist`; or Workers: `npx wrangler deploy`).
2. Run the README iPhone acceptance checklist on a real device.

## Files
- `public/app.mjs`: UI, arrangement, AR launch, library workflows.
- `public/model.mjs`: USD geometry/materials, aligned stored ZIP writer.
- `public/images.mjs`: image detection, edits, AR textures, shadow/label textures.
- `public/state.mjs`: constants, dimensions/layout, validation. `storage.mjs`: IndexedDB.
- `README.md`: setup, limits, iPhone test steps. `DECISIONS.md`: architecture rationale.

## Verify
`npm test`, `npm run build`, `npm run dev` (port 4173). Optional: `pip install usd-core` then `python scripts/validate-usdz.py FILE.usdz`.

## Resume
Read this file, README and DECISIONS. Keep the existing architecture (Quick Look + browser-built USDZ). Work through the list above in order; ask the owner before changing documented defaults (item A).
