import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  server: {
    host: true,
    port: 5064,
    // HTTPS needed for PWA testing on device
    // Uncomment and provide certs for device testing:
    // https: {
    //   key: './certs/key.pem',
    //   cert: './certs/cert.pem',
    // },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
