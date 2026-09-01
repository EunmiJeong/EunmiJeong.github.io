/* ══════════════════════════════════════════════════════════════════
   전환 방향을 정한다. CSS 는 <html> 에 .nav-back 이 붙었는지만 본다.

   ★ 이 파일은 반드시 <head> 안에서, defer 없이 불러야 한다. ★
   문서 간 전환에서 어느 쪽으로 밀지는 "새로 들어오는 문서"가 정한다.
   그 판단 시점인 pagereveal 은 첫 프레임을 그리기 직전에 딱 한 번 지나가는데,
   </body> 앞에서 붙이면 이미 지나간 뒤라 리스너가 못 받는 일이 생긴다.
   그러면 .nav-back 이 안 붙어 뒤로 나올 때도 앞으로 가는 모션이 나온다 —
   될 때도 있고 안 될 때도 있는 것처럼 보이는 원인이 이것이다.

   방향을 브라우저가 알아서 알려 주지는 않는다. "링크를 눌러 들어가는 것"과
   "뒤로 나오는 것"은 둘 다 그냥 이동이라, 어느 쪽인지는 우리가 표시해야 한다.
   여기서는 두 가지로 판단한다.
     1. 링크에 적어 둔 data-dir="back"   — 화면 안의 뒤로 버튼
     2. navigationType === 'traverse'    — 안드로이드 물리 뒤로 버튼, 제스처
   ══════════════════════════════════════════════════════════════════ */
(function () {
  var KEY = 'nav-dir';
  var root = document.documentElement;

  function save(dir) { try { sessionStorage.setItem(KEY, dir); } catch (e) {} }
  function load() {
    try { return sessionStorage.getItem(KEY) || 'forward'; } catch (e) { return 'forward'; }
  }
  function mark(dir) { root.classList.toggle('nav-back', dir === 'back'); }
  function clear() { root.classList.remove('nav-back'); }

  function navType() {
    var a = window.navigation && window.navigation.activation;
    return a && a.navigationType;
  }

  /* ── 들어오는 쪽 ──────────────────────────────
     pagereveal 을 기다리지 않고 지금 당장 정한다. 이 스크립트는 <head> 에서
     도므로 첫 프레임보다 확실히 앞선다. 기다렸다가 놓치는 것보다 안전하다. */
  mark(navType() === 'traverse' ? 'back' : load());

  /* 전환이 끝나면 클래스를 떼어 낸다. pagereveal 을 받았으면 정확한 시점에,
     못 받았으면(구형 웹뷰 등) 전환 길이만큼 지난 뒤에 뗀다. */
  var cleaned = false;
  function cleanupWith(vt) {
    if (cleaned) return;
    cleaned = true;
    if (vt && vt.finished) vt.finished.then(clear, clear);
    else clear();
  }
  window.addEventListener('pagereveal', function (e) {
    /* 혹시 이 리스너가 제때 붙었다면 방향을 한 번 더 확정한다. */
    mark(navType() === 'traverse' ? 'back' : load());
    cleanupWith(e.viewTransition);
  });
  /* pagereveal 이 없는 웹뷰를 위한 뒷문. 전환 시간보다 넉넉히 잡는다. */
  setTimeout(function () { cleanupWith(null); }, 1200);

  /* ── 떠나는 쪽 ────────────────────────────────
     눌린 링크가 뒤로인지 앞으로인지 잡아 두었다가, 이동 직전에 넘긴다.
     넘기는 통로는 sessionStorage 다 — 다음 문서는 완전히 새 문서라
     자바스크립트 변수는 하나도 물려받지 못한다. */
  var clicked = 'forward';
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (a) clicked = a.dataset.dir === 'back' ? 'back' : 'forward';
  }, true);

  var handed = false;
  window.addEventListener('pageswap', function (e) {
    var type = e.activation && e.activation.navigationType;
    save(type === 'traverse' ? 'back' : clicked);
    handed = true;
  });

  /* pageswap 을 모르는 웹뷰에서도 방향은 남겨 둔다. 전환은 안 걸리더라도
     다음 문서가 엉뚱한 방향으로 밀지는 않게 된다.
     pageswap 이 이미 정했으면 건드리지 않는다 — pagehide 가 뒤에 오므로
     덮어쓰면 물리 뒤로가기의 'back' 을 'forward' 로 되돌려 버린다. */
  window.addEventListener('pagehide', function () { if (!handed) save(clicked); });
})();
