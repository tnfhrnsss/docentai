/**
 * 화면 캡처 기능 - Background Service Worker Extension
 *
 * 이 파일은 개발(dev) 빌드에서만 포함됩니다.
 * 프로덕션 빌드에서는 제외되어 Chrome Web Store 정책을 준수합니다.
 */

console.log('📸 화면 캡처 기능이 활성화되었습니다 (DEV MODE)');

/**
 * 화면 캡처 메시지 리스너
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_SCREEN') {
    console.log('📩 메시지 수신: CAPTURE_SCREEN', 'Sender:', sender);

    // sender.tab에서 windowId 가져오기
    if (!sender.tab?.windowId) {
      console.error('❌ 탭 정보를 찾을 수 없습니다.');
      sendResponse({ error: '활성 탭을 찾을 수 없습니다.' });
      return false;
    }

    const windowId = sender.tab.windowId;
    console.log('🎯 캡처할 Window ID:', windowId);

    captureScreen(windowId)
      .then(dataUrl => {
        console.log('✅ 화면 캡처 성공');
        sendResponse({ dataUrl });
      })
      .catch(error => {
        console.error('❌ 화면 캡처 실패:', error);
        sendResponse({ error: error.message });
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
    console.log('🎯 화면 캡처 시도 중... Window ID:', windowId);

    // activeTab 권한으로 화면 캡처
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png'
    });

    console.log('✅ 캡처 성공, 데이터 크기:', dataUrl?.length || 0);
    return dataUrl;
  } catch (error) {
    console.error('❌ 화면 캡처 오류:', error);

    // 더 자세한 에러 메시지 제공
    let errorMessage = error.message;

    if (errorMessage.includes('Cannot access') || errorMessage.includes('permission')) {
      errorMessage = '권한 부족: Extension을 다시 로드하거나 재설치해주세요.';
    } else if (errorMessage.includes('No active')) {
      errorMessage = '활성화된 탭이 없습니다.';
    } else if (errorMessage.includes('capturing') || errorMessage.includes('capture')) {
      errorMessage = 'Netflix DRM 보호로 인해 화면 캡처가 차단되었습니다. 📁 파일 선택 기능을 이용해주세요.';
    } else if (errorMessage.includes('secure')) {
      errorMessage = '이 페이지는 보안 정책으로 화면 캡처가 차단됩니다. 📁 파일 선택 기능을 이용해주세요.';
    }

    throw new Error(errorMessage);
  }
}
