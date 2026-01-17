let detector = null;
let apiClient = null;
let ui = null;

async function init() {
  console.log('🚀 DocentAI 초기화 중...');

  // i18n 초기화
  await i18n.init();

  // 인스턴스 생성
  detector = new NetflixDetector();
  apiClient = new APIClient('http://localhost:7777');
  ui = new UIComponents();

  // CSS 애니메이션 주입
  injectStyles();

  console.log('✅ 전역 초기화 완료');

  // 현재 URL이 /watch/라면 영상 페이지 초기화
  if (location.href.includes('/watch/')) {
    await initVideoPage();
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
        console.log('🎬 비디오 플레이어 감지됨');
        resolve();
      }
    }, 500);

    // 10초 타임아웃
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('⏱️ 비디오 플레이어 대기 시간 초과');
      resolve();
    }, 10000);
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

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  console.log('🎧 이벤트 리스너 설정 중...');

  // 2. 플로팅 버튼 클릭
  ui.floatingButton.addEventListener('click', () => {
    const currentSubtitle = detector.getCurrentSubtitle();

    if (currentSubtitle) {
      showActionPanel(currentSubtitle);
    } else {
      ui.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
    }
  });

  // 3. 단축키 (Ctrl+E / ⌘+E)
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

  console.log('✅ 이벤트 리스너 설정 완료');
}

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

    // 2단계: 자막 설명 요청 (imageId 포함)
    const explanation = await apiClient.explainSubtitle({
      videoId: metadata.videoId,
      selectedText: text,
      metadata: metadata,
      imageId: imageId // 이미지 ID 추가
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

/**
 * 시간 포맷 (초 → MM:SS)
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * URL 변경 감지 (Netflix는 SPA이므로 필요)
 */
let lastUrl = location.href;
function watchUrlChanges() {
  console.log('👀 URL 변경 감지 시작');

  function handleUrlChange() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log('🔄 URL 변경 감지:', lastUrl, '→', currentUrl);
      lastUrl = currentUrl;

      // /watch/ URL로 변경되었을 때 초기화
      if (currentUrl.includes('/watch/')) {
        initVideoPage();
      } else {
        // watch 페이지를 벗어나면 플로팅 버튼 제거
        if (ui.floatingButton) {
          ui.floatingButton.remove();
          ui.floatingButton = null;
          console.log('🗑️ 플로팅 버튼 제거');
        }
      }
    }
  }

  // 방법 1: History API 패치
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    console.log('📍 pushState 호출됨');
    originalPushState.apply(this, args);
    handleUrlChange();
  };

  history.replaceState = function(...args) {
    console.log('📍 replaceState 호출됨');
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };

  // 방법 2: popstate 이벤트 (뒤로가기/앞으로가기)
  window.addEventListener('popstate', () => {
    console.log('📍 popstate 이벤트');
    handleUrlChange();
  });

  // 방법 3: 주기적 체크 (fallback)
  setInterval(() => {
    if (location.href !== lastUrl) {
      console.log('📍 주기적 체크로 URL 변경 감지');
      handleUrlChange();
    }
  }, 1000);
}

/**
 * 영상 페이지 초기화 (플로팅 버튼 + 이벤트 리스너)
 */
async function initVideoPage() {
  console.log('🎬 영상 페이지 초기화 시도...');

  // 이미 초기화되었으면 스킵
  if (ui.floatingButton) {
    console.log('✅ 이미 초기화됨');
    return;
  }

  // 영상 감지 대기
  await waitForVideoPlayer();

  // 영상 메타데이터 추출
  const metadata = await detector.detectVideo();

  if (metadata) {
    // 플로팅 버튼 생성 (영상 재생 페이지에서만)
    ui.createFloatingButton();

    // 백엔드에 영상 등록
    await registerVideo(metadata);

    // 이벤트 리스너 설정
    setupEventListeners();

    console.log('✅ 영상 페이지 초기화 완료');
  } else {
    console.log('❌ 영상 감지 실패');
  }
}

// 초기화 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// URL 변경 감지 시작
watchUrlChanges();
