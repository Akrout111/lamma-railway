/**
 * Lamma Local Matching Engine — Phase 3A.
 * Pure-TypeScript TF-IDF-style matching. PROD-ONLY: replace with OpenAI embeddings.
 */
import { demoUsers, type DemoUser } from '@/data/demo-users';
import { gatherings, type Gathering } from '@/data/gatherings';
import { topics } from '@/data/topics';

/**
 * Minimal user shape required by the matching engine.
 * Both `DemoUser` (mock) and `AdaptedUser` (Clerk) satisfy this interface,
 * so the engine works in both Phase A and Phase B without type errors.
 */
export interface MatchableUser {
  id: string;
  nameLocalized: { ar: string; en: string };
  bioLocalized: { ar: string; en: string };
  interests: string[];
  gender?: 'male' | 'female' | string;
  nationality?: string;
  membershipTier: 'NEWCOMER' | 'REGULAR' | 'CURATOR' | 'HOST';
}

const STOP_WORDS = new Set([
  'في','من','إلى','على','عن','مع','هذا','هذه','التي','الذي','كان','قد','ما','لا','إن','هو','هي','نحن','أنا','أنت','هم','كل','بعض','عند','لكن','أو','ثم','حتى','قبل','بعد',
  'the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','should','could','may','might','must','can',
  'to','of','in','on','at','by','for','with','about','against','between','into','through','during','before','after','above','below','from','up','down','and','or',
  'but','if','then','else','when','where','why','how','all','any','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very',
  'i','me','my','we','us','our','you','your','he','she','it',
]);

const SYNONYMS: Record<string, string[]> = {
  photography: ['photo','camera','تصوير','كاميرا','صور','light','shadow','ضوء','ظل','فيلم'],
  art: ['painting','paint','draw','فن','رسم','تشكيلي','فنان','استوديو','لوحة','ألوان'],
  books: ['book','read','reading','كتاب','قراءة','أدب','رواية','شعر','نادي'],
  music: ['song','instrument','موسيقى','غناء','إيقاع','صوت','أغنية','طبول','مرْوَس'],
  food: ['cooking','cook','chef','طعام','طبخ','مائدة','وجبة','مطبخ','وصفة'],
  culture: ['heritage','traditional','ثقافة','تراث','تقليدي','ديوانية'],
  history: ['historical','past','تاريخ','أثري','قديم','حكاية','ذاكرة'],
  design: ['graphic','ux','ui','تصميم','غرافيك','إبداع'],
  technology: ['tech','software','code','تقنية','برمجة','حاسوب','تكنولوجيا','مهندس'],
  networking: ['connect','meet','professional','تواصل','علاقات','مهني','هندسة'],
  poetry: ['poem','verse','شعر','قصيدة','بيت','شاعر'],
  literature: ['literary','novel','أدب','نقد','رواية','كاتب'],
  painting: ['acrylic','oil','watercolor','رسم','ألوان','لوحة','تشكيلي'],
  pottery: ['clay','ceramic','فخار','طين','سيراميك'],
  marketing: ['brand','advertising','تسويق','علامة','إعلان'],
};

const WEIGHTS = { interest: 3, topic: 2, title: 1.5, description: 1, bio: 1, nationality: 0.5 };

export function tokenize(text: string): string[] {
  if (!text) return [];
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return cleaned.split(/\s+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      if (token === key || synonyms.includes(token)) {
        expanded.add(key);
        synonyms.forEach((s) => expanded.add(s));
      }
    }
  }
  return Array.from(expanded);
}

export interface ProfileVector { tokens: Map<string, number>; magnitude: number; }

function buildVector(weightedTokens: Array<{ token: string; weight: number }>): ProfileVector {
  const tokens = new Map<string, number>();
  for (const { token, weight } of weightedTokens) {
    for (const t of expandWithSynonyms([token])) tokens.set(t, (tokens.get(t) ?? 0) + weight);
  }
  let magnitude = 0;
  for (const w of tokens.values()) magnitude += w * w;
  return { tokens, magnitude: Math.sqrt(magnitude) };
}

export function buildUserVector(user: MatchableUser): ProfileVector {
  const wt: Array<{ token: string; weight: number }> = [];
  for (const i of user.interests) wt.push({ token: i, weight: WEIGHTS.interest });
  for (const t of tokenize(user.bioLocalized.ar)) wt.push({ token: t, weight: WEIGHTS.bio });
  for (const t of tokenize(user.bioLocalized.en)) wt.push({ token: t, weight: WEIGHTS.bio });
  if (user.nationality) wt.push({ token: user.nationality.toLowerCase(), weight: WEIGHTS.nationality });
  return buildVector(wt);
}

