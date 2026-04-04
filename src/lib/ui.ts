// Design tokens — tüm projede tutarlı stiller
// Badge, buton, input stilleri tek yerden yönetilir

export const badge = {
  // Pozitif durumlar: Doğrulanmış, Geçerli, Etkin
  positive: 'inline-block px-2 py-0.5 text-xs font-medium bg-green-600 text-white',
  // Negatif durumlar: Şüpheli, Geçersiz, Devre dışı
  negative: 'inline-block px-2 py-0.5 text-xs font-medium bg-red-600 text-white',
  // Nötr durumlar: Doğrulanmamış, Beklemede
  neutral: 'inline-block px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-500',
  // Siyah badge: Aktif round, özel durum
  dark: 'inline-block px-2 py-0.5 text-xs font-medium bg-black text-white',
} as const;

export const btn = {
  // Ana aksiyon: Kaydet, Oluştur, Giriş Yap
  primary: 'border border-black bg-black text-white px-4 h-10 text-sm font-medium hover:bg-neutral-800 hover:border-neutral-800 transition-colors disabled:opacity-50 inline-flex items-center justify-center',
  // İkincil aksiyon: İptal, Düzenle, Geri — hover'da fill olur
  secondary: 'border border-black text-black px-4 h-10 text-sm font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 inline-flex items-center justify-center',
  // Küçük buton (tablo içi, pagination)
  small: 'px-3 h-8 text-sm border border-black text-black hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center',
} as const;

export const input = {
  // Standart text input
  text: 'w-full border border-neutral-200 px-3 py-2 text-sm text-black bg-white focus:outline-none focus:border-black transition-colors',
  // Select dropdown
  select: 'px-3 py-2 border border-neutral-200 text-sm text-black bg-white focus:outline-none focus:border-black transition-colors',
} as const;

export const table = {
  // Tablo container
  container: 'border border-neutral-200 overflow-hidden',
  // Thead
  head: 'bg-neutral-50 border-b border-neutral-200',
  // Th
  th: 'text-left px-4 py-3 font-medium text-neutral-500 text-xs',
  // Tbody tr
  row: 'border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors',
  // Td
  td: 'px-4 py-3 text-black',
  // Boş tablo mesajı
  empty: 'px-4 py-8 text-center text-neutral-400 text-sm',
} as const;
