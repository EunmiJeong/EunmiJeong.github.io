# Project Desk 설정 순서

데이터는 Supabase(무료)에 저장되고, 페이지는 GitHub Pages(무료)에서 열립니다.
아래 순서대로 한 번만 해두면 이후에는 어느 PC에서든 같은 주소로 접속해서 쓰면 됩니다.

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 후 **New project** 생성 (Region은 `Northeast Asia (Seoul)` 권장)
2. 생성 시 나오는 **Database Password**는 따로 보관 (이 앱에서 쓰진 않지만 분실하면 재설정해야 합니다)

## 2. 테이블 만들기

좌측 메뉴 **SQL Editor** → **New query** 에 아래를 붙여넣고 **Run**.

```sql
create table projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_name text not null,
  start_date   date not null,
  end_date     date not null,
  client       text not null,
  skills       text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now()
);

alter table projects enable row level security;

create policy "누구나 조회" on projects for select using (true);
create policy "본인 데이터 추가" on projects for insert with check (auth.uid() = user_id);
create policy "본인 데이터 수정" on projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "본인 데이터 삭제" on projects for delete using (auth.uid() = user_id);
```

마지막 세 줄(RLS 정책)이 **핵심**입니다. 조회는 누구에게나 열려 있고(포트폴리오로
보여주기 위함), 추가와 삭제는 로그인한 본인만 가능합니다. 화면에서 버튼을 숨기는 것과
별개로 DB가 직접 막아주는 부분이라 지우지 마세요.

> **이미 테이블을 만들어 둔 경우**: `notes`(기타) 칸과 수정 기능이 나중에 추가됐습니다.
> SQL Editor에서 아래를 실행하면 기존 데이터 그대로 반영됩니다.
>
> ```sql
> alter table projects add column if not exists notes text;
>
> create policy "본인 데이터 수정" on projects
>   for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
> ```

## 3. 내 계정 만들기

**Authentication → Users → Add user → Create new user**

1. 이메일, 비밀번호 입력
2. **Auto Confirm User** 체크 ← 반드시
3. **Create user**

앱의 "계정 만들기" 버튼으로 가입해도 되지만, Supabase 기본 메일 발송은
시간당 몇 통으로 제한돼 있어 확인 메일이 안 오거나 늦게 옵니다.
위처럼 대시보드에서 직접 만들면 확인 완료 상태로 바로 생기고,
앱에서는 **로그인만** 하면 됩니다. 혼자 쓰는 앱이라 계정은 이 하나로 충분합니다.

## 4. 키를 코드에 넣기

**Project Settings → API** 에서 두 값을 복사해 [index.html](index.html) 의
`SUPABASE_URL`, `SUPABASE_ANON_KEY` 자리에 넣습니다.

- **Project URL** → `SUPABASE_URL`
- **anon / public** key → `SUPABASE_ANON_KEY`

> `service_role` 키는 **절대** 넣지 마세요. RLS를 통째로 무시하는 키라 유출되면 전부 뚫립니다.
> `anon` 키는 공개돼도 되는 키입니다. 브라우저에 노출되는 걸 전제로 설계됐고,
> 실제 권한은 2단계의 RLS 정책이 막습니다.

## 5. GitHub Pages 배포

```bash
git init
git add .
git commit -m "Project Desk"
git branch -M main
git remote add origin https://github.com/<아이디>/<리포이름>.git
git push -u origin main
```

리포 **Settings → Pages → Source: Deploy from a branch → main / (root)** 저장.
1~2분 뒤 `https://<아이디>.github.io/<리포이름>/` 에서 열립니다.

## 6. 첫 로그인

배포된 주소에 접속 → 이메일·비밀번호 입력 → **계정 만들기** → **로그인**.

기존에 이 브라우저에서 등록해둔 프로젝트가 있으면 상단에 "옮기기" 안내가 뜹니다.
누르면 계정으로 이전되고, 그때부터 다른 PC에서도 같은 목록이 보입니다.

---

## 알아둘 점

- 사이트 주소 자체는 공개입니다. 리포를 비공개로 해도 마찬가지입니다.
  다만 로그인하지 않으면 데이터는 보이지 않습니다.
- 무료 티어는 **1주일 이상 접속이 없으면 프로젝트가 일시정지**됩니다.
  대시보드에서 버튼 한 번으로 복구되고 데이터는 유지됩니다.
- 코드를 고치면 `git push` 만 하면 모든 PC에 반영됩니다.
