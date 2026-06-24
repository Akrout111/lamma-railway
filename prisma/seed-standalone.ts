/**
 * Lamma — Standalone Prisma Seed Script
 *
 * This script populates the database with the 8 gatherings, 5 hosts,
 * 6 topics, and 3 letters defined in src/data/*.ts.
 *
 * Usage:
 *   bun run db:seed
 *
 * Or with explicit DATABASE_URL:
 *   DATABASE_URL="file:./db/custom.db" bun prisma/seed-standalone.ts
 *
 * IMPORTANT: This file MUST NOT use `@/` path aliases — Bun does not
 * resolve them when running scripts directly. Use relative paths only.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Lamma database...');

  // Dynamically import data (relative paths, NO extensions — Bun resolves them)
  const { topics } = await import('../src/data/topics');
  const { hosts } = await import('../src/data/hosts');
  const { gatherings } = await import('../src/data/gatherings');
  const { letters } = await import('../src/data/letters');

  // 1. Topics
  console.log(`  → Inserting ${topics.length} topics...`);
  for (const t of topics) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        slug: t.slug,
        // SQLite: store as JSON string; PostgreSQL: store as Json
        name: JSON.stringify(t.name),
        description: JSON.stringify(t.description),
        coverImageUrl: t.coverImageUrl,
        color: t.color,
      },
    });
  }

  // 2. Hosts
  console.log(`  → Inserting ${hosts.length} hosts...`);
  for (const h of hosts) {
    await prisma.host.upsert({
      where: { handle: h.handle },
      update: {},
      create: {
        handle: h.handle,
        userId: h.userId ?? null,
        displayName: JSON.stringify(h.displayName),
        bio: JSON.stringify(h.bio),
        avatarUrl: h.avatarUrl,
        coverUrl: h.coverUrl,
        isVerified: h.isVerified,
        verifiedAt: h.verifiedAt ? new Date(h.verifiedAt) : null,
        topicIds: h.topicSlugs.join('|'),
        specialties: JSON.stringify(h.specialties),
        totalGatherings: h.totalGatherings,
        totalAttendees: h.totalAttendees,
        avgRating: h.avgRating,
        responseTime: h.responseTimeHours,
        instagram: h.instagram ?? null,
      },
    });
  }

  // 3. Gatherings
  console.log(`  → Inserting ${gatherings.length} gatherings...`);
  for (const g of gatherings) {
    const host = hosts.find((h) => h.handle === g.hostHandle);
    if (!host) {
      console.warn(`    ⚠ Host not found for gathering "${g.slug}": ${g.hostHandle}`);
      continue;
    }
    await prisma.gathering.upsert({
      where: { slug: g.slug },
      update: {},
      create: {
        slug: g.slug,
        hostId: host.handle, // using handle as hostId fallback for SQLite
        topicId: g.topicSlug,
        title: JSON.stringify(g.title),
        description: JSON.stringify(g.description),
        coverImageUrl: g.coverImageUrl,
        galleryUrls: g.galleryUrls.join('|'),
        startDate: new Date(g.startDate),
        endDate: new Date(g.endDate),
        isPrayerAware: g.isPrayerAware ?? true,
        venueName: JSON.stringify(g.venueName),
        venueAddress: JSON.stringify(g.venueAddress),
        venueLat: g.venueLat ?? null,
        venueLng: g.venueLng ?? null,
        venueNotes: g.venueNotes ? JSON.stringify(g.venueNotes) : null,
        isLocationRevealed: g.isLocationRevealed ?? false,
        format: g.format,
        capacityMin: g.capacityMin ?? 10,
        capacityMax: g.capacityMax,
        priceKwd: g.priceKwd,
        isFree: g.isFree ?? false,
        applicationQuestions: g.applicationQuestions
          ? JSON.stringify(g.applicationQuestions)
          : null,
        status: g.status,
        publishedAt: g.publishedAt ? new Date(g.publishedAt) : null,
        applicationsOpenAt: g.applicationsOpenAt ? new Date(g.applicationsOpenAt) : null,
        applicationsCloseAt: g.applicationsCloseAt ? new Date(g.applicationsCloseAt) : null,
      },
    });
  }

  // 4. Letters
  console.log(`  → Inserting ${letters.length} letters...`);
  for (const l of letters) {
    await prisma.letter.upsert({
      where: { slug: l.slug },
      update: {},
      create: {
        slug: l.slug,
        gatheringId: l.gatheringSlug ?? null,
        authorId: l.authorHostHandle,
        topicId: l.topicSlug,
        title: JSON.stringify(l.title),
        subtitle: l.subtitle ? JSON.stringify(l.subtitle) : null,
        content: JSON.stringify(l.content),
        coverImageUrl: l.coverImageUrl,
        galleryUrls: l.galleryUrls ? l.galleryUrls.join('|') : null,
        excerpt: JSON.stringify(l.excerpt),
        readTimeMinutes: l.readTimeMinutes ?? 5,
        status: 'PUBLISHED',
        publishedAt: new Date(l.publishedAt),
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log(`   ${topics.length} topics`);
  console.log(`   ${hosts.length} hosts`);
  console.log(`   ${gatherings.length} gatherings`);
  console.log(`   ${letters.length} letters`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
