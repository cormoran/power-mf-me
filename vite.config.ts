import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Userscript from 'vite-userscript-plugin'
import { name, version } from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const dotenv = loadEnv(mode, process.cwd(), '')
  return {
    build: {
      outDir: dotenv.USER_SCRIPTS_DIR ?? 'dist'
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    plugins: [
      vue(),
      Userscript({
        entry: 'src/main.ts',
        header: {
          name,
          version,
          match: ['https://moneyforward.com/*'],
          grant: ['GM.addStyle'],
          updateURL:
            'https://github.com/cormoran/power-mf-me/releases/latest/download/power-mf-me.meta.js',
          downloadURL:
            'https://github.com/cormoran/power-mf-me/releases/latest/download/power-mf-me.user.js'
        },
        server: {
          port: 3000
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
