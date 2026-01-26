let detector = null;
let apiClient = null;
let ui = null;
let subtitleCache = null; // 자막 캐시 매니저
let isGlobalInitialized = false; // 전역 초기화 가드
let isVideoPageInitialized = false; // 영상 페이지 초기화 가드

/**
 * 전역 초기화 (한 번만 실행)
 */
async function initGlobal() {
  if (isGlobalInitialized) {
    return;
  }

  try {
    console.log('🚀 DocentAI 전역 초기화 중...');

    isGlobalInitialized = true;

    // i18n 초기화
    await i18n.init();

    // 인스턴스 생성
    detector = new NetflixDetector();
    const apiUrl = window.DocentAIConfig?.API_URL || 'http://localhost:8001';
    apiClient = new APIClient(apiUrl);
    ui = new UIComponents();
    subtitleCache = new SubtitleCacheManager(5);

    // CSS 애니메이션 주입
    injectStyles();

    // 단축키 등록 (전역)
    setupEventListeners();

    console.log('✅ 전역 초기화 완료');
  } catch (error) {
    console.error('❌ DocentAI 전역 초기화 실패:', error);
    isGlobalInitialized = false; // 실패 시 재시도 가능하도록
  }
}

/**
 * 비디오 요소 대기 (선택적 - 실패해도 메타데이터 추출 진행)
 * duration은 JSON-LD/meta 태그에서도 추출 가능
 * currentTime은 자막 설명 요청 시에만 필요 (그때는 이미 재생 중)
 */
function waitForVideoPlayer(maxWait = 2000) {
  return new Promise((resolve) => {
    const video = document.querySelector('video');
    if (video) {
      console.log('🎬 비디오 요소 발견 (즉시)');
      resolve(true);
      return;
    }

    // 2초만 대기 (찾지 못해도 진행)
    const timeout = setTimeout(() => {
      console.log('🎬 비디오 요소 없이 진행 (JSON-LD/meta 태그 사용)');
      resolve(false);
    }, maxWait);

    // 짧은 간격으로 체크
    const checkInterval = setInterval(() => {
      const video = document.querySelector('video');
      if (video) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        console.log('🎬 비디오 요소 발견');
        resolve(true);
      }
    }, 1000);
  });
}

/**
 * 영상 등록
 */
async function registerVideo(metadata) {
  try {
    console.log('📤 영상 등록 중...');

    const response = await apiClient.registerVideo(metadata);

    if (response.status === 'processing') {
      ui.showToast('영상 분석을 시작합니다.');
    } else if (response.status === 'ready') {
      ui.showToast('✅ 준비 완료!');
    }

  } catch (error) {
    console.error('영상 등록 실패:', error);
    // 에러 발생해도 사용자에게는 메시지 표시하지 않음 (스펙에 따라)
  }
}

// 단축키 이벤트 리스너 등록 여부를 추적하는 플래그
let isKeyboardListenerSetup = false;

/**
 * 이벤트 리스너 설정 (단축키만 등록)
 * 플로팅 버튼 클릭 이벤트는 버튼 생성 시 직접 등록됨
 */
function setupEventListeners() {
  console.log('🎧 이벤트 리스너 설정 중...');

  // 단축키 (Ctrl+E / ⌘+E) - 한 번만 등록
  if (!isKeyboardListenerSetup) {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();

        const currentSubtitle = detector.getCurrentSubtitle();
        if (currentSubtitle) {
          showActionPanel(currentSubtitle);
        } else {
          ui.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
        }
      }
    });
    isKeyboardListenerSetup = true;
    console.log('✅ 단축키 등록 완료 (Ctrl+E / ⌘+E)');
  }

  console.log('✅ 이벤트 리스너 설정 완료');
}

