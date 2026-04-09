import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { PartyAuthProvider } from '@/lib/auth/PartyAuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: '#MilletNeDer — Halkın Seçim Nabzı',
    template: '%s | #MilletNeDer',
  },
  description:
    'Türkiye\'nin ilk bağımsız, şeffaf, halk kaynaklı siyasi nabız ölçüm platformu. Anket şirketlerine alternatif, gerçek zamanlı seçim tahmini.',
  keywords: [
    'seçim anketi',
    'seçim tahmini',
    'millet ne der',
    'oy tahmini',
    'siyasi anket',
    'Türkiye seçim',
    'halk anketi',
    'bağımsız anket',
    'seçim sonuçları',
    'anket sonuçları',
    'siyasi nabız',
    'oy kullan',
    'seçim 2028',
    'parti anket',
    'kamuoyu yoklaması',
  ],
  metadataBase: new URL('https://milletneder.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '#MilletNeDer — Sen de Oyunu Kullan',
    description:
      'Hangi parti önde? Oy ver, sonuçları anlık gör. Türkiye\'nin bağımsız seçim nabzı platformu — tamamen anonim, tamamen şeffaf.',
    url: 'https://milletneder.com',
    siteName: '#MilletNeDer',
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: 'https://milletneder.com/api/og?v=3',
        width: 1200,
        height: 630,
        alt: '#MilletNeDer — Güncel Seçim Nabzı',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '#MilletNeDer — Sen de Oyunu Kullan',
    description: 'Hangi parti önde? Oy ver, sonuçları anlık gör. Anonim ve bağımsız seçim nabzı.',
    images: ['https://milletneder.com/api/og?v=3'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {},
  other: {
    'apple-mobile-web-app-title': '#MilletNeDer',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" translate="no" suppressHydrationWarning className={cn("font-sans antialiased", dmSans.variable)}>
      <head>
        <meta name="google" content="notranslate" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '#MilletNeDer',
              alternateName: 'MilletNeDer',
              url: 'https://milletneder.com',
              description: 'Türkiye\'nin ilk bağımsız, şeffaf, halk kaynaklı siyasi nabız ölçüm platformu.',
              inLanguage: 'tr',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://milletneder.com/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '#MilletNeDer',
              url: 'https://milletneder.com',
              logo: 'https://milletneder.com/favicon.ico',
              description: 'Bağımsız, şeffaf, halk kaynaklı seçim nabız ölçüm platformu.',
              sameAs: [],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "w4w5bylwe5");`,
          }}
        />
        <script src="https://app.lemonsqueezy.com/js/lemon.js" defer />
      </head>
      <body className="bg-background text-foreground notranslate" suppressHydrationWarning>
        <AuthProvider>
          <PartyAuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </PartyAuthProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
