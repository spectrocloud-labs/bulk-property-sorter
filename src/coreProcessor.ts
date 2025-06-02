import { TypeScriptParser } from './parser';
import { CSSParser } from './cssParser';
import { GoParser } from './goParser';
import { PropertySorter } from './sorter';
import { TypeScriptReconstructor, ReconstructorOptions } from './reconstructor';
import { CSSReconstructor, CSSReconstructorOptions } from './cssReconstructor';
import { GoReconstructor, GoReconstructorOptions } from './goReconstructor';
import { ParseResult, ParsedEntity } from './types';
import { resolveIndentation, resolveLineEnding, shouldIncludeComments } from './formattingUtils';
import { 
    TypeScriptPropertySorter, 
    CSSPropertySorter, 
    GoPropertySorter
} from './languageSorters';

/**
 * Configuration options for core processing operations without VS Code dependencies
 * 
 * These options control the fundamental behavior of the property sorting system,
 * including sort order, formatting preservation, and comment handling.
 */
export interface CoreProcessorOptions {
    /** Sort order for properties ('asc' for A-Z, 'desc' for Z-A) */
    sortOrder: 'asc' | 'desc';
    /** Whether to preserve original formatting and whitespace */
    preserveFormatting: boolean;
    /** Whether to include comments in the processed output */
    includeComments: boolean;
    /** Indentation style to use (spaces or tabs) */
    indentation: string;
    /** Whether to recursively sort nested object properties */
    sortNestedObjects: boolean;
    /** File type being processed */
    fileType?: 'typescript' | 'javascript' | 'css' | 'scss' | 'sass' | 'less' | 'go';
    /** CSS-specific: Whether to sort by property importance (!important first/last) */
    sortByImportance?: boolean;
    /** CSS-specific: Whether to group vendor-prefixed properties */
    groupVendorPrefixes?: boolean;
    /** Whether to use case-sensitive sorting */
    caseSensitive?: boolean;
    /** Whether to use natural sort order for properties containing numbers */
    naturalSort?: boolean;
    /** Custom property order list - properties matching these names will be sorted first */
    customOrder?: string[];
    /** Whether to group properties by their type before sorting alphabetically */
    groupByType?: boolean;
    /** Whether to prioritize required properties before optional ones */
    prioritizeRequired?: boolean;
    /** TypeScript-specific: Method sorting preference for classes */
    sortMethods?: 'alphabetical' | 'visibility' | 'static-first' | 'lifecycle';
    /** TypeScript-specific: Handle interfaces and classes with different sorting rules */
    separateInterfacesAndClasses?: boolean;
    /** TypeScript-specific: Sort import and export statements alphabetically */
    sortImportsExports?: boolean;
    /** TypeScript-specific: Group imports by type (external, internal, relative) */
    groupImportsByType?: boolean;
    /** TypeScript-specific: Preserve method chaining order in object properties */
    preserveMethodChaining?: boolean;
    /** TypeScript-specific: Sort constructor parameters alphabetically */
    sortConstructorParameters?: boolean;
    /** TypeScript-specific: Sort public class members before private/protected */
    prioritizePublicMembers?: boolean;
    /** CSS-specific: Group properties by category before sorting alphabetically */
    groupByCategory?: boolean;
    /** CSS-specific: Preserve original order of media queries */
    preserveMediaQueryOrder?: boolean;
    /** CSS-specific: Sort nested rules in SCSS/SASS/LESS files */
    sortNestedRules?: boolean;
    /** CSS-specific: Group CSS custom properties at the beginning */
    groupVariables?: boolean;
    /** CSS-specific: Sort keyframe percentages in @keyframes rules */
    sortKeyframes?: boolean;
    /** CSS-specific: Preserve standard order of vendor prefixes */
    preserveVendorPrefixOrder?: boolean;
    /** CSS-specific: Sort @import, @use, @forward statements */
    sortAtRules?: boolean;
    /** Go-specific: Struct field sorting preference */
    sortStructFields?: 'alphabetical' | 'by-type' | 'by-size' | 'preserve-tags';
    /** Go-specific: Group embedded struct fields at the beginning */
    groupEmbeddedFields?: boolean;
    /** Go-specific: Sort methods by receiver type name */
    sortMethodReceivers?: boolean;
    /** Go-specific: Preserve struct tag formatting and order */
    preserveStructTags?: boolean;
    /** Go-specific: Group exported fields before unexported fields */
    groupByVisibility?: boolean;
    /** Go-specific: Sort method signatures in interface definitions */
    sortInterfaceMethods?: boolean;
    /** Go-specific: Keep related methods together based on functionality */
    preserveMethodSets?: boolean;
    /** Formatting: Indentation type ('auto', 'spaces', 'tabs') */
    indentationType?: 'auto' | 'spaces' | 'tabs';
    /** Formatting: Number of spaces for indentation when using spaces */
    indentationSize?: number;
    /** Formatting: Line ending style ('auto', 'lf', 'crlf') */
    lineEnding?: 'auto' | 'lf' | 'crlf';
    /** Formatting: Whether to preserve comments (overrides includeComments when false) */
    preserveComments?: boolean;
    /** Formatting: Comment style preference ('preserve', 'single-line', 'multi-line') */
    commentStyle?: 'preserve' | 'single-line' | 'multi-line';
    /** Formatting: Property spacing style ('compact', 'spaced', 'aligned') */
    propertySpacing?: 'compact' | 'spaced' | 'aligned';
    /** Formatting: Trailing comma handling ('preserve', 'add', 'remove') */
    trailingCommas?: 'preserve' | 'add' | 'remove';
    /** Formatting: Add blank lines between property groups */
    blankLinesBetweenGroups?: boolean;
}

