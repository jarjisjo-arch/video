export const VH = 360;          // world units visible vertically
export const SEA = 252;         // calm sea level (y grows downward)
export const MOON_TOP = 30;     // moon y range on screen
export const MOON_LOW = 176;

export type Ob =
  | { t: 'reef'; x: number; w: number; top: number; passed?: boolean }
  | { t: 'over'; x: number; w: number; bottom: number; passed?: boolean }
  | { t: 'bar'; x: number; w: number; top: number; passed?: boolean }
  | { t: 'whirl'; x: number; w: number; passed?: boolean }
  | { t: 'cloud'; x: number; w: number; y0: number; y1: number }
  | { t: 'rip'; x: number; w: number };

export interface Fly { x: number; y: number; got?: boolean }

export interface LevelDef {
  id: string;
  coast: number;         // 0..2
  night: number;         // 1-based within the voyage
  length: number;        // finish x; Infinity for endless modes
  obs: Ob[];
  flies: Fly[];
  pull: number;          // moon strength, 1 = full moon
  par: number;           // seconds for the time star
  line?: string;         // letter line
}

export interface BoatStats {
  id: string;
  accel: number;   // slope response
  drag: number;
  hp: number;
  multGain: number;
}

export interface RunCfg {
  boat: BoatStats;
  power: 'none' | 'spring' | 'still';
  magnet: number;        // 0..3 lantern upgrade
  hull: number;          // extra hp
  streak: number;        // 0..3 slower multiplier decay
  viewW: number;
  endless?: (fromX: number, toX: number, level: LevelDef) => void; // extends level as the boat advances
  noFail?: boolean;
}

export type Ev =
  | { k: 'fly'; x: number; y: number; n: number }
  | { k: 'hit'; x: number; y: number }
  | { k: 'near'; x: number; y: number }
  | { k: 'splash'; x: number; y: number; s: number }
  | { k: 'strand' }
  | { k: 'mult'; m: number }
  | { k: 'power'; p: string }
  | { k: 'win' }
  | { k: 'lose' };

export interface Input { moonSX: number; moonY: number; power: boolean }
