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
    let css = fs.readFileSync(path.join(SRC_DIR, href), 'utf8').trimEnd();
    // Inlining moves this CSS's base URL from src/css/ to dist/ (linked
    // stylesheet vs. inline <style> resolve relative URLs differently).
    // Assets sit one level up from src/css/ but directly beside
    // dist/monarchy.html, so drop the leading "../" for asset URLs only.
    css = css.replace(/url\((['"]?)\.\.\/assets\//g, 'url($1assets/');
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

// Copy real asset files (images/audio) alongside the built HTML so
// "assets/..." paths resolve both for a direct dist/monarchy.html
// browser test and inside the packaged app.
const ASSETS_SRC = path.join(SRC_DIR, 'assets');
const ASSETS_OUT = path.join(OUT_DIR, 'assets');
if (fs.existsSync(ASSETS_SRC)) {
  fs.cpSync(ASSETS_SRC, ASSETS_OUT, { recursive: true });
}

console.log(`Built ${OUT_FILE} (${(html.length / 1024).toFixed(1)} KB)`);
