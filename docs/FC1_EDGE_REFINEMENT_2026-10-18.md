# FC1 product image edge refinement — v3

Scope: local FC1 product story photography. No layout, specifications, localization, commerce flow, runtime services or production deployment changed.

## Assets and integration

Seven new `*-transparent-v3.png` assets live in `apps/web/public/products/fc1/`. Original WebP photographs, earlier transparent PNGs and `side-hero.png` are retained unchanged. The full-bike crops retain their existing canvas dimensions and offsets:

| Photograph | Canvas | Crop origin in original |
| --- | --- | --- |
| Side | 940 × 724 | 343, 156 |
| Rear three-quarter | 757 × 790 | 352, 118 |
| Folded | 886 × 806 | 388, 86 |
| Front suspension | 1333 × 2000 | Uncropped |
| Rear shock | 2000 × 1333 | Uncropped |
| Drivetrain | 1536 × 1024 | Uncropped |
| Handlebar | 1536 × 1024 | Uncropped |

`fc1-photos.ts` is the single source for asset paths and native dimensions. Hero, low-step, folding, suspension, assistance, gallery thumbnails, gallery main image and lightbox all consume this mapping. Reverting the mapping to the earlier filenames rolls back the assets without deleting either version.

## Offline processing

Source RGB comes directly from the original photographs. Local foreground segmentation supplies a starting matte; no generative image redraw was used. Authoring tools were `@imgly/background-removal-node` 1.4.5 and Sharp 0.35.5, outside the website runtime. No dependency was added to the application.

The handlebar matte uses source-guided alpha smoothing (radius 2, epsilon 0.0002) in a 3-pixel contour band, followed by white-matte RGB decontamination. Opaque interiors use unchanged source pixels. This restores the display's white characters that the earlier global color threshold incorrectly removed. The cables, hanging keychain, grip texture and metal highlights remain photographic details.

Macro photographs require additional topology guidance because general object segmentation drops entire dark tires and frame tubes at the canvas boundaries. Source-white connected regions identify background; explicit background samples distinguish chainring openings from real white markings. Foreground protection regions retain the clear spoke reflector and printed shock labels. Defocused macro boundaries use foreground-color guidance sampled up to 10 pixels away before the final 3-pixel contour smoothing. This is an authoring adjustment for the original optical softness, not a whole-image blur or uniform contour shrink.

All seven PNGs contain continuous alpha values across the full 0–255 range. No sharpening, global image blur, alternate vehicle geometry or invented component was introduced. The original front-wheel photograph remains optically soft; enlarging it does not create additional source detail.

## Verification

- Compared matching crops at 100% and integer 200% on dark `#0b0f10`, light `#eef1ef`, and checker backgrounds. Reviewed the full cutouts for white floor remnants, incorrect transparent holes and lost components. Rechecked the handlebar screen, keychain, cables, reflector and shock markings against the originals.
- The isolated-bright-component scan found no disconnected components of 1–4 pixels above alpha 8 with all RGB channels above 210 in the seven candidates. This check supplements visual inspection; it does not classify real reflections as defects.
- Desktop and 390 × 844 mobile gallery selection and lightbox were exercised. Handlebar lightbox display was approximately 1346 × 897 on desktop and 334 × 223 on mobile, below its 1536 × 1024 source. Aspect-ratio error was below 0.00003; no horizontal page overflow was observed.
- All seven image resources loaded. Folded/open image selection uses the same versioned mapping. Chinese, German and English routes returned HTTP 200 with v3 references.
- `pnpm --filter @alsvid/web build` (including TypeScript), `pnpm arch:check` (16 domains) and `git diff --check` passed.

Local review artifacts are in `.tmp/fc1-edge-review-v3/`: `index.html`, matching `*-100.png` / `*-200.png` comparisons, desktop/mobile screenshots, source mattes and the offline authoring script. This ignored review directory is not served by the website. The local preview remains `http://localhost:3022/zh/explore/fc1`.
