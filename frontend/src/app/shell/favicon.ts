/** Newsreader OFL-1.1 lowercase l, weight 500, outlined from the installed font.
 * The path avoids font fallback inside SVG favicons. Colours come from live tokens.
 */
export function updateFavicon() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue("--ink").trim();
  const paper = css.getPropertyValue("--surface-paper").trim();
  const path = "M378.4 96.6 525 48.6V0H35.6V48.6L181.4 96.6V1206.8Q167.8 1222.2 144.3 1238.2Q120.8 1254.2 89 1271Q57.2 1287.8 18.2 1303.6V1341.6L362.8 1432H392.6L378.4 1247Z";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${paper}"/><path transform="translate(24 53) scale(.028 -.028)" fill="${ink}" d="${path}"/></svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
