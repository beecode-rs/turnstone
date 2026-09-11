export type SearchSubmatch = {
  start: number
  end: number
}

export type SearchMatch = {
  path: string
  lineNumber: number | null
  lineText: string | null
  submatches: SearchSubmatch[]
}
