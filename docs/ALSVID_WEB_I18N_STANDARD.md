# ALSVID Web Internationalization Standard

**Status:** Required for new and materially revised web pages  
**Scope:** ALSVID WWW, My ALSVID, and Dealer Portal  
**Storefront boundary (ADR 0005):** ALSVID owns the initial B2C storefront and its cart/checkout/order copy. All ALSVID-owned public checkout copy requires zh/de/en translation-key parity; DE and EN require pre-launch legal review. Optional future external-provider checkout/localization remains the provider's responsibility where applicable.

This is an implementation standard, not a request to translate every page into every planned language immediately. Build the internationalization boundary into page structure and data from the start so adding a language later is primarily a translation-content change.

## 1. Locale policy

- Phase 1 supported and exposed locales: German (`de`) and English (`en`). The user's explicit 2026-10-16 follow-up adds Chinese (`zh`) to the consumer homepage and its concept-detail pages for Chinese review; retain DE/EN and the same translation-key architecture.
- Reserve locale identifiers for later: Dutch (`nl`), French (`fr`), Italian (`it`), and Spanish (`es`).
- Keep the supported-locale registry/configuration centralized. Do not scatter locale checks or hard-code a two-language assumption through page logic.
- A locale is enabled only when its translation content and required route/UI coverage are ready. Reserving a locale does not imply exposing incomplete translations.

## 2. No hard-coded user-facing strings

Every user-visible string in ALSVID-owned web UI must come from a translation key, including:

- Navigation, page titles, buttons, labels, field hints, dialogs, and accessibility labels.
- Empty/loading/error/success states, validation messages, notifications, and system prompts.
- Authentication, registration, save/cancel/submit, orders, service, vehicle binding, cart-related ALSVID links, and VIN flows.
- Dynamic text assembled from business data. Use localized data fields and locale-aware formatting, not conditional branches returning literal text.

Example:

```tsx
<button>{t("product.buy_now")}</button>
```

Do not write:

```tsx
<button>Jetzt kaufen</button>
```

Use stable, namespaced keys such as `navigation.products`, `product.buy_now`, `product.specifications`, `auth.login_failed`, and `vehicle.bind_vin`. Translation files should be organized by locale and, where useful, namespace. The translation accessor must support interpolation/plurals and provide a documented fallback; missing keys should be detectable during development/CI rather than silently shipping key names or empty UI.

Technical identifiers such as model codes, SKU, VIN, and BOM revision IDs remain stable identifiers. Their human-readable names and descriptions are localized.

## 3. Locale-aware URLs and navigation

ALSVID-owned public web pages use locale-prefixed paths:

```text
/de/
/en/
/de/models/
/en/models/
/de/models/fc1/
/en/models/fc1/
```

- Every localized page must have a stable route mapping to its equivalent in other enabled locales.
- The shared language switcher changes the locale while preserving the current page when an equivalent route exists. Example: `/de/models/fc1` → `/en/models/fc1`.
- If an equivalent page does not exist in the target locale, send the user to the nearest meaningful localized parent, with a predictable fallback.
- The language switcher is a shared site component, not a page-specific recreation. Phase 1 displays `DE | EN`; future locales can be added through configuration and translations.
- Keep locale selection separate from business/account identity and authorization.

For indexable public pages, emit correct locale metadata (including canonical and language-alternate links where applicable). Do not create duplicate URLs that differ only in inconsistent locale handling.

## 4. Language recommendation and remembered choice

The initial locale is German (`de`) when no valid explicit preference is saved (owner confirmation, 2026-10-24). Browser language, region and `Accept-Language` must not automatically select Chinese or English. Explicit locale URLs and a user's saved language choice continue to take precedence; do not force repeated redirects based on geolocation or browser settings.

When a user explicitly selects a language:

- Remember the preference using the existing consent/privacy-appropriate storage mechanism.
- Honor that choice on later visits.
- Keep the URL locale and rendered content consistent.
- Allow the user to change it at any time.

