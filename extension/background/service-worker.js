/**
 * Background Service Worker
 *
 * 화면 캡처 기능은 개발 빌드(DEV MODE)에서만 활성화됩니다.
 * 프로덕션 빌드에서는 service-worker-capture.js가 제외되어 Chrome Web Store 정책을 준수합니다.
 */

console.log('🔧 DocentAI Service Worker 로드됨');

// 메시지 리스너는 추가 기능 파일에서 등록됩니다.
// 현재는 화면 캡처 외 다른 백그라운드 작업이 없습니다.

/**
 * Extension 설치/업데이트 시 실행
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✅ DocentAI Extension이 설치되었습니다.');
  } else if (details.reason === 'update') {
    console.log('🔄 DocentAI Extension이 업데이트되었습니다.');
  }
});

// 화면 캡처 관련 로직은 service-worker-capture.js에 분리되어 있습니다.
// 개발 빌드 시 해당 파일이 이 파일에 병합됩니다.
