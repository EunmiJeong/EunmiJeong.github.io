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
    subtext: '진행 중인 프로젝트와 주요 정보를 한눈에 관리하세요.',
  },
  // TODO 임시. 이력서 메뉴를 잠시 내려 둔다. 이 항목만 되살리면 그대로 돌아온다
  // (본문의 <div class="view" data-view="resume"> 와 관련 코드는 그대로 남아 있다).
  // {
  //   key: 'resume', icon: 'badge', label: '이력서',
  //   kicker: 'RESUME', title: '이력서',
  //   subtext: '개인이력카드와 학력·경력사항입니다. 전체경력은 경력사항에서 자동으로 계산됩니다.',
  // },
];

const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

/**
 * 아이콘 한 개를 그린다. 모양은 각 페이지 맨 위의 아이콘 모음(.icon-sprite)에서 가져온다.
 * 이름은 Material Symbols 의 이름 그대로다(edit · delete · close …).
 * 쓰려는 이름의 symbol 이 모음에 없으면 아무것도 안 그려지니, 새 아이콘은 모음에 먼저 더할 것.
 */
export const icon = (name, className = 'icon') => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function sidebarHTML() {
  const links = NAV.map(item =>
    `<a class="nav-link" href="#${item.key}" data-nav="${item.key}">${icon(item.icon)}${esc(item.label)}</a>`
  ).join('');

  /* .nav-close 는 좁은 화면(서랍 모드)에서만 보인다 — 넓은 화면에서는 CSS 가 감춘다. */
  return `<aside class="sidebar" id="sidebar">
    <p class="brand">project<span>.</span>desk</p>
    <button class="nav-close" id="nav-close" type="button" aria-label="메뉴 닫기"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
    <nav class="nav" aria-label="주요 메뉴">${links}</nav>
  </aside>`;
}

/* 본문 맨 위. 계정 바(이메일·로그인/로그아웃)와 페이지 제목이 함께 그라데이션 밴드 위에 놓인다.
   제목 문구는 뷰마다 다르므로 비워 두고 applyView() 가 채운다.
   추가 버튼은 여기가 아니라 각 섹션 머리(.content-head)에 붙는다 — index.html 참고. */
const HEADER_HTML = `<div class="appbar">
    <button class="nav-toggle" id="nav-toggle" type="button" aria-label="메뉴 열기" aria-controls="sidebar" aria-expanded="false"><svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg></button>
    <p class="account-mail" id="account-mail"></p>
    <button id="sign-in" type="button" hidden><svg class="icon" aria-hidden="true"><use href="#i-login"/></svg>로그인</button>
    <button id="sign-out" type="button" hidden><svg class="icon" aria-hidden="true"><use href="#i-logout"/></svg>로그아웃</button>
  </div>
  <header class="topbar">
    <div><p class="kicker" id="page-kicker"></p><h1 id="page-title"></h1><p class="subtext" id="page-subtext"></p></div>
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

/* 물음 하나와 버튼 둘뿐인 창이라 폼 모달(.modal)의 틀을 쓰지 않는다. 닫기 X 도 없다 —
   취소가 이미 같은 일을 하므로, 보이는 선택지는 둘로 줄이고 ESC 만 남긴다. */
const CONFIRM_HTML = `<dialog id="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message">
  <div class="confirm-card danger" id="confirm-card">
    <div class="confirm-badge"><svg class="icon" id="confirm-icon" aria-hidden="true"><use href="#i-delete"/></svg></div>
    <h2 id="confirm-title">삭제할까요?</h2>
    <p class="confirm-message" id="confirm-message"></p>
    <div class="confirm-actions" id="confirm-actions">
      <button id="confirm-cancel" type="button">취소</button>
      <button class="go" id="confirm-ok" type="button">삭제</button>
    </div>
  </div>
