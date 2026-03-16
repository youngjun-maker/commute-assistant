# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 개발 명령어

```bash
# 개발 서버 (Turbopack)
npm run dev

# 프로덕션 빌드
npm run build

# 린트
npm run lint

# TypeScript 타입 체크 (빌드 없이)
npx tsc --noEmit

# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]
```

환경변수: `.env.example`을 `.env.local`로 복사 후 아래 키 입력:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `KAKAO_REST_API_KEY` (서버 전용)
- `ODSAY_API_KEY` (서버 전용)

---

## 프로젝트 개요

요일마다 출근지가 달라 매번 지도 앱을 검색해야 하는 5060 시니어를 위한 **요일별 스케줄 기반 자동 출퇴근 안내 PWA**. 상세 요구사항은 `docs/PRD.md`, 개발 계획은 `docs/ROADMAP.md` 참조.

현재 상태: Next.js v15 스타터 킷 기반 (Supabase/ODsay 연동 전). 앞으로 구축할 구조가 `docs/PRD.md § 8-2`에 명시되어 있으며, 이 CLAUDE.md는 그 목표 구조를 포함한다.

---

## 아키텍처

### 전체 데이터 흐름

```
브라우저 (Next.js 클라이언트)
  └─ TanStack Query (useTransitInfo, useSchedule, useDepartureTimer)
       └─ Next.js Route Handler (/app/api/*)   ← API 키는 여기서만 참조
            ├─ Supabase (schedules, overrides, user_settings)
            ├─ ODsay API (경로 탐색 + 실시간 도착)
            └─ 카카오 로컬 API (주소 검색)
```

**모든 외부 API 호출은 반드시 Route Handler를 경유**한다. 클라이언트에서 직접 ODsay/카카오 API를 호출하지 않는다.

### Route Handler 프록시 3개

| 경로 | 역할 |
|------|------|
| `app/api/kakao/address/route.ts` | 카카오 주소 검색 → 위경도 반환 |
| `app/api/odsay/route/route.ts` | ODsay 경로 탐색 (캐시 만료 시에만, 절대 반복 호출 금지) |
| `app/api/transit/arrival/route.ts` | ODsay 실시간 도착 (`?type=bus` 또는 `?type=subway`) |

모든 Route Handler에 `export const dynamic = 'force-dynamic'`과 5초 타임아웃(`AbortSignal.timeout(5000)`) 적용.

### Supabase 스키마 핵심 설계

- **3개 테이블**: `user_settings` (집 주소·모드 전환 시각) → `schedules` (요일별 출근지 + ODsay 캐시) → `overrides` (당일 임시 덮어쓰기)
- 모든 테이블에 RLS 활성화 (`auth.uid() = user_id`)
- `schedules.commute_traffic_type`: NULL이면 ODsay 탐색 전 → **폴링 시작 안 함**
- `schedules.odsay_route_cache` (JSONB): 7일 캐시. `route_cached_at` 만료 시에만 ODsay 재호출
- `overrides.route_cached_at`: 장기 캐시 아님. **당일 중복 탐색 방지 + Audit 전용** (`CURRENT_DATE KST` 이내이면 재탐색 생략)

### 인증: Supabase Anonymous Auth

명시적 로그인 UI 없음. 앱 최초 접속 시 익명 `user_id` 자동 발급.

```
onAuthStateChange 리스너 등록 위치: app/layout.tsx 또는 최상위 Provider
중요: SIGNED_OUT 이벤트에만 signInAnonymously() 재호출
      TOKEN_REFRESHED는 처리 금지 (재호출 시 새 user_id 생성 → 기존 데이터 연결 끊김)
```

### 공통 훅 (hooks/)

| 훅 | 역할 |
|----|------|
| `useSchedule` | overrides 우선 → schedules 조회, ODsay 캐시 유효성 검사 |
| `useTransitInfo` | 30초 `refetchInterval`, `retry: 1`, 연속 3회 에러 시 폴링 중지 |
| `useDepartureTimer` | `arrival_time(KST) - totalTime(분) - buffer_minutes` 역산, 1분 카운트다운 |

### 시간/날짜 처리 규칙

- **모든 시간 비교는 KST(Asia/Seoul, UTC+9) 기준**
- `commute_start_hour` / `commute_end_hour`: INT 값이지만 KST 기준 시각으로 취급
- `arrival_time` (TIME 타입): KST 기준 시각
- `override_date` (DATE 타입): KST 기준 날짜. 자정 처리 시 서버(UTC)와 KST 날짜 불일치 주의
- 권장 라이브러리: `date-fns-tz`

### ODsay API 한도 보호 규칙 (1,000건/일 통합 한도)

