export const MAX_VOTE_CHANGES = 2;

// --- Telefon Doğrulama Sabitleri ---
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 90;
export const OTP_RESEND_WAIT = [90, 180]; // 1. resend 90sn, 2. resend 3dk
export const MAX_OTP_RESENDS = 2;
export const PHONE_TOKEN_EXPIRY = '15m';
export const MIN_ACCOUNT_AGE_HOURS = 24;
export const MAX_REGISTRATIONS_PER_IP = 5;
export const IP_RATE_LIMIT_WINDOW_MINUTES = 15;
export const REFERRAL_CODE_LENGTH = 8;

export const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
  "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir",
  "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
  "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
  "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
  "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin",
  "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
  "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli",
  "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
] as const;

export type City = (typeof CITIES)[number];

export const AGE_BRACKETS = [
  { value: 'Y1', label: '18 – 24' },
  { value: 'Y2', label: '25 – 34' },
  { value: 'Y3', label: '35 – 44' },
  { value: 'Y4', label: '45 – 54' },
  { value: 'Y5', label: '55 – 64' },
  { value: 'Y6', label: '65 ve üzeri' },
] as const;

export const INCOME_BRACKETS = [
  { value: 'G1', label: '0 – 15.000 ₺' },
  { value: 'G2', label: '15.001 – 30.000 ₺' },
  { value: 'G3', label: '30.001 – 50.000 ₺' },
  { value: 'G4', label: '50.001 – 75.000 ₺' },
  { value: 'G5', label: '75.001 – 100.000 ₺' },
  { value: 'G6', label: '100.001 ₺ ve üzeri' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'E', label: 'Erkek' },
  { value: 'K', label: 'Kadın' },
] as const;

export const EDUCATION_BRACKETS = [
  { value: 'E1', label: 'İlkokul veya altı' },
  { value: 'E2', label: 'Ortaokul' },
  { value: 'E3', label: 'Lise' },
  { value: 'E4', label: 'Üniversite (Lisans)' },
  { value: 'E5', label: 'Lisansüstü' },
] as const;

export const TURNOUT_OPTIONS = [
  { value: 'T1', label: 'Kesin katılacağım' },
  { value: 'T2', label: 'Büyük ihtimalle' },
  { value: 'T3', label: 'Belki' },
  { value: 'T4', label: 'Katılmayacağım' },
] as const;

export const VALID_AGE_BRACKETS = AGE_BRACKETS.map(b => b.value);
export const VALID_INCOME_BRACKETS = INCOME_BRACKETS.map(b => b.value);
export const VALID_GENDERS = GENDER_OPTIONS.map(g => g.value);
export const VALID_EDUCATION_BRACKETS = EDUCATION_BRACKETS.map(b => b.value);
export const VALID_TURNOUT_OPTIONS = TURNOUT_OPTIONS.map(t => t.value);