/**
 * Result object returned from processing operations containing success status and metadata
 * 
 * This interface provides comprehensive information about the processing operation,
 * including success status, processed content, and any errors or warnings encountered.
 */
export interface ProcessingResult {
    /** Whether the processing operation completed successfully */
    success: boolean;
    /** Number of entities (interfaces, objects, types) that were processed */
    entitiesProcessed: number;
    /** Array of error messages encountered during processing */
    errors: string[];
    /** Array of warning messages that don't prevent processing */
    warnings: string[];
    /** The processed text with sorted properties (only present if successful) */
    processedText?: string;
}

/**
 * Core processor that orchestrates parsing, sorting, and reconstruction without VS Code dependencies
 * 
 * This class provides the main processing pipeline for property sorting, coordinating between
 * the parser, sorter, and reconstructor components to transform TypeScript and CSS code.
 */
export class CoreProcessor {
    /** TypeScript parser for extracting entities and properties from source code */
    private tsParser: TypeScriptParser;
    /** CSS parser for extracting entities and properties from CSS/SCSS/SASS/LESS code */
    private cssParser: CSSParser;
    /** Go parser for extracting entities and properties from Go code */
    private goParser: GoParser;
    /** Property sorter for organizing properties according to specified criteria */
    private sorter: PropertySorter;
    /** Language-specific TypeScript property sorter */
    private tsLanguageSorter: TypeScriptPropertySorter;
    /** Language-specific CSS property sorter */
    private cssLanguageSorter: CSSPropertySorter;
    /** Language-specific Go property sorter */
    private goLanguageSorter: GoPropertySorter;
    /** Code reconstructor for rebuilding TypeScript code from sorted entities */
    private tsReconstructor: TypeScriptReconstructor;
    /** CSS reconstructor for rebuilding CSS code from sorted entities */
    private cssReconstructor: CSSReconstructor;
    /** Go reconstructor for rebuilding Go code from sorted entities */
    private goReconstructor: GoReconstructor;

