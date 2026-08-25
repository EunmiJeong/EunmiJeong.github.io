-- EKHUB 서비스 사이트 프로젝트 종료일 정정: 2019-10-25 → 2019-06-25
-- (이력서상 주식회사 이케이허브 재직 기간이 2018.05 ~ 2019.06 이므로 맞춤)
-- SQL Editor 에서 실행하거나, 프로젝트 관리 화면에서 직접 수정해도 됩니다.

update projects
set end_date = '2019-06-25'
where project_name = 'EKHUB 서비스 사이트';

select project_name, start_date, end_date from projects where project_name = 'EKHUB 서비스 사이트';
