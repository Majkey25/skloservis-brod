import { SERVICE_ROUTES, type ServiceSlug } from './urls.ts';

/** The visible home hero and its search metadata must share the same CMS fallback. */
export function homePhoto<T extends { image: { src: string } }>(
  photos: readonly T[],
): T | undefined {
  return photos.find((photo) => photo.image.src.includes('office-glass-corridor')) ?? photos[0];
}

/** Gallery subjects without a corresponding product page. Never use these as route IDs. */
export const GALLERY_ONLY_CATEGORIES = {
  vitriny: { cs: 'Vitríny a skleněné police', en: 'Display cases and glass shelves' },
  'sklo-na-nabytek': { cs: 'Sklo na nábytek', en: 'Furniture glass' },
  zrcadla: { cs: 'Zrcadla', en: 'Mirrors' },
  'krbova-skla': { cs: 'Krbová skla', en: 'Fireplace glass' },
} as const;

export type GalleryCategory = ServiceSlug | keyof typeof GALLERY_ONLY_CATEGORIES;
export const GALLERY_CATEGORIES = [
  ...Object.keys(SERVICE_ROUTES),
  ...Object.keys(GALLERY_ONLY_CATEGORIES),
] as [GalleryCategory, ...GalleryCategory[]];

export function isServiceCategory(category: GalleryCategory): category is ServiceSlug {
  return Object.hasOwn(SERVICE_ROUTES, category);
}
