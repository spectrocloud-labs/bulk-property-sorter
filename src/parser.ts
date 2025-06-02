import * as ts from 'typescript';
import { ParsedEntity, ParsedProperty, PropertyComment, ParseResult, ParserOptions } from './types';
import { PropertySorter } from './sorter';

/**
 * Main parser class for extracting and analyzing TypeScript interfaces, objects, and type aliases
 * 
 * This class uses the TypeScript compiler API to parse source code and extract structured
 * information about interfaces, object literals, and type aliases, including their properties,
 * comments, and metadata for subsequent sorting operations.
 */
export class TypeScriptParser {
    /** The TypeScript source file AST representation */
    private sourceFile: ts.SourceFile | null = null;
    /** The original source code being parsed */
    private sourceCode: string = '';
    /** Configuration options that control parsing behavior */
    private options: ParserOptions;

    /**
     * Creates a new TypeScriptParser with the specified parsing options
     * 
     * @param options - Partial parser options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create parser with default options
     * const parser = new TypeScriptParser();
     * const result = parser.parse(sourceCode);
     * ```
     * 
     * @example
     * ```typescript
     * // Create parser with custom options
     * const parser = new TypeScriptParser({
     *   preserveFormatting: false,
     *   includeComments: true,
     *   sortOrder: 'desc'
     * });
     * ```
     */
    constructor(options: Partial<ParserOptions> = {}) {
        this.options = {
            preserveFormatting: true,
            includeComments: true,
            ...options
        };
    }

