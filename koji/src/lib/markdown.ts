import { marked, type Tokens } from 'marked';

// marked v12 uses a different renderer API
const renderer = {
  link(token: Tokens.Link): string {
    return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}</a>`;
  },
};

marked.use({ renderer });

export function renderMd(md: string): string {
  if (!md) return '';
  return marked.parseInline(md) as string;
}
