-- return_start_minute 컬럼 추가
-- 퇴근 시작 시각의 분 단위 설정 (예: 18시 30분 → return_start_hour=18, return_start_minute=30)
-- 기존 코드에서 이미 참조 중이나 마이그레이션 누락 상태였음

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS return_start_minute INT NOT NULL DEFAULT 0;
