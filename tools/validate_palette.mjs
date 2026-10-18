/** WCAG marks + OKLab*100 separation; Machado et al. 2009, severity 1.
 * Author's model: https://doi.org/10.1109/TVCG.2009.113
 * Matrices operate on linear sRGB; simulated values are clipped to its gamut.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(root, 'frontend/src/design-system/styles/tokens.css'), 'utf8');
export const tokens = theme => Object.fromEntries([...css.matchAll(new RegExp(`--${theme}-([\\w-]+):\\s*([^;]+);`, 'g'))].map(m => [m[1], m[2].trim()]));
const matrices = {
  protan: [[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],
  deutan: [[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.011820,.042940,.968881]],
  tritan: [[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.303900]],
};
const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
export const rgb = hex => hex.slice(1).match(/../g).map(v => { const s = parseInt(v,16)/255; return s<=.04045 ? s/12.92 : ((s+.055)/1.055)**2.4; });
export const lab = c => {
  const l = Math.cbrt(dot([.4122214708,.5363325363,.0514459929],c));
  const m = Math.cbrt(dot([.2119034982,.6806995451,.1073969566],c));
  const s = Math.cbrt(dot([.0883024619,.2817188376,.6299787005],c));
  return [dot([.2104542553,.7936177850,-.0040720468],[l,m,s]),
    dot([1.9779984951,-2.4285922050,.4505937099],[l,m,s]),dot([.0259040371,.7827717662,-.8086757660],[l,m,s])];
};
const distance = (a,b) => Math.hypot(...lab(a).map((v,i) => v-lab(b)[i]))*100;
const simulate = (c,m) => m.map(row => Math.max(0,Math.min(1,dot(row,c))));
const hue = color => { const [,a,b]=lab(rgb(color)); return Math.atan2(b,a)*180/Math.PI; };
export const contrast = (a,b) => { const [hi,lo]=[dot([.2126,.7152,.0722],a),dot([.2126,.7152,.0722],b)].sort((x,y)=>y-x); return (hi+.05)/(lo+.05); };
export function pairMeasurements(colors) {
  const c=colors.map(rgb), out=[];
  for(let i=0;i<c.length;i++) for(let j=i+1;j<c.length;j++) out.push({ pair:[i,j],
    normal:distance(c[i],c[j]), ...Object.fromEntries(Object.entries(matrices).map(([name,m])=>
      [name,distance(simulate(c[i],m),simulate(c[j],m))])) });
  return out;
}
export function validate(colors, surface, pairs) {
  const c = colors.map(rgb);
  const results = { contrast: Math.min(...c.map(v=>contrast(v,rgb(surface)))), normal: Infinity, cvd: Infinity };
  for (let i=0;i<c.length;i++) for (let j=i+1;j<c.length;j++) {
    if (pairs==='adjacent' && j!==i+1) continue;
    results.normal=Math.min(results.normal,distance(c[i],c[j]));
    for (const m of Object.values(matrices)) results.cvd=Math.min(results.cvd,distance(simulate(c[i],m),simulate(c[j],m)));
  }
  return results;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let failures=0;
  for (const theme of ['dark','light']) {
    const t=tokens(theme);
    for (const [name, keys, pairs] of [
      ['strategies',['series-classic','series-graph','series-agentic'],'all'],
      ['latency',['series-classic','series-graph','series-agentic','stage-citation','stage-other'],'adjacent'],
    ]) {
      const result=validate(keys.map(k=>t[k]),t['plot-well'],pairs);
      const ok=result.contrast>=3 && result.normal>=15 && result.cvd>=8;
      failures+=!ok;
      console.log(`${theme} ${name} (${pairs}): contrast=${result.contrast.toFixed(2)} normal=${result.normal.toFixed(2)} CVD=${result.cvd.toFixed(2)} ${ok?'PASS':'FAIL'}`);
    }
    if (contrast(rgb(t['series-unknown']),rgb(t['plot-well']))<3) failures++;
    if(theme==='dark') for(const [key,original] of Object.entries({classic:'#3987e5',graph:'#d95926',agentic:'#199e70'})) {
      const delta=Math.abs((hue(t[`series-${key}`])-hue(original)+540)%360-180);
      if(delta>10) failures++;
    }
  }
  // Identity lookups are explicit, independent of iteration/rank; TS uses these tokens.
  const source=readFileSync(resolve(root,'frontend/src/design-system/chartPalette.ts'),'utf8');
  for (const key of ['classic','graph','agentic']) if (!source.includes(`${key}: "var(--series-${key})"`)) failures++;
  for(const [key,token] of Object.entries({retrieval:'series-classic',rerank:'series-graph',generation:'series-agentic',citation_validation:'stage-citation',other:'stage-other'})) {
    if(!source.includes(`${key}: "var(--${token})"`)) failures++;
  }
  // Negative fixtures catch palette collapse and low contrast without relaxing thresholds.
  const collapse=validate(['#3987e5','#3987e5'],'#16171b','all');
  if(collapse.cvd!==0||collapse.normal!==0||validate(['#ffffff'],'#ffffff','all').contrast!==1) throw new Error('Palette negative fixture failed');
  process.exitCode=failures ? 1 : 0;
}
