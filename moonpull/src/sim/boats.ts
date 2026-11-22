import { BoatStats } from './types';
export const BOATS: (BoatStats & { name: string; blurb: string; price: number; rank: number })[] = [
  { id: 'paper', name: 'Paper Boat', blurb: 'The one the child folded. Balanced.', grav: 1, air: 1, land: 1, hearts: 3, price: 0, rank: 0 },
  { id: 'reed', name: 'Reed Raft', blurb: 'Forgiving landings, one extra knock.', grav: 0.95, air: 1.05, land: 1.35, hearts: 4, price: 0, rank: 4 },
  { id: 'swift', name: 'Swift', blurb: 'Light as a leaf. Longer flights, tighter landings.', grav: 1.12, air: 0.92, land: 1.0, hearts: 3, price: 0, rank: 7 },
  { id: 'swan', name: 'Swan', blurb: 'A festival boat. Fireflies drift to it from further away.', grav: 1, air: 0.95, land: 1.1, hearts: 3, price: 900, rank: 0 },
];
