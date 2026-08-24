// Rich-clipboard support for the email drafter.
//
// Gmail keeps formatting when the clipboard carries a text/html flavour, so
// "Copy for Gmail" writes BOTH flavours: rich HTML (bullets, clickable links)
// plus the plain text as a fallback for non-rich targets. The HTML is derived
// from the drafted plain text at copy time, so edits made in the textarea are
// always carried across — there is one source of truth.
//
// Ported from the designer app's quoteEmailTemplate.ts renderEmailHtml
// (same bullet markers: "   - ", "* ", "• ").

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Turn bare URLs into anchors. Runs AFTER escaping, so it can't inject markup. */
const linkify = (s) =>
  s.replace(
    /(https?:\/\/[^\s<]+[^\s<.,)])/g,
    '<a href="$1" style="color:#1155cc;text-decoration:underline;">$1</a>',
  );

/**
 * Render the plain-text email body as Gmail-safe HTML. Inline styles only —
 * Gmail strips <style> blocks and class-based CSS on paste.
 */
export function renderEmailHtml(body) {
  const lines = body.split('\n');
  const out = [];
  let listBuffer = [];
  let paraBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    out.push(
      `<ul style="margin:0 0 16px 0;padding-left:24px;">${listBuffer
        .map((li) => `<li style="margin:0 0 6px 0;">${li}</li>`)
        .join('')}</ul>`,
    );
    listBuffer = [];
  };
  const flushPara = () => {
    if (!paraBuffer.length) return;
    out.push(`<p style="margin:0 0 16px 0;">${paraBuffer.join('<br>')}</p>`);
    paraBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const bullet = line.match(/^(?:\s{2,}-|\*|•)\s+(.*)$/);
    if (bullet) {
      flushPara();
      listBuffer.push(linkify(escapeHtml(bullet[1])));
      continue;
    }
    if (line.trim() === '') {
      flushList();
      flushPara();
      continue;
    }
    flushList();
    paraBuffer.push(linkify(escapeHtml(line)));
  }
  flushList();
  flushPara();

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222;">${out.join('')}</div>`;
}

/**
 * Write both clipboard flavours. Returns true on rich success, false when it
 * fell back to plain text (still a successful copy), throws when both failed.
 */
export async function copyRichText(plain) {
  const html = renderEmailHtml(plain);
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('rich copy unsupported');
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    await navigator.clipboard.writeText(plain);
    return false;
  }
}
