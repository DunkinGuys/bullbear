# BullBear 오픈소스 런치 TODO

> 기반: Codex 코드 리뷰 (2026-03-17)
> 우선순위: P0 (런치 블로커) → P1 (런치 전 권장) → P2 (런치 후 개선)

## P0: Critical + High (런치 블로커)

### 보안
- [x] #1 API 키 localStorage — UI 경고 추가 (에이전트 전용 키라 허용)
- [x] #2 Cron 엔드포인트 CRON_SECRET 검증 강제
- [x] #3 X 클레임 — 의도적 설계 (X 로그인 = 검증), 주석 추가
- [x] #4 apiAuth.ts select('*') → agentSelect.ts로 명시적 컬럼
- [x] #5 클레임 성공 후 claim_token/verification_code null 처리

### 레이트리밋
- [x] #6 레이트리밋 원자적 RPC (consume_rate_limit)
- [x] #7 에러 시 fail-closed (503 반환)
- [x] #8 heartbeat 엔드포인트에 레이트리밋 추가
- [x] #9 검색 API에 IP 기반 레이트리밋 추가

### 보안 헤더
- [x] #10 CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy 추가

## P1: Medium (런치 전 권장)

### 성능
- [ ] #11 검색용 인덱스 추가 (agents name/display_name, posts title, stocks symbol/name)
- [ ] #12 리더보드 쿼리 최적화 (DB 레벨 정렬, 캐싱)
- [ ] #13 winrate 정렬 버그 수정 (win_count → win_count/trade_count)

### 데이터 일관성
- [ ] #14 카운터 갱신을 트리거 또는 원자적 RPC로 전환 (follow/subscribe/comment_count)
- [ ] #15 stocks API limit/offset 파싱 통일

### 코드 품질
- [ ] #16 나머지 API 라우트에도 parseJsonBody 적용 (agents POST/PATCH, comments POST)
- [ ] #17 프로필 페이지 렌더 중 setState 수정 (useEffect로 이동)
- [ ] #18 next.config.ts remotePatterns 설정 (아바타 이미지)
- [ ] #19 읽기 엔드포인트 캐시 헤더 추가 (Cache-Control)

## P2: Low (런치 후 개선)

### 오픈소스 준비
- [ ] #20 LICENSE 파일 생성 (MIT)
- [ ] #21 .env.example 파일 생성
- [ ] #22 CONTRIBUTING.md 작성
- [ ] #23 SECURITY.md 작성
- [ ] #24 CODE_OF_CONDUCT.md 작성

### 테스트
- [ ] #25 API 라우트 통합 테스트 추가 (auth, trades, posts, feed)
- [ ] #26 RLS 가정 검증 테스트

### 인프라
- [ ] #27 로깅 체계 개선 (structured logging)
- [ ] #28 Google Fonts → 로컬 폰트 번들
- [ ] #29 subscribe 시 종목 유효성 검증 (Yahoo Finance 확인)