    /**
     * Creates a new CoreProcessor with default component instances
     * 
     * @example
     * ```typescript
     * // Create a core processor for property sorting
     * const processor = new CoreProcessor();
     * const result = processor.processText(sourceCode);
     * ```
     * 
     * @example
     * ```typescript
     * // Use in a file processing pipeline
     * const processor = new CoreProcessor();
     * const options = { sortOrder: 'desc', preserveFormatting: true };
     * const result = processor.processText(code, options);
     * ```
     */
    constructor() {
        this.tsParser = new TypeScriptParser();
        this.cssParser = new CSSParser();
        this.goParser = new GoParser();
        this.sorter = new PropertySorter();
        this.tsLanguageSorter = new TypeScriptPropertySorter();
        this.cssLanguageSorter = new CSSPropertySorter();
        this.goLanguageSorter = new GoPropertySorter();
        this.tsReconstructor = new TypeScriptReconstructor();
        this.cssReconstructor = new CSSReconstructor();
        this.goReconstructor = new GoReconstructor();
    }

    /**
     * Processes raw text content through the complete parsing, sorting, and reconstruction pipeline
     * 
     * This method coordinates the entire property sorting workflow: parsing TypeScript code to extract
     * entities, sorting their properties according to the specified options, and reconstructing the
     * formatted code with sorted properties.
     * 
     * @param text - The TypeScript source code to process
     * @param options - Processing options that control sorting behavior and output format
     * @returns Processing result containing success status, processed text, and metadata
     * 
     * @example
     * ```typescript
     * // Sort interface properties in ascending order
     * const processor = new CoreProcessor();
     * const code = `interface User { name: string; id: number; email: string; }`;
     * const result = processor.processText(code, { sortOrder: 'asc' });
     * // Result: interface User { email: string; id: number; name: string; }
     * console.log(result.processedText);
     * ```
     * 
     * @example
     * ```typescript
     * // Sort object properties with nested objects in descending order
     * const processor = new CoreProcessor();
     * const code = `const config = { 
     *   zebra: { beta: 1, alpha: 2 }, 
     *   apple: 3, 
     *   banana: { delta: 4, charlie: 5 } 
     * };`;
     * const result = processor.processText(code, { 
     *   sortOrder: 'desc', 
     *   sortNestedObjects: true 
     * });
     * // Result: properties sorted Z-A with nested objects also sorted
     * ```
     */
    public processText(
        text: string,
        options: Partial<CoreProcessorOptions> = {}
    ): ProcessingResult {
        const processingOptions = this.getDefaultOptions(options);
        
        try {
            // Configure components based on options
            this.configureComponents(processingOptions);

            // Parse the text based on file type
            const parseResult = this.parseText(text, processingOptions);
            
            if (parseResult.errors.length > 0) {
                return {
                    success: false,
                    entitiesProcessed: 0,
                    errors: parseResult.errors,
                    warnings: []
                };
            }

            if (parseResult.entities.length === 0) {
                // For CSS files, empty files or files with only comments are valid
                const fileType = processingOptions.fileType || 'typescript';
                if (fileType === 'css' || fileType === 'scss' || fileType === 'sass' || fileType === 'less') {
                    return {
                        success: true,
                        entitiesProcessed: 0,
                        errors: [],
                        warnings: ['No CSS rules found to sort'],
                        processedText: text
                    };
                }
                
                return {
                    success: false,
                    entitiesProcessed: 0,
                    errors: ['No sortable entities found (interfaces, objects, or type aliases)'],
                    warnings: []
                };
            }

            // Check if any entities have properties to sort
            const entitiesWithProperties = parseResult.entities.filter(entity => entity.properties.length > 0);
            const fileType = processingOptions.fileType || 'typescript';
            
            if (entitiesWithProperties.length === 0) {
                // For Go, empty structs are valid and should be processed successfully
                if (fileType === 'go') {
                    return {
                        success: true,
                        entitiesProcessed: parseResult.entities.length,
                        errors: [],
                        warnings: ['No properties found to sort, but entities were processed'],
                        processedText: text
                    };
                }
                
                // For TypeScript/JavaScript, empty interfaces/objects are considered no sortable entities
                return {
                    success: false,
                    entitiesProcessed: 0,
                    errors: ['No sortable entities found (interfaces, objects, or type aliases)'],
                    warnings: []
                };
            }

            // Sort entities
            const sortedEntities = this.sortEntities(parseResult.entities, processingOptions);

            // Check if sorting would make any changes
            const hasChanges = this.hasChanges(parseResult.entities, sortedEntities);
            
            if (!hasChanges) {
                return {
                    success: true,
                    entitiesProcessed: sortedEntities.length,
                    errors: [],
                    warnings: ['Properties are already sorted in the specified order'],
                    processedText: text
                };
            }

            // Reconstruct the code
            const processedText = this.reconstructCode(text, parseResult, sortedEntities);

            return {
                success: true,
                entitiesProcessed: sortedEntities.length,
                errors: [],
                warnings: [],
                processedText
            };

        } catch (error) {
            return {
                success: false,
                entitiesProcessed: 0,
                errors: [`Processing failed: ${error instanceof Error ? error.message : String(error)}`],
                warnings: []
            };
        }
    }

