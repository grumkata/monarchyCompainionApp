// build.js
// Stitches src/index.html + src/css/*.css + src/js/*.js back into ONE
// self-contained HTML file at dist/monarchy.html — the file you actually
// hand to players. No dependencies, just Node.js.
//
// Usage:  node build.js

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const OUT_DIR = path.join(__dirname, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'monarchy.html');

let html = fs.readFileSync(path.join(SRC_DIR, 'index.html'), 'utf8');

// Inline every <link rel="stylesheet" href="css/....css"> as a <style> block,
// in the exact order the tags appear (order matters for CSS cascade!).
html = html.replace(
  /<link rel="stylesheet" href="(css\/[^"]+)">/g,
  (match, href) => {
    const css = fs.readFileSync(path.join(SRC_DIR, href), 'utf8').trimEnd();
    return `<style>\n${css}\n</style>`;
  }
);

// Inline every <script src="js/....js"></script> as an inline <script> block,
// in the exact order the tags appear (order matters — later files use globals
// declared by earlier ones).
html = html.replace(
  /<script src="(js\/[^"]+)"><\/script>/g,
  (match, src) => {
    const js = fs.readFileSync(path.join(SRC_DIR, src), 'utf8').trimEnd();
    return `<script>\n${js}\n</script>`;
  }
);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, html, 'utf8');

console.log(`Built ${OUT_FILE} (${(html.length / 1024).toFixed(1)} KB)`);
