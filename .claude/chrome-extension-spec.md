# Chrome Extension 개발 명세서
## Subtitle Context Explainer - Frontend

---

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 기능](#핵심-기능)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [구현 상세](#구현-상세)
5. [API 연동](#api-연동)
6. [UI/UX 설계](#uiux-설계)
7. [개발 환경 설정](#개발-환경-설정)
8. [배포 전략](#배포-전략)

---

## 프로젝트 개요

### 목적
넷플릭스 시청 중 이해하기 어려운 자막을 마우스오버하면 나타나는 형광등 이모지를 클릭하면(또는 키보드 단축키 제공) 
AI가 맥락을 고려한 설명을 제공하는 Chrome Extension

### 타겟 플랫폼
- **1차**: Netflix (넷플릭스)
- **2차 확장**: YouTube, Disney+, Wavve

### 주요 가치
- **문해력 향상**: 복잡한 대사/서사를 쉽게 이해
- **몰입 유지**: 영상 시청 흐름을 방해하지 않음

---

## 핵심 기능

### 1. 자막 인터랙션
```
[기능 1-1] 자막 마우스오버 감지 후 플로팅 버튼 표시
- 넷플릭스 자막 DOM 요소에 마우스오버가 가능하도록 한다
- 마우스 오버했을때 💡가 표시되면서 클릭했을때
- 선택된 텍스트와 현재 타임스탬프 추출해서 api를 호출한다.
- api 응답 내용을 레이어로 표시한다.

[기능 1-2] 단축키
- Ctrl+E (Windows) / ⌘+E (Mac) - 디폴트 단축키를 눌렀을때 api를 호출하고
- api 응답 내용을 레이어로 표시한다.
- 단축키 설정은 확장 프로그램 설정 메뉴를 통해 변경가능하도록 한다.
```

### 2. api
- method : POST
- content-type: json
- url : http://localhost:7777/api (임시)
- body(임시)
```javascript
// 넷플릭스 영상 메타데이터 추출
{
  platform: 'netflix',
  videoId: 'extracted-from-url',
  title: '더킹: 영원의 군주',
  episode: 14,
  season: 1,
  duration: 4200 // 초
}
```
- response (dummy)
```javascript
{
    "error": "0",
    "data": {
        "msg": "이 부분은 남자주인공이 타임스립을 통해 2025년으로 돌아온 후 여자주인공과 대화를 나누는 것입니다."
  }
}
```

### 3. 백엔드 연동
```
[3-1] 영상 등록
- REST API 호출(axios를 통한 비동기 호출)
- 영상 재생 감지 시 자동으로 백엔드에 등록(영상 메타정보)
- 백엔드에서는 미리 해당 영상에 대한 정보를 웹검색 진행한다.

[3-2] 설명 요청
- REST API 호출(axios를 통한 비동기 호출. 하지만 백엔드 api자체는 동기)
- 응답 시간: 캐시 HIT ~25ms, MISS ~2.3초
- 백그라운드에서 실행된다.
- 디바운서를 통해 중복호출 방지한다.
- 3-1번 과정에서 오류가 나서 메타정보가 없다면, 3-2 요청을 할때 같이 진행된다.
- 이 모든 과정은 동기 호출로 개발해본다(웹소켓구현은 추후 고려)

[3-3] 에러 처리
- 에러나 오류시 : 별도 표시하지 않고, 빠른실패로 유도한다
- 타임아웃은 짧게
- 재시도로 하거나, 에러메시지로 표시한다. "준비되어 있지 않습니다"
```

### 4. UI 컴포넌트
```
[4-1] 설명 패널
- 반투명 배경 (rgba)
- 애니메이션 진입/퇴장

[4-3] 설정 페이지
- 단축키 커스터마이징
- 스포일러 방지 ON/OFF
```

---

## 시스템 아키텍처

### Extension 구조
```
subtitle-explainer-extension/
├── manifest.json              # Extension 설정
├── background/
│   └── service-worker.js      # 백그라운드 스크립트
├── content/
│   ├── content.js             # 메인 로직
│   ├── netflix-detector.js    # 넷플릭스 전용
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
    └── api-client.js   # API 통신
```

### 데이터 흐름
```
[사용자 액션]
    ↓
[Content Script]
    ├─ 영상 감지 → Background Script → API
    ├─ 자막 마우스오버 이모지 클릭 → API Client → Backend
    └─ API 응답 수신 → UI 업데이트
    ↓
[UI 렌더링]
```

---

## 구현 상세

### 1. manifest.json
```json
{
  "manifest_version": 3,
  "name": "Subtitle Context Explainer",
  "version": "1.0.0",
  "description": "넷플릭스 자막을 더블클릭하면 AI가 맥락을 설명해줍니다",
  
  "permissions": [
    "activeTab",
    "storage",
    "webRequest"
  ],
  
  "host_permissions": [
    "https://www.netflix.com/*",
    "https://api.yourservice.com/*"
  ],
  
  "background": {
    "service_worker": "background/service-worker.js"
  },
  
  "content_scripts": [
    {
      "matches": ["https://www.netflix.com/*"],
      "js": [
        "lib/api-client.js",
        "lib/websocket-client.js",
        "content/netflix-detector.js",
        "content/ui-components.js",
        "content/content.js"
      ],
      "css": ["content/styles.css"],
      "run_at": "document_end"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  
  "options_page": "options/options.html",
  
  "commands": {
    "explain-current-subtitle": {
      "suggested_key": {
        "default": "Ctrl+E",
        "mac": "Command+E"
      },
      "description": "현재 자막 설명"
    }
  },
  
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

### 2. content/netflix-detector.js
```javascript
/**
 * 넷플릭스 영상 메타데이터 감지
 */
class NetflixDetector {
  constructor() {
    this.currentVideoId = null;
    this.metadata = null;
  }
  
  /**
   * 영상 재생 감지 및 메타데이터 추출
   */
  async detectVideo() {
    try {
      // URL에서 videoId 추출
      const videoId = this.extractVideoIdFromURL();
      
      if (videoId === this.currentVideoId) {
        return this.metadata; // 이미 감지된 영상
      }
      
      this.currentVideoId = videoId;
      
      // DOM에서 메타데이터 추출
      const title = this.extractTitle();
      const episode = this.extractEpisode();
      const season = this.extractSeason();
      const duration = this.getVideoDuration();
      
      this.metadata = {
        platform: 'netflix',
        videoId,
        title,
        episode,
        season,
        duration,
        url: window.location.href
      };
      
      console.log('🎬 영상 감지:', this.metadata);
      
      return this.metadata;
      
    } catch (error) {
      console.error('영상 감지 실패:', error);
      return null;
    }
  }
  
  /**
   * URL에서 videoId 추출
   * 예: https://www.netflix.com/watch/81234567?trackId=...
   */
  extractVideoIdFromURL() {
    const match = window.location.href.match(/\/watch\/(\d+)/);
    return match ? match[1] : null;
  }
  
  /**
   * 영상 제목 추출
   */
  extractTitle() {
    // 방법 1: 페이지 제목
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'Netflix') {
      return pageTitle.replace(' - Netflix', '').trim();
    }
    
    // 방법 2: DOM 선택자
    const titleElement = document.querySelector('.video-title, [data-uia="video-title"]');
    if (titleElement) {
      return titleElement.textContent.trim();
    }
    
    // 방법 3: 메타데이터
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      return ogTitle.getAttribute('content');
    }
    
    return 'Unknown Title';
  }
  
  /**
   * 에피소드 번호 추출
   */
  extractEpisode() {
    // DOM 선택자
    const episodeElement = document.querySelector('.episode-title, [data-uia="episode-title"]');
    if (episodeElement) {
      const text = episodeElement.textContent;
      const match = text.match(/에피소드?\s*(\d+)/i) || text.match(/E(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return null;
  }
  
  /**
   * 시즌 번호 추출
   */
  extractSeason() {
    const episodeElement = document.querySelector('.episode-title, [data-uia="episode-title"]');
    if (episodeElement) {
      const text = episodeElement.textContent;
      const match = text.match(/시즌?\s*(\d+)/i) || text.match(/S(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return 1; // 기본값
  }
  
  /**
   * 영상 길이 가져오기
   */
  getVideoDuration() {
    const video = document.querySelector('video');
    if (video && video.duration) {
      return Math.floor(video.duration);
    }
    return null;
  }
  
  /**
   * 현재 재생 시간 가져오기
   */
  getCurrentTime() {
    const video = document.querySelector('video');
    if (video) {
      return video.currentTime;
    }
    return 0;
  }
  
  /**
   * 특정 시간으로 이동
   */
  seekTo(timestamp) {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = timestamp;
      return true;
    }
    return false;
  }
  
  /**
   * 자막 DOM 요소 찾기
   */
  getSubtitleContainer() {
    return document.querySelector('.player-timedtext, .player-timedtext-text-container');
  }
  
  /**
   * 현재 표시 중인 자막 텍스트 가져오기
   */
  getCurrentSubtitle() {
    const container = this.getSubtitleContainer();
    if (container) {
      return container.textContent.trim();
    }
    return null;
  }
}
```

### 3. content/ui-components.js
```javascript
/**
 * UI 컴포넌트 관리
 */
class UIComponents {
  constructor() {
    this.currentPanel = null;
    this.floatingButton = null;
    this.progressBar = null;
  }
  
  /**
   * 플로팅 버튼 생성
   */
  createFloatingButton() {
    if (this.floatingButton) return;
    
    const button = document.createElement('div');
    button.id = 'subtitle-explainer-floating-btn';
    button.innerHTML = '💡';
    button.title = '현재 자막 설명 (단축키: Ctrl+E)';
    
    button.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 28px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fadeIn 0.3s ease-out;
    `;
    
    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 24px rgba(255, 215, 0, 0.6)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 20px rgba(255, 215, 0, 0.4)';
    });
    
    document.body.appendChild(button);
    this.floatingButton = button;
    
    return button;
  }
  
  /**
   * 설명 패널 생성
   */
  createExplanationPanel(selectedText, x, y) {
    // 기존 패널 제거
    this.removeExplanationPanel();
    
    const panel = document.createElement('div');
    panel.id = 'subtitle-explanation-panel';
    
    // 화면 밖으로 나가지 않도록 위치 조정
    const safeX = Math.min(x, window.innerWidth - 370);
    const safeY = Math.min(y, window.innerHeight - 300);
    
    panel.innerHTML = `
      <div style="
        position: fixed;
        left: ${safeX}px;
        top: ${safeY}px;
        width: 350px;
        max-height: 500px;
        background: rgba(20, 20, 20, 0.98);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 12px;
        padding: 20px;
        color: white;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 12px;
        ">
          <div style="
            background: rgba(255, 215, 0, 0.2);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            color: #ffd700;
            font-weight: 500;
            word-break: break-word;
            flex: 1;
          ">"${selectedText}"</div>
          <button class="close-btn" style="
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            padding: 0;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
            transition: color 0.2s;
          ">×</button>
        </div>
        <div class="explanation-content" style="
          font-size: 15px;
          line-height: 1.7;
          color: #e0e0e0;
        ">
          <div class="loading" style="
            display: flex;
            align-items: center;
            gap: 8px;
            color: #999;
          ">
            <div class="spinner" style="
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255, 215, 0, 0.3);
              border-top-color: #ffd700;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            "></div>
            분석 중...
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    this.currentPanel = panel;
    
    // 닫기 버튼 이벤트
    const closeBtn = panel.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.removeExplanationPanel());
    closeBtn.addEventListener('mouseenter', (e) => {
      e.target.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', (e) => {
      e.target.style.color = '#999';
    });
    
    // 외부 클릭 시 닫기
    setTimeout(() => {
      const closeOnOutsideClick = (e) => {
        if (!panel.contains(e.target)) {
          this.removeExplanationPanel();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
    
    return panel;
  }
  
  /**
   * 설명 패널 내용 업데이트
   */
  updateExplanationPanel(explanation) {
    if (!this.currentPanel) return;
    
    const content = this.currentPanel.querySelector('.explanation-content');
    
    if (explanation.error) {
      content.innerHTML = `
        <div style="color: #ff6b6b; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">⚠️</span>
          <span>${explanation.message || '오류가 발생했습니다.'}</span>
        </div>
        ${explanation.retryAfter ? `
          <div style="margin-top: 12px; font-size: 13px; color: #999;">
            ${explanation.retryAfter}초 후 다시 시도해주세요.
          </div>
        ` : ''}
      `;
      return;
    }
    
    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        ${explanation.text}
      </div>
      
      ${explanation.sources && explanation.sources.length > 0 ? `
        <div style="
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            font-size: 13px;
            color: #ffd700;
            font-weight: 500;
            margin-bottom: 8px;
          ">📚 정보 출처</div>
          ${explanation.sources.map(source => `
            <div style="
              font-size: 12px;
              color: #999;
              margin-top: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
            ">
              <span>${this.getSourceIcon(source.type)}</span>
              <span>${source.title || source.type}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${explanation.references && explanation.references.length > 0 ? `
        <div style="
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            font-size: 13px;
            color: #ffd700;
            font-weight: 500;
            margin-bottom: 8px;
          ">🔗 관련 장면</div>
          ${explanation.references.map(ref => `
            <a href="#" data-timestamp="${ref.timestamp}" style="
              color: #4a9eff;
              text-decoration: none;
              display: block;
              margin-top: 6px;
              font-size: 13px;
              transition: color 0.2s;
            " onmouseover="this.style.color='#6bb6ff'" 
               onmouseout="this.style.color='#4a9eff'">
              → ${ref.description}
            </a>
          `).join('')}
        </div>
      ` : ''}
      
      ${explanation.cached ? `
        <div style="
          margin-top: 12px;
          font-size: 11px;
          color: #666;
          text-align: right;
        ">
          ⚡ 캐시됨 (${explanation.responseTime}ms)
        </div>
      ` : ''}
    `;
    
    // 타임스탬프 링크 클릭 이벤트
    content.querySelectorAll('[data-timestamp]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const timestamp = parseFloat(e.target.dataset.timestamp);
        window.postMessage({
          type: 'SEEK_TO_TIMESTAMP',
          timestamp
        }, '*');
        this.removeExplanationPanel();
      });
    });
  }
  
  /**
   * 설명 패널 제거
   */
  removeExplanationPanel() {
    if (this.currentPanel) {
      this.currentPanel.remove();
      this.currentPanel = null;
    }
  }
  
  /**
   * 소스 아이콘 가져오기
   */
  getSourceIcon(type) {
    const icons = {
      'namuwiki': '🌳',
      'wikipedia': '📖',
      'fandom': '⭐',
      'video_analysis': '🎬'
    };
    return icons[type] || '📄';
  }
  
  /**
   * 진행 상황 바 표시
   */
  showProgressBar() {
    if (this.progressBar) return;
    
    const progressBar = document.createElement('div');
    progressBar.id = 'video-analysis-progress';
    
    progressBar.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 300px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        padding: 16px;
        z-index: 9999;
        color: white;
        animation: slideInRight 0.3s ease-out;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        ">
          <span style="font-size: 24px;">🎬</span>
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 4px;">영상 분석 중</div>
            <div style="font-size: 12px; color: #999;">잠시만 기다려주세요...</div>
          </div>
        </div>
        <div style="
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        ">
          <div id="progress-fill" style="
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #ffd700, #ffed4e);
            transition: width 0.3s ease-out;
          "></div>
        </div>
        <div id="progress-text" style="
          margin-top: 8px;
          font-size: 12px;
          color: #999;
          text-align: right;
        ">0%</div>
      </div>
    `;
    
    document.body.appendChild(progressBar);
    this.progressBar = progressBar;
  }
  
  /**
   * 진행 상황 업데이트
   */
  updateProgressBar(progress) {
    if (!this.progressBar) return;
    
    const fill = this.progressBar.querySelector('#progress-fill');
    const text = this.progressBar.querySelector('#progress-text');
    
    if (fill && text) {
      fill.style.width = `${progress}%`;
      text.textContent = `${progress}%`;
    }
  }
  
  /**
   * 진행 상황 바 제거
   */
  hideProgressBar() {
    if (this.progressBar) {
      this.progressBar.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        this.progressBar?.remove();
        this.progressBar = null;
      }, 300);
    }
  }
  
  /**
   * 토스트 메시지 표시
   */
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}
```

### 4. content/content.js (메인)
```javascript
/**
 * Subtitle Context Explainer - Main Content Script
 */

// 전역 인스턴스
let detector = null;
let apiClient = null;
let wsClient = null;
let ui = null;

/**
 * 초기화
 */
async function init() {
  console.log('🚀 Subtitle Explainer 초기화 중...');
  
  // 인스턴스 생성
  detector = new NetflixDetector();
  apiClient = new APIClient('https://api.yourservice.com');
  wsClient = new WebSocketClient('wss://api.yourservice.com/ws');
  ui = new UIComponents();
  
  // CSS 애니메이션 주입
  injectStyles();
  
  // UI 초기화
  ui.createFloatingButton();
  
  // 영상 감지 대기
  await waitForVideoPlayer();
  
  // 영상 메타데이터 추출
  const metadata = await detector.detectVideo();
  
  if (metadata) {
    // 백엔드에 영상 등록
    await registerVideo(metadata);
    
    // WebSocket 연결
    connectWebSocket(metadata.videoId);
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('✅ 초기화 완료');
  } else {
    console.error('❌ 영상 감지 실패');
  }
}

/**
 * 비디오 플레이어가 로드될 때까지 대기
 */
function waitForVideoPlayer() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const video = document.querySelector('video');
      if (video) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
    
    // 10초 타임아웃
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 10000);
  });
}

/**
 * 영상 등록
 */
async function registerVideo(metadata) {
  try {
    ui.showProgressBar();
    
    const response = await apiClient.registerVideo(metadata);
    
    if (response.status === 'processing') {
      ui.showToast('영상 분석을 시작합니다. 잠시만 기다려주세요.');
    } else if (response.status === 'ready') {
      ui.hideProgressBar();
      ui.showToast('✅ 준비 완료! 자막을 더블클릭해보세요.');
    }
    
  } catch (error) {
    console.error('영상 등록 실패:', error);
    ui.showToast('영상 등록에 실패했습니다.');
  }
}

/**
 * WebSocket 연결
 */
function connectWebSocket(videoId) {
  wsClient.connect();
  
  wsClient.on('open', () => {
    console.log('🔌 WebSocket 연결됨');
    wsClient.send({
      type: 'subscribe',
      videoId: videoId
    });
  });
  
  wsClient.on('message', (data) => {
    if (data.videoId === videoId) {
      handleWebSocketMessage(data);
    }
  });
  
  wsClient.on('close', () => {
    console.log('🔌 WebSocket 연결 종료');
  });
}

/**
 * WebSocket 메시지 처리
 */
function handleWebSocketMessage(data) {
  if (data.type === 'progress') {
    ui.updateProgressBar(data.progress);
  } else if (data.type === 'complete') {
    ui.hideProgressBar();
    ui.showToast('✅ 분석 완료! 이제 사용하실 수 있습니다.');
  } else if (data.type === 'error') {
    ui.hideProgressBar();
    ui.showToast('❌ 분석 중 오류가 발생했습니다.');
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  // 1. 자막 더블클릭
  document.addEventListener('dblclick', async (e) => {
    const subtitleElement = e.target.closest('.player-timedtext, [class*="subtitle"]');
    
    if (subtitleElement) {
      e.preventDefault();
      e.stopPropagation();
      
      const selectedText = subtitleElement.textContent.trim();
      if (selectedText) {
        await explainSubtitle(selectedText, e.clientX, e.clientY);
      }
    }
  });
  
  // 2. 플로팅 버튼 클릭
  ui.floatingButton.addEventListener('click', async () => {
    const currentSubtitle = detector.getCurrentSubtitle();
    
    if (currentSubtitle) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      await explainSubtitle(currentSubtitle, centerX, centerY);
    } else {
      ui.showToast('현재 표시된 자막이 없습니다.');
    }
  });
  
  // 3. 단축키 (Ctrl+E / ⌘+E)
  document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      
      const currentSubtitle = detector.getCurrentSubtitle();
      if (currentSubtitle) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        await explainSubtitle(currentSubtitle, centerX, centerY);
      } else {
        ui.showToast('현재 표시된 자막이 없습니다.');
      }
    }
  });
  
  // 4. 타임스탬프 이동 메시지 수신
  window.addEventListener('message', (e) => {
    if (e.data.type === 'SEEK_TO_TIMESTAMP') {
      detector.seekTo(e.data.timestamp);
    }
  });
}

/**
 * 자막 설명 요청
 */
async function explainSubtitle(text, x, y) {
  console.log(`💡 설명 요청: "${text}"`);
  
  // 로딩 패널 표시
  const panel = ui.createExplanationPanel(text, x, y);
  
  try {
    const metadata = detector.metadata;
    const timestamp = detector.getCurrentTime();
    
    // API 호출
    const explanation = await apiClient.explainSubtitle({
      videoId: metadata.videoId,
      selectedText: text,
      timestamp: timestamp,
      metadata: metadata
    });
    
    console.log(`⚡ 응답 시간: ${explanation.responseTime}ms`);
    console.log(`📦 캐시: ${explanation.cached ? 'HIT' : 'MISS'}`);
    
    // 패널 업데이트
    ui.updateExplanationPanel(explanation);
    
  } catch (error) {
    console.error('설명 생성 실패:', error);
    
    ui.updateExplanationPanel({
      error: true,
      message: error.message || '오류가 발생했습니다.',
      retryAfter: error.retryAfter
    });
  }
}

/**
 * CSS 스타일 주입
 */
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(20px);
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    /* 스크롤바 스타일 */
    #subtitle-explanation-panel::-webkit-scrollbar {
      width: 6px;
    }
    
    #subtitle-explanation-panel::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    
    #subtitle-explanation-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 215, 0, 0.5);
      border-radius: 3px;
    }
    
    #subtitle-explanation-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 215, 0, 0.7);
    }
  `;
  
  document.head.appendChild(style);
}

// 초기화 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### 5. lib/api-client.js
```javascript
/**
 * Backend API 클라이언트
 */
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  /**
   * 영상 등록
   */
  async registerVideo(metadata) {
    const response = await fetch(`${this.baseURL}/api/video/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }
    
    return await response.json();
  }
  
  /**
   * 자막 설명 요청
   */
  async explainSubtitle(data) {
    const response = await fetch(`${this.baseURL}/api/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.status === 202) {
      // 처리 중
      const result = await response.json();
      throw new Error(result.message, { retryAfter: result.retryAfter });
    }
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }
    
    return await response.json();
  }
  
  /**
   * 영상 상태 확인
   */
  async getVideoStatus(videoId) {
    const response = await fetch(`${this.baseURL}/api/video/${videoId}/status`);
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }
    
    return await response.json();
  }
}
```

---

## API 연동

### API 엔드포인트

#### 1. POST /api/video/register
영상 등록 및 백그라운드 분석 시작

**요청:**
```json
{
  "platform": "netflix",
  "videoId": "81234567",
  "title": "더킹: 영원의 군주",
  "episode": 14,
  "season": 1,
  "duration": 4200,
  "url": "https://www.netflix.com/watch/81234567"
}
```

**응답 (처리 중):**
```json
{
  "status": "processing",
  "jobId": "job_abc123",
  "estimatedTime": 300
}
```

**응답 (완료):**
```json
{
  "status": "ready",
  "videoId": "81234567"
}
```

#### 2. POST /api/explain
자막 설명 요청

**요청:**
```json
{
  "videoId": "81234567",
  "selectedText": "그때 그 사람이었어",
  "timestamp": 992.5,
  "metadata": {
    "title": "더킹: 영원의 군주",
    "episode": 14
  }
}
```

**응답 (성공):**
```json
{
  "text": "이강인이 언급한 '그 사람'은 1994년에 만난 정태을입니다. 13화 45분에서 만파식적을 통해 과거로 이동했을 때 처음 만났어요.",
  "sources": [
    {
      "type": "namuwiki",
      "title": "더킹: 영원의 군주/등장인물"
    },
    {
      "type": "video_analysis",
      "title": "14화 자막 분석"
    }
  ],
  "references": [
    {
      "timestamp": 2720,
      "description": "13화 45:20 - 만파식적으로 과거 이동"
    },
    {
      "timestamp": 3130,
      "description": "13화 52:10 - 1994년 태을 첫 만남"
    }
  ],
  "cached": false,
  "responseTime": 2341
}
```

**응답 (처리 중):**
```json
{
  "status": "processing",
  "message": "영상 분석 중입니다. 잠시 후 다시 시도해주세요.",
  "retryAfter": 30
}
```

#### 3. GET /api/video/:videoId/status
영상 처리 상태 확인 (내부 장애 디버깅용). 추후 개발 (mvp범위 제외)

**응답:**
```json
{
  "videoId": "81234567",
  "status": "processing",
  "progress": 45,
  "estimatedTimeRemaining": 120
}
```

---

## UI/UX 설계

### 사용자 플로우

```
[사용자가 넷플릭스 접속]
    ↓
