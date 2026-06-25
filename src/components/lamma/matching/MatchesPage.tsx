'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth-store';
import { useApplicationsStore } from '@/lib/applications-store';
import { recommendGatheringsForUser, findSimilarAttendees } from '@/lib/matching/engine';
import { explainRecommendation } from '@/lib/matching/explain';
import { GatheringCard } from '@/components/lamma/GatheringCard';
import { MatchScoreRing } from '@/components/lamma/matching/MatchScoreRing';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Container } from '@/components/lamma/Container';
import { localized } from '@/lib/use-localized';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Full matches page — native tab buttons (no Radix Tabs). */
export function MatchesPage() {
  const t = useTranslations('matching');
  const locale = useLocale() as 'ar' | 'en';
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { getByUser } = useApplicationsStore();
  const [tab, setTab] = useState<'people' | 'gatherings'>('people');

  if (!hasHydrated) {
    return <div className="flex min-h-[40vh] items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-clay border-t-transparent" /></div>;
  }
  if (!isAuthenticated || !user) return null;

  const applied = getByUser(user.id).map((a) => a.gatheringSlug);
  const recs = recommendGatheringsForUser(user, { limit: 6, excludeApplied: applied });
  const similarPeople = findSimilarAttendees(user, '', 6);

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{t('page.title')}</h1>
        <p className="mt-2 text-sm text-ink/70 sm:text-base">{t('page.subtitle')}</p>
      </header>

      {/* Native tab buttons */}
      <div className="mb-6 inline-flex h-10 items-center justify-center rounded-lg bg-sand p-1">
        <button onClick={() => setTab('people')} className={cn('inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm transition-all', tab === 'people' ? 'bg-paper font-medium text-ink shadow-sm' : 'text-stone')}>
          {t('tabs.people')} ({similarPeople.length})
        </button>
        <button onClick={() => setTab('gatherings')} className={cn('inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm transition-all', tab === 'gatherings' ? 'bg-paper font-medium text-ink shadow-sm' : 'text-stone')}>
          {t('tabs.gatherings')} ({recs.length})
        </button>
      </div>

      {tab === 'people' && (
        similarPeople.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-paper/50 px-6 py-12 text-center text-sm text-stone">{t('page.subtitle')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {similarPeople.map(({ user: other, similarity, sharedInterests }) => (
              <div key={other.id} className="flex items-start gap-4 rounded-2xl bg-card p-5 ring-1 ring-border/60">
                <Avatar className="size-14 shrink-0">{other.avatarUrl && <AvatarImage src={other.avatarUrl} alt="" />}<AvatarFallback>{localized(other.nameLocalized, locale).charAt(0)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold text-ink">{localized(other.nameLocalized, locale)}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone">{localized(other.bioLocalized, locale)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{sharedInterests.slice(0, 4).map((i) => <span key={i} className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">{t(`interests.${i}` as 'photography')}</span>)}</div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-stone"><span>{t('page.sharedInterests')}</span><span className="font-medium tabular text-teal">{Math.round(similarity * 100)}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full bg-teal transition-all duration-500" style={{ width: `${Math.round(similarity * 100)}%` }} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'gatherings' && (
        recs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-paper/50 px-6 py-12 text-center text-sm text-stone">{t('page.subtitle')}</p>
        ) : (
          <div className="space-y-6">
            {recs.map(({ gathering, score }) => {
              const reasons = explainRecommendation(user, gathering, score);
              return (
                <div key={gathering.slug} className="relative">
                  <GatheringCard gathering={gathering} />
                  <div className="absolute -top-3 -end-3 rounded-full bg-paper p-1 shadow-md"><MatchScoreRing score={score} size="sm" showLabel={false} /></div>
                  {reasons.length > 0 && (
                    <div className="mt-3 rounded-xl bg-paper p-4 ring-1 ring-border/40">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-clay">{t('page.whyRecommend')}</p>
                      <ul className="space-y-1.5">
                        {reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-ink/70">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                            <span>{t(`reasons.${r.key}` as 'matching-interest', { interest: r.interest ? t(`interests.${r.interest}` as 'photography') : '', count: r.count ?? 0 })}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </Container>
  );
}
