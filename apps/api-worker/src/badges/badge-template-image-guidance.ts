import {
  BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES,
  BADGE_TEMPLATE_IMAGE_MAX_BYTES,
  type BadgeTemplateImageMimeType,
} from "./template-image-storage";

const formatLabels = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
} satisfies Record<BadgeTemplateImageMimeType, string>;
const formats = new Intl.ListFormat("en", { type: "disjunction" }).format(
  BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES.map((mimeType) => formatLabels[mimeType]),
);
const sizeLimit = `${BADGE_TEMPLATE_IMAGE_MAX_BYTES / (1024 * 1024)} MB`;
const recommendedMinPixels = 512;
const recommendedDimensions = `${recommendedMinPixels} × ${recommendedMinPixels} pixels`;

/** Shared upload guidance; recommended dimensions are advisory, not an acceptance constraint. */
export const BADGE_TEMPLATE_IMAGE_GUIDANCE = {
  allowedMimeTypes: BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES,
  maxBytes: BADGE_TEMPLATE_IMAGE_MAX_BYTES,
  recommendedMinPixels,
  fieldHint: `${formats}, up to ${sizeLimit}. We recommend a square image at least ${recommendedDimensions}. Leave space around the artwork and avoid small text.`,
  emptyFile: "This file is empty. Choose an image with content.",
  tooLarge: `Choose an image that is ${sizeLimit} or smaller.`,
  unsupportedFormat: `Choose a ${formats} image.`,
  formatMismatch: `This file does not match its image format. Export it as ${formats} and upload it again.`,
  decodeFailure: `This image could not be opened. Export it as ${formats} and choose it again.`,
  smallImage: `This image may look soft at larger sizes. We recommend at least ${recommendedDimensions}. You can still use it.`,
} as const;
