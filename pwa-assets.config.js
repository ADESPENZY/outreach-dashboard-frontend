import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Generates every PWA icon size (192/512, maskable, apple-touch-icon 180)
// from a single source (public/logo.svg). Run: npm run generate-pwa-assets
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    // Pad the maskable icon so the rocket isn't clipped by round/squircle masks.
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.3,
    },
  },
  images: ['public/logo.svg'],
})
