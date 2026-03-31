-- 기존 DB에 business_number 가 없을 때만 (MariaDB 10.3+ ADD COLUMN IF NOT EXISTS)
SET NAMES utf8mb4;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS business_number VARCHAR(20) NULL COMMENT '사업자등록번호(하이픈 포함 형식, MVP 모의 인증)' AFTER contact_phone;

-- UNIQUE 는 기존 DB에 키가 없을 때만 수동으로 추가하세요. 이미 schema.sql 로 적용된 경우 생략.
