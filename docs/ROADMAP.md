# Mom's Route — ROADMAP

**버전**: v1.2
**PRD 참조**: `docs/PRD.md` v1.4 (2026-03-16 최종 확정)
**작성일**: 2026-03-16
**최종 업데이트**: 2026-03-16
**개발 형태**: 1인 개발
**📊 진행 상황**: Week 1 완료, Week 2 완료, Week 3 완료, Week 4 완료 (53/69 Tasks 완료 — T-01~T-53 + V-01~V-04 전체)

---

## 빠른 시작 (Day 1 필수 액션)

> 코드 한 줄 작성 전에 반드시 완료해야 하는 검증 항목입니다.

- [x] **[V-01]** ODsay 실시간 버스 도착 API(`realtimeStation`) 실제 호출 — `stationID` vs `arsID` 파라미터명 최종 확인
- [x] **[V-02]** ODsay 경로 탐색 1,000건/일 한도가 실시간 도착 API와 **통합 한도**인지 **별도 한도**인지 공식 문서 또는 실제 응답 헤더로 확인
- [x] **[V-03]** ODsay 경로 응답에서 `path[0].subPath` 배열 구조 및 `lane[0].arsID`, `lane[0].busNo`, `startName`, `lane[0].name` 필드 실존 여부 확인
- [x] **[V-04]** ODsay `realtimeSubway` API 응답에서 `barvlDt`(초 단위) 필드 존재 여부 및 단위 재확인

---

## 프로젝트 개요

### 비전 및 목표

요일마다 출근지가 달라 매번 지도 앱을 새로 검색해야 하는 5060 시니어를 위해, 요일별 스케줄을 한 번만 등록하면 매일 아침 "오늘 어디로, 몇 분 뒤 출발"을 큰 글씨로 즉시 보여주는 PWA.

### 핵심 성공 지표

| 지표 | 목표 |
|------|------|
| 실사용자(어머니) 1주일 이상 자발적 사용 | 달성 |
| 아침 앱 실행 후 출발 정보 확인까지 소요 시간 | 10초 이내 |
| 지도 앱 대신 이 앱으로 출근 정보 확인 비율 | 주 5회 중 4회 이상 |
| 실시간 도착 정보 정상 표시 성공률 | 90% 이상 |
| ODsay 일일 한도(1,000건) 소진 없이 운영 | 달성 |

### 대상 사용자

5060 시니어, 스마트폰 기본 사용 가능, 요일마다 근무지 상이한 파트타임/프리랜서 계약직.

---

## 기술 스택 및 아키텍처

| 레이어 | 기술 | 선택 근거 |
|--------|------|-----------|
| 프레임워크 | Next.js v15 (App Router) | 기존 스타터 킷 스택. Route Handler로 API 프록시 구현 |
| 스타일링 | TailwindCSS v4 (CSS 기반 설정, tailwind.config 없음) | 기존 스택. 빠른 시니어 친화 UI 구현 |
| UI 컴포넌트 | shadcn/ui New York 스타일 | 접근성 기본 지원. 커스텀 컴포넌트 최소화 |
| 백엔드/DB | Supabase (PostgreSQL + RLS) | Anonymous Auth 내장, JSONB 지원(ODsay 캐시), 무료 티어 |
| 인증 | Supabase Anonymous Auth | 회원가입 UI 없이 기기별 자동 세션. 시니어 친화 |
| 상태 관리 | TanStack Query (React Query) | `refetchInterval` 30초, `retry: 1`, 에러 상태 처리 |
| PWA | Serwist | Next.js v15 App Router 호환 Service Worker |
| 시간 처리 | date-fns-tz | KST 타임존 변환 및 시간 역산 |
| 배포 | Vercel | Next.js 최적화, 환경변수 관리, 무료 티어 |

### 핵심 기술 결정사항

- **모든 외부 API 호출은 Route Handler 경유**: API 키 클라이언트 노출 방지
- **ODsay 단일 ID 체계**: 경로 탐색과 실시간 도착 모두 ODsay 사용 → ID 변환 불필요
- **`commute_traffic_type = NULL`이면 폴링 시작 안 함**: 잘못된 API 호출 방지
- **`SIGNED_OUT` 이벤트에만 `signInAnonymously()` 재호출**: `TOKEN_REFRESHED`에서 재호출 시 새 익명 user_id 생성으로 기존 데이터 연결 끊김 위험
- **KST 기준 시간 비교**: `date-fns-tz` 사용, `arrival_time` 및 `override_date` 모두 KST 기준

---

## 마일스톤 개요

| 마일스톤 | 기간 | 주요 목표 | 산출물 |
|----------|------|-----------|--------|
| Phase 1 — MVP | Week 1~5 (약 5주) | 시니어 어머니 실사용 가능한 PWA 출시 | 배포된 Vercel URL |
| Week 1 — 골격 | 1주 | 프로젝트 기반, DB, Auth, API 프록시 뼈대 | Supabase 스키마 + 3개 Route Handler |
| Week 2 — 공통 레이어 | 1주 | 재사용 훅/컴포넌트, 카카오 주소 검색 | 공통 훅 3개 + 공통 컴포넌트 |
| Week 3 — 출근 모드 | 1주 | F-01 스케줄 관리 + F-02/F-03/F-04 메인 화면 | 출근 모드 동작 |
| Week 4 — 퇴근/오버라이드 | 1주 | F-05 퇴근 모드 + F-06 오버라이드 | 전체 기능 동작 |
| Week 5 — PWA/마무리 | 1주 | 오프라인, 시니어 UI 검증, 배포 | 배포 완료 + 실사용자 테스트 |
| Phase 2 — 고도화 | MVP 검증 후 | 푸시 알림, 즐겨찾기 등 | TBD |

---

## Phase 1 — MVP (Week 1~5)

---

### Week 1 — 골격 세팅

> **원칙**: 모든 외부 의존성(Supabase, ODsay, 카카오)의 연결을 이 주에 검증한다. 다음 주차 작업이 이 주의 결과물에 의존한다.

#### 목표

- ODsay API 실제 응답 구조 검증 완료
- Supabase 스키마(3개 테이블) + RLS + 인덱스 적용
- Anonymous Auth + 세션 복구 리스너 동작
- 3개 Route Handler 뼈대(실제 호출 가능한 상태)
- 환경변수 설정 완료

#### Day 1 필수 검증 체크리스트 (UI 개발 전 선행 필수)

> 이 항목들이 완료되지 않으면 Week 3 이후 작업에서 데이터 연동 오류가 발생할 수 있습니다.

- [x] **[V-01]** ODsay 경로 탐색 API(`searchPubTransPathT`) 테스트 호출 실행 (Playwright로 직접 검증 완료)
  - ✅ `path[0].subPath[n].trafficType` 값 확인 — 1=지하철, 2=버스, 3=도보
  - ✅ `path[0].info.totalTime` = 40 (분 단위) 필드 존재 확인
  - ✅ 버스 구간: `lane[0].busNo` = `"470"` 존재 확인
  - ✅ 버스 구간: `lane[0].busID` = `1071` 존재 확인 (`commute_route_id` 저장용)
  - ✅ `subPath[n].startName` = `"광화문역"` 존재 확인 (버스 탑승 정류장명)
  - ✅ `subPath[n].startID` = `165600` 존재 확인 (`commute_stop_id` 저장용)
  - ✅ 지하철 구간: `startName` = `"서울역"`, `lane[0].name` = `"수도권 4호선"` 확인
  - ⚠️ **PRD 오류 발견 및 수정**: `lane[0].arsID` 필드 **존재하지 않음**. 실제 arsID는 `subPath[n].startArsID` = `"01009"`에 위치. PRD §6-3 및 §5-3 매핑 테이블 수정 완료 → T-11 파싱 시 `lane[0].arsID` 대신 `subPath[n].startArsID` 사용할 것
- [x] **[V-02]** ODsay 실시간 버스 도착 API(`realtimeStation`) 테스트 호출 실행 (Playwright로 직접 검증 완료)
  - ✅ 파라미터명: `stationID` 확인
  - ⚠️ **PRD 오류 발견 및 수정**: `stationID` 값으로 arsID 문자열(`startArsID`, 예: `"01009"`) 사용 불가 → **ODsay 숫자 ID(`startID`, 예: `165600`) 사용해야 함** → T-12 구현 시 `commute_stop_id` 컬럼값을 `stationID`로 사용할 것
  - ✅ `result.real[n].routeNm` 존재 확인 (노선 번호, `commute_bus_no`로 필터링 가능)
  - ⚠️ **PRD 오류 발견 및 수정**: `locationNo1`, `predictTime1`, `stationNm` 필드 없음
  - ✅ 실제 도착 정보 구조: `arrival1.arrivalSec`(초 단위), `arrival1.leftStation`(남은 정류장), `arrival2` 동일 구조
- [x] **[V-03]** ODsay 실시간 지하철 도착 API 테스트 호출 실행 (Playwright로 직접 검증 완료)
  - ⚠️ **PRD 오류 수정**: 엔드포인트 `realtimeSubway` → **`realtimeSubwayStation`**
  - ⚠️ **PRD 오류 수정**: 파라미터 `stationName` 불가 → **`stationID`(숫자, `startID` 사용)**
  - ⚠️ **PRD 오류 수정**: `barvlDt` 없음 → **`arrivalInfo[n].arrivalSec`(초 단위)**
  - ⚠️ **PRD 오류 수정**: `lineName` → **`laneName`**, `destNm` → **`lane[n].directionNm`**, `subwayNm` → **`stationName`**
  - ✅ 실제 구조: `real[n].laneName`(노선명), `real[n].lane[n].directionNm`(방면), `arrivalInfo[n].arrivalSec`(초), `arrivalInfo[n].leftStationCnt`(남은 정류장)
- [x] **[V-04]** ODsay 1,000건/일 한도가 경로 탐색 + 실시간 도착 **통합 한도**인지 **별도 한도**인지 확인
  - ✅ **통합 한도로 확정** — 경로 탐색 + 실시간 도착 API 합산 1,000건/일. T-16M Mock Data + 7일 캐시 전략으로 방어
  - 통합 한도임이 확인되면 PRD 명세 유지, 별도 한도면 폴링 전략 재검토 필요

#### 기술 태스크

**DB 및 인프라**

- [x] **[T-01]** Supabase 프로젝트 생성 및 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 환경변수 설정 (선행: 없음)
- [x] **[T-02]** `day_of_week` ENUM 타입 생성 및 `user_settings` 테이블 생성 — `home_address`, `home_lat`, `home_lng`, `buffer_minutes`, `commute_start_hour`, `commute_end_hour`, `TIMESTAMPTZ`, RLS 포함 (선행: T-01)
- [x] **[T-03]** `schedules` 테이블 생성 — 출근지 컬럼, `commute_traffic_type`, `commute_ars_id`, `commute_bus_no`, `commute_station_name`, `commute_subway_line`, `odsay_route_cache` JSONB, `route_cached_at`, 퇴근 방향 `return_*` 대칭 컬럼 전체, RLS, `UNIQUE(user_id, day)` (선행: T-01)
- [x] **[T-04]** `overrides` 테이블 생성 — `override_date` DATE, 출근/퇴근 방향 `commute_*` / `return_*` 컬럼, `route_cached_at` / `return_route_cached_at` (당일 중복 탐색 방지 목적), RLS, `UNIQUE(user_id, override_date)` (선행: T-01)
- [x] **[T-05]** 인덱스 생성 — `idx_schedules_user_day ON schedules(user_id, day)`, `idx_overrides_user_date ON overrides(user_id, override_date)` (선행: T-03, T-04)

**인증**

- [x] **[T-06]** `lib/supabase/client.ts`, `lib/supabase/server.ts` 구현 (선행: T-01)
- [x] **[T-07]** `app/layout.tsx` 또는 최상위 Provider에 `onAuthStateChange` 리스너 등록 — `SIGNED_OUT` 이벤트 발생 시에만 `signInAnonymously()` 재호출, `TOKEN_REFRESHED` 이벤트는 무시 (선행: T-06)
- [x] **[T-08]** 앱 최초 접속 시 세션 없는 경우 백그라운드 `signInAnonymously()` 자동 호출 로직 구현 (선행: T-07)

**환경변수**

- [x] **[T-09]** `.env.local` 파일 설정 — `KAKAO_REST_API_KEY`, `ODSAY_API_KEY` 추가, `.env.example` 업데이트 (선행: T-01)

**Route Handler 뼈대**

- [x] **[T-10]** `app/api/kakao/address/route.ts` 구현 — `GET ?query=`, 카카오 로컬 API 프록시, 5초 타임아웃, `export const dynamic = 'force-dynamic'` (선행: T-09)
  - ✅ 카카오 개발자 콘솔 도메인 등록 + 카카오맵 서비스 활성화 완료
  - ✅ 실제 테스트: 서울 강남구 테헤란로 152 → x/y 좌표 정상 반환 (200 OK)
- [x] **[T-11]** `app/api/odsay/route/route.ts` 구현 — `POST { sx, sy, ex, ey }`, ODsay 경로 탐색 프록시, 응답에서 `trafficType` 분기 후 `ars_id`/`bus_no`/`station_name`/`subway_line`/`total_time`/`full_cache` 추출 반환, 5초 타임아웃 (선행: T-09, V-01 검증 결과 반영)
  - ✅ V-01 검증 반영: `startArsID` 필드, `startID`→`stop_id` (실시간 API 핵심 파라미터)
  - ✅ ODsay Referer 인증 이슈 해결: `ODSAY_REFERER_URL` 환경변수로 등록 도메인 전달
  - ✅ 실제 테스트: `traffic_type:2, stop_id:165600, bus_no:"470", total_time:40` 정상 반환
- [x] **[T-12]** `app/api/transit/arrival/route.ts` 구현 — `GET ?type=bus&stopId=&busNo=` 및 `?type=subway&stopId=&line=` 분기 처리, ODsay 실시간 API 프록시, 5초 타임아웃 (선행: T-09, V-02, V-03 검증 결과 반영)
  - ✅ V-02 반영: 버스 `stationID` = numeric `startID` (arsID 문자열 불가)
  - ✅ V-03 반영: 지하철 엔드포인트 `realtimeSubwayStation`, `stationID` = numeric
  - ✅ 지하철 노선명 부분 일치 필터 적용 ("수도권 4호선" vs "4호선" 불일치 대응)
  - ✅ 실제 테스트: 버스 `arrival1.arrivalSec:4초/leftStation:1`, 지하철 `arrivalSec:334초` 정상 수신

#### 완료 기준

- Supabase SQL 에디터에서 3개 테이블 스키마 및 RLS 정책 확인 가능
- `curl` 또는 REST 클라이언트로 3개 Route Handler 실제 호출 성공
- 브라우저 로컬 스토리지에 Supabase 익명 세션 자동 저장 확인
- `onAuthStateChange` 리스너가 `SIGNED_OUT`에만 재호출하는 것을 로그로 확인

#### 위험 요소

- ODsay 실제 파라미터명이 PRD와 다를 경우 Route Handler 수정 필요 (Day 1 검증으로 조기 발견)
- ODsay 한도가 별도인 경우 폴링 전략 변경 필요

---

### Week 2 — 공통 레이어

> **원칙**: Week 3~4에서 사용하는 모든 재사용 훅, 유틸리티, 공통 컴포넌트를 이 주에 완성한다. 개별 기능 화면보다 먼저 구축한다.

#### 목표

- **ODsay Mock Data 유틸리티 완성** — UI 개발 중 실제 API 호출 없이 동일한 데이터 형태로 화면 검증 가능한 상태
- 공통 훅 3개(`useSchedule`, `useTransitInfo`, `useDepartureTimer`) 구현 완료
- 카카오 주소 검색 컴포넌트 동작
- KST 타임존 유틸리티 구현

#### 기술 태스크

**공통 유틸리티**

- [x] **[T-13]** `lib/utils.ts`에 KST 시간 유틸리티 추가 — `toKST(date)`, `getKSTHour()`, `getKSTDate()` (date-fns-tz 활용), `arrival_time`(TIME 문자열)과 현재 KST 시각 비교 함수 (선행: 없음)
  - ✅ `toKST`, `getKSTHour`, `getKSTDate`, `getKSTDayOfWeek`, `parseArrivalTime`, `getDepartureTime` 구현
  - ✅ `DayOfWeek` 타입 export
- [x] **[T-14]** `lib/odsay.ts` 구현 — `/api/odsay/route` 호출 함수, `schedules` 테이블 캐시 유효성 검사(`odsay_route_cache IS NULL` OR `route_cached_at < 7일 전`) 포함, Supabase 업데이트까지 처리 (선행: T-11)
  - ✅ `fetchOdsayRoute`, `checkAndRefreshRouteCache` 구현
  - ✅ `Schedule`, `UserSettings`, `OdsayRouteResult` 타입 export
  - ✅ `commute` / `return` direction 분기 + 좌표 반전 로직
- [x] **[T-15]** `lib/transit.ts` 구현 — `/api/transit/arrival` 호출 함수, `commute_traffic_type` 기반 분기, 응답 정규화 (선행: T-12)
  - ✅ `fetchTransitArrival` + `TransitArrivalResult`, `BusParams`, `SubwayParams` 타입 구현
  - ✅ 버스: `arrival1/2.arrivalSec, leftStation` 추출 / 지하철: `lane[0].arrivalInfo[0/1]` 추출
- [x] **[T-16]** `lib/kakao.ts` 구현 — `/api/kakao/address` 호출 함수, 디바운스 처리 포함 (선행: T-10)
  - ✅ `searchAddress(query)` → `KakaoAddressResult[]` 타입으로 정규화
- [x] **[T-16M]** `lib/mock/transitMock.ts` Mock Data 유틸리티 생성 — ODsay 버스/지하철 API 응답 형태와 동일한 가짜 데이터 객체 및 반환 함수 구현. 목적: UI/CSS 작업 시 실제 API를 호출하지 않고 `useTransitInfo` 훅과 동일한 인터페이스로 화면에 데이터를 렌더링하여 ODsay 일일 한도(1,000건) 소진 방지. 버스 Mock(`mockBusArrival`), 지하철 Mock(`mockSubwayArrival`), 경로 캐시 Mock(`mockOdsayRouteCache`)을 각각 구현하며 실제 API 응답 필드명(`routeNm`, `predictTime1`, `locationNo1`, `barvlDt` 등)과 100% 동일하게 맞출 것 (선행: V-01~V-03 완료 후 실제 응답 구조 확인 기반으로 작성)
  - ✅ `mockBusArrival` (routeNm, arrival1/2.arrivalSec/leftStation — V-02 필드명 100% 일치)
  - ✅ `mockSubwayArrival` (laneName, lane[].directionNm, arrivalInfo[].arrivalSec/leftStationCnt — V-03 일치)
  - ✅ `mockOdsayRouteCache` (info.totalTime=40, subPath 구조)
  - ✅ `mockSchedule`, `mockUserSettings` (schedules/user_settings 레코드 형태)

**공통 훅**

- [x] **[T-17]** `hooks/useSchedule.ts` 구현 — 오늘 KST 날짜 및 요일 기준으로 `overrides` 우선 조회 → 없으면 `schedules` 조회, `odsay_route_cache` 유효성 검사 후 만료 시 `lib/odsay.ts` 호출하여 캐시 갱신 트리거, `commute_traffic_type = NULL`이면 탐색 중 상태 반환 (선행: T-13, T-14)
  - ✅ 3개 테이블 `Promise.all` 병렬 조회
  - ✅ `direction: 'commute' | 'return'` KST 시각 기반 자동 결정
  - ✅ `Override` 타입, `Direction` 타입 export
- [x] **[T-18]** `hooks/useTransitInfo.ts` 구현 — TanStack Query `useQuery`, `refetchInterval: 30000`, `retry: 1`, `commute_traffic_type` 기반 버스/지하철 API 분기, 연속 3회 에러 시 폴링 중지 + "네트워크 오류" 상태 반환, 세션 복구 중 폴링 일시 중단 (선행: T-15, T-17)
  - ✅ `refetchInterval: 30_000`, `retry: 1`
  - ✅ `useEffect`로 연속 에러 카운트 추적 → 3회 시 `networkErrorStopped: true` + 폴링 중지
  - ✅ `refetch()` 수동 호출 시 에러 카운트 리셋 + 폴링 재개
- [x] **[T-19]** `hooks/useDepartureTimer.ts` 구현 — `arrival_time`(KST TIME) - `odsay_route_cache.info.totalTime`(분) - `buffer_minutes` 계산으로 출발 권장 시각 산출, 1분 단위 카운트다운, 이미 지난 경우 "서둘러 출발하세요!" 반환, `commute_traffic_type = NULL`이면 null 반환 (선행: T-13, T-17)
  - ✅ `setInterval(60_000)` 1분 카운트다운
  - ✅ `getDepartureTime(arrivalTime, totalMin, bufferMin)` 역산
  - ✅ `isOverdue: diffMs < 0`, 퇴근 방향은 `null` 반환

**공통 컴포넌트**

- [x] **[T-20]** `components/schedule/AddressSearch.tsx` 구현 — 카카오 주소 검색 입력 + 결과 목록, `x`(lng)/`y`(lat) 좌표 반환 콜백, 300ms 디바운스, 시니어 친화 (48px 터치 타겟, 18px 이상 폰트) (선행: T-16)
  - ✅ 300ms 디바운스, 외부 클릭 감지 드롭다운 닫기
  - ✅ `h-14 text-lg` 시니어 UI, `aria-expanded` / `role="listbox/option"` 접근성
- [x] **[T-21]** `components/schedule/TimeInput.tsx` 구현 — HH:MM 시간 입력 피커, 큰 터치 타겟, 한국어 레이블 (선행: 없음)
  - ✅ `input[type=time]`, `h-14 text-xl min-h-[48px]`
- [x] **[T-22]** `components/schedule/DaySelector.tsx` 구현 — 월~금 요일 선택 + `is_active` 토글, 한국어 표시 (선행: 없음)
  - ✅ 요일 버튼 `min-w/h-[48px]`, 비활성 `opacity-40`, 체크박스 토글 `aria-checked`
- [x] **[T-23]** `components/commute/ModeHeader.tsx` 구현 — 출근/퇴근 모드 헤더, 현재 모드 표시 (선행: 없음)
  - ✅ shadcn `Badge` + `text-2xl`, 출근/퇴근 분기

**TanStack Query 설정**

- [x] **[T-24]** `components/providers/` 또는 `app/layout.tsx`에 `QueryClientProvider` 설정, 기본 `retry: 1` 설정 (선행: T-06)
  - ✅ `@tanstack/react-query` + `date-fns-tz` 설치
  - ✅ `query-provider.tsx` 생성 (`retry: 1` 기본값), `layout.tsx` 래핑

#### 완료 기준

- `useSchedule` 훅이 오늘 요일의 스케줄 또는 오버라이드를 정상 반환
- `useTransitInfo` 훅이 30초마다 갱신되고, 연속 3회 에러 시 폴링 중지 확인
- `useDepartureTimer`가 KST 기준으로 올바른 출발 권장 시각 계산
- `AddressSearch` 컴포넌트에서 주소 검색 후 위경도 좌표 추출 성공
- **`lib/mock/transitMock.ts`의 Mock 데이터를 실제 `useTransitInfo` 훅에 연결했을 때와 동일한 UI가 렌더링되는지 확인** (필드명 불일치 시 Week 3 시작 전 수정)

#### 위험 요소

- KST `override_date`와 서버(UTC) 자정 불일치 — `getKSTDate()` 유틸리티 꼼꼼한 테스트 필요

---

### Week 3 — 개별 기능: 출근 모드 (F-01, F-02, F-03, F-04) ✅

> **원칙**: Week 2에서 완성된 훅과 컴포넌트를 조립한다. 새로운 로직은 최소화한다.

#### 목표

- F-01: `/setup` 페이지에서 집 주소 및 요일별 스케줄 등록/수정/삭제 동작
- F-02: 메인 화면에서 오늘 요일 스케줄 자동 로드 및 출근지명, 목표 시간 표시
- F-03: 출발 카운트다운 타이머 동작
- F-04: 실시간 대중교통 도착 정보 30초마다 갱신

#### 기술 태스크

**F-01 — 스케줄 관리 (`/setup`)**

- [x] **[T-25]** `app/setup/page.tsx` 레이아웃 구성 — 집 주소 섹션 + 요일별 스케줄 섹션, 단일 화면 기반 (선행: T-22, T-21, T-20)
  - ✅ 탭 UI (집 주소 / 요일 스케줄), 시니어 친화 레이아웃 (min-h-[48px], text-xl+)
- [x] **[T-26]** 집 주소 등록/수정 UI — `AddressSearch` 컴포넌트 연결, 저장 시 `user_settings` upsert (`home_lat`, `home_lng`, `home_address`) (선행: T-20, T-02)
  - ✅ AddressSearch 연결, upsert(onConflict: 'user_id'), 기존 주소 표시 + 저장됨 피드백
- [x] **[T-27]** 요일별 스케줄 등록 UI — `AddressSearch` + `TimeInput` + `is_active` 토글, 저장 시 `schedules` upsert (선행: T-22, T-20, T-21, T-03)
  - ✅ 인라인 폼(펼침/접힘), 주소 변경 시 ODsay 캐시 자동 리셋
- [x] **[T-28]** 스케줄 목록 조회 및 삭제 UI — 등록된 요일별 스케줄 카드 표시, 삭제 시 `schedules` 레코드 삭제 (선행: T-27)
  - ✅ 5요일 카드, 수정/삭제 버튼, 빈 상태 메시지
- [x] **[T-29]** 스케줄 없는 초기 상태에서 설정 화면으로 유도하는 빈 상태 UI (선행: T-25)
  - ✅ "아직 등록된 스케줄이 없어요" + 안내, app/page.tsx 스케줄 없음 → "스케줄 등록하기" 버튼
- [x] **[T-30]** 초기 설정 화면에 "이 앱의 데이터는 이 기기에 저장됩니다..." 안내 문구 (선행: T-25)
  - ✅ setup/page.tsx 집 주소 탭 하단에 안내 문구 포함

**F-02 — 출근 모드 메인 화면**

- [x] **[T-31]** `app/page.tsx` KST 시간 기반 모드 판별 로직 — `commute_end_hour` 이후면 퇴근 모드 (선행: T-13, T-17)
  - ✅ `useSchedule()` 연동, loading/error/no-schedule/schedule 4가지 분기
- [x] **[T-32]** 출근 모드 메인 화면 레이아웃 — 출근지명, 목표 도착 시간, 타이머, 실시간 정보 섹션 (선행: T-23, T-31)
  - ✅ ModeHeader + 목표 도착 시간 + DepartureTimer + TransitInfo + 오늘만 변경 링크
- [x] **[T-33]** 오늘 요일에 스케줄 없는 경우 처리 — 스케줄 미등록: "아직 스케줄이 없어요" + 등록 버튼 (선행: T-17)
  - ✅ schedule === null → 스케줄 등록하기 CTA; useSchedule에서 is_active=false 필터링
- [x] **[T-34]** `useSchedule` 연동 및 오버라이드 배지 표시 (선행: T-17)
  - ✅ override !== null 시 amber 배지 표시
  - ✅ [UI 검증 수정] 배지 컨테이너에 `role="status"` 추가 (접근성), 미사용 `userSettings` destructure 제거

**F-03 — 출발 타이머**

- [x] **[T-35]** `components/commute/DepartureTimer.tsx` 구현 — Mock 기반 prop UI 완성 (선행: T-16M, T-19)
  - ✅ "N분 뒤 출발하세요" (text-4xl), isOverdue → "서둘러 출발하세요!", isRouteSearching → "경로를 탐색 중입니다"
  - ✅ page.tsx에서 MOCK_TIMER 데이터 prop으로 주입 (T-35에서 실제 훅으로 교체 예정 주석 포함)
  - ✅ [UI 검증 수정] `minutesLeft === null` 상태 "---" → "출발 시각 계산 중..." (시니어 UX 개선)
- [x] **[T-36]** 타이머 1분 단위 카운트다운 인터벌 구현 (선행: T-35)
  - ✅ `useDepartureTimer`의 `setInterval(60_000)` 구현 완료 (T-19)

**F-04 — 실시간 대중교통 정보**

- [x] **[T-37]** `components/commute/TransitInfo.tsx` 구현 — Mock 기반 prop UI 완성 (선행: T-16M, T-18)
  - ✅ `TransitArrivalResult` prop 기반 렌더링, page.tsx에서 MOCK_TRANSIT 주입
- [x] **[T-38]** 버스 정보 렌더링 — 정류장명, 노선 번호, "N분 후 도착", 남은 정류장 수 (1~2순위) (선행: T-37)
  - ✅ TransitInfo 내 버스/지하철 공통 렌더링 (`data.type` 분기)
  - ✅ [UI 검증 수정] 남은 정류장 표기: 버스 "정류장 전" / 지하철 "역 전" 분기 적용
- [x] **[T-39]** 지하철 정보 렌더링 — 역명, 노선명, "N분 후 도착", arrivalSec 초→분 변환 (선행: T-37)
  - ✅ `formatArrival(arrivalSec)` 함수로 초→분 변환 표시
  - ✅ [UI 검증 수정] `lineLabel` 중복 삼항 연산 제거 → `data.line` 단순화
- [x] **[T-40]** Fallback UI 구현 — isNetworkError, isError, isLoading, data=null, isRouteSearching 5가지 상태 (선행: T-37)
  - ✅ 모든 fallback 분기 구현 + 다시 시도 버튼
- [x] **[T-41]** ODsay 경로 탐색 결과 `schedules` 자동 업데이트 (선행: T-14, T-17)
  - ✅ `useSchedule`의 `checkAndRefreshRouteCache` 호출로 구현 완료 (Week 2)

#### 완료 기준

- 아침 앱 실행 시 오늘 요일 스케줄 자동 로드 및 출근지명, 목표 시간 표시
- 타이머가 KST 기준으로 정확히 역산되어 표시
- 실시간 버스/지하철 도착 정보 30초마다 갱신 확인 (Network 탭에서 확인)
- 주말/휴무/스케줄 없는 경우 각각 적절한 메시지 표시

#### 위험 요소

- ODsay `totalTime` 필드 위치(`path[0].info.totalTime`)가 실제와 다를 경우 타이머 계산 오류 (V-01 검증으로 사전 확인)

---

### Week 4 — 개별 기능: 퇴근 모드 + 오버라이드 (F-05, F-06) ✅

#### 목표

- F-05: `commute_end_hour` 이후 퇴근 모드 자동 전환, `return_*` 경로 정보 기반 실시간 도착 정보 표시
- F-06: `/override` 페이지에서 오늘만 출근지/시간 변경, 목적지 변경 시 출근/퇴근 방향 ODsay 동시 재탐색

#### 기술 태스크

**F-05 — 퇴근 모드**

- [x] **[T-42]** 퇴근 모드 레이아웃 구현 — **[Mock Data 우선 원칙]** `mockBusArrival` / `mockSubwayArrival`(T-16M)로 집 방향 대중교통 도착 정보 및 예상 귀가 시간 UI를 100% 완성한 뒤 실제 훅으로 교체. `ModeHeader` 퇴근 모드 표시 포함 (선행: T-16M, T-31, T-23)
  - ✅ `MOCK_RETURN_TRANSIT: TransitArrivalResult` 주입, 출근/퇴근 공통 레이아웃 완성
  - ✅ '오늘만 변경' 버튼 퇴근 모드에서도 표시
- [x] **[T-43]** 퇴근 모드에서 `useTransitInfo` 훅 재활용 연결 — T-42 UI 완성 후 진행. 오버라이드 활성 시 `overrides.return_*` 우선, 없으면 `schedules.return_*` 사용, `return_traffic_type` 기반 버스/지하철 분기 (선행: T-18, T-42)
  - ✅ Mock 제거, 실제 transitData/transitLoading/transitError/isNetworkError 직접 연결
  - ✅ useTransitInfo 내부 direction='return' 분기(return_stop_id, return_bus_no 등) 코드 확인
- [x] **[T-44]** 퇴근 방향 ODsay 경로 탐색 자동 실행 — `schedules.return_route_cached_at`이 없거나 7일 초과 시 `lib/odsay.ts`로 직장→집 방향 탐색, `return_*` 컬럼 업데이트 (선행: T-14)
  - ✅ useSchedule 내 `checkAndRefreshRouteCache('return')` 호출로 기구현 (T-17)
- [x] **[T-45]** 당일 출근지 오버라이드가 있는 날 퇴근 모드 — `overrides.return_*`가 NULL이면 `schedules.return_*` 재활용 (시간만 변경한 오버라이드 케이스), ODsay 재탐색 없이 기존 캐시 사용 (선행: T-43)
  - ✅ useTransitInfo가 override?.return_traffic_type 우선 적용, null이면 schedule fallback으로 기구현

**F-06 — 오버라이드**

- [x] **[T-46]** `app/override/page.tsx` 구현 — "목표 시간만 변경" / "출근지 변경" / "전부 변경" 3가지 선택지 UI, 큰 버튼(48px 이상 터치 타겟) (선행: T-20, T-21)
  - ✅ 3가지 모드 버튼(min-h-[56px] text-xl), 폼 확장, 기존 오버라이드 배지
- [x] **[T-47]** "목표 시간만 변경" 처리 — `arrival_time` 오버라이드 저장, `overrides.return_*`은 NULL 유지 (퇴근 시 `schedules.return_*` 재활용), ODsay 재탐색 없음 (선행: T-04, T-46)
  - ✅ `saveTimeOverride`: arrival_time만 upsert(onConflict: user_id,override_date), router.push('/')
- [x] **[T-48]** "출근지 변경" 처리 — `AddressSearch`로 새 목적지 선택, `overrides.route_cached_at`이 당일(`CURRENT_DATE KST 기준`)인 경우 ODsay 재탐색 건너뛰고 기존 `odsay_route_cache` 재사용, 아닌 경우 출근 방향(`집→변경 출근지`) + 퇴근 방향(`변경 출근지→집`) ODsay 동시 탐색 후 `overrides.commute_*` + `overrides.return_*` 동시 저장 (선행: T-11, T-04, T-46)
  - ✅ `savePlaceOverride`: route_cached_at.startsWith(today) 중복 탐색 방지
  - ✅ Promise.all로 출근/퇴근 방향 ODsay 동시 탐색 후 commute_* + return_* 동시 저장
- [x] **[T-49]** 오버라이드 저장 완료 후 메인 화면 복귀 및 `useSchedule` 캐시 무효화, "오늘만 변경된 일정입니다" 배지 표시 (선행: T-34, T-47, T-48)
  - ✅ 저장/취소 후 router.push('/'), 배지는 useSchedule이 override 있을 때 자동 표시
- [x] **[T-50]** 오버라이드 취소 기능 — `overrides` 레코드 삭제 후 기존 스케줄로 복원 (선행: T-49)
  - ✅ `cancelOverride`: overrides.delete().eq('user_id').eq('override_date'), router.push('/')

