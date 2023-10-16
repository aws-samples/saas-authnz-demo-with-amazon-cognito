import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_SERVER = process.env.API_SERVER ?? "http://localhost:3000/"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // https://ui.docs.amplify.aws/react/getting-started/usage/vite
  resolve: {
    alias: [
      {
        find: './runtimeConfig',
        replacement: './runtimeConfig.browser', // ensures browser compatible version of AWS JS SDK is used
      },
    ]
  },
  server: {
    proxy: {
      "^/api/.*": {
        target: API_SERVER,
        changeOrigin: true,
      }
    }
  }
})
