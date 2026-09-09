import {
  BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES,
  BADGE_TEMPLATE_IMAGE_MAX_BYTES,
} from "../badges/template-image-storage";

/** Builds the local file preview enhancement; the upload remains a native form submission. */
export const renderBadgeTemplateUploadPreviewScript = (): string => `
(() => {
  const form = document.getElementById("badge-template-image-upload-form");
  const input = form?.querySelector('input[type="file"]');
  const preview = document.getElementById("badge-template-upload-preview");
  const image = document.getElementById("badge-template-upload-preview-image");
  const caption = document.getElementById("badge-template-upload-preview-caption");
  const status = document.getElementById("badge-template-image-upload-status");
  const clear = document.getElementById("badge-template-upload-clear");
  if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement) ||
      !(preview instanceof HTMLElement) || !(image instanceof HTMLImageElement) ||
      !(caption instanceof HTMLElement) || !(status instanceof HTMLElement) ||
      !(clear instanceof HTMLButtonElement)) return;

  let activeUrl = null;
  const resetPreview = () => {
    if (activeUrl !== null) URL.revokeObjectURL(activeUrl);
    activeUrl = null;
    preview.hidden = true;
    image.removeAttribute("src");
    caption.textContent = "";
    status.textContent = "";
    status.dataset.tone = "info";
    clear.hidden = true;
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  };
  const showError = (message) => {
    input.setCustomValidity(message);
    input.setAttribute("aria-invalid", "true");
    status.dataset.tone = "error";
    status.textContent = message;
  };
  const previewSelection = () => {
    resetPreview();
    const file = input.files?.[0];
    if (!file) return;
    clear.hidden = false;
    if (!${JSON.stringify(BADGE_TEMPLATE_IMAGE_ALLOWED_MIME_TYPES)}.includes(file.type)) {
      showError("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > ${BADGE_TEMPLATE_IMAGE_MAX_BYTES}) {
      showError(file.size === 0 ? "This file is empty. Choose an image with content." : "Choose an image that is 2 MB or smaller.");
      return;
    }

    const url = URL.createObjectURL(file);
    activeUrl = url;
    // Each selection owns its decoder so a late result cannot replace a newer preview.
    const decoder = new Image();
    input.setCustomValidity("Wait for the image preview to finish loading.");
    status.textContent = "Loading image preview…";
    decoder.addEventListener("load", () => {
      if (activeUrl !== url) return;
      input.setCustomValidity("");
      image.src = url;
      caption.textContent = decoder.naturalWidth + " × " + decoder.naturalHeight +
        " pixels. Full image shown; proportions preserved.";
      preview.hidden = false;
      const small = Math.min(decoder.naturalWidth, decoder.naturalHeight) < 512;
      status.dataset.tone = small ? "warning" : "info";
      status.textContent = small
        ? "This image may look soft at larger sizes. We recommend at least 512 × 512 pixels. You can still use it."
        : "Preview ready. Choose Upload and use image to save this artwork.";
    }, { once: true });
    decoder.addEventListener("error", () => {
      if (activeUrl !== url) return;
      URL.revokeObjectURL(url);
      activeUrl = null;
      showError("This image could not be opened. Export it as PNG, JPEG or WebP and choose it again.");
    }, { once: true });
    decoder.src = url;
  };
  input.addEventListener("change", previewSelection);
  form.addEventListener("reset", resetPreview);
  window.addEventListener("pagehide", resetPreview);
  window.addEventListener("pageshow", previewSelection);
  previewSelection();
})();
`;
