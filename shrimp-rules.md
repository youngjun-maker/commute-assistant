# Development Guidelines — Mom's Route

## 1. Project Overview

- **목적**: 요일마다 출근지가 달라지는 5060 시니어를 위한 요일별 스케줄 기반 자동 출퇴근 안내 PWA
- **스택**: Next.js v15 (App Router) · TailwindCSS v4 · shadcn/ui · Supabase (Anonymous Auth + PostgreSQL) · TanStack Query · Serwist · date-fns-tz
- **배포**: Vercel
- **인증**: Supabase Anonymous Auth (로그인 UI 없음, 익명 user_id 자동 발급)
- **외부 API**: ODsay (경로 탐색 + 실시간 도착), 카카오 로컬 API (주소 검색)

---

## 2. Directory Structure

목표 구조 — 파일 생성 시 아래 위치를 기준으로 한다.

```
app/
  layout.tsx                     # onAuthStateChange 리스너 또는 최상위 Provider
  page.tsx                       # 메인 화면 (출근/퇴근 모드 자동 전환)
  setup/page.tsx                 # 집 주소 + 요일별 스케줄 등록/수정
  override/page.tsx              # 오늘만 변경 화면
  api/
    kakao/address/route.ts       # 카카오 주소 검색 프록시
    odsay/route/route.ts         # ODsay 경로 탐색 프록시
    transit/arrival/route.ts     # ODsay 실시간 도착 프록시 (버스/지하철 분기)
components/
  ui/                            # shadcn/ui 컴포넌트 (수동 편집 금지)
  commute/
    DepartureTimer.tsx           # 출발 카운트다운 타이머
    TransitInfo.tsx              # 실시간 도착 정보 (버스/지하철 분기 렌더링)
    ModeHeader.tsx               # 출근/퇴근 모드 헤더
  schedule/
    DaySelector.tsx              # 월~금 요일 선택 + is_active 토글
    AddressSearch.tsx            # 카카오 주소 검색 컴포넌트
    TimeInput.tsx                # HH:MM 시간 입력 피커
  providers/
    theme-provider.tsx           # next-themes ThemeProvider (기존)
  layout/
    theme-toggle.tsx             # 다크모드 토글 (기존)
hooks/
  useSchedule.ts                 # overrides 우선 → schedules 조회, ODsay 캐시 유효성 검사
  useTransitInfo.ts              # 30초 refetchInterval, retry: 1, 연속 3회 에러 시 폴링 중지
  useDepartureTimer.ts           # arrival_time - totalTime - buffer_minutes 역산, 1분 카운트다운
lib/
  utils.ts                       # cn() 유틸리티 (기존)
  supabase/
    client.ts                    # 브라우저용 Supabase 클라이언트
    server.ts                    # 서버용 Supabase 클라이언트
  kakao.ts                       # /api/kakao/address 호출 함수 (디바운스 포함)
  odsay.ts                       # /api/odsay/route 호출 + 캐시 유효성 검사 + Supabase 업데이트
  transit.ts                     # /api/transit/arrival 호출 + 응답 정규화
  mock/
    transitMock.ts               # ODsay 응답과 동일한 인터페이스의 Mock Data
public/
  manifest.json
  icons/                         # 192x192, 512x512 PNG
```

---

## 3. Import Aliases

- `@/components` → `./components`
- `@/lib` → `./lib`
- `@/ui` → `./components/ui`
- `@/hooks` → `./hooks`
- 새 별칭 추가 시 `tsconfig.json` + `components.json` 모두 수정

---

## 4. API Proxy Rules

### ⛔ 절대 금지

- 클라이언트 컴포넌트 또는 훅에서 ODsay API, 카카오 API를 직접 `fetch` 호출 금지
- `KAKAO_REST_API_KEY`, `ODSAY_API_KEY`를 클라이언트 번들(`NEXT_PUBLIC_` 포함)에 노출 금지

