/**
 * Route group layout: /parti/giris sayfasi icin pass-through.
 *
 * src/app/parti/layout.tsx authenticated shell render eder (Provider + Shell).
 * Parti login sayfasinin bu auth guard'in disinda olmasi gerekir —
 * Next.js route group ((parti-public)) URL'yi etkilemez ama layout zincirini
 * paralel bir dala cevirir.
 *
 * Boylece /parti/giris gercek URL'dir ama /parti layout'unu kullanmaz.
 */

export default function PartiPublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
