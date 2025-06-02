import { ParsedEntity, ParsedProperty, PropertyComment } from './types';

/**
 * Configuration options for JSON reconstruction
 */
export interface JSONReconstructorOptions {
    /** Whether to preserve original formatting and whitespace */
    preserveFormatting: boolean;
    /** Whether to include comments in the reconstructed output */
    includeComments: boolean;
    /** Indentation string to use (spaces or tabs) */
    indentation: string;
    /** Line ending style to use */
    lineEnding: string;
    /** Comment style preference */
    commentStyle?: 'preserve' | 'single-line' | 'multi-line';
    /** Property spacing style */
    propertySpacing?: 'compact' | 'spaced' | 'aligned';
    /** Trailing comma handling */
    trailingCommas?: 'preserve' | 'add' | 'remove';
    /** Add blank lines between property groups */
    blankLinesBetweenGroups?: boolean;
}

/**
 * Reconstructor for JSON code that rebuilds JSON objects and arrays from sorted entities
 */
export class JSONReconstructor {
    private options: JSONReconstructorOptions;

    constructor(options: Partial<JSONReconstructorOptions> = {}) {
        this.options = {
            preserveFormatting: options.preserveFormatting ?? true,
            includeComments: options.includeComments ?? true,
            indentation: options.indentation ?? '  ',
            lineEnding: options.lineEnding ?? '\n',
            commentStyle: options.commentStyle ?? 'preserve',
            propertySpacing: options.propertySpacing ?? 'spaced',
            trailingCommas: options.trailingCommas ?? 'preserve',
            blankLinesBetweenGroups: options.blankLinesBetweenGroups ?? false
        };
    }

