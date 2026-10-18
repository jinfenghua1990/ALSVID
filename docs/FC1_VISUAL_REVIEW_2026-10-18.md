# FC1 product story: visual review and local revision

The subsequent edge-refinement revision is documented in [FC1_EDGE_REFINEMENT_2026-10-18.md](FC1_EDGE_REFINEMENT_2026-10-18.md). The page now uses its versioned v3 cutouts; the layout described here is unchanged.

User reference: https://www.mi.com/de/product/xiaomi-pad-8/

## Observations

The reference uses a compact product navigation, a centered model name and short promise, large product photography with deliberate negative space, and a narrative divided into distinct topics. Its content progresses from a capability overview through design, display, hardware, software and accessories. The useful principles for FC1 are image precision, restrained typography, consistent alignment, and a clear visual change between chapters.

The rejected FC1 version had visible white floor fragments and edge contamination in its cutouts. Headings competed with product photography, measurement labels were detached from their explanations, and repeating the same dark green treatment flattened the page hierarchy. The previous color-threshold assets are superseded.

## Local implementation

- Product-first dark hero with ALSVID FC1 as the primary name, followed by a short localized promise. The existing lifestyle poster appears in its own full-width scene chapter.
- Light neutral low-step and folding chapters alternate with a dark assistance chapter. Text and images occupy separate layout columns; the 40 cm measurement sits with its explanation.
- Front and rear suspension retain photographic proportions. Gallery, configuration notes, specifications and FAQ follow the main product narrative.
- Chinese, English and German copy uses the shared translation catalogs. Main promotional paragraphs describe rider benefits; reference and unresolved configuration information stays available in specifications and notes.
- Shopify remains the separate purchase destination. No cart, price, stock or checkout implementation is added to this story page.

## Image handling

Original WebP photographs remain unchanged. Seven transparent PNG derivatives were regenerated from those originals using local foreground segmentation, rather than a generative redraw. The processing tool is an offline authoring dependency outside the application; it is not shipped in the website.

Full-bicycle images use the segmentation alpha and trim only unused transparent canvas. Macro photographs additionally retain dark original components that a general segmentation model can mistake for background. Edge RGB is decontaminated against the original white matte. The original bicycle pixels supply the frame, components, perspective and color; no alternate vehicle geometry is generated.

Cutouts were inspected on both #101619 and #eef1ef backgrounds. Full-bike display sizes are capped to avoid unnecessary enlargement of the available source photographs. Cropped image dimensions are explicitly reflected in the markup.

## Validation scope

Local Next production build, TypeScript, architecture checks, locale HTTP checks, image responses, browser layout and folding-state interaction. Local preview only; no production release or Shopify publication is part of this revision.
