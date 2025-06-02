import * as vscode from 'vscode';
import { CoreProcessor, CoreProcessorOptions, ProcessingResult } from './coreProcessor';

/**
 * Options for file processing operations that extend core options with VS Code-specific functionality
 * 
 * These options control how the file processor handles VS Code documents and selections,
 * building upon the core processing capabilities with editor-specific features.
 */
export interface FileProcessorOptions extends CoreProcessorOptions {
    /** Whether to process only the currently selected text in the editor */
    selectionOnly: boolean;
}

/**
 * Main file processor that orchestrates parsing, sorting, and reconstruction with VS Code integration
 * 
 * This class serves as the primary interface between the VS Code extension and the core
 * processing functionality, handling document processing, selection processing, and editor integration.
 */
export class FileProcessor {
    /** Core processor instance that handles the actual parsing and sorting logic */
    private coreProcessor: CoreProcessor;

    /**
     * Creates a new FileProcessor instance with a configured core processor
     * 
     * @example
     * ```typescript
     * // Create a file processor for VS Code integration
     * const processor = new FileProcessor();
     * ```
     * 
     * @example
     * ```typescript
     * // Use in extension activation
     * export function activate(context: vscode.ExtensionContext) {
     *   const fileProcessor = new FileProcessor();
     *   // Register commands using the processor
     * }
     * ```
     */
    constructor() {
        this.coreProcessor = new CoreProcessor();
    }

    /**
     * Processes a complete VS Code text document for property sorting
     * 
     * This method extracts the full text content from a VS Code document and processes it
     * through the core processor to sort properties in interfaces, objects, and type aliases.
     * 
     * @param document - The VS Code text document to process
     * @param options - Processing options that control sorting behavior and output format
     * @returns Promise resolving to processing result with success status and processed text
     * 
     * @example
     * ```typescript
     * // Process the currently active document
     * const processor = new FileProcessor();
     * const document = vscode.window.activeTextEditor?.document;
     * if (document) {
     *   const result = await processor.processDocument(document, { sortOrder: 'asc' });
     *   console.log(`Processed ${result.entitiesProcessed} entities`);
     * }
     * ```
     * 
     * @example
     * ```typescript
     * // Process document with custom options
     * const processor = new FileProcessor();
     * const result = await processor.processDocument(document, {
     *   sortOrder: 'desc',
     *   preserveFormatting: true,
     *   includeComments: true,
     *   sortNestedObjects: false
     * });
     * ```
     */
    public async processDocument(
        document: vscode.TextDocument,
        options: Partial<FileProcessorOptions> = {}
    ): Promise<ProcessingResult> {
        const fullText = document.getText();
        
        // Detect file type from document
        const fileType = this.detectFileType(document);
        
        return this.processText(fullText, { ...options, fileType });
    }

    /**
     * Processes only the selected text within a VS Code editor
     * 
     * This method extracts the currently selected text from the editor and processes it
     * for property sorting. If no text is selected, it returns an error result.
     * 
     * @param editor - The VS Code text editor containing the selection
     * @param options - Processing options with selectionOnly automatically set to true
     * @returns Promise resolving to processing result for the selected text
     * 
     * @example
     * ```typescript
     * // Process user's text selection
     * const processor = new FileProcessor();
     * const editor = vscode.window.activeTextEditor;
     * if (editor && !editor.selection.isEmpty) {
     *   const result = await processor.processSelection(editor, { sortOrder: 'asc' });
     *   if (result.success) {
     *     console.log('Selection processed successfully');
     *   }
     * }
     * ```
     * 
     * @example
     * ```typescript
     * // Process selection with error handling
     * const processor = new FileProcessor();
     * const result = await processor.processSelection(editor, { sortOrder: 'desc' });
     * if (!result.success) {
     *   vscode.window.showErrorMessage(result.errors[0]);
     * }
     * ```
     */
    public async processSelection(
        editor: vscode.TextEditor,
        options: Partial<FileProcessorOptions> = {}
    ): Promise<ProcessingResult> {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (selectedText.trim().length === 0) {
            return {
                success: false,
                entitiesProcessed: 0,
                errors: ['No text selected'],
                warnings: []
            };
        }

        // Detect file type from document
        const fileType = this.detectFileType(editor.document);

        return this.processText(selectedText, { ...options, selectionOnly: true, fileType });
    }

