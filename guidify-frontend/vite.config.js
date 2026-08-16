import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// F-02 FIX: fail the production build (Vercel/Render) when VITE_API_URL is unset.
// Previously the bundle silently defaulted to http://127.0.0.1:8000, so the deployed
// app called the user's own machine. Set VITE_API_URL in the deploy env (Vercel UI /
// vercel.json `env`) or via the platform's env vars.
if (process.env.NODE_ENV === 'production' && !process.env.VITE_API_URL) {
  throw new Error(
    'VITE_API_URL is not set. Refusing to build a production bundle that points at ' +
    'http://127.0.0.1:8000. Set VITE_API_URL to your deployed backend (e.g. ' +
    'https://your-backend.onrender.com) in the platform env vars and retry.'
  );
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-mediapipe': ['@mediapipe/tasks-vision'],
        }
      }
    }
  }
})
