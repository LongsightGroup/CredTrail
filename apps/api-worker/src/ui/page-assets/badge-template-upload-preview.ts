import { BADGE_TEMPLATE_IMAGE_GUIDANCE } from "../../badges/badge-template-image-guidance";

/** Builds the local file preview enhancement; the upload remains a native form submission. */
export const renderBadgeTemplateUploadPreviewScript = (): string => `
(() => {
  const guidance = ${JSON.stringify(BADGE_TEMPLATE_IMAGE_GUIDANCE)};
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
    setStatus(status, "", false);
    clear.hidden = true;
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  };
  const showError = (message) => {
    input.setCustomValidity(message);
    input.setAttribute("aria-invalid", "true");
    setStatus(status, message, true);
  };
  const previewSelection = () => {
    resetPreview();
    const file = input.files?.[0];
    if (!file) return;
    clear.hidden = false;
    if (file.size === 0 || file.size > guidance.maxBytes) {
      showError(file.size === 0 ? guidance.emptyFile : guidance.tooLarge);
      return;
    }
    if (!guidance.allowedMimeTypes.includes(file.type)) {
      showError(guidance.unsupportedFormat);
      return;
    }

    const url = URL.createObjectURL(file);
    activeUrl = url;
    // Each selection owns its decoder so a late result cannot replace a newer preview.
    const decoder = new Image();
    input.setCustomValidity("Wait for the image preview to finish loading.");
    setStatus(status, "Loading image preview…", false);
    decoder.addEventListener("load", () => {
      if (activeUrl !== url) return;
      input.setCustomValidity("");
      image.src = url;
      caption.textContent = decoder.naturalWidth + " × " + decoder.naturalHeight +
        " pixels. Full image shown; proportions preserved.";
      preview.hidden = false;
      const small = Math.min(decoder.naturalWidth, decoder.naturalHeight) < guidance.recommendedMinPixels;
      setStatus(status, small ? guidance.smallImage
        : "Preview ready. Choose Upload and use image to save this artwork.", false, small ? "warning" : "info");
    }, { once: true });
    decoder.addEventListener("error", () => {
      if (activeUrl !== url) return;
      URL.revokeObjectURL(url);
      activeUrl = null;
      showError(guidance.decodeFailure);
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
