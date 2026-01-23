# DocentAI - Subtitle Context Explainer

넷플릭스 자막을 클릭하면 AI가 맥락을 설명해주는 Chrome Extension입니다.

## 개요

영화나 드라마를 시청하다가 이해하기 어려운 대사나 장면을 만났을 때, DocentAI가 맥락을 고려한 설명을 제공합니다. 영상 시청 흐름을 방해하지 않으면서도 빠르게 정보를 얻을 수 있습니다.

## 주요 기능

- **자막 인터랙션**: 자막에 마우스를 올리면 💡 버튼이 나타나고, 클릭 시 AI 설명 제공
- **키보드 단축키**: `Ctrl+E` (Mac: `⌘+E`)로 빠르게 설명 요청
- **플로팅 버튼**: 우측 하단의 💡 버튼으로 언제든 현재 자막 설명
- **향상된 메타데이터**: Netflix 플레이어 객체에서 에피소드 제목, 장르, 시청 등급, 영상 길이 자동 추출
- **멀티모달 분석**: 이미지 업로드 (📁 파일 선택) 및 화면 캡처 (📸 DEV 전용)
- **더미 데이터 모드**: API 서버 없이도 UI 테스트 가능


## 빌드 및 설치

### 🛠️ 빌드 방법

DocentAI는 두 가지 빌드 모드를 지원합니다:

#### 1. **프로덕션 빌드** (Chrome Web Store용)
```bash
python build.py --mode prod
```
- 화면 캡처 기능 제외
- `<all_urls>` 권한 제외
- Chrome Web Store 정책 준수
- 출력: `build/docentai-ui-prod-v1.0.0.zip`

#### 2. **개발 빌드** (해커톤/수동 설치용)
```bash
python build.py --mode dev
```
- 📸 화면 캡처 기능 포함 (멀티모달 분석)
- `<all_urls>` 권한 포함
- 추가 기능: `features/capture/` 모듈
- 출력: `build/docentai-ui-dev-v1.0.0.zip`

### 📦 수동 설치 (해커톤 심사용)

해커톤 제출 시 개발 빌드를 사용하여 모든 기능을 시연할 수 있습니다.

#### 1. 개발 빌드 생성
```bash
python build.py --mode dev
```

#### 2. Chrome Extension 로드
1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단의 **"개발자 모드"** 활성화
3. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
4. `build/extension/` 폴더 선택

또는 ZIP 파일에서 직접 설치:
1. `build/docentai-ui-dev-v1.0.0.zip` 압축 해제
2. 위와 동일한 방법으로 압축 해제된 폴더 로드

#### 3. 권한 허용
개발 빌드는 화면 캡처를 위해 **"모든 사이트의 데이터 읽고 변경"** 권한을 요청합니다.
이는 `<all_urls>` 권한 때문이며, 실제로는 Netflix에서만 동작합니다.

### 🎬 넷플릭스에서 테스트

1. https://www.netflix.com 접속
2. 영상 재생
3. 💡 버튼 클릭 또는 `Ctrl+E` 단축키
4. 액션 패널에서:
   - **📁 파일 선택**: 로컬 이미지 업로드
   - **📸 화면 캡처**: 현재 화면 자동 캡처 (DEV MODE 전용)
   - **💡 설명 요청**: AI 분석 실행

## 개발 모드

현재 버전은 **더미 데이터 모드**로 동작합니다. 실제 API 서버 없이도 UI와 인터랙션을 테스트할 수 있습니다.

### 더미 데이터 설정

`lib/api-client.js`에서 더미 모드 플래그를 확인할 수 있습니다:

```javascript
this.USE_DUMMY = true; // 더미 데이터 사용
```

### 실제 API 연동

추후 백엔드 API가 준비되면:

1. Extension 설정 페이지에서 "더미 데이터 사용" 체크 해제
2. API 엔드포인트 설정 (기본값: `http://localhost:7777`)

## 사용 방법

### 자막 설명 요청

1. **마우스 클릭**: 자막에 마우스를 올려 💡 버튼 클릭
2. **단축키**: `Ctrl+E` (Mac: `⌘+E`) 누르기
3. **플로팅 버튼**: 우측 하단 💡 버튼 클릭

### 설정

Extension 아이콘을 클릭하여 팝업을 열고, "⚙️ 설정" 버튼을 클릭하면:

- 확장 프로그램 활성화/비활성화
- 자동 영상 분석 설정
- UI 요소 표시 설정
- API 엔드포인트 변경

## 기술 스택

- **Manifest V3**: 최신 Chrome Extension API
- **Vanilla JavaScript**: 프레임워크 없이 순수 JavaScript
- **CSS**: 인라인 스타일 + 별도 CSS 파일
- **Chrome Storage API**: 설정 저장

## 주요 컴포넌트

### NetflixDetector

넷플릭스 영상 메타데이터 감지 및 자막 추출

```javascript
const detector = new NetflixDetector();
const metadata = await detector.detectVideo();
const subtitle = detector.getCurrentSubtitle();
```

### UIComponents

UI 요소 생성 및 관리

