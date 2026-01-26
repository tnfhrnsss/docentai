# DocentAI - 프로젝트 가이드

## 프로젝트 개요

넷플릭스 시청 중 이해하기 어려운 자막에 대해 AI가 맥락을 고려한 설명을 제공하는 Chrome Extension 프로젝트입니다.

### 핵심 가치
- **문해력 향상**: 복잡한 대사/서사를 쉽게 이해
- **몰입 유지**: 영상 시청 흐름을 방해하지 않는 UX

### 타겟 플랫폼
- 1차: Netflix
- 2차 확장 계획: YouTube, Disney+, Wavve

## 최근 업데이트 (2026-01-26)

### Netflix SPA 라우팅 완벽 지원 (Boot 패턴 적용)

**1. Boot 패턴 도입**
- `boot()` 함수: watch 페이지일 때만 초기화 진행
- `initGlobal()`: 전역 초기화 (i18n, 인스턴스 생성, 단축키 등록) - 한 번만 실행
- `initVideoPage()`: 영상 페이지 초기화 (메타데이터 추출, 플로팅 버튼 생성 등)
- videoId 기반 중복 초기화 방지: 같은 영상에서는 재초기화 스킵

**2. SPA 네비게이션 감지 강화**
- History API 패치 (pushState, replaceState)
- popstate 이벤트 (뒤로가기/앞으로가기)
- 주기적 체크 (500ms 간격) - Netflix는 이 방법이 필수
- Netflix 홈 → watch 페이지 이동 시 새로고침 없이 즉시 동작

**3. manifest.json 최적화**
- `matches`: `https://www.netflix.com/*` (전체 페이지에서 content script 로드)
- `host_permissions`: `/watch/*` 유지 (Chrome Web Store 승인용)
- `run_at`: `document_end` (DOM 로드 후 실행)

**4. 비디오 요소 대기 최적화**
- 10초 타임아웃 → 2초로 단축
- 타임아웃 로그 제거 (조용히 진행)
- duration은 JSON-LD/meta 태그에서 추출 가능하므로 video 요소 필수 아님

**5. Background Service Worker 단순화**
- manifest의 content_scripts가 자동으로 로드하므로 수동 주입 로직 제거
- 설치/업데이트 시 로그만 출력

**알려진 제약사항:**
- Netflix DRM 보호로 인해 일부 환경에서 화면 캡처가 차단될 수 있음
- 이 경우 📁 파일 선택 기능을 대안으로 사용 (별도 스크린샷 도구 활용)

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
│   ├── subtitle-cache.js      # 자막 컨텍스트 캐싱 관리
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
    ├─ 영상 감지 → API (영상 등록)
    ├─ 자막 변경 감지 → SubtitleCacheManager (캐시 업데이트)
    ├─ 자막 인터랙션 → 액션 패널 표시
    │                ├─ (선택) 화면 캡처 → Background Script
    │                └─ 설명 요청 클릭
    │                   ├─ (이미지 있으면) API Client → 이미지 업로드 → imageId
    │                   └─ API Client (컨텍스트 + 현재 자막 + imageId) → Backend
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

#### 기능 1-3: 이미지 첨부 (멀티모달 분석)
- 액션 패널에서 이미지 첨부 선택 가능
- 📸 화면 캡처: Background Script를 통한 현재 화면 캡처
  - 캡처 시 액션 패널 및 플로팅 버튼 자동 숨김 (100ms)
  - 깨끗한 Netflix 영상만 캡처 후 UI 복구
  - `<all_urls>` 권한 필요
- 📁 파일 선택: 로컬 이미지 파일 업로드
- 이미지 미리보기 제공
- 이미지 첨부 시 멀티모달 AI 분석 수행

### 2. API 연동

#### 영상 등록 (POST /api/video/register)
- 영상 재생 감지 시 자동 등록
- 영상 메타정보 전송 (videoId, title, episode, season, duration)
- 백엔드에서 웹검색 기반 분석 진행