</dialog>`;

/* 톤 네 가지. 각 톤이 후광 색 · 배지 글리프 · 확인 버튼 색을 한꺼번에 정한다(색은
   style.css 의 .confirm-card.<톤>). 여기서는 톤마다의 기본 글리프만 갖는다.
   brand 는 되돌릴 수 있는 일(저장·확인), danger 는 되돌릴 수 없는 일(삭제),
   warn 은 잃을 것이 있는 일(작성 중 닫기), ok 는 이미 끝난 일을 알리는 창이다.
   brand 만 클래스가 없다 — .confirm-card 자체가 그 색이고, .brand 는 사이드바 로고가
   이미 쓰는 이름이라 붙이면 겹친다. */
const CONFIRM_ICONS = { brand: 'help', danger: 'delete', warn: 'priority_high', ok: 'check' };

/**
 * confirm() 대신 쓰는 모달. 확인을 누르면 true, 취소·ESC 는 false 로 끝난다.
 * 예: if (await confirmAsk({ message: '삭제할까요?' })) remove(id);
 *
 * tone 은 창 전체의 색을 정한다 — 'brand' | 'danger' | 'warn' | 'ok'.
 * 안 주면 danger 여부로 brand · danger 둘 중 하나를 고른다(예전 호출부 호환).
 * 빨강은 되돌릴 수 없는 일에만 쓴다 — 모든 확인이 빨개지면 경고로 안 읽힌다.
 *
 * cancelLabel 을 빈 값으로 주면 취소가 사라지고 확인 버튼 하나가 통으로 늘어난다.
 * 물을 것이 없고 알리기만 하는 창(ok)에 쓴다.
 *
 * icon 은 Material Symbols 이름이다. 안 주면 톤에 딸린 아이콘을 쓴다.
 */
export function confirmAsk({ title = '삭제할까요?', message = '', confirmLabel = '삭제', cancelLabel = '취소', danger = true, tone, icon } = {}) {
  const dialog = document.getElementById('confirm-dialog');
  const okButton = document.getElementById('confirm-ok');
  const cancelButton = document.getElementById('confirm-cancel');
  const key = tone || (danger ? 'danger' : 'brand');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  // 아이콘은 글자가 아니라 그림이라, 글자를 갈아 끼우는 대신 가져올 모양을 바꾼다.
  document.getElementById('confirm-icon').firstElementChild
    .setAttribute('href', `#i-${icon || CONFIRM_ICONS[key] || CONFIRM_ICONS.brand}`);
  document.getElementById('confirm-card').className = key === 'brand' ? 'confirm-card' : `confirm-card ${key}`;
  okButton.textContent = confirmLabel;
  cancelButton.textContent = cancelLabel;
  cancelButton.hidden = !cancelLabel;
  document.getElementById('confirm-actions').classList.toggle('one', !cancelLabel);
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

function authHTML(authLead) {
  return `<dialog id="auth-dialog">
    <form class="auth-card" id="auth-form">
      <div class="modal-head"><h2 class="auth-title"><svg class="icon" aria-hidden="true"><use href="#i-account_circle"/></svg>Login</h2><button class="close" id="close-auth" type="button" aria-label="닫기"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button></div>
      <p class="auth-lead">${esc(authLead)}</p>
      <div><label for="auth-email">이메일</label><input id="auth-email" type="email" autocomplete="username" required></div>
      <div><label for="auth-password">비밀번호</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" required></div>
      <p class="auth-message" id="auth-message" hidden></p>
      <div class="auth-actions"><button class="save" type="submit">로그인</button></div>
    </form>
  </dialog>`;
}

/* ── 날짜 입력 ──────────────────────────────
   네이티브 date 인풋은 연도 칸이 6자리까지 들어가고(크롬), 4자리를 채워도 월로 넘어가지
   않는다. 세그먼트는 JS 로 손댈 수 없으니 같은 엘리먼트를 text 로 바꾸고 YYYY-MM-DD
   마스킹을 직접 건다 — 값 형식은 그대로라 이 인풋을 읽고 쓰는 쪽은 고칠 게 없다.
   달력도 브라우저 것을 못 쓰니 아래에서 직접 그린다. */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = number => String(number).padStart(2, '0');
