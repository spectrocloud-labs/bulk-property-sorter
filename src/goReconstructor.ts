import { ParsedEntity, ParsedProperty, PropertyComment } from './types';

/**
 * Options for Go code reconstruction
 */
export interface GoReconstructorOptions {
    /** Indentation string (spaces or tabs) */
    indentation: string;
    /** Whether to preserve original formatting where possible */
    preserveFormatting: boolean;
    /** Whether to include comments in output */
    includeComments: boolean;
    /** Line ending style */
    lineEnding: '\n' | '\r\n';
}

/**
 * Go code reconstructor that rebuilds Go structs from parsed entities
 * 
 * This class handles the reconstruction of Go struct definitions from sorted
 * parsed entities, preserving comments, struct tags, and proper Go formatting.
 */
export class GoReconstructor {
    private options: GoReconstructorOptions;

    /**
     * Creates a new GoReconstructor with the specified options
     * 
     * @param options - Partial reconstruction options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create reconstructor with default options
     * const reconstructor = new GoReconstructor();
     * const code = reconstructor.reconstructEntity(entity);
     * ```
     * 
     * @example
     * ```typescript
     * // Create reconstructor with custom options
     * const reconstructor = new GoReconstructor({
     *   indentation: '\t',
     *   includeComments: false
     * });
     * ```
     */
    constructor(options: Partial<GoReconstructorOptions> = {}) {
        this.options = {
            indentation: '\t', // Go convention uses tabs
            preserveFormatting: true,
            includeComments: true,
            lineEnding: '\n',
            ...options
        };
    }

    /**
     * Reconstruct a single entity back to Go code
     * 
     * @param entity - The parsed entity to reconstruct
     * @returns Reconstructed Go code
     * 
     * @example
     * ```typescript
     * // Reconstruct a struct entity
     * const reconstructor = new GoReconstructor();
     * const entity = { type: 'struct', name: 'User', properties: [...] };
     * const code = reconstructor.reconstructEntity(entity);
     * // Returns: type User struct { ... }
     * ```
     */
    public reconstructEntity(entity: ParsedEntity): string {
        switch (entity.type) {
            case 'struct':
                return this.reconstructStruct(entity);
            default:
                throw new Error(`Unsupported entity type for Go reconstruction: ${entity.type as string}`);
        }
    }

