import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const NOVNC_AWAIT_PATTERN = /exports\.supportsWebCodecsH264Decode\s*=\s*supportsWebCodecsH264Decode\s*=\s*await\s+_checkWebCodecsH264DecodeSupport\(\)/

/**
 * noVNC's lib/util/browser.js has a top-level `await` for H264 WebCodecs detection.
 * CJS require() is synchronous so esbuild can't bundle it regardless of target.
 * H264 capability detection is irrelevant for VNC — replace with a static false.
 *
 * Applied in two places:
 *  1. esbuild plugin  → runs during optimizeDeps pre-bundling
 *  2. Vite transform  → runs during normal module serving
 */
const novncEsbuildPlugin = {
  name: 'novnc-browser-patch',
  setup(build: { onLoad: (opts: object, cb: (args: { path: string }) => { contents: string; loader: string } | undefined) => void }) {
    build.onLoad({ filter: /browser\.js$/ }, (args) => {
      if (!args.path.includes('@novnc')) return undefined
      const contents = readFileSync(args.path, 'utf-8').replace(
        NOVNC_AWAIT_PATTERN,
        'exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = false'
      )
      return { contents, loader: 'js' }
    })
  }
}

function novncVitePlugin(): Plugin {
  return {
    name: 'novnc-browser-patch',
    transform(code: string, id: string) {
      if (!id.includes('@novnc/novnc') || !id.includes('browser.js')) return null
      return code.replace(
        NOVNC_AWAIT_PATTERN,
        'exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = false'
      )
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), novncVitePlugin()],
    css: {
      postcss: './postcss.config.js'
    },
    build: {
      target: 'chrome148'
    },
    optimizeDeps: {
      include: ['@novnc/novnc/lib/rfb.js'],
      esbuildOptions: {
        plugins: [novncEsbuildPlugin]
      }
    }
  }
})
