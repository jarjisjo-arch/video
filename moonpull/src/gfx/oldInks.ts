export interface Ink { id: string; name: string; sky: string; sky2: string; hill: string; hill2: string; back: string; sea: string; deep: string; moon: string; paper: string; rock: string; sand: string; star: string; cloud: string; price: number; dark: boolean }
export const INKS: Ink[] = [
  { id: 'indigo', name: 'Indigo Night', sky: '#1b2440', sky2: '#222e52', hill: '#2c3a66', hill2: '#1c2646', back: '#3e6c8a', sea: '#234a6e', deep: '#1a3653', moon: '#f4d58d', paper: '#efe6d2', rock: '#0f1528', sand: '#8d7f6a', star: '#efe6d2', cloud: '#55648f', price: 0, dark: true },
  { id: 'plum', name: 'Plum Dusk', sky: '#3a2143', sky2: '#4a2a52', hill: '#5a3160', hill2: '#48264f', back: '#b0607a', sea: '#6b3560', deep: '#4d2449', moon: '#ffd9a0', paper: '#f6ead8', rock: '#1f1026', sand: '#b98a7a', star: '#f6ead8', cloud: '#8c5a86', price: 120, dark: true },
  { id: 'storm', name: 'Storm Green', sky: '#12302e', sky2: '#173b38', hill: '#1d4743', hill2: '#163a37', back: '#4f8f7c', sea: '#1f5a55', deep: '#154440', moon: '#e6edc4', paper: '#eef0dc', rock: '#081a19', sand: '#7c8a6c', star: '#eef0dc', cloud: '#3f6f69', price: 120, dark: true },
  { id: 'dawn', name: 'Paper Dawn', sky: '#e9d9c3', sky2: '#efd3b4', hill: '#d2b9a4', hill2: '#c3a691', back: '#8fb3b8', sea: '#3f7f95', deep: '#2f6479', moon: '#fffaf0', paper: '#fffaf0', rock: '#2a3550', sand: '#c9b08a', star: '#c9a98f', cloud: '#fff6e6', price: 200, dark: false },
  { id: 'ember', name: 'Ember Tide', sky: '#2b1512', sky2: '#3b1c16', hill: '#4a2219', hill2: '#3a1a14', back: '#c66a3a', sea: '#7a2e22', deep: '#571f18', moon: '#ffe2a8', paper: '#f7e7cf', rock: '#160907', sand: '#a0704c', star: '#f7e7cf', cloud: '#7d4534', price: 260, dark: true },
];
export const COAST_INK = ['indigo', 'plum', 'storm'];
export const LANTERNS = [
  { id: 'vermilion', name: 'Vermilion', c: '#e4572e', price: 0 },
  { id: 'amber', name: 'Amber', c: '#ffb03a', price: 60 },
  { id: 'jade', name: 'Jade', c: '#4fd1a5', price: 90 },
  { id: 'rose', name: 'Rose', c: '#ff7aa8', price: 90 },
  { id: 'pearl', name: 'Pearl', c: '#f4f1ff', price: 150 },
];
export function inkById(id: string) { return INKS.find(i => i.id === id) ?? INKS[0]; }