[영상 재생 시작]
    ↓
[Extension: 💡 버튼 표시]
    ↓
[백그라운드 분석 진행]
    ↓
[분석 완료]
[아무 메시지 표시하지 않는다. 에러가 나더라도.]
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
[사용자가 헷갈리는 자막 발견]
    ↓
[방법 1: 💡 버튼 클릭]
[방법 2: Ctrl+E 단축키]
    ↓
[설명 패널 표시]
    ↓
[2-3초 후 설명 표시]
```

### 화면 레이아웃
- 준비중

---

## 개발 환경 설정

### 필수 도구
```bash
# Node.js 
node --version

# npm
npm --version

# Chrome (개발자 모드)
```

---

## 트러블슈팅

### 일반적인 문제

#### 1. 자막 감지 안 됨
```javascript
// 넷플릭스 DOM 구조 변경 시
// netflix-detector.js에서 선택자 업데이트

// 디버깅
console.log('자막 컨테이너:', 
  document.querySelector('.player-timedtext')
);
```

#### 2. API 연결 실패
```javascript
// CORS 문제
// manifest.json에 host_permissions 추가
"host_permissions": [
  "https://api.yourservice.com/*"
]

// 네트워크 탭에서 확인
// Status: 200 OK 여부
```

#### 3. Extension 로드 안 됨
```
- manifest.json 문법 오류 확인
- 모든 파일 경로 확인
- Chrome 콘솔에서 에러 메시지 확인
```

---

## 성능 최적화

### 메모리 관리
```javascript
// 패널 제거 시 이벤트 리스너도 제거
removeExplanationPanel() {
  if (this.currentPanel) {
    // 이벤트 리스너 정리
    this.currentPanel.removeEventListener(...);
    this.currentPanel.remove();
    this.currentPanel = null;
  }
}
```

### 네트워크 최적화
```javascript
// 요청 디바운싱
let debounceTimer;
function explainSubtitle(text) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    // API 호출
  }, 300);
}
```

---

## 보안 고려사항

### 1. 사용자 데이터
```javascript
// 개인 정보 수집 최소화
// 영상 메타데이터만 전송
// 사용자 식별 정보 X
```
