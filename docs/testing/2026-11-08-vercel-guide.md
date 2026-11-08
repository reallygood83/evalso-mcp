# Vercel 설치 안내 페이지 배포

검증일: 2026-11-08 KST.

## 배포 범위

- 공개 안내: https://evalso-mcp-guide.vercel.app/
- Vercel 프로젝트: moon-jungs-projects/evalso-mcp-guide.
- GitHub 저장소: reallygood83/evalso-mcp. 빌드 루트는 docs, 프레임워크는 Other, 설치·빌드 명령은 비우고 정적 파일을 제공한다.
- MCP API·Node 런타임·사용자 API 키를 배포하지 않는다. npm MCP 패키지 0.1.0의 실행 코드와 기능은 변경하지 않았다.
- docs/vercel.json에 정적 배포 설정과 기본 보안 헤더를 저장했다. 계정 연결 파일과 환경변수는 제외했다.
- 기존 GitHub Pages는 유지하되 canonical은 새 Vercel 주소를 가리킨다. 이전 테스트 기록의 URL은 당시 검증의 역사적 기록으로 유지했다.

## 디자인과 콘텐츠

기존 로고·색상·설치 명령·탭·복사·대화 예시·소셜 링크를 보존했다. 첫 화면에 도구의 역할과 연결 모델의 역할을 구분하고, 설치 뒤에 클라이언트별 검증 범위를 표시했다. 왼쪽 목차와 번호형 작성 단계, 명령 블록의 간격을 정리했다.

참고 화면의 단계별 설정·명령과 다음 단계 구분을 이발소의 문서 스타일로 적용했다. 앱 로고·예제 데이터·장식 이미지는 복제하지 않았다.

- [Sentry 설정 단계](https://mobbin.com/screens/45538895-3721-4674-ad3b-235e7e2d28ca)
- [Vercel 플러그인 설치 명령](https://mobbin.com/screens/d6205dc6-60f5-429f-824d-906c1f5751c5)

## SEO·AEO

- canonical, OG URL·이미지, Twitter 메타데이터, JSON-LD의 모든 페이지 식별자, 사이트맵, README 링크를 새 운영 주소로 맞췄다.
- robots.txt에서 공개 페이지 크롤링과 사이트맵을 안내한다. 테스트 기록은 Vercel 응답 헤더로 noindex 처리한다.
- 도구 정의와 대상 교사, 작성 주체, 비용·개인 키, Grok 지원 조건을 실제 지원 범위에 맞춰 바로 답하는 문장으로 정리했다. 핵심 설명과 FAQ는 JavaScript 없이도 HTML에 포함된다.
- TechArticle·SoftwareSourceCode·WebPage·WebSite·BreadcrumbList를 사용한다. 가짜 평점·사용량이나 검증되지 않은 호환성은 표시하지 않는다.
- Google은 AI 검색을 위한 별도 특수 스키마가 필요하지 않다고 안내한다. 검색 순위·AI 인용·리치 결과 노출 자체를 측정하거나 보장하지 않는다.
- 근거: [Google AI 기능 안내](https://developers.google.com/search/docs/appearance/ai-features).

## 검증

- 자동 테스트 8개, 타입 검사, 빌드, JavaScript 구문 검사, git diff 공백 검사.
- 320·390·768·1440px의 가로 넘침 없음. 데스크톱·모바일 스크린샷을 직접 확인했다.
- 운영 페이지의 클라이언트 탭 3개, 키보드 이동, 복사 성공과 복사 거부 시 대체 입력창을 확인했다.
- 운영 HTML·robots.txt·sitemap.xml·브랜드 이미지 HTTP 200. canonical 및 JSON-LD의 새 주소를 브라우저에서 확인했다.
- Schema.org Validator의 공개 URL 검사: 오류 0개, 경고 0개.
- Google Rich Results Test의 공개 URL 검사: 글·탐색경로 유효 항목 2개, 권장 항목 경고 없는 요약. [검사 결과](https://search.google.com/test/rich-results/result?id=ejhQJQ-kp-WoBG8Z4BoEKw). 검사 결과 URL의 장기 보존은 보장하지 않는다.

## 검증 경계

이번 작업은 안내 문서와 정적 배포다. Claude 모델 로그인·Windows·Grok 실제 실행·학교 문서 분석을 다시 검증한 것은 아니며, 클라이언트별 기존 검증 범위를 화면에 구분했다. 인증된 소셜 계정 내부 화면이나 검색 순위 변화도 검증 대상이 아니다.
