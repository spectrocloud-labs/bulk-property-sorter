import * as vscode from 'vscode';
import { CoreProcessorOptions } from './coreProcessor';

/**
 * Formatting utility functions for the Bulk Property Sorter extension
 * 
 * This module provides utilities for handling various formatting options including
 * indentation detection, line ending resolution, and comment style conversion.
 */

/**
 * Resolves the actual indentation string based on formatting options and editor settings
 * 
 * @param options - Core processor options containing formatting preferences
 * @param editor - VS Code text editor for auto-detection
 * @returns The resolved indentation string
 */
export function resolveIndentation(options: CoreProcessorOptions, editor?: vscode.TextEditor): string {
    if (options.indentationType === 'tabs') {
        return '\t';
    }
    
    if (options.indentationType === 'spaces') {
        const size = options.indentationSize || 4;
        return ' '.repeat(size);
    }
    
    // Auto-detection from editor
    if (editor) {
        const editorOptions = editor.options;
        if (editorOptions.insertSpaces) {
            const tabSize = typeof editorOptions.tabSize === 'number' ? editorOptions.tabSize : 4;
            return ' '.repeat(tabSize);
        } else {
            return '\t';
        }
    }
    
    // Fallback to 4 spaces
    return '    ';
}

/**
 * Resolves the line ending style based on formatting options and file content
 * 
 * @param options - Core processor options containing line ending preference
 * @param fileContent - Original file content for auto-detection
 * @returns The resolved line ending string
 */
export function resolveLineEnding(options: CoreProcessorOptions, fileContent?: string): '\n' | '\r\n' {
    if (options.lineEnding === 'lf') {
        return '\n';
    }
    
    if (options.lineEnding === 'crlf') {
        return '\r\n';
    }
    
    // Auto-detection from file content
    if (fileContent) {
        const crlfCount = (fileContent.match(/\r\n/g) || []).length;
        const lfCount = (fileContent.match(/(?<!\r)\n/g) || []).length;
        
        if (crlfCount > lfCount) {
            return '\r\n';
        }
    }
    
    // Platform default
    return process.platform === 'win32' ? '\r\n' : '\n';
}

/**
 * Determines whether comments should be included based on formatting options
 * 
 * @param options - Core processor options containing comment preferences
 * @returns True if comments should be included, false otherwise
 */
export function shouldIncludeComments(options: CoreProcessorOptions): boolean {
    // preserveComments overrides includeComments when false
    if (options.preserveComments === false) {
        return false;
    }
    
    return options.includeComments !== false;
}

/**
 * Calculates property spacing based on formatting options
 * 
 * @param options - Core processor options containing spacing preferences
 * @param properties - Array of property names for alignment calculation
 * @returns Object containing spacing configuration
 */
export function calculatePropertySpacing(options: CoreProcessorOptions, properties?: string[]): {
    beforeColon: string;
    afterColon: string;
    alignment?: number;
} {
    switch (options.propertySpacing) {
        case 'spaced':
            return {
                beforeColon: ' ',
                afterColon: ' '
            };
            
        case 'aligned':
            if (properties && properties.length > 0) {
                const maxLength = Math.max(...properties.map(p => p.length));
                return {
                    beforeColon: '',
                    afterColon: ' ',
                    alignment: maxLength
                };
            }
            return {
                beforeColon: '',
                afterColon: ' '
            };
            
        case 'compact':
        default:
            return {
                beforeColon: '',
                afterColon: ' '
            };
    }
}

/**
 * Handles trailing comma formatting based on options
 * 
 * @param options - Core processor options containing trailing comma preferences
 * @param originalPunctuation - Original trailing punctuation
 * @param isLastProperty - Whether this is the last property in the container
 * @returns The formatted trailing punctuation
 */
export function formatTrailingComma(
    options: CoreProcessorOptions, 
    originalPunctuation: string, 
    isLastProperty: boolean
): string {
    switch (options.trailingCommas) {
        case 'add':
            // If original has semicolon, preserve it (semicolons have different semantics)
            if (originalPunctuation.includes(';')) {
                return ';';
            }
            // Otherwise add comma
            return ',';
            
        case 'remove':
            if (isLastProperty) {
                return originalPunctuation.includes(';') ? ';' : '';
            }
            return originalPunctuation || ',';
            
        case 'preserve':
        default:
            return originalPunctuation;
    }
}

/**
 * Handles trailing comma formatting for interface and type properties specifically
 * In interfaces and type aliases, semicolons and commas are interchangeable
 * 
 * @param options - Core processor options containing trailing comma preferences
 * @param originalPunctuation - Original trailing punctuation
 * @param isLastProperty - Whether this is the last property in the container
 * @returns The formatted trailing punctuation
 */
export function formatTrailingCommaForInterface(
    options: CoreProcessorOptions, 
    originalPunctuation: string, 
    isLastProperty: boolean
): string {
    switch (options.trailingCommas) {
        case 'add':
            // In interfaces and type aliases, always convert to commas when adding
            return ',';
            
        case 'remove':
            if (isLastProperty) {
                return originalPunctuation.includes(';') ? ';' : '';
            }
            return originalPunctuation || ',';
            
        case 'preserve':
        default:
            return originalPunctuation;
    }
}

/**
 * Adds blank lines between property groups if enabled
 * 
 * @param options - Core processor options containing group spacing preferences
 * @param currentGroup - Current property group type
 * @param previousGroup - Previous property group type
 * @param lineEnding - Line ending style to use
 * @returns Additional line breaks to insert
 */
export function getGroupSeparator(
    options: CoreProcessorOptions,
    currentGroup: string,
    previousGroup: string | null,
    lineEnding: string
): string {
    if (options.blankLinesBetweenGroups && 
        previousGroup && 
        currentGroup !== previousGroup) {
        return lineEnding;
    }
    return '';
}

/**
 * Converts comment style based on formatting options
 * 
 * @param commentText - The comment text content
 * @param originalType - Original comment type ('single' or 'multi')
 * @param targetStyle - Target comment style from options
 * @returns Formatted comment string
 */
export function convertCommentStyle(
    commentText: string,
    originalType: 'single' | 'multi',
    targetStyle: 'preserve' | 'single-line' | 'multi-line'
): string {
    if (targetStyle === 'preserve') {
        return originalType === 'single' ? `// ${commentText}` : `/* ${commentText} */`;
    }
    
    if (targetStyle === 'single-line') {
        return `// ${commentText}`;
    }
    
    if (targetStyle === 'multi-line') {
        return `/* ${commentText} */`;
    }
    
    // Fallback to preserve
    return originalType === 'single' ? `// ${commentText}` : `/* ${commentText} */`;
} 