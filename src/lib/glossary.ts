// ── GLOSSARY ────────────────────────────────────────────────────────────────
// Japanese words the plan uses without explaining them ("kissaten", "yatai").
// On a Japan trip, the first time a card uses one, it gets a faint dotted
// underline; tapping it opens a one-line meaning (GlossTip.tsx). Words he
// already knows from three trips (ramen, udon, onsen, konbini, shinkansen...)
// are left out on purpose, so the underlines stay rare enough to notice.
//
// Matching is whole-word and case-insensitive, never inside a link (a place
// name like "Shinsho Soba" stays a plain tap to the map), and only once per
// card (per meaning, so "Edo-era" and "Edo period" don't both underline).
// Longer terms win over shorter ones ("relay kamome" before "kamome").

import type { Dress } from './maps';

const JA: Record<string, string> = {
  'kissaten': 'An old-school Japanese coffee house: siphon coffee, toast sets, often smoking-era interiors.',
  'kissa': 'Short for kissaten, an old-school Japanese coffee house.',
  'morning set': '"Mōningu": a cheap breakfast deal at a coffee shop, usually toast and an egg with your coffee.',
  'shotengai': 'A local covered shopping street, the town\'s everyday arcade.',
  'yatai': 'Fukuoka\'s open-air food stalls: a counter of about eight stools under a tarp, set up each evening.',
  'teishoku': 'A set meal: one main with rice, miso soup and pickles on a tray.',
  'okurimono': 'A small thank-you gift you bring someone, often local food or drink.',
  'amazake': 'A warm, sweet, non-alcoholic drink made from fermented rice.',
  'machiya': 'A traditional wooden townhouse, narrow at the front and deep behind.',
  'noren': 'The split fabric curtain hung over a shop door; up means open.',
  'sakagura': 'A sake brewery\'s storehouse, usually white-walled with dark timber.',
  'oden': 'A winter hotpot: fish cakes, daikon and eggs simmered in light broth.',
  'taimeshi': 'Sea-bream rice: the fish cooked into or laid over rice, Tomonoura\'s dish.',
  'tai-meshi': 'Sea-bream rice: the fish cooked into or laid over rice, Tomonoura\'s dish.',
  'champon': 'Nagasaki\'s noodle soup: thick noodles with seafood, pork and vegetables in a milky broth.',
  'sara udon': 'Nagasaki\'s crispy fried noodles under a thick seafood-and-vegetable sauce.',
  'toruko rice': '"Turkish rice", a Nagasaki plate of pilaf, spaghetti and a pork cutlet together.',
  'homeishu': 'Tomonoura\'s herbal liqueur: sweet, about 14% alcohol, made with 16 herbs since 1659.',
  'ekiben': 'A station bento, made to eat on the train; each region has its own.',
  'hojicha': 'Roasted green tea: brown, toasty and low in caffeine.',
  'manju': 'A small steamed bun with sweet bean paste inside.',
  'bukkake': 'Udon with a little cold, strong broth poured over it, not a bowl of soup.',
  'shumai': 'Open-topped steamed pork dumplings; Kiyoken\'s are a Yokohama classic.',
  'mentaiko': 'Spicy salted pollock roe, Fukuoka\'s signature.',
  'anago': 'Saltwater conger eel, simmered or grilled, softer and lighter than unagi.',
  'mingei': 'The folk-craft movement: everyday pottery, textiles and wood made by unnamed craftspeople.',
  'hinoki': 'Japanese cypress: a pale, lemony-scented wood used for baths and shrines.',
  'kannon': 'The Buddhist figure of mercy, often shown with many arms.',
  'kuro-tamago': 'Owakudani\'s black eggs: boiled in the hot springs, the shell turned black by sulphur.',
  'umegae mochi': 'Dazaifu\'s grilled rice cake with sweet bean paste, stamped with a plum blossom.',
  'ema': 'A small wooden plaque you write a wish on and hang at a shrine.',
  'ekimae': '"In front of the station": the station-square side of town.',
  'hondori': 'The main shopping street; Hondōri means "main street".',
  'kappa': 'A water spirit from folklore, Kizakura\'s mascot: a turtle-like imp with a dish on its head.',
  // Trains, so each bullet train says what kind it is.
  'nozomi': 'The fastest shinkansen on the Tokyo–Osaka–Hakata line; stops only at the big stations.',
  'hikari': 'The middle-speed shinkansen on the Tokyo–Osaka line: a few more stops than the Nozomi.',
  'kodama': 'The all-stops shinkansen: slowest, and the one that serves small stations like Mihara.',
  'kamome': 'The Nishi-Kyushu shinkansen, Takeo-Onsen to Nagasaki, about 30 minutes.',
  'relay kamome': 'The limited express that links Hakata to Takeo-Onsen, across the platform from the Kamome.',
  'midori': 'A JR Kyushu limited express (not a bullet train), Hakata to Sasebo via Arita.',
  'huis ten bosch': 'A JR Kyushu limited express named after the Dutch-themed park it runs to.',
  'romancecar': "Odakyu's reserved-seat limited express from Shinjuku to Hakone; the GSE trains have big front observation windows.",
  'special rapid': 'A JR train a step up from a local: skips stops, no reservation, no extra fare.',
  // People and eras the plan names in passing.
  'edo-era': 'The Edo period, 1603 to 1868, when the shoguns ruled from Edo (now Tokyo).',
  'edo period': 'The Edo period, 1603 to 1868, when the shoguns ruled from Edo (now Tokyo).',
  'hideyoshi': 'Toyotomi Hideyoshi, the 16th-century warlord who unified Japan.',
  'sakamoto ryoma': 'A samurai who helped bring down the shogunate in the 1860s; killed in Kyoto in 1867.',
  // Everyday things.
  'paypay': "Japan's most common phone-payment app (QR codes); needs a Japanese account, so think of it as cash only.",
  'tabelog': "Japan's main restaurant-review site. Scores run low: 3.5 and up is very good.",
  'tai somen': 'Sea bream laid over thin wheat noodles in its own broth, a Seto Inland Sea dish.',
  'shimanami kaido': 'The 70 km route over seven bridges from Onomichi to Shikoku, famous for cycling.',
  'morning service': '"Mōningu": a cheap breakfast deal at a coffee shop, usually toast and an egg with your coffee.',
};

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ESC[c]);

const TERMS = Object.keys(JA).sort((a, b) => b.length - a.length);
// In a /u regex a hyphen outside a class needs no escape (and may not have one).
const PATTERN = new RegExp(`(?<![\\p{L}-])(${TERMS.join('|')})(?![\\p{L}-])`, 'giu');

/** The meaning of a term, for tests and the tip. */
export function glossOf(term: string): string | undefined {
  return JA[term.toLowerCase()];
}

/**
 * Wraps the first use of each glossary word in rendered HTML. Only text
 * between tags is touched, and nothing inside an <a>. Non-Japan trips get
 * the HTML back unchanged.
 */
export function gloss(html: string, dress: Dress): string {
  if (dress !== 'ja' || !html) return html;
  const seen = new Set<string>();
  let inLink = 0;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) {
      if (/^<a[\s>]/i.test(part)) inLink++;
      else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1);
      return part;
    }
    if (inLink || !part) return part;
    return part.replace(PATTERN, (word: string) => {
      const def = JA[word.toLowerCase()];
      if (seen.has(def)) return word;
      seen.add(def);
      return `<span class="gl" role="button" tabindex="0" data-gl="${esc(def)}">${word}</span>`;
    });
  }).join('');
}