    /**
     * Merges user-provided options with sensible defaults for core processing
     * 
     * This method ensures that all required processing options have values by providing
     * reasonable defaults for any options not specified by the user.
     * 
     * @param options - Partial options provided by the user
     * @returns Complete options object with all required properties set
     */
    private getDefaultOptions(options: Partial<CoreProcessorOptions>): CoreProcessorOptions {
        // Handle null/undefined options
        const safeOptions = options || {};
        
        // Handle legacy indentation option for backward compatibility
        let indentationType: 'auto' | 'spaces' | 'tabs' = safeOptions.indentationType || 'auto';
        let indentationSize = safeOptions.indentationSize || 4;
        let indentation = safeOptions.indentation || '    ';
        
        // If legacy indentation is provided, derive the type and size
        if (safeOptions.indentation) {
            if (safeOptions.indentation === '\t') {
                indentationType = 'tabs';
            } else if (safeOptions.indentation.match(/^ +$/)) {
                indentationType = 'spaces';
                indentationSize = safeOptions.indentation.length;
            }
            indentation = safeOptions.indentation;
        }
        
        return {
            sortOrder: 'asc',
            preserveFormatting: true,
            includeComments: true,
            indentation,
            sortNestedObjects: true,
            fileType: 'typescript',
            caseSensitive: true,
            naturalSort: false,
            customOrder: [],
            groupByType: false,
            prioritizeRequired: false,
            // Go-specific defaults
            sortStructFields: 'alphabetical',
            groupEmbeddedFields: true,
            sortMethodReceivers: false,
            preserveStructTags: true,
            groupByVisibility: true,
            sortInterfaceMethods: true,
            preserveMethodSets: false,
            // Formatting options
            indentationType,
            indentationSize,
            lineEnding: 'auto',
            preserveComments: true,
            commentStyle: 'preserve',
            propertySpacing: 'compact',
            trailingCommas: 'preserve',
            blankLinesBetweenGroups: false,
            ...safeOptions
        };
    }

    /**
     * Parses text using the appropriate parser based on file type
     * 
     * @param text - The source code to parse
     * @param options - Processing options including file type
     * @returns Parse result from the appropriate parser
     */
    private parseText(text: string, options: CoreProcessorOptions): ParseResult {
        const fileType = options.fileType || 'typescript';
        
        if (fileType === 'css' || fileType === 'scss' || fileType === 'sass' || fileType === 'less') {
            // Pass a filename that matches the file type so the parser detects it correctly
            const fileName = `temp.${fileType}`;
            return this.cssParser.parse(text, fileName);
        } else if (fileType === 'go') {
            return this.goParser.parse(text);
        } else {
            return this.tsParser.parse(text);
        }
    }

