const TR: Record<string, string> = {
  // Milli Takımlar — A
  'Afghanistan': 'Afganistan',
  'Albania': 'Arnavutluk',
  'Algeria': 'Cezayir',
  'Argentina': 'Arjantin',
  'Armenia': 'Ermenistan',
  'Australia': 'Avustralya',
  'Austria': 'Avusturya',
  'Azerbaijan': 'Azerbaycan',
  // B
  'Bahrain': 'Bahreyn',
  'Belgium': 'Belçika',
  'Bolivia': 'Bolivya',
  'Bosnia': 'Bosna',
  'Bosnia-Herzegovina': 'Bosna-Hersek',
  'Bosnia and Herzegovina': 'Bosna-Hersek',
  'Brazil': 'Brezilya',
  'Bulgaria': 'Bulgaristan',
  // C
  'Canada': 'Kanada',
  'Cape Verde': 'Yeşil Burun Adaları',
  'Cape Verde Islands': 'Yeşil Burun Adaları',
  'Chile': 'Şili',
  'China': 'Çin',
  'China PR': 'Çin',
  'Colombia': 'Kolombiya',
  'Congo DR': 'Kongo DR',
  'Costa Rica': 'Kosta Rika',
  'Croatia': 'Hırvatistan',
  'Cuba': 'Küba',
  'Czechia': 'Çekya',
  'Czech Republic': 'Çek Cumhuriyeti',
  // D-E
  'Denmark': 'Danimarka',
  'Ecuador': 'Ekvador',
  'Egypt': 'Mısır',
  'England': 'İngiltere',
  'Ethiopia': 'Etiyopya',
  // F-G
  'Finland': 'Finlandiya',
  'France': 'Fransa',
  'Georgia': 'Gürcistan',
  'Germany': 'Almanya',
  'Ghana': 'Gana',
  'Greece': 'Yunanistan',
  'Guatemala': 'Guatemala',
  'Guinea': 'Gine',
  // H-I
  'Honduras': 'Honduras',
  'Hungary': 'Macaristan',
  'Iceland': 'İzlanda',
  'India': 'Hindistan',
  'Indonesia': 'Endonezya',
  'Iran': 'İran',
  'Iraq': 'Irak',
  'Ireland': 'İrlanda',
  'Israel': 'İsrail',
  'Italy': 'İtalya',
  'Ivory Coast': 'Fildişi Sahili',
  // J-K
  'Jamaica': 'Jamaika',
  'Japan': 'Japonya',
  'Jordan': 'Ürdün',
  'Kazakhstan': 'Kazakistan',
  'Kenya': 'Kenya',
  'Korea Republic': 'Güney Kore',
  'South Korea': 'Güney Kore',
  'Kuwait': 'Kuveyt',
  'Kyrgyzstan': 'Kırgızistan',
  // L-M
  'Latvia': 'Letonya',
  'Lebanon': 'Lübnan',
  'Libya': 'Libya',
  'Lithuania': 'Litvanya',
  'Luxembourg': 'Lüksemburg',
  'Mali': 'Mali',
  'Malta': 'Malta',
  'Mexico': 'Meksika',
  'Moldova': 'Moldova',
  'Montenegro': 'Karadağ',
  'Morocco': 'Fas',
  // N
  'Netherlands': 'Hollanda',
  'New Zealand': 'Yeni Zelanda',
  'Nicaragua': 'Nikaragua',
  'Nigeria': 'Nijerya',
  'North Korea': 'Kuzey Kore',
  'North Macedonia': 'Kuzey Makedonya',
  'Norway': 'Norveç',
  // O-P
  'Oman': 'Umman',
  'Pakistan': 'Pakistan',
  'Palestine': 'Filistin',
  'Panama': 'Panama',
  'Peru': 'Peru',
  'Philippines': 'Filipinler',
  'Poland': 'Polonya',
  'Portugal': 'Portekiz',
  // Q-R
  'Qatar': 'Katar',
  'Romania': 'Romanya',
  'Russia': 'Rusya',
  // S
  'Saudi Arabia': 'Suudi Arabistan',
  'Scotland': 'İskoçya',
  'Senegal': 'Senegal',
  'Serbia': 'Sırbistan',
  'Slovakia': 'Slovakya',
  'Slovenia': 'Slovenya',
  'South Africa': 'Güney Afrika',
  'Spain': 'İspanya',
  'Sweden': 'İsveç',
  'Switzerland': 'İsviçre',
  'Syria': 'Suriye',
  // T
  'Taiwan': 'Tayvan',
  'Tajikistan': 'Tacikistan',
  'Tanzania': 'Tanzanya',
  'Thailand': 'Tayland',
  'Tunisia': 'Tunus',
  'Turkey': 'Türkiye',
  // U
  'Ukraine': 'Ukrayna',
  'United Arab Emirates': 'BAE',
  'UAE': 'BAE',
  'United States': 'ABD',
  'USA': 'ABD',
  'Uzbekistan': 'Özbekistan',
  // V-Z
  'Venezuela': 'Venezuela',
  'Vietnam': 'Vietnam',
  'Wales': 'Galler',
  'Zambia': 'Zambiya',
  'Zimbabwe': 'Zimbabve',
}

export function translateTeam(name: string): string {
  return TR[name] ?? name
}

// Bir metin içindeki tüm İngilizce takım adlarını Türkçeye çevirir
const _entries = Object.entries(TR).sort((a, b) => b[0].length - a[0].length)
export function translateText(text: string): string {
  let result = text
  for (const [en, tr] of _entries) {
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
    result = result.replace(regex, tr)
  }
  return result
}
