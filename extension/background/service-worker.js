/**
 * Background Service Worker
 */

// 메시지 리스너는 추가 기능 파일에서 등록됩니다.

/**
 * Extension 설치/업데이트 시 실행
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // install
  } else if (details.reason === 'update') {
    // update
  }
});

