/**
 * Clipboard helper with a legacy fallback (Phase 6 "Copy share link").
 *
 * `navigator.clipboard` needs a secure context (https / localhost); when it is
 * missing or rejects (e.g. jsdom, plain http), fall back to the deprecated
 * `document.execCommand('copy')` via a hidden textarea.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
