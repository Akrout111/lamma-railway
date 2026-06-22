import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ClerkProvider } from '@clerk/nextjs';
import { routing, type Locale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import { SiteHeader } from '@/components/lamma/SiteHeader';
import { SiteFooter } from '@/components/lamma/SiteFooter';
import { Toaster } from '@/components/ui/toaster';
import { InstallPrompt } from '@/components/lamma/pwa/InstallPrompt';
import '@/app/globals.css';

/** Pre-render both locales at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Validate the `locale` dynamic segment. */
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL('https://lamma.kw'),
    title: t('title'),
    description: t('description'),
    keywords: ['Lamma', 'لَمَّة', 'Kuwait', 'gatherings', 'diwaniya', 'كويت', 'لمة'],
    manifest: '/manifest.json',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'لَمَّة' },
    formatDetection: { telephone: false },
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName: 'Lamma',
      type: 'website',
      images: [{ url: '/images/og/lamma-og.jpg', width: 1440, height: 720, alt: 'Lamma' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/images/og/lamma-og.jpg'],
    },
    icons: {
      icon: '/icons/icon.svg',
      apple: '/icons/icon.svg',
    },
    alternates: {
      canonical: locale === 'ar' ? '/' : '/en',
      languages: { ar: '/', en: '/en' },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props & { children: React.ReactNode }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering for the active locale.
  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={fontVariables}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ClerkProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1" id="main-content">{children}</main>
              <SiteFooter />
            </div>
            <InstallPrompt />
          </NextIntlClientProvider>
        </ClerkProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator && process.env.NODE_ENV === 'production'){navigator.serviceWorker.register('/sw.js').catch(()=>{});}`,
          }}
        />
      </body>
    </html>
  );
}
