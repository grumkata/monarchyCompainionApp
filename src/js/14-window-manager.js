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

  /**
   * Make a window's content scale as a whole (like Foundry VTT app
   * windows) instead of just clipping/scrolling when the window is
   * resized smaller than the content's natural width.
   *
   * opts: { rootSelector, naturalWidth, minScale, maxScale }
   * `rootSelector` must match ONE element already inside that window's
   * `.window-content` — it gets wrapped in a sizing div at runtime (no
   * HTML changes needed elsewhere) and scaled via CSS transform, with
   * the wrapper's own width/height kept in sync so scrolling still
   * measures correctly (transform alone doesn't shrink layout size).
   */
  function enableScaling(id, opts) {
    const w = windows[id]; if (!w) return;
    const root = w.el.querySelector(opts.rootSelector);
    if (!root) { console.warn('WM.enableScaling: root not found', opts.rootSelector); return; }

    const naturalWidth = opts.naturalWidth;
    const minScale = opts.minScale || 0.35;
    const maxScale = opts.maxScale || 1.75;

    let outer = root.parentElement;
    if (!outer.classList.contains('window-scale-outer')) {
      outer = document.createElement('div');
      outer.className = 'window-scale-outer';
      root.parentElement.insertBefore(outer, root);
      outer.appendChild(root);
    }
    root.classList.add('window-scale-root');
    root.style.width = naturalWidth + 'px';

    function rescale() {
      const contentEl = w.el.querySelector('.window-content');
      if (!contentEl) return;
      const availWidth = contentEl.clientWidth;
      if (availWidth <= 0) return;
      const scale = Math.max(minScale, Math.min(maxScale, availWidth / naturalWidth));
      root.style.transform = 'scale(' + scale + ')';
      // scrollHeight reflects the pre-transform (natural) layout height —
      // transform is paint-only and doesn't affect layout/measurement.
      const naturalHeight = root.scrollHeight;
      outer.style.width = Math.round(naturalWidth * scale) + 'px';
      outer.style.height = Math.round(naturalHeight * scale) + 'px';
    }

    rescale();
    w.rescale = rescale;

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => rescale());
      ro.observe(w.el);
    } else {
      // Fallback for environments without ResizeObserver: recheck on the
      // interactions that can change window size.
      window.addEventListener('resize', rescale);
    }
  }

  /**
   * Force an immediate rescale for a window that already called
   * enableScaling(). Normally rescale() only reruns when the WINDOW
   * itself is resized (via its ResizeObserver) — that's not triggered
   * by the window's CONTENT changing height on its own (e.g. switching
   * tabs, or adding/removing cards), so callers that know content
   * height just changed should call this to stay in sync. No-op if
   * the window never called enableScaling.
   */
  function rescale(id) {
    const w = windows[id];
    if (w && w.rescale) w.rescale();
  }

  return { register, open, close, toggle, focus, enableScaling, rescale };
})();
