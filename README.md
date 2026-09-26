# AR[T]WALLE

A small static artwork studio using Apple AR Quick Look and locally generated USDZ. No account, upload server, AI, framework, or runtime dependencies.

## Run

Node 18+:

```sh
npm test
npm run dev
npm run build
```

Open http://localhost:4173. Build output is `dist/`.

## Cloudflare

Connect `yitzhach/AR-WALLE`, branch `main`, repository root.

- **Pages:** framework None; build `npm run build`; output `dist`.
- **Workers static assets:** build `npm run build`; deploy `npx wrangler deploy`. The included `wrangler.jsonc` serves only `dist/`.

Use HTTPS on the deployed site. No secrets or backend configuration are needed. Cloudflare has not been connected or deployed by this change.

## Use

Choose JPG/PNG or an iPhone HEIC/HEIF photo from Photos, or tap **Take photo** to open the camera. Safari converts a decodable HEIC/HEIF selection to JPEG locally for AR and the saved library; the source in Photos is untouched. Some browsers cannot decode HEIC/HEIF, in which case export a JPG. Successful uploads are automatically saved to the browser's library; the bundled sample is not. Use **Save artwork changes** after editing dimensions or settings, including for photos uploaded before this update. **Remove selected** in Artwork or Arrange removes the piece from the current wall, while its saved library copy remains available. Choose a piece, use the **Artwork / Image / Display / Wall / Arrange / Library** tabs beneath the preview, enter its actual dimensions in inches, then tap VIEW ON MY WALL below the preview in iPhone Safari. The Image controls scroll beneath a sticky preview. The bundled artwork's real dimensions are unknown; its initial 48-inch height is only a starting value. Aspect lock preserves proportions. Unlocking explicitly stretches the displayed image to the entered rectangle; it does not crop or overwrite the source.

New uploads start with a 48-inch longest edge, preserving image proportions (a 6:1 panorama starts at 48 × 8 inches). Enter actual measurements before true-size AR placement. New paintings default to 3.5-inch thickness and a half-inch mounting gap. Side color can be sampled from the artwork preview. Drop shadows default on. Upload up to eight images and arrange them side by side, vertically, or in a two-column grid. An arrangement moves/scales as one AR object; pieces are positioned relative to each other on the webpage.

Pinch resizing is enabled by default in this expanded editor. Turn it off for true-size placement. Dimension labels or the wall guide automatically switch pinch off so their measurements remain valid. Enabling pinch again hides both measurement overlays. The launch URL explicitly requests scaling on (`allowsContentScaling=1`) or off (`allowsContentScaling=0`). Close any existing Quick Look session and relaunch after changing this setting. Quick Look does not return the final pinched dimensions or gesture state to this webpage, so it cannot show live inches alongside Apple's percentage overlay or extend that overlay for two seconds after release. Fixed dimension labels would become inaccurate after a pinch. If a prior AR session looks too large, close it, enter dimensions here, use Reset AR to entered size, and relaunch. A fresh Blob URL is created for each launch.

The optional measured wall reference is a visual comparison, not camera calibration. Gallery lighting is a deterministic spotlight simulation applied to a preview texture; it is not a physical spotlight or inferred paint relief. The optional soft shadow is a textured plane behind the panel, offset sideways/downward. Native AR lighting and shadows may differ from the webpage.

Brightness, contrast, saturation, highlights, shadows, hue, warmth and flips operate on a derivative. Originals remain stored unchanged. Unedited, normally oriented images up to 4096 pixels on the long edge are embedded byte-for-byte in USDZ. Larger, edited, gallery-lit or EXIF-normalized images use a derivative at the same 4096-pixel cap (JPEG at 0.92 quality; PNG sources stay PNG). Artwork renders opaque; only shadow and label overlays use transparency. Native rendering/color management can affect apparent color.

## Saved library

