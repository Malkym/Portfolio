/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: ['class', '[data-scheme="dark"]'],
  theme: {
    extend: {
      // Tout passe par des variables CSS pilotées par le thème actif :
      // changer de thème ne recompile rien, ça réécrit juste :root.
      colors: {
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        tertiary: 'var(--c-tertiary)',
        surface: 'var(--c-surface)',
        'surface-alt': 'var(--c-surface-alt)',
        bg: 'var(--c-bg)',
        ink: 'var(--c-text)',
        'ink-muted': 'var(--c-text-muted)',
        line: 'var(--c-border)',
      },
      fontFamily: {
        head: 'var(--f-heading)',
        body: 'var(--f-body)',
        mono: 'var(--f-mono)',
      },
      borderRadius: {
        theme: 'var(--r-md)',
        'theme-lg': 'var(--r-lg)',
        'theme-sm': 'var(--r-sm)',
      },
      boxShadow: {
        theme: 'var(--sh-md)',
        'theme-lg': 'var(--sh-lg)',
        glow: 'var(--sh-glow)',
      },
      transitionTimingFunction: {
        theme: 'var(--t-ease)',
      },
    },
  },
  plugins: [],
}
