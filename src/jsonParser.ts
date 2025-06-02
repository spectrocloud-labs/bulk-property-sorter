import { ParsedEntity, ParsedProperty, PropertyComment, ParseResult, ParserOptions } from './types';
import { BaseParserUtils } from './parserUtils';

/**
 * JSON parser for extracting and analyzing JSON objects and arrays
 * 
 * This parser handles both standard JSON and JSONC (JSON with comments) files,
 * extracting object properties and array elements for sorting operations.
 * Supports nested objects and preserves comments in JSONC format.
 */
export class JSONParser extends BaseParserUtils {
    /** Regular expressions for comment detection in JSONC */
    private static readonly COMMENT_PATTERNS = {
        singleLine: /\/\/.*$/gm,
        multiLine: /\/\*[\s\S]*?\*\//gm,
        trailingCommas: /,(\s*[}\]])/g
    };

    /**
     * Creates a new JSONParser with the specified parsing options
     * 
     * @param options - Partial parser options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create parser with default options
     * const parser = new JSONParser();
     * const result = parser.parse(jsonCode);
     * ```
     * 
     * @example
     * ```typescript
     * // Create parser with custom options
     * const parser = new JSONParser({
     *   includeComments: true,
     *   sortOrder: 'asc',
     *   sortObjectKeys: true
     * });
     * ```
     */
    constructor(options: Partial<ParserOptions> = {}) {
        super({
            preserveFormatting: true,
            includeComments: true,
            sortObjectKeys: true,
            preserveArrayOrder: true,
            sortNestedObjects: true,
            ...options
        });
    }

    /**
     * Parses JSON/JSONC source code and extracts all sortable entities
     * 
     * This method parses the JSON content, handling both standard JSON and JSONC
     * (JSON with comments), and extracts objects and arrays as entities for sorting.
     * 
     * @param sourceCode - The JSON/JSONC source code to parse
     * @param fileName - Optional filename for the source (used for type detection)
     * @returns Parse result containing extracted entities, errors, and metadata
     * 
     * @example
     * ```typescript
     * // Parse a JSON configuration file
     * const parser = new JSONParser();
     * const code = `{
     *   "name": "my-app",
     *   "dependencies": {
     *     "react": "^18.0.0",
     *     "babel": "^7.0.0"
     *   }
     * }`;
     * const result = parser.parse(code);
     * ```
     * 
     * @example
     * ```typescript
     * // Parse JSONC with comments
     * const parser = new JSONParser();
     * const code = `{
     *   \/\/ Application configuration
     *   "name": "my-app",
     *   \/\* Dependencies section *\/
     *   "dependencies": {
     *     "react": "^18.0.0"
     *   }
     * }`;
     * const result = parser.parse(code, 'config.jsonc');
     * ```
     */
    public parse(sourceCode: string, fileName: string = 'temp.json'): ParseResult {
        this.sourceCode = sourceCode;
        
        const fileType = this.detectFileType(fileName);
        
        const result: ParseResult = {
            entities: [],
            errors: [],
            sourceCode,
            fileType
        };

        try {
            // Extract comments if JSONC format
            const comments = fileType === 'jsonc' ? this.extractComments(sourceCode) : [];
            
            // Clean JSON for parsing (remove comments and trailing commas for JSONC)
            const cleanedJson = fileType === 'jsonc' ? this.cleanJsonForParsing(sourceCode) : sourceCode;
            
            // Parse the JSON
            const parsedJson = JSON.parse(cleanedJson);
            
            // Extract entities from the parsed JSON
            this.extractEntitiesFromValue(parsedJson, 'root', result, comments, 0);

            // Apply sorting if requested
            this.applySorting(result);

        } catch (error) {
            if (error instanceof SyntaxError) {
                result.errors.push(`JSON parsing error: ${error.message}`);
            } else {
                result.errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return result;
    }

    /**
     * Detects the file type based on the filename extension
     * 
     * @param fileName - The filename to analyze
     * @returns The detected file type (json or jsonc)
     */
    private detectFileType(fileName: string): 'json' | 'jsonc' {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension === 'jsonc' ? 'jsonc' : 'json';
    }

    /**
     * Extracts comments from JSONC source code
     * 
     * @param sourceCode - The JSONC source code containing comments
     * @returns Array of extracted comments with their positions
     */
    private extractComments(sourceCode: string): PropertyComment[] {
        const comments: PropertyComment[] = [];
        
        // Extract single-line comments
        const singleLineRegex = /\/\/.*$/gm;
        let match;
        while ((match = singleLineRegex.exec(sourceCode)) !== null) {
            const line = this.getLineNumber(match.index);
            comments.push({
                text: match[0].replace(/^\/\/\s*/, '').trim(),
                type: 'single',
                raw: match[0],
                line
            });
        }

        // Extract multi-line comments
        const multiLineRegex = /\/\*[\s\S]*?\*\//gm;
        while ((match = multiLineRegex.exec(sourceCode)) !== null) {
            const line = this.getLineNumber(match.index);
            comments.push({
                text: match[0].replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '').trim(),
                type: 'multi',
                raw: match[0],
                line
            });
        }

        return comments.sort((a, b) => a.line - b.line);
    }

    /**
     * Cleans JSONC source code for JSON parsing by removing comments and trailing commas
     * 
     * @param sourceCode - The JSONC source code to clean
     * @returns Cleaned JSON string that can be parsed by JSON.parse()
     */
    private cleanJsonForParsing(sourceCode: string): string {
        let cleaned = sourceCode;
        
        // Remove multi-line comments
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//gm, '');
        
        // Remove single-line comments
        cleaned = cleaned.replace(/\/\/.*$/gm, '');
        
        // Remove trailing commas
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        
        return cleaned;
    }

    /**
     * Recursively extracts entities from a JSON value (object, array, or primitive)
     * 
     * @param value - The JSON value to extract entities from
     * @param name - The name/path of this value
     * @param result - The parse result to add entities to
     * @param comments - Available comments to associate with properties
     * @param depth - Current nesting depth
     */
    private extractEntitiesFromValue(
        value: any,
        name: string,
        result: ParseResult,
        comments: PropertyComment[],
        depth: number
    ): void {
        // Only create entities for the root level (depth 0)
        if (depth === 0) {
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    // Handle array
                    const entity = this.createArrayEntity(value, name, comments, depth);
                    if (entity) {
                        result.entities.push(entity);
                    }
                } else {
                    // Handle object
                    const entity = this.createObjectEntity(value, name, comments, depth);
                    if (entity) {
                        result.entities.push(entity);
                    }
                }
            }
        }
        // Note: We don't recursively create entities for nested objects/arrays
        // The nested objects are handled as properties with hasNestedObject: true
        // and their internal sorting is handled by the sorter if sortNestedObjects is enabled
    }

    /**
     * Creates a ParsedEntity for a JSON object
     * 
     * @param obj - The JSON object to create an entity for
     * @param name - The name/path of the object
     * @param comments - Available comments
     * @param _depth - Nesting depth
     * @returns ParsedEntity representing the object
     */
    private createObjectEntity(
        obj: Record<string, any>,
        name: string,
        comments: PropertyComment[],
        _depth: number
    ): ParsedEntity | null {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return null;
        }

        const properties: ParsedProperty[] = [];
        const keys = Object.keys(obj);

        keys.forEach((key, index) => {
            const value = obj[key];
            
            // Find the line number for this property in the original source
            const propertyLine = this.findPropertyLine(key);
            
            const property: ParsedProperty = {
                name: key,
                value: this.formatJsonValue(value),
                comments: this.findAssociatedComments(key, comments),
                optional: false, // JSON doesn't have optional properties
                line: propertyLine,
                fullText: `"${key}": ${this.formatJsonValue(value)}`,
                trailingPunctuation: index < keys.length - 1 ? ',' : '',
                hasNestedObject: this.isObject(value),
                isSpread: false
            };

            // Extract trailing comments for this property
            const trailingComments = this.findTrailingComments(key, propertyLine, comments);
            if (trailingComments.length > 0) {
                property.trailingComments = trailingComments;
            }

            properties.push(property);
        });

        return {
            type: 'json-object',
            name: name,
            properties,
            startLine: 1,
            endLine: properties.length + 2,
            leadingComments: this.findLeadingComments(name, comments),
            isExported: false,
            originalText: JSON.stringify(obj, null, 2)
        };
    }

    /**
     * Creates a ParsedEntity for a JSON array
     * 
     * @param arr - The JSON array to create an entity for
     * @param name - The name/path of the array
     * @param comments - Available comments
     * @param _depth - Nesting depth
     * @returns ParsedEntity representing the array
     */
    private createArrayEntity(
        arr: any[],
        name: string,
        comments: PropertyComment[],
        _depth: number
    ): ParsedEntity | null {
        if (!Array.isArray(arr)) {
            return null;
        }

        const properties: ParsedProperty[] = [];

        // Create properties for array elements (they can be sorted if needed)
        arr.forEach((item, index) => {
            const elementLine = index + 2; // Approximate line number (after opening bracket)
            
            const property: ParsedProperty = {
                name: `[${index}]`,
                value: this.formatJsonValue(item),
                comments: [],
                optional: false,
                line: elementLine,
                fullText: this.formatJsonValue(item),
                trailingPunctuation: index < arr.length - 1 ? ',' : '',
                hasNestedObject: this.isObject(item),
                isSpread: false
            };

            // Extract trailing comments for this array element
            const trailingComments = this.findTrailingCommentsForArrayElement(index, elementLine, comments);
            if (trailingComments.length > 0) {
                property.trailingComments = trailingComments;
            }

            properties.push(property);
        });

        return {
            type: 'json-array',
            name: name,
            properties,
            startLine: 1,
            endLine: arr.length + 2,
            leadingComments: this.findLeadingComments(name, comments),
            isExported: false,
            originalText: JSON.stringify(arr, null, 2)
        };
    }

    /**
     * Formats a JSON value as a string for display
     * 
     * @param value - The JSON value to format
     * @returns Formatted string representation or structured data for objects/arrays
     */
    private formatJsonValue(value: any): any {
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value}"`; // Return quoted strings for simple values
        if (typeof value === 'boolean' || typeof value === 'number') return String(value); // Return string representation for simple values
        if (Array.isArray(value)) return value; // Return the actual array for reconstruction
        if (typeof value === 'object') return value; // Return the actual object for reconstruction
        return JSON.stringify(value); // Fallback to JSON.stringify for other types
    }

    /**
     * Checks if a value is a JSON object
     * 
     * @param value - The value to check
     * @returns True if the value is an object (not array or null)
     */
    private isObject(value: any): boolean {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Finds comments associated with a specific property key
     * 
     * @param key - The property key to find comments for
     * @param comments - All available comments
     * @returns Array of associated comments
     */
    private findAssociatedComments(key: string, comments: PropertyComment[]): PropertyComment[] {
        // Simple implementation - could be enhanced to better match comments to properties
        return comments.filter(comment => 
            comment.text.toLowerCase().includes(key.toLowerCase()) ||
            comment.line === this.getLineNumber(this.sourceCode.indexOf(`"${key}"`))
        );
    }

    /**
     * Finds leading comments for an entity
     * 
     * @param name - The entity name
     * @param comments - All available comments
     * @returns Array of leading comments
     */
    private findLeadingComments(name: string, comments: PropertyComment[]): PropertyComment[] {
        // Simple implementation - return comments that appear before the entity
        if (name === 'root') {
            return comments.slice(0, 3); // Return first few comments as leading comments for root
        }
        return [];
    }

    /**
     * Finds the line number for a property in the original source code
     * 
     * @param key - The property key to find
     * @returns Line number where the property is located
     */
    private findPropertyLine(key: string): number {
        const lines = this.sourceCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`"${key}"`)) {
                return i + 1; // Convert to 1-based line number
            }
        }
        return 1; // Fallback to line 1
    }

    /**
     * Finds trailing comments for a specific property
     * 
     * @param key - The property key
     * @param propertyLine - The line number where the property is located
     * @param comments - All available comments
     * @returns Array of trailing comments for this property
     */
    private findTrailingComments(key: string, propertyLine: number, comments: PropertyComment[]): PropertyComment[] {
        const trailingComments: PropertyComment[] = [];
        
        // Look for comments on the same line as the property
        const sameLineComments = comments.filter(comment => comment.line === propertyLine);
        
        // Also look for comments that appear immediately after the property line
        const _nextLineComments = comments.filter(comment => comment.line === propertyLine + 1);
        
        // Check if the comment appears after the property key in the source
        const lines = this.sourceCode.split('\n');
        if (propertyLine <= lines.length) {
            const propertyLineText = lines[propertyLine - 1]; // Convert to 0-based index
            const keyIndex = propertyLineText.indexOf(`"${key}"`);
            
            if (keyIndex !== -1) {
                // Look for comments after the property key on the same line
                const afterKeyText = propertyLineText.substring(keyIndex + key.length + 1);
                
                // Check for single-line comments
                const singleLineMatch = afterKeyText.match(/\/\/(.*)$/);
                if (singleLineMatch) {
                    trailingComments.push({
                        text: singleLineMatch[1].trim(),
                        type: 'single',
                        raw: singleLineMatch[0],
                        line: propertyLine
                    });
                }
                
                // Check for multi-line comments
                const multiLineMatch = afterKeyText.match(/\/\*([^*]|\*(?!\/))*\*\//);
                if (multiLineMatch) {
                    trailingComments.push({
                        text: multiLineMatch[0].replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '').trim(),
                        type: 'multi',
                        raw: multiLineMatch[0],
                        line: propertyLine
                    });
                }
            }
        }
        
        // Add any same-line comments that weren't already captured
        sameLineComments.forEach(comment => {
            if (!trailingComments.some(tc => tc.raw === comment.raw)) {
                trailingComments.push(comment);
            }
        });
        
        return trailingComments;
    }

    /**
     * Finds trailing comments for a specific array element
     * 
     * @param _index - The array element index
     * @param elementLine - The line number where the element is located
     * @param comments - All available comments
     * @returns Array of trailing comments for this array element
     */
    private findTrailingCommentsForArrayElement(_index: number, elementLine: number, comments: PropertyComment[]): PropertyComment[] {
        const trailingComments: PropertyComment[] = [];
        
        // Look for comments on the same line as the array element
        const sameLineComments = comments.filter(comment => comment.line === elementLine);
        
        // For array elements, we look for comments that appear after the element value
        const lines = this.sourceCode.split('\n');
        if (elementLine <= lines.length) {
            const elementLineText = lines[elementLine - 1]; // Convert to 0-based index
            
            // Look for comments after any comma or value on the same line
            const afterElementText = elementLineText.substring(elementLineText.indexOf(',') + 1);
            
            // Check for single-line comments
            const singleLineMatch = afterElementText.match(/\/\/(.*)$/);
            if (singleLineMatch) {
                trailingComments.push({
                    text: singleLineMatch[1].trim(),
                    type: 'single',
                    raw: singleLineMatch[0],
                    line: elementLine
                });
            }
            
            // Check for multi-line comments
            const multiLineMatch = afterElementText.match(/\/\*([^*]|\*(?!\/))*\*\//);
            if (multiLineMatch) {
                trailingComments.push({
                    text: multiLineMatch[0].replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '').trim(),
                    type: 'multi',
                    raw: multiLineMatch[0],
                    line: elementLine
                });
            }
        }
        
        // Add any same-line comments that weren't already captured
        sameLineComments.forEach(comment => {
            if (!trailingComments.some(tc => tc.raw === comment.raw)) {
                trailingComments.push(comment);
            }
        });
        
        return trailingComments;
    }
} 