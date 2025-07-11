import * as vscode from 'vscode'
import { TabManager } from './tabManager'

/**
 * NavigationInterceptor class that implements smart tab navigation by intercepting
 * "Go to Definition" commands and reusing existing tabs instead of creating duplicates.
 * 
 * This class implements the VS Code DefinitionProvider interface to hook into the
 * definition resolution process and apply smart tab management logic.
 */
export class NavigationInterceptor implements vscode.DefinitionProvider {
    private tabManager: TabManager
    private disposables: vscode.Disposable[] = []
    private isEnabled: boolean = true

    /**
     * Creates a new NavigationInterceptor instance
     * @param tabManager - The TabManager instance to use for tab operations
     */
    constructor(tabManager: TabManager) {
        this.tabManager = tabManager
    }

    /**
     * Initializes the NavigationInterceptor and registers it as a definition provider
     * for supported languages.
     * 
     * @returns Promise that resolves when initialization is complete
     */
    public async initialize(): Promise<void> {
        // Check if smart navigation is enabled in configuration
        const config = vscode.workspace.getConfiguration('spectro-tab-tools')
        this.isEnabled = config.get<boolean>('smartNavigation.enabled', true)

        if (!this.isEnabled) {
            console.log('NavigationInterceptor: Smart navigation is disabled via configuration')
            return
        }

        // Register as definition provider for supported languages
        const supportedLanguages = [
            'typescript',
            'typescriptreact',
            'javascript',
            'javascriptreact',
            'json',
            'jsonc',
            'css',
            'scss',
            'sass',
            'less',
            'go',
            'yaml',
            'yml',
            'html',
            'xml',
            'markdown'
        ]

        // Register definition provider for each supported language
        for (const language of supportedLanguages) {
            const disposable = vscode.languages.registerDefinitionProvider(
                { language },
                this
            )
            this.disposables.push(disposable)
        }

        // Listen for configuration changes
        const configDisposable = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('spectro-tab-tools.smartNavigation.enabled')) {
                const newEnabled = vscode.workspace.getConfiguration('spectro-tab-tools')
                    .get<boolean>('smartNavigation.enabled', true)
                
                if (newEnabled !== this.isEnabled) {
                    this.isEnabled = newEnabled
                    console.log(`NavigationInterceptor: Smart navigation ${newEnabled ? 'enabled' : 'disabled'}`)
                }
            }
        })
        this.disposables.push(configDisposable)

        console.log('NavigationInterceptor: Registered definition providers for supported languages')
    }

    /**
     * Provides definition locations for a symbol at a given position.
     * This method implements the smart tab navigation logic by checking for existing
     * tabs and deferring to VS Code's built-in providers for actual definition resolution.
     * 
     * @param document - The document in which the command was invoked
     * @param position - The position at which the command was invoked
     * @param _token - A cancellation token (unused)
     * @returns Promise resolving to definition locations or undefined to fall back to default behavior
     */
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): Promise<vscode.Definition | vscode.LocationLink[] | undefined> {
        // If disabled, don't intercept
        if (!this.isEnabled || !this.tabManager.isReady()) {
            return undefined
        }

        try {
            // Get word at position to help with symbol resolution
            const wordRange = document.getWordRangeAtPosition(position)
            if (!wordRange) {
                return undefined
            }

            const word = document.getText(wordRange)
            if (!word) {
                return undefined
            }

            // Use a simple heuristic approach instead of trying to get default definitions
            // This avoids potential recursion issues and is more compatible
            const potentialTargets = await this.findPotentialTargets(document, word, position)
            
            if (potentialTargets.length === 0) {
                return undefined
            }

            // Check if any potential target is already open in a tab
            for (const target of potentialTargets) {
                const existingTab = this.tabManager.getTabInfo(target.uri)
                if (existingTab) {
                    // Tab exists, focus it and navigate to the position
                    await this.focusExistingTab(target)
                    // Return the target to provide the definition result
                    return target
                }
            }

            // No existing tabs found, let other providers handle it
            return undefined

        } catch (error) {
            console.error('NavigationInterceptor: Error in provideDefinition:', error)
            // On error, fall back to default behavior
            return undefined
        }
    }

    /**
     * Finds potential definition targets using simple heuristics
     * This is a simplified approach that works well with the TabManager
     * 
     * @param document - The current document
     * @param word - The word/symbol to find definitions for
     * @param position - The position in the document
     * @returns Promise resolving to potential target locations
     */
    private async findPotentialTargets(
        document: vscode.TextDocument,
        word: string,
        _position: vscode.Position
    ): Promise<vscode.Location[]> {
        const targets: vscode.Location[] = []

        try {
            // Get all open tabs and check if any contain the symbol
            const allTabs = this.tabManager.getAllTabs()
            
            for (const tabInfo of allTabs) {
                // Skip the current document
                if (tabInfo.uri.toString() === document.uri.toString()) {
                    continue
                }

                try {
                    // Check if this tab's document contains the symbol
                    const tabDocument = await vscode.workspace.openTextDocument(tabInfo.uri)
                    const text = tabDocument.getText()
                    
                    // Simple heuristic: look for the word in the document
                    const lines = text.split('\n')
                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                        const line = lines[lineIndex]
                        const wordIndex = line.indexOf(word)
                        
                        if (wordIndex !== -1) {
                            // Check if this looks like a definition (simple heuristics)
                            const isDefinition = this.looksLikeDefinition(line, word, wordIndex)
                            
                            if (isDefinition) {
                                const targetPosition = new vscode.Position(lineIndex, wordIndex)
                                const targetRange = new vscode.Range(targetPosition, targetPosition)
                                targets.push(new vscode.Location(tabInfo.uri, targetRange))
                                break // Only take the first match per file
                            }
                        }
                    }
                } catch (error) {
                    // Skip files that can't be opened
                    console.debug(`NavigationInterceptor: Could not open ${tabInfo.uri.toString()}:`, error)
                }
            }
        } catch (error) {
            console.error('NavigationInterceptor: Error finding potential targets:', error)
        }

        return targets
    }

    /**
     * Simple heuristic to determine if a line contains a definition
     * 
     * @param line - The line of text to check
     * @param word - The word/symbol to check for
     * @param wordIndex - The index of the word in the line
     * @returns True if the line likely contains a definition
     */
    private looksLikeDefinition(line: string, _word: string, _wordIndex: number): boolean {
        const trimmedLine = line.trim()
        
        // Check for common definition patterns
        const definitionPatterns = [
            /^(export\s+)?(class|interface|function|const|let|var|type|enum)\s+/,
            /^(public|private|protected)\s+/,
            /^\s*function\s+/,
            /^\s*\w+\s*[:=]\s*(function|\(|\{)/,
            /^\s*@\w+/, // Decorators
        ]

        return definitionPatterns.some(pattern => pattern.test(trimmedLine))
    }

    /**
     * Focuses an existing tab and navigates to the specified location
     * 
     * @param location - The location to navigate to
     */
    private async focusExistingTab(location: vscode.Location): Promise<void> {
        try {
            // Open the document in the existing tab
            const document = await vscode.workspace.openTextDocument(location.uri)
            const editor = await vscode.window.showTextDocument(document, {
                preserveFocus: false,
                preview: false
            })

            // Navigate to the specific position
            const range = location.range
            editor.selection = new vscode.Selection(range.start, range.start)
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport)

            // Update the tab's access time in TabManager
            this.tabManager.updateTabAccessTime(location.uri)

            console.log(`NavigationInterceptor: Focused existing tab for ${location.uri.toString()}`)
        } catch (error) {
            console.error('NavigationInterceptor: Error focusing existing tab:', error)
            throw error
        }
    }

    /**
     * Checks if the NavigationInterceptor is ready to handle navigation
     * 
     * @returns True if ready, false otherwise
     */
    public isReady(): boolean {
        return this.tabManager.isReady() && this.isEnabled
    }

    /**
     * Disposes of the NavigationInterceptor and cleans up resources
     */
    public dispose(): void {
        // Dispose of all definition provider registrations
        this.disposables.forEach(disposable => disposable.dispose())
        this.disposables = []

        console.log('NavigationInterceptor: Disposed')
    }
} 