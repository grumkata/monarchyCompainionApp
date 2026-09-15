// updater.js
//
// Checks GitHub Releases (NOT commits/pushes) for a newer version of the
// app's web content, downloads it, and unpacks it. Regular pushes to your
// repo do nothing here — only publishing a new Release triggers an update.
//
// Setup:
//   1. npm install extract-zip
//   2. Adjust REPO below to your actual owner/repo.
//   3. Adjust the fallback path in getContentEntryPoint() to wherever your
//      current index.html / renderer files actually live in this project.
//   4. When you publish a GitHub Release, attach a file named exactly
//      "content.zip" containing the zipped contents of that same folder
//      (index.html should be at the TOP LEVEL of the zip, not nested).

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const extract = require('extract-zip');

const REPO = 'grumkata/monarchyCompainionApp'; // <-- change if needed
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

// Where downloaded/updated content gets stored between launches.
const contentDir = path.join(app.getPath('userData'), 'app-content');
const versionFile = path.join(contentDir, 'version.txt');

function getInstalledVersion() {
  try {
    return fs.readFileSync(versionFile, 'utf8').trim();
  } catch {
    return null; // no update downloaded yet — still on the bundled version
  }
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'monarchy-companion-app' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { 'User-Agent': 'monarchy-companion-app' } }, (res) => {
        // GitHub asset URLs redirect to the actual file — follow it.
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return downloadFile(res.headers.location, dest).then(resolve, reject);
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', reject);
  });
}

async function checkForContentUpdate() {
  try {
    const release = await httpJson(RELEASES_API);
    if (!release || !release.tag_name || !release.assets) return null;

    const latestVersion = release.tag_name; // e.g. "v1.1.0"
    const installedVersion = getInstalledVersion() || `v${app.getVersion()}`;

    if (latestVersion === installedVersion) return null; // already current

    const asset = release.assets.find((a) => a.name === 'content.zip');
    if (!asset) return null; // release published without the expected file

    const zipPath = path.join(app.getPath('temp'), 'content-update.zip');
    await downloadFile(asset.browser_download_url, zipPath);

    fs.mkdirSync(contentDir, { recursive: true });
    await extract(zipPath, { dir: contentDir });

    fs.writeFileSync(versionFile, latestVersion);
    fs.unlinkSync(zipPath);

    console.log(`Content updated to ${latestVersion}`);
    return latestVersion;
  } catch (err) {
    console.error('Update check failed (continuing with current content):', err);
    return null; // never let a failed check crash startup
  }
}

function getContentEntryPoint() {
  const updatedEntry = path.join(contentDir, 'index.html');
  if (fs.existsSync(updatedEntry)) return updatedEntry;

  // Fallback: whatever ships inside the installed app.
  // CHANGE THIS to match your actual project structure.
  return path.join(__dirname, 'index.html');
}

module.exports = { checkForContentUpdate, getContentEntryPoint };
