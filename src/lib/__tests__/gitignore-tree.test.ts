import { describe, expect, it, vi } from 'vitest'

vi.mock('#src/lib/mmkv', () => {
  return {
    appMmkv: {
      getString: () => {
        return null
      },
      set: () => {
        return undefined
      },
    },
  }
})

import { treeBrowseUseCase } from '#src/business/use-case/tree-browse-use-case'

const toEntry = (name: string, isDir: boolean) => {
  return { isDir, mtime: 1, name, size: isDir ? 0 : 1 }
}

const toNames = (rows: { entry: { name: string } }[]) => {
  return rows.map((row) => {
    return row.entry.name
  })
}

describe('buildRows gitignore filtering', () => {
  it('shows ignored files when hiding is disabled', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/project': [toEntry('debug.log', false), toEntry('readme.md', false)],
      },
      expandedPaths: {},
      gitignoreContentByPath: { '/project': '*.log' },
      isIgnoredFilesHidden: false,
      rootPath: '/project',
    })

    expect(toNames(rows)).toEqual(['debug.log', 'readme.md'])
  })

  it('hides ignored files when hiding is enabled', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/project': [toEntry('debug.log', false), toEntry('readme.md', false)],
      },
      expandedPaths: {},
      gitignoreContentByPath: { '/project': '*.log' },
      isIgnoredFilesHidden: true,
      rootPath: '/project',
    })

    expect(toNames(rows)).toEqual(['readme.md'])
  })

  it('defaults to showing ignored files when flag is omitted', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/project': [toEntry('debug.log', false), toEntry('readme.md', false)],
      },
      expandedPaths: {},
      gitignoreContentByPath: { '/project': '*.log' },
      rootPath: '/project',
    })

    expect(toNames(rows)).toEqual(['debug.log', 'readme.md'])
  })

  it('inherits root gitignore patterns for entries in expanded subdirectories', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/project': [toEntry('src', true), toEntry('readme.md', false)],
        '/project/src': [toEntry('node_modules', true), toEntry('main.ts', false)],
      },
      expandedPaths: { '/project/src': true },
      gitignoreContentByPath: { '/project': 'node_modules' },
      isIgnoredFilesHidden: true,
      rootPath: '/project',
    })

    expect(toNames(rows)).toEqual(['src', 'main.ts', 'readme.md'])
  })

  it('hides an ignored directory together with its expanded children', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/project': [toEntry('build', true), toEntry('readme.md', false)],
        '/project/build': [toEntry('bundle.js', false)],
      },
      expandedPaths: { '/project/build': true },
      gitignoreContentByPath: { '/project': 'build/' },
      isIgnoredFilesHidden: true,
      rootPath: '/project',
    })

    expect(toNames(rows)).toEqual(['readme.md'])
  })

  it('applies dot-files and ignored-files filters together', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/project': [toEntry('.env', false), toEntry('debug.log', false), toEntry('readme.md', false)],
      },
      expandedPaths: {},
      gitignoreContentByPath: { '/project': '*.log' },
      isDotFilesHidden: true,
      isIgnoredFilesHidden: true,
      rootPath: '/project',
    })

    expect(toNames(rows)).toEqual(['readme.md'])
  })
})
