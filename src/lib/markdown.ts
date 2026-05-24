import { marked } from 'marked';

// marked v12 enables GFM strikethrough by default, which treats single ~
// as strikethrough (e.g. ~45min, ~1.5 hrs get struck through in itinerary
// body text). Override the del renderer to output plain text instead.
marked.use({
  extensions: [{
    name: 'del',
    level: 'inline' as const,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer(token: any) {
      return token.text as string;
    },
  }],
});

export function renderMd(md: string): string {
  if (!md) return '';
  let html = marked.parseInline(md) as string;
  html = html.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
  return html;
}
