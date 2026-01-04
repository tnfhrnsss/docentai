/**
 * DocentAI - Options Page Script
 */

// 기본 설정값
const DEFAULT_SETTINGS = {
  enableExtension: true,
  autoAnalyze: true,
  showFloatingButton: true,
  showHoverIndicator: true,
  useDummyData: true,
  apiEndpoint: 'http://localhost:7777'
};

// 설정 로드
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    console.log('📥 설정 로드:', settings);

    document.getElementById('enableExtension').checked = settings.enableExtension;
    document.getElementById('autoAnalyze').checked = settings.autoAnalyze;
    document.getElementById('showFloatingButton').checked = settings.showFloatingButton;
    document.getElementById('showHoverIndicator').checked = settings.showHoverIndicator;
    document.getElementById('useDummyData').checked = settings.useDummyData;
    document.getElementById('apiEndpoint').value = settings.apiEndpoint;
  });
}

// 설정 저장
function saveSettings() {
  const settings = {
    enableExtension: document.getElementById('enableExtension').checked,
    autoAnalyze: document.getElementById('autoAnalyze').checked,
    showFloatingButton: document.getElementById('showFloatingButton').checked,
    showHoverIndicator: document.getElementById('showHoverIndicator').checked,
    useDummyData: document.getElementById('useDummyData').checked,
    apiEndpoint: document.getElementById('apiEndpoint').value
  };

  chrome.storage.sync.set(settings, () => {
    console.log('💾 설정 저장:', settings);

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
      console.log('🔄 설정 초기화');
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
  console.log('⚙️ DocentAI 설정 페이지 로드됨');

  loadSettings();

  // 저장 버튼
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // 초기화 버튼
  document.getElementById('resetBtn').addEventListener('click', resetSettings);

  // Enter 키로 저장
  document.getElementById('apiEndpoint').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });
});