export function buildGatheringVector(g: Gathering): ProfileVector {
  const wt: Array<{ token: string; weight: number }> = [];
  wt.push({ token: g.topicSlug, weight: WEIGHTS.topic });
  const topic = topics.find((t) => t.slug === g.topicSlug);
  if (topic) {
    for (const t of tokenize(topic.name.ar)) wt.push({ token: t, weight: WEIGHTS.topic });
    for (const t of tokenize(topic.name.en)) wt.push({ token: t, weight: WEIGHTS.topic });
  }
  for (const t of tokenize(g.title.ar)) wt.push({ token: t, weight: WEIGHTS.title });
  for (const t of tokenize(g.title.en)) wt.push({ token: t, weight: WEIGHTS.title });
  for (const t of tokenize(g.description.ar)) wt.push({ token: t, weight: WEIGHTS.description });
  for (const t of tokenize(g.description.en)) wt.push({ token: t, weight: WEIGHTS.description });
  return buildVector(wt);
}

export function cosineSimilarity(a: ProfileVector, b: ProfileVector): number {
  if (a.magnitude === 0 || b.magnitude === 0) return 0;
  let dot = 0;
  const [smaller, larger] = a.tokens.size < b.tokens.size ? [a, b] : [b, a];
  for (const [token, w] of smaller.tokens) { const ow = larger.tokens.get(token); if (ow) dot += w * ow; }
  return dot / (a.magnitude * b.magnitude);
}

export function computeMatchScore(user: MatchableUser, gathering: Gathering): number {
  const vs = cosineSimilarity(buildUserVector(user), buildGatheringVector(gathering));
  const topicObj = topics.find((t) => t.slug === gathering.topicSlug);
  let topicAlign = 0;
  if (topicObj) {
    const kw = [gathering.topicSlug, ...tokenize(topicObj.name.ar), ...tokenize(topicObj.name.en)];
    const mi = user.interests.filter((i) => kw.some((k) => k === i || (SYNONYMS[i] && SYNONYMS[i].includes(k))));
    topicAlign = mi.length / Math.max(user.interests.length, 1);
  }
  let ff = 0.5;
  if (gathering.format === 'MEN_ONLY' && user.gender === 'male') ff = 1;
  if (gathering.format === 'WOMEN_ONLY' && user.gender === 'female') ff = 1;
  if (gathering.format === 'MIXED' || gathering.format === 'FAMILY') ff = 0.8;
  if (gathering.format === 'MEN_ONLY' && user.gender !== 'male') ff = 0;
  if (gathering.format === 'WOMEN_ONLY' && user.gender !== 'female') ff = 0;
  const raw = vs * 0.5 + topicAlign * 0.35 + ff * 0.15;
  return Math.round(Math.min(100, Math.max(50, (0.5 + raw * 0.5) * 100)));
}

export function computeUserSimilarity(a: MatchableUser, b: MatchableUser): number {
  return cosineSimilarity(buildUserVector(a), buildUserVector(b));
}

export function findSharedInterests(a: MatchableUser, b: MatchableUser): string[] {
  const setA = new Set(a.interests);
  return b.interests.filter((i) => setA.has(i));
}

export function recommendGatheringsForUser(user: MatchableUser, opts: { limit?: number; excludePast?: boolean; excludeApplied?: string[] } = {}): Array<{ gathering: Gathering; score: number }> {
  const { limit = 3, excludePast = true, excludeApplied = [] } = opts;
  const now = new Date();
  return gatherings
    .filter((g) => {
      if (excludePast && new Date(g.startDate) < now) return false;
      if (excludeApplied.includes(g.slug)) return false;
      if (g.status === 'CANCELLED' || g.status === 'COMPLETED') return false;
      if (g.format === 'MEN_ONLY' && user.gender !== 'male') return false;
      if (g.format === 'WOMEN_ONLY' && user.gender !== 'female') return false;
      return true;
    })
    .map((g) => ({ gathering: g, score: computeMatchScore(user, g) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findSimilarAttendees(user: MatchableUser, _slug: string, limit = 3): Array<{ user: MatchableUser; similarity: number; sharedInterests: string[] }> {
  return demoUsers
    .filter((u) => u.id !== user.id && u.membershipTier !== 'HOST')
    .map((o) => ({ user: o, similarity: computeUserSimilarity(user, o), sharedInterests: findSharedInterests(user, o) }))
    .filter((x) => x.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function computeMeritScore(user: MatchableUser, gathering: Gathering, prev = 0): number {
  const ts: Record<string, number> = { NEWCOMER: 0.3, REGULAR: 0.6, CURATOR: 0.9, HOST: 1 };
  return Math.round(((Math.min(1, prev / 3)) * 0.4 + (ts[user.membershipTier] ?? 0.3) * 0.3 + (computeMatchScore(user, gathering) / 100) * 0.3) * 100);
}
