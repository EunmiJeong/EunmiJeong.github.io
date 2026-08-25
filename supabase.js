import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase 프로젝트의 Project URL / anon public key 를 넣으세요.
const SUPABASE_URL = 'https://gdeuokvcwdreewtiyhhg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ek_moT1UBmHifufv4MwoWA_mSozuQrg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* 헤더의 계정 영역(로그인/로그아웃)을 두 페이지에서 동일하게 처리한다. */
export function mountAccountBar(onChange) {
  const $ = id => document.getElementById(id);
  const authDialog = $('auth-dialog');

  supabase.auth.onAuthStateChange((event, session) => {
    $('account-mail').textContent = session ? session.user.email : '';
    $('sign-in').hidden = !!session;
    $('sign-out').hidden = !session;
    if (session) authDialog.close();
    onChange(session);
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
