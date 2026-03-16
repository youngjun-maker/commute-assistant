-- ============================================================
-- Mom's Route — 초기 스키마
-- 생성일: 2026-03-16
-- V-01~V-03 검증 결과 반영:
--   - commute_stop_id: ODsay startID 숫자값 (실시간 API stationID 파라미터)
--   - commute_ars_id: startArsID 문자열 (참고용만, 실시간 API 직접 사용 불가)
--   - 지하철도 동일하게 commute_stop_id 사용
-- ============================================================

-- ── T-02: ENUM 타입 ──────────────────────────────────────────

CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
);

-- ── T-02: user_settings 테이블 ───────────────────────────────

CREATE TABLE user_settings (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 집 주소 (ODsay 출발지 SX/SY 파라미터)
  home_address        TEXT          NOT NULL,
  home_lat            NUMERIC(10,7),            -- ODsay SY
  home_lng            NUMERIC(10,7),            -- ODsay SX

  -- 타이머 및 모드 전환 설정
  buffer_minutes      INT           NOT NULL DEFAULT 5,
  commute_start_hour  INT           NOT NULL DEFAULT 5,   -- KST 기준
  commute_end_hour    INT           NOT NULL DEFAULT 12,  -- KST 기준

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- ── T-03: schedules 테이블 ───────────────────────────────────

CREATE TABLE schedules (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day                     day_of_week   NOT NULL,
  is_active               BOOLEAN       NOT NULL DEFAULT true,

  -- 출근지 (사용자 입력)
  workplace_name          TEXT          NOT NULL,
  workplace_address       TEXT          NOT NULL,
  workplace_lat           NUMERIC(10,7) NOT NULL,   -- ODsay EY
  workplace_lng           NUMERIC(10,7) NOT NULL,   -- ODsay EX
  arrival_time            TIME          NOT NULL,   -- KST 기준 목표 도착 시각

  -- 출근 경로 — ODsay 경로 탐색 결과 (V-01~V-03 검증 기준)
  commute_traffic_type    SMALLINT,     -- NULL: 탐색 전 / 1: 지하철 / 2: 버스
  commute_stop_id         TEXT,         -- ★ 핵심: subPath[n].startID (실시간 API stationID 파라미터)
  commute_stop_name       TEXT,         -- subPath[n].startName (정류장/역명, 화면 표시용)
  commute_ars_id          TEXT,         -- subPath[n].startArsID (참고용만, 실시간 API 불가)
  commute_bus_no          TEXT,         -- lane[0].busNo (버스 노선번호, 실시간 API 필터링용)
  commute_route_id        TEXT,         -- lane[0].busID (참고용)
  commute_station_name    TEXT,         -- 지하철 역명 (화면 표시용)
  commute_subway_line     TEXT,         -- lane[0].name (노선명, 실시간 API 필터링용)
  odsay_route_cache       JSONB,        -- ODsay 전체 경로 응답 (totalTime 포함)
  route_cached_at         TIMESTAMPTZ,  -- 캐시 저장 시각 (7일 초과 시 재탐색)

  -- 퇴근 경로 — 출근과 대칭 구조
  return_traffic_type     SMALLINT,
  return_stop_id          TEXT,         -- ★ 핵심: startID (실시간 API stationID)
  return_stop_name        TEXT,
  return_ars_id           TEXT,         -- 참고용
  return_bus_no           TEXT,
  return_route_id         TEXT,
  return_station_name     TEXT,
  return_subway_line      TEXT,
  return_odsay_cache      JSONB,
  return_route_cached_at  TIMESTAMPTZ,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE(user_id, day)
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON schedules
  FOR ALL USING (auth.uid() = user_id);

-- ── T-04: overrides 테이블 ───────────────────────────────────

CREATE TABLE overrides (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_date           DATE          NOT NULL,   -- KST 기준 날짜

  -- 변경할 출근지 (NULL이면 schedules 값 사용)
  workplace_name          TEXT,
  workplace_address       TEXT,
  workplace_lat           NUMERIC(10,7),
  workplace_lng           NUMERIC(10,7),
  arrival_time            TIME,

  -- 출근 방향 경로 캐시 (NULL이면 schedules 캐시 사용)
  commute_traffic_type    SMALLINT,
  commute_stop_id         TEXT,         -- ★ 핵심: startID
  commute_stop_name       TEXT,
  commute_ars_id          TEXT,
  commute_bus_no          TEXT,
  commute_station_name    TEXT,
  commute_subway_line     TEXT,
  odsay_route_cache       JSONB,
  route_cached_at         TIMESTAMPTZ,  -- 당일 중복 탐색 방지 + Audit 전용

  -- 퇴근 방향 경로 캐시 (NULL이면 schedules.return_* 사용)
  return_traffic_type     SMALLINT,
  return_stop_id          TEXT,
  return_stop_name        TEXT,
  return_ars_id           TEXT,
  return_bus_no           TEXT,
  return_station_name     TEXT,
  return_subway_line      TEXT,
  return_odsay_cache      JSONB,
  return_route_cached_at  TIMESTAMPTZ,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE(user_id, override_date)
);

ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON overrides
  FOR ALL USING (auth.uid() = user_id);

-- ── T-05: 인덱스 ─────────────────────────────────────────────

CREATE INDEX idx_schedules_user_day   ON schedules(user_id, day);
CREATE INDEX idx_overrides_user_date  ON overrides(user_id, override_date);
