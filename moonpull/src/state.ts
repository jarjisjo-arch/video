import { NIGHT_COUNT } from './sim/levels';
import { BOATS } from './sim/boats';

export interface Mission { type: string; goal: number; prog: number; reward: number; done?: boolean }
export interface Save {
  v: 2; stars: number[]; bestTime: number[]; bestScore: number[]; flies: number; xp: number;
  boat: string; boats: string[]; up: { magnet: number; hearts: number };
  built: string[]; lanterns: string[]; lantern: string;
  missions: Mission[]; daily: { last: string; streak: number }; dailyBest: { date: string; score: number };
  endlessBest: number; seen: Record<string, boolean>; ghosts: Record<string, number[]>; jar: number;
  settings: { sfx: boolean; music: boolean; haptics: boolean; reduced: boolean; contrast: boolean };
  stats: { nights: number; perfects: number; flies: number; bestChain: number; bestAir: number };
  rankSeen: number;
}
const KEY = 'moonpull.save.v2';
const fresh = (): Save => ({
  v: 2, stars: Array(NIGHT_COUNT).fill(0), bestTime: Array(NIGHT_COUNT).fill(0), bestScore: Array(NIGHT_COUNT).fill(0), flies: 0, xp: 0,
  boat: 'paper', boats: ['paper'], up: { magnet: 0, hearts: 0 }, built: [], lanterns: ['ember'], lantern: 'ember',
  missions: [], daily: { last: '', streak: 0 }, dailyBest: { date: '', score: 0 }, endlessBest: 0, seen: {}, ghosts: {}, jar: 0,
  settings: { sfx: true, music: true, haptics: true, reduced: false, contrast: false },
  stats: { nights: 0, perfects: 0, flies: 0, bestChain: 0, bestAir: 0 }, rankSeen: 1,
});
export let save: Save = fresh();
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); const f = fresh(); save = { ...f, ...d, up: { ...f.up, ...d.up }, settings: { ...f.settings, ...d.settings }, stats: { ...f.stats, ...d.stats } };
      for (const k of ['stars', 'bestTime', 'bestScore'] as const) while (save[k].length < NIGHT_COUNT) save[k].push(0); }
  } catch { save = fresh(); }
  fillMissions();
}
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage blocked */ } }
export function resetAll() { save = fresh(); fillMissions(); persist(); }

// stars are a bitmask: 1 reached the harbour, 2 fireflies, 4 within the par time
export const starCount = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
export const totalStars = () => save.stars.reduce((a, m) => a + starCount(m), 0);
export const COAST_NEED = [0, 10, 26];
export const completed = () => save.stars.filter(s => s & 1).length;
export function nightUnlocked(i: number) {
  if (i === 0) return true;
  if (!(save.stars[i - 1] & 1)) return false;
  return totalStars() >= COAST_NEED[Math.floor(i / 8)];
}
export const modeUnlocked = (m: string) => m === 'daily' ? !!(save.stars[2] & 1) : m === 'drift' ? !!(save.stars[3] & 1) : !!(save.stars[7] & 1);

// ---- voyage rank (from distance sailed and stars)
export const RANKS: { xp: number; reward: string; label: string }[] = [
  { xp: 0, reward: '', label: '' },
  { xp: 120, reward: 'flies:60', label: '60 fireflies' },
  { xp: 300, reward: 'lantern:moss', label: 'Moss lantern' },
  { xp: 560, reward: 'boat:reed', label: 'Reed Raft' },
  { xp: 900, reward: 'flies:120', label: '120 fireflies' },
  { xp: 1320, reward: 'lantern:sky', label: 'Sky lantern' },
  { xp: 1820, reward: 'boat:swift', label: 'Swift' },
  { xp: 2400, reward: 'flies:200', label: '200 fireflies' },
  { xp: 3100, reward: 'lantern:rose', label: 'Rose lantern' },
  { xp: 3900, reward: 'flies:300', label: '300 fireflies' },
  { xp: 4800, reward: 'lantern:gold', label: 'Gold lantern' },
  { xp: 6000, reward: 'flies:500', label: '500 fireflies' },
];
export function rankOf(xp = save.xp) { let r = 1; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i + 1; return r; }
export function rankProgress() {
  const r = rankOf(); const cur = RANKS[r - 1].xp, next = RANKS[r] ? RANKS[r].xp : cur;
  return { rank: r, frac: RANKS[r] ? (save.xp - cur) / (next - cur) : 1, next: RANKS[r]?.label ?? '', toGo: RANKS[r] ? next - save.xp : 0 };
}
export function claimRanks(): string[] {
  const out: string[] = []; const r = rankOf();
  while (save.rankSeen < r) {
    save.rankSeen++; const rw = RANKS[save.rankSeen - 1]; out.push(rw.label);
    const [k, v] = rw.reward.split(':');
    if (k === 'flies') save.flies += +v;
    if (k === 'lantern' && !save.lanterns.includes(v)) save.lanterns.push(v);
    if (k === 'boat' && !save.boats.includes(v)) save.boats.push(v);
  }
  return out;
}

export const LANTERNS = [
  { id: 'ember', name: 'Ember', c: '#ff8a3d' }, { id: 'moss', name: 'Moss', c: '#9cf06a' }, { id: 'sky', name: 'Sky', c: '#6fd2ff' },
  { id: 'rose', name: 'Rose', c: '#ff7ab8' }, { id: 'gold', name: 'Gold', c: '#ffd34d' },
];
export const lanternColor = () => (LANTERNS.find(l => l.id === save.lantern) ?? LANTERNS[0]).c;

// ---- the village
export const VILLAGE = [
  { id: 'pier', name: 'Pier lanterns', blurb: 'Light the way in for every boat.', cost: 60 },
  { id: 'net', name: 'Net shed', blurb: 'The first house on the shore, mended.', cost: 120 },
  { id: 'bakery', name: 'Bakery', blurb: 'Warm windows on the hill.', cost: 200 },
  { id: 'school', name: 'Schoolhouse', blurb: 'Lessons start again.', cost: 300 },
  { id: 'market', name: 'Market', blurb: 'Stalls open, lamps lit.', cost: 400 },
  { id: 'bell', name: 'Bell tower', blurb: 'A bell for boats lost in fog.', cost: 520 },
  { id: 'garden', name: 'Lantern garden', blurb: 'Small lights along the cliff path.', cost: 650 },
  { id: 'light', name: 'Lighthouse lamp', blurb: 'A beam no storm can hide.', cost: 800 },
  { id: 'boathouse', name: 'Boathouse', blurb: 'Room for the whole fleet.', cost: 1000 },
  { id: 'festival', name: 'Festival lights', blurb: 'For the night they all come home.', cost: 1300 },
];
export function buildItem(id: string) {
  const it = VILLAGE.find(v => v.id === id)!; if (save.built.includes(id) || save.flies < it.cost) return false;
  save.flies -= it.cost; save.built.push(id); persist(); return true;
}
export const nextBuild = () => VILLAGE.find(v => !save.built.includes(v.id));
export const boatsHome = () => Math.min(6, Math.floor(completed() / 4));

// ---- upgrades and boats for fireflies
export const UPGRADES = [
  { id: 'magnet', name: 'Brighter lantern', blurb: 'Fireflies drift to the boat from further away.', cost: [80, 180, 320] },
  { id: 'hearts', name: 'Waxed hull', blurb: 'One more knock before the lantern goes out.', cost: [250] },
] as const;
export function buyUpgrade(id: 'magnet' | 'hearts') {
  const u = UPGRADES.find(x => x.id === id)!; const c = u.cost[save.up[id]];
  if (c === undefined || save.flies < c) return false; save.flies -= c; save.up[id]++; persist(); return true;
}
export function buyBoat(id: string) { const b = BOATS.find(x => x.id === id)!; if (save.boats.includes(id) || !b.price || save.flies < b.price) return false; save.flies -= b.price; save.boats.push(id); persist(); return true; }

// ---- star jar: every 10 stars earned fills a jar
export const JAR = 10;
export function addJar(n: number) { save.jar += n; }
export function openJar(): { flies: number; extra: string } | null {
  if (save.jar < JAR) return null; save.jar -= JAR;
  const flies = 120 + Math.floor(Math.random() * 5) * 20; save.flies += flies;
  let extra = '';
  const missing = LANTERNS.filter(l => !save.lanterns.includes(l.id) && (l.id === 'rose' || l.id === 'gold'));
  if (missing.length && Math.random() < 0.3) { save.lanterns.push(missing[0].id); extra = `${missing[0].name} lantern`; }
  persist(); return { flies, extra };
}

// ---- tasks
const POOL: { type: string; goals: number[]; text: (n: number) => string }[] = [
  { type: 'fly', goals: [40, 80, 140], text: n => `Gather ${n} fireflies` },
  { type: 'perfect', goals: [5, 10, 20], text: n => `Make ${n} perfect landings` },
  { type: 'night', goals: [2, 3, 5], text: n => `Bring the lantern through ${n} nights` },
  { type: 'clean', goals: [1, 2, 3], text: n => `Finish ${n} night${n > 1 ? 's' : ''} without a knock` },
  { type: 'chain', goals: [6, 9, 12], text: n => `Reach a chain of ${n}` },
  { type: 'ring', goals: [3, 6, 10], text: n => `Fly through ${n} lantern rings` },
  { type: 'air', goals: [20, 40, 70], text: n => `Spend ${n} seconds in the air` },
  { type: 'near', goals: [5, 10, 16], text: n => `Skim ${n} reefs or arches` },
];
export const missionText = (m: Mission) => POOL.find(p => p.type === m.type)!.text(m.goal);
export function fillMissions() {
  save.missions = save.missions.filter(m => POOL.some(p => p.type === m.type));
  while (save.missions.length < 3) {
    const free = POOL.filter(p => !save.missions.some(m => m.type === p.type));
    const p = free[Math.floor(Math.random() * free.length)]; const gi = Math.floor(Math.random() * 3);
    save.missions.push({ type: p.type, goal: p.goals[gi], prog: 0, reward: 40 + gi * 30 });
  }
}
export function bump(type: string, n: number, max = false) { for (const m of save.missions) if (m.type === type && !m.done) { m.prog = Math.min(m.goal, max ? Math.max(m.prog, n) : m.prog + n); if (m.prog >= m.goal) m.done = true; } }
export function claimMission(i: number) { const m = save.missions[i]; if (!m || !m.done) return 0; save.flies += m.reward; save.missions.splice(i, 1); fillMissions(); persist(); return m.reward; }

// ---- daily gift
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => ymd(new Date());
export const DAILY_GIFT = [25, 35, 45, 60, 75, 90, 200];
export const dailyAvailable = () => save.daily.last !== today();
export function claimDaily() {
  if (!dailyAvailable()) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  save.daily.streak = save.daily.last === ymd(y) ? save.daily.streak + 1 : 1; save.daily.last = today();
  const g = DAILY_GIFT[(save.daily.streak - 1) % 7]; save.flies += g; persist(); return g;
}
