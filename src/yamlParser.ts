import * as yaml from 'js-yaml';
import { ParsedEntity, ParsedProperty, PropertyComment, ParseResult, ParserOptions } from './types';
import { BaseParserUtils } from './parserUtils';

/**
 * YAML parser for extracting and analyzing YAML objects and arrays
 * 
 * This parser handles YAML files including multi-document YAML, anchors, aliases,
 * and complex data types. It extracts object properties and array elements for
 * sorting operations while preserving YAML-specific formatting and features.
 */
export class YAMLParser extends BaseParserUtils {
    /** Regular expressions for YAML comment detection */
    private static readonly COMMENT_PATTERNS = {
        comment: /#.*$/gm,
        documentSeparator: /^---$/gm,
        documentEnd: /^\.\.\.$/gm,
        anchor: /&([a-zA-Z0-9_-]+)/g,
        alias: /\*([a-zA-Z0-9_-]+)/g
    };

    /**
     * Creates a new YAMLParser with the specified parsing options
     * 
     * @param options - Partial parser options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create parser with default options
     * const parser = new YAMLParser();
     * const result = parser.parse(yamlCode);
     * ```
     * 
     * @example
     * ```typescript
     * // Create parser with custom options
     * const parser = new YAMLParser({
     *   includeComments: true,
     *   sortOrder: 'asc',
     *   preserveAnchorsAndAliases: true
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
            preserveAnchorsAndAliases: true,
            preserveDocumentSeparators: true,
            preserveStringStyles: true,
            handleComplexKeys: true,
            indentationStyle: 'auto',
            ...options
        });
    }

    /**
     * Parses YAML source code and extracts all sortable entities
     * 
     * This method parses YAML content, handling multi-document YAML, anchors, aliases,
     * and various YAML data types. It extracts objects and arrays as entities for sorting.
     * 
     * @param sourceCode - The YAML source code to parse
     * @param fileName - Optional filename for the source (used for type detection)
     * @returns Parse result containing extracted entities, errors, and metadata
     * 
     * @example
     * ```typescript
     * // Parse a YAML configuration file
     * const parser = new YAMLParser();
     * const code = `
     * name: my-app
     * dependencies:
     *   react: ^18.0.0
     *   babel: ^7.0.0
     * `;
     * const result = parser.parse(code);
     * ```
     * 
     * @example
     * ```typescript
     * // Parse multi-document YAML with anchors
     * const parser = new YAMLParser();
     * const code = `
     * ---
     * # First document
     * defaults: &defaults
     *   timeout: 30
     *   retries: 3
     * ---
     * # Second document
     * service:
     *   <<: *defaults
     *   name: api
     * `;
     * const result = parser.parse(code, 'config.yaml');
     * ```
     */
    public parse(sourceCode: string, fileName: string = 'temp.yaml'): ParseResult {
        this.sourceCode = sourceCode;
        
        const fileType = this.detectFileType(fileName);
        
        const result: ParseResult = {
            entities: [],
            errors: [],
            sourceCode,
            fileType
        };

        try {
            // Extract comments from YAML
            const comments = this.extractComments(sourceCode);
            
            // Check if this is a multi-document YAML
            const isMultiDocument = this.isMultiDocumentYaml(sourceCode);
            
            if (isMultiDocument) {
                this.parseMultiDocumentYaml(sourceCode, result, comments);
            } else {
                this.parseSingleDocumentYaml(sourceCode, result, comments);
            }

            // Apply sorting if requested
            this.applySorting(result);

        } catch (error) {
            if (error instanceof yaml.YAMLException) {
                result.errors.push(`YAML parsing error: ${error.message}`);
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
     * @returns The detected file type (yaml or yml)
     */
    private detectFileType(fileName: string): 'yaml' | 'yml' {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension === 'yml' ? 'yml' : 'yaml';
    }

    /**
     * Checks if the YAML content contains multiple documents
     * 
     * @param sourceCode - The YAML source code to analyze
     * @returns True if the content contains document separators
     */
    private isMultiDocumentYaml(sourceCode: string): boolean {
        return YAMLParser.COMMENT_PATTERNS.documentSeparator.test(sourceCode);
    }

    /**
     * Parses single document YAML content
     * 
     * @param sourceCode - The YAML source code
     * @param result - The parse result to populate
     * @param comments - Extracted comments
     */
    private parseSingleDocumentYaml(sourceCode: string, result: ParseResult, comments: PropertyComment[]): void {
        try {
            const parsedYaml = yaml.load(sourceCode, {
                json: false,
                onWarning: (warning: yaml.YAMLException) => {
                    result.errors.push(`YAML warning: ${warning.message}`);
                }
            });

            if (parsedYaml !== null && parsedYaml !== undefined) {
                this.extractEntitiesFromValue(parsedYaml, 'root', result, comments, 0);
            }
        } catch (error: unknown) {
            if (error instanceof yaml.YAMLException) {
                result.errors.push(`YAML parsing error: ${error.message}`);
            } else {
                result.errors.push(`Error parsing YAML: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Parses multi-document YAML content
     * 
     * @param sourceCode - The YAML source code
     * @param result - The parse result to populate
     * @param comments - Extracted comments
     */
    private parseMultiDocumentYaml(sourceCode: string, result: ParseResult, comments: PropertyComment[]): void {
        try {
            const documents: any[] = [];
            yaml.loadAll(sourceCode, (doc: any) => {
                if (doc !== null && doc !== undefined) {
                    documents.push(doc);
                }
            }, {
                json: false,
                onWarning: (warning: yaml.YAMLException) => {
                    result.errors.push(`YAML warning: ${warning.message}`);
                }
            });

            // Split the source code by document separators to find document boundaries
            const documentSections = sourceCode.split(/^---$/gm);
            const documentBoundaries: Array<{ start: number; end: number }> = [];
            
            let currentLine = 1;
            documentSections.forEach((section, index) => {
                if (index === 0 && section.trim() === '') {
                    // Skip empty first section if document starts with ---
                    currentLine += 1; // Account for the --- separator
                    return;
                }
                
                const sectionLines = section.split('\n').length;
                const startLine = currentLine;
                const endLine = currentLine + sectionLines - 1;
                
                documentBoundaries.push({ start: startLine, end: endLine });
                currentLine = endLine + 2; // +1 for the section end, +1 for the --- separator
            });

            // Process each document with its own subset of comments
            documents.forEach((doc, index) => {
                const boundary = documentBoundaries[index];
                let documentComments: PropertyComment[] = [];
                
                if (boundary) {
                    // Filter comments that belong to this document
                    documentComments = comments.filter(comment => 
                        comment.line >= boundary.start && comment.line <= boundary.end
                    );
                    
                    // Adjust comment line numbers to be relative to the document start
                    documentComments = documentComments.map(comment => ({
                        ...comment,
                        line: comment.line - boundary.start + 1
                    }));
                }
                
                // Temporarily store the original source code
                const originalSourceCode = this.sourceCode;
                
                // Set the source code to just this document's section for proper line number calculation
                if (boundary) {
                    const documentSource = sourceCode.split('\n').slice(boundary.start - 1, boundary.end).join('\n');
                    this.sourceCode = documentSource;
                }
                
                // Extract entities from this document with its specific comments
                this.extractEntitiesFromValue(doc, `document-${index}`, result, documentComments, 0);
                
                // After creating the entity, manually assign leading comments for document entities
                if (result.entities.length > 0) {
                    const lastEntity = result.entities[result.entities.length - 1];
                    if (lastEntity.name === `document-${index}`) {
                        // For document entities, find comments that appear at the beginning of the document
                        // Look for comments in the first few lines, but be more flexible for the second document
                        const leadingComments = documentComments.filter(comment => {
                            // For the first document, look for comments in the first 3 lines
                            // For subsequent documents, look for comments that appear before any properties
                            if (index === 0) {
                                return comment.line <= 3;
                            } else {
                                // For subsequent documents, find comments that appear before the first property
                                const firstPropertyLine = Math.min(...lastEntity.properties.map(p => p.line));
                                return comment.line < firstPropertyLine;
                            }
                        });
                        
                        lastEntity.leadingComments = leadingComments;
                        
                        // Remove leading comments from the documentComments to prevent duplication
                        // in property comment association
                        const leadingCommentLines = new Set(leadingComments.map(c => c.line));
                        documentComments = documentComments.filter(comment => 
                            !leadingCommentLines.has(comment.line)
                        );
                        
                        // Update property comments to exclude the leading comments
                        lastEntity.properties.forEach(property => {
                            property.comments = property.comments.filter(comment => 
                                !leadingCommentLines.has(comment.line)
                            );
                        });
                    }
                }
                
                // Restore the original source code
                this.sourceCode = originalSourceCode;
            });
        } catch (error: unknown) {
            if (error instanceof yaml.YAMLException) {
                result.errors.push(`Multi-document YAML parsing error: ${error.message}`);
            } else {
                result.errors.push(`Error parsing multi-document YAML: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Extracts comments from YAML source code
     * 
     * @param sourceCode - The YAML source code containing comments
     * @returns Array of extracted comments with their positions
     */
    private extractComments(sourceCode: string): PropertyComment[] {
        const comments: PropertyComment[] = [];
        
        // Extract YAML comments (lines starting with #)
        const commentRegex = /#.*$/gm;
        let match;
        while ((match = commentRegex.exec(sourceCode)) !== null) {
            const line = this.getLineNumber(match.index);
            comments.push({
                text: match[0].replace(/^#\s*/, '').trim(),
                type: 'single',
                raw: match[0],
                line
            });
        }

        return comments.sort((a, b) => a.line - b.line);
    }

    /**
     * Recursively extracts entities from a YAML value (object, array, or primitive)
     * 
     * @param value - The YAML value to process
     * @param name - The name/key of this value
     * @param result - The parse result to update
     * @param comments - Available comments for association
     * @param depth - Current nesting depth
     */
    private extractEntitiesFromValue(
        value: any,
        name: string,
        result: ParseResult,
        comments: PropertyComment[],
        depth: number
    ): void {
        // For YAML, we only want to create entities at the document level (depth 0)
        // Nested objects and arrays should be handled as part of their parent entity
        if (depth > 0) {
            return; // Don't create separate entities for nested values in YAML
        }

        if (this.isObject(value) && !Array.isArray(value)) {
            // Process object - only at top level
            const entity = this.createObjectEntity(value, name, comments, depth);
            if (entity) {
                result.entities.push(entity);
            }
        } else if (Array.isArray(value)) {
            // Process array - only at top level
            const entity = this.createArrayEntity(value, name, comments, depth);
            if (entity) {
                result.entities.push(entity);
            }
        }
    }

    /**
     * Creates a parsed entity from a YAML object
     * 
     * @param obj - The YAML object to convert
     * @param name - The name of the object
     * @param comments - Available comments for association
     * @param _depth - Current nesting depth (not used in this implementation)
     * @returns A parsed entity or null if not processable
     */
    private createObjectEntity(
        obj: Record<string, any>,
        name: string,
        comments: PropertyComment[],
        _depth: number
    ): ParsedEntity | null {
        if (!this.isObject(obj) || Array.isArray(obj)) {
            return null;
        }

        const properties: ParsedProperty[] = [];
        const keys = Object.keys(obj);

        if (keys.length === 0) {
            return null; // Skip empty objects
        }

        keys.forEach(key => {
            const value = obj[key];
            const propertyLine = this.findPropertyLine(key);
            
            // Find associated comments for this property
            const associatedComments = this.findAssociatedComments(key, comments);
            
            // Handle complex keys (objects/arrays as keys)
            const processedKey = this.processKey(key);
            
            properties.push({
                name: processedKey,
                value: value, // Store the actual value, not a formatted string
                comments: associatedComments,
                optional: false, // YAML doesn't have optional properties like TypeScript
                line: propertyLine,
                fullText: `${processedKey}: ${this.formatYamlValueForDisplay(value)}`,
                trailingPunctuation: '' // YAML doesn't use trailing punctuation
            });
        });

        return {
            type: 'yaml-object',
            name,
            properties,
            isExported: false,
            startLine: this.findObjectStartLine(name),
            endLine: this.findObjectEndLine(name, properties.length),
            leadingComments: this.findLeadingComments(name, comments),
            originalText: this.extractOriginalText(name, properties.length)
        };
    }

    /**
     * Creates a parsed entity from a YAML array
     * 
     * @param arr - The YAML array to convert
     * @param name - The name of the array
     * @param comments - Available comments for association
     * @param _depth - Current nesting depth (not used in this implementation)
     * @returns A parsed entity or null if not processable
     */
    private createArrayEntity(
        arr: any[],
        name: string,
        comments: PropertyComment[],
        _depth: number
    ): ParsedEntity | null {
        if (!Array.isArray(arr) || arr.length === 0) {
            return null; // Skip empty arrays
        }

        const properties: ParsedProperty[] = [];

        // For YAML arrays, we want to include all elements, not just objects
        arr.forEach((item, index) => {
            const elementLine = this.findArrayElementLine(index);
            const associatedComments = this.findTrailingCommentsForArrayElement(index, elementLine, comments);
            
            properties.push({
                name: `${index}`, // Use index as name for sorting
                value: item, // Store the actual value
                comments: associatedComments,
                optional: false,
                line: elementLine,
                fullText: `- ${this.formatYamlValueForDisplay(item)}`,
                trailingPunctuation: ''
            });
        });

        return {
            type: 'yaml-array',
            name,
            properties,
            isExported: false,
            startLine: this.findObjectStartLine(name),
            endLine: this.findObjectEndLine(name, properties.length),
            leadingComments: this.findLeadingComments(name, comments),
            originalText: this.extractOriginalText(name, properties.length)
        };
    }

    /**
     * Processes a YAML key, handling complex keys if enabled
     * 
     * @param key - The original key
     * @returns The processed key
     */
    private processKey(key: string): string {
        // Handle complex keys (objects/arrays as keys) if enabled
        if (this.options.handleComplexKeys && (key.includes('{') || key.includes('['))) {
            // Keep complex keys as-is to preserve structure
            return key;
        }
        
        // For simple keys, ensure proper quoting if needed
        if (key.includes(' ') || key.includes(':') || key.includes('#')) {
            return `"${key}"`;
        }
        
        return key;
    }

    /**
     * Formats a YAML value for display in parsed properties (read-only, for fullText)
     * 
     * @param value - The value to format
     * @returns A string representation of the value
     */
    private formatYamlValueForDisplay(value: any): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        if (typeof value === 'string') {
            // Preserve string formatting styles if possible
            if (value.includes('\n')) {
                return `|
                ${value.split('\n').map(line => `  ${line}`).join('\n')}`;
            }
            return value.includes(' ') ? `"${value}"` : value;
        }
        
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        
        if (Array.isArray(value)) {
            if (value.length <= 3) {
                return `[${value.map(v => this.formatYamlValueForDisplay(v)).join(', ')}]`;
            }
            return `Array(${value.length})`;
        }
        
        if (this.isObject(value)) {
            const keys = Object.keys(value);
            if (keys.length <= 2) {
                return `{${keys.map(k => `${k}: ${this.formatYamlValueForDisplay(value[k])}`).join(', ')}}`;
            }
            return `Object(${keys.length} properties)`;
        }
        
        return String(value);
    }

    /**
     * @deprecated Use formatYamlValueForDisplay instead
     * This method is kept for backward compatibility but should not be used for storing values
     */
    private formatYamlValue(value: any): string {
        return this.formatYamlValueForDisplay(value);
    }

    /**
     * Checks if a value is a plain object (not array, null, etc.)
     * 
     * @param value - The value to check
     * @returns True if the value is a plain object
     */
    private isObject(value: any): boolean {
        return value !== null && 
               typeof value === 'object' && 
               !Array.isArray(value) && 
               !(value instanceof Date) &&
               !(value instanceof RegExp);
    }

    /**
     * Finds comments associated with a specific property
     * 
     * @param key - The property key to find comments for
     * @param comments - All available comments
     * @returns Array of comments associated with the property
     */
    private findAssociatedComments(key: string, comments: PropertyComment[]): PropertyComment[] {
        // Find comments that appear before or on the same line as the property
        const keyLine = this.findPropertyLine(key);
        
        // Look for comments on the same line or the line before
        return comments.filter(comment => 
            comment.line === keyLine || comment.line === keyLine - 1
        );
    }

    /**
     * Finds the line number where a property appears in the source
     * 
     * @param key - The property key to find
     * @returns The line number (1-based)
     */
    private findPropertyLine(key: string): number {
        if (!this.sourceCode) return 1;
        
        const lines = this.sourceCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for the key at the start of a line (accounting for indentation)
            const keyPattern = new RegExp(`^\\s*${this.escapeRegExp(key)}\\s*:`);
            if (keyPattern.test(line)) {
                return i + 1; // Convert to 1-based line number
            }
        }
        
        return 1; // Default to line 1 if not found
    }

    /**
     * Finds the line number of an array element
     * 
     * @param index - The array index
     * @returns The line number (1-based)
     */
    private findArrayElementLine(index: number): number {
        if (!this.sourceCode) return 1;
        
        const lines = this.sourceCode.split('\n');
        let dashCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('-')) {
                if (dashCount === index) {
                    return i + 1;
                }
                dashCount++;
            }
        }
        
        return 1; // Default to line 1 if not found
    }

    /**
     * Finds leading comments for an entity
     * 
     * @param name - The entity name
     * @param comments - All available comments
     * @returns Array of leading comments
     */
    private findLeadingComments(name: string, comments: PropertyComment[]): PropertyComment[] {
        if (name === 'root') {
            // For root document, return comments at the beginning
            return comments.filter(comment => comment.line <= 3);
        }
        
        const entityLine = this.findPropertyLine(name);
        // Find comments that appear before the entity (within 2 lines)
        return comments.filter(comment => 
            comment.line < entityLine && comment.line >= entityLine - 2
        );
    }

    /**
     * Extracts original text for an entity
     * 
     * @param name - The entity name
     * @param propertyCount - Number of properties
     * @returns The original text representation
     */
    private extractOriginalText(name: string, propertyCount: number): string {
        if (!this.sourceCode) return '';
        
        const startLine = this.findObjectStartLine(name);
        const endLine = this.findObjectEndLine(name, propertyCount);
        const lines = this.sourceCode.split('\n');
        
        return lines.slice(startLine - 1, endLine).join('\n');
    }

    /**
     * Finds comments that trail an array element
     * 
     * @param _index - The array element index (not used in current implementation)
     * @param elementLine - The line number of the element
     * @param comments - All available comments
     * @returns Array of trailing comments
     */
    private findTrailingCommentsForArrayElement(
        _index: number, 
        elementLine: number, 
        comments: PropertyComment[]
    ): PropertyComment[] {
        // Find comments on the same line as the array element
        return comments.filter(comment => comment.line === elementLine);
    }

    /**
     * Finds the starting line of an object in the source
     * 
     * @param name - The object name
     * @returns The line number (1-based)
     */
    private findObjectStartLine(name: string): number {
        if (name === 'root') return 1;
        return this.findPropertyLine(name);
    }

    /**
     * Finds the ending line of an object in the source
     * 
     * @param name - The object name
     * @param propertyCount - Number of properties in the object
     * @returns The line number (1-based)
     */
    private findObjectEndLine(name: string, propertyCount: number): number {
        const startLine = this.findObjectStartLine(name);
        // Estimate end line based on property count (rough approximation)
        return startLine + propertyCount;
    }

    /**
     * Escapes special regex characters in a string
     * 
     * @param string - The string to escape
     * @returns The escaped string
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
} 