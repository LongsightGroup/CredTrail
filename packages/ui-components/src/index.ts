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
    ${headContent}
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/shoelace-autoloader.js"></script>
    <style>
      :root {
        color-scheme: light;
        font-family: 'Inter', system-ui, sans-serif;
      }

      body {
        margin: 0;
        background: linear-gradient(180deg, #f6f8fb 0%, #ffffff 50%);
      }

      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }
    </style>
  </head>
  <body>
    <main>${bodyContent}</main>
  </body>
</html>`;
};
