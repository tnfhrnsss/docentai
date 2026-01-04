# DocentAI - 프로젝트 가이드

## 프로젝트 개요

넷플릭스 시청 중 이해하기 어려운 자막에 대해 AI가 맥락을 고려한 설명을 제공하는 Chrome Extension 프로젝트입니다.

### 핵심 가치
- **문해력 향상**: 복잡한 대사/서사를 쉽게 이해
- **몰입 유지**: 영상 시청 흐름을 방해하지 않는 UX

### 타겟 플랫폼
- 1차: Netflix
- 2차 확장 계획: YouTube, Disney+, Wavve

## 시스템 아키텍처

### Extension 디렉토리 구조

```
subtitle-explainer-extension/
├── manifest.json              # Extension 설정 (Manifest V3)
├── background/
│   └── service-worker.js      # 백그라운드 스크립트
├── content/
│   ├── content.js             # 메인 로직
│   ├── netflix-detector.js    # 넷플릭스 전용 감지기
│   ├── ui-components.js       # UI 렌더링
│   └── styles.css             # 스타일
├── popup/
│   ├── popup.html             # 확장 프로그램 팝업
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html           # 설정 페이지
│   ├── options.js
│   └── options.css
├── assets/
│   ├── icons/                 # 아이콘 (16, 48, 128px)
│   └── images/
└── lib/
    └── api-client.js          # API 통신
```

### 데이터 흐름

```
[사용자 액션]
    ↓
[Content Script]
    ├─ 영상 감지 → Background Script → API
    ├─ 자막 인터랙션 → API Client → Backend
    └─ API 응답 수신 → UI 업데이트
    ↓
[UI 렌더링]
```

## 핵심 기능

### 1. 자막 인터랙션

#### 기능 1-1: 마우스오버 + 클릭
- 넷플릭스 자막 DOM 요소에 마우스오버 가능
- 💡 이모지 표시 → 클릭 시 API 호출
- 선택된 텍스트 + 타임스탬프 추출
- API 응답을 레이어로 표시

#### 기능 1-2: 키보드 단축키
- 기본 단축키: `Ctrl+E` (Windows) / `⌘+E` (Mac)
- 확장 프로그램 설정에서 커스터마이징 가능

### 2. API 연동

#### 영상 등록 (POST /api/video/register)
- 영상 재생 감지 시 자동 등록
- 영상 메타정보 전송 (videoId, title, episode, season, duration)
- 백엔드에서 웹검색 기반 분석 진행

#### 설명 요청 (POST /api/explain)
- REST API 호출 (axios, 동기 방식)
- 응답 시간: 캐시 HIT ~25ms, MISS ~2.3초
- 디바운서로 중복 호출 방지

#### 에러 처리
- 빠른 실패(Fail Fast) 전략
- 타임아웃 짧게 설정
- 재시도 또는 "준비되어 있지 않습니다" 메시지

### 3. UI 컴포넌트

#### 플로팅 버튼
- 우측 하단 고정 위치
- 💡 이모지 표시
- 호버 시 애니메이션 효과

#### 설명 패널
- 반투명 배경 (rgba)
- 진입/퇴장 애니메이션
- 화면 밖으로 나가지 않도록 위치 자동 조정
- 외부 클릭 시 닫기

#### 설정 페이지
- 단축키 커스터마이징
- 스포일러 방지 ON/OFF

## 주요 클래스

### NetflixDetector
넷플릭스 영상 메타데이터 감지 및 자막 관리

**주요 메서드:**
- `detectVideo()`: 영상 재생 감지 및 메타데이터 추출
- `extractVideoIdFromURL()`: URL에서 videoId 추출
- `extractTitle()`: 영상 제목 추출
- `getCurrentSubtitle()`: 현재 표시 중인 자막 텍스트
- `getCurrentTime()`: 현재 재생 시간
- `seekTo(timestamp)`: 특정 시간으로 이동

### UIComponents
UI 컴포넌트 생성 및 관리

