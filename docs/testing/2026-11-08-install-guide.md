# npm 설치 안내 페이지 검증

검증일: 2026-11-08. 실제 학생 정보 없이 공개 학교 정보만 사용했다.

## 변경 범위

- GitHub Pages의 Grok 전용 안내를 Codex·Claude Code·Hermes npm 안내로 대체했다.
- 설치 전 준비, 도우미별 명령·복사·연결 확인, 학교·문서 선택, 성취기준 2개 이상 조합, 교사 검토 순서로 구성했다.
- npm 로그인이나 개인 API 키가 필요 없다는 점과 AI 도우미 자체의 이용 권한·요금은 별개임을 구분했다.
- 공개 HTTPS MCP·OCR·나이스 자동 입력은 지원한다고 표시하지 않았다.
- README에서 이전 Grok 버튼 설명을 제거하고 새 안내로 연결했다. MCP 실행 코드와 npm 0.1.0 배포 파일은 변경하지 않았다.

## 클라이언트 검증

- **Codex CLI:** 임시 실행 설정으로 공개 npm 0.1.0을 연결했다. 실제 find_school 호출이 성공했고 안양시 동안구 평촌초등학교 후보가 반환됐다. 사용자 기존 MCP 설정은 수정하지 않았다.
- **Claude Code:** 별도 임시 사용자 설정 디렉터리에 문서의 명령으로 등록했다. `claude mcp get evalso`에서 `Connected`를 확인했다. 모델 실행은 `Not logged in`으로 중단됐으므로 Claude의 평어 생성까지 검증한 것은 아니다.
- **Hermes:** [npm 릴리스 검증 기록](2026-11-08-npm-release.md)의 활성 프로필 연결 및 공개 평가계획·기준 2개·합성 초안 테스트를 연결했다. 이번 문서 변경에서 모델 실행을 반복하지 않았다.
- 현재 활성 프로필의 연결 검사도 소스 저장소 밖 `/tmp`에서 다시 실행해 802ms 연결과 도구 4개 발견을 확인했다. Evalso 소스 저장소 안에서 실행하면 npm이 현재 패키지를 먼저 찾아 `evalso-mcp: command not found`로 실패하는 개발 체크아웃 특이 사항을 재현했다. 일반 npm 사용자는 소스 코드를 내려받을 필요가 없으며, 소스를 받은 사용자는 저장소 밖에서 도우미를 실행하거나 README의 로컬 실행 파일 경로를 사용해야 한다.
- 공개 npm 레지스트리의 version=0.1.0, SHA-1=5f756444e1cd670fd04846186adb3ff877155a22를 다시 확인했다.

## 화면·기능

- 1440px 데스크톱과 390px 모바일 전체 화면을 직접 확인했다. 320px에서도 가로 넘침이 없었다.
- 도우미 탭 3개와 키보드 Home 이동, 명령 복사 성공, 복사 거부 시 직접 복사 입력창을 확인했다.
- JavaScript 비활성화 상태에서도 설치 명령 3개가 모두 표시됐다.
- 타입 검사, 빌드, JavaScript 구문 검사, 자동 테스트 6개, git diff 공백 검사를 통과했다. 별도 lint 스크립트는 없다.

## 구조화 데이터

- WebSite, WebPage, TechArticle, SoftwareSourceCode, BreadcrumbList로 실제 페이지를 표현했다. 제목·설명·섹션·버전·수정일을 화면 및 package.json과 대조하는 회귀 테스트를 추가했다.
- Schema.org Validator 코드 스니펫 검사: 오류 0개, 경고 0개. WebPage·WebSite 두 루트 아래 참조된 문서·소스·탐색 경로를 포함한다.
- Google Rich Results Test 코드 검사에서 글·탐색경로 유효 항목 2개를 확인했다. 최초 검사의 글 권장 경고 4개는 실제 작성 주체, 화면에 있는 브랜드 이미지, 시간대를 포함한 수정 시각으로 보완했다.
- 보완 후 [Google 재검사 결과](https://search.google.com/test/rich-results/result?id=DECY-U2s8omMwDgpp7Q_Dw)에서 글·탐색경로 유효 항목 2개와 경고 없는 요약을 확인했다. 결과 링크의 장기 보존은 보장하지 않는다.
- 임의 평점·리뷰·사용량 수치는 넣지 않았다. Schema.org 유효성과 Google 검색 노출 여부는 다르며 리치 결과 노출을 보장하지 않는다.

## 디자인 참고

번호형 설치 단계, 실행 명령, 연결 확인 순서를 참고했다. 레퍼런스 이미지를 사이트 자산으로 복제하지 않았다.

- [WorkOS 시작 흐름](https://mobbin.com/screens/c749cd26-3c7c-4c16-a9c8-10a81fc60747)
- [Sentry 설정 흐름](https://mobbin.com/screens/7a789a86-3bf1-436c-9304-a9df311f1082)

## 공개 페이지

GitHub Pages가 커밋 546ce6d를 built로 완료한 뒤 [공개 안내](https://reallygood83.github.io/evalso-mcp/)의 제목·Hermes 명령·작성 주체·수정 시각을 브라우저에서 확인했다. HTML, CSS, JavaScript, 브랜드 이미지 2개, sitemap.xml이 모두 HTTP 200으로 응답했다.

배포된 공개 URL을 Schema.org Validator의 URL 가져오기로 다시 검사했다. 오류 0개, 경고 0개였다. 코드 스니펫 검사뿐 아니라 공개 페이지를 대상으로 확인한 결과다.

## 남은 검증 경계

Claude 모델 로그인 후 실제 평어 생성, Windows 실기기, Grok Bot 연결, 해외 접속 및 OCR은 이번 검증에 포함하지 않았다. 인증 정보나 전체 대화 로그는 저장소에 올리지 않았다.
