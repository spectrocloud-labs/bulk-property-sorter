import { ParsedEntity, ParsedProperty, PropertyComment, ParseResult, ParserOptions } from './types';
import { CSSPropertySorter } from './languageSorters';

/**
 * CSS parser for extracting and analyzing CSS rules, properties, and at-rules
 * 
 * This class parses CSS, SCSS, SASS, and LESS files to extract structured
 * information about CSS rules, their properties, comments, and metadata for
 * subsequent sorting operations.
 */
export class CSSParser {
    /** The original source code being parsed */
    private sourceCode: string = '';
    /** Configuration options that control parsing behavior */
    private options: ParserOptions;
    /** Current line number for tracking position during parsing */
    private currentLine: number = 1;
    /** Set to track comments that have already been used to prevent duplication */
    private usedComments: Set<PropertyComment> = new Set();

    /**
     * Creates a new CSSParser with the specified parsing options
     * 
     * @param options - Partial parser options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create parser with default options
     * const parser = new CSSParser();
     * const result = parser.parse(cssCode);
     * ```
     * 
     * @example
     * ```typescript
     * // Create parser with custom options
     * const parser = new CSSParser({
     *   preserveFormatting: false,
     *   includeComments: true,
     *   sortOrder: 'desc',
     *   fileType: 'scss'
     * });
     * ```
     */
    constructor(options: Partial<ParserOptions> = {}) {
        this.options = {
            preserveFormatting: true,
            includeComments: true,
            fileType: 'css',
            ...options
        };
    }

