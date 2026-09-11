import { HostPlatformMapper } from '#src/business/enum/host-platform-mapper-enum'
import { SearchCommandContentTierMapper } from '#src/business/enum/search-command-content-tier-mapper-enum'
import { SearchCommandFilenameTierMapper } from '#src/business/enum/search-command-filename-tier-mapper-enum'
import { shellQuoteUtil } from '#src/util/shell-quote-util'

export type SearchCommandCapabilities = {
  isRipgrepAvailable: boolean
  platform: HostPlatformMapper
}

const searchCommandUtil = {
  _fuzzyMetacharPattern: /[\\.^$|?*+()[\]{}-]/g,
  _toNoIgnoreFlag(params: { isIgnoredFilesIncluded?: boolean }): string {
    const { isIgnoredFilesIncluded } = params
    if (isIgnoredFilesIncluded) {
      return ' --no-ignore'
    }

    return ''
  },
  _toSubsequencePattern(params: { pattern: string }): string {
    const { pattern } = params
    const escapedChars = pattern.split('').map((char: string) => {
      return char.replace(searchCommandUtil._fuzzyMetacharPattern, `\\${char}`)
    })

    return escapedChars.join('.*')
  },
  buildFindFilenameCommand(params: { pattern: string; root: string }): string {
    const { pattern, root } = params
    const fuzzyPattern = searchCommandUtil._toSubsequencePattern({ pattern })
    const quotedPattern = shellQuoteUtil.quoteShellWord({ word: fuzzyPattern })
    const quotedRoot = shellQuoteUtil.quoteShellWord({ word: root })

    return `LC_ALL=C find ${quotedRoot} -name .git -prune -o -type f -print | LC_ALL=C grep -i -E -- ${quotedPattern}`
  },
  buildFindGrepContentCommand(params: { pattern: string; root: string }): string {
    const { pattern, root } = params
    const quotedPattern = shellQuoteUtil.quoteShellWord({ word: pattern })
    const quotedRoot = shellQuoteUtil.quoteShellWord({ word: root })

    return `LC_ALL=C find ${quotedRoot} -name .git -prune -o -type f -exec grep -n -H -- ${quotedPattern} /dev/null {} +`
  },
  buildGrepContentCommand(params: { pattern: string; root: string }): string {
    const { pattern, root } = params
    const quotedPattern = shellQuoteUtil.quoteShellWord({ word: pattern })
    const quotedRoot = shellQuoteUtil.quoteShellWord({ word: root })

    return `LC_ALL=C grep -rn -I -E --color=never --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist -- ${quotedPattern} ${quotedRoot} 2>/dev/null`
  },
  buildRipgrepContentCommand(params: { isIgnoredFilesIncluded?: boolean; pattern: string; root: string }): string {
    const { isIgnoredFilesIncluded, pattern, root } = params
    const quotedPattern = shellQuoteUtil.quoteShellWord({ word: pattern })
    const quotedRoot = shellQuoteUtil.quoteShellWord({ word: root })
    const noIgnoreFlag = searchCommandUtil._toNoIgnoreFlag({ isIgnoredFilesIncluded })

    return `LC_ALL=C rg --json --smart-case --max-count 50 --max-filesize 2M -g '!.git' --hidden${noIgnoreFlag} -- ${quotedPattern} ${quotedRoot}`
  },
  buildRipgrepFilenameCommand(params: { isIgnoredFilesIncluded?: boolean; pattern: string; root: string }): string {
    const { isIgnoredFilesIncluded, pattern, root } = params
    const fuzzyPattern = searchCommandUtil._toSubsequencePattern({ pattern })
    const quotedPattern = shellQuoteUtil.quoteShellWord({ word: fuzzyPattern })
    const quotedRoot = shellQuoteUtil.quoteShellWord({ word: root })
    const noIgnoreFlag = searchCommandUtil._toNoIgnoreFlag({ isIgnoredFilesIncluded })

    return `LC_ALL=C rg --files --hidden -g '!.git'${noIgnoreFlag} ${quotedRoot} | LC_ALL=C rg -i -- ${quotedPattern}`
  },
  selectContentTier(params: { capabilities: SearchCommandCapabilities }): SearchCommandContentTierMapper {
    const { capabilities } = params
    if (capabilities.isRipgrepAvailable) {
      return SearchCommandContentTierMapper.RIPGREP
    }
    if (capabilities.platform === HostPlatformMapper.OTHER) {
      return SearchCommandContentTierMapper.FIND_GREP
    }

    return SearchCommandContentTierMapper.GREP
  },
  selectFilenameTier(params: { capabilities: SearchCommandCapabilities }): SearchCommandFilenameTierMapper {
    const { capabilities } = params
    if (capabilities.isRipgrepAvailable) {
      return SearchCommandFilenameTierMapper.RIPGREP
    }

    return SearchCommandFilenameTierMapper.FIND_GREP
  },
}

export { searchCommandUtil }
