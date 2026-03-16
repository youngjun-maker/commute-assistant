# Mom's Route PRD

**작성일**: 2026-03-15
**버전**: v1.4
**상태**: 확정 (Confirmed)
**개발자**: 1인 개발
**최종 수정일**: 2026-03-16 (v1.4 최종 픽스 — Critical 2건, Minor 1건 반영)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [타겟 유저 및 유저 스토리](#2-타겟-유저-및-유저-스토리)
3. [기능적 요구사항](#3-기능적-요구사항)
4. [비기능적 요구사항](#4-비기능적-요구사항)
5. [데이터베이스 스키마](#5-데이터베이스-스키마)
6. [외부 API 연동 명세](#6-외부-api-연동-명세)
7. [예외 상황 처리 시나리오](#7-예외-상황-처리-시나리오)
8. [기술 스택 및 아키텍처](#8-기술-스택-및-아키텍처)
9. [개발 로드맵](#9-개발-로드맵)

---

## 1. 프로젝트 개요

### 한 줄 정의

요일마다 출근지가 달라 매번 지도 앱을 새로 검색해야 하는 5060 시니어를 위한, 요일별 스케줄 기반의 자동 출퇴근 안내 PWA.

### 핵심 문제

**현재 상황**
- 사용자는 월~금 요일마다 출근하는 회사 위치와 출근 시간이 다름
- 매일 아침 스마트폰을 꺼내 지도 앱을 열고, 목적지를 검색하고, 대중교통 경로를 확인하는 과정을 반복함
- 시니어 사용자에게 작은 글씨와 복잡한 앱 UI는 매번 인지 부담을 유발함

**기존 해결책의 한계**
- 카카오맵/네이버지도: 기능은 충분하지만, UI가 복잡하고 매번 수동 검색 필요
- 기본 알람 앱: 경로 정보 없이 단순 알람만 제공
- 요일별 자동 목적지 전환 + 실시간 대중교통 정보 + 시니어 전용 UI를 동시에 제공하는 서비스 없음

**우리의 해결 방식**
- 요일별 출근지와 목표 도착 시간만 한 번 등록하면, 앱이 ODsay API로 최적 대중교통 경로를 자동 탐색하여 탑승 정류장(`arsID`) 및 버스 노선 번호(`busNo`) 또는 지하철역명을 캐시로 저장
- 매일 앱을 켰을 때 별도 검색 없이 "오늘 어디로, 몇 분 뒤에 출발" 정보를 큰 글씨로 즉시 제공
- ODsay 실시간 도착 정보 API로 버스/지하철 도착 정보를 30초마다 갱신
- 도착 목표 시간을 역산한 스마트 출발 타이머로 판단 부담 제거
- 오후/저녁엔 자동으로 퇴근 모드 전환

---

## 2. 타겟 유저 및 유저 스토리

### 주요 페르소나

**김영희 (가상 이름), 58세**
- 직업: 파트타임 또는 프리랜서 계약직 (요일마다 근무지 상이)
- 기술 수준: 스마트폰 기본 사용 가능, 앱 설치 및 카카오톡 사용은 익숙하지만 새 앱 탐색은 어려워함
- 주요 불편: 매일 아침 바쁜 상황에서 작은 글씨의 지도 앱을 조작하는 것이 스트레스
- 기대하는 것: 앱 켜면 "오늘은 여기로, N분 뒤 출발하면 돼"가 바로 보이는 것

### 유저 스토리

**아침 출근 시나리오**

```
As 시니어 사용자,
I want 앱을 켰을 때 오늘 요일에 맞는 출근지와 출발 시간이 자동으로 표시되기를,
So that 매일 아침 지도 앱을 새로 검색하지 않아도 된다.
```

```
As 시니어 사용자,
I want "N분 뒤 출발하세요"라는 큰 글씨의 타이머를 보기를,
So that 내가 직접 시간을 계산하지 않아도 된다.
```

**퇴근 시나리오**

```
As 시니어 사용자,
I want 저녁에 앱을 켰을 때 현재 위치(출근지)에서 집까지 가는 버스 정보가 보이기를,
So that 퇴근길에도 따로 검색하지 않아도 된다.
```

**일정 변경 시나리오**

```
As 시니어 사용자,
I want 오늘만 다른 목적지로 가야 할 때 간단히 변경할 수 있기를,
So that 평소 등록된 스케줄을 건드리지 않고 당일만 바꿀 수 있다.
```

---

## 3. 기능적 요구사항

### MVP 기능 (Phase 1)

#### F-01. 요일별 스케줄 관리

| 항목 | 상세 내용 |
|------|-----------|
| 기능명 | 요일별 출근 스케줄 등록/수정/삭제 |
| 설명 | 월~금 각 요일에 출근지 이름/주소, 목표 도착 시간을 설정. 정류장/노선 정보는 앱이 ODsay API로 자동 탐색하므로 사용자가 직접 입력하지 않는다 |
| 입력 | 요일 선택 / 출근지 이름 및 주소(카카오 주소 검색) / 목표 도착 시간 |
| 출력 | Supabase `schedules` 테이블에 저장 |
| 난이도 | 낮음 |
| 비고 | 요일별 활성화/비활성화 토글 포함 (휴무일 설정용). 탑승 정류장(`arsID`/역명)·노선 정보는 앱 실행 시 ODsay가 자동 탐색하여 캐시로 저장 |

**스케줄 등록 시 필수 입력 항목**

| 입력 항목 | 예시 값 | 설명 |
|-----------|---------|------|
| 출근지 이름 | "강남 사무소" | 화면에 표시될 이름 |
| 출근지 주소 | "서울 강남구 테헤란로 152" | 카카오 주소 검색으로 입력. 위경도 자동 추출 |
| 목표 도착 시간 | 09:00 | 출근 완료해야 하는 시각. 타이머 역산 기준 |

---

#### F-02. 아침 출근 모드 (메인 화면)

| 항목 | 상세 내용 |
|------|-----------|
| 기능명 | 오늘의 출근 정보 자동 로드 및 표시 |
| 설명 | 앱 실행 시 현재 요일을 감지하여 해당 요일 스케줄 자동 로드. 큰 글씨로 출근지명, 목표 시간 표시 |
| 트리거 | 앱 실행 시각이 `commute_start_hour` ~ `commute_end_hour` 범위 내 (기본 오전 5:00 ~ 오후 12:00) |
| 표시 정보 | 오늘의 출근지명, 목표 도착 시간, 실시간 대중교통 도착 정보 요약 |
| 난이도 | 중간 |

---

#### F-03. 스마트 출발 타이머

| 항목 | 상세 내용 |
|------|-----------|
| 기능명 | 역산 출발 카운트다운 |
| 설명 | (목표 도착 시간) - (ODsay 기준 총 소요 시간) - 여유 시간으로 "N분 뒤 출발하세요" 표시 |
| 계산 공식 | `출발 권장 시각 = arrival_time - odsay_route_cache.totalTime(분) - buffer_minutes` |
| 표시 형식 | "지금 바로 출발하세요" / "13분 뒤 출발하세요" (1분 단위 카운트다운) |
| 난이도 | 중간 |
| 비고 | 이미 출발 시각이 지난 경우 "서둘러 출발하세요!" 경고 표시. `commute_traffic_type`이 NULL이면(ODsay 탐색 전) 타이머 대신 "경로를 탐색 중입니다" 표시 |

---

#### F-04. 실시간 대중교통 정보 표시

| 항목 | 상세 내용 |
|------|-----------|
| 기능명 | ODsay 경로 탐색 + ODsay 실시간 도착 정보 |
| 설명 | **1단계**: ODsay로 최적 경로 탐색(조건부 1회) → `trafficType`으로 버스/지하철 판단 → ODsay 실시간 API 호출에 필요한 ID(`arsID`, `stationID`) 및 노선 정보 추출 저장. **2단계**: `commute_traffic_type` 기반으로 버스 또는 지하철 ODsay 실시간 API 분기 호출, 30초마다 갱신 |
| 갱신 주기 | 실시간 도착 정보 30초마다 자동 갱신 (ODsay 경로 탐색은 캐시 만료 시에만 재호출) |
| 표시 정보 | 탑승 정류장명(또는 역명) / 노선 번호(또는 지하철 노선) / 다음 차량 도착까지 남은 시간 / 남은 정류장 수 (최대 2개 순번) |
| 난이도 | 중간~높음 |
| 비고 | ODsay 일일 무료 한도 1,000건. 경로 탐색 캐시(7일 유효)가 있으면 ODsay 경로 탐색 미호출. 실시간 도착 폴링(30초)은 별도 카운트. `commute_traffic_type = NULL`인 동안 폴링 미시작 |

**두 단계 상세:**

**1단계 — ODsay 경로 탐색 (조건부 1회)**
- `odsay_route_cache IS NULL` 또는 `route_cached_at < NOW() - INTERVAL '7 days'`인 경우에만 호출
- 파라미터: `SX/SY` = 집 경도/위도 (`user_settings.home_lng/lat`), `EX/EY` = 출근지 경도/위도
- `path[0].subPath` 배열에서 첫 번째 대중교통 구간의 `trafficType` 확인
  - **버스** (`trafficType = 2`): `startArsID` → `commute_ars_id`, `lane[0].busNo` → `commute_bus_no`, `commute_traffic_type = 2`
  - **지하철** (`trafficType = 1`): `startName` → `commute_station_name`, `lane[0].name` → `commute_subway_line`, `commute_traffic_type = 1`
- 전체 응답을 `odsay_route_cache`(JSONB)에, 현재 시각을 `route_cached_at`에 저장

**2단계 — ODsay 실시간 도착 정보 조회 (30초마다 반복)**
- `commute_traffic_type = 2` (버스): `commute_ars_id`로 ODsay 버스 정류장 실시간 도착 API 호출 → `commute_bus_no`로 결과 필터링
- `commute_traffic_type = 1` (지하철): `commute_stop_id`(startID 숫자)로 ODsay 지하철 실시간 도착 API 호출 → `commute_subway_line`(`laneName` 필드)으로 결과 필터링 (V-03: stationName 파라미터 불가)
- `commute_traffic_type = NULL`: "경로를 탐색 중입니다" 상태 메시지 표시, 폴링 미시작

---

#### F-05. 저녁 퇴근 모드 자동 전환

| 항목 | 상세 내용 |
|------|-----------|
| 기능명 | 퇴근 모드 자동 전환 |
| 설명 | `commute_end_hour` 이후 앱 실행 시 자동으로 퇴근 모드로 전환. 당일 출근지 오버라이드가 있는 경우, 변경된 출근지를 퇴근 출발지로 사용. 오버라이드가 없으면 `schedules`의 `return_traffic_type` 기반으로 집 방향 실시간 도착 정보 표시 (F-04 로직 재활용) |
| 트리거 | 앱 실행 시각이 `commute_end_hour` 이후 |
| 표시 정보 | 집 방향 대중교통 도착 정보, 예상 귀가 시간 |
| 난이도 | 낮음 (F-04 재활용) |
| 비고 | 오버라이드로 출근지가 변경된 날은 `overrides.return_*` 컬럼의 퇴근 경로 캐시를 우선 사용 |

---

#### F-06. 일회성 스케줄 오버라이드

| 항목 | 상세 내용 |
|------|-----------|
| 기능명 | 당일 임시 스케줄 변경 |
| 설명 | 오늘 하루만 출근지/시간을 변경. 다음날에는 기존 등록 스케줄로 자동 복원 |
| 입력 | 변경할 항목 선택(목적지 / 목표 시간 / 전체), 변경 값 입력 |
| 저장 방식 | Supabase `overrides` 테이블에 당일 날짜로 저장. 목적지 변경 시 ODsay 재탐색(출근 방향 + 퇴근 방향 동시) 후 `overrides`의 경로 캐시 컬럼에 저장 |
| 난이도 | 낮음 |

---

### 2차 고도화 기능 (Phase 2, MVP 검증 후)

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 푸시 알림 | 출발 N분 전 홈 화면에서 알림 발송 (PWA Push API) | 높음 |
| 즐겨찾기 목적지 | 헬스장, 병원 등 자주 가는 곳 등록 후 빠른 선택 | 중간 |
| 주간 스케줄 달력 뷰 | 한 주의 스케줄을 달력 형태로 시각화 | 낮음 |
| 소요 시간 히스토리 | 실제 이동 시간 기록 및 예측 정확도 개선 | 낮음 |

---

### 명시적 제외 기능 (Phase 1 범위 외)

| 기능 | 제외 이유 |
|------|-----------|
| 모든 회원가입/로그인 UI | Anonymous Auth로 백그라운드 자동 세션 발급. 명시적 인증 화면 불필요 |
| 카카오 대중교통 경로 API | B2B 전용으로 개인 사용 불가. ODsay API로 대체 |
| 자가용/택시 경로 | 타겟 유저가 대중교통 사용자임 |
| 경로 저장/공유 | MVP 단계에서 불필요한 복잡도 증가 |
| 소셜 로그인 (Google/Kakao 계정 연동) | Anonymous Auth로 충분. 로그인 장벽 없는 것이 시니어에게 유리 |
| 실시간 위치 추적 | 배터리 소모 및 프라이버시 문제, UX 복잡도 증가 |
| 날씨 정보 연동 | 핵심 사용 흐름과 무관 |

---

## 4. 비기능적 요구사항

### 4-1. 시니어 친화적 UI/UX

| 요구사항 | 구체적 기준 |
|----------|-------------|
| 최소 폰트 크기 | 본문 18px 이상, 핵심 정보(타이머, 목적지) 32px 이상 |
| 버튼 최소 크기 | 터치 타겟 48x48px 이상 (Apple HIG 권고 기준) |
| 색상 대비 | WCAG AA 기준 이상 (명암비 4.5:1 이상) |
| 텍스트 | 약어, 영어 축약어 사용 금지. "버스 도착까지 3분" 형태로 풀어쓰기 |
| 화면 구성 | 한 화면에 최대 3개의 주요 정보만 표시. 스크롤 최소화 |
| 네비게이션 | 하단 탭 바 사용 금지 권고, 단일 화면 기반 흐름 우선 |
| 인터랙션 피드백 | 버튼 클릭 시 시각적 피드백(색상 변화) 명확하게 |

### 4-2. PWA 요구사항

| 요구사항 | 상세 |
|----------|------|
| 홈 화면 설치 | `manifest.json` 설정으로 iOS Safari / Android Chrome 홈 화면 추가 지원 |
| 오프라인 대응 | Service Worker를 통한 마지막 조회 데이터 캐싱 (최소 1회 로드 후 오프라인 접근 가능) |
| 앱 아이콘 | 192x192, 512x512 PNG 아이콘 제공 |
| 스플래시 화면 | iOS용 스플래시 이미지 설정 |
| 설치 유도 | 첫 방문 시 홈 화면 추가 안내 배너 표시 |

### 4-3. 성능 요구사항

| 지표 | 목표치 |
|------|--------|
| 초기 로딩 (LCP) | 3초 이하 (4G 기준) |
| 실시간 정보 갱신 | API 응답 후 1초 이내 화면 업데이트 |
| API 타임아웃 | 외부 API 응답 대기 최대 5초, 초과 시 Fallback 표시 |
| Supabase 쿼리 | 스케줄 조회 200ms 이하 |

### 4-4. 접근성

- 시스템 폰트 크기 설정 반영 (`rem` 단위 사용)
- 화면 낭독기(스크린 리더) 기본 지원 (`aria-label` 필수 속성)
- 고대비 모드 지원 고려

### 4-5. 세션 및 폴링 안정성

- Supabase `onAuthStateChange` 이벤트 리스너를 앱 최상위(`app/layout.tsx` 또는 Provider)에 등록하여 `SIGNED_OUT` 이벤트 발생 시에만 `supabase.auth.signInAnonymously()`를 재호출하여 세션 복구 (`TOKEN_REFRESHED`는 이미 유효한 세션이 존재하는 상태이므로 재호출 불필요 — 재호출 시 새 익명 `user_id` 생성으로 기존 데이터 연결 끊김 위험)
- 세션 재발급 중에는 API 폴링(`useTransitInfo`)이 일시 중단되며, 세션 복구 완료 후 재개
- 폴링 중 연속 3회 이상 API 에러 발생 시 폴링을 일시 중지하고 사용자에게 "네트워크 오류" 안내 표시. 사용자가 화면을 탭하거나 앱을 포어그라운드로 전환 시 폴링 재개
- React Query의 `retry: 1` 설정으로 즉각적인 재시도 1회만 허용하여 무한 루프 방지

### 4-6. 타임존(Timezone) 처리 원칙

| 원칙 | 상세 |
|------|------|
| 기준 타임존 | 모든 시간 비교 및 표시는 **KST(Asia/Seoul, UTC+9)** 기준으로 수행 |
| DB 저장 방식 | Supabase(PostgreSQL) 기본 타임존은 UTC. `TIMESTAMPTZ` 컬럼 사용으로 타임존 정보 포함 저장 권장 |
| 클라이언트 변환 | Next.js 클라이언트에서 `commute_start_hour`, `commute_end_hour` 비교 시 `new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 또는 `Intl.DateTimeFormat` 활용 |
| `arrival_time` 처리 | `TIME` 타입으로 저장된 `arrival_time`은 KST 기준 시각으로 취급. 타이머 역산 시 현재 시각도 KST로 변환 후 비교 |
| `override_date` 처리 | `DATE` 타입의 `override_date`는 KST 기준 날짜로 저장. 자정 넘김 처리 시 서버(UTC)와 클라이언트(KST) 날짜 불일치 주의 |
| 권장 라이브러리 | `date-fns-tz` 또는 네이티브 `Intl` API 사용. 외부 의존성 최소화를 위해 `date-fns-tz` 우선 권장 |

---

## 5. 데이터베이스 스키마

### 5-1. 개요

Supabase PostgreSQL을 사용한다. **모든 테이블에 Row Level Security(RLS)를 활성화**하여 익명 사용자를 포함한 모든 사용자가 본인 데이터(`auth.uid() = user_id`)에만 접근할 수 있도록 강제한다.

```
auth.users (Supabase Anonymous Auth 자동 관리 — 앱 최초 접속 시 익명 user_id 자동 발급)
  └─ user_settings (1:1) — 집 주소, 모드 전환 시각, 여유 시간
  └─ schedules (1:N, 요일별 최대 5개) — 출근지, ODsay 캐시(arsID/역명)
        └─ overrides (1:N, 날짜별 임시 덮어쓰기)
```

---

### 5-2. `user_settings` 테이블

사용자의 전역 설정값 저장. 집 주소는 ODsay 길찾기 출발지(`SX`, `SY` 파라미터)로 사용된다.

```sql
CREATE TABLE user_settings (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 집 주소 (ODsay 출발지, 카카오 주소 검색으로 입력)
  home_address        TEXT          NOT NULL,
  home_lat            NUMERIC(10,7),           -- ODsay SY 파라미터 (위도)
  home_lng            NUMERIC(10,7),           -- ODsay SX 파라미터 (경도)
  buffer_minutes      INT           NOT NULL DEFAULT 5,
  commute_start_hour  INT           NOT NULL DEFAULT 5,   -- 출근 모드 시작 시각 (기본 오전 5시) — KST 기준 시각 (클라이언트 및 서버 모두 KST로 변환 후 비교)
  commute_end_hour    INT           NOT NULL DEFAULT 12,  -- 출근 모드 종료 시각 (기본 오후 12시) — KST 기준 시각 (클라이언트 및 서버 모두 KST로 변환 후 비교)
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
```

**컬럼 설명**

| 컬럼 | 설명 |
|------|------|
| `home_address` | 카카오 주소 검색 결과 전체 주소 문자열 |
| `home_lat / home_lng` | 지오코딩된 집 좌표. ODsay `SY/SX` 파라미터로 직접 사용 |
| `buffer_minutes` | 출발 권장 시각 계산 시 추가하는 여유 시간 |
| `commute_start_hour` | 이 시각 이후부터 출근 모드 표시 (0~23) |
| `commute_end_hour` | 이 시각 이후부터 퇴근 모드 전환 (0~23) |

---

### 5-3. `schedules` 테이블

요일별 출근 스케줄 저장. ODsay 경로 탐색 결과에서 추출한 버스/지하철 ID를 별도 컬럼으로 저장하여, ODsay 실시간 도착 API 호출 시 바로 사용한다. `commute_traffic_type`으로 버스/지하철 API 분기 처리.

```sql
CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
);

CREATE TABLE schedules (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day                     day_of_week   NOT NULL,
  is_active               BOOLEAN       NOT NULL DEFAULT true,  -- 휴무일 설정용

  -- 출근지 정보 (사용자 직접 입력)
  workplace_name          TEXT          NOT NULL,
  workplace_address       TEXT          NOT NULL,
  workplace_lat           NUMERIC(10,7) NOT NULL,   -- ODsay EY 파라미터
  workplace_lng           NUMERIC(10,7) NOT NULL,   -- ODsay EX 파라미터
  arrival_time            TIME          NOT NULL,   -- 출근 완료 목표 시각

  -- 출근 경로 — ODsay 탐색 결과
  commute_traffic_type    SMALLINT,     -- NULL: 탐색 전. 1: 지하철, 2: 버스 (ODsay trafficType)
  commute_ars_id          TEXT,         -- 버스 전용: subPath[n].startArsID (참고용 저장. 실시간 API에는 사용 불가 — V-02 검증)
  commute_bus_no          TEXT,         -- 버스 전용: 노선 번호 (예: "472"). 실시간 API 결과 필터링용
  commute_station_name    TEXT,         -- 지하철 전용: 역명 (예: "강남"). 실시간 지하철 도착 API 파라미터
  commute_subway_line     TEXT,         -- 지하철 전용: 노선명 (예: "2호선"). 실시간 API 결과 필터링용
  commute_stop_id         TEXT,         -- ODsay subPath[n].startID (참고용)
  commute_stop_name       TEXT,         -- ODsay subPath[n].startName (참고용)
  commute_route_id        TEXT,         -- ODsay subPath[n].lane[0].busID (참고용)
  odsay_route_cache       JSONB,        -- ODsay 전체 경로 응답 캐시
  route_cached_at         TIMESTAMPTZ,  -- 캐시 저장 시각. 7일 초과 시 재탐색

  -- 퇴근 경로 — ODsay 탐색 결과 (출근과 대칭 구조)
  return_traffic_type     SMALLINT,     -- NULL: 탐색 전. 1: 지하철, 2: 버스
  return_ars_id           TEXT,         -- 버스 전용: ODsay arsID (실시간 버스 도착 API 파라미터)
  return_bus_no           TEXT,         -- 버스 전용: 노선 번호
  return_station_name     TEXT,         -- 지하철 전용: 역명
  return_subway_line      TEXT,         -- 지하철 전용: 노선명
  return_stop_id          TEXT,         -- ODsay 내부 ID (참고용)
  return_stop_name        TEXT,
  return_route_id         TEXT,         -- ODsay 내부 ID (참고용)
  return_odsay_cache      JSONB,
  return_route_cached_at  TIMESTAMPTZ,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id, day)
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON schedules
  FOR ALL USING (auth.uid() = user_id);
```

**핵심 컬럼 설명**

| 컬럼 | 예시 값 | 설명 |
|------|---------|------|
| `commute_traffic_type` | `2` | ODsay `trafficType`. NULL이면 아직 탐색 전 → 폴링 미시작 |
| `commute_ars_id` | `"01009"` | `startArsID` 저장 (참고용). ⚠️ 실시간 API `stationID` 파라미터에는 사용 불가 — `commute_stop_id`(startID 숫자) 사용할 것 (V-02 검증) |
| `commute_bus_no` | `"472"` | 버스 노선 번호. ODsay 실시간 도착 응답에서 이 값으로 필터링 |
| `commute_station_name` | `"강남"` | 지하철역명. ODsay 실시간 지하철 도착 API 조회 파라미터로 직접 사용 |
| `commute_subway_line` | `"2호선"` | 지하철 노선명. ODsay 실시간 도착 응답에서 이 값으로 필터링 |
| `odsay_route_cache` | `{...}` | ODsay 전체 응답. `totalTime`(분) 활용하여 타이머 계산 |

---

### 5-4. `overrides` 테이블

특정 날짜의 일회성 스케줄 임시 덮어쓰기. NULL 컬럼은 `schedules`의 기존 값을 그대로 사용한다. 출근지를 변경하는 경우, 해당 날의 퇴근 모드에서도 변경된 출근지가 퇴근 출발지로 사용되므로 퇴근 방향 ODsay 탐색 결과도 함께 저장한다.

> **`route_cached_at` / `return_route_cached_at` 컬럼 사용 원칙**: 오버라이드 데이터는 자정에 자동 만료되므로 `schedules`처럼 7일 단위 장기 캐시 갱신은 불필요하다. 이 두 컬럼은 **사용자가 하루에 오버라이드 설정을 여러 번 수정할 경우 ODsay 경로 탐색 API가 중복 호출되는 것을 방지하기 위한 당일 재탐색 방지 및 감사(Audit) 목적으로만** 제한적으로 사용한다. 구현 시 `route_cached_at`이 당일(`CURRENT_DATE`) 날짜인 경우 ODsay 재탐색을 건너뛰고 기존 `odsay_route_cache`를 재사용한다.

```sql
CREATE TABLE overrides (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_date         DATE          NOT NULL,                  -- 적용 날짜

  -- 변경할 출근지 정보 (NULL이면 기존 schedules 값 사용)
  workplace_name        TEXT,
  workplace_address     TEXT,
  workplace_lat         NUMERIC(10,7),
  workplace_lng         NUMERIC(10,7),
  arrival_time          TIME,

  -- 출근 방향: 목적지 변경 시 ODsay 재탐색 결과 (NULL이면 기존 schedules 캐시 사용)
  commute_traffic_type  SMALLINT,
  commute_ars_id        TEXT,
  commute_bus_no        TEXT,
  commute_station_name  TEXT,
  commute_subway_line   TEXT,
  odsay_route_cache     JSONB,
  route_cached_at       TIMESTAMPTZ,  -- 출근 방향 캐시 저장 시각. schedules.route_cached_at과 동일 구조

  -- 퇴근 방향: 변경된 출근지 → 집 ODsay 재탐색 결과 (출근지 변경 시 자동 저장)
  -- NULL이면 schedules의 return_* 값 사용
  return_traffic_type   SMALLINT,
  return_ars_id         TEXT,
  return_bus_no         TEXT,
  return_station_name   TEXT,
  return_subway_line    TEXT,
  return_odsay_cache    JSONB,
  return_route_cached_at TIMESTAMPTZ, -- 퇴근 방향 캐시 저장 시각. schedules.return_route_cached_at과 동일 구조

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id, override_date)
);

ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON overrides
  FOR ALL USING (auth.uid() = user_id);

-- 당일 이전 오버라이드 자동 정리 (Supabase Cron 또는 배치)
-- DELETE FROM overrides WHERE override_date < CURRENT_DATE;
```

---

### 5-5. 인덱스 설정

```sql
CREATE INDEX idx_schedules_user_day ON schedules(user_id, day);
CREATE INDEX idx_overrides_user_date ON overrides(user_id, override_date);
```

---

### 5-6. 스키마 설계 원칙

| 원칙 | 적용 내용 |
|------|-----------|
| 사용자 데이터 격리 | 모든 테이블에 `user_id` FK + RLS 정책 적용. Anonymous Auth 사용자도 동일 규칙 |
| ODsay 단일 ID 체계 | `commute_ars_id`, `commute_station_name` 등은 ODsay 경로 탐색 응답에서 직접 추출. 실시간 도착 API도 ODsay를 사용하므로 별도 ID 변환 불필요 |
| NULL 허용 전략 | `commute_traffic_type = NULL`인 동안 실시간 폴링 시작 안 함 → 잘못된 API 호출 방지 |
| 캐시 만료 기준 | `route_cached_at` 기준 7일. 앱 기동 시 체크하여 만료된 경우에만 ODsay 재호출 (한도 1,000건/일 보호) |
| 퇴근 방향 대칭 | 출근 방향의 모든 ODsay 캐시 컬럼을 `return_` 접두어로 동일하게 구성. overrides 테이블에도 동일 구조 적용 |
| 오버라이드 퇴근 연계 | 출근지 변경 오버라이드 시 퇴근 방향도 함께 탐색하여 `overrides.return_*`에 저장 → 퇴근 모드에서 오버라이드 퇴근 경로 우선 사용 |
| 오버라이드 캐시 타임스탬프 용도 | `overrides.route_cached_at` / `return_route_cached_at`는 장기 캐싱이 아닌 **당일 중복 탐색 방지 및 감사 목적**. 값이 `CURRENT_DATE` 이내이면 ODsay 재탐색 생략 |

---

## 6. 외부 API 연동 명세

> **보안 원칙**: 모든 외부 API 호출은 브라우저에서 직접 수행하지 않는다. 반드시 Next.js App Router의 Route Handler(`/app/api/...`)를 프록시 서버로 경유한다. API 키는 서버 환경변수에만 저장하고 클라이언트에 노출하지 않는다.

### 6-1. 사용 API 목록

| API | 용도 | 호출 빈도 | 무료 한도 |
|-----|------|-----------|-----------|
| 카카오 로컬 API | 주소 검색 → 위경도 변환 (설정 화면) | 사용자 입력 시 디바운스 | 300,000건/일 |
| ODsay 대중교통 경로 API | 집→출근지 경로 탐색 + `arsID`/`busNo`/역명 추출 | 캐시 만료 시 1회 (최대 7일에 1회) | **1,000건/일 (경로 탐색 + 실시간 도착 통합)** |
| ODsay 실시간 버스 도착 API | `commute_ars_id` 기반 실시간 버스 도착 정보 | 30초마다 반복 | 1,000건/일 통합 한도 |
| ODsay 실시간 지하철 도착 API | `commute_station_name` 기반 실시간 지하철 도착 정보 | 30초마다 반복 | 1,000건/일 통합 한도 |

> **제거된 API**: 카카오 모빌리티 대중교통 경로 API (B2B 전용, 개인 사용 불가), 공공데이터포털 버스/지하철 도착 API (ODsay와의 ID 체계 불일치 리스크로 제거)

---

### 6-2. 카카오 로컬 API 연동 (주소 검색 전용)

설정 화면에서 집 주소 및 출근지 주소를 검색할 때만 사용.

**Route Handler**: `GET /api/kakao/address?query={검색어}`

```
외부 호출: GET https://dapi.kakao.com/v2/local/search/address.json
헤더: Authorization: KakaoAK {KAKAO_REST_API_KEY}   ← 서버 환경변수

Query Parameters:
  query: "강남구 테헤란로 152"
  size: 5

Response 핵심 필드:
  documents[].place_name   → 장소명
  documents[].address_name → 지번 주소
  documents[].x            → 경도 (lng) → home_lng / workplace_lng 저장
  documents[].y            → 위도 (lat) → home_lat / workplace_lat 저장
```

---

### 6-3. ODsay 대중교통 경로 탐색 API

앱 실행 시 `odsay_route_cache`가 없거나 만료된 경우에만 1회 호출. **절대 반복 호출 금지** (일일 한도 1,000건 통합).

**Route Handler**: `POST /api/odsay/route`

```
외부 호출: GET https://api.odsay.com/v1/api/searchPubTransPathT
파라미터:
  apiKey = {ODSAY_API_KEY}       ← 서버 환경변수
  SX = user_settings.home_lng    (출발지 경도)
  SY = user_settings.home_lat    (출발지 위도)
  EX = schedules.workplace_lng   (도착지 경도)
  EY = schedules.workplace_lat   (도착지 위도)
  SearchType = 0
```

**캐시 유효성 검사 (Route Handler 내부)**

```
IF schedules.odsay_route_cache IS NULL
   OR schedules.route_cached_at < NOW() - INTERVAL '7 days'
THEN
    ODsay API 호출 (1회)
ELSE
    기존 캐시 반환 (ODsay 미호출)
```

**ODsay 응답 → DB 저장 필드 매핑**

`path[0].subPath` 배열을 순회하여 첫 번째 대중교통 구간(`trafficType = 1 또는 2`)을 찾는다.

버스 구간 (`subPath[n].trafficType === 2`):

| ODsay 응답 필드 | DB 컬럼 | 비고 |
|----------------|---------|------|
| `subPath[n].startArsID` | `commute_ars_id` | ODsay 실시간 버스 도착 API의 정류장 파라미터로 직접 사용. `lane[0].arsID`는 실제 응답에 없음(V-01 검증) |
| `subPath[n].lane[0].busNo` | `commute_bus_no` | 버스 노선 번호. 실시간 API 결과 필터링용 |
| `2` (상수) | `commute_traffic_type` | |
| `subPath[n].startID` | `commute_stop_id` | ODsay 내부 ID — 참고용만 저장 |
| `subPath[n].lane[0].busID` | `commute_route_id` | ODsay 내부 ID — 참고용만 저장 |

지하철 구간 (`subPath[n].trafficType === 1`):

| ODsay 응답 필드 | DB 컬럼 | 비고 |
|----------------|---------|------|
| `subPath[n].startName` | `commute_station_name` | 역명. ODsay 실시간 지하철 도착 API 조회 파라미터로 직접 사용 |
| `subPath[n].lane[0].name` | `commute_subway_line` | 노선명. 실시간 API 결과 필터링용 |
| `1` (상수) | `commute_traffic_type` | |
| `subPath[n].startID` | `commute_stop_id` | ODsay 내부 ID — 참고용만 저장 |

공통 (버스/지하철 무관):

| ODsay 응답 필드 | DB 컬럼 | 비고 |
|----------------|---------|------|
| `path[0]` 전체 JSON | `odsay_route_cache` | `totalTime`(분) 포함 — 타이머 계산에 활용 |
| 현재 시각 | `route_cached_at` | |

퇴근 방향은 `SX/SY`=직장 좌표, `EX/EY`=집 좌표로 반전하여 동일 로직으로 `return_*` 컬럼에 저장.

```typescript
// /app/api/odsay/route/route.ts 예시
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { sx, sy, ex, ey, scheduleId } = await request.json();

  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
  url.searchParams.set('SX', sx);
  url.searchParams.set('SY', sy);
  url.searchParams.set('EX', ex);
  url.searchParams.set('EY', ey);
  url.searchParams.set('apiKey', process.env.ODSAY_API_KEY!);
  url.searchParams.set('SearchType', '0');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
  const data = await res.json();

  const path = data.result?.path?.[0];
  const firstTransit = path?.subPath?.find(
    (s: { trafficType: number }) => s.trafficType === 1 || s.trafficType === 2
  );

  const isBus = firstTransit?.trafficType === 2;
  return Response.json({
    traffic_type: firstTransit?.trafficType ?? null,
    ars_id: isBus ? firstTransit?.lane?.[0]?.arsID : null,
    bus_no: isBus ? firstTransit?.lane?.[0]?.busNo : null,
    station_name: !isBus ? firstTransit?.startName : null,
    subway_line: !isBus ? firstTransit?.lane?.[0]?.name : null,
    stop_id: firstTransit?.startID,          // 참고용
    route_id: firstTransit?.lane?.[0]?.busID, // 참고용
    total_time: path?.info?.totalTime,        // 분 단위
    full_cache: path,
  });
}
```

---

### 6-4. ODsay 실시간 도착 정보 API

`commute_traffic_type`에 따라 버스 또는 지하철 ODsay 실시간 API를 호출한다. 경로 탐색과 동일한 ODsay 키를 사용하므로 일일 한도(1,000건)를 공유한다. 1인 사용(어머니) 환경에서는 하루 40~100건 수준으로 한도 내 운영 가능.

**Route Handler**: `GET /api/transit/arrival?type=bus&arsId={commute_ars_id}&busNo={commute_bus_no}`
**Route Handler**: `GET /api/transit/arrival?type=subway&stationName={commute_station_name}&line={commute_subway_line}`

**버스 실시간 도착 (`type=bus`)**

```
외부 호출: GET https://api.odsay.com/v1/api/realtimeStation
Query Parameters:
  apiKey    = {ODSAY_API_KEY}      ← 서버 환경변수
  stationID = {commute_stop_id}    ← ODsay 숫자 ID (subPath[n].startID). arsID 문자열 불가 (V-02 검증)

응답 처리:
  result.real 배열에서 routeNm === commute_bus_no 항목 필터링
  → routeNm           (노선 번호 — 화면 표시용) ✅
  → arrival1.arrivalSec  (첫 번째 차량 도착까지 초 단위 — 화면에서 분으로 변환)
  → arrival1.leftStation (첫 번째 차량 남은 정류장 수)
  → arrival2.arrivalSec  (두 번째 차량 도착까지 초 단위)
  → arrival2.leftStation (두 번째 차량 남은 정류장 수)

⚠️ V-02 검증 결과 PRD 오류 수정:
  - stationID 파라미터 값: arsID 문자열(startArsID) 불가 → startID 숫자값 사용
  - locationNo1/predictTime1/stationNm 필드 없음
  - 도착 정보는 arrival1/arrival2 하위 객체에 있으며 arrivalSec(초), leftStation 사용
  - 정류장명은 경로 탐색 시 저장한 commute_stop_name(startName) 사용
```

**지하철 실시간 도착 (`type=subway`)**

```
외부 호출: GET https://api.odsay.com/v1/api/realtimeSubwayStation
Query Parameters:
  apiKey    = {ODSAY_API_KEY}    ← 서버 환경변수
  stationID = {commute_stop_id}  ← ODsay 숫자 ID (startID, 버스와 동일). stationName 파라미터 불가 (V-03 검증)

응답 처리:
  result.real 배열에서 laneName === commute_subway_line 항목 필터링
  → real[n].laneName             (노선명 — 화면 표시용, 예: "4호선")
  → real[n].stationName          (역명 — 화면 표시용)
  → real[n].lane[n].directionNm  (행선지, 예: "연천 방면")
  → real[n].lane[n].arrivalInfo[0].arrivalSec   (도착까지 초 단위)
  → real[n].lane[n].arrivalInfo[0].leftStationCnt (남은 정류장 수)
  → real[n].lane[n].arrivalInfo[0].arrivalMsg    (도착 메시지 텍스트)

⚠️ V-03 검증 결과 PRD 오류 수정:
  - 엔드포인트: realtimeSubway → realtimeSubwayStation
  - 파라미터: stationName → stationID (숫자, 버스와 동일하게 startID 사용)
  - barvlDt 없음 → arrivalInfo[n].arrivalSec (초 단위)
  - lineName 없음 → laneName
  - destNm 없음 → lane[n].directionNm
  - subwayNm 없음 → stationName
```

---

### 6-5. Route Handler 프록시 구조

```
/app/api/
├── kakao/
│   └── address/route.ts          ← 카카오 주소 검색 프록시
├── odsay/
│   └── route/route.ts            ← ODsay 대중교통 경로 탐색 프록시
└── transit/
    └── arrival/route.ts          ← ODsay 실시간 도착 프록시
                                     (?type=bus 또는 ?type=subway로 분기)
```

각 Route Handler 공통 원칙:
- API 키는 `process.env`에서만 참조 (클라이언트 번들에 포함되지 않음)
- 외부 API 응답에서 필요한 필드만 추출하여 반환
- 타임아웃 5초 (`AbortSignal.timeout(5000)`)
- `export const dynamic = 'force-dynamic'` (캐싱 비활성화)

---

### 6-6. 환경 변수 설정

`.env.local` 파일:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 서버 전용

# 카카오 API (서버 전용)
KAKAO_REST_API_KEY=your-kakao-rest-api-key

# ODsay API (서버 전용 — 경로 탐색 및 실시간 도착 통합 사용)
ODSAY_API_KEY=your-odsay-api-key
```

---

### 6-7. 데이터 흐름도

#### 앱 실행 → 출근 모드 데이터 로딩 흐름 (v1.4 — ODsay 단일 API 아키텍처)

```
[설정 화면 — 최초 1회]
사용자가 집 주소 입력
  └─→ GET /api/kakao/address?query=...
        └─→ 카카오 로컬 API
              └─→ home_lat, home_lng → user_settings 저장

[메인 화면 기동]
        │
        ▼
[Supabase Anonymous Auth 확인]
  세션 있음 → 기존 익명 user_id 사용
  없음 → 백그라운드 자동 발급 (UI 없음)
  세션 이벤트 이상 → onAuthStateChange에서 signInAnonymously() 자동 재호출
        │
        ▼
[현재 시각 체크]
  commute_start_hour ~ commute_end_hour → 출근 모드
  commute_end_hour 이후 → 퇴근 모드 (return_* 컬럼 사용)
        │ (출근 모드 기준)
        ▼
[Supabase 조회]
  1. overrides 테이블에서 오늘 날짜 오버라이드 확인
  2. 없으면 schedules 테이블에서 오늘 요일 스케줄 조회
  3. user_settings에서 home_lat/lng, buffer_minutes 조회
        │
        ▼
[ODsay 캐시 유효성 검사]
  odsay_route_cache IS NULL?
  OR route_cached_at < 7일 전?
        │
        ├── YES (캐시 없음 / 만료) ─────────────────────────────────────┐
        │                                                                │
        │   POST /api/odsay/route                                        │
        │   (home_lat/lng → workplace_lat/lng)                           │
        │           ↓                                                    │
        │   ODsay 응답 trafficType 분기                                  │
        │   ┌─ trafficType = 2 (버스)                                   │
        │   │   lane[0].arsID  → commute_ars_id                         │
        │   │   lane[0].busNo  → commute_bus_no                         │
        │   │   trafficType=2  → commute_traffic_type                   │
        │   └─ trafficType = 1 (지하철)                                 │
        │       startName      → commute_station_name                    │
        │       lane[0].name   → commute_subway_line                     │
        │       trafficType=1  → commute_traffic_type                   │
        │                                                                │
        │   → schedules 테이블 업데이트                                 │
        │     (odsay_route_cache, route_cached_at 포함)                 │
        │                                                                │
        └── NO (캐시 유효) ───────────────────────────────────────────┐ │
                                                                       │ │
                                                                       ▼ ▼
                                            [commute_traffic_type 기반 분기]
                                                       │
                          ┌────────────────────────────┴──────────────────────────────┐
                          │ type = 2 (버스)                         │ type = 1 (지하철) │
                          ▼                                          ▼                  │
             GET /api/transit/arrival                  GET /api/transit/arrival         │
             ?type=bus                                 ?type=subway                     │
             &arsId={commute_ars_id}                   &stationName={commute_station_name}
             &busNo={commute_bus_no}                   &line={commute_subway_line}      │
                          │                                          │                  │
                          ▼                                          ▼                  │
             ODsay realtimeStation API                ODsay realtimeSubway API          │
             stationID = commute_ars_id               stationName 파라미터 조회         │
             routeNm = commute_bus_no 필터링           lineName 필터링                  │
                          │                                          │                  │
                          └──────────────────┬───────────────────────┘                  │
                                             │                                          │
                                             ▼                                          │
                                    [화면 렌더링]                                       │
                                    · 출근지명 (32px+)                                 │
                                    · 목표 도착 시간                                   │
                                    · 출발 카운트다운                                  │
                                      (arrival_time - totalTime(분) - buffer_minutes)  │
                                    · 탑승 정류장명 / 역명                             │
                                    · 노선 번호 / 지하철 노선                          │
                                    · 실시간 도착까지 N분                              │
                                             │                                          │
                                             ▼                                          │
                             [30초마다 자동 갱신] → /api/transit/arrival 재호출 ───────┘
```

---

## 7. 예외 상황 처리 시나리오

### 7-1. API 통신 장애 (Fallback UI)

| 상태 | 원인 | 대응 |
|------|------|------|
| ODsay 경로 탐색 타임아웃 (5초 초과) | 서버 지연, 네트워크 불량 | "경로 정보를 불러오지 못했습니다. 타이머를 표시할 수 없습니다" + 재시도 버튼 |
| ODsay 한도 초과 (1,000건/일) | 경로 탐색 + 실시간 폴링 합산 한도 소진 | 기존 캐시 사용. 캐시도 없으면 목표 도착 시간만 표시 |
| ODsay 실시간 도착 API 타임아웃 | 서버 지연, 네트워크 불량 | "현재 도착 정보를 불러오지 못했습니다. 잠시 후 다시 시도합니다" |
| ODsay 실시간 도착 API 빈 응답 | 차고지 대기, 운행 종료 | "현재 운행 정보 없음" 표시 |
| 에러 응답 코드 | API 키 만료, 일일 한도 초과 | "실시간 정보를 잠시 사용할 수 없습니다" 표시 |
| `commute_traffic_type = NULL` | ODsay 탐색 전 또는 탐색 실패 | "경로를 탐색 중입니다" 표시. 폴링 미시작 |

---

### 7-2. 일회성 일정 변경 (수동 오버라이드)

**사용자 액션 흐름:**
1. 메인 화면 우측 상단 "오늘만 변경" 버튼 탭
2. 변경 항목 선택: "목표 시간만 변경" / "출근지 변경" / "전부 변경"
3. 출근지 변경 선택 시: 카카오 주소 검색으로 새 목적지 선택 → ODsay 재탐색 자동 실행 (출근 방향: 집→변경된 출근지, 퇴근 방향: 변경된 출근지→집 동시 탐색) → `overrides`의 `commute_*` 및 `return_*` 경로 캐시 컬럼에 각각 저장
4. 확인 → `overrides` 테이블에 오늘 날짜로 저장
5. "오늘만 변경된 일정입니다" 배지 표시

**시간만 변경 시 퇴근 경로 처리:**
- `arrival_time`만 오버라이드하고 출근지(`workplace_*`)는 변경하지 않은 경우, `overrides`에는 `return_*` 컬럼이 저장되지 않음 (NULL 유지)
- 저녁 퇴근 모드에서는 `overrides.return_*`가 NULL이므로 기존 `schedules`의 `return_*` 컬럼(출근지 → 집 경로)을 그대로 사용
- ODsay 재탐색 없이 기존 캐시 경로 재활용 → API 한도 절약

**복원:** 자정이 지나면 `overrides`의 해당 날짜 레코드 만료 → 다음 조회 시 `schedules` 기본값 사용

---

### 7-3. 오늘 요일에 스케줄이 없는 경우

| 상황 | 처리 |
|------|------|
| 주말 (토, 일) | "오늘은 쉬는 날이에요" 화면 표시 |
| 해당 요일 `is_active = false` | "오늘은 휴무일로 설정되어 있어요" 표시 |
| 스케줄 미등록 | "아직 오늘 스케줄이 없어요. 등록하러 가기" 버튼 표시 |

---

### 7-4. 위치 권한 거부

이 앱은 현재 위치를 자동으로 감지하지 않고, 등록된 집 주소(고정 좌표)를 출발지로 사용. GPS 위치 권한 불필요.

---

### 7-5. 네트워크 오프라인

Service Worker 캐싱 전략:
- 앱 쉘(HTML, CSS, JS): Cache First
- 스케줄 데이터: Stale While Revalidate (마지막 Supabase 응답 캐싱)
- ODsay 탐색 결과: DB `odsay_route_cache`를 사용하므로 별도 처리 불필요
- 실시간 API 데이터: Network Only (실패 시 7-1 Fallback 적용)

---

### 7-6. 익명 세션 만료 또는 손실

- Supabase Anonymous Auth 세션은 로컬 스토리지에 유지됨
- 브라우저 데이터 초기화 등으로 세션 손실 시 → 새 익명 `user_id` 자동 발급 → 기존 스케줄 데이터 접근 불가 → 재등록 필요
- 초기 설정 화면에 "이 앱의 데이터는 이 기기에 저장됩니다. 브라우저 데이터를 삭제하면 스케줄을 다시 등록해야 합니다" 안내 표시
- 앱 실행 중 세션이 만료되는 경우 `onAuthStateChange` 리스너가 자동으로 감지하여 재발급 처리 (4-5 참조)

---

## 8. 기술 스택 및 아키텍처

### 8-1. 확정 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| 프레임워크 | Next.js v15 (App Router) | 기존 프로젝트 스택, Route Handler로 API 프록시 구현 용이 |
| 스타일링 | TailwindCSS v4 | 기존 프로젝트 스택, 빠른 개발 |
| UI 컴포넌트 | shadcn/ui (New York 스타일) | 기존 프로젝트 설정, 접근성 기본 지원 |
| 백엔드/DB | Supabase (PostgreSQL) | Anonymous Auth 내장, RLS 지원, JSONB 지원(ODsay 캐시), 무료 티어 |
| 인증 | Supabase Anonymous Auth | 회원가입/로그인 UI 없이 기기별 자동 세션 발급 |
| PWA | Serwist (next-pwa 대체) | Next.js v15 App Router 호환, Service Worker 설정 |
| 상태 관리 | React Query (TanStack Query) | API 캐싱, 30초 자동 갱신(`refetchInterval`), 로딩/에러 상태 처리, `retry: 1` 설정 |
| 배포 | Vercel | Next.js 최적화, 무료 티어, 환경변수 관리 |

### 8-2. 디렉토리 구조 (권고)

```
commute-assistant/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # 메인 화면 (출근/퇴근 모드 자동 전환)
│   ├── setup/page.tsx            # 스케줄 등록/수정 + 집 주소 설정
│   ├── override/page.tsx         # 오늘만 변경 화면
│   └── api/
│       ├── kakao/
│       │   └── address/route.ts  # 카카오 주소 검색 프록시
│       ├── odsay/
│       │   └── route/route.ts    # ODsay 경로 탐색 프록시
│       └── transit/
│           └── arrival/route.ts  # ODsay 실시간 도착 프록시 (버스/지하철 분기)
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── commute/
│   │   ├── DepartureTimer.tsx    # 출발 카운트다운 타이머
│   │   ├── TransitInfo.tsx       # 실시간 도착 정보 (버스/지하철 분기 렌더링)
│   │   └── ModeHeader.tsx        # 출근/퇴근 모드 헤더
│   └── schedule/
│       ├── DaySelector.tsx       # 요일 선택 컴포넌트
│       ├── AddressSearch.tsx     # 카카오 주소 검색
│       └── TimeInput.tsx         # 시간 입력 (큰 피커)
├── lib/
│   ├── utils.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── kakao.ts                  # 카카오 로컬 API 호출 함수
│   ├── odsay.ts                  # ODsay API 호출 + 필드 추출 함수 (경로 탐색 + 실시간 도착)
│   └── transit.ts                # ODsay 실시간 도착 API 호출 함수
├── hooks/
│   ├── useSchedule.ts            # 오늘 스케줄 조회 + ODsay 캐시 유효성 검사
│   ├── useTransitInfo.ts         # 실시간 도착 정보 + 30초 자동 갱신 (traffic_type 분기)
│   └── useDepartureTimer.ts      # 출발 타이머 계산 (ODsay totalTime 활용)
└── public/
    ├── manifest.json
    ├── sw.js
    └── icons/
```

---

## 9. 개발 로드맵

### Phase 1 - MVP (예상: 4~5주)

**Week 1: 기반 세팅 및 핵심 인프라**
- [ ] **[Day 1 필수 검증]** ODsay API (길찾기 및 실시간 도착) 실제 호출을 통한 JSON 응답 구조 확인 및 필수 필드(경로, 정류장 ID, 실시간 도착까지 남은 시간 등) 추출 스크립트 작성 (UI 개발 전 데이터 연동 선행 확인):
  - [ ] ODsay 실시간 도착 API의 실제 파라미터명 확인 (`stationID` vs `arsID` 등 — PRD 6-4에 `stationID = commute_ars_id`로 명시되어 있으나, 실제 호출로 최종 확인)
  - [ ] 경로 탐색 1,000건/일 한도가 실시간 도착 API와 **통합 한도**인지 **별도 한도**인지 ODsay 공식 문서 또는 실제 응답 헤더로 확인 (PRD에 통합 한도로 명시되어 있으나 키 발급 조건에 따라 다를 수 있음)
- [ ] Supabase 프로젝트 생성 및 테이블 스키마 적용 (v1.4 스키마 — `commute_ars_id`, `commute_traffic_type`, `overrides.return_*` 컬럼, RLS 포함)
- [ ] Supabase Anonymous Auth 자동 발급 로직 구현 + `onAuthStateChange` 세션 복구 리스너 등록
- [ ] Next.js Route Handler 프록시 3개 구축: `/api/kakao/address`, `/api/odsay/route`, `/api/transit/arrival`
- [ ] 환경변수 설정 (`.env.local`) — SUPABASE, KAKAO, ODSAY 키

**Week 2: 스케줄 관리 + 설정 화면**
- [ ] `/setup` 페이지 — 집 주소 등록 UI (`user_settings.home_lat/lng` 저장)
- [ ] 요일별 스케줄 등록/수정 UI — 출근지 주소 + 목표 도착 시간만 입력
- [ ] 카카오 주소 검색 컴포넌트 (`AddressSearch.tsx`)
- [ ] Supabase `schedules` CRUD 구현 (v1.4 스키마 기준)

**Week 3: 메인 화면 - 출근 모드**
- [ ] `useSchedule.ts` — overrides → schedules 우선순위 조회 + `odsay_route_cache` 유효성 검사
- [ ] ODsay API 호출 로직 (`lib/odsay.ts`) — `arsID`/`busNo`/역명 추출 및 `commute_traffic_type` 저장
- [ ] `useTransitInfo.ts` — `commute_traffic_type`에 따라 ODsay 버스/지하철 실시간 API 분기 호출, 30초 `refetchInterval`, `retry: 1`, 연속 3회 에러 시 폴링 중지
- [ ] `DepartureTimer.tsx` — `odsay_route_cache.totalTime` 기반 출발 카운트다운
- [ ] `TransitInfo.tsx` — 버스/지하철 분기 렌더링 (Fallback UI 포함)

**Week 4: 퇴근 모드 + 오버라이드**
- [ ] 시간대 기반 모드 자동 전환 로직 (`commute_end_hour` 기준)
- [ ] 퇴근 모드 화면 구현 (F-05) — `return_ars_id`/`return_station_name` 기반. 오버라이드 시 `overrides.return_*` 우선 사용
- [ ] 오버라이드 화면 (`/override`) 구현 (F-06) — 목적지 변경 시 출근/퇴근 방향 ODsay 동시 재탐색 트리거
- [ ] Fallback UI 구현 (API 장애 시나리오 7-1)

**Week 5: PWA + 마무리**
- [ ] `manifest.json` 작성 및 아이콘 제작
- [ ] Serwist 기반 Service Worker 설정 (오프라인 캐싱)
- [ ] 시니어 UI 검증 (폰트 크기, 터치 타겟 점검)
- [ ] Vercel 배포 및 도메인 설정
- [ ] 실사용자(어머니) 테스트 및 피드백 반영

---

### Phase 2 - 고도화 (MVP 검증 후, 미정)

- [ ] PWA 푸시 알림 (출발 N분 전 알림)
- [ ] 즐겨찾기 목적지 등록 기능
- [ ] 소요 시간 히스토리 기록 및 예측 정확도 개선
- [ ] 익명 계정 → 이메일 계정 연결 (스케줄 데이터 영구 보존)

---

## 성공 지표 (MVP 기준)

| 지표 | 목표 |
|------|------|
| 실사용자(어머니) 1주일 이상 자발적 사용 | 달성 여부 |
| 아침 앱 실행 후 출발 정보 확인까지 소요 시간 | 10초 이내 |
| 지도 앱 대신 이 앱으로 출근 정보 확인하는 비율 | 주 5회 중 4회 이상 |
| 실시간 도착 정보 정상 표시 성공률 | 90% 이상 |
| ODsay 일일 한도(1,000건) 소진 없이 운영 | 달성 여부 |

---

## 리스크 및 고려사항

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| ODsay 일일 한도(1,000건) 초과 | 낮음 | 경로 탐색은 7일 캐시로 최소화. 실시간 폴링(30초 간격)은 사용 중인 시간대에만 동작하며 1인 사용 기준 하루 40~100건 수준으로 한도 내 운영 가능. 비정상 재탐색 발생 시 로그로 감지 |
| ODsay 유료 전환 | 낮음 | 프록시 Route Handler만 교체하면 대안 API로 전환 가능 |
| ODsay 실시간 도착 API 응답 구조 변경 | 낮음 | Day 1 검증 스크립트로 실제 응답 구조 사전 확인. 변경 시 Route Handler 내 파싱 로직만 수정 |
| 익명 세션 손실 시 스케줄 데이터 유실 | 중간 | 초기 화면 안내 문구. Phase 2에서 계정 연동 기능 고려 |
| 시니어 사용자 PWA 설치 어려움 | 높음 | 초기 설치 가이드 화면 제작 (단계별 스크린샷) |
| Supabase 무료 티어 한도 | 낮음 | 1인 사용자 기준 무료 티어(500MB DB, 월 50만 API 호출) 충분 |
