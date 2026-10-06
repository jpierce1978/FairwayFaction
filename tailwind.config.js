/**
 * Colors resolve to CSS variables defined in src/global.css (light + dark).
 * The same values are mirrored in src/design/tokens/colors.ts for non-className
 * usage; tests/design-tokens.test.ts keeps the two in sync.
 */
const c = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: c('background'),
        surface: c('surface'),
        'surface-muted': c('surface-muted'),
        border: c('border'),
        content: c('content'),
        'content-muted': c('content-muted'),
        primary: c('primary'),
        'on-primary': c('on-primary'),
        accent: c('accent'),
        'on-accent': c('on-accent'),
        success: c('success'),
        warning: c('warning'),
        danger: c('danger'),
        'on-danger': c('on-danger'),
      },
      minHeight: { touch: '56px' },
      minWidth: { touch: '56px' },
    },
  },
  plugins: [],
};
