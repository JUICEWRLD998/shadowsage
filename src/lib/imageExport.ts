/**
 * Image export — turn a DOM node (the Shadow Report Card) into a PNG the user
 * can share or download.
 *
 * Uses html-to-image's toPng. Tries the Web Share API with the file first (great
 * on mobile), falling back to a plain download. Client only — guards against SSR.
 */

import { toPng } from "html-to-image";

/** Render a node to a PNG data URL at 2× for crisp social images. */
export async function nodeToPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // Match the app background so transparent corners don't render white.
    backgroundColor: "#0a0a0f",
  });
}

/** Trigger a browser download of a data URL. */
function download(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}

export interface ShareResult {
  shared: boolean; // true if the native share sheet was used
}

/**
 * Export a node to PNG and share it. Prefers the native share sheet with the
 * image file; otherwise downloads. Returns how it was delivered. Throws only on
 * a genuine render failure so callers can surface an error state.
 */
export async function shareNodeAsImage(
  node: HTMLElement,
  opts: { filename?: string; title?: string; text?: string } = {},
): Promise<ShareResult> {
  if (typeof window === "undefined") return { shared: false };

  const filename = opts.filename ?? "shadow-report.png";
  const dataUrl = await nodeToPng(node);

  // Try native share with the actual image file (mobile/PWA).
  try {
    const file = await dataUrlToFile(dataUrl, filename);
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: opts.title, text: opts.text });
      return { shared: true };
    }
  } catch {
    // User cancelled or share unsupported — fall through to download.
  }

  download(dataUrl, filename);
  return { shared: false };
}
