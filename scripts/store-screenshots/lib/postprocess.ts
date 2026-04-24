import sharp from 'sharp';
import { CROP_TOP, CROP_BOTTOM } from './config.js';

/**
 * Crop Android status bar (top) and gesture bar (bottom) from a raw
 * Maestro screenshot, then return the result as a base64 data URI.
 */
export async function cropToBase64(rawPath: string): Promise<string> {
  const meta = await sharp(rawPath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Cannot read dimensions of ${rawPath}`);
  }

  const croppedHeight = meta.height - CROP_TOP - CROP_BOTTOM;
  if (croppedHeight <= 0) {
    throw new Error(
      `Raw image ${rawPath} is too short (${meta.height}px) to crop ${CROP_TOP}+${CROP_BOTTOM}px`,
    );
  }

  const buffer = await sharp(rawPath)
    .extract({
      left: 0,
      top: CROP_TOP,
      width: meta.width,
      height: croppedHeight,
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Post-process a Playwright screenshot:
 *  - Flatten alpha channel (composite onto white)
 *  - Embed sRGB ICC profile
 *  - Verify output dimensions
 *
 * Returns a 24-bit RGB PNG buffer ready for store submission.
 */
export async function flattenAndVerify(
  pngBuffer: Buffer,
  expectedWidth: number,
  expectedHeight: number,
): Promise<Buffer> {
  const result = await sharp(pngBuffer)
    .flatten({ background: '#FFFFFF' })
    .withIccProfile('srgb')
    .png({ compressionLevel: 9 })
    .toBuffer();

  const meta = await sharp(result).metadata();
  if (meta.width !== expectedWidth || meta.height !== expectedHeight) {
    throw new Error(
      `Dimension mismatch: expected ${expectedWidth}x${expectedHeight}, ` +
        `got ${meta.width}x${meta.height}`,
    );
  }
  if (meta.hasAlpha) {
    throw new Error('Output still has alpha channel after flattening');
  }

  return result;
}