const toISO = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const maskDate = digits => {
  const d = digits.slice(0, 8);
  return d.length > 6 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
    : d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}`
      : d;
};

/* 2026-02-31 처럼 형식은 맞지만 없는 날짜도 걸러낸다(파싱 후 되돌려 비교). */
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00`).toString() !== 'Invalid Date'
  && new Date(`${value}T00:00`).getDate() === Number(value.slice(8));

function upgradeDateInput(input) {
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = '2027-01-01';
  input.maxLength = 10;
  input.classList.add('date-text');

  const wrap = document.createElement('div');
  wrap.className = 'date-field';
  input.replaceWith(wrap);
  wrap.append(input);
  wrap.insertAdjacentHTML('beforeend',
    `<button class="date-pick" type="button" tabindex="-1" aria-label="달력 열기"><svg class="icon" aria-hidden="true"><use href="#i-calendar_month"/></svg></button>
     <div class="calendar" hidden>
       <div class="cal-head">
         <button class="cal-nav" type="button" data-step="-1"><svg class="icon" aria-hidden="true"><use href="#i-chevron_left"/></svg></button>
         <button class="cal-label" type="button"></button>
         <button class="cal-nav" type="button" data-step="1"><svg class="icon" aria-hidden="true"><use href="#i-chevron_right"/></svg></button>
       </div>
       <div class="cal-grid cal-week">${WEEKDAYS.map(day => `<span>${day}</span>`).join('')}</div>
       <div class="cal-grid cal-days"></div>
     </div>`);
  const calendar = wrap.querySelector('.calendar');
  const label = calendar.querySelector('.cal-label');
  const week = calendar.querySelector('.cal-week');
  const body = calendar.querySelector('.cal-days');
  const [prev, next] = calendar.querySelectorAll('.cal-nav');
  let shown; // 달력이 지금 펼쳐 보이는 달의 1일
  /* 'days' → 날짜 고르기. 머리의 라벨을 누를 때마다 'months' → 'years' 로 한 단계씩
     넓어지고, 칸을 고르면 다시 한 단계씩 좁아져 마지막엔 날짜 화면으로 돌아온다. */
  let mode = 'days';
  const YEAR_BLOCK = 12; // 연도 화면 한 판에 보여 주는 해의 수

  function validate() {
    const value = input.value;
    input.setCustomValidity(
      !value ? ''
        : !isDate(value) ? '날짜를 2027-01-01 형식으로 입력하세요.'
          : input.min && value < input.min ? `${input.min} 이후 날짜를 입력하세요.`
            : ''
    );
  }

  input.addEventListener('input', () => {
    /* 커서 앞의 숫자 개수를 세어 두었다가, 다시 칠한 뒤 같은 자리로 되돌린다. */
    const caret = input.selectionStart ?? input.value.length;
    const kept = input.value.slice(0, caret).replace(/\D/g, '').length;
    input.value = maskDate(input.value.replace(/\D/g, ''));

    let position = 0;
    for (let seen = 0; position < input.value.length && seen < kept; position++) {
      if (/\d/.test(input.value[position])) seen++;
    }
    while (position < input.value.length && !/\d/.test(input.value[position])) position++;
    input.setSelectionRange(position, position);
    validate();
  });
  input.addEventListener('change', validate);

  const blockStart = year => year - ((year % YEAR_BLOCK) + YEAR_BLOCK) % YEAR_BLOCK;
  /* 그 달·그 해의 마지막 날이 min 보다 앞서면 통째로 고를 수 없는 칸이다. */
  const monthBlocked = (year, month) => input.min && toISO(new Date(year, month + 1, 0)) < input.min;
  const yearBlocked = year => input.min && toISO(new Date(year, 11, 31)) < input.min;

  const cell = (text, data, classes, blocked) =>
    `<button type="button" class="${classes.filter(Boolean).join(' ')}" ${data}${blocked ? ' disabled' : ''}>${text}</button>`;

  /* 날짜 화면은 앞뒤 달이 물려 들어와 항상 6줄(42칸)이라, 달을 넘겨도 높이가 출렁이지
     않는다. 월·연도 화면은 4줄(12칸)이라 그보다 짧고, 칸도 정사각형이 아니다. */
  function draw() {
    const year = shown.getFullYear();
    const start = blockStart(year);
    const now = new Date();
    const picked = isDate(input.value) ? new Date(`${input.value}T00:00`) : null;

    week.hidden = mode !== 'days';
    body.className = `cal-grid ${mode === 'days' ? 'cal-days' : 'cal-cells'}`;
    label.textContent = mode === 'days' ? `${year}년 ${shown.getMonth() + 1}월`
      : mode === 'months' ? `${year}년`
        : `${start} – ${start + YEAR_BLOCK - 1}`;
    label.disabled = mode === 'years';
    const unit = mode === 'days' ? '달' : mode === 'months' ? '해' : `${YEAR_BLOCK}년`;
    prev.ariaLabel = `이전 ${unit}`;
    next.ariaLabel = `다음 ${unit}`;
    label.ariaLabel = mode === 'days' ? '월 선택' : mode === 'months' ? '연도 선택' : '';

    if (mode === 'days') {
      const first = new Date(year, shown.getMonth(), 1 - shown.getDay());
      const today = toISO(now);
      body.innerHTML = Array.from({ length: 42 }, (unused, index) => {
        const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index);
        const iso = toISO(date);
        return cell(date.getDate(), `data-date="${iso}"`, [
          date.getMonth() === shown.getMonth() ? '' : 'muted',
          iso === input.value ? 'on' : '',
          iso === today ? 'today' : '',
        ], input.min && iso < input.min);
      }).join('');
    } else if (mode === 'months') {
      body.innerHTML = Array.from({ length: 12 }, (unused, month) => cell(`${month + 1}월`, `data-month="${month}"`, [
        picked && picked.getFullYear() === year && picked.getMonth() === month ? 'on' : '',
        now.getFullYear() === year && now.getMonth() === month ? 'today' : '',
      ], monthBlocked(year, month))).join('');
    } else {
      body.innerHTML = Array.from({ length: YEAR_BLOCK }, (unused, index) => cell(start + index, `data-year="${start + index}"`, [
        picked && picked.getFullYear() === start + index ? 'on' : '',
        now.getFullYear() === start + index ? 'today' : '',
      ], yearBlocked(start + index))).join('');
    }
  }

  function open() {
    shown = new Date(`${isDate(input.value) ? input.value : toISO(new Date())}T00:00`);
    shown.setDate(1);
    mode = 'days';
    draw();
    calendar.hidden = false;
  }
  const close = () => { calendar.hidden = true };

  wrap.querySelector('.date-pick').addEventListener('click', () => calendar.hidden ? open() : close());

  calendar.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button === label) {
      mode = mode === 'days' ? 'months' : 'years';
      draw();
    } else if (button.dataset.step) {
      const step = Number(button.dataset.step);
      if (mode === 'days') shown.setMonth(shown.getMonth() + step);
      else shown.setFullYear(shown.getFullYear() + step * (mode === 'months' ? 1 : YEAR_BLOCK));
      draw();
    } else if (button.dataset.year) {
      shown.setFullYear(Number(button.dataset.year));
      mode = 'months';
      draw();
    } else if (button.dataset.month) {
      shown.setMonth(Number(button.dataset.month));
      mode = 'days';
      draw();
    } else if (button.dataset.date) {
      input.value = button.dataset.date;
      validate();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }
  });

  /* 다른 곳을 누르거나 ESC 를 누르면 닫는다. 모달 안에 있어도 ESC 가 달력만 먼저
     먹도록 stopPropagation() — 그러지 않으면 <dialog> 까지 같이 닫힌다. */
  document.addEventListener('pointerdown', event => {
    if (!calendar.hidden && !wrap.contains(event.target)) close();
  });
  wrap.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !calendar.hidden) { event.stopPropagation(); event.preventDefault(); close() }
  });
}

