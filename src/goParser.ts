import { ParsedEntity, ParsedProperty, PropertyComment, ParseResult, ParserOptions } from './types';
import { BaseParserUtils } from './parserUtils';

/**
 * Main parser class for extracting and analyzing Go struct definitions
 * 
 * This class uses regex-based parsing to extract structured information about
 * Go structs, including their fields, comments, struct tags, and metadata
 * for subsequent sorting operations.
 */
export class GoParser extends BaseParserUtils {
    /**
     * Creates a new GoParser with the specified parsing options
     * 
     * @param options - Partial parser options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create parser with default options
     * const parser = new GoParser();
     * const result = parser.parse(sourceCode);
     * ```
     * 
     * @example
     * ```typescript
     * // Create parser with custom options
     * const parser = new GoParser({
     *   preserveFormatting: false,
     *   includeComments: true,
     *   sortOrder: 'desc'
     * });
     * ```
     */
    constructor(options: Partial<ParserOptions> = {}) {
        super({
            preserveFormatting: true,
            includeComments: true,
            fileType: 'go',
            ...options
        });
    }

    /**
     * Parses Go source code and extracts all sortable struct definitions with their fields
     * 
     * This method uses regex patterns to find struct definitions and parse their fields,
     * extracting properties and metadata for sorting operations.
     * 
     * @param sourceCode - The Go source code to parse
     * @param _fileName - Optional filename for the source (used for error reporting)
     * @returns Parse result containing extracted entities, errors, and original source
     * 
     * @example
     * ```typescript
     * // Parse struct definitions
     * const parser = new GoParser();
     * const code = `
     *   type User struct {
     *     ID int \`json:"id"\`
     *     Name string \`json:"name"\`
     *   }
     * `;
     * const result = parser.parse(code);
     * console.log(result.entities.length); // 1 entity found
     * ```
     */
    public parse(sourceCode: string, _fileName: string = 'temp.go'): ParseResult {
        this.sourceCode = sourceCode;
        
        const result: ParseResult = {
            entities: [],
            errors: [],
            sourceCode,
            fileType: 'go'
        };

        try {
            // Find and parse all struct definitions
            this.parseStructs(result);

            // Apply sorting if requested (using inherited method)
            this.applySorting(result);

        } catch (error) {
            result.errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Finds and parses all struct definitions in the source code
     * 
     * @param result - The parse result to add parsed structs to
     */
    private parseStructs(result: ParseResult): void {
        // Regex to match struct definitions: type StructName struct { ... }
        const structRegex = /type\s+(\w+)\s+struct\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
        
        let match;
        while ((match = structRegex.exec(this.sourceCode)) !== null) {
            try {
                const structName = match[1];
                const structBody = match[2];
                const structStart = match.index;
                const structEnd = match.index + match[0].length;

                const entity = this.parseStruct(structName, structBody, structStart, structEnd);
                if (entity) {
                    result.entities.push(entity);
                }
            } catch (error) {
                result.errors.push(`Error parsing struct: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Parses a single struct definition and extracts its fields
     * 
     * @param name - The struct name
     * @param body - The struct body content
     * @param startPos - Start position in source code
     * @param endPos - End position in source code
     * @returns Parsed entity representing the struct
     */
    private parseStruct(name: string, body: string, startPos: number, endPos: number): ParsedEntity | null {
        const entity: ParsedEntity = {
            type: 'struct',
            name,
            properties: [],
            startLine: this.getLineNumber(startPos),
            endLine: this.getLineNumber(endPos),
            leadingComments: this.extractLeadingComments(startPos),
            isExported: this.isExported(name),
            originalText: this.sourceCode.substring(startPos, endPos)
        };

        // Parse fields within the struct body
        this.parseStructFields(body, entity);

        return entity;
    }

    /**
     * Parses fields within a struct body
     * 
     * @param body - The struct body content
     * @param entity - The entity to add parsed fields to
     */
    private parseStructFields(body: string, entity: ParsedEntity): void {
        const lines = body.split('\n');
        let currentComments: PropertyComment[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                // Empty line resets comment accumulation
                currentComments = [];
                continue;
            }

            // Check for comments
            if (line.startsWith('//')) {
                const comment = this.parseComment(line, entity.startLine + i);
                if (comment) {
                    currentComments.push(comment);
                }
                continue;
            }

            if (line.startsWith('/*')) {
                const comment = this.parseMultiLineComment(lines, i, entity.startLine);
                if (comment) {
                    currentComments.push(comment);
                    // Skip lines that were part of the multi-line comment
                    while (i < lines.length && !lines[i].includes('*/')) {
                        i++;
                    }
                }
                continue;
            }

            // Parse field definition
            const field = this.parseField(line, entity.startLine + i, currentComments);
            if (field) {
                entity.properties.push(field);
                currentComments = []; // Reset comments after associating with field
            }
        }
    }

    /**
     * Parses a single field definition
     * 
     * @param line - The line containing the field definition
     * @param lineNumber - The line number in the source
     * @param comments - Comments associated with this field
     * @returns Parsed property representing the field
     */
    private parseField(line: string, lineNumber: number, comments: PropertyComment[]): ParsedProperty | null {
        // Regex patterns for different field types:
        // 1. Named field with tags: FieldName FieldType `tags` // comment
        // 2. Named field without tags: FieldName FieldType // comment
        // 3. Embedded field: EmbeddedType // comment
        
        // Try named field with tags first
        const namedWithTagsMatch = line.match(/^\s*(\w+)\s+([^`\n]+?)\s*`([^`]*)`\s*(?:\/\/(.*))?$/);
        if (namedWithTagsMatch) {
            const [, fieldName, fieldType, structTags, inlineComment] = namedWithTagsMatch;
            
            const allComments = [...comments];
            if (inlineComment) {
                allComments.push({
                    text: inlineComment.trim(),
                    type: 'single',
                    raw: `//${inlineComment}`,
                    line: lineNumber
                });
            }

            return {
                name: fieldName.trim(),
                value: fieldType.trim(),
                comments: allComments,
                optional: false,
                line: lineNumber,
                fullText: line.trim(),
                trailingPunctuation: '',
                structTags: structTags.trim(),
                isEmbedded: false
            };
        }

        // Try named field without tags
        const namedWithoutTagsMatch = line.match(/^\s*(\w+)\s+([^/\n]+?)(?:\s*\/\/(.*))?$/);
        if (namedWithoutTagsMatch) {
            const [, fieldName, fieldType, inlineComment] = namedWithoutTagsMatch;
            
            const allComments = [...comments];
            if (inlineComment) {
                allComments.push({
                    text: inlineComment.trim(),
                    type: 'single',
                    raw: `//${inlineComment}`,
                    line: lineNumber
                });
            }

            return {
                name: fieldName.trim(),
                value: fieldType.trim(),
                comments: allComments,
                optional: false,
                line: lineNumber,
                fullText: line.trim(),
                trailingPunctuation: '',
                isEmbedded: false
            };
        }

        // Try embedded field (just a type name)
        const embeddedMatch = line.match(/^\s*([A-Z]\w*(?:\.\w+)?)\s*(?:\/\/(.*))?$/);
        if (embeddedMatch) {
            const [, typeName, inlineComment] = embeddedMatch;
            
            const allComments = [...comments];
            if (inlineComment) {
                allComments.push({
                    text: inlineComment.trim(),
                    type: 'single',
                    raw: `//${inlineComment}`,
                    line: lineNumber
                });
            }

            return {
                name: typeName.trim(),
                value: typeName.trim(),
                comments: allComments,
                optional: false,
                line: lineNumber,
                fullText: line.trim(),
                trailingPunctuation: '',
                isEmbedded: true
            };
        }

        return null;
    }

    /**
     * Parses a single-line comment
     * 
     * @param line - The line containing the comment
     * @param lineNumber - The line number in the source
     * @returns Parsed comment or null
     */
    private parseComment(line: string, lineNumber: number): PropertyComment | null {
        const match = line.match(/^\s*\/\/\s*(.*)$/);
        if (match) {
            return {
                text: match[1].trim(),
                type: 'single',
                raw: line.trim(),
                line: lineNumber
            };
        }
        return null;
    }

    /**
     * Parses a multi-line comment
     * 
     * @param lines - All lines in the source
     * @param startIndex - Starting line index
     * @param baseLineNumber - Base line number for calculation
     * @returns Parsed comment or null
     */
    private parseMultiLineComment(lines: string[], startIndex: number, baseLineNumber: number): PropertyComment | null {
        let commentText = '';
        let rawText = '';
        let _endIndex = startIndex;

        // Find the end of the multi-line comment
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            rawText += (i > startIndex ? '\n' : '') + line;
            
            if (line.includes('*/')) {
                _endIndex = i;
                break;
            }
        }

        // Extract comment text
        const fullComment = rawText.replace(/^\s*\/\*\s*/, '').replace(/\s*\*\/\s*$/, '');
        commentText = fullComment.replace(/^\s*\*\s*/gm, '').trim();

        return {
            text: commentText,
            type: 'multi',
            raw: rawText,
            line: baseLineNumber + startIndex
        };
    }

    /**
     * Extracts leading comments for a struct definition
     * 
     * @param position - Position in source code
     * @returns Array of leading comments
     */
    private extractLeadingComments(position: number): PropertyComment[] {
        const comments: PropertyComment[] = [];
        const beforeText = this.sourceCode.substring(0, position);
        const lines = beforeText.split('\n');
        
        // Look backwards for comments immediately before the struct
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            
            if (!line) {
                continue; // Skip empty lines
            }
            
            if (line.startsWith('//')) {
                const comment = this.parseComment(line, i + 1);
                if (comment) {
                    comments.unshift(comment);
                }
            } else {
                break; // Stop at first non-comment, non-empty line
            }
        }
        
        return comments;
    }
} 