/**
 * The purpose discriminator for a media file.
 * Used by the backend to:
 * - validate the file (size limits, allowed mime types)
 * - route to the correct MinIO bucket/prefix
 * - decide who can read it
 */
export type MediaPurpose =
  | 'MEAL_IMAGE'
  | 'VENDOR_LOGO'
  | 'VENDOR_BANNER'
  | 'ID_CARD_FRONT'
  | 'ID_CARD_BACK';

/**
 * Response returned by the backend after a successful upload.
 * The frontend stores only `id` — the URL is resolved server-side
 * on every read so bucket renames, CDN switches, and presigning
 * remain backend concerns.
 */
export interface MediaUploadResponse {
  readonly id: string;
  readonly storageRef: string;
  readonly purpose: MediaPurpose;
  readonly url: string;
  readonly size: number;
  readonly mimeType: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: string;
}

/**
 * Full media metadata (returned by GET /media/{id}).
 */
export interface Media {
  readonly id: string;
  readonly purpose: MediaPurpose;
  readonly url: string;
  readonly size: number;
  readonly mimeType: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly status: 'PENDING' | 'USED';
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Result of a client-side upload, tracking progress.
 * Not persisted — used to drive the UI during upload.
 */
export interface MediaUploadState {
  readonly file: File;
  readonly purpose: MediaPurpose;
  readonly progress: number;         // 0–100
  readonly status: 'uploading' | 'success' | 'error';
  readonly result: MediaUploadResponse | null;
  readonly error: string | null;
}

/**
 * The minimal media reference the uploader needs:
 * an id (for delete) and a url (for display).
 *
 * Parents construct this from a full `Media`, from a meal's
 * `imageMediaId` + `imageUrl`, or pass `null` for a new upload.
 */
export interface MediaRef {
  readonly id: string;
  readonly url: string;
}
