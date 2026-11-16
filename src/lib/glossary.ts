// ── GLOSSARY ────────────────────────────────────────────────────────────────
// Japanese words the plan uses without explaining them ("kissaten", "yatai"),
// and on China trips the Chinese ones (ZH, below). On a dressed trip, the
// first time a card uses one, it gets a faint dotted
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

// China trips. Pinyin leads the meaning where the plan writes the hanzi, so
// the word can be said aloud. Train numbers are matched by their letter (see
// TRAIN_NO), so "G8604" opens what a G train is.
const ZH: Record<string, string> = {
  'didi': "China's ride-hailing app, the local Uber. It also runs inside Alipay.",
  '环保车': 'Huánbǎo chē, "eco bus": the electric shuttle that carries visitors between the sights inside a scenic park.',
  'shengjian': "Shēngjiān bāo: Shanghai's pan-fried pork buns, crisp on the bottom and juicy inside. Bite carefully.",
  'char siu': 'Cantonese barbecued pork: strips of pork roasted with a sweet, sticky red glaze.',
  "pu'er": "Pǔ'ěr: a fermented tea from Yunnan, often aged for years and sold pressed into round cakes.",
  'jingdezhen': "China's porcelain capital, in Jiangxi; its kilns made the imperial court's porcelain from the Ming dynasty on.",
  'puxi': 'Pǔxī: the west bank of the Huangpu, old Shanghai and the Bund. Pudong, across the river, is the new side.',
  'lujiazui': 'Lùjiāzuǐ: the skyscraper district in Pudong, straight across the river from the Bund.',
  'xiqu centre': "Hong Kong's venue for Chinese opera (xìqǔ), above all Cantonese opera, in West Kowloon.",
  'beer fish': "Píjiǔ yú: Yangshuo's best-known dish, river fish braised in beer with tomato and chilli.",
  'karst': 'Limestone that rain and rivers have dissolved into steep peaks, natural arches, caves and gorges.',
  'mtr': "Hong Kong's metro, signed in English. Tap a bank card or phone at the gates.",
  'tang-dynasty': 'The Tang dynasty, 618 to 907, often called the high point of classical Chinese culture.',
  'song-era': 'The Song dynasty, 960 to 1279.',
  'ming dynasty': 'The Ming dynasty, 1368 to 1644, which built the Forbidden City.',
  'qing-era': "The Qing dynasty, 1644 to 1912, China's last.",
};

// What the letter in front of a mainland train number says about the train.
// Worded to hold across China's renumbering in late December 2026, when D
// narrows to 200 km/h or less (People's Daily, 2026-10-16).
const ZH_TRAINS: Record<string, string> = {
  G: "G (gāo, \"high\"): China's fastest class of train, at 250 to 350 km/h on most of this trip's lines.",
  D: 'D (dòng): a slower class than G, at 250 km/h at most. Train numbers change in late 2026, after which a D train runs 200 km/h or less.',
  C: 'C (chéng, "city"): an intercity train, a short hop between nearby cities.',
};
const TRAIN_NO = /^([GDC])\d{2,4}$/;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ESC[c]);

// marked writes an apostrophe as &#39;, so "pu'er" has to match that too.
const APOS = "(?:'|&#39;|’)";
const norm = (s: string) => s.toLowerCase().replace(/&#39;|’/g, "'");

function build(map: Record<string, string>, trains: boolean): RegExp {
  const terms = Object.keys(map).sort((a, b) => b.length - a.length).map(t => t.replace(/'/g, APOS));
  if (!trains) {
    // Japan's pattern, exactly as it was. In a /u regex a hyphen outside a
    // class needs no escape (and may not have one).
    return new RegExp(`(?<![\\p{L}-])(${terms.join('|')})(?![\\p{L}-])`, 'giu');
  }
  // China's also keeps digits out at both ends, so "G8604" is a whole number.
  terms.push('[GDC]\\d{2,4}');
  return new RegExp(`(?<![\\p{L}\\d-])(${terms.join('|')})(?![\\p{L}\\d-])`, 'giu');
}

const DICTS: Record<'ja' | 'zh', { map: Record<string, string>; trains: boolean; pattern: RegExp }> = {
  ja: { map: JA, trains: false, pattern: build(JA, false) },
  zh: { map: ZH, trains: true, pattern: build(ZH, true) },
};
const dictFor = (dress: Dress) => dress === 'ja' ? DICTS.ja : dress === 'zh-Hans' || dress === 'zh-Hant' ? DICTS.zh : null;

/**
 * The meaning of a term, for tests and the tip. On a China trip a train
 * number ("G8604") means its type. Defaults to Japan, as it always did.
 */
export function glossOf(term: string, dress: Dress = 'ja'): string | undefined {
  const d = dictFor(dress);
  if (!d) return undefined;
  if (d.trains) {
    const m = term.trim().match(TRAIN_NO);
    if (m) return ZH_TRAINS[m[1]];
  }
  return d.map[norm(term)];
}

/**
 * Wraps the first use of each glossary word in rendered HTML. Only text
 * between tags is touched, and nothing inside an <a>. Trips with no Japan or
 * China dress get the HTML back unchanged. A ticket whose train note already
 * explains its number passes trainNumbers: false, so the body doesn't
 * underline the same thing again (or every alternative it lists).
 */
export function gloss(html: string, dress: Dress, { trainNumbers = true }: { trainNumbers?: boolean } = {}): string {
  const d = dictFor(dress);
  if (!d || !html) return html;
  const seen = new Set<string>();
  let inLink = 0;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) {
      if (/^<a[\s>]/i.test(part)) inLink++;
      else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1);
      return part;
    }
    if (inLink || !part) return part;
    return part.replace(d.pattern, (word: string) => {
      // Train numbers are capitals only: "c100" is not a train.
      if (d.trains && /^[gdc]\d/.test(word)) return word;
      if (!trainNumbers && TRAIN_NO.test(word)) return word;
      const def = glossOf(word, dress);
      if (!def || seen.has(def)) return word;
      seen.add(def);
      return `<span class="gl" role="button" tabindex="0" data-gl="${esc(def)}">${word}</span>`;
    });
  }).join('');
}
