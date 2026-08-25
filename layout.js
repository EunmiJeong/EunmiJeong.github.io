import { supabase } from './supabase.js';

/* 모든 페이지가 공유하는 헤더(로고·메뉴·물결)와 로그인 모달을 한 곳에서 만든다.
   헤더를 고치려면 이 파일만 고치면 된다. 메뉴를 추가할 때는 NAV 배열에 한 줄 넣고
   새 페이지에서 mountLayout({ page: '<key>' , ... }) 로 부르면 된다. */

const NAV = [
  { key: 'projects', href: 'index.html',  icon: 'dashboard', label: '프로젝트 관리' },
  { key: 'resume',   href: 'resume.html', icon: 'badge',     label: '이력서' },
];

const WAVES = `
  <svg class="waves" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M0 96C180 40 300 30 480 62S780 126 960 112 1280 52 1440 34V150H0Z" fill="#fff" opacity=".2"/>
    <path d="M-50 34C250 92 390 112 570 96S870 32 1050 28 1350 76 1490 106V150H-50Z" fill="#fff" opacity=".32"/>
    <path d="M0 128C160 84 320 62 500 78S800 134 980 136 1300 102 1440 74V150H0Z" fill="#fff" opacity=".5"/>
    <path d="M0 114C200 148 380 150 560 138S880 96 1060 102 1340 134 1440 146V150H0Z" fill="#fff"/>
  </svg>`;

const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

function heroHTML({ page, kicker, title, subtext, action }) {
  const links = NAV.map(item => {
    const active = item.key === page;
    return `<a class="nav-link${active ? ' active' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''}><span class="icon" aria-hidden="true">${item.icon}</span>${esc(item.label)}</a>`;
  }).join('');

  return `<header class="hero">
    <div class="hero-inner">
      <div class="hero-bar">
        <p class="brand">project<span>.</span>desk</p>
        <nav class="nav" aria-label="주요 메뉴">${links}</nav>
        <div class="account">
          <p class="account-mail" id="account-mail"></p>
          <button id="sign-in" type="button" hidden><span class="icon" aria-hidden="true">login</span>로그인</button>
          <button id="sign-out" type="button" hidden><span class="icon" aria-hidden="true">logout</span>로그아웃</button>
        </div>
      </div>
      <div class="topbar">
        <div><p class="kicker">${esc(kicker)}</p><h1>${esc(title)}</h1><p class="subtext">${esc(subtext)}</p></div>
        ${action ? `<button class="add-button" id="open-modal" type="button" hidden><span class="icon" aria-hidden="true">add</span>${esc(action)}</button>` : ''}
      </div>
    </div>
    ${WAVES}
  </header>`;
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
 * 헤더와 로그인 모달을 페이지에 끼워 넣고 로그인 상태를 연결한다.
 * 페이지 스크립트 맨 위에서 부를 것 — 이후 코드가 #account-mail, #open-modal 등을 바로 쓸 수 있다.
 *
 * @param options.page     NAV 의 key. 이 항목이 현재 메뉴로 강조된다.
 * @param options.kicker   제목 위 작은 글씨
 * @param options.title    페이지 제목 (h1)
 * @param options.subtext  제목 아래 설명
 * @param options.action   우측 버튼 문구. 생략하면 버튼을 만들지 않는다. (id: open-modal)
 * @param options.authLead 로그인 모달 안내 문구
 * @param onAuth           로그인 상태가 바뀔 때마다 session 을 받아 호출된다.
 */
export function mountLayout(options, onAuth) {
  const $ = id => document.getElementById(id);

  document.body.insertAdjacentHTML('afterbegin', authHTML(options.authLead) + CONFIRM_HTML);
  $('app').insertAdjacentHTML('afterbegin', heroHTML(options));

  const authDialog = $('auth-dialog'), confirmDialog = $('confirm-dialog');
  $('confirm-ok').addEventListener('click', () => confirmDialog.close('ok'));
  $('confirm-cancel').addEventListener('click', () => confirmDialog.close('cancel'));
  $('confirm-close').addEventListener('click', () => confirmDialog.close('cancel'));

  supabase.auth.onAuthStateChange((event, session) => {
    $('account-mail').textContent = session ? session.user.email : '';
    $('sign-in').hidden = !!session;
    $('sign-out').hidden = !session;
    if (session) authDialog.close();
    onAuth(session);
  });

  $('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email: $('auth-email').value, password: $('auth-password').value });
    const box = $('auth-message');
    box.hidden = !error;
    if (error) box.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.';
  });

  $('sign-in').addEventListener('click', () => authDialog.showModal());
  $('close-auth').addEventListener('click', () => authDialog.close());
  $('sign-out').addEventListener('click', () => supabase.auth.signOut());
}
