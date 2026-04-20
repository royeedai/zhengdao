import type { Configuration } from 'electron-builder'

const ghOwner = process.env.GH_OWNER?.trim()
const ghRepo = process.env.GH_REPO?.trim()

const config: Configuration = {
  appId: 'com.zhengdao.app',
  productName: '证道',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: [
    '!**/.vscode/*',
    '!src/*',
    '!electron.vite.config.*',
    '!{.eslintignore,.eslintrc*,.prettierrc*,tsconfig.*}',
    '!{*.md,*.txt}'
  ],
  electronUpdaterCompatibility: '>=2.16',
  ...(ghOwner && ghRepo
    ? {
        publish: {
          provider: 'github',
          owner: ghOwner,
          repo: ghRepo,
          releaseType: 'release'
        }
      }
    : {}),
  mac: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    target: ['dmg', 'zip'],
    category: 'public.app-category.productivity',
    darkModeSupport: true
  },
  win: {
    artifactName: '${productName}-${version}-${arch}-setup.${ext}',
    target: ['nsis']
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: '证道'
  },
  linux: {
    artifactName: '${productName}-${version}.${ext}',
    target: ['AppImage'],
    category: 'Office'
  }
}

export default config