    /**
     * Parses TypeScript source code and extracts all sortable entities with their properties
     * 
     * This method creates a TypeScript AST from the source code and traverses it to find
     * interfaces, object literals, and type aliases, extracting their properties and metadata
     * for sorting operations.
     * 
     * @param sourceCode - The TypeScript source code to parse
     * @param fileName - Optional filename for the source (used for error reporting)
     * @returns Parse result containing extracted entities, errors, and original source
     * 
     * @example
     * ```typescript
     * // Parse interface and object definitions
     * const parser = new TypeScriptParser();
     * const code = `
     *   interface User { name: string; id: number; email: string; }
     *   const config = { zebra: 1, apple: 2, banana: 3 };
     * `;
     * const result = parser.parse(code);
     * console.log(result.entities.length); // 2 entities found
     * ```
     * 
     * @example
     * ```typescript
     * // Parse with error handling
     * const parser = new TypeScriptParser();
     * const result = parser.parse('invalid typescript code');
     * if (result.errors.length > 0) {
     *   console.log('Parsing errors:', result.errors);
     * }
     * ```
     */
    public parse(sourceCode: string, fileName: string = 'temp.ts'): ParseResult {
        this.sourceCode = sourceCode;
        
        // Detect file type from filename
        const fileType = this.detectFileType(fileName);
        
        const result: ParseResult = {
            entities: [],
            errors: [],
            sourceCode,
            fileType
        };

        try {
            // Create TypeScript source file
            this.sourceFile = ts.createSourceFile(
                fileName,
                sourceCode,
                ts.ScriptTarget.Latest,
                true // setParentNodes
            );

            // Visit all nodes and extract entities
            this.visitNode(this.sourceFile, result);

            // Apply sorting if requested
            this.applySorting(result);

        } catch (error) {
            result.errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * Detects the file type based on the filename extension
     * 
     * @param fileName - The filename to analyze
     * @returns The detected file type
     */
    private detectFileType(fileName: string): 'typescript' | 'javascript' {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
            default:
                return 'typescript';
        }
    }

    /**
     * Applies property sorting to parsed entities based on parser configuration options
     * 
     * This method uses the configured sort order to sort properties within each parsed entity,
     * modifying the parse result in place if sorting is enabled in the parser options.
     * 
     * @param result - The parse result to apply sorting to
     */
    private applySorting(result: ParseResult): void {
        if (this.options.sortOrder) {
            try {
                const sorter = new PropertySorter({
                    order: this.options.sortOrder,
                    preserveComments: this.options.includeComments,
                    caseSensitive: false,
                    sortNestedObjects: this.options.sortNestedObjects ?? true
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
     * 
     * @example
     * ```typescript
     * // Parse once, then sort with different orders
     * const parser = new TypeScriptParser();
     * const result = parser.parse(sourceCode);
     * const ascResult = parser.sortParseResult(result, 'asc');
     * const descResult = parser.sortParseResult(result, 'desc');
     * ```
     * 
     * @example
     * ```typescript
     * // Sort with error handling
     * const parser = new TypeScriptParser();
     * const sortedResult = parser.sortParseResult(parseResult, 'asc');
     * if (sortedResult.errors.length > 0) {
     *   console.log('Sorting failed:', sortedResult.errors);
     * }
     * ```
     */
    public sortParseResult(result: ParseResult, sortOrder: 'asc' | 'desc' = 'asc'): ParseResult {
        try {
            const sorter = new PropertySorter({
                order: sortOrder,
                preserveComments: this.options.includeComments,
                caseSensitive: false,
                sortNestedObjects: this.options.sortNestedObjects ?? true
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
     * Recursively visits AST nodes to identify and parse sortable TypeScript entities
     * 
     * This method traverses the TypeScript AST looking for interface declarations,
     * variable statements with object literals, and type alias declarations.
     * 
     * @param node - The AST node to visit and analyze
     * @param result - The parse result to accumulate entities into
     */
    private visitNode(node: ts.Node, result: ParseResult): void {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
                this.parseInterface(node as ts.InterfaceDeclaration, result);
                break;
            case ts.SyntaxKind.VariableStatement:
                this.parseVariableStatement(node as ts.VariableStatement, result);
                break;
            case ts.SyntaxKind.TypeAliasDeclaration:
                this.parseTypeAlias(node as ts.TypeAliasDeclaration, result);
                break;
        }

        // Continue visiting child nodes
        ts.forEachChild(node, child => this.visitNode(child, result));
    }

    /**
     * Parses TypeScript interface declarations and extracts their properties
     * 
     * This method processes interface declarations, extracting property signatures,
     * method signatures, comments, and metadata to create a structured representation.
     * 
     * @param node - The interface declaration AST node
     * @param result - The parse result to add the parsed interface to
     */
    private parseInterface(node: ts.InterfaceDeclaration, result: ParseResult): void {
        try {
            const entity: ParsedEntity = {
                type: 'interface',
                name: node.name.text,
                properties: [],
                startLine: this.getLineNumber(node.getStart()),
                endLine: this.getLineNumber(node.getEnd()),
                leadingComments: this.extractLeadingComments(node),
                isExported: this.hasExportModifier(node),
                originalText: this.getNodeText(node)
            };

            // Parse interface members
            if (node.members) {
                for (const member of node.members) {
                    if (ts.isPropertySignature(member) || ts.isMethodSignature(member)) {
                        const property = this.parseProperty(member);
                        if (property) {
                            entity.properties.push(property);
                        }
                    }
                }
            }

            result.entities.push(entity);
        } catch (error) {
            result.errors.push(`Error parsing interface: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parses variable statements that contain object literals for property extraction
     * 
     * This method identifies variable declarations with object literal initializers,
     * including both direct assignments and function call patterns, extracting their
     * properties for sorting.
     * 
     * @param node - The variable statement AST node
     * @param result - The parse result to add parsed objects to
     */
    private parseVariableStatement(node: ts.VariableStatement, result: ParseResult): void {
        try {
            for (const declaration of node.declarationList.declarations) {
                if (declaration.initializer) {
                    // Direct object literal: const obj = { ... }
                    if (ts.isObjectLiteralExpression(declaration.initializer)) {
                        const entity = this.parseObjectLiteral(declaration, node);
                        if (entity) {
                            result.entities.push(entity);
                        }
                    }
                    // Object literal in function call: const obj = func({ ... })
                    else if (ts.isCallExpression(declaration.initializer)) {
                        const objectLiteral = this.findObjectLiteralInCall(declaration.initializer);
                        if (objectLiteral) {
                            const entity = this.parseObjectLiteralFromCall(declaration, node, objectLiteral);
                            if (entity) {
                                result.entities.push(entity);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            result.errors.push(`Error parsing variable statement: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parses TypeScript type alias declarations with object type literals
     * 
     * This method processes type aliases that define object types, extracting their
     * property signatures for sorting operations.
     * 
     * @param node - The type alias declaration AST node
     * @param result - The parse result to add the parsed type to
     */
    private parseTypeAlias(node: ts.TypeAliasDeclaration, result: ParseResult): void {
        try {
            if (node.type && ts.isTypeLiteralNode(node.type)) {
                const entity: ParsedEntity = {
                    type: 'type',
                    name: node.name.text,
                    properties: [],
                    startLine: this.getLineNumber(node.getStart()),
                    endLine: this.getLineNumber(node.getEnd()),
                    leadingComments: this.extractLeadingComments(node),
                    isExported: this.hasExportModifier(node),
                    originalText: this.getNodeText(node)
                };

                // Parse type literal members
                for (const member of node.type.members) {
                    if (ts.isPropertySignature(member)) {
                        const property = this.parseProperty(member);
                        if (property) {
                            entity.properties.push(property);
                        }
                    }
                }

                result.entities.push(entity);
            }
        } catch (error) {
            result.errors.push(`Error parsing type alias: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Searches for object literal expressions within function call arguments
     * 
     * This method examines call expression arguments to find object literals that
     * should be processed for property sorting.
     * 
     * @param callExpression - The function call expression to search
     * @returns The first object literal found in the arguments, or null if none found
     */
    private findObjectLiteralInCall(callExpression: ts.CallExpression): ts.ObjectLiteralExpression | null {
        // Look for object literal in any argument
        for (const arg of callExpression.arguments) {
            if (ts.isObjectLiteralExpression(arg)) {
                return arg;
            }
        }
        return null;
    }

    /**
     * Parses object literals found within function call expressions
     * 
     * This method creates a parsed entity from an object literal that appears as an
     * argument in a function call, preserving the context of the variable declaration.
     * 
     * @param declaration - The variable declaration containing the function call
     * @param statement - The variable statement containing the declaration
     * @param objectLiteral - The object literal expression to parse
     * @returns Parsed entity representing the object literal, or null if parsing fails
     */
    private parseObjectLiteralFromCall(declaration: ts.VariableDeclaration, statement: ts.VariableStatement, objectLiteral: ts.ObjectLiteralExpression): ParsedEntity | null {
        if (!declaration.name || !ts.isIdentifier(declaration.name)) {
            return null;
        }

        const entity: ParsedEntity = {
            type: 'object',
            name: declaration.name.text,
            properties: [],
            startLine: this.getLineNumber(statement.getStart()),
            endLine: this.getLineNumber(statement.getEnd()),
            leadingComments: this.extractLeadingComments(statement),
            isExported: this.hasExportModifier(statement),
            originalText: this.getNodeText(statement)
        };

        // Parse object properties
        for (const property of objectLiteral.properties) {
            if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
                const parsedProperty = this.parseObjectProperty(property);
                if (parsedProperty) {
                    entity.properties.push(parsedProperty);
                }
            } else if (ts.isSpreadAssignment(property)) {
                const parsedSpread = this.parseSpreadProperty(property);
                if (parsedSpread) {
                    entity.properties.push(parsedSpread);
                }
            }
        }

        return entity;
    }

    /**
     * Parses direct object literal expressions from variable declarations
     * 
     * This method processes object literals that are directly assigned to variables,
     * extracting their properties and creating a structured representation.
     * 
     * @param declaration - The variable declaration with object literal initializer
     * @param statement - The variable statement containing the declaration
     * @returns Parsed entity representing the object literal, or null if parsing fails
     */
    private parseObjectLiteral(declaration: ts.VariableDeclaration, statement: ts.VariableStatement): ParsedEntity | null {
        if (!declaration.name || !ts.isIdentifier(declaration.name) || !declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
            return null;
        }

        const entity: ParsedEntity = {
            type: 'object',
            name: declaration.name.text,
            properties: [],
            startLine: this.getLineNumber(statement.getStart()),
            endLine: this.getLineNumber(statement.getEnd()),
            leadingComments: this.extractLeadingComments(statement),
            isExported: this.hasExportModifier(statement),
            originalText: this.getNodeText(statement)
        };

        // Parse object properties
        for (const property of declaration.initializer.properties) {
            if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
                const parsedProperty = this.parseObjectProperty(property);
                if (parsedProperty) {
                    entity.properties.push(parsedProperty);
                }
            } else if (ts.isSpreadAssignment(property)) {
                const parsedSpread = this.parseSpreadProperty(property);
                if (parsedSpread) {
                    entity.properties.push(parsedSpread);
                }
            }
        }

        return entity;
    }

    /**
     * Parses property signatures from interfaces and type literals
     * 
     * This method extracts information from property and method signatures,
     * including names, types, optional markers, and associated comments.
     * 
     * @param member - The property or method signature AST node
     * @returns Parsed property representation, or null if parsing fails
     */
    private parseProperty(member: ts.PropertySignature | ts.MethodSignature): ParsedProperty | null {
        try {
            if (!member.name) return null;

            const name = this.getPropertyName(member.name);
            const value = member.type ? this.getNodeText(member.type) : 'any';
            const optional = !!member.questionToken;
            const fullText = this.getNodeText(member);
            const trailingPunctuation = this.extractTrailingPunctuation(member);

            let nestedProperties: ParsedProperty[] | undefined;
            let hasNestedObject = false;

            // Check if the type is a TypeLiteralNode (object type like { prop: string })
            if (member.type && ts.isTypeLiteralNode(member.type)) {
                hasNestedObject = true;
                nestedProperties = [];

                // Parse nested object type properties
                for (const nestedMember of member.type.members) {
                    if (ts.isPropertySignature(nestedMember) || ts.isMethodSignature(nestedMember)) {
                        const parsedNestedProperty = this.parseProperty(nestedMember);
                        if (parsedNestedProperty) {
                            nestedProperties.push(parsedNestedProperty);
                        }
                    }
                }
            }

            const leadingComments = this.extractLeadingComments(member);
            const trailingComments = this.extractTrailingComments(member);

            const parsedProperty: ParsedProperty = {
                name,
                value,
                comments: leadingComments,
                optional,
                line: this.getLineNumber(member.getStart()),
                fullText,
                trailingPunctuation
            };

            // Add trailing comments if they exist
            if (trailingComments.length > 0) {
                parsedProperty.trailingComments = trailingComments;
            }

            // Add nested properties if they exist
            if (hasNestedObject && nestedProperties) {
                parsedProperty.nestedProperties = nestedProperties;
                parsedProperty.hasNestedObject = true;
            }

            return parsedProperty;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parses property assignments from object literals with support for nested objects
     * 
     * This method processes both regular property assignments and shorthand properties,
     * detecting nested object literals and recursively parsing their properties.
     * 
     * @param property - The property assignment or shorthand property AST node
     * @returns Parsed property with potential nested properties, or null if parsing fails
     */
    private parseObjectProperty(property: ts.PropertyAssignment | ts.ShorthandPropertyAssignment): ParsedProperty | null {
        try {
            const name = this.getPropertyName(property.name);
            let value = '';
            let nestedProperties: ParsedProperty[] | undefined;
            let hasNestedObject = false;

            if (ts.isPropertyAssignment(property)) {
                value = this.getNodeText(property.initializer);
                
                // Check if the initializer is an object literal
                if (ts.isObjectLiteralExpression(property.initializer)) {
                    hasNestedObject = true;
                    nestedProperties = [];
                    
                    // Parse nested object properties
                    for (const nestedProperty of property.initializer.properties) {
                        if (ts.isPropertyAssignment(nestedProperty) || ts.isShorthandPropertyAssignment(nestedProperty)) {
                            const parsedNestedProperty = this.parseObjectProperty(nestedProperty);
                            if (parsedNestedProperty) {
                                nestedProperties.push(parsedNestedProperty);
                            }
                        } else if (ts.isSpreadAssignment(nestedProperty)) {
                            const parsedSpread = this.parseSpreadProperty(nestedProperty);
                            if (parsedSpread) {
                                nestedProperties.push(parsedSpread);
                            }
                        }
                    }
                }
            } else if (ts.isShorthandPropertyAssignment(property)) {
                value = name; // shorthand property
            }

            const fullText = this.getNodeText(property);
            const trailingPunctuation = this.extractTrailingPunctuation(property);

            const leadingComments = this.extractLeadingComments(property);
            const trailingComments = this.extractTrailingComments(property);

            const parsedProperty: ParsedProperty = {
                name,
                value,
                comments: leadingComments,
                optional: false,
                line: this.getLineNumber(property.getStart()),
                fullText,
                trailingPunctuation
            };

            // Add trailing comments if they exist
            if (trailingComments.length > 0) {
                parsedProperty.trailingComments = trailingComments;
            }

            // Add nested properties if they exist
            if (hasNestedObject && nestedProperties) {
                parsedProperty.nestedProperties = nestedProperties;
                parsedProperty.hasNestedObject = true;
            }

            return parsedProperty;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parses spread assignments from object literals (...obj)
     * 
     * This method processes spread syntax in object literals, preserving the spread
     * expression and marking it as a spread property for proper reconstruction.
     * 
     * @param property - The spread assignment AST node
     * @returns Parsed property representing the spread, or null if parsing fails
     */
    private parseSpreadProperty(property: ts.SpreadAssignment): ParsedProperty | null {
        try {
            const expression = this.getNodeText(property.expression);
            const fullText = this.getNodeText(property);
            const trailingPunctuation = this.extractTrailingPunctuation(property);

            const leadingComments = this.extractLeadingComments(property);
            const trailingComments = this.extractTrailingComments(property);

            const parsedProperty: ParsedProperty = {
                name: `...${expression}`,
                value: expression,
                comments: leadingComments,
                optional: false,
                line: this.getLineNumber(property.getStart()),
                fullText,
                trailingPunctuation,
                isSpread: true
            };

            // Add trailing comments if they exist
            if (trailingComments.length > 0) {
                parsedProperty.trailingComments = trailingComments;
            }

            return parsedProperty;
        } catch (error) {
            return null;
        }
    }

    /**
     * Extracts leading comments associated with an AST node
     * 
     * This method finds and processes comments that appear before a node,
     * cleaning the comment text and preserving both single-line and multi-line comments.
     * 
     * @param node - The AST node to extract comments for
     * @returns Array of processed comment objects
     */
    private extractLeadingComments(node: ts.Node): PropertyComment[] {
        if (!this.options.includeComments || !this.sourceFile) {
            return [];
        }

        const comments: PropertyComment[] = [];
        const sourceFileText = this.sourceFile.getFullText();
        const leadingCommentRanges = ts.getLeadingCommentRanges(sourceFileText, node.getFullStart());

        if (leadingCommentRanges) {
            for (const range of leadingCommentRanges) {
                const commentText = sourceFileText.substring(range.pos, range.end);
                const isMultiLine = range.kind === ts.SyntaxKind.MultiLineCommentTrivia;
                
                comments.push({
                    text: this.cleanCommentText(commentText, isMultiLine),
                    type: isMultiLine ? 'multi' : 'single',
                    raw: commentText,
                    line: this.getLineNumber(range.pos)
                });
            }
        }

        return comments;
    }

    /**
     * Extracts trailing comments associated with an AST node
     * 
     * This method finds and processes comments that appear after a node,
     * typically on the same line as the property declaration. For object properties
     * with trailing punctuation (like commas), it looks for comments after the
     * punctuation rather than immediately after the node.
     * 
     * @param node - The AST node to extract trailing comments for
     * @returns Array of processed comment objects
     */
    private extractTrailingComments(node: ts.Node): PropertyComment[] {
        if (!this.options.includeComments || !this.sourceFile) {
            return [];
        }

        const comments: PropertyComment[] = [];
        const sourceFileText = this.sourceFile.getFullText();
        
        // First, try to get trailing comments immediately after the node
        let searchPosition = node.getEnd();
        let trailingCommentRanges = ts.getTrailingCommentRanges(sourceFileText, searchPosition);

        // If no comments found immediately after the node, and this is an object property,
        // look for comments after any trailing punctuation
        if (!trailingCommentRanges && (
            ts.isPropertyAssignment(node) || 
            ts.isShorthandPropertyAssignment(node) || 
            ts.isSpreadAssignment(node)
        )) {
            // Find the position after any trailing punctuation
            let i = searchPosition;
            while (i < sourceFileText.length) {
                const char = sourceFileText.charAt(i);
                
                // Skip whitespace
                if (char === ' ' || char === '\t') {
                    i++;
                    continue;
                }
                
                // Found punctuation - update search position to after it
                if (char === ',' || char === ';') {
                    searchPosition = i + 1;
                    break;
                }
                
                // Found something else (like a comment or newline), stop looking
                break;
            }
            
            // Try to get trailing comments from the updated position
            trailingCommentRanges = ts.getTrailingCommentRanges(sourceFileText, searchPosition);
        }

        if (trailingCommentRanges) {
            for (const range of trailingCommentRanges) {
                const commentText = sourceFileText.substring(range.pos, range.end);
                const isMultiLine = range.kind === ts.SyntaxKind.MultiLineCommentTrivia;
                
                comments.push({
                    text: this.cleanCommentText(commentText, isMultiLine),
                    type: isMultiLine ? 'multi' : 'single',
                    raw: commentText,
                    line: this.getLineNumber(range.pos)
                });
            }
        }

        return comments;
    }

    /**
     * Removes comment markers from comment text while preserving content
     * 
     * This method strips comment markers from comments while maintaining
     * the actual comment content for processing and reconstruction.
     * 
     * @param commentText - The raw comment text including markers
     * @param isMultiLine - Whether this is a multi-line comment
     * @returns Cleaned comment text without markers
     */
    private cleanCommentText(commentText: string, isMultiLine: boolean): string {
        if (isMultiLine) {
            return commentText.replace(/^\/\*\*?/, '').replace(/\*\/$/, '').trim();
        } else {
            return commentText.replace(/^\/\//, '').trim();
        }
    }

    /**
     * Extracts property names from various TypeScript property name node types
     * 
     * This method handles different property name formats including identifiers,
     * string literals, numeric literals, and computed property names.
     * 
     * @param name - The property name AST node
     * @returns String representation of the property name
     */
    private getPropertyName(name: ts.PropertyName): string {
        if (ts.isIdentifier(name)) {
            return name.text;
        } else if (ts.isStringLiteral(name)) {
            // Preserve quotes for string literal property names (e.g., ':hover')
            return `'${name.text}'`;
        } else if (ts.isNumericLiteral(name)) {
            return name.text;
        } else if (ts.isComputedPropertyName(name)) {
            return this.getNodeText(name);
        }
        return 'unknown';
    }

    /**
     * Determines whether an AST node has an export modifier
     * 
     * This method checks if a node (interface, type, variable) is exported
     * by examining its modifiers for the export keyword.
     * 
     * @param node - The AST node to check for export modifier
     * @returns True if the node is exported, false otherwise
     */
    private hasExportModifier(node: ts.Node): boolean {
        const nodeWithModifiers = node as ts.Node & { modifiers?: ts.NodeArray<ts.Modifier> };
        return !!nodeWithModifiers.modifiers?.some((modifier: ts.Modifier) => 
            modifier.kind === ts.SyntaxKind.ExportKeyword
        );
    }

    /**
     * Retrieves the text content of an AST node from the source file
     * 
     * This method extracts the original source text for a node, preserving
     * formatting and whitespace as it appears in the source.
     * 
     * @param node - The AST node to get text for
     * @returns The original text content of the node
     */
    private getNodeText(node: ts.Node): string {
        return node.getText(this.sourceFile || undefined);
    }

    /**
     * Converts a character position to a line number in the source file
     * 
     * This method translates TypeScript AST positions to human-readable
     * line numbers for error reporting and metadata.
     * 
     * @param pos - The character position in the source file
     * @returns One-based line number
     */
    private getLineNumber(pos: number): number {
        if (!this.sourceFile) return 0;
        const lineAndChar = this.sourceFile.getLineAndCharacterOfPosition(pos);
        return lineAndChar.line + 1; // Convert to 1-based line numbers
    }

    /**
     * Extracts trailing punctuation (semicolons or commas) following a property
     * 
     * This method looks for punctuation that follows a property declaration,
     * which is important for preserving the original formatting during reconstruction.
     * For interface/type properties, the punctuation is often part of the node itself.
     * For object properties, the punctuation comes after the node.
     * 
     * @param property - The property AST node to check for trailing punctuation
     * @returns The trailing punctuation character (';', ',', or empty string)
     */
    private extractTrailingPunctuation(property: ts.PropertyAssignment | ts.ShorthandPropertyAssignment | ts.PropertySignature | ts.MethodSignature | ts.SpreadAssignment): string {
        if (!this.sourceFile) return '';
        
        const sourceText = this.sourceFile.getFullText();
        
        // For interface/type properties (PropertySignature, MethodSignature), 
        // the semicolon is often included in the node's text
        if (ts.isPropertySignature(property) || ts.isMethodSignature(property)) {
            const nodeText = property.getText(this.sourceFile);
            const lastChar = nodeText.charAt(nodeText.length - 1);
            if (lastChar === ';' || lastChar === ',') {
                return lastChar;
            }
            // If no punctuation in node text, return empty string
            return '';
        }
        
        // For object properties (PropertyAssignment, ShorthandPropertyAssignment, SpreadAssignment),
        // look for punctuation after the property node
        const propertyEnd = property.getEnd();
        
        let i = propertyEnd;
        while (i < sourceText.length) {
            const char = sourceText.charAt(i);
            
            // Skip whitespace and newlines
            if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                i++;
                continue;
            }
            
            // Found punctuation
            if (char === ',' || char === ';') {
                return char;
            }
            
            // Found something else (like a comment or next property), stop looking
            break;
        }
        
        return '';
    }
} 