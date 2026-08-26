/* 화면 하나(index.html) 안에서 뷰를 갈아 끼우는 방식이다. 문서를 새로 불러오지 않으니
   메뉴를 눌러도 사이드바·헤더가 깜박이지 않는다.

   메뉴 = 뷰 = 주소의 해시(#projects, #resume). 아래 NAV 한 줄이 그 셋을 모두 정의한다.
   본문에는 <div class="view" data-view="<key>"> 가 key 마다 하나씩 있어야 하고,
   현재 뷰만 남고 나머지는 hidden 처리된다. 메뉴를 추가하려면 NAV 에 한 줄, 본문에 .view 하나.

   이 파일은 supabase.js 를 맨 위에서 import 하지 않는다 — supabase 는 CDN 모듈이라
   받아오는 데 시간이 걸리고, 그걸 기다리면 헤더가 뒤늦게 툭 튀어나온다.
   헤더는 mountLayout() 이 바로 그리고, 로그인 연결만 onAuthChange() 가 나중에 붙인다. */

let clientPromise;
const client = () => (clientPromise ??= import('./supabase.js').then(module => module.supabase));

const NAV = [
  {
    key: 'projects', icon: 'dashboard', label: '프로젝트 관리',
    kicker: 'PROJECT', title: '프로젝트 관리',
    subtext: '진행 중인 프로젝트와 주요 정보를 한눈에 관리하세요.', action: '프로젝트 추가',
  },
  {
    key: 'resume', icon: 'badge', label: '이력서',
    kicker: 'RESUME', title: '이력서',
    subtext: '개인이력카드와 학력·경력사항입니다. 전체경력은 경력사항에서 자동으로 계산됩니다.', action: '경력 추가',
  },
];

const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

function sidebarHTML() {
  const links = NAV.map(item =>
    `<a class="nav-link" href="#${item.key}" data-nav="${item.key}"><span class="icon" aria-hidden="true">${item.icon}</span>${esc(item.label)}</a>`
  ).join('');

  return `<aside class="sidebar">
    <p class="brand">project<span>.</span>desk</p>
    <nav class="nav" aria-label="주요 메뉴">${links}</nav>
  </aside>`;
}

/* 본문 맨 위. 계정 바(이메일·로그인/로그아웃)와 페이지 제목이 함께 그라데이션 밴드 위에 놓인다.
   제목·버튼 문구는 뷰마다 다르므로 비워 두고 applyView() 가 채운다. */
const HEADER_HTML = `<div class="appbar">
    <p class="account-mail" id="account-mail"></p>
    <button id="sign-in" type="button" hidden><span class="icon" aria-hidden="true">login</span>로그인</button>
    <button id="sign-out" type="button" hidden><span class="icon" aria-hidden="true">logout</span>로그아웃</button>
  </div>
  <header class="topbar">
    <div><p class="kicker" id="page-kicker"></p><h1 id="page-title"></h1><p class="subtext" id="page-subtext"></p></div>
    <button class="add-button" id="open-modal" type="button" hidden><span class="icon" aria-hidden="true">add</span><span id="open-modal-label"></span></button>
  </header>`;

/* ── 뷰 전환 ─────────────────────────────── */
let currentKey = null;
const viewListeners = [];

