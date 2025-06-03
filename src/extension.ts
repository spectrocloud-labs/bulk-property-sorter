import * as vscode from 'vscode'
import { FileProcessor, FileProcessorOptions } from './fileProcessor'
import { resolveIndentation } from './formattingUtils'
import { shouldProcessFile } from './filePatternFilter'

/**
 * Activates the Bulk Property Sorter extension and registers commands
 *
 * This function is called when the extension is activated by VS Code. It sets up
 * the command handlers for sorting properties in ascending and descending order.
 *
 * @param context - The VS Code extension context containing subscriptions and other extension data
 *
 * @example
 * ```typescript
 * // Called automatically by VS Code when extension activates
 * // User can then run commands via Command Palette:
 * // - "Bulk Property Sorter: Sort Properties (Ascending)"
 * // - "Bulk Property Sorter: Sort Properties (Descending)"
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
    console.log('Bulk Property Sorter: Extension is activating...')

    const fileProcessor = new FileProcessor()

    // Register the sort properties command (ascending)
    console.log('Bulk Property Sorter: Registering sortProperties command...')
    const sortPropertiesCommand = vscode.commands.registerCommand(
        'bulk-property-sorter.sortProperties',
        async () => {
            console.log(
                'Bulk Property Sorter: sortProperties command executed'
            )
            await handleSortCommand(fileProcessor, 'asc')
        }
    )

    // Register the sort properties descending command
    console.log(
        'Bulk Property Sorter: Registering sortPropertiesDescending command...'
    )
    const sortPropertiesDescendingCommand = vscode.commands.registerCommand(
        'bulk-property-sorter.sortPropertiesDescending',
        async () => {
            console.log(
                'Bulk Property Sorter: sortPropertiesDescending command executed'
            )
            await handleSortCommand(fileProcessor, 'desc')
        }
    )

    // Register a test command to verify extension is working
    console.log('Bulk Property Sorter: Registering test command...')
    const testCommand = vscode.commands.registerCommand(
        'bulk-property-sorter.test',
        () => {
            console.log(
                'Bulk Property Sorter: Test command executed successfully!'
            )
            vscode.window.showInformationMessage(
                'Bulk Property Sorter is working! Extension is properly activated.'
            )
        }
    )

    // Add commands to subscriptions for proper cleanup
    context.subscriptions.push(sortPropertiesCommand)
    context.subscriptions.push(sortPropertiesDescendingCommand)
    context.subscriptions.push(testCommand)

    console.log('Bulk Property Sorter: Extension activated successfully')
}

/**
 * Handles the execution of sort commands with comprehensive error handling and user feedback
 *
 * This function processes the active editor's content or selected text, applies property sorting
 * based on the specified order, and provides appropriate user feedback for success, warnings, or errors.
 *
 * @param fileProcessor - The file processor instance used for parsing and sorting operations
 * @param sortOrder - The sort order to apply ('asc' for ascending, 'desc' for descending)
 * @returns Promise that resolves when the sort operation is complete
 *
 * @example
 * ```typescript
 * // Sort interface properties in ascending order
 * const processor = new FileProcessor();
 * await handleSortCommand(processor, 'asc');
 * // Result: interface properties sorted A-Z
 * ```
 *
 * @example
 * ```typescript
 * // Sort object properties in descending order with selection
 * const processor = new FileProcessor();
 * // User selects text containing: { zebra: 1, apple: 2, banana: 3 }
 * await handleSortCommand(processor, 'desc');
 * // Result: { zebra: 1, banana: 3, apple: 2 }
 * ```
 */