**주요 메서드:**
- `createFloatingButton()`: 💡 플로팅 버튼 생성
- `createExplanationPanel(text, x, y)`: 설명 패널 생성
- `updateExplanationPanel(explanation)`: 패널 내용 업데이트
- `removeExplanationPanel()`: 패널 제거
- `showToast(message)`: 토스트 메시지 표시
- `showProgressBar()`: 영상 분석 진행 상황 표시

### APIClient
백엔드 API 통신

**주요 메서드:**
- `registerVideo(metadata)`: 영상 등록
- `explainSubtitle(data)`: 자막 설명 요청
- `getVideoStatus(videoId)`: 영상 처리 상태 확인

## API 명세

### POST /api (임시 엔드포인트: http://localhost:7777/api)

**요청 Body:**
```javascript
{
  platform: 'netflix',
  videoId: 'extracted-from-url',
  title: '더킹: 영원의 군주',
  episode: 14,
  season: 1,
  duration: 4200 // 초
}
```

**응답 (성공):**
```javascript
{
  "error": "0",
  "data": {
    "msg": "이 부분은 남자주인공이 타임스립을 통해 2025년으로 돌아온 후 여자주인공과 대화를 나누는 것입니다."
  }
}
```

## 개발 가이드라인

### 초기화 플로우 (content.js)

1. 비디오 플레이어 로드 대기
2. 영상 메타데이터 감지
3. 백엔드에 영상 등록
4. 이벤트 리스너 설정
   - 자막 더블클릭
   - 플로팅 버튼 클릭
   - 단축키 (Ctrl+E / ⌘+E)
   - 타임스탬프 이동

### 넷플릭스 DOM 선택자

자막 컨테이너:
- `.player-timedtext`
- `.player-timedtext-text-container`

영상 제목:
- `.video-title`
- `[data-uia="video-title"]`
- `meta[property="og:title"]`

에피소드 정보:
- `.episode-title`
- `[data-uia="episode-title"]`

### 성능 최적화

**메모리 관리:**
- 패널 제거 시 이벤트 리스너 정리
- 전역 인스턴스 재사용

**네트워크 최적화:**
- 요청 디바운싱 (300ms)
- 중복 호출 방지

### 보안 고려사항

- 개인 정보 수집 최소화
- 영상 메타데이터만 전송
- 사용자 식별 정보 전송 금지

## 트러블슈팅

### 자막 감지 안 됨
넷플릭스 DOM 구조 변경 시 `netflix-detector.js`의 선택자 업데이트 필요

```javascript
// 디버깅
console.log('자막 컨테이너:',
  document.querySelector('.player-timedtext')
);
```

### API 연결 실패
CORS 문제 시 `manifest.json`에 host_permissions 추가

```json
"host_permissions": [
  "https://api.yourservice.com/*"
]
```

### Extension 로드 안 됨
- manifest.json 문법 오류 확인
- 모든 파일 경로 확인
- Chrome 콘솔에서 에러 메시지 확인

## 사용자 플로우

```
[넷플릭스 접속 + 영상 재생]
    ↓
[Extension: 💡 버튼 표시]
    ↓
[백그라운드 분석 진행]
    ↓
[분석 완료 (에러 발생해도 메시지 표시 안 함)]
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
[사용자가 헷갈리는 자막 발견]
    ↓
[💡 버튼 클릭 또는 Ctrl+E]
    ↓
[설명 패널 표시 (로딩)]
    ↓
[2-3초 후 설명 표시]
```

## 개발 환경

### 필수 도구
- Node.js
- npm
- Chrome (개발자 모드)

### manifest.json 주요 설정

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage", "webRequest"],
  "host_permissions": ["https://www.netflix.com/*"],
  "content_scripts": [{
    "matches": ["https://www.netflix.com/*"],
    "js": [
      "lib/api-client.js",
      "content/netflix-detector.js",
      "content/ui-components.js",
      "content/content.js"
    ],
    "run_at": "document_end"
  }],
  "commands": {
    "explain-current-subtitle": {
      "suggested_key": {
        "default": "Ctrl+E",
        "mac": "Command+E"
      }
    }
  }
}
```

## 참고 문서

상세한 구현 명세는 `.claude/chrome-extension-spec.md` 파일을 참조하세요.
