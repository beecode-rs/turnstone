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

describe('buildRows dot files filtering', () => {
  it('hides dotfiles when hiding is enabled', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('.hidden-file', false), toEntry('.config', true), toEntry('visible.txt', false)],
      },
      expandedPaths: {},
      isDotFilesHidden: true,
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['visible.txt'])
  })

  it('shows dotfiles when hiding is disabled', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('.hidden-file', false), toEntry('visible.txt', false)],
      },
      expandedPaths: {},
      isDotFilesHidden: false,
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['.hidden-file', 'visible.txt'])
  })

  it('defaults to showing dotfiles when flag is omitted', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('.hidden-file', false), toEntry('visible.txt', false)],
      },
      expandedPaths: {},
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['.hidden-file', 'visible.txt'])
  })
})
