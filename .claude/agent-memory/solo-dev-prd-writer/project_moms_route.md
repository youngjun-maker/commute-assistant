---
name: Mom's Route 프로젝트 컨텍스트
description: commute-assistant 프로젝트의 핵심 목적, 타겟 유저, 기술 결정 사항 요약 (PRD v1.3 기준)
type: project
---

commute-assistant 프로젝트는 요일마다 출근지가 다른 5060 시니어(어머니)를 위한 출퇴근 안내 PWA임.

**핵심 결정 사항 (PRD v1.3, 2026-03-16 확정):**
- PRD 문서 위치: `docs/PRD.md`
- 인증: Supabase Anonymous Auth — 회원가입/로그인 UI 없이 앱 최초 접속 시 익명 세션(user_id) 자동 발급
- 백엔드: Supabase (PostgreSQL, RLS 활성화)
- 외부 API 구조: 모든 외부 API는 Next.js Route Handler 프록시(`/app/api/...`) 경유 필수 (CORS 방지, API 키 보호)
- 카카오 API: 주소 검색(로컬 API) 용도로만 사용. 대중교통 경로 API 완전 제거 (B2B 전용)
- ODsay API: 경로 탐색 전용. 앱 실행 시 조건부 1회 호출 (캐시 없거나 7일 만료 시에만). 일일 한도 1,000건이므로 반복 호출 절대 금지.
- 공공데이터포털: ODsay가 추출한 arsID(버스) 또는 역명(지하철)으로 실시간 도착 정보 30초 갱신 전담

**아키텍처 핵심 — ODsay + 공공데이터포털 2단계 구조 (v1.3):**
- 사용자는 출근지 이름/주소와 목표 도착 시간만 입력. 정류장 ID/노선 ID 직접 입력 없음.
- ODsay가 집 → 출근지 경로 탐색 후 trafficType에 따라 버스(arsID+busNo) 또는 지하철(startName+lane.name)을 schedules 테이블에 캐시 저장.
- 메인 화면에서는 commute_traffic_type에 따라 버스(arsID 기반) 또는 지하철(역명 기반) 공공데이터 API 30초 갱신.

**ID 매핑 전략 (v1.3 Critical 수정 — v1.2에서 변경됨):**
- v1.2의 commute_stop_id(ODsay startID), commute_route_id(ODsay busID)는 공공데이터 ID 체계와 불일치 → 실시간 API 에러 발생
- v1.3 신규: ODsay 응답에서 공공데이터 호환 ID 추출
  - 버스: subPath[n].lane[0].arsID → commute_ars_id (서울시 ARS 번호 = 공공데이터포털 stId)
  - 버스: subPath[n].lane[0].busNo → commute_bus_no (노선 번호)
  - 지하철: subPath[n].startName → commute_station_name (역명)
  - 지하철: subPath[n].lane[0].name → commute_subway_line (노선명)
- commute_stop_id, commute_route_id는 ODsay 내부 참고용으로만 보존 (실시간 API 호출에 사용하지 않음)

**DB 핵심 구조 (v1.3):**
- `user_settings`: home_address(TEXT NOT NULL), home_lat/home_lng(NUMERIC(10,7)) 추가. buffer_minutes, commute_start/end_hour 유지. RLS 정책 명시.
- `schedules`: commute_traffic_type SMALLINT(NULL=탐색전, 1=지하철, 2=버스) + commute_ars_id + commute_bus_no + commute_station_name + commute_subway_line 추가. 퇴근 방향 return_* 동일 구조. commute_stop_id/route_id는 참고용으로 유지. RLS 정책 명시.
- `overrides`: DDL 전체 명시됨. workplace_* NULL 허용 (NULL이면 schedules 값 사용). ODsay 재탐색 결과 컬럼 포함. RLS 정책 명시.

**공공데이터포털 버스 API 수정 (v1.3):**
- 엔드포인트: getArrInfoByStAll (노선 ID 불필요)
- 파라미터: stId={commute_ars_id}
- 응답에서 busRouteNm === commute_bus_no 필터링

**Route Handler 경로 (v1.3):**
- `/app/api/kakao/address/route.ts` — 카카오 로컬 API 프록시
- `/app/api/odsay/route/route.ts` — ODsay 경로 탐색 API 프록시
- `/app/api/transit/arrival/route.ts` — 공공데이터포털 실시간 도착 API 프록시 (type=bus|subway 분기)

**환경변수 (v1.3):**
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- KAKAO_REST_API_KEY, ODSAY_API_KEY, PUBLIC_DATA_API_KEY

**Why:** v1.2에서 ODsay startID/busID를 공공데이터 API에 그대로 사용하면 ID 체계 불일치로 실시간 도착 정보 조회 불가. v1.3에서 ODsay 응답의 arsID(버스) / 역명(지하철)으로 매핑 전략 전면 수정.
**How to apply:** schedules 테이블 작업 시 실시간 API 호출에는 commute_ars_id(버스) 또는 commute_station_name(지하철)만 사용. commute_stop_id/route_id는 참고용. commute_traffic_type이 NULL이면 폴링 시작하지 않음.
