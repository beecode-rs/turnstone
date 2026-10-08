export const constant = {
  activeProject: {
    storageKeyPrefix: 'active-project/',
  },
  authorizedKeys: {
    path: '"$HOME/.ssh/authorized_keys"',
    sshDirPath: '"$HOME/.ssh"',
  },
  backoff: {
    delayMs: {
      initial: 1000,
      max: 30000,
    },
  },
  binaryPreview: {
    capBytes: 33554432,
    chunkBytes: 1572864,
  },
  changeWatcher: {
    directoryPollIntervalMs: 20000,
    filePollIntervalMs: 5000,
    inotifyDirtyDebounceMs: 300,
  },
  credential: {
    keyKind: {
      passphrase: 'passphrase',
      password: 'password',
      privateKey: 'private-key',
    },
    keyPrefix: 'host-credential-',
  },
  deviceKey: {
    accessGroup: 'com.beecode.devicekeys',
    appNameFallback: 'turnstone',
    deviceNameFallback: 'device',
    itemKey: 'beecode-device-key',
    keychainService: 'com.beecode.devicekey',
  },
  diffLayout: {
    storageKey: 'diff-layout-preference',
  },
  diffScope: {
    storageKey: 'diff-scope-preference',
  },
  draftHost: {
    idPrefix: 'draft-',
  },
  fabOpacity: {
    percent: {
      default: 40,
      max: 100,
      min: 20,
    },
  },
  fileDecode: {
    binarySniffWindowBytes: 8192,
    bomBytes: {
      utf8: [0xef, 0xbb, 0xbf],
      utf16be: [0xfe, 0xff],
      utf16le: [0xff, 0xfe],
    },
    latin1BatchBytes: 8192,
  },
  fileNesting: {
    defaultPreference: {
      isEnabled: false,
      patterns: [
        { children: ['${capture}.js', '${capture}.test.ts', '${capture}.contract.yaml'], parent: '*.ts' },
        {
          children: ['${capture}.js.map', '${capture}.min.js', '${capture}.d.ts', '${capture}.d.ts.map'],
          parent: '*.js',
        },
        { children: ['${capture}.js'], parent: '*.jsx' },
        {
          children: ['${capture}.ts', '${capture}.test.tsx', '${capture}.stories.tsx', '${capture}.module.scss'],
          parent: '*.tsx',
        },
        { children: ['tsconfig.*.json'], parent: 'tsconfig.json' },
        {
          children: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock'],
          parent: 'package.json',
        },
        { children: ['vitest.config.*.ts'], parent: 'vitest.config.ts' },
        { children: ['.env*'], parent: '.env' },
      ],
    },
    previewCapture: 'file',
  },
  fileRead: {
    chunkBytes: 131072,
    maxOnDemandBytes: 2097152,
  },
  gitDiff: {
    fullFileContextLines: 1000000,
    numstatRecordRegex: /^(\d+|-)\t(\d+|-)\t(.*)$/,
  },
  gitignore: {
    filename: '.gitignore',
  },
  hostConfig: {
    storageKey: 'host-configs',
  },
  knownHost: {
    keyPrefix: 'known-host-',
  },
  language: {
    shebangWindowBytes: 256,
  },
  lineSplit: {
    lineFeedByte: 10,
  },
  markdownLink: {
    schemeRegex: /^[a-z][a-z0-9+.-]*:/i,
  },
  markdownTaskList: {
    checkedAttribute: 'data-task-checked',
    listCoreRuleName: 'turnstone_task_list_markers',
    markerRegex: /^\[([ xX])\](?:[ \t]*$|[ \t]+)/,
  },
  openScreens: {
    storageKeyPrefix: 'open-screens/',
  },
  plantuml: {
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_',
    defaultServerUrl: 'https://www.plantuml.com/plantuml',
    startRegex: /^\s*@start\w+/,
  },
  plantumlServer: {
    defaultPreference: {
      customServerUrl: 'https://www.plantuml.com/plantuml',
      isCustomServerEnabled: false,
      isSelfSignedCertificateIgnored: false,
    },
    storageKey: 'plantuml-server-preference',
    urlRegex: /^https?:\/\/.+/,
  },
  preferenceStorageKey: {
    alwaysOpenDrawer: 'always-open-drawer-preference',
    biometricLock: 'biometric-lock-preference',
    displayCutout: 'display-cutout-preference',
    dotFiles: 'dot-files-preference',
    fabOpacity: 'fab-opacity-preference',
    fileNesting: 'file-nesting-preference',
    fontSize: 'font-size-preference',
    footer: 'footer-preference',
    ignoredFiles: 'ignored-files-preference',
    lineNumbers: 'line-numbers-preference',
    searchIgnoredFiles: 'search-ignored-files-preference',
    theme: 'theme-preference',
    treeDensity: 'tree-density-preference',
    viewMargin: 'view-margin-preference',
    wordWrap: 'word-wrap-preference',
  },
  projectConfig: {
    storageKey: 'project-configs',
  },
  remoteExec: {
    commandTimeoutMs: 15000,
    maxOutputBytes: 1048576,
  },
  search: {
    matchBatchSize: 50,
    maxMatchCount: 1000,
  },
  ssh: {
    connectClosedMessage: 'Connection closed before the SSH session was established',
    debug: {
      firstChunkPreviewBytes: 64,
      logPrefix: '[ssh2]',
    },
    keepaliveCountMax: 3,
    keepaliveIntervalMs: 15000,
    readyTimeoutMs: 20000,
    relay: {
      url: 'ws://localhost:4022',
    },
  },
  tree: {
    defaultPageSize: 200,
  },
  treeCache: {
    storageKeyPrefix: 'tree-cache/',
  },
  treeExpansion: {
    storageKeyPrefix: 'tree-expansion/',
  },
  treeSelection: {
    storageKeyPrefix: 'tree-selection/',
  },
  webview: {
    base64ChunkBytes: 8192,
  },
}
