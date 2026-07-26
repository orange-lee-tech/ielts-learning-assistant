import { browser } from 'wxt/browser';

interface FirefoxSidebarApi {
  open?: () => Promise<void>;
}

export default defineBackground(() => {
  if (import.meta.env.FIREFOX) {
    const firefoxBrowser = browser as typeof browser & {
      sidebarAction?: FirefoxSidebarApi;
    };

    browser.action.onClicked.addListener(() => {
      void firefoxBrowser.sidebarAction?.open?.();
    });
    return;
  }

  const enableActionClick = async () => {
    try {
      await browser.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      });
    } catch (error) {
      console.error('Failed to configure the IELTS side panel.', error);
    }
  };

  void enableActionClick();
  browser.runtime.onInstalled.addListener(() => {
    void enableActionClick();
  });
});
