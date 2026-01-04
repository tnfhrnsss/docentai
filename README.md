# DocentAI - Subtitle Context Explainer

넷플릭스 자막을 클릭하면 AI가 맥락을 설명해주는 Chrome Extension입니다.

## 개요

영화나 드라마를 시청하다가 이해하기 어려운 대사나 장면을 만났을 때, DocentAI가 맥락을 고려한 설명을 제공합니다. 영상 시청 흐름을 방해하지 않으면서도 빠르게 정보를 얻을 수 있습니다.

## 주요 기능

- **자막 인터랙션**: 자막에 마우스를 올리면 💡 버튼이 나타나고, 클릭 시 AI 설명 제공
- **키보드 단축키**: `Ctrl+E` (Mac: `⌘+E`)로 빠르게 설명 요청
- **플로팅 버튼**: 우측 하단의 💡 버튼으로 언제든 현재 자막 설명
- **더미 데이터 모드**: API 서버 없이도 UI 테스트 가능


## 설치 및 테스트

### 1. 아이콘 생성 (필수)

```bash
# 브라우저에서 아이콘 생성 페이지 열기
open extension/assets/generate-icons.html
```

각 크기별 아이콘을 다운로드하여 `extension/assets/icons/` 폴더에 저장합니다.

### 2. Chrome Extension 로드

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단의 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension` 폴더 선택

### 3. 넷플릭스에서 테스트

1. https://www.netflix.com 접속
2. 영상 재생
3. 자막에 마우스를 올리면 💡 버튼 표시
4. 💡 버튼 클릭 또는 `Ctrl+E` 단축키로 설명 요청

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

## 알려진 이슈

- 넷플릭스의 DOM 구조가 변경되면 자막 감지가 실패할 수 있습니다
- 더미 데이터는 랜덤하게 선택되므로 매번 다른 설명이 나타납니다

