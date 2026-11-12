import { marked } from 'marked';

// marked v12 enables GFM strikethrough by default, which treats a single ~
// as strikethrough once two of them appear in one string ("~8:20am ... ~7:45am"
// rendered as "8:20am ... 7:45am"). Escape every lone tilde before parsing;
// a real ~~strike~~ still works.
function escapeLoneTildes(md: string): string {
  return md.replace(/(^|[^~\\])~(?!~)/g, '$1\\~');
}

/**
 * Every link opens in a new tab — except an in-page anchor, which must not.
 * The reference shelf cross-links its own sections (`#close-focus`), and
 * `target="_blank"` on those opened a second copy of the page instead of
 * scrolling.
 */
function externalise(html: string): string {
  return html.replace(/<a href="([^"]*)"/g, (whole, href: string) =>
    href.startsWith('#')
      ? whole
      : `<a target="_blank" rel="noopener noreferrer" href="${href}"`);
}

const inline = (md: string) => marked.parseInline(escapeLoneTildes(md)) as string;
const BULLET = /^[-*•]\s+/;

/**
 * Inline markdown, plus one block: a run of bullet lines ("- x", or the older
 * "<br>• x" bodies) becomes a real <ul>, so a "pick one" list reads as a list
 * and wraps under its own text instead of under the bullet.
 */
export function renderMd(md: string): string {
  if (!md) return '';
  const lines = md.replace(/<br>\s*•\s*/g, '\n• ').split('\n');
  if (!lines.some(l => BULLET.test(l.trim()))) return externalise(inline(md));
  let html = '';
  let para: string[] = [];
  let items: string[] = [];
  const flushPara = () => {
    const text = para.join('\n').replace(/(<br>\s*)+$/, '').trim();
    if (text) html += inline(text);
    para = [];
  };
  const flushList = () => {
    if (items.length) html += `<ul class="md-list">${items.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`;
    items = [];
  };
  for (const raw of lines) {
    const l = raw.trim();
    if (BULLET.test(l)) { flushPara(); items.push(l.replace(BULLET, '')); }
    else { flushList(); para.push(raw); }
  }
  flushPara();
  flushList();
  return externalise(html);
}

/**
 * Block-level markdown — paragraphs, lists, headings.
 *
 * `renderMd` is deliberately inline-only: koji's bodies are single paragraphs
 * that use `<br><br>` for spacing, and wrapping them in <p> would double it.
 * koma's carry notes are the exception — they argue a case in several
 * paragraphs and a bullet list, so they get a real block parse.
 */
export function renderBlockMd(md: string): string {
  if (!md) return '';
  return externalise(marked.parse(escapeLoneTildes(md), { async: false }) as string);
}