    /**
     * Configures parser, sorter, and reconstructor components based on processing options
     * 
     * This method initializes each component with the appropriate settings derived from
     * the processing options, ensuring consistent behavior across the processing pipeline.
     * 
     * @param options - Complete processing options to apply to components
     */
    private configureComponents(options: CoreProcessorOptions): void {
        const fileType = options.fileType || 'typescript';
        
        // Resolve formatting options using utilities
        const resolvedIndentation = resolveIndentation(options);
        const resolvedLineEnding = resolveLineEnding(options);
        const resolvedIncludeComments = shouldIncludeComments(options);
        
        // Configure parsers - parsers should not sort, only parse
        this.tsParser = new TypeScriptParser({
            preserveFormatting: options.preserveFormatting,
            includeComments: resolvedIncludeComments,
            sortNestedObjects: options.sortNestedObjects,
            fileType: fileType === 'javascript' ? 'javascript' : 'typescript'
            // Note: sortOrder is NOT passed to parser - sorting is done separately
        });

        this.cssParser = new CSSParser({
            preserveFormatting: options.preserveFormatting,
            includeComments: resolvedIncludeComments,
            sortNestedObjects: options.sortNestedObjects,
            fileType: fileType as 'css' | 'scss' | 'sass' | 'less',
            sortByImportance: options.sortByImportance,
            groupVendorPrefixes: options.groupVendorPrefixes,
            sortKeyframes: options.sortKeyframes,
            groupByCategory: options.groupByCategory
        });

        this.goParser = new GoParser({
            preserveFormatting: options.preserveFormatting,
            includeComments: resolvedIncludeComments,
            sortNestedObjects: options.sortNestedObjects,
            fileType: fileType as 'go'
        });

        // Configure sorter
        this.sorter = new PropertySorter({
            order: options.sortOrder,
            caseSensitive: options.caseSensitive,
            sortNestedObjects: options.sortNestedObjects,
            sortByImportance: options.sortByImportance,
            groupVendorPrefixes: options.groupVendorPrefixes,
            naturalSort: options.naturalSort,
            customOrder: options.customOrder,
            groupByType: options.groupByType,
            prioritizeRequired: options.prioritizeRequired
        });

        // Configure language-specific sorters
        this.tsLanguageSorter = new TypeScriptPropertySorter({
            sortOrder: options.sortOrder,
            sortNestedObjects: options.sortNestedObjects,
            sortMethods: options.sortMethods,
            separateInterfacesAndClasses: options.separateInterfacesAndClasses,
            sortImportsExports: options.sortImportsExports,
            groupImportsByType: options.groupImportsByType,
            preserveMethodChaining: options.preserveMethodChaining,
            sortConstructorParameters: options.sortConstructorParameters,
            prioritizePublicMembers: options.prioritizePublicMembers,
            prioritizeRequired: options.prioritizeRequired
        });

        this.cssLanguageSorter = new CSSPropertySorter({
            sortOrder: options.sortOrder,
            sortNestedObjects: options.sortNestedObjects,
            groupByCategory: options.groupByCategory,
            preserveMediaQueryOrder: options.preserveMediaQueryOrder,
            sortNestedRules: options.sortNestedRules,
            groupVariables: options.groupVariables,
            sortKeyframes: options.sortKeyframes,
            preserveVendorPrefixOrder: options.preserveVendorPrefixOrder,
            sortAtRules: options.sortAtRules,
            groupVendorPrefixes: options.groupVendorPrefixes,
            sortByImportance: options.sortByImportance
        });

        this.goLanguageSorter = new GoPropertySorter({
            sortOrder: options.sortOrder,
            sortNestedObjects: options.sortNestedObjects,
            sortStructFields: options.sortStructFields,
            groupEmbeddedFields: options.groupEmbeddedFields,
            sortMethodReceivers: options.sortMethodReceivers,
            preserveStructTags: options.preserveStructTags,
            groupByVisibility: options.groupByVisibility,
            sortInterfaceMethods: options.sortInterfaceMethods,
            preserveMethodSets: options.preserveMethodSets
        });

        // Configure reconstructors with resolved formatting options
        const tsReconstructorOptions: Partial<ReconstructorOptions> = {
            preserveFormatting: options.preserveFormatting,
            includeComments: resolvedIncludeComments,
            indentation: resolvedIndentation,
            lineEnding: resolvedLineEnding,
            commentStyle: options.commentStyle,
            propertySpacing: options.propertySpacing,
            trailingCommas: options.trailingCommas,
            blankLinesBetweenGroups: options.blankLinesBetweenGroups
        };
        this.tsReconstructor = new TypeScriptReconstructor(tsReconstructorOptions);

        const cssReconstructorOptions: Partial<CSSReconstructorOptions> = {
            preserveFormatting: options.preserveFormatting,
            includeComments: resolvedIncludeComments,
            indentation: resolvedIndentation,
            fileType: fileType as 'css' | 'scss' | 'sass' | 'less',
            addSemicolons: fileType !== 'sass',
            addBraces: fileType !== 'sass'
        };
        this.cssReconstructor = new CSSReconstructor(cssReconstructorOptions);

        const goReconstructorOptions: Partial<GoReconstructorOptions> = {
            preserveFormatting: options.preserveFormatting,
            includeComments: resolvedIncludeComments,
            indentation: resolvedIndentation
        };
        this.goReconstructor = new GoReconstructor(goReconstructorOptions);
    }