/**
 * Background script로부터 메시지 수신 (전체화면 단축키용)
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 메시지 수신:', request.type);

  if (request.type === 'PING') {
    // Content script가 로드되었는지 확인하는 용도
    sendResponse({ pong: true });
    return true;
  }

  if (request.type === 'EXPLAIN_CURRENT_SUBTITLE') {
    const currentSubtitle = detector?.getCurrentSubtitle();

    if (currentSubtitle) {
      showActionPanel(currentSubtitle);
      sendResponse({ success: true });
    } else {
      ui?.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
      sendResponse({ success: false, reason: 'No subtitle available' });
    }
  }

  return false;
});

function showActionPanel(text) {
  console.log(`📋 액션 패널 표시: "${text}"`);

  ui.createActionPanel(text, async (imageData) => {
    // 설명 요청
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    await explainSubtitle(text, centerX, centerY, imageData);
  });
}

/**
 * 자막 설명 요청
 */
async function explainSubtitle(text, x, y, imageData = null) {
  console.log(`💡 설명 요청: "${text}"`, imageData ? '(이미지 포함)' : '');

  // 로딩 패널 표시
  const panel = ui.createExplanationPanel(text, x, y);

  try {
    const metadata = detector.metadata;

    let imageId = null;

    // 1단계: 이미지가 있으면 먼저 업로드
    if (imageData) {
      console.log('📤 이미지 업로드 중...');
      ui.updateExplanationPanelStatus('이미지 업로드 중...');

      const uploadResult = await apiClient.uploadImage(metadata.videoId, imageData);
      imageId = uploadResult.imageId;

      console.log(`✅ 이미지 업로드 완료: ${imageId}`);
      ui.updateExplanationPanelStatus('분석 중...');
    }

    // 2단계: 컨텍스트 데이터 생성 (현재 자막 + 이전 자막들)
    const currentTime = detector.getCurrentTime() || 0;
    const contextData = subtitleCache.getContextForAPI(text, currentTime, 3);

    // 3단계: 자막 설명 요청 (imageId 포함)
    const explanation = await apiClient.explainSubtitle({
      videoId: metadata.videoId,
      selectedText: text,
      metadata: metadata,
      timestamp: currentTime, // 현재 재생 시간
      imageId: imageId, // 이미지 ID 추가
      context: contextData.context, // 이전 자막들 (문맥)
      currentSubtitle: contextData.currentSubtitle // 현재 자막
    });

    console.log(`⚡ 응답 시간: ${explanation.responseTime}ms`);
    console.log(`📦 캐시: ${explanation.cached ? 'HIT' : 'MISS'}`);

    // 패널 업데이트
    ui.updateExplanationPanel(explanation);

  } catch (error) {
    console.error('설명 생성 실패:', error);

    ui.updateExplanationPanel({
      error: true,
      message: error.message || i18n.t('ui.error'),
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
      50% { transform: translateY(-5px); }
    }

    /* 스크롤바 스타일 - 설명 패널 */
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

    /* 스크롤바 스타일 - 액션 패널 */
    .action-panel-content::-webkit-scrollbar {
      width: 6px;
    }

    .action-panel-content::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .action-panel-content::-webkit-scrollbar-thumb {
      background: rgba(255, 215, 0, 0.5);
      border-radius: 3px;
    }

    .action-panel-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 215, 0, 0.7);
    }
  `;

  document.head.appendChild(style);
}

/**
 * 시간 포맷 (초 → MM:SS)
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * SPA 네비게이션 감지 (Netflix는 SPA)
 */
function observeSpaNavigation(callback) {
  let lastUrl = location.href;

  function handleUrlChange() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log('🔄 URL 변경 감지:', lastUrl, '→', currentUrl);
      lastUrl = currentUrl;
      callback();
    }
  }

  // 방법 1: History API 패치
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(handleUrlChange, 100);
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(handleUrlChange, 100);
  };

  // 방법 2: popstate 이벤트 (뒤로가기/앞으로가기)
  window.addEventListener('popstate', () => {
    setTimeout(handleUrlChange, 100);
  });

  // 방법 3: 주기적 체크 (fallback - Netflix는 이 방법이 필수)
  setInterval(() => {
    handleUrlChange();
  }, 1000);
}

/**
 * 영상 페이지 초기화 (플로팅 버튼 + 이벤트 리스너)
 */
async function initVideoPage() {
  try {
    console.log('🎬 영상 페이지 초기화 시도...');

    // 이전 상태 정리
    if (ui.floatingButton) {
      ui.floatingButton.remove();
      ui.floatingButton = null;
      console.log('🗑️ 이전 플로팅 버튼 제거');
    }

    // 비디오 요소 대기 (선택적 - 2초만)
    await waitForVideoPlayer(2000);

    // 영상 메타데이터 추출
    console.log('📋 영상 메타데이터 추출 중...');
    const metadata = await detector.detectVideo();

    if (!metadata) {
      console.log('❌ 영상 감지 실패');
      return;
    }

    // 자막 캐시 초기화 (새로운 영상)
    subtitleCache.clear(metadata.videoId);

    // 자막 변경 감지 시작 (캐시 업데이트용)
    detector.startSubtitleObserver((text, timestamp) => {
      subtitleCache.addSubtitle(text, timestamp);
    });

    // 백엔드에 영상 등록
    await registerVideo(metadata);

    // showFloatingButton 설정 확인 후 플로팅 버튼 생성
    chrome.storage.sync.get({ showFloatingButton: true }, (settings) => {
      if (settings.showFloatingButton) {
        ui.createFloatingButton();
        console.log('💡 플로팅 버튼 생성 (설정: ON)');

        // 플로팅 버튼 클릭 이벤트 등록
        if (ui.floatingButton) {
          ui.floatingButton.addEventListener('click', () => {
            const currentSubtitle = detector.getCurrentSubtitle();

            if (currentSubtitle) {
              showActionPanel(currentSubtitle);
            } else {
              ui.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
            }
          });
        }
      } else {
        console.log('💡 플로팅 버튼 숨김 (설정: OFF)');
      }

      console.log('✅ 영상 페이지 초기화 완료');
      isVideoPageInitialized = true;
    });
  } catch (error) {
    console.error('❌ 영상 페이지 초기화 실패:', error);
    console.error('❌ 에러 스택:', error.stack);
  }
}

/**
 * Boot 함수 - watch 페이지일 때만 초기화
 */
async function boot() {
  console.log('🥾 Boot 함수 호출됨:', location.pathname);

  // watch 페이지가 아니면 종료
  if (!location.pathname.startsWith('/watch/')) {
    console.log('⏸️ watch 페이지 아님, 초기화 건너뜀');

    // watch 페이지를 벗어나면 플로팅 버튼 제거
    if (ui && ui.floatingButton) {
      ui.floatingButton.remove();
      ui.floatingButton = null;
      isVideoPageInitialized = false;
      console.log('🗑️ 플로팅 버튼 제거');
    }
    return;
  }

  // 같은 영상이면 재초기화 스킵 (중복 방지)
  const currentVideoId = location.pathname.match(/\/watch\/(\d+)/)?.[1];
  if (isVideoPageInitialized && detector?.currentVideoId === currentVideoId) {
    console.log('✅ 같은 영상, 재초기화 스킵:', currentVideoId);
    return;
  }

  console.log('🎬 영상 초기화 진행:', currentVideoId);

  // 전역 초기화 (한 번만)
  await initGlobal();

  // 영상 페이지 초기화
  await initVideoPage();
}

// 초기화 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// SPA 네비게이션 감지
observeSpaNavigation(boot);

// 설정 변경 감지 (플로팅 버튼 표시/숨김)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.showFloatingButton) {
    const newValue = changes.showFloatingButton.newValue;
    console.log('⚙️ showFloatingButton 설정 변경:', newValue);

    if (newValue && !ui.floatingButton && location.pathname.startsWith('/watch/')) {
      // 설정이 켜졌고 버튼이 없으며 watch 페이지인 경우 생성
      ui.createFloatingButton();
      console.log('💡 플로팅 버튼 생성');

      // 버튼 생성 후 클릭 이벤트 등록
      if (ui.floatingButton) {
        ui.floatingButton.addEventListener('click', () => {
          const currentSubtitle = detector.getCurrentSubtitle();

          if (currentSubtitle) {
            showActionPanel(currentSubtitle);
          } else {
            ui.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
          }
        });
      }
    } else if (!newValue && ui.floatingButton) {
      // 설정이 꺼졌고 버튼이 있으면 제거
      ui.floatingButton.remove();
      ui.floatingButton = null;
      console.log('💡 플로팅 버튼 제거');
    }
  }
});
