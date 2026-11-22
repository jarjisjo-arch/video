// Colour worlds for each coast. Every colour in the play scene comes from one of these.
export interface Ink {
  sky: [string, string, string, string]; // top, upper, lower, horizon glow
  stars: number;
  far: string; mid: string; near: string; mist: string; rim: string;
  sea: string; seaLight: string; deep: string; foam: string; back: string;
  rock: string; rockLit: string; moon: string; moonGlow: string; lantern: string; fly: string; cloud: string; cloudLit: string;
  windows: string;
}
export const INKS: Ink[] = [
  { // Quiet Bay: deep indigo night, warm moon
    sky: ['#060a1f', '#0f1940', '#22306a', '#5b5f9a'], stars: 1,
    far: '#2a3470', mid: '#1b2452', near: '#111833', mist: '#4c5a9a', rim: '#8fa3e8',
    sea: '#163a6e', seaLight: '#3a7fc0', deep: '#07122b', foam: '#eaf2ff', back: '#22487e',
    rock: '#0b1024', rockLit: '#6f84cc', moon: '#fff2cf', moonGlow: '#ffd98a', lantern: '#ff8a3d', fly: '#ffe9a0', cloud: '#2a3466', cloudLit: '#8a93c9',
    windows: '#ffc35c',
  },
  { // Lantern Reach: violet dusk, teal water
    sky: ['#0d0622', '#2a1150', '#5a2470', '#d0697d'], stars: 0.75,
    far: '#5a2a6e', mid: '#3a1a52', near: '#200f33', mist: '#a8577e', rim: '#ffb0a8',
    sea: '#1a4a64', seaLight: '#3fb3b0', deep: '#081628', back: '#2e5a7a', foam: '#fff0f0',
    rock: '#160a24', rockLit: '#c07ab8', moon: '#ffe6c4', moonGlow: '#ffb98a', lantern: '#ffb23d', fly: '#fff0b0', cloud: '#4a2560', cloudLit: '#e08aa0',
    windows: '#ffd27a',
  },
  { // Stormwater: green-black storm light
    sky: ['#03080a', '#0b191c', '#17302f', '#3b5a52'], stars: 0.2,
    far: '#1c3533', mid: '#122524', near: '#0a1617', mist: '#3d625a', rim: '#9cc9b8',
    sea: '#113434', seaLight: '#3f8f7e', deep: '#030c0d', back: '#1d4a46', foam: '#e6fff4',
    rock: '#040a0b', rockLit: '#6fa898', moon: '#eef6dc', moonGlow: '#c8e6b0', lantern: '#ff7a3a', fly: '#f6ffc0', cloud: '#132222', cloudLit: '#56807a',
    windows: '#ffb85c',
  },
];
export const FEVER = { foam: '#fff3c4', sea: '#7a5a1e', light: '#ffd25a' };
