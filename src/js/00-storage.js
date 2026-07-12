const _memStore = {};
const _ls = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return _memStore[k]||null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){ _memStore[k]=v;
    if(e&&e.name==='QuotaExceededError') { try{showToast('⚠ Storage full , export to file');}catch(_){} } } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){ delete _memStore[k]; } }
};
