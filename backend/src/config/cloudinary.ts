import { v2 as cloudinary } from 'cloudinary';

/**
 * Configures the Cloudinary SDK from environment variables.
 * Called once at application startup (imported by offer.routes.ts).
 *
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
export function configureCloudinary(): void {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key   = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !key || !secret) {
    console.warn(
      '⚠️  Cloudinary credentials not set. Document uploads will fail on Railway. ' +
      'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    );
    return;
  }

  cloudinary.config({
    cloud_name: cloud,
    api_key:    key,
    api_secret: secret,
    secure:     true,
  });
}

export { cloudinary };
