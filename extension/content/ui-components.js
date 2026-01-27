/**
 * UI 컴포넌트 관리
 */
class UIComponents {
  constructor() {
    this.currentPanel = null;
    this.actionPanel = null;
    this.floatingButton = null;
    this.progressBar = null;
    this.selectedImage = null;
  }

  createFloatingButton() {
    if (this.floatingButton) return;

    const button = document.createElement('div');
    button.id = 'subtitle-explainer-floating-btn';
    button.innerHTML = '💡';
    button.title = i18n.t('ui.floatingButtonTitle');

    button.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(255, 215, 0, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fadeIn 0.3s ease-out;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 3px 12px rgba(255, 215, 0, 0.6)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.4)';
    });

    document.body.appendChild(button);
    this.floatingButton = button;

    return button;
  }


  createExplanationPanel(selectedText, x, y) {
    // 기존 패널 제거
    this.removeExplanationPanel();

    const panel = document.createElement('div');
    panel.id = 'subtitle-explanation-panel';

    // 화면 밖으로 나가지 않도록 위치 조정
    const safeX = Math.min(x, window.innerWidth - 370);
    const safeY = Math.min(y, window.innerHeight - 300);

    panel.innerHTML = `
      <div style="
        position: fixed;
        left: ${safeX}px;
        top: ${safeY}px;
        width: 350px;
        max-height: 500px;
        background: rgba(20, 20, 20, 0.98);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 12px;
        padding: 20px;
        color: white;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 12px;
        ">
          <div style="
            background: rgba(255, 215, 0, 0.2);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            color: #ffd700;
            font-weight: 500;
            word-break: break-word;
            flex: 1;
          ">"${selectedText}"</div>
          <button class="close-btn" style="
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            padding: 0;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
            transition: color 0.2s;
          ">×</button>
        </div>
        <div class="explanation-content" style="
          font-size: 15px;
          line-height: 1.7;
          color: #e0e0e0;
        ">
          <div class="loading" style="
            display: flex;
            align-items: center;
            gap: 8px;
            color: #999;
          ">
            <div class="spinner" style="
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255, 215, 0, 0.3);
              border-top-color: #ffd700;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            "></div>
            ${i18n.t('ui.analyzing')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.currentPanel = panel;

    // 닫기 버튼 이벤트
    const closeBtn = panel.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.removeExplanationPanel());
    closeBtn.addEventListener('mouseenter', (e) => {
      e.target.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', (e) => {
      e.target.style.color = '#999';
    });

    // 외부 클릭 시 닫기
    setTimeout(() => {
      const closeOnOutsideClick = (e) => {
        if (!panel.contains(e.target)) {
          this.removeExplanationPanel();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);

    return panel;
  }

  /**
   * 설명 패널 상태 업데이트 (로딩 메시지 변경)
   */
  updateExplanationPanelStatus(status) {
    if (!this.currentPanel) return;

    const content = this.currentPanel.querySelector('.explanation-content');
    const loadingDiv = content?.querySelector('.loading');

    if (loadingDiv) {
      // 로딩 텍스트만 업데이트
      const textNode = Array.from(loadingDiv.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = status;
      }
    }
  }

  /**
   * 설명 패널 내용 업데이트
   */
  updateExplanationPanel(explanation) {
    if (!this.currentPanel) return;

    const content = this.currentPanel.querySelector('.explanation-content');

    if (explanation.error) {
      content.innerHTML = `
        <div style="color: #ff6b6b; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">⚠️</span>
          <span>${explanation.message || i18n.t('ui.error')}</span>
        </div>
        ${explanation.retryAfter ? `
          <div style="margin-top: 12px; font-size: 13px; color: #999;">
            ${explanation.retryAfter}${i18n.t('ui.retryAfter')}
          </div>
        ` : ''}
      `;
      return;
    }

    content.innerHTML = `
      <div style="
        margin-bottom: 16px;
        white-space: pre-line;
        word-wrap: break-word;
        max-height: calc(1.7em * 4 + 8px);
        overflow-y: auto;
        padding-right: 8px;
      ">${explanation.text.trim()}</div>

      ${explanation.references && explanation.references.length > 0 ? `
        <div style="
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            font-size: 13px;
            color: #ffd700;
            font-weight: 500;
            margin-bottom: 8px;
          ">${i18n.t('ui.referencesTitle')}</div>
          ${explanation.references.map(ref => `
            <a href="#" data-timestamp="${ref.timestamp}" style="
              color: #4a9eff;
              text-decoration: none;
              display: block;
              margin-top: 6px;
              font-size: 13px;
              transition: color 0.2s;
            " onmouseover="this.style.color='#6bb6ff'"
               onmouseout="this.style.color='#4a9eff'">
              → ${ref.description}
            </a>
          `).join('')}
        </div>
      ` : ''}

      ${explanation.cached !== undefined ? `
        <div style="
          margin-top: 12px;
          font-size: 11px;
          color: #666;
          text-align: right;
        ">
          ${explanation.cached ? i18n.t('ui.cached') : i18n.t('ui.newAnalysis')} (${explanation.responseTime}ms)
        </div>
      ` : ''}
    `;

    // 타임스탬프 링크 클릭 이벤트
    content.querySelectorAll('[data-timestamp]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const timestamp = parseFloat(e.target.dataset.timestamp);
        window.postMessage({
          type: 'SEEK_TO_TIMESTAMP',
          timestamp
        }, '*');
        this.removeExplanationPanel();
      });
    });
  }

  /**
   * 설명 패널 제거
   */
  removeExplanationPanel() {
    if (this.currentPanel) {
      this.currentPanel.remove();
      this.currentPanel = null;
    }
  }

  /**
   * 액션 패널 생성 (이미지 첨부 UI 포함)
   */
  createActionPanel(selectedText, onExplain) {
    // 기존 패널 제거
    this.removeActionPanel();

    const panel = document.createElement('div');
    panel.id = 'subtitle-action-panel';

    // 화면 중앙에 위치
    const centerX = (window.innerWidth - 400) / 2;
    const centerY = (window.innerHeight - 400) / 2;

    panel.innerHTML = `
      <div style="
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: 400px;
        max-height: 80vh;
        background: rgba(20, 20, 20, 0.98);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 12px;
        padding: 24px;
        color: white;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-shrink: 0;
        ">
          <h3 style="
            margin: 0;
            font-size: 18px;
            color: #ffd700;
            font-weight: 600;
          ">${i18n.t('ui.actionPanel.title')}</h3>
          <button class="close-btn" style="
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            padding: 0;
            width: 24px;
            height: 24px;
            transition: color 0.2s;
          ">×</button>
        </div>

        <div class="action-panel-content" style="
          flex: 1;
          overflow-y: auto;
          margin-bottom: 20px;
          padding-right: 4px;
        ">
          <div style="
            background: rgba(255, 215, 0, 0.1);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 3px solid #ffd700;
          ">
            <div style="
              font-size: 12px;
              color: #ffd700;
              margin-bottom: 4px;
            ">${i18n.t('ui.actionPanel.currentSubtitle')}</div>
            <div style="
              font-size: 15px;
              color: #e0e0e0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">"${selectedText}"</div>
          </div>

          <div>
            <div id="image-preview-container" style="
              display: none;
              margin-top: 12px;
              padding: 12px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 6px;
              border: 1px dashed rgba(255, 255, 255, 0.2);
            ">
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              ">
                <span style="font-size: 12px; color: #999;">${i18n.t('ui.actionPanel.imagePreview')}</span>
                <button id="remove-image-btn" style="
                  background: none;
                  border: none;
                  color: #ff6b6b;
                  cursor: pointer;
                  font-size: 12px;
                  padding: 4px 8px;
                  border-radius: 4px;
                  transition: background 0.2s;
                ">${i18n.t('ui.actionPanel.removeImage')}</button>
              </div>
              <img id="image-preview" style="
                width: 100%;
                max-height: 250px;
                object-fit: contain;
                border-radius: 4px;
                display: block;
              ">
            </div>
          </div>
        </div>

        <div style="
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        ">
          <button id="cancel-btn" style="
            flex: 1;
            padding: 12px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
          ">${i18n.t('ui.actionPanel.cancel')}</button>
          <button id="explain-btn" style="
            flex: 2;
            padding: 12px;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            border: none;
            border-radius: 8px;
            color: #000;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
          ">${i18n.t('ui.actionPanel.explain')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.actionPanel = panel;

    // 버튼 호버 효과
    const explainBtn = panel.querySelector('#explain-btn');
    const cancelBtn = panel.querySelector('#cancel-btn');
    const removeImageBtn = panel.querySelector('#remove-image-btn');

    explainBtn.addEventListener('mouseenter', () => {
      explainBtn.style.transform = 'translateY(-2px)';
      explainBtn.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
    });
    explainBtn.addEventListener('mouseleave', () => {
      explainBtn.style.transform = 'translateY(0)';
      explainBtn.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.3)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    removeImageBtn.addEventListener('mouseenter', () => {
      removeImageBtn.style.background = 'rgba(255, 107, 107, 0.2)';
    });
    removeImageBtn.addEventListener('mouseleave', () => {
      removeImageBtn.style.background = 'transparent';
    });

    // 닫기 버튼
    const closeBtn = panel.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.removeActionPanel());
    closeBtn.addEventListener('mouseenter', (e) => {
      e.target.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', (e) => {
      e.target.style.color = '#999';
    });

    // 이미지 제거 버튼
    removeImageBtn.addEventListener('click', () => {
      this.selectedImage = null;
      const previewContainer = panel.querySelector('#image-preview-container');
      previewContainer.style.display = 'none';
    });

    // 취소 버튼
    cancelBtn.addEventListener('click', () => this.removeActionPanel());

    // 설명 요청 버튼
    explainBtn.addEventListener('click', () => {
      if (onExplain) {
        onExplain(this.selectedImage);
      }
      this.removeActionPanel();
    });

    // 외부 클릭 시 닫기
    setTimeout(() => {
      const closeOnOutsideClick = (e) => {
        if (!panel.contains(e.target)) {
          this.removeActionPanel();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);

    return panel;
  }

  /**
   * 액션 패널 제거
   */
  removeActionPanel() {
    if (this.actionPanel) {
      this.actionPanel.remove();
      this.actionPanel = null;
      this.selectedImage = null;
    }
  }

  /**
   * 이미지 파일 처리
   */
  handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedImage = e.target.result;
      this.showImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /**
   * 이미지 미리보기 표시
   */
  showImagePreview(dataUrl) {
    if (!this.actionPanel) return;

    const previewContainer = this.actionPanel.querySelector('#image-preview-container');
    const previewImg = this.actionPanel.querySelector('#image-preview');

    previewImg.src = dataUrl;
    previewContainer.style.display = 'block';
  }

  /**
   * 소스 아이콘 가져오기
   */
  getSourceIcon(type) {
    const icons = {
      'namuwiki': '🌳',
      'wikipedia': '📖',
      'fandom': '⭐',
      'video_analysis': '🎬'
    };
    return icons[type] || '📄';
  }

  /**
   * 진행 상황 바 표시
   */
  showProgressBar() {
    if (this.progressBar) return;

    const progressBar = document.createElement('div');
    progressBar.id = 'video-analysis-progress';

    progressBar.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 300px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        padding: 16px;
        z-index: 9999;
        color: white;
        animation: slideInRight 0.3s ease-out;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        ">
          <span style="font-size: 24px;">🎬</span>
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 4px;">${i18n.t('ui.videoAnalyzing')}</div>
            <div style="font-size: 12px; color: #999;">${i18n.t('ui.pleaseWait')}</div>
          </div>
        </div>
        <div style="
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        ">
          <div id="progress-fill" style="
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #ffd700, #ffed4e);
            transition: width 0.3s ease-out;
          "></div>
        </div>
        <div id="progress-text" style="
          margin-top: 8px;
          font-size: 12px;
          color: #999;
          text-align: right;
        ">0%</div>
      </div>
    `;

    document.body.appendChild(progressBar);
    this.progressBar = progressBar;
  }

  /**
   * 진행 상황 업데이트
   */
  updateProgressBar(progress) {
    if (!this.progressBar) return;

    const fill = this.progressBar.querySelector('#progress-fill');
    const text = this.progressBar.querySelector('#progress-text');

    if (fill && text) {
      fill.style.width = `${progress}%`;
      text.textContent = `${progress}%`;
    }
  }

  /**
   * 진행 상황 바 제거
   */
  hideProgressBar() {
    if (this.progressBar) {
      this.progressBar.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        this.progressBar?.remove();
        this.progressBar = null;
      }, 300);
    }
  }

  /**
   * 토스트 메시지 표시
   */
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}
