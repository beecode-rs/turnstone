import { build } from 'esbuild'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const highlightPackageDir = join(projectRoot, 'node_modules', 'highlight.js')
const outputDir = join(projectRoot, 'src', 'asset', 'code-viewer')

const buildEntryContents = (languageNames) => {
  const registrations = languageNames.map((name) => {
    return `languages[${JSON.stringify(name)}] = require('./languages/${name}.js')`
  })
  return [
    'const hljs = require("./core.js")',
    'const languages = {}',
    ...registrations,
    'Object.keys(languages).forEach((name) => {',
    '  hljs.registerLanguage(name, languages[name])',
    '})',
    'globalThis.hljs = hljs',
  ].join('\n')
}

const main = async () => {
  const languageNames = (await readdir(join(highlightPackageDir, 'lib', 'languages')))
    .filter((name) => name.endsWith('.js'))
    .map((name) => name.slice(0, -3))
    .sort()

  await mkdir(outputDir, { recursive: true })

  await build({
    bundle: true,
    drop: ['console'],
    format: 'iife',
    legalComments: 'none',
    minify: true,
    outfile: join(outputDir, 'highlight.min.js'),
    stdin: {
      contents: buildEntryContents(languageNames),
      loader: 'js',
      resolveDir: join(highlightPackageDir, 'lib'),
    },
    target: ['es2019'],
  })

  await copyFile(join(outputDir, 'highlight.min.js'), join(outputDir, 'highlight.min.js.txt'))
  await copyFile(join(highlightPackageDir, 'styles', 'github.min.css'), join(outputDir, 'theme-light.css'))
  await copyFile(join(highlightPackageDir, 'styles', 'github-dark.min.css'), join(outputDir, 'theme-dark.css'))
  console.log(`vendored ${languageNames.length} highlight.js languages into ${outputDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
