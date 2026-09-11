export const fileSizeUtil = {
  format(params: { bytes: number }): string {
    const { bytes } = params
    if (bytes < 1024) {
      return `${String(bytes)} B`
    }
    const kilobytes = bytes / 1024
    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(1)} KB`
    }
    const megabytes = kilobytes / 1024
    if (megabytes < 1024) {
      return `${megabytes.toFixed(1)} MB`
    }

    return `${(megabytes / 1024).toFixed(1)} GB`
  },
}
