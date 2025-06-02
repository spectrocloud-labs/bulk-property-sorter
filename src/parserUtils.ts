import { ParseResult, ParserOptions } from './types';
import { PropertySorter } from './sorter';

/**
 * Shared utility functions for parsers to improve modularity and reduce code duplication
 * 
 * This module contains common functionality used across TypeScript, CSS, and Go parsers,
 * promoting code reuse and consistent behavior across different language parsers.
 */

/**
 * Base parser utility class providing common functionality for all language parsers
 * 
 * This class contains shared methods that can be used by any parser implementation,
 * reducing code duplication and ensuring consistent behavior across parsers.
 */
export abstract class BaseParserUtils {
    protected sourceCode: string = '';
    protected options: ParserOptions;

    constructor(options: Partial<ParserOptions> = {}) {
        this.options = {
            preserveFormatting: true,
            includeComments: true,
            ...options
        };
    }

    /**
     * Gets the line number for a given position in the source code
     * 
     * This method converts a character position to a 1-based line number,
     * which is useful for error reporting and metadata tracking.
     * 
     * @param position - Character position in source code
     * @returns Line number (1-indexed)
     */
    protected getLineNumber(position: number): number {
        const beforeText = this.sourceCode.substring(0, position);
        return beforeText.split('\n').length;
    }

    /**
     * Applies property sorting to parsed entities based on parser configuration options
     * 
     * This method provides a consistent sorting implementation across all parsers,
     * using the PropertySorter with appropriate configuration.
     * 
     * @param result - The parse result to apply sorting to
     */
    protected applySorting(result: ParseResult): void {
        if (this.options.sortOrder) {
            try {
                const sorter = new PropertySorter({
                    order: this.options.sortOrder,
                    preserveComments: this.options.includeComments,
                    caseSensitive: false,
                    sortNestedObjects: this.options.sortNestedObjects ?? true,
                    // CSS-specific options (ignored by other parsers)
                    sortByImportance: this.options.sortByImportance,
                    groupVendorPrefixes: this.options.groupVendorPrefixes
                });

                result.entities = sorter.sortMultipleEntities(result.entities);
            } catch (error) {
                result.errors.push(`Sorting error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Sorts properties in a parse result with custom options, returning a new result
     * 
     * This method allows applying different sorting options to an existing parse result
     * without re-parsing the source code, useful for testing different sort orders.
     * 
     * @param result - The parse result containing entities to sort
     * @param sortOrder - The sort order to apply ('asc' or 'desc')
     * @returns New parse result with sorted properties
     */
    public sortParseResult(result: ParseResult, sortOrder: 'asc' | 'desc' = 'asc'): ParseResult {
        try {
            const sorter = new PropertySorter({
                order: sortOrder,
                preserveComments: this.options.includeComments,
                caseSensitive: false,
                sortNestedObjects: this.options.sortNestedObjects ?? true,
                // CSS-specific options (ignored by other parsers)
                sortByImportance: this.options.sortByImportance,
                groupVendorPrefixes: this.options.groupVendorPrefixes
            });

            const sortedEntities = sorter.sortMultipleEntities(result.entities);

            return {
                ...result,
                entities: sortedEntities
            };
        } catch (error) {
            return {
                ...result,
                errors: [...result.errors, `Sorting error: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    /**
     * Determines if a name represents an exported entity based on language-specific rules
     * 
     * This method provides a default implementation that can be overridden by specific parsers
     * to implement language-specific export detection logic.
     * 
     * @param name - The entity name to check
     * @returns True if the entity is exported, false otherwise
     */
    protected isExported(name: string): boolean {
        // Default implementation - can be overridden by specific parsers
        return name.length > 0 && name[0] === name[0].toUpperCase();
    }
}

/**
 * Utility functions for common parsing operations
 */
export class ParserUtils {
    /**
     * Detects file type based on filename extension
     * 
     * @param fileName - The filename to analyze
     * @returns The detected file type
     */
    static detectFileType(fileName: string): 'typescript' | 'javascript' | 'css' | 'scss' | 'sass' | 'less' | 'go' {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'scss':
                return 'scss';
            case 'sass':
                return 'sass';
            case 'less':
                return 'less';
            case 'css':
                return 'css';
            case 'go':
                return 'go';
            default:
                return 'typescript'; // Default fallback
        }
    }

    /**
     * Cleans comment text by removing comment markers while preserving content
     * 
     * @param commentText - The raw comment text including markers
     * @param isMultiLine - Whether this is a multi-line comment
     * @returns Cleaned comment text without markers
     */
    static cleanCommentText(commentText: string, isMultiLine: boolean): string {
        if (isMultiLine) {
            return commentText.replace(/^\/\*\*?/, '').replace(/\*\/$/, '').trim();
        } else {
            return commentText.replace(/^\/\//, '').trim();
        }
    }

    /**
     * Calculates the line number for a given position in source code
     * 
     * @param sourceCode - The source code
     * @param position - Character position in source code
     * @returns Line number (1-indexed)
     */
    static getLineNumber(sourceCode: string, position: number): number {
        const beforeText = sourceCode.substring(0, position);
        return beforeText.split('\n').length;
    }

    /**
     * Gets approximate character position from line number
     * 
     * @param sourceCode - The source code
     * @param lineNumber - The line number (1-indexed)
     * @returns Approximate character position
     */
    static getPositionFromLine(sourceCode: string, lineNumber: number): number {
        const lines = sourceCode.split('\n');
        let position = 0;
        for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
            position += lines[i].length + 1; // +1 for newline
        }
        return position;
    }
} 