    /**
     * Reconstruct multiple entities
     * 
     * @param entities - Array of entities to reconstruct
     * @returns Reconstructed Go code with entities separated by blank lines
     * 
     * @example
     * ```typescript
     * // Reconstruct multiple struct entities
     * const reconstructor = new GoReconstructor();
     * const entities = [userStruct, productStruct];
     * const code = reconstructor.reconstructEntities(entities);
     * ```
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
     * Reconstruct a Go struct declaration
     * 
     * @param entity - The struct entity to reconstruct
     * @returns Reconstructed Go struct code
     */
    private reconstructStruct(entity: ParsedEntity): string {
        const lines: string[] = [];

        // Add leading comments
        if (this.options.includeComments && entity.leadingComments.length > 0) {
            lines.push(...this.formatComments(entity.leadingComments, ''));
        }

        // Struct declaration line
        lines.push(`type ${entity.name} struct {`);

        // Add fields
        for (const property of entity.properties) {
            lines.push(...this.reconstructField(property, this.options.indentation));
        }

        // Closing brace
        lines.push('}');

        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstruct a struct field
     * 
     * @param property - The property representing the struct field
     * @param indent - Indentation string to use
     * @returns Array of lines representing the field
     */
    private reconstructField(property: ParsedProperty, indent: string): string[] {
        const lines: string[] = [];

        // Add field comments (above the field) - these are leading comments
        if (this.options.includeComments && property.comments.length > 0) {
            lines.push(...this.formatComments(property.comments, indent));
        }

        // When preserveFormatting is enabled and we have trailing comments,
        // we want to preserve the exact original spacing from fullText
        if (this.options.preserveFormatting && 
            property.fullText && 
            this.options.includeComments && 
            property.trailingComments && 
            property.trailingComments.length > 0) {
            
            // Use the original full text as-is, it already contains the proper spacing and trailing comment
            lines.push(`${indent}${property.fullText.trim()}`);
        } else {
            // Build the field line without comments first
            const fieldLine = this.buildFieldLine(property, indent);
            
            // Add trailing comments if they exist
            if (this.options.includeComments && property.trailingComments && property.trailingComments.length > 0) {
                const trailingComment = property.trailingComments[0]; // Take first trailing comment
                if (trailingComment.type === 'single') {
                    lines.push(`${fieldLine} // ${trailingComment.text}`);
                } else if (trailingComment.type === 'multi') {
                    lines.push(`${fieldLine} /* ${trailingComment.text} */`);
                } else {
                    lines.push(fieldLine);
                }
            } else {
                lines.push(fieldLine);
            }
        }

        return lines;
    }

    /**
     * Build the field line (name, type, and struct tags)
     * 
     * @param property - The property representing the field
     * @param indent - Indentation string to use
     * @returns The complete field line
     */
    private buildFieldLine(property: ParsedProperty, indent: string): string {
        if (this.options.preserveFormatting && property.fullText) {
            // Use original formatting from fullText, but strip any trailing comments
            // since we handle those separately
            let fieldText = property.fullText.trim();
            
            // Find where the trailing comment starts so we can preserve spacing before it
            let commentStart = -1;
            
            // Look for single-line comment
            const singleLineMatch = fieldText.match(/(\s*)\/\/.*$/);
            if (singleLineMatch) {
                commentStart = fieldText.indexOf(singleLineMatch[0]);
            } else {
                // Look for multi-line comment
                const multiLineMatch = fieldText.match(/(\s*)\/\*.*?\*\/\s*$/);
                if (multiLineMatch) {
                    commentStart = fieldText.indexOf(multiLineMatch[0]);
                }
            }
            
            if (commentStart >= 0) {
                // Extract everything before the comment (preserving spacing)
                fieldText = fieldText.substring(0, commentStart).trimEnd();
            }
            
            return `${indent}${fieldText}`;
        }
        
        if (property.isEmbedded) {
            // Embedded field: just the type name
            return `${indent}${property.value}`;
        } else {
            // Named field: FieldName FieldType [tags]
            let line = `${indent}${property.name} ${property.value}`;
            
            // Add struct tags if present
            if (property.structTags && property.structTags.trim()) {
                line += ` \`${property.structTags}\``;
            }
            
            return line;
        }
    }

    /**
     * Format comments with proper indentation
     * 
     * @param comments - Array of comments to format
     * @param indent - Base indentation string
     * @returns Array of formatted comment lines
     */
    private formatComments(comments: PropertyComment[], indent: string): string[] {
        const lines: string[] = [];

        for (const comment of comments) {
            if (comment.type === 'single') {
                lines.push(`${indent}// ${comment.text}`);
            } else if (comment.type === 'multi') {
                // Handle multi-line comments
                const commentLines = comment.text.split('\n');
                if (commentLines.length === 1) {
                    lines.push(`${indent}/* ${comment.text} */`);
                } else {
                    lines.push(`${indent}/*`);
                    for (const line of commentLines) {
                        lines.push(`${indent} * ${line}`);
                    }
                    lines.push(`${indent} */`);
                }
            }
        }

        return lines;
    }

    /**
     * Update the reconstruction options
     * 
     * @param newOptions - New options to merge with existing options
     */
    public updateOptions(newOptions: Partial<GoReconstructorOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get the current reconstruction options
     * 
     * @returns Current reconstruction options
     */
    public getOptions(): GoReconstructorOptions {
        return { ...this.options };
    }
}

/**
 * Convenience function to reconstruct a single Go entity without creating a GoReconstructor instance
 * 
 * @param entity - The entity to reconstruct
 * @param options - Optional reconstruction options
 * @returns Reconstructed Go code
 * 
 * @example
 * ```typescript
 * // Quick entity reconstruction
 * const code = reconstructGoEntity(structEntity, { indentation: '  ' });
 * ```
 */
export function reconstructGoEntity(entity: ParsedEntity, options: Partial<GoReconstructorOptions> = {}): string {
    const reconstructor = new GoReconstructor(options);
    return reconstructor.reconstructEntity(entity);
}

/**
 * Convenience function to reconstruct multiple Go entities without creating a GoReconstructor instance
 * 
 * @param entities - Array of entities to reconstruct
 * @param options - Optional reconstruction options
 * @returns Reconstructed Go code
 * 
 * @example
 * ```typescript
 * // Quick multiple entity reconstruction
 * const code = reconstructGoEntities([struct1, struct2], { includeComments: false });
 * ```
 */
export function reconstructGoEntities(entities: ParsedEntity[], options: Partial<GoReconstructorOptions> = {}): string {
    const reconstructor = new GoReconstructor(options);
    return reconstructor.reconstructEntities(entities);
} 