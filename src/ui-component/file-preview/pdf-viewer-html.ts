import pdfViewerHtmlSource from '#src/asset/pdf-viewer/index.html'
import pdfJsBundleSource from '#src/asset/pdf-viewer/pdf.min.js.txt'
import pdfJsWorkerSource from '#src/asset/pdf-viewer/pdf.worker.min.js.txt'
import themeDarkSource from '#src/asset/pdf-viewer/theme-dark.css'
import themeLightSource from '#src/asset/pdf-viewer/theme-light.css'
import { WebviewAssets } from '#src/lib/webview-assets'

export const pdfViewerHtml = {
  _sanitizeInlineScript(source: string): string {
    return source.replace(/<\/script/gi, '<\\/script')
  },
  compose(params: {
    htmlSource: string
    pdfJsBundle: string
    pdfJsWorker: string
    themeDarkCss: string
    themeLightCss: string
  }): string {
    return params.htmlSource
      .replace('/*__PDFJS_JS__*/', () => {
        return pdfViewerHtml._sanitizeInlineScript(params.pdfJsBundle)
      })
      .replace('/*__PDFJS_WORKER__*/', () => {
        return pdfViewerHtml._sanitizeInlineScript(params.pdfJsWorker)
      })
      .replace('/*__THEME_DARK__*/', () => {
        return params.themeDarkCss
      })
      .replace('/*__THEME_LIGHT__*/', () => {
        return params.themeLightCss
      })
  },
  async load(): Promise<string> {
    const [htmlSource, pdfJsBundle, pdfJsWorker, themeDarkCss, themeLightCss] = await Promise.all([
      new WebviewAssets().readAssetText({ assetModule: pdfViewerHtmlSource }),
      new WebviewAssets().readAssetText({ assetModule: pdfJsBundleSource }),
      new WebviewAssets().readAssetText({ assetModule: pdfJsWorkerSource }),
      new WebviewAssets().readAssetText({ assetModule: themeDarkSource }),
      new WebviewAssets().readAssetText({ assetModule: themeLightSource }),
    ])

    return pdfViewerHtml.compose({ htmlSource, pdfJsBundle, pdfJsWorker, themeDarkCss, themeLightCss })
  },
}