New uploads save automatically; save again after editing an artwork. The Library tab below the wall preview shows the same saved artwork and upload, camera, backup and restore actions as the library section. IndexedDB stores its original, dimensions, side color and image edits on this browser and origin. If automatic saving fails, the artwork remains in the arrangement and a message offers a manual retry. Arrangements and scene lighting settings are not saved. Export/import library JSON provides a portable backup. Library removal is soft deletion with an Undo option for the most recent removal. Clearing browser data, private browsing, or changing domains can lose access to saves; export first. This is not cloud synchronization.

Library cards use cached 256-pixel previews of the original; full originals remain in storage and backups. Backup imports keep only recognized artwork fields. When an upload batch exceeds available arrangement slots, images that fit are added and skipped files are named in the status message. AR rebuilds reuse unchanged texture bytes and checksums.

Input limits: JPG/PNG and decodable HEIC/HEIF, 15 MB per selected file and converted JPEG, 24 megapixels (larger HEIC/HEIF is reduced locally), eight pieces, 60 MB combined working images; generated USDZ capped at 100 MB. WebP is not supported. HEIC/HEIF conversion does not save the original HEIC bytes in the library backup.

## Verification

Seventeen Node tests cover units, label proportions, texture caps, layout, aspect ratios, scale locking, input validation, photo format detection, deterministic adjustments, original bytes, shadow placement and ZIP alignment. An exported 48 × 60-inch USDZ was also parsed with OpenUSD and its geometry, texture bytes and CRC verified in a prior session. Earlier browser checks covered page load, dark/light controls, manual sizes, duplication, scale-lock UI, library save and persistence after reload. Current Chromium checks at a 390 × 844 viewport passed upload auto-save, thumbnail sizing, library reload/add, USDZ download and backup/restore without page errors. Native camera/HEIC import, shadow appearance and iPhone layout still need real-device smoke tests. The user confirmed native pinch works; scale and placement remain unmeasured.

Optional package validation:

```sh
python -m pip install usd-core
python scripts/validate-usdz.py path/to/artwork.usdz
```

### Required iPhone acceptance test

1. Open the HTTPS site in Safari on a modern AR-capable iPhone; record iPhone/iOS version.
2. Upload an original, enter known 48 × 60 in dimensions (unlock aspect only when intentionally changing proportions). Thickness 3.5 in; shadow on.
3. Disable pinch; launch Quick Look, choose AR if needed, scan a normal indoor wall. Confirm front is upright and parallel to the wall, not perpendicular or lying on a table.
4. Compare against tape marks 48 in apart horizontally and 60 in vertically. Check depth, approximate half-inch wall separation, front image orientation/quality, side color and shadow below/to the side.
5. Repeat in portrait/landscape, on blank and visually featured walls, at near and farther viewing distances. Reposition and walk sideways; note drift, flicker, lighting and occlusion.
6. Close AR, enable pinch with labels/guide off, relaunch and verify pinch responds. Reset/relaunch and confirm entered size returns. Labels/guide on must prevent arbitrary scaling.
7. Try two different uploads as a diptych; verify spacing, both textures and one-object movement. Test image edits/flips, eyedropper, library save/reload/remove/undo and backup/restore.
8. Capture using native Quick Look controls where available or iPhone screenshots. The webpage has no API for the composited camera image or custom SAVE IMAGE button.

Do not call Phase 1 physically validated until this checklist passes. Desktop/non-AR browsers offer editing and USDZ download with an iPhone Safari fallback message.

## Apple references

- https://developer.apple.com/augmented-reality/quick-look/
- https://developer.apple.com/documentation/arkit/adding-an-apple-pay-button-or-a-custom-action-in-ar-quick-look
- https://developer.apple.com/documentation/arkit/specifying-a-lighting-environment-in-ar-quick-look
- https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/

Launch uses an `a[rel=ar]` with a direct image child and a USDZ Blob URL. `#allowsContentScaling=0` requests native scale locking. USD stage uses meter units and Apple's vertical-plane anchoring metadata. Camera tracking, plane detection and placement remain native to Quick Look.