    /**
     * Parses CSS source code and extracts all sortable entities with their properties
     * 
     * This method parses CSS syntax to find CSS rules, at-rules, keyframes, and media queries,
     * extracting their properties and metadata for sorting operations.
     * 
     * @param sourceCode - The CSS source code to parse
     * @param fileName - Optional filename for the source (used for error reporting and file type detection)
     * @returns Parse result containing extracted entities, errors, and original source
     * 
     * @example
     * ```typescript
     * // Parse CSS rules
     * const parser = new CSSParser();
     * const code = `
     *   .button { 
     *     z-index: 10; 
     *     background: blue; 
     *     color: white; 
     *   }
     * `;
     * const result = parser.parse(code);
     * console.log(result.entities.length); // 1 entity found
     * ```
     * 
     * @example
     * ```typescript
     * // Parse SCSS with variables and nesting
     * const parser = new CSSParser({ fileType: 'scss' });
     * const code = `
     *   $primary: #007bff;
     *   .card {
     *     padding: 1rem;
     *     background: $primary;
     *     &:hover { opacity: 0.8; }
     *   }
     * `;
     * const result = parser.parse(code);
     * ```
     */
    public parse(sourceCode: string, fileName: string = 'temp.css'): ParseResult {
        this.sourceCode = sourceCode;
        this.currentLine = 1;
        this.usedComments = new Set(); // Reset used comments for each parse
        
        // Detect file type from filename if not explicitly set
        const fileType = this.detectFileType(fileName);
        
        const result: ParseResult = {
            entities: [],
            errors: [],
            sourceCode,
            fileType
        };

        try {
            // Preprocess for SASS/SCSS/LESS specific syntax
            const processedCode = this.preprocessCode(sourceCode, fileType);
            
            // Parse CSS entities
            this.parseCSS(processedCode, result);

            // Apply limited sorting for specific features like keyframes
            // Note: Property sorting is handled by the CSSPropertySorter in CoreProcessor
            if (this.options.sortKeyframes) {
                this.applySorting(result);
            }

        } catch (error) {
            result.errors.push(`CSS parsing error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Detects the file type based on the filename extension
     * 
     * @param fileName - The filename to analyze
     * @returns The detected file type
     */
    private detectFileType(fileName: string): 'css' | 'scss' | 'sass' | 'less' {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'scss':
                return 'scss';
            case 'sass':
                return 'sass';
            case 'less':
                return 'less';
            default:
                return 'css';
        }
    }

    /**
     * Preprocesses code for different CSS preprocessor syntaxes
     * 
     * @param code - The source code to preprocess
     * @param fileType - The type of CSS file being processed
     * @returns Preprocessed code ready for parsing
     */
    private preprocessCode(code: string, fileType: 'css' | 'scss' | 'sass' | 'less'): string {
        let processedCode = code;

        if (fileType === 'sass') {
            // Convert SASS indented syntax to SCSS-like syntax for easier parsing
            processedCode = this.convertSassToScss(code);
        }

        return processedCode;
    }

    /**
     * Converts SASS indented syntax to SCSS-like syntax for parsing
     * 
     * @param sassCode - SASS code with indented syntax
     * @returns SCSS-like code with braces and semicolons
     */
    public convertSassToScss(sassCode: string): string {
        const lines = sassCode.split('\n');
        const result: string[] = [];
        const indentStack: { level: number; hasContent: boolean }[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('//')) {
                result.push(line);
                continue;
            }

            const indent = line.length - line.trimStart().length;
            
            // Close braces for decreased indentation
            while (indentStack.length > 0 && indentStack[indentStack.length - 1].level >= indent) {
                const popped = indentStack.pop();
                if (popped && popped.hasContent) {
                    result.push(' '.repeat(popped.level) + '}');
                }
            }

            // Check if this is a property declaration or a selector
            if (trimmed.includes(':')) {
                const colonIndex = trimmed.indexOf(':');
                const beforeColon = trimmed.substring(0, colonIndex).trim();
                const afterColon = trimmed.substring(colonIndex + 1).trim();
                
                // If there's a value after the colon, it's a property
                // If it starts with & or looks like a selector, it's a nested selector
                if (afterColon && !beforeColon.startsWith('&') && !beforeColon.includes('.') && !beforeColon.includes('#')) {
                    // Property declaration - add semicolon
                    result.push(line + ';');
                    // Mark that current level has content
                    if (indentStack.length > 0) {
                        indentStack[indentStack.length - 1].hasContent = true;
                    }
                } else {
                    // Selector with pseudo-class (like &:hover) or other selector - add opening brace
                    result.push(line + ' {');
                    indentStack.push({ level: indent, hasContent: false });
                }
            } else {
                // Selector or at-rule - add opening brace
                result.push(line + ' {');
                indentStack.push({ level: indent, hasContent: false });
            }
        }

        // Close remaining braces
        while (indentStack.length > 0) {
            const popped = indentStack.pop();
            if (popped && popped.hasContent) {
                result.push(' '.repeat(popped.level) + '}');
            }
        }

        return result.join('\n');
    }

    /**
     * Parses CSS code to extract entities and properties
     * 
     * @param code - The CSS code to parse
     * @param result - The parse result to populate
     */
    private parseCSS(code: string, result: ParseResult): void {
        // Remove comments and track their positions
        const { cleanCode, comments } = this.extractComments(code);
        
        // Parse CSS entities
        this.parseNestedRules(cleanCode, comments, result, 0);
    }

    /**
     * Extracts comments from CSS code and returns clean code with comment positions
     * 
     * @param code - CSS code with comments
     * @returns Object containing clean code and extracted comments
     */
    public extractComments(code: string): { cleanCode: string; comments: PropertyComment[] } {
        const comments: PropertyComment[] = [];
        let cleanCode = code;

        // Extract multi-line comments first
        const multiLineRegex = /\/\*[\s\S]*?\*\//g;
        let match;
        const multiLineMatches: Array<{ match: RegExpExecArray; comment: PropertyComment }> = [];
        
        while ((match = multiLineRegex.exec(code)) !== null) {
            const commentText = match[0];
            const beforeComment = code.substring(0, match.index);
            const commentLineNumber = 1 + (beforeComment.match(/\n/g) || []).length;
            
            const comment: PropertyComment = {
                text: commentText.slice(2, -2).trim(),
                type: 'multi',
                raw: commentText,
                line: commentLineNumber
            };
            
            comments.push(comment);
            multiLineMatches.push({ match, comment });
        }

        // Extract single-line comments
        const singleLineRegex = /\/\/.*$/gm;
        const singleLineMatches: Array<{ match: RegExpExecArray; comment: PropertyComment }> = [];
        
        // Reset regex
        singleLineRegex.lastIndex = 0;
        while ((match = singleLineRegex.exec(code)) !== null) {
            const commentText = match[0];
            const beforeComment = code.substring(0, match.index);
            const commentLineNumber = 1 + (beforeComment.match(/\n/g) || []).length;
            
            const comment: PropertyComment = {
                text: commentText.slice(2).trim(),
                type: 'single',
                raw: commentText,
                line: commentLineNumber
            };
            
            comments.push(comment);
            singleLineMatches.push({ match, comment });
        }

        // Remove comments from code (in reverse order to maintain positions)
        const allMatches = [...multiLineMatches, ...singleLineMatches]
            .sort((a, b) => b.match.index - a.match.index);
        
        for (const { match } of allMatches) {
            cleanCode = cleanCode.substring(0, match.index) + 
                       ' '.repeat(match[0].length) + 
                       cleanCode.substring(match.index + match[0].length);
        }

        return { cleanCode, comments };
    }

    /**
     * Recursively parses CSS rules, handling nesting
     * 
     * @param code - CSS code to parse
     * @param comments - Available comments
     * @param result - Parse result to populate
     * @param depth - Current nesting depth
     */
    private parseNestedRules(code: string, comments: PropertyComment[], result: ParseResult, depth: number): void {
        let i = 0;
        
        while (i < code.length) {
            // Skip whitespace
            while (i < code.length && /\s/.test(code[i])) {
                i++;
            }
            
            if (i >= code.length) break;
            
            // Find the start of a selector
            const selectorStart = i;
            
            // Find the opening brace
            while (i < code.length && code[i] !== '{') {
                i++;
            }
            
            if (i >= code.length) break;
            
            const selector = code.substring(selectorStart, i).trim();
            if (!selector) {
                i++;
                continue;
            }
            
            // Skip the opening brace
            i++;
            
            // Find the matching closing brace and extract the body
            const bodyStart = i;
            let braceCount = 1;
            
            while (i < code.length && braceCount > 0) {
                if (code[i] === '{') {
                    braceCount++;
                } else if (code[i] === '}') {
                    braceCount--;
                }
                i++;
            }
            
            if (braceCount > 0) {
                // Unmatched braces, skip this rule
                continue;
            }
            
            const body = code.substring(bodyStart, i - 1);
            
            // Check if this body contains nested rules
            const hasNestedRules = body.includes('{');
            
            if (hasNestedRules) {
                // Extract direct properties (not in nested rules)
                const originalBody = this.getOriginalBodyText(bodyStart, i - 1);
                const directProperties = this.extractDirectProperties(body, comments, originalBody);
                
                if (directProperties.length > 0) {
                    const entity = this.createEntityFromPosition(selector, directProperties, selectorStart, i - 1, comments);
                    result.entities.push(entity);
                }
                
                // Parse nested rules recursively - pass the original body information for correct comment extraction
                this.parseNestedRulesFromBodyWithOriginal(body, bodyStart, comments, result, depth + 1);
            } else {
                // Simple rule with no nesting
                const originalBody = this.getOriginalBodyText(bodyStart, i - 1);
                const properties = this.parsePropertiesFromBody(body, comments, originalBody);
                
                if (properties.length > 0) {
                    const entity = this.createEntityFromPosition(selector, properties, selectorStart, i - 1, comments);
                    result.entities.push(entity);
                }
            }
        }
    }

    /**
     * Parses nested rules from within a rule body with original text preservation
     */
    private parseNestedRulesFromBodyWithOriginal(body: string, bodyStartPos: number, comments: PropertyComment[], result: ParseResult, depth: number): void {
        let i = 0;
        
        while (i < body.length) {
            // Skip whitespace and properties until we find a nested rule
            while (i < body.length) {
                const char = body[i];
                
                // If we find an opening brace, we've found a nested rule
                if (char === '{') {
                    // Backtrack to find the selector
                    let selectorEnd = i - 1;
                    while (selectorEnd >= 0 && /\s/.test(body[selectorEnd])) {
                        selectorEnd--;
                    }
                    
                    // Find the start of the selector (look for the previous semicolon, newline, or start of body)
                    let selectorStart = selectorEnd;
                    while (selectorStart > 0) {
                        const prevChar = body[selectorStart - 1];
                        if (prevChar === ';' || prevChar === '\n' || prevChar === '}') {
                            break;
                        }
                        selectorStart--;
                    }
                    
                    // Extract the selector
                    const selector = body.substring(selectorStart, selectorEnd + 1).trim();
                    
                    if (selector) {
                        // Skip the opening brace
                        i++;
                        
                        // Find the matching closing brace and extract the nested body
                        const nestedBodyStart = i;
                        let braceCount = 1;
                        
                        while (i < body.length && braceCount > 0) {
                            if (body[i] === '{') {
                                braceCount++;
                            } else if (body[i] === '}') {
                                braceCount--;
                            }
                            i++;
                        }
                        
                        if (braceCount === 0) {
                            const nestedBody = body.substring(nestedBodyStart, i - 1);
                            
                            // Calculate the position in the original source for this nested body
                            const originalNestedBodyStart = bodyStartPos + nestedBodyStart;
                            const originalNestedBodyEnd = bodyStartPos + i - 1;
                            const originalNestedBody = this.getOriginalBodyText(originalNestedBodyStart, originalNestedBodyEnd);
                            
                            // Parse properties from the nested body with original text
                            const properties = this.parsePropertiesFromBody(nestedBody, comments, originalNestedBody);
                            
                            if (properties.length > 0) {
                                const entity = this.createEntityFromPosition(selector, properties, 0, 0, comments);
                                result.entities.push(entity);
                            }
                            
                            // Recursively parse any further nested rules
                            if (nestedBody.includes('{')) {
                                this.parseNestedRulesFromBodyWithOriginal(nestedBody, originalNestedBodyStart, comments, result, depth + 1);
                            }
                        }
                    }
                    break;
                } else {
                    i++;
                }
            }
            
            // If we didn't find any more nested rules, break
            if (i >= body.length) {
                break;
            }
        }
    }

    /**
     * Parses nested rules from within a rule body
     */
    private parseNestedRulesFromBody(body: string, comments: PropertyComment[], result: ParseResult, depth: number): void {
        // This method is kept for backwards compatibility and now delegates to the improved version
        this.parseNestedRulesFromBodyWithOriginal(body, 0, comments, result, depth);
    }

    /**
     * Creates an entity from position information
     */
    private createEntityFromPosition(
        selector: string,
        properties: ParsedProperty[],
        startPos: number,
        endPos: number,
        comments: PropertyComment[]
    ): ParsedEntity {
        return this.createEntity(selector, properties, startPos, endPos, comments);
    }

    /**
     * Extracts direct properties from a rule body, excluding nested rules
     */
    private extractDirectProperties(body: string, comments: PropertyComment[], originalBody?: string): ParsedProperty[] {
        const properties: ParsedProperty[] = [];
        const usedComments = new Set<PropertyComment>();
        
        // Use original body if provided for parsing (contains comments), otherwise use cleaned body
        const bodyToParse = originalBody || body;
        
        // Split by lines to properly handle trailing comments
        const lines = bodyToParse.split('\n');
        let currentLineInBody = 1;
        let currentDeclaration = '';
        let isInNestedRule = false;
        let braceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) {
                currentLineInBody++;
                continue;
            }
            
            // Track nested rules by counting braces
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            braceCount += openBraces - closeBraces;
            
            // If we're inside a nested rule, skip this line
            if (braceCount > 0) {
                isInNestedRule = true;
                currentLineInBody++;
                continue;
            } else if (isInNestedRule && braceCount === 0) {
                // We just exited a nested rule
                isInNestedRule = false;
                currentDeclaration = '';
                currentLineInBody++;
                continue;
            }
            
            // If the line ends with a semicolon, it's a complete declaration
            if (trimmedLine.endsWith(';') || trimmedLine.includes(';')) {
                // Add current line to declaration
                currentDeclaration += (currentDeclaration ? ' ' : '') + trimmedLine;
                
                // Extract the declaration part (everything before the last semicolon on the line)
                const declarationPart = currentDeclaration.substring(0, currentDeclaration.lastIndexOf(';'));
                
                if (declarationPart.trim() && this.isPropertyDeclaration(declarationPart.trim())) {
                    // Use the full line (including potential trailing comments) as the declaration
                    this.parsePropertyDeclarationWithLine(currentDeclaration.trim(), properties, comments, usedComments, currentLineInBody);
                }
                
                currentDeclaration = '';
            } else {
                // Multi-line declaration, add to current declaration
                currentDeclaration += (currentDeclaration ? ' ' : '') + trimmedLine;
            }
            
            currentLineInBody++;
        }
        
        // Handle the last declaration if it doesn't end with a semicolon
        if (currentDeclaration.trim() && !isInNestedRule) {
            const lastDeclaration = currentDeclaration.trim();
            if (this.isPropertyDeclaration(lastDeclaration)) {
                this.parsePropertyDeclarationWithLine(lastDeclaration, properties, comments, usedComments, currentLineInBody - 1);
            }
        }
        
        return properties;
    }

    /**
     * Determines if a declaration is a CSS property (not a selector)
     */
    private isPropertyDeclaration(declaration: string): boolean {
        // Must contain a colon
        if (!declaration.includes(':')) {
            return false;
        }
        
        // Split by colon and check if it looks like a property
        const colonIndex = declaration.indexOf(':');
        const beforeColon = declaration.substring(0, colonIndex).trim();
        const afterColon = declaration.substring(colonIndex + 1).trim();
        
        // If there's nothing after the colon, it's likely a selector (like "&:hover")
        if (!afterColon) {
            return false;
        }
        
        // If the part before colon contains spaces or special selector characters, it's likely a selector
        // But exclude SCSS/SASS features like $variables and @directives
        if (beforeColon.includes(' ') || (beforeColon.includes('&') && !beforeColon.startsWith('$')) || 
            (beforeColon.includes('#') && !beforeColon.startsWith('$')) || 
            (beforeColon.includes('.') && !beforeColon.startsWith('$'))) {
            return false;
        }
        
        // If it's an SCSS/SASS variable (starts with $)
        if (/^\$[a-zA-Z][a-zA-Z0-9-_]*$/.test(beforeColon)) {
            return true;
        }
        
        // If it's a SCSS/SASS/LESS @ directive variable
        if (/^@[a-zA-Z][a-zA-Z0-9-_]*$/.test(beforeColon)) {
            return true;
        }
        
        // If it looks like a CSS property name (letters, hyphens, maybe vendor prefix)
        if (/^-?[a-zA-Z][a-zA-Z0-9-]*$/.test(beforeColon)) {
            return true;
        }
        
        return false;
    }

    /**
     * Parses a single property declaration with explicit line number and adds it to the properties array
     */
    private parsePropertyDeclarationWithLine(declaration: string, properties: ParsedProperty[], comments: PropertyComment[], usedComments: Set<PropertyComment> = new Set(), lineNumber: number): void {
        const propertyMatch = declaration.match(/^([^:]+):\s*(.+?)$/);
        if (!propertyMatch) {
            return;
        }
        
        const name = propertyMatch[1].trim();
        let value = propertyMatch[2].trim();
        
        // Extract trailing comments directly from the declaration string
        const trailingComments: PropertyComment[] = [];
        
        // Look for inline comments in the declaration (these are trailing comments)
        // Find multi-line comments /* */ first
        const multiLineRegex = /\/\*([^*]|\*(?!\/))*\*\//g;
        let match;
        while ((match = multiLineRegex.exec(declaration)) !== null) {
            // Remove the comment from the value
            value = value.replace(match[0], '').trim();
            
            const commentText = match[0].replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '').trim();
            trailingComments.push({
                text: commentText,
                type: 'multi',
                raw: match[0],
                line: lineNumber
            });
        }
        
        // Find single-line comments // (for SCSS/SASS/LESS)
        const singleLineRegex = /\/\/(.*)$/;
        const singleLineMatch = declaration.match(singleLineRegex);
        if (singleLineMatch) {
            // Remove the comment from the value
            value = value.replace(singleLineMatch[0], '').trim();
            
            const commentText = singleLineMatch[1].trim();
            trailingComments.push({
                text: commentText,
                type: 'single',
                raw: singleLineMatch[0],
                line: lineNumber
            });
        }
        
        // Remove any trailing semicolons from the value after comment extraction
        value = value.replace(/;\s*$/, '').trim();
        
        const important = value.includes('!important');
        const cleanValue = value.replace(/\s*!important\s*$/, '');
        const vendorPrefix = this.extractVendorPrefix(name);
        
        // Only get property comments if we didn't find trailing comments in the declaration
        // This prevents double association of comments
        const associatedComments = trailingComments.length > 0 ? [] : this.getPropertyComments(declaration, comments, usedComments);
        
        const parsedProperty: ParsedProperty = {
            name,
            value: cleanValue,
            comments: associatedComments,
            optional: false,
            line: lineNumber,
            fullText: declaration,
            trailingPunctuation: declaration.endsWith(';') ? ';' : '',
            important,
            vendorPrefix
        };
        
        // Add trailing comments if they exist
        if (trailingComments.length > 0) {
            parsedProperty.trailingComments = trailingComments;
        }
        
        properties.push(parsedProperty);
    }

    /**
     * Gets the original body text with comments intact for a given position range
     * 
     * @param startPos - Start position in the cleaned code
     * @param endPos - End position in the cleaned code
     * @returns Original body text with comments
     */
    private getOriginalBodyText(startPos: number, endPos: number): string {
        // Map positions from cleaned code back to original code
        // Since we only replace comments with spaces, the positions should be the same
        return this.sourceCode.substring(startPos, endPos);
    }

    /**
     * Parses properties from a rule body, excluding nested rules
     */
    private parsePropertiesFromBody(body: string, globalComments: PropertyComment[], originalBody?: string): ParsedProperty[] {
        const properties: ParsedProperty[] = [];
        
        // Use original body if provided, otherwise use the cleaned body
        const bodyToParse = originalBody || body;
        
        // Split by lines and process each potential property
        const lines = bodyToParse.split('\n');
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const trimmed = line.trim();
            
            // Skip empty lines, comments, and lines that contain opening braces (nested rules)
            if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('//') || trimmed.includes('{')) {
                continue;
            }
            
            // Match CSS property: value pattern
            const propertyMatch = trimmed.match(/^([^:]+):\s*(.+?)(?:;|$)/);
            if (!propertyMatch) {
                continue;
            }
            
            const name = propertyMatch[1].trim();
            let value = propertyMatch[2].trim();
            
            // Extract trailing comments from the property line (inline comments on the same line)
            const trailingComments: PropertyComment[] = [];
            
            // Look for inline comments in the property line
            const commentMatches = trimmed.match(/\/\*.*?\*\/|\/\/.*$/g);
            if (commentMatches) {
                for (const commentMatch of commentMatches) {
                    // Remove the comment from the value
                    value = value.replace(commentMatch, '').trim();
                    
                    const comment: PropertyComment = {
                        text: commentMatch.replace(/^\/\*|\*\/$/g, '').replace(/^\/\//, '').trim(),
                        type: commentMatch.startsWith('/*') ? 'multi' : 'single',
                        raw: commentMatch,
                        line: lineIndex + 1 // Convert to 1-based line number
                    };
                    trailingComments.push(comment);
                }
            }
            
            // Look for standalone comments that appear before this property (these are leading comments)
            const standaloneComments: PropertyComment[] = [];
            
            // Check the lines immediately before this property for standalone comments
            for (let prevLineIndex = lineIndex - 1; prevLineIndex >= 0; prevLineIndex--) {
                const prevLine = lines[prevLineIndex].trim();
                
                // If we hit an empty line, continue looking
                if (!prevLine) {
                    continue;
                }
                
                // If we hit another property or a selector, stop looking
                if (prevLine.includes(':') && !prevLine.startsWith('/*') && !prevLine.startsWith('//')) {
                    break;
                }
                
                // If we hit a brace, stop looking
                if (prevLine.includes('{') || prevLine.includes('}')) {
                    break;
                }
                
                // If this is a comment line, check if it matches any of our global comments
                if (prevLine.startsWith('/*') || prevLine.startsWith('//')) {
                    // Find the matching global comment - be more flexible with whitespace matching
                    const matchingComment = globalComments.find(gc => {
                        // Try exact match first
                        if (gc.raw === prevLine) {
                            return true;
                        }
                        // Try trimmed match
                        if (gc.raw.trim() === prevLine) {
                            return true;
                        }
                        // Try content match (extract comment content and compare)
                        const gcText = gc.raw.replace(/^\/\*|\*\/$/g, '').replace(/^\/\//, '').trim();
                        const lineText = prevLine.replace(/^\/\*|\*\/$/g, '').replace(/^\/\//, '').trim();
                        if (gcText === lineText) {
                            return true;
                        }
                        // Try line inclusion
                        if (prevLine.includes(gc.raw.trim())) {
                            return true;
                        }
                        return false;
                    });
                    
                    if (matchingComment) {
                        standaloneComments.unshift(matchingComment); // Add to beginning to maintain order
                    }
                } else {
                    // If we hit a non-comment, non-empty line that's not a property, stop
                    break;
                }
            }
            
            // Check for !important (after removing comments)
            const important = value.includes('!important');
            const cleanValue = value.replace(/\s*!important\s*$/, '');
            
            // Check for vendor prefix
            const vendorPrefix = this.extractVendorPrefix(name);
            
            const property: ParsedProperty = {
                name,
                value: cleanValue,
                comments: standaloneComments, // Only standalone comments go here (leading comments)
                optional: false,
                line: lineIndex + 1,
                fullText: trimmed,
                trailingPunctuation: trimmed.endsWith(';') ? ';' : '',
                important,
                vendorPrefix
            };

            // Add trailing comments if they exist
            if (trailingComments.length > 0) {
                property.trailingComments = trailingComments;
            }

            properties.push(property);
        }

        return properties;
    }

    /**
     * Creates a parsed entity from selector, properties, and metadata
     */
    private createEntity(
        selector: string, 
        properties: ParsedProperty[], 
        startPos: number, 
        endPos: number, 
        comments: PropertyComment[]
    ): ParsedEntity {
        const entityType = this.determineEntityType(selector);
        const leadingComments = this.getLeadingComments(startPos, comments);
        
        // Adjust startLine to include leading comments
        let adjustedStartLine = this.getLineNumber(startPos);
        if (leadingComments.length > 0) {
            // Find the earliest leading comment line
            const earliestCommentLine = Math.min(...leadingComments.map(c => c.line));
            adjustedStartLine = earliestCommentLine;
        }
        
        const entity: ParsedEntity = {
            type: entityType,
            name: selector,
            properties,
            startLine: adjustedStartLine,
            endLine: this.getLineNumber(endPos),
            leadingComments,
            isExported: false,
            originalText: this.sourceCode.substring(startPos, endPos + 1),
            specificity: this.calculateSpecificity(selector)
        };

        // Add media query info for media rules
        if (entityType === 'css-media') {
            entity.mediaQuery = selector.replace('@media', '').trim();
        }

        // Add keyframe selector for keyframe rules
        if (entityType === 'css-keyframe') {
            entity.keyframeSelector = selector;
        }

        return entity;
    }

    /**
     * Determines the type of CSS entity based on its selector
     * 
     * @param selector - The CSS selector or at-rule
     * @returns The entity type
     */
    private determineEntityType(selector: string): ParsedEntity['type'] {
        if (selector.startsWith('@media')) {
            return 'css-media';
        } else if (selector.startsWith('@keyframes') || selector.match(/^\d+%$|^(from|to)$/)) {
            return 'css-keyframe';
        } else if (selector.startsWith('@')) {
            return 'css-at-rule';
        } else {
            return 'css-rule';
        }
    }

    /**
     * Gets comments associated with a specific property declaration
     * 
     * @param declaration - The property declaration
     * @param comments - All available comments
     * @param usedComments - Set of comments that have already been assigned to other properties
     * @returns Comments associated with this property
     */
    private getPropertyComments(declaration: string, comments: PropertyComment[], usedComments: Set<PropertyComment> = new Set()): PropertyComment[] {
        const associatedComments: PropertyComment[] = [];
        
        // Look for inline comments in the declaration (these are always specific to this property)
        if (declaration.includes('/*') || declaration.includes('//')) {
            // Extract inline comments from the declaration
            const inlineCommentMatch = declaration.match(/\/\*.*?\*\/|\/\/.*$/);
            if (inlineCommentMatch) {
                const inlineComment: PropertyComment = {
                    text: inlineCommentMatch[0].replace(/^\/\*|\*\/$/g, '').replace(/^\/\//, '').trim(),
                    type: inlineCommentMatch[0].startsWith('/*') ? 'multi' : 'single',
                    raw: inlineCommentMatch[0],
                    line: this.currentLine
                };
                associatedComments.push(inlineComment);
                // Mark this inline comment as used so it doesn't get associated with other properties
                usedComments.add(inlineComment);
            }
        }
        
        // For standalone comments, be more precise about association
        const propertyIndex = this.sourceCode.indexOf(declaration.trim());
        if (propertyIndex !== -1) {
            const propertyLine = this.getLineNumber(propertyIndex);
            
            // Look for comments that are specifically associated with this property
            for (const comment of comments) {
                // Skip if this comment has already been used
                if (usedComments.has(comment)) {
                    continue;
                }
                
                // Check if this is an inline comment that's already in the declaration
                if (declaration.includes(comment.raw)) {
                    // This is an inline comment, skip it as we've already handled it above
                    continue;
                }
                
                // For standalone comments, associate them if they're immediately before this property
                const lineDiff = propertyLine - comment.line;
                if (lineDiff >= 1 && lineDiff <= 2) { // Comment is 1-2 lines before the property
                    // Check if there's another property between the comment and this property
                    const sourceLines = this.sourceCode.split('\n');
                    const linesBetween = sourceLines.slice(comment.line, propertyLine - 1);
                    
                    // A comment belongs to this property if there's no other property declaration between them
                    const hasPropertyBetween = linesBetween.some(line => {
                        const trimmed = line.trim();
                        // Check for property pattern: word: value
                        return trimmed && 
                               !trimmed.startsWith('/*') && 
                               !trimmed.startsWith('//') && 
                               /^[a-zA-Z-]+\s*:\s*.+/.test(trimmed);
                    });
                    
                    if (!hasPropertyBetween) {
                        associatedComments.push(comment);
                        usedComments.add(comment);
                    }
                }
            }
        }
        
        return associatedComments;
    }

    /**
     * Extracts vendor prefix from a CSS property name
     * 
     * @param propertyName - The CSS property name
     * @returns The vendor prefix if present, undefined otherwise
     */
    private extractVendorPrefix(propertyName: string): string | undefined {
        const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
        for (const prefix of prefixes) {
            if (propertyName.startsWith(prefix)) {
                return prefix;
            }
        }
        return undefined;
    }

    /**
     * Calculates CSS selector specificity for sorting purposes
     * 
     * @param selector - The CSS selector
     * @returns Specificity score
     */
    private calculateSpecificity(selector: string): number {
        // Simplified specificity calculation
        let specificity = 0;
        
        // Count IDs
        specificity += (selector.match(/#/g) || []).length * 100;
        
        // Count classes, attributes, and pseudo-classes
        specificity += (selector.match(/\.|:|\[/g) || []).length * 10;
        
        // Count elements and pseudo-elements
        specificity += (selector.match(/[a-zA-Z]/g) || []).length;
        
        return specificity;
    }

    /**
     * Gets leading comments for an entity at a specific position
     * 
     * @param position - The position in the source code
     * @param comments - Available comments
     * @returns Array of leading comments
     */
    private getLeadingComments(position: number, comments: PropertyComment[]): PropertyComment[] {
        // Find comments that appear before this position
        const leadingComments: PropertyComment[] = [];
        
        for (const comment of comments) {
            // Skip if this comment has already been used
            if (this.usedComments.has(comment)) {
                continue;
            }

            // Calculate approximate position of comment based on line numbers
            const commentPosition = this.getPositionFromLine(comment.line);
            
            // If comment appears before the entity and is close enough, consider it leading
            if (commentPosition < position) {
                const linesBetween = this.getLineNumber(position) - comment.line;
                // Consider comments within 2 lines as leading comments
                if (linesBetween <= 2) {
                    // Check if there's another entity between the comment and this entity
                    const entityLine = this.getLineNumber(position);
                    const sourceLines = this.sourceCode.split('\n');
                    const linesBetweenCommentAndEntity = sourceLines.slice(comment.line, entityLine - 1);
                    
                    // A comment belongs to this entity if there's no other CSS rule between them
                    const hasEntityBetween = linesBetweenCommentAndEntity.some(line => {
                        const trimmed = line.trim();
                        // Check for CSS selector pattern (but not property pattern)
                        return trimmed && 
                               !trimmed.startsWith('/*') && 
                               !trimmed.startsWith('//') && 
                               !trimmed.includes(':') && // Not a property
                               (trimmed.includes('{') || // Selector with opening brace
                                /^[.#@]/.test(trimmed) || // Class, ID, or at-rule
                                /^[a-zA-Z][a-zA-Z0-9-]*\s*{/.test(trimmed)); // Element selector
                    });
                    
                    if (!hasEntityBetween) {
                        leadingComments.push(comment);
                        this.usedComments.add(comment); // Mark as used
                    }
                }
            }
        }
        
        return leadingComments;
    }

    /**
     * Gets approximate position from line number
     * 
     * @param lineNumber - The line number
     * @returns Approximate character position
     */
    private getPositionFromLine(lineNumber: number): number {
        const lines = this.sourceCode.split('\n');
        let position = 0;
        for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
            position += lines[i].length + 1; // +1 for newline
        }
        return position;
    }

    /**
     * Gets the line number for a given position in the source code
     * 
     * @param position - Character position in source
     * @returns Line number
     */
    private getLineNumber(position: number): number {
        const beforePosition = this.sourceCode.substring(0, position);
        return (beforePosition.match(/\n/g) || []).length + 1;
    }

    /**
     * Applies property sorting to parsed entities based on parser configuration options
     * 
     * @param result - The parse result to apply sorting to
     */
    private applySorting(result: ParseResult): void {
        // Apply keyframe sorting if enabled
        if (this.options.sortKeyframes) {
            try {
                result.entities = this.sortKeyframeEntities(result.entities);
            } catch (error) {
                result.errors.push(`CSS keyframe sorting error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Note: CSS property sorting is now handled by CSSPropertySorter in CoreProcessor
        // This method only handles entity-level sorting like keyframes
    }

    /**
     * Sorts keyframe entities by their percentage values
     * 
     * @param entities - The entities to sort
     * @returns Entities with keyframes sorted by percentage
     */
    private sortKeyframeEntities(entities: ParsedEntity[]): ParsedEntity[] {
        const keyframeEntities: ParsedEntity[] = [];
        const otherEntities: ParsedEntity[] = [];
        
        // Separate keyframe entities from other entities
        entities.forEach(entity => {
            if (entity.type === 'css-keyframe') {
                keyframeEntities.push(entity);
            } else {
                otherEntities.push(entity);
            }
        });
        
        // Sort keyframe entities by percentage
        const sortedKeyframes = keyframeEntities.sort((a, b) => {
            const aPercent = this.parseKeyframePercentage(a.name);
            const bPercent = this.parseKeyframePercentage(b.name);
            return aPercent - bPercent;
        });
        
        // Return all entities with keyframes sorted
        return [...otherEntities, ...sortedKeyframes];
    }

    /**
     * Parses a keyframe selector to get its numeric percentage value
     * 
     * @param selector - The keyframe selector (e.g., "0%", "50%", "from", "to")
     * @returns Numeric percentage value (0-100)
     */
    private parseKeyframePercentage(selector: string): number {
        // Handle percentage values
        if (selector.endsWith('%')) {
            const percentValue = parseFloat(selector.slice(0, -1));
            return isNaN(percentValue) ? 0 : percentValue;
        }
        
        // Handle keywords
        switch (selector.toLowerCase()) {
            case 'from':
                return 0;
            case 'to':
                return 100;
            default:
                return 0;
        }
    }

    /**
     * Sorts properties in a parse result with custom options, returning a new result
     * 
     * @param result - The parse result containing entities to sort
     * @param sortOrder - The sort order to apply ('asc' or 'desc')
     * @returns New parse result with sorted properties
     */
    public sortParseResult(result: ParseResult, sortOrder: 'asc' | 'desc' = 'asc'): ParseResult {
        try {
            const sorter = new CSSPropertySorter({
                sortOrder: sortOrder,
                sortNestedObjects: this.options.sortNestedObjects ?? true,
                groupByCategory: this.options.groupByCategory,
                sortByImportance: this.options.sortByImportance,
                groupVendorPrefixes: this.options.groupVendorPrefixes,
                sortKeyframes: this.options.sortKeyframes
            });

            const sortedEntities = result.entities.map(entity => ({
                ...entity,
                properties: sorter.sortProperties(entity.properties, entity)
            }));

            return {
                ...result,
                entities: sortedEntities
            };
        } catch (error) {
            return {
                ...result,
                errors: [...result.errors, `CSS sorting error: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    /**
     * Extracts trailing comments associated with a CSS property declaration
     * 
     * This method looks for comments that appear on the same line as a CSS property,
     * after the property value or semicolon.
     * 
     * @param declaration - The property declaration string
     * @param lineNumber - The line number of the declaration
     * @returns Array of trailing comments found
     */
    private extractTrailingComments(declaration: string, lineNumber: number): PropertyComment[] {
        const trailingComments: PropertyComment[] = [];
        
        // Look for comments after the property value/semicolon on the same line
        // CSS supports both /* */ and // comments (in SCSS/SASS/LESS)
        
        // Find multi-line comments /* */ first
        const multiLineRegex = /\/\*([^*]|\*(?!\/))*\*\//g;
        let match;
        while ((match = multiLineRegex.exec(declaration)) !== null) {
            const commentText = match[0].replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '').trim();
            trailingComments.push({
                text: commentText,
                type: 'multi',
                raw: match[0],
                line: lineNumber
            });
        }
        
        // Find single-line comments // (for SCSS/SASS/LESS)
        const singleLineRegex = /\/\/(.*)$/;
        const singleLineMatch = declaration.match(singleLineRegex);
        if (singleLineMatch) {
            const commentText = singleLineMatch[1].trim();
            trailingComments.push({
                text: commentText,
                type: 'single',
                raw: singleLineMatch[0],
                line: lineNumber
            });
        }
        
        return trailingComments;
    }
} 