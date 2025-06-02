import { ParsedEntity, ParsedProperty, PropertyComment } from './types';
import { 
    calculatePropertySpacing, 
    formatTrailingComma,
    formatTrailingCommaForInterface,
    getGroupSeparator,
    convertCommentStyle 
} from './formattingUtils';

/**
 * Options for code reconstruction
 */
export interface ReconstructorOptions {
    /** Indentation string (spaces or tabs) */
    indentation: string;
    /** Whether to preserve original formatting where possible */
    preserveFormatting: boolean;
    /** Whether to include comments in output */
    includeComments: boolean;
    /** Line ending style */
    lineEnding: '\n' | '\r\n';
    /** Comment style preference ('preserve', 'single-line', 'multi-line') */
    commentStyle?: 'preserve' | 'single-line' | 'multi-line';
    /** Property spacing style ('compact', 'spaced', 'aligned') */
    propertySpacing?: 'compact' | 'spaced' | 'aligned';
    /** Trailing comma handling ('preserve', 'add', 'remove') */
    trailingCommas?: 'preserve' | 'add' | 'remove';
    /** Add blank lines between property groups */
    blankLinesBetweenGroups?: boolean;
}

/**
 * TypeScript code reconstructor that rebuilds code from parsed entities
 */
export class TypeScriptReconstructor {
    private options: ReconstructorOptions;

    constructor(options: Partial<ReconstructorOptions> = {}) {
        this.options = {
            indentation: '    ', // 4 spaces by default
            preserveFormatting: true,
            includeComments: true,
            lineEnding: '\n',
            commentStyle: 'preserve',
            propertySpacing: 'compact',
            trailingCommas: 'preserve',
            blankLinesBetweenGroups: false,
            ...options
        };
    }

    /**
     * Reconstruct a single entity back to TypeScript code
     * @param entity The parsed entity to reconstruct
     * @returns Reconstructed TypeScript code
     */
    public reconstructEntity(entity: ParsedEntity): string {
        switch (entity.type) {
            case 'interface':
                return this.reconstructInterface(entity);
            case 'object':
                return this.reconstructObject(entity);
            case 'type':
                return this.reconstructTypeAlias(entity);
            default:
                throw new Error(`Unsupported entity type: ${entity.type as string}`);
        }
    }

