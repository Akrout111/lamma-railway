'use client';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth-store';
import { useApplicationsStore } from '@/lib/applications-store';
import { gatheringsBySlug } from '@/data/gatherings';
import { StatusBadge } from '@/components/lamma/applications/StatusBadge';
import { PeopleYouMightKnow } from '@/components/lamma/matching/PeopleYouMightKnow';
import { Container } from '@/components/lamma/Container';
import { Button } from '@/components/ui/button';
import { localized } from '@/lib/use-localized';
import { formatRelative } from '@/lib/format';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Users, Calendar, Award } from 'lucide-react';

export function DashboardHome() {
  const t = useTranslations('dashboard');
  const tAuth = useTranslations('auth');
  const locale = useLocale() as 'ar' | 'en';
  const { user, hasHydrated } = useAuthStore();
  const { getByUser } = useApplicationsStore();
  if (!hasHydrated || !user) return null;
  const apps = getByUser(user.id);
  const recentApps = [...apps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  const pendingCount = apps.filter((a) => a.status === 'PENDING' || a.status === 'WAITLISTED').length;
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  const Sep = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-stone"><Link href="/" className="hover:text-clay">{locale === 'ar' ? 'الرئيسية' : 'Home'}</Link><Sep className="size-3" /><span className="text-ink">{t('breadcrumbs')}</span></nav>
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{t('welcome', { name: localized(user.nameLocalized, locale).split(' ')[0] })}</h1>
        <span className="mt-2 inline-block rounded-full bg-clay/10 px-3 py-1 text-xs font-medium text-clay">{tAuth(`tiers.${user.membershipTier}` as 'NEWCOMER')}</span>
        <div className="mt-6 flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm"><Calendar className="size-4 text-clay" /><span className="tabular font-semibold text-ink">{user.attendedCount}</span><span className="text-stone">{t('stats.attended')}</span></div>
          <div className="flex items-center gap-2 text-sm"><Users className="size-4 text-saffron" /><span className="tabular font-semibold text-ink">{pendingCount}</span><span className="text-stone">{t('stats.pending')}</span></div>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <section>
            <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-semibold text-ink">{t('myApplications')}</h2>{recentApps.length > 0 && <Button asChild variant="ghost" size="sm" className="gap-1.5 text-clay"><Link href="/dashboard/applications">{t('viewAllApplications')}<Arrow className="size-3.5" /></Link></Button>}</div>
            {recentApps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-paper/50 px-6 py-10 text-center"><p className="text-sm text-stone">{t('noApplications')}</p><Button asChild className="mt-4 bg-clay text-primary-foreground hover:bg-clay/90"><Link href="/gatherings">{t('browseGatherings')}</Link></Button></div>
            ) : (
              <div className="space-y-3">{recentApps.map((app) => { const g = gatheringsBySlug[app.gatheringSlug]; return (
                <Link key={app.id} href="/dashboard/applications" className="flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-border/60 transition-all hover:shadow-[var(--shadow-soft)]">
                  {g && <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary"><Image src={g.coverImageUrl} alt="" fill sizes="56px" className="object-cover" /></div>}
                  <div className="min-w-0 flex-1"><p className="truncate font-display text-sm font-semibold text-ink">{g?.title[locale] ?? app.gatheringSlug}</p><p className="text-xs text-stone">{formatRelative(app.createdAt, locale)}</p></div>
                  <StatusBadge status={app.status} size="sm" />
                </Link>); })}</div>
            )}
          </section>
          <section><h2 className="mb-4 font-display text-2xl font-semibold text-ink">{t('myMatches')}</h2><PeopleYouMightKnow /></section>
        </div>
        <aside className="space-y-6 lg:col-span-4">
          <section className="rounded-2xl bg-card p-6 ring-1 ring-border/60">
            <div className="flex items-center gap-4"><div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-secondary">{user.avatarUrl ? <Image src={user.avatarUrl} alt="" fill sizes="64px" className="object-cover" /> : null}</div><div className="min-w-0"><h3 className="truncate font-display text-lg font-semibold text-ink">{localized(user.nameLocalized, locale)}</h3><p className="truncate text-xs text-stone">{user.email}</p></div></div>
            <p className="mt-4 line-clamp-3 text-sm text-ink/70">{localized(user.bioLocalized, locale)}</p>
          </section>
          <section className="rounded-2xl bg-card p-6 ring-1 ring-border/60">
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">{t('interests')}</h3>
            <div className="flex flex-wrap gap-1.5">{user.interests.map((i) => <span key={i} className="rounded-full bg-sand px-2.5 py-1 text-xs text-stone">{i}</span>)}</div>
          </section>
        </aside>
      </div>
    </Container>
  );
}
