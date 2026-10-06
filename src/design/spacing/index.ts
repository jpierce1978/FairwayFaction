/** 4pt grid. Mirrors Tailwind's default spacing scale (1 unit = 4px). */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** UX_SPEC §39: large tap targets. 56pt is comfortably above the 44pt platform minimum. */
export const touchTarget = { min: 56, scoreButton: 64 } as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;