#### 이미지 업로드 (POST /api/image/upload)
- 멀티모달 API를 위한 이미지 전송
- 멀티파트 폼 데이터 (FormData) 방식
- 화면 캡처 또는 파일 선택을 통한 이미지 첨부
- 응답: imageId, imageUrl 반환

#### 설명 요청 (POST /api/explain)
- REST API 호출 (동기 방식)
- 응답 시간: 캐시 HIT ~25ms, MISS ~2.3초
- imageId를 선택적으로 포함하여 멀티모달 분석 가능
- 디바운서로 중복 호출 방지

#### 자막 컨텍스트 캐싱
- **목적**: AI가 문맥을 이해하기 위해 앞 대사의 자막도 함께 전송
- **캐시 저장**: 브라우저 localStorage 또는 메모리 캐시 사용
- **캐시 크기**: 최근 N개 자막만 유지 (예: 최근 10~20개)
- **캐시 업데이트**: 새로운 자막 표시 시 캐시에 추가하고 오래된 항목 제거
- **API 호출 시**: 현재 자막 + 캐시된 이전 자막들을 함께 전송
- **캐시 초기화**: 영상 변경 시 캐시 클리어

#### 에러 처리
- 빠른 실패(Fail Fast) 전략
- 타임아웃 짧게 설정
- 재시도 또는 "준비되어 있지 않습니다" 메시지
- 이미지 업로드 실패 시: 토스트 메시지 표시 후 텍스트만으로 설명 요청 진행
- 화면 캡처 실패 시:
  - **권한 부족**: `<all_urls>` 권한 필요 안내 및 Extension 재로드 권장
  - **DRM 보호**: Netflix DRM으로 차단 시 📁 파일 선택 방식 안내
  - **기타 에러**: chrome.runtime.lastError 및 응답 에러 체크
  - **UI 복구**: 에러 발생 시에도 액션 패널 및 플로팅 버튼 자동 복구

### 3. UI 컴포넌트

#### 플로팅 버튼
- 우측 하단 고정 위치
- 💡 이모지 표시
- 호버 시 애니메이션 효과
- 클릭 시 액션 패널 표시

#### 액션 패널 (NEW)
- 화면 중앙에 모달 형태로 표시
- 현재 자막 텍스트 미리보기
- 이미지 첨부 기능 (선택사항):
  - 📸 화면 캡처 버튼
  - 📁 파일 선택 버튼
- 이미지 미리보기 영역
- "💡 설명 요청" 및 "취소" 버튼
- 외부 클릭 시 닫기

#### 설명 패널
- 반투명 배경 (rgba)
- 진입/퇴장 애니메이션
- 화면 밖으로 나가지 않도록 위치 자동 조정
- 로딩 상태 표시 ("이미지 업로드 중...", "분석 중...")
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
- `onSubtitleChange(callback)`: 자막 변경 시 콜백 실행 (캐시 업데이트용)

### SubtitleCacheManager
자막 컨텍스트 캐싱 관리

**주요 메서드:**
- `addSubtitle(text, timestamp)`: 새로운 자막을 캐시에 추가
- `getRecentSubtitles(count)`: 최근 N개의 자막 반환
- `clear()`: 캐시 초기화
- `getContextForAPI()`: API 호출용 컨텍스트 데이터 반환 (현재 자막 + 이전 자막들)
- `setMaxCacheSize(size)`: 캐시 최대 크기 설정

### Background Service Worker
백그라운드 작업 처리 (service-worker.js)

**주요 기능:**
- Extension 설치/업데이트 시 로그 출력
- 화면 캡처 기능 (DEV MODE에서만 활성화)
  - `chrome.tabs.captureVisibleTab()` API 사용
  - Content Script와 메시지 통신
  - Netflix DRM으로 인해 대부분 환경에서 차단됨

**메시지 타입:**
- `CAPTURE_SCREEN`: 현재 탭의 화면 캡처 요청 (DEV MODE 전용)
  - 응답 (성공): `{ dataUrl: "data:image/png;base64,..." }`
  - 응답 (실패): `{ error: "에러 메시지" }`

