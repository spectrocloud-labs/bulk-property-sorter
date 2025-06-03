import { ParsedEntity, ParsedProperty, PropertyComment } from './types';

/**
 * Configuration options for YAML reconstruction
 */
export interface YAMLReconstructorOptions {
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
    /** Add blank lines between property groups */
    blankLinesBetweenGroups?: boolean;
    /** Whether to preserve YAML anchors and aliases */
    preserveAnchorsAndAliases?: boolean;
    /** Whether to preserve document separators */
    preserveDocumentSeparators?: boolean;
    /** Whether to preserve string styles */
    preserveStringStyles?: boolean;
    /** YAML indentation style */
    yamlIndentationStyle?: 'auto' | '2-spaces' | '4-spaces';
    /** Whether to handle complex keys */
    handleComplexKeys?: boolean;
}

/**
 * Reconstructor for YAML code that rebuilds YAML objects and arrays from sorted entities
 */
export class YAMLReconstructor {
    private options: YAMLReconstructorOptions;

    constructor(options: Partial<YAMLReconstructorOptions> = {}) {
        this.options = {
            preserveFormatting: options.preserveFormatting ?? true,
            includeComments: options.includeComments ?? true,
            indentation: options.indentation ?? '  ',
            lineEnding: options.lineEnding ?? '\n',
            commentStyle: options.commentStyle ?? 'preserve',
            propertySpacing: options.propertySpacing ?? 'spaced',
            blankLinesBetweenGroups: options.blankLinesBetweenGroups ?? false,
            preserveAnchorsAndAliases: options.preserveAnchorsAndAliases ?? true,
            preserveDocumentSeparators: options.preserveDocumentSeparators ?? true,
            preserveStringStyles: options.preserveStringStyles ?? true,
            yamlIndentationStyle: options.yamlIndentationStyle ?? 'auto',
            handleComplexKeys: options.handleComplexKeys ?? true
        };
    }

    /**
     * Reconstructs a single YAML entity (object or array) with sorted properties
     * 
     * @param entity - The parsed entity with sorted properties
     * @returns Reconstructed YAML string
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
        if (entity.type === 'yaml-object') {
            lines.push(...this.reconstructObject(entity));
        } else if (entity.type === 'yaml-array') {
            lines.push(...this.reconstructArray(entity));
        }

        return lines.join(this.options.lineEnding);
    }

    /**
     * Reconstructs a YAML object with sorted properties
     */
    private reconstructObject(entity: ParsedEntity): string[] {
        const lines: string[] = [];

        entity.properties.forEach((property, index) => {
            const isLast = index === entity.properties.length - 1;
            
            // Add property comments if enabled
            if (this.options.includeComments && property.comments.length > 0) {
                property.comments.forEach(comment => {
                    lines.push(this.reconstructComment(comment));
                });
            }

            // Reconstruct the property
            const propertyLines = this.reconstructProperty(property, '', isLast);
            lines.push(...propertyLines);

            // Add blank lines between groups if enabled
            if (this.options.blankLinesBetweenGroups && !isLast) {
                lines.push('');
            }
        });

        return lines;
    }

    /**
     * Reconstructs a YAML array with sorted elements
     */
    private reconstructArray(entity: ParsedEntity): string[] {
        const lines: string[] = [];

        entity.properties.forEach((property, index) => {
            const isLast = index === entity.properties.length - 1;
            
            // Add property comments if enabled
            if (this.options.includeComments && property.comments.length > 0) {
                property.comments.forEach(comment => {
                    lines.push(this.reconstructComment(comment));
                });
            }

            // For arrays, we reconstruct as YAML array elements
            const elementLines = this.reconstructArrayElement(property, '', isLast);
            lines.push(...elementLines);

            // Add blank lines between groups if enabled
            if (this.options.blankLinesBetweenGroups && !isLast) {
                lines.push('');
            }
        });

        return lines;
    }

    /**
     * Reconstructs a single YAML property (key-value pair)
     */
    private reconstructProperty(property: ParsedProperty, indent: string, _isLast: boolean): string[] {
        const lines: string[] = [];
        
        // Check if this is a complex value (object or array)
        const parsedValue = this.parsePropertyValue(property.value);
        
        if (Array.isArray(parsedValue)) {
            // Multi-line array
            lines.push(`${indent}${property.name}:`);
            parsedValue.forEach(item => {
                if (this.isComplexObject(item)) {
                    // Complex object in array
                    lines.push(`${indent}${this.options.indentation}- `);
                    Object.entries(item).forEach(([key, value], index) => {
                        const formattedValue = this.formatScalarValue(value);
                        const objectIndent = index === 0 ? `${indent}${this.options.indentation}  ` : `${indent}${this.options.indentation}  `;
                        lines.push(`${objectIndent}${key}: ${formattedValue}`);
                    });
                } else if (Array.isArray(item)) {
                    // Nested array in array
                    lines.push(`${indent}${this.options.indentation}- `);
                    item.forEach(nestedItem => {
                        const formattedItem = this.formatScalarValue(nestedItem);
                        lines.push(`${indent}${this.options.indentation}  - ${formattedItem}`);
                    });
                } else {
                    // Simple array item
                    const formattedItem = this.formatScalarValue(item);
                    lines.push(`${indent}${this.options.indentation}- ${formattedItem}`);
                }
            });
        } else if (this.isComplexObject(parsedValue)) {
            // Multi-line object
            lines.push(`${indent}${property.name}:`);
            Object.entries(parsedValue).forEach(([key, value]) => {
                const formattedValue = this.formatScalarValue(value);
                lines.push(`${indent}${this.options.indentation}${key}: ${formattedValue}`);
            });
        } else {
            // Simple property
            const formattedValue = this.formatScalarValue(parsedValue);
            lines.push(`${indent}${property.name}: ${formattedValue}`);
        }
        
        return lines;
    }

