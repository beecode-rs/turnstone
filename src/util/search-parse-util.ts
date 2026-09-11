export type SearchParseSubmatch = {
  end: number
  start: number
}

export type SearchParseMatch = {
  lineNumber: number | null
  lineText: string | null
  path: string
  submatches: SearchParseSubmatch[]
}

interface RipgrepSubmatch {
  end?: number
  start?: number
}

interface RipgrepEventData {
  line_number?: number
  lines?: { text?: string }
  path?: { text?: string }
  submatches?: RipgrepSubmatch[]
}

interface RipgrepEvent {
  data?: RipgrepEventData
  type?: string
}

const searchParseUtil = {
  _grepLinePattern: /^(.+?):(\d+):(.*)$/,
  _stripTrailingNewline(params: { text: string }): string {
    const { text } = params
    if (text.endsWith('\n')) {
      return text.slice(0, -1)
    }

    return text
  },
  _toMatchFromRipgrepData(params: { data: RipgrepEventData | undefined }): SearchParseMatch | null {
    const { data } = params
    if (data === undefined) {
      return null
    }
    const path = data.path?.text
    const lineText = data.lines?.text
    if (path === undefined || lineText === undefined) {
      return null
    }

    return {
      lineNumber: data.line_number ?? null,
      lineText: searchParseUtil._stripTrailingNewline({ text: lineText }),
      path,
      submatches: searchParseUtil._toRipgrepSubmatches({ submatches: data.submatches ?? [] }),
    }
  },
  _toRipgrepSubmatches(params: { submatches: RipgrepSubmatch[] }): SearchParseSubmatch[] {
    const { submatches } = params

    return submatches.reduce((submatches: SearchParseSubmatch[], submatch: RipgrepSubmatch) => {
      if (submatch.start === undefined || submatch.end === undefined) {
        return submatches
      }

      return [...submatches, { end: submatch.end, start: submatch.start }]
    }, [])
  },
  _tryParseJson(params: { line: string }): unknown {
    const { line } = params
    try {
      return JSON.parse(line) as unknown
    } catch {
      return null
    }
  },
  parseFilenameLine(params: { line: string }): SearchParseMatch | null {
    const { line } = params
    const path = line.trim()
    if (path === '') {
      return null
    }

    return { lineNumber: null, lineText: null, path, submatches: [] }
  },
  parseGrepLine(params: { line: string }): SearchParseMatch | null {
    const { line } = params
    const matched = searchParseUtil._grepLinePattern.exec(line)
    if (matched === null) {
      return null
    }

    return {
      lineNumber: Number.parseInt(matched[2], 10),
      lineText: matched[3],
      path: matched[1],
      submatches: [],
    }
  },
  parseRipgrepJsonLine(params: { line: string }): SearchParseMatch | null {
    const { line } = params
    const parsed = searchParseUtil._tryParseJson({ line })
    if (parsed === null || typeof parsed !== 'object') {
      return null
    }
    const event = parsed as RipgrepEvent
    if (event.type !== 'match') {
      return null
    }

    return searchParseUtil._toMatchFromRipgrepData({ data: event.data })
  },
}

export { searchParseUtil }
