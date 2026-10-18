"""Lint authored CSS and static JSX glass/scroll ancestry. Runtime layouts need browser review."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLES = ROOT / "frontend/src/design-system/styles"


def blocks(source: str, parents: tuple[str, ...] = ()) -> list[tuple[str, str, tuple[str, ...]]]:
    """Balanced blocks, retaining selector/support ancestors."""
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    result = []
    start = 0
    while (opening := source.find("{", start)) >= 0:
        header = source[start:opening].strip().split(";")[-1].strip()
        depth, end, quote = 1, opening + 1, ""
        while end < len(source) and depth:
            char = source[end]
            if quote:
                if char == quote and source[end - 1] != "\\":
                    quote = ""
            elif char in "\"'":
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            end += 1
        if depth:
            raise ValueError("unbalanced stylesheet")
        body = source[opening + 1:end - 1]
        if "{" in body:
            result.extend(blocks(body, (*parents, header)))
        else:
            result.append((header, body, parents))
        start = end
    return result


def lint(source: str, token_file: bool = False, scroll_selectors: set[str] | None = None) -> list[str]:
    errors = []
    rules = blocks(source)
    scroll = {s for s, b, _ in rules if re.search(r"overflow(?:-[xy])?\s*:\s*(?:auto|scroll)", b)} | (scroll_selectors or set())
    for selector, body, parents in rules:
        declarations = re.sub(r"@apply\s+[^;]+;", "", body)
        literal = re.search(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklch|oklab|color)\((?!\s*var\()", declarations)
        named = re.search(r"(?:^|;)\s*(?:color|background(?:-color)?|border-color|fill|stroke|accent-color)\s*:\s*([a-z]+)\s*(?:;|$)", declarations)
        named_literal = named and named[1].lower() not in {
            "transparent", "currentcolor", "inherit", "initial", "unset", "revert", "none",
            "canvas", "canvastext", "buttonface", "buttontext", "highlight", "highlighttext",
        }
        if not token_file and (literal or named_literal):
            errors.append(f"literal colour outside tokens.css: {selector}")
        if re.search(r"(?:-webkit-)?backdrop-filter\s*:\s*(?!none\b)[^;]+", body):
            ancestry = " ".join((*parents, selector))
            if re.search(r"(?:overflow|scroll|skeleton|spinner|animate-)", ancestry, re.IGNORECASE) or any(
                part in ancestry for part in scroll
            ) or re.search(r"overflow(?:-[xy])?\s*:\s*(auto|scroll)", body):
                errors.append(f"blur in scrolling/animated container: {selector}")
    return errors


JSX_CHECK = r"""
const fs=require('fs'),path=require('path'),ts=require('./frontend/node_modules/typescript');
const failures=[];
function walkFiles(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
 const p=path.join(dir,e.name); if(e.isDirectory())walkFiles(p);
 else if(p.endsWith('.tsx')&&!p.includes('.test.')) {
 const source=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node,scroll=false) {
  let next=scroll;
  if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)) {
   const tag=ts.isJsxElement(node)?node.openingElement:node;
   const attrs=tag.attributes.properties.map(a=>a.getText(source)).join(' ');
   const scrolling=/overflow(?:-[xy])?-(?:auto|scroll)|overflow(?:[XY])?:\s*['"](?:auto|scroll)/.test(attrs)||scrollClasses.some(c=>attrs.includes(c));
   const blur=/\bglass(?:-l[123])?\b|backdrop-blur/.test(attrs);
   if(blur&&(scroll||scrolling)) failures.push(p+':'+(source.getLineAndCharacterOfPosition(node.pos).line+1));
   next=scroll||scrolling;
  }
  if(ts.isStringLiteralLike(node)&&/^(?:#[\da-f]{3,8}|(?:rgba?|hsla?|oklch|oklab)\(.+\))$/i.test(node.text)) failures.push(p+': literal colour outside tokens.css');
  ts.forEachChild(node,n=>visit(n,next));
 }
 visit(source);
 }} }
walkFiles('frontend/src');
console.log('JSX glass/scroll ancestry errors='+failures.length);
if(failures.length){console.log(failures.slice(0,5).join('\n'));process.exitCode=1;}
"""


def main() -> int:
    errors: list[str] = []
    paths = list((ROOT / "frontend/src").rglob("*.css"))
    scroll_selectors = {s for path in paths for s, b, _ in blocks(path.read_text(encoding="utf-8"))
                        if re.search(r"overflow(?:-[xy])?\s*:\s*(?:auto|scroll)", b)}
    for path in paths:
        errors.extend(f"{path.relative_to(ROOT)}: {e}" for e in lint(
            path.read_text(encoding="utf-8"), path == STYLES / "tokens.css", scroll_selectors))
    tokens = (STYLES / "tokens.css").read_text(encoding="utf-8")
    for required in ["@supports (backdrop-filter:", "@supports not (backdrop-filter:",
                     "prefers-reduced-transparency: reduce", "prefers-contrast: more",
                     "prefers-reduced-motion: reduce", "forced-colors: active", 'data-effects="off"']:
        if required not in tokens:
            errors.append(f"missing fallback: {required}")
    for preference in ["@supports not", "prefers-reduced-transparency", "prefers-contrast", "data-effects="]:
        fallback = [body for selector, body, parents in blocks(tokens)
                    if preference in " ".join((*parents, selector))]
        if not fallback or not all("backdrop-filter: none" in body and "var(--glass-solid)" in body for body in fallback):
            errors.append(f"missing solid/no-blur declaration: {preference}")
    assert lint(".scroll {overflow:auto;backdrop-filter:blur(12px);}", True)
    assert lint(".scroll {overflow:auto;} .scroll .glass {backdrop-filter:blur(12px);}", True)
    assert lint(".x {color:#abcdef;}")
    assert lint(".x {color:rebeccapurple;}")
    assert lint(".x {background:oklch(.7 .2 40);}")
    assert lint(".viewport .glass {backdrop-filter:blur(12px);}", True, {".viewport"})
    assert not lint(".x {color:var(--ink);}")
    node = shutil.which("node")
    if not node:
        errors.append("Node unavailable: JSX ancestry NOT RUN")
    else:
        scroll_classes = sorted({c for s in scroll_selectors for c in re.findall(r"\.([\w-]+)", s)})
        script = f"const scrollClasses={json.dumps(scroll_classes)};\n" + JSX_CHECK
        result = subprocess.run([node, "-e", script], cwd=ROOT, capture_output=True, text=True, check=False)
        print(result.stdout.strip())
        if result.returncode:
            errors.append(result.stderr.strip() or "JSX blur/scroll ancestry failed")
    print(f"CSS files={len(paths)} errors={len(errors)}; negative fixtures checked")
    for error in errors[:8]:
        print(error)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
