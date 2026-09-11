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

const toRowSummaries = (rows: { depth: number; entry: { name: string }; path: string }[]) => {
  return rows.map((row) => {
    return { depth: row.depth, name: row.entry.name, path: row.path }
  })
}

describe('buildRows file nesting', () => {
  it('nests child files under their parent and hides them at the top level', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [
          toEntry('file.ts', false),
          toEntry('file.test.ts', false),
          toEntry('file.contract.ts', false),
          toEntry('other.txt', false),
        ],
      },
      expandedPaths: {},
      fileNesting: {
        isEnabled: true,
        patterns: [{ children: ['${capture}.contract.ts', '${capture}.test.ts'], parent: '*.ts' }],
      },
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['file.ts', 'other.txt'])
    expect(rows[0].hasNestedChildren).toBe(true)
  })

  it('emits nested children one level deeper when the parent is expanded', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('file.ts', false), toEntry('file.js', false), toEntry('file.test.ts', false)],
      },
      expandedPaths: { '/file.ts': true },
      fileNesting: {
        isEnabled: true,
        patterns: [{ children: ['${capture}.js', '${capture}.test.ts'], parent: '*.ts' }],
      },
      rootPath: '/',
    })

    expect(toRowSummaries(rows)).toEqual([
      { depth: 0, name: 'file.ts', path: '/file.ts' },
      { depth: 1, name: 'file.js', path: '/file.js' },
      { depth: 1, name: 'file.test.ts', path: '/file.test.ts' },
    ])
    expect(rows[1].hasNestedChildren).toBe(false)
  })

  it('nests wildcard child patterns under a literal parent', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('tsconfig.json', false), toEntry('tsconfig.node.json', false), toEntry('other.json', false)],
      },
      expandedPaths: { '/tsconfig.json': true },
      fileNesting: {
        isEnabled: true,
        patterns: [{ children: ['tsconfig.*.json'], parent: 'tsconfig.json' }],
      },
      rootPath: '/',
    })

    expect(toRowSummaries(rows)).toEqual([
      { depth: 0, name: 'tsconfig.json', path: '/tsconfig.json' },
      { depth: 1, name: 'tsconfig.node.json', path: '/tsconfig.node.json' },
      { depth: 0, name: 'other.json', path: '/other.json' },
    ])
    expect(rows[0].hasNestedChildren).toBe(true)
  })

  it('keeps the tree flat when nesting is disabled', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('file.ts', false), toEntry('file.test.ts', false)],
      },
      expandedPaths: {},
      fileNesting: {
        isEnabled: false,
        patterns: [{ children: ['${capture}.test.ts'], parent: '*.ts' }],
      },
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['file.ts', 'file.test.ts'])
    expect(rows[0].hasNestedChildren).toBe(false)
  })

  it('keeps the tree flat when the preference is omitted', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('file.ts', false), toEntry('file.test.ts', false)],
      },
      expandedPaths: {},
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['file.ts', 'file.test.ts'])
    expect(rows[0].hasNestedChildren).toBe(false)
  })

  it('does not mark a parent without present children as expandable', () => {
    const rows = treeBrowseUseCase.buildRows({
      childrenByPath: {
        '/': [toEntry('file.ts', false)],
      },
      expandedPaths: { '/file.ts': true },
      fileNesting: {
        isEnabled: true,
        patterns: [{ children: ['${capture}.test.ts'], parent: '*.ts' }],
      },
      rootPath: '/',
    })

    expect(toNames(rows)).toEqual(['file.ts'])
    expect(rows[0].hasNestedChildren).toBe(false)
    expect(rows[0].isExpanded).toBe(false)
  })

  it('does not nest children hidden by dot-file filtering', () => {
    const params = {
      childrenByPath: {
        '/': [toEntry('file.ts', false), toEntry('.file.ts.bak', false)],
      },
      expandedPaths: {},
      fileNesting: {
        isEnabled: true,
        patterns: [{ children: ['.file.ts.bak'], parent: 'file.ts' }],
      },
      rootPath: '/',
    }

    const rowsWhenHidden = treeBrowseUseCase.buildRows({ ...params, isDotFilesHidden: true })

    expect(toNames(rowsWhenHidden)).toEqual(['file.ts'])
    expect(rowsWhenHidden[0].hasNestedChildren).toBe(false)

    const rowsWhenVisible = treeBrowseUseCase.buildRows({ ...params, isDotFilesHidden: false })

    expect(toNames(rowsWhenVisible)).toEqual(['file.ts'])
    expect(rowsWhenVisible[0].hasNestedChildren).toBe(true)
  })

  it('never nests a child under another child', () => {
    const params = {
      childrenByPath: {
        '/': [toEntry('a.ts', false), toEntry('a.test.ts', false), toEntry('a.test.test.ts', false)],
      },
      fileNesting: {
        isEnabled: true,
        patterns: [{ children: ['${capture}.test.ts'], parent: '*.ts' }],
      },
      rootPath: '/',
    }

    const collapsedRows = treeBrowseUseCase.buildRows({ ...params, expandedPaths: {} })

    expect(toRowSummaries(collapsedRows)).toEqual([
      { depth: 0, name: 'a.ts', path: '/a.ts' },
      { depth: 0, name: 'a.test.test.ts', path: '/a.test.test.ts' },
    ])

    const expandedRows = treeBrowseUseCase.buildRows({ ...params, expandedPaths: { '/a.ts': true } })

    expect(toRowSummaries(expandedRows)).toEqual([
      { depth: 0, name: 'a.ts', path: '/a.ts' },
      { depth: 1, name: 'a.test.ts', path: '/a.test.ts' },
      { depth: 0, name: 'a.test.test.ts', path: '/a.test.test.ts' },
    ])
  })
})