    /**
     * Reconstruct multiple entities
     * @param entities Array of entities to reconstruct
     * @returns Reconstructed TypeScript code
     */
    public reconstructEntities(entities: ParsedEntity[]): string {
        const reconstructedParts: string[] = [];

        for (const entity of entities) {
            try {
                const reconstructed = this.reconstructEntity(entity);
                reconstructedParts.push(reconstructed);
            } catch (error) {
                // Add error comment if reconstruction fails
                reconstructedParts.push(`// Error reconstructing ${entity.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return reconstructedParts.join(this.options.lineEnding + this.options.lineEnding);
    }

    /**
     * Reconstruct an interface declaration
     */
    private reconstructInterface(entity: ParsedEntity): string {
        const lines: string[] = [];

        // Add leading comments
        if (this.options.includeComments && entity.leadingComments.length > 0) {
            lines.push(...this.formatComments(entity.leadingComments, ''));
        }

        // Interface declaration line
        const exportKeyword = entity.isExported ? 'export ' : '';
        
        // Handle empty interfaces specially to preserve compact format
        if (entity.properties.length === 0) {
            lines.push(`${exportKeyword}interface ${entity.name} {}`);
            return lines.join(this.options.lineEnding);
        }
        
        lines.push(`${exportKeyword}interface ${entity.name} {`);

        // Add properties with proper formatting
        const propertyNames = entity.properties.map(p => p.name);
        for (let i = 0; i < entity.properties.length; i++) {
            const property = entity.properties[i];
            const isLastProperty = i === entity.properties.length - 1;
            lines.push(...this.reconstructProperty(property, this.options.indentation, isLastProperty, propertyNames));
        }

        // Closing brace
        lines.push('}');

        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstruct an object literal
     */
    private reconstructObject(entity: ParsedEntity): string {
        const lines: string[] = [];

        // Add leading comments
        if (this.options.includeComments && entity.leadingComments.length > 0) {
            lines.push(...this.formatComments(entity.leadingComments, ''));
        }

        // Determine if this is a function call pattern or direct assignment
        const isFunctionCall = this.detectFunctionCallPattern(entity.originalText);
        
        // Object declaration line
        const exportKeyword = entity.isExported ? 'export ' : '';
        if (isFunctionCall) {
            const functionCall = this.extractFunctionCall(entity.originalText);
            // If functionCall has arguments, add comma; otherwise just add opening parenthesis
            if (functionCall.includes('(') && !functionCall.endsWith('(')) {
                lines.push(`${exportKeyword}const ${entity.name} = ${functionCall}, {`);
            } else {
                lines.push(`${exportKeyword}const ${entity.name} = ${functionCall}({`);
            }
        } else {
            lines.push(`${exportKeyword}const ${entity.name} = {`);
        }

        // Add properties
        for (let i = 0; i < entity.properties.length; i++) {
            const property = entity.properties[i];
            const isLastProperty = i === entity.properties.length - 1;
            const propertyNames = entity.properties.map(p => p.name);
            lines.push(...this.reconstructObjectProperty(property, this.options.indentation, isLastProperty, propertyNames));
        }

        // Closing brace and semicolon
        if (isFunctionCall) {
            lines.push('});');
        } else {
            lines.push('};');
        }

        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstruct a type alias
     */
    private reconstructTypeAlias(entity: ParsedEntity): string {
        const lines: string[] = [];

        // Add leading comments
        if (this.options.includeComments && entity.leadingComments.length > 0) {
            lines.push(...this.formatComments(entity.leadingComments, ''));
        }

        // Type alias declaration line
        const exportKeyword = entity.isExported ? 'export ' : '';
        lines.push(`${exportKeyword}type ${entity.name} = {`);

        // Add properties with proper formatting
        const propertyNames = entity.properties.map(p => p.name);
        for (let i = 0; i < entity.properties.length; i++) {
            const property = entity.properties[i];
            const isLastProperty = i === entity.properties.length - 1;
            
            // Add group separator if needed (for future grouping features)
            if (this.options.blankLinesBetweenGroups && i > 0) {
                const groupSeparator = getGroupSeparator(
                    { blankLinesBetweenGroups: this.options.blankLinesBetweenGroups } as any,
                    'property', // Current group type
                    'property', // Previous group type
                    this.options.lineEnding
                );
                if (groupSeparator) {
                    lines.push('');
                }
            }
            
            lines.push(...this.reconstructProperty(property, this.options.indentation, isLastProperty, propertyNames));
        }

        // Closing brace and semicolon
        lines.push('};');

        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstruct a property for interfaces and type aliases
     */
    private reconstructProperty(property: ParsedProperty, indent: string, isLastProperty?: boolean, propertyNames?: string[]): string[] {
        const lines: string[] = [];

        // Add property comments
        if (this.options.includeComments && property.comments.length > 0) {
            lines.push(...this.formatComments(property.comments, indent));
        }

        const optionalMarker = property.optional ? '?' : '';

        // Calculate property spacing
        const spacing = calculatePropertySpacing(
            { propertySpacing: this.options.propertySpacing } as any,
            propertyNames
        );

        // Check if this property has nested object types
        if (property.hasNestedObject && property.nestedProperties && property.nestedProperties.length > 0) {
            // Reconstruct nested object type
            lines.push(`${indent}${property.name}${optionalMarker}: {`);
            
            // Add nested properties with increased indentation
            const nestedIndent = indent + this.options.indentation;
            const nestedPropertyNames = property.nestedProperties.map(p => p.name);
            for (let i = 0; i < property.nestedProperties.length; i++) {
                const nestedProperty = property.nestedProperties[i];
                const isLastNested = i === property.nestedProperties.length - 1;
                lines.push(...this.reconstructProperty(nestedProperty, nestedIndent, isLastNested, nestedPropertyNames));
            }
            
            // Format trailing punctuation for the closing brace
            const formattedPunctuation = formatTrailingCommaForInterface(
                { trailingCommas: this.options.trailingCommas } as any,
                property.trailingPunctuation,
                isLastProperty || false
            );
            const trailingCommentsText = this.formatTrailingComments(property.trailingComments || []);
            lines.push(`${indent}}${formattedPunctuation}${trailingCommentsText}`);
        } else {
            // Format property with spacing
            let propertyLine: string;
            if (spacing.alignment && propertyNames) {
                // Aligned spacing
                const paddedName = property.name.padEnd(spacing.alignment);
                propertyLine = `${indent}${paddedName}${optionalMarker}${spacing.beforeColon}:${spacing.afterColon}${property.value}`;
            } else {
                // Regular spacing
                propertyLine = `${indent}${property.name}${optionalMarker}${spacing.beforeColon}:${spacing.afterColon}${property.value}`;
            }
            
            // Format trailing punctuation
            const formattedPunctuation = formatTrailingCommaForInterface(
                { trailingCommas: this.options.trailingCommas } as any,
                property.trailingPunctuation,
                isLastProperty || false
            );
            propertyLine += formattedPunctuation;
            
            // Add trailing comments to the same line
            const trailingCommentsText = this.formatTrailingComments(property.trailingComments || []);
            propertyLine += trailingCommentsText;
            
            lines.push(propertyLine);
        }

        return lines;
    }

    /**
     * Reconstruct a property for object literals
     */
    private reconstructObjectProperty(property: ParsedProperty, indent: string, isLastProperty?: boolean, propertyNames?: string[]): string[] {
        const lines: string[] = [];

        // Add property comments
        if (this.options.includeComments && property.comments.length > 0) {
            lines.push(...this.formatComments(property.comments, indent));
        }

        // Handle spread properties
        if (property.isSpread) {
            const formattedPunctuation = formatTrailingComma(
                { trailingCommas: this.options.trailingCommas } as any,
                property.trailingPunctuation,
                isLastProperty || false
            );
            const trailingCommentsText = this.formatTrailingComments(property.trailingComments || []);
            lines.push(`${indent}${property.name}${formattedPunctuation}${trailingCommentsText}`);
            return lines;
        }

        // Calculate property spacing
        const spacing = calculatePropertySpacing(
            { propertySpacing: this.options.propertySpacing } as any,
            propertyNames
        );

        // Check if this property has nested objects
        if (property.hasNestedObject && property.nestedProperties && property.nestedProperties.length > 0) {
            // Reconstruct nested object
            lines.push(`${indent}${property.name}: {`);
            
            // Add nested properties with increased indentation
            const nestedIndent = indent + this.options.indentation;
            const nestedPropertyNames = property.nestedProperties.map(p => p.name);
            for (let i = 0; i < property.nestedProperties.length; i++) {
                const nestedProperty = property.nestedProperties[i];
                const isLastNested = i === property.nestedProperties.length - 1;
                lines.push(...this.reconstructObjectProperty(nestedProperty, nestedIndent, isLastNested, nestedPropertyNames));
            }
            
            // Format trailing punctuation for the closing brace
            const formattedPunctuation = formatTrailingComma(
                { trailingCommas: this.options.trailingCommas } as any,
                property.trailingPunctuation,
                isLastProperty || false
            );
            const trailingCommentsText = this.formatTrailingComments(property.trailingComments || []);
            lines.push(`${indent}}${formattedPunctuation}${trailingCommentsText}`);
        } else {
            // Check if it's a shorthand property
            if (property.name === property.value) {
                // Shorthand property
                const formattedPunctuation = formatTrailingComma(
                    { trailingCommas: this.options.trailingCommas } as any,
                    property.trailingPunctuation,
                    isLastProperty || false
                );
                const trailingCommentsText = this.formatTrailingComments(property.trailingComments || []);
                lines.push(`${indent}${property.name}${formattedPunctuation}${trailingCommentsText}`);
            } else {
                // Regular property assignment with spacing
                let propertyLine: string;
                if (spacing.alignment && propertyNames) {
                    // Aligned spacing
                    const paddedName = property.name.padEnd(spacing.alignment);
                    propertyLine = `${indent}${paddedName}${spacing.beforeColon}:${spacing.afterColon}${property.value}`;
                } else {
                    // Regular spacing
                    propertyLine = `${indent}${property.name}${spacing.beforeColon}:${spacing.afterColon}${property.value}`;
                }
                
                // Format trailing punctuation
                const formattedPunctuation = formatTrailingComma(
                    { trailingCommas: this.options.trailingCommas } as any,
                    property.trailingPunctuation,
                    isLastProperty || false
                );
                propertyLine += formattedPunctuation;
                
                // Add trailing comments to the same line
                const trailingCommentsText = this.formatTrailingComments(property.trailingComments || []);
                propertyLine += trailingCommentsText;
                
                lines.push(propertyLine);
            }
        }

        return lines;
    }

    /**
     * Format comments with proper indentation
     */
    private formatComments(comments: PropertyComment[], indent: string): string[] {
        const lines: string[] = [];

        for (const comment of comments) {
            const targetStyle = this.options.commentStyle || 'preserve';
            
            if (targetStyle === 'preserve') {
                // Use original comment style
                if (comment.type === 'single') {
                    lines.push(`${indent}// ${comment.text}`);
                } else {
                    // Multi-line comment - use raw format to preserve original style
                    if (comment.raw && comment.raw.includes('\n')) {
                        // Multi-line comment that spans multiple lines
                        const commentLines = comment.raw.split('\n');
                        lines.push(...commentLines.map(line => `${indent}${line.trim()}`));
                    } else if (comment.raw) {
                        // Single-line multi-line comment - use raw format
                        lines.push(`${indent}${comment.raw}`);
                    } else {
                        // Fallback to formatted multi-line comment if no raw data
                        lines.push(`${indent}/* ${comment.text} */`);
                    }
                }
            } else {
                // Convert comment style
                const convertedComment = convertCommentStyle(comment.text, comment.type, targetStyle);
                lines.push(`${indent}${convertedComment}`);
            }
        }

        return lines;
    }

    /**
     * Format trailing comments to be appended to the same line as a property
     */
    private formatTrailingComments(comments: PropertyComment[]): string {
        if (!this.options.includeComments || !comments || comments.length === 0) {
            return '';
        }

        const formattedComments: string[] = [];

        for (const comment of comments) {
            const targetStyle = this.options.commentStyle || 'preserve';
            
            if (targetStyle === 'preserve') {
                // Use original comment style
                if (comment.type === 'single') {
                    formattedComments.push(` // ${comment.text}`);
                } else {
                    // For multi-line comments, use raw format if available, otherwise format as single line
                    if (comment.raw) {
                        formattedComments.push(` ${comment.raw}`);
                    } else {
                        formattedComments.push(` /* ${comment.text} */`);
                    }
                }
            } else {
                // Convert comment style
                const convertedComment = convertCommentStyle(comment.text, comment.type, targetStyle);
                formattedComments.push(` ${convertedComment}`);
            }
        }

        return formattedComments.join('');
    }

    /**
     * Detect if the original text contains a function call pattern
     */
    private detectFunctionCallPattern(originalText: string): boolean {
        // Look for patterns like: const name = functionName({
        const functionCallPattern = /const\s+\w+\s*=\s*\w+\s*\(/;
        return functionCallPattern.test(originalText);
    }

    /**
     * Extract the function call part from the original text
     */
    private extractFunctionCall(originalText: string): string {
        // Extract function call with arguments before the object literal
        // Pattern: const name = functionName(arg1, arg2, ...
        const match = originalText.match(/const\s+\w+\s*=\s*(\w+\s*\([^{]*)/);
        if (match) {
            const functionCall = match[1];
            // Remove trailing comma and whitespace if present
            const cleaned = functionCall.replace(/,\s*$/, '');
            
            // If it ends with just the opening parenthesis, it means no arguments before the object
            if (cleaned.endsWith('(')) {
                return cleaned.slice(0, -1); // Remove the opening parenthesis
            }
            
            return cleaned;
        }
        return 'unknownFunction';
    }

    /**
     * Update reconstructor options
     */
    public updateOptions(newOptions: Partial<ReconstructorOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current reconstructor options
     */
    public getOptions(): ReconstructorOptions {
        return { ...this.options };
    }
}

/**
 * Convenience function to reconstruct a single entity
 * @param entity Entity to reconstruct
 * @param options Reconstruction options
 * @returns Reconstructed TypeScript code
 */
export function reconstructEntity(entity: ParsedEntity, options: Partial<ReconstructorOptions> = {}): string {
    const reconstructor = new TypeScriptReconstructor(options);
    return reconstructor.reconstructEntity(entity);
}

/**
 * Convenience function to reconstruct multiple entities
 * @param entities Entities to reconstruct
 * @param options Reconstruction options
 * @returns Reconstructed TypeScript code
 */
export function reconstructEntities(entities: ParsedEntity[], options: Partial<ReconstructorOptions> = {}): string {
    const reconstructor = new TypeScriptReconstructor(options);
    return reconstructor.reconstructEntities(entities);
}