// Popup script for Upwork extension settings

class PopupManager {
  constructor() {
    this.minSpendInput = document.getElementById('minSpend');
    this.saveBtn = document.getElementById('saveBtn');
    this.statusDiv = document.getElementById('status');
    this.filteringEnabledCheckbox = document.getElementById('filteringEnabled');
    this.autoRefreshEnabledCheckbox = document.getElementById('autoRefreshEnabled');
    this.autoRefreshIntervalInput = document.getElementById('autoRefreshInterval');
    this.showAllBtn = document.getElementById('showAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.lastProcessingEl = document.getElementById('lastProcessing');
    this.countsEl = document.getElementById('counts');
    
    // Proposals filter elements
    this.proposalsMinRange = document.getElementById('proposalsMinRange');
    this.proposalsMaxRange = document.getElementById('proposalsMaxRange');
    this.proposalsMinDisplay = document.getElementById('proposalsMinDisplay');
    this.proposalsMaxDisplay = document.getElementById('proposalsMaxDisplay');
    this.proposalsTrack = document.getElementById('proposalsTrack');
    
    this.initialize();
  }

  async initialize() {
    // Load saved settings
    await this.loadSettings();
    
    // Add event listeners
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.minSpendInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveSettings();
      }
    });
    this.filteringEnabledCheckbox.addEventListener('change', () => this.saveSettings());
    this.autoRefreshEnabledCheckbox.addEventListener('change', () => this.saveSettings());
    this.autoRefreshIntervalInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { this.saveSettings(); } });

    this.showAllBtn.addEventListener('click', () => this.showAllHidden());
    this.resetBtn.addEventListener('click', () => this.resetDefaults());
    
    // Add proposals range slider event listeners
    this.setupProposalsRangeSliders();
    this.setupPresetButtons();

    // Load status from content script
    this.refreshStatus();
    // Periodically refresh a few times after open to catch changes
    this.statusInterval = setInterval(() => this.refreshStatus(), 1500);
    setTimeout(() => clearInterval(this.statusInterval), 7000);
  }

  setupProposalsRangeSliders() {
    let isDraggingMin = false;
    let isDraggingMax = false;
    
    // Update track and displays when sliders change
    const updateTrack = () => {
      let minVal = parseInt(this.proposalsMinRange.value);
      let maxVal = parseInt(this.proposalsMaxRange.value);
      
      // Handle overlapping sliders based on which one is being dragged
      if (minVal > maxVal) {
        if (isDraggingMin) {
          // If min slider is being dragged and exceeds max, push max up
          this.proposalsMaxRange.value = minVal;
          maxVal = minVal;
        } else if (isDraggingMax) {
          // If max slider is being dragged and goes below min, push min down
          this.proposalsMinRange.value = maxVal;
          minVal = maxVal;
        } else {
          // If neither is being dragged (e.g., from preset), ensure min <= max
          if (minVal > maxVal) {
            this.proposalsMinRange.value = maxVal;
            minVal = maxVal;
          }
        }
      }
      
      // Update displays
      this.proposalsMinDisplay.textContent = minVal;
      this.proposalsMaxDisplay.textContent = maxVal === 100 ? '100+' : maxVal;
      
      // Update track
      const minPercent = (minVal / 100) * 100;
      const maxPercent = (maxVal / 100) * 100;
      this.proposalsTrack.style.left = minPercent + '%';
      this.proposalsTrack.style.right = (100 - maxPercent) + '%';

      // Ensure the actively dragged thumb stays on top when overlapping
      this.proposalsMinRange.style.zIndex = isDraggingMin ? '3' : '2';
      this.proposalsMaxRange.style.zIndex = isDraggingMax ? '3' : '2';
      
      // Update preset button states
      this.updatePresetButtonStates(minVal, maxVal);
    };

    // Track which slider is being dragged
    this.proposalsMinRange.addEventListener('mousedown', () => {
      isDraggingMin = true;
      isDraggingMax = false;
    });
    
    this.proposalsMaxRange.addEventListener('mousedown', () => {
      isDraggingMax = true;
      isDraggingMin = false;
    });

    // Touch support
    this.proposalsMinRange.addEventListener('touchstart', () => {
      isDraggingMin = true;
      isDraggingMax = false;
    }, { passive: true });
    this.proposalsMaxRange.addEventListener('touchstart', () => {
      isDraggingMax = true;
      isDraggingMin = false;
    }, { passive: true });
    
    // Reset dragging state when mouse is released
    document.addEventListener('mouseup', () => {
      isDraggingMin = false;
      isDraggingMax = false;
    });
    
    // Update on input changes
    this.proposalsMinRange.addEventListener('input', updateTrack);
    this.proposalsMaxRange.addEventListener('input', updateTrack);
    
    // Initial update
    updateTrack();
  }

  setupPresetButtons() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    presetButtons.forEach(button => {
      button.addEventListener('click', () => {
        const min = parseInt(button.dataset.min);
        const max = parseInt(button.dataset.max);
        
        this.proposalsMinRange.value = min;
        this.proposalsMaxRange.value = max;
        
        // Trigger the update
        this.proposalsMinRange.dispatchEvent(new Event('input'));
      });
    });
  }

  updatePresetButtonStates(minVal, maxVal) {
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    presetButtons.forEach(button => {
      const presetMin = parseInt(button.dataset.min);
      const presetMax = parseInt(button.dataset.max);
      
      // Check if current values match this preset
      const isActive = (minVal === presetMin && maxVal === presetMax);
      
      if (isActive) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['minimumSpent', 'proposalsMin', 'proposalsMax', 'filteringEnabled', 'autoRefreshEnabled', 'autoRefreshIntervalMs']);
      const savedMinSpend = result.minimumSpent || 1; // Default to 1 if not set
      const savedProposalsMin = result.proposalsMin || 0; // Default to 0
      const savedProposalsMax = result.proposalsMax || 100; // Default to 100
      const filteringEnabled = typeof result.filteringEnabled === 'boolean' ? result.filteringEnabled : true;
      const autoRefreshEnabled = typeof result.autoRefreshEnabled === 'boolean' ? result.autoRefreshEnabled : true;
      const autoRefreshIntervalMs = typeof result.autoRefreshIntervalMs === 'number' && result.autoRefreshIntervalMs > 0 ? result.autoRefreshIntervalMs : 60000;
      
      this.minSpendInput.value = savedMinSpend;
      this.proposalsMinRange.value = savedProposalsMin;
      this.proposalsMaxRange.value = savedProposalsMax;
      this.filteringEnabledCheckbox.checked = filteringEnabled;
      this.autoRefreshEnabledCheckbox.checked = autoRefreshEnabled;
      this.autoRefreshIntervalInput.value = Math.round(autoRefreshIntervalMs / 1000);
      
      // Track and displays will be updated by the initial slider setup in initialize()
      
      console.log('Loaded settings:', { 
        minimumSpent: savedMinSpend, 
        proposalsMin: savedProposalsMin, 
        proposalsMax: savedProposalsMax,
        filteringEnabled,
        autoRefreshEnabled,
        autoRefreshIntervalMs
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to default values
      this.minSpendInput.value = 1;
      this.proposalsMinRange.value = 0;
      this.proposalsMaxRange.value = 100;
      this.filteringEnabledCheckbox.checked = true;
      this.autoRefreshEnabledCheckbox.checked = true;
      this.autoRefreshIntervalInput.value = 60;
    }
  }

  async saveSettings() {
    const minSpend = parseInt(this.minSpendInput.value) || 0;
    const proposalsMin = parseInt(this.proposalsMinRange.value) || 0;
    const proposalsMax = parseInt(this.proposalsMaxRange.value) || 100;
    const filteringEnabled = !!this.filteringEnabledCheckbox.checked;
    const autoRefreshEnabled = !!this.autoRefreshEnabledCheckbox.checked;
    const autoRefreshIntervalSecs = Math.min(600, Math.max(10, parseInt(this.autoRefreshIntervalInput.value) || 60));
    const autoRefreshIntervalMs = autoRefreshIntervalSecs * 1000;
    
    if (minSpend < 0) {
      this.showError('Minimum spend cannot be negative');
      return;
    }

    if (proposalsMin < 0 || proposalsMax < 0) {
      this.showError('Proposals range cannot be negative');
      return;
    }

    if (proposalsMin > proposalsMax) {
      this.showError('Minimum proposals cannot be greater than maximum');
      return;
    }

    try {
      await chrome.storage.sync.set({ 
        minimumSpent: minSpend,
        proposalsMin: proposalsMin,
        proposalsMax: proposalsMax,
        filteringEnabled,
        autoRefreshEnabled,
        autoRefreshIntervalMs
      });
      console.log('Settings saved:', { 
        minimumSpent: minSpend, 
        proposalsMin: proposalsMin, 
        proposalsMax: proposalsMax,
        filteringEnabled,
        autoRefreshEnabled,
        autoRefreshIntervalMs
      });
      
      // Show success message
      this.showSuccess();
      
      // Notify content script about the change
      await this.notifyContentScript({ minimumSpent: minSpend, proposalsMin, proposalsMax, filteringEnabled, autoRefreshEnabled, autoRefreshIntervalMs });
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings');
    }
  }

  async notifyContentScript(payload) {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url && tab.url.includes('upwork.com')) {
        // Send message to content script
        await chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', data: payload });
        console.log('Notified content script about settings update');
      }
    } catch (error) {
      console.error('Error notifying content script:', error);
      // This is not critical, so we don't show an error to the user
    }
  }

  async showAllHidden() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('upwork.com')) {
        await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_ALL_HIDDEN' });
        this.showSuccess();
      }
    } catch (error) {
      console.error('Error sending SHOW_ALL_HIDDEN:', error);
    }
  }

  async refreshStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!(tab && tab.id && tab.url && tab.url.includes('upwork.com'))) {
        this.lastProcessingEl.textContent = '—';
        this.countsEl.textContent = '—';
        return;
      }
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
      if (response) {
        if (typeof response.lastProcessingMs === 'number') {
          this.lastProcessingEl.textContent = `${response.lastProcessingMs.toFixed ? response.lastProcessingMs.toFixed(0) : Math.round(response.lastProcessingMs)} ms`;
        }
        this.countsEl.textContent = `${response.lastVisibleCount || 0} / ${response.lastHiddenCount || 0}`;
        this.filteringEnabledCheckbox.checked = !!response.filteringEnabled;
        if (response.autoRefresh && typeof response.autoRefresh.enabled === 'boolean') {
          this.autoRefreshEnabledCheckbox.checked = response.autoRefresh.enabled;
          if (typeof response.autoRefresh.refreshIntervalMs === 'number') {
            this.autoRefreshIntervalInput.value = Math.round(response.autoRefresh.refreshIntervalMs / 1000);
          }
        }
      }
    } catch (error) {
      // ignore if content script isn't present
    }
  }

  async resetDefaults() {
    this.minSpendInput.value = 1;
    this.proposalsMinRange.value = 0;
    this.proposalsMaxRange.value = 100;
    this.filteringEnabledCheckbox.checked = true;
    this.autoRefreshEnabledCheckbox.checked = true;
    this.autoRefreshIntervalInput.value = 60;
    // Trigger UI updates
    this.proposalsMinRange.dispatchEvent(new Event('input'));
    await this.saveSettings();
  }

  showSuccess() {
    this.statusDiv.innerHTML = `
      <div class="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
        <div class="w-2 h-2 bg-green-400 rounded-full"></div>
        <span class="text-sm text-green-300">Settings saved successfully! Jobs will be filtered in real-time.</span>
      </div>
    `;
    this.statusDiv.classList.remove('hidden');
    
    // Hide after 4 seconds
    setTimeout(() => {
      this.statusDiv.classList.add('hidden');
    }, 4000);
  }

  showError(message) {
    this.statusDiv.innerHTML = `
      <div class="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
        <div class="w-2 h-2 bg-red-400 rounded-full"></div>
        <span class="text-sm text-red-300">${message}</span>
      </div>
    `;
    this.statusDiv.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
      this.statusDiv.classList.add('hidden');
    }, 5000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
