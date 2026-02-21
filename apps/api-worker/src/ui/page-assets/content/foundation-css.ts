export const FOUNDATION_CSS = `
:root {
  color-scheme: light;
  --ct-font-sans: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
  --ct-font-display: 'Fraunces', Georgia, serif;

  --ct-color-ink-strong: #0a1f3a;
  --ct-color-ink: #0f2544;
  --ct-color-ink-soft: #355276;
  --ct-color-link: #0a4ea1;
  --ct-color-link-hover: #083874;
  --ct-color-primary-900: #00274c;
  --ct-color-primary-700: #0a4c8f;
  --ct-color-primary-500: #0f6fb0;
  --ct-color-success: #14633e;
  --ct-color-danger: #8b1f12;
  --ct-color-warning: #7f4a0c;

  --ct-surface-base: #ffffff;
  --ct-surface-soft: #f8fbff;
  --ct-surface-elevated: rgba(255, 255, 255, 0.94);
  --ct-border-soft: rgba(19, 56, 97, 0.16);
  --ct-border-strong: rgba(8, 45, 86, 0.22);

  --ct-space-1: 0.25rem;
  --ct-space-2: 0.5rem;
  --ct-space-3: 0.75rem;
  --ct-space-4: 1rem;
  --ct-space-5: 1.25rem;
  --ct-space-6: 1.5rem;

  --ct-radius-sm: 0.5rem;
  --ct-radius-md: 0.75rem;
  --ct-radius-lg: 1rem;
  --ct-radius-xl: 1.25rem;
  --ct-radius-pill: 999px;

  --ct-shadow-card: 0 14px 28px rgba(0, 25, 51, 0.18);
  --ct-shadow-soft: 0 10px 20px rgba(8, 45, 86, 0.12);
  --ct-focus-ring: 0 0 0 3px rgba(10, 76, 143, 0.24);

  --sl-font-sans: var(--ct-font-sans);
  --sl-font-serif: var(--ct-font-display);
  --sl-color-primary-700: var(--ct-color-primary-700);
  --sl-color-primary-600: var(--ct-color-primary-700);
  --sl-color-primary-500: var(--ct-color-primary-500);
  --sl-color-success-600: var(--ct-color-success);
  --sl-color-danger-600: var(--ct-color-danger);
  --sl-border-radius-small: var(--ct-radius-sm);
  --sl-border-radius-medium: var(--ct-radius-md);
  --sl-border-radius-large: var(--ct-radius-lg);
}

.ct-container {
  width: min(100%, 1080px);
  margin-inline: auto;
}

.ct-stack {
  display: grid;
  gap: var(--ct-stack-gap, var(--ct-space-4));
  min-width: 0;
}

.ct-cluster {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ct-cluster-gap, var(--ct-space-2));
  min-width: 0;
}

.ct-grid {
  display: grid;
  gap: var(--ct-grid-gap, var(--ct-space-4));
  min-width: 0;
}

.ct-grid > * {
  min-width: 0;
}

.ct-grid--sidebar {
  grid-template-columns: minmax(0, var(--ct-sidebar-width, 360px)) minmax(0, 1fr);
  align-items: start;
}

.ct-card {
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-lg);
  background: var(--ct-surface-elevated);
  box-shadow: var(--ct-shadow-soft);
}

.ct-muted {
  color: var(--ct-color-ink-soft);
}

.ct-checkbox-row {
  display: flex;
  align-items: center;
  gap: var(--ct-space-2);
}

.ct-checkbox-row input[type='checkbox'] {
  margin: 0;
  width: 1rem;
  height: 1rem;
  accent-color: var(--ct-color-primary-700);
}

@media (max-width: 980px) {
  .ct-grid--sidebar {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;
