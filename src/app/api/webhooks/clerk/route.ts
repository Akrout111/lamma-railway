import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * Clerk Webhook Handler
 *
 * Syncs Clerk user events to our Prisma database:
 * - user.created  → create User record
 * - user.updated  → update User record
 * - user.deleted  → delete User record
 *
 * Configure this URL in Clerk Dashboard → Webhooks:
 *   https://your-app.up.railway.app/api/webhooks/clerk
 *
 * Events to subscribe: user.created, user.updated, user.deleted
 */

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get Svix headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get raw body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[Clerk Webhook] Invalid signature:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`[Clerk Webhook] ${eventType} for user ${id}`);

  try {
    if (eventType === 'user.created') {
      const { email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data as any;
      const email = email_addresses?.[0]?.email_address ?? '';
      const fullName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || email;
      const locale = unsafe_metadata?.locale ?? 'ar';

      await db.user.upsert({
        where: { id: id! },
        update: {},
        create: {
          id: id!,
          email,
          name: { ar: fullName, en: fullName },
          avatarUrl: image_url ?? null,
          locale,
        },
      });
      console.log(`[Clerk Webhook] Created user ${id} (${email})`);
    }

    if (eventType === 'user.updated') {
      const { email_addresses, first_name, last_name, image_url } = evt.data as any;
      const email = email_addresses?.[0]?.email_address ?? '';
      const fullName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || email;

      await db.user.update({
        where: { id: id! },
        data: {
          email,
          name: { ar: fullName, en: fullName },
          avatarUrl: image_url ?? null,
        },
      });
      console.log(`[Clerk Webhook] Updated user ${id}`);
    }

    if (eventType === 'user.deleted') {
      await db.user.delete({ where: { id: id! } }).catch(() => {
        // User may not exist in our DB (e.g., if webhook fired before creation)
        console.log(`[Clerk Webhook] User ${id} not found in DB (already deleted?)`);
      });
      console.log(`[Clerk Webhook] Deleted user ${id}`);
    }
  } catch (error) {
    console.error(`[Clerk Webhook] DB error for ${eventType}:`, error);
    return new Response('Database error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
