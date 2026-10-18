/** Serializable Playwright evaluator. Clip bounding boxes to the visible viewport. */
export function measureBlur() {
  const elements = [...document.querySelectorAll('*')].flatMap(el => {
    const css = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })) return [];
    if (el.closest('details:not([open])') && !el.closest('summary')) return [];
    const filter = css.backdropFilter || css.webkitBackdropFilter;
    if (!filter || filter === 'none' || css.visibility === 'hidden' || css.display === 'none') return [];
    const width = Math.max(0, Math.min(r.right, innerWidth) - Math.max(0, r.left));
    const height = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(0, r.top));
    if (!width || !height) return [];
    let parent = el.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`) || parent.hasAttribute('data-scroll')) {
        throw new Error(`Blur in scrolling ancestor: ${el.className}`);
      }
      parent = parent.parentElement;
    }
    if (/(auto|scroll)/.test(`${css.overflowX} ${css.overflowY}`)) throw new Error('Scrolling blur surface');
    return [{ className: String(el.className), transient: el.hasAttribute('data-transient'), width, height, area: width * height }];
  });
  return { blurredElements: elements.filter(el => !el.transient).length, blurredOverlayElements: elements.filter(el => el.transient).length, blurredViewportFraction: elements.reduce((sum, el) => sum + el.area, 0) / (innerWidth * innerHeight), blurBoxes: elements };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const { readFile } = await import('node:fs/promises');
  if (!process.argv[2]) throw new Error('Usage: node tools/blur_area.mjs manifest-dark.json [manifest-light.json]');
  for (const file of process.argv.slice(2)) {
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    const routes = [...manifest.routes, ...(manifest.preferences ?? []), ...(manifest.states ?? []), ...(manifest.fixtures ?? [])];
    for (const row of routes) {
      if (!row.blurBoxes || row.blurredElements > 2 || row.blurredViewportFraction > .35) throw new Error(`Blur budget: ${file}/${row.name}/${row.width}`);
    }
    console.log(`${file}: ${routes.length} pages; max ${(Math.max(...routes.map(r => r.blurredViewportFraction)) * 100).toFixed(2)}%; max layers ${Math.max(...routes.map(r => r.blurredElements))}`);
  }
}