**Fallback UI 완성**

- [x] **[T-51]** ODsay 경로 탐색 타임아웃 Fallback — "경로 정보를 불러오지 못했습니다. 타이머를 표시할 수 없습니다" + 재시도 버튼, `commute_traffic_type = NULL` 유지 (선행: T-11)
  - ✅ app/page.tsx 에러 화면에 `window.location.reload()` '다시 시도' 버튼 추가
- [x] **[T-52]** ODsay 한도 초과 Fallback — 기존 캐시 사용, 캐시도 없으면 목표 도착 시간만 표시 (선행: T-40)
  - ✅ DepartureTimer에 `arrivalTime?` prop 추가, minutesLeft===null + arrivalTime 있으면 목표 도착 시간 fallback 표시
- [x] **[T-53]** 사용자가 화면 탭 또는 앱 포어그라운드 전환 시 폴링 재개 로직 (`visibilitychange` 이벤트 활용) (선행: T-18)
  - ✅ `hooks/useVisibilityRefetch.ts` 생성, visibilitychange → queryClient.invalidateQueries(['transitArrival'])
  - ✅ app/page.tsx 상단에 useVisibilityRefetch() 적용

#### 완료 기준

- `commute_end_hour` 이후 접속 시 퇴근 모드 자동 전환 확인
- 출근지 변경 오버라이드 후 당일 재탐색이 당일 첫 번째 탐색 1회만 발생하는지 확인 (Network 탭)
- 시간만 변경한 오버라이드 시 퇴근 경로가 `schedules.return_*` 재활용되는지 확인
- 모든 Fallback 상황에서 앱이 멈추지 않고 안내 메시지 표시

#### 위험 요소

- `override_date`의 KST 자정 판별 로직 오류 시 당일 중복 탐색 방지 로직 오작동 가능 — 단위 테스트 필수

---

### Week 5 — PWA + 마무리

#### 목표

- PWA 설치 및 오프라인 동작
- 시니어 UI 전체 검증
- Vercel 배포 및 실사용자(어머니) 테스트

#### 기술 태스크

**PWA**

- [ ] **[T-54]** `public/manifest.json` 작성 — `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color` 설정 (선행: 없음)
- [ ] **[T-55]** 앱 아이콘 제작 및 배치 — 192x192, 512x512 PNG (`public/icons/`) (선행: T-54)
- [ ] **[T-56]** iOS 스플래시 이미지 및 `apple-touch-icon` 메타 태그 설정 (선행: T-55)
- [ ] **[T-57]** Serwist 설정 — `next.config.ts`에 Serwist 플러그인 추가, Service Worker 등록 (선행: T-54)
- [ ] **[T-58]** Service Worker 캐싱 전략 구현 — 앱 쉘(HTML/CSS/JS): Cache First, 스케줄 데이터: Stale While Revalidate, 실시간 API: Network Only (선행: T-57)
- [ ] **[T-59]** 첫 방문 시 홈 화면 추가 안내 배너 구현 (`beforeinstallprompt` 이벤트 또는 iOS Safari 수동 가이드 모달) (선행: T-57)

**시니어 UI 검증**

- [ ] **[T-60]** 전체 화면 폰트 크기 점검 — 본문 18px(1.125rem) 이상, 핵심 정보(타이머, 목적지) 32px(2rem) 이상 확인 (선행: Week 3~4 완료 후)
- [ ] **[T-61]** 모든 버튼 터치 타겟 점검 — 48x48px 이상 확인 (선행: Week 3~4 완료 후)
- [ ] **[T-62]** WCAG AA 색상 대비 확인 — 명암비 4.5:1 이상 (브라우저 DevTools 또는 axe 도구 사용) (선행: Week 3~4 완료 후)
- [ ] **[T-63]** `aria-label` 필수 속성 점검 — 버튼, 입력 필드, 상태 표시 요소 전체 (선행: Week 3~4 완료 후)
- [ ] **[T-64]** 모든 UI 텍스트 한국어 풀어쓰기 확인 — "버스 도착까지 3분" 형식, 영어 약어 제거 (선행: Week 3~4 완료 후)

**배포 및 테스트**

- [ ] **[T-65]** Vercel 프로젝트 생성 및 환경변수 설정 (SUPABASE, KAKAO, ODSAY 키) (선행: T-09)
- [ ] **[T-66]** `npm run build` 성공 확인, TypeScript 에러 0건 확인 (`npx tsc --noEmit`) (선행: Week 3~4 완료 후)
- [ ] **[T-67]** Vercel 배포 및 도메인 설정 (선행: T-65, T-66)
- [ ] **[T-68]** 실사용자(어머니) 테스트 — 아침 출근 시나리오, 퇴근 시나리오, 오버라이드 시나리오 직접 시연 및 피드백 수집 (선행: T-67)
- [ ] **[T-69]** 테스트 피드백 기반 UI 수정 (선행: T-68)

#### 완료 기준

- Android Chrome / iOS Safari에서 홈 화면 추가 성공 및 스탠드얼론 모드 동작
- 오프라인 상태에서 마지막 캐시 데이터로 앱 쉘 로딩 성공
- LCP 3초 이하 (Vercel 배포본 기준, 4G 시뮬레이션)
- 실사용자(어머니)가 도움 없이 앱 실행 → 출발 정보 확인까지 10초 이내

---

## Phase 2 — 고도화 (MVP 검증 후, 일정 미정)

> MVP 실사용 검증 이후 우선순위를 재결정한다.

- [ ] **[P2-01]** PWA 푸시 알림 — 출발 N분 전 홈 화면 알림 (`Push API`, `Notification API`)
- [ ] **[P2-02]** 즐겨찾기 목적지 등록 — 헬스장, 병원 등 자주 가는 곳 등록 후 오버라이드 화면에서 빠른 선택
- [ ] **[P2-03]** 익명 계정 → 이메일 계정 연결 — Supabase 계정 업그레이드로 스케줄 데이터 영구 보존
- [ ] **[P2-04]** 소요 시간 히스토리 기록 및 예측 정확도 개선
- [ ] **[P2-05]** 주간 스케줄 달력 뷰