    /**
     * Reconstructs a single JSON entity (object or array) with sorted properties
     * 
     * @param entity - The parsed entity with sorted properties
     * @returns Reconstructed JSON string
     */
    public reconstructEntity(entity: ParsedEntity): string {
        const lines: string[] = [];

        // Add leading comments if enabled
        if (this.options.includeComments && entity.leadingComments.length > 0) {
            entity.leadingComments.forEach(comment => {
                lines.push(this.reconstructComment(comment));
            });
        }

        // Reconstruct the entity based on its type
        if (entity.type === 'json-object') {
            lines.push(...this.reconstructObject(entity));
        } else if (entity.type === 'json-array') {
            lines.push(...this.reconstructArray(entity));
        }

        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstructs a JSON object with sorted properties
     */
    private reconstructObject(entity: ParsedEntity): string[] {
        const lines: string[] = [];
        const indent = this.options.indentation;

        lines.push('{');

        entity.properties.forEach((property, index) => {
            const isLast = index === entity.properties.length - 1;
            
            // Add property comments if enabled
            if (this.options.includeComments && property.comments.length > 0) {
                property.comments.forEach(comment => {
                    lines.push(indent + this.reconstructComment(comment));
                });
            }

            // Reconstruct the property
            const propertyLine = this.reconstructProperty(property, indent, isLast);
            lines.push(propertyLine);

            // Add blank lines between groups if enabled
            if (this.options.blankLinesBetweenGroups && !isLast) {
                lines.push('');
            }
        });

        lines.push('}');
        return lines;
    }

    /**
     * Reconstructs a JSON array with sorted elements
     */
    private reconstructArray(entity: ParsedEntity): string[] {
        const lines: string[] = [];
        const indent = this.options.indentation;

        lines.push('[');

        entity.properties.forEach((property, index) => {
            const isLast = index === entity.properties.length - 1;
            
            // Add property comments if enabled
            if (this.options.includeComments && property.comments.length > 0) {
                property.comments.forEach(comment => {
                    lines.push(indent + this.reconstructComment(comment));
                });
            }

            // For arrays, we just reconstruct the value part
            const valueLine = this.reconstructArrayElement(property, indent, isLast);
            lines.push(valueLine);

            // Add blank lines between groups if enabled
            if (this.options.blankLinesBetweenGroups && !isLast) {
                lines.push('');
            }
        });

        lines.push(']');
        return lines;
    }

    /**
     * Reconstructs a single JSON property (key-value pair)
     */
    private reconstructProperty(property: ParsedProperty, indent: string, isLast: boolean): string {
        const spacing = this.options.propertySpacing === 'compact' ? '' : ' ';
        const comma = this.shouldAddComma(isLast) ? ',' : '';
        
        let propertyLine = '';
        
        // Handle nested objects/arrays
        if (property.value && typeof property.value === 'object') {
            if (Array.isArray(property.value)) {
                // Nested array
                const arrayContent = this.reconstructNestedArray(property.value, indent + this.options.indentation);
                propertyLine = `${indent}"${property.name}":${spacing}${arrayContent}${comma}`;
            } else {
                // Nested object
                const objectContent = this.reconstructNestedObject(property.value, indent + this.options.indentation);
                propertyLine = `${indent}"${property.name}":${spacing}${objectContent}${comma}`;
            }
        } else {
            // Simple property
            const value = this.formatValue(property.value);
            propertyLine = `${indent}"${property.name}":${spacing}${value}${comma}`;
        }
        
        // Add trailing comments if enabled and present
        if (this.options.includeComments && property.trailingComments && property.trailingComments.length > 0) {
            const trailingCommentsText = property.trailingComments
                .map(comment => this.reconstructComment(comment))
                .join(' ');
            propertyLine += ` ${trailingCommentsText}`;
        }
        
        return propertyLine;
    }

    /**
     * Reconstructs a single array element
     */
    private reconstructArrayElement(property: ParsedProperty, indent: string, isLast: boolean): string {
        const comma = this.shouldAddComma(isLast) ? ',' : '';
        
        let elementLine = '';
        
        // Handle nested objects/arrays
        if (property.value && typeof property.value === 'object') {
            if (Array.isArray(property.value)) {
                // Nested array
                const arrayContent = this.reconstructNestedArray(property.value, indent + this.options.indentation);
                elementLine = `${indent}${arrayContent}${comma}`;
            } else {
                // Nested object
                const objectContent = this.reconstructNestedObject(property.value, indent + this.options.indentation);
                elementLine = `${indent}${objectContent}${comma}`;
            }
        } else {
            // Simple value
            const value = this.formatValue(property.value);
            elementLine = `${indent}${value}${comma}`;
        }
        
        // Add trailing comments if enabled and present
        if (this.options.includeComments && property.trailingComments && property.trailingComments.length > 0) {
            const trailingCommentsText = property.trailingComments
                .map(comment => this.reconstructComment(comment))
                .join(' ');
            elementLine += ` ${trailingCommentsText}`;
        }
        
        return elementLine;
    }

    /**
     * Reconstructs a nested object
     */
    private reconstructNestedObject(obj: any, indent: string): string {
        const lines: string[] = ['{'];
        const keys = Object.keys(obj);
        
        // Sort the keys alphabetically to ensure consistent output
        keys.sort();
        
        keys.forEach((key, index) => {
            const isLast = index === keys.length - 1;
            const value = this.formatValue(obj[key]);
            const comma = this.shouldAddComma(isLast) ? ',' : '';
            const spacing = this.options.propertySpacing === 'compact' ? '' : ' ';
            
            lines.push(`${indent + this.options.indentation}"${key}":${spacing}${value}${comma}`);
        });
        
        lines.push(indent + '}');
        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstructs a nested array
     */
    private reconstructNestedArray(arr: any[], indent: string): string {
        const lines: string[] = ['['];
        
        arr.forEach((item, index) => {
            const isLast = index === arr.length - 1;
            const value = this.formatValue(item);
            const comma = this.shouldAddComma(isLast) ? ',' : '';
            
            lines.push(`${indent + this.options.indentation}${value}${comma}`);
        });
        
        lines.push(indent + ']');
        return lines.join(this.options.lineEnding);
    }

    /**
     * Formats a JSON value for output
     */
    private formatValue(value: any): string {
        if (value === null || value === 'null') {
            return 'null';
        }
        if (typeof value === 'string') {
            // Check if value is already a JSON-formatted string (starts and ends with quotes)
            if (value.startsWith('"') && value.endsWith('"')) {
                // Value is already a JSON-formatted string from the parser
                return value;
            } else {
                // Raw string value from nested object, needs to be JSON-formatted
                return `"${value}"`;
            }
        }
        if (typeof value === 'boolean' || typeof value === 'number') {
            return String(value);
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    /**
     * Reconstructs a comment based on the configured style
     */
    private reconstructComment(comment: PropertyComment): string {
        if (this.options.commentStyle === 'preserve') {
            return comment.raw;
        }
        
        // For JSON, we only support single-line comments in JSONC
        if (comment.type === 'single') {
            return comment.raw;
        }
        
        // Convert multi-line comments to single-line for JSONC
        if (comment.type === 'multi') {
            return `// ${comment.text}`;
        }
        
        return comment.raw;
    }

    /**
     * Determines whether to add a comma based on trailing comma settings
     */
    private shouldAddComma(isLast: boolean): boolean {
        if (this.options.trailingCommas === 'add') {
            return true;
        }
        if (this.options.trailingCommas === 'remove') {
            return !isLast;
        }
        // 'preserve' - don't add comma for last item
        return !isLast;
    }
} 