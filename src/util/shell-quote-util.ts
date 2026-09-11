const shellQuoteUtil = {
  quoteShellWord(params: { word: string }): string {
    const { word } = params
    const escapedWord = word.replace(/'/g, "'\\''")

    return `'${escapedWord}'`
  },
}

export { shellQuoteUtil }
