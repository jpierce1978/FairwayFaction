/**
 * Design color tokens as `rgb()` strings for places className cannot reach
 * (icons, navigation chrome, status bar). Source of truth for values is
 * src/global.css; tests/design-tokens.test.ts fails if the two drift.
 */
export type ColorToken =
  | 'background'
  | 'surface'
  | 'surfaceMuted'
  | 'border'
  | 'content'
  | 'contentMuted'
  | 'primary'
  | 'onPrimary'
  | 'accent'
  | 'onAccent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onDanger';

/** "R G B" channel triplets, identical to the CSS variables. */
export const colorChannels: Record<'light' | 'dark', Record<ColorToken, string>> = {
  light: {
    background: '246 247 242',
    surface: '255 255 255',
    surfaceMuted: '236 239 230',
    border: '190 198 182',
    content: '17 24 28',
    contentMuted: '69 80 90',
    primary: '22 101 52',
    onPrimary: '255 255 255',
    accent: '146 98 0',
    onAccent: '255 255 255',
    success: '21 128 61',
    warning: '161 98 7',
    danger: '185 28 28',
    onDanger: '255 255 255',
  },
  dark: {
    background: '12 18 15',
    surface: '22 31 26',
    surfaceMuted: '31 43 36',
    border: '63 82 71',
    content: '244 247 245',
    contentMuted: '178 192 184',
    primary: '74 201 125',
    onPrimary: '6 26 14',
    accent: '240 183 64',
    onAccent: '36 24 0',
    success: '74 222 128',
    warning: '250 204 21',
    danger: '248 113 113',
    onDanger: '40 4 4',
  },
};

export type ThemeColors = Record<ColorToken, string>;

function toRgb(channels: Record<ColorToken, string>): ThemeColors {
  return Object.fromEntries(
    Object.entries(channels).map(([k, v]) => [k, `rgb(${v.split(' ').join(', ')})`]),
  ) as ThemeColors;
}

export const colors: Record<'light' | 'dark', ThemeColors> = {
  light: toRgb(colorChannels.light),
  dark: toRgb(colorChannels.dark),
};