/* ── 사이드바 서랍 ──────────────────────────
   1280px 미만에서는 사이드바가 자리를 차지하지 않고 본문 위로 겹쳐 나오는 서랍이 된다
   (모양은 전부 CSS 몫). 여기서는 body 에 .nav-open 을 붙였다 떼는 일만 한다.
   모바일에서도 위로 눕지 않고 같은 서랍을 쓴다. */
function setupNavDrawer($) {
  const backdrop = $('nav-backdrop'), toggle = $('nav-toggle');
  const wide = window.matchMedia('(min-width:1280px)');

  const setOpen = open => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.ariaLabel = open ? '메뉴 닫기' : '메뉴 열기';
  };

  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
  $('nav-close').addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  /* 메뉴를 고르면 서랍은 할 일이 끝났다. 넓은 화면에서는 애초에 열려 있지도 않다. */
  $('sidebar').addEventListener('click', event => { if (event.target.closest('.nav-link')) setOpen(false) });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) setOpen(false);
  });
  /* 창을 넓히면 사이드바가 제자리로 돌아가므로 열림 상태도 함께 푼다
     (안 그러면 body 의 overflow:hidden 이 남아 본문이 스크롤되지 않는다). */
  wide.addEventListener('change', event => { if (event.matches) setOpen(false) });
}

