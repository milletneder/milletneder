// All 81 provinces of Turkey with plate codes and center coordinates
export interface TurkeyCity {
  id: string; // plate code
  name: string;
  lat: number;
  lng: number;
}

export const TURKEY_CITIES: TurkeyCity[] = [
  { id: "01", name: "Adana", lat: 37.0, lng: 35.3213 },
  { id: "02", name: "Adiyaman", lat: 37.7648, lng: 38.2786 },
  { id: "03", name: "Afyonkarahisar", lat: 38.7507, lng: 30.5567 },
  { id: "04", name: "Agri", lat: 39.7191, lng: 43.0503 },
  { id: "05", name: "Amasya", lat: 40.6499, lng: 35.8353 },
  { id: "06", name: "Ankara", lat: 39.9334, lng: 32.8597 },
  { id: "07", name: "Antalya", lat: 36.8969, lng: 30.7133 },
  { id: "08", name: "Artvin", lat: 41.1828, lng: 41.8183 },
  { id: "09", name: "Aydin", lat: 37.8444, lng: 27.8458 },
  { id: "10", name: "Balikesir", lat: 39.6484, lng: 27.8826 },
  { id: "11", name: "Bilecik", lat: 40.0567, lng: 30.0665 },
  { id: "12", name: "Bingol", lat: 38.8854, lng: 40.498 },
  { id: "13", name: "Bitlis", lat: 38.4006, lng: 42.1095 },
  { id: "14", name: "Bolu", lat: 40.7358, lng: 31.6089 },
  { id: "15", name: "Burdur", lat: 37.7203, lng: 30.2908 },
  { id: "16", name: "Bursa", lat: 40.1826, lng: 29.0665 },
  { id: "17", name: "Canakkale", lat: 40.1553, lng: 26.4142 },
  { id: "18", name: "Cankiri", lat: 40.6013, lng: 33.6134 },
  { id: "19", name: "Corum", lat: 40.5506, lng: 34.9556 },
  { id: "20", name: "Denizli", lat: 37.7765, lng: 29.0864 },
  { id: "21", name: "Diyarbakir", lat: 37.9158, lng: 40.2189 },
  { id: "22", name: "Edirne", lat: 41.6818, lng: 26.5623 },
  { id: "23", name: "Elazig", lat: 38.681, lng: 39.2264 },
  { id: "24", name: "Erzincan", lat: 39.7505, lng: 39.4929 },
  { id: "25", name: "Erzurum", lat: 39.9055, lng: 41.2658 },
  { id: "26", name: "Eskisehir", lat: 39.7767, lng: 30.5206 },
  { id: "27", name: "Gaziantep", lat: 37.0662, lng: 37.3833 },
  { id: "28", name: "Giresun", lat: 40.9128, lng: 38.3895 },
  { id: "29", name: "Gumushane", lat: 40.4386, lng: 39.5086 },
  { id: "30", name: "Hakkari", lat: 37.5833, lng: 43.7408 },
  { id: "31", name: "Hatay", lat: 36.4018, lng: 36.3498 },
  { id: "32", name: "Isparta", lat: 37.7648, lng: 30.5566 },
  { id: "33", name: "Mersin", lat: 36.8121, lng: 34.6415 },
  { id: "34", name: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { id: "35", name: "Izmir", lat: 38.4192, lng: 27.1287 },
  { id: "36", name: "Kars", lat: 40.6167, lng: 43.0975 },
  { id: "37", name: "Kastamonu", lat: 41.3887, lng: 33.7827 },
  { id: "38", name: "Kayseri", lat: 38.7312, lng: 35.4787 },
  { id: "39", name: "Kirklareli", lat: 41.7333, lng: 27.2167 },
  { id: "40", name: "Kirsehir", lat: 39.1425, lng: 34.1709 },
  { id: "41", name: "Kocaeli", lat: 40.8533, lng: 29.8815 },
  { id: "42", name: "Konya", lat: 37.8746, lng: 32.4932 },
  { id: "43", name: "Kutahya", lat: 39.4167, lng: 29.9833 },
  { id: "44", name: "Malatya", lat: 38.3552, lng: 38.3095 },
  { id: "45", name: "Manisa", lat: 38.6191, lng: 27.4289 },
  { id: "46", name: "Kahramanmaras", lat: 37.5858, lng: 36.9371 },
  { id: "47", name: "Mardin", lat: 37.3212, lng: 40.7245 },
  { id: "48", name: "Mugla", lat: 37.2153, lng: 28.3636 },
  { id: "49", name: "Mus", lat: 38.9462, lng: 41.7539 },
  { id: "50", name: "Nevsehir", lat: 38.6939, lng: 34.6857 },
  { id: "51", name: "Nigde", lat: 37.9667, lng: 34.6833 },
  { id: "52", name: "Ordu", lat: 40.984, lng: 37.8764 },
  { id: "53", name: "Rize", lat: 41.0201, lng: 40.5234 },
  { id: "54", name: "Sakarya", lat: 40.6936, lng: 30.4358 },
  { id: "55", name: "Samsun", lat: 41.2928, lng: 36.3313 },
  { id: "56", name: "Siirt", lat: 37.9273, lng: 41.9462 },
  { id: "57", name: "Sinop", lat: 42.0231, lng: 35.1531 },
  { id: "58", name: "Sivas", lat: 39.7477, lng: 37.0179 },
  { id: "59", name: "Tekirdag", lat: 40.9781, lng: 27.5126 },
  { id: "60", name: "Tokat", lat: 40.3167, lng: 36.5544 },
  { id: "61", name: "Trabzon", lat: 41.0027, lng: 39.7168 },
  { id: "62", name: "Tunceli", lat: 39.1079, lng: 39.5401 },
  { id: "63", name: "Sanliurfa", lat: 37.1591, lng: 38.7969 },
  { id: "64", name: "Usak", lat: 38.6823, lng: 29.4082 },
  { id: "65", name: "Van", lat: 38.4891, lng: 43.3832 },
  { id: "66", name: "Yozgat", lat: 39.82, lng: 34.8147 },
  { id: "67", name: "Zonguldak", lat: 41.4564, lng: 31.7987 },
  { id: "68", name: "Aksaray", lat: 38.3687, lng: 34.0293 },
  { id: "69", name: "Bayburt", lat: 40.2552, lng: 40.2249 },
  { id: "70", name: "Karaman", lat: 37.1759, lng: 33.229 },
  { id: "71", name: "Kirikkale", lat: 39.8468, lng: 33.5153 },
  { id: "72", name: "Batman", lat: 37.8812, lng: 41.1351 },
  { id: "73", name: "Sirnak", lat: 37.5164, lng: 42.4611 },
  { id: "74", name: "Bartin", lat: 41.6344, lng: 32.3375 },
  { id: "75", name: "Ardahan", lat: 41.1105, lng: 42.7022 },
  { id: "76", name: "Igdir", lat: 39.9167, lng: 44.0489 },
  { id: "77", name: "Yalova", lat: 40.655, lng: 29.2769 },
  { id: "78", name: "Karabuk", lat: 41.2061, lng: 32.6204 },
  { id: "79", name: "Kilis", lat: 36.7184, lng: 37.1212 },
  { id: "80", name: "Osmaniye", lat: 37.0746, lng: 36.2464 },
  { id: "81", name: "Duzce", lat: 40.8438, lng: 31.1565 },
];

// District data for top 20+ cities by population
export const TURKEY_DISTRICTS: Map<string, string[]> = new Map([
  [
    "34", // Istanbul
    [
      "Adalar", "Arnavutkoy", "Atasehir", "Avcilar", "Bagcilar", "Bahcelievler",
      "Bakirkoy", "Basaksehir", "Bayrampasa", "Besiktas", "Beykoz", "Beylikduzu",
      "Beyoglu", "Buyukcekmece", "Catalca", "Cekmekoy", "Esenler", "Esenyurt",
      "Eyupsultan", "Fatih", "Gaziosmanpasa", "Gungoren", "Kadikoy", "Kagithane",
      "Kartal", "Kucukcekmece", "Maltepe", "Pendik", "Sancaktepe", "Sariyer",
      "Silivri", "Sultanbeyli", "Sultangazi", "Sile", "Sisli", "Tuzla",
      "Umraniye", "Uskudar", "Zeytinburnu",
    ],
  ],
  [
    "06", // Ankara
    [
      "Akyurt", "Altindag", "Ayas", "Bala", "Beypazari", "Camlidere",
      "Cankaya", "Cubuk", "Elmadag", "Etimesgut", "Evren", "Golbasi",
      "Gudul", "Haymana", "Kahramankazan", "Kalecik", "Kecioren", "Kizilcahamam",
      "Mamak", "Nallihan", "Polatli", "Pursaklar", "Sincan", "Sereflikochisar",
      "Yenimahalle",
    ],
  ],
  [
    "35", // Izmir
    [
      "Aliaga", "Balcova", "Bayindir", "Bayrakli", "Bergama", "Beydag",
      "Bornova", "Buca", "Cesme", "Cigli", "Dikili", "Foca",
      "Gaziemir", "Guzelbahce", "Karabaglar", "Karaburun", "Karsiyaka", "Kemalpasa",
      "Kinik", "Kiraz", "Konak", "Menderes", "Menemen", "Narlidere",
      "Odemis", "Seferihisar", "Selcuk", "Tire", "Torbali", "Urla",
    ],
  ],
  [
    "16", // Bursa
    [
      "Buyukorhan", "Gemlik", "Gorukle", "Gursu", "Harmancik", "Inegol",
      "Iznik", "Karacabey", "Keles", "Kestel", "Mudanya", "Mustafakemalpasa",
      "Nilufer", "Orhaneli", "Orhangazi", "Osmangazi", "Yenisehir", "Yildirim",
    ],
  ],
  [
    "07", // Antalya
    [
      "Akseki", "Aksu", "Alanya", "Demre", "Dosemealti", "Elmali",
      "Finike", "Gazipasa", "Gundogmus", "Ibradi", "Kas", "Kemer",
      "Kepez", "Konyaalti", "Korkuteli", "Kumluca", "Manavgat", "Muratpasa",
      "Serik",
    ],
  ],
  [
    "01", // Adana
    [
      "Aladag", "Ceyhan", "Cukurova", "Feke", "Imamoglu", "Karaisali",
      "Karatas", "Kozan", "Pozanti", "Saimbeyli", "Saricam", "Seyhan",
      "Tufanbeyli", "Yumurtalik", "Yuregir",
    ],
  ],
  [
    "42", // Konya
    [
      "Ahirli", "Akoren", "Aksehir", "Altinekin", "Beyhekim", "Beysehir",
      "Bozkir", "Cihanbeyli", "Cumra", "Derbent", "Derebucak", "Doganhisar",
      "Emirgazi", "Eregli", "Guneysinir", "Hadim", "Halkapinar", "Huginlu",
      "Ilgin", "Kadinhani", "Karapinar", "Karatay", "Kulu", "Meram",
      "Sarayonu", "Selcuklu", "Seydisehir", "Taskent", "Tuzlukcu", "Yalihuyuk",
      "Yunak",
    ],
  ],
  [
    "27", // Gaziantep
    [
      "Araban", "Islahiye", "Karkamis", "Nizip", "Nurdagi",
      "Oguzeli", "Sahinbey", "Sehitkamil", "Yavuzeli",
    ],
  ],
  [
    "33", // Mersin
    [
      "Akdeniz", "Anamur", "Aydincik", "Bozyazi", "Camliyayla", "Erdemli",
      "Gulnar", "Mezitli", "Mut", "Silifke", "Tarsus", "Toroslar",
      "Yenisehir",
    ],
  ],
  [
    "21", // Diyarbakir
    [
      "Baglar", "Bismil", "Cermik", "Cinar", "Cungus", "Dicle",
      "Egil", "Ergani", "Hani", "Hazro", "Kayapinar", "Kocakoy",
      "Kulp", "Lice", "Silvan", "Sur", "Yenisehir",
    ],
  ],
  [
    "38", // Kayseri
    [
      "Akkisla", "Bunyan", "Develi", "Felahiye", "Hacilar", "Incesu",
      "Kocasinan", "Melikgazi", "Ozvatan", "Pinarbasibasics", "Sarioglan",
      "Sariz", "Talas", "Tomarza", "Yahyali", "Yesilhisar",
    ],
  ],
  [
    "26", // Eskisehir
    [
      "Alpu", "Beylikova", "Cifteler", "Gunyuzu", "Han", "Inonu",
      "Mahmudiye", "Mihalgazi", "Mihaliccik", "Odunpazari", "Saricakaya",
      "Seyitgazi", "Sivrihisar", "Tepebasi",
    ],
  ],
  [
    "55", // Samsun
    [
      "Alaçam", "Asarcik", "Atakum", "Ayvacik", "Bafra", "Canik",
      "Havza", "Ilkadim", "Kavak", "Ladik", "Nineteen May", "Salipazari",
      "Tekkeköy", "Terme", "Vezirkopru", "Yakakent",
    ],
  ],
  [
    "41", // Kocaeli
    [
      "Basiskele", "Cayirova", "Darica", "Derince", "Dilovasi", "Gebze",
      "Golcuk", "Izmit", "Kandira", "Karamursel", "Kartepe", "Korfez",
    ],
  ],
  [
    "20", // Denizli
    [
      "Acipayam", "Babadağ", "Baklan", "Bekilli", "Beyagac", "Bozkurt",
      "Buldan", "Cal", "Cameli", "Cardak", "Civril", "Guney",
      "Honaz", "Kale", "Merkezefendi", "Pamukkale", "Saraykoy", "Serinhisar",
      "Tavas",
    ],
  ],
  [
    "63", // Sanliurfa
    [
      "Akcakale", "Birecik", "Bozova", "Ceylanpinar", "Eyyubiye",
      "Halfeti", "Haliliye", "Harran", "Hilvan", "Karakopru",
      "Siverek", "Suruc", "Viransehir",
    ],
  ],
  [
    "31", // Hatay
    [
      "Altinozu", "Antakya", "Arsuz", "Belen", "Defne", "Dortyol",
      "Erzin", "Hassa", "Iskenderun", "Kirikhan", "Kumlu", "Payas",
      "Reyhanli", "Samandag", "Yayladagi",
    ],
  ],
  [
    "44", // Malatya
    [
      "Akcadag", "Arapgir", "Arguvan", "Battalgazi", "Darende", "Dogansehir",
      "Doganyol", "Hekimhan", "Kale", "Kuluncak", "Poturge", "Yazihan",
      "Yesilyurt",
    ],
  ],
  [
    "46", // Kahramanmaras
    [
      "Afsin", "Andirin", "Caglayancerit", "Dulkadiroglu", "Ekinozu",
      "Elbistan", "Goksun", "Nurhak", "Onikisubat", "Pazarcik",
      "Turkoglu",
    ],
  ],
  [
    "65", // Van
    [
      "Bahcesaray", "Baskale", "Caldiran", "Edremit", "Ercis", "Gevas",
      "Gurpinar", "Ipekyolu", "Muradiye", "Ozalp", "Saray", "Tusba",
    ],
  ],
  [
    "61", // Trabzon
    [
      "Akcaabat", "Arakli", "Arsin", "Besikduzu", "Caykara", "Dernekpazari",
      "Duzkoy", "Hayrat", "Koprubasi", "Macka", "Of", "Ortahisar",
      "Surmene", "Tonya", "Vakfikebir", "Yomra",
    ],
  ],
  [
    "10", // Balikesir
    [
      "Altieylul", "Ayvalik", "Balya", "Bandirma", "Bigadic", "Burhaniye",
      "Dursunbey", "Edremit", "Erdek", "Gonen", "Havran", "Ivrindi",
      "Karesi", "Kepsut", "Manyas", "Marmara", "Savastepe", "Sindirgi",
      "Susurluk",
    ],
  ],
  [
    "09", // Aydin
    [
      "Bozdogan", "Buharkent", "Cine", "Didim", "Efeler", "Germencik",
      "Incirliova", "Karacasu", "Karpuzlu", "Kocarli", "Kosk", "Kusadasi",
      "Kuyucak", "Nazilli", "Soke", "Sultanhisar", "Yenipazar",
    ],
  ],
]);

// Helper to get city by plate code
export function getCityById(id: string): TurkeyCity | undefined {
  return TURKEY_CITIES.find((c) => c.id === id);
}

// Helper to get districts by city plate code
export function getDistrictsByCityId(id: string): string[] {
  return TURKEY_DISTRICTS.get(id) ?? [];
}
