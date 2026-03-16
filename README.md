# 출퇴근 안내 (Mom's Route)

요일마다 출근지가 달라 매번 지도 앱을 새로 검색해야 하는 5060 시니어를 위한, 요일별 스케줄 기반 자동 출퇴근 안내 PWA.

## 프로젝트 개요

**목적**: 요일별 출근지와 목표 도착 시간을 한 번 등록하면, 매일 앱을 켰을 때 "오늘 어디로, 몇 분 뒤에 출발" 정보를 큰 글씨로 즉시 제공

**대상 사용자**: 요일마다 근무지가 다른 5060 시니어

**핵심 설계 원칙**:
- 단일 화면 기반 흐름 (하단 탭 바 없음)
- 본문 18px 이상, 핵심 정보 32px 이상, 터치 타겟 48x48px 이상
- 익명 인증 (Supabase Anonymous Auth, 로그인 UI 없음)
- PWA (홈 화면 설치, 오프라인 대응)

## 주요 화면

1. **메인 화면** (`/`) - 오늘 요일 스케줄 자동 로드, 실시간 대중교통 도착 정보, 출발 카운트다운 타이머
2. **설정 화면** (`/setup`) - 집 주소 등록, 요일별 출근 스케줄 등록/수정
3. **오늘만 변경** (`/override`) - 당일 임시 스케줄 변경 (다음날 자동 복원)

## 핵심 기능

- 요일별 출근지 자동 전환 (ODsay API로 최적 경로 자동 탐색 후 7일 캐시)
- ODsay 실시간 도착 정보 30초마다 자동 갱신 (버스/지하철 분기)
- 출발 카운트다운 타이머 (`도착목표시간 - 소요시간 - 여유시간` 역산)
- 오후 자동 퇴근 모드 전환
- 당일 임시 스케줄 오버라이드

## 기술 스택

- **Framework**: Next.js v15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 (CSS 기반 설정, `tailwind.config` 없음)
- **UI Components**: shadcn/ui
- **Backend / DB**: Supabase (PostgreSQL + Anonymous Auth + RLS)
- **State / Fetching**: TanStack Query (30초 `refetchInterval`, `retry: 1`)
- **PWA**: Serwist (next-pwa는 Next.js v15 App Router 미지원)
- **External APIs**: ODsay 대중교통 경로 + 실시간 도착, 카카오 로컬 주소 검색
- **Deploy**: Vercel

## 시작하기

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local에 Supabase, 카카오, ODsay 키 입력

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 개발 상태

- [x] 기본 프로젝트 구조 설정 (Next.js v15 + TailwindCSS v4 + shadcn/ui)
- [ ] Supabase 프로젝트 생성 및 스키마 적용
- [ ] Anonymous Auth + 세션 복구 리스너 구현
- [ ] Route Handler 프록시 3개 구축 (카카오 주소, ODsay 경로, ODsay 실시간)
- [ ] 설정 화면 (`/setup`) - 집 주소 및 요일별 스케줄 등록
- [ ] 메인 화면 - 출근 모드 (타이머 + 실시간 도착 정보)
- [ ] 메인 화면 - 퇴근 모드 자동 전환
- [ ] 오버라이드 화면 (`/override`)
- [ ] PWA 설정 (Serwist + manifest.json)
- [ ] Vercel 배포

## 문서

- [PRD 문서](./docs/PRD.md) - 상세 요구사항 (v1.4 확정)
- [개발 로드맵](./docs/ROADMAP.md) - 개발 계획
- [개발 가이드](./CLAUDE.md) - 아키텍처 및 개발 지침
