const FLAGS: Record<string, string> = {
  "USA": "🇺🇸",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Mexico": "🇲🇽",
  "Brazil": "🇧🇷",
  "Germany": "🇩🇪",
  "Netherlands": "🇳🇱",
  "Belgium": "🇧🇪",
  "Spain": "🇪🇸",
  "France": "🇫🇷",
  "Argentina": "🇦🇷",
  "Portugal": "🇵🇹",
  "Canada": "🇨🇦",
  "Switzerland": "🇨🇭",
  "Morocco": "🇲🇦",
  "Australia": "🇦🇺",
  "Japan": "🇯🇵",
  "Ecuador": "🇪🇨",
  "Senegal": "🇸🇳",
  "Croatia": "🇭🇷",
  "Uruguay": "🇺🇾",
  "Colombia": "🇨🇴",
  "Norway": "🇳🇴",
  "Austria": "🇦🇹",
  "Ghana": "🇬🇭",
  "South Africa": "🇿🇦",
  "Korea Republic": "🇰🇷",
  "Qatar": "🇶🇦",
  "Haiti": "🇭🇹",
  "Paraguay": "🇵🇾",
  "Curaçao": "🇨🇼",
  "Côte d'Ivoire": "🇨🇮",
  "Tunisia": "🇹🇳",
  "Egypt": "🇪🇬",
  "IR Iran": "🇮🇷",
  "New Zealand": "🇳🇿",
  "Cabo Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  "Algeria": "🇩🇿",
  "Jordan": "🇯🇴",
  "Uzbekistan": "🇺🇿",
  "Panama": "🇵🇦",
  "United States": "🇺🇸",
  "South Korea": "🇰🇷",
  "Iran": "🇮🇷",
  "Ivory Coast": "🇨🇮",
  "Cape Verde Islands": "🇨🇻",
  "Czechia": "🇨🇿",
  "Iraq": "🇮🇶",
  "Sweden": "🇸🇪",
  "Congo DR": "🇨🇩",
  "Bosnia-Herzegovina": "🇧🇦",
};

export function getFlag(teamName: string): string {
  if (!teamName) return "";
  return FLAGS[teamName] || "🏳️";
}

const FLAG_CODES: Record<string, string> = {
  "Mexico": "mx", "Brazil": "br", "USA": "us", "Germany": "de",
  "Netherlands": "nl", "Belgium": "be", "Spain": "es", "France": "fr",
  "Argentina": "ar", "Portugal": "pt", "England": "gb-eng", "Canada": "ca",
  "Switzerland": "ch", "Morocco": "ma", "Australia": "au", "Japan": "jp",
  "Ecuador": "ec", "Senegal": "sn", "Croatia": "hr", "Uruguay": "uy",
  "Colombia": "co", "Norway": "no", "Austria": "at", "Ghana": "gh",
  "Scotland": "gb-sct", "South Africa": "za", "Korea Republic": "kr",
  "Qatar": "qa", "Haiti": "ht", "Paraguay": "py", "Tunisia": "tn",
  "Egypt": "eg", "New Zealand": "nz", "Saudi Arabia": "sa", "Algeria": "dz",
  "Jordan": "jo", "Uzbekistan": "uz", "Panama": "pa",
};

export function getFlagImageUrl(teamName: string): string | null {
  const code = FLAG_CODES[teamName];
  if (!code) return null;
  return `https://flagcdn.com/w320/${code}.png`;
}

export function getCrestUrl(apiSportsId: number | null): string | null {
  if (!apiSportsId) return null;
  return `https://media.api-sports.io/football/teams/${apiSportsId}.png`;
}

export default FLAGS;