    /**
     * Processes raw text content for property sorting
     * 
     * This method serves as the bridge between VS Code-specific processing methods and the
     * core processor, converting VS Code options to core options and delegating the actual processing.
     * 
     * @param text - The raw text content to process
     * @param options - Processing options including VS Code-specific settings
     * @returns Processing result with sorted properties and metadata
     * 
     * @example
     * ```typescript
     * // Process raw TypeScript code
     * const processor = new FileProcessor();
     * const code = `interface User { name: string; id: number; email: string; }`;
     * const result = processor.processText(code, { sortOrder: 'asc' });
     * // Result: interface User { email: string; id: number; name: string; }
     * ```
     * 
     * @example
     * ```typescript
     * // Process object literal with nested sorting
     * const processor = new FileProcessor();
     * const code = `const config = { zebra: { beta: 1, alpha: 2 }, apple: 3 };`;
     * const result = processor.processText(code, { 
     *   sortOrder: 'asc', 
     *   sortNestedObjects: true 
     * });
     * // Result: const config = { apple: 3, zebra: { alpha: 2, beta: 1 } };
     * ```
     */
    public processText(
        text: string,
        options: Partial<FileProcessorOptions> = {}
    ): ProcessingResult {
        // Convert to core processor options (remove VS Code-specific options)
        const coreOptions: Partial<CoreProcessorOptions> = {
            sortOrder: options.sortOrder,
            preserveFormatting: options.preserveFormatting,
            includeComments: options.includeComments,
            indentation: options.indentation,
            sortNestedObjects: options.sortNestedObjects,
            fileType: options.fileType,
            sortByImportance: options.sortByImportance,
            groupVendorPrefixes: options.groupVendorPrefixes,
            caseSensitive: options.caseSensitive,
            naturalSort: options.naturalSort,
            customOrder: options.customOrder,
            groupByType: options.groupByType,
            prioritizeRequired: options.prioritizeRequired,
            // TypeScript-specific options
            sortMethods: options.sortMethods,
            separateInterfacesAndClasses: options.separateInterfacesAndClasses,
            sortImportsExports: options.sortImportsExports,
            groupImportsByType: options.groupImportsByType,
            preserveMethodChaining: options.preserveMethodChaining,
            sortConstructorParameters: options.sortConstructorParameters,
            prioritizePublicMembers: options.prioritizePublicMembers,
            // Enhanced CSS-specific options
            groupByCategory: options.groupByCategory,
            preserveMediaQueryOrder: options.preserveMediaQueryOrder,
            sortNestedRules: options.sortNestedRules,
            groupVariables: options.groupVariables,
            sortKeyframes: options.sortKeyframes,
            preserveVendorPrefixOrder: options.preserveVendorPrefixOrder,
            sortAtRules: options.sortAtRules,
            // Go-specific options
            sortStructFields: options.sortStructFields,
            groupEmbeddedFields: options.groupEmbeddedFields,
            sortMethodReceivers: options.sortMethodReceivers,
            preserveStructTags: options.preserveStructTags,
            groupByVisibility: options.groupByVisibility,
            sortInterfaceMethods: options.sortInterfaceMethods,
            preserveMethodSets: options.preserveMethodSets
        };

        return this.coreProcessor.processText(text, coreOptions);
    }

    /**
     * Detects the file type from a VS Code document
     * 
     * @param document - The VS Code document to analyze
     * @returns The detected file type
     */
    detectFileType(document: vscode.TextDocument): 'typescript' | 'javascript' | 'css' | 'scss' | 'sass' | 'less' | 'go' {
        const languageId = document.languageId;
        
        switch (languageId) {
            case 'typescript':
            case 'typescriptreact':
                return 'typescript';
            case 'javascript':
            case 'javascriptreact':
                return 'javascript';
            case 'css':
                return 'css';
            case 'scss':
                return 'scss';
            case 'sass':
                return 'sass';
            case 'less':
                return 'less';
            case 'go':
                return 'go';
            default: {
                // Fallback to filename extension
                const fileName = document.fileName;
                const extension = fileName.split('.').pop()?.toLowerCase();
                switch (extension) {
                    case 'css':
                        return 'css';
                    case 'scss':
                        return 'scss';
                    case 'sass':
                        return 'sass';
                    case 'less':
                        return 'less';
                    case 'go':
                        return 'go';
                    case 'js':
                    case 'jsx':
                        return 'javascript';
                    case 'ts':
                    case 'tsx':
                    default:
                        return 'typescript';
                }
            }
        }
    }

