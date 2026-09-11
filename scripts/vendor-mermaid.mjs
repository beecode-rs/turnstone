import { build } from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const mermaidPackageDir = join(projectRoot, 'node_modules', 'mermaid')
const outputDir = join(projectRoot, 'src', 'asset', 'mermaid')

const main = async () => {
  await mkdir(outputDir, { recursive: true })

  await build({
    bundle: true,
    drop: ['console'],
    format: 'iife',
    legalComments: 'none',
    minify: true,
    outfile: join(outputDir, 'mermaid.min.js'),
    stdin: {
      contents: 'import mermaid from "./dist/mermaid.core.mjs"\nglobalThis.mermaid = mermaid\n',
      loader: 'js',
      resolveDir: mermaidPackageDir,
    },
    target: ['es2019'],
  })

  await copyFile(join(outputDir, 'mermaid.min.js'), join(outputDir, 'mermaid.min.js.txt'))
  console.log(`vendored mermaid into ${outputDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
