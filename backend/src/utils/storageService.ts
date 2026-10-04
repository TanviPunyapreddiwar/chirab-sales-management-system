import { cloudinary } from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import { Response } from 'express';

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

/**
 * Fetches a Cloudinary file server-side and pipes it back to the Express
 * response as a download attachment.
 *
 * Why proxy instead of redirect:
 * - The frontend may be on a different origin than the backend. A root-relative
 *   download URL resolves to the frontend host, which doesn't handle /api routes,
 *   so the React Router wildcard catches it and sends the user to the dashboard.
 * - Even with an absolute backend URL, res.redirect() to Cloudinary can be
 *   blocked by cross-origin redirect policies on the browser side.
 * - Proxying keeps the JWT entirely inside the API call (never in a browser
 *   address bar or server log for the storage provider) and ensures the browser
 *   always receives a real file download regardless of deployment topology.
 */
export async function proxyCloudinaryDownload(
  cloudinaryUrl: string,
  originalName: string,
  contentType: string,
  res: Response
): Promise<void> {
  const upstream = await fetch(cloudinaryUrl);

  if (!upstream.ok) {
    throw new Error(`Cloudinary fetch failed: ${upstream.status} ${upstream.statusText}`);
  }

  // Sanitise the filename so it is safe for the Content-Disposition header
  const safeFilename = originalName.replace(/[^\w.\-() ]/g, '_');

  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
  );

  const length = upstream.headers.get('content-length');
  if (length) res.setHeader('Content-Length', length);

  // Node 18+ fetch returns a Web Streams ReadableStream; pipe it to Express
  if (upstream.body) {
    const { Readable } = await import('stream');
    Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } else {
    // Fallback: buffer the response
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  }
}