/* ── 폼 유효성 ──────────────────────────────
   브라우저 기본 말풍선은 위치도 모양도 손댈 수 없고, 모달 위에 겉돌게 떠서 폼과 따로 논다.
   검사 자체는 그대로 브라우저(required·min·setCustomValidity)에 맡기고 — 즉 잘못된 값이면
   submit 은 지금처럼 브라우저가 막는다 — invalid 이벤트만 가로채 말풍선을 끄고,
   같은 내용을 필드 아래 한 줄로 직접 그린다. */

const invalidText = control => {
  const state = control.validity;
  /* 직접 걸어 둔 메시지(날짜 형식 등)가 있으면 그게 제일 구체적이다. */
  if (state.customError) return control.validationMessage;
  if (state.valueMissing) return control.tagName === 'SELECT' ? '항목을 선택하세요.' : '필수 입력 항목입니다.';
  if (state.typeMismatch) return control.type === 'email' ? '이메일 주소 형식이 아닙니다.' : '형식이 올바르지 않습니다.';
  if (state.patternMismatch) return '형식이 올바르지 않습니다.';
  if (state.rangeUnderflow) return `${control.min} 이후 값을 입력하세요.`;
  if (state.rangeOverflow) return `${control.max} 이전 값을 입력하세요.`;
  if (state.tooShort) return `${control.minLength}자 이상 입력하세요.`;
  if (state.tooLong) return `${control.maxLength}자 이하로 입력하세요.`;
  return control.validationMessage;
};

/* 라벨 + 컨트롤을 한 묶음으로 감싼 바깥 칸. 날짜 인풋은 .date-field 를 한 겹 더
   쓰므로 건너뛰어야 메시지가 달력 버튼 옆이 아니라 칸 아래에 붙는다. */
const fieldOf = control => control.closest('div:not(.date-field)');

function markInvalid(control) {
  const field = fieldOf(control);
  if (!field) return;
  field.classList.add('invalid');
  control.setAttribute('aria-invalid', 'true');

  let message = field.querySelector('.field-error');
  if (!message) {
    message = document.createElement('p');
    message.className = 'field-error';
    message.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-error"/></svg><span></span>';
    /* 칸 맨 끝이 아니라 컨트롤 바로 뒤에 꽂는다. 말풍선은 top 없이 흐름상 제자리(static
       position)에 뜨므로, 도움말이 뒤따르거나 옆 칸에 밀려 칸이 늘어나도 인풋 밑에 붙는다. */
    let anchor = control;
    while (anchor.parentElement && anchor.parentElement !== field) anchor = anchor.parentElement;
    anchor.after(message);
  }
  message.lastElementChild.textContent = invalidText(control);
}

function clearInvalid(control) {
  const field = fieldOf(control);
  if (!field) return;
  field.classList.remove('invalid');
  field.querySelector('.field-error')?.remove();
  control.removeAttribute('aria-invalid');
}

function watchValidity(form) {
  /* invalid 는 버블링하지 않는다 — 캡처 단계로 받아야 폼 하나로 전부 잡힌다. */
  form.addEventListener('invalid', event => {
    event.preventDefault();
    markInvalid(event.target);
  }, true);

  /* 고쳐서 통과하면 바로 지운다. 아직 틀렸으면 이미 표시 중일 때만 문구를 갈아 끼운다 —
     한 번도 제출하지 않은 필드에 타이핑만으로 빨간 줄이 뜨지는 않게. checkValidity() 는
     invalid 이벤트를 다시 쏘므로 여기서는 쓰지 않고 validity 를 직접 본다. */
  const recheck = event => {
    const control = event.target;
    if (!control.form) return;
    if (control.validity.valid) clearInvalid(control);
    else if (fieldOf(control)?.classList.contains('invalid')) markInvalid(control);
  };
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);
  form.addEventListener('reset', () => form.querySelectorAll('.invalid').forEach(field => {
    field.classList.remove('invalid');
    field.querySelector('.field-error')?.remove();
    field.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
  }));
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

  document.body.insertAdjacentHTML('afterbegin', authHTML(options.authLead) + CONFIRM_HTML + '<div class="nav-backdrop" id="nav-backdrop"></div>');
  $('app').insertAdjacentHTML('afterbegin', sidebarHTML());
  document.querySelector('.main').insertAdjacentHTML('afterbegin', HEADER_HTML);

  setupNavDrawer($);

  // TODO 임시. 브라우저 기본 날짜 인풋을 보려고 잠시 꺼 둔다. 확인 끝나면 되살릴 것.
  // document.querySelectorAll('input[type="date"]').forEach(upgradeDateInput);
  document.querySelectorAll('form').forEach(watchValidity);

  applyView(location.hash.slice(1));
  window.addEventListener('hashchange', () => applyView(location.hash.slice(1)));

  const authDialog = $('auth-dialog'), confirmDialog = $('confirm-dialog');
  $('confirm-ok').addEventListener('click', () => confirmDialog.close('ok'));
  $('confirm-cancel').addEventListener('click', () => confirmDialog.close('cancel'));

  $('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const supabase = await client();
    const { error } = await supabase.auth.signInWithPassword({ email: $('auth-email').value, password: $('auth-password').value });
    const box = $('auth-message');
    box.hidden = !error;
    box.classList.toggle('error', !!error);
    // 실패 사실과 대처법은 다른 문장이라 줄을 나눈다(.auth-message 가 pre-line).
    if (error) box.textContent = '로그인에 실패했습니다.\n이메일과 비밀번호를 확인하세요.';
  });

  $('sign-in').addEventListener('click', openAuth);
  $('close-auth').addEventListener('click', () => authDialog.close());
  $('sign-out').addEventListener('click', async () => (await client()).auth.signOut());
}

/**
 * 로그인 모달을 연다. 헤더의 로그인 버튼 말고도, 로그인해야 할 수 있는 일을
 * 눌렀을 때(카드의 수정·삭제 등) 그 자리에서 부르라고 내보낸다.
 * mountLayout() 전에 부르면 모달이 아직 없으므로 아무 일도 하지 않는다.
 */
export function openAuth() {
  const dialog = document.getElementById('auth-dialog');
  if (dialog && !dialog.open) dialog.showModal();
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
