import { constant } from '#src/util/constant'

type ByteSequence = Uint8Array | number[]

const EXTENSION_LANGUAGE_MAP = new Map<string, string>([
  ['adoc', 'asciidoc'],
  ['ada', 'ada'],
  ['adb', 'ada'],
  ['ads', 'ada'],
  ['ahk', 'autohotkey'],
  ['applescript', 'applescript'],
  ['as', 'actionscript'],
  ['asm', 'x86asm'],
  ['awk', 'awk'],
  ['bash', 'bash'],
  ['bat', 'dos'],
  ['c', 'c'],
  ['c++', 'cpp'],
  ['cc', 'cpp'],
  ['cjs', 'javascript'],
  ['cl', 'lisp'],
  ['clj', 'clojure'],
  ['cljc', 'clojure'],
  ['cljs', 'clojure'],
  ['cmake', 'cmake'],
  ['cmd', 'dos'],
  ['coffee', 'coffeescript'],
  ['cp', 'cpp'],
  ['cpp', 'cpp'],
  ['cr', 'crystal'],
  ['cs', 'csharp'],
  ['csx', 'csharp'],
  ['css', 'css'],
  ['cu', 'cpp'],
  ['cts', 'typescript'],
  ['cxx', 'cpp'],
  ['d', 'd'],
  ['dart', 'dart'],
  ['dhall', 'dhall'],
  ['diff', 'diff'],
  ['dockerfile', 'dockerfile'],
  ['dpr', 'delphi'],
  ['dtd', 'xml'],
  ['dts', 'dts'],
  ['el', 'lisp'],
  ['elm', 'elm'],
  ['erb', 'erb'],
  ['erl', 'erlang'],
  ['ex', 'elixir'],
  ['exs', 'elixir'],
  ['f', 'fortran'],
  ['f03', 'fortran'],
  ['f08', 'fortran'],
  ['f77', 'fortran'],
  ['f90', 'fortran'],
  ['f95', 'fortran'],
  ['feature', 'gherkin'],
  ['for', 'fortran'],
  ['frag', 'glsl'],
  ['fs', 'fsharp'],
  ['fsi', 'fsharp'],
  ['fsx', 'fsharp'],
  ['gemspec', 'ruby'],
  ['gcode', 'gcode'],
  ['glsl', 'glsl'],
  ['gml', 'gml'],
  ['go', 'go'],
  ['gql', 'graphql'],
  ['gradle', 'gradle'],
  ['graphql', 'graphql'],
  ['groovy', 'groovy'],
  ['haml', 'haml'],
  ['handlebars', 'handlebars'],
  ['hbs', 'handlebars'],
  ['hh', 'cpp'],
  ['hpp', 'cpp'],
  ['hs', 'haskell'],
  ['htm', 'xml'],
  ['html', 'xml'],
  ['hrl', 'erlang'],
  ['http', 'http'],
  ['hx', 'haxe'],
  ['hxx', 'cpp'],
  ['hy', 'hy'],
  ['ini', 'ini'],
  ['ino', 'arduino'],
  ['ipynb', 'json'],
  ['jl', 'julia'],
  ['js', 'javascript'],
  ['json', 'json'],
  ['jsx', 'javascript'],
  ['kt', 'kotlin'],
  ['kts', 'kotlin'],
  ['less', 'less'],
  ['lhs', 'haskell'],
  ['lisp', 'lisp'],
  ['ll', 'llvm'],
  ['lsp', 'lisp'],
  ['ls', 'livescript'],
  ['lua', 'lua'],
  ['m', 'objectivec'],
  ['mak', 'makefile'],
  ['markdown', 'markdown'],
  ['md', 'markdown'],
  ['mjs', 'javascript'],
  ['mk', 'makefile'],
  ['ml', 'ocaml'],
  ['mli', 'ocaml'],
  ['mm', 'objectivec'],
  ['moon', 'moonscript'],
  ['mts', 'typescript'],
  ['nb', 'mathematica'],
  ['nim', 'nim'],
  ['nix', 'nix'],
  ['nsi', 'nsis'],
  ['nsh', 'nsis'],
  ['nsis', 'nsis'],
  ['pas', 'delphi'],
  ['php', 'php'],
  ['phtml', 'php'],
  ['pl', 'perl'],
  ['plist', 'xml'],
  ['pm', 'perl'],
  ['pp', 'delphi'],
  ['properties', 'properties'],
  ['props', 'properties'],
  ['proto', 'protobuf'],
  ['ps1', 'powershell'],
  ['psd1', 'powershell'],
  ['psm1', 'powershell'],
  ['py', 'python'],
  ['pyi', 'python'],
  ['qml', 'qml'],
  ['qs', 'qsharp'],
  ['r', 'r'],
  ['rake', 'ruby'],
  ['rb', 'ruby'],
  ['re', 'reasonml'],
  ['rei', 'reasonml'],
  ['rkt', 'scheme'],
  ['rs', 'rust'],
  ['sas', 'sas'],
  ['sass', 'sass'],
  ['sbt', 'scala'],
  ['scala', 'scala'],
  ['scm', 'scheme'],
  ['scss', 'scss'],
  ['sh', 'bash'],
  ['sql', 'sql'],
  ['ss', 'scheme'],
  ['st', 'smalltalk'],
  ['styl', 'stylus'],
  ['stylus', 'stylus'],
  ['sv', 'verilog'],
  ['svh', 'verilog'],
  ['svg', 'xml'],
  ['swift', 'swift'],
  ['tcl', 'tcl'],
  ['tex', 'tex'],
  ['thrift', 'thrift'],
  ['toml', 'ini'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['twig', 'twig'],
  ['v', 'verilog'],
  ['vapi', 'vala'],
  ['vb', 'vbnet'],
  ['vbs', 'vbscript'],
  ['vert', 'glsl'],
  ['vhd', 'vhdl'],
  ['vhdl', 'vhdl'],
  ['vim', 'vim'],
  ['wasm', 'wasm'],
  ['wat', 'wasm'],
  ['wl', 'mathematica'],
  ['xaml', 'xml'],
  ['xq', 'xquery'],
  ['xql', 'xquery'],
  ['xqm', 'xquery'],
  ['xqy', 'xquery'],
  ['xml', 'xml'],
  ['xsd', 'xml'],
  ['xsl', 'xml'],
  ['xslt', 'xml'],
  ['yaml', 'yaml'],
  ['yml', 'yaml'],
  ['zsh', 'bash'],
])

const FILENAME_LANGUAGE_MAP = new Map<string, string>([
  ['bsdmakefile', 'makefile'],
  ['brewfile', 'ruby'],
  ['cmakelists.txt', 'cmake'],
  ['dockerfile', 'dockerfile'],
  ['gemfile', 'ruby'],
  ['gnumakefile', 'makefile'],
  ['jenkinsfile', 'groovy'],
  ['makefile', 'makefile'],
  ['pipfile', 'ini'],
  ['pkgbuild', 'bash'],
  ['rakefile', 'ruby'],
  ['vagrantfile', 'ruby'],
])

const INTERPRETER_LANGUAGE_MAP = new Map<string, string>([
  ['awk', 'awk'],
  ['bash', 'bash'],
  ['dash', 'bash'],
  ['deno', 'typescript'],
  ['gawk', 'awk'],
  ['guile', 'scheme'],
  ['julia', 'julia'],
  ['ksh', 'bash'],
  ['lua', 'lua'],
  ['mawk', 'awk'],
  ['node', 'javascript'],
  ['perl', 'perl'],
  ['php', 'php'],
  ['powershell', 'powershell'],
  ['python', 'python'],
  ['pwsh', 'powershell'],
  ['r', 'r'],
  ['ruby', 'ruby'],
  ['rscript', 'r'],
  ['sh', 'bash'],
  ['zsh', 'bash'],
])

export const languageUtil = {
  _toBaseName(fileName: string): string {
    const segments = fileName.split('/')
    const lastSegment = segments[segments.length - 1]
    if (lastSegment === '') {
      return fileName
    }

    return lastSegment
  },
  _toEnvTargetToken(params: { tokens: string[] }): string | null {
    const { tokens } = params
    const targetToken = tokens.at(1)
    if (targetToken === undefined) {
      return null
    }

    return languageUtil._toInterpreterBaseName({ token: targetToken })
  },
  _toInterpreterBaseName(params: { token: string }): string {
    const { token } = params
    const segments = token.split('/')
    const lastSegment = segments[segments.length - 1]

    return lastSegment.replace(/[.0-9]+$/, '').toLowerCase()
  },
  _toInterpreterToken(params: { tokens: string[] }): string | null {
    const { tokens } = params
    const meaningfulTokens = tokens.filter((token) => {
      return !token.startsWith('-')
    })
    const firstToken = meaningfulTokens.at(0)
    if (firstToken === undefined) {
      return null
    }
    const baseName = languageUtil._toInterpreterBaseName({ token: firstToken })
    if (baseName === 'env') {
      return languageUtil._toEnvTargetToken({ tokens: meaningfulTokens })
    }

    return baseName
  },
  _toShebangLineEndIndex(params: { buffer: Buffer }): number {
    const { buffer } = params
    const lineEndIndex = buffer.indexOf(0x0a)
    if (lineEndIndex === -1) {
      return buffer.length
    }

    return lineEndIndex
  },
  detectLanguage(params: { fileName: string; headBytes?: ByteSequence }): string {
    const { fileName, headBytes } = params
    const fileNameLanguage = languageUtil.fromFileName({ fileName })
    if (fileNameLanguage !== null) {
      return fileNameLanguage
    }
    const shebangLanguage = languageUtil.fromShebang({ headBytes: headBytes ?? [] })
    if (shebangLanguage !== null) {
      return shebangLanguage
    }

    return languageUtil.fromExtension({ fileName }) ?? 'plaintext'
  },
  fromExtension(params: { fileName: string }): string | null {
    const { fileName } = params
    const baseName = languageUtil._toBaseName(fileName).toLowerCase()
    const lastDotIndex = baseName.lastIndexOf('.')
    if (lastDotIndex <= 0) {
      return null
    }

    return EXTENSION_LANGUAGE_MAP.get(baseName.slice(lastDotIndex + 1)) ?? null
  },
  fromFileName(params: { fileName: string }): string | null {
    const { fileName } = params
    const baseName = languageUtil._toBaseName(fileName).toLowerCase()

    return FILENAME_LANGUAGE_MAP.get(baseName) ?? null
  },
  fromShebang(params: { headBytes: ByteSequence }): string | null {
    const { headBytes } = params
    const windowBuffer = Buffer.from(headBytes.slice(0, constant.language.shebangWindowBytes))
    const lineEndIndex = languageUtil._toShebangLineEndIndex({ buffer: windowBuffer })

    return languageUtil.fromShebangLine({ line: windowBuffer.subarray(0, lineEndIndex).toString('latin1') })
  },
  fromShebangLine(params: { line: string }): string | null {
    const { line } = params
    if (!line.startsWith('#!')) {
      return null
    }
    const tokens = line.slice(2).trim().split(/\s+/)
    const interpreterToken = languageUtil._toInterpreterToken({ tokens })
    if (interpreterToken === null) {
      return null
    }

    return INTERPRETER_LANGUAGE_MAP.get(interpreterToken) ?? null
  },
}
