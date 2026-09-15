import { marked } from 'marked';

// marked v12 enables GFM strikethrough by default, which treats a single ~
// as strikethrough once two of them appear in one string ("~8:20am ... ~7:45am"
// rendered as "8:20am ... 7:45am"). Escape every lone tilde before parsing;
// a real ~~strike~~ still works.
function escapeLoneTildes(md: string): string {
  return md.replace(/(^|[^~\\])~(?!~)/g, '$1\\~');
}

export function renderMd(md: string): string {
  if (!md) return '';
  let html = marked.parseInline(escapeLoneTildes(md)) as string;
  html = html.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
  return html;
}