function applyView(key) {
  const view = NAV.find(item => item.key === key) || NAV[0];
  if (currentKey === view.key) return;
  currentKey = view.key;

  document.getElementById('page-kicker').textContent = view.kicker;
  document.getElementById('page-title').textContent = view.title;
  document.getElementById('page-subtext').textContent = view.subtext;
  document.getElementById('open-modal-label').textContent = view.action;
  document.title = `${view.title} · project.desk`;

  document.querySelectorAll('.nav-link').forEach(link => {
    const on = link.dataset.nav === currentKey;
    link.classList.toggle('active', on);
    if (on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(section => { section.hidden = section.dataset.view !== currentKey });

  window.scrollTo({ top: 0 });
  viewListeners.forEach(fn => fn(currentKey));
}

/** 지금 보고 있는 뷰의 key. */
export const currentView = () => currentKey;

/** 뷰가 바뀔 때마다 key 를 받아 호출된다. 등록 직후 현재 뷰로 한 번 불린다. */
export function onViewChange(handler) {
  viewListeners.push(handler);
  if (currentKey) handler(currentKey);
}

const CONFIRM_HTML = `<dialog id="confirm-dialog">
  <div class="modal confirm-card">
    <div class="modal-head"><h2 id="confirm-title">삭제할까요?</h2><button class="close" id="confirm-close" type="button" aria-label="닫기"><span class="icon" aria-hidden="true">close</span></button></div>
    <p class="confirm-message" id="confirm-message"></p>
    <div class="form-actions">
      <button id="confirm-cancel" type="button">취소</button>
      <button class="save danger" id="confirm-ok" type="button">삭제</button>
    </div>
  </div>
</dialog>`;

/**
 * confirm() 대신 쓰는 모달. 확인을 누르면 true, 취소·닫기·ESC 는 false 로 끝난다.
 * 예: if (await confirmAsk({ message: '삭제할까요?' })) remove(id);
 */
export function confirmAsk({ title = '삭제할까요?', message = '', confirmLabel = '삭제' } = {}) {
  const dialog = document.getElementById('confirm-dialog');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok').textContent = confirmLabel;
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

function authHTML(authLead) {
  return `<dialog id="auth-dialog">
    <form class="auth-card" id="auth-form">
      <div class="modal-head"><h2 class="auth-title"><span class="icon" aria-hidden="true">account_circle</span>Login</h2><button class="close" id="close-auth" type="button" aria-label="닫기"><span class="icon" aria-hidden="true">close</span></button></div>
      <p class="auth-lead">${esc(authLead)}</p>
      <div><label for="auth-email">이메일</label><input id="auth-email" type="email" autocomplete="username" required></div>
      <div><label for="auth-password">비밀번호</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" required></div>
      <p class="auth-message" id="auth-message" hidden></p>
      <div class="auth-actions"><button class="save" type="submit">로그인</button></div>
    </form>
  </dialog>`;
}

/**
 * 사이드바(#app 맨 앞) · 계정 바와 페이지 제목(.main 맨 앞) · 로그인 모달을 끼워 넣는다.
 * 네트워크를 기다리지 않고 즉시 그린다. 페이지 본체 스크립트보다 앞선 <script type="module"> 에서 부를 것.
 * 페이지 HTML 에는 #app 과 그 안의 .main 이 이미 있어야 한다.
 *
 * 해시(#projects 등)에 맞춰 첫 뷰까지 여기서 정해진다.
 *
 * @param options.authLead 로그인 모달 안내 문구
 */
export function mountLayout(options) {
  const $ = id => document.getElementById(id);

  document.body.insertAdjacentHTML('afterbegin', authHTML(options.authLead) + CONFIRM_HTML);
  $('app').insertAdjacentHTML('afterbegin', sidebarHTML());
  document.querySelector('.main').insertAdjacentHTML('afterbegin', HEADER_HTML);

  applyView(location.hash.slice(1));
  window.addEventListener('hashchange', () => applyView(location.hash.slice(1)));

  const authDialog = $('auth-dialog'), confirmDialog = $('confirm-dialog');
  $('confirm-ok').addEventListener('click', () => confirmDialog.close('ok'));
  $('confirm-cancel').addEventListener('click', () => confirmDialog.close('cancel'));
  $('confirm-close').addEventListener('click', () => confirmDialog.close('cancel'));

  $('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const supabase = await client();
    const { error } = await supabase.auth.signInWithPassword({ email: $('auth-email').value, password: $('auth-password').value });
    const box = $('auth-message');
    box.hidden = !error;
    if (error) box.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.';
  });

  $('sign-in').addEventListener('click', () => authDialog.showModal());
  $('close-auth').addEventListener('click', () => authDialog.close());
  $('sign-out').addEventListener('click', async () => (await client()).auth.signOut());
}

const openedAt = performance.now();
let closing = false;

/**
 * 로딩 화면을 걷어낸다. 데이터를 처음 그린 직후에 부를 것. 여러 번 불러도 괜찮다.
 * 데이터가 끝내 오지 않는 경우(네트워크 장애 등)에도 화면이 갇히지 않도록
 * 아래에서 8초 뒤 한 번 더 자동으로 부른다.
 */
export function pageReady() {
  const loader = document.getElementById('page-loader');
  if (closing || !loader) return;
  closing = true;
  // 곧바로 닫으면 점이 돌다 만 것처럼 보인다. 최소 한 바퀴(1.8초)는 돌린 뒤 걷어낸다.
  setTimeout(() => loader.classList.add('gone'), Math.max(0, 1800 - (performance.now() - openedAt)));
}
setTimeout(pageReady, 8000);

/**
 * 로그인 상태가 바뀔 때마다 헤더의 계정 영역을 갱신하고 onAuth(session) 을 부른다.
 * supabase 가 준비된 뒤에 처음 호출되므로, 첫 호출은 페이지가 뜬 직후가 아니라 조금 뒤다.
 */
export function onAuthChange(onAuth) {
  const $ = id => document.getElementById(id);
  client().then(supabase => {
    supabase.auth.onAuthStateChange((event, session) => {
      $('account-mail').textContent = session ? session.user.email : '';
      $('sign-in').hidden = !!session;
      $('sign-out').hidden = !session;
      if (session) $('auth-dialog').close();
      onAuth(session);
    });
  });
}