### ✅ 필수

- 모든 외부 API 호출은 반드시 `app/api/` Route Handler를 경유
- API 키는 `process.env.KAKAO_REST_API_KEY`, `process.env.ODSAY_API_KEY`로만 서버에서 참조

### Route Handler 공통 규칙

모든 Route Handler에 아래 두 줄 필수 적용:

```typescript
export const dynamic = 'force-dynamic';
// fetch 시: signal: AbortSignal.timeout(5000)
```

---

## 5. ODsay API Quota Protection (1,000건/일 통합 한도)

### ⛔ 절대 금지

- `odsay_route_cache`가 유효한 상태에서 ODsay 경로 탐색 API 재호출
- UI 개발(핫리로딩) 중 실제 `useTransitInfo` 훅 직접 연결
- `commute_traffic_type = NULL`인 상태에서 실시간 도착 폴링 시작

### ✅ 필수 순서 — UI 컴포넌트 개발 시

1. `lib/mock/transitMock.ts`의 Mock Data를 prop으로 주입하여 UI/CSS 100% 완성
2. UI 완성 후 마지막 단계에서만 실제 훅(`useTransitInfo`, `useDepartureTimer`)으로 교체

적용 대상 컴포넌트: `DepartureTimer.tsx`, `TransitInfo.tsx`, 퇴근 모드 레이아웃

### ODsay 경로 탐색 캐시 유효성 검사 (lib/odsay.ts 내부)

```
IF schedules.odsay_route_cache IS NULL
   OR schedules.route_cached_at < NOW() - INTERVAL '7 days'
THEN ODsay 호출 (1회)
ELSE 기존 캐시 반환 (ODsay 미호출)
```

### Mock Data 인터페이스 요구사항

`lib/mock/transitMock.ts`의 필드명은 실제 ODsay 응답 필드명과 100% 일치해야 한다:
- 버스: `routeNm`, `predictTime1`, `predictTime2`, `locationNo1`, `locationNo2`, `stationNm`
- 지하철: `lineName`, `destNm`, `trainSttus`, `barvlDt`(초 단위), `subwayNm`
- 경로 캐시: `info.totalTime`(분 단위)

---

## 6. Supabase Rules

### Anonymous Auth 세션 관리

```typescript
// ✅ 올바른 패턴
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    supabase.auth.signInAnonymously(); // SIGNED_OUT에만 재호출
  }
  // TOKEN_REFRESHED는 처리 금지 — 재호출 시 새 user_id 생성으로 기존 데이터 연결 끊김
});

// ⛔ 금지 패턴
supabase.auth.onAuthStateChange((event) => {
  supabase.auth.signInAnonymously(); // 모든 이벤트에서 재호출 절대 금지
});
```

### commute_traffic_type = NULL 처리

- `commute_traffic_type = NULL`: ODsay 탐색 전 상태
- 이 상태에서 `useTransitInfo` 폴링 시작 금지
- UI: "경로를 탐색 중입니다" 표시

### overrides 우선순위

`useSchedule.ts`에서 데이터 조회 순서:
1. `overrides` 테이블에서 오늘 KST 날짜로 조회
2. 없으면 `schedules` 테이블에서 오늘 KST 요일로 조회

### overrides.route_cached_at 사용 원칙

- 장기 캐시 아님. **당일 중복 탐색 방지 + Audit 목적**만
- `route_cached_at`이 당일(`CURRENT_DATE KST`)이면 ODsay 재탐색 건너뜀

### RLS 정책 (모든 테이블 필수)

```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 데이터만 접근 가능" ON {table}
  FOR ALL USING (auth.uid() = user_id);
```

---

## 7. TailwindCSS v4 Configuration

### ⛔ 금지

- `tailwind.config.ts` / `tailwind.config.js` 파일 생성 또는 편집
- `@layer utilities` / `@layer components` 없이 커스텀 스타일 추가

