// reset.js — 清除存档并跳回首页
try { localStorage.removeItem('loopRoom_save'); } catch(e) {}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(r) { r.unregister(); });
  }).catch(function() {});
}
setTimeout(function() {
  location.href = 'index.html';
}, 1500);