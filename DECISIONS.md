# Decisions

- **Apple Quick Look + USDZ remains the AR engine.** No custom SLAM, WebXR, Android engine or native app.
- **Static frontend, deterministic browser USDZ generation.** Arbitrary uploads, dimensions and arrangements make pre-generated assets insufficient. Everything runs locally; no upload service or credentials required.
- **Anchor geometry:** stage metersPerUnit=1; inches multiply by 0.0254. Front spans anchor-local XZ, normal +Y, image top -Z. Vertical-plane anchoring metadata stays on /Artwork. This addresses the prior perpendicular-panel symptom; physical validation is still required.
- **Scale policy:** latest user request allows gestures. Pinch defaults on; true-size mode disables it. Measurement overlays force scale lock. Fresh launch URLs reduce reuse of prior AR state, but cannot guarantee native tracking behavior.
- **Mount:** default thickness 3.5 in, rear 0.5 in from wall. Optional alpha-textured shadow behind panel gives soft side/bottom separation. It is a visual approximation, not a light simulation.
- **Originals and edits:** original image bytes are preserved. Latest user request explicitly authorizes non-AI edits and unlocked proportions. Derivatives are generated only for edits, gallery simulation or EXIF normalization; no AI generation/manipulation.
- **Gallery lighting:** simple reversible spotlight on the derivative plus Apple preferred IBL version 2. No promise of real gallery luminaires or paint-relief reconstruction.
- **Multi-piece:** up to eight pieces share one USDZ and native placement transform. Row/column/grid spacing is configured before launch.
- **Library:** browser IndexedDB with explicit save, soft delete/undo and JSON backup. No accounts or cloud persistence. Whole scene persistence is outside this iteration.
- **Measurements:** entered wall dimensions drive a reference guide, not AR calibration. Native Quick Look cannot report the final pinched size or composited screenshot to this webpage.
- **Hosting:** user requested GitHub main and will connect Cloudflare. Serve only build output dist; previous Sites deployment is not the new source of truth.
