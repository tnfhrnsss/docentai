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
  const step2Element = document.getElementById('step2-text');
  const step2Text = i18n.t('popup.step2', { shortcut });
  step2Element.innerHTML = step2Text.replace(
    shortcut,
    `<kbd>${shortcut}</kbd>`
  );

  // 설정 버튼
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
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
