import type { APIRoute, ImageMetadata } from 'astro';
import { root } from 'astro:config/server';
import { readFile } from 'node:fs/promises';
import { getGallery } from '../../content.ts';
import { deployment, socialPreview } from '../../lib/seo.ts';
import { ROUTES, pageUrl } from '../../lib/urls.ts';
import { renderSocialImage } from '../../lib/social-image.ts';

export async function getStaticPaths() {
  const context = deployment(import.meta.env.SITE_BUILD_TARGET);
  const gallery = await getGallery();
  const sources = Object.entries(
    import.meta.glob<{ default: ImageMetadata }>(
      '../../assets/gallery/*.{jpg,jpeg,png,webp,avif}',
      {
        eager: true,
      },
    ),
  );
  const images = new Map<string, string | undefined>([['brand', undefined]]);
  for (const route of ROUTES) {
    const image = socialPreview(context, pageUrl(route.id, 'cs', context.base), 'cs', gallery);
    const file = image.photo
      ? sources.find(([, source]) => source.default.src === image.photo!.image.src)?.[0]
      : undefined;
    if (image.photo && !file)
      throw new Error(`Social photograph has no local source: ${image.key}`);
    images.set(image.key, file?.replace('../../', 'src/'));
  }
  return [...images].map(([image, file]) => ({ params: { image }, props: { file } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { file } = props as { file?: string };
  const [logo, photo] = await Promise.all([
    readFile(new URL('src/assets/brand/wordpress-logo.png', root)),
    file ? readFile(new URL(file, root)) : undefined,
  ]);
  return new Response(new Uint8Array(await renderSocialImage(logo, photo)), {
    headers: { 'Content-Type': 'image/jpeg' },
  });
};
