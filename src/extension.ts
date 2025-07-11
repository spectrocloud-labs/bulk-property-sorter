import * as vscode from 'vscode'

// Lazy-loaded modules cache
// let fileProcessorModule: typeof import('./fileProcessor') | undefined;

/**
 * Lazy loads the FileProcessor module and creates an instance
 * @returns Promise resolving to a FileProcessor instance
 */
// async function getFileProcessor(): Promise<import('./fileProcessor').FileProcessor> {
//     if (!fileProcessorModule) {
//         fileProcessorModule = await import('./fileProcessor');
//     }
//     return new fileProcessorModule.FileProcessor();
// }

/**
 * Activates the Spectro Tab Tools extension and registers commands
 *
 * This function is called when the extension is activated by VS Code. It sets up
 * the command handlers for sorting properties in ascending and descending order.
 * Heavy modules are loaded lazily when commands are first executed.
 * Non-essential commands are conditionally registered based on development mode.
 *
 * @param context - The VS Code extension context containing subscriptions and other extension data
 *
 * @example
 * ```typescript
 * // Called automatically by VS Code when extension activates
 * // User can then run commands via Command Palette:
 * ```
 *
 * @example
 * ```typescript
 * // Extension activation in package.json triggers this function
 * // when user opens TypeScript/JavaScript files or runs commands
 * export function activate(context: vscode.ExtensionContext) {
 *   // Registers commands and sets up file processor
 * }
 * ```
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Spectro Tab Tools: Extension is activating...')
    // Register essential commands (always registered for immediate availability)
    console.log('Spectro Tab Tools: Registering essential commands...')
    console.log(
        'Spectro Tab Tools: Registering doThing command...'
    )
    const doThingCommand = vscode.commands.registerCommand(
        'spectro-tab-tools.doThing',
        async () => {
            console.log(
                'Spectro Tab Tools: doThing command executed'
            )
            await handleDoThingCommand()
        }
    )

    // Add essential commands to subscriptions
    context.subscriptions.push(doThingCommand)

    const isDevelopmentMode =
        context.extensionMode === vscode.ExtensionMode.Development ||
        process.env.NODE_ENV === 'development' ||
        process.env.SPECTRO_TAB_TOOLS_DEBUG === 'true'

    if (isDevelopmentMode) {
        console.log(
            'Spectro Tab Tools: Development mode enabled'
        )
    } else {
        console.log(
            'Spectro Tab Tools: Production mode enabled'
        )
    }

    console.log('Spectro Tab Tools: Extension activated successfully')
}

/**
 * Handles the execution of sort commands with comprehensive error handling and user feedback
 *
 * This function processes the active editor's content or selected text, applies property sorting
 * based on the specified order, and provides appropriate user feedback for success, warnings, or errors.
 * Heavy modules are loaded lazily only when this function is called.
 *
 * @param sortOrder - The sort order to apply ('asc' for ascending, 'desc' for descending)
 * @returns Promise that resolves when the sort operation is complete
 *
 * @example
 * ```typescript
 * // Sort interface properties in ascending order
 * await handleSortCommand('asc');
 * // Result: interface properties sorted A-Z
 * ```
 *
 * @example
 * ```typescript
 * // Sort object properties in descending order with selection
 * // User selects text containing: { zebra: 1, apple: 2, banana: 3 }
 * await handleSortCommand('desc');
 * // Result: { zebra: 1, banana: 3, apple: 2 }
 * ```
 */
async function handleDoThingCommand(): Promise<void> {
    console.log(
        `Spectro Tab Tools: handleDoThingCommand called`
    )

    try {
        // Lazy load modules only when needed
        console.log('Spectro Tab Tools: Loading modules...')
        // const [fileProcessor] =
        //     await Promise.all([
        //         getFileProcessor(),
        //     ])

        // Get extension configuration
        // const config = vscode.workspace.getConfiguration('spectro-tab-tools')

        // Get file pattern filtering options
        // const includedFilePatterns = config.get<string[]>(
        //     'includedFilePatterns',
        //     ['**/*']
        // )
        // const excludedFilePatterns = config.get<string[]>(
        //     'excludedFilePatterns',
        //     []
        // )

        // Check if current file matches the file pattern filters
        // if (
        //     !filePatternFilter.shouldProcessFile(
        //         editor.document,
        //         includedFilePatterns,
        //         excludedFilePatterns
        //     )
        // ) {
        //     vscode.window.showInformationMessage(
        //         `File ${editor.document.fileName} is excluded by file pattern filters`
        //     )
        //     return
        // }

        // Determine processing options
        // const options: Partial<import('./fileProcessor').FileProcessorOptions> =
        //     {
        //         sortOrder,
        //     }

        const result = await Promise.resolve({
            success: true,
            warnings: [],
            errors: [],
        })

        // Handle the result
        if (result.success) {
            if (result.warnings.length > 0) {
                // Show warning but still apply changes
                vscode.window.showWarningMessage(result.warnings[0])
            }

            // TODO: Apply changes
        } else {
            // Show error message
            const errorMessage =
                result.errors.length > 0
                    ? result.errors[0]
                    : 'Unknown error occurred during processing'
            vscode.window.showErrorMessage(
                `Processing failed: ${errorMessage}`
            )
        }
    } catch (error) {
        console.error(
            'Spectro Tab Tools: Error during command execution:',
            error
        )
        vscode.window.showErrorMessage(
            `Processing failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        )
    }
}

/**
 * Deactivates the extension and performs cleanup
 *
 * This function is called when the extension is deactivated by VS Code.
 * Clears lazy-loaded module cache to free up memory.
 *
 * @example
 * ```typescript
 * // Called automatically by VS Code when extension is disabled
 * // or when VS Code is shutting down
 * ```
 *
 * @example
 * ```typescript
 * // Cleans up lazy-loaded modules to free memory:
 * export function deactivate() {
 *   // Clear module cache, dispose of watchers, etc.
 * }
 * ```
 */
export function deactivate() {
    // Clear lazy-loaded module cache to free up memory
    // fileProcessorModule = undefined;
    console.log('Spectro Tab Tools: Extension deactivated and cache cleared')
}
