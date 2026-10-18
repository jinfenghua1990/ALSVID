# Homepage KV and motion review

The preview header orders FC1, Products, Global dealers and Company together. Owner services links to the existing My ALSVID portal. Chinese uses the owner's requested labels “品牌公司” and “车主服务”.

The hero has four centered platform selectors, a green active marker, seven-second automatic cycling, a pause/play control and touch swipe. Selecting a slide pauses automatic cycling. Pointer hover and keyboard focus suspend cycling; hidden documents do not advance. Reduced-motion preference disables automatic cycling and image entrance animation.

The first KV retains the selected clean FC1 poster. The remaining KVs reuse the existing city, fat-tire and touring concept images. They link to their matching platform pages and explicitly identify themselves as concepts with production details unconfirmed. They do not represent additional confirmed FC1 builds.

`public/home/alsvid-bike-motion.svg` derives from the owner's supplied `alsvid-original-wheel-motion.html`. Only the SVG was extracted; the opaque background and embedded title/description were removed for decorative use. Its wheel, chain, frame and charge geometry remains unchanged. No scripts or HTML controls were copied. The original asset remains untouched. SVG CSS retains wheel, chain and charge animations and its reduced-motion rule.

Motion appears beside the header brand, in the assistance technology card and beside the footer brand. The hero photograph is unchanged.

Validation: all 14 web tests, production build with TypeScript, architecture check, four manual slide transitions, automatic slide transition, desktop and 390px mobile layout, existing shop/My ALSVID destinations. This is preview work in draft PR #203; it is not a production release.
