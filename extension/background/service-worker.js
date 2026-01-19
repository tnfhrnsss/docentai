/**
 * Background Service Worker
 */

console.log('🔧 DocentAI Service Worker 로드됨');

/**
 * Command 리스너 (전체화면에서도 작동)
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log('⌨️ 단축키 실행:', command);

  if (command === 'explain-current-subtitle') {
    try {
      // 현재 활성 탭 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        console.error('❌ 활성 탭을 찾을 수 없습니다.');
        return;
      }

      // Content script로 메시지 전송
      chrome.tabs.sendMessage(tab.id, { type: 'EXPLAIN_CURRENT_SUBTITLE' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ 메시지 전송 실패:', chrome.runtime.lastError.message);
        } else {
          console.log('✅ Content script로 단축키 명령 전송 완료');
        }
      });
    } catch (error) {
      console.error('❌ 단축키 처리 오류:', error);
    }
  }
});

/**
 * 메시지 리스너
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 메시지 수신:', request.type, 'Sender:', sender);

  if (request.type === 'CAPTURE_SCREEN') {
    // sender.tab이 없는 경우를 대비해 현재 활성 탭 가져오기
    const getActiveTab = async () => {
      if (sender.tab?.id) {
        return sender.tab.id;
      }

      // 현재 활성 탭 조회
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        return tabs[0].id;
      }

      throw new Error('활성 탭을 찾을 수 없습니다.');
    };

    getActiveTab()
      .then(tabId => {
        console.log('🎯 캡처할 탭 ID:', tabId);
        return captureScreen(tabId);
      })
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
async function captureScreen(tabId) {
  try {
    console.log('🎯 화면 캡처 시도 중... Tab ID:', tabId);

    // 탭 정보 가져오기
    const tab = await chrome.tabs.get(tabId);
    console.log('📍 탭 정보:', tab.url, 'Window ID:', tab.windowId);

    // windowId를 명시적으로 전달하여 화면 캡처
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
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