---

## 의존성 맵

```
[V-01, V-02, V-03, V-04] (Day 1 검증)
        │
        ▼
[T-01] Supabase 프로젝트
        │
        ├─[T-02] user_settings 테이블
        ├─[T-03] schedules 테이블
        │        └─[T-04] overrides 테이블
        └─[T-05] 인덱스
        │
        ├─[T-06] Supabase client/server
        │        └─[T-07, T-08] Anonymous Auth + 리스너
        │                        └─[T-24] QueryClientProvider
        │
        └─[T-09] 환경변수
                 ├─[T-10] /api/kakao/address ─────────────────[T-16] lib/kakao.ts
                 │                                                      │
                 │                                              [T-20] AddressSearch
                 ├─[T-11] /api/odsay/route ──────────────────[T-14] lib/odsay.ts
                 │                                                      │
                 └─[T-12] /api/transit/arrival ──────────────[T-15] lib/transit.ts

[T-13] KST 유틸리티
        │
        ├─[T-17] useSchedule ─────────────────────────────[T-19] useDepartureTimer
        │        (T-14 의존)                                              │
        │                                                        [T-35, T-36] DepartureTimer
        └─[T-18] useTransitInfo (T-15, T-17 의존)
                 └─[T-37~T-40] TransitInfo 컴포넌트

[T-21] TimeInput ──┐
[T-22] DaySelector─┤
[T-23] ModeHeader──┤
                   ├─[T-25~T-30] /setup 페이지 (F-01)
                   ├─[T-31~T-34] 메인 출근 모드 (F-02)
                   ├─[T-42~T-45] 퇴근 모드 (F-05)
                   └─[T-46~T-50] /override 페이지 (F-06)

[T-54~T-58] PWA (Serwist) — Week 3~4 완료 후 시작 가능
[T-60~T-64] 시니어 UI 검증 — Week 3~4 완료 후
[T-65~T-69] 배포 및 실사용자 테스트
```

**핵심 선행 관계 요약**

| 후속 작업 | 반드시 선행 필요한 작업 |
|-----------|------------------------|
| T-11 (ODsay Route Handler) | V-01 (ODsay 응답 구조 확인) |
| T-12 (실시간 도착 Route Handler) | V-02, V-03 (실시간 API 파라미터 확인) |
| T-17 (useSchedule) | T-03, T-04, T-13, T-14 |
| T-18 (useTransitInfo) | T-15, T-17, T-24 |
| T-19 (useDepartureTimer) | T-13, T-17 |
| T-48 (오버라이드 출근지 변경) | T-11, T-04 |
| Week 3 전체 | Week 2 전체 |
| Week 4 전체 | Week 3 전체, Week 2 전체 |

---

## 위험 관리 매트릭스

| 위험 | 확률 | 영향 | 완화 전략 |
|------|------|------|-----------|
| **UI 개발 중 핫리로딩으로 ODsay 1,000건 한도 소진** | **높음** | **높음** | **Week 2에서 T-16M Mock Data 유틸리티를 먼저 완성**하고, Week 3~4 UI 컴포넌트(T-35, T-37~T-39, T-42~T-43)는 반드시 Mock Data로 UI를 100% 완성한 뒤 마지막에만 실제 훅으로 교체 |
| ODsay 파라미터명 불일치 (`stationID` vs `arsID`) | 중간 | 높음 | **Day 1 V-01~V-03 검증**으로 조기 확인. Route Handler 파싱 로직만 수정하면 해결 |
| ODsay 한도가 별도(통합 아님)인 경우 | 낮음 | 낮음 | 별도 한도라면 폴링 전략 여유 확보. Day 1 V-04로 확인 |
| ODsay 일일 한도(1,000건) 초과 | 낮음 | 중간 | 7일 캐시로 경로 탐색 최소화. 1인 사용 기준 30초 폴링은 하루 40~100건 수준 |
| KST 자정 날짜 불일치 | 중간 | 중간 | `getKSTDate()` 유틸리티 단위 테스트. `override_date` 비교 시 항상 KST 변환 후 비교 |
| `SIGNED_OUT` 외 이벤트에서 `signInAnonymously()` 재호출 | 중간 | 높음 | `onAuthStateChange` 이벤트 타입 명시적 체크 (`event === 'SIGNED_OUT'`만 처리) |
| 익명 세션 손실 시 데이터 유실 | 중간 | 중간 | 초기 설정 화면에 안내 문구. Phase 2에서 계정 연동 |
| 시니어 사용자 PWA 설치 어려움 | 높음 | 중간 | 단계별 스크린샷 포함한 설치 가이드 모달 구현 (T-59) |
| ODsay 응답 구조 변경 | 낮음 | 중간 | Route Handler 내 파싱 로직 집중화 → 변경 시 1개 파일만 수정 |
| Supabase 무료 티어 한도 초과 | 낮음 | 낮음 | 1인 사용자 기준 무료 티어(500MB DB, 월 50만 API 호출) 충분 |

---

## 성공 지표

| 지표 | 측정 방법 | 목표 |
|------|-----------|------|
| 실사용자 자발적 사용 지속 | 1주일 이상 매일 앱 실행 여부 | 달성 |
| 아침 출발 정보 확인 소요 시간 | 앱 실행부터 타이머 표시까지 | 10초 이내 |
| 실시간 도착 정보 정상 표시율 | 아침 사용 시간대 기준 성공/실패 횟수 | 90% 이상 |
| ODsay 일일 한도 소진 없이 운영 | Vercel 로그 또는 ODsay 대시보드 | 달성 |
| LCP | Vercel Analytics 또는 Lighthouse | 3초 이하 (4G) |
| Supabase 스케줄 조회 응답 시간 | Supabase 대시보드 | 200ms 이하 |