```javascript
const ui = new UIComponents();
ui.createFloatingButton();
ui.createExplanationPanel(text, x, y);
ui.updateExplanationPanel(explanation);
```

### APIClient

백엔드 API 통신 (더미 데이터 모드 지원)

```javascript
const apiClient = new APIClient('http://localhost:7777');
const explanation = await apiClient.explainSubtitle(data);
```

## 빌드 모드 비교

| 항목 | 프로덕션 빌드 (prod) | 개발 빌드 (dev) |
|------|---------------------|-----------------|
| 화면 캡처 기능 | ❌ 없음 | ✅ 포함 |
| `<all_urls>` 권한 | ❌ 없음 | ✅ 포함 |
| Chrome Web Store 승인 | ✅ 가능 | ⚠️ 거부될 수 있음 |
| 파일 업로드 | ✅ 지원 | ✅ 지원 |
| 용도 | 정식 배포 | 해커톤, 데모, 개발 |

### 왜 두 가지 빌드가 필요한가?

Chrome Web Store는 DRM 보호 콘텐츠(Netflix)에서 화면 캡처를 허용하지 않습니다. 따라서:

- **프로덕션 빌드 (prod)**: 정식 배포를 위해 화면 캡처 기능 제거
- **개발 빌드 (dev)**: 해커톤 심사 및 데모를 위해 모든 기능 포함 (수동 설치)

### 빌드 아키텍처

```
extension/
├── features/
│   └── capture/              # 📸 캡처 기능 (DEV 전용)
│       ├── capture-feature.js       # UI 확장
│       ├── service-worker-capture.js # Background 확장
│       └── imageIO-utils.js         # 이미지 유틸
├── manifest.template.json    # 템플릿 (빌드 시 생성)
└── ...
```

빌드 시:
- `manifest.template.json` → `manifest.json` (플래그 치환)
- DEV 모드: `features/capture/` 포함
- PROD 모드: `features/capture/` 제외

## 알려진 이슈

### Netflix DRM 보호
- Netflix는 DRM(Digital Rights Management) 보호를 사용하여 화면 캡처를 차단합니다
- Chrome Extension의 `captureVisibleTab` API도 일부 환경에서 차단됩니다
- **해결 방법**: 📁 파일 선택 기능을 사용하여 별도로 촬영한 스크린샷 업로드

### 기타
- 넷플릭스의 DOM 구조가 변경되면 자막 감지가 실패할 수 있습니다
- 더미 데이터는 랜덤하게 선택되므로 매번 다른 설명이 나타납니다

## 디버깅 및 콘솔 로그

Extension을 테스트할 때 Chrome 개발자 도구 (F12)의 Console 탭에서 다음 로그를 확인할 수 있습니다:

### Netflix 플레이어 객체 탐색
```
🔍 Netflix 플레이어 객체 검색 중...
📦 발견된 Netflix/Player 관련 키: ["netflixAppContext", "videoPlayer", ...]
✅ 플레이어 객체 발견: window.netflix
```

### 향상된 메타데이터 추출
```
🔍 향상된 메타데이터 추출 시작...
📺 에피소드 제목: "The Beginning"
🎭 장르: "드라마, 판타지"
🔞 시청 등급: "15+"
⏱️ 영상 길이: 3600
🎬 비디오 제목 (플레이어): "킹덤"
```

### 전체 메타데이터
```
🎬 영상 감지 (전체 메타데이터): {
  platform: "netflix",
  videoId: "81234567",
  title: "킹덤",
  episode: 1,
  season: 1,
  episodeTitle: "The Beginning",
  genre: "드라마, 판타지",
  maturityRating: "15+",
  duration: 3600
}
```

### 캡처 기능 (DEV 모드)
```
📸 화면 캡처 UI 기능이 활성화되었습니다 (DEV MODE)
✅ UIComponents에 captureScreen 메서드 및 버튼이 추가되었습니다.
✅ 캡처 버튼이 추가되었습니다.
```

### 문제 해결

**플레이어 객체를 찾을 수 없을 때:**
- Netflix가 플레이어 구조를 변경했을 수 있습니다
- Console에서 `Object.keys(window)` 실행하여 Netflix 관련 객체 확인
- 발견된 객체를 수동으로 탐색: `console.log(window.netflix)`

**메타데이터가 null일 때:**
- 영상이 완전히 로드되지 않았을 수 있습니다
- 페이지 새로고침 후 다시 시도
- DOM 구조가 변경되었을 수 있으므로 선택자 업데이트 필요

## 해커톤 심사 위원께

본 프로젝트는 Chrome Web Store 정책을 준수하기 위해 두 가지 빌드를 제공합니다:

1. **심사 시**: `python build.py --mode dev` 빌드를 사용하여 화면 캡처 기능을 포함한 전체 기능을 시연할 수 있습니다
2. **정식 배포**: `python build.py --mode prod` 빌드를 Chrome Web Store에 제출합니다

화면 캡처 기능은 완전히 모듈화되어 있으며, `features/capture/` 폴더에 격리되어 있습니다. 프로덕션 빌드에서는 이 폴더가 완전히 제외됩니다.