### ✅ 필수

- 새 색상/토큰 추가: `app/globals.css`의 `:root` 및 `.dark` 블록에 CSS 변수로 추가
- 커스텀 다크 모드: `@custom-variant dark (&:is(.dark *))` — 이미 설정됨, 수정 금지
- 색상 시스템: OKLCH 값 사용

```css
/* ✅ 올바른 위치 — app/globals.css */
@theme inline {
  --color-new-token: oklch(0.5 0.1 200);
}
```

---

## 8. shadcn/ui Rules

### ✅ 컴포넌트 추가

```bash
npx shadcn@latest add [component-name]
```

### ⛔ 금지

- `components/ui/` 파일 직접 수동 편집 (업스트림 업데이트 충돌 방지)
- shadcn 설치 중 `tailwind.config` 수정 옵션 선택 금지 (v4는 CSS 기반)

---

## 9. Time / Timezone Rules

### ⛔ 금지

- `new Date().getHours()` 직접 사용 (서버 UTC와 불일치)
- `arrival_time`, `commute_start_hour`, `commute_end_hour` 비교 시 UTC 기준 사용

### ✅ 필수

- 모든 시간 비교는 KST (Asia/Seoul, UTC+9) 기준
- `date-fns-tz` 사용: `toZonedTime(date, 'Asia/Seoul')`, `format(..., { timeZone: 'Asia/Seoul' })`
- KST 유틸리티는 `lib/utils.ts`에 `toKST()`, `getKSTHour()`, `getKSTDate()` 구현
- `override_date`(DATE): KST 기준 날짜로 저장 및 비교
- 출발 타이머 계산 공식: `arrival_time(KST) - odsay_route_cache.info.totalTime(분) - buffer_minutes`

---

## 10. Polling & Error Handling (useTransitInfo)

### ✅ 필수 설정

```typescript
useQuery({
  refetchInterval: 30000,  // 30초
  retry: 1,                // 즉각 재시도 1회만
})
```

### 연속 3회 에러 처리

- 연속 3회 에러 → 폴링 중지 + "네트워크 오류" 안내 표시
- `visibilitychange` 이벤트 또는 앱 포어그라운드 복귀 시 폴링 재개
- 세션 복구 중 폴링 일시 중단, 세션 복구 완료 후 재개

---

## 11. Senior UX Requirements

모든 UI 컴포넌트에 아래 기준을 적용한다.

| 항목 | 기준 |
|------|------|
| 본문 폰트 | `text-lg`(18px) 이상, `rem` 단위 사용 |
| 핵심 정보(타이머, 목적지) | `text-4xl`(32px 이상) |
| 터치 타겟 | `min-h-[48px] min-w-[48px]` |
| 색상 대비 | WCAG AA (명암비 4.5:1 이상) |
| 텍스트 | 영어 약어 금지, 한국어 풀어쓰기 ("버스 도착까지 3분") |
| 한 화면 정보량 | 최대 3개 주요 정보, 스크롤 최소화 |
| aria-label | 버튼, 입력 필드, 상태 표시 요소에 필수 |
| 하단 탭 바 | **사용 금지** — 단일 화면 기반 흐름 유지 |

---

## 12. Route Handler Implementations

### /api/kakao/address/route.ts

```
Method: GET ?query={검색어}
외부: GET https://dapi.kakao.com/v2/local/search/address.json
키: process.env.KAKAO_REST_API_KEY (Authorization: KakaoAK {key})
반환 필드: place_name, address_name, x(lng), y(lat)
```

### /api/odsay/route/route.ts

```
Method: POST { sx, sy, ex, ey }
외부: GET https://api.odsay.com/v1/api/searchPubTransPathT
키: process.env.ODSAY_API_KEY
캐시 검사: Route Handler 호출 전 lib/odsay.ts에서 수행
반환: { traffic_type, ars_id, bus_no, station_name, subway_line, stop_id, route_id, total_time, full_cache }
```

