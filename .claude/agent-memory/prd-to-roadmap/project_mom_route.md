---
name: Mom's Route 프로젝트 컨텍스트
description: commute-assistant 프로젝트(Mom's Route)의 목적, PRD 버전, 핵심 기술 결정사항
type: project
---

Mom's Route는 요일마다 출근지가 다른 5060 시니어(어머니)를 위한 자동 출퇴근 안내 PWA.

**Why:** 매일 아침 지도 앱을 수동으로 검색하는 불편 해소. 1인 개발.

**현재 PRD 버전**: v1.4 (2026-03-16 최종 확정, `docs/PRD.md`)
**ROADMAP 버전**: v1.0 (2026-03-16 생성, `docs/ROADMAP.md`)

**핵심 기술 결정사항 (변경 시 PRD 재확인 필요)**:
- ODsay 단일 API 체계: 경로 탐색 + 실시간 도착 모두 ODsay (카카오 대중교통 API 제외)
- 1,000건/일 통합 한도 (Day 1 V-04 검증으로 재확인 필요)
- `SIGNED_OUT` 이벤트에만 `signInAnonymously()` 재호출 (`TOKEN_REFRESHED` 제외)
- `commute_traffic_type = NULL`이면 실시간 폴링 시작 안 함
- `overrides.route_cached_at`은 당일 중복 탐색 방지 목적(7일 장기 캐시 아님)
- 시간만 오버라이드 시 `overrides.return_*`은 NULL 유지 → 퇴근 모드에서 `schedules.return_*` 재활용
- 모든 시간 비교는 KST 기준, `date-fns-tz` 권장

**How to apply:** 이 프로젝트에서 인증, API 한도, 오버라이드 캐시 로직 관련 작업 시 위 결정사항을 우선 참조할 것.
