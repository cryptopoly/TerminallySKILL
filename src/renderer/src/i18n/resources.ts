type ResourceNamespace = Record<string, unknown>
type LocaleResource = Record<string, ResourceNamespace>

export const I18N_NAMESPACES = [
  'common',
  'settings',
  'commands',
  'commandBuilder',
  'dashboard',
  'layout',
  'projects',
  'scripts',
  'snippets',
  'files',
  'logs',
  'terminal',
  'onboarding',
  'ai'
] as const

const en: LocaleResource = {
  common: {
    actions: {
      apply: 'Apply',
      browse: 'Browse',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      reset: 'Reset',
      save: 'Save'
    },
    states: {
      loading: 'Loading TerminallySKILL...',
      system: 'System default',
      reactRenderError: 'React render error',
      tryAgain: 'Try again',
      startupFailed: 'Startup failed'
    }
  },
  settings: {
    title: 'Settings',
    tabs: {
      general: 'General',
      data: 'Data',
      ai: 'AI',
      logs: 'Logs',
      appearance: 'Theme',
      about: 'About'
    },
    general: {
      title: 'General',
      helpTooltips: {
        title: 'Help Tooltips',
        description: 'Show richer descriptions when hovering over controls'
      },
      startupBehavior: {
        title: 'Startup Behavior',
        description: 'Choose what to show when TerminallySKILL launches.',
        options: {
          dashboard: {
            label: 'Show Dashboard',
            description: 'Open with the project dashboard showing recent runs and quick actions'
          },
          lastProject: {
            label: 'Resume Last Project',
            description: 'Auto-open your last used project and restore the previous sidebar tab'
          }
        }
      },
      terminalInput: {
        title: 'Terminal Input',
        description: 'Choose between direct shell input and the editor-style command bar.',
        modes: {
          classic: {
            label: 'Classic',
            description: 'Type directly into the live shell prompt'
          },
          editor: {
            label: 'Editor Prompt',
            description: 'Use an editor-style command bar when the shell is ready'
          }
        }
      },
      safePaste: {
        title: 'Safe Paste Mode',
        description: 'Warn before sending suspicious or multi-line pastes into the shell'
      },
      resetCommandTrees: {
        title: 'Reset Command Trees',
        description:
          'Clear discovered/manual commands and generated help-enriched command trees so you can test from a clean command catalog.',
        unaffected: 'Scripts, snippets, projects, settings, and logs are not affected.',
        confirm:
          'Reset all discovered/manual command trees and generated help data?\n\nThis keeps your scripts, snippets, projects, settings, and logs.'
      }
    },
    locale: {
      title: 'Language & Locale',
      description: 'Control UI language, regional formatting, and AI response language.',
      uiLanguage: 'UI Language',
      formatLocale: 'Formats',
      aiLanguage: 'AI Responses',
      systemDescription: 'Use the language preferred by the operating system.',
      formatDescription: 'Controls dates, times, numbers, and sorting.',
      aiDescription: 'Commands, flags, file paths, code, and shell output stay unchanged.',
      appLanguage: 'Same as app language',
      launchTier: {
        P0: 'Launch',
        P1: 'Next',
        P2: 'Watch'
      }
    },
    logs: {
      title: 'Logs',
      saveTerminalLogs: 'Save Terminal Logs',
      saveTerminalLogsDescription:
        'Auto-save terminal sessions when they close, unless a project overrides this',
      storageFolder: 'Log Storage Folder',
      storageFolderDescription: 'Base folder for project-named terminal logs',
      defaultFolder: 'Default (app data folder)',
      reset: 'Reset',
      browse: 'Browse'
    },
    appearance: {
      title: 'Theme',
      darkThemes: 'Dark Themes',
      darkThemesDescription: 'Low-glare palettes for longer terminal sessions.',
      lightThemes: 'Light Themes',
      lightThemesDescription: 'Brighter palettes with softer contrast and paper-like surfaces.',
      themes: {
        void: { label: 'Void', description: 'Dark - Teal' },
        ember: { label: 'Ember', description: 'Warm - Amber' },
        dusk: { label: 'Dusk', description: 'Mid - Indigo' },
        forest: { label: 'Forest', description: 'Dark - Pine' },
        chalk: { label: 'Chalk', description: 'Light - Copper' },
        sand: { label: 'Latte', description: 'Light - Espresso' },
        stone: { label: 'Sage', description: 'Light - Olive' },
        mist: { label: 'Mist', description: 'Light - Slate' }
      }
    },
    data: {
      title: 'Data',
      storageTitle: 'Data Storage',
      storageDescription:
        'Move your TerminallySKILL data to a custom folder - useful for Dropbox, Google Drive, or an external drive.',
      folderLabel: 'Data Folder',
      loading: 'Loading...',
      customLocationActive: 'Custom location active',
      syncWarning:
        'Do not run TerminallySKILL on multiple machines pointing at the same folder simultaneously - this can corrupt your data. Use backups for safe cross-machine sync.',
      moveConfirm:
        'Move all TerminallySKILL data to:\n{{dir}}\n\nYour projects, scripts, snippets, settings, and logs will be copied. The app should be restarted after moving.',
      movedMessage: 'Data moved to {{dir}}. Restart the app to complete the switch.',
      moveFailed: 'Failed to move data directory',
      moving: 'Moving...',
      moveFolder: 'Move Data Folder',
      openFolder: 'Open Folder',
      resetConfirm:
        'Move data back to the default location?\n\nAll data will be copied back. The app should be restarted after resetting.',
      resetMessage: 'Data moved back to default location. Restart the app to complete.',
      resetFailed: 'Failed to reset data directory',
      resetToDefault: 'Reset to Default',
      backupsTitle: 'Backups',
      backupsDescription:
        'Save snapshot backups of your TerminallySKILL data folder to iCloud Drive or another folder. API secrets are intentionally excluded.',
      iCloudReady: 'iCloud-ready',
      manualSnapshots: 'Manual snapshots',
      backupFolder: 'Backup Folder',
      notConfigured: 'Not configured yet',
      lastBackup: 'Last backup: {{timestamp}}',
      noBackup: 'No backup created yet',
      iCloudUnavailable: 'iCloud Drive is not available right now.',
      iCloudReadyMessage: 'iCloud Drive backup folder is ready.',
      backupFolderUpdated: 'Backup folder updated.',
      chooseBackupFolder: 'Choose a backup folder first.',
      backupFailed: 'Backup failed.',
      backupSaved: 'Backup saved to {{path}}',
      backupCreated: 'Backup created successfully.',
      useICloud: 'Use iCloud Drive',
      backingUp: 'Backing Up',
      backUpNow: 'Back Up Now'
    },
    about: {
      title: 'About',
      description: 'Prompt-aware terminal workspace, workflows, logs, and AI helpers.',
      version: 'Version {{version}}',
      updatesTitle: 'App Updates',
      updatesDescription:
        'Check a release feed for newer builds, then download and open the matching installer in one click.',
      checkOnStartup: 'Check for Updates on Startup',
      checkOnStartupDescription:
        'Automatically check the configured release feed when TerminallySKILL launches',
      checking: 'Checking',
      checkForUpdates: 'Check for Updates',
      downloadInstall: 'Download & Install Update',
      downloadOpen: 'Download & Open Update',
      installing: 'Installing Update',
      opening: 'Opening Update',
      current: 'Current',
      latest: 'Latest',
      noReleaseFound: 'No release found',
      resolvedFeed: 'Resolved Feed',
      asset: 'Asset',
      autoSelectedBuild: 'Auto-selected platform build',
      published: 'Published',
      releaseNotes: 'Release Notes',
      releaseNotesHint: 'Expand to view highlights and the full change log.',
      support: 'Support',
      supportDescription:
        "TerminallySKILL is a solo indie project. If it's useful to you, tips help keep it going.",
      buyCoffee: 'Buy me a coffee'
    },
    ai: {
      title: 'AI Providers',
      description: 'Configure the providers this app can use for reviews, drafts, and fixes.',
      addProvider: 'Add Provider',
      emptyTitle: 'No providers connected yet',
      emptyDescription: 'Add OpenAI, Anthropic, or Ollama and pick which one should handle AI actions.',
      routingTitle: 'AI Routing',
      routingDescription: 'Pick one primary provider/model pair, then stack cross-provider fallbacks in order.',
      primaryProvider: 'Primary Provider',
      selectProvider: 'Select provider',
      primaryModel: 'Primary Model',
      primaryModelPlaceholder: 'Primary model id',
      fallbackChain: 'Fallback Chain',
      noFallbacks: 'No cross-provider fallbacks yet',
      fallbackProvider: 'Fallback provider',
      fallbackModelPlaceholder: 'Fallback model id',
      add: 'Add',
      active: 'Active',
      model_one: '{{count}} model',
      model_other: '{{count}} models',
      loadingModels: 'Loading Models',
      refreshModels: 'Refresh Models',
      testing: 'Testing',
      test: 'Test',
      disconnect: 'Disconnect',
      connectionPassed: 'Connection test passed',
      connectionFailed: 'Connection failed',
      connectionType: 'Connection Type',
      apiKey: 'API Key',
      pasteKey: 'Paste {{provider}} key',
      baseUrl: 'Base URL',
      localBaseUrl: 'Local Base URL',
      availableModels: 'Available Models',
      modelsDiscovered: '{{count}} models discovered from {{provider}}',
      loadModels: 'Load provider models to get searchable pickers.',
      connectToDiscover: 'Connect this provider to discover models.',
      synced: 'Synced',
      providerDefaultModel: 'Provider Default Model',
      providerDefaultDescription: 'Used as the suggested model when you choose this provider for primary routing.',
      defaultModelPlaceholder: 'Default model id',
      pickerTitle: 'Add AI Provider',
      pickerDescription: 'Pick a provider and then choose how this app should connect to it.',
      configure: 'Configure',
      connect: 'Connect',
      connectTitle: 'Connect {{provider}}',
      connectDescription: 'Choose how TerminallySKILL should talk to this provider.',
      apiKeyConnectionDescription: 'Paste a key and keep full app access local.',
      localConnectionDescription: 'Connect to a local runtime on your machine.',
      getApiKey: 'Get API key',
      keysStayLocal: 'API keys stay local and use system-protected storage when available.',
      connectProvider: 'Connect {{provider}}',
      connection: {
        apiKey: 'API Key',
        local: 'Local'
      },
      status: {
        notConnected: 'Not connected',
        available: 'Available to add',
        needsAttention: 'Needs attention',
        testFailed: 'Last connection test failed',
        missingDetails: 'Missing details',
        completeFields: 'Complete the connection fields',
        active: 'Active',
        activeDetail: 'Used for AI reviews and drafts',
        connected: 'Connected',
        backupReady: 'Ready as backup or alternate provider'
      },
      connectionHelp: {
        local: 'Local runtime on your machine',
        apiKey: 'API key connection'
      }
    },
    toggle: {
      off: 'Off',
      on: 'On'
    }
  },
  commands: {
    search: {
      placeholder: 'Search commands...'
    },
    addDialog: {
      title: 'Add Command',
      commandLabel: 'Command name or tool to search for',
      commandPlaceholder: 'e.g. openclaw, terraform, docker, uv...',
      searchSystem: 'Search system for this command',
      found: 'Found on your system',
      fixingPath: 'Fixing PATH...',
      fixPath: 'Add to PATH (fix "command not found")',
      fixPathSuccess: 'Added to {{configFile}}. Restart your terminal for the fix to take effect.',
      fixPathFailure: 'Could not update shell config. You may need to manually add the directory to your PATH.',
      notFound: 'Command not found on your system yet. If it shows up below, you can install it in a terminal or still add a manual placeholder.',
      installableMatches: 'Installable Matches',
      installCatalogSource: "Search results from TerminallySKILL's install catalog",
      installed: 'Installed',
      alsoKnownAs: 'Also known as: {{aliases}}',
      addCommand: 'Add Command',
      installInTerminal: 'Install in Terminal',
      suggestedInstallCommand: 'Suggested install command',
      footer: 'After adding a command, use "Generate Command Tree from --help" to auto-populate options. Install actions open in a visible local terminal so you can review what will run.',
      addManualPlaceholder: 'Add a manual placeholder command',
      addSpecific: 'Add {{executable}}',
      errors: {
        addFailed: 'Failed to add command. Please try again.',
        addExecutableFailed: 'Failed to add {{executable}}.',
        installTerminalFailed: 'Failed to open an install terminal for {{executable}}.'
      },
      info: {
        added: 'Added {{executable}}. You can generate its command tree once you are ready.',
        installQueued: 'Opened a terminal and queued {{label}} install for {{executable}}. Add or scan it once installation finishes.'
      }
    },
    scanDialog: {
      title: 'Scan Results',
      commandTree_one: '{{count}} command tree',
      commandTree_other: '{{count}} command trees',
      filterPlaceholder: 'Filter commands...',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      selected_one: '{{count}} selected',
      selected_other: '{{count}} selected',
      noFilterMatches: 'No commands match your filter',
      noNewCommands: 'No new commands found',
      added: 'Added',
      alreadyAdded: 'Already added to TerminallySKILL',
      apply_one: 'Apply {{count}} Command',
      apply_other: 'Apply {{count}} Commands'
    },
    categorySelector: {
      title: 'Command Groups',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      selectedOfTotal: '{{selected}} of {{total}} selected',
      commandCount_one: '{{count}} cmd',
      commandCount_other: '{{count}} cmds',
      scanning: 'Scanning...',
      scanInstalled: 'Scan for Installed Commands',
      scanDescription: 'This scan only shows commands that are actually installed on this machine. Use it to choose which command trees should appear in TerminallySKILL.',
      save: 'Save'
    },
    status: {
      missing: 'Missing',
      missingTitle: 'This CLI was not detected on this machine'
    },
    favorites: {
      add: 'Add to favorites',
      remove: 'Remove from favorites'
    },
    saved: {
      remove: 'Remove saved command'
    },
    descriptions: {
      commandTreeRoot: '{{executable}} Command Tree Root',
      generateCommandTree: 'Click "Generate Command Tree from --help" to populate options'
    },
    danger: {
      safe: 'Safe',
      caution: 'Caution',
      destructive: 'Destructive'
    }
  },
  commandBuilder: {
    fields: {
      required: 'required',
      selectPlaceholder: 'Select...',
      addValue: 'Add value',
      valuePlaceholder: 'Value {{index}}',
      browseDirectory: 'Browse directory',
      browseFile: 'Browse file',
      minimumCharacters: 'Minimum {{count}} characters',
      maximumCharacters: 'Maximum {{count}} characters',
      invalidFormat: 'Invalid format',
      min: 'min: {{value}}',
      max: 'max: {{value}}'
    },
    preview: {
      title: 'Command Preview',
      description: 'The command that will be executed. Click to edit manually.',
      resetToBuilder: 'Reset to Builder',
      resetDescription: 'Discard manual edits and restore the builder-generated command.',
      editPlaceholder: 'Build or edit a command',
      clickToEdit: 'Click to edit',
      copied: 'Copied',
      copy: 'Copy',
      copyDescription: 'Copy command to clipboard',
      addCommand: 'Add Command',
      addManualFirst: 'Reset preview to builder first, then save this as a reusable command preset.',
      addCurrent: 'Add the current builder state as a reusable command under this CLI tree.',
      aiReview: 'AI Review',
      aiReviewEnabled: 'Ask your active AI provider to explain risks and suggest a safer variant.',
      aiReviewDisabled: 'Select an active AI provider in Settings to enable command reviews.',
      aiDraft: 'AI Draft',
      aiDraftEnabled: 'Describe the command you want and review an AI-generated builder suggestion before applying it.',
      aiDraftDisabled: 'Select an active AI provider in Settings to generate command drafts.',
      execute: 'Execute',
      runInTerminal: 'Run command in terminal',
      errors: {
        aiPromptRequired: 'Describe the command you want before asking AI to generate it.',
        executeFailed: 'Could not execute this command in the terminal.'
      }
    },
    aiReview: {
      title: 'AI Review',
      description: 'Risk analysis and safer alternatives for your command.',
      reviewing: 'Reviewing command...',
      thinking: 'Thinking...',
      followUpPlaceholder: 'Ask a follow-up question...',
      rerun: 'Re-run Review',
      review: 'Review'
    },
    aiDraft: {
      title: 'AI Command Draft',
      description: 'Describe the command you want. Review the suggested command line and form values before applying them.',
      promptLabel: 'What should this command do?',
      promptPlaceholder: 'Example: Generate a safe dry-run deploy of the web service to staging with verbose logging.',
      suggestion: 'AI Suggestion',
      generating: 'Generating command draft...',
      summary: 'Summary',
      warnings: 'Warnings',
      generatedCommand: 'Generated Command',
      noCommandValues: '[No command values generated]',
      formValues: 'Form Values',
      footer: 'Apply To Preview replaces only the editable command line. Apply To Form fills the checkboxes, inputs, and arguments above. Neither action executes the command.',
      refreshDraft: 'Refresh Draft',
      generateDraft: 'Generate Draft',
      applyToPreview: 'Apply To Preview',
      applyToForm: 'Apply To Form'
    },
    referenceHelp: {
      title: '{{executable}} Help',
      savedMeta: 'Saved {{timestamp}}',
      overview: 'Overview',
      commonOptions: 'Common Options',
      arguments: 'Arguments',
      examples: 'Examples',
      platformNotes: 'Platform Notes',
      cautions: 'Cautions',
      required: 'Required',
      savedHelp: 'Saved Help',
      savedHelpDescription: 'Open the saved AI-generated help reference for this command.',
      openSavedHelp: 'Open saved help',
      openDocumentation: 'Open documentation',
      generateFromHelp: 'Generate Command Tree from --help',
      generatingFromHelp: 'Generating from --help...',
      generateHelpFromAI: 'Generate Help from AI',
      generatingHelpFromAI: 'Generating Help from AI...',
      generateHelpFromAIEnabled: 'Generate saved reference help with AI for commands that do not expose useful --help output',
      generateHelpFromAIDisabled: 'Select an active AI provider in Settings to generate saved help with AI',
      generateTreeFromSavedHelp: 'Generate Command Tree from Saved Help',
      generatingCommandTree: 'Generating Command Tree...',
      generateTreeFromSavedHelpTitle: 'Turn saved AI help options into a reusable command tree',
      refreshHelpFromAI: 'Refresh Help from AI',
      refreshingHelpFromAI: 'Refreshing Help from AI...',
      refreshHelpEnabled: 'Regenerate and resave this AI help reference',
      refreshHelpDisabled: 'Select an active AI provider in Settings to refresh saved help with AI',
      closeSavedHelp: 'Close saved help',
      aiProviderFallback: 'AI',
      insufficientStructuredHelp: 'Saved help does not contain enough structured options or arguments to build a command tree yet.',
      generatedTreeSuccess: 'Generated command tree from saved AI help for {{executable}}',
      savedAIHelpSuccess: 'Saved AI help locally for {{executable}}',
      notFoundForHelp: '{{executable}} was not found in your shell PATH, so TerminallySKILL could not inspect its help output',
      tryInstallHint: 'Try: {{hint}}',
      noStructuredHelp: 'Could not find structured --help output for this command. If it does not expose a normal help screen here, try Generate Help from AI instead.',
      noMachineHelp: 'No structured --help output was detected for this command. Some CLIs like ls do not expose machine-parseable help here. Try Generate Help from AI instead.',
      parseFailed: 'Failed to run --help for this command',
      detectedTitle: 'Detected from shell PATH',
      manualTitle: 'Manually added',
      detected: 'Detected',
      saved: 'Saved'
    },
    examples: {
      commandTreeRoot: 'Command Tree Root:'
    },
    optionInfo: {
      types: {
        boolean: 'Flag',
        string: 'Text',
        number: 'Number',
        enum: 'Choice',
        filePath: 'File path',
        directoryPath: 'Directory path',
        multiSelect: 'Multi-select',
        repeatable: 'Repeatable'
      },
      required: 'Required',
      defaultValue: 'Default:'
    },
    optionGroups: {
      options: 'Options'
    }
  },
  dashboard: {
    activeRuns: {
      stepProgress: 'Step {{current}} / {{total}}',
      awaitingApproval: 'Awaiting approval',
      jumpToTerminal: 'Jump to Terminal'
    },
    quickActions: {
      newTerminal: 'New Terminal',
      noRecentScripts: 'No recent scripts',
      openFolder: 'Open Folder'
    },
    sections: {
      recentRuns: 'Recent Runs',
      scripts: 'Scripts',
      recentCommands: 'Recent Commands'
    },
    actions: {
      viewAll: 'View all',
      rerun: 'Rerun {{name}}'
    },
    scripts: {
      step_one: '{{count}} step',
      step_other: '{{count}} steps'
    },
    empty: {
      title: 'Ready to go',
      description: 'Open a terminal, run a script, or select a command from the sidebar to get started.'
    }
  },
  layout: {
    terminal: {
      expand: 'Expand Terminal',
      expandDescription: 'Restore the docked terminal panel'
    },
    topbar: {
      sshShell: 'SSH Shell',
      sshShellDescription: 'Open a new interactive SSH shell for this workspace',
      vncViewer: 'VNC Viewer',
      vncViewerDescription: 'Open a remote desktop session via encrypted SSH tunnel',
      newTerminal: 'New Terminal',
      newTerminalDescription: 'Open a shell tab',
      helpGuide: 'Help Guide',
      helpGuideDescription: 'How to use TerminallySKILL',
      settings: 'Settings',
      settingsDescription: 'Theme, AI providers, and preferences',
      github: 'GitHub',
      githubDescription: 'View source and report issues',
      website: 'Website',
      websiteDescription: 'terminallyskill.com'
    },
    palette: {
      actions: {
        newTerminal: 'New Terminal',
        newTerminalDescription: 'Open a new terminal tab',
        openSshShell: 'Open SSH Shell',
        openSshShellDescription: 'Open a new interactive SSH shell for this workspace',
        settings: 'Settings',
        settingsDescription: 'Open app settings',
        info: 'How it works',
        infoDescription: 'Open the getting started guide',
        newProject: 'New Project',
        newProjectDescription: 'Create a new project'
      },
      types: {
        action: 'Action',
        command: 'Command',
        script: 'Script',
        snippet: 'Snippet',
        history: 'History'
      },
      searchPlaceholder: 'Search commands, scripts, snippets...',
      noResults: 'No results for "{{query}}"',
      historyRunAgain: 'Run again in terminal',
      scriptStep_one: '{{count}} step',
      scriptStep_other: '{{count}} steps',
      shortcuts: {
        navigate: 'navigate',
        select: 'select',
        close: 'close'
      }
    },
    sidebar: {
      tabs: {
        commands: 'Commands',
        scripts: 'Scripts',
        snippets: 'Snippets',
        files: 'Files',
        logs: 'Logs',
        search: 'Search'
      },
      files: {
        noProjectTitle: 'Open a project to browse files',
        noProjectDescription:
          'Files are shown per project so we can keep tabs, edits, and file history scoped to the right workspace.'
      },
      commands: {
        expandAll: 'Expand all command trees',
        collapseAll: 'Collapse all command trees',
        addManual: 'Add command manually',
        scanInstalled: 'Scan for installed commands',
        favorites: 'Favorites',
        loading: 'Loading commands...',
        noMatches: 'No commands match your search',
        noMatchesHint: 'Try a different keyword or clear the search',
        emptyTitle: 'No Command Trees Yet',
        emptyDescription:
          'Start from a blank slate and add only the tools that are actually installed on this computer.',
        pickPopular: 'Pick Popular Installed Commands',
        scanAll: 'Scan All Installed Commands',
        popularInstalled: 'Popular Installed Commands',
        scanResults: 'Scan Results',
        removeTitle: 'Remove Command',
        removeMessage: '"{{name}}" will be permanently removed. This cannot be undone.',
        remove: 'Remove',
        removeFavorite: 'Remove from favorites',
        removeSaved: 'Remove saved command'
      },
      starterPack: {
        title: 'Starter pack applied',
        dismiss: 'Dismiss',
        description:
          'This project was preloaded with repo-aware defaults so the first session is not blank.',
        commands: 'Commands',
        scripts: 'Scripts',
        snippets: 'Snippets',
        starterCommand_one: '{{count}} starter command',
        starterCommand_other: '{{count}} starter commands',
        starterScript_one: '{{count}} starter script',
        starterScript_other: '{{count}} starter scripts',
        starterSnippet_one: '{{count}} starter snippet',
        starterSnippet_other: '{{count}} starter snippets'
      },
      versionLoading: 'Version loading...'
    },
    settings: {
      title: 'Settings'
    },
    empty: {
      title: 'Get started',
      description: 'Create a project to set your workspace target and pin favourite commands',
      createProject: 'Create Project',
      howItWorks: 'How it works'
    },
    updates: {
      available: 'Update {{version}} is available',
      whatsNew: "What's New",
      releaseNotesHint: 'Expand to view highlights and the full change log.',
      dismissBanner: 'Dismiss update banner',
      downloadInstall: 'Download & Install Update',
      downloadOpen: 'Download & Open Update',
      installing: 'Installing Update',
      opening: 'Opening Update'
    }
  },
  projects: {
    selector: {
      none: 'No project',
      searchPlaceholder: 'Search projects...',
      empty: 'No projects yet. Create one to get started.',
      noMatches: 'No matching projects',
      terminalCount_one: '{{count}} terminal',
      terminalCount_other: '{{count}} terminals',
      terminalCountActive_one: '{{count}} terminal, process running',
      terminalCountActive_other: '{{count}} terminals, process running',
      openNewWindow: 'Open in new window',
      edit: 'Edit project',
      newProject: 'New Project'
    },
    dialog: {
      titleNew: 'New Project',
      titleEdit: 'Edit Project',
      projectName: 'Project Name',
      projectNamePlaceholder: 'My Awesome Project',
      group: 'Group',
      groupPlaceholder: 'e.g. Servers, Work, Personal...',
      willAppearAs: 'Will appear as {{name}}',
      workspaceTarget: 'Workspace Target',
      localWorkspace: 'Local workspace',
      sshWorkspace: 'SSH workspace',
      localWorkspaceDescription: 'Run in a local repo directory with file browsing.',
      sshWorkspaceDescription: 'Run app-launched commands over SSH using a saved remote target.',
      workingDirectory: 'Working Directory',
      workingDirectoryPlaceholder: '/path/to/your/project',
      workingDirectoryDescription: 'This is where local terminal sessions start, and where you can browse files.',
      connectionLabel: 'Connection Label',
      connectionLabelPlaceholder: 'Production deploy',
      connectionLabelDescription: 'Optional. Used in workspace summaries and SSH shell tabs.',
      host: 'Host',
      user: 'User',
      remoteWorkingDirectory: 'Remote Working Directory',
      optional: 'optional',
      sshPort: 'SSH Port',
      vncPort: 'VNC Port',
      identityFile: 'Identity File',
      identityTooltipGenerate: "Generate a key if you do not have one:",
      identityTooltipDefaults: 'Press Enter to accept defaults, optionally set a passphrase.',
      identityTooltipCopy: 'Copy your public key to the VPS:',
      identityTooltipPassword: 'Enter your VPS password once. After this, no password is needed.',
      identityFileDescription: 'Optional. Passed to SSH as -i for tests, wrapped commands, and interactive shells.',
      browseIdentityFile: 'Browse identity file',
      sshFileBrowsingLocalOnly: 'File browsing stays local-only for now. Commands launched from TerminallySKILL will be wrapped over SSH against this target.',
      testSSH: 'Test SSH Connection',
      testSSHDescription: 'Uses your local ssh client with a short timeout and checks that the remote cwd resolves.',
      resolvedTarget: 'Resolved Target',
      includeStarterPack: 'Include Starter Pack',
      includeStarterPackDescription: 'Scan the working directory and auto-add detected commands, scripts, and snippets. Uncheck for a blank workspace.',
      scanningRepo: 'Scanning repo...',
      noRepoSignals: 'No repo signals detected in this directory.',
      commandGroup_one: '{{count}} command group',
      commandGroup_other: '{{count}} command groups',
      script_one: '{{count}} script',
      script_other: '{{count}} scripts',
      snippet_one: '{{count}} snippet',
      snippet_other: '{{count}} snippets',
      color: 'Color',
      colorTaken: 'Already used by another project',
      dimmedColors: 'Dimmed colors are already used by other projects',
      projectLogs: 'Project Logs',
      logOptions: {
        inherit: {
          label: 'Use App Setting',
          description: 'Follow the global terminal log toggle'
        },
        enabled: {
          label: 'Always Save',
          description: 'Keep logs for this project even when app logging is off'
        },
        disabled: {
          label: 'Never Save',
          description: 'Skip terminal logs for this project'
        }
      },
      logFolderDescription: 'Logs are saved under project-named folders. Sessions without a project go into No Project.',
      logEffective: {
        enabled: 'This project always saves terminal logs.',
        disabled: 'This project never saves terminal logs.',
        inheritedOn: 'This project follows the app setting and currently saves terminal logs.',
        inheritedOff: 'This project follows the app setting and currently does not save terminal logs.'
      },
      openLogsFolder: 'Open Logs Folder',
      clearRecentCommands: 'Clear Recent Commands',
      recentCommand_one: '{{count}} recent command',
      recentCommand_other: '{{count}} recent commands',
      deleteProject: 'Delete Project',
      saveChanges: 'Save Changes',
      createProject: 'Create Project',
      deleteMessage: '"{{name}}" and all its settings will be permanently deleted. Scripts and snippets linked to this project will not be removed.',
      errors: {
        nameRequired: 'Project name is required',
        workingDirectoryRequired: 'Working directory is required',
        sshHostRequired: 'SSH host is required',
        sshPortInvalid: 'SSH port must be a positive whole number',
        vncPortInvalid: 'VNC port must be a number between 1 and 65535',
        duplicateDirectory: '"{{name}}" already uses this directory. Click Create again to add anyway.'
      }
    },
    env: {
      title: 'Environment Variables',
      active_one: '{{count}} active',
      active_other: '{{count}} active',
      importEnv: 'Import .env',
      importTitle: 'Import from .env file',
      enabledTitle: 'Enabled. Click to disable',
      disabledTitle: 'Disabled. Click to enable',
      keyPlaceholder: 'KEY',
      valuePlaceholder: 'value',
      removeVariable: 'Remove variable',
      addVariable: 'Add variable',
      description: 'Variables are injected into new terminal sessions for this project.',
      errors: {
        tooLarge: 'File is too large to import',
        noEntries: 'No valid KEY=VALUE entries found',
        readFailed: 'Failed to read file'
      }
    }
  },
  scripts: {
    actions: {
      addScript: 'Add Script',
      newScript: 'New Script',
      create: 'Create',
      cancel: 'Cancel',
      importTvflow: 'Import .tvflow script',
      createNewScript: 'Create new script',
      exportTvflow: 'Export as .tvflow',
      duplicate: 'Duplicate',
      removeFromProject: 'Remove from project',
      deletePermanently: 'Delete permanently',
      runWorkflow: 'Run Workflow'
    },
    placeholders: {
      scriptName: 'Script name...'
    },
    empty: {
      projectTitle: 'No scripts added to this project',
      projectDescription: 'Add existing scripts or create new ones',
      globalTitle: 'No scripts yet',
      globalDescription: 'Create one or add commands from the builder'
    },
    editor: {
      noSelectionTitle: 'No script selected',
      noSelectionDescription: 'Select a script from the sidebar or create a new one',
      detachToProject: 'Detach to Project',
      cloneToProject: 'Clone to Project',
      detachToProjectHelp: 'Create a project-local copy so changes in this project do not affect the shared global script.',
      cloneToProjectHelp: 'Create a project-local copy so changes here do not affect the script in the other project.',
      addDescriptionPlaceholder: 'Add a description...',
      clickToAddDescription: 'Click to add description...',
      stepTypes: {
        command: 'Command',
        approval: 'Approval',
        note: 'Note'
      },
      stepLabelPlaceholder: 'Step label (optional)',
      commandPlaceholder: 'Command (e.g. npm run build)',
      approvalPlaceholder: 'Approval message shown before the workflow runs',
      notePlaceholder: 'Reference notes for the operator',
      addStepType: 'Add {{type}}',
      addStep: 'Add Step',
      enabledSummary: '{{enabled}} of {{total}} steps enabled - {{executable}} executable',
      copyAll: 'Copy All',
      copyAllTitle: 'Copy all commands as a shell script',
      runScript: 'Run Script',
      runAllTitle: 'Run all enabled steps',
      runStep: 'Run Step',
      runFromHere: 'Run From Here',
      runWorkflow: 'Run Workflow',
      deleteStepTitle: 'Delete Step',
      deleteStepMessage: 'This step will be permanently removed from the script. This cannot be undone.',
      generatedStepLabel: 'Step {{index}}',
      approvalRequired: 'Approval required'
    },
    step: {
      addLabel: '+ label',
      changeTypeTitle: 'Click to change step type',
      manualConfirm: 'manual confirm',
      autoCheckpoint: 'auto checkpoint',
      continueOnError: 'continue on error',
      running: 'running',
      clickToEdit: 'Click to edit',
      addCommand: 'Click to add a command...',
      switchTypeHint: 'Click the type badge above to switch to Approval or Note',
      addApproval: 'Add an approval message...',
      addNote: 'Add a note...',
      alreadyRunning: 'A workflow is already running',
      runStepTitle: 'Run this step in the current terminal',
      runFromHereTitle: 'Run from this step onwards in the current terminal',
      moveUp: 'Move up',
      moveDown: 'Move down',
      willContinueOnError: 'Will continue on error',
      willStopOnError: 'Will stop on error',
      disableStep: 'Disable step',
      enableStep: 'Enable step',
      removeStep: 'Remove step',
      delay: 'Delay',
      retries: 'Retries',
      pauseForConfirmation: 'Pause for manual confirmation'
    },
    meta: {
      step_one: '{{count}} step',
      step_other: '{{count}} steps',
      input_one: '{{count}} input',
      input_other: '{{count}} inputs',
      global: 'Global',
      thisProject: 'This Project',
      otherProject: 'Other Project',
      running_one: 'Running in {{count}} terminal. Start another run',
      running_other: 'Running in {{count}} terminals. Start another run',
      runCommand_one: 'Run {{count}} command',
      runCommand_other: 'Run {{count}} commands'
    },
    delete: {
      title: 'Delete Script',
      message: '"{{name}}" will be permanently deleted. This cannot be undone.'
    },
    selector: {
      title: 'Add Scripts',
      searchPlaceholder: 'Search scripts or type a name to create...',
      emptyTitle: 'No scripts exist yet',
      emptyDescription: 'Type a name above to create your first script',
      noMatches: 'No scripts match your search',
      step_one: '{{count}} step',
      step_other: '{{count}} steps',
      global: 'Global',
      thisProject: 'This Project',
      otherProject: 'Other Project',
      cloneToProject: 'Clone to Project',
      cloneToProjectTitle: 'Clone this global script into the current project so you can customize it safely',
      useGlobal: 'Use Global',
      useGlobalTitle: 'Use the shared global script as-is across projects',
      cloneNotice: 'This will be cloned into the current project so your changes stay local.',
      createNew: 'Create new script "{{name}}"',
      cancel: 'Cancel',
      save: 'Save'
    },
    addToScript: {
      tooltipLabel: 'Script',
      tooltipDescription: 'Add command to an existing or new script',
      title: 'Add to Script',
      emptyProject: 'No scripts in this project',
      emptyGlobal: 'No scripts yet',
      step_one: '{{count}} step',
      step_other: '{{count}} steps',
      scriptNamePlaceholder: 'Script name...',
      createAndAdd: 'Create & Add',
      cancel: 'Cancel',
      newScript: 'New Script'
    },
    run: {
      title: 'Run {{name}}'
    },
    workflowRun: {
      readyCommand_one: '{{count}} command ready to run',
      readyCommand_other: '{{count}} commands ready to run',
      inputs: 'Inputs',
      inputDescription: 'Values replace matching placeholders like {{example}}.',
      required: 'Required',
      setTrue: 'Set to true',
      noSelection: 'No selection',
      unknownPlaceholders: 'Unknown placeholders detected: {{placeholders}}.',
      invalidInputValues: 'Fix these input values before running: {{issues}}',
      preparation: 'Preparation',
      preparationDescription: 'Notes are included for context. Approval steps can either pause the run for confirmation or act as informational checkpoints.',
      requiresConfirmation: 'This step will require confirmation during the run.',
      autoCheckpoint: 'This checkpoint will be shown for context and then continue automatically.',
      requiredInputsMissing: 'Required inputs missing: {{inputs}}',
      invalidInputs: 'Invalid input values: {{issues}}',
      unknownMustBeFixed: 'Unknown placeholders must be fixed before running: {{placeholders}}',
      noCommandSteps: 'No command steps are enabled in this selection.',
      prepStep_one: '{{count}} prep step',
      prepStep_other: '{{count}} prep steps',
      command_one: '{{count}} command',
      command_other: '{{count}} commands'
    },
    inputs: {
      title: 'Workflow Inputs',
      help:
        'Define variables that get filled in each time you run this script. Reference them in command steps using {{open}}placeholder_key{{close}} syntax.\n\nExample: A deploy script could have inputs for environment (staging/prod), version number, and whether to run migrations - making the same script reusable across contexts.\n\nTypes: Text, Number, Boolean (checkbox), or Choice (dropdown). Mark inputs as Required to prevent running without a value.',
      aiDraft: 'AI Draft',
      aiDraftTitle: 'AI Input Draft',
      aiDraftDescription: 'Describe your workflow and AI will suggest inputs to make it reusable.',
      aiDraftTooltip: 'Get AI suggestions for workflow inputs based on your steps',
      addInput: 'Add Input',
      labelPlaceholder: 'Label',
      labelTitle: 'Display name shown to the user when running this workflow',
      keyPlaceholder: 'placeholder_key',
      keyTitle: 'Use {{open}}this_key{{close}} in command steps to insert the value at run time',
      typeTitle: 'Data type - Text (free text), Number (numeric with optional min/max), Boolean (true/false checkbox), Choice (dropdown list)',
      types: {
        string: 'Text',
        number: 'Number',
        boolean: 'Boolean',
        choice: 'Choice'
      },
      requiredShort: 'Req',
      requiredTitle: 'When checked, this input must be filled in before the workflow can run',
      removeTitle: 'Remove this input from the workflow',
      descriptionPlaceholder: 'Description',
      descriptionTitle: 'Help text shown below the input field when running the workflow',
      defaultPlaceholder: 'Default',
      defaultTextTitle: 'Pre-filled value - the user can change it before running',
      placeholderText: 'Placeholder text',
      placeholderTitle: 'Greyed-out hint shown inside the input when it is empty',
      defaultNumberTitle: 'Pre-filled numeric value',
      minPlaceholder: 'Min',
      minTitle: 'Minimum allowed value (optional)',
      maxPlaceholder: 'Max',
      maxTitle: 'Maximum allowed value (optional)',
      stepPlaceholder: 'Step',
      stepTitle: 'Increment step for the number input (e.g. 0.1 for decimals)',
      booleanDefaultTitle: 'Whether this boolean defaults to checked (true) or unchecked (false)',
      defaultToTrue: 'Default to true',
      optionsPlaceholder: 'Options (one per line, label=value optional)',
      optionsTitle: 'Each line becomes a dropdown option. Use label=value to show a friendly label while passing a different value',
      defaultOptionPlaceholder: 'Default option',
      defaultOptionTitle: 'Which option is pre-selected (must match a value from the list above)',
      allowCustomTitle: 'Allow the user to type a custom value not in the dropdown list',
      allowCustom: 'Allow custom values',
      removeDialogTitle: 'Remove Input',
      unnamedInput: 'this input',
      removeDialogMessage: '"{{name}}" will be removed. Any {{open}}{{key}}{{close}} placeholders in steps will no longer be substituted.',
      remove: 'Remove',
      describePromptRequired: 'Describe what this workflow does so AI can suggest inputs.',
      providerError: 'Could not reach AI provider. Check your AI settings.',
      noStepsDefined: 'No steps defined yet.',
      none: 'None.',
      aiCommandName: 'Workflow Input Draft',
      aiCommandDescription:
        "Based on the user's description and the workflow steps above, suggest workflow inputs that would make this script reusable. For each input suggest: a label, placeholder key (snake_case), type (string/number/boolean/choice), whether it should be required, a sensible default value, and a brief description. Also point out any hardcoded values in the steps that could be parameterised with {{open}}placeholder{{close}} syntax. Format as a clear list. Be concise and practical.",
      userDescription: 'User description',
      workflowSteps: 'Workflow Steps',
      existingInputs: 'Existing Inputs',
      stepLabel: 'Step {{index}}',
      requiredMeta: 'required',
      promptLabel: 'What does this workflow do?',
      promptPlaceholder: 'Example: Deploy a service to a chosen environment with optional database migration and rollback support.',
      generating: 'Generating...',
      generateSuggestions: 'Generate Suggestions',
      suggestions: 'AI Suggestions'
    },
    runner: {
      status: {
        waitingForShell: 'Waiting for shell',
        waitingForDelay: 'Waiting for delay',
        awaitingApproval: 'Awaiting approval',
        runningStep: 'Running step',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
        running: 'Running'
      },
      actions: {
        continue: 'Continue',
        stop: 'Stop',
        close: 'Close'
      },
      errors: {
        terminalClosed: 'Terminal session closed before the workflow completed.',
        cancelled: 'Workflow cancelled.',
        stepFailed: '{{label}} failed with exit code {{code}}.',
        stepFailedRetrying: '{{label}} failed with exit code {{code}}. Retrying.',
        stepFailedContinuing: '{{label}} failed with exit code {{code}}. Continuing because continue on error is enabled.'
      },
      attempt: 'attempt {{current}} / {{total}}',
      exit: 'exit {{code}}'
    }
  },
  snippets: {
    actions: {
      newSnippet: 'New Snippet',
      create: 'Create',
      cancel: 'Cancel',
      quickRun: 'Quick run',
      fillVariablesRun: 'Fill variables & run',
      duplicate: 'Duplicate',
      removeFromProject: 'Remove from project',
      deletePermanently: 'Delete permanently'
    },
    placeholders: {
      name: 'Snippet name...',
      template: 'e.g. git checkout {branch}'
    },
    help: {
      variables:
        'Use variable placeholders for required variables and optional ones with defaults.',
      examples: 'Examples:'
    },
    empty: {
      title: 'No snippets yet',
      description: 'Create reusable command templates with variables.'
    },
    editor: {
      noSelectionTitle: 'No snippet selected',
      noSelectionDescription: 'Select a snippet from the sidebar or create a new one',
      addDescriptionPlaceholder: 'Add a description...',
      clickToAddDescription: 'Click to add description...',
      template: 'Template',
      templatePlaceholder: 'e.g. ssh {{open}}user{{close}}@{{open}}host{{close}} -p {{open}}port:22{{close}}',
      saveShortcut: 'Save Command+S',
      templateHelp: 'Use {{open}}name{{close}} for required variables, {{open}}name:default{{close}} for optional variables with defaults',
      variables: 'Variables',
      preview: 'Preview',
      emptyTemplatePreview: 'Enter a template above...',
      noVariablesStatus: 'No variables - runs as-is',
      allVariablesFilled: 'All variables filled',
      filledStatus: '{{filled}} of {{total}} filled',
      copyResolvedCommand: 'Copy resolved command',
      copied: 'Copied!',
      copy: 'Copy',
      runInTerminal: 'Run in terminal',
      run: 'Run',
      defaultValue: 'Default value',
      enterValuePlaceholder: 'Enter {{label}}...'
    },
    meta: {
      variable_one: '{{count}} var',
      variable_other: '{{count}} vars'
    },
    delete: {
      title: 'Delete Snippet',
      message: '"{{name}}" will be permanently deleted. This cannot be undone.'
    }
  },
  files: {
    browser: {
      selectProject: 'Select a project to browse files',
      localOnlyTitle: 'File browser is local-only for now',
      localOnlyDescription:
        'This workspace targets <target>{{target}}</target>. Run commands over SSH from the command builder, scripts, or snippets instead.',
      goUp: 'Go up',
      projectRoot: 'Project root',
      refresh: 'Refresh',
      createFile: 'Create file in this folder',
      toggleHidden: 'Toggle hidden files',
      openExternal: 'Open in Finder/Explorer',
      createFileAction: 'Create file',
      cancel: 'Cancel',
      createEmptyFile: 'Create an empty file in <path>{{path}}</path>.',
      loading: 'Loading...',
      emptyDirectory: 'Empty directory',
      errors: {
        enterFileName: 'Enter a file name, including its extension if you want one.',
        fileNameOnly: 'Use a file name only, not a nested path.',
        exists: 'A file with that name already exists here.',
        failed: 'Could not create that file just now.'
      }
    },
    search: {
      noLocalProjectTitle: 'No local project open',
      noLocalProjectDescription: 'Find in Files works with local workspace projects.',
      placeholder: 'Search in project...',
      caseSensitive: 'Case sensitive',
      regex: 'Use regex',
      filterOptions: 'Filter options',
      globPlaceholder: 'File filter, e.g. *.ts, src/**/*.tsx',
      search: 'Search',
      searching: 'Searching...',
      noResults: 'No results',
      resultSummary: '{{matches}} matches in {{files}} files',
      resultSummary_one: '{{matches}} match in {{files}} file',
      resultSummary_other: '{{matches}} matches in {{files}} files',
      clearResults: 'Clear results',
      noMatchesFor: 'No matches for {{query}}',
      inFilesMatching: 'in files matching {{glob}}',
      hint: 'Press Enter or click Search to find across all files in this project'
    },
    viewer: {
      closeTab: 'Close tab',
      closeTabUnsaved: 'Close tab (unsaved changes)',
      copied: 'Copied!',
      copyFilePath: 'Copy file path',
      saved: 'Saved',
      saveFailed: 'Save failed',
      line_one: '{{count}} line',
      line_other: '{{count}} lines',
      previewFile: 'Preview file',
      editFile: 'Edit file',
      runScript: 'Run Script',
      runRuntime: 'Run {{runtime}}',
      saveAndRun: 'Save & Run',
      saveFile: 'Save file (Command+S)',
      saving: 'Saving...',
      save: 'Save',
      reveal: 'Reveal in Finder',
      notExecutable: 'This file is not executable. It needs chmod +x before it can be run directly.',
      fixing: 'Fixing...',
      chmod: 'Run chmod +x',
      externalChanged: 'This file changed on disk while it was open. Reload to see the newer version, or keep your current edits for now.',
      keepEdits: 'Keep My Edits',
      reload: 'Reload',
      tooLargeTitle: 'File too large to open',
      tooLargeDescription: '{{size}}. Files over 50 MB are not loaded in the viewer.',
      truncated: 'File is larger than 5 MB. Showing first 5 MB only. Editing is not available for large files.',
      editModeHint: 'Opens in edit mode by default. Command+S saves. Esc previews. Tab indents.',
      unsavedTitle: 'Unsaved changes',
      unsavedMessage: '{{name}} has unsaved changes. Save before closing the tab?',
      fallbackFileName: 'This file',
      discard: 'Discard',
      saveAndClose: 'Save & Close',
      errors: {
        reloadFailed: 'Could not reload {{name}}: {{error}}',
        saveBeforeRun: 'Save the file first before running it.'
      }
    }
  },
  logs: {
    list: {
      searchPlaceholder: 'Search logs and runs...',
      workflowRuns: 'Workflow Runs',
      workflowRunsDescription: 'Show or hide workflow script runs',
      terminalLogs: 'Terminal Logs',
      terminalLogsDescription: 'Show or hide saved terminal session logs',
      runs: 'Runs',
      logs: 'Logs',
      openLogsFolder: 'Open Logs Folder',
      openLogsFolderDescription: 'Open the resolved logs directory for this project',
      loading: 'Loading history...',
      emptyMatching: 'No matching runs or logs',
      emptyFilters: 'All filters are off',
      emptyHistory: 'No saved history yet',
      tryDifferentSearch: 'Try a different search term.',
      enableFilter: 'Enable at least one filter above to see results.',
      historyHint: 'Workflow runs are captured live, and terminal sessions are auto-saved when closed.',
      refresh: 'Refresh',
      readError: '[Could not read log file]'
    },
    labels: {
      duration: 'Duration',
      session: 'Session',
      steps: 'Steps',
      shell: 'Shell',
      started: 'Started',
      unknown: 'Unknown',
      noProject: 'No project',
      inputs: 'Inputs',
      unset: '<unset>',
      step: 'step',
      attempts: 'attempts',
      retries: 'retries',
      delay: 'delay',
      exit: 'exit',
      exitCode: 'Exit code',
      lines_one: '{{count}} line',
      lines_other: '{{count}} lines',
      stepCount_one: '{{count}} step',
      stepCount_other: '{{count}} steps',
      stepsComplete: '{{completed}}/{{total}} steps'
    },
    status: {
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
      awaitingApproval: 'awaiting approval',
      running: 'running',
      pending: 'pending',
      closed: 'closed',
      ok: 'ok',
      inProgress: 'In progress',
      notStarted: 'Not started'
    },
    actions: {
      rerun: 'Rerun',
      openLog: 'Open Log',
      comparePrevious: 'Compare Previous',
      aiReviewSelection: 'AI Review Selection',
      copy: 'Copy',
      confirm: 'Confirm',
      cancel: 'Cancel',
      deleteLog: 'Delete log'
    },
    step: {
      duration: 'duration {{duration}}',
      attempts: 'attempts {{count}}',
      exit: 'exit {{code}}',
      retries: 'retries {{count}}',
      delay: 'delay {{ms}}ms',
      manualConfirmation: 'manual confirmation',
      autoCheckpoint: 'auto checkpoint'
    },
    compare: {
      title: 'Run Comparison',
      versus: '{{baseline}} vs {{candidate}}',
      changedSteps: 'Changed Steps',
      regressionsFixes: 'Regressions / Fixes',
      durationDelta: 'Duration Delta',
      addedRemoved: 'Added / Removed',
      previous: 'Previous',
      current: 'Current',
      shown: '{{visible}} of {{total}} steps shown',
      showingChangedOnly: 'Showing changed only',
      showChangedOnly: 'Show changed only',
      stepLabel: 'Step {{index}}',
      noChangedSteps: 'No changed steps between these runs.',
      noStep: 'No step in this run.',
      unchanged: 'unchanged',
      added: 'added',
      removed: 'removed',
      typeChanged: 'type changed',
      statusChanged: 'status changed',
      contentChanged: 'content changed',
      notAvailable: 'n/a',
      noChange: 'no change'
    },
    detail: {
      searchPlaceholder: 'Highlight text in this log... (Enter / Shift+Enter to navigate)',
      noMatches: 'No matches found in this log.',
      deleteConfirm: 'Delete this log?',
      aiTitle: 'AI Review - Log Selection',
      reviewing: 'Reviewing selected text...',
      thinking: 'Thinking...',
      followUpPlaceholder: 'Ask a follow-up question...',
      selectedLogText: 'Selected log text'
    },
    diagnostics: {
      title: 'Suspected Issues',
      likelyCauses: 'Likely causes',
      nextChecks: 'Next checks'
    }
  },
  terminal: {
    panel: {
      newTerminal: 'New Terminal',
      newTerminalDescription: 'Open a new shell tab for your project workspace',
      sshShell: 'SSH Shell',
      sshShellDescription: 'Open a new interactive SSH shell for this workspace',
      vncViewer: 'VNC Viewer',
      vncViewerDescription: 'Open a remote desktop session via encrypted SSH tunnel',
      closeSplit: 'Close Split',
      splitVertical: 'Split Vertical',
      splitVerticalDescription: 'Open a second terminal side by side',
      splitHorizontal: 'Split Horizontal',
      splitHorizontalDescription: 'Stack terminals top and bottom',
      snapshotsDescription: 'Capture terminal output to compare later',
      hideTerminal: 'Hide Terminal',
      hideTerminalDescription: 'Collapse the terminal panel',
      noSessions: 'No terminal sessions. Click + or execute a command.',
      runBadge: 'Run',
      latestOutput: 'Latest output'
    },
    vncSetup: {
      title: 'VNC Server Setup',
      checkServer: 'First, check if a VNC server is running on your VPS via the SSH tab:',
      installTiger: 'If nothing is returned, install TigerVNC:',
      installDesktop: 'Install XFCE4 (lightweight, works great over VNC):',
      configureStartup: 'Configure VNC to launch the desktop:',
      startSession: 'Start a session:',
      portHint: ':1 = port 5901, :0 = port 5900'
    },
    pathFix: {
      commandNotFound: 'Command Not Found',
      commandNotFoundDescription:
        'Your shell could not find "{{command}}" in any directory listed in your PATH environment variable. This usually means it is not installed, or its install location is not in your PATH.',
      notFoundInPath: '<command>{{command}}</command> not found in PATH',
      added: 'Added to PATH - open a new tab to apply',
      couldNotLocate: 'Could not locate {{command}} on this system',
      finding: 'Finding...',
      fixPath: 'Fix PATH'
    },
    usage: {
      label: 'Usage:',
      searchWeb: 'Search Web',
      askChatGpt: 'Ask ChatGPT'
    },
    aiReview: {
      titleLastCommand: 'AI Review - Last Command',
      titleSelection: 'AI Review - Selection',
      titleSession: 'AI Review - Session',
      noLastCommand: 'Run a command first so there is a completed command block to review.',
      noTerminalOutput: 'Run a command first so there is terminal output to review.',
      selectTextFirst: 'Select some text in the terminal first.',
      selectedText: 'Selected text',
      selectedTerminalTextTitle: 'Selected terminal text',
      reviewing: 'Reviewing terminal output...',
      thinking: 'Thinking...',
      followUpPlaceholder: 'Ask a follow-up question...',
      close: 'Close',
      reviewSelection: 'AI Review Selection',
      copy: 'Copy'
    },
    secureInput: {
      title: 'Secure Input Active',
      fallbackPrompt: 'Sensitive prompt detected',
      prompts: {
        sudoPassword: 'Sudo password prompt',
        password: 'Password prompt',
        passphrase: 'Passphrase prompt',
        pin: 'PIN prompt',
        verificationCode: 'Verification code prompt',
        token: 'Token prompt',
        apiKey: 'API key prompt'
      },
      description: 'Keystrokes are sent directly to the shell and are not previewed or queued.'
    },
    safePaste: {
      title: 'Confirm Paste',
      editorDraft: 'Editor draft',
      queuedForLater: 'Queued for later',
      sendToShell: 'Send to shell',
      flagged: 'This paste was flagged because it includes {{reasons}}.',
      bracketed: 'This shell has bracketed paste enabled, so the confirmed paste will be wrapped safely.',
      plain: 'This shell is not advertising bracketed paste, so the confirmed content will be sent as plain input.',
      lines_one: '{{count}} line will be pasted.',
      lines_other: '{{count}} lines will be pasted.',
      reasons: {
        multiLine_one: 'multi-line paste ({{count}} line)',
        multiLine_other: 'multi-line paste ({{count}} lines)',
        largePayload: 'large pasted payload',
        controlCharacters: 'control characters detected',
        dangerousCommand: 'potentially dangerous shell command'
      },
      review: 'Review the content before sending it to the shell.',
      cancel: 'Cancel',
      pasteAnyway: 'Paste Anyway',
      pasteAndDisable: "Paste Anyway and Don't Show Again"
    },
    editorPrompt: {
      title: 'Editor Prompt',
      helpWithHistory:
        'Enter runs. Tab accepts the selected suggestion. Shift+Tab or Alt+Up/Down cycles suggestions. Up/down cycles command history. Ctrl+N / Ctrl+P also cycle suggestions.',
      helpNoHistory:
        'Enter runs. Tab accepts the selected suggestion. Shift+Tab or Alt+Up/Down cycles suggestions. History appears after your first run.',
      helpLabel: 'Editor prompt help',
      placeholder: 'Type a command and press Enter',
      run: 'Run',
      suggestion: 'Suggestion:',
      emptySuggestions: 'Start typing to generate suggestions.',
      tabAccepts: 'Tab accepts the selected suggestion.',
      sources: {
        history: 'History',
        command: 'Command',
        directory: 'Directory'
      },
      modeOnDescription: 'Editor mode is ON - type commands in a dedicated input bar with suggestions and history. Toggle to switch back to classic shell input.',
      modeOffDescription: 'Editor mode is OFF - you are typing directly into the live shell. Toggle to use an editor-style command bar with suggestions.',
      off: 'Off',
      on: 'On'
    },
    toolbar: {
      reviewSession: 'Review Session',
      refreshSession: 'Refresh Session',
      reviewSessionEnabled: 'Ask your active AI provider to review the full terminal session transcript.',
      reviewSessionDisabled: 'Select an active AI provider in Settings to review terminal output.',
      prompt: 'Prompt:',
      waitingForShell: 'Waiting for shell...',
      running: 'Running:',
      connected: 'Connected:',
      remote: 'remote',
      last: 'Last:',
      promptCount_one: '{{count}} prompt',
      promptCount_other: '{{count}} prompts',
      bracketedPaste: 'Bracketed Paste',
      plainPaste: 'Plain Paste',
      bracketedPasteDescription: 'Shell supports bracketed paste - pasted text is wrapped in escape sequences so it is not executed line-by-line. This is safer for multi-line pastes.',
      plainPasteDescription: 'Shell is using plain paste - pasted text is sent as if typed directly, which may execute commands immediately on newlines.',
      paste: 'Paste:',
      bracketed: 'bracketed',
      plain: 'plain'
    },
    busy: {
      title: 'Shell busy - commands will run when ready',
      clearQueue: 'Clear queue',
      running: 'Running'
    },
    search: {
      placeholder: 'Find in terminal...',
      caseSensitive: 'Case sensitive',
      regex: 'Regular expression',
      wholeWord: 'Whole word',
      previous: 'Previous match (Shift+Enter)',
      next: 'Next match (Enter)',
      close: 'Close (Esc)'
    },
    mismatch: {
      title: 'Different project terminal',
      description: 'The active terminal belongs to {{terminalProjectName}}, but you are working in {{activeProjectName}}. Running here may use the wrong working directory.',
      openNewTerminal: 'Open new terminal for {{projectName}}',
      runAnyway: 'Run in {{projectName}} terminal anyway'
    },
    vnc: {
      connecting: 'Connecting via SSH tunnel...',
      connectionError: 'Connection error',
      disconnected: 'Disconnected',
      connectionLost: 'Connection lost. Check that a VNC server is running on the remote machine (port {{port}}).',
      reconnect: 'Reconnect',
      passwordRequired: 'VNC Password Required',
      passwordDescription: 'The VNC server on the remote machine requires its own password, separate from SSH.',
      passwordPlaceholder: 'VNC password',
      rememberPassword: 'Remember password',
      keychain: 'saved to OS keychain',
      connect: 'Connect',
      pasteClipboard: 'Paste from clipboard (Ctrl+V)',
      exitFullscreen: 'Exit fullscreen (Esc)',
      enterFullscreen: 'Enter fullscreen'
    },
    promote: {
      title: 'Promote From Terminal',
      description: 'Turn the last command into a reusable workflow artifact without retyping it.',
      lastCommand: 'Last Command',
      targets: {
        script: {
          label: 'Workflow Script',
          description: 'Create a script with this command as its first runnable step.'
        },
        snippet: {
          label: 'Snippet',
          description: 'Save the command as a reusable template you can run later.'
        },
        command: {
          label: 'Command',
          description: 'Open or create a command-builder entry for the root executable.'
        }
      },
      helpers: {
        existingCommand: 'This executable is already known. Promote will open the existing command builder and enable it for this project if needed.',
        newCommand: 'This creates a placeholder command entry. You can enrich it from --help later for a richer builder.',
        artifact: 'You can rename this now, then refine the script or snippet immediately after it opens.'
      },
      name: 'Name',
      namePlaceholder: 'Choose a name...',
      openCommand: 'Open Command',
      createCommand: 'Create Command',
      createSnippet: 'Create Snippet',
      createScript: 'Create Script',
      errors: {
        noCommand: 'Run a command first so there is something to promote.',
        noExecutable: 'Could not determine the executable for this command.'
      }
    },
    snapshots: {
      label: 'Snapshot {{time}}',
      title: 'Snapshots',
      empty: 'No snapshots yet',
      compare: 'Compare',
      compareDescription: 'Select two snapshots to see differences',
      clearAll: 'Clear All',
      clearAllDescription: 'Remove all saved snapshots',
      selectToCompare: 'Select 2 snapshots to compare ({{count}}/2)',
      emptyHint: 'Click the camera icon in the tab bar or press Command+Shift+S to capture terminal output',
      renameTitle: 'Double-click to rename',
      copy: 'Copy to clipboard',
      delete: 'Delete snapshot',
      line_one: '{{count}} line',
      line_other: '{{count}} lines'
    },
    diff: {
      title: 'Output Diff',
      unchanged: '{{count}} unchanged',
      identical: 'Outputs are identical'
    },
    close: {
      confirm: 'Close this terminal anyway?\n\n{{reasons}}',
      workflowRunning: 'Workflow "{{name}}" is still running.',
      shellExecuting: 'This terminal is still executing a command.',
      unknownScript: 'Unknown Script'
    }
  },
  onboarding: {
    title: 'How to use TerminallySKILL',
    subtitle: 'Visual command builder, terminal workspace, workflows, logs, and AI tools',
    searchPlaceholder: 'Search setup, shortcuts, logs, AI, SSH, VNC, remote desktop...',
    matchingItem_one: '{{count}} matching item',
    matchingItem_other: '{{count}} matching items',
    guideSection_one: '{{count}} guide section',
    guideSection_other: '{{count}} guide sections',
    clearSearch: 'Clear search',
    startHere: 'Start Here',
    startHereDescription: 'Create a project, open a terminal, and decide whether you want Classic or Editor Prompt mode.',
    goodToKnow: 'Good To Know',
    goodToKnowDescription: 'Logs, workflows, SSH targets, and AI actions all live inside the same project context.',
    noMatches: 'No guide matches',
    noMatchesHint: 'Try a broader term like terminal, logs, AI, SSH, or shortcut.',
    match_one: '{{count}} match',
    match_other: '{{count}} matches',
    footer: 'TerminallySKILL - visual command builder & terminal tools',
    gotIt: 'Got it',
    sections: {
      projects: {
        title: 'Projects',
        steps: {
          create: {
            label: 'Create a project',
            desc: 'Click the project selector in the title bar and choose "New project". Point it at a working directory - this becomes the root for your terminal sessions and file browser.'
          },
          switch: {
            label: 'Switch projects',
            desc: 'Click the project name in the title bar at any time to switch context, or press Command+P (Ctrl+P). Each project remembers its own favourite commands, scripts, and terminal sessions.'
          },
          groups: {
            label: 'Project groups',
            desc: 'Organise projects into groups using the Group field when creating or editing a project. Groups appear as collapsible sections in the project selector - useful for separating servers, work, and personal projects.'
          },
          colours: {
            label: 'Project colours',
            desc: "Each project gets a unique colour dot shown on terminal tabs and the sidebar, so you always know which project context you're in."
          },
          workspaceTargets: {
            label: 'Local & SSH workspaces',
            desc: 'Projects can point at local folders or SSH remote hosts. Configure host, user, port, and identity file for SSH targets. The title bar shows the active workspace type.'
          },
          sshKeys: {
            label: 'SSH key setup',
            desc: "Generate a key with ssh-keygen -t ed25519, then copy it to the server with ssh-copy-id user@host. Enter the key path in the project Identity File field - you'll never need a password again."
          },
          envVars: {
            label: 'Environment variables',
            desc: 'In project settings, add KEY=VALUE pairs or import a .env file. Variables are injected into every new terminal session for that project. Toggle individual vars on or off without deleting them.'
          },
          starterPacks: {
            label: 'Starter packs',
            desc: 'When you create a project, TerminallySKILL detects repo signals such as package.json, Dockerfile, and Makefile, then auto-enables relevant command categories.'
          }
        }
      },
      commands: {
        title: 'Commands',
        steps: {
          browse: {
            label: 'Browse commands',
            desc: 'The Commands tab lists every CLI tool TerminallySKILL knows about. Use the search box to filter instantly. Tools are auto-discovered from your system PATH.'
          },
          builder: {
            label: 'Visual builder',
            desc: 'Click any command to open the form-based builder. Fill in flags and arguments with controls instead of memorising syntax, then copy or run the result.'
          },
          aiReview: {
            label: 'AI Review',
            desc: 'Use AI Review to safety-check a built command before running it. The review includes a conversational follow-up chat so you can ask questions about the results.'
          },
          aiDraft: {
            label: 'AI Draft',
            desc: 'Describe what you want in natural language and AI Draft proposes a complete command with flags and arguments populated in the builder.'
          },
          preview: {
            label: 'Editable preview',
            desc: 'The command preview stays live while you build. You can also tweak the final command text directly before copying or running it.'
          },
          custom: {
            label: 'Add custom commands',
            desc: 'Click + in the Commands tab to add any executable. TerminallySKILL parses its --help output and generates a visual builder automatically.'
          },
          favourites: {
            label: 'Pin favourites',
            desc: 'Star a command to pin it to the top of the list for the active project. Recent commands also appear in a dedicated section.'
          }
        }
      },
      scripts: {
        title: 'Scripts',
        steps: {
          create: {
            label: 'Create a workflow script',
            desc: 'Open the Scripts tab in the sidebar and click +. Give it a name and description, then add steps such as commands, notes, and approval checkpoints.'
          },
          inputs: {
            label: 'Add inputs & approvals',
            desc: 'Workflow inputs let you reuse the same script with different values. Approval steps can pause a run or act as a visible checkpoint.'
          },
          run: {
            label: 'Run a script',
            desc: 'Click the play button next to any script to execute it. TerminallySKILL opens a terminal and runs all steps in order, with retry logic and continue-on-error per step.'
          },
          share: {
            label: 'Export & import',
            desc: 'Click the share icon on any script to export it as a .tvflow file. Others can import it into their own projects from the Scripts tab.'
          }
        }
      },
      snippets: {
        title: 'Snippets',
        steps: {
          create: {
            label: 'Create a snippet',
            desc: 'Open the Snippets tab and click +. Write a command template with {{placeholderSyntax}} for dynamic values, for example docker run -p {{portPlaceholder}}:80 {{imagePlaceholder}}.'
          },
          fill: {
            label: 'Fill & run',
            desc: 'Click a snippet to open it. Fill in the placeholder fields, then click Run to execute the completed command in a terminal.'
          },
          copy: {
            label: 'Copy resolved command',
            desc: 'Once placeholders are filled, use the copy button to grab the fully resolved command string for use elsewhere.'
          }
        }
      },
      terminal: {
        title: 'Terminal',
        steps: {
          open: {
            label: 'Open a terminal',
            desc: "Click the terminal icon in the title bar, or press Command+/ (Ctrl+/). Each tab runs a full shell in your project's working directory with env vars injected."
          },
          editorPrompt: {
            label: 'Editor Prompt mode',
            desc: 'In Settings, switch to Editor Prompt mode. When the shell is idle you get a command bar with ghost suggestions, history cycling, and safer paste handling.'
          },
          aiReview: {
            label: 'AI review tools',
            desc: 'Review the full session or just the last command block with AI. Ask follow-up questions in a conversational chat. Right-click selected text to review just that portion.'
          },
          splits: {
            label: 'Split panes',
            desc: 'Press Command+D to split vertically side by side, or Command+Shift+D to split horizontally top and bottom. Press Command+] and Command+[ to switch focus between panes.'
          },
          queue: {
            label: 'Command queue',
            desc: 'If you type while a command is running, your input is buffered and shown in an overlay. It runs automatically once the shell is free.'
          },
          pathFix: {
            label: 'PATH fix',
            desc: "If a command isn't found, a banner appears with a Fix PATH button that locates the binary and updates your shell config automatically."
          },
          promote: {
            label: 'Promote commands',
            desc: 'After running a command, promote it into a saved command, snippet, or workflow step directly from the terminal toolbar.'
          },
          sshShell: {
            label: 'SSH shell tab',
            desc: 'On SSH projects, click the server icon in the tab bar to open a raw interactive SSH shell, useful for commands that need a live TTY.'
          },
          vnc: {
            label: 'VNC remote desktop',
            desc: 'On SSH projects, click the monitor icon in the tab bar to open an encrypted VNC session. The connection tunnels through SSH automatically, with no extra port forwarding needed. Requires a VNC server such as TigerVNC running on the remote machine.'
          }
        }
      },
      runsLogs: {
        title: 'Runs & Logs',
        steps: {
          browser: {
            label: 'Unified log browser',
            desc: 'Workflow runs and terminal logs are merged in a single time-ordered list. Use the filter icons to show runs, logs, or both.'
          },
          history: {
            label: 'Structured run history',
            desc: 'Each workflow run records step timings, status, attempts, and linked logs. Open any run to see the full execution timeline.'
          },
          search: {
            label: 'Search saved logs',
            desc: 'Search across all saved terminal output. Matching lines are highlighted in the list and inside the opened log. Navigate matches with Enter and Shift+Enter.'
          },
          compare: {
            label: 'Compare runs',
            desc: 'Open a saved run and click Compare Previous to diff it against the last run of the same workflow, so regressions, fixes, and timing changes are easy to spot.'
          },
          aiReview: {
            label: 'AI review & selection',
            desc: 'Right-click selected text in a log to copy it or send it to AI Review. Ask follow-up questions in the review chat for deeper analysis.'
          },
          folder: {
            label: 'Open logs folder',
            desc: 'From the Logs view or project settings, jump straight to the underlying log folder on disk.'
          }
        }
      },
      captureDiff: {
        title: 'Output Capture & Diff',
        steps: {
          capture: {
            label: 'Capture a snapshot',
            desc: 'Press Command+Shift+S or click the camera icon in the terminal tab bar to save the current terminal output. Snapshots are stored as clean text.'
          },
          manage: {
            label: 'Manage snapshots',
            desc: 'Click the camera badge to open the snapshot panel. Rename snapshots by double-clicking, copy content, or delete them.'
          },
          compare: {
            label: 'Compare outputs',
            desc: 'In the snapshot panel, click the compare button and select two snapshots. A side-by-side diff viewer shows added, removed, and unchanged lines.'
          },
          search: {
            label: 'Search in terminal',
            desc: 'Press Command+F to open the search bar. It supports case-sensitive, regex, and whole-word matching. Navigate matches with Enter and Shift+Enter.'
          }
        }
      },
      files: {
        title: 'Files',
        steps: {
          browse: {
            label: 'Browse your project',
            desc: 'With a project active, open the Files tab in the sidebar. Navigate directories by clicking folder names.'
          },
          view: {
            label: 'View files',
            desc: 'Click any file to open it with syntax highlighting in the main panel. Large files are shown truncated, and very large files can be revealed in Finder instead.'
          },
          edit: {
            label: 'Edit with code colours',
            desc: 'Editable files keep syntax colouring, line numbers, and a code-editor layout while you type instead of falling back to plain text.'
          }
        }
      },
      aiProviders: {
        title: 'AI Providers',
        steps: {
          supported: {
            label: 'Supported providers',
            desc: 'OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral, Together.ai, Fireworks.ai, xAI (Grok), DeepSeek, plus any OpenAI-compatible endpoint.'
          },
          local: {
            label: 'Local models',
            desc: 'Connect to Ollama or LM Studio running locally. No API key is needed, and your data never leaves your machine.'
          },
          configure: {
            label: 'Configure & test',
            desc: 'Open Settings, enable a provider, paste your API key, and click Test Connection. Set one provider as active for all AI features.'
          },
          routing: {
            label: 'Routing & fallbacks',
            desc: 'Set a primary AI provider and optional fallbacks. If the primary fails, requests automatically try the next provider in your fallback list.'
          },
          privacy: {
            label: 'Privacy',
            desc: 'API keys are stored locally on your machine. No telemetry or data is sent anywhere except directly to your chosen provider.'
          }
        }
      },
      settings: {
        title: 'Settings',
        steps: {
          themes: {
            label: 'Themes',
            desc: 'Open Settings from the gear icon in the title bar. Choose from 8 themes: Void, Ember, Dusk, Forest, Chalk, Latte, Sage, or Mist.'
          },
          terminalInput: {
            label: 'Terminal input',
            desc: 'Choose between Classic shell input and Editor Prompt mode depending on how hands-on or guided you want the shell to feel.'
          },
          safePaste: {
            label: 'Safe paste mode',
            desc: 'When enabled, pasting multi-line text into the terminal shows a confirmation dialog to prevent accidental execution of dangerous commands.'
          },
          logs: {
            label: 'Log storage',
            desc: 'Control whether terminal sessions auto-save, pick a base log folder, and manage log retention from Settings or per-project.'
          },
          updates: {
            label: 'App updates',
            desc: 'TerminallySKILL checks for updates on startup when configured. Updates are downloaded and applied automatically.'
          },
          backup: {
            label: 'Backup & restore',
            desc: 'Back up your app data, including projects, scripts, snippets, and settings, to a directory of your choice from Settings.'
          },
          tooltips: {
            label: 'Help tooltips',
            desc: 'Toggle rich help tooltips on or off. When enabled, hovering over buttons shows descriptions and keyboard shortcuts in styled popups.'
          }
        }
      },
      remoteDesktop: {
        title: 'Remote Desktop (VNC)',
        steps: {
          overview: {
            label: 'How it works',
            desc: 'TerminallySKILL opens an SSH tunnel to your server and bridges it to a local WebSocket. The connection is encrypted end-to-end, and no ports need to be open beyond SSH.'
          },
          open: {
            label: 'Open a VNC tab',
            desc: 'With an SSH project active, click the monitor icon in the terminal tab bar. A VNC tab opens and connects automatically.'
          },
          installTiger: {
            label: 'Install TigerVNC',
            desc: 'On the remote machine: apt update && apt install -y tigervnc-standalone-server. Then set a VNC password with vncpasswd.'
          },
          installDesktop: {
            label: 'Install a desktop environment',
            desc: 'VNC needs a GUI session to display. Install XFCE4 with apt install xfce4 xfce4-goodies -y.'
          },
          configureStartup: {
            label: 'Configure the VNC startup',
            desc: 'Tell VNC to launch XFCE4: create ~/.vnc/xstartup with #!/bin/sh, unset SESSION_MANAGER, unset DBUS_SESSION_BUS_ADDRESS, exec startxfce4, then chmod +x ~/.vnc/xstartup.'
          },
          start: {
            label: 'Start the VNC server',
            desc: 'Run vncserver :1 -geometry 1920x1080 -depth 24. If it crashes immediately, check ~/.vnc/<hostname>:1.log for errors.'
          },
          check: {
            label: 'Check the server',
            desc: 'In your SSH tab, run ss -tlnp | grep 5901 to confirm the VNC server is listening before connecting.'
          },
          ports: {
            label: 'Display numbers & ports',
            desc: 'Display :0 = port 5900, :1 = port 5901, and so on. The VNC button connects to port 5901 by default.'
          },
          password: {
            label: 'VNC password',
            desc: 'If the remote VNC server requires a password, a secure prompt appears in the app. The connection itself is encrypted via SSH regardless.'
          }
        }
      },
      keyboard: {
        title: 'Keyboard Shortcuts',
        steps: {
          terminal: { label: 'Command+/', desc: 'Toggle the terminal panel. Opens it if no terminal exists, or hides and shows it.' },
          palette: { label: 'Command+K', desc: 'Open the command palette for quick access to any action, command, script, or snippet.' },
          projectSwitcher: { label: 'Command+P', desc: 'Open the project switcher to search and switch between projects without reaching for the mouse.' },
          splitVertical: { label: 'Command+D', desc: 'Split the terminal vertically side by side.' },
          splitHorizontal: { label: 'Command+Shift+D', desc: 'Split the terminal horizontally top and bottom.' },
          focusPane: { label: 'Command+] / Command+[', desc: 'Switch focus between split terminal panes.' },
          terminalSearch: { label: 'Command+F', desc: 'Open the search bar in the active terminal.' },
          findFiles: { label: 'Command+Shift+F', desc: 'Open Find in Files to search across all files in the active project directory.' },
          closeFile: { label: 'Command+W', desc: 'Close the active file tab in the editor, with an unsaved-changes prompt if needed.' },
          snapshot: { label: 'Command+Shift+S', desc: 'Capture a snapshot of the active terminal output.' },
          help: { label: 'Command+I', desc: 'Open this help guide.' },
          newTerminal: { label: 'Command+T', desc: 'Open a new terminal tab.' }
        }
      }
    }
  },
  ai: {
    localeInstruction:
      'Respond in the selected language. Preserve terminal commands, executable names, flags, file paths, environment variables, code, and shell output exactly as written unless the user explicitly asks to translate surrounding prose only.',
    explain: {
      label: 'Explain with AI',
      enabledDescription: 'Ask your active AI provider to explain this command part and give a usage example.',
      disabledDescription: 'Select an active AI provider in Settings to explain this command part with AI.',
      title: 'Explain With AI',
      openDraft: 'Open AI Draft',
      aiDraft: 'AI Draft',
      close: 'Close',
      loading: 'Asking AI for an explanation...',
      draftPrompt: 'Help me build a command using this fragment: {{commandString}}',
      draftPromptWithContext: 'Help me build a command using this fragment: {{commandString}}\nContext: {{commandDescription}}'
    }
  }
}

function isPlainObject(value: unknown): value is ResourceNamespace {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeNamespace(base: ResourceNamespace, override?: ResourceNamespace): ResourceNamespace {
  if (!override) return { ...base }
  const merged: ResourceNamespace = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = mergeNamespace(base[key] as ResourceNamespace, value)
      continue
    }
    merged[key] = value
  }

  return merged
}

function mergeLocaleOverrides(...overrides: Array<Partial<LocaleResource> | undefined>): Partial<LocaleResource> {
  const merged: Partial<LocaleResource> = {}

  for (const override of overrides) {
    if (!override) continue
    for (const [namespace, values] of Object.entries(override)) {
      merged[namespace] = mergeNamespace(merged[namespace] ?? {}, values)
    }
  }

  return merged
}

function withOverrides(overrides: Partial<LocaleResource>): LocaleResource {
  const merged: LocaleResource = {}

  for (const namespace of Object.keys(en)) {
    merged[namespace] = mergeNamespace(en[namespace], overrides[namespace])
  }

  return merged
}

const p0SurfaceOverrides: Record<string, Partial<LocaleResource>> = {
  'de-DE': {
    common: {
      actions: { apply: 'Anwenden', browse: 'Durchsuchen', cancel: 'Abbrechen', close: 'Schließen', delete: 'Löschen', reset: 'Zurücksetzen', save: 'Speichern' },
      states: { loading: 'TerminallySKILL wird geladen...', system: 'Systemstandard', reactRenderError: 'React-Renderfehler', tryAgain: 'Erneut versuchen', startupFailed: 'Start fehlgeschlagen' }
    },
    settings: {
      title: 'Einstellungen',
      tabs: { general: 'Allgemein', data: 'Daten', ai: 'KI', logs: 'Protokolle', appearance: 'Design', about: 'Info' },
      general: {
        title: 'Allgemein',
        helpTooltips: { title: 'Hilfetipps', description: 'Zeigt ausführlichere Beschreibungen, wenn du den Mauszeiger über Steuerelemente bewegst' },
        startupBehavior: {
          title: 'Startverhalten',
          description: 'Wähle aus, was TerminallySKILL beim Start anzeigen soll.',
          options: {
            dashboard: { label: 'Dashboard anzeigen', description: 'Mit dem Projekt-Dashboard, letzten Läufen und Schnellaktionen öffnen' },
            lastProject: { label: 'Letztes Projekt fortsetzen', description: 'Das zuletzt verwendete Projekt automatisch öffnen und den vorherigen Seitenleisten-Tab wiederherstellen' }
          }
        },
        terminalInput: {
          title: 'Terminaleingabe',
          description: 'Wähle zwischen direkter Shell-Eingabe und der editorartigen Befehlsleiste.',
          modes: {
            classic: { label: 'Klassisch', description: 'Direkt in den Live-Shell-Prompt tippen' },
            editor: { label: 'Editor-Prompt', description: 'Eine editorartige Befehlsleiste verwenden, wenn die Shell bereit ist' }
          }
        },
        safePaste: { title: 'Sicheres Einfügen', description: 'Vor verdächtigen oder mehrzeiligen Einfügungen in die Shell warnen' },
        resetCommandTrees: {
          title: 'Befehlsbäume zurücksetzen',
          description: 'Entfernt erkannte/manuelle Befehle und generierte Help-Daten, damit du mit einem sauberen Befehlskatalog testen kannst.',
          unaffected: 'Skripte, Snippets, Projekte, Einstellungen und Protokolle bleiben erhalten.',
          confirm: 'Alle erkannten/manuellen Befehlsbäume und generierten Help-Daten zurücksetzen?\n\nSkripte, Snippets, Projekte, Einstellungen und Protokolle bleiben erhalten.'
        }
      },
      locale: { title: 'Sprache & Region', description: 'Steuert UI-Sprache, regionale Formate und Sprache der KI-Antworten.', uiLanguage: 'UI-Sprache', formatLocale: 'Formate', aiLanguage: 'KI-Antworten', systemDescription: 'Die vom Betriebssystem bevorzugte Sprache verwenden.', formatDescription: 'Steuert Datum, Uhrzeit, Zahlen und Sortierung.', aiDescription: 'Befehle, Flags, Dateipfade, Code und Shell-Ausgabe bleiben unverändert.', appLanguage: 'Wie App-Sprache', launchTier: { P0: 'Start', P1: 'Nächste', P2: 'Beobachten' } },
      logs: { title: 'Protokolle', saveTerminalLogs: 'Terminalprotokolle speichern', saveTerminalLogsDescription: 'Terminal-Sitzungen beim Schließen automatisch speichern, sofern kein Projekt dies überschreibt', storageFolder: 'Protokollordner', storageFolderDescription: 'Basisordner für projektbenannte Terminalprotokolle', defaultFolder: 'Standard (App-Datenordner)', reset: 'Zurücksetzen', browse: 'Durchsuchen' },
      appearance: { title: 'Design', darkThemes: 'Dunkle Designs', darkThemesDescription: 'Blendungsarme Paletten für längere Terminal-Sitzungen.', lightThemes: 'Helle Designs', lightThemesDescription: 'Hellere Paletten mit weicherem Kontrast und papierartigen Flächen.' },
      data: { title: 'Daten', storageTitle: 'Datenspeicher', storageDescription: 'Verschiebe deine TerminallySKILL-Daten in einen eigenen Ordner - nützlich für Dropbox, Google Drive oder ein externes Laufwerk.', folderLabel: 'Datenordner', loading: 'Wird geladen...', customLocationActive: 'Eigener Speicherort aktiv', syncWarning: 'TerminallySKILL nicht gleichzeitig auf mehreren Computern mit demselben Ordner ausführen - das kann Daten beschädigen. Nutze Backups für sichere Synchronisierung.', moveConfirm: 'Alle TerminallySKILL-Daten nach:\n{{dir}}\n\nverschieben? Projekte, Skripte, Snippets, Einstellungen und Protokolle werden kopiert. Danach sollte die App neu gestartet werden.', movedMessage: 'Daten nach {{dir}} verschoben. Starte die App neu, um den Wechsel abzuschließen.', moveFailed: 'Datenordner konnte nicht verschoben werden', moving: 'Wird verschoben...', moveFolder: 'Datenordner verschieben', openFolder: 'Ordner öffnen', resetConfirm: 'Daten zurück an den Standardspeicherort verschieben?\n\nAlle Daten werden zurückkopiert. Danach sollte die App neu gestartet werden.', resetMessage: 'Daten zurück an den Standardspeicherort verschoben. Starte die App neu, um den Wechsel abzuschließen.', resetFailed: 'Datenordner konnte nicht zurückgesetzt werden', resetToDefault: 'Auf Standard zurücksetzen', backupsTitle: 'Backups', backupsDescription: 'Snapshot-Backups deines TerminallySKILL-Datenordners in iCloud Drive oder einem anderen Ordner speichern. API-Secrets werden bewusst ausgeschlossen.', iCloudReady: 'iCloud-bereit', manualSnapshots: 'Manuelle Snapshots', backupFolder: 'Backup-Ordner', notConfigured: 'Noch nicht konfiguriert', lastBackup: 'Letztes Backup: {{timestamp}}', noBackup: 'Noch kein Backup erstellt', iCloudUnavailable: 'iCloud Drive ist derzeit nicht verfügbar.', iCloudReadyMessage: 'iCloud-Drive-Backupordner ist bereit.', backupFolderUpdated: 'Backup-Ordner aktualisiert.', chooseBackupFolder: 'Wähle zuerst einen Backup-Ordner.', backupFailed: 'Backup fehlgeschlagen.', backupSaved: 'Backup gespeichert unter {{path}}', backupCreated: 'Backup erfolgreich erstellt.', useICloud: 'iCloud Drive verwenden', backingUp: 'Backup läuft', backUpNow: 'Jetzt sichern' },
      about: { title: 'Info', description: 'Promptbewusster Terminal-Workspace, Workflows, Protokolle und KI-Helfer.', version: 'Version {{version}}', updatesTitle: 'App-Updates', updatesDescription: 'Einen Release-Feed auf neuere Builds prüfen und den passenden Installer mit einem Klick laden und öffnen.', checkOnStartup: 'Beim Start nach Updates suchen', checkOnStartupDescription: 'Beim Start von TerminallySKILL automatisch den konfigurierten Release-Feed prüfen', checking: 'Wird geprüft', checkForUpdates: 'Nach Updates suchen', downloadInstall: 'Update herunterladen & installieren', downloadOpen: 'Update herunterladen & öffnen', installing: 'Update wird installiert', opening: 'Update wird geöffnet', current: 'Aktuell', latest: 'Neueste', noReleaseFound: 'Kein Release gefunden', resolvedFeed: 'Aufgelöster Feed', asset: 'Asset', autoSelectedBuild: 'Plattform-Build automatisch ausgewählt', published: 'Veröffentlicht', releaseNotes: 'Versionshinweise', releaseNotesHint: 'Aufklappen, um Highlights und das vollständige Changelog zu sehen.', support: 'Unterstützung', supportDescription: 'TerminallySKILL ist ein Solo-Indie-Projekt. Wenn es dir nützt, helfen Trinkgelder beim Weitermachen.', buyCoffee: 'Einen Kaffee spendieren' },
      ai: { title: 'KI-Anbieter', description: 'Konfiguriere Anbieter, die diese App für Reviews, Entwürfe und Korrekturen nutzen kann.', addProvider: 'Anbieter hinzufügen', emptyTitle: 'Noch keine Anbieter verbunden', emptyDescription: 'Füge OpenAI, Anthropic oder Ollama hinzu und wähle aus, wer KI-Aktionen ausführen soll.', routingTitle: 'KI-Routing', routingDescription: 'Wähle ein primäres Anbieter/Modell-Paar und ordne Fallbacks anbieterübergreifend an.', primaryProvider: 'Primärer Anbieter', selectProvider: 'Anbieter auswählen', primaryModel: 'Primäres Modell', primaryModelPlaceholder: 'Primäre Modell-ID', fallbackChain: 'Fallback-Kette', noFallbacks: 'Noch keine anbieterübergreifenden Fallbacks', fallbackProvider: 'Fallback-Anbieter', fallbackModelPlaceholder: 'Fallback-Modell-ID', add: 'Hinzufügen', active: 'Aktiv', model_one: '{{count}} Modell', model_other: '{{count}} Modelle', loadingModels: 'Modelle werden geladen', refreshModels: 'Modelle aktualisieren', testing: 'Wird getestet', test: 'Testen', disconnect: 'Trennen', connectionPassed: 'Verbindungstest bestanden', connectionFailed: 'Verbindung fehlgeschlagen', connectionType: 'Verbindungstyp', apiKey: 'API-Schlüssel', pasteKey: '{{provider}}-Schlüssel einfügen', baseUrl: 'Basis-URL', localBaseUrl: 'Lokale Basis-URL', availableModels: 'Verfügbare Modelle', modelsDiscovered: '{{count}} Modelle von {{provider}} gefunden', loadModels: 'Anbietermodelle laden, um durchsuchbare Auswahlen zu erhalten.', connectToDiscover: 'Verbinde diesen Anbieter, um Modelle zu finden.', synced: 'Synchronisiert', providerDefaultModel: 'Standardmodell des Anbieters', providerDefaultDescription: 'Wird als vorgeschlagenes Modell genutzt, wenn du diesen Anbieter für primäres Routing auswählst.', defaultModelPlaceholder: 'Standardmodell-ID', pickerTitle: 'KI-Anbieter hinzufügen', pickerDescription: 'Wähle einen Anbieter und dann, wie diese App ihn verbinden soll.', configure: 'Konfigurieren', connect: 'Verbinden', connectTitle: '{{provider}} verbinden', connectDescription: 'Wähle, wie TerminallySKILL mit diesem Anbieter kommunizieren soll.', apiKeyConnectionDescription: 'Füge einen Schlüssel ein und behalte den vollständigen App-Zugriff lokal.', localConnectionDescription: 'Mit einer lokalen Runtime auf deinem Computer verbinden.', getApiKey: 'API-Schlüssel abrufen', keysStayLocal: 'API-Schlüssel bleiben lokal und nutzen nach Möglichkeit systemgeschützten Speicher.', connectProvider: '{{provider}} verbinden', connection: { apiKey: 'API-Schlüssel', local: 'Lokal' }, status: { notConnected: 'Nicht verbunden', available: 'Zum Hinzufügen verfügbar', needsAttention: 'Benötigt Aufmerksamkeit', testFailed: 'Letzter Verbindungstest fehlgeschlagen', missingDetails: 'Details fehlen', completeFields: 'Verbindungsfelder ausfüllen', active: 'Aktiv', activeDetail: 'Wird für KI-Reviews und Entwürfe verwendet', connected: 'Verbunden', backupReady: 'Als Backup oder alternativer Anbieter bereit' }, connectionHelp: { local: 'Lokale Runtime auf deinem Computer', apiKey: 'API-Schlüssel-Verbindung' } },
      toggle: { off: 'Aus', on: 'Ein' }
    },
    scripts: { runner: { errors: { terminalClosed: 'Terminal-Sitzung wurde geschlossen, bevor der Workflow abgeschlossen war.', cancelled: 'Workflow abgebrochen.', stepFailed: '{{label}} ist mit Exit-Code {{code}} fehlgeschlagen.', stepFailedRetrying: '{{label}} ist mit Exit-Code {{code}} fehlgeschlagen. Erneuter Versuch.', stepFailedContinuing: '{{label}} ist mit Exit-Code {{code}} fehlgeschlagen. Fortsetzung, weil Fehler erlaubt sind.' } } },
    snippets: { help: { examples: 'Beispiele:' } },
    terminal: {
      panel: { latestOutput: 'Neueste Ausgabe' },
      editorPrompt: { sources: { history: 'Verlauf', command: 'Befehl', directory: 'Verzeichnis' } },
      secureInput: { prompts: { sudoPassword: 'Sudo-Passwortabfrage', password: 'Passwortabfrage', passphrase: 'Passphrase-Abfrage', pin: 'PIN-Abfrage', verificationCode: 'Prüfcode-Abfrage', token: 'Token-Abfrage', apiKey: 'API-Schlüssel-Abfrage' } },
      safePaste: { reasons: { multiLine_one: 'mehrzeiliges Einfügen ({{count}} Zeile)', multiLine_other: 'mehrzeiliges Einfügen ({{count}} Zeilen)', largePayload: 'großer eingefügter Inhalt', controlCharacters: 'Steuerzeichen erkannt', dangerousCommand: 'potenziell gefährlicher Shell-Befehl' } },
      close: { confirm: 'Dieses Terminal trotzdem schließen?\n\n{{reasons}}', workflowRunning: 'Workflow "{{name}}" läuft noch.', shellExecuting: 'Dieses Terminal führt noch einen Befehl aus.', unknownScript: 'Unbekanntes Skript' }
    }
  },
  'fr-FR': {
    common: {
      actions: { apply: 'Appliquer', browse: 'Parcourir', cancel: 'Annuler', close: 'Fermer', delete: 'Supprimer', reset: 'Réinitialiser', save: 'Enregistrer' },
      states: { loading: 'Chargement de TerminallySKILL...', system: 'Par défaut du système', reactRenderError: 'Erreur de rendu React', tryAgain: 'Réessayer', startupFailed: 'Échec du démarrage' }
    },
    settings: {
      title: 'Paramètres',
      tabs: { general: 'Général', data: 'Données', ai: 'IA', logs: 'Journaux', appearance: 'Thème', about: 'À propos' },
      general: { title: 'Général', helpTooltips: { title: 'Infobulles d’aide' }, startupBehavior: { title: 'Comportement au démarrage', options: { dashboard: { label: 'Afficher le tableau de bord' }, lastProject: { label: 'Reprendre le dernier projet' } } }, terminalInput: { title: 'Saisie du terminal', modes: { classic: { label: 'Classique' }, editor: { label: 'Invite éditeur' } } }, safePaste: { title: 'Collage sécurisé' }, resetCommandTrees: { title: 'Réinitialiser les arbres de commandes' } },
      locale: { title: 'Langue et région', uiLanguage: 'Langue de l’interface', formatLocale: 'Formats', aiLanguage: 'Réponses IA', appLanguage: 'Même langue que l’app', launchTier: { P0: 'Lancement', P1: 'Suivant', P2: 'Surveillance' } },
      logs: { title: 'Journaux', saveTerminalLogs: 'Enregistrer les journaux du terminal', storageFolder: 'Dossier des journaux', defaultFolder: 'Par défaut (dossier de données de l’app)', reset: 'Réinitialiser', browse: 'Parcourir' },
      appearance: { title: 'Thème', darkThemes: 'Thèmes sombres', lightThemes: 'Thèmes clairs' },
      data: { title: 'Données', storageTitle: 'Stockage des données', folderLabel: 'Dossier de données', loading: 'Chargement...', customLocationActive: 'Emplacement personnalisé actif', moving: 'Déplacement...', moveFolder: 'Déplacer le dossier de données', openFolder: 'Ouvrir le dossier', resetToDefault: 'Rétablir par défaut', backupsTitle: 'Sauvegardes', backupFolder: 'Dossier de sauvegarde', notConfigured: 'Pas encore configuré', noBackup: 'Aucune sauvegarde créée', useICloud: 'Utiliser iCloud Drive', backingUp: 'Sauvegarde en cours', backUpNow: 'Sauvegarder maintenant' },
      about: { title: 'À propos', updatesTitle: 'Mises à jour de l’app', checkOnStartup: 'Chercher les mises à jour au démarrage', checking: 'Vérification', checkForUpdates: 'Chercher des mises à jour', downloadInstall: 'Télécharger et installer la mise à jour', downloadOpen: 'Télécharger et ouvrir la mise à jour', installing: 'Installation de la mise à jour', opening: 'Ouverture de la mise à jour', current: 'Actuelle', latest: 'Dernière', noReleaseFound: 'Aucune version trouvée', resolvedFeed: 'Flux résolu', asset: 'Fichier', published: 'Publié', releaseNotes: 'Notes de version', support: 'Support', buyCoffee: 'M’offrir un café' },
      ai: { title: 'Fournisseurs IA', addProvider: 'Ajouter un fournisseur', emptyTitle: 'Aucun fournisseur connecté', routingTitle: 'Routage IA', primaryProvider: 'Fournisseur principal', selectProvider: 'Choisir un fournisseur', primaryModel: 'Modèle principal', fallbackChain: 'Chaîne de secours', add: 'Ajouter', active: 'Actif', loadingModels: 'Chargement des modèles', refreshModels: 'Actualiser les modèles', testing: 'Test en cours', test: 'Tester', disconnect: 'Déconnecter', connectionPassed: 'Test de connexion réussi', connectionFailed: 'Connexion échouée', connectionType: 'Type de connexion', apiKey: 'Clé API', baseUrl: 'URL de base', localBaseUrl: 'URL de base locale', availableModels: 'Modèles disponibles', synced: 'Synchronisé', providerDefaultModel: 'Modèle par défaut du fournisseur', pickerTitle: 'Ajouter un fournisseur IA', configure: 'Configurer', connect: 'Connecter', getApiKey: 'Obtenir une clé API', connection: { apiKey: 'Clé API', local: 'Local' }, status: { notConnected: 'Non connecté', available: 'Disponible à l’ajout', needsAttention: 'Attention requise', testFailed: 'Dernier test de connexion échoué', missingDetails: 'Détails manquants', completeFields: 'Compléter les champs de connexion', active: 'Actif', activeDetail: 'Utilisé pour les revues et brouillons IA', connected: 'Connecté', backupReady: 'Prêt comme secours ou fournisseur alternatif' }, connectionHelp: { local: 'Runtime local sur votre machine', apiKey: 'Connexion par clé API' } },
      toggle: { off: 'Désactivé', on: 'Activé' }
    },
    scripts: { runner: { errors: { terminalClosed: 'La session de terminal a été fermée avant la fin du workflow.', cancelled: 'Workflow annulé.', stepFailed: '{{label}} a échoué avec le code de sortie {{code}}.', stepFailedRetrying: '{{label}} a échoué avec le code de sortie {{code}}. Nouvel essai.', stepFailedContinuing: '{{label}} a échoué avec le code de sortie {{code}}. Poursuite car les erreurs sont autorisées.' } } },
    snippets: { help: { examples: 'Exemples :' } },
    terminal: {
      panel: { latestOutput: 'Dernière sortie' },
      editorPrompt: { sources: { history: 'Historique', command: 'Commande', directory: 'Dossier' } },
      secureInput: { prompts: { sudoPassword: 'Demande de mot de passe sudo', password: 'Demande de mot de passe', passphrase: 'Demande de phrase secrète', pin: 'Demande de code PIN', verificationCode: 'Demande de code de vérification', token: 'Demande de jeton', apiKey: 'Demande de clé API' } },
      safePaste: { reasons: { multiLine_one: 'collage multiligne ({{count}} ligne)', multiLine_other: 'collage multiligne ({{count}} lignes)', largePayload: 'contenu collé volumineux', controlCharacters: 'caractères de contrôle détectés', dangerousCommand: 'commande shell potentiellement dangereuse' } },
      close: { confirm: 'Fermer quand même ce terminal ?\n\n{{reasons}}', workflowRunning: 'Le workflow "{{name}}" est encore en cours.', shellExecuting: 'Ce terminal exécute encore une commande.', unknownScript: 'Script inconnu' }
    }
  },
  es: {
    common: {
      actions: { apply: 'Aplicar', browse: 'Examinar', cancel: 'Cancelar', close: 'Cerrar', delete: 'Eliminar', reset: 'Restablecer', save: 'Guardar' },
      states: { loading: 'Cargando TerminallySKILL...', system: 'Predeterminado del sistema', reactRenderError: 'Error de renderizado de React', tryAgain: 'Intentar de nuevo', startupFailed: 'Error al iniciar' }
    },
    settings: {
      title: 'Configuración',
      tabs: { general: 'Generales', data: 'Datos', ai: 'IA', logs: 'Registros', appearance: 'Tema', about: 'Acerca de' },
      general: { title: 'General', helpTooltips: { title: 'Ayudas emergentes' }, startupBehavior: { title: 'Comportamiento al iniciar', options: { dashboard: { label: 'Mostrar panel' }, lastProject: { label: 'Reanudar último proyecto' } } }, terminalInput: { title: 'Entrada del terminal', modes: { classic: { label: 'Clásico' }, editor: { label: 'Prompt de editor' } } }, safePaste: { title: 'Pegado seguro' }, resetCommandTrees: { title: 'Restablecer árboles de comandos' } },
      locale: { title: 'Idioma y región', uiLanguage: 'Idioma de la interfaz', formatLocale: 'Formatos', aiLanguage: 'Respuestas de IA', appLanguage: 'Igual que la app', launchTier: { P0: 'Lanzamiento', P1: 'Siguiente', P2: 'Observación' } },
      logs: { title: 'Registros', saveTerminalLogs: 'Guardar registros del terminal', storageFolder: 'Carpeta de registros', defaultFolder: 'Predeterminada (carpeta de datos de la app)', reset: 'Restablecer', browse: 'Examinar' },
      appearance: { title: 'Tema', darkThemes: 'Temas oscuros', lightThemes: 'Temas claros' },
      data: { title: 'Datos', storageTitle: 'Almacenamiento de datos', folderLabel: 'Carpeta de datos', loading: 'Cargando...', customLocationActive: 'Ubicación personalizada activa', moving: 'Moviendo...', moveFolder: 'Mover carpeta de datos', openFolder: 'Abrir carpeta', resetToDefault: 'Restablecer valores predeterminados', backupsTitle: 'Copias de seguridad', backupFolder: 'Carpeta de copias', notConfigured: 'Aún sin configurar', noBackup: 'No se ha creado ninguna copia', useICloud: 'Usar iCloud Drive', backingUp: 'Creando copia', backUpNow: 'Crear copia ahora' },
      about: { title: 'Acerca de', updatesTitle: 'Actualizaciones de la app', checkOnStartup: 'Buscar actualizaciones al iniciar', checking: 'Comprobando', checkForUpdates: 'Buscar actualizaciones', downloadInstall: 'Descargar e instalar actualización', downloadOpen: 'Descargar y abrir actualización', installing: 'Instalando actualización', opening: 'Abriendo actualización', current: 'Actual', latest: 'Última', noReleaseFound: 'No se encontró ninguna versión', resolvedFeed: 'Feed resuelto', asset: 'Recurso', published: 'Publicado', releaseNotes: 'Notas de la versión', support: 'Soporte', buyCoffee: 'Invítame a un café' },
      ai: { title: 'Proveedores de IA', addProvider: 'Añadir proveedor', emptyTitle: 'Aún no hay proveedores conectados', routingTitle: 'Enrutamiento de IA', primaryProvider: 'Proveedor principal', selectProvider: 'Seleccionar proveedor', primaryModel: 'Modelo principal', fallbackChain: 'Cadena de respaldo', add: 'Añadir', active: 'Activo', loadingModels: 'Cargando modelos', refreshModels: 'Actualizar modelos', testing: 'Probando', test: 'Probar', disconnect: 'Desconectar', connectionPassed: 'Prueba de conexión superada', connectionFailed: 'Conexión fallida', connectionType: 'Tipo de conexión', apiKey: 'Clave API', baseUrl: 'URL base', localBaseUrl: 'URL base local', availableModels: 'Modelos disponibles', synced: 'Sincronizado', providerDefaultModel: 'Modelo predeterminado del proveedor', pickerTitle: 'Añadir proveedor de IA', configure: 'Configurar', connect: 'Conectar', getApiKey: 'Obtener clave API', connection: { apiKey: 'Clave API', local: 'Local' }, status: { notConnected: 'No conectado', available: 'Disponible para añadir', needsAttention: 'Requiere atención', testFailed: 'Falló la última prueba de conexión', missingDetails: 'Faltan detalles', completeFields: 'Completa los campos de conexión', active: 'Activo', activeDetail: 'Usado para revisiones y borradores de IA', connected: 'Conectado', backupReady: 'Listo como respaldo o proveedor alternativo' }, connectionHelp: { local: 'Runtime local en tu máquina', apiKey: 'Conexión por clave API' } },
      toggle: { off: 'Desactivado', on: 'Activado' }
    },
    scripts: { runner: { errors: { terminalClosed: 'La sesión de terminal se cerró antes de que terminara el workflow.', cancelled: 'Workflow cancelado.', stepFailed: '{{label}} falló con el código de salida {{code}}.', stepFailedRetrying: '{{label}} falló con el código de salida {{code}}. Reintentando.', stepFailedContinuing: '{{label}} falló con el código de salida {{code}}. Continuando porque se permite continuar con error.' } } },
    snippets: { help: { examples: 'Ejemplos:' } },
    terminal: {
      panel: { latestOutput: 'Salida más reciente' },
      editorPrompt: { sources: { history: 'Historial', command: 'Comando', directory: 'Directorio' } },
      secureInput: { prompts: { sudoPassword: 'Solicitud de contraseña sudo', password: 'Solicitud de contraseña', passphrase: 'Solicitud de frase de contraseña', pin: 'Solicitud de PIN', verificationCode: 'Solicitud de código de verificación', token: 'Solicitud de token', apiKey: 'Solicitud de clave API' } },
      safePaste: { reasons: { multiLine_one: 'pegado multilínea ({{count}} línea)', multiLine_other: 'pegado multilínea ({{count}} líneas)', largePayload: 'contenido pegado grande', controlCharacters: 'caracteres de control detectados', dangerousCommand: 'comando de shell potencialmente peligroso' } },
      close: { confirm: '¿Cerrar este terminal de todos modos?\n\n{{reasons}}', workflowRunning: 'El workflow "{{name}}" sigue en ejecución.', shellExecuting: 'Este terminal todavía está ejecutando un comando.', unknownScript: 'Script desconocido' }
    }
  },
  'pt-BR': {
    common: {
      actions: { apply: 'Aplicar', browse: 'Procurar', cancel: 'Cancelar', close: 'Fechar', delete: 'Excluir', reset: 'Redefinir', save: 'Salvar' },
      states: { loading: 'Carregando TerminallySKILL...', system: 'Padrão do sistema', reactRenderError: 'Erro de renderização do React', tryAgain: 'Tentar novamente', startupFailed: 'Falha ao iniciar' }
    },
    settings: {
      title: 'Configurações',
      tabs: { general: 'Geral', data: 'Dados', ai: 'IA', logs: 'Logs', appearance: 'Tema', about: 'Sobre' },
      general: { title: 'Geral', helpTooltips: { title: 'Dicas de ajuda' }, startupBehavior: { title: 'Comportamento ao iniciar', options: { dashboard: { label: 'Mostrar painel' }, lastProject: { label: 'Retomar último projeto' } } }, terminalInput: { title: 'Entrada do terminal', modes: { classic: { label: 'Clássico' }, editor: { label: 'Prompt editor' } } }, safePaste: { title: 'Colagem segura' }, resetCommandTrees: { title: 'Redefinir árvores de comandos' } },
      locale: { title: 'Idioma e localidade', uiLanguage: 'Idioma da interface', formatLocale: 'Formatos', aiLanguage: 'Respostas de IA', appLanguage: 'Mesmo idioma do app', launchTier: { P0: 'Lançamento', P1: 'Próximo', P2: 'Observação' } },
      logs: { title: 'Logs', saveTerminalLogs: 'Salvar logs do terminal', storageFolder: 'Pasta de logs', defaultFolder: 'Padrão (pasta de dados do app)', reset: 'Redefinir', browse: 'Procurar' },
      appearance: { title: 'Tema', darkThemes: 'Temas escuros', lightThemes: 'Temas claros' },
      data: { title: 'Dados', storageTitle: 'Armazenamento de dados', folderLabel: 'Pasta de dados', loading: 'Carregando...', customLocationActive: 'Local personalizado ativo', moving: 'Movendo...', moveFolder: 'Mover pasta de dados', openFolder: 'Abrir pasta', resetToDefault: 'Restaurar padrão', backupsTitle: 'Backups', backupFolder: 'Pasta de backup', notConfigured: 'Ainda não configurado', noBackup: 'Nenhum backup criado', useICloud: 'Usar iCloud Drive', backingUp: 'Fazendo backup', backUpNow: 'Fazer backup agora' },
      about: { title: 'Sobre', updatesTitle: 'Atualizações do app', checkOnStartup: 'Verificar atualizações ao iniciar', checking: 'Verificando', checkForUpdates: 'Verificar atualizações', downloadInstall: 'Baixar e instalar atualização', downloadOpen: 'Baixar e abrir atualização', installing: 'Instalando atualização', opening: 'Abrindo atualização', current: 'Atual', latest: 'Mais recente', noReleaseFound: 'Nenhuma versão encontrada', resolvedFeed: 'Feed resolvido', asset: 'Arquivo', published: 'Publicado', releaseNotes: 'Notas da versão', support: 'Suporte', buyCoffee: 'Me pague um café' },
      ai: { title: 'Provedores de IA', addProvider: 'Adicionar provedor', emptyTitle: 'Nenhum provedor conectado ainda', routingTitle: 'Roteamento de IA', primaryProvider: 'Provedor principal', selectProvider: 'Selecionar provedor', primaryModel: 'Modelo principal', fallbackChain: 'Cadeia de fallback', add: 'Adicionar', active: 'Ativo', loadingModels: 'Carregando modelos', refreshModels: 'Atualizar modelos', testing: 'Testando', test: 'Testar', disconnect: 'Desconectar', connectionPassed: 'Teste de conexão aprovado', connectionFailed: 'Falha na conexão', connectionType: 'Tipo de conexão', apiKey: 'Chave de API', baseUrl: 'URL base', localBaseUrl: 'URL base local', availableModels: 'Modelos disponíveis', synced: 'Sincronizado', providerDefaultModel: 'Modelo padrão do provedor', pickerTitle: 'Adicionar provedor de IA', configure: 'Configurar', connect: 'Conectar', getApiKey: 'Obter chave de API', connection: { apiKey: 'Chave de API', local: 'Local' }, status: { notConnected: 'Não conectado', available: 'Disponível para adicionar', needsAttention: 'Precisa de atenção', testFailed: 'Último teste de conexão falhou', missingDetails: 'Detalhes ausentes', completeFields: 'Preencha os campos de conexão', active: 'Ativo', activeDetail: 'Usado para revisões e rascunhos de IA', connected: 'Conectado', backupReady: 'Pronto como backup ou provedor alternativo' }, connectionHelp: { local: 'Runtime local na sua máquina', apiKey: 'Conexão por chave de API' } },
      toggle: { off: 'Desativado', on: 'Ativado' }
    },
    scripts: { runner: { errors: { terminalClosed: 'A sessão do terminal foi fechada antes do workflow terminar.', cancelled: 'Workflow cancelado.', stepFailed: '{{label}} falhou com código de saída {{code}}.', stepFailedRetrying: '{{label}} falhou com código de saída {{code}}. Tentando novamente.', stepFailedContinuing: '{{label}} falhou com código de saída {{code}}. Continuando porque erros são permitidos.' } } },
    snippets: { help: { examples: 'Exemplos:' } },
    terminal: {
      panel: { latestOutput: 'Saída mais recente' },
      editorPrompt: { sources: { history: 'Histórico', command: 'Comando', directory: 'Diretório' } },
      secureInput: { prompts: { sudoPassword: 'Prompt de senha sudo', password: 'Prompt de senha', passphrase: 'Prompt de frase secreta', pin: 'Prompt de PIN', verificationCode: 'Prompt de código de verificação', token: 'Prompt de token', apiKey: 'Prompt de chave de API' } },
      safePaste: { reasons: { multiLine_one: 'colagem multilinha ({{count}} linha)', multiLine_other: 'colagem multilinha ({{count}} linhas)', largePayload: 'conteúdo colado grande', controlCharacters: 'caracteres de controle detectados', dangerousCommand: 'comando de shell potencialmente perigoso' } },
      close: { confirm: 'Fechar este terminal mesmo assim?\n\n{{reasons}}', workflowRunning: 'O workflow "{{name}}" ainda está em execução.', shellExecuting: 'Este terminal ainda está executando um comando.', unknownScript: 'Script desconhecido' }
    }
  },
  'zh-Hans': {
    common: {
      actions: { apply: '应用', browse: '浏览', cancel: '取消', close: '关闭', delete: '删除', reset: '重置', save: '保存' },
      states: { loading: '正在加载 TerminallySKILL...', system: '系统默认', reactRenderError: 'React 渲染错误', tryAgain: '重试', startupFailed: '启动失败' }
    },
    settings: {
      title: '设置',
      tabs: { general: '通用', data: '数据', ai: 'AI', logs: '日志', appearance: '主题', about: '关于' },
      general: {
        title: '通用',
        helpTooltips: { title: '帮助提示', description: '鼠标悬停在控件上时显示更详细的说明' },
        startupBehavior: {
          title: '启动行为',
          description: '选择 TerminallySKILL 启动时显示的内容。',
          options: {
            dashboard: { label: '显示仪表盘', description: '启动后打开项目仪表盘，显示最近运行和快速操作' },
            lastProject: { label: '恢复上次项目', description: '自动打开上次使用的项目，并恢复之前的侧边栏标签' }
          }
        },
        terminalInput: {
          title: '终端输入',
          description: '选择直接输入 shell，或使用编辑器式命令栏。',
          modes: {
            classic: { label: '经典', description: '直接在实时 shell 提示符中输入' },
            editor: { label: '编辑器提示', description: 'shell 就绪时使用编辑器式命令栏' }
          }
        },
        safePaste: { title: '安全粘贴模式', description: '向 shell 发送可疑或多行粘贴内容前先警告' },
        resetCommandTrees: {
          title: '重置命令树',
          description: '清除已发现/手动添加的命令和生成的帮助数据，以便从干净的命令目录重新测试。',
          unaffected: '脚本、片段、项目、设置和日志不会受影响。',
          confirm: '要重置所有已发现/手动添加的命令树和生成的帮助数据吗？\n\n脚本、片段、项目、设置和日志会保留。'
        }
      },
      locale: { title: '语言和区域', uiLanguage: '界面语言', formatLocale: '格式', aiLanguage: 'AI 回复', appLanguage: '与应用语言相同', launchTier: { P0: '发布', P1: '下一批', P2: '观察' } },
      logs: { title: '日志', saveTerminalLogs: '保存终端日志', saveTerminalLogsDescription: '终端会话关闭时自动保存，除非项目设置覆盖此行为', storageFolder: '日志存储文件夹', storageFolderDescription: '用于按项目命名保存终端日志的基础文件夹', defaultFolder: '默认（应用数据文件夹）', reset: '重置', browse: '浏览' },
      appearance: {
        title: '主题',
        darkThemes: '深色主题',
        darkThemesDescription: '低眩光配色，适合长时间终端会话。',
        lightThemes: '浅色主题',
        lightThemesDescription: '更明亮的配色，柔和对比并带有纸面质感。',
        themes: {
          void: { label: '虚空', description: '深色 - 青色' },
          ember: { label: '余烬', description: '暖色 - 琥珀' },
          dusk: { label: '黄昏', description: '中调 - 靛蓝' },
          forest: { label: '森林', description: '深色 - 松绿' },
          chalk: { label: '粉笔', description: '浅色 - 铜色' },
          sand: { label: '拿铁', description: '浅色 - 浓缩咖啡' },
          stone: { label: '鼠尾草', description: '浅色 - 橄榄' },
          mist: { label: '薄雾', description: '浅色 - 石板灰' }
        }
      },
      data: {
        title: '数据',
        storageTitle: '数据存储',
        storageDescription: '将 TerminallySKILL 数据移动到自定义文件夹，适用于 Dropbox、Google Drive 或外置硬盘。',
        folderLabel: '数据文件夹',
        loading: '正在加载...',
        customLocationActive: '自定义位置已启用',
        syncWarning: '不要让多台机器同时指向同一个 TerminallySKILL 数据文件夹，这可能损坏数据。跨设备同步请使用备份。',
        moveConfirm: '要将所有 TerminallySKILL 数据移动到：\n{{dir}}\n\n项目、脚本、片段、设置和日志都会被复制。移动后应重启应用。',
        movedMessage: '数据已移动到 {{dir}}。请重启应用以完成切换。',
        moveFailed: '移动数据目录失败',
        moving: '正在移动...',
        moveFolder: '移动数据文件夹',
        openFolder: '打开文件夹',
        resetConfirm: '要将数据移回默认位置吗？\n\n所有数据都会复制回去。重置后应重启应用。',
        resetMessage: '数据已移回默认位置。请重启应用以完成切换。',
        resetFailed: '重置数据目录失败',
        resetToDefault: '重置为默认',
        backupsTitle: '备份',
        backupsDescription: '将 TerminallySKILL 数据文件夹保存为快照备份，可保存到 iCloud Drive 或其他文件夹。API 密钥会被刻意排除。',
        iCloudReady: 'iCloud 就绪',
        manualSnapshots: '手动快照',
        backupFolder: '备份文件夹',
        notConfigured: '尚未配置',
        lastBackup: '上次备份：{{timestamp}}',
        noBackup: '尚未创建备份',
        iCloudUnavailable: 'iCloud Drive 目前不可用。',
        iCloudReadyMessage: 'iCloud Drive 备份文件夹已就绪。',
        backupFolderUpdated: '备份文件夹已更新。',
        chooseBackupFolder: '请先选择备份文件夹。',
        backupFailed: '备份失败。',
        backupSaved: '备份已保存到 {{path}}',
        backupCreated: '备份已成功创建。',
        useICloud: '使用 iCloud Drive',
        backingUp: '正在备份',
        backUpNow: '立即备份'
      },
      about: { title: '关于', description: '支持提示符感知的终端工作区，包含工作流、日志和 AI 助手。', version: '版本 {{version}}', updatesTitle: '应用更新', updatesDescription: '检查发布源是否有新版本，然后一键下载并打开匹配的安装包。', checkOnStartup: '启动时检查更新', checkOnStartupDescription: 'TerminallySKILL 启动时自动检查已配置的发布源', checking: '正在检查', checkForUpdates: '检查更新', downloadInstall: '下载并安装更新', downloadOpen: '下载并打开更新', installing: '正在安装更新', opening: '正在打开更新', current: '当前', latest: '最新', noReleaseFound: '未找到版本', resolvedFeed: '已解析的源', asset: '资源', autoSelectedBuild: '已自动选择平台构建', published: '已发布', releaseNotes: '版本说明', releaseNotesHint: '展开查看亮点和完整变更日志。', support: '支持', supportDescription: 'TerminallySKILL 是一个独立个人项目。如果它对你有用，打赏会帮助它继续发展。', buyCoffee: '请我喝咖啡' },
      ai: { title: 'AI 提供商', description: '配置此应用可用于审查、草稿和修复的提供商。', addProvider: '添加提供商', emptyTitle: '尚未连接提供商', emptyDescription: '添加 OpenAI、Anthropic 或 Ollama，并选择由哪个提供商处理 AI 操作。', routingTitle: 'AI 路由', routingDescription: '选择一个主要提供商/模型组合，然后按顺序设置跨提供商备用链。', primaryProvider: '主要提供商', selectProvider: '选择提供商', primaryModel: '主要模型', primaryModelPlaceholder: '主要模型 ID', fallbackChain: '备用链', noFallbacks: '尚无跨提供商备用项', fallbackProvider: '备用提供商', fallbackModelPlaceholder: '备用模型 ID', add: '添加', active: '已启用', model_one: '{{count}} 个模型', model_other: '{{count}} 个模型', loadingModels: '正在加载模型', refreshModels: '刷新模型', testing: '正在测试', test: '测试', disconnect: '断开连接', connectionPassed: '连接测试通过', connectionFailed: '连接失败', connectionType: '连接类型', apiKey: 'API 密钥', pasteKey: '粘贴 {{provider}} 密钥', baseUrl: '基础 URL', localBaseUrl: '本地基础 URL', availableModels: '可用模型', modelsDiscovered: '从 {{provider}} 发现 {{count}} 个模型', loadModels: '加载提供商模型以获得可搜索的选择器。', connectToDiscover: '连接此提供商以发现模型。', synced: '已同步', providerDefaultModel: '提供商默认模型', providerDefaultDescription: '当你选择此提供商作为主要路由时，用作建议模型。', defaultModelPlaceholder: '默认模型 ID', pickerTitle: '添加 AI 提供商', pickerDescription: '选择提供商，然后选择此应用如何连接它。', configure: '配置', connect: '连接', connectTitle: '连接 {{provider}}', connectDescription: '选择 TerminallySKILL 如何与此提供商通信。', apiKeyConnectionDescription: '粘贴密钥，并保持完整应用访问在本机进行。', localConnectionDescription: '连接到本机上的本地运行时。', getApiKey: '获取 API 密钥', keysStayLocal: 'API 密钥保留在本机，并尽可能使用系统保护存储。', connectProvider: '连接 {{provider}}', connection: { apiKey: 'API 密钥', local: '本地' }, status: { notConnected: '未连接', available: '可添加', needsAttention: '需要注意', testFailed: '上次连接测试失败', missingDetails: '缺少详细信息', completeFields: '完成连接字段', active: '已启用', activeDetail: '用于 AI 审查和草稿', connected: '已连接', backupReady: '可作为备用或替代提供商' }, connectionHelp: { local: '本机上的本地运行时', apiKey: 'API 密钥连接' } },
      toggle: { off: '关', on: '开' }
    },
    commands: {
      search: { placeholder: '搜索命令...' },
      addDialog: {
        title: '添加命令',
        commandLabel: '要搜索的命令名称或工具',
        commandPlaceholder: '例如 openclaw、terraform、docker、uv...',
        searchSystem: '在系统中搜索此命令',
        found: '已在系统中找到',
        fixingPath: '正在修复 PATH...',
        fixPath: '添加到 PATH（修复“command not found”）',
        fixPathSuccess: '已添加到 {{configFile}}。请重启终端以使修复生效。',
        fixPathFailure: '无法更新 shell 配置。你可能需要手动将该目录添加到 PATH。',
        notFound: '你的系统上尚未找到此命令。如果它出现在下方，你可以在终端中安装它，或仍然添加一个手动占位命令。',
        installableMatches: '可安装匹配项',
        installCatalogSource: '来自 TerminallySKILL 安装目录的搜索结果',
        installed: '已安装',
        alsoKnownAs: '也称为：{{aliases}}',
        addCommand: '添加命令',
        installInTerminal: '在终端中安装',
        suggestedInstallCommand: '建议安装命令',
        footer: '添加命令后，使用“从 --help 生成命令树”自动填充选项。安装操作会打开可见的本地终端，方便你检查将要运行的内容。',
        addManualPlaceholder: '添加手动占位命令',
        addSpecific: '添加 {{executable}}',
        errors: { addFailed: '添加命令失败。请重试。', addExecutableFailed: '添加 {{executable}} 失败。', installTerminalFailed: '无法为 {{executable}} 打开安装终端。' },
        info: { added: '已添加 {{executable}}。准备好后可以生成它的命令树。', installQueued: '已打开终端，并为 {{executable}} 排队 {{label}} 安装。安装完成后可添加或扫描它。' }
      },
      scanDialog: { title: '扫描结果', commandTree_one: '{{count}} 个命令树', commandTree_other: '{{count}} 个命令树', filterPlaceholder: '筛选命令...', selectAll: '全选', deselectAll: '取消全选', selected_one: '已选择 {{count}} 个', selected_other: '已选择 {{count}} 个', noFilterMatches: '没有命令匹配筛选条件', noNewCommands: '未找到新命令', added: '已添加', alreadyAdded: '已添加到 TerminallySKILL', apply_one: '应用 {{count}} 个命令', apply_other: '应用 {{count}} 个命令' },
      categorySelector: { title: '命令组', selectAll: '全选', deselectAll: '取消全选', selectedOfTotal: '已选择 {{selected}} / {{total}}', commandCount_one: '{{count}} 条命令', commandCount_other: '{{count}} 条命令', scanning: '正在扫描...', scanInstalled: '扫描已安装命令', scanDescription: '此扫描只显示这台机器上实际安装的命令。用它选择哪些命令树应显示在 TerminallySKILL 中。', save: '保存' },
      status: { missing: '缺失', missingTitle: '此 CLI 未在这台机器上检测到' },
      favorites: { add: '添加到收藏', remove: '从收藏中移除' },
      saved: { remove: '移除已保存命令' },
      descriptions: { commandTreeRoot: '{{executable}} 命令树根节点', generateCommandTree: '点击“从 --help 生成命令树”来填充选项' },
      danger: { safe: '安全', caution: '注意', destructive: '破坏性' }
    },
    commandBuilder: {
      fields: { required: '必填', selectPlaceholder: '选择...', addValue: '添加值', valuePlaceholder: '值 {{index}}', browseDirectory: '浏览目录', browseFile: '浏览文件', minimumCharacters: '至少 {{count}} 个字符', maximumCharacters: '最多 {{count}} 个字符', invalidFormat: '格式无效', min: '最小：{{value}}', max: '最大：{{value}}' },
      preview: { title: '命令预览', description: '将要执行的命令。点击可手动编辑。', resetToBuilder: '重置为构建器', resetDescription: '放弃手动编辑，并恢复构建器生成的命令。', editPlaceholder: '构建或编辑命令', clickToEdit: '点击编辑', copied: '已复制', copy: '复制', copyDescription: '复制命令到剪贴板', addCommand: '添加命令', addManualFirst: '先将预览重置为构建器，然后将其保存为可复用命令预设。', addCurrent: '将当前构建器状态作为可复用命令添加到此 CLI 树下。', aiReview: 'AI 审查', aiReviewEnabled: '让当前 AI 提供商解释风险，并建议更安全的变体。', aiReviewDisabled: '请在设置中选择启用的 AI 提供商以使用命令审查。', aiDraft: 'AI 草稿', aiDraftEnabled: '描述你想要的命令，并在应用前检查 AI 生成的构建器建议。', aiDraftDisabled: '请在设置中选择启用的 AI 提供商以生成命令草稿。', execute: '执行', runInTerminal: '在终端中运行命令', errors: { aiPromptRequired: '请求 AI 生成前，请先描述你想要的命令。', executeFailed: '无法在终端中执行此命令。' } },
      aiReview: { title: 'AI 审查', description: '对你的命令进行风险分析并提供更安全替代方案。', reviewing: '正在审查命令...', thinking: '正在思考...', followUpPlaceholder: '提出后续问题...', rerun: '重新审查', review: '审查' },
      aiDraft: { title: 'AI 命令草稿', description: '描述你想要的命令。应用前检查建议的命令行和表单值。', promptLabel: '这个命令应该做什么？', promptPlaceholder: '示例：为 Web 服务生成安全的 staging dry-run 部署，并开启详细日志。', suggestion: 'AI 建议', generating: '正在生成命令草稿...', summary: '摘要', warnings: '警告', generatedCommand: '生成的命令', noCommandValues: '[未生成命令值]', formValues: '表单值', footer: '“应用到预览”只替换可编辑命令行。“应用到表单”会填充上方复选框、输入框和参数。两个操作都不会执行命令。', refreshDraft: '刷新草稿', generateDraft: '生成草稿', applyToPreview: '应用到预览', applyToForm: '应用到表单' },
      referenceHelp: { title: '{{executable}} 帮助', savedMeta: '已保存 {{timestamp}}', overview: '概览', commonOptions: '常用选项', arguments: '参数', examples: '示例', platformNotes: '平台说明', cautions: '注意事项', required: '必填', savedHelp: '已保存帮助', savedHelpDescription: '打开此命令已保存的 AI 生成帮助参考。', openSavedHelp: '打开已保存帮助', openDocumentation: '打开文档', generateFromHelp: '从 --help 生成命令树', generatingFromHelp: '正在从 --help 生成...', generateHelpFromAI: '从 AI 生成帮助', generatingHelpFromAI: '正在从 AI 生成帮助...', generateHelpFromAIEnabled: '为没有有用 --help 输出的命令生成已保存参考帮助', generateHelpFromAIDisabled: '请在设置中选择启用的 AI 提供商，以使用 AI 生成已保存帮助', generateTreeFromSavedHelp: '从已保存帮助生成命令树', generatingCommandTree: '正在生成命令树...', generateTreeFromSavedHelpTitle: '将已保存的 AI 帮助选项转换为可复用命令树', refreshHelpFromAI: '从 AI 刷新帮助', refreshingHelpFromAI: '正在从 AI 刷新帮助...', refreshHelpEnabled: '重新生成并保存此 AI 帮助参考', refreshHelpDisabled: '请在设置中选择启用的 AI 提供商，以使用 AI 刷新已保存帮助', closeSavedHelp: '关闭已保存帮助', aiProviderFallback: 'AI', insufficientStructuredHelp: '已保存帮助还没有足够的结构化选项或参数来构建命令树。', generatedTreeSuccess: '已根据 {{executable}} 的已保存 AI 帮助生成命令树', savedAIHelpSuccess: '已在本地保存 {{executable}} 的 AI 帮助', notFoundForHelp: '{{executable}} 未在 shell PATH 中找到，因此 TerminallySKILL 无法检查其帮助输出', tryInstallHint: '尝试：{{hint}}', noStructuredHelp: '无法找到此命令的结构化 --help 输出。如果它没有在这里提供常规帮助界面，请改用“从 AI 生成帮助”。', noMachineHelp: '未检测到此命令的结构化 --help 输出。像 ls 这样的某些 CLI 不会在这里提供机器可解析帮助。请改用“从 AI 生成帮助”。', parseFailed: '运行此命令的 --help 失败', detectedTitle: '从 shell PATH 检测到', manualTitle: '手动添加', detected: '已检测', saved: '已保存' },
      examples: { commandTreeRoot: '命令树根节点：' },
      optionInfo: { types: { boolean: '标志', string: '文本', number: '数字', enum: '选项', filePath: '文件路径', directoryPath: '目录路径', multiSelect: '多选', repeatable: '可重复' }, required: '必填', defaultValue: '默认：' },
      optionGroups: { options: '选项' }
    },
    scripts: {
      actions: { addScript: '添加脚本', newScript: '新建脚本', create: '创建', cancel: '取消', importTvflow: '导入 .tvflow 脚本', createNewScript: '创建新脚本', exportTvflow: '导出为 .tvflow', duplicate: '复制', removeFromProject: '从项目移除', deletePermanently: '永久删除', runWorkflow: '运行工作流' },
      placeholders: { scriptName: '脚本名称...' },
      empty: { projectTitle: '此项目尚未添加脚本', projectDescription: '添加现有脚本或创建新脚本', globalTitle: '还没有脚本', globalDescription: '创建一个，或从构建器添加命令' },
      editor: { noSelectionTitle: '未选择脚本', noSelectionDescription: '从侧边栏选择脚本或创建新脚本', detachToProject: '分离到项目', cloneToProject: '克隆到项目', detachToProjectHelp: '创建项目本地副本，这样此项目中的更改不会影响共享的全局脚本。', cloneToProjectHelp: '创建项目本地副本，这样这里的更改不会影响其他项目中的脚本。', addDescriptionPlaceholder: '添加描述...', clickToAddDescription: '点击添加描述...', stepTypes: { command: '命令', approval: '审批', note: '备注' }, stepLabelPlaceholder: '步骤标签（可选）', commandPlaceholder: '命令（例如 npm run build）', approvalPlaceholder: '工作流运行前显示的审批消息', notePlaceholder: '给操作者的参考备注', addStepType: '添加{{type}}', addStep: '添加步骤', enabledSummary: '已启用 {{enabled}} / {{total}} 个步骤 - {{executable}} 个可执行', copyAll: '全部复制', copyAllTitle: '将所有命令复制为 shell 脚本', runScript: '运行脚本', runAllTitle: '运行所有已启用步骤', runStep: '运行步骤', runFromHere: '从这里运行', runWorkflow: '运行工作流', deleteStepTitle: '删除步骤', deleteStepMessage: '此步骤将从脚本中永久移除。此操作无法撤销。', generatedStepLabel: '步骤 {{index}}', approvalRequired: '需要审批' },
      step: { addLabel: '+ 标签', changeTypeTitle: '点击更改步骤类型', manualConfirm: '手动确认', autoCheckpoint: '自动检查点', continueOnError: '出错时继续', running: '运行中', clickToEdit: '点击编辑', addCommand: '点击添加命令...', switchTypeHint: '点击上方类型徽章，可切换为审批或备注', addApproval: '添加审批消息...', addNote: '添加备注...', alreadyRunning: '已有工作流正在运行', runStepTitle: '在当前终端运行此步骤', runFromHereTitle: '从此步骤开始在当前终端继续运行', moveUp: '上移', moveDown: '下移', willContinueOnError: '出错时将继续', willStopOnError: '出错时将停止', disableStep: '禁用步骤', enableStep: '启用步骤', removeStep: '移除步骤', delay: '延迟', retries: '重试', pauseForConfirmation: '暂停等待手动确认' },
      meta: { step_one: '{{count}} 步', step_other: '{{count}} 步', input_one: '{{count}} 个输入', input_other: '{{count}} 个输入', global: '全局', thisProject: '此项目', otherProject: '其他项目', running_one: '正在 {{count}} 个终端中运行。再启动一次', running_other: '正在 {{count}} 个终端中运行。再启动一次', runCommand_one: '运行 {{count}} 条命令', runCommand_other: '运行 {{count}} 条命令' },
      delete: { title: '删除脚本', message: '"{{name}}" 将被永久删除。此操作无法撤销。' },
      selector: { title: '添加脚本', searchPlaceholder: '搜索脚本，或输入名称来创建...', emptyTitle: '还没有脚本', emptyDescription: '在上方输入名称来创建第一个脚本', noMatches: '没有匹配的脚本', step_one: '{{count}} 步', step_other: '{{count}} 步', global: '全局', thisProject: '此项目', otherProject: '其他项目', cloneToProject: '克隆到项目', cloneToProjectTitle: '将此全局脚本克隆到当前项目，以便安全自定义', useGlobal: '使用全局', useGlobalTitle: '按原样在各项目中使用共享全局脚本', cloneNotice: '它会被克隆到当前项目，因此你的更改会保持本地化。', createNew: '创建新脚本 "{{name}}"', cancel: '取消', save: '保存' },
      addToScript: { tooltipLabel: '脚本', tooltipDescription: '将命令添加到现有或新脚本', title: '添加到脚本', emptyProject: '此项目中没有脚本', emptyGlobal: '还没有脚本', step_one: '{{count}} 步', step_other: '{{count}} 步', scriptNamePlaceholder: '脚本名称...', createAndAdd: '创建并添加', cancel: '取消', newScript: '新建脚本' },
      run: { title: '运行 {{name}}' },
      workflowRun: { readyCommand_one: '{{count}} 条命令已准备运行', readyCommand_other: '{{count}} 条命令已准备运行', inputs: '输入', inputDescription: '值会替换类似 {{example}} 的匹配占位符。', required: '必填', setTrue: '设为 true', noSelection: '未选择', unknownPlaceholders: '检测到未知占位符：{{placeholders}}。', invalidInputValues: '运行前请修正这些输入值：{{issues}}', preparation: '准备', preparationDescription: '备注会作为上下文包含在内。审批步骤可以暂停运行等待确认，也可以作为信息检查点。', requiresConfirmation: '此步骤将在运行期间要求确认。', autoCheckpoint: '此检查点会作为上下文显示，然后自动继续。', requiredInputsMissing: '缺少必填输入：{{inputs}}', invalidInputs: '输入值无效：{{issues}}', unknownMustBeFixed: '运行前必须修正未知占位符：{{placeholders}}', noCommandSteps: '此选择中没有已启用的命令步骤。', prepStep_one: '{{count}} 个准备步骤', prepStep_other: '{{count}} 个准备步骤', command_one: '{{count}} 条命令', command_other: '{{count}} 条命令' },
      inputs: {
        title: '工作流输入',
        help: '定义每次运行此脚本时需要填写的变量。可在命令步骤中使用 {{open}}placeholder_key{{close}} 语法引用它们。\n\n示例：部署脚本可以包含环境（staging/prod）、版本号，以及是否运行迁移等输入，使同一个脚本可复用于不同场景。\n\n类型：文本、数字、布尔值（复选框）或选项（下拉菜单）。将输入标为必填可防止缺值运行。',
        aiDraft: 'AI 草稿',
        aiDraftTitle: 'AI 输入草稿',
        aiDraftDescription: '描述你的工作流，AI 会建议可复用的输入。',
        aiDraftTooltip: '根据你的步骤获取 AI 工作流输入建议',
        addInput: '添加输入',
        labelPlaceholder: '标签',
        labelTitle: '运行此工作流时向用户显示的名称',
        keyPlaceholder: 'placeholder_key',
        keyTitle: '在命令步骤中使用 {{open}}this_key{{close}}，运行时插入该值',
        typeTitle: '数据类型 - 文本（自由文本）、数字（可选最小/最大值）、布尔值（true/false 复选框）、选项（下拉列表）',
        types: { string: '文本', number: '数字', boolean: '布尔值', choice: '选项' },
        requiredShort: '必填',
        requiredTitle: '勾选后，运行工作流前必须填写此输入',
        removeTitle: '从工作流中移除此输入',
        descriptionPlaceholder: '描述',
        descriptionTitle: '运行工作流时显示在输入字段下方的帮助文本',
        defaultPlaceholder: '默认值',
        defaultTextTitle: '预填值 - 用户可在运行前更改',
        placeholderText: '占位提示文本',
        placeholderTitle: '输入为空时显示在字段内的灰色提示',
        defaultNumberTitle: '预填数字值',
        minPlaceholder: '最小值',
        minTitle: '允许的最小值（可选）',
        maxPlaceholder: '最大值',
        maxTitle: '允许的最大值（可选）',
        stepPlaceholder: '步进',
        stepTitle: '数字输入的递增步进（例如 0.1 用于小数）',
        booleanDefaultTitle: '此布尔值默认是选中（true）还是未选中（false）',
        defaultToTrue: '默认为 true',
        optionsPlaceholder: '选项（每行一个，可用 label=value）',
        optionsTitle: '每一行都会成为下拉选项。使用 label=value 可显示友好标签，同时传递不同的值',
        defaultOptionPlaceholder: '默认选项',
        defaultOptionTitle: '预先选择哪个选项（必须匹配上方列表中的某个值）',
        allowCustomTitle: '允许用户输入不在下拉列表中的自定义值',
        allowCustom: '允许自定义值',
        removeDialogTitle: '移除输入',
        unnamedInput: '此输入',
        removeDialogMessage: '"{{name}}" 将被移除。步骤中的任何 {{open}}{{key}}{{close}} 占位符将不再被替换。',
        remove: '移除',
        describePromptRequired: '请描述此工作流的作用，以便 AI 建议输入。',
        providerError: '无法访问 AI 提供商。请检查 AI 设置。',
        noStepsDefined: '还没有定义步骤。',
        none: '无。',
        aiCommandName: '工作流输入草稿',
        aiCommandDescription: '根据用户描述和上方工作流步骤，建议可让此脚本复用的工作流输入。每个输入请建议：标签、占位符 key（snake_case）、类型（string/number/boolean/choice）、是否必填、合理默认值，以及简短描述。还要指出步骤中可用 {{open}}placeholder{{close}} 语法参数化的硬编码值。请格式化为清晰列表，并保持简洁实用。',
        userDescription: '用户描述',
        workflowSteps: '工作流步骤',
        existingInputs: '现有输入',
        stepLabel: '步骤 {{index}}',
        requiredMeta: '必填',
        promptLabel: '此工作流做什么？',
        promptPlaceholder: '示例：将服务部署到所选环境，可选数据库迁移和回滚支持。',
        generating: '正在生成...',
        generateSuggestions: '生成建议',
        suggestions: 'AI 建议'
      },
      runner: { status: { waitingForShell: '等待 shell', waitingForDelay: '等待延迟', awaitingApproval: '等待审批', runningStep: '正在运行步骤', completed: '已完成', failed: '失败', cancelled: '已取消', running: '运行中' }, actions: { continue: '继续', stop: '停止', close: '关闭' }, errors: { terminalClosed: '终端会话在工作流完成前已关闭。', cancelled: '工作流已取消。', stepFailed: '{{label}} 失败，退出代码为 {{code}}。', stepFailedRetrying: '{{label}} 失败，退出代码为 {{code}}。正在重试。', stepFailedContinuing: '{{label}} 失败，退出代码为 {{code}}。已启用出错继续，因此继续运行。' }, attempt: '第 {{current}} / {{total}} 次尝试', exit: '退出 {{code}}' }
    },
    snippets: {
      actions: { newSnippet: '新建片段', create: '创建', cancel: '取消', quickRun: '快速运行', fillVariablesRun: '填写变量并运行', duplicate: '复制', removeFromProject: '从项目移除', deletePermanently: '永久删除' },
      placeholders: { name: '片段名称...', template: '例如 git checkout {branch}' },
      help: { variables: '使用变量占位符表示必填变量，也可为可选变量设置默认值。', examples: '示例：' },
      empty: { title: '还没有片段', description: '创建带变量的可复用命令模板。' },
      editor: { noSelectionTitle: '未选择片段', noSelectionDescription: '从侧边栏选择片段或创建新片段', addDescriptionPlaceholder: '添加描述...', clickToAddDescription: '点击添加描述...', template: '模板', templatePlaceholder: '例如 ssh {{open}}user{{close}}@{{open}}host{{close}} -p {{open}}port:22{{close}}', saveShortcut: '保存 Command+S', templateHelp: '使用 {{open}}name{{close}} 表示必填变量，使用 {{open}}name:default{{close}} 表示带默认值的可选变量', variables: '变量', preview: '预览', emptyTemplatePreview: '在上方输入模板...', noVariablesStatus: '无变量 - 按原样运行', allVariablesFilled: '所有变量已填写', filledStatus: '已填写 {{filled}} / {{total}}', copyResolvedCommand: '复制解析后的命令', copied: '已复制！', copy: '复制', runInTerminal: '在终端中运行', run: '运行', defaultValue: '默认值', enterValuePlaceholder: '输入 {{label}}...' },
      meta: { variable_one: '{{count}} 个变量', variable_other: '{{count}} 个变量' },
      delete: { title: '删除片段', message: '"{{name}}" 将被永久删除。此操作无法撤销。' }
    },
    files: {
      browser: { selectProject: '选择项目以浏览文件', localOnlyTitle: '文件浏览器目前仅支持本地项目', localOnlyDescription: '此工作区目标为 <target>{{target}}</target>。请改用命令构建器、脚本或片段通过 SSH 运行命令。', goUp: '上一级', projectRoot: '项目根目录', refresh: '刷新', createFile: '在此文件夹中创建文件', toggleHidden: '显示/隐藏隐藏文件', openExternal: '在 Finder/资源管理器中打开', createFileAction: '创建文件', cancel: '取消', createEmptyFile: '在 <path>{{path}}</path> 中创建空文件。', loading: '正在加载...', emptyDirectory: '空目录', errors: { enterFileName: '请输入文件名；如果需要扩展名也请包含。', fileNameOnly: '只能使用文件名，不能包含嵌套路径。', exists: '此处已存在同名文件。', failed: '刚才无法创建该文件。' } },
      search: { noLocalProjectTitle: '未打开本地项目', noLocalProjectDescription: '“在文件中查找”适用于本地工作区项目。', placeholder: '在项目中搜索...', caseSensitive: '区分大小写', regex: '使用正则表达式', filterOptions: '筛选选项', globPlaceholder: '文件筛选，例如 *.ts、src/**/*.tsx', search: '搜索', searching: '正在搜索...', noResults: '无结果', resultSummary: '{{matches}} 个匹配，位于 {{files}} 个文件', resultSummary_one: '{{matches}} 个匹配，位于 {{files}} 个文件', resultSummary_other: '{{matches}} 个匹配，位于 {{files}} 个文件', clearResults: '清除结果', noMatchesFor: '没有匹配 {{query}} 的结果', inFilesMatching: '在匹配 {{glob}} 的文件中', hint: '按 Enter 或点击搜索，即可在此项目的所有文件中查找' },
      viewer: { closeTab: '关闭标签', closeTabUnsaved: '关闭标签（有未保存更改）', copied: '已复制！', copyFilePath: '复制文件路径', saved: '已保存', saveFailed: '保存失败', line_one: '{{count}} 行', line_other: '{{count}} 行', previewFile: '预览文件', editFile: '编辑文件', runScript: '运行脚本', runRuntime: '运行 {{runtime}}', saveAndRun: '保存并运行', saveFile: '保存文件（Command+S）', saving: '正在保存...', save: '保存', reveal: '在 Finder 中显示', notExecutable: '此文件不可执行。直接运行前需要 chmod +x。', fixing: '正在修复...', chmod: '运行 chmod +x', externalChanged: '此文件在打开期间已在磁盘上更改。重新加载可查看较新版本，或暂时保留当前编辑。', keepEdits: '保留我的编辑', reload: '重新加载', tooLargeTitle: '文件过大，无法打开', tooLargeDescription: '{{size}}。超过 50 MB 的文件不会加载到查看器中。', truncated: '文件大于 5 MB。仅显示前 5 MB。大文件不可编辑。', editModeHint: '默认以编辑模式打开。Command+S 保存。Esc 预览。Tab 缩进。', unsavedTitle: '未保存更改', unsavedMessage: '{{name}} 有未保存更改。关闭标签前要保存吗？', fallbackFileName: '此文件', discard: '放弃', saveAndClose: '保存并关闭', errors: { reloadFailed: '无法重新加载 {{name}}：{{error}}', saveBeforeRun: '请先保存文件再运行。' } }
    },
    logs: {
      list: { searchPlaceholder: '搜索日志和运行...', workflowRuns: '工作流运行', workflowRunsDescription: '显示或隐藏工作流脚本运行', terminalLogs: '终端日志', terminalLogsDescription: '显示或隐藏已保存的终端会话日志', runs: '运行', logs: '日志', openLogsFolder: '打开日志文件夹', openLogsFolderDescription: '打开此项目解析后的日志目录', loading: '正在加载历史...', emptyMatching: '没有匹配的运行或日志', emptyFilters: '所有筛选器都已关闭', emptyHistory: '还没有保存的历史', tryDifferentSearch: '尝试其他搜索词。', enableFilter: '请至少启用上方一个筛选器以查看结果。', historyHint: '工作流运行会实时捕获，终端会话关闭时会自动保存。', refresh: '刷新', readError: '[无法读取日志文件]' },
      labels: { duration: '持续时间', session: '会话', steps: '步骤', shell: 'Shell', started: '开始时间', unknown: '未知', noProject: '无项目', inputs: '输入', unset: '<未设置>', step: '步骤', attempts: '尝试次数', retries: '重试', delay: '延迟', exit: '退出', exitCode: '退出代码', lines_one: '{{count}} 行', lines_other: '{{count}} 行', stepCount_one: '{{count}} 步', stepCount_other: '{{count}} 步', stepsComplete: '{{completed}}/{{total}} 步' },
      status: { completed: '已完成', failed: '失败', cancelled: '已取消', awaitingApproval: '等待审批', running: '运行中', pending: '待处理', closed: '已关闭', ok: '正常', inProgress: '进行中', notStarted: '未开始' },
      actions: { rerun: '重新运行', openLog: '打开日志', comparePrevious: '与上次比较', aiReviewSelection: 'AI 审查选中文本', copy: '复制', confirm: '确认', cancel: '取消', deleteLog: '删除日志' },
      step: { duration: '持续时间 {{duration}}', attempts: '尝试 {{count}} 次', exit: '退出 {{code}}', retries: '重试 {{count}} 次', delay: '延迟 {{ms}}ms', manualConfirmation: '手动确认', autoCheckpoint: '自动检查点' },
      compare: { title: '运行比较', versus: '{{baseline}} 对比 {{candidate}}', changedSteps: '变更步骤', regressionsFixes: '回退 / 修复', durationDelta: '持续时间变化', addedRemoved: '新增 / 移除', previous: '上次', current: '当前', shown: '显示 {{visible}} / {{total}} 个步骤', showingChangedOnly: '仅显示变更项', showChangedOnly: '仅显示变更项', stepLabel: '步骤 {{index}}', noChangedSteps: '这两次运行之间没有变更步骤。', noStep: '此运行中没有步骤。', unchanged: '未变化', added: '已新增', removed: '已移除', typeChanged: '类型已变更', statusChanged: '状态已变更', contentChanged: '内容已变更', notAvailable: '不可用', noChange: '无变化' },
      detail: { searchPlaceholder: '在此日志中高亮文本...（Enter / Shift+Enter 导航）', noMatches: '此日志中未找到匹配项。', deleteConfirm: '要删除此日志吗？', aiTitle: 'AI 审查 - 日志选中文本', reviewing: '正在审查选中文本...', thinking: '正在思考...', followUpPlaceholder: '提出后续问题...', selectedLogText: '选中的日志文本' },
      diagnostics: { title: '疑似问题', likelyCauses: '可能原因', nextChecks: '后续检查' }
    },
    layout: {
      terminal: { expand: '展开终端', expandDescription: '恢复停靠的终端面板' },
      topbar: { sshShell: 'SSH Shell', sshShellDescription: '为此工作区打开新的交互式 SSH shell', vncViewer: 'VNC 查看器', vncViewerDescription: '通过加密 SSH 隧道打开远程桌面会话', newTerminal: '新建终端', newTerminalDescription: '打开 shell 标签', helpGuide: '帮助指南', helpGuideDescription: '了解如何使用 TerminallySKILL', settings: '设置', settingsDescription: '主题、AI 提供商和偏好设置', github: 'GitHub', githubDescription: '查看源码并报告问题', website: '网站', websiteDescription: 'terminallyskill.com' },
      palette: { actions: { newTerminal: '新建终端', newTerminalDescription: '打开新的终端标签', openSshShell: '打开 SSH Shell', openSshShellDescription: '为此工作区打开新的交互式 SSH shell', settings: '设置', settingsDescription: '打开应用设置', info: '工作方式', infoDescription: '打开入门指南', newProject: '新建项目', newProjectDescription: '创建新项目' }, types: { action: '操作', command: '命令', script: '脚本', snippet: '片段', history: '历史' }, searchPlaceholder: '搜索命令、脚本、片段...', noResults: '没有匹配 "{{query}}" 的结果', historyRunAgain: '在终端中再次运行', scriptStep_one: '{{count}} 步', scriptStep_other: '{{count}} 步', shortcuts: { navigate: '导航', select: '选择', close: '关闭' } },
      sidebar: { files: { noProjectTitle: '打开项目以浏览文件', noProjectDescription: '文件按项目显示，因此标签、编辑和文件历史会限定在正确的工作区。' }, commands: { expandAll: '展开所有命令树', collapseAll: '折叠所有命令树', addManual: '手动添加命令', scanInstalled: '扫描已安装命令', favorites: '收藏', loading: '正在加载命令...', noMatches: '没有匹配搜索的命令', noMatchesHint: '尝试其他关键词或清空搜索', emptyTitle: '还没有命令树', emptyDescription: '从空白开始，只添加这台电脑上实际安装的工具。', pickPopular: '选择常用已安装命令', scanAll: '扫描所有已安装命令', popularInstalled: '常用已安装命令', scanResults: '扫描结果', removeTitle: '移除命令', removeMessage: '"{{name}}" 将被永久移除。此操作无法撤销。', remove: '移除', removeFavorite: '从收藏中移除', removeSaved: '移除已保存命令' }, starterPack: { title: '已应用入门包', dismiss: '关闭', description: '此项目已预载感知仓库的默认内容，因此首次会话不会是空白。', commands: '命令', scripts: '脚本', snippets: '片段', starterCommand_one: '{{count}} 个入门命令', starterCommand_other: '{{count}} 个入门命令', starterScript_one: '{{count}} 个入门脚本', starterScript_other: '{{count}} 个入门脚本', starterSnippet_one: '{{count}} 个入门片段', starterSnippet_other: '{{count}} 个入门片段' }, versionLoading: '正在加载版本...' },
      settings: { title: '设置' },
      updates: { available: '有可用更新 {{version}}', whatsNew: '更新内容', releaseNotesHint: '展开查看亮点和完整变更日志。', dismissBanner: '关闭更新横幅', downloadInstall: '下载并安装更新', downloadOpen: '下载并打开更新', installing: '正在安装更新', opening: '正在打开更新' }
    },
    dashboard: {
      quickActions: { newTerminal: '新建终端', noRecentScripts: '没有最近脚本', openFolder: '打开文件夹' },
      sections: { recentRuns: '最近运行', scripts: '脚本', recentCommands: '最近命令' },
      activeRuns: { stepProgress: '步骤 {{current}} / {{total}}', awaitingApproval: '等待审批', jumpToTerminal: '跳转到终端' },
      actions: { viewAll: '查看全部', rerun: '重新运行 {{name}}' },
      scripts: { step_one: '{{count}} 步', step_other: '{{count}} 步' },
      empty: { title: '准备就绪', description: '打开终端、运行脚本，或从侧边栏选择命令。' }
    },
    projects: {
      selector: { none: '无项目', searchPlaceholder: '搜索项目...', empty: '还没有项目。创建一个即可开始。', noMatches: '没有匹配的项目', terminalCount_one: '{{count}} 个终端', terminalCount_other: '{{count}} 个终端', terminalCountActive_one: '{{count}} 个终端，进程正在运行', terminalCountActive_other: '{{count}} 个终端，进程正在运行', openNewWindow: '在新窗口中打开', edit: '编辑项目', newProject: '新建项目' },
      dialog: {
        titleNew: '新建项目',
        titleEdit: '编辑项目',
        projectName: '项目名称',
        projectNamePlaceholder: '我的精彩项目',
        group: '分组',
        groupPlaceholder: '例如 服务器、工作、个人...',
        willAppearAs: '将显示为 {{name}}',
        workspaceTarget: '工作区目标',
        localWorkspace: '本地工作区',
        sshWorkspace: 'SSH 工作区',
        localWorkspaceDescription: '在本地仓库目录中运行，并支持文件浏览。',
        sshWorkspaceDescription: '通过已保存的远程目标，用 SSH 运行应用发起的命令。',
        workingDirectory: '工作目录',
        workingDirectoryPlaceholder: '/path/to/your/project',
        workingDirectoryDescription: '本地终端会话会从这里开始，也可在这里浏览文件。',
        connectionLabel: '连接标签',
        connectionLabelPlaceholder: '生产部署',
        connectionLabelDescription: '可选。用于工作区摘要和 SSH shell 标签。',
        host: '主机',
        user: '用户',
        remoteWorkingDirectory: '远程工作目录',
        optional: '可选',
        sshPort: 'SSH 端口',
        vncPort: 'VNC 端口',
        identityFile: '身份密钥文件',
        identityTooltipGenerate: '如果还没有密钥，请生成一个：',
        identityTooltipDefaults: '按 Enter 接受默认值，也可以设置密码短语。',
        identityTooltipCopy: '将公钥复制到 VPS：',
        identityTooltipPassword: '输入一次 VPS 密码。之后就不再需要密码。',
        identityFileDescription: '可选。测试、包装命令和交互式 shell 会把它作为 SSH 的 -i 参数传入。',
        browseIdentityFile: '浏览身份密钥文件',
        sshFileBrowsingLocalOnly: '文件浏览目前仍仅限本地。TerminallySKILL 发起的命令会通过 SSH 包装到此目标上运行。',
        testSSH: '测试 SSH 连接',
        testSSHDescription: '使用本地 ssh 客户端并设置短超时，同时检查远程 cwd 是否可解析。',
        resolvedTarget: '解析后的目标',
        includeStarterPack: '包含入门包',
        includeStarterPackDescription: '扫描工作目录并自动添加检测到的命令、脚本和片段。取消勾选则创建空白工作区。',
        scanningRepo: '正在扫描仓库...',
        noRepoSignals: '此目录中未检测到仓库信号。',
        commandGroup_one: '{{count}} 个命令组',
        commandGroup_other: '{{count}} 个命令组',
        script_one: '{{count}} 个脚本',
        script_other: '{{count}} 个脚本',
        snippet_one: '{{count}} 个片段',
        snippet_other: '{{count}} 个片段',
        color: '颜色',
        colorTaken: '已被其他项目使用',
        dimmedColors: '变暗的颜色已被其他项目使用',
        projectLogs: '项目日志',
        logOptions: {
          inherit: { label: '使用应用设置', description: '跟随全局终端日志开关' },
          enabled: { label: '始终保存', description: '即使应用日志关闭，也保留此项目的日志' },
          disabled: { label: '永不保存', description: '跳过此项目的终端日志' }
        },
        logFolderDescription: '日志会保存到按项目命名的文件夹中。没有项目的会话会进入“无项目”。',
        logEffective: { enabled: '此项目始终保存终端日志。', disabled: '此项目从不保存终端日志。', inheritedOn: '此项目跟随应用设置，目前会保存终端日志。', inheritedOff: '此项目跟随应用设置，目前不会保存终端日志。' },
        openLogsFolder: '打开日志文件夹',
        clearRecentCommands: '清除最近命令',
        recentCommand_one: '{{count}} 条最近命令',
        recentCommand_other: '{{count}} 条最近命令',
        deleteProject: '删除项目',
        saveChanges: '保存更改',
        createProject: '创建项目',
        deleteMessage: '"{{name}}" 及其所有设置将被永久删除。链接到此项目的脚本和片段不会被移除。',
        errors: { nameRequired: '项目名称为必填项', workingDirectoryRequired: '工作目录为必填项', sshHostRequired: 'SSH 主机为必填项', sshPortInvalid: 'SSH 端口必须是正整数', vncPortInvalid: 'VNC 端口必须是 1 到 65535 之间的数字', duplicateDirectory: '"{{name}}" 已使用此目录。再次点击创建即可仍然添加。' }
      },
      env: { title: '环境变量', active_one: '{{count}} 个启用', active_other: '{{count}} 个启用', importEnv: '导入 .env', importTitle: '从 .env 文件导入', enabledTitle: '已启用。点击可禁用', disabledTitle: '已禁用。点击可启用', keyPlaceholder: 'KEY', valuePlaceholder: 'value', removeVariable: '移除变量', addVariable: '添加变量', description: '变量会注入到此项目的新终端会话中。', errors: { tooLarge: '文件过大，无法导入', noEntries: '未找到有效的 KEY=VALUE 条目', readFailed: '读取文件失败' } }
    },
    terminal: {
      panel: { newTerminal: '新建终端', newTerminalDescription: '为项目工作区打开新的 shell 标签', sshShell: 'SSH Shell', sshShellDescription: '为此工作区打开新的交互式 SSH shell', vncViewer: 'VNC 查看器', vncViewerDescription: '通过加密 SSH 隧道打开远程桌面会话', closeSplit: '关闭分屏', splitVertical: '垂直分屏', splitVerticalDescription: '并排打开第二个终端', splitHorizontal: '水平分屏', splitHorizontalDescription: '上下堆叠终端', snapshotsDescription: '捕获终端输出以便稍后比较', hideTerminal: '隐藏终端', hideTerminalDescription: '折叠终端面板', noSessions: '没有终端会话。点击 + 或执行命令。', runBadge: '运行', latestOutput: '最新输出' },
      vncSetup: { title: 'VNC 服务器设置', checkServer: '首先在 SSH 标签中检查 VPS 上是否正在运行 VNC 服务器：', installTiger: '如果没有返回内容，请安装 TigerVNC：', installDesktop: '安装 XFCE4（轻量，适合 VNC）：', configureStartup: '配置 VNC 以启动桌面：', startSession: '启动会话：', portHint: ':1 = 端口 5901，:0 = 端口 5900' },
      pathFix: { commandNotFound: '未找到命令', commandNotFoundDescription: '你的 shell 在 PATH 环境变量列出的任何目录中都找不到 "{{command}}"。通常表示它尚未安装，或安装位置不在 PATH 中。', notFoundInPath: '<command>{{command}}</command> 不在 PATH 中', added: '已添加到 PATH - 打开新标签后生效', couldNotLocate: '无法在此系统上定位 {{command}}', finding: '正在查找...', fixPath: '修复 PATH' },
      usage: { label: '用法：', searchWeb: '搜索网页', askChatGpt: '询问 ChatGPT' },
      aiReview: { titleLastCommand: 'AI 审查 - 上一条命令', titleSelection: 'AI 审查 - 选中文本', titleSession: 'AI 审查 - 会话', noLastCommand: '请先运行命令，这样才有已完成的命令块可供审查。', noTerminalOutput: '请先运行命令，这样才有终端输出可供审查。', selectTextFirst: '请先在终端中选择一些文本。', selectedText: '选中文本', selectedTerminalTextTitle: '选中的终端文本', reviewing: '正在审查终端输出...', thinking: '正在思考...', followUpPlaceholder: '提出后续问题...', close: '关闭', reviewSelection: 'AI 审查选中文本', copy: '复制' },
      secureInput: { title: '安全输入已启用', fallbackPrompt: '检测到敏感提示', prompts: { sudoPassword: 'sudo 密码提示', password: '密码提示', passphrase: '密码短语提示', pin: 'PIN 提示', verificationCode: '验证码提示', token: '令牌提示', apiKey: 'API 密钥提示' }, description: '按键会直接发送到 shell，不会预览或排队。' },
      safePaste: { title: '确认粘贴', editorDraft: '编辑器草稿', queuedForLater: '已排队稍后发送', sendToShell: '发送到 shell', flagged: '此次粘贴被标记，因为它包含 {{reasons}}。', bracketed: '此 shell 已启用 bracketed paste，因此确认后的粘贴会被安全包装。', plain: '此 shell 未声明支持 bracketed paste，因此确认后的内容会作为普通输入发送。', lines_one: '将粘贴 {{count}} 行。', lines_other: '将粘贴 {{count}} 行。', reasons: { multiLine_one: '多行粘贴（{{count}} 行）', multiLine_other: '多行粘贴（{{count}} 行）', largePayload: '粘贴内容较大', controlCharacters: '检测到控制字符', dangerousCommand: '可能危险的 shell 命令' }, review: '发送到 shell 前请检查内容。', cancel: '取消', pasteAnyway: '仍然粘贴', pasteAndDisable: '仍然粘贴且不再显示' },
      editorPrompt: { title: '编辑器提示', helpWithHistory: 'Enter 运行。Tab 接受选中的建议。Shift+Tab 或 Alt+上/下循环建议。上/下循环命令历史。Ctrl+N / Ctrl+P 也可循环建议。', helpNoHistory: 'Enter 运行。Tab 接受选中的建议。Shift+Tab 或 Alt+上/下循环建议。首次运行后会显示历史。', helpLabel: '编辑器提示帮助', placeholder: '输入命令并按 Enter', run: '运行', suggestion: '建议：', emptySuggestions: '开始输入以生成建议。', tabAccepts: 'Tab 接受选中的建议。', sources: { history: '历史', command: '命令', directory: '目录' }, modeOnDescription: '编辑器模式已开启 - 在专用输入栏中输入命令，并获得建议和历史。切换可回到经典 shell 输入。', modeOffDescription: '编辑器模式已关闭 - 你正在直接向实时 shell 输入。切换可使用带建议的编辑器式命令栏。', off: '关', on: '开' },
      toolbar: { reviewSession: '审查会话', refreshSession: '刷新会话审查', reviewSessionEnabled: '让当前 AI 提供商审查完整终端会话记录。', reviewSessionDisabled: '请在设置中选择启用的 AI 提供商以审查终端输出。', prompt: '提示符：', waitingForShell: '正在等待 shell...', running: '正在运行：', connected: '已连接：', remote: '远程', last: '上次：', promptCount_one: '{{count}} 个提示符', promptCount_other: '{{count}} 个提示符', bracketedPaste: 'Bracketed Paste', plainPaste: '普通粘贴', bracketedPasteDescription: 'shell 支持 bracketed paste - 粘贴文本会被转义序列包裹，因此不会逐行执行。多行粘贴更安全。', plainPasteDescription: 'shell 正在使用普通粘贴 - 粘贴文本会像直接输入一样发送，换行可能立即执行命令。', paste: '粘贴：', bracketed: 'bracketed', plain: '普通' },
      busy: { title: 'Shell 正忙 - 命令会在就绪后运行', clearQueue: '清空队列', running: '正在运行' },
      search: { placeholder: '在终端中查找...', caseSensitive: '区分大小写', regex: '正则表达式', wholeWord: '全词匹配', previous: '上一个匹配项（Shift+Enter）', next: '下一个匹配项（Enter）', close: '关闭（Esc）' },
      mismatch: { title: '不同项目的终端', description: '当前终端属于 {{terminalProjectName}}，但你正在 {{activeProjectName}} 中工作。在这里运行可能会使用错误的工作目录。', openNewTerminal: '为 {{projectName}} 打开新终端', runAnyway: '仍在 {{projectName}} 终端中运行' },
      vnc: { connecting: '正在通过 SSH 隧道连接...', connectionError: '连接错误', disconnected: '已断开连接', connectionLost: '连接丢失。请检查远程机器上是否正在运行 VNC 服务器（端口 {{port}}）。', reconnect: '重新连接', passwordRequired: '需要 VNC 密码', passwordDescription: '远程机器上的 VNC 服务器需要自己的密码，与 SSH 分开。', passwordPlaceholder: 'VNC 密码', rememberPassword: '记住密码', keychain: '已保存到系统钥匙串', connect: '连接', pasteClipboard: '从剪贴板粘贴（Ctrl+V）', exitFullscreen: '退出全屏（Esc）', enterFullscreen: '进入全屏' },
      promote: { title: '从终端提升', description: '将上一条命令变成可复用的工作流项目，无需重新输入。', lastCommand: '上一条命令', targets: { script: { label: '工作流脚本', description: '创建脚本，并将此命令作为第一个可运行步骤。' }, snippet: { label: '片段', description: '将命令保存为稍后可运行的可复用模板。' }, command: { label: '命令', description: '打开或创建根可执行文件的命令构建器条目。' } }, helpers: { existingCommand: '此可执行文件已知。提升会打开现有命令构建器，并在需要时为此项目启用它。', newCommand: '这会创建一个占位命令条目。稍后可从 --help 丰富它，得到更完整的构建器。', artifact: '你现在可以重命名它，然后在打开后立即细化脚本或片段。' }, name: '名称', namePlaceholder: '选择名称...', openCommand: '打开命令', createCommand: '创建命令', createSnippet: '创建片段', createScript: '创建脚本', errors: { noCommand: '请先运行命令，这样才有内容可提升。', noExecutable: '无法确定此命令的可执行文件。' } },
      snapshots: { label: '快照 {{time}}', title: '快照', empty: '还没有快照', compare: '比较', compareDescription: '选择两个快照以查看差异', clearAll: '全部清除', clearAllDescription: '移除所有已保存快照', selectToCompare: '选择 2 个快照进行比较（{{count}}/2）', emptyHint: '点击标签栏中的相机图标，或按 Command+Shift+S 捕获终端输出', renameTitle: '双击重命名', copy: '复制到剪贴板', delete: '删除快照', line_one: '{{count}} 行', line_other: '{{count}} 行' },
      diff: { title: '输出差异', unchanged: '{{count}} 行未变化', identical: '输出完全相同' },
      close: { confirm: '仍要关闭此终端吗？\n\n{{reasons}}', workflowRunning: '工作流 "{{name}}" 仍在运行。', shellExecuting: '此终端仍在执行命令。', unknownScript: '未知脚本' }
    },
    ai: {
      explain: { label: '用 AI 解释', enabledDescription: '让当前 AI 提供商解释此命令片段并给出用法示例。', disabledDescription: '请在设置中选择启用的 AI 提供商，以用 AI 解释此命令片段。', title: '用 AI 解释', openDraft: '打开 AI 草稿', aiDraft: 'AI 草稿', close: '关闭', loading: '正在向 AI 请求解释...', draftPrompt: '帮我用这个片段构建命令：{{commandString}}', draftPromptWithContext: '帮我用这个片段构建命令：{{commandString}}\n上下文：{{commandDescription}}' }
    },
    onboarding: {
      title: '如何使用 TerminallySKILL',
      subtitle: '可视化命令构建器、终端工作区、工作流、日志和 AI 工具',
      searchPlaceholder: '搜索设置、快捷键、日志、AI、SSH、VNC、远程桌面...',
      matchingItem_one: '{{count}} 个匹配项',
      matchingItem_other: '{{count}} 个匹配项',
      guideSection_one: '{{count}} 个指南部分',
      guideSection_other: '{{count}} 个指南部分',
      clearSearch: '清除搜索',
      startHere: '从这里开始',
      startHereDescription: '创建项目、打开终端，并决定使用经典模式还是编辑器提示模式。',
      goodToKnow: '值得了解',
      goodToKnowDescription: '日志、工作流、SSH 目标和 AI 操作都位于同一个项目上下文中。',
      noMatches: '没有匹配的指南',
      noMatchesHint: '尝试更宽泛的词，例如终端、日志、AI、SSH 或快捷键。',
      match_one: '{{count}} 个匹配',
      match_other: '{{count}} 个匹配',
      footer: 'TerminallySKILL - 可视化命令构建器和终端工具',
      gotIt: '知道了',
      sections: {
        projects: { title: '项目', steps: {
          create: { label: '创建项目', desc: '点击标题栏中的项目选择器，然后选择“新建项目”。将它指向工作目录；这会成为终端会话和文件浏览器的根目录。' },
          switch: { label: '切换项目', desc: '随时点击标题栏中的项目名称切换上下文，或按 Command+P（Ctrl+P）。每个项目都会记住自己的收藏命令、脚本和终端会话。' },
          groups: { label: '项目分组', desc: '创建或编辑项目时可使用“分组”字段整理项目。分组会在项目选择器中显示为可折叠部分，适合区分服务器、工作和个人项目。' },
          colours: { label: '项目颜色', desc: '每个项目都有唯一颜色点，显示在终端标签和侧边栏中，让你始终知道当前处于哪个项目上下文。' },
          workspaceTargets: { label: '本地和 SSH 工作区', desc: '项目可以指向本地文件夹或 SSH 远程主机。为 SSH 目标配置主机、用户、端口和身份密钥文件。标题栏会显示当前工作区类型。' },
          sshKeys: { label: 'SSH 密钥设置', desc: '使用 ssh-keygen -t ed25519 生成密钥，然后用 ssh-copy-id user@host 复制到服务器。把密钥路径填入项目的身份密钥文件字段后，就不再需要密码。' },
          envVars: { label: '环境变量', desc: '在项目设置中添加 KEY=VALUE 对，或导入 .env 文件。变量会注入到该项目的每个新终端会话中。可单独开关变量而无需删除。' },
          starterPacks: { label: '入门包', desc: '创建项目时，TerminallySKILL 会检测 package.json、Dockerfile、Makefile 等仓库信号，并自动启用相关命令类别。' }
        } },
        commands: { title: '命令', steps: {
          browse: { label: '浏览命令', desc: '“命令”标签列出 TerminallySKILL 已知的每个 CLI 工具。使用搜索框可即时筛选。工具会从系统 PATH 中自动发现。' },
          builder: { label: '可视化构建器', desc: '点击任意命令打开基于表单的构建器。用控件填写标志和参数，无需记忆语法，然后复制或运行结果。' },
          aiReview: { label: 'AI 审查', desc: '运行前使用 AI 审查检查构建出的命令是否安全。审查包含可追问的对话聊天，因此可以继续询问结果。' },
          aiDraft: { label: 'AI 草稿', desc: '用自然语言描述需求，AI 草稿会提出完整命令，并在构建器中填充标志和参数。' },
          preview: { label: '可编辑预览', desc: '构建时命令预览会实时更新。复制或运行前，也可以直接微调最终命令文本。' },
          custom: { label: '添加自定义命令', desc: '在“命令”标签中点击 + 添加任意可执行文件。TerminallySKILL 会解析其 --help 输出，并自动生成可视化构建器。' },
          favourites: { label: '固定收藏', desc: '点击星标可将命令固定到当前项目列表顶部。最近命令也会显示在专门区域中。' }
        } },
        scripts: { title: '脚本', steps: {
          create: { label: '创建工作流脚本', desc: '打开侧边栏中的“脚本”标签并点击 +。为它命名和添加描述，然后加入命令、备注、审批检查点等步骤。' },
          inputs: { label: '添加输入和审批', desc: '工作流输入让同一个脚本可用不同值复用。审批步骤可暂停运行，也可作为可见检查点。' },
          run: { label: '运行脚本', desc: '点击任意脚本旁的播放按钮即可执行。TerminallySKILL 会打开终端并按顺序运行所有步骤，支持每步重试和出错继续。' },
          share: { label: '导出和导入', desc: '点击任意脚本上的分享图标，可将其导出为 .tvflow 文件。其他人可从“脚本”标签导入到自己的项目。' }
        } },
        snippets: { title: '片段', steps: {
          create: { label: '创建片段', desc: '打开“片段”标签并点击 +。编写包含 {{placeholderSyntax}} 动态值的命令模板，例如 docker run -p {{portPlaceholder}}:80 {{imagePlaceholder}}。' },
          fill: { label: '填写并运行', desc: '点击片段打开它。填写占位符字段，然后点击“运行”，在终端中执行完成后的命令。' },
          copy: { label: '复制解析后的命令', desc: '占位符填写完成后，可使用复制按钮获取完整解析后的命令字符串，用于其他地方。' }
        } },
        terminal: { title: '终端', steps: {
          open: { label: '打开终端', desc: '点击标题栏中的终端图标，或按 Command+/（Ctrl+/）。每个标签都会在项目工作目录中运行完整 shell，并注入环境变量。' },
          editorPrompt: { label: '编辑器提示模式', desc: '在设置中切换到编辑器提示模式。shell 空闲时，你会获得带幽灵建议、历史循环和更安全粘贴处理的命令栏。' },
          aiReview: { label: 'AI 审查工具', desc: '可用 AI 审查完整会话，或只审查上一条命令块。在对话式聊天中追问。右键选中文本可只审查该部分。' },
          splits: { label: '分屏窗格', desc: '按 Command+D 垂直并排分屏，或按 Command+Shift+D 上下水平分屏。按 Command+] 和 Command+[ 在窗格间切换焦点。' },
          queue: { label: '命令队列', desc: '如果命令运行时继续输入，输入会被缓冲并显示在叠层中。shell 空闲后会自动运行。' },
          pathFix: { label: 'PATH 修复', desc: '如果找不到命令，会出现带“修复 PATH”按钮的横幅，自动定位二进制文件并更新 shell 配置。' },
          promote: { label: '提升命令', desc: '运行命令后，可直接从终端工具栏将其提升为已保存命令、片段或工作流步骤。' },
          sshShell: { label: 'SSH shell 标签', desc: '在 SSH 项目中，点击标签栏中的服务器图标可打开原始交互式 SSH shell，适合需要实时 TTY 的命令。' },
          vnc: { label: 'VNC 远程桌面', desc: '在 SSH 项目中，点击标签栏中的显示器图标可打开加密 VNC 会话。连接会自动通过 SSH 隧道，无需额外端口转发。远程机器上需要运行 TigerVNC 等 VNC 服务器。' }
        } },
        runsLogs: { title: '运行和日志', steps: {
          browser: { label: '统一日志浏览器', desc: '工作流运行和终端日志会合并成一个按时间排序的列表。使用筛选图标可显示运行、日志或两者。' },
          history: { label: '结构化运行历史', desc: '每次工作流运行都会记录步骤耗时、状态、尝试次数和关联日志。打开任意运行即可查看完整执行时间线。' },
          search: { label: '搜索已保存日志', desc: '在所有已保存终端输出中搜索。匹配行会在列表和打开的日志中高亮。使用 Enter 和 Shift+Enter 导航匹配项。' },
          compare: { label: '比较运行', desc: '打开已保存运行并点击“与上次比较”，可与同一工作流的上一次运行做差异比较，便于发现回退、修复和耗时变化。' },
          aiReview: { label: 'AI 审查和选中内容', desc: '右键日志中的选中文本，可复制或发送到 AI 审查。在审查聊天中追问以获得更深入分析。' },
          folder: { label: '打开日志文件夹', desc: '可从“日志”视图或项目设置直接跳转到底层磁盘日志文件夹。' }
        } },
        captureDiff: { title: '输出捕获和差异', steps: {
          capture: { label: '捕获快照', desc: '按 Command+Shift+S，或点击终端标签栏中的相机图标保存当前终端输出。快照会保存为干净文本。' },
          manage: { label: '管理快照', desc: '点击相机徽章打开快照面板。可双击重命名快照、复制内容或删除。' },
          compare: { label: '比较输出', desc: '在快照面板中点击比较按钮并选择两个快照。并排差异查看器会显示新增、移除和未变化的行。' },
          search: { label: '在终端中搜索', desc: '按 Command+F 打开搜索栏。支持区分大小写、正则表达式和全词匹配。使用 Enter 和 Shift+Enter 导航匹配项。' }
        } },
        files: { title: '文件', steps: {
          browse: { label: '浏览项目', desc: '项目处于活动状态时，打开侧边栏中的“文件”标签。点击文件夹名称可浏览目录。' },
          view: { label: '查看文件', desc: '点击任意文件即可在主面板中以语法高亮打开。大文件会截断显示，超大文件可改为在 Finder 中显示。' },
          edit: { label: '带代码配色编辑', desc: '可编辑文件在输入时会保持语法配色、行号和代码编辑器布局，而不是退回纯文本。' }
        } },
        aiProviders: { title: 'AI 提供商', steps: {
          supported: { label: '支持的提供商', desc: 'OpenAI、Anthropic、Google Gemini、OpenRouter、Groq、Mistral、Together.ai、Fireworks.ai、xAI（Grok）、DeepSeek，以及任何 OpenAI 兼容端点。' },
          local: { label: '本地模型', desc: '连接到本机运行的 Ollama 或 LM Studio。不需要 API 密钥，数据不会离开你的机器。' },
          configure: { label: '配置和测试', desc: '打开设置，启用提供商，粘贴 API 密钥，然后点击测试连接。将一个提供商设为所有 AI 功能的活动提供商。' },
          routing: { label: '路由和备用链', desc: '设置主要 AI 提供商和可选备用项。如果主要提供商失败，请求会自动尝试备用列表中的下一个。' },
          privacy: { label: '隐私', desc: 'API 密钥存储在你的本机。除直接发送给你选择的提供商外，不会发送遥测或数据。' }
        } },
        settings: { title: '设置', steps: {
          themes: { label: '主题', desc: '从标题栏齿轮图标打开设置。可在 8 个主题中选择：Void、Ember、Dusk、Forest、Chalk、Latte、Sage 或 Mist。' },
          terminalInput: { label: '终端输入', desc: '根据你想直接操作还是更受引导，选择经典 shell 输入或编辑器提示模式。' },
          safePaste: { label: '安全粘贴模式', desc: '启用后，将多行文本粘贴进终端会显示确认对话框，以防意外执行危险命令。' },
          logs: { label: '日志存储', desc: '控制终端会话是否自动保存，选择基础日志文件夹，并从设置或项目中管理日志保留。' },
          updates: { label: '应用更新', desc: '配置后，TerminallySKILL 会在启动时检查更新。更新会自动下载并应用。' },
          backup: { label: '备份和恢复', desc: '将应用数据（包括项目、脚本、片段和设置）备份到你选择的目录。' },
          tooltips: { label: '帮助提示', desc: '开启或关闭丰富帮助提示。启用后，悬停在按钮上会显示说明和键盘快捷键。' }
        } },
        remoteDesktop: { title: '远程桌面（VNC）', steps: {
          overview: { label: '工作方式', desc: 'TerminallySKILL 会打开到服务器的 SSH 隧道，并桥接到本地 WebSocket。连接端到端加密，除 SSH 外无需开放端口。' },
          open: { label: '打开 VNC 标签', desc: '在 SSH 项目活动时，点击终端标签栏中的显示器图标。VNC 标签会打开并自动连接。' },
          installTiger: { label: '安装 TigerVNC', desc: '在远程机器上运行：apt update && apt install -y tigervnc-standalone-server。然后用 vncpasswd 设置 VNC 密码。' },
          installDesktop: { label: '安装桌面环境', desc: 'VNC 需要 GUI 会话才能显示。使用 apt install xfce4 xfce4-goodies -y 安装 XFCE4。' },
          configureStartup: { label: '配置 VNC 启动项', desc: '让 VNC 启动 XFCE4：创建 ~/.vnc/xstartup，内容包含 #!/bin/sh、unset SESSION_MANAGER、unset DBUS_SESSION_BUS_ADDRESS、exec startxfce4，然后 chmod +x ~/.vnc/xstartup。' },
          start: { label: '启动 VNC 服务器', desc: '运行 vncserver :1 -geometry 1920x1080 -depth 24。如果立即崩溃，请检查 ~/.vnc/<hostname>:1.log 中的错误。' },
          check: { label: '检查服务器', desc: '在 SSH 标签中运行 ss -tlnp | grep 5901，确认 VNC 服务器正在监听后再连接。' },
          ports: { label: '显示编号和端口', desc: '显示 :0 = 端口 5900，:1 = 端口 5901，依此类推。VNC 按钮默认连接到端口 5901。' },
          password: { label: 'VNC 密码', desc: '如果远程 VNC 服务器需要密码，应用中会出现安全提示。无论如何，连接本身都会通过 SSH 加密。' }
        } },
        keyboard: { title: '键盘快捷键', steps: {
          terminal: { label: 'Command+/', desc: '切换终端面板。没有终端时会打开终端；已有终端时会隐藏或显示。' },
          palette: { label: 'Command+K', desc: '打开命令面板，快速访问任意操作、命令、脚本或片段。' },
          projectSwitcher: { label: 'Command+P', desc: '打开项目切换器，不用鼠标即可搜索和切换项目。' },
          splitVertical: { label: 'Command+D', desc: '垂直并排分屏终端。' },
          splitHorizontal: { label: 'Command+Shift+D', desc: '水平上下分屏终端。' },
          focusPane: { label: 'Command+] / Command+[', desc: '在分屏终端窗格之间切换焦点。' },
          terminalSearch: { label: 'Command+F', desc: '在活动终端中打开搜索栏。' },
          findFiles: { label: 'Command+Shift+F', desc: '打开“在文件中查找”，搜索活动项目目录中的所有文件。' },
          closeFile: { label: 'Command+W', desc: '关闭编辑器中的活动文件标签；如有未保存更改，会提示确认。' },
          snapshot: { label: 'Command+Shift+S', desc: '捕获活动终端输出的快照。' },
          help: { label: 'Command+I', desc: '打开此帮助指南。' },
          newTerminal: { label: 'Command+T', desc: '打开新的终端标签。' }
        } }
      }
    }
  },
  'ja-JP': {
    common: {
      actions: { apply: '適用', browse: '参照', cancel: 'キャンセル', close: '閉じる', delete: '削除', reset: 'リセット', save: '保存' },
      states: { loading: 'TerminallySKILL を読み込み中...', system: 'システム既定', reactRenderError: 'React レンダリングエラー', tryAgain: '再試行', startupFailed: '起動に失敗しました' }
    },
    settings: {
      title: '設定',
      tabs: { general: '一般', data: 'データ', ai: 'AI', logs: 'ログ', appearance: 'テーマ', about: '情報' },
      general: { title: '一般', helpTooltips: { title: 'ヘルプツールチップ' }, startupBehavior: { title: '起動時の動作', options: { dashboard: { label: 'ダッシュボードを表示' }, lastProject: { label: '最後のプロジェクトを再開' } } }, terminalInput: { title: 'ターミナル入力', modes: { classic: { label: 'クラシック' }, editor: { label: 'エディタープロンプト' } } }, safePaste: { title: '安全貼り付けモード' }, resetCommandTrees: { title: 'コマンドツリーをリセット' } },
      locale: { title: '言語と地域', uiLanguage: 'UI 言語', formatLocale: '形式', aiLanguage: 'AI 応答', appLanguage: 'アプリの言語と同じ', launchTier: { P0: 'リリース', P1: '次候補', P2: '監視' } },
      logs: { title: 'ログ', saveTerminalLogs: 'ターミナルログを保存', storageFolder: 'ログ保存フォルダー', defaultFolder: '既定（アプリデータフォルダー）', reset: 'リセット', browse: '参照' },
      appearance: { title: 'テーマ', darkThemes: 'ダークテーマ', lightThemes: 'ライトテーマ' },
      data: { title: 'データ', storageTitle: 'データ保存先', folderLabel: 'データフォルダー', loading: '読み込み中...', customLocationActive: 'カスタム保存先が有効です', moving: '移動中...', moveFolder: 'データフォルダーを移動', openFolder: 'フォルダーを開く', resetToDefault: '既定に戻す', backupsTitle: 'バックアップ', backupFolder: 'バックアップフォルダー', notConfigured: '未設定', noBackup: 'まだバックアップはありません', useICloud: 'iCloud Drive を使用', backingUp: 'バックアップ中', backUpNow: '今すぐバックアップ' },
      about: { title: '情報', updatesTitle: 'アプリの更新', checkOnStartup: '起動時に更新を確認', checking: '確認中', checkForUpdates: '更新を確認', downloadInstall: '更新をダウンロードしてインストール', downloadOpen: '更新をダウンロードして開く', installing: '更新をインストール中', opening: '更新を開いています', current: '現在', latest: '最新', noReleaseFound: 'リリースが見つかりません', resolvedFeed: '解決済みフィード', asset: 'アセット', published: '公開日', releaseNotes: 'リリースノート', support: 'サポート', buyCoffee: 'コーヒーを贈る' },
      ai: { title: 'AI プロバイダー', addProvider: 'プロバイダーを追加', emptyTitle: '接続済みプロバイダーはありません', routingTitle: 'AI ルーティング', primaryProvider: '主要プロバイダー', selectProvider: 'プロバイダーを選択', primaryModel: '主要モデル', fallbackChain: 'フォールバックチェーン', add: '追加', active: '有効', loadingModels: 'モデルを読み込み中', refreshModels: 'モデルを更新', testing: 'テスト中', test: 'テスト', disconnect: '切断', connectionPassed: '接続テストに成功しました', connectionFailed: '接続に失敗しました', connectionType: '接続タイプ', apiKey: 'API キー', baseUrl: 'ベース URL', localBaseUrl: 'ローカルベース URL', availableModels: '利用可能なモデル', synced: '同期済み', providerDefaultModel: 'プロバイダーの既定モデル', pickerTitle: 'AI プロバイダーを追加', configure: '設定', connect: '接続', getApiKey: 'API キーを取得', connection: { apiKey: 'API キー', local: 'ローカル' }, status: { notConnected: '未接続', available: '追加できます', needsAttention: '確認が必要', testFailed: '前回の接続テストに失敗しました', missingDetails: '詳細が不足しています', completeFields: '接続フィールドを入力してください', active: '有効', activeDetail: 'AI レビューとドラフトに使用', connected: '接続済み', backupReady: 'バックアップまたは代替プロバイダーとして使用可能' }, connectionHelp: { local: 'このマシン上のローカルランタイム', apiKey: 'API キー接続' } },
      toggle: { off: 'オフ', on: 'オン' }
    },
    scripts: { runner: { errors: { terminalClosed: 'ワークフローが完了する前にターミナルセッションが閉じられました。', cancelled: 'ワークフローはキャンセルされました。', stepFailed: '{{label}} は終了コード {{code}} で失敗しました。', stepFailedRetrying: '{{label}} は終了コード {{code}} で失敗しました。再試行します。', stepFailedContinuing: '{{label}} は終了コード {{code}} で失敗しました。エラー時続行が有効なため続行します。' } } },
    snippets: { help: { examples: '例:' } },
    terminal: {
      panel: { latestOutput: '最新出力' },
      editorPrompt: { sources: { history: '履歴', command: 'コマンド', directory: 'ディレクトリ' } },
      secureInput: { prompts: { sudoPassword: 'sudo パスワードプロンプト', password: 'パスワードプロンプト', passphrase: 'パスフレーズプロンプト', pin: 'PIN プロンプト', verificationCode: '確認コードプロンプト', token: 'トークンプロンプト', apiKey: 'API キープロンプト' } },
      safePaste: { reasons: { multiLine_one: '複数行の貼り付け（{{count}} 行）', multiLine_other: '複数行の貼り付け（{{count}} 行）', largePayload: '大きな貼り付け内容', controlCharacters: '制御文字を検出', dangerousCommand: '危険な可能性のある shell コマンド' } },
      close: { confirm: 'このターミナルを閉じますか？\n\n{{reasons}}', workflowRunning: 'ワークフロー "{{name}}" はまだ実行中です。', shellExecuting: 'このターミナルはまだコマンドを実行中です。', unknownScript: '不明なスクリプト' }
    }
  },
  'ru-RU': {
    common: {
      actions: { apply: 'Применить', browse: 'Обзор', cancel: 'Отмена', close: 'Закрыть', delete: 'Удалить', reset: 'Сбросить', save: 'Сохранить' },
      states: { loading: 'Загрузка TerminallySKILL...', system: 'По умолчанию системы', reactRenderError: 'Ошибка рендеринга React', tryAgain: 'Повторить', startupFailed: 'Не удалось запустить' }
    },
    settings: {
      title: 'Настройки',
      tabs: { general: 'Общие', data: 'Данные', ai: 'ИИ', logs: 'Логи', appearance: 'Тема', about: 'О приложении' },
      general: { title: 'Общие', helpTooltips: { title: 'Подсказки' }, startupBehavior: { title: 'Поведение при запуске', options: { dashboard: { label: 'Показывать панель' }, lastProject: { label: 'Продолжить последний проект' } } }, terminalInput: { title: 'Ввод терминала', modes: { classic: { label: 'Классический' }, editor: { label: 'Редакторская строка' } } }, safePaste: { title: 'Безопасная вставка' }, resetCommandTrees: { title: 'Сбросить деревья команд' } },
      locale: { title: 'Язык и регион', uiLanguage: 'Язык интерфейса', formatLocale: 'Форматы', aiLanguage: 'Ответы ИИ', appLanguage: 'Как язык приложения', launchTier: { P0: 'Запуск', P1: 'Следующие', P2: 'Наблюдение' } },
      logs: { title: 'Логи', saveTerminalLogs: 'Сохранять логи терминала', storageFolder: 'Папка логов', defaultFolder: 'По умолчанию (папка данных приложения)', reset: 'Сбросить', browse: 'Обзор' },
      appearance: { title: 'Тема', darkThemes: 'Темные темы', lightThemes: 'Светлые темы' },
      data: { title: 'Данные', storageTitle: 'Хранилище данных', folderLabel: 'Папка данных', loading: 'Загрузка...', customLocationActive: 'Пользовательское расположение активно', moving: 'Перемещение...', moveFolder: 'Переместить папку данных', openFolder: 'Открыть папку', resetToDefault: 'Вернуть по умолчанию', backupsTitle: 'Резервные копии', backupFolder: 'Папка резервных копий', notConfigured: 'Еще не настроено', noBackup: 'Резервных копий пока нет', useICloud: 'Использовать iCloud Drive', backingUp: 'Создание копии', backUpNow: 'Создать копию сейчас' },
      about: { title: 'О приложении', updatesTitle: 'Обновления приложения', checkOnStartup: 'Проверять обновления при запуске', checking: 'Проверка', checkForUpdates: 'Проверить обновления', downloadInstall: 'Скачать и установить обновление', downloadOpen: 'Скачать и открыть обновление', installing: 'Установка обновления', opening: 'Открытие обновления', current: 'Текущая', latest: 'Последняя', noReleaseFound: 'Релиз не найден', resolvedFeed: 'Найденный канал', asset: 'Файл', published: 'Опубликовано', releaseNotes: 'Примечания к выпуску', support: 'Поддержка', buyCoffee: 'Угостить кофе' },
      ai: { title: 'Провайдеры ИИ', addProvider: 'Добавить провайдера', emptyTitle: 'Провайдеры еще не подключены', routingTitle: 'Маршрутизация ИИ', primaryProvider: 'Основной провайдер', selectProvider: 'Выбрать провайдера', primaryModel: 'Основная модель', fallbackChain: 'Цепочка резервов', add: 'Добавить', active: 'Активно', loadingModels: 'Загрузка моделей', refreshModels: 'Обновить модели', testing: 'Проверка', test: 'Тест', disconnect: 'Отключить', connectionPassed: 'Проверка подключения пройдена', connectionFailed: 'Подключение не удалось', connectionType: 'Тип подключения', apiKey: 'API-ключ', baseUrl: 'Базовый URL', localBaseUrl: 'Локальный базовый URL', availableModels: 'Доступные модели', synced: 'Синхронизировано', providerDefaultModel: 'Модель провайдера по умолчанию', pickerTitle: 'Добавить провайдера ИИ', configure: 'Настроить', connect: 'Подключить', getApiKey: 'Получить API-ключ', connection: { apiKey: 'API-ключ', local: 'Локально' }, status: { notConnected: 'Не подключено', available: 'Доступно для добавления', needsAttention: 'Требует внимания', testFailed: 'Последняя проверка подключения не прошла', missingDetails: 'Не хватает данных', completeFields: 'Заполните поля подключения', active: 'Активно', activeDetail: 'Используется для ИИ-ревью и черновиков', connected: 'Подключено', backupReady: 'Готово как резервный или альтернативный провайдер' }, connectionHelp: { local: 'Локальная среда на вашем компьютере', apiKey: 'Подключение по API-ключу' } },
      toggle: { off: 'Выкл.', on: 'Вкл.' }
    },
    scripts: { runner: { errors: { terminalClosed: 'Сеанс терминала был закрыт до завершения workflow.', cancelled: 'Workflow отменен.', stepFailed: '{{label}} завершился с кодом {{code}}.', stepFailedRetrying: '{{label}} завершился с кодом {{code}}. Повторная попытка.', stepFailedContinuing: '{{label}} завершился с кодом {{code}}. Продолжаем, потому что включено продолжение при ошибке.' } } },
    snippets: { help: { examples: 'Примеры:' } },
    terminal: {
      panel: { latestOutput: 'Последний вывод' },
      editorPrompt: { sources: { history: 'История', command: 'Команда', directory: 'Каталог' } },
      secureInput: { prompts: { sudoPassword: 'Запрос пароля sudo', password: 'Запрос пароля', passphrase: 'Запрос парольной фразы', pin: 'Запрос PIN', verificationCode: 'Запрос кода подтверждения', token: 'Запрос токена', apiKey: 'Запрос API-ключа' } },
      safePaste: { reasons: { multiLine_one: 'многострочная вставка ({{count}} строка)', multiLine_other: 'многострочная вставка ({{count}} строк)', largePayload: 'большой вставленный фрагмент', controlCharacters: 'обнаружены управляющие символы', dangerousCommand: 'потенциально опасная shell-команда' } },
      close: { confirm: 'Все равно закрыть этот терминал?\n\n{{reasons}}', workflowRunning: 'Workflow "{{name}}" еще выполняется.', shellExecuting: 'Этот терминал еще выполняет команду.', unknownScript: 'Неизвестный скрипт' }
    }
  },
  'pl-PL': {
    common: {
      actions: { apply: 'Zastosuj', browse: 'Przeglądaj', cancel: 'Anuluj', close: 'Zamknij', delete: 'Usuń', reset: 'Resetuj', save: 'Zapisz' },
      states: { loading: 'Ładowanie TerminallySKILL...', system: 'Domyślne systemu', reactRenderError: 'Błąd renderowania React', tryAgain: 'Spróbuj ponownie', startupFailed: 'Uruchomienie nie powiodło się' }
    },
    settings: {
      title: 'Ustawienia',
      tabs: { general: 'Ogólne', data: 'Dane', ai: 'AI', logs: 'Logi', appearance: 'Motyw', about: 'O aplikacji' },
      general: { title: 'Ogólne', helpTooltips: { title: 'Podpowiedzi pomocy' }, startupBehavior: { title: 'Zachowanie przy starcie', options: { dashboard: { label: 'Pokaż pulpit' }, lastProject: { label: 'Wznów ostatni projekt' } } }, terminalInput: { title: 'Wprowadzanie w terminalu', modes: { classic: { label: 'Klasyczne' }, editor: { label: 'Prompt edytora' } } }, safePaste: { title: 'Tryb bezpiecznego wklejania' }, resetCommandTrees: { title: 'Resetuj drzewa poleceń' } },
      locale: { title: 'Język i region', uiLanguage: 'Język interfejsu', formatLocale: 'Formaty', aiLanguage: 'Odpowiedzi AI', appLanguage: 'Tak jak język aplikacji', launchTier: { P0: 'Start', P1: 'Następne', P2: 'Obserwowane' } },
      logs: { title: 'Logi', saveTerminalLogs: 'Zapisuj logi terminala', storageFolder: 'Folder logów', defaultFolder: 'Domyślnie (folder danych aplikacji)', reset: 'Resetuj', browse: 'Przeglądaj' },
      appearance: { title: 'Motyw', darkThemes: 'Ciemne motywy', lightThemes: 'Jasne motywy' },
      data: { title: 'Dane', storageTitle: 'Przechowywanie danych', folderLabel: 'Folder danych', loading: 'Ładowanie...', customLocationActive: 'Własna lokalizacja aktywna', moving: 'Przenoszenie...', moveFolder: 'Przenieś folder danych', openFolder: 'Otwórz folder', resetToDefault: 'Przywróć domyślne', backupsTitle: 'Kopie zapasowe', backupFolder: 'Folder kopii', notConfigured: 'Jeszcze nieskonfigurowane', noBackup: 'Nie utworzono jeszcze kopii', useICloud: 'Użyj iCloud Drive', backingUp: 'Tworzenie kopii', backUpNow: 'Utwórz kopię teraz' },
      about: { title: 'O aplikacji', updatesTitle: 'Aktualizacje aplikacji', checkOnStartup: 'Sprawdzaj aktualizacje przy starcie', checking: 'Sprawdzanie', checkForUpdates: 'Sprawdź aktualizacje', downloadInstall: 'Pobierz i zainstaluj aktualizację', downloadOpen: 'Pobierz i otwórz aktualizację', installing: 'Instalowanie aktualizacji', opening: 'Otwieranie aktualizacji', current: 'Bieżąca', latest: 'Najnowsza', noReleaseFound: 'Nie znaleziono wydania', resolvedFeed: 'Rozpoznany kanał', asset: 'Plik', published: 'Opublikowano', releaseNotes: 'Informacje o wydaniu', support: 'Wsparcie', buyCoffee: 'Postaw mi kawę' },
      ai: { title: 'Dostawcy AI', addProvider: 'Dodaj dostawcę', emptyTitle: 'Nie podłączono jeszcze dostawców', routingTitle: 'Routing AI', primaryProvider: 'Główny dostawca', selectProvider: 'Wybierz dostawcę', primaryModel: 'Główny model', fallbackChain: 'Łańcuch awaryjny', add: 'Dodaj', active: 'Aktywny', loadingModels: 'Ładowanie modeli', refreshModels: 'Odśwież modele', testing: 'Testowanie', test: 'Test', disconnect: 'Rozłącz', connectionPassed: 'Test połączenia powiódł się', connectionFailed: 'Połączenie nie powiodło się', connectionType: 'Typ połączenia', apiKey: 'Klucz API', baseUrl: 'Bazowy URL', localBaseUrl: 'Lokalny bazowy URL', availableModels: 'Dostępne modele', synced: 'Zsynchronizowano', providerDefaultModel: 'Domyślny model dostawcy', pickerTitle: 'Dodaj dostawcę AI', configure: 'Konfiguruj', connect: 'Połącz', getApiKey: 'Pobierz klucz API', connection: { apiKey: 'Klucz API', local: 'Lokalne' }, status: { notConnected: 'Nie połączono', available: 'Dostępne do dodania', needsAttention: 'Wymaga uwagi', testFailed: 'Ostatni test połączenia nie powiódł się', missingDetails: 'Brak szczegółów', completeFields: 'Uzupełnij pola połączenia', active: 'Aktywny', activeDetail: 'Używany do recenzji i szkiców AI', connected: 'Połączono', backupReady: 'Gotowe jako zapasowy lub alternatywny dostawca' }, connectionHelp: { local: 'Lokalne środowisko na twoim komputerze', apiKey: 'Połączenie przez klucz API' } },
      toggle: { off: 'Wył.', on: 'Wł.' }
    },
    scripts: { runner: { errors: { terminalClosed: 'Sesja terminala została zamknięta przed ukończeniem workflow.', cancelled: 'Workflow anulowany.', stepFailed: '{{label}} zakończył się kodem {{code}}.', stepFailedRetrying: '{{label}} zakończył się kodem {{code}}. Ponawianie.', stepFailedContinuing: '{{label}} zakończył się kodem {{code}}. Kontynuacja, bo włączono kontynuowanie po błędzie.' } } },
    snippets: { help: { examples: 'Przykłady:' } },
    terminal: {
      panel: { latestOutput: 'Najnowsze wyjście' },
      editorPrompt: { sources: { history: 'Historia', command: 'Polecenie', directory: 'Katalog' } },
      secureInput: { prompts: { sudoPassword: 'Monit hasła sudo', password: 'Monit hasła', passphrase: 'Monit frazy hasła', pin: 'Monit PIN', verificationCode: 'Monit kodu weryfikacyjnego', token: 'Monit tokenu', apiKey: 'Monit klucza API' } },
      safePaste: { reasons: { multiLine_one: 'wklejanie wielowierszowe ({{count}} wiersz)', multiLine_other: 'wklejanie wielowierszowe ({{count}} wierszy)', largePayload: 'duża wklejana treść', controlCharacters: 'wykryto znaki sterujące', dangerousCommand: 'potencjalnie niebezpieczne polecenie shell' } },
      close: { confirm: 'Zamknąć ten terminal mimo to?\n\n{{reasons}}', workflowRunning: 'Workflow "{{name}}" nadal działa.', shellExecuting: 'Ten terminal nadal wykonuje polecenie.', unknownScript: 'Nieznany skrypt' }
    }
  },
  'it-IT': {
    common: {
      actions: { apply: 'Applica', browse: 'Sfoglia', cancel: 'Annulla', close: 'Chiudi', delete: 'Elimina', reset: 'Reimposta', save: 'Salva' },
      states: { loading: 'Caricamento di TerminallySKILL...', system: 'Predefinito di sistema', reactRenderError: 'Errore di rendering React', tryAgain: 'Riprova', startupFailed: 'Avvio non riuscito' }
    },
    settings: {
      title: 'Impostazioni',
      tabs: { general: 'Generale', data: 'Dati', ai: 'IA', logs: 'Log', appearance: 'Tema', about: 'Informazioni' },
      general: { title: 'Generale', helpTooltips: { title: 'Tooltip di aiuto' }, startupBehavior: { title: 'Comportamento all’avvio', options: { dashboard: { label: 'Mostra dashboard' }, lastProject: { label: 'Riprendi ultimo progetto' } } }, terminalInput: { title: 'Input del terminale', modes: { classic: { label: 'Classico' }, editor: { label: 'Prompt editor' } } }, safePaste: { title: 'Modalità incolla sicura' }, resetCommandTrees: { title: 'Reimposta alberi dei comandi' } },
      locale: { title: 'Lingua e area', uiLanguage: 'Lingua dell’interfaccia', formatLocale: 'Formati', aiLanguage: 'Risposte IA', appLanguage: 'Come la lingua dell’app', launchTier: { P0: 'Lancio', P1: 'Successivo', P2: 'Osservazione' } },
      logs: { title: 'Log', saveTerminalLogs: 'Salva log del terminale', storageFolder: 'Cartella log', defaultFolder: 'Predefinita (cartella dati app)', reset: 'Reimposta', browse: 'Sfoglia' },
      appearance: { title: 'Tema', darkThemes: 'Temi scuri', lightThemes: 'Temi chiari' },
      data: { title: 'Dati', storageTitle: 'Archiviazione dati', folderLabel: 'Cartella dati', loading: 'Caricamento...', customLocationActive: 'Percorso personalizzato attivo', moving: 'Spostamento...', moveFolder: 'Sposta cartella dati', openFolder: 'Apri cartella', resetToDefault: 'Ripristina predefinito', backupsTitle: 'Backup', backupFolder: 'Cartella backup', notConfigured: 'Non ancora configurato', noBackup: 'Nessun backup creato', useICloud: 'Usa iCloud Drive', backingUp: 'Backup in corso', backUpNow: 'Esegui backup ora' },
      about: { title: 'Informazioni', updatesTitle: 'Aggiornamenti app', checkOnStartup: 'Controlla aggiornamenti all’avvio', checking: 'Controllo', checkForUpdates: 'Controlla aggiornamenti', downloadInstall: 'Scarica e installa aggiornamento', downloadOpen: 'Scarica e apri aggiornamento', installing: 'Installazione aggiornamento', opening: 'Apertura aggiornamento', current: 'Corrente', latest: 'Più recente', noReleaseFound: 'Nessuna release trovata', resolvedFeed: 'Feed risolto', asset: 'Asset', published: 'Pubblicato', releaseNotes: 'Note di rilascio', support: 'Supporto', buyCoffee: 'Offrimi un caffè' },
      ai: { title: 'Provider IA', addProvider: 'Aggiungi provider', emptyTitle: 'Nessun provider collegato', routingTitle: 'Routing IA', primaryProvider: 'Provider principale', selectProvider: 'Seleziona provider', primaryModel: 'Modello principale', fallbackChain: 'Catena di fallback', add: 'Aggiungi', active: 'Attivo', loadingModels: 'Caricamento modelli', refreshModels: 'Aggiorna modelli', testing: 'Test in corso', test: 'Test', disconnect: 'Disconnetti', connectionPassed: 'Test connessione riuscito', connectionFailed: 'Connessione non riuscita', connectionType: 'Tipo connessione', apiKey: 'Chiave API', baseUrl: 'URL base', localBaseUrl: 'URL base locale', availableModels: 'Modelli disponibili', synced: 'Sincronizzato', providerDefaultModel: 'Modello predefinito del provider', pickerTitle: 'Aggiungi provider IA', configure: 'Configura', connect: 'Connetti', getApiKey: 'Ottieni chiave API', connection: { apiKey: 'Chiave API', local: 'Locale' }, status: { notConnected: 'Non connesso', available: 'Disponibile da aggiungere', needsAttention: 'Richiede attenzione', testFailed: 'Ultimo test connessione fallito', missingDetails: 'Dettagli mancanti', completeFields: 'Completa i campi di connessione', active: 'Attivo', activeDetail: 'Usato per revisioni e bozze IA', connected: 'Connesso', backupReady: 'Pronto come backup o provider alternativo' }, connectionHelp: { local: 'Runtime locale sul tuo computer', apiKey: 'Connessione con chiave API' } },
      toggle: { off: 'Disattivato', on: 'Attivato' }
    },
    scripts: { runner: { errors: { terminalClosed: 'La sessione del terminale è stata chiusa prima del completamento del workflow.', cancelled: 'Workflow annullato.', stepFailed: '{{label}} non riuscito con codice di uscita {{code}}.', stepFailedRetrying: '{{label}} non riuscito con codice di uscita {{code}}. Nuovo tentativo.', stepFailedContinuing: '{{label}} non riuscito con codice di uscita {{code}}. Continuo perché è abilitata la prosecuzione in caso di errore.' } } },
    snippets: { help: { examples: 'Esempi:' } },
    terminal: {
      panel: { latestOutput: 'Output più recente' },
      editorPrompt: { sources: { history: 'Cronologia', command: 'Comando', directory: 'Directory' } },
      secureInput: { prompts: { sudoPassword: 'Prompt password sudo', password: 'Prompt password', passphrase: 'Prompt passphrase', pin: 'Prompt PIN', verificationCode: 'Prompt codice di verifica', token: 'Prompt token', apiKey: 'Prompt chiave API' } },
      safePaste: { reasons: { multiLine_one: 'incolla multi-riga ({{count}} riga)', multiLine_other: 'incolla multi-riga ({{count}} righe)', largePayload: 'contenuto incollato grande', controlCharacters: 'caratteri di controllo rilevati', dangerousCommand: 'comando shell potenzialmente pericoloso' } },
      close: { confirm: 'Chiudere comunque questo terminale?\n\n{{reasons}}', workflowRunning: 'Il workflow "{{name}}" è ancora in esecuzione.', shellExecuting: 'Questo terminale sta ancora eseguendo un comando.', unknownScript: 'Script sconosciuto' }
    }
  }
}

const launchChromeOverrides: Record<string, Partial<LocaleResource>> = {
  'fr-FR': {
    dashboard: {
      quickActions: { newTerminal: 'Nouveau terminal', noRecentScripts: 'Aucun script recent', openFolder: 'Ouvrir le dossier' },
      sections: { recentRuns: 'Executions recentes', scripts: 'Scripts', recentCommands: 'Commandes recentes' },
      empty: { title: 'Pret', description: 'Ouvrez un terminal, lancez un script ou choisissez une commande dans la barre laterale.' }
    },
    layout: {
      sidebar: { tabs: { commands: 'Commandes', scripts: 'Scripts', snippets: 'Snippets', files: 'Fichiers', logs: 'Journaux', search: 'Recherche' } },
      empty: {
        title: 'Premiers pas',
        description: 'Creez un projet pour definir votre workspace et epingler vos commandes favorites',
        createProject: 'Creer un projet',
        howItWorks: 'Comment ca marche'
      }
    },
    projects: { selector: { none: 'Aucun projet', searchPlaceholder: 'Rechercher des projets...', empty: 'Aucun projet pour le moment. Creez-en un pour commencer.', noMatches: 'Aucun projet correspondant', edit: 'Modifier le projet', newProject: 'Nouveau projet' } },
    scripts: {
      actions: { addScript: 'Ajouter un script', newScript: 'Nouveau script', create: 'Creer', cancel: 'Annuler' },
      empty: { projectTitle: 'Aucun script ajoute a ce projet', projectDescription: 'Ajoutez des scripts existants ou creez-en de nouveaux', globalTitle: 'Aucun script pour le moment', globalDescription: 'Creez-en un ou ajoutez des commandes depuis le builder' }
    },
    terminal: { panel: { noSessions: 'Aucune session de terminal. Cliquez sur + ou executez une commande.' } }
  },
  es: {
    dashboard: {
      quickActions: { newTerminal: 'Nueva terminal', noRecentScripts: 'Sin scripts recientes', openFolder: 'Abrir carpeta' },
      sections: { recentRuns: 'Ejecuciones recientes', scripts: 'Scripts', recentCommands: 'Comandos recientes' },
      empty: { title: 'Listo', description: 'Abre una terminal, ejecuta un script o elige un comando en la barra lateral.' }
    },
    layout: {
      sidebar: { tabs: { commands: 'Comandos', scripts: 'Scripts', snippets: 'Fragmentos', files: 'Archivos', logs: 'Registros', search: 'Buscar' } },
      empty: {
        title: 'Primeros pasos',
        description: 'Crea un proyecto para fijar tu workspace y anclar comandos favoritos',
        createProject: 'Crear proyecto',
        howItWorks: 'Como funciona'
      }
    },
    projects: { selector: { none: 'Sin proyecto', searchPlaceholder: 'Buscar proyectos...', empty: 'Aun no hay proyectos. Crea uno para empezar.', noMatches: 'No hay proyectos coincidentes', edit: 'Editar proyecto', newProject: 'Nuevo proyecto' } },
    scripts: {
      actions: { addScript: 'Agregar script', newScript: 'Nuevo script', create: 'Crear', cancel: 'Cancelar' },
      empty: { projectTitle: 'No hay scripts en este proyecto', projectDescription: 'Agrega scripts existentes o crea nuevos', globalTitle: 'Aun no hay scripts', globalDescription: 'Crea uno o agrega comandos desde el builder' }
    },
    terminal: { panel: { noSessions: 'No hay sesiones de terminal. Haz clic en + o ejecuta un comando.' } }
  },
  'pt-BR': {
    dashboard: {
      quickActions: { newTerminal: 'Novo terminal', noRecentScripts: 'Sem scripts recentes', openFolder: 'Abrir pasta' },
      sections: { recentRuns: 'Execucoes recentes', scripts: 'Scripts', recentCommands: 'Comandos recentes' },
      empty: { title: 'Pronto', description: 'Abra um terminal, execute um script ou escolha um comando na barra lateral.' }
    },
    layout: {
      sidebar: { tabs: { commands: 'Comandos', scripts: 'Scripts', snippets: 'Snippets', files: 'Arquivos', logs: 'Logs', search: 'Buscar' } },
      empty: {
        title: 'Primeiros passos',
        description: 'Crie um projeto para definir seu workspace e fixar comandos favoritos',
        createProject: 'Criar projeto',
        howItWorks: 'Como funciona'
      }
    },
    projects: { selector: { none: 'Sem projeto', searchPlaceholder: 'Buscar projetos...', empty: 'Ainda nao ha projetos. Crie um para comecar.', noMatches: 'Nenhum projeto correspondente', edit: 'Editar projeto', newProject: 'Novo projeto' } },
    scripts: {
      actions: { addScript: 'Adicionar script', newScript: 'Novo script', create: 'Criar', cancel: 'Cancelar' },
      empty: { projectTitle: 'Nenhum script adicionado a este projeto', projectDescription: 'Adicione scripts existentes ou crie novos', globalTitle: 'Ainda nao ha scripts', globalDescription: 'Crie um ou adicione comandos pelo builder' }
    },
    terminal: { panel: { noSessions: 'Nenhuma sessao de terminal. Clique em + ou execute um comando.' } }
  },
  'zh-Hans': {
    dashboard: {
      quickActions: { newTerminal: '新建终端', noRecentScripts: '没有最近脚本', openFolder: '打开文件夹' },
      sections: { recentRuns: '最近运行', scripts: '脚本', recentCommands: '最近命令' },
      empty: { title: '准备就绪', description: '打开终端、运行脚本，或从侧边栏选择命令。' }
    },
    layout: {
      sidebar: { tabs: { commands: '命令', scripts: '脚本', snippets: '片段', files: '文件', logs: '日志', search: '搜索' } },
      empty: { title: '开始使用', description: '创建项目以设置工作区目标并固定常用命令', createProject: '创建项目', howItWorks: '工作方式' }
    },
    projects: { selector: { none: '无项目', searchPlaceholder: '搜索项目...', empty: '还没有项目。创建一个即可开始。', noMatches: '没有匹配的项目', edit: '编辑项目', newProject: '新建项目' } },
    scripts: {
      actions: { addScript: '添加脚本', newScript: '新建脚本', create: '创建', cancel: '取消' },
      empty: { projectTitle: '此项目尚未添加脚本', projectDescription: '添加现有脚本或创建新脚本', globalTitle: '还没有脚本', globalDescription: '创建一个，或从构建器添加命令' }
    },
    terminal: { panel: { noSessions: '没有终端会话。点击 + 或执行命令。' } }
  },
  'ja-JP': {
    dashboard: {
      quickActions: { newTerminal: '新しいターミナル', noRecentScripts: '最近のスクリプトはありません', openFolder: 'フォルダを開く' },
      sections: { recentRuns: '最近の実行', scripts: 'スクリプト', recentCommands: '最近のコマンド' },
      empty: { title: '準備完了', description: 'ターミナルを開くか、スクリプトを実行するか、サイドバーからコマンドを選択します。' }
    },
    layout: {
      sidebar: { tabs: { commands: 'コマンド', scripts: 'スクリプト', snippets: 'スニペット', files: 'ファイル', logs: 'ログ', search: '検索' } },
      empty: { title: '始める', description: 'プロジェクトを作成してワークスペースを設定し、お気に入りのコマンドを固定します', createProject: 'プロジェクトを作成', howItWorks: '使い方' }
    },
    projects: { selector: { none: 'プロジェクトなし', searchPlaceholder: 'プロジェクトを検索...', empty: 'プロジェクトはまだありません。作成して始めましょう。', noMatches: '一致するプロジェクトはありません', edit: 'プロジェクトを編集', newProject: '新しいプロジェクト' } },
    scripts: {
      actions: { addScript: 'スクリプトを追加', newScript: '新しいスクリプト', create: '作成', cancel: 'キャンセル' },
      empty: { projectTitle: 'このプロジェクトにスクリプトはありません', projectDescription: '既存のスクリプトを追加するか新しく作成します', globalTitle: 'スクリプトはまだありません', globalDescription: '作成するか、ビルダーからコマンドを追加します' }
    },
    terminal: { panel: { noSessions: 'ターミナルセッションはありません。+ をクリックするかコマンドを実行してください。' } }
  },
  'ru-RU': {
    dashboard: {
      quickActions: { newTerminal: 'Новый терминал', noRecentScripts: 'Нет недавних скриптов', openFolder: 'Открыть папку' },
      sections: { recentRuns: 'Недавние запуски', scripts: 'Скрипты', recentCommands: 'Недавние команды' },
      empty: { title: 'Готово', description: 'Откройте терминал, запустите скрипт или выберите команду на боковой панели.' }
    },
    layout: {
      sidebar: { tabs: { commands: 'Команды', scripts: 'Скрипты', snippets: 'Фрагменты', files: 'Файлы', logs: 'Логи', search: 'Поиск' } },
      empty: { title: 'Начало работы', description: 'Создайте проект, чтобы задать workspace и закрепить любимые команды', createProject: 'Создать проект', howItWorks: 'Как это работает' }
    },
    projects: { selector: { none: 'Нет проекта', searchPlaceholder: 'Поиск проектов...', empty: 'Проектов пока нет. Создайте первый, чтобы начать.', noMatches: 'Подходящих проектов нет', edit: 'Редактировать проект', newProject: 'Новый проект' } },
    scripts: {
      actions: { addScript: 'Добавить скрипт', newScript: 'Новый скрипт', create: 'Создать', cancel: 'Отмена' },
      empty: { projectTitle: 'В этом проекте нет скриптов', projectDescription: 'Добавьте существующие скрипты или создайте новые', globalTitle: 'Скриптов пока нет', globalDescription: 'Создайте скрипт или добавьте команды из builder' }
    },
    terminal: { panel: { noSessions: 'Нет сеансов терминала. Нажмите + или выполните команду.' } }
  },
  'pl-PL': {
    dashboard: {
      quickActions: { newTerminal: 'Nowy terminal', noRecentScripts: 'Brak ostatnich skryptow', openFolder: 'Otworz folder' },
      sections: { recentRuns: 'Ostatnie uruchomienia', scripts: 'Skrypty', recentCommands: 'Ostatnie polecenia' },
      empty: { title: 'Gotowe', description: 'Otworz terminal, uruchom skrypt albo wybierz polecenie z paska bocznego.' }
    },
    layout: {
      sidebar: { tabs: { commands: 'Polecenia', scripts: 'Skrypty', snippets: 'Fragmenty', files: 'Pliki', logs: 'Logi', search: 'Szukaj' } },
      empty: { title: 'Pierwsze kroki', description: 'Utworz projekt, aby ustawic workspace i przypiac ulubione polecenia', createProject: 'Utworz projekt', howItWorks: 'Jak to dziala' }
    },
    projects: { selector: { none: 'Brak projektu', searchPlaceholder: 'Szukaj projektow...', empty: 'Nie ma jeszcze projektow. Utworz pierwszy, aby zaczac.', noMatches: 'Brak pasujacych projektow', edit: 'Edytuj projekt', newProject: 'Nowy projekt' } },
    scripts: {
      actions: { addScript: 'Dodaj skrypt', newScript: 'Nowy skrypt', create: 'Utworz', cancel: 'Anuluj' },
      empty: { projectTitle: 'Brak skryptow w tym projekcie', projectDescription: 'Dodaj istniejace skrypty albo utworz nowe', globalTitle: 'Nie ma jeszcze skryptow', globalDescription: 'Utworz skrypt albo dodaj polecenia z buildera' }
    },
    terminal: { panel: { noSessions: 'Brak sesji terminala. Kliknij + albo uruchom polecenie.' } }
  },
  'it-IT': {
    dashboard: {
      quickActions: { newTerminal: 'Nuovo terminale', noRecentScripts: 'Nessuno script recente', openFolder: 'Apri cartella' },
      sections: { recentRuns: 'Esecuzioni recenti', scripts: 'Script', recentCommands: 'Comandi recenti' },
      empty: { title: 'Pronto', description: 'Apri un terminale, esegui uno script o scegli un comando dalla barra laterale.' }
    },
    layout: {
      sidebar: { tabs: { commands: 'Comandi', scripts: 'Script', snippets: 'Snippet', files: 'File', logs: 'Log', search: 'Cerca' } },
      empty: { title: 'Inizia', description: 'Crea un progetto per impostare il workspace e fissare i comandi preferiti', createProject: 'Crea progetto', howItWorks: 'Come funziona' }
    },
    projects: { selector: { none: 'Nessun progetto', searchPlaceholder: 'Cerca progetti...', empty: 'Nessun progetto ancora. Creane uno per iniziare.', noMatches: 'Nessun progetto corrispondente', edit: 'Modifica progetto', newProject: 'Nuovo progetto' } },
    scripts: {
      actions: { addScript: 'Aggiungi script', newScript: 'Nuovo script', create: 'Crea', cancel: 'Annulla' },
      empty: { projectTitle: 'Nessuno script aggiunto a questo progetto', projectDescription: 'Aggiungi script esistenti o creane di nuovi', globalTitle: 'Nessuno script ancora', globalDescription: 'Creane uno o aggiungi comandi dal builder' }
    },
    terminal: { panel: { noSessions: 'Nessuna sessione terminale. Fai clic su + o esegui un comando.' } }
  }
}

const LOCALIZED_FALLBACK_LOCALE_ORDER = [
  'de-DE',
  'fr-FR',
  'es',
  'pt-BR',
  'zh-Hans',
  'zh-Hant',
  'ja-JP',
  'ru-RU',
  'pl-PL',
  'it-IT',
  'ko-KR',
  'nl-NL',
  'uk-UA',
  'id-ID',
  'tr-TR',
  'pt-PT',
  'ar',
  'hi-IN'
] as const

const LOCALIZED_FALLBACK_PHRASES: Array<[string, ...string[]]> = [
  ['Settings', 'Einstellungen', 'Paramètres', 'Configuración', 'Configurações', '设置', '設定', '設定', 'Настройки', 'Ustawienia', 'Impostazioni', '설정', 'Instellingen', 'Налаштування', 'Pengaturan', 'Ayarlar', 'Definições', 'الإعدادات', 'सेटिंग्स'],
  ['General', 'Allgemein', 'Général', 'Generales', 'Geral', '通用', '一般', '一般', 'Общие', 'Ogólne', 'Generale', '일반', 'Algemeen', 'Загальні', 'Umum', 'Genel', 'Geral', 'عام', 'सामान्य'],
  ['Data', 'Daten', 'Données', 'Datos', 'Dados', '数据', '資料', 'データ', 'Данные', 'Dane', 'Dati', '데이터', 'Gegevens', 'Дані', 'Data aplikasi', 'Veri', 'Dados', 'البيانات', 'डेटा'],
  ['Logs', 'Protokolle', 'Journaux', 'Registros', 'Registros', '日志', '日誌', 'ログ', 'Логи', 'Logi', 'Log', '로그', 'Logboeken', 'Логи', 'Catatan', 'Günlükler', 'Registos', 'السجلات', 'लॉग'],
  ['Theme', 'Design', 'Thème', 'Tema', 'Tema', '主题', '主題', 'テーマ', 'Тема', 'Motyw', 'Tema', '테마', 'Thema', 'Тема', 'Tema', 'Tema', 'Tema', 'السمة', 'थीम'],
  ['About', 'Info', 'À propos', 'Acerca de', 'Sobre', '关于', '關於', '情報', 'О приложении', 'O aplikacji', 'Informazioni', '정보', 'Over', 'Про застосунок', 'Tentang', 'Hakkında', 'Sobre', 'حول', 'जानकारी'],
  ['Help Tooltips', 'Hilfetipps', 'Infobulles d’aide', 'Ayudas emergentes', 'Dicas de ajuda', '帮助提示', '說明提示', 'ヘルプツールチップ', 'Подсказки', 'Wskazówki pomocy', 'Suggerimenti di aiuto', '도움말 툴팁', 'Help-tooltips', 'Підказки', 'Tooltip bantuan', 'Yardım ipuçları', 'Dicas de ajuda', 'تلميحات المساعدة', 'मदद टूलटिप'],
  ['Show richer descriptions when hovering over controls', 'Zeigt ausführlichere Beschreibungen, wenn du den Mauszeiger über Steuerelemente bewegst', 'Afficher des descriptions plus riches au survol des contrôles', 'Muestra descripciones más completas al pasar sobre los controles', 'Mostra descrições mais completas ao passar sobre os controles', '悬停在控件上时显示更详细的说明', '游標停在控制項上時顯示更詳細的說明', 'コントロールにホバーしたとき詳細な説明を表示します', 'Показывать более подробные описания при наведении на элементы управления', 'Pokazuj bogatsze opisy po najechaniu na kontrolki', 'Mostra descrizioni più complete al passaggio sui controlli', '컨트롤 위에 올리면 더 자세한 설명을 표시합니다', 'Toon uitgebreidere beschrijvingen wanneer je over bedieningselementen zweeft', 'Показувати докладніші описи під час наведення на елементи керування', 'Tampilkan deskripsi yang lebih lengkap saat mengarahkan kursor ke kontrol', 'Denetimlerin üzerine gelince daha ayrıntılı açıklamalar göster', 'Mostra descrições mais completas ao passar sobre os controlos', 'اعرض أوصافًا أكثر تفصيلاً عند تمرير المؤشر فوق عناصر التحكم', 'कंट्रोल पर होवर करने पर ज्यादा विस्तृत विवरण दिखाएं'],
  ['Apply', 'Anwenden', 'Appliquer', 'Aplicar', 'Aplicar', '应用', '套用', '適用', 'Применить', 'Zastosuj', 'Applica', '적용', 'Toepassen', 'Застосувати', 'Terapkan', 'Uygula', 'Aplicar', 'تطبيق', 'लागू करें'],
  ['Browse', 'Durchsuchen', 'Parcourir', 'Examinar', 'Procurar', '浏览', '瀏覽', '参照', 'Обзор', 'Przeglądaj', 'Sfoglia', '찾아보기', 'Bladeren', 'Огляд', 'Jelajahi', 'Gözat', 'Procurar', 'استعراض', 'ब्राउज़ करें'],
  ['Close', 'Schließen', 'Fermer', 'Cerrar', 'Fechar', '关闭', '關閉', '閉じる', 'Закрыть', 'Zamknij', 'Chiudi', '닫기', 'Sluiten', 'Закрити', 'Tutup', 'Kapat', 'Fechar', 'إغلاق', 'बंद करें'],
  ['Delete', 'Löschen', 'Supprimer', 'Eliminar', 'Excluir', '删除', '刪除', '削除', 'Удалить', 'Usuń', 'Elimina', '삭제', 'Verwijderen', 'Видалити', 'Hapus', 'Sil', 'Eliminar', 'حذف', 'हटाएं'],
  ['Reset', 'Zurücksetzen', 'Réinitialiser', 'Restablecer', 'Redefinir', '重置', '重設', 'リセット', 'Сбросить', 'Resetuj', 'Reimposta', '재설정', 'Resetten', 'Скинути', 'Setel ulang', 'Sıfırla', 'Repor', 'إعادة ضبط', 'रीसेट'],
  ['Save', 'Speichern', 'Enregistrer', 'Guardar', 'Salvar', '保存', '儲存', '保存', 'Сохранить', 'Zapisz', 'Salva', '저장', 'Opslaan', 'Зберегти', 'Simpan', 'Kaydet', 'Guardar', 'حفظ', 'सहेजें'],
  ['React render error', 'React-Renderfehler', 'Erreur de rendu React', 'Error de renderizado de React', 'Erro de renderização do React', 'React 渲染错误', 'React 轉譯錯誤', 'React レンダリングエラー', 'Ошибка рендера React', 'Błąd renderowania React', 'Errore di rendering React', 'React 렌더링 오류', 'React-renderfout', 'Помилка рендеру React', 'Kesalahan render React', 'React render hatası', 'Erro de renderização React', 'خطأ عرض React', 'React रेंडर त्रुटि'],
  ['Try again', 'Erneut versuchen', 'Réessayer', 'Intentar de nuevo', 'Tentar novamente', '重试', '重試', '再試行', 'Повторить', 'Spróbuj ponownie', 'Riprova', '다시 시도', 'Opnieuw proberen', 'Спробувати ще раз', 'Coba lagi', 'Tekrar dene', 'Tentar novamente', 'حاول مرة أخرى', 'फिर कोशिश करें'],
  ['Startup failed', 'Start fehlgeschlagen', 'Échec du démarrage', 'Error al iniciar', 'Falha ao iniciar', '启动失败', '啟動失敗', '起動に失敗しました', 'Сбой запуска', 'Uruchomienie nie powiodło się', 'Avvio non riuscito', '시작 실패', 'Opstarten mislukt', 'Запуск не вдався', 'Gagal memulai', 'Başlatma başarısız', 'Falha ao iniciar', 'فشل بدء التشغيل', 'स्टार्टअप विफल'],
  ['Loading TerminallySKILL...', 'TerminallySKILL wird geladen...', 'Chargement de TerminallySKILL...', 'Cargando TerminallySKILL...', 'Carregando TerminallySKILL...', '正在加载 TerminallySKILL...', '正在載入 TerminallySKILL...', 'TerminallySKILL を読み込み中...', 'Загрузка TerminallySKILL...', 'Ładowanie TerminallySKILL...', 'Caricamento di TerminallySKILL...', 'TerminallySKILL 로드 중...', 'TerminallySKILL laden...', 'Завантаження TerminallySKILL...', 'Memuat TerminallySKILL...', 'TerminallySKILL yükleniyor...', 'A carregar TerminallySKILL...', 'جارٍ تحميل TerminallySKILL...', 'TerminallySKILL लोड हो रहा है...'],
  ['System default', 'Systemstandard', 'Par défaut du système', 'Predeterminado del sistema', 'Padrão do sistema', '系统默认', '系統預設', 'システム既定', 'По умолчанию системы', 'Domyślne systemu', 'Predefinito di sistema', '시스템 기본값', 'Systeemstandaard', 'Типово системи', 'Default sistem', 'Sistem varsayılanı', 'Predefinição do sistema', 'الافتراضي للنظام', 'सिस्टम डिफ़ॉल्ट'],
  ['Language & Locale', 'Sprache & Region', 'Langue et région', 'Idioma y región', 'Idioma e localidade', '语言和区域', '語言與地區', '言語と地域', 'Язык и регион', 'Język i region', 'Lingua e area', '언어 및 지역', 'Taal en regio', 'Мова і регіон', 'Bahasa & lokal', 'Dil ve bölge', 'Idioma e localidade', 'اللغة والمنطقة', 'भाषा और क्षेत्र'],
  ['Control UI language, regional formatting, and AI response language.', 'Steuert UI-Sprache, regionale Formate und die Sprache der KI-Antworten.', 'Contrôle la langue de l’interface, les formats régionaux et la langue des réponses IA.', 'Controla el idioma de la interfaz, los formatos regionales y el idioma de las respuestas de IA.', 'Controla o idioma da interface, formatos regionais e idioma das respostas de IA.', '控制界面语言、区域格式和 AI 回复语言。', '控制介面語言、地區格式與 AI 回覆語言。', 'UI 言語、地域形式、AI 応答言語を制御します。', 'Управляет языком интерфейса, региональными форматами и языком ответов ИИ.', 'Steruje językiem interfejsu, formatami regionalnymi i językiem odpowiedzi AI.', 'Controlla lingua dell’interfaccia, formati regionali e lingua delle risposte IA.', 'UI 언어, 지역 형식, AI 응답 언어를 제어합니다.', 'Beheer UI-taal, regionale notatie en taal voor AI-antwoorden.', 'Керує мовою інтерфейсу, регіональними форматами та мовою відповідей ШІ.', 'Mengatur bahasa UI, format regional, dan bahasa respons AI.', 'Arayüz dilini, bölgesel biçimleri ve AI yanıt dilini yönetir.', 'Controla o idioma da interface, formatos regionais e idioma das respostas de IA.', 'يتحكم في لغة الواجهة والتنسيقات الإقليمية ولغة ردود الذكاء الاصطناعي.', 'UI भाषा, क्षेत्रीय फॉर्मैट और AI जवाब की भाषा नियंत्रित करें।'],
  ['UI Language', 'UI-Sprache', 'Langue de l’interface', 'Idioma de la interfaz', 'Idioma da interface', '界面语言', '介面語言', 'UI 言語', 'Язык интерфейса', 'Język interfejsu', 'Lingua dell’interfaccia', 'UI 언어', 'UI-taal', 'Мова інтерфейсу', 'Bahasa UI', 'Arayüz dili', 'Idioma da interface', 'لغة الواجهة', 'UI भाषा'],
  ['Formats', 'Formate', 'Formats régionaux', 'Formatos', 'Formatos', '格式', '格式', '形式', 'Форматы', 'Formaty', 'Formati', '형식', 'Formaten', 'Формати', 'Format', 'Biçimler', 'Formatos', 'التنسيقات', 'फॉर्मैट'],
  ['AI Responses', 'KI-Antworten', 'Réponses IA', 'Respuestas de IA', 'Respostas de IA', 'AI 回复', 'AI 回覆', 'AI 応答', 'Ответы ИИ', 'Odpowiedzi AI', 'Risposte IA', 'AI 응답', 'AI-antwoorden', 'Відповіді ШІ', 'Respons AI', 'AI yanıtları', 'Respostas de IA', 'ردود الذكاء الاصطناعي', 'AI जवाब'],
  ['Same as app language', 'Wie App-Sprache', 'Même langue que l’app', 'Igual que la app', 'Mesmo idioma do app', '与应用语言相同', '與應用程式語言相同', 'アプリの言語と同じ', 'Как язык приложения', 'Tak jak język aplikacji', 'Come la lingua dell’app', '앱 언어와 동일', 'Zelfde als app-taal', 'Як мова застосунку', 'Sama seperti bahasa aplikasi', 'Uygulama diliyle aynı', 'Mesmo idioma da app', 'مثل لغة التطبيق', 'ऐप भाषा जैसी'],
  ['Use the language preferred by the operating system.', 'Die vom Betriebssystem bevorzugte Sprache verwenden.', 'Utiliser la langue préférée par le système d’exploitation.', 'Usar el idioma preferido por el sistema operativo.', 'Usar o idioma preferido pelo sistema operacional.', '使用操作系统首选语言。', '使用作業系統偏好的語言。', 'OS の優先言語を使用します。', 'Использовать язык, выбранный в операционной системе.', 'Użyj języka preferowanego przez system.', 'Usa la lingua preferita dal sistema operativo.', '운영체제의 기본 언어를 사용합니다.', 'Gebruik de taal die het besturingssysteem verkiest.', 'Використовувати мову, вибрану операційною системою.', 'Gunakan bahasa pilihan sistem operasi.', 'İşletim sisteminin tercih ettiği dili kullan.', 'Usar o idioma preferido pelo sistema operativo.', 'استخدم اللغة المفضلة في نظام التشغيل.', 'ऑपरेटिंग सिस्टम की पसंदीदा भाषा इस्तेमाल करें।'],
  ['Controls dates, times, numbers, and sorting.', 'Steuert Datum, Uhrzeit, Zahlen und Sortierung.', 'Contrôle les dates, heures, nombres et le tri.', 'Controla fechas, horas, números y ordenación.', 'Controla datas, horas, números e ordenação.', '控制日期、时间、数字和排序。', '控制日期、時間、數字和排序。', '日付、時刻、数値、並び替えを制御します。', 'Управляет датами, временем, числами и сортировкой.', 'Steruje datami, czasem, liczbami i sortowaniem.', 'Controlla date, orari, numeri e ordinamento.', '날짜, 시간, 숫자, 정렬 방식을 제어합니다.', 'Beheert datums, tijden, getallen en sortering.', 'Керує датами, часом, числами та сортуванням.', 'Mengatur tanggal, waktu, angka, dan pengurutan.', 'Tarihleri, saatleri, sayıları ve sıralamayı yönetir.', 'Controla datas, horas, números e ordenação.', 'يتحكم في التواريخ والأوقات والأرقام والفرز.', 'तारीख, समय, संख्या और क्रम नियंत्रित करता है।'],
  ['Commands, flags, file paths, code, and shell output stay unchanged.', 'Befehle, Flags, Dateipfade, Code und Shell-Ausgabe bleiben unverändert.', 'Les commandes, options, chemins, code et sorties shell restent inchangés.', 'Los comandos, flags, rutas, código y salida de shell no cambian.', 'Comandos, flags, caminhos, código e saída do shell permanecem iguais.', '命令、参数、路径、代码和 shell 输出保持不变。', '命令、參數、路徑、程式碼和 shell 輸出保持不變。', 'コマンド、フラグ、パス、コード、shell 出力は変更しません。', 'Команды, флаги, пути, код и вывод shell не изменяются.', 'Polecenia, flagi, ścieżki, kod i wynik shell pozostają bez zmian.', 'Comandi, flag, percorsi, codice e output shell restano invariati.', '명령, 플래그, 파일 경로, 코드, shell 출력은 그대로 유지됩니다.', 'Opdrachten, flags, bestandspaden, code en shell-uitvoer blijven ongewijzigd.', 'Команди, прапорці, шляхи, код і shell-вивід не змінюються.', 'Perintah, flag, path file, kode, dan output shell tidak diubah.', 'Komutlar, flagler, dosya yolları, kod ve shell çıktısı değişmeden kalır.', 'Comandos, flags, caminhos, código e saída da shell permanecem iguais.', 'تبقى أوامر الطرفية والخيارات والمسارات والكود ومخرجات shell دون تغيير.', 'कमांड, फ्लैग, फाइल पाथ, कोड और shell आउटपुट बदले नहीं जाते।'],
  ['Launch', 'Start', 'Lancement', 'Lanzamiento', 'Lançamento', '发布', '推出', 'リリース', 'Запуск', 'Start', 'Lancio', '출시', 'Lancering', 'Запуск', 'Peluncuran', 'Çıkış', 'Lançamento', 'الإطلاق', 'लॉन्च'],
  ['Next', 'Nächste', 'Suivant', 'Siguiente', 'Próximo', '下一批', '下一步', '次', 'Далее', 'Następne', 'Prossimo', '다음', 'Volgende', 'Далі', 'Berikutnya', 'Sonraki', 'Seguinte', 'التالي', 'अगला'],
  ['Watch', 'Beobachten', 'Surveillance', 'Seguimiento', 'Observação', '观察', '觀察', '監視', 'Наблюдение', 'Obserwacja', 'Monitoraggio', '관찰', 'Volgen', 'Спостереження', 'Pantau', 'İzle', 'Monitorizar', 'متابعة', 'निगरानी'],
  ['Startup Behavior', 'Startverhalten', 'Comportement au démarrage', 'Comportamiento al iniciar', 'Comportamento ao iniciar', '启动行为', '啟動行為', '起動時の動作', 'Поведение при запуске', 'Zachowanie przy starcie', 'Comportamento all’avvio', '시작 동작', 'Opstartgedrag', 'Поведінка під час запуску', 'Perilaku saat mulai', 'Başlangıç davranışı', 'Comportamento ao iniciar', 'سلوك بدء التشغيل', 'स्टार्टअप व्यवहार'],
  ['Choose what to show when TerminallySKILL launches.', 'Wähle aus, was TerminallySKILL beim Start anzeigen soll.', 'Choisir quoi afficher au lancement de TerminallySKILL.', 'Elige qué mostrar cuando TerminallySKILL se inicia.', 'Escolha o que mostrar quando o TerminallySKILL inicia.', '选择 TerminallySKILL 启动时显示的内容。', '選擇 TerminallySKILL 啟動時要顯示的內容。', 'TerminallySKILL 起動時に表示する内容を選びます。', 'Выберите, что показывать при запуске TerminallySKILL.', 'Wybierz, co pokazać po uruchomieniu TerminallySKILL.', 'Scegli cosa mostrare all’avvio di TerminallySKILL.', 'TerminallySKILL 시작 시 표시할 항목을 선택합니다.', 'Kies wat TerminallySKILL toont bij het starten.', 'Виберіть, що показувати під час запуску TerminallySKILL.', 'Pilih apa yang ditampilkan saat TerminallySKILL dimulai.', 'TerminallySKILL başlatıldığında ne gösterileceğini seç.', 'Escolhe o que mostrar quando o TerminallySKILL arranca.', 'اختر ما يظهر عند بدء TerminallySKILL.', 'TerminallySKILL शुरू होने पर क्या दिखाना है चुनें।'],
  ['Show Dashboard', 'Dashboard anzeigen', 'Afficher le tableau de bord', 'Mostrar panel', 'Mostrar painel', '显示仪表盘', '顯示儀表板', 'ダッシュボードを表示', 'Показать панель', 'Pokaż pulpit', 'Mostra dashboard', '대시보드 표시', 'Dashboard tonen', 'Показати панель', 'Tampilkan dasbor', 'Panoyu göster', 'Mostrar painel', 'عرض لوحة التحكم', 'डैशबोर्ड दिखाएं'],
  ['Open with the project dashboard showing recent runs and quick actions', 'Mit dem Projekt-Dashboard, letzten Läufen und Schnellaktionen öffnen', 'Ouvrir avec le tableau de bord du projet, les exécutions récentes et les actions rapides', 'Abrir con el panel del proyecto mostrando ejecuciones recientes y acciones rápidas', 'Abrir com o painel do projeto mostrando execuções recentes e ações rápidas', '打开项目仪表盘，显示最近运行和快捷操作', '開啟專案儀表板，顯示最近執行和快速操作', '最近の実行とクイック操作を表示するプロジェクトダッシュボードで開きます', 'Открывать панель проекта с недавними запусками и быстрыми действиями', 'Otwórz z pulpitem projektu pokazującym ostatnie uruchomienia i szybkie akcje', 'Apri con la dashboard progetto che mostra esecuzioni recenti e azioni rapide', '최근 실행과 빠른 작업을 보여주는 프로젝트 대시보드로 엽니다', 'Open met het projectdashboard met recente uitvoeringen en snelle acties', 'Відкривати панель проєкту з останніми запусками та швидкими діями', 'Buka dengan dasbor proyek yang menampilkan run terbaru dan aksi cepat', 'Son çalıştırmalar ve hızlı işlemlerle proje panosunu aç', 'Abrir com o painel do projeto mostrando execuções recentes e ações rápidas', 'افتح بلوحة تحكم المشروع التي تعرض التشغيلات الأخيرة والإجراءات السريعة', 'हाल के रन और त्वरित कार्रवाइयों वाले प्रोजेक्ट डैशबोर्ड से खोलें'],
  ['Resume Last Project', 'Letztes Projekt fortsetzen', 'Reprendre le dernier projet', 'Reanudar último proyecto', 'Retomar último projeto', '恢复上次项目', '繼續上次專案', '最後のプロジェクトを再開', 'Возобновить последний проект', 'Wznów ostatni projekt', 'Riprendi ultimo progetto', '마지막 프로젝트 다시 열기', 'Laatste project hervatten', 'Відновити останній проєкт', 'Lanjutkan proyek terakhir', 'Son projeye devam et', 'Retomar último projeto', 'استئناف آخر مشروع', 'पिछला प्रोजेक्ट फिर खोलें'],
  ['Auto-open your last used project and restore the previous sidebar tab', 'Das zuletzt verwendete Projekt automatisch öffnen und den vorherigen Seitenleisten-Tab wiederherstellen', 'Ouvrir automatiquement le dernier projet utilisé et restaurer l’onglet précédent de la barre latérale', 'Abrir automáticamente tu último proyecto y restaurar la pestaña lateral anterior', 'Abrir automaticamente o último projeto usado e restaurar a aba lateral anterior', '自动打开上次使用的项目并恢复之前的侧边栏标签页', '自動開啟上次使用的專案並還原先前的側邊欄分頁', '最後に使ったプロジェクトを自動で開き、前回のサイドバータブを復元します', 'Автоматически открыть последний проект и восстановить предыдущую вкладку боковой панели', 'Automatycznie otwórz ostatni projekt i przywróć poprzednią kartę paska bocznego', 'Apri automaticamente l’ultimo progetto usato e ripristina la scheda laterale precedente', '마지막으로 사용한 프로젝트를 자동으로 열고 이전 사이드바 탭을 복원합니다', 'Open automatisch je laatst gebruikte project en herstel de vorige zijbalktab', 'Автоматично відкрити останній проєкт і відновити попередню вкладку бічної панелі', 'Buka otomatis proyek terakhir dan pulihkan tab sidebar sebelumnya', 'Son kullanılan projeyi otomatik aç ve önceki kenar çubuğu sekmesini geri yükle', 'Abrir automaticamente o último projeto usado e restaurar o separador lateral anterior', 'افتح آخر مشروع مستخدم تلقائيًا واستعد تبويب الشريط الجانبي السابق', 'पिछला इस्तेमाल किया प्रोजेक्ट अपने-आप खोलें और पिछला साइडबार टैब वापस लाएं'],
  ['Terminal Input', 'Terminaleingabe', 'Saisie du terminal', 'Entrada del terminal', 'Entrada do terminal', '终端输入', '終端機輸入', 'ターミナル入力', 'Ввод терминала', 'Wejście terminala', 'Input terminale', '터미널 입력', 'Terminalinvoer', 'Ввід термінала', 'Input terminal', 'Terminal girişi', 'Entrada do terminal', 'إدخال الطرفية', 'टर्मिनल इनपुट'],
  ['Choose between direct shell input and the editor-style command bar.', 'Wähle zwischen direkter Shell-Eingabe und der editorartigen Befehlsleiste.', 'Choisir entre la saisie directe dans le shell et la barre de commande de type éditeur.', 'Elige entre entrada directa de shell y la barra de comandos estilo editor.', 'Escolha entre entrada direta no shell e a barra de comando estilo editor.', '在直接 shell 输入和编辑器式命令栏之间选择。', '選擇直接 shell 輸入或編輯器式命令列。', '直接シェル入力とエディター風コマンドバーを選びます。', 'Выберите прямой ввод в shell или командную строку в стиле редактора.', 'Wybierz między bezpośrednim wpisywaniem w powłoce a paskiem poleceń w stylu edytora.', 'Scegli tra input diretto nella shell e barra comandi in stile editor.', '직접 shell 입력과 편집기 스타일 명령 막대 중 선택합니다.', 'Kies tussen directe shell-invoer en de editorachtige opdrachtbalk.', 'Виберіть між прямим вводом у shell і командним рядком у стилі редактора.', 'Pilih input shell langsung atau bilah perintah bergaya editor.', 'Doğrudan shell girişi ile düzenleyici tarzı komut çubuğu arasında seçim yap.', 'Escolhe entre entrada direta na shell e a barra de comandos ao estilo editor.', 'اختر بين إدخال shell المباشر وشريط أوامر بنمط المحرر.', 'सीधे shell इनपुट और एडिटर-स्टाइल कमांड बार में से चुनें।'],
  ['Classic', 'Klassisch', 'Classique', 'Clásico', 'Clássico', '经典', '經典', 'クラシック', 'Классический', 'Klasyczny', 'Classico', '클래식', 'Klassiek', 'Класичний', 'Klasik', 'Klasik', 'Clássico', 'كلاسيكي', 'क्लासिक'],
  ['Type directly into the live shell prompt', 'Direkt in den Live-Shell-Prompt tippen', 'Saisir directement dans l’invite shell active', 'Escribe directamente en el prompt de shell activo', 'Digite diretamente no prompt shell ativo', '直接输入到实时 shell 提示符', '直接輸入到即時 shell 提示符', 'ライブシェルプロンプトに直接入力します', 'Вводить прямо в активный shell prompt', 'Pisz bezpośrednio w aktywnym promptcie powłoki', 'Digita direttamente nel prompt shell attivo', '실시간 shell 프롬프트에 직접 입력합니다', 'Typ direct in de actieve shell-prompt', 'Вводити безпосередньо в активний shell prompt', 'Ketik langsung ke prompt shell aktif', 'Canlı shell istemine doğrudan yaz', 'Escreve diretamente no prompt shell ativo', 'اكتب مباشرة في موجه shell النشط', 'लाइव shell प्रॉम्प्ट में सीधे टाइप करें'],
  ['Editor Prompt', 'Editor-Prompt', 'Invite éditeur', 'Prompt de editor', 'Prompt do editor', '编辑器提示', '編輯器提示', 'エディタープロンプト', 'Редакторский ввод', 'Prompt edytora', 'Prompt editor', '편집기 프롬프트', 'Editorprompt', 'Редакторський ввід', 'Prompt editor', 'Düzenleyici istemi', 'Prompt do editor', 'موجه المحرر', 'एडिटर प्रॉम्प्ट'],
  ['Use an editor-style command bar when the shell is ready', 'Eine editorartige Befehlsleiste verwenden, wenn die Shell bereit ist', 'Utiliser une barre de commande de type éditeur quand le shell est prêt', 'Usa una barra de comandos estilo editor cuando el shell esté listo', 'Use uma barra de comando estilo editor quando o shell estiver pronto', 'shell 就绪时使用编辑器式命令栏', 'shell 就緒時使用編輯器式命令列', 'シェルの準備ができたらエディター風コマンドバーを使います', 'Использовать командную строку в стиле редактора, когда shell готов', 'Użyj paska poleceń w stylu edytora, gdy powłoka jest gotowa', 'Usa una barra comandi in stile editor quando la shell è pronta', 'shell이 준비되면 편집기 스타일 명령 막대를 사용합니다', 'Gebruik een editorachtige opdrachtbalk wanneer de shell klaar is', 'Використовувати командний рядок у стилі редактора, коли shell готовий', 'Gunakan bilah perintah bergaya editor saat shell siap', 'Shell hazır olduğunda düzenleyici tarzı komut çubuğu kullan', 'Usa uma barra de comandos ao estilo editor quando a shell estiver pronta', 'استخدم شريط أوامر بنمط المحرر عندما يكون shell جاهزًا', 'shell तैयार होने पर एडिटर-स्टाइल कमांड बार इस्तेमाल करें'],
  ['Enter runs. Tab accepts the selected suggestion. Shift+Tab or Alt+Up/Down cycles suggestions. Up/down cycles command history. Ctrl+N / Ctrl+P also cycle suggestions.', 'Enter führt aus. Tab übernimmt den ausgewählten Vorschlag. Shift+Tab oder Alt+Hoch/Runter wechselt Vorschläge. Hoch/Runter wechselt den Befehlsverlauf. Ctrl+N / Ctrl+P wechseln ebenfalls Vorschläge.', 'Entrée exécute. Tab accepte la suggestion sélectionnée. Shift+Tab ou Alt+Haut/Bas parcourt les suggestions. Haut/Bas parcourt l’historique. Ctrl+N / Ctrl+P parcourent aussi les suggestions.', 'Enter ejecuta. Tab acepta la sugerencia seleccionada. Shift+Tab o Alt+Arriba/Abajo recorre sugerencias. Arriba/Abajo recorre el historial. Ctrl+N / Ctrl+P también recorren sugerencias.', 'Enter executa. Tab aceita a sugestão selecionada. Shift+Tab ou Alt+Cima/Baixo alterna sugestões. Cima/Baixo percorre o histórico. Ctrl+N / Ctrl+P também alternam sugestões.', 'Enter 运行。Tab 接受所选建议。Shift+Tab 或 Alt+上/下 切换建议。上/下 切换命令历史。Ctrl+N / Ctrl+P 也会切换建议。', 'Enter 執行。Tab 接受選取的建議。Shift+Tab 或 Alt+上/下 切換建議。上/下 切換命令歷史。Ctrl+N / Ctrl+P 也會切換建議。', 'Enter で実行します。Tab で選択中の候補を採用します。Shift+Tab または Alt+上下で候補を切り替えます。上下でコマンド履歴を切り替えます。Ctrl+N / Ctrl+P でも候補を切り替えます。', 'Enter запускает. Tab принимает выбранную подсказку. Shift+Tab или Alt+Вверх/Вниз переключает подсказки. Вверх/Вниз переключает историю команд. Ctrl+N / Ctrl+P тоже переключают подсказки.', 'Enter uruchamia. Tab akceptuje wybraną sugestię. Shift+Tab lub Alt+Góra/Dół przełącza sugestie. Góra/Dół przełącza historię poleceń. Ctrl+N / Ctrl+P też przełączają sugestie.', 'Enter esegue. Tab accetta il suggerimento selezionato. Shift+Tab o Alt+Su/Giù scorre i suggerimenti. Su/Giù scorre la cronologia comandi. Ctrl+N / Ctrl+P scorrono anche i suggerimenti.', 'Enter로 실행합니다. Tab은 선택한 제안을 적용합니다. Shift+Tab 또는 Alt+위/아래로 제안을 전환합니다. 위/아래는 명령 기록을 전환합니다. Ctrl+N / Ctrl+P도 제안을 전환합니다.', 'Enter voert uit. Tab accepteert de geselecteerde suggestie. Shift+Tab of Alt+Omhoog/Omlaag bladert door suggesties. Omhoog/omlaag bladert door opdrachtgeschiedenis. Ctrl+N / Ctrl+P doen dat ook.', 'Enter запускає. Tab приймає вибрану підказку. Shift+Tab або Alt+Вгору/Вниз перемикає підказки. Вгору/Вниз перемикає історію команд. Ctrl+N / Ctrl+P також перемикають підказки.', 'Enter menjalankan. Tab menerima saran terpilih. Shift+Tab atau Alt+Atas/Bawah berpindah saran. Atas/bawah berpindah riwayat perintah. Ctrl+N / Ctrl+P juga berpindah saran.', 'Enter çalıştırır. Tab seçili öneriyi kabul eder. Shift+Tab veya Alt+Yukarı/Aşağı öneriler arasında gezer. Yukarı/aşağı komut geçmişinde gezer. Ctrl+N / Ctrl+P de öneriler arasında gezer.', 'Enter executa. Tab aceita a sugestão selecionada. Shift+Tab ou Alt+Cima/Baixo percorre sugestões. Cima/Baixo percorre o histórico. Ctrl+N / Ctrl+P também percorrem sugestões.', 'Enter للتشغيل. Tab يقبل الاقتراح المحدد. Shift+Tab أو Alt+أعلى/أسفل للتنقل بين الاقتراحات. أعلى/أسفل للتنقل في سجل الأوامر. Ctrl+N / Ctrl+P يتنقلان بين الاقتراحات أيضًا.', 'Enter चलाता है। Tab चुने गए सुझाव को स्वीकार करता है। Shift+Tab या Alt+ऊपर/नीचे सुझाव बदलता है। ऊपर/नीचे कमांड इतिहास बदलता है। Ctrl+N / Ctrl+P भी सुझाव बदलते हैं।'],
  ['Enter runs. Tab accepts the selected suggestion. Shift+Tab or Alt+Up/Down cycles suggestions. History appears after your first run.', 'Enter führt aus. Tab übernimmt den ausgewählten Vorschlag. Shift+Tab oder Alt+Hoch/Runter wechselt Vorschläge. Der Verlauf erscheint nach dem ersten Lauf.', 'Entrée exécute. Tab accepte la suggestion sélectionnée. Shift+Tab ou Alt+Haut/Bas parcourt les suggestions. L’historique apparaît après la première exécution.', 'Enter ejecuta. Tab acepta la sugerencia seleccionada. Shift+Tab o Alt+Arriba/Abajo recorre sugerencias. El historial aparece tras la primera ejecución.', 'Enter executa. Tab aceita a sugestão selecionada. Shift+Tab ou Alt+Cima/Baixo alterna sugestões. O histórico aparece após a primeira execução.', 'Enter 运行。Tab 接受所选建议。Shift+Tab 或 Alt+上/下 切换建议。首次运行后会显示历史。', 'Enter 執行。Tab 接受選取的建議。Shift+Tab 或 Alt+上/下 切換建議。首次執行後會顯示歷史。', 'Enter で実行します。Tab で選択中の候補を採用します。Shift+Tab または Alt+上下で候補を切り替えます。履歴は初回実行後に表示されます。', 'Enter запускает. Tab принимает выбранную подсказку. Shift+Tab или Alt+Вверх/Вниз переключает подсказки. История появится после первого запуска.', 'Enter uruchamia. Tab akceptuje wybraną sugestię. Shift+Tab lub Alt+Góra/Dół przełącza sugestie. Historia pojawi się po pierwszym uruchomieniu.', 'Enter esegue. Tab accetta il suggerimento selezionato. Shift+Tab o Alt+Su/Giù scorre i suggerimenti. La cronologia appare dopo la prima esecuzione.', 'Enter로 실행합니다. Tab은 선택한 제안을 적용합니다. Shift+Tab 또는 Alt+위/아래로 제안을 전환합니다. 기록은 첫 실행 후 표시됩니다.', 'Enter voert uit. Tab accepteert de geselecteerde suggestie. Shift+Tab of Alt+Omhoog/Omlaag bladert door suggesties. Geschiedenis verschijnt na je eerste uitvoering.', 'Enter запускає. Tab приймає вибрану підказку. Shift+Tab або Alt+Вгору/Вниз перемикає підказки. Історія з’явиться після першого запуску.', 'Enter menjalankan. Tab menerima saran terpilih. Shift+Tab atau Alt+Atas/Bawah berpindah saran. Riwayat muncul setelah run pertama.', 'Enter çalıştırır. Tab seçili öneriyi kabul eder. Shift+Tab veya Alt+Yukarı/Aşağı öneriler arasında gezer. Geçmiş ilk çalıştırmadan sonra görünür.', 'Enter executa. Tab aceita a sugestão selecionada. Shift+Tab ou Alt+Cima/Baixo percorre sugestões. O histórico aparece após a primeira execução.', 'Enter للتشغيل. Tab يقبل الاقتراح المحدد. Shift+Tab أو Alt+أعلى/أسفل للتنقل بين الاقتراحات. يظهر السجل بعد أول تشغيل.', 'Enter चलाता है। Tab चुने गए सुझाव को स्वीकार करता है। Shift+Tab या Alt+ऊपर/नीचे सुझाव बदलता है। इतिहास पहली बार चलाने के बाद दिखेगा।'],
  ['Type a command and press Enter', 'Befehl eingeben und Enter drücken', 'Saisir une commande et appuyer sur Entrée', 'Escribe un comando y pulsa Enter', 'Digite um comando e pressione Enter', '输入命令并按 Enter', '輸入命令並按 Enter', 'コマンドを入力して Enter を押す', 'Введите команду и нажмите Enter', 'Wpisz polecenie i naciśnij Enter', 'Digita un comando e premi Enter', '명령을 입력하고 Enter를 누르세요', 'Typ een opdracht en druk op Enter', 'Введіть команду й натисніть Enter', 'Ketik perintah lalu tekan Enter', 'Bir komut yazıp Enter’a bas', 'Escreve um comando e prime Enter', 'اكتب أمرًا واضغط Enter', 'कमांड टाइप करें और Enter दबाएं'],
  ['Suggestion:', 'Vorschlag:', 'Suggestion :', 'Sugerencia:', 'Sugestão:', '建议：', '建議：', '候補:', 'Подсказка:', 'Sugestia:', 'Suggerimento:', '제안:', 'Suggestie:', 'Підказка:', 'Saran:', 'Öneri:', 'Sugestão:', 'اقتراح:', 'सुझाव:'],
  ['Start typing to generate suggestions.', 'Tippe los, um Vorschläge zu erzeugen.', 'Commencez à saisir pour générer des suggestions.', 'Empieza a escribir para generar sugerencias.', 'Comece a digitar para gerar sugestões.', '开始输入以生成建议。', '開始輸入以產生建議。', '入力を始めると候補が生成されます。', 'Начните вводить, чтобы появились подсказки.', 'Zacznij pisać, aby wygenerować sugestie.', 'Inizia a digitare per generare suggerimenti.', '입력하면 제안이 생성됩니다.', 'Begin met typen om suggesties te maken.', 'Почніть вводити, щоб з’явилися підказки.', 'Mulai mengetik untuk membuat saran.', 'Öneriler oluşturmak için yazmaya başla.', 'Começa a escrever para gerar sugestões.', 'ابدأ الكتابة لإنشاء اقتراحات.', 'सुझाव बनाने के लिए टाइप करना शुरू करें।'],
  ['Tab accepts the selected suggestion.', 'Tab übernimmt den ausgewählten Vorschlag.', 'Tab accepte la suggestion sélectionnée.', 'Tab acepta la sugerencia seleccionada.', 'Tab aceita a sugestão selecionada.', 'Tab 接受所选建议。', 'Tab 接受選取的建議。', 'Tab で選択中の候補を採用します。', 'Tab принимает выбранную подсказку.', 'Tab akceptuje wybraną sugestię.', 'Tab accetta il suggerimento selezionato.', 'Tab은 선택한 제안을 적용합니다.', 'Tab accepteert de geselecteerde suggestie.', 'Tab приймає вибрану підказку.', 'Tab menerima saran terpilih.', 'Tab seçili öneriyi kabul eder.', 'Tab aceita a sugestão selecionada.', 'Tab يقبل الاقتراح المحدد.', 'Tab चुने गए सुझाव को स्वीकार करता है।'],
  ['Editor mode is ON - type commands in a dedicated input bar with suggestions and history. Toggle to switch back to classic shell input.', 'Editor-Modus ist EIN - Befehle in einer eigenen Eingabeleiste mit Vorschlägen und Verlauf tippen. Umschalten, um zur klassischen Shell-Eingabe zurückzukehren.', 'Le mode éditeur est ACTIVÉ - saisissez les commandes dans une barre dédiée avec suggestions et historique. Basculez pour revenir à la saisie shell classique.', 'El modo editor está ACTIVADO: escribe comandos en una barra dedicada con sugerencias e historial. Cambia para volver a la entrada shell clásica.', 'O modo editor está LIGADO - digite comandos em uma barra dedicada com sugestões e histórico. Alterne para voltar à entrada shell clássica.', '编辑器模式已开启 - 在专用输入栏中输入命令，并带有建议和历史。切换可返回经典 shell 输入。', '編輯器模式已開啟 - 在專用輸入列中輸入命令，並提供建議和歷史。切換可返回經典 shell 輸入。', 'エディターモードはオンです - 候補と履歴付きの専用入力バーでコマンドを入力します。切り替えるとクラシックなシェル入力に戻ります。', 'Режим редактора ВКЛ - вводите команды в отдельной строке с подсказками и историей. Переключите, чтобы вернуться к классическому вводу shell.', 'Tryb edytora jest WŁ. - wpisuj polecenia w osobnym pasku z sugestiami i historią. Przełącz, aby wrócić do klasycznego wejścia powłoki.', 'La modalità editor è ATTIVA - digita comandi in una barra dedicata con suggerimenti e cronologia. Disattiva per tornare all’input shell classico.', '편집기 모드가 켜져 있습니다 - 제안과 기록이 있는 전용 입력 막대에 명령을 입력합니다. 전환하면 클래식 shell 입력으로 돌아갑니다.', 'Editormodus staat AAN - typ opdrachten in een aparte invoerbalk met suggesties en geschiedenis. Schakel om terug te gaan naar klassieke shell-invoer.', 'Режим редактора УВІМК. - вводьте команди в окремому рядку з підказками та історією. Перемкніть, щоб повернутися до класичного вводу shell.', 'Mode editor AKTIF - ketik perintah di bilah input khusus dengan saran dan riwayat. Alihkan untuk kembali ke input shell klasik.', 'Düzenleyici modu AÇIK - komutları öneriler ve geçmiş içeren özel giriş çubuğuna yaz. Klasik shell girişine dönmek için değiştir.', 'O modo editor está ATIVO - escreve comandos numa barra dedicada com sugestões e histórico. Alterna para voltar à entrada shell clássica.', 'وضع المحرر مفعّل - اكتب الأوامر في شريط إدخال مخصص مع اقتراحات وسجل. بدّل للرجوع إلى إدخال shell الكلاسيكي.', 'एडिटर मोड चालू है - सुझाव और इतिहास वाले अलग इनपुट बार में कमांड टाइप करें। क्लासिक shell इनपुट पर लौटने के लिए टॉगल करें।'],
  ['Editor mode is OFF - you are typing directly into the live shell. Toggle to use an editor-style command bar with suggestions.', 'Editor-Modus ist AUS - du tippst direkt in die laufende Shell. Umschalten, um eine editorartige Befehlsleiste mit Vorschlägen zu verwenden.', 'Le mode éditeur est DÉSACTIVÉ - vous saisissez directement dans le shell actif. Basculez pour utiliser une barre de commande avec suggestions.', 'El modo editor está DESACTIVADO: escribes directamente en la shell activa. Cambia para usar una barra de comandos con sugerencias.', 'O modo editor está DESLIGADO - você digita diretamente no shell ativo. Alterne para usar uma barra de comando com sugestões.', '编辑器模式已关闭 - 你正在直接输入到实时 shell。切换可使用带建议的编辑器式命令栏。', '編輯器模式已關閉 - 你正在直接輸入到即時 shell。切換可使用含建議的編輯器式命令列。', 'エディターモードはオフです - ライブシェルに直接入力しています。切り替えると候補付きのエディター風コマンドバーを使えます。', 'Режим редактора ВЫКЛ - вы вводите прямо в активный shell. Переключите, чтобы использовать командную строку с подсказками.', 'Tryb edytora jest WYŁ. - wpisujesz bezpośrednio w aktywnej powłoce. Przełącz, aby użyć paska poleceń z sugestiami.', 'La modalità editor è DISATTIVA - stai digitando direttamente nella shell attiva. Attiva per usare una barra comandi con suggerimenti.', '편집기 모드가 꺼져 있습니다 - 실시간 shell에 직접 입력 중입니다. 제안이 있는 편집기 스타일 명령 막대를 사용하려면 전환하세요.', 'Editormodus staat UIT - je typt direct in de actieve shell. Schakel om een editorachtige opdrachtbalk met suggesties te gebruiken.', 'Режим редактора ВИМК. - ви вводите безпосередньо в активний shell. Перемкніть, щоб використовувати командний рядок із підказками.', 'Mode editor NONAKTIF - Anda mengetik langsung ke shell aktif. Alihkan untuk memakai bilah perintah bergaya editor dengan saran.', 'Düzenleyici modu KAPALI - doğrudan canlı shell’e yazıyorsun. Önerili düzenleyici tarzı komut çubuğu kullanmak için değiştir.', 'O modo editor está INATIVO - estás a escrever diretamente na shell ativa. Alterna para usar uma barra de comandos com sugestões.', 'وضع المحرر متوقف - أنت تكتب مباشرة في shell النشط. بدّل لاستخدام شريط أوامر بنمط المحرر مع اقتراحات.', 'एडिटर मोड बंद है - आप लाइव shell में सीधे टाइप कर रहे हैं। सुझावों वाला एडिटर-स्टाइल कमांड बार इस्तेमाल करने के लिए टॉगल करें।'],
  ['Safe Paste Mode', 'Sicheres Einfügen', 'Collage sécurisé', 'Pegado seguro', 'Modo de colagem segura', '安全粘贴模式', '安全貼上模式', '安全貼り付けモード', 'Безопасная вставка', 'Tryb bezpiecznego wklejania', 'Modalità incolla sicura', '안전 붙여넣기 모드', 'Veilig plakken', 'Безпечне вставлення', 'Mode tempel aman', 'Güvenli yapıştırma modu', 'Modo de colagem segura', 'وضع اللصق الآمن', 'सुरक्षित पेस्ट मोड'],
  ['Warn before sending suspicious or multi-line pastes into the shell', 'Vor verdächtigen oder mehrzeiligen Einfügungen in die Shell warnen', 'Avertir avant d’envoyer des collages suspects ou multilignes au shell', 'Advertir antes de enviar pegados sospechosos o multilínea al shell', 'Avisar antes de enviar colagens suspeitas ou multilinha ao shell', '将可疑或多行粘贴发送到 shell 前先警告', '將可疑或多行貼上傳送到 shell 前先警告', '疑わしい貼り付けや複数行貼り付けを shell に送る前に警告します', 'Предупреждать перед отправкой подозрительных или многострочных вставок в shell', 'Ostrzegaj przed wysłaniem podejrzanych lub wielowierszowych wklejek do powłoki', 'Avvisa prima di inviare alla shell incolla sospetti o multilinea', '의심스럽거나 여러 줄 붙여넣기를 shell로 보내기 전에 경고합니다', 'Waarschuw voordat verdachte of meerregelige plakacties naar de shell gaan', 'Попереджати перед надсиланням підозрілих або багаторядкових вставок у shell', 'Peringatkan sebelum mengirim tempelan mencurigakan atau multi-baris ke shell', 'Şüpheli veya çok satırlı yapıştırmaları shell’e göndermeden önce uyar', 'Avisar antes de enviar colagens suspeitas ou multilinha para a shell', 'حذّر قبل إرسال لصق مشبوه أو متعدد الأسطر إلى shell', 'संदिग्ध या कई-लाइन पेस्ट shell में भेजने से पहले चेतावनी दें'],
  ['Reset Command Trees', 'Befehlsbäume zurücksetzen', 'Réinitialiser les arbres de commandes', 'Restablecer árboles de comandos', 'Redefinir árvores de comandos', '重置命令树', '重設命令樹', 'コマンドツリーをリセット', 'Сбросить деревья команд', 'Resetuj drzewa poleceń', 'Reimposta alberi comandi', '명령 트리 재설정', 'Opdrachtbomen resetten', 'Скинути дерева команд', 'Reset pohon perintah', 'Komut ağaçlarını sıfırla', 'Repor árvores de comandos', 'إعادة ضبط أشجار الأوامر', 'कमांड ट्री रीसेट करें'],
  ['Clear discovered/manual commands and generated help-enriched command trees so you can test from a clean command catalog.', 'Erkannte/manuelle Befehle und generierte Help-Daten entfernen, damit du mit einem sauberen Befehlskatalog testen kannst.', 'Effacer les commandes détectées/manuelles et les arbres enrichis par l’aide générée pour tester depuis un catalogue propre.', 'Borra comandos detectados/manuales y árboles enriquecidos con ayuda generada para probar desde un catálogo limpio.', 'Limpa comandos descobertos/manuais e árvores enriquecidas por ajuda gerada para testar com um catálogo limpo.', '清除已发现/手动命令和生成的帮助增强命令树，以便从干净的命令目录测试。', '清除偵測/手動命令與產生的說明增強命令樹，以便從乾淨的命令目錄測試。', '検出/手動コマンドと生成されたヘルプ強化コマンドツリーを消去し、クリーンなコマンドカタログからテストできます。', 'Очистить найденные/ручные команды и созданные справочные деревья, чтобы тестировать с чистым каталогом команд.', 'Wyczyść wykryte/ręczne polecenia i wygenerowane drzewa wzbogacone pomocą, aby testować z czystego katalogu.', 'Cancella comandi rilevati/manuali e alberi comandi arricchiti dall’aiuto generato, così puoi testare da un catalogo pulito.', '발견/수동 명령과 생성된 도움말 기반 명령 트리를 지워 깨끗한 명령 카탈로그에서 테스트할 수 있습니다.', 'Wis gevonden/handmatige opdrachten en gegenereerde met hulp verrijkte opdrachtbomen, zodat je met een schone catalogus kunt testen.', 'Очистити знайдені/ручні команди та згенеровані дерева з довідкою, щоб тестувати з чистого каталогу команд.', 'Hapus perintah yang ditemukan/manual dan pohon perintah bantuan yang dibuat agar Anda bisa menguji dari katalog bersih.', 'Temiz bir komut kataloğundan test edebilmek için bulunan/manuel komutları ve üretilen yardım destekli komut ağaçlarını temizle.', 'Limpa comandos detetados/manuais e árvores enriquecidas por ajuda gerada para testar com um catálogo limpo.', 'امسح الأوامر المكتشفة/اليدوية وأشجار الأوامر المعززة بالمساعدة المولدة للاختبار من كتالوج نظيف.', 'खोजे/मैनुअल कमांड और जेनरेटेड हेल्प वाले कमांड ट्री साफ करें ताकि साफ कमांड कैटलॉग से टेस्ट कर सकें।'],
  ['Scripts, snippets, projects, settings, and logs are not affected.', 'Skripte, Snippets, Projekte, Einstellungen und Protokolle bleiben erhalten.', 'Les scripts, extraits, projets, paramètres et journaux ne sont pas affectés.', 'Scripts, fragmentos, proyectos, configuración y registros no se ven afectados.', 'Scripts, snippets, projetos, configurações e logs não são afetados.', '脚本、片段、项目、设置和日志不受影响。', '腳本、片段、專案、設定和日誌不受影響。', 'スクリプト、スニペット、プロジェクト、設定、ログには影響しません。', 'Скрипты, фрагменты, проекты, настройки и логи не затрагиваются.', 'Skrypty, fragmenty, projekty, ustawienia i logi pozostają bez zmian.', 'Script, snippet, progetti, impostazioni e log non vengono modificati.', '스크립트, 스니펫, 프로젝트, 설정, 로그는 영향을 받지 않습니다.', 'Scripts, fragmenten, projecten, instellingen en logs worden niet beïnvloed.', 'Скрипти, фрагменти, проєкти, налаштування та логи не зачіпаються.', 'Skrip, snippet, proyek, pengaturan, dan log tidak terpengaruh.', 'Betikler, parçalar, projeler, ayarlar ve günlükler etkilenmez.', 'Scripts, snippets, projetos, definições e logs não são afetados.', 'لا تتأثر السكربتات والمقتطفات والمشاريع والإعدادات والسجلات.', 'स्क्रिप्ट, स्निपेट, प्रोजेक्ट, सेटिंग्स और लॉग प्रभावित नहीं होंगे।'],
  ['Reset all discovered/manual command trees and generated help data?\n\nThis keeps your scripts, snippets, projects, settings, and logs.', 'Alle erkannten/manuellen Befehlsbäume und generierten Help-Daten zurücksetzen?\n\nSkripte, Snippets, Projekte, Einstellungen und Protokolle bleiben erhalten.', 'Réinitialiser tous les arbres de commandes détectés/manuels et les données d’aide générées ?\n\nVos scripts, extraits, projets, paramètres et journaux sont conservés.', '¿Restablecer todos los árboles de comandos detectados/manuales y los datos de ayuda generados?\n\nSe conservan scripts, fragmentos, proyectos, configuración y registros.', 'Redefinir todas as árvores de comandos descobertas/manuais e dados de ajuda gerados?\n\nScripts, snippets, projetos, configurações e logs serão mantidos.', '重置所有已发现/手动命令树和生成的帮助数据？\n\n脚本、片段、项目、设置和日志会保留。', '重設所有偵測/手動命令樹和產生的說明資料？\n\n腳本、片段、專案、設定和日誌會保留。', '検出/手動コマンドツリーと生成されたヘルプデータをすべてリセットしますか？\n\nスクリプト、スニペット、プロジェクト、設定、ログは保持されます。', 'Сбросить все найденные/ручные деревья команд и созданные справочные данные?\n\nСкрипты, фрагменты, проекты, настройки и логи сохранятся.', 'Zresetować wszystkie wykryte/ręczne drzewa poleceń i wygenerowane dane pomocy?\n\nSkrypty, fragmenty, projekty, ustawienia i logi zostaną zachowane.', 'Reimpostare tutti gli alberi comandi rilevati/manuali e i dati di aiuto generati?\n\nScript, snippet, progetti, impostazioni e log vengono mantenuti.', '발견/수동 명령 트리와 생성된 도움말 데이터를 모두 재설정할까요?\n\n스크립트, 스니펫, 프로젝트, 설정, 로그는 유지됩니다.', 'Alle gevonden/handmatige opdrachtbomen en gegenereerde hulpgegevens resetten?\n\nScripts, fragmenten, projecten, instellingen en logs blijven behouden.', 'Скинути всі знайдені/ручні дерева команд і згенеровані довідкові дані?\n\nСкрипти, фрагменти, проєкти, налаштування та логи буде збережено.', 'Reset semua pohon perintah ditemukan/manual dan data bantuan yang dibuat?\n\nSkrip, snippet, proyek, pengaturan, dan log tetap disimpan.', 'Tüm bulunan/manuel komut ağaçları ve üretilen yardım verileri sıfırlansın mı?\n\nBetikler, parçalar, projeler, ayarlar ve günlükler korunur.', 'Repor todas as árvores de comandos detetadas/manuais e dados de ajuda gerados?\n\nScripts, snippets, projetos, definições e logs são mantidos.', 'هل تريد إعادة ضبط كل أشجار الأوامر المكتشفة/اليدوية وبيانات المساعدة المولدة؟\n\nسيتم الاحتفاظ بالسكربتات والمقتطفات والمشاريع والإعدادات والسجلات.', 'सभी खोजे/मैनुअल कमांड ट्री और जेनरेटेड हेल्प डेटा रीसेट करें?\n\nस्क्रिप्ट, स्निपेट, प्रोजेक्ट, सेटिंग्स और लॉग सुरक्षित रहेंगे।'],
  ['Off', 'Aus', 'Désactivé', 'Desactivado', 'Desligado', '关', '關', 'オフ', 'Выкл.', 'Wył.', 'Disattivato', '끔', 'Uit', 'Вимк.', 'Mati', 'Kapalı', 'Desligado', 'إيقاف', 'बंद'],
  ['On', 'Ein', 'Activé', 'Activado', 'Ligado', '开', '開', 'オン', 'Вкл.', 'Wł.', 'Attivato', '켬', 'Aan', 'Увімк.', 'Aktif', 'Açık', 'Ligado', 'تشغيل', 'चालू'],
  ['New Terminal', 'Neues Terminal', 'Nouveau terminal', 'Nueva terminal', 'Novo terminal', '新建终端', '新增終端機', '新しいターミナル', 'Новый терминал', 'Nowy terminal', 'Nuovo terminale', '새 터미널', 'Nieuwe terminal', 'Новий термінал', 'Terminal baru', 'Yeni terminal', 'Novo terminal', 'طرفية جديدة', 'नया टर्मिनल'],
  ['Open a shell tab', 'Einen Shell-Tab öffnen', 'Ouvrir un onglet shell', 'Abrir una pestaña de shell', 'Abrir uma aba de shell', '打开一个 shell 标签页', '開啟 shell 分頁', 'シェルタブを開く', 'Открыть вкладку shell', 'Otwórz kartę powłoki', 'Apri una scheda shell', '셸 탭 열기', 'Een shell-tabblad openen', 'Відкрити вкладку shell', 'Buka tab shell', 'Bir shell sekmesi aç', 'Abrir um separador da shell', 'افتح تبويب shell', 'shell टैब खोलें'],
  ['SSH Shell', 'SSH-Shell', 'Shell SSH', 'Shell SSH', 'Shell SSH', 'SSH 终端', 'SSH 終端機', 'SSH シェル', 'SSH-shell', 'Powłoka SSH', 'Shell SSH', 'SSH 셸', 'SSH-shell', 'SSH shell', 'Shell SSH', 'SSH shell', 'Shell SSH', 'صدفة SSH', 'SSH shell'],
  ['Open SSH Shell', 'SSH-Shell öffnen', 'Ouvrir un shell SSH', 'Abrir shell SSH', 'Abrir shell SSH', '打开 SSH 终端', '開啟 SSH 終端機', 'SSH シェルを開く', 'Открыть SSH-shell', 'Otwórz powłokę SSH', 'Apri shell SSH', 'SSH 셸 열기', 'SSH-shell openen', 'Відкрити SSH shell', 'Buka shell SSH', 'SSH shell aç', 'Abrir shell SSH', 'افتح صدفة SSH', 'SSH shell खोलें'],
  ['Open a new interactive SSH shell for this workspace', 'Eine neue interaktive SSH-Shell für diesen Workspace öffnen', 'Ouvrir un nouveau shell SSH interactif pour cet espace de travail', 'Abrir una nueva shell SSH interactiva para este espacio de trabajo', 'Abrir uma nova shell SSH interativa para este workspace', '为此工作区打开新的交互式 SSH shell', '為此工作區開啟新的互動式 SSH shell', 'このワークスペース用の新しい対話型 SSH シェルを開きます', 'Открыть новую интерактивную SSH-shell для этого workspace', 'Otwórz nową interaktywną powłokę SSH dla tego obszaru roboczego', 'Apri una nuova shell SSH interattiva per questo workspace', '이 작업공간에 새 대화형 SSH 셸을 엽니다', 'Een nieuwe interactieve SSH-shell voor deze werkruimte openen', 'Відкрити нову інтерактивну SSH shell для цього workspace', 'Buka shell SSH interaktif baru untuk workspace ini', 'Bu çalışma alanı için yeni etkileşimli SSH shell aç', 'Abrir uma nova shell SSH interativa para este workspace', 'افتح صدفة SSH تفاعلية جديدة لمساحة العمل هذه', 'इस workspace के लिए नया इंटरैक्टिव SSH shell खोलें'],
  ['VNC Viewer', 'VNC-Viewer', 'Visionneuse VNC', 'Visor VNC', 'Visualizador VNC', 'VNC 查看器', 'VNC 檢視器', 'VNC ビューア', 'VNC-просмотрщик', 'Przeglądarka VNC', 'Visualizzatore VNC', 'VNC 뷰어', 'VNC-viewer', 'Переглядач VNC', 'Penampil VNC', 'VNC görüntüleyici', 'Visualizador VNC', 'عارض VNC', 'VNC व्यूअर'],
  ['Open a remote desktop session via encrypted SSH tunnel', 'Eine Remote-Desktop-Sitzung über einen verschlüsselten SSH-Tunnel öffnen', 'Ouvrir une session de bureau distant via un tunnel SSH chiffré', 'Abrir una sesión de escritorio remoto mediante túnel SSH cifrado', 'Abrir uma sessão de área de trabalho remota via túnel SSH criptografado', '通过加密 SSH 隧道打开远程桌面会话', '透過加密 SSH 通道開啟遠端桌面工作階段', '暗号化 SSH トンネル経由でリモートデスクトップセッションを開きます', 'Открыть удалённый рабочий стол через зашифрованный SSH-туннель', 'Otwórz sesję pulpitu zdalnego przez szyfrowany tunel SSH', 'Apri una sessione desktop remota tramite tunnel SSH cifrato', '암호화된 SSH 터널로 원격 데스크톱 세션을 엽니다', 'Een extern-bureaubladsessie openen via een versleutelde SSH-tunnel', 'Відкрити сеанс віддаленого робочого столу через зашифрований SSH-тунель', 'Buka sesi desktop jarak jauh melalui tunnel SSH terenkripsi', 'Şifreli SSH tüneli üzerinden uzak masaüstü oturumu aç', 'Abrir uma sessão de ambiente de trabalho remoto via túnel SSH encriptado', 'افتح جلسة سطح مكتب بعيد عبر نفق SSH مشفر', 'एन्क्रिप्टेड SSH टनल से रिमोट डेस्कटॉप सेशन खोलें'],
  ['Help Guide', 'Hilfeseite', 'Guide d’aide', 'Guía de ayuda', 'Guia de ajuda', '帮助指南', '說明指南', 'ヘルプガイド', 'Справка', 'Przewodnik pomocy', 'Guida', '도움말 가이드', 'Help-gids', 'Довідка', 'Panduan bantuan', 'Yardım kılavuzu', 'Guia de ajuda', 'دليل المساعدة', 'मदद गाइड'],
  ['How to use TerminallySKILL', 'So verwendest du TerminallySKILL', 'Comment utiliser TerminallySKILL', 'Cómo usar TerminallySKILL', 'Como usar o TerminallySKILL', '如何使用 TerminallySKILL', '如何使用 TerminallySKILL', 'TerminallySKILL の使い方', 'Как использовать TerminallySKILL', 'Jak używać TerminallySKILL', 'Come usare TerminallySKILL', 'TerminallySKILL 사용 방법', 'TerminallySKILL gebruiken', 'Як користуватися TerminallySKILL', 'Cara menggunakan TerminallySKILL', 'TerminallySKILL nasıl kullanılır', 'Como usar o TerminallySKILL', 'كيفية استخدام TerminallySKILL', 'TerminallySKILL कैसे इस्तेमाल करें'],
  ['Open app settings', 'App-Einstellungen öffnen', 'Ouvrir les paramètres de l’app', 'Abrir la configuración de la app', 'Abrir configurações do app', '打开应用设置', '開啟應用程式設定', 'アプリ設定を開く', 'Открыть настройки приложения', 'Otwórz ustawienia aplikacji', 'Apri le impostazioni dell’app', '앱 설정 열기', 'App-instellingen openen', 'Відкрити налаштування застосунку', 'Buka pengaturan aplikasi', 'Uygulama ayarlarını aç', 'Abrir definições da app', 'افتح إعدادات التطبيق', 'ऐप सेटिंग्स खोलें'],
  ['Theme, AI providers, and preferences', 'Design, KI-Anbieter und Einstellungen', 'Thème, fournisseurs IA et préférences', 'Tema, proveedores de IA y preferencias', 'Tema, provedores de IA e preferências', '主题、AI 提供商和偏好设置', '主題、AI 提供者和偏好設定', 'テーマ、AI プロバイダー、環境設定', 'Тема, провайдеры ИИ и параметры', 'Motyw, dostawcy AI i preferencje', 'Tema, provider IA e preferenze', '테마, AI 제공자 및 환경설정', 'Thema, AI-providers en voorkeuren', 'Тема, провайдери ШІ та параметри', 'Tema, penyedia AI, dan preferensi', 'Tema, AI sağlayıcıları ve tercihler', 'Tema, fornecedores de IA e preferências', 'السمة وموفرو الذكاء الاصطناعي والتفضيلات', 'थीम, AI प्रदाता और प्राथमिकताएं'],
  ['View source and report issues', 'Quellcode ansehen und Probleme melden', 'Voir le code source et signaler des problèmes', 'Ver código fuente e informar problemas', 'Ver código-fonte e relatar problemas', '查看源码并报告问题', '檢視原始碼並回報問題', 'ソースを表示して問題を報告', 'Посмотреть исходный код и сообщить о проблемах', 'Zobacz kod źródłowy i zgłoś problemy', 'Visualizza sorgente e segnala problemi', '소스 보기 및 문제 보고', 'Bron bekijken en problemen melden', 'Переглянути код і повідомити про проблеми', 'Lihat sumber dan laporkan masalah', 'Kaynağı görüntüle ve sorun bildir', 'Ver código-fonte e comunicar problemas', 'عرض المصدر والإبلاغ عن المشاكل', 'सोर्स देखें और समस्याएं रिपोर्ट करें'],
  ['Open a new terminal tab', 'Einen neuen Terminal-Tab öffnen', 'Ouvrir un nouvel onglet de terminal', 'Abrir una nueva pestaña de terminal', 'Abrir uma nova aba de terminal', '打开新的终端标签页', '開啟新的終端機分頁', '新しいターミナルタブを開く', 'Открыть новую вкладку терминала', 'Otwórz nową kartę terminala', 'Apri una nuova scheda terminale', '새 터미널 탭 열기', 'Een nieuw terminaltabblad openen', 'Відкрити нову вкладку термінала', 'Buka tab terminal baru', 'Yeni terminal sekmesi aç', 'Abrir um novo separador de terminal', 'افتح تبويب طرفية جديد', 'नया टर्मिनल टैब खोलें'],
  ['Open the getting started guide', 'Erste-Schritte-Hilfe öffnen', 'Ouvrir le guide de démarrage', 'Abrir la guía de inicio', 'Abrir o guia de primeiros passos', '打开入门指南', '開啟入門指南', 'はじめにガイドを開く', 'Открыть руководство по началу работы', 'Otwórz przewodnik startowy', 'Apri la guida introduttiva', '시작 가이드 열기', 'Aan-de-slag-gids openen', 'Відкрити посібник для початку', 'Buka panduan mulai', 'Başlangıç kılavuzunu aç', 'Abrir o guia de primeiros passos', 'افتح دليل البدء', 'शुरुआती गाइड खोलें'],
  ['How it works', 'So funktioniert es', 'Comment ça marche', 'Cómo funciona', 'Como funciona', '工作方式', '運作方式', '使い方', 'Как это работает', 'Jak to działa', 'Come funziona', '작동 방식', 'Hoe het werkt', 'Як це працює', 'Cara kerjanya', 'Nasıl çalışır', 'Como funciona', 'كيف يعمل', 'यह कैसे काम करता है'],
  ['New Project', 'Neues Projekt', 'Nouveau projet', 'Nuevo proyecto', 'Novo projeto', '新建项目', '新增專案', '新しいプロジェクト', 'Новый проект', 'Nowy projekt', 'Nuovo progetto', '새 프로젝트', 'Nieuw project', 'Новий проєкт', 'Proyek baru', 'Yeni proje', 'Novo projeto', 'مشروع جديد', 'नया प्रोजेक्ट'],
  ['Create a new project', 'Ein neues Projekt erstellen', 'Créer un nouveau projet', 'Crear un proyecto nuevo', 'Criar um novo projeto', '创建新项目', '建立新專案', '新しいプロジェクトを作成', 'Создать новый проект', 'Utwórz nowy projekt', 'Crea un nuovo progetto', '새 프로젝트 만들기', 'Een nieuw project maken', 'Створити новий проєкт', 'Buat proyek baru', 'Yeni proje oluştur', 'Criar um novo projeto', 'إنشاء مشروع جديد', 'नया प्रोजेक्ट बनाएं'],
  ['Search commands, scripts, snippets...', 'Befehle, Skripte, Snippets suchen...', 'Rechercher commandes, scripts, extraits...', 'Buscar comandos, scripts, fragmentos...', 'Buscar comandos, scripts, snippets...', '搜索命令、脚本、片段...', '搜尋命令、腳本、片段...', 'コマンド、スクリプト、スニペットを検索...', 'Искать команды, скрипты, фрагменты...', 'Szukaj poleceń, skryptów, fragmentów...', 'Cerca comandi, script, snippet...', '명령, 스크립트, 스니펫 검색...', 'Opdrachten, scripts, fragmenten zoeken...', 'Пошук команд, скриптів, фрагментів...', 'Cari perintah, skrip, snippet...', 'Komut, betik, parça ara...', 'Procurar comandos, scripts, snippets...', 'ابحث في الأوامر والسكربتات والمقتطفات...', 'कमांड, स्क्रिप्ट, स्निपेट खोजें...'],
  ['Commands', 'Befehle', 'Commandes', 'Comandos', 'Comandos', '命令', '命令', 'コマンド', 'Команды', 'Polecenia', 'Comandi', '명령', 'Opdrachten', 'Команди', 'Perintah', 'Komutlar', 'Comandos', 'الأوامر', 'कमांड'],
  ['Scripts', 'Skripte', 'Automatisations', 'Guiones', 'Roteiros', '脚本', '腳本', 'スクリプト', 'Скрипты', 'Skrypty', 'Automazioni', '스크립트', 'Automatiseringen', 'Скрипти', 'Skrip', 'Betikler', 'Roteiros', 'السكربتات', 'स्क्रिप्ट'],
  ['Snippets', 'Ausschnitte', 'Extraits', 'Fragmentos', 'Trechos', '片段', '片段', 'スニペット', 'Фрагменты', 'Fragmenty', 'Snippet', '스니펫', 'Fragmenten', 'Фрагменти', 'Snippet', 'Parçalar', 'Trechos', 'المقتطفات', 'स्निपेट'],
  ['Files', 'Dateien', 'Fichiers', 'Archivos', 'Arquivos', '文件', '檔案', 'ファイル', 'Файлы', 'Pliki', 'File', '파일', 'Bestanden', 'Файли', 'File', 'Dosyalar', 'Ficheiros', 'الملفات', 'फाइलें'],
  ['Search', 'Suche', 'Recherche', 'Buscar', 'Buscar', '搜索', '搜尋', '検索', 'Поиск', 'Szukaj', 'Cerca', '검색', 'Zoeken', 'Пошук', 'Cari', 'Ara', 'Procurar', 'بحث', 'खोजें'],
  ['Add Script', 'Skript hinzufügen', 'Ajouter un script', 'Agregar script', 'Adicionar script', '添加脚本', '新增腳本', 'スクリプトを追加', 'Добавить скрипт', 'Dodaj skrypt', 'Aggiungi script', '스크립트 추가', 'Script toevoegen', 'Додати скрипт', 'Tambah skrip', 'Betik ekle', 'Adicionar script', 'أضف سكربت', 'स्क्रिप्ट जोड़ें'],
  ['New Script', 'Neues Skript', 'Nouveau script', 'Nuevo script', 'Novo script', '新建脚本', '新增腳本', '新しいスクリプト', 'Новый скрипт', 'Nowy skrypt', 'Nuovo script', '새 스크립트', 'Nieuw script', 'Новий скрипт', 'Skrip baru', 'Yeni betik', 'Novo script', 'سكربت جديد', 'नई स्क्रिप्ट'],
  ['Create', 'Erstellen', 'Créer', 'Crear', 'Criar', '创建', '建立', '作成', 'Создать', 'Utwórz', 'Crea', '생성', 'Maken', 'Створити', 'Buat', 'Oluştur', 'Criar', 'إنشاء', 'बनाएं'],
  ['Cancel', 'Abbrechen', 'Annuler', 'Cancelar', 'Cancelar', '取消', '取消', 'キャンセル', 'Отмена', 'Anuluj', 'Annulla', '취소', 'Annuleren', 'Скасувати', 'Batal', 'İptal', 'Cancelar', 'إلغاء', 'रद्द करें'],
  ['Duplicate', 'Duplizieren', 'Dupliquer', 'Duplicar', 'Duplicar', '复制', '複製', '複製', 'Дублировать', 'Duplikuj', 'Duplica', '복제', 'Dupliceren', 'Дублювати', 'Duplikat', 'Çoğalt', 'Duplicar', 'تكرار', 'डुप्लिकेट'],
  ['Remove from project', 'Aus Projekt entfernen', 'Retirer du projet', 'Quitar del proyecto', 'Remover do projeto', '从项目移除', '從專案移除', 'プロジェクトから削除', 'Убрать из проекта', 'Usuń z projektu', 'Rimuovi dal progetto', '프로젝트에서 제거', 'Uit project verwijderen', 'Вилучити з проєкту', 'Hapus dari proyek', 'Projeden kaldır', 'Remover do projeto', 'إزالة من المشروع', 'प्रोजेक्ट से हटाएं'],
  ['Delete permanently', 'Dauerhaft löschen', 'Supprimer définitivement', 'Eliminar permanentemente', 'Excluir permanentemente', '永久删除', '永久刪除', '完全に削除', 'Удалить навсегда', 'Usuń trwale', 'Elimina definitivamente', '영구 삭제', 'Permanent verwijderen', 'Видалити назавжди', 'Hapus permanen', 'Kalıcı olarak sil', 'Eliminar permanentemente', 'حذف نهائي', 'हमेशा के लिए हटाएं'],
  ['Run Workflow', 'Workflow ausführen', 'Exécuter le workflow', 'Ejecutar workflow', 'Executar workflow', '运行工作流', '執行工作流程', 'ワークフローを実行', 'Запустить workflow', 'Uruchom workflow', 'Esegui workflow', '워크플로 실행', 'Workflow uitvoeren', 'Запустити workflow', 'Jalankan workflow', 'Workflow çalıştır', 'Executar workflow', 'تشغيل سير العمل', 'वर्कफ़्लो चलाएं'],
  ['Script', 'Skript', 'Automatisation', 'Guion', 'Roteiro', '脚本', '腳本', 'スクリプト', 'Скрипт', 'Skrypt', 'Automazione', '스크립트', 'Automatisering', 'Скрипт', 'Skrip', 'Betik', 'Roteiro', 'سكربت', 'स्क्रिप्ट'],
  ['Add command to an existing or new script', 'Befehl zu einem vorhandenen oder neuen Skript hinzufügen', 'Ajouter la commande à un script existant ou nouveau', 'Agregar comando a un script existente o nuevo', 'Adicionar comando a um script existente ou novo', '将命令添加到现有或新脚本', '將命令加入現有或新腳本', '既存または新規スクリプトにコマンドを追加', 'Добавить команду в существующий или новый скрипт', 'Dodaj polecenie do istniejącego lub nowego skryptu', 'Aggiungi il comando a uno script esistente o nuovo', '기존 또는 새 스크립트에 명령 추가', 'Opdracht toevoegen aan een bestaand of nieuw script', 'Додати команду до наявного або нового скрипта', 'Tambahkan perintah ke skrip yang ada atau baru', 'Komutu mevcut veya yeni bir betiğe ekle', 'Adicionar comando a um script existente ou novo', 'أضف الأمر إلى سكربت موجود أو جديد', 'मौजूदा या नई स्क्रिप्ट में कमांड जोड़ें'],
  ['Add Scripts', 'Skripte hinzufügen', 'Ajouter des scripts', 'Agregar scripts', 'Adicionar scripts', '添加脚本', '新增腳本', 'スクリプトを追加', 'Добавить скрипты', 'Dodaj skrypty', 'Aggiungi script', '스크립트 추가', 'Scripts toevoegen', 'Додати скрипти', 'Tambah skrip', 'Betikler ekle', 'Adicionar scripts', 'أضف سكربتات', 'स्क्रिप्ट जोड़ें'],
  ['New Snippet', 'Neues Snippet', 'Nouvel extrait', 'Nuevo fragmento', 'Novo snippet', '新建片段', '新增片段', '新しいスニペット', 'Новый фрагмент', 'Nowy fragment', 'Nuovo snippet', '새 스니펫', 'Nieuw fragment', 'Новий фрагмент', 'Snippet baru', 'Yeni parça', 'Novo snippet', 'مقتطف جديد', 'नया स्निपेट'],
  ['Quick run', 'Schnelllauf', 'Exécution rapide', 'Ejecución rápida', 'Execução rápida', '快速运行', '快速執行', 'クイック実行', 'Быстрый запуск', 'Szybkie uruchomienie', 'Esecuzione rapida', '빠른 실행', 'Snel uitvoeren', 'Швидкий запуск', 'Jalankan cepat', 'Hızlı çalıştır', 'Execução rápida', 'تشغيل سريع', 'त्वरित चलाएं'],
  ['Fill variables & run', 'Variablen ausfüllen & ausführen', 'Remplir les variables et exécuter', 'Rellenar variables y ejecutar', 'Preencher variáveis e executar', '填写变量并运行', '填入變數並執行', '変数を入力して実行', 'Заполнить переменные и запустить', 'Uzupełnij zmienne i uruchom', 'Compila le variabili ed esegui', '변수 입력 후 실행', 'Variabelen invullen en uitvoeren', 'Заповнити змінні й запустити', 'Isi variabel & jalankan', 'Değişkenleri doldur ve çalıştır', 'Preencher variáveis e executar', 'املأ المتغيرات وشغّل', 'वेरिएबल भरें और चलाएं'],
  ['No snippets yet', 'Noch keine Snippets', 'Aucun extrait pour le moment', 'Aún no hay fragmentos', 'Ainda não há snippets', '还没有片段', '尚無片段', 'スニペットはまだありません', 'Фрагментов пока нет', 'Nie ma jeszcze fragmentów', 'Ancora nessuno snippet', '아직 스니펫 없음', 'Nog geen fragmenten', 'Фрагментів ще немає', 'Belum ada snippet', 'Henüz parça yok', 'Ainda não há snippets', 'لا توجد مقتطفات بعد', 'अभी कोई स्निपेट नहीं'],
  ['No snippet selected', 'Kein Snippet ausgewählt', 'Aucun extrait sélectionné', 'Ningún fragmento seleccionado', 'Nenhum snippet selecionado', '未选择片段', '未選取片段', 'スニペットが選択されていません', 'Фрагмент не выбран', 'Nie wybrano fragmentu', 'Nessuno snippet selezionato', '선택한 스니펫 없음', 'Geen fragment geselecteerd', 'Фрагмент не вибрано', 'Tidak ada snippet dipilih', 'Parça seçilmedi', 'Nenhum snippet selecionado', 'لم يتم تحديد مقتطف', 'कोई स्निपेट चुना नहीं गया'],
  ['Template', 'Vorlage', 'Modèle', 'Plantilla', 'Modelo', '模板', '範本', 'テンプレート', 'Шаблон', 'Szablon', 'Modello', '템플릿', 'Sjabloon', 'Шаблон', 'Templat', 'Şablon', 'Modelo', 'قالب', 'टेम्पलेट'],
  ['Variables', 'Variablen', 'Paramètres', 'Valores', 'Variáveis', '变量', '變數', '変数', 'Переменные', 'Zmienne', 'Variabili', '변수', 'Variabelen', 'Змінні', 'Variabel', 'Değişkenler', 'Variáveis', 'المتغيرات', 'वेरिएबल'],
  ['Preview', 'Vorschau', 'Aperçu', 'Vista previa', 'Prévia', '预览', '預覽', 'プレビュー', 'Предпросмотр', 'Podgląd', 'Anteprima', '미리보기', 'Voorbeeld', 'Попередній перегляд', 'Pratinjau', 'Önizleme', 'Pré-visualização', 'معاينة', 'प्रीव्यू'],
  ['Copy', 'Kopieren', 'Copier', 'Copiar', 'Copiar', '复制', '複製', 'コピー', 'Копировать', 'Kopiuj', 'Copia', '복사', 'Kopiëren', 'Копіювати', 'Salin', 'Kopyala', 'Copiar', 'نسخ', 'कॉपी'],
  ['Run', 'Ausführen', 'Exécuter', 'Ejecutar', 'Executar', '运行', '執行', '実行', 'Запустить', 'Uruchom', 'Esegui', '실행', 'Uitvoeren', 'Запустити', 'Jalankan', 'Çalıştır', 'Executar', 'تشغيل', 'चलाएं'],
  ['Default value', 'Standardwert', 'Valeur par défaut', 'Valor predeterminado', 'Valor padrão', '默认值', '預設值', '既定値', 'Значение по умолчанию', 'Wartość domyślna', 'Valore predefinito', '기본값', 'Standaardwaarde', 'Типове значення', 'Nilai default', 'Varsayılan değer', 'Valor predefinido', 'القيمة الافتراضية', 'डिफ़ॉल्ट मान'],
  ['Search in project...', 'Im Projekt suchen...', 'Rechercher dans le projet...', 'Buscar en el proyecto...', 'Buscar no projeto...', '在项目中搜索...', '在專案中搜尋...', 'プロジェクト内を検索...', 'Поиск в проекте...', 'Szukaj w projekcie...', 'Cerca nel progetto...', '프로젝트에서 검색...', 'Zoeken in project...', 'Пошук у проєкті...', 'Cari di proyek...', 'Projede ara...', 'Procurar no projeto...', 'ابحث في المشروع...', 'प्रोजेक्ट में खोजें...'],
  ['Case sensitive', 'Groß-/Kleinschreibung', 'Sensible à la casse', 'Distinguir mayúsculas', 'Diferenciar maiúsculas', '区分大小写', '區分大小寫', '大文字小文字を区別', 'С учетом регистра', 'Uwzględniaj wielkość liter', 'Distingui maiuscole', '대소문자 구분', 'Hoofdlettergevoelig', 'З урахуванням регістру', 'Peka huruf besar/kecil', 'Büyük/küçük harfe duyarlı', 'Sensível a maiúsculas', 'حساس لحالة الأحرف', 'केस संवेदनशील'],
  ['Use regex', 'Regex verwenden', 'Utiliser une regex', 'Usar regex', 'Usar regex', '使用正则', '使用 regex', '正規表現を使用', 'Использовать regex', 'Użyj regex', 'Usa regex', '정규식 사용', 'Regex gebruiken', 'Використати regex', 'Gunakan regex', 'Regex kullan', 'Usar regex', 'استخدم regex', 'regex इस्तेमाल करें'],
  ['Filter options', 'Filteroptionen', 'Options de filtre', 'Opciones de filtro', 'Opções de filtro', '筛选选项', '篩選選項', 'フィルターオプション', 'Параметры фильтра', 'Opcje filtra', 'Opzioni filtro', '필터 옵션', 'Filteropties', 'Параметри фільтра', 'Opsi filter', 'Filtre seçenekleri', 'Opções de filtro', 'خيارات التصفية', 'फिल्टर विकल्प'],
  ['Search logs and runs...', 'Protokolle und Läufe suchen...', 'Rechercher journaux et exécutions...', 'Buscar registros y ejecuciones...', 'Buscar logs e execuções...', '搜索日志和运行...', '搜尋日誌和執行...', 'ログと実行を検索...', 'Поиск логов и запусков...', 'Szukaj logów i uruchomień...', 'Cerca log ed esecuzioni...', '로그와 실행 검색...', 'Logs en uitvoeringen zoeken...', 'Пошук логів і запусків...', 'Cari log dan run...', 'Günlüklerde ve çalıştırmalarda ara...', 'Procurar logs e execuções...', 'ابحث في السجلات والتشغيلات...', 'लॉग और रन खोजें...'],
  ['Workflow Runs', 'Workflow-Läufe', 'Exécutions de workflow', 'Ejecuciones de workflow', 'Execuções de workflow', '工作流运行', '工作流程執行', 'ワークフロー実行', 'Запуски workflow', 'Uruchomienia workflow', 'Esecuzioni workflow', '워크플로 실행', 'Workflow-uitvoeringen', 'Запуски workflow', 'Run workflow', 'Workflow çalıştırmaları', 'Execuções de workflow', 'تشغيلات سير العمل', 'वर्कफ़्लो रन'],
  ['Terminal Logs', 'Terminalprotokolle', 'Journaux du terminal', 'Registros del terminal', 'Logs do terminal', '终端日志', '終端機日誌', 'ターミナルログ', 'Логи терминала', 'Logi terminala', 'Log terminale', '터미널 로그', 'Terminallogs', 'Логи термінала', 'Log terminal', 'Terminal günlükleri', 'Logs do terminal', 'سجلات الطرفية', 'टर्मिनल लॉग'],
  ['Runs', 'Läufe', 'Exécutions', 'Ejecuciones', 'Execuções', '运行', '執行', '実行', 'Запуски', 'Uruchomienia', 'Esecuzioni', '실행', 'Uitvoeringen', 'Запуски', 'Run', 'Çalıştırmalar', 'Execuções', 'التشغيلات', 'रन'],
  ['Open Logs Folder', 'Protokollordner öffnen', 'Ouvrir le dossier des journaux', 'Abrir carpeta de registros', 'Abrir pasta de logs', '打开日志文件夹', '開啟日誌資料夾', 'ログフォルダーを開く', 'Открыть папку логов', 'Otwórz folder logów', 'Apri cartella log', '로그 폴더 열기', 'Logmap openen', 'Відкрити папку логів', 'Buka folder log', 'Günlükler klasörünü aç', 'Abrir pasta de logs', 'افتح مجلد السجلات', 'लॉग फ़ोल्डर खोलें'],
  ['completed', 'abgeschlossen', 'terminé', 'completado', 'concluído', '已完成', '已完成', '完了', 'завершено', 'ukończono', 'completato', '완료됨', 'voltooid', 'завершено', 'selesai', 'tamamlandı', 'concluído', 'مكتمل', 'पूरा'],
  ['failed', 'fehlgeschlagen', 'échoué', 'fallido', 'falhou', '失败', '失敗', '失敗', 'ошибка', 'niepowodzenie', 'non riuscito', '실패', 'mislukt', 'помилка', 'gagal', 'başarısız', 'falhou', 'فشل', 'विफल'],
  ['cancelled', 'abgebrochen', 'annulé', 'cancelado', 'cancelado', '已取消', '已取消', 'キャンセル済み', 'отменено', 'anulowano', 'annullato', '취소됨', 'geannuleerd', 'скасовано', 'dibatalkan', 'iptal edildi', 'cancelado', 'ملغى', 'रद्द'],
  ['closed', 'geschlossen', 'fermé', 'cerrado', 'fechado', '已关闭', '已關閉', '終了', 'закрыто', 'zamknięto', 'chiuso', '닫힘', 'gesloten', 'закрито', 'ditutup', 'kapalı', 'fechado', 'مغلق', 'बंद'],
  ['Open Log', 'Protokoll öffnen', 'Ouvrir le journal', 'Abrir registro', 'Abrir log', '打开日志', '開啟日誌', 'ログを開く', 'Открыть лог', 'Otwórz log', 'Apri log', '로그 열기', 'Log openen', 'Відкрити лог', 'Buka log', 'Günlüğü aç', 'Abrir log', 'افتح السجل', 'लॉग खोलें'],
  ['Delete log', 'Protokoll löschen', 'Supprimer le journal', 'Eliminar registro', 'Excluir log', '删除日志', '刪除日誌', 'ログを削除', 'Удалить лог', 'Usuń log', 'Elimina log', '로그 삭제', 'Log verwijderen', 'Видалити лог', 'Hapus log', 'Günlüğü sil', 'Eliminar log', 'حذف السجل', 'लॉग हटाएं'],
  ['No terminal sessions. Click + or execute a command.', 'Keine Terminal-Sitzungen. Klicke auf + oder führe einen Befehl aus.', 'Aucune session de terminal. Cliquez sur + ou exécutez une commande.', 'No hay sesiones de terminal. Haz clic en + o ejecuta un comando.', 'Nenhuma sessão de terminal. Clique em + ou execute um comando.', '没有终端会话。点击 + 或执行命令。', '沒有終端機工作階段。點選 + 或執行命令。', 'ターミナルセッションはありません。+ をクリックするかコマンドを実行してください。', 'Нет сеансов терминала. Нажмите + или выполните команду.', 'Brak sesji terminala. Kliknij + albo uruchom polecenie.', 'Nessuna sessione terminale. Fai clic su + o esegui un comando.', '터미널 세션이 없습니다. +를 클릭하거나 명령을 실행하세요.', 'Geen terminalsessies. Klik op + of voer een opdracht uit.', 'Немає сеансів термінала. Натисніть + або виконайте команду.', 'Tidak ada sesi terminal. Klik + atau jalankan perintah.', 'Terminal oturumu yok. + düğmesine tıkla veya bir komut çalıştır.', 'Sem sessões de terminal. Clica em + ou executa um comando.', 'لا توجد جلسات طرفية. انقر + أو نفّذ أمرًا.', 'कोई टर्मिनल सेशन नहीं। + क्लिक करें या कमांड चलाएं।'],
  ['Latest output', 'Neueste Ausgabe', 'Dernière sortie', 'Última salida', 'Saída mais recente', '最新输出', '最新輸出', '最新出力', 'Последний вывод', 'Najnowsze wyjście', 'Output più recente', '최신 출력', 'Laatste uitvoer', 'Останній вивід', 'Output terbaru', 'Son çıktı', 'Saída mais recente', 'آخر مخرجات', 'नवीनतम आउटपुट'],
  ['Review Session', 'Sitzung prüfen', 'Réviser la session', 'Revisar sesión', 'Revisar sessão', '审查会话', '檢視工作階段', 'セッションをレビュー', 'Проверить сеанс', 'Przejrzyj sesję', 'Revisiona sessione', '세션 검토', 'Sessie beoordelen', 'Переглянути сеанс', 'Tinjau sesi', 'Oturumu gözden geçir', 'Rever sessão', 'مراجعة الجلسة', 'सेशन समीक्षा'],
  ['Refresh Session', 'Sitzung aktualisieren', 'Actualiser la session', 'Actualizar sesión', 'Atualizar sessão', '刷新会话', '重新整理工作階段', 'セッションを更新', 'Обновить сеанс', 'Odśwież sesję', 'Aggiorna sessione', '세션 새로 고침', 'Sessie vernieuwen', 'Оновити сеанс', 'Segarkan sesi', 'Oturumu yenile', 'Atualizar sessão', 'تحديث الجلسة', 'सेशन रीफ्रेश करें'],
  ['Find in terminal...', 'Im Terminal suchen...', 'Rechercher dans le terminal...', 'Buscar en la terminal...', 'Buscar no terminal...', '在终端中查找...', '在終端機中尋找...', 'ターミナル内を検索...', 'Найти в терминале...', 'Znajdź w terminalu...', 'Trova nel terminale...', '터미널에서 찾기...', 'Zoeken in terminal...', 'Знайти в терміналі...', 'Cari di terminal...', 'Terminalde bul...', 'Procurar no terminal...', 'ابحث في الطرفية...', 'टर्मिनल में खोजें...'],
  ['Regular expression', 'Regulärer Ausdruck', 'Expression régulière', 'Expresión regular', 'Expressão regular', '正则表达式', '正規表示式', '正規表現', 'Регулярное выражение', 'Wyrażenie regularne', 'Espressione regolare', '정규식', 'Reguliere expressie', 'Регулярний вираз', 'Ekspresi reguler', 'Düzenli ifade', 'Expressão regular', 'تعبير نمطي', 'रेगुलर एक्सप्रेशन'],
  ['Whole word', 'Ganzes Wort', 'Mot entier', 'Palabra completa', 'Palavra inteira', '全字匹配', '完整單字', '単語全体', 'Слово целиком', 'Całe słowo', 'Parola intera', '전체 단어', 'Heel woord', 'Ціле слово', 'Seluruh kata', 'Tam kelime', 'Palavra inteira', 'كلمة كاملة', 'पूरा शब्द'],
  ['Editor prompt help', 'Editor-Prompt-Hilfe', 'Aide de l’invite éditeur', 'Ayuda del prompt de editor', 'Ajuda do prompt do editor', '编辑器提示帮助', '編輯器提示說明', 'エディタープロンプトのヘルプ', 'Справка редакторского ввода', 'Pomoc promptu edytora', 'Aiuto prompt editor', '편집기 프롬프트 도움말', 'Hulp voor editorprompt', 'Довідка редакторського вводу', 'Bantuan prompt editor', 'Düzenleyici istemi yardımı', 'Ajuda do prompt do editor', 'مساعدة موجه المحرر', 'एडिटर प्रॉम्प्ट मदद'],
  ['History', 'Verlauf', 'Historique', 'Historial', 'Histórico', '历史', '歷史', '履歴', 'История', 'Historia', 'Cronologia', '기록', 'Geschiedenis', 'Історія', 'Riwayat', 'Geçmiş', 'Histórico', 'السجل', 'इतिहास'],
  ['Command', 'Befehl', 'Commande', 'Comando', 'Comando', '命令', '命令', 'コマンド', 'Команда', 'Polecenie', 'Comando', '명령', 'Opdracht', 'Команда', 'Perintah', 'Komut', 'Comando', 'الأمر', 'कमांड'],
  ['Directory', 'Verzeichnis', 'Dossier', 'Directorio', 'Diretório', '目录', '目錄', 'ディレクトリ', 'Каталог', 'Katalog', 'Cartella', '디렉터리', 'Map', 'Каталог', 'Direktori', 'Dizin', 'Diretório', 'المجلد', 'डायरेक्टरी']
]

function buildFallbackPhraseTranslations(): Record<string, Record<string, string>> {
  const translations: Record<string, Record<string, string>> = {}

  for (const [source, ...localized] of LOCALIZED_FALLBACK_PHRASES) {
    for (let index = 0; index < LOCALIZED_FALLBACK_LOCALE_ORDER.length; index += 1) {
      const locale = LOCALIZED_FALLBACK_LOCALE_ORDER[index]
      translations[locale] = translations[locale] ?? {}
      translations[locale][source] = localized[index]
    }
  }

  return translations
}

const fallbackPhraseTranslations = buildFallbackPhraseTranslations()

function localizeKnownEnglishFallbacks(locale: string, value: unknown): unknown {
  const phraseTranslations = fallbackPhraseTranslations[locale]
  if (!phraseTranslations) return value

  if (typeof value === 'string') {
    return phraseTranslations[value] ?? value
  }

  if (!isPlainObject(value)) {
    return value
  }

  const localized: ResourceNamespace = {}
  for (const [key, child] of Object.entries(value)) {
    localized[key] = localizeKnownEnglishFallbacks(locale, child)
  }
  return localized
}

export const resources: Record<string, LocaleResource> = {
  en,
  'en-US': withOverrides({}),
  'en-GB': withOverrides({
    settings: {
      locale: {
        formatLocale: 'Formats',
        systemDescription: 'Use the language preferred by the operating system.'
      }
    }
  }),
  'de-DE': withOverrides(mergeLocaleOverrides({
    common: { states: { loading: 'TerminallySKILL wird geladen...', system: 'Systemstandard' } },
    settings: {
      title: 'Einstellungen',
      locale: {
        title: 'Sprache & Region',
        description: 'Steuere UI-Sprache, regionale Formate und Sprache der KI-Antworten.',
        uiLanguage: 'UI-Sprache',
        formatLocale: 'Formate',
        aiLanguage: 'KI-Antworten',
        systemDescription: 'Die vom Betriebssystem bevorzugte Sprache verwenden.',
        formatDescription: 'Steuert Datum, Uhrzeit, Zahlen und Sortierung.',
        aiDescription: 'Befehle, Flags, Dateipfade, Code und Shell-Ausgabe bleiben unverandert.',
        appLanguage: 'Wie App-Sprache'
      }
    },
    dashboard: {
      activeRuns: {
        stepProgress: 'Schritt {{current}} / {{total}}',
        awaitingApproval: 'Wartet auf Freigabe',
        jumpToTerminal: 'Zum Terminal'
      },
      quickActions: {
        newTerminal: 'Neues Terminal',
        noRecentScripts: 'Keine aktuellen Skripte',
        openFolder: 'Ordner offnen'
      },
      sections: {
        recentRuns: 'Letzte Ausfuhrungen',
        scripts: 'Skripte',
        recentCommands: 'Letzte Befehle'
      },
      actions: {
        viewAll: 'Alle anzeigen',
        rerun: '{{name}} erneut ausfuhren'
      },
      scripts: {
        step_one: '{{count}} Schritt',
        step_other: '{{count}} Schritte'
      },
      empty: {
        title: 'Bereit',
        description: 'Offne ein Terminal, starte ein Skript oder wahle einen Befehl aus der Seitenleiste.'
      }
    },
    layout: {
      terminal: {
        expand: 'Terminal erweitern',
        expandDescription: 'Das angedockte Terminalfeld wiederherstellen'
      },
      topbar: {
        sshShell: 'SSH-Shell',
        sshShellDescription: 'Eine neue interaktive SSH-Shell fur diesen Workspace offnen',
        vncViewer: 'VNC-Viewer',
        vncViewerDescription: 'Eine Remote-Desktop-Sitzung uber einen verschlusselten SSH-Tunnel offnen',
        newTerminal: 'Neues Terminal',
        newTerminalDescription: 'Einen Shell-Tab offnen',
        helpGuide: 'Hilfeseite',
        helpGuideDescription: 'So verwendest du TerminallySKILL',
        settings: 'Einstellungen',
        settingsDescription: 'Theme, KI-Anbieter und Einstellungen',
        github: 'GitHub',
        githubDescription: 'Quellcode ansehen und Probleme melden',
        website: 'Website',
        websiteDescription: 'terminallyskill.com'
      },
      palette: {
        actions: {
          newTerminal: 'Neues Terminal',
          newTerminalDescription: 'Einen neuen Terminal-Tab offnen',
          openSshShell: 'SSH-Shell offnen',
          openSshShellDescription: 'Eine neue interaktive SSH-Shell fur diesen Workspace offnen',
          settings: 'Einstellungen',
          settingsDescription: 'App-Einstellungen offnen',
          info: 'So funktioniert es',
          infoDescription: 'Erste-Schritte-Hilfe offnen',
          newProject: 'Neues Projekt',
          newProjectDescription: 'Ein neues Projekt erstellen'
        },
        types: {
          action: 'Aktion',
          command: 'Befehl',
          script: 'Skript',
          snippet: 'Snippet',
          history: 'Verlauf'
        },
        searchPlaceholder: 'Befehle, Skripte, Snippets suchen...',
        noResults: 'Keine Ergebnisse fur "{{query}}"',
        historyRunAgain: 'Erneut im Terminal ausfuhren',
        scriptStep_one: '{{count}} Schritt',
        scriptStep_other: '{{count}} Schritte',
        shortcuts: {
          navigate: 'navigieren',
          select: 'auswahlen',
          close: 'schliessen'
        }
      },
      sidebar: {
        tabs: {
          commands: 'Befehle',
          scripts: 'Skripte',
          snippets: 'Snippets',
          files: 'Dateien',
          logs: 'Logs',
          search: 'Suche'
        },
        files: {
          noProjectTitle: 'Offne ein Projekt, um Dateien zu durchsuchen',
          noProjectDescription:
            'Dateien werden pro Projekt angezeigt, damit Tabs, Bearbeitungen und Dateiverlauf dem richtigen Workspace zugeordnet bleiben.'
        },
        commands: {
          expandAll: 'Alle Befehlsbaume erweitern',
          collapseAll: 'Alle Befehlsbaume einklappen',
          addManual: 'Befehl manuell hinzufugen',
          scanInstalled: 'Installierte Befehle scannen',
          favorites: 'Favoriten',
          loading: 'Befehle werden geladen...',
          noMatches: 'Keine Befehle passen zu deiner Suche',
          noMatchesHint: 'Versuche ein anderes Stichwort oder leere die Suche',
          emptyTitle: 'Noch keine Befehlsbaume',
          emptyDescription:
            'Beginne leer und fuge nur die Tools hinzu, die auf diesem Computer wirklich installiert sind.',
          pickPopular: 'Beliebte installierte Befehle auswahlen',
          scanAll: 'Alle installierten Befehle scannen',
          popularInstalled: 'Beliebte installierte Befehle',
          scanResults: 'Scan-Ergebnisse',
          removeTitle: 'Befehl entfernen',
          removeMessage: '"{{name}}" wird dauerhaft entfernt. Das kann nicht ruckgangig gemacht werden.',
          remove: 'Entfernen',
          removeFavorite: 'Aus Favoriten entfernen',
          removeSaved: 'Gespeicherten Befehl entfernen'
        },
        versionLoading: 'Version wird geladen...'
      },
      settings: {
        title: 'Einstellungen'
      },
      empty: {
        title: 'Erste Schritte',
        description: 'Erstelle ein Projekt, um dein Workspace-Ziel festzulegen und Lieblingsbefehle anzuheften',
        createProject: 'Projekt erstellen',
        howItWorks: 'So funktioniert es'
      },
      updates: {
        available: 'Update {{version}} ist verfugbar',
        whatsNew: 'Neuigkeiten',
        releaseNotesHint: 'Ausklappen, um Highlights und das vollstandige Changelog zu sehen.',
        dismissBanner: 'Update-Banner ausblenden',
        downloadInstall: 'Update herunterladen und installieren',
        downloadOpen: 'Update herunterladen und offnen',
        installing: 'Update wird installiert',
        opening: 'Update wird geoffnet'
      }
    },
    projects: {
      selector: {
        none: 'Kein Projekt',
        searchPlaceholder: 'Projekte suchen...',
        empty: 'Noch keine Projekte. Erstelle eines, um loszulegen.',
        noMatches: 'Keine passenden Projekte',
        terminalCount_one: '{{count}} Terminal',
        terminalCount_other: '{{count}} Terminals',
        terminalCountActive_one: '{{count}} Terminal, Prozess lauft',
        terminalCountActive_other: '{{count}} Terminals, Prozesse laufen',
        openNewWindow: 'In neuem Fenster offnen',
        edit: 'Projekt bearbeiten',
        newProject: 'Neues Projekt'
      }
    },
    scripts: {
      actions: {
        addScript: 'Skript hinzufugen',
        newScript: 'Neues Skript',
        create: 'Erstellen',
        cancel: 'Abbrechen',
        importTvflow: '.tvflow-Skript importieren',
        createNewScript: 'Neues Skript erstellen',
        exportTvflow: 'Als .tvflow exportieren',
        duplicate: 'Duplizieren',
        removeFromProject: 'Aus Projekt entfernen',
        deletePermanently: 'Dauerhaft loschen',
        runWorkflow: 'Workflow ausfuhren'
      },
      placeholders: {
        scriptName: 'Skriptname...'
      },
      empty: {
        projectTitle: 'Keine Skripte zu diesem Projekt hinzugefugt',
        projectDescription: 'Fuge vorhandene Skripte hinzu oder erstelle neue',
        globalTitle: 'Noch keine Skripte',
        globalDescription: 'Erstelle eines oder fuge Befehle aus dem Builder hinzu'
      }
    },
    terminal: { panel: { noSessions: 'Keine Terminal-Sitzungen. Klicke auf + oder fuhre einen Befehl aus.' } },
    commands: { search: { placeholder: 'Befehle suchen...' }, status: { missing: 'Fehlt' } },
    ai: { localeInstruction: 'Antworte auf Deutsch. Bewahre Terminalbefehle, Flags, Dateipfade, Umgebungsvariablen, Code und Shell-Ausgabe exakt.' }
  }, p0SurfaceOverrides['de-DE'])),
  'fr-FR': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['fr-FR'],
    common: { states: { loading: 'Chargement de TerminallySKILL...', system: 'Par defaut du systeme' } },
    settings: {
      title: 'Parametres',
      locale: {
        title: 'Langue et region',
        description: "Controle la langue de l'interface, les formats regionaux et la langue des reponses IA.",
        uiLanguage: "Langue de l'interface",
        formatLocale: 'Formats',
        aiLanguage: 'Reponses IA',
        systemDescription: 'Utiliser la langue preferee du systeme.',
        formatDescription: 'Controle les dates, heures, nombres et le tri.',
        aiDescription: 'Les commandes, options, chemins, code et sorties shell restent inchanges.',
        appLanguage: "Comme la langue de l'app"
      }
    },
    commands: { search: { placeholder: 'Rechercher des commandes...' }, status: { missing: 'Manquant' } },
    ai: { localeInstruction: 'Reponds en francais. Preserve exactement les commandes, options, chemins, variables, code et sorties shell.' }
  }, p0SurfaceOverrides['fr-FR'])),
  es: withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides.es,
    common: { states: { loading: 'Cargando TerminallySKILL...', system: 'Predeterminado del sistema' } },
    settings: {
      title: 'Configuracion',
      locale: {
        title: 'Idioma y region',
        description: 'Controla el idioma de la interfaz, los formatos regionales y el idioma de las respuestas de IA.',
        uiLanguage: 'Idioma de la interfaz',
        formatLocale: 'Formatos',
        aiLanguage: 'Respuestas de IA',
        systemDescription: 'Usar el idioma preferido por el sistema operativo.',
        formatDescription: 'Controla fechas, horas, numeros y ordenacion.',
        aiDescription: 'Los comandos, flags, rutas, codigo y salida de shell no cambian.',
        appLanguage: 'Igual que la app'
      }
    },
    commands: { search: { placeholder: 'Buscar comandos...' }, status: { missing: 'No encontrado' } },
    ai: { localeInstruction: 'Responde en espanol. Conserva exactamente comandos, flags, rutas, variables de entorno, codigo y salida de shell.' }
  }, p0SurfaceOverrides.es)),
  'pt-BR': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['pt-BR'],
    common: { states: { loading: 'Carregando TerminallySKILL...', system: 'Padrao do sistema' } },
    settings: {
      title: 'Configuracoes',
      locale: {
        title: 'Idioma e localidade',
        description: 'Controle o idioma da interface, formatos regionais e idioma das respostas de IA.',
        uiLanguage: 'Idioma da interface',
        formatLocale: 'Formatos',
        aiLanguage: 'Respostas de IA',
        systemDescription: 'Usar o idioma preferido pelo sistema operacional.',
        formatDescription: 'Controla datas, horas, numeros e ordenacao.',
        aiDescription: 'Comandos, flags, caminhos, codigo e saida do shell permanecem iguais.',
        appLanguage: 'Mesmo idioma do app'
      }
    },
    commands: { search: { placeholder: 'Buscar comandos...' }, status: { missing: 'Ausente' } },
    ai: { localeInstruction: 'Responda em portugues do Brasil. Preserve exatamente comandos, flags, caminhos, variaveis, codigo e saida do shell.' }
  }, p0SurfaceOverrides['pt-BR'])),
  'zh-Hans': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['zh-Hans'],
    common: { states: { loading: '正在加载 TerminallySKILL...', system: '系统默认' } },
    settings: {
      title: '设置',
      locale: {
        title: '语言和区域',
        description: '控制界面语言、区域格式和 AI 回复语言。',
        uiLanguage: '界面语言',
        formatLocale: '格式',
        aiLanguage: 'AI 回复',
        systemDescription: '使用操作系统首选语言。',
        formatDescription: '控制日期、时间、数字和排序。',
        aiDescription: '命令、参数、路径、代码和 shell 输出保持不变。',
        appLanguage: '与应用语言相同'
      }
    },
    commands: { search: { placeholder: '搜索命令...' }, status: { missing: '缺失' } },
    ai: { localeInstruction: '请用简体中文回答。终端命令、参数、文件路径、环境变量、代码和 shell 输出必须保持原样。' }
  }, p0SurfaceOverrides['zh-Hans'])),
  'zh-Hant': withOverrides({
    common: { states: { loading: '正在載入 TerminallySKILL...', system: '系統預設' } },
    settings: {
      title: '設定',
      locale: {
        title: '語言與地區',
        description: '控制介面語言、地區格式與 AI 回覆語言。',
        uiLanguage: '介面語言',
        formatLocale: '格式',
        aiLanguage: 'AI 回覆',
        systemDescription: '使用作業系統偏好的語言。',
        formatDescription: '控制日期、時間、數字和排序。',
        aiDescription: '命令、參數、路徑、程式碼和 shell 輸出保持不變。',
        appLanguage: '與應用程式語言相同'
      }
    },
    commands: { search: { placeholder: '搜尋命令...' }, status: { missing: '缺少' } },
    ai: { localeInstruction: '請用繁體中文回答。終端命令、參數、檔案路徑、環境變數、程式碼和 shell 輸出必須保持原樣。' }
  }),
  'ja-JP': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['ja-JP'],
    common: { states: { loading: 'TerminallySKILL を読み込み中...', system: 'システム既定' } },
    settings: {
      title: '設定',
      locale: {
        title: '言語と地域',
        description: 'UI 言語、地域形式、AI 応答言語を制御します。',
        uiLanguage: 'UI 言語',
        formatLocale: '形式',
        aiLanguage: 'AI 応答',
        systemDescription: 'OS の優先言語を使用します。',
        formatDescription: '日付、時刻、数値、並び替えを制御します。',
        aiDescription: 'コマンド、フラグ、パス、コード、shell 出力は変更しません。',
        appLanguage: 'アプリの言語と同じ'
      }
    },
    commands: { search: { placeholder: 'コマンドを検索...' }, status: { missing: '未検出' } },
    ai: { localeInstruction: '日本語で回答してください。端末コマンド、フラグ、ファイルパス、環境変数、コード、shell 出力は正確に保持してください。' }
  }, p0SurfaceOverrides['ja-JP'])),
  'ru-RU': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['ru-RU'],
    common: { states: { loading: 'Загрузка TerminallySKILL...', system: 'По умолчанию системы' } },
    settings: {
      title: 'Настройки',
      locale: {
        title: 'Язык и регион',
        description: 'Управляет языком интерфейса, региональными форматами и языком ответов ИИ.',
        uiLanguage: 'Язык интерфейса',
        formatLocale: 'Форматы',
        aiLanguage: 'Ответы ИИ',
        systemDescription: 'Использовать язык, выбранный в операционной системе.',
        formatDescription: 'Управляет датами, временем, числами и сортировкой.',
        aiDescription: 'Команды, флаги, пути, код и вывод shell не изменяются.',
        appLanguage: 'Как язык приложения'
      }
    },
    commands: { search: { placeholder: 'Поиск команд...' }, status: { missing: 'Не найдено' } },
    ai: { localeInstruction: 'Отвечай на русском. Команды терминала, флаги, пути, переменные окружения, код и вывод shell сохраняй точно.' }
  }, p0SurfaceOverrides['ru-RU'])),
  'pl-PL': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['pl-PL'],
    common: { states: { loading: 'Ladowanie TerminallySKILL...', system: 'Domyslne systemu' } },
    settings: {
      title: 'Ustawienia',
      locale: {
        title: 'Jezyk i region',
        description: 'Steruje jezykiem interfejsu, formatami regionalnymi i jezykiem odpowiedzi AI.',
        uiLanguage: 'Jezyk interfejsu',
        formatLocale: 'Formaty',
        aiLanguage: 'Odpowiedzi AI',
        systemDescription: 'Uzyj jezyka preferowanego przez system.',
        formatDescription: 'Steruje datami, czasem, liczbami i sortowaniem.',
        aiDescription: 'Polecenia, flagi, sciezki, kod i wynik shell pozostaja bez zmian.',
        appLanguage: 'Tak jak jezyk aplikacji'
      }
    },
    commands: { search: { placeholder: 'Szukaj polecen...' }, status: { missing: 'Brak' } },
    ai: { localeInstruction: 'Odpowiadaj po polsku. Zachowaj dokladnie komendy, flagi, sciezki, zmienne srodowiskowe, kod i wynik shell.' }
  }, p0SurfaceOverrides['pl-PL'])),
  'it-IT': withOverrides(mergeLocaleOverrides({
    ...launchChromeOverrides['it-IT'],
    common: { states: { loading: 'Caricamento di TerminallySKILL...', system: 'Predefinito di sistema' } },
    settings: {
      title: 'Impostazioni',
      locale: {
        title: 'Lingua e area',
        description: "Controlla lingua dell'interfaccia, formati regionali e lingua delle risposte AI.",
        uiLanguage: "Lingua dell'interfaccia",
        formatLocale: 'Formati',
        aiLanguage: 'Risposte AI',
        systemDescription: 'Usa la lingua preferita dal sistema operativo.',
        formatDescription: 'Controlla date, orari, numeri e ordinamento.',
        aiDescription: 'Comandi, flag, percorsi, codice e output shell restano invariati.',
        appLanguage: "Come la lingua dell'app"
      }
    },
    commands: { search: { placeholder: 'Cerca comandi...' }, status: { missing: 'Mancante' } },
    ai: { localeInstruction: 'Rispondi in italiano. Conserva esattamente comandi, flag, percorsi, variabili, codice e output shell.' }
  }, p0SurfaceOverrides['it-IT'])),
  'ko-KR': withOverrides({
    settings: {
      title: '설정',
      locale: {
        title: '언어 및 지역',
        description: 'UI 언어, 지역 형식, AI 응답 언어를 제어합니다.',
        uiLanguage: 'UI 언어',
        formatLocale: '형식',
        aiLanguage: 'AI 응답',
        appLanguage: '앱 언어와 동일'
      }
    },
    commands: { search: { placeholder: '명령 검색...' }, status: { missing: '없음' } },
    ai: { localeInstruction: '한국어로 답하세요. 터미널 명령, 플래그, 파일 경로, 환경 변수, 코드, shell 출력은 그대로 유지하세요.' }
  }),
  'nl-NL': withOverrides({
    settings: { title: 'Instellingen', locale: { title: 'Taal en regio', uiLanguage: 'UI-taal', formatLocale: 'Formaten', aiLanguage: 'AI-antwoorden', appLanguage: 'Zelfde als app-taal' } },
    commands: { search: { placeholder: 'Opdrachten zoeken...' }, status: { missing: 'Ontbreekt' } },
    ai: { localeInstruction: 'Antwoord in het Nederlands. Behoud terminalcommando’s, flags, paden, omgevingsvariabelen, code en shell-uitvoer exact.' }
  }),
  'uk-UA': withOverrides({
    settings: { title: 'Налаштування', locale: { title: 'Мова і регіон', uiLanguage: 'Мова інтерфейсу', formatLocale: 'Формати', aiLanguage: 'Відповіді ШІ', appLanguage: 'Як мова застосунку' } },
    commands: { search: { placeholder: 'Пошук команд...' }, status: { missing: 'Відсутня' } },
    ai: { localeInstruction: 'Відповідай українською. Команди термінала, прапорці, шляхи, змінні середовища, код і shell-вивід зберігай точно.' }
  }),
  'id-ID': withOverrides({
    settings: { title: 'Pengaturan', locale: { title: 'Bahasa & Lokal', uiLanguage: 'Bahasa UI', formatLocale: 'Format', aiLanguage: 'Respons AI', appLanguage: 'Sama seperti bahasa aplikasi' } },
    commands: { search: { placeholder: 'Cari perintah...' }, status: { missing: 'Tidak ada' } },
    ai: { localeInstruction: 'Jawab dalam bahasa Indonesia. Pertahankan perintah terminal, flag, path, variabel lingkungan, kode, dan output shell persis.' }
  }),
  'tr-TR': withOverrides({
    settings: { title: 'Ayarlar', locale: { title: 'Dil ve Bolge', uiLanguage: 'Arayuz dili', formatLocale: 'Bicimler', aiLanguage: 'AI yanitlari', appLanguage: 'Uygulama diliyle ayni' } },
    commands: { search: { placeholder: 'Komut ara...' }, status: { missing: 'Eksik' } },
    ai: { localeInstruction: 'Turkce yanit ver. Terminal komutlarini, flagleri, dosya yollarini, ortam degiskenlerini, kodu ve shell ciktisini aynen koru.' }
  }),
  'pt-PT': withOverrides({
    settings: { title: 'Definicoes', locale: { title: 'Idioma e localidade', uiLanguage: 'Idioma da interface', formatLocale: 'Formatos', aiLanguage: 'Respostas de IA', appLanguage: 'Mesmo idioma da app' } },
    commands: { search: { placeholder: 'Procurar comandos...' }, status: { missing: 'Em falta' } },
    ai: { localeInstruction: 'Responde em portugues europeu. Preserva exatamente comandos, flags, caminhos, variaveis, codigo e saida da shell.' }
  }),
  ar: withOverrides({
    settings: { title: 'الإعدادات', locale: { title: 'اللغة والمنطقة', uiLanguage: 'لغة الواجهة', formatLocale: 'التنسيقات', aiLanguage: 'ردود الذكاء الاصطناعي', appLanguage: 'مثل لغة التطبيق' } },
    commands: { search: { placeholder: 'ابحث عن الأوامر...' }, status: { missing: 'غير موجود' } },
    ai: { localeInstruction: 'أجب بالعربية. أبق أوامر الطرفية والخيارات والمسارات ومتغيرات البيئة والكود ومخرجات shell كما هي تمامًا.' }
  }),
  'hi-IN': withOverrides({
    settings: { title: 'सेटिंग्स', locale: { title: 'भाषा और क्षेत्र', uiLanguage: 'UI भाषा', formatLocale: 'फॉर्मैट', aiLanguage: 'AI जवाब', appLanguage: 'ऐप भाषा जैसी' } },
    commands: { search: { placeholder: 'कमांड खोजें...' }, status: { missing: 'नहीं मिला' } },
    ai: { localeInstruction: 'हिंदी में जवाब दें। टर्मिनल कमांड, फ्लैग, फाइल पाथ, एनवायरनमेंट वेरिएबल, कोड और shell आउटपुट बिल्कुल वैसा ही रखें।' }
  })
}

for (const locale of Object.keys(resources)) {
  if (locale.startsWith('en')) continue
  resources[locale] = localizeKnownEnglishFallbacks(locale, resources[locale]) as LocaleResource
}
