import * as vscode from 'vscode';

/**
 * Utility class for filtering files based on glob patterns
 * 
 * This class provides functionality to determine whether a file should be processed
 * based on user-configured include and exclude patterns using glob syntax.
 */
export class FilePatternFilter {
    /**
     * Checks if a file should be processed based on include and exclude patterns
     * 
     * @param document - The VS Code document to check
     * @param includedPatterns - Array of glob patterns for files to include
     * @param excludedPatterns - Array of glob patterns for files to exclude
     * @returns true if the file should be processed, false otherwise
     * 
     * @example
     * ```typescript
     * const filter = new FilePatternFilter();
     * const shouldProcess = filter.shouldProcessFile(
     *   document,
     *   ['**\/*.ts', '**\/*.js'],
     *   ['**\/*.test.ts', '**\/node_modules\/**']
     * );
     * ```
     */
    public shouldProcessFile(
        document: vscode.TextDocument,
        includedPatterns: string[] = ['**/*'],
        excludedPatterns: string[] = []
    ): boolean {
        const filePath = this.getRelativeFilePath(document);
        
        // Check if file matches any excluded patterns first
        if (excludedPatterns.length > 0) {
            for (const pattern of excludedPatterns) {
                if (this.matchesPattern(filePath, pattern)) {
                    return false;
                }
            }
        }
        
        // Check if file matches any included patterns
        if (includedPatterns.length > 0) {
            for (const pattern of includedPatterns) {
                if (this.matchesPattern(filePath, pattern)) {
                    return true;
                }
            }
            // If there are include patterns but none match, exclude the file
            return false;
        }
        
        // If no patterns are specified, include by default
        return true;
    }

    /**
     * Gets the relative file path for pattern matching
     * 
     * @param document - The VS Code document
     * @returns The relative file path or absolute path if no workspace
     */
    private getRelativeFilePath(document: vscode.TextDocument): string {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        
        if (workspaceFolder) {
            // Get path relative to workspace root
            return vscode.workspace.asRelativePath(document.uri, false);
        }
        
        // If no workspace, use the full file path
        return document.uri.fsPath;
    }

    /**
     * Checks if a file path matches a glob pattern
     * 
     * This method implements basic glob pattern matching without external dependencies.
     * Supports * (any characters), ** (any directories), and ? (single character).
     * 
     * @param filePath - The file path to test
     * @param pattern - The glob pattern to match against
     * @returns true if the path matches the pattern
     */
    matchesPattern(filePath: string, pattern: string): boolean {
        // Normalize path separators to forward slashes for consistent matching
        const normalizedPath = filePath.replace(/\\/g, '/');
        const normalizedPattern = pattern.replace(/\\/g, '/');
        
        // Convert glob pattern to regex
        const regexPattern = this.globToRegex(normalizedPattern);
        const regex = new RegExp(regexPattern, 'i'); // Case-insensitive matching
        
        return regex.test(normalizedPath);
    }

    /**
     * Converts a glob pattern to a regular expression
     * 
     * @param pattern - The glob pattern to convert
     * @returns A regex pattern string
     */
    globToRegex(pattern: string): string {
        let regexPattern = '';
        let i = 0;
        
        while (i < pattern.length) {
            const char = pattern[i];
            
            switch (char) {
                case '*':
                    if (i + 1 < pattern.length && pattern[i + 1] === '*') {
                        // Handle ** (match any directories)
                        if (i + 2 < pattern.length && pattern[i + 2] === '/') {
                            regexPattern += '(?:.*/)?';
                            i += 3;
                        } else {
                            regexPattern += '.*';
                            i += 2;
                        }
                    } else {
                        // Handle * (match any characters except /)
                        regexPattern += '[^/]*';
                        i++;
                    }
                    break;
                case '?':
                    // Handle ? (match single character except /)
                    regexPattern += '[^/]';
                    i++;
                    break;
                case '.':
                case '+':
                case '^':
                case '$':
                case '(':
                case ')':
                case '[':
                case ']':
                case '{':
                case '}':
                case '|':
                case '\\':
                    // Escape regex special characters
                    regexPattern += '\\' + char;
                    i++;
                    break;
                default:
                    regexPattern += char;
                    i++;
                    break;
            }
        }
        
        return '^' + regexPattern + '$';
    }
}

/**
 * Convenience function to check if a file should be processed
 * 
 * @param document - The VS Code document to check
 * @param includedPatterns - Array of glob patterns for files to include
 * @param excludedPatterns - Array of glob patterns for files to exclude
 * @returns true if the file should be processed, false otherwise
 * 
 * @example
 * ```typescript
 * const shouldProcess = shouldProcessFile(
 *   document,
 *   ['**\/*.ts', '**\/*.js'],
 *   ['**\/*.test.ts']
 * );
 * if (shouldProcess) {
 *   // Process the file
 * }
 * ```
 */
export function shouldProcessFile(
    document: vscode.TextDocument,
    includedPatterns: string[] = ['**/*'],
    excludedPatterns: string[] = []
): boolean {
    const filter = new FilePatternFilter();
    return filter.shouldProcessFile(document, includedPatterns, excludedPatterns);
} 