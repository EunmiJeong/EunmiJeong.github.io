-- 이력서 "경력사항" 테이블 + 초기 데이터 11건
-- Supabase 좌측 메뉴 SQL Editor → New query 에 통째로 붙여넣고 Run 하세요. (한 번만)
--
-- ※ 이미 이 테이블을 월 단위(start_month/end_month)로 만들어 두셨다면 이 파일 대신
--    resume-careers-to-daily.sql 을 실행하세요. 기존 데이터가 그대로 일 단위로 옮겨집니다.

create table if not exists resume_careers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company      text not null,
  role         text not null,
  start_date   date not null,
  end_date     date,                     -- 비어 있으면 재직중 (오늘까지 계산)
  leave_months int  not null default 0,  -- 휴직 개월수 (경력에서 차감)
  leave_reason text,                     -- 예: 육아휴직
  created_at   timestamptz not null default now()
);

alter table resume_careers enable row level security;

create policy "누구나 조회" on resume_careers for select using (true);
create policy "본인 데이터 추가" on resume_careers for insert with check (auth.uid() = user_id);
create policy "본인 데이터 수정" on resume_careers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "본인 데이터 삭제" on resume_careers for delete using (auth.uid() = user_id);

-- 초기 데이터. 정확한 입사일·퇴사일을 모르는 곳은 그 달의 1일 / 말일로 넣어두었습니다.
with me as (
  select id from auth.users where email = 'silvermi87@naver.com'
)
insert into resume_careers (user_id, company, role, start_date, end_date, leave_months, leave_reason)
select me.id, v.company, v.role, v.start_date::date, v.end_date::date, v.leave_months, v.leave_reason
from me, (values
  ('인스웨이브시스템즈',                '퍼블리싱',       '2021-10-05', null::text, 15, '육아휴직'::text),
  ('스마트비씨(=에이아이오비씨)',       '디자인/퍼블리싱', '2020-06-01', '2021-08-31', 0, null),
  ('주식회사 이케이허브',               '디자인/퍼블리싱', '2018-05-01', '2019-05-31', 0, null),
  ('오픈오브젝트',                      '퍼블리싱',       '2017-06-01', '2018-04-30', 0, null),
  ('삼정데이타서비스(주)',              '디자인/퍼블리싱', '2015-04-01', '2017-05-31', 0, null),
  ('주식회사게코소프트',                '디자인/퍼블리싱', '2014-07-01', '2015-03-31', 0, null),
  ('(주)클렉스(=(주)메이플경영컨설팅)', '디자인/퍼블리싱', '2013-04-01', '2014-05-31', 0, null),
  ('디지털드림',                        '디자인/퍼블리싱', '2012-02-01', '2013-02-28', 0, null),
  ('구제조아',                          '디자인/퍼블리싱', '2011-04-01', '2012-02-29', 0, null),
  ('나는예쁘다',                        '디자인/퍼블리싱', '2009-06-01', '2011-01-31', 0, null),
  ('디지털홍일',                        '디자인/퍼블리싱', '2008-05-01', '2008-11-30', 0, null)
) as v(company, role, start_date, end_date, leave_months, leave_reason);

-- 확인
select company, start_date, end_date, leave_months from resume_careers order by start_date desc;
