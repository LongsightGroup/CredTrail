import type { ImmutableCredentialStore } from "@credtrail/core-domain";

export const BADGE_TEMPLATE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const BADGE_TEMPLATE_IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const BADGE_TEMPLATE_IMAGE_ARTIFACT_TYPE = "badge-template-image-v1";

export const BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type BadgeTemplateImageMimeType = (typeof BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES)[number];

interface StoredBadgeTemplateImageObject {
  version: 1;
  mimeType: BadgeTemplateImageMimeType;
  byteSize: number;
  base64Data: string;
  uploadedAt: string;
  originalFilename: string | null;
}

interface BadgeTemplateImageObjectIds {
  tenantId: string;
  badgeTemplateId: string;
  assetId: string;
}

interface StoreBadgeTemplateImageInput extends BadgeTemplateImageObjectIds {
  mimeType: BadgeTemplateImageMimeType;
  bytes: Uint8Array;
  originalFilename: string | null;
}

export interface StoredBadgeTemplateImage {
  key: string;
  uploadedAt: string;
}

export interface LoadedBadgeTemplateImage {
  mimeType: BadgeTemplateImageMimeType;
  byteSize: number;
  bytes: Uint8Array;
  uploadedAt: string;
}

const encodePathSegment = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error("Object storage path segments must not be empty");
  }

  return encodeURIComponent(trimmed);
};

export const badgeTemplateImageObjectKey = (ids: BadgeTemplateImageObjectIds): string => {
  return `tenants/${encodePathSegment(ids.tenantId)}/badge-template-images/${encodePathSegment(
    ids.badgeTemplateId,
  )}/${encodePathSegment(ids.assetId)}.json`;
};

const asciiSlice = (bytes: Uint8Array, start: number, length: number): string => {
  if (start < 0 || length < 0 || start + length > bytes.length) {
    return "";
  }

  let output = "";

  for (let index = start; index < start + length; index += 1) {
    output += String.fromCharCode(bytes[index] ?? 0);
  }

  return output;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const isPng = (bytes: Uint8Array): boolean => {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
};

const isJpeg = (bytes: Uint8Array): boolean => {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
};

const isWebp = (bytes: Uint8Array): boolean => {
  return (
    bytes.length >= 12 && asciiSlice(bytes, 0, 4) === "RIFF" && asciiSlice(bytes, 8, 4) === "WEBP"
  );
};

export const badgeTemplateImageMimeTypeFromBytes = (
  bytes: Uint8Array,
): BadgeTemplateImageMimeType | null => {
  if (isPng(bytes)) {
    return "image/png";
  }

  if (isJpeg(bytes)) {
    return "image/jpeg";
  }

  if (isWebp(bytes)) {
    return "image/webp";
  }

  return null;
};

export const badgeTemplateImageMimeTypeFromValue = (
  value: string,
): BadgeTemplateImageMimeType | null => {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "image/png":
      return "image/png";
    case "image/jpeg":
      return "image/jpeg";
    case "image/webp":
      return "image/webp";
    default:
      return null;
  }
};

const asStoredBadgeTemplateImageObject = (
  value: unknown,
): StoredBadgeTemplateImageObject | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.version !== 1) {
    return null;
  }

  if (
    candidate.mimeType !== "image/png" &&
    candidate.mimeType !== "image/jpeg" &&
    candidate.mimeType !== "image/webp"
  ) {
    return null;
  }

  if (
    typeof candidate.base64Data !== "string" ||
    typeof candidate.byteSize !== "number" ||
    !Number.isInteger(candidate.byteSize) ||
    candidate.byteSize < 1 ||
    typeof candidate.uploadedAt !== "string"
  ) {
    return null;
  }

  if (candidate.originalFilename !== null && typeof candidate.originalFilename !== "string") {
    return null;
  }

  return {
    version: 1,
    mimeType: candidate.mimeType,
    base64Data: candidate.base64Data,
    byteSize: candidate.byteSize,
    uploadedAt: candidate.uploadedAt,
    originalFilename: candidate.originalFilename,
  };
};

export const storeBadgeTemplateImage = async (
  store: ImmutableCredentialStore,
  input: StoreBadgeTemplateImageInput,
): Promise<StoredBadgeTemplateImage> => {
  const key = badgeTemplateImageObjectKey(input);
  const payload: StoredBadgeTemplateImageObject = {
    version: 1,
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
    base64Data: bytesToBase64(input.bytes),
    uploadedAt: new Date().toISOString(),
    originalFilename: input.originalFilename,
  };
  const putResult = await store.put(key, JSON.stringify(payload), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: BADGE_TEMPLATE_IMAGE_CACHE_CONTROL,
    },
    customMetadata: {
      tenantId: input.tenantId,
      badgeTemplateId: input.badgeTemplateId,
      assetId: input.assetId,
      artifactType: BADGE_TEMPLATE_IMAGE_ARTIFACT_TYPE,
      mimeType: input.mimeType,
    },
  });

  if (putResult === null) {
    throw new Error(`Badge template image already exists for key "${key}"`);
  }

  return {
    key,
    uploadedAt: payload.uploadedAt,
  };
};

export const loadBadgeTemplateImage = async (
  store: ImmutableCredentialStore,
  ids: BadgeTemplateImageObjectIds,
): Promise<LoadedBadgeTemplateImage | null> => {
  const key = badgeTemplateImageObjectKey(ids);
  const storedObject = await store.get(key);

  if (storedObject === null) {
    return null;
  }

  const serialized = await storedObject.text();
  const parsed = JSON.parse(serialized) as unknown;
  const payload = asStoredBadgeTemplateImageObject(parsed);

  if (payload === null) {
    throw new Error(`Stored badge template image payload is invalid for key "${key}"`);
  }

  const bytes = base64ToBytes(payload.base64Data);

  if (bytes.byteLength !== payload.byteSize) {
    throw new Error(`Stored badge template image byte size mismatch for key "${key}"`);
  }

  const detectedMimeType = badgeTemplateImageMimeTypeFromBytes(bytes);

  if (detectedMimeType === null || detectedMimeType !== payload.mimeType) {
    throw new Error(`Stored badge template image mime type mismatch for key "${key}"`);
  }

  return {
    mimeType: payload.mimeType,
    byteSize: payload.byteSize,
    bytes,
    uploadedAt: payload.uploadedAt,
  };
};
