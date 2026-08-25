-- 이력서 경력사항을 월 단위(start_month/end_month) → 일 단위(start_date/end_date)로 전환
-- SQL Editor 에 통째로 붙여넣고 Run 하세요. (한 번만)
--
-- 기존 값은 자동으로 옮겨집니다. 시작월 → 그 달 1일, 종료월 → 그 달 마지막 날.
-- 옮긴 뒤 실제 입사일·퇴사일로 이력서 화면에서 수정하시면 됩니다.

alter table resume_careers
  add column if not exists start_date date,
  add column if not exists end_date   date;

update resume_careers set
  start_date = (start_month || '-01')::date,
  end_date   = case when end_month is null then null
                    else (date_trunc('month', (end_month || '-01')::date) + interval '1 month - 1 day')::date end
where start_date is null;

alter table resume_careers alter column start_date set not null;

alter table resume_careers
  drop column if exists start_month,
  drop column if exists end_month;

-- 확인
select company, start_date, end_date, leave_months from resume_careers order by start_date desc;