1. 경로 탐색 캐시가 유효하면 ODsay 경로 탐색 API **절대 재호출 금지**
2. UI 컴포넌트(TransitInfo, DepartureTimer) 개발 시 **반드시 `lib/mock/transitMock.ts` Mock Data를 먼저 연결**하여 UI 완성 후 마지막에 실제 훅으로 교체. 핫리로딩으로 한도가 소진되는 것을 방지
3. `commute_traffic_type = NULL`이면 폴링 시작하지 않음

### ODsay API 실제 응답 구조 (V-01~V-03 검증 결과 — 2026-03-16)

> PRD 초안의 필드명이 실제와 달랐음. 아래가 검증된 실제 구조.

**경로 탐색 (`searchPubTransPathT`) 응답 파싱:**
- `path[0].info.totalTime` → 총 소요 시간 (분 단위)
- 버스 구간 (`trafficType = 2`):
  - `subPath[n].startArsID` → `commute_ars_id` (참고용만 저장. 실시간 API에 직접 사용 불가)
  - **`subPath[n].startID`** → **`commute_stop_id` (핵심 컬럼 — 실시간 API `stationID` 파라미터로 사용)**
  - `subPath[n].startName` → `commute_stop_name`
  - `subPath[n].lane[0].busNo` → `commute_bus_no`
  - `subPath[n].lane[0].busID` → `commute_route_id`
  - ⚠️ `lane[0].arsID` 없음 (PRD 오류)
- 지하철 구간 (`trafficType = 1`):
  - **`subPath[n].startID`** → **`commute_stop_id` (버스와 동일, 실시간 API `stationID` 파라미터로 사용)**
  - `subPath[n].startName` → `commute_station_name`
  - `subPath[n].lane[0].name` → `commute_subway_line`

**버스 실시간 도착 (`realtimeStation`) 호출:**
- 파라미터: `stationID = commute_stop_id` (숫자 ID)
- ⚠️ arsID 문자열(`startArsID`) 사용 시 "존재하지 않는 stationID" 에러
- 응답 파싱: `result.real[n]`에서 `routeNm === commute_bus_no` 필터링
  - `arrival1.arrivalSec` → 도착까지 초 (화면에서 분으로 변환)
  - `arrival1.leftStation` → 남은 정류장 수
  - `arrival2.*` → 두 번째 차량 동일 구조

**지하철 실시간 도착 (`realtimeSubwayStation`) 호출:**
- ⚠️ 엔드포인트: `realtimeSubway` 아님. **`realtimeSubwayStation`** 사용
- 파라미터: `stationID = commute_stop_id` (버스와 동일)
- ⚠️ `stationName` 파라미터 불가
- 응답 파싱: `result.real[n]`에서 `laneName === commute_subway_line` 필터링
  - `real[n].laneName` → 노선명 (PRD의 `lineName` 아님)
  - `real[n].stationName` → 역명 (PRD의 `subwayNm` 아님)
  - `real[n].lane[n].directionNm` → 방면 (PRD의 `destNm` 아님)
  - `lane[n].arrivalInfo[0].arrivalSec` → 도착까지 초 (PRD의 `barvlDt` 아님)
  - `lane[n].arrivalInfo[0].leftStationCnt` → 남은 정류장 수

---

## TailwindCSS v4 설정 방식

`tailwind.config` 파일 없음. CSS 기반 설정만 사용:

- 테마 변수: `app/globals.css`의 `@theme inline` 블록
- 커스텀 다크 모드: `@custom-variant dark (&:is(.dark *))`
- 색상 시스템: OKLCH 값 사용 (라이트/다크 모두)
- Border radius: `--radius` CSS 변수 기반 (`--radius-sm` ~ `--radius-xl`)

새 색상/토큰 추가 시 `tailwind.config`가 아닌 `app/globals.css`의 `:root` 및 `.dark` 블록에 CSS 변수로 추가.

---

## Import 별칭

`tsconfig.json`에 `"@/*": ["./*"]`만 정의되어 있으나, `components.json`에 shadcn 전용 별칭이 추가로 설정됨:

```
@/components  → ./components
@/lib         → ./lib
@/ui          → ./components/ui
@/hooks       → ./hooks
```

---

## 주요 설계 결정사항 (PRD에서 확정)

- **카카오 대중교통 경로 API 사용 금지**: B2B 전용. ODsay API로 대체
- **GPS/실시간 위치 추적 없음**: 등록된 집 주소 고정 좌표를 출발지로 사용
- **하단 탭 바 금지**: 단일 화면 기반 흐름 (시니어 UX)
- **시니어 UI 기준**: 본문 18px 이상, 핵심 정보 32px 이상, 터치 타겟 48×48px 이상, WCAG AA(명암비 4.5:1 이상)
- **PWA**: Serwist 사용 (next-pwa는 Next.js v15 App Router 미지원)
