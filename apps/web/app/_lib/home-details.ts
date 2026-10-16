import type { TranslationKey } from "./i18n";

type HomeDetail = {
  title: TranslationKey;
  body: TranslationKey;
  image: string;
  alt: TranslationKey;
  category: "model" | "accessory" | "brand" | "technology";
};
export const homeDetails: Record<string, HomeDetail> = {
  fc: {
    title: "platform.fc.title",
    body: "platform.fc.description",
    image: "fc1-product",
    alt: "images.product",
    category: "model",
  },
  ct: {
    title: "platform.ct.title",
    body: "platform.ct.description",
    image: "scene-city",
    alt: "images.city",
    category: "model",
  },
  ft: {
    title: "platform.ft.title",
    body: "platform.ft.description",
    image: "scene-fat-tire",
    alt: "images.fat",
    category: "model",
  },
  gt: {
    title: "platform.gt.title",
    body: "platform.gt.description",
    image: "scene-touring",
    alt: "images.touring",
    category: "model",
  },
  fc1: {
    title: "product.model_fc1",
    body: "featured.description",
    image: "fc1-product",
    alt: "images.product",
    category: "model",
  },
};
const accessories = ["basket", "rack", "mudguard", "light", "parts"] as const;
for (const slug of accessories)
  homeDetails[`accessory-${slug}`] = {
    title: `accessories.${slug}.title`,
    body: `accessories.${slug}.description`,
    image: "fc1-product",
    alt: "images.product",
    category: "accessory",
  };
const brand = [
  "story",
  "design",
  "engineering",
  "manufacturing",
  "news",
] as const;
for (const slug of brand)
  homeDetails[`about-${slug}`] = {
    title: slug === "story" ? "brand.story" : `about.${slug}.title`,
    body: `about.${slug}.body`,
    image: "scene-touring",
    alt: "images.touring",
    category: "brand",
  };
const technologies = [
  "assist",
  "battery",
  "folding",
  "material",
  "safety",
] as const;
for (const slug of technologies)
  homeDetails[`technology-${slug}`] = {
    title: `technology.${slug}.title`,
    body: `technology.${slug}.body`,
    image: "fc1-product",
    alt: "images.product",
    category: "technology",
  };

// Only own catalog entries can become routes; prototype properties are not pages.
export function getHomeDetail(slug: string): HomeDetail | undefined {
  return Object.hasOwn(homeDetails, slug) ? homeDetails[slug] : undefined;
}
