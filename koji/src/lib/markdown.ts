import { marked } from 'marked';

// Render markdown to HTML — used for stop body_md and logistics value_md
// Opens all links in new tab
const renderer = new marked.Renderer();
renderer.link = ({ href, text }: { href: string; text: string }) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

marked.setOptions({ renderer });

export function renderMd(md: string): string {
  if (!md) return '';
  // For inline content (no wrapping <p> needed for single lines)
  const html = marked.parseInline(md) as string;
  return html;
}
