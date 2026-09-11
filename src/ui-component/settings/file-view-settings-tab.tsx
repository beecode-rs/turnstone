import { type JSX } from 'react'

import { FontSizeMenu } from '#src/ui-component/code-viewer/font-size-menu'
import { LineNumbersSwitch } from '#src/ui-component/code-viewer/line-numbers-switch'
import { ViewMarginMenu } from '#src/ui-component/code-viewer/view-margin-menu'
import { WordWrapSwitch } from '#src/ui-component/code-viewer/word-wrap-switch'
import { PlantumlSelfSignedSwitch } from '#src/ui-component/settings/plantuml-self-signed-switch'
import { PlantumlServerSwitch } from '#src/ui-component/settings/plantuml-server-switch'
import { PlantumlServerUrlInput } from '#src/ui-component/settings/plantuml-server-url-input'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { SettingsSection } from '#src/ui-component/settings/settings-section'
import { DotFilesSwitch } from '#src/ui-component/tree/dot-files-switch'
import { IgnoredFilesSwitch } from '#src/ui-component/tree/ignored-files-switch'

export const FileViewSettingsTab = (): JSX.Element => {
  return (
    <>
      <SettingsSection>
        <SettingsRow
          control={<DotFilesSwitch />}
          description="Files and folders starting with a dot"
          label="Hide dot files"
        />
        <SettingsRow
          control={<IgnoredFilesSwitch />}
          description="Files matched by .gitignore patterns"
          label="Hide ignored files"
        />
        <SettingsRow
          control={<WordWrapSwitch />}
          description="Wrap long lines instead of horizontal scrolling"
          label="Word wrap"
        />
        <SettingsRow
          control={<LineNumbersSwitch />}
          description="Line numbers alongside file contents"
          label="Hide line numbers"
        />
        <SettingsRow
          control={<ViewMarginMenu />}
          description="Smaller margins give more reading space"
          label="View margin"
        />
        <SettingsRow control={<FontSizeMenu />} description="Text size for file contents" label="Font size" />
      </SettingsSection>
      <SettingsSection title="PlantUML">
        <SettingsRow
          control={<PlantumlServerSwitch />}
          description="Diagram source is sent to the render server"
          label="Custom render server"
        />
        <PlantumlServerUrlInput />
        <SettingsRow
          control={<PlantumlSelfSignedSwitch />}
          description="Skip certificate verification for the custom render server (insecure)"
          label="Trust self-signed certificates"
        />
      </SettingsSection>
    </>
  )
}
