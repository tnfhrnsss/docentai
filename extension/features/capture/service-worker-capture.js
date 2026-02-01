/**
 * Background Service Worker Extension
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_SCREEN') {
    // sender.tab에서 windowId 가져오기
    if (!sender.tab?.windowId) {
      sendResponse({ errorCode: 'NO_ACTIVE_TAB' });
      return false;
    }

    const windowId = sender.tab.windowId;
    captureScreen(windowId)
      .then(dataUrl => {
        sendResponse({ dataUrl });
      })
      .catch(error => {
        sendResponse({ errorCode: error.code || 'UNKNOWN' });
      });

    // 비동기 응답을 위해 true 반환
    return true;
  }
});

/**
 * 화면 캡처 함수
 */
async function captureScreen(windowId) {
  try {
    // activeTab 권한으로 화면 캡처
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png'
    });

    return dataUrl;
  } catch (error) {

    // 에러 코드 결정
    let errorCode = 'UNKNOWN';
    const errorMessage = error.message;

    if (errorMessage.includes('Cannot access') || errorMessage.includes('permission')) {
      errorCode = 'PERMISSION_DENIED';
    } else if (errorMessage.includes('No active')) {
      errorCode = 'NO_TAB';
    } else if (errorMessage.includes('capturing') || errorMessage.includes('capture')) {
      errorCode = 'DRM_BLOCKED';
    } else if (errorMessage.includes('secure')) {
      errorCode = 'SECURE_PAGE';
    }

    const err = new Error(errorMessage);
    err.code = errorCode;
    throw err;
  }
}