### /api/transit/arrival/route.ts

```
Method: GET ?type=bus&arsId=&busNo=  또는  ?type=subway&stationName=&line=
버스 외부: GET https://api.odsay.com/v1/api/realtimeStation (stationID={arsId})
지하철 외부: GET https://api.odsay.com/v1/api/realtimeSubway (stationName={stationName})
키: process.env.ODSAY_API_KEY
```

---

## 13. ODsay Response → DB Field Mapping

### 버스 구간 (trafficType = 2)

| ODsay 응답 | DB 컬럼 |
|-----------|---------|
| `subPath[n].lane[0].arsID` | `commute_ars_id` |
| `subPath[n].lane[0].busNo` | `commute_bus_no` |
| `2` | `commute_traffic_type` |
| `subPath[n].startID` | `commute_stop_id` (참고용) |
| `subPath[n].lane[0].busID` | `commute_route_id` (참고용) |

### 지하철 구간 (trafficType = 1)

| ODsay 응답 | DB 컬럼 |
|-----------|---------|
| `subPath[n].startName` | `commute_station_name` |
| `subPath[n].lane[0].name` | `commute_subway_line` |
| `1` | `commute_traffic_type` |
| `subPath[n].startID` | `commute_stop_id` (참고용) |

### 공통

| ODsay 응답 | DB 컬럼 |
|-----------|---------|
| `path[0]` 전체 JSON | `odsay_route_cache` |
| 현재 시각 | `route_cached_at` |
| `path[0].info.totalTime` | 타이머 계산용 (분 단위) |

퇴근 방향: SX/SY = 직장 좌표, EX/EY = 집 좌표로 반전 → `return_*` 컬럼에 동일 구조로 저장

---

## 14. Key File Interactions

| 파일 변경 시 | 함께 확인/수정 필요한 파일 |
|-------------|--------------------------|
| `app/api/odsay/route/route.ts` 응답 구조 변경 | `lib/odsay.ts`, `lib/mock/transitMock.ts` |
| `app/api/transit/arrival/route.ts` 응답 구조 변경 | `lib/transit.ts`, `lib/mock/transitMock.ts`, `hooks/useTransitInfo.ts` |
| Supabase `schedules` 스키마 변경 | `hooks/useSchedule.ts`, `lib/odsay.ts`, `hooks/useDepartureTimer.ts` |
| Supabase `overrides` 스키마 변경 | `hooks/useSchedule.ts`, `app/override/page.tsx` |
| `lib/mock/transitMock.ts` 필드 변경 | `components/commute/TransitInfo.tsx`, `components/commute/DepartureTimer.tsx` |
| `app/globals.css` @theme 변경 | shadcn/ui 컴포넌트가 해당 변수를 참조하는지 확인 |

---

## 15. Prohibited Actions

- **카카오 대중교통 경로 API 사용 금지** — B2B 전용. 반드시 ODsay로 대체
- **GPS/실시간 위치 추적 코드 추가 금지** — 집 주소 고정 좌표만 출발지로 사용
- **`tailwind.config.ts` 생성 또는 편집 금지** — TailwindCSS v4 CSS 기반 설정
- **`TOKEN_REFRESHED` 이벤트에서 `signInAnonymously()` 호출 금지**
- **ODsay 캐시 유효 시 경로 탐색 API 재호출 금지**
- **UI 컴포넌트 개발 중 실제 ODsay 훅 직접 연결 금지** — Mock Data 우선
- **`components/ui/` 직접 편집 금지** — `npx shadcn@latest add`로만 추가
- **하단 탭 바 네비게이션 구현 금지**
- **소셜 로그인(Google/Kakao 계정 연동) UI 구현 금지** — Anonymous Auth로 충분
- **날씨 API 연동 금지** — Phase 1 범위 외
- **자가용/택시 경로 기능 추가 금지** — 대중교통 전용
