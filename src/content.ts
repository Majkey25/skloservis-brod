import { getCollection, type CollectionEntry } from 'astro:content';

export type Settings = CollectionEntry<'settings'>['data'];
export type Contact = CollectionEntry<'contact'>['data'];
export type About = CollectionEntry<'about'>['data'];
export type OpeningHours = CollectionEntry<'hours'>['data'];
export type Banner = CollectionEntry<'banners'>['data'];
export type Service = CollectionEntry<'services'>['data'];
export type GalleryItem = CollectionEntry<'gallery'>['data'];

const singleton = <T extends { data: unknown }>(entries: T[], file: string): T['data'] => {
  if (entries.length !== 1) throw new Error(`${file} must contain exactly one object`);
  return entries[0]!.data;
};
const fileOrder = <T extends { id: string }>(entries: T[]) =>
  [...entries].sort((a, b) => a.id.localeCompare(b.id));

export const getSettings = async (): Promise<Settings> =>
  singleton(await getCollection('settings'), 'settings.yaml');
export const getContact = async (): Promise<Contact> =>
  singleton(await getCollection('contact'), 'contact.yaml');
export const getAbout = async (): Promise<About> =>
  singleton(await getCollection('about'), 'about.yaml');
/** Always returns ALL exceptions and weekly rows, without build-time date filtering. */
export const getHours = async (): Promise<OpeningHours> =>
  singleton(await getCollection('hours'), 'hours.yaml');
/** ALL notices, including disabled/future/expired ones. Apply activeNotices in the browser. */
export const getNotices = async (): Promise<Banner[]> =>
  fileOrder(await getCollection('banners')).map((entry) => entry.data);
export const getServices = async (): Promise<Service[]> =>
  fileOrder(await getCollection('services')).map((entry) => entry.data);
export const getGallery = async (): Promise<GalleryItem[]> =>
  fileOrder(await getCollection('gallery')).map((entry) => entry.data);
