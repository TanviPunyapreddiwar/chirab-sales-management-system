import { cloudinary } from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

/**
 * Determines whether a storagePath value stored in the database is a
 * Cloudinary URL (new records) or a legacy local filesystem path (old records).
 */
export function isCloudinaryUrl(storagePath: string): boolean {
  return storagePath.startsWith('http://') || storagePath.startsWith('https://');
}

export interface UploadResult {
  /** Stored in the database `storagePath` column */
  storagePath: string;
  /** Stored in the database `fileName` column (Cloudinary public_id) */
  cloudinaryPublicId: string;
}

/**
 * Uploads a file buffer to Cloudinary as a raw resource.
 * Returns the secure_url (used as storagePath) and public_id.
 *
 * All document types (PDF, Word, Excel, images) are uploaded with
 * resource_type: 'raw' so Cloudinary treats them as generic files and
 * preserves the original extension when accessed.
 */
export function uploadToCloudinary(
  buffer: Buffer,
  originalName: string,
  folder = 'chirab-sales-documents'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder,
        use_filename: false,   // let Cloudinary assign a unique public_id
        unique_filename: true,
        overwrite: false,
        // Attach original filename as a tag so it is searchable in the Cloudinary console
        tags: [originalName],
      },
      (error: Error | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          storagePath: result.secure_url,
          cloudinaryPublicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}