## 5. Shared translation architecture

Create a centralized locale registry and translation resources for `de` and `en`. Pages must consume translations through the shared i18n API/provider; do not create page-local language switches, ad-hoc dictionaries, or scattered `if (locale === ...)` branches for copy.

Keep translation keys independent from page layout and business logic. Adding `nl`, `fr`, `it`, or `es` should require adding locale resources and enabling the locale after review, not redesigning screens or changing business rules.

AI-assisted translation may be added later as a content workflow. Machine-generated copy must be reviewable and must not be treated as approved merely because it exists.

## 6. Localized product and business data

Do not model translatable business copy as a single-language `name` or `description` field when that content is rendered to users. Use a localized object or normalized translation records, for example:

```json
{
  "name": { "de": "…", "en": "…" },
  "description": { "de": "…", "en": "…" }
}
```

Apply this to platform/model/variant names, configuration labels, product descriptions, specifications, selling points, warranty and service explanations, and other customer-facing catalog content. Preserve invariant identifiers and structured numeric/unit data separately from translated prose. Define validation for required locales and a safe fallback for incomplete optional content.

Localized content remains data, not page markup. ALSVID-owned checkout copy uses the shared locale catalogs; future hosted-provider UI must be reviewed separately for locale and legal requirements.

## 7. Images and media

Hero, product, and banner assets should be text-free wherever practical. Do not bake language-specific headlines, calls to action, or promotional copy into shared images. Render copy as HTML/UI text over the asset so one image can serve multiple locales.

If text embedded in an image is essential (for example, a diagram label), provide locale-specific assets with explicit locale metadata and accessible text alternatives.

## 8. Layout and responsive behavior

Design and verify components for German text lengths, including longer compound words and labels:

- Do not make buttons, navigation items, or form controls too narrow for translated text.
- Allow card headings, descriptions, and table labels to wrap or reflow appropriately.
- Avoid layouts that depend on fixed text widths or English-only truncation.
- Test key desktop and mobile breakpoints in both German and English.
- Keep accessible names and focus behavior correct after text expands.

The acceptance bar is a usable, intentional layout in both phase-1 locales, not merely a successful string substitution.

## 9. Locale-sensitive formatting

Format dates, numbers, currencies, measurements, and pluralized quantities using locale-aware APIs and explicit business units/currency. Do not concatenate localized text with hard-coded formatting assumptions. Store canonical business values separately from their formatted display representation.

## 10. ALSVID storefront ownership

The initial ALSVID-owned B2C cart, checkout and order UI must use the same localization rules as all ALSVID public pages. If a future third-party hosted checkout or separate sales channel is approved, its externally hosted fields and legal disclosures require an explicit translation and jurisdiction review. The ALSVID-owned surrounding UI remains localized.

## 11. Required acceptance checklist

A new or materially revised ALSVID-owned web page is ready only when all applicable checks pass:

- [ ] No user-facing text is hard-coded in page/component logic.
- [ ] All UI/system states use stable translation keys.
- [ ] German and English resources exist for the page's required keys.
- [ ] Locale-prefixed routes work under `/de/` and `/en/`.
- [ ] Switching language preserves the equivalent current route.
- [ ] Explicit language choice is remembered; browser/region detection does not force repeated redirects.
- [ ] Product/business copy is read from locale-aware data fields where applicable.
- [ ] Shared images contain no language-specific text where practical.
- [ ] German-length content has been checked at desktop and mobile breakpoints.
- [ ] Date, number, currency, measurement, plural, and accessibility text are locale-aware.
- [ ] Missing translation keys are detectable in development or CI.
- [ ] ALSVID-owned product/cart/checkout copy uses shared translations; provider-hosted payment steps receive separate locale review.

**Future-language rule:** adding Dutch, French, Italian, or Spanish should primarily add reviewed translations and enable the locale. It must not require rebuilding page structure or changing business logic.
