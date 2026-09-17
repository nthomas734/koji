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

export function renderMd(md: string): string {
  if (!md) return '';
  return externalise(marked.parseInline(escapeLoneTildes(md)) as string);
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
