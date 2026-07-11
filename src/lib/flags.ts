/**
 * Country → emoji flag lookup for the 2026 World Cup nations.
 *
 * The WorldCup26.ir API returns English team names (`home_team_name_en`), not
 * flags, so we resolve one ourselves. Emoji flags render everywhere, need no
 * network, and keep the UI dependency-free.
 *
 * Lookups are forgiving: we normalise case/whitespace and accept many common
 * aliases ("USA" → United States, "Korea Republic" → South Korea, "Czechia" →
 * Czech Republic, etc.). Unknown teams fall back to a neutral 🏳️ so the UI
 * never shows a broken glyph. The map intentionally covers far more than 48
 * nations so qualifiers, hosts, and late playoff entrants all resolve.
 */

/** Canonical name → flag emoji. */
const FLAG_BY_NAME: Record<string, string> = {
  // Hosts
  "united states": "🇺🇸",
  canada: "🇨🇦",
  mexico: "🇲🇽",
  // CONMEBOL
  argentina: "🇦🇷",
  brazil: "🇧🇷",
  uruguay: "🇺🇾",
  colombia: "🇨🇴",
  ecuador: "🇪🇨",
  paraguay: "🇵🇾",
  peru: "🇵🇪",
  chile: "🇨🇱",
  bolivia: "🇧🇴",
  venezuela: "🇻🇪",
  // UEFA
  france: "🇫🇷",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  spain: "🇪🇸",
  portugal: "🇵🇹",
  netherlands: "🇳🇱",
  belgium: "🇧🇪",
  germany: "🇩🇪",
  italy: "🇮🇹",
  croatia: "🇭🇷",
  switzerland: "🇨🇭",
  austria: "🇦🇹",
  denmark: "🇩🇰",
  norway: "🇳🇴",
  sweden: "🇸🇪",
  poland: "🇵🇱",
  "czech republic": "🇨🇿",
  serbia: "🇷🇸",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  ukraine: "🇺🇦",
  turkey: "🇹🇷",
  greece: "🇬🇷",
  hungary: "🇭🇺",
  romania: "🇷🇴",
  slovakia: "🇸🇰",
  slovenia: "🇸🇮",
  "republic of ireland": "🇮🇪",
  ireland: "🇮🇪",
  iceland: "🇮🇸",
  albania: "🇦🇱",
  // CAF
  morocco: "🇲🇦",
  senegal: "🇸🇳",
  tunisia: "🇹🇳",
  algeria: "🇩🇿",
  egypt: "🇪🇬",
  "ivory coast": "🇨🇮",
  ghana: "🇬🇭",
  cameroon: "🇨🇲",
  nigeria: "🇳🇬",
  "south africa": "🇿🇦",
  "cape verde": "🇨🇻",
  "dr congo": "🇨🇩",
  mali: "🇲🇱",
  "burkina faso": "🇧🇫",
  angola: "🇦🇴",
  // AFC
  japan: "🇯🇵",
  "south korea": "🇰🇷",
  iran: "🇮🇷",
  "saudi arabia": "🇸🇦",
  australia: "🇦🇺",
  qatar: "🇶🇦",
  uzbekistan: "🇺🇿",
  jordan: "🇯🇴",
  iraq: "🇮🇶",
  "united arab emirates": "🇦🇪",
  // OFC
  "new zealand": "🇳🇿",
  // CONCACAF
  "costa rica": "🇨🇷",
  panama: "🇵🇦",
  honduras: "🇭🇳",
  jamaica: "🇯🇲",
  "el salvador": "🇸🇻",
  curacao: "🇨🇼",
  haiti: "🇭🇹",
  guatemala: "🇬🇹",
};

/** Aliases the data source might use → canonical key in FLAG_BY_NAME. */
const ALIASES: Record<string, string> = {
  usa: "united states",
  "u.s.a.": "united states",
  us: "united states",
  "united states of america": "united states",
  america: "united states",
  korea: "south korea",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "south korea republic": "south korea",
  "korea dpr": "south korea",
  holland: "netherlands",
  "ir iran": "iran",
  "islamic republic of iran": "iran",
  czechia: "czech republic",
  "czech rep": "czech republic",
  türkiye: "turkey",
  turkiye: "turkey",
  "côte d'ivoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  "cote divoire": "ivory coast",
  "cabo verde": "cape verde",
  "dr congo (drc)": "dr congo",
  "democratic republic of the congo": "dr congo",
  "republic of ireland (eire)": "ireland",
  uae: "united arab emirates",
  "saudi": "saudi arabia",
};

const FALLBACK_FLAG = "🏳️";

/**
 * The three UK home nations use emoji tag sequences rather than the usual pair
 * of regional-indicator letters, so they need an explicit ISO-style code that
 * SVG flag CDNs understand (flagcdn serves `gb-eng`, `gb-sct`, `gb-wls`).
 */
const HOME_NATION_CODE: Record<string, string> = {
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "gb-eng",
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "gb-sct",
  "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "gb-wls",
};

function normalise(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD") // split accented chars …
    .replace(/[̀-ͯ]/g, "") // … and drop the diacritic marks (ç→c, ü→u)
    .replace(/\s+/g, " ");
}

/** Resolve a team name to an emoji flag. Never throws; returns 🏳️ if unknown. */
export function countryFlag(name: string | undefined | null): string {
  if (!name) return FALLBACK_FLAG;
  const key = normalise(name);
  const canonical = ALIASES[key] ?? key;
  return FLAG_BY_NAME[canonical] ?? FALLBACK_FLAG;
}

/**
 * Resolve a team name to a lowercase ISO-3166 code suitable for an SVG flag CDN
 * (e.g. "argentina" → "ar", "England" → "gb-eng"). Returns null for unknown
 * teams or knockout placeholders so callers can fall back gracefully.
 *
 * We derive the code from the emoji we already resolve: a flag emoji is just a
 * pair of regional-indicator letters (U+1F1E6–U+1F1FF ⇒ A–Z), so the two map
 * straight onto the country code without a second lookup table.
 */
export function flagCode(name: string | undefined | null): string | null {
  const emoji = countryFlag(name);
  if (emoji === FALLBACK_FLAG) return null;
  if (HOME_NATION_CODE[emoji]) return HOME_NATION_CODE[emoji];

  const points = Array.from(emoji, (ch) => ch.codePointAt(0) ?? 0);
  const isFlag =
    points.length === 2 &&
    points.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff);
  if (!isFlag) return null;

  return points.map((cp) => String.fromCharCode(cp - 0x1f1e6 + 97)).join("");
}
