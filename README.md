# SnapDeck

**웹페이지를, 한 장의 인사이트로.**

URL 목록 → 로컬 브라우저 캡처 → 편집 가능한 PowerPoint / Excel 보고서.

## 웹과 데스크톱

- **Vercel 웹 체험**: 한국어 캡처 스튜디오, URL 정리, 샘플 프로젝트, PNG/JPG 가져오기, PPTX/XLSX 다운로드, 기기별 보관함.
- **Electron 데스크톱**: 웹 기능 + 실제 URL 일괄 캡처 + OS 키체인으로 암호화된 로그인 세션.
- 캡처 엔진은 PC에서 실행됩니다. URL, 로그인 쿠키, 캡처 이미지를 SnapDeck 서버에 업로드하지 않습니다. 대상 사이트에는 정상적인 웹 접속이 이루어집니다.

## 구현 기능

- TXT / CSV / XLSX 첫 번째 열에서 URL 가져오기, 붙여넣기, 파일 드롭, 중복 제거 및 프로토콜 검사
- 프로젝트당 최대 300개 URL, 동시 작업 기본 3개 (엔진 최대 6개)
- 데스크톱 1920×1080, 노트북 1440×900, 태블릿 820×1180, 모바일 393×852
- 첫 화면 / 전체 페이지 / CSS 선택자 캡처
- 알려진 쿠키 동의 배너·채팅 위젯 숨기기, 네트워크·폰트 대기, 제한된 지연 로딩 스크롤
- URL별 25초 타임아웃, 실패 원인 표시, 중지 후 완료 결과 유지, 실패 항목 재시도
- 제목·URL·촬영 일시·HTTP 상태·메모 보관
- PPTX: 1 / 2 / 4개 비교 슬라이드, 16:9, 이미지 비율 유지, 클릭 가능한 URL
- XLSX: 이미지 임베드, 클릭 가능한 URL, 필터와 헤더 고정
- IndexedDB에 프로젝트 저장/복원, 개별 이미지 다운로드
- 세션 금고: 격리된 로그인 창, 쿠키·대상 origin의 localStorage를 OS 암호화 저장, 동일 origin에만 적용

## 데스크톱 실행

Node.js 22 LTS 이상과 Google Chrome이 필요합니다. Playwright Chromium이 설치되어 있다면 해당 브라우저를 먼저 사용합니다. 개인 Chrome 프로필은 사용하지 않습니다.

```bash
git clone https://github.com/Noah0615/webcapture.git
cd webcapture
npm ci
npm run desktop
```

Chrome 없이 실행하려면:

```bash
npx playwright install chromium
npm run desktop
```

설치본은 [GitHub Releases](https://github.com/Noah0615/webcapture/releases)에서 확인할 수 있습니다. 태그 릴리스 워크플로가 macOS Apple Silicon/Intel과 Windows x64 설치본을 만듭니다. 코드 서명·Apple 공증 인증서가 설정되지 않았으므로 배포 파일은 서명되지 않은 개발 프리뷰입니다. 브라우저는 설치본에 포함하지 않습니다.

로그인 세션은 **로그인 세션 → 로그인 창 열기 → 로그인 완료 후 창 닫기**로 저장합니다. 웹뷰 로그인을 차단하는 서비스나 새 창이 필수인 SSO는 지원되지 않을 수 있습니다. 암호화 저장소를 사용할 수 없으면 저장을 중단합니다.

## 개발 및 검증

```bash
npm run dev
npm run build
npm test
npm run capture -- urls.txt ./test-output
npm run desktop:pack
```

`npm test`는 실제 로컬 HTTP 페이지 캡처, 실패 격리, 선택자 치수, URL 정규화, PPTX 레이아웃별 슬라이드 수, XLSX 이미지 및 하이퍼링크를 검사합니다. 테스트에는 Chrome 또는 Playwright Chromium이 필요합니다.

샘플 이미지는 `node scripts/create-samples.mjs`가 직접 작성한 가상 브랜드 페이지를 실제 브라우저로 촬영했습니다. 실제 고객·사용 성과를 나타내지 않습니다.

## Vercel 배포

저장소를 Vercel의 `noah0615s-projects`에 Import합니다. `vercel.json`에서 Vite, `npm run build`, `dist`를 지정했습니다. 별도 환경 변수나 데이터베이스 없이 배포할 수 있습니다. 설치 단계는 `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci`로 데스크톱 런타임 다운로드를 생략합니다.

## 구조

```text
src/         React/TypeScript UI, 파일 입력, 문서 생성, IndexedDB
core/        Playwright 큐, 페이지 캡처, 이미지 최적화
electron/    격리된 preload/IPC, 로그인 창, 암호화 세션 금고
scripts/     CLI 파이프라인, 자체 샘플 캡처 생성
tests/       핵심 동작과 문서 생성 검증
public/      로컬 정적 자산
```

## 현재 범위와 제약

- 기능 검증용 v0.1 프리뷰입니다. 결제, 라이선스 발급, 코드 서명, 자동 업데이트는 연동하지 않았습니다.
- ‘300개 3분’, ‘모든 팝업 100% 제거’, ‘DISPIMG 완벽 지원’은 검증된 보장이 아니므로 제품에서 주장하지 않습니다. XLSX는 ExcelJS의 one-cell anchored 이미지를 사용합니다.
- CAPTCHA, 접근 통제, 페이월을 우회하지 않습니다. 실패 항목은 상태와 함께 남깁니다.
- 전체 페이지는 16,000px까지 지원합니다. 작업량·해상도·대상 사이트에 따라 처리 시간과 메모리가 달라집니다.
- 보관함은 해당 기기·앱·브라우저에만 저장됩니다. 삭제하거나 브라우저 데이터를 지우면 복원되지 않습니다. 문서로 내보내 백업하세요.
- 의존성 보안 현황과 입력 제한은 [보안 노트](docs/SECURITY.md)에 기록했습니다.

원본 요구사항: [제품 기획](docs/PRODUCT_PROPOSAL.txt), [개발 계획](docs/DEVELOPMENT_PLAN.md).
