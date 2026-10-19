# X5 model launch

## Implementation scope

New public detail routes: `/zh/explore/x5`, `/de/explore/x5`, `/en/explore/x5`. The existing homepage gains a new-model navigation link, a dedicated product launch feature and a footer link; FC1 remains available. The page uses the shared language switcher and translation catalogs, localized specifications, canonical/alternate metadata, image selection, keyboard controls and native FAQ disclosure.

Source facts and uncertainty boundaries: [knowledge record](../knowledge/02-Products/FC-Platform/X5.md). The implemented product page extends the existing ALSVID FC1 graphite / subtle-teal design language. No competing design-tool file is introduced; current implementation and CI screenshots are the review artifacts for this new page.

## Image work

Built-in imagegen was used to retouch two real supplied sample photos. Approved outputs retain purple paint, chain / derailleur, frame silhouette and folded pose. Only studio presentation, lighting, background and image clarity were requested. These are marketing retouches, not engineering geometry.

Final prompts:
1. Side profile: preserve the exact purple bicycle, frame, folding hinge, rear suspension, cables, chain and derailleur; improve restrained studio clarity; use a pale neutral-gray seamless background and contact shadow; wide 3:2, entire bicycle, no text, added logos, people or new components.
2. Folded profile: preserve exact existing folded pose, purple finish, two overlapping wheels, folded handlebar, cables, saddle, chain drive and rear suspension; improve clarity and reflections; pale neutral-gray studio floor, contact shadow, wide 3:2, whole product, no text or new elements.

| Local asset under `public/products/x5` | Dimensions | Bytes |
|---|---|---|
| side-studio-1536.webp | 1536 × 1024 | 106446 |
| side-studio-768.webp | 768 × 512 | 37840 |
| folded-studio-1536.webp | 1536 × 1024 | 113956 |
| folded-studio-768.webp | 768 × 512 | 39994 |
| side-original-1000.webp | 1000 × 1000 | 65022 |
| folded-original-1000.webp | 1000 × 1000 | 99564 |

Original source URLs:
- https://naicisports.com/wp-content/uploads/2025/03/X5-Agile-Folding-Ebike-Modern-Aesthetics-1.jpg
- https://naicisports.com/wp-content/uploads/2025/03/X5-Space-saving-Folded-Design-Electric-Bicycle-5.jpg

WebP exports use quality 84, no upscaling or geometric edits; desktop and mobile studio images are selected by responsive `srcset`. Gallery photographs make the chain/derailleur discrepancy explicit. Original photos remain available for reference.

## Commerce

The page does not create orders or invent prices. An optional server configuration `ALSVID_SHOPIFY_X5_PRODUCT_URL` accepts only HTTPS product URLs on `shop.chaibenn.com`. Until an actual product is configured, the CTA leads to buying information and the existing Dealer portal. This environment variable is not proof that a Shopify product exists.

## Verification and release

All application checks execute in existing ephemeral GitHub CI. No local project dependency installation, build or dev server is used. Required `verify` and `containers` remain intact. The existing browser-preview workflow also exercises all three X5 languages on desktop/mobile: HTTP, responsive overflow, image loading, gallery mouse/keyboard operation, FAQ, locale-preserving switch and canonical metadata. Screenshots are in its existing review artifact.

This source record does not itself assert successful CI or Production deployment; final evidence is the exact commit's CI and Production workflow result plus live-route checks.
