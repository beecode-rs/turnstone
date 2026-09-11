import { build } from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pdfjsPackageDir = join(projectRoot, 'node_modules', 'pdfjs-dist')
const outputDir = join(projectRoot, 'src', 'asset', 'pdf-viewer')

const main = async () => {
  await mkdir(outputDir, { recursive: true })

  await build({
    bundle: true,
    entryPoints: [join(pdfjsPackageDir, 'legacy', 'build', 'pdf.mjs')],
    format: 'iife',
    globalName: 'pdfjsLib',
    legalComments: 'none',
    minify: true,
    outfile: join(outputDir, 'pdf.min.js'),
    target: ['es2019'],
  })

  await build({
    bundle: true,
    entryPoints: [join(pdfjsPackageDir, 'legacy', 'build', 'pdf.worker.mjs')],
    format: 'iife',
    legalComments: 'none',
    minify: true,
    outfile: join(outputDir, 'pdf.worker.min.js'),
    target: ['es2019'],
  })

  await copyFile(join(outputDir, 'pdf.min.js'), join(outputDir, 'pdf.min.js.txt'))
  await copyFile(join(outputDir, 'pdf.worker.min.js'), join(outputDir, 'pdf.worker.min.js.txt'))
  console.log(`vendored pdf.js into ${outputDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
