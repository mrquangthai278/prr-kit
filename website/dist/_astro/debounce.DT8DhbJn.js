const u=(c,o=100)=>{let e;const t=()=>{e!==null&&(clearTimeout(e),e=null)},n=(...l)=>{t(),e=setTimeout(()=>{c(...l)},o)};return n.cancel=()=>{t()},n};export{u as d};
