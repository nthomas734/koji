import { marked } from 'marked';

export function renderMd(md: string): string {
  if (!md) return '';

  // Parse markdown inline (no block elements)
  let html = marked.parseInline(md) as string;

  // Add target="_blank" to all links via simple string replacement
  html = html.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=');

  return html;
}
