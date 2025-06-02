import { ParsedEntity, ParsedProperty, ParseResult } from './types';

/**
 * Configuration options for CSS reconstruction operations
 * 
 * These options control how the CSS code is rebuilt from parsed entities,
 * including formatting, indentation, and file type specific syntax.
 */
export interface CSSReconstructorOptions {
    /** Indentation style to use (spaces or tabs) */
    indentation: string;
    /** Whether to preserve original formatting where possible */
    preserveFormatting: boolean;
    /** Whether to include comments in the output */
    includeComments: boolean;
    /** File type being reconstructed */
    fileType: 'css' | 'scss' | 'sass' | 'less';
    /** Whether to add semicolons after properties (SASS may omit them) */
    addSemicolons: boolean;
    /** Whether to add braces around rule bodies (SASS uses indentation) */
    addBraces: boolean;
}

/**
 * CSS reconstructor that rebuilds CSS code from parsed entities with sorted properties
 * 
 * This class takes parsed CSS entities and reconstructs them into properly formatted
 * CSS, SCSS, SASS, or LESS code with sorted properties and preserved formatting.
 */
export class CSSReconstructor {
    /** Current reconstruction configuration options */
    private options: CSSReconstructorOptions;

    /**
     * Creates a new CSSReconstructor with the specified options
     * 
     * @param options - Partial reconstruction options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create reconstructor with default options
     * const reconstructor = new CSSReconstructor();
     * const css = reconstructor.reconstruct(parseResult, entities);
     * ```
     * 
     * @example
     * ```typescript
     * // Create reconstructor for SASS output
     * const reconstructor = new CSSReconstructor({
     *   fileType: 'sass',
     *   addSemicolons: false,
     *   addBraces: false,
     *   indentation: '  '
     * });
     * ```
     */
    constructor(options: Partial<CSSReconstructorOptions> = {}) {
        this.options = {
            indentation: '  ',
            preserveFormatting: true,
            includeComments: true,
            fileType: 'css',
            addSemicolons: true,
            addBraces: true,
            ...options
        };
    }

    /**
     * Reconstructs CSS code from a parse result and sorted entities
     * 
     * This method takes the original parse result and sorted entities to rebuild
     * the CSS code with sorted properties while preserving the overall structure.
     * 
     * @param originalText - The original CSS source code
     * @param _parseResult - The original parse result
     * @param sortedEntities - The entities with sorted properties
     * @returns Reconstructed CSS code with sorted properties
     * 
     * @example
     * ```typescript
     * // Reconstruct CSS with sorted properties
     * const reconstructor = new CSSReconstructor();
     * const originalCss = '.button { z-index: 10; background: blue; color: white; }';
     * const parseResult = parser.parse(originalCss);
     * const sortedEntities = sorter.sortMultipleEntities(parseResult.entities);
     * const sortedCss = reconstructor.reconstruct(originalCss, parseResult, sortedEntities);
     * // Result: '.button { background: blue; color: white; z-index: 10; }'
     * ```
     */
    public reconstruct(
        originalText: string,
        _parseResult: ParseResult,
        sortedEntities: ParsedEntity[]
    ): string {
        if (sortedEntities.length === 0) {
            return originalText;
        }

        // For CSS files, we need to replace each entity with its sorted version
        let result = originalText;
        
        // Sort entities by their position in the original text (reverse order for replacement)
        const entitiesByPosition = [...sortedEntities].sort((a, b) => b.startLine - a.startLine);
        
        for (const entity of entitiesByPosition) {
            const reconstructedEntity = this.reconstructEntity(entity);
            result = this.replaceEntityInText(result, entity, reconstructedEntity);
        }

        return result;
    }

    /**
     * Reconstructs a single CSS entity with its sorted properties
     * 
     * @param entity - The parsed entity to reconstruct
     * @returns Reconstructed CSS code for the entity
     */
    public reconstructEntity(entity: ParsedEntity): string {
        const lines: string[] = [];
        
        // Add leading comments if enabled
        if (this.options.includeComments && entity.leadingComments.length > 0) {
            for (const comment of entity.leadingComments) {
                lines.push(comment.raw);
            }
        }

        // Add selector/rule declaration
        const selector = entity.name;
        
        if (this.options.fileType === 'sass' && !this.options.addBraces) {
            // SASS indented syntax
            lines.push(selector);
            
            // Add properties with indentation
            for (const property of entity.properties) {
                const propertyLine = this.reconstructProperty(property, this.options.indentation);
                lines.push(this.options.indentation + propertyLine);
            }
        } else {
            // CSS/SCSS/LESS with braces
            lines.push(`${selector} {`);
            
            // Add properties with indentation
            for (const property of entity.properties) {
                const propertyLine = this.reconstructProperty(property, this.options.indentation);
                lines.push(this.options.indentation + propertyLine);
            }
            
            lines.push('}');
        }

        return lines.join('\n');
    }

    /**
     * Reconstructs a single CSS property
     * 
     * @param property - The parsed property to reconstruct
     * @param _baseIndentation - Base indentation for the property
     * @returns Reconstructed CSS property declaration
     */
    private reconstructProperty(property: ParsedProperty, _baseIndentation: string = ''): string {
        let value = property.value;
        
        // Add !important if present
        if (property.important) {
            value += ' !important';
        }
        
        // Format the property
        let propertyDeclaration = `${property.name}: ${value}`;
        
        // Add semicolon if required
        if (this.options.addSemicolons) {
            propertyDeclaration += ';';
        }
        
        // Add property comments if enabled
        if (this.options.includeComments && property.comments.length > 0) {
            const comments = property.comments.map(c => c.raw).join(' ');
            propertyDeclaration += ` ${comments}`;
        }
        
        return propertyDeclaration;
    }

    /**
     * Replaces an entity in the original text with its reconstructed version
     * 
     * @param text - The original text
     * @param entity - The entity to replace
     * @param reconstructedEntity - The reconstructed entity
     * @returns Text with the entity replaced
     */
    private replaceEntityInText(
        text: string,
        entity: ParsedEntity,
        reconstructedEntity: string
    ): string {
        const lines = text.split('\n');
        const startLine = entity.startLine - 1; // Convert to 0-based index
        const endLine = entity.endLine - 1;
        
        // Replace the lines for this entity
        const before = lines.slice(0, startLine);
        const after = lines.slice(endLine + 1);
        const reconstructedLines = reconstructedEntity.split('\n');
        
        return [...before, ...reconstructedLines, ...after].join('\n');
    }

    /**
     * Updates the reconstruction options
     * 
     * @param newOptions - New options to merge with current options
     */
    public updateOptions(newOptions: Partial<CSSReconstructorOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Gets the current reconstruction options
     * 
     * @returns Current reconstruction options
     */
    public getOptions(): CSSReconstructorOptions {
        return { ...this.options };
    }
}

/**
 * Standalone function to reconstruct CSS code from parse results
 * 
 * @param originalText - The original CSS source code
 * @param _parseResult - The original parse result
 * @param sortedEntities - The entities with sorted properties
 * @param options - Reconstruction options
 * @returns Reconstructed CSS code
 */
export function reconstructCSS(
    originalText: string,
    _parseResult: ParseResult,
    sortedEntities: ParsedEntity[],
    options: Partial<CSSReconstructorOptions> = {}
): string {
    const reconstructor = new CSSReconstructor(options);
    return reconstructor.reconstruct(originalText, _parseResult, sortedEntities);
} 