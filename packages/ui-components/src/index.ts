const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

export const renderPageShell = (
  title: string,
  bodyContent: string,
  headContent = '',
): string => {
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    ${headContent}
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/shoelace-autoloader.js"></script>
    <style>
      :root {
        color-scheme: light;
        --ct-font-sans: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
        --ct-font-display: 'Fraunces', Georgia, serif;
        --ct-font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
        --ct-brand-midnight-950: #071a31;
        --ct-brand-midnight-900: #0b2748;
        --ct-brand-midnight-800: #153a63;
        --ct-brand-lake-700: #0f5fa6;
        --ct-brand-lake-600: #1f74bb;
        --ct-brand-lake-500: #3a8fcb;
        --ct-brand-lake-400: #61a8d8;
        --ct-brand-sun-400: #f0c251;
        --ct-brand-mint-600: #1f8a5a;
        --ct-brand-amber-600: #a36412;
        --ct-brand-rose-600: #ad3d31;
        --ct-theme-text-title: #0d2543;
        --ct-theme-text-body: #173a5c;
        --ct-theme-text-muted: #4c6784;
        --ct-theme-text-subtle: #6c829b;
        --ct-theme-text-inverse: #f5fbff;
        --ct-theme-text-on-brand: #f7fcff;
        --ct-theme-link: var(--ct-brand-lake-700);
        --ct-theme-link-hover: #0b4e89;
        --ct-theme-surface-canvas: #edf3fb;
        --ct-theme-surface-shell: rgba(255, 255, 255, 0.84);
        --ct-theme-surface-soft: #f4f8fd;
        --ct-theme-surface-card: rgba(255, 255, 255, 0.95);
        --ct-theme-surface-card-strong: #ffffff;
        --ct-theme-surface-info: #eef6ff;
        --ct-theme-surface-success: #edf9f1;
        --ct-theme-surface-warning: #fff5e6;
        --ct-theme-surface-danger: #fff2f0;
        --ct-theme-surface-brand-chip: rgba(255, 255, 255, 0.14);
        --ct-theme-surface-brand-chip-strong: rgba(255, 255, 255, 0.22);
        --ct-theme-border-soft: rgba(23, 60, 102, 0.14);
        --ct-theme-border-default: rgba(13, 46, 84, 0.2);
        --ct-theme-border-strong: rgba(8, 39, 77, 0.3);
        --ct-theme-border-focus: rgba(15, 95, 166, 0.34);
        --ct-theme-border-info: rgba(15, 95, 166, 0.24);
        --ct-theme-border-success: rgba(31, 138, 90, 0.3);
        --ct-theme-border-warning: rgba(163, 100, 18, 0.28);
        --ct-theme-border-danger: rgba(173, 61, 49, 0.28);
        --ct-theme-gradient-hero: linear-gradient(
          132deg,
          var(--ct-brand-midnight-900) 0%,
          var(--ct-brand-lake-700) 68%,
          var(--ct-brand-lake-500) 100%
        );
        --ct-theme-gradient-action: linear-gradient(
          115deg,
          var(--ct-brand-midnight-900) 0%,
          var(--ct-brand-lake-700) 78%
        );
        --ct-theme-gradient-action-hover: linear-gradient(
          115deg,
          var(--ct-brand-midnight-800) 0%,
          var(--ct-brand-lake-600) 78%
        );
        --ct-theme-gradient-success: linear-gradient(
          120deg,
          #0f7f4f 0%,
          #005b4f 64%,
          #003d5c 100%
        );
        --ct-theme-gradient-danger: linear-gradient(
          120deg,
          #bd2f1b 0%,
          #8f1c13 64%,
          #5b1212 100%
        );
        --ct-theme-gradient-warning: linear-gradient(
          120deg,
          #a66a00 0%,
          #7f4b00 64%,
          #5b3300 100%
        );
        --ct-theme-gradient-neutral: linear-gradient(
          120deg,
          #4b5d75 0%,
          #36475d 64%,
          #233246 100%
        );
        --ct-theme-shadow-shell: 0 28px 48px rgba(13, 32, 58, 0.17);
        --ct-theme-shadow-card: 0 16px 32px rgba(7, 27, 51, 0.2);
        --ct-theme-shadow-soft: 0 10px 22px rgba(8, 45, 86, 0.12);
        --ct-theme-shadow-focus: 0 0 0 3px rgba(15, 95, 166, 0.24);
        --ct-theme-state-success: var(--ct-brand-mint-600);
        --ct-theme-state-danger: var(--ct-brand-rose-600);
        --ct-theme-state-warning: var(--ct-brand-amber-600);
        --ct-color-ink-strong: var(--ct-theme-text-title);
        --ct-color-ink: var(--ct-theme-text-body);
        --ct-color-ink-soft: var(--ct-theme-text-muted);
        --ct-color-link: var(--ct-theme-link);
        --ct-color-link-hover: var(--ct-theme-link-hover);
        --ct-color-primary-900: var(--ct-brand-midnight-900);
        --ct-color-primary-700: var(--ct-brand-lake-700);
        --ct-color-primary-500: var(--ct-brand-lake-500);
        --ct-color-success: var(--ct-theme-state-success);
        --ct-color-danger: var(--ct-theme-state-danger);
        --ct-color-warning: var(--ct-theme-state-warning);
        --ct-surface-base: var(--ct-theme-surface-card-strong);
        --ct-surface-soft: var(--ct-theme-surface-soft);
        --ct-surface-elevated: var(--ct-theme-surface-card);
        --ct-surface-shell: var(--ct-theme-surface-shell);
        --ct-border-soft: var(--ct-theme-border-soft);
        --ct-border-strong: var(--ct-theme-border-default);
        --ct-border-focus: var(--ct-theme-border-focus);
        --ct-shadow-card: var(--ct-theme-shadow-card);
        --ct-shadow-soft: var(--ct-theme-shadow-soft);
        --ct-shadow-shell: var(--ct-theme-shadow-shell);
        --ct-focus-ring: var(--ct-theme-shadow-focus);
        --ct-duration-fast: 120ms;
        --ct-duration-standard: 220ms;
        --ct-ease-standard: cubic-bezier(0.2, 0.7, 0.2, 1);
        --ct-max-content-width: 1080px;
        --ct-theme-gradient-canvas: linear-gradient(
          165deg,
          #eef5ff 0%,
          #f8fbff 44%,
          #ffffff 100%
        );
        --ct-theme-accent-glow-1: rgba(255, 203, 5, 0.32);
        --ct-theme-accent-glow-2: rgba(0, 39, 76, 0.2);
        --ct-theme-accent-glow-3: rgba(0, 94, 184, 0.15);
        font-family: var(--ct-font-sans);
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ct-theme-text-body);
        background:
          radial-gradient(circle at 8% 5%, var(--ct-theme-accent-glow-1), transparent 36%),
          radial-gradient(circle at 88% 12%, var(--ct-theme-accent-glow-2), transparent 34%),
          radial-gradient(circle at 52% 96%, var(--ct-theme-accent-glow-3), transparent 32%),
          var(--ct-theme-gradient-canvas);
      }

      h1,
      h2,
      h3,
      h4 {
        margin-top: 0;
        color: var(--ct-theme-text-title);
        font-family: var(--ct-font-display);
        letter-spacing: -0.02em;
        text-wrap: balance;
      }

      p {
        line-height: 1.6;
      }

      main {
        max-width: var(--ct-max-content-width);
        margin: clamp(0.85rem, 2.4vw, 2rem) auto;
        padding: clamp(1rem, 2.5vw, 2rem);
        border: 1px solid var(--ct-theme-border-default);
        border-radius: 1.3rem;
        background: var(--ct-theme-surface-shell);
        backdrop-filter: blur(7px);
        box-shadow: var(--ct-theme-shadow-shell);
        animation: ct-shell-enter 440ms ease-out both;
      }

      a {
        color: var(--ct-theme-link);
        text-underline-offset: 0.15em;
      }

      a:hover {
        color: var(--ct-theme-link-hover);
      }

      @keyframes ct-shell-enter {
        from {
          opacity: 0;
          transform: translateY(9px) scale(0.995);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 640px) {
        main {
          margin: 0.4rem;
          border-radius: 1rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        main {
          animation: none;
        }
      }
    </style>
  </head>
  <body>
    <main>${bodyContent}</main>
  </body>
</html>`;
};