async function handleSortCommand(
    fileProcessor: FileProcessor,
    sortOrder: 'asc' | 'desc'
): Promise<void> {
    console.log(
        `Bulk Property Sorter: handleSortCommand called with order: ${sortOrder}`
    )

    const editor = vscode.window.activeTextEditor

    if (!editor) {
        console.log('Bulk Property Sorter: No active editor found')
        vscode.window.showErrorMessage('No active editor found')
        return
    }

    console.log(
        `Bulk Property Sorter: Processing file with language: ${editor.document.languageId}`
    )

    // Get extension configuration
    const config = vscode.workspace.getConfiguration('bulk-property-sorter')
    const excludedLanguages = config.get<string[]>('excludedLanguages', [])
    const sortNestedObjects = config.get<boolean>('sortNestedObjects', true)
    
    // Get file pattern filtering options
    const includedFilePatterns = config.get<string[]>('includedFilePatterns', ['**/*'])
    const excludedFilePatterns = config.get<string[]>('excludedFilePatterns', [])
    
    // Get sorting criteria options
    const caseSensitive = config.get<boolean>('sorting.caseSensitive', true)
    const naturalSort = config.get<boolean>('sorting.naturalSort', false)
    const customOrder = config.get<string[]>('sorting.customOrder', [])
    const groupByType = config.get<boolean>('sorting.groupByType', false)
    const prioritizeRequired = config.get<boolean>('sorting.prioritizeRequired', false)
    
    // Get CSS-specific options
    const groupVendorPrefixes = config.get<boolean>('css.groupVendorPrefixes', true)
    const sortByImportance = config.get<boolean>('css.sortByImportance', false)

    // Get TypeScript-specific options
    const sortMethods = config.get<'alphabetical' | 'visibility' | 'static-first' | 'lifecycle'>('typescript.sortMethods', 'alphabetical')
    const separateInterfacesAndClasses = config.get<boolean>('typescript.separateInterfacesAndClasses', false)
    const sortImportsExports = config.get<boolean>('typescript.sortImportsExports', false)
    const groupImportsByType = config.get<boolean>('typescript.groupImportsByType', true)
    const preserveMethodChaining = config.get<boolean>('typescript.preserveMethodChaining', true)
    const sortConstructorParameters = config.get<boolean>('typescript.sortConstructorParameters', false)
    const prioritizePublicMembers = config.get<boolean>('typescript.prioritizePublicMembers', false)
    
    // Get enhanced CSS-specific options
    const groupByCategory = config.get<boolean>('css.groupByCategory', false)
    const preserveMediaQueryOrder = config.get<boolean>('css.preserveMediaQueryOrder', true)
    const sortNestedRules = config.get<boolean>('css.sortNestedRules', true)
    const groupVariables = config.get<boolean>('css.groupVariables', true)
    const sortKeyframes = config.get<boolean>('css.sortKeyframes', false)
    const preserveVendorPrefixOrder = config.get<boolean>('css.preserveVendorPrefixOrder', true)
    const sortAtRules = config.get<boolean>('css.sortAtRules', false)
    
    // Get Go-specific options
    const sortStructFields = config.get<'alphabetical' | 'by-type' | 'by-size' | 'preserve-tags'>('go.sortStructFields', 'alphabetical')
    const groupEmbeddedFields = config.get<boolean>('go.groupEmbeddedFields', true)
    const sortMethodReceivers = config.get<boolean>('go.sortMethodReceivers', false)
    const preserveStructTags = config.get<boolean>('go.preserveStructTags', true)
    const groupByVisibility = config.get<boolean>('go.groupByVisibility', false)
    const sortInterfaceMethods = config.get<boolean>('go.sortInterfaceMethods', true)
    const preserveMethodSets = config.get<boolean>('go.preserveMethodSets', false)

    // Get JSON-specific options
    const sortObjectKeys = config.get<boolean>('json.sortObjectKeys', true)
    const preserveArrayOrder = config.get<boolean>('json.preserveArrayOrder', true)
    const sortNestedObjectsJSON = config.get<boolean>('json.sortNestedObjects', true)
    const customKeyOrder = config.get<string[]>('json.customKeyOrder', [])
    const groupBySchema = config.get<boolean>('json.groupBySchema', false)
    const preserveCommentsJSON = config.get<boolean>('json.preserveComments', true)

    // Get YAML-specific options
    const sortObjectKeysYAML = config.get<boolean>('yaml.sortObjectKeys', true)
    const preserveArrayOrderYAML = config.get<boolean>('yaml.preserveArrayOrder', true)
    const sortNestedObjectsYAML = config.get<boolean>('yaml.sortNestedObjects', true)
    const customKeyOrderYAML = config.get<string[]>('yaml.customKeyOrder', [])
    const groupBySchemaYAML = config.get<boolean>('yaml.groupBySchema', false)
    const preserveCommentsYAML = config.get<boolean>('yaml.preserveComments', true)
    const preserveAnchorsAndAliases = config.get<boolean>('yaml.preserveAnchorsAndAliases', true)
    const preserveDocumentSeparators = config.get<boolean>('yaml.preserveDocumentSeparators', true)
    const preserveStringStyles = config.get<boolean>('yaml.preserveStringStyles', true)
    const yamlIndentationStyle = config.get<'auto' | '2-spaces' | '4-spaces'>('yaml.indentationStyle', 'auto')
    const handleComplexKeys = config.get<boolean>('yaml.handleComplexKeys', true)

    // Get formatting options
    const indentationType = config.get<'auto' | 'spaces' | 'tabs'>('formatting.indentationType', 'auto')
    const indentationSize = config.get<number>('formatting.indentationSize', 4)
    const lineEnding = config.get<'auto' | 'lf' | 'crlf'>('formatting.lineEnding', 'auto')
    const preserveComments = config.get<boolean>('formatting.preserveComments', true)
    const commentStyle = config.get<'preserve' | 'single-line' | 'multi-line'>('formatting.commentStyle', 'preserve')
    const propertySpacing = config.get<'compact' | 'spaced' | 'aligned'>('formatting.propertySpacing', 'compact')
    const trailingCommas = config.get<'preserve' | 'add' | 'remove'>('formatting.trailingCommas', 'preserve')
    const blankLinesBetweenGroups = config.get<boolean>('formatting.blankLinesBetweenGroups', false)

    // Check if current language is excluded
    if (excludedLanguages.includes(editor.document.languageId)) {
        vscode.window.showInformationMessage(
            `Property sorting is disabled for ${editor.document.languageId} files`
        )
        return
    }

    // Check if current file matches the file pattern filters
    if (!shouldProcessFile(editor.document, includedFilePatterns, excludedFilePatterns)) {
        vscode.window.showInformationMessage(
            `File ${editor.document.fileName} is excluded by file pattern filters`
        )
        return
    }

    try {
        // Determine processing options
        const options: Partial<FileProcessorOptions> = {
            sortOrder,
            preserveFormatting: true,
            includeComments: true,
            indentation: resolveIndentation({
                sortOrder,
                preserveFormatting: true,
                includeComments: true,
                indentation: '',
                sortNestedObjects,
                indentationType,
                indentationSize,
                lineEnding,
                preserveComments,
                commentStyle,
                propertySpacing,
                trailingCommas,
                blankLinesBetweenGroups,
            }, editor),
            sortNestedObjects,
            selectionOnly: !editor.selection.isEmpty,
            caseSensitive,
            naturalSort,
            customOrder,
            groupByType,
            prioritizeRequired,
            groupVendorPrefixes,
            sortByImportance,
            // Formatting options
            indentationType,
            indentationSize,
            lineEnding,
            preserveComments,
            commentStyle,
            propertySpacing,
            trailingCommas,
            blankLinesBetweenGroups,
            // TypeScript-specific options
            sortMethods,
            separateInterfacesAndClasses,
            sortImportsExports,
            groupImportsByType,
            preserveMethodChaining,
            sortConstructorParameters,
            prioritizePublicMembers,
            // Enhanced CSS-specific options
            groupByCategory,
            preserveMediaQueryOrder,
            sortNestedRules,
            groupVariables,
            sortKeyframes,
            preserveVendorPrefixOrder,
            sortAtRules,
            // Go-specific options
            sortStructFields,
            groupEmbeddedFields,
            sortMethodReceivers,
            preserveStructTags,
            groupByVisibility,
            sortInterfaceMethods,
            preserveMethodSets,
            // JSON-specific options (will override general ones for JSON files)
            sortObjectKeys,
            preserveArrayOrder,
            customKeyOrder,
            groupBySchema,
            // Use JSON-specific preserve comments setting if it's a JSON file
            ...(editor.document.languageId === 'json' || editor.document.languageId === 'jsonc' ? {
                sortNestedObjects: sortNestedObjectsJSON,
                preserveComments: preserveCommentsJSON
            } : {}),
            // YAML-specific options (will override general ones for YAML files)
            preserveAnchorsAndAliases,
            preserveDocumentSeparators,
            preserveStringStyles,
            yamlIndentationStyle,
            handleComplexKeys,
            // Use YAML-specific options if it's a YAML file
            ...(editor.document.languageId === 'yaml' || editor.document.languageId === 'yml' ? {
                sortObjectKeys: sortObjectKeysYAML,
                preserveArrayOrder: preserveArrayOrderYAML,
                sortNestedObjects: sortNestedObjectsYAML,
                customKeyOrder: customKeyOrderYAML,
                groupBySchema: groupBySchemaYAML,
                preserveComments: preserveCommentsYAML,
                yamlCustomKeyOrder: customKeyOrderYAML,
                yamlGroupBySchema: groupBySchemaYAML
            } : {}),
        }

        // Process the file or selection
        let result
        if (editor.selection.isEmpty) {
            // Process entire document
            result = await fileProcessor.processDocument(
                editor.document,
                options
            )
        } else {
            // Process selected text
            result = await fileProcessor.processSelection(editor, options)
        }

        // Handle the result
        if (result.success) {
            if (result.warnings.length > 0) {
                // Show warning but still apply changes
                vscode.window.showWarningMessage(result.warnings[0])
            }

            // Apply changes to editor
            const applied = await fileProcessor.applyToEditor(
                editor,
                result,
                options
            )

            if (applied) {
                const entityText =
                    result.entitiesProcessed === 1 ? 'entity' : 'entities'
                const orderText =
                    sortOrder === 'asc' ? 'ascending' : 'descending'
                console.log(
                    `Successfully sorted ${result.entitiesProcessed} ${entityText} in ${orderText} order`
                )
            }
        } else {
            // Show error message
            const errorMessage =
                result.errors.length > 0
                    ? result.errors[0]
                    : 'Unknown error occurred during processing'
            vscode.window.showErrorMessage(
                `Property sorting failed: ${errorMessage}`
            )
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `Property sorting failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        )
    }
}

/**
 * Deactivates the extension and performs cleanup
 *
 * This function is called when the extension is deactivated by VS Code.
 * Currently performs no specific cleanup but provides a hook for future cleanup operations.
 *
 * @example
 * ```typescript
 * // Called automatically by VS Code when extension is disabled
 * // or when VS Code is shutting down
 * ```
 *
 * @example
 * ```typescript
 * // Could be extended to clean up resources:
 * export function deactivate() {
 *   // Clear caches, dispose of watchers, etc.
 * }
 * ```
 */
export function deactivate() {
    // Cleanup if needed
}
