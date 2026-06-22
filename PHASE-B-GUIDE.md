# 🚀 Lamma Phase B — PostgreSQL + Supabase + Clerk

> **دليل الترحيل من Phase A (SQLite + mock auth) إلى Phase B (PostgreSQL + Clerk)**

---

## 📋 نظرة سريعة

| المكون | Phase A | Phase B |
|--------|---------|---------|
| Database | SQLite | PostgreSQL (Supabase) |
| Auth | Zustand mock | Clerk (JWT + OAuth) |
| Migrations | `db push` | `migrate deploy` |
| Embeddings | String (mock) | `vector(1536)` (pgvector) |

---

## ✅ ما تم إنجازه في هذا الـ branch (تلقائياً)

- [x] تحويل `prisma/schema.prisma` إلى PostgreSQL (24 إصلاح PROD-ONLY)
- [x] إضافة `@clerk/nextjs` + `svix` لـ `package.json`
- [x] استبدال `src/middleware.ts` بـ Clerk middleware
- [x] إنشاء `src/app/api/webhooks/clerk/route.ts`
- [x] استبدال `src/lib/auth-store.ts` بـ Clerk adapter
- [x] إضافة `<ClerkProvider>` لـ `src/app/[locale]/layout.tsx`
- [x] إنشاء `/sign-in` و `/sign-up` pages
- [x] تحديث `src/lib/db.ts` لدعم PgBouncer
- [x] تحديث `Dockerfile` + `railway.json` (db push → migrate deploy)
- [x] تحديث `.env.example` بكل المتغيرات الجديدة

---

## 🔧 الخطوات اليدوية المطلوبة منك

### Step 1: إعداد Supabase (15 دقيقة)

1. اذهب إلى https://supabase.com → **New Project**
   - Name: `lamma`
   - Password: استخدم كلمة مرور قوية **بدون `$`** (مثل `Lamma2026SecureKuwait`)
   - Region: `EU West 1 - Ireland`
   - Plan: Free

2. فعّل pgvector + pg_trgm:
   - اذهب إلى **SQL Editor** في Supabase Dashboard
   - الصق هذا الكود واضغط **Run**:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     CREATE EXTENSION IF NOT EXISTS pg_trgm;
     ```

3. احصل على Connection Strings:
   - اذهب إلى **Project Settings → Database → Connection string**
   - انسخ **Transaction pooler** (port 6543) → هذا `DATABASE_URL`
   - انسخ **Session pooler** (port 5432) → هذا `DIRECT_URL`

---

### Step 2: إعداد Clerk (10 دقائق)

1. اذهب إلى https://clerk.com → **Create Application**
   - Name: `Lamma`
   - Framework: React/Next.js

2. انسخ الـ API Keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (يبدأ بـ `pk_`)
   - `CLERK_SECRET_KEY` (يبدأ بـ `sk_`)

3. أنشئ Webhook:
   - اذهب إلى **Webhooks → Add Endpoint**
   - URL: `https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - انسخ **Signing Secret** (يبدأ بـ `whsec_`) → هذا `CLERK_WEBHOOK_SECRET`

---

### Step 3: إنشاء Migration أول (5 دقائق)

```bash
# 1. استنسخ الـ branch
git clone -b phase-b https://github.com/Akrout111/lamma-railway.git
cd lamma-railway

# 2. ثبّت الاعتمادات
bun install

# 3. أنشئ ملف .env محلياً
cp .env.example .env
# عدّل .env: ضع DATABASE_URL و DIRECT_URL من Supabase

# 4. ولّد Prisma Client
bun ./node_modules/prisma/build/index.js generate

# 5. أنشئ migration أول (هذا يطبّق الجداول على Supabase)
bun ./node_modules/prisma/build/index.js migrate dev --name init

# 6. تحقق من نجاح الـ migration
ls prisma/migrations/
# يجب أن ترى مجلداً باسم <timestamp>_init
```

---

### Step 4: ضبط متغيرات Railway (5 دقائق)

في Railway → **Variables** tab، أضف:

```bash
# Database
DATABASE_URL="postgresql://postgres.lamma:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.lamma:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

# Next.js
NODE_ENV="production"
NEXTAUTH_URL="https://YOUR-RAILWAY-DOMAIN.up.railway.app"
NEXTAUTH_SECRET=""  # شغّل: openssl rand -base64 32

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# AI (optional)
ZAI_API_KEY=""

# Live Companion
LIVE_COMPANION_PORT="3003"
```

**⚠️ تحذير:** لا تضع `$` في أي قيمة. إن كان الـ password يحتوي على `$`، استبدله بـ `%24`.

---

### Step 5: Commit + Push (2 دقيقة)

```bash
# من جهازك بعد إنشاء الـ migration
git add prisma/migrations/
git commit -m "feat(db): add initial PostgreSQL migration with pgvector"
git push origin phase-b
```

---

### Step 6: Deploy على Railway (10 دقائق)

1. في Railway، اذهب لـ **Settings → Deploy → Branch** → اختر `phase-b`
2. اضغط **Deploy**
3. راقب الـ logs:
   - يجب أن ترى `=== Lamma startup (Phase B) ===`
   - `DATABASE_URL: set`
   - `DIRECT_URL: set`
   - `Applying migrations...` → نجاح
   - `bun server.js` يبدأ
   - Live Companion يبدأ على port 3003

4. بعد نجاح الـ healthcheck، اختبر:
   ```bash
   curl https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/v1/health
   # يجب: {"status":"ok","db":"connected","dbDetail":"postgresql"}
   ```

---

### Step 7: تشغيل الـ Seed (3 دقائق)

```bash
# ثبّت Railway CLI
bunx npm install -g @railway/cli
railway login
railway link  # اختر lamma-railway

# شغّل الـ seed
railway run bun prisma/seed-standalone.ts
```

تحقق من Supabase Dashboard → **Table Editor**:
- `Topic`: 6 مواضيع ✅
- `Host`: 5 أصحاب ✅
- `Gathering`: 8 لمات ✅
- `Letter`: 3 رسائل ✅

---

## 🚨 مشاكل شائعة وحلولها

### `Can't reach database server`
**السبب:** استخدمت Direct connection بدل Transaction pooler
**الحل:** تأكد أن `DATABASE_URL` يستخدم port `6543` (وليس 5432)

### `Circuit breaker` من Supabase
**السبب:** محاولات auth فاشلة كثيرة (كلمة مرور خاطئة)
**الحل:** انتظر 15-30 دقيقة، لا تكرر الـ deploy

### `Clerk webhook signature invalid`
**السبب:** `CLERK_WEBHOOK_SECRET` غير صحيح
**الحل:** تحقق من القيمة في Clerk Dashboard → Webhooks

### `migration failed to apply cleanly`
**السبب:** pgvector غير مفعّل
**الحل:** شغّل في Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 🎯 Checklist نهائية قبل الـ Deploy

- [ ] Supabase project مُنشأ + pgvector مفعّل
- [ ] Clerk application مُنشأ + webhook مُعد
- [ ] `prisma/migrations/<timestamp>_init/` ملتزم في Git
- [ ] Railway variables كاملة (DATABASE_URL, DIRECT_URL, Clerk keys)
- [ ] لا `$` في أي قيمة متغير
- [ ] `NEXTAUTH_URL` يطابق domain الإنتاج الفعلي
- [ ] Dockerfile CMD يستخدم `migrate deploy`
- [ ] railway.json startCommand يستخدم `migrate deploy`

---

## 📞 ما الذي تغير؟

```
Step 1: Supabase + pgvector           → 15 دقيقة (يدوي)
Step 2: Clerk + webhook               → 10 دقائق (يدوي)
Step 3: migrate dev --name init       → 5 دقائق (محلي)
Step 4: Railway variables             → 5 دقائق (يدوي)
Step 5: commit + push                 → 2 دقيقة (محلي)
Step 6: Deploy على Railway            → 10 دقائق (تلقائي)
Step 7: Seed                          → 3 دقائق (محلي)

الإجمالي: ~50 دقيقة
```

بعد إكمال هذه الخطوات، سيكون Lamma مطابقاً لإعداد Kuwait Event Railway الأول، لكن مع ميزات متقدمة (pgvector, Realtime, Clerk).

---

**Branch:** `phase-b`
**Target merge:** `main` (بعد التحقق من نجاح الـ deploy)
