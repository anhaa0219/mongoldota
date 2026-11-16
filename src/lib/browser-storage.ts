/** Small wrappers around localStorage that never throw (private mode, blocked storage) and notify same-tab listeners. */

const EVENT = "preference-change";

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: the value just lasts until the page closes.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Fires on changes from this tab (writeStorage) and from other tabs (the storage event). */
export function subscribeStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
