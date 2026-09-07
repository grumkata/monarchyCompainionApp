/* ══════════════════════════════════════════════════════════════
   scope-css.js — confines a stylesheet to one half of the app.

   The hall and the table were built as separate documents and each
   helped itself to the same short class names: .plate, .shield,
   .face, .art, .cap, .row, .on, .done, .empty, .warn — 27 of them.
   Merged into one file they would silently restyle each other, and
   .plate in particular has already broken this project once.

   So each sheet is confined to a body class. Every rule becomes
   `body.at-hall <sel>` or `body.at-table <sel>`, and only one of
   those classes is ever on the body.

   Four cases that a naive prefix gets wrong, all handled here:
     · `body.dark .x`  must MERGE      -> `body.at-table.dark .x`
       (prefixing gives `body.at-table body.dark .x`, which can
        never match, and that is how "the dark theme stopped
        working" bugs are born)
     · `:root`         becomes the scope itself — custom properties
       inherit, so defining them on body reaches everything inside
     · `html`          left alone; page-level rules belong to both
     · @keyframes      never touched; its selectors are percentages
     · @media          recursed into, not prefixed

   Comments and strings are skipped when splitting, so a `{` inside
   a content:"" or a data: URI cannot fool the brace matcher.
══════════════════════════════════════════════════════════════ */
'use strict';

/* `sel` may be one scope or several. The character record is needed in BOTH
   places — the hall keeps the roster, the table opens the same record as a
   paper — so its stylesheet is scoped to the hall AND to the table's leaf,
   and every rule is emitted once per scope. */
function scope(css, sel) {
  const sels = Array.isArray(sel) ? sel : [sel];
  return blocks(css).map(b => {
    if (b.type === 'text') return b.raw;
    const at = b.prelude.trim().toLowerCase();
    if (at.startsWith('@keyframes') || at.startsWith('@-webkit-keyframes') ||
        at.startsWith('@font-face') || at.startsWith('@counter-style') ||
        at.startsWith('@property')) return b.raw;
    if (at.startsWith('@media') || at.startsWith('@supports') ||
        at.startsWith('@layer') || at.startsWith('@container')) {
      return b.prelude + '{' + scope(b.body, sels) + '}';
    }
    if (at.startsWith('@')) return b.raw;
    return rewrite(b.prelude, sels) + '{' + b.body + '}';
  }).join('');
}

function rewrite(prelude, sels) {
  /* A comment sitting between two rules lands at the FRONT of the next rule's
     prelude. Splitting that on commas and prefixing the pieces produced
     selectors like `body.at-table /* ══ CHAT ...` — which match nothing, so
     the rule silently vanished. (It cost the chat dock its background before
     it was caught.) Lift the comments out, rewrite only the selector, and put
     them back in front. */
  const notes = [];
  const bare = prelude.replace(/\/\*[\s\S]*?\*\//g, m => { notes.push(m); return ''; });
  const out = [];
  bare.split(',').forEach(one => {
    const s = one.trim();
    if (!s) return;
    if (/^html\b/i.test(s)) { out.push(s); return; }      /* page-level: shared */
    sels.forEach(sel => {
      if (/^:root\b/i.test(s)) out.push(s.replace(/^:root/i, sel));
      else if (/^body\b/i.test(s)) out.push(s.replace(/^body/i, sel));  /* merge */
      else out.push(sel + ' ' + s);
    });
  });
  return notes.join('') + out.join(', ');
}

/* split into top-level blocks, ignoring braces inside comments and strings */
function blocks(css) {
  const out = [];
  let i = 0, start = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { i = css.indexOf('*/', i + 2); i = i < 0 ? css.length : i + 2; continue; }
    if (c === '"' || c === "'") { i = skipString(css, i); continue; }
    if (c === '{') {
      const prelude = css.slice(start, i);
      const end = matchBrace(css, i);
      out.push({ type: 'rule', prelude, body: css.slice(i + 1, end), raw: css.slice(start, end + 1) });
      i = end + 1; start = i; continue;
    }
    i++;
  }
  if (start < css.length) out.push({ type: 'text', raw: css.slice(start) });
  return out;
}
function skipString(css, i) {
  const q = css[i]; i++;
  while (i < css.length) {
    if (css[i] === '\\') { i += 2; continue; }
    if (css[i] === q) return i + 1;
    i++;
  }
  return i;
}
function matchBrace(css, i) {
  let d = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { i = css.indexOf('*/', i + 2); i = i < 0 ? css.length : i + 2; continue; }
    if (c === '"' || c === "'") { i = skipString(css, i); continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return i; }
    i++;
  }
  return css.length - 1;
}

module.exports = { scope };
