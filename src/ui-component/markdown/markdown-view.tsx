import { MaterialCommunityIcons } from '@expo/vector-icons'
import Markdown, {
  type ASTNode,
  type MarkdownStyleMap,
  type RenderRules,
  createMarkdownIt,
  renderRules,
} from '@ronradtke/react-native-markdown-display'
import {
  type ComponentProps,
  Fragment,
  type JSX,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  type ColorValue,
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native'
import RenderHTML, { type DomVisitorCallbacks, type Element, type TNode } from 'react-native-render-html'

import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { MarkdownHeadingLevelMapper } from '#src/business/enum/markdown-heading-level-mapper-enum'
import { ViewerModeMapper } from '#src/business/enum/viewer-mode-mapper-enum'
import { ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import { type MarkdownCodeBlock } from '#src/business/model/markdown-code-block'
import { BinaryPlaceholder } from '#src/ui-component/code-viewer/binary-placeholder'
import { CodeViewerWebview } from '#src/ui-component/code-viewer/code-viewer-webview'
import { useFontSize } from '#src/ui-component/code-viewer/font-size-context'
import { FONT_SIZE_METRICS } from '#src/ui-component/code-viewer/font-size-metrics'
import { useLineNumbers } from '#src/ui-component/code-viewer/line-numbers-context'
import { useViewMargin } from '#src/ui-component/code-viewer/view-margin-context'
import { VIEW_MARGIN_METRICS } from '#src/ui-component/code-viewer/view-margin-metrics'
import { useWordWrap } from '#src/ui-component/code-viewer/word-wrap-context'
import { CutoutSafeArea } from '#src/ui-component/cutout-safe-area'
import { MarkdownHtmlImage } from '#src/ui-component/markdown/markdown-html-image'
import { MarkdownImage } from '#src/ui-component/markdown/markdown-image'
import { MarkdownMermaid } from '#src/ui-component/markdown/markdown-mermaid'
import { MarkdownPlantuml } from '#src/ui-component/markdown/markdown-plantuml'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { type RemoteFileTextResult } from '#src/ui-component/use-remote-file-text'
import { languageUtil } from '#src/util/language-util'
import { markdownLinkUtil } from '#src/util/markdown-link-util'
import { markdownSelectableRunUtil } from '#src/util/markdown-selectable-run-util'
import { markdownTaskListUtil } from '#src/util/markdown-task-list-util'
import { remotePathUtil } from '#src/util/remote-path-util'

const PULL_DOWN_TOP_OFFSET_MAX_PX = 1

interface MarkdownViewProps {
  file: RemoteFileTextResult
  hostId: string
  onCodeBlockPress: (block: MarkdownCodeBlock) => void
  onOpenFile: (params: { path: string }) => void
  onPullToRefresh: () => void
  path: string
  viewMode: ViewerModeMapper
}

const BODY_FONT_FAMILY = 'interRegular'
const BOLD_FONT_FAMILY = 'interBold'
const ITALIC_FONT_FAMILY = 'interItalic'
const MONO_FONT_FAMILY = 'jetBrainsMonoRegular'
const HTML_INLINE_BR_PATTERN = /^<br\b/i
const HTML_INLINE_IMAGE_TAG_PATTERN = /<img\b[^>]*>/i
const HTML_INLINE_IMAGE_SRC_PATTERN = /\bsrc=["']([^"']+)["']/i
const HTML_INLINE_IMAGE_WIDTH_PATTERN = /\bwidth=["']([^"']+)["']/i
const htmlEnabledMarkdownIt = createMarkdownIt({ plugins: [markdownTaskListUtil.plugin] }).set({ html: true })

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const TASK_CHECKBOX_ICON_SIZE = 20
const TASK_ITEM_CHECKED_STYLE: StyleProp<ViewStyle> = { opacity: 0.6 }

const resolveFileName = (params: { path: string }): string => {
  return remotePathUtil.toParts({ path: params.path }).at(-1) ?? ''
}

const resolveViewerTheme = (params: { scheme: EffectiveThemeSchemeMapper }): ViewerThemeMapper => {
  if (params.scheme === EffectiveThemeSchemeMapper.DARK) {
    return ViewerThemeMapper.DARK
  }

  return ViewerThemeMapper.LIGHT
}

const resolveMarkdownColorScheme = (params: { theme: ViewerThemeMapper }): 'dark' | 'light' => {
  if (params.theme === ViewerThemeMapper.DARK) {
    return 'dark'
  }

  return 'light'
}

const resolveTaskCheckboxIconName = (params: { isChecked: boolean }): MaterialIconName => {
  if (params.isChecked) {
    return 'checkbox-marked-outline'
  }

  return 'checkbox-blank-outline'
}

const resolveBlockLanguage = (params: { info: string }): string => {
  const token = params.info.trim().split(/\s+/).at(0) ?? ''
  if (token === '') {
    return 'plaintext'
  }

  return languageUtil.fromExtension({ fileName: `block.${token}` }) ?? 'plaintext'
}

const resolveSourceInfo = (node: ASTNode): string => {
  if (typeof node.sourceInfo === 'string') {
    return node.sourceInfo
  }

  return ''
}

const MERMAID_FENCE_TOKENS = new Set(['mermaid'])

const PLANTUML_FENCE_TOKENS = new Set(['plantuml', 'puml', 'uml'])

const resolveIsMermaidFence = (params: { info: string }): boolean => {
  const token = params.info.trim().split(/\s+/).at(0) ?? ''

  return MERMAID_FENCE_TOKENS.has(token.toLowerCase())
}

const resolveIsPlantumlFence = (params: { info: string }): boolean => {
  const token = params.info.trim().split(/\s+/).at(0) ?? ''

  return PLANTUML_FENCE_TOKENS.has(token.toLowerCase())
}

const isInsideHeading = (parentNodes: ASTNode[]): boolean => {
  return parentNodes.some((parentNode) => {
    return parentNode.type.startsWith('heading')
  })
}

const resolveIsDirectBodyChild = (parentNodes: ASTNode[]): boolean => {
  return parentNodes[0]?.type === 'body'
}

const SelectableRunContext = createContext(false)

const SelectableText = (props: TextProps): JSX.Element => {
  const isInsideSelectableRun = useContext(SelectableRunContext)
  if (isInsideSelectableRun) {
    return <Text {...props} />
  }

  return <Text selectable {...props} />
}

const buildBodyRule = (params: { fontSizePx: number; lineHeightPx: number }): NonNullable<RenderRules['body']> => {
  return (node, children, _parentNodes, styles) => {
    const groups = markdownSelectableRunUtil.groupBlocksBySelectableRun({
      blocks: node.children.map((childNode) => {
        return {
          isSelectableRunSafe: !resolveHasInlineImage(childNode),
          type: childNode.type,
        }
      }),
    })

    return (
      <View key={node.key} style={styles._VIEW_SAFE_body}>
        {groups.map((group, groupIndex) => {
          if (group.kind === 'standalone-block') {
            return children[group.blockIndex]
          }

          return (
            <SelectableRunContext.Provider key={`selectable-run-${String(groupIndex)}`} value={true}>
              <Text
                selectable
                style={{
                  fontFamily: BODY_FONT_FAMILY,
                  fontSize: params.fontSizePx,
                  includeFontPadding: false,
                  lineHeight: params.lineHeightPx,
                }}
              >
                {group.blockIndexes.flatMap((blockIndex, memberIndex) => {
                  if (memberIndex === 0) {
                    return [children[blockIndex]]
                  }

                  return ['\n\n', children[blockIndex]]
                })}
              </Text>
            </SelectableRunContext.Provider>
          )
        })}
      </View>
    )
  }
}

const buildHeadingRule = (params: {
  defaultRules: RenderRules
  textStyle: TextStyle
}): NonNullable<RenderRules[string]> => {
  return (node, children, parentNodes, styles, ...extra): ReactNode => {
    if (!resolveIsDirectBodyChild(parentNodes) || resolveHasInlineImage(node)) {
      return params.defaultRules[node.type]?.(node, children, parentNodes, styles, ...extra)
    }

    return (
      <Text key={node.key} style={params.textStyle}>
        {children}
      </Text>
    )
  }
}

const buildParagraphRule = (params: { defaultRules: RenderRules }): NonNullable<RenderRules['paragraph']> => {
  return (node, children, parentNodes, styles, ...extra): ReactNode => {
    if (!resolveIsDirectBodyChild(parentNodes) || resolveHasInlineImage(node)) {
      return params.defaultRules.paragraph?.(node, children, parentNodes, styles, ...extra)
    }

    return <Fragment key={node.key}>{children}</Fragment>
  }
}

const buildTextGroupRule = (params: {
  fontSizePx: number
  lineHeightPx: number
}): NonNullable<RenderRules['textgroup']> => {
  return (node, children, parentNodes, styles) => {
    if (isInsideHeading(parentNodes)) {
      return (
        <SelectableText
          key={node.key}
          style={[styles.textgroup, { fontFamily: BOLD_FONT_FAMILY, includeFontPadding: false }]}
        >
          {children}
        </SelectableText>
      )
    }

    return (
      <SelectableText
        key={node.key}
        style={[
          styles.textgroup,
          {
            fontFamily: BODY_FONT_FAMILY,
            fontSize: params.fontSizePx,
            includeFontPadding: false,
            lineHeight: params.lineHeightPx,
          },
        ]}
      >
        {children}
      </SelectableText>
    )
  }
}

const buildFenceRule = (params: {
  defaultRules: RenderRules
  onCodeBlockPress: (block: MarkdownCodeBlock) => void
}): NonNullable<RenderRules['fence']> => {
  return (node, children, parentNodes, styles, ...extra): ReactNode => {
    const defaultFence = params.defaultRules.fence?.(node, children, parentNodes, styles, ...extra)
    const handlePress = (): void => {
      const info = resolveSourceInfo(node)
      params.onCodeBlockPress({
        language: resolveBlockLanguage({ info }),
        text: node.content,
      })
    }

    if (resolveIsMermaidFence({ info: resolveSourceInfo(node) })) {
      return <MarkdownMermaid fallback={defaultFence} key={node.key} source={node.content} />
    }

    if (resolveIsPlantumlFence({ info: resolveSourceInfo(node) })) {
      return (
        <TouchableOpacity key={node.key} onPress={handlePress}>
          <MarkdownPlantuml fallback={defaultFence} source={node.content} />
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity key={node.key} onPress={handlePress}>
        {defaultFence}
      </TouchableOpacity>
    )
  }
}

const resolveTaskListItemStyle = (params: { isChecked: boolean }): StyleProp<ViewStyle> => {
  if (params.isChecked) {
    return TASK_ITEM_CHECKED_STYLE
  }

  return undefined
}

const buildListItemRule = (params: {
  checkboxColor: ColorValue
  defaultRules: RenderRules
  lineHeightPx: number
}): NonNullable<RenderRules['list_item']> => {
  return (node, children, parentNodes, styles, ...extra): ReactNode => {
    const isChecked = markdownTaskListUtil.resolveTaskState({ node })
    if (isChecked === null) {
      return params.defaultRules.list_item?.(node, children, parentNodes, styles, ...extra)
    }

    return (
      <View key={node.key} style={[styles._VIEW_SAFE_list_item, resolveTaskListItemStyle({ isChecked })]}>
        <MaterialCommunityIcons
          color={String(params.checkboxColor)}
          name={resolveTaskCheckboxIconName({ isChecked })}
          size={TASK_CHECKBOX_ICON_SIZE}
          style={{ includeFontPadding: false, lineHeight: params.lineHeightPx, marginHorizontal: 8 }}
        />
        <View style={styles._VIEW_SAFE_bullet_list_content}>{children}</View>
      </View>
    )
  }
}

type HtmlInlineContent = { kind: 'br' } | { kind: 'image'; src: string; widthAttr: string | null } | { kind: 'unknown' }

const resolveHtmlInlineContent = (params: { html: string }): HtmlInlineContent => {
  if (HTML_INLINE_BR_PATTERN.test(params.html)) {
    return { kind: 'br' }
  }

  const imageTag = HTML_INLINE_IMAGE_TAG_PATTERN.exec(params.html)?.[0]
  if (imageTag === undefined) {
    return { kind: 'unknown' }
  }

  const imageSrc = HTML_INLINE_IMAGE_SRC_PATTERN.exec(imageTag)?.[1]
  if (imageSrc === undefined || imageSrc === '') {
    return { kind: 'unknown' }
  }

  return {
    kind: 'image',
    src: imageSrc,
    widthAttr: HTML_INLINE_IMAGE_WIDTH_PATTERN.exec(imageTag)?.[1] ?? null,
  }
}

const resolveHasInlineImage = (node: ASTNode): boolean => {
  if (node.type === 'image') {
    return true
  }
  if (node.type === 'html_inline') {
    return resolveHtmlInlineContent({ html: node.content }).kind === 'image'
  }

  return node.children.some((childNode) => {
    return resolveHasInlineImage(childNode)
  })
}

const ALIGN_TO_TEXT_ALIGN_MAP: Record<string, string> = {
  center: 'center',
  justify: 'justify',
  left: 'left',
  right: 'right',
}

const resolveMergedStyle = (params: { existingStyle: string | undefined; textAlign: string }): string => {
  if (params.existingStyle === undefined) {
    return `text-align: ${params.textAlign}`
  }

  return `text-align: ${params.textAlign}; ${params.existingStyle}`
}

const applyAlignAttributeStyle = (element: Element): void => {
  if (element.tagName === 'img') {
    return
  }
  const align = element.attribs.align as string | undefined
  if (align === undefined) {
    return
  }
  const textAlign = ALIGN_TO_TEXT_ALIGN_MAP[align.toLowerCase()] as string | undefined
  if (textAlign === undefined) {
    return
  }
  element.attribs.style = resolveMergedStyle({ existingStyle: element.attribs.style, textAlign })
}

const alignDomVisitors: DomVisitorCallbacks = {
  onElement: applyAlignAttributeStyle,
}

const buildHtmlBlockImgRenderer = (params: { contentWidth: number; hostId: string; markdownPath: string }) => {
  return (rendererProps: { tnode: TNode }): JSX.Element | null => {
    const attributes = rendererProps.tnode.attributes
    const src = attributes.src
    if (typeof src !== 'string' || src === '') {
      return null
    }

    return (
      <MarkdownHtmlImage
        alt={attributes.alt}
        contentWidth={params.contentWidth}
        hostId={params.hostId}
        markdownPath={params.markdownPath}
        src={src}
        width={attributes.width}
      />
    )
  }
}

const buildHtmlRules = (params: {
  contentWidth: number
  fontSizePx: number
  hostId: string
  linkColor: ColorValue
  markdownPath: string
  onAnchorPress: (href: string) => void
  textColor: ColorValue
}): {
  html_block: NonNullable<RenderRules['html_block']>
  html_inline: NonNullable<RenderRules['html_inline']>
} => {
  const imgRenderer = buildHtmlBlockImgRenderer({
    contentWidth: params.contentWidth,
    hostId: params.hostId,
    markdownPath: params.markdownPath,
  })

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display render-rule key set by the library API
    html_block: (node): ReactNode => {
      if (node.content.trim() === '') {
        return null
      }

      return (
        <RenderHTML
          key={node.key}
          baseStyle={{ color: params.textColor, fontFamily: BODY_FONT_FAMILY, fontSize: params.fontSizePx }}
          contentWidth={params.contentWidth}
          domVisitors={alignDomVisitors}
          renderers={{ img: imgRenderer }}
          renderersProps={{
            a: {
              onPress: (_event, href) => {
                params.onAnchorPress(href)
              },
            },
          }}
          source={{ html: node.content }}
          tagsStyles={{ a: { color: params.linkColor } }}
        />
      )
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display render-rule key set by the library API
    html_inline: (node): ReactNode => {
      const content = resolveHtmlInlineContent({ html: node.content })
      switch (content.kind) {
        case 'br': {
          return <Text key={node.key}>{'\n'}</Text>
        }
        case 'image': {
          return (
            <MarkdownImage
              hostId={params.hostId}
              key={node.key}
              markdownPath={params.markdownPath}
              maxWidth={params.contentWidth}
              src={content.src}
              widthAttr={content.widthAttr}
            />
          )
        }
        default: {
          return null
        }
      }
    },
  }
}

const buildImageRule = (params: {
  contentWidth: number
  hostId: string
  markdownPath: string
}): NonNullable<RenderRules['image']> => {
  return (node): ReactNode => {
    const src = node.attributes.src
    if (typeof src !== 'string' || src === '') {
      return null
    }

    return (
      <MarkdownImage
        hostId={params.hostId}
        key={node.key}
        markdownPath={params.markdownPath}
        maxWidth={params.contentWidth}
        src={src}
      />
    )
  }
}

export const MarkdownView = (props: MarkdownViewProps): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const { width: windowWidth } = useWindowDimensions()
  const { isLineNumbersHidden } = useLineNumbers()
  const { isWordWrapEnabled } = useWordWrap()
  const { fontSize } = useFontSize()
  const { margin } = useViewMargin()
  const { colors } = navigationTheme
  const [isRefreshing, setIsRefreshing] = useState(false)
  const scrollOffsetRef = useRef(0)
  const { binarySize, isLoading, isTruncated, text } = props.file

  useEffect(() => {
    if (!isLoading) {
      setIsRefreshing(false)
    }
  }, [isLoading])

  const handleLinkPress = useCallback(
    (href: string): boolean => {
      const target = markdownLinkUtil.resolveTarget({ href, markdownPath: props.path })
      switch (target.kind) {
        case 'external': {
          return true
        }
        case 'file': {
          props.onOpenFile({ path: target.path })

          return false
        }
        default: {
          return false
        }
      }
    },
    [props.onOpenFile, props.path],
  )

  const handleAnchorPress = useCallback(
    (href: string): void => {
      if (handleLinkPress(href)) {
        void Linking.openURL(href)
      }
    },
    [handleLinkPress],
  )

  const fileName = useMemo(() => {
    return resolveFileName({ path: props.path })
  }, [props.path])
  const viewerTheme = useMemo(() => {
    return resolveViewerTheme({ scheme: effectiveScheme })
  }, [effectiveScheme])
  const markdownRules = useMemo(() => {
    return renderRules(SelectableText)
  }, [])
  const fontSizeMetrics = useMemo(() => {
    return FONT_SIZE_METRICS[fontSize]
  }, [fontSize])
  const headingTextStyles = useMemo(() => {
    const headingScale = fontSizeMetrics.markdownHeadingScale
    const resolveHeadingPx = (basePx: number): number => {
      return Math.round(basePx * headingScale)
    }

    return {
      [MarkdownHeadingLevelMapper.HEADING_1]: {
        fontFamily: BOLD_FONT_FAMILY,
        fontSize: resolveHeadingPx(32),
        lineHeight: resolveHeadingPx(38),
      },
      [MarkdownHeadingLevelMapper.HEADING_2]: {
        fontFamily: BOLD_FONT_FAMILY,
        fontSize: resolveHeadingPx(24),
        lineHeight: resolveHeadingPx(30),
      },
      [MarkdownHeadingLevelMapper.HEADING_3]: {
        fontFamily: BOLD_FONT_FAMILY,
        fontSize: resolveHeadingPx(18),
        lineHeight: resolveHeadingPx(24),
      },
      [MarkdownHeadingLevelMapper.HEADING_4]: {
        fontFamily: BOLD_FONT_FAMILY,
        fontSize: resolveHeadingPx(16),
        lineHeight: resolveHeadingPx(22),
      },
      [MarkdownHeadingLevelMapper.HEADING_5]: {
        fontFamily: BOLD_FONT_FAMILY,
        fontSize: resolveHeadingPx(13),
        lineHeight: resolveHeadingPx(18),
      },
      [MarkdownHeadingLevelMapper.HEADING_6]: {
        fontFamily: BOLD_FONT_FAMILY,
        fontSize: resolveHeadingPx(11),
        lineHeight: resolveHeadingPx(16),
      },
    } satisfies Record<MarkdownHeadingLevelMapper, TextStyle>
  }, [fontSizeMetrics])
  const viewMarginMetrics = useMemo(() => {
    return VIEW_MARGIN_METRICS[margin]
  }, [margin])
  const contentWidth = useMemo(() => {
    return windowWidth - viewMarginMetrics.markdownHorizontal * 2
  }, [viewMarginMetrics, windowWidth])
  const htmlRules = useMemo(() => {
    return buildHtmlRules({
      contentWidth,
      fontSizePx: fontSizeMetrics.markdownFontSizePx,
      hostId: props.hostId,
      linkColor: colors.primary,
      markdownPath: props.path,
      onAnchorPress: handleAnchorPress,
      textColor: colors.text,
    })
  }, [colors.primary, colors.text, contentWidth, fontSizeMetrics, handleAnchorPress, props.hostId, props.path])
  const rules = useMemo(() => {
    return {
      body: buildBodyRule({
        fontSizePx: fontSizeMetrics.markdownFontSizePx,
        lineHeightPx: fontSizeMetrics.markdownLineHeightPx,
      }),
      fence: buildFenceRule({
        defaultRules: markdownRules,
        onCodeBlockPress: props.onCodeBlockPress,
      }),
      heading1: buildHeadingRule({
        defaultRules: markdownRules,
        textStyle: headingTextStyles[MarkdownHeadingLevelMapper.HEADING_1],
      }),
      heading2: buildHeadingRule({
        defaultRules: markdownRules,
        textStyle: headingTextStyles[MarkdownHeadingLevelMapper.HEADING_2],
      }),
      heading3: buildHeadingRule({
        defaultRules: markdownRules,
        textStyle: headingTextStyles[MarkdownHeadingLevelMapper.HEADING_3],
      }),
      heading4: buildHeadingRule({
        defaultRules: markdownRules,
        textStyle: headingTextStyles[MarkdownHeadingLevelMapper.HEADING_4],
      }),
      heading5: buildHeadingRule({
        defaultRules: markdownRules,
        textStyle: headingTextStyles[MarkdownHeadingLevelMapper.HEADING_5],
      }),
      heading6: buildHeadingRule({
        defaultRules: markdownRules,
        textStyle: headingTextStyles[MarkdownHeadingLevelMapper.HEADING_6],
      }),
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display render-rule key set by the library API
      html_block: htmlRules.html_block,
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display render-rule key set by the library API
      html_inline: htmlRules.html_inline,
      image: buildImageRule({
        contentWidth,
        hostId: props.hostId,
        markdownPath: props.path,
      }),
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display render-rule key set by the library API
      list_item: buildListItemRule({
        checkboxColor: colors.text,
        defaultRules: markdownRules,
        lineHeightPx: fontSizeMetrics.markdownLineHeightPx,
      }),
      paragraph: buildParagraphRule({ defaultRules: markdownRules }),
      textgroup: buildTextGroupRule({
        fontSizePx: fontSizeMetrics.markdownFontSizePx,
        lineHeightPx: fontSizeMetrics.markdownLineHeightPx,
      }),
    } satisfies RenderRules
  }, [
    colors.text,
    contentWidth,
    fontSizeMetrics,
    headingTextStyles,
    htmlRules,
    markdownRules,
    props.hostId,
    props.onCodeBlockPress,
    props.path,
  ])
  const markdownStyles = useMemo(() => {
    return {
      body: {
        fontFamily: BODY_FONT_FAMILY,
        fontSize: fontSizeMetrics.markdownFontSizePx,
        includeFontPadding: false,
        lineHeight: fontSizeMetrics.markdownLineHeightPx,
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      bullet_list_icon: {
        color: colors.text,
        fontFamily: BODY_FONT_FAMILY,
        fontSize: fontSizeMetrics.markdownFontSizePx,
        includeFontPadding: false,
        lineHeight: fontSizeMetrics.markdownLineHeightPx,
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      code_block: { fontFamily: MONO_FONT_FAMILY, padding: 4 },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      code_inline: { fontFamily: MONO_FONT_FAMILY, padding: 2 },
      em: { fontFamily: ITALIC_FONT_FAMILY },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      fence_code: { padding: 4 },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      fence_header: { paddingHorizontal: 4, paddingVertical: 2 },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      fence_language_label: { fontFamily: MONO_FONT_FAMILY },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      fence_token: { color: colors.text, fontFamily: MONO_FONT_FAMILY },
      heading1: {
        ...headingTextStyles[MarkdownHeadingLevelMapper.HEADING_1],
        marginBottom: 8,
        marginTop: 20,
      },
      heading2: {
        ...headingTextStyles[MarkdownHeadingLevelMapper.HEADING_2],
        marginBottom: 6,
        marginTop: 16,
      },
      heading3: {
        ...headingTextStyles[MarkdownHeadingLevelMapper.HEADING_3],
        marginBottom: 4,
        marginTop: 12,
      },
      heading4: {
        ...headingTextStyles[MarkdownHeadingLevelMapper.HEADING_4],
        marginBottom: 4,
        marginTop: 12,
      },
      heading5: {
        ...headingTextStyles[MarkdownHeadingLevelMapper.HEADING_5],
        marginBottom: 2,
        marginTop: 10,
      },
      heading6: {
        ...headingTextStyles[MarkdownHeadingLevelMapper.HEADING_6],
        marginBottom: 2,
        marginTop: 10,
      },
      link: {
        color: colors.primary,
        fontFamily: BODY_FONT_FAMILY,
        fontSize: fontSizeMetrics.markdownFontSizePx,
        includeFontPadding: false,
        lineHeight: fontSizeMetrics.markdownLineHeightPx,
        marginBottom: 0,
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention -- markdown-display style-map key set by the library API
      ordered_list_icon: {
        color: colors.text,
        fontFamily: BODY_FONT_FAMILY,
        fontSize: fontSizeMetrics.markdownFontSizePx,
        includeFontPadding: false,
        lineHeight: fontSizeMetrics.markdownLineHeightPx,
      },
      strong: { fontFamily: BOLD_FONT_FAMILY },
      textgroup: { color: colors.text },
    } satisfies MarkdownStyleMap
  }, [colors.primary, colors.text, fontSizeMetrics, headingTextStyles])

  const isBinary = binarySize !== null
  const fileText = text

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y
  }

  const handlePullToRefresh = (): void => {
    setIsRefreshing(true)
    props.onPullToRefresh()
  }

  const handleViewerPullDown = (): void => {
    if (scrollOffsetRef.current > PULL_DOWN_TOP_OFFSET_MAX_PX) {
      return
    }
    handlePullToRefresh()
  }

  if (isLoading && text === '' && binarySize === null) {
    return (
      <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={String(colors.primary)} />
        </View>
      </CutoutSafeArea>
    )
  }

  return (
    <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            colors={[String(colors.primary)]}
            onRefresh={handlePullToRefresh}
            refreshing={isRefreshing}
            tintColor={colors.primary}
          />
        }
        scrollEventThrottle={200}
        style={styles.scroll}
      >
        {isBinary && <BinaryPlaceholder fileName={fileName} size={binarySize} />}
        {!isBinary && props.viewMode === ViewerModeMapper.RENDERED && (
          <View
            style={{
              paddingHorizontal: viewMarginMetrics.markdownHorizontal,
              paddingVertical: viewMarginMetrics.markdownVertical,
            }}
          >
            <Markdown
              colorScheme={resolveMarkdownColorScheme({ theme: viewerTheme })}
              markdownit={htmlEnabledMarkdownIt}
              onLinkPress={handleLinkPress}
              rules={rules}
              style={markdownStyles}
            >
              {fileText}
            </Markdown>
          </View>
        )}
        {!isBinary && props.viewMode === ViewerModeMapper.SOURCE && (
          <CodeViewerWebview
            content={fileText}
            fontSize={fontSize}
            isLineNumbersHidden={isLineNumbersHidden}
            language="markdown"
            margin={margin}
            onPullDown={handleViewerPullDown}
            theme={viewerTheme}
            wordWrap={isWordWrapEnabled}
          />
        )}
        {!isBinary && isTruncated && (
          <Text style={[styles.truncatedNote, { color: colors.text }]}>
            Large markdown file: showing the first 2 MB
          </Text>
        )}
      </ScrollView>
    </CutoutSafeArea>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  truncatedNote: {
    fontSize: 12,
    opacity: 0.6,
    padding: 16,
  },
})
