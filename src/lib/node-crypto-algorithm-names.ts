export const nodeCryptoAlgorithmNames = {
  toNodeNames(params: { names: string[] }): string[] {
    const { names } = params

    return names.map((name) => {
      return name.toLowerCase()
    })
  },
}
