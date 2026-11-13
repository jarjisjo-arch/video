import { BoatStats } from './types';
export const BOATS: (BoatStats & { name: string; blurb: string; rank: number })[] = [
  { id: 'paper', name: 'Paper Boat', blurb: 'Balanced. The one the child folded.', accel: 1, drag: 0.9, hp: 2, multGain: 1, rank: 0 },
  { id: 'raft', name: 'Reed Raft', blurb: 'Heavy and steady. Takes one more knock.', accel: 0.9, drag: 0.9, hp: 3, multGain: 0.9, rank: 4 },
  { id: 'skiff', name: 'Racing Skiff', blurb: 'Quick to run, quick to build a streak. Fragile.', accel: 1.22, drag: 0.8, hp: 1, multGain: 1.5, rank: 7 },
];
