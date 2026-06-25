'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { findSimilarAttendees } from '@/lib/matching/engine';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { localized } from '@/lib/use-localized';

export function PeopleYouMightKnow() {
  const t = useTranslations('matching');
  const locale = useLocale() as 'ar' | 'en';
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  if (!hasHydrated || !isAuthenticated || !user) return null;
  const similar = findSimilarAttendees(user, '', 3);
  if (similar.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2"><Users className="size-5 text-teal" /><h2 className="font-display text-xl font-semibold text-ink">{t('peopleYouMightKnow')}</h2></div>
      <div className="space-y-3">
        {similar.map(({ user: other, similarity, sharedInterests }) => (
          <div key={other.id} className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-sand">
            <Avatar className="size-10">{other.avatarUrl && <AvatarImage src={other.avatarUrl} alt="" />}<AvatarFallback>{localized(other.nameLocalized, locale).charAt(0)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{localized(other.nameLocalized, locale)}</p>
              <div className="mt-1 flex flex-wrap gap-1">{sharedInterests.slice(0, 3).map((i) => <span key={i} className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">{t(`interests.${i}` as 'photography')}</span>)}</div>
            </div>
            <div className="text-end"><p className="font-display text-lg tabular text-teal">{Math.round(similarity * 100)}%</p><p className="text-xs text-stone">{t('similarity')}</p></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
