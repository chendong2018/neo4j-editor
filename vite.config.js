import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  css: { postcss: false },
  optimizeDeps: {
    exclude: ['nodemailer', 'request', 'yamlparser', 'loggly', 'mailgun-js', 'slack-node', 'hipchat-notifier']
  },
  build: {
    rollupOptions: {
      external: ['nodemailer', 'request', 'yamlparser', 'loggly', 'mailgun-js', 'slack-node', 'hipchat-notifier']
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
