// Use the repository's SIL OFL font subsets in both protected preview and
// production bundles. Source HTML stays readable; the generated bundle carries
// the exact versioned local stylesheet and makes no Google Fonts request.
export function useLocalFonts(html) {
  if (!html.includes('fonts.googleapis.com/css2')) return html;
  const withoutRemote = html.replace(/<link\b[^>]*\bhref=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/gi, '');
  if (withoutRemote.includes('href="/assets/fonts/fr-fonts.css"')) return withoutRemote;
  if (!withoutRemote.includes('</head>')) throw new Error('Cannot inject local fonts without an HTML head');
  return withoutRemote.replace('</head>', '<link rel="stylesheet" href="/assets/fonts/fr-fonts.css"></head>');
}
