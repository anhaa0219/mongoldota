/** Saving a downloaded file in the browser. */

/** Freeing the file straight after the click can cancel the download in Safari and Firefox. */
const REVOKE_AFTER_MS = 60_000;

export interface BlobSaver {
  createUrl: (blob: Blob) => string;
  click: (url: string, fileName: string) => void;
  revoke: (url: string) => void;
  later: (task: () => void, ms: number) => void;
}

export const browserSaver: BlobSaver = {
  createUrl: (blob) => URL.createObjectURL(blob),
  click: (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  },
  revoke: (url) => URL.revokeObjectURL(url),
  later: (task, ms) => {
    setTimeout(task, ms);
  },
};

export function saveBlob(blob: Blob, fileName: string, saver: BlobSaver = browserSaver): void {
  const url = saver.createUrl(blob);
  saver.click(url, fileName);
  saver.later(() => saver.revoke(url), REVOKE_AFTER_MS);
}
