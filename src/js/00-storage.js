const _memStore = {};
const _ls = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return _memStore[k]||null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){ _memStore[k]=v;
    if(e&&e.name==='QuotaExceededError') { try{showToast('⚠ Storage full , export to file');}catch(_){} } } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){ delete _memStore[k]; } }
};

/* ══ SHARED HELPERS ══
   Generic string/DOM helpers used by nearly every file below (sheet,
   saves, combat, session-sync, gm-tools). Loaded first so anything
   after this can rely on them regardless of load order. */
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function val(id) { const el=document.getElementById(id); return el?el.value:''; }
function selVal(el) { return el?el.value:''; }