    /**
     * Applies processing results to a VS Code editor by replacing content
     * 
     * This method takes the processed text from a processing result and applies it to the
     * editor, either replacing the entire document or just the selected text based on options.
     * 
     * @param editor - The VS Code text editor to modify
     * @param result - The processing result containing the processed text
     * @param options - Processing options that determine how to apply changes
     * @returns Promise resolving to true if changes were applied successfully, false otherwise
     * 
     * @example
     * ```typescript
     * // Apply processing result to entire document
     * const processor = new FileProcessor();
     * const result = await processor.processDocument(document);
     * if (result.success) {
     *   const applied = await processor.applyToEditor(editor, result, {});
     *   if (applied) {
     *     vscode.window.showInformationMessage('Properties sorted successfully');
     *   }
     * }
     * ```
     * 
     * @example
     * ```typescript
     * // Apply processing result to selection only
     * const processor = new FileProcessor();
     * const result = await processor.processSelection(editor);
     * if (result.success) {
     *   const applied = await processor.applyToEditor(editor, result, { selectionOnly: true });
     *   console.log(`Applied: ${applied}`);
     * }
     * ```
     */
    public async applyToEditor(
        editor: vscode.TextEditor,
        result: ProcessingResult,
        options: Partial<FileProcessorOptions> = {}
    ): Promise<boolean> {
        if (!result.success || !result.processedText) {
            return false;
        }

        const processingOptions = this.getDefaultOptions(options);
        
        try {
            await editor.edit(editBuilder => {
                if (processingOptions.selectionOnly && !editor.selection.isEmpty) {
                    // Replace only the selected text
                    editBuilder.replace(editor.selection, result.processedText!);
                } else {
                    // Replace the entire document
                    const fullRange = new vscode.Range(
                        editor.document.positionAt(0),
                        editor.document.positionAt(editor.document.getText().length)
                    );
                    editBuilder.replace(fullRange, result.processedText!);
                }
            });

            return true;
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to apply changes: ${error instanceof Error ? error.message : String(error)}`
            );
            return false;
        }
    }

    /**
     * Merges user-provided options with sensible defaults for file processing
     * 
     * This private method ensures that all required options have values by providing
     * defaults for any options not specified by the user.
     * 
     * @param options - Partial options provided by the user
     * @returns Complete options object with all required properties
     */
    private getDefaultOptions(options: Partial<FileProcessorOptions>): FileProcessorOptions {
        return {
            sortOrder: 'asc',
            preserveFormatting: true,
            includeComments: true,
            indentation: '    ', // 4 spaces
            sortNestedObjects: true,
            selectionOnly: false,
            ...options
        };
    }
}

/**
 * Convenience function to process a VS Code document without creating a FileProcessor instance
 * 
 * This function provides a quick way to process a document when you don't need to reuse
 * the processor instance or maintain state between operations.
 * 
 * @param document - The VS Code text document to process
 * @param options - Processing options to control sorting behavior
 * @returns Promise resolving to processing result
 * 
 * @example
 * ```typescript
 * // Quick document processing
 * const document = vscode.window.activeTextEditor?.document;
 * if (document) {
 *   const result = await processDocument(document, { sortOrder: 'desc' });
 *   console.log(`Success: ${result.success}`);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Process with full options
 * const result = await processDocument(document, {
 *   sortOrder: 'asc',
 *   preserveFormatting: false,
 *   includeComments: true,
 *   sortNestedObjects: true
 * });
 * ```
 */
export async function processDocument(
    document: vscode.TextDocument,
    options: Partial<FileProcessorOptions> = {}
): Promise<ProcessingResult> {
    const processor = new FileProcessor();
    return processor.processDocument(document, options);
}

// Re-export core functionality for compatibility
export { ProcessingResult } from './coreProcessor';
export { processText } from './coreProcessor'; 