import sharp, { type OverlayOptions } from 'sharp';

/** Static brand artwork, not a project photograph. All raster inputs retain their native scale. */
export async function renderSocialImage(logo: Buffer, photo?: Buffer): Promise<Buffer> {
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="teal" x2="1" y2="1">
      <stop stop-color="#142f39"/><stop offset="1" stop-color="#071e28"/>
    </linearGradient></defs>
    <rect width="1200" height="630" fill="url(#teal)"/>
    ${
      photo
        ? '<rect x="384" width="816" height="630" fill="#edf7fa"/>'
        : `
    <rect x="80" y="178" width="1040" height="274" rx="6" fill="#edf7fa" fill-opacity=".04" stroke="#64d1ec" stroke-opacity=".25"/>`
    }
    <g fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-weight="700">
      <text x="${photo ? 48 : 364}" y="${photo ? 311 : 298}" font-size="${photo ? 33 : 56}" letter-spacing="1">SKLOSERVIS</text>
      <text x="${photo ? 48 : 364}" y="${photo ? 380 : 377}" font-size="${photo ? 66 : 74}" letter-spacing="2">BROD</text>
    </g>
    <path d="M${photo ? 48 : 364} ${photo ? 425 : 410}h72" stroke="#64d1ec" stroke-width="3"/>
  </svg>`);
  const brand = await sharp(logo)
    .resize(photo ? 144 : 184, photo ? 144 : 184, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  const layers: OverlayOptions[] = [
    { input: brand, left: photo ? 48 : 120, top: photo ? 56 : 223 },
  ];
  if (photo) {
    const image = await sharp(photo)
      .autoOrient()
      .resize(744, 550, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    const left = 384 + Math.round((816 - image.info.width) / 2);
    const top = 40 + Math.round((550 - image.info.height) / 2);
    const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <rect x="${left - 8}" y="${top - 8}" width="${image.info.width + 16}" height="${image.info.height + 16}" fill="#ffffff" stroke="#cedfe5"/>
    </svg>`);
    layers.push({ input: frame, left: 0, top: 0 }, { input: image.data, left, top });
  }
  return sharp(background).composite(layers).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
