import { type JSX } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { type JsxAST, type Middleware, SvgAst, type XmlAST, parse } from 'react-native-svg'

import { DEFAULT_FILE_ICON, FILE_ICONS, type FileIconKey } from '#src/asset/file-icons/file-icons.gen'

interface FileIconProps {
  iconKey: FileIconKey
  monoColor?: string
  size: number
  style?: StyleProp<ViewStyle>
}

const astCache = new Map<string, JsxAST>()

const stripPaintProps = (node: XmlAST): XmlAST => {
  delete node.props.fill
  delete node.props.stroke
  node.children.forEach((child) => {
    if (typeof child !== 'string') {
      stripPaintProps(child)
    }
  })

  return node
}

const stripPaintMiddleware: Middleware = (ast) => {
  return stripPaintProps(ast)
}

const resolveMiddleware = (params: { isMono: boolean }): Middleware | undefined => {
  if (params.isMono) {
    return stripPaintMiddleware
  }

  return undefined
}

const resolveCacheKey = (params: { iconKey: FileIconKey; isMono: boolean }): string => {
  if (params.isMono) {
    return `${params.iconKey}:mono`
  }

  return params.iconKey
}

const parseIconSvg = (params: { iconKey: FileIconKey; isMono: boolean }): JsxAST | null => {
  const svg = FILE_ICONS[params.iconKey]
  if (typeof svg !== 'string') {
    return null
  }

  try {
    return parse(svg, resolveMiddleware({ isMono: params.isMono }))
  } catch {
    return null
  }
}

const resolveDefaultAst = (params: { isMono: boolean }): JsxAST | null => {
  return parseIconSvg({ iconKey: DEFAULT_FILE_ICON, isMono: params.isMono })
}

const resolveAst = (params: { iconKey: FileIconKey; isMono: boolean }): JsxAST | null => {
  const cacheKey = resolveCacheKey(params)
  const cachedAst = astCache.get(cacheKey)
  if (cachedAst !== undefined) {
    return cachedAst
  }

  const ast = parseIconSvg(params) ?? resolveDefaultAst({ isMono: params.isMono })
  if (ast === null) {
    return null
  }

  astCache.set(cacheKey, ast)

  return ast
}

export const FileIcon = (props: FileIconProps): JSX.Element => {
  return (
    <SvgAst
      ast={resolveAst({ iconKey: props.iconKey, isMono: props.monoColor !== undefined })}
      override={{
        fill: props.monoColor,
        height: props.size,
        stroke: props.monoColor,
        style: props.style,
        width: props.size,
      }}
    />
  )
}
