import { createContext, Script } from "node:vm";
import { describe, expect, it } from "vitest";
import { BADGE_TEMPLATE_IMAGE_GUIDANCE } from "../../badges/badge-template-image-guidance";
import { renderBadgeTemplateUploadPreviewScript } from "./badge-template-upload-preview";
import { readPageAssetScriptContentFile } from "./page-asset-content";

class BrowserElement extends EventTarget {
  hidden = true;
  textContent = "";
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

class BrowserInput extends BrowserElement {
  files: readonly { readonly type: string; readonly size: number }[] = [];
  validationMessage = "";

  setCustomValidity(message: string): void {
    this.validationMessage = message;
  }
}

class BrowserImage extends BrowserElement {
  src = "";
  naturalWidth = 0;
  naturalHeight = 0;
}

class BrowserForm extends BrowserElement {
  constructor(readonly input: BrowserInput) {
    super();
  }

  querySelector(): BrowserInput {
    return this.input;
  }
}

const setupPreview = () => {
  const input = new BrowserInput();
  const form = new BrowserForm(input);
  const preview = new BrowserElement();
  const image = new BrowserImage();
  const caption = new BrowserElement();
  const status = new BrowserElement();
  const clear = new BrowserElement();
  const window = new EventTarget();
  const decoders: BrowserImage[] = [];
  const revokedUrls: string[] = [];
  let urlSequence = 0;
  const elements = new Map<string, BrowserElement>([
    ["badge-template-image-upload-form", form],
    ["badge-template-upload-preview", preview],
    ["badge-template-upload-preview-image", image],
    ["badge-template-upload-preview-caption", caption],
    ["badge-template-image-upload-status", status],
    ["badge-template-upload-clear", clear],
  ]);
  const context = createContext({
    document: { getElementById: (id: string) => elements.get(id) ?? null },
    window,
    HTMLElement: BrowserElement,
    HTMLInputElement: BrowserInput,
    HTMLFormElement: BrowserForm,
    HTMLImageElement: BrowserImage,
    HTMLButtonElement: BrowserElement,
    Image: class extends BrowserImage {
      constructor() {
        super();
        decoders.push(this);
      }
    },
    URL: {
      createObjectURL: (): string => `blob:preview-${++urlSequence}`,
      revokeObjectURL: (url: string): void => {
        revokedUrls.push(url);
      },
    },
  });
  // Execute the same status primitive and generated fragment used by the editor bundle.
  new Script(
    readPageAssetScriptContentFile("admin-browser-primitives.js") +
      renderBadgeTemplateUploadPreviewScript(),
  ).runInContext(context);

  const selectFile = (type: string, size: number): void => {
    input.files = [{ type, size }];
    input.dispatchEvent(new Event("change"));
  };
  const latestDecoder = (): BrowserImage => {
    const decoder = decoders.at(-1);
    if (decoder === undefined) throw new Error("Expected image decoding to start.");
    return decoder;
  };

  return {
    input,
    form,
    preview,
    image,
    caption,
    status,
    clear,
    window,
    revokedUrls,
    selectFile,
    latestDecoder,
  };
};

describe("badge artwork upload browser behavior", () => {
  it.each([
    { type: "image/png", size: 0, message: BADGE_TEMPLATE_IMAGE_GUIDANCE.emptyFile },
    {
      type: "image/png",
      size: BADGE_TEMPLATE_IMAGE_GUIDANCE.maxBytes + 1,
      message: BADGE_TEMPLATE_IMAGE_GUIDANCE.tooLarge,
    },
    { type: "text/plain", size: 10, message: BADGE_TEMPLATE_IMAGE_GUIDANCE.unsupportedFormat },
  ])("rejects $type at $size bytes with shared guidance", ({ type, size, message }) => {
    const browser = setupPreview();
    browser.selectFile(type, size);

    expect(browser.input.validationMessage).toBe(message);
    expect(browser.input.attributes.get("aria-invalid")).toBe("true");
    expect(browser.status.textContent).toBe(message);
    expect(browser.status.dataset.tone).toBe("error");
    expect(browser.preview.hidden).toBe(true);
  });

  it.each(BADGE_TEMPLATE_IMAGE_GUIDANCE.allowedMimeTypes)(
    "accepts %s at the size limit after decoding",
    (type) => {
      const browser = setupPreview();
      browser.selectFile(type, BADGE_TEMPLATE_IMAGE_GUIDANCE.maxBytes);
      expect(browser.input.validationMessage).not.toBe("");
      const decoder = browser.latestDecoder();
      decoder.naturalWidth = BADGE_TEMPLATE_IMAGE_GUIDANCE.recommendedMinPixels * 2;
      decoder.naturalHeight = BADGE_TEMPLATE_IMAGE_GUIDANCE.recommendedMinPixels;
      decoder.dispatchEvent(new Event("load"));

      expect(browser.input.validationMessage).toBe("");
      expect(browser.status.dataset.tone).toBe("info");
      expect(browser.preview.hidden).toBe(false);
      expect(browser.image.src).toBe(decoder.src);
      expect(browser.caption.textContent).toContain(
        `${decoder.naturalWidth} × ${decoder.naturalHeight}`,
      );
    },
  );

  it("warns about small images without blocking upload", () => {
    const browser = setupPreview();
    browser.selectFile("image/png", 100);
    const decoder = browser.latestDecoder();
    decoder.naturalWidth = BADGE_TEMPLATE_IMAGE_GUIDANCE.recommendedMinPixels;
    decoder.naturalHeight = BADGE_TEMPLATE_IMAGE_GUIDANCE.recommendedMinPixels - 1;
    decoder.dispatchEvent(new Event("load"));

    expect(browser.input.validationMessage).toBe("");
    expect(browser.status.dataset.tone).toBe("warning");
    expect(browser.status.textContent).toBe(BADGE_TEMPLATE_IMAGE_GUIDANCE.smallImage);
  });

  it("ignores stale decodes and clears an invalid selection", () => {
    const browser = setupPreview();
    browser.selectFile("image/png", 100);
    const stale = browser.latestDecoder();
    browser.selectFile("image/png", 200);
    const current = browser.latestDecoder();
    stale.dispatchEvent(new Event("load"));
    expect(browser.preview.hidden).toBe(true);
    current.dispatchEvent(new Event("error"));
    expect(browser.input.validationMessage).toBe(BADGE_TEMPLATE_IMAGE_GUIDANCE.decodeFailure);
    expect(browser.revokedUrls).toEqual([stale.src, current.src]);

    browser.form.dispatchEvent(new Event("reset"));
    expect(browser.input.validationMessage).toBe("");
    expect(browser.input.attributes.has("aria-invalid")).toBe(false);
    expect(browser.status.textContent).toBe("");
    expect(browser.clear.hidden).toBe(true);
  });

  it("releases image URLs on page hide and rebuilds the preview on return", () => {
    const browser = setupPreview();
    browser.selectFile("image/png", 100);
    const original = browser.latestDecoder();
    browser.window.dispatchEvent(new Event("pagehide"));
    expect(browser.revokedUrls).toEqual([original.src]);
    original.dispatchEvent(new Event("load"));
    expect(browser.preview.hidden).toBe(true);

    browser.window.dispatchEvent(new Event("pageshow"));
    const restored = browser.latestDecoder();
    expect(restored.src).not.toBe(original.src);
    restored.naturalWidth = restored.naturalHeight = 512;
    restored.dispatchEvent(new Event("load"));
    expect(browser.preview.hidden).toBe(false);
    expect(browser.input.validationMessage).toBe("");
  });
});
