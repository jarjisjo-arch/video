export const VH = 360;        // world units visible vertically at zoom 1
export const BASE = 236;      // mean sea level (y grows downward)

export type Ob =
  | { t: 'rock'; x: number; w: number; top: number; passed?: boolean }
  | { t: 'arch'; x: number; w: number; bottom: number; passed?: boolean }
  | { t: 'whale'; x: number; w: number; used?: boolean; at?: number }
  | { t: 'ring'; x: number; y: number; got?: boolean };

export interface Fly { x: number; y: number; got?: boolean }

export interface Level {
  id: string; coast: number; index: number;     // index across the voyage, -1 for other modes
  ex: number[]; ey: number[];                     // surface extrema (alternating crest/trough)
  length: number;                                 // harbour x, Infinity for endless
  obs: Ob[]; flies: Fly[];
  storm: { v0: number; v1: number; gap: number }; // storm speed at start and end, starting gap
  par: number; line?: string;
}

export interface BoatStats { id: string; grav: number; air: number; land: number; hearts: number }

export type Ev =
  | { k: 'launch'; x: number; y: number; v: number; surge?: boolean }
  | { k: 'land'; x: number; y: number; q: 'perfect' | 'good' | 'bad'; air: number; v: number }
  | { k: 'fly'; x: number; y: number }
  | { k: 'ring'; x: number; y: number }
  | { k: 'near'; x: number; y: number }
  | { k: 'crash'; x: number; y: number }
  | { k: 'whale'; x: number; y: number }
  | { k: 'chain'; n: number }
  | { k: 'fever'; on: boolean }
  | { k: 'win' } | { k: 'lose'; why: 'storm' | 'wreck' };