    /**
     * Applies property sorting to all entities using the configured sorter
     * 
     * This method processes each parsed entity by sorting its properties according to
     * the configured sort options, returning new entities with sorted property arrays.
     * 
     * @param entities - Array of parsed entities to sort
     * @param options - Processing options to determine which language-specific sorter to use
     * @returns Array of entities with sorted properties
     */
    private sortEntities(entities: ParsedEntity[], options: CoreProcessorOptions): ParsedEntity[] {
        const fileType = options.fileType || 'typescript';
        
        // Use language-specific sorters based on file type
        if (fileType === 'css' || fileType === 'scss' || fileType === 'sass' || fileType === 'less') {
            // Use CSS language sorter
            return entities.map(entity => ({
                ...entity,
                properties: this.cssLanguageSorter.sortProperties(entity.properties, entity)
            }));
        } else if (fileType === 'go') {
            // Use Go language sorter
            return entities.map(entity => ({
                ...entity,
                properties: this.goLanguageSorter.sortProperties(entity.properties, entity)
            }));
        } else {
            // Use TypeScript language sorter for TypeScript and JavaScript
            return entities.map(entity => ({
                ...entity,
                properties: this.tsLanguageSorter.sortProperties(entity.properties, entity)
            }));
        }
    }

    /**
     * Determines whether sorting would change the order of properties in any entity
     * 
     * This method compares the original entities with their sorted versions to detect
     * if any property reordering would occur, helping to avoid unnecessary processing.
     * 
     * @param originalEntities - The original parsed entities before sorting
     * @param sortedEntities - The entities after sorting has been applied
     * @returns True if sorting would change property order, false if already sorted
     */
    private hasChanges(originalEntities: ParsedEntity[], sortedEntities: ParsedEntity[]): boolean {
        if (originalEntities.length !== sortedEntities.length) {
            return true;
        }

        for (let i = 0; i < originalEntities.length; i++) {
            const original = originalEntities[i];
            const sorted = sortedEntities[i];

            if (original.properties.length !== sorted.properties.length) {
                return true;
            }

            for (let j = 0; j < original.properties.length; j++) {
                if (original.properties[j].name !== sorted.properties[j].name) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Reconstructs complete code with sorted entities while preserving file structure
     * 
     * This method coordinates the reconstruction process, handling both simple single-entity
     * cases and complex multi-entity files that require careful preservation of file structure.
     * 
     * @param originalText - The original source code text
     * @param parseResult - The complete parse result containing all entities
     * @param sortedEntities - The entities with sorted properties
     * @returns Reconstructed code with sorted properties
     */
    private reconstructCode(
        originalText: string,
        parseResult: ParseResult,
        sortedEntities: ParsedEntity[]
    ): string {
        if (sortedEntities.length === 0) {
            return originalText;
        }

        // Determine which reconstructor to use based on file type
        const fileType = parseResult.fileType;
        const isCSS = fileType === 'css' || fileType === 'scss' || fileType === 'sass' || fileType === 'less';
        const isGo = fileType === 'go';

        // For simple cases with single entities, use direct reconstruction
        if (sortedEntities.length === 1) {
            if (isCSS) {
                return this.cssReconstructor.reconstructEntity(sortedEntities[0]);
            } else if (isGo) {
                return this.goReconstructor.reconstructEntity(sortedEntities[0]);
            } else {
                return this.tsReconstructor.reconstructEntity(sortedEntities[0]);
            }
        }

        // For multiple entities, we need to preserve the structure of the original file
        // and replace each entity individually
        if (isCSS) {
            return this.cssReconstructor.reconstruct(originalText, parseResult, sortedEntities);
        } else if (isGo) {
            return this.reconstructMultipleGoEntities(originalText, parseResult, sortedEntities);
        } else {
            return this.reconstructMultipleEntities(originalText, parseResult, sortedEntities);
        }
    }

    /**
     * Reconstructs code with multiple entities while preserving the original file structure
     * 
     * This method handles complex files containing multiple interfaces, objects, or type aliases
     * by carefully replacing each entity in place while maintaining the overall file structure,
     * imports, exports, and other non-entity code.
     * 
     * @param originalText - The original source code text
     * @param parseResult - The complete parse result with entity positions
     * @param sortedEntities - The entities with sorted properties to replace originals
     * @returns Reconstructed code with all entities sorted but file structure preserved
     */
    private reconstructMultipleEntities(
        originalText: string,
        parseResult: ParseResult,
        sortedEntities: ParsedEntity[]
    ): string {
        const lines = originalText.split('\n');
        const entityMap = new Map<string, ParsedEntity>();
        
        // Create a map of entities by their position for easy lookup
        sortedEntities.forEach(entity => {
            const key = `${entity.startLine}-${entity.endLine}-${entity.name}`;
            entityMap.set(key, entity);
        });

        // Process entities in reverse order to avoid line number shifts
        const sortedByPosition = [...parseResult.entities].sort((a, b) => b.startLine - a.startLine);

        for (const originalEntity of sortedByPosition) {
            const key = `${originalEntity.startLine}-${originalEntity.endLine}-${originalEntity.name}`;
            const sortedEntity = entityMap.get(key);
            
            if (sortedEntity) {
                // Reconstruct this entity
                const reconstructedEntity = this.tsReconstructor.reconstructEntity(sortedEntity);
                const reconstructedLines = reconstructedEntity.split('\n');
                
                // Calculate the actual start line including leading comments
                // The entity's startLine/endLine don't include leading comments,
                // but the reconstructed entity does include them, so we need to
                // replace from the first comment line to avoid duplication
                let actualStartLine = originalEntity.startLine;
                if (originalEntity.leadingComments.length > 0) {
                    // Find the earliest comment line
                    const earliestCommentLine = Math.min(...originalEntity.leadingComments.map(c => c.line));
                    actualStartLine = earliestCommentLine;
                }
                
                // Replace the original entity lines (including comments) with reconstructed ones
                const startIndex = actualStartLine - 1; // Convert to 0-based
                const endIndex = originalEntity.endLine - 1;
                const deleteCount = endIndex - startIndex + 1;
                
                lines.splice(startIndex, deleteCount, ...reconstructedLines);
            }
        }

        return lines.join('\n');
    }

    /**
     * Reconstructs code with multiple entities while preserving the original file structure
     * 
     * This method handles complex files containing multiple interfaces, objects, or type aliases
     * by carefully replacing each entity in place while maintaining the overall file structure,
     * imports, exports, and other non-entity code.
     * 
     * @param originalText - The original source code text
     * @param parseResult - The complete parse result with entity positions
     * @param sortedEntities - The entities with sorted properties to replace originals
     * @returns Reconstructed code with all entities sorted but file structure preserved
     */
    private reconstructMultipleGoEntities(
        originalText: string,
        parseResult: ParseResult,
        sortedEntities: ParsedEntity[]
    ): string {
        const lines = originalText.split('\n');
        const entityMap = new Map<string, ParsedEntity>();
        
        // Create a map of entities by their position for easy lookup
        sortedEntities.forEach(entity => {
            const key = `${entity.startLine}-${entity.endLine}-${entity.name}`;
            entityMap.set(key, entity);
        });

        // Process entities in reverse order to avoid line number shifts
        const sortedByPosition = [...parseResult.entities].sort((a, b) => b.startLine - a.startLine);

        for (const originalEntity of sortedByPosition) {
            const key = `${originalEntity.startLine}-${originalEntity.endLine}-${originalEntity.name}`;
            const sortedEntity = entityMap.get(key);
            
            if (sortedEntity) {
                // Reconstruct this entity
                const reconstructedEntity = this.goReconstructor.reconstructEntity(sortedEntity);
                const reconstructedLines = reconstructedEntity.split('\n');
                
                // Calculate the actual start line including leading comments
                // The entity's startLine/endLine don't include leading comments,
                // but the reconstructed entity does include them, so we need to
                // replace from the first comment line to avoid duplication
                let actualStartLine = originalEntity.startLine;
                if (originalEntity.leadingComments.length > 0) {
                    // Find the earliest comment line
                    const earliestCommentLine = Math.min(...originalEntity.leadingComments.map(c => c.line));
                    actualStartLine = earliestCommentLine;
                }
                
                // Replace the original entity lines (including comments) with reconstructed ones
                const startIndex = actualStartLine - 1; // Convert to 0-based
                const endIndex = originalEntity.endLine - 1;
                const deleteCount = endIndex - startIndex + 1;
                
                lines.splice(startIndex, deleteCount, ...reconstructedLines);
            }
        }

        return lines.join('\n');
    }
}

/**
 * Convenience function to create a core processor and process text in a single operation
 * 
 * This function provides a quick way to process TypeScript code without manually creating
 * and configuring a CoreProcessor instance, ideal for one-off processing operations.
 * 
 * @param text - The TypeScript source code to process
 * @param options - Processing options to control sorting behavior
 * @returns Processing result with sorted properties and metadata
 * 
 * @example
 * ```typescript
 * // Quick processing of TypeScript code
 * const code = `interface Config { zebra: string; apple: number; banana: boolean; }`;
 * const result = processText(code, { sortOrder: 'asc' });
 * console.log(result.processedText);
 * // Output: interface Config { apple: number; banana: boolean; zebra: string; }
 * ```
 * 
 * @example
 * ```typescript
 * // Process with custom formatting options
 * const code = `const obj = { c: 3, a: 1, b: 2 };`;
 * const result = processText(code, { 
 *   sortOrder: 'desc', 
 *   preserveFormatting: false,
 *   indentation: '\t' 
 * });
 * // Result: object properties sorted in descending order with tab indentation
 * ```
 */
export function processText(
    text: string,
    options: Partial<CoreProcessorOptions> = {}
): ProcessingResult {
    const processor = new CoreProcessor();
    return processor.processText(text, options);
} 