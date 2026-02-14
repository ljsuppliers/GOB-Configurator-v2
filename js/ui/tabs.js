// Tab navigation for bottom panel (Email Drafter, Site Survey, Quote History)

export function initTabs() {
  const tabButtons = document.querySelectorAll('[data-tab]');
  const tabPanels = document.querySelectorAll('[data-tab-panel]');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabPanels.forEach(p => {
        p.classList.toggle('active', p.dataset.tabPanel === target);
      });

      // Dispatch event for panels that need to refresh
      document.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: target } }));
    });
  });
}

export function switchTab(tabName) {
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.click();
}