**참고:**
- manifest.json의 `content_scripts`가 자동으로 Netflix 전체 페이지에 로드됨
- Boot 패턴으로 watch 페이지 이동 시 자동 초기화
- 수동 탭 주입 로직 불필요

### UIComponents
UI 컴포넌트 생성 및 관리

**주요 메서드:**
- `createFloatingButton()`: 💡 플로팅 버튼 생성
- `createActionPanel(selectedText, onExplain)`: 액션 패널 생성 (이미지 첨부 UI 포함)
- `removeActionPanel()`: 액션 패널 제거
- `createExplanationPanel(text, x, y)`: 설명 패널 생성
- `updateExplanationPanel(explanation)`: 패널 내용 업데이트
- `updateExplanationPanelStatus(status)`: 패널 로딩 상태 업데이트
- `removeExplanationPanel()`: 패널 제거
- `captureScreen()`: 화면 캡처 (Background Script와 통신)
  - **UI 숨김 처리**: 액션 패널과 플로팅 버튼을 일시적으로 숨김
  - **렌더링 대기**: 100ms 대기 후 캡처하여 깨끗한 이미지 확보
  - **UI 복구**: 캡처 완료 또는 에러 발생 시 UI 요소 다시 표시
  - **에러 핸들링**: `chrome.runtime.lastError` 및 응답 에러 체크
- `handleImageFile(file)`: 이미지 파일 처리
- `showImagePreview(dataUrl)`: 이미지 미리보기 표시
- `showToast(message)`: 토스트 메시지 표시
- `showProgressBar()`: 영상 분석 진행 상황 표시

### APIClient
백엔드 API 통신

**주요 메서드:**
- `registerVideo(metadata)`: 영상 등록
- `uploadImage(imageData)`: 이미지 업로드 (멀티파트 폼)
- `explainSubtitle(data)`: 자막 설명 요청 (imageId 선택사항)
- `getVideoStatus(videoId)`: 영상 처리 상태 확인

## API 명세

### POST /api/image/upload (이미지 업로드)

**엔드포인트:** `http://localhost:7777/api/image/upload`

**Content-Type:** `multipart/form-data`

**요청 Body:**
```javascript
FormData {
  image: File (Blob) // PNG, JPG 등
}
```

**응답 (성공):**
```javascript
{
  "imageId": "img_1234567890_abc123",
  "imageUrl": "https://example.com/uploads/screenshot.png",
  "size": 1024000,
  "uploadedAt": "2026-01-12T10:30:00Z"
}
```

### POST /api/explain (자막 설명 요청)

**엔드포인트:** `http://localhost:7777/api/explain`

**요청 Body:**
```javascript
{
  platform: 'netflix',
  videoId: 'extracted-from-url',
  title: '더킹: 영원의 군주',
  episode: 14,
  season: 1,
  duration: 4200, // 초

  // 자막 컨텍스트 (문맥 이해를 위한 이전 자막들)
  context: [
    {
      text: "난 너를 사랑해",
      timestamp: 4150.5
    },
    {
      text: "하지만 나는...",
      timestamp: 4153.2
    }
  ],

  // 현재 설명을 요청하는 자막
  currentSubtitle: {
    text: "그 세계로 돌아가야 해",
    timestamp: 4155.8
  },

  // 이미지 ID (선택사항 - 멀티모달 분석용)
  imageId: "img_1234567890_abc123"
}
```

**응답 (성공):**
```javascript
{
  "error": "0",
  "data": {
    "msg": "이 부분은 남자주인공이 타임스립을 통해 2025년으로 돌아온 후 여자주인공과 대화를 나누는 것입니다. (이미지 분석: 주인공의 표정이 놀라움과 슬픔을 동시에 나타내고 있습니다.)"
  }
}
```

## 개발 가이드라인

