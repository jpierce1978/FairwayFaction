import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colorChannels, colors, type ColorToken } from '@/design/tokens';

const css = readFileSync(join(__dirname, '../src/global.css'), 'utf8');
const kebab = (t: string) => t.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Extract `--color-x: R G B;` declarations from the first (light) and second (dark) :root blocks. */
function parseVars(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--color-([a-z-]+):\s*([\d ]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
  );
}
const [lightBlock, darkBlock] = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]!);

describe('design tokens', () => {
  const tokens = Object.keys(colorChannels.light) as ColorToken[];

  it('global.css light values match src/design/tokens/colors.ts', () => {
    const vars = parseVars(lightBlock!);
    for (const t of tokens) expect(vars[kebab(t)]).toBe(colorChannels.light[t]);
    expect(Object.keys(vars).sort()).toEqual(tokens.map(kebab).sort());
  });
  it('global.css dark values match src/design/tokens/colors.ts', () => {
    const vars = parseVars(darkBlock!);
    for (const t of tokens) expect(vars[kebab(t)]).toBe(colorChannels.dark[t]);
  });
  it('tailwind.config.js exposes every token', () => {
    const tw = require('../tailwind.config.js').theme.extend.colors as Record<string, string>;
    for (const t of tokens)
      expect(tw[kebab(t)]).toBe(`rgb(var(--color-${kebab(t)}) / <alpha-value>)`);
  });
  it('light and dark define the same tokens and expose rgb() strings', () => {
    expect(Object.keys(colors.dark)).toEqual(Object.keys(colors.light));
    expect(colors.light.primary).toBe('rgb(22, 101, 52)');
  });

  // UX_SPEC §39: high contrast / sunlight readable.
  const luminance = (rgb: string) => {
    const [r, g, b] = rgb.split(' ').map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };
  it.each(['light', 'dark'] as const)('%s theme text pairs meet WCAG AA (4.5:1)', (scheme) => {
    const c = colorChannels[scheme];
    const pairs: [ColorToken, ColorToken][] = [
      ['content', 'background'],
      ['content', 'surface'],
      ['contentMuted', 'background'],
      ['contentMuted', 'surface'],
      ['contentMuted', 'surfaceMuted'],
      ['primary', 'background'],
      ['primary', 'surface'],
      ['onPrimary', 'primary'],
      ['onAccent', 'accent'],
      ['onDanger', 'danger'],
      ['danger', 'background'],
      ['danger', 'surface'],
    ];
    for (const [fg, bg] of pairs)
      expect({ fg, bg, ratio: contrast(c[fg], c[bg]) >= 4.5 }).toEqual({ fg, bg, ratio: true });
  });
});
