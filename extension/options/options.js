/**
 * DocentAI - Options Page Script
 */

// 기본 설정값
const DEFAULT_SETTINGS = {
  showFloatingButton: true,
};

// 설정 로드
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    document.getElementById('showFloatingButton').checked = settings.showFloatingButton;
  });
}

// 설정 저장
function saveSettings() {
  const settings = {
    showFloatingButton: document.getElementById('showFloatingButton').checked,
  };

  chrome.storage.sync.set(settings, () => {
    // 저장 메시지 표시
    const saveMessage = document.getElementById('saveMessage');
    saveMessage.classList.add('show');

    setTimeout(() => {
      saveMessage.classList.remove('show');
    }, 3000);
  });
}

// 설정 초기화
function resetSettings() {
  if (confirm('모든 설정을 초기화하시겠습니까?')) {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      loadSettings();

      const saveMessage = document.getElementById('saveMessage');
      saveMessage.textContent = '설정이 초기화되었습니다!';
      saveMessage.classList.add('show');

      setTimeout(() => {
        saveMessage.textContent = '설정이 저장되었습니다!';
        saveMessage.classList.remove('show');
      }, 3000);
    });
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 저장 버튼
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // 초기화 버튼
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
});
