const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

export function randomAlpha(length: number): string {
  return Array.from({ length }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
}
