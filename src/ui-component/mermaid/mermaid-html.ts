import mermaidHtmlSource from '#src/asset/mermaid/index.html'
import mermaidBundleSource from '#src/asset/mermaid/mermaid.min.js.txt'
import { WebviewAssets } from '#src/lib/webview-assets'

export const mermaidHtml = {
  _loadPromise: null as Promise<string> | null,
  async _read(): Promise<string> {
    const [htmlSource, bundle] = await Promise.all([
      new WebviewAssets().readAssetText({ assetModule: mermaidHtmlSource }),
      new WebviewAssets().readAssetText({ assetModule: mermaidBundleSource }),
    ])

    return mermaidHtml.compose({ bundle, htmlSource })
  },
  _sanitizeInlineScript(source: string): string {
    return source.replace(/<\/script/gi, '<\\/script')
  },
  compose(params: { bundle: string; htmlSource: string }): string {
    return params.htmlSource.replace('/*__MERMAID_JS__*/', () => {
      return mermaidHtml._sanitizeInlineScript(params.bundle)
    })
  },
  load(): Promise<string> {
    if (mermaidHtml._loadPromise === null) {
      const loadPromise = mermaidHtml._read()
      loadPromise.catch(() => {
        if (mermaidHtml._loadPromise === loadPromise) {
          mermaidHtml._loadPromise = null
        }
      })
      mermaidHtml._loadPromise = loadPromise
    }

    return mermaidHtml._loadPromise
  },
}
