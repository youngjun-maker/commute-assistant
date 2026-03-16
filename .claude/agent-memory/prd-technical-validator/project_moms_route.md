---
name: Mom's Route 프로젝트 컨텍스트
description: Mom's Route PWA PRD 검증에서 발견된 핵심 결정 사항 및 미해결 이슈 (v1.4 기준)
type: project
---

Mom's Route는 요일별 출근지가 다른 시니어(5060)를 위한 자동 출퇴근 안내 PWA.
v1.0 PRD가 2026-03-15에 초안 작성 → v1.4로 업데이트 (2026-03-16).

**v1.3 이전 Critical 이슈 → v1.4에서 해소 확인**

- C-1: 홈 주소 좌표 누락 → `user_settings.home_lat/home_lng` 컬럼 추가로 해소
- C-2: 교통 수단 타입 컬럼 부재 → `schedules.commute_traffic_type SMALLINT` 추가로 해소
- C-3: ODsay startID ↔ 공공데이터포털 stId 불일치 → ODsay 단일 API 체계로 전환(공공데이터포털 제거)으로 해소
- C-4 (v1.3): 익명 세션 만료 + 30초 폴링 충돌 → 섹션 4-5에 onAuthStateChange 리스너 + 폴링 중단/재개 로직 상세 명세로 해소

**v1.4 최종 픽스 후 해소된 이슈**

1. PRD 구조 결함(4-5 헤더/본문 분리) → v1.4 최종 픽스에서 4-5에 본문 4개 항목 포함으로 해소 확인 (2026-03-16 검증)
2. `overrides.route_cached_at` 용도 미정의 → "당일 중복 탐색 방지 + Audit 목적"으로 명시, 5-4 주석 + 5-6 원칙 테이블 양쪽 반영으로 해소 확인
3. `commute_start_hour` / `commute_end_hour` KST 주석 → 컬럼 인라인 주석으로 반영 확인

**v1.4 최종 픽스 후 신규 발견된 Major 이슈**

1. `4-5` TOKEN_REFRESHED 이벤트 시 signInAnonymously() 재호출: TOKEN_REFRESHED는 토큰 갱신 성공 이벤트이므로 이 시점에 signInAnonymously() 재호출은 불필요하며 새 user_id 생성 위험. SIGNED_OUT 이벤트만으로 제한해야 함. 코드 한 줄 수정으로 해소 가능.

**v1.4 미해결 Major 이슈**

- ODsay `lane[0].arsID` 필드 경로 오류 가능성: 실제 응답에서 `arsID`는 `subPath[n]` 레벨 직속일 가능성. Week 1 Day 1 실제 확인 필수. 잘못된 경우 `commute_ars_id = undefined` → 버스 실시간 기능 무력화.
- `SUPABASE_SERVICE_ROLE_KEY` 환경변수가 사용 위치 없이 포함되어 있음. RLS 우회 가능한 키이므로 불필요하면 제거 권장.
- `odsay_route_cache.info.totalTime` JSONB 접근 경로가 PRD에 명시 안 됨 → 타이머 계산 오류 가능. Week 1 ODsay 응답 확인 시 함께 검증 필요.
- Supabase 무료 티어 7일 비활성 자동 정지 미언급: 재가동 시 수십 초 지연 → LCP 3초 위반. Week 5 배포 시 UptimeRobot 핑 설정 필요.
- 신규 사용자 최초 진입 플로우 미명세: `user_settings` 없을 때 앱이 설정 화면으로 이동하는 로직 없음.
- 퇴근 모드 타이머 동작 여부 미정의.
- 성공 지표 "실시간 정보 성공률 90%" 측정 방법 없음.

**v1.4 아키텍처 핵심 구조 (확정)**

- ODsay `searchPubTransPathT` → `lane[0].arsID`(버스, TBD) 또는 `startName`(지하철) 추출 → DB 캐시 (7일)
- commute_traffic_type(1=지하철, 2=버스)으로 실시간 API 분기
- ODsay `realtimeStation`(버스) / `realtimeSubway`(지하철) → 30초 폴링 (React Query refetchInterval)
- Route Handler 프록시: `/api/kakao/address`, `/api/odsay/route`, `/api/transit/arrival`
- Anonymous Auth 세션 복구: onAuthStateChange → signInAnonymously() 자동 재호출

**기술 스택 주의사항 (v1.4 기준)**

- ODsay arsID 필드 경로: Week 1 Day 1 실제 응답 JSON 확인 전까지 TBD
- `odsay_route_cache` JSONB에서 totalTime 접근 경로: `cache.info.totalTime`으로 추정, Week 1 확인 필수
- Route Handler `arsId` → ODsay `stationID` 파라미터 매핑은 구현자 책임 (PRD에 미명세)
- SUPABASE_SERVICE_ROLE_KEY: 사용 여부 결정 전 환경변수에서 보류
- Supabase 무료 티어 자동 정지: UptimeRobot 등으로 ping 설정 권고 (배포 체크리스트)
- iOS PWA: Phase 2 Push 알림은 홈 화면 추가 완료 여부에 의존
- Serwist + force-dynamic Route Handler: SW 캐시 범위에서 실시간 API 제외 설정 필요

**개발 로드맵 (v1.4)**

Week 1 Day 1 (최우선): ODsay 실제 응답 JSON → arsID 필드 경로 + totalTime 경로 확인, ODsay 한도 통합 여부 확인
Week 1: Supabase 스키마, Anonymous Auth, Route Handler 프록시 3개 구축. overrides.route_cached_at 정책 결정 후 스키마 적용.
Week 2: 스케줄 등록 화면, 카카오 주소 검색, /setup 페이지
Week 3: 메인 화면 — ODsay 캐시 로직 + 실시간 30초 갱신
Week 4: 퇴근 모드 + 오버라이드 + Fallback UI
Week 5: PWA(Serwist) + 배포 + UptimeRobot 핑 설정 + 시니어 UI 검증

**v1.4 최종 픽스본 검증 점수: 8.0/10 (개발 준비 상태: Major 1건 수정 후 착수 가능)**

**Why:** 이전 Critical 3건은 모두 해소되었으나, 4-5에서 TOKEN_REFRESHED 이벤트 시 signInAnonymously() 재호출이 신규 Major 이슈로 발견됨. 텍스트 1건 수정(SIGNED_OUT만 유지) 후 착수 가능.

**How to apply:** 4-5에서 "SIGNED_OUT 또는 TOKEN_REFRESHED" → "SIGNED_OUT만" 수정 필수. Week 1 Day 1 ODsay 확인 시 arsID 경로와 totalTime 경로 모두 함께 검증.
