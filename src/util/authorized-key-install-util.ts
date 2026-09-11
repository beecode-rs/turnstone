import { constant } from '#src/util/constant'

export const authorizedKeyInstallUtil = {
  buildCommand(params: { publicKey: string }): string {
    const { publicKey } = params
    const toKeyBlobOf = (line: string): string => {
      const lineTokens = line.split(' ')
      if (lineTokens.length <= 1) {
        return line
      }

      return lineTokens[1] ?? line
    }
    const toSingleQuoted = (value: string): string => {
      return `'${value.replace(/'/g, "'\\''")}'`
    }
    const publicLine = publicKey.trim().split(/\s+/).join(' ')
    const keyBlob = toKeyBlobOf(publicLine)

    return [
      'umask 077',
      `mkdir -p ${constant.authorizedKeys.sshDirPath}`,
      `touch ${constant.authorizedKeys.path}`,
      `chmod 700 ${constant.authorizedKeys.sshDirPath}`,
      `chmod 600 ${constant.authorizedKeys.path}`,
      `{ [ -z "$(tail -c1 ${constant.authorizedKeys.path})" ] || echo >> ${constant.authorizedKeys.path}; }`,
      `{ grep -qF ${toSingleQuoted(keyBlob)} ${constant.authorizedKeys.path} || echo ${toSingleQuoted(publicLine)} >> ${constant.authorizedKeys.path}; }`,
      `{ command -v restorecon >/dev/null 2>&1 && restorecon -F ${constant.authorizedKeys.sshDirPath} ${constant.authorizedKeys.path} 2>/dev/null || true; }`,
    ].join(' && ')
  },
}
