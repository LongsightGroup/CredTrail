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
        --ct-ink: #0f2544;
        --ct-ink-soft: #355276;
        --ct-surface: rgba(255, 255, 255, 0.84);
        --ct-border: rgba(19, 56, 97, 0.16);
        --ct-shadow: 0 28px 48px rgba(13, 32, 58, 0.17);
        --ct-link: #0a4ea1;
        font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ct-ink);
        background:
          radial-gradient(circle at 8% 5%, rgba(255, 203, 5, 0.32), transparent 36%),
          radial-gradient(circle at 88% 12%, rgba(0, 39, 76, 0.2), transparent 34%),
          radial-gradient(circle at 52% 96%, rgba(0, 94, 184, 0.15), transparent 32%),
          linear-gradient(165deg, #eef5ff 0%, #f8fbff 44%, #ffffff 100%);
      }

      h1,
      h2,
      h3,
      h4 {
        margin-top: 0;
        color: #0a1f3a;
        font-family: 'Fraunces', Georgia, serif;
        letter-spacing: -0.02em;
        text-wrap: balance;
      }

      p {
        line-height: 1.6;
      }

      main {
        max-width: 1080px;
        margin: clamp(0.85rem, 2.4vw, 2rem) auto;
        padding: clamp(1rem, 2.5vw, 2rem);
        border: 1px solid var(--ct-border);
        border-radius: 1.3rem;
        background: var(--ct-surface);
        backdrop-filter: blur(7px);
        box-shadow: var(--ct-shadow);
        animation: ct-shell-enter 440ms ease-out both;
      }

      a {
        color: var(--ct-link);
        text-underline-offset: 0.15em;
      }

      a:hover {
        color: #083874;
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
