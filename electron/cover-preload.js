// electron/cover-preload.js
//
// The preload for the cover page (dist/cover.html, electron/cover.js) and
// nothing else. The cover is told what to show by the shell and answers
// when it has shown it; that is the whole of its conversation, so that is
// the whole of what it is given. Every channel it can touch starts `cover:`.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('CoverBridge', {
  on(type, cb) { ipcRenderer.on('cover:' + type, (_event, data) => cb(data)); },
  send(type, data) { ipcRenderer.send('cover:' + type, data); }
});
