'use strict';
/* ══════════════════════════════════════════════════════════════
   WINDOW MANAGER
   Generic system for windows living on the table scene: drag by
   titlebar, resize by corner handle, click-to-front z-ordering,
   open/close with a dock/taskbar to reopen, and position/size
   persisted per window id so layouts survive a reload.

   This file knows nothing about character sheets, combat, or any
   specific window's content — it only operates on markup already
   present in the DOM shaped like:

     <div class="table-window" data-window-id="ID">
       <div class="window-titlebar">...<button class="window-close">
       <div class="window-content">...actual content...</div>
       <div class="window-resize-handle"></div>
     </div>

   To add a new window type later (combat, rulebook, etc.), give it
   that markup shape and call WM.register(id, opts) once — no
   changes needed here.
══════════════════════════════════════════════════════════════ */

const WM = (function () {
  const windows = {};   // id -> state
  let zTop = 100;

  function storageKey(id) { return 'monarchy_window_' + id; }

  function saveRect(id) {
    const w = windows[id]; if (!w) return;
    try {
      _ls.set(storageKey(id), JSON.stringify({ x: w.x, y: w.y, w: w.width, h: w.height, open: w.isOpen }));
    } catch (e) {}
  }

  function loadRect(id) {
    try {
      const raw = _ls.get(storageKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clampToViewport(w) {
    const maxX = Math.max(0, window.innerWidth - 120);
    const maxY = Math.max(0, window.innerHeight - 60);
    w.x = Math.min(Math.max(0, w.x), maxX);
    w.y = Math.min(Math.max(0, w.y), maxY);
  }

  function applyRect(id) {
    const w = windows[id];
    w.el.style.left = w.x + 'px';
    w.el.style.top = w.y + 'px';
    w.el.style.width = w.width + 'px';
    w.el.style.height = w.height + 'px';
  }

  function focus(id) {
    const w = windows[id]; if (!w) return;
    zTop += 1;
    w.el.style.zIndex = zTop;
    Object.keys(windows).forEach(k => windows[k].el.classList.toggle('focused', k === id));
  }

  function setOpen(id, isOpen, skipSave) {
    const w = windows[id]; if (!w) return;
    w.isOpen = isOpen;
    w.el.style.display = isOpen ? 'flex' : 'none';
    const dockBtn = document.getElementById('dock-btn-' + id);
    if (dockBtn) dockBtn.classList.toggle('active', isOpen);
    if (isOpen) focus(id);
    if (!skipSave) saveRect(id);
  }

  function open(id) { setOpen(id, true); }
  function close(id) { setOpen(id, false); }
  function toggle(id) { const w = windows[id]; if (!w) return; setOpen(id, !w.isOpen); }

  function addDockButton(id) {
    const dock = document.getElementById('table-dock');
    if (!dock) return;
    const w = windows[id];
    const btn = document.createElement('button');
    btn.className = 'dock-btn';
    btn.id = 'dock-btn-' + id;
    btn.type = 'button';
    btn.innerHTML = '<span class="dock-icon">' + w.icon + '</span><span class="dock-label">' + w.title + '</span>';
    btn.addEventListener('click', () => toggle(id));
    dock.appendChild(btn);
  }

  function makeDraggable(id) {
    const w = windows[id];
    let dragging = false, startX, startY, origX, origY;

    w.titlebar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.window-close')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      origX = w.x; origY = w.y;
      try { w.titlebar.setPointerCapture(e.pointerId); } catch (err) {}
      focus(id);
    });
    w.titlebar.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      w.x = Math.max(0, origX + (e.clientX - startX));
      w.y = Math.max(0, origY + (e.clientY - startY));
      applyRect(id);
    });
    function endDrag() { if (dragging) { dragging = false; saveRect(id); } }
    w.titlebar.addEventListener('pointerup', endDrag);
    w.titlebar.addEventListener('pointercancel', endDrag);
  }

  function makeResizable(id, handle) {
    const w = windows[id];
    let resizing = false, startX, startY, origW, origH;

    handle.addEventListener('pointerdown', (e) => {
      resizing = true;
      startX = e.clientX; startY = e.clientY;
      origW = w.width; origH = w.height;
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
      focus(id);
      e.stopPropagation();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      w.width = Math.max(w.minW, origW + (e.clientX - startX));
      w.height = Math.max(w.minH, origH + (e.clientY - startY));
      applyRect(id);
    });
    function endResize() { if (resizing) { resizing = false; saveRect(id); } }
    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
  }

  /**
   * Register a window that already exists in the DOM.
   * opts: { title, icon, defaultRect:{x,y,w,h}, minW, minH, startOpen }
   */
  function register(id, opts) {
    opts = opts || {};
    const el = document.querySelector('.table-window[data-window-id="' + id + '"]');
    if (!el) { console.warn('WM.register: no element for id', id); return; }

    const titlebar = el.querySelector('.window-titlebar');
    const closeBtn = el.querySelector('.window-close');
    const resizeHandle = el.querySelector('.window-resize-handle');

    const saved = loadRect(id);
    const base = opts.defaultRect || { x: 60, y: 50, w: 640, h: 700 };
    const rect = saved || base;

    windows[id] = {
      el, titlebar,
      x: rect.x, y: rect.y, width: rect.w, height: rect.h,
      minW: opts.minW || 320, minH: opts.minH || 260,
      isOpen: saved ? !!saved.open : (opts.startOpen !== false),
      title: opts.title || id,
      icon: opts.icon || '\u25AB'
    };

    clampToViewport(windows[id]);
    applyRect(id);

    if (closeBtn) closeBtn.addEventListener('click', () => close(id));
    if (titlebar) makeDraggable(id);
    if (resizeHandle) makeResizable(id, resizeHandle);
    el.addEventListener('pointerdown', () => focus(id));

    addDockButton(id);
    setOpen(id, windows[id].isOpen, true);
  }

  window.addEventListener('resize', () => {
    Object.keys(windows).forEach(id => { clampToViewport(windows[id]); applyRect(id); });
  });

  return { register, open, close, toggle, focus };
})();
