/**
 * DocentAI - Main Content Script
 * 넷플릭스 자막 설명 Chrome Extension
 */

// 전역 인스턴스
let detector = null;
let apiClient = null;
let ui = null;

/**
 * 초기화
 */
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

  ui.createFloatingButton();

  // 영상 감지 대기
  await waitForVideoPlayer();

  // 영상 메타데이터 추출
  const metadata = await detector.detectVideo();
  console.log('333' + metadata);
  if (metadata) {
    // 백엔드에 영상 등록
    await registerVideo(metadata);

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
      ui.showToast('✅ 준비 완료! 자막을 클릭해보세요.');
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
  ui.floatingButton.addEventListener('click', async () => {
    const currentSubtitle = detector.getCurrentSubtitle();

    if (currentSubtitle) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      await explainSubtitle(currentSubtitle, centerX, centerY);
    } else {
      ui.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
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
        ui.showToast(i18n.t('ui.noSubtitleAvailable') || '현재 표시된 자막이 없습니다.');
      }
    }
  });

  console.log('✅ 이벤트 리스너 설정 완료');
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

// 초기화 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
