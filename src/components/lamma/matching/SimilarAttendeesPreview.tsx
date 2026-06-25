'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { findSimilarAttendees } from '@/lib/matching/engine';
import type { Gathering } from '@/data/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { localized } from '@/lib/use-localized';
import { UserCheck } from 'lucide-react';

export function SimilarAttendeesPreview({ gathering }: { gathering: Gathering }) {
  const t = useTranslations('matching');
  const locale = useLocale() as 'ar' | 'en';
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  if (!hasHydrated || !isAuthenticated || !user) return null;
  const similar = findSimilarAttendees(user, gathering.slug, 3);
  if (similar.length === 0) return null;
  return (
    <Card className="bg-sand/50 p-5">
      <div className="mb-4 flex items-center gap-2"><UserCheck className="size-5 text-teal" /><h3 className="font-display text-lg font-semibold text-ink">{t('meetAtGathering')}</h3></div>
      <p className="mb-4 text-sm text-stone">{t('meetAtGatheringHint')}</p>
      <div className="grid grid-cols-3 gap-3">
        {similar.map(({ user: other, similarity }) => (
          <div key={other.id} className="text-center">
            <Avatar className="mx-auto mb-2 size-12">{other.avatarUrl && <AvatarImage src={other.avatarUrl} alt="" />}<AvatarFallback>{localized(other.nameLocalized, locale).charAt(0)}</AvatarFallback></Avatar>
            <p className="truncate text-xs font-medium text-ink">{localized(other.nameLocalized, locale).split(' ')[0]}</p>
            <p className="text-xs tabular text-teal">{Math.round(similarity * 100)}%</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
