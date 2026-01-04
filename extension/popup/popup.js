/**
 * DocentAI - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // i18n 초기화 대기
  await i18n.init();
  i18n.translatePage();

  // Step3 텍스트 동적 처리 (HTML 태그 포함)
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcut = isMac ? i18n.t('popup.shortcutMac') : i18n.t('popup.shortcutWin');
  const step3Element = document.getElementById('step3-text');
  const step3Text = i18n.t('popup.step3', { shortcut });
  step3Element.innerHTML = step3Text.replace(
    shortcut,
    `<kbd>${shortcut}</kbd>`
  );

  console.log('💡 DocentAI Popup 로드됨');

  // 설정 버튼
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 테스트 버튼
  const testBtn = document.getElementById('testBtn');
  testBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TEST_EXPLANATION'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error(i18n.t('popup.messageError'), chrome.runtime.lastError);
            alert(i18n.t('popup.alertNetflixOnly'));
          } else {
            console.log('테스트 응답:', response);
          }
        });
      }
    });
  });

  // 현재 탭이 넷플릭스인지 확인
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || '';
    const statusElement = document.getElementById('status');

    if (currentUrl.includes('netflix.com')) {
      statusElement.textContent = i18n.t('popup.statusActive');
      statusElement.style.color = '#4ade80';
    } else {
      statusElement.textContent = i18n.t('popup.statusWaiting');
      statusElement.style.color = '#fbbf24';
    }
  });
});
