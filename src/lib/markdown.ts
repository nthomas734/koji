import { marked } from 'marked';

export function renderMd(md: string): string {
  if (!md) return '';
  let html = marked.parseInline(md) as string;
  html = html.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
  return html;
}