### 초기화 플로우 (content.js) - Boot 패턴

**1. 전역 초기화 (initGlobal - 한 번만 실행)**
- i18n 초기화
- 인스턴스 생성 (NetflixDetector, APIClient, UIComponents, SubtitleCacheManager)
- CSS 애니메이션 주입
- 단축키 등록 (Ctrl+E / ⌘+E) - 전역 이벤트 리스너

**2. Boot 함수 (watch 페이지 감지 시 실행)**
```javascript
async function boot() {
  // watch 페이지가 아니면 종료
  if (!location.pathname.startsWith('/watch/')) {
    // 플로팅 버튼 제거
    return;
  }

  // 같은 videoId면 재초기화 스킵 (중복 방지)
  const currentVideoId = location.pathname.match(/\/watch\/(\d+)/)?.[1];
  if (isVideoPageInitialized && detector?.currentVideoId === currentVideoId) {
    return;
  }

  // 전역 초기화 (한 번만)
  await initGlobal();

  // 영상 페이지 초기화
  await initVideoPage();
}
```

**3. 영상 페이지 초기화 (initVideoPage)**
- 이전 플로팅 버튼 제거 (있는 경우)
- 비디오 요소 대기 (선택적, 2초만)
- 영상 메타데이터 추출 (JSON-LD, meta 태그, video 요소 등)
- 자막 캐시 초기화 (새로운 videoId)
- 자막 변경 감지 시작 (SubtitleObserver)
- 백엔드에 영상 등록
- 플로팅 버튼 생성 및 클릭 이벤트 등록

**4. SPA 네비게이션 감지**
- History API 패치 (pushState, replaceState)
- popstate 이벤트 (뒤로가기/앞으로가기)
- 주기적 체크 (500ms) - URL 변경 시 boot() 재호출

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

### Netflix watch 페이지에서 동작 안 함
**증상**: Netflix 홈에서 영상 클릭 시 플로팅 버튼이 표시되지 않음

**원인 및 해결**:
1. **SPA 라우팅**: Netflix는 SPA이므로 페이지 이동 시 새로고침 없이 URL만 변경됨
2. **해결**: Boot 패턴 + SPA 네비게이션 감지로 자동 해결
   - manifest.json의 `matches`가 `https://www.netflix.com/*`로 설정되어 있어야 함
   - History API 패치 + 주기적 체크 (500ms)로 URL 변경 감지
3. **확인 방법**:
   - 콘솔에서 "🔄 URL 변경 감지" 로그 확인
   - "🎬 영상 초기화 진행: {videoId}" 로그 확인

**테스트 케이스**:
- ✅ Netflix 홈 → watch 페이지 이동: 자동 초기화
- ✅ watch/123 → watch/456 이동: 재초기화
- ✅ 같은 영상 내에서 머물기: 재초기화 스킵
- ✅ 브라우저 뒤로가기: 정상 동작
- ✅ URL 직접 입력: 정상 동작

### 화면 캡처 실패
화면 캡처 버튼 클릭 시 에러가 발생하는 경우

**증상 1: "권한 부족: 화면 캡처 권한이 없습니다"**
- **원인**: `<all_urls>` 권한이 manifest.json에 없거나 Extension이 제대로 로드되지 않음
- **해결 방법**:
  1. `chrome://extensions/`에서 Extension 완전히 제거
  2. manifest.json에 `"host_permissions": ["<all_urls>"]` 확인
  3. Extension 다시 로드
  4. "모든 사이트의 데이터 읽고 변경" 권한 허용
  5. Netflix 페이지 새로고침

**증상 2: "Netflix DRM 보호로 인해 화면 캡처가 차단되었습니다"**
- **원인**: Netflix의 DRM (Digital Rights Management) 보호 정책
- **해결 방법**:
  - Chrome Extension으로는 우회 불가능 (구글 렌즈 같은 네이티브 기능과 다름)
  - 📁 **파일 선택** 기능 사용:
    1. 별도 도구로 스크린샷 촬영 (Windows: Win+Shift+S, Mac: Cmd+Shift+4)
    2. 액션 패널에서 📁 파일 선택 버튼 클릭
    3. 저장한 이미지 파일 업로드