    /**
     * Reconstructs a single YAML array element
     */
    private reconstructArrayElement(property: ParsedProperty, indent: string, _isLast: boolean): string[] {
        const lines: string[] = [];
        
        // Check if this is a complex value
        const parsedValue = this.parsePropertyValue(property.value);
        
        if (this.isComplexObject(parsedValue)) {
            // Object in array
            lines.push(`${indent}- `);
            Object.entries(parsedValue).forEach(([key, value], index) => {
                const formattedValue = this.formatScalarValue(value);
                const objectIndent = index === 0 ? `${indent}  ` : `${indent}  `;
                lines.push(`${objectIndent}${key}: ${formattedValue}`);
            });
        } else if (Array.isArray(parsedValue)) {
            // Nested array in array (rare but possible)
            lines.push(`${indent}- `);
            parsedValue.forEach(item => {
                const formattedItem = this.formatScalarValue(item);
                lines.push(`${indent}  - ${formattedItem}`);
            });
        } else {
            // Simple value
            const formattedValue = this.formatScalarValue(parsedValue);
            lines.push(`${indent}- ${formattedValue}`);
        }
        
        return lines;
    }

    /**
     * Parses a property value that might be a stringified object/array
     */
    private parsePropertyValue(value: any): any {
        // If it's already an object or array, return it directly
        if (typeof value === 'object' && value !== null) {
            return value;
        }
        
        if (typeof value === 'string') {
            // Try to parse JSON-like strings back to objects/arrays
            if (value.startsWith('{') && value.endsWith('}')) {
                try {
                    // Handle inline object format like "{key: value, key2: value2}"
                    const jsonLike = value.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*): /g, '"$1": ');
                    return JSON.parse(jsonLike);
                } catch {
                    // If parsing fails, treat as a string
                    return value;
                }
            }
            
            if (value.startsWith('[') && value.endsWith(']')) {
                try {
                    return JSON.parse(value);
                } catch {
                    // If parsing fails, treat as a string
                    return value;
                }
            }
            
            // Check for special formats like "Array(n)" or "Object(n properties)"
            if (value.startsWith('Array(') || value.startsWith('Object(')) {
                // These are placeholder values, return as-is for now
                return value;
            }
        }
        
        return value;
    }

    /**
     * Checks if a value is a complex object (not array, primitive, or null)
     */
    private isComplexObject(value: any): boolean {
        return value !== null && 
               typeof value === 'object' && 
               !Array.isArray(value) &&
               !(value instanceof Date) &&
               !(value instanceof RegExp);
    }

    /**
     * Formats a scalar value for YAML output
     */
    private formatScalarValue(value: any): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        if (typeof value === 'string') {
            // Check if the string needs quoting
            if (this.needsQuoting(value)) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        }
        
        if (typeof value === 'boolean') {
            return value.toString();
        }
        
        if (typeof value === 'number') {
            return value.toString();
        }
        
        // Handle objects and arrays that somehow made it to formatScalarValue
        // These should normally be handled by reconstructProperty, but just in case
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '[]';
            }
            // For small arrays with simple values, format inline
            if (value.length <= 3 && value.every(item => typeof item !== 'object')) {
                return `[${value.map(v => this.formatScalarValue(v)).join(', ')}]`;
            }
            // For complex arrays, this shouldn't happen here but return a placeholder
            return `# Complex array (should be handled by parent)`;
        }
        
        if (this.isComplexObject(value)) {
            const keys = Object.keys(value);
            if (keys.length === 0) {
                return '{}';
            }
            // For simple objects with non-object values, format inline
            if (keys.length <= 2 && keys.every(key => typeof value[key] !== 'object')) {
                return `{${keys.map(k => `${k}: ${this.formatScalarValue(value[k])}`).join(', ')}}`;
            }
            // For complex objects, this shouldn't happen here but return a placeholder
            return `# Complex object (should be handled by parent)`;
        }
        
        return String(value);
    }

    /**
     * Determines if a string value needs quoting in YAML
     */
    private needsQuoting(value: string): boolean {
        // YAML special values that need quoting when used as strings
        const yamlSpecialValues = [
            'true', 'false', 'null', 'yes', 'no', 'on', 'off',
            'True', 'False', 'NULL', 'Yes', 'No', 'On', 'Off',
            'TRUE', 'FALSE', 'YES', 'NO', 'ON', 'OFF'
        ];
        
        // Check for special YAML values
        if (yamlSpecialValues.includes(value)) {
            return true;
        }
        
        // Check for numeric values
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
            return true;
        }
        
        // Check for strings that start with special characters
        if (/^[>|&*!%@`]/.test(value)) {
            return true;
        }
        
        // Check for strings containing special characters that might cause issues
        if (/[:[\]{}#]/.test(value)) {
            return true;
        }
        
        return false;
    }

    /**
     * Reconstructs a comment for YAML output
     */
    private reconstructComment(comment: PropertyComment): string {
        if (comment.type === 'single' || this.options.commentStyle === 'single-line') {
            return `# ${comment.text}`;
        } else {
            // YAML doesn't have multi-line comments, so convert to single-line
            const lines = comment.text.split('\n');
            return lines.map(line => `# ${line.trim()}`).join(this.options.lineEnding);
        }
    }
} 