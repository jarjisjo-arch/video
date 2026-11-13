import { NIGHT_COUNT } from './sim/levels';
import { BOATS } from './sim/boats';
import { INKS, LANTERNS } from './palettes';

export interface Mission { type: string; goal: number; prog: number; reward: number; done?: boolean }
export interface Save {
  v: 1; stars: number[]; bestTime: number[]; flies: number; xp: number;
  boat: string; power: 'none' | 'spring' | 'still'; up: { magnet: number; hull: number; streak: number };
  inks: string[]; ink: string; lanterns: string[]; lantern: string;
  missions: Mission[]; daily: { last: string; streak: number }; dailyBest: { date: string; score: number };
  endlessBest: number; seen: Record<string, boolean>; ghosts: Record<string, number[]>;
  settings: { sfx: boolean; music: boolean; haptics: boolean; left: boolean; reduced: boolean; contrast: boolean };
  stats: { nights: number; near: number; fliesAll: number; dist: number };
  rankSeen: number;
}
const KEY = 'moonpull.save.v1';
const fresh = (): Save => ({
  v: 1, stars: Array(NIGHT_COUNT).fill(0), bestTime: Array(NIGHT_COUNT).fill(0), flies: 0, xp: 0,
  boat: 'paper', power: 'none', up: { magnet: 0, hull: 0, streak: 0 },
  inks: ['indigo'], ink: 'auto', lanterns: ['vermilion'], lantern: 'vermilion',
  missions: [], daily: { last: '', streak: 0 }, dailyBest: { date: '', score: 0 }, endlessBest: 0, seen: {}, ghosts: {},
  settings: { sfx: true, music: true, haptics: true, left: false, reduced: false, contrast: false },
  stats: { nights: 0, near: 0, fliesAll: 0, dist: 0 }, rankSeen: 1,
});
export let save: Save = fresh();
export function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); const f = fresh(); save = { ...f, ...d, up: { ...f.up, ...d.up }, settings: { ...f.settings, ...d.settings }, stats: { ...f.stats, ...d.stats } }; while (save.stars.length < NIGHT_COUNT) { save.stars.push(0); save.bestTime.push(0); } } } catch { save = fresh(); }
  fillMissions();
}
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or blocked */ } }
export function resetAll() { save = fresh(); fillMissions(); persist(); }

// stars are a bitmask: 1 finished, 2 fireflies, 4 time
export const starCount = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
export const totalStars = () => save.stars.reduce((a, m) => a + starCount(m), 0);
export const COAST_NEED = [0, 12, 28];
export function nightUnlocked(i: number) {
  if (i === 0) return true;
  if (!(save.stars[i - 1] & 1)) return false;
  return totalStars() >= COAST_NEED[Math.floor(i / 10)];
}
export const modeUnlocked = (m: string) => m === 'daily' ? !!(save.stars[2] & 1) : m === 'drift' ? !!(save.stars[4] & 1) : !!(save.stars[9] & 1);

// ---- voyage rank
export const RANKS: { xp: number; reward: string; label: string }[] = [
  { xp: 0, reward: '', label: '' },
  { xp: 150, reward: 'power:spring', label: 'Moon power: Spring Tide' },
  { xp: 380, reward: 'flies:80', label: '80 fireflies' },
  { xp: 700, reward: 'boat:raft', label: 'Reed Raft' },
  { xp: 1100, reward: 'power:still', label: 'Moon power: Still Water' },
  { xp: 1600, reward: 'flies:120', label: '120 fireflies' },
  { xp: 2200, reward: 'boat:skiff', label: 'Racing Skiff' },
  { xp: 2900, reward: 'lantern:jade', label: 'Jade lantern' },
  { xp: 3700, reward: 'flies:200', label: '200 fireflies' },
  { xp: 4600, reward: 'ink:ember', label: 'Ember Tide ink' },
  { xp: 5600, reward: 'flies:300', label: '300 fireflies' },
  { xp: 6800, reward: 'lantern:pearl', label: 'Pearl lantern' },
];
export function rankOf(xp = save.xp) { let r = 1; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i + 1; return r; }
export function rankProgress() {
  const r = rankOf(); const cur = RANKS[r - 1].xp, next = RANKS[r] ? RANKS[r].xp : cur;
  return { rank: r, frac: RANKS[r] ? (save.xp - cur) / (next - cur) : 1, next: RANKS[r]?.label ?? '', toGo: RANKS[r] ? next - save.xp : 0 };
}
export const hasPower = (p: string) => rankOf() >= (p === 'spring' ? 2 : 5);
export const hasBoat = (id: string) => rankOf() >= (BOATS.find(b => b.id === id)!.rank || 1);
/** grant rank rewards not yet handed out; returns labels of new ones */
export function claimRanks(): string[] {
  const out: string[] = []; const r = rankOf();
  while (save.rankSeen < r) {
    save.rankSeen++; const rw = RANKS[save.rankSeen - 1]; out.push(rw.label);
    const [k, v] = rw.reward.split(':');
    if (k === 'flies') save.flies += +v;
    if (k === 'ink' && !save.inks.includes(v)) save.inks.push(v);
    if (k === 'lantern' && !save.lanterns.includes(v)) save.lanterns.push(v);
    if (k === 'power' && save.power === 'none') save.power = v as any;
  }
  return out;
}

// ---- shop
export const UPGRADES = [
  { id: 'magnet', name: 'Brighter Lantern', blurb: 'Fireflies drift toward the boat from further away.', cost: [60, 140, 260] },
  { id: 'hull', name: 'Waxed Hull', blurb: 'Survive one more knock each night.', cost: [150, 350] },
  { id: 'streak', name: 'Steady Hand', blurb: 'Your multiplier fades more slowly.', cost: [80, 160, 280] },
] as const;
export function buyUpgrade(id: 'magnet' | 'hull' | 'streak') {
  const u = UPGRADES.find(x => x.id === id)!; const lv = save.up[id]; const c = u.cost[lv];
  if (c === undefined || save.flies < c) return false;
  save.flies -= c; save.up[id]++; persist(); return true;
}
export function buyInk(id: string) { const k = INKS.find(i => i.id === id)!; if (save.inks.includes(id) || save.flies < k.price) return false; save.flies -= k.price; save.inks.push(id); persist(); return true; }
export function buyLantern(id: string) { const k = LANTERNS.find(i => i.id === id)!; if (save.lanterns.includes(id) || save.flies < k.price) return false; save.flies -= k.price; save.lanterns.push(id); persist(); return true; }

// ---- missions
const POOL: { type: string; goals: number[]; text: (n: number) => string }[] = [
  { type: 'fly', goals: [40, 70, 110], text: n => `Gather ${n} fireflies` },
  { type: 'near', goals: [3, 5, 8], text: n => `Skim past ${n} hazards without touching` },
  { type: 'night', goals: [2, 3, 4], text: n => `Bring the lantern through ${n} nights` },
  { type: 'clean', goals: [1, 2, 3], text: n => `Finish ${n} night${n > 1 ? 's' : ''} without a knock` },
  { type: 'x5', goals: [1, 2, 3], text: n => `Reach a ×5 streak ${n} time${n > 1 ? 's' : ''}` },
  { type: 'star', goals: [2, 3, 5], text: n => `Earn ${n} new stars` },
  { type: 'surf', goals: [30, 60, 90], text: n => `Surf fast for ${n} seconds in total` },
];
export const missionText = (m: Mission) => POOL.find(p => p.type === m.type)!.text(m.goal);
export function fillMissions() {
  while (save.missions.length < 3) {
    const free = POOL.filter(p => !save.missions.some(m => m.type === p.type));
    const p = free[Math.floor(Math.random() * free.length)]; const gi = Math.floor(Math.random() * 3);
    save.missions.push({ type: p.type, goal: p.goals[gi], prog: 0, reward: 30 + gi * 25 });
  }
}
export function bump(type: string, n: number) { for (const m of save.missions) if (m.type === type && !m.done) { m.prog = Math.min(m.goal, m.prog + n); if (m.prog >= m.goal) m.done = true; } }
export function claimMission(i: number) { const m = save.missions[i]; if (!m || !m.done) return 0; save.flies += m.reward; save.missions.splice(i, 1); fillMissions(); persist(); return m.reward; }

// ---- daily
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const DAILY_GIFT = [20, 30, 40, 50, 60, 80, 150];
export function dailyAvailable() { return save.daily.last !== today(); }
export function claimDaily() {
  if (!dailyAvailable()) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const ys = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  save.daily.streak = save.daily.last === ys ? save.daily.streak + 1 : 1;
  save.daily.last = today();
  const g = DAILY_GIFT[(save.daily.streak - 1) % 7]; save.flies += g; persist(); return g;
}