**증상 3: 캡처된 이미지에 액션 패널이 포함됨**
- **원인**: 구현 오류 (현재는 수정됨)
- **동작 방식**:
  - 화면 캡처 시 액션 패널과 플로팅 버튼 자동 숨김 (100ms 대기)
  - 깨끗한 Netflix 영상만 캡처
  - 캡처 완료 후 UI 요소 자동 복구

**디버깅 방법:**
```javascript
// Service Worker 콘솔 (chrome://extensions/ → Service Worker 검사)
// 다음 로그 확인:
// 📩 메시지 수신: CAPTURE_SCREEN
// 🎯 캡처할 탭 ID: xxx
// 📍 탭 정보: https://www.netflix.com/watch/... Window ID: xxx
// ✅ 캡처 성공 또는 ❌ 화면 캡처 오류
```

## 사용자 플로우

```
[넷플릭스 홈 페이지 접속]
    ↓
[Extension: content script 로드 (전역 초기화)]
    ↓
[사용자가 영상 클릭 → /watch/ 페이지 이동]
    ↓
[SPA 네비게이션 감지 → boot() 호출]
    ↓
[영상 메타데이터 추출 (2초 이내)]
    ↓
[백엔드 영상 등록 + 💡 플로팅 버튼 표시]
    ↓
[백그라운드 분석 진행 (에러 발생해도 메시지 표시 안 함)]
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
[사용자가 헷갈리는 자막 발견]
    ↓
[💡 버튼 클릭 또는 Ctrl+E]
    ↓
[액션 패널 표시]
    ├─ 현재 자막 표시
    ├─ (선택사항) 📸 화면 캡처 또는 📁 파일 선택
    └─ 이미지 미리보기
    ↓
[💡 설명 요청 버튼 클릭]
    ↓
[이미지가 있는 경우]
    ├─ "이미지 업로드 중..." (~800ms)
    ├─ imageId 반환
    └─ "분석 중..."
    ↓
[설명 패널 표시]
    ↓
[2-3초 후 설명 표시]
    └─ 이미지 분석 결과 포함 (멀티모달 응답)
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
[다음 에피소드 클릭 → /watch/456 이동]
    ↓
[SPA 네비게이션 감지 → boot() 재호출]
    ↓
[videoId 변경 감지 → 재초기화 진행]
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
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://www.netflix.com/watch/*",
    "http://localhost:8001/*",
    "https://docentai-api-1064006289042.asia-northeast3.run.app/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [{
    "matches": ["https://www.netflix.com/*"],
    "js": [
      "lib/config.js",
      "lib/i18n.js",
      "lib/api-client.js",
      "content/netflix-detector.js",
      "content/subtitle-cache.js",
      "content/ui-components.js",
      "content/content.js"
    ],
    "css": ["content/styles.css"],
    "run_at": "document_end"
  }],
  "web_accessible_resources": [{
    "resources": ["lang/*.json"],
    "matches": ["https://www.netflix.com/*"]
  }]
}
```

**필수 권한 설명:**
- `activeTab`: 활성 탭 접근 권한
- `storage`: 로컬 스토리지 사용 권한 (자막 캐시 등)
- `scripting`: 스크립트 실행 권한

**핵심 설정:**
- `matches`: `https://www.netflix.com/*` - Netflix 전체 페이지에서 content script 로드
  - SPA 라우팅 지원: 홈 페이지에서도 로드되어 watch 페이지 이동 시 즉시 동작
- `host_permissions`: `/watch/*` - Chrome Web Store 승인을 위해 최소 권한으로 설정
- `run_at`: `document_end` - DOM 로드 후 실행

## 참고 문서

상세한 구현 명세는 `.claude/chrome-extension-spec.md` 파일을 참조하세요.
