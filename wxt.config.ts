import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  targetBrowsers: ['chrome', 'edge', 'firefox'],

  manifest: ({ browser }) => ({
    name: 'IELTS Learning Assistant',
    description:
      'Capture selected IELTS text, record notes, and review learning points in a browser side panel.',
    permissions: ['storage', 'tabs'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Open IELTS Learning Assistant',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
      },
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'ielts-learning-assistant@orange-lee-tech',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['none'] as const,
              },
            },
          },
        }
      : {}),
  }),
});
