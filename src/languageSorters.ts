import { ParsedProperty, ParsedEntity } from './types';

/**
 * Language-specific sorting options for TypeScript
 */
export interface TypeScriptSortOptions {
    /** Sort order: ascending (A-Z) or descending (Z-A) */
    sortOrder?: 'asc' | 'desc';
    /** Whether to recursively sort nested object properties */
    sortNestedObjects?: boolean;
    /** Method sorting preference for classes */
    sortMethods?: 'alphabetical' | 'visibility' | 'static-first' | 'lifecycle';
    /** Handle interfaces and classes with different sorting rules */
    separateInterfacesAndClasses?: boolean;
    /** Sort import and export statements alphabetically */
    sortImportsExports?: boolean;
    /** Group imports by type (external, internal, relative) */
    groupImportsByType?: boolean;
    /** Preserve method chaining order in object properties */
    preserveMethodChaining?: boolean;
    /** Sort constructor parameters alphabetically */
    sortConstructorParameters?: boolean;
    /** Sort public class members before private/protected */
    prioritizePublicMembers?: boolean;
    /** Whether to prioritize required properties before optional ones */
    prioritizeRequired?: boolean;
}

/**
 * Language-specific sorting options for CSS/SCSS/SASS/LESS
 */
export interface CSSSortOptions {
    /** Sort order: ascending (A-Z) or descending (Z-A) */
    sortOrder?: 'asc' | 'desc';
    /** Whether to recursively sort nested object properties */
    sortNestedObjects?: boolean;
    /** Group properties by category before sorting alphabetically */
    groupByCategory?: boolean;
    /** Preserve original order of media queries */
    preserveMediaQueryOrder?: boolean;
    /** Sort nested rules in SCSS/SASS/LESS files */
    sortNestedRules?: boolean;
    /** Group CSS custom properties at the beginning */
    groupVariables?: boolean;
    /** Sort keyframe percentages in @keyframes rules */
    sortKeyframes?: boolean;
    /** Preserve standard order of vendor prefixes */
    preserveVendorPrefixOrder?: boolean;
    /** Sort @import, @use, @forward statements */
    sortAtRules?: boolean;
    /** Group vendor-prefixed properties */
    groupVendorPrefixes?: boolean;
    /** Sort by property importance (!important first/last) */
    sortByImportance?: boolean;
}

/**
 * Language-specific sorting options for Go
 */
export interface GoSortOptions {
    /** Sort order: ascending (A-Z) or descending (Z-A) */
    sortOrder?: 'asc' | 'desc';
    /** Whether to recursively sort nested object properties */
    sortNestedObjects?: boolean;
    /** Struct field sorting preference */
    sortStructFields?: 'alphabetical' | 'by-type' | 'by-size' | 'preserve-tags';
    /** Group embedded struct fields at the beginning */
    groupEmbeddedFields?: boolean;
    /** Sort methods by receiver type name */
    sortMethodReceivers?: boolean;
    /** Preserve struct tag formatting and order */
    preserveStructTags?: boolean;
    /** Group exported fields before unexported fields */
    groupByVisibility?: boolean;
    /** Sort method signatures in interface definitions */
    sortInterfaceMethods?: boolean;
    /** Keep related methods together based on functionality */
    preserveMethodSets?: boolean;
}

/**
 * Language-specific sorting options for JSON
 */
export interface JSONSortOptions {
    /** Sort order: ascending (A-Z) or descending (Z-A) */
    sortOrder?: 'asc' | 'desc';
    /** Whether to recursively sort nested object properties */
    sortNestedObjects?: boolean;
    /** Whether to preserve original formatting and whitespace */
    preserveFormatting?: boolean;
    /** Whether to include comments in the reconstructed output */
    includeComments?: boolean;
    /** Indentation string to use (spaces or tabs) */
    indentation?: string;
    /** Line ending style to use */
    lineEnding?: string;
    /** Comment style preference */
    commentStyle?: 'preserve' | 'single-line' | 'multi-line';
    /** Property spacing style */
    propertySpacing?: 'compact' | 'spaced' | 'aligned';
    /** Trailing comma handling */
    trailingCommas?: 'preserve' | 'add' | 'remove';
    /** Add blank lines between property groups */
    blankLinesBetweenGroups?: boolean;
    /** Whether to sort object keys alphabetically */
    sortObjectKeys?: boolean;
    /** Whether to preserve array order instead of sorting elements */
    preserveArrayOrder?: boolean;
    /** Custom key order list for JSON objects */
    customKeyOrder?: string[];
    /** Group properties by common schema patterns */
    groupBySchema?: boolean;
}

/**
 * Combined language-specific sorting options
 */
export interface LanguageSortOptions {
    typescript?: TypeScriptSortOptions;
    css?: CSSSortOptions;
    go?: GoSortOptions;
    json?: JSONSortOptions;
}

/**
 * TypeScript-specific property sorter
 */
export class TypeScriptPropertySorter {
    private options: TypeScriptSortOptions;

    constructor(options: TypeScriptSortOptions = {}) {
        this.options = {
            sortOrder: 'asc',
            sortNestedObjects: false,
            sortMethods: 'alphabetical',
            separateInterfacesAndClasses: false,
            sortImportsExports: false,
            groupImportsByType: false,
            preserveMethodChaining: true,
            sortConstructorParameters: false,
            prioritizePublicMembers: false,
            prioritizeRequired: false,
            ...options
        };
    }

    /**
     * Sort properties with TypeScript-specific logic
     */
    public sortProperties(properties: ParsedProperty[], entity?: ParsedEntity): ParsedProperty[] {
        if (!properties || properties.length === 0) {
            return properties;
        }

        // Create a copy to avoid mutating the original array
        let sortedProperties = [...properties];

        // Apply TypeScript-specific sorting based on entity type
        if (entity) {
            switch (entity.type) {
                case 'interface':
                    sortedProperties = this.sortInterfaceProperties(sortedProperties);
                    break;
                case 'object':
                    sortedProperties = this.sortObjectProperties(sortedProperties);
                    break;
                case 'type':
                    sortedProperties = this.sortTypeProperties(sortedProperties);
                    break;
                default:
                    sortedProperties = this.sortGenericProperties(sortedProperties);
            }
        } else {
            sortedProperties = this.sortGenericProperties(sortedProperties);
        }

        // Handle nested object sorting if enabled
        if (this.options.sortNestedObjects) {
            sortedProperties = this.sortNestedProperties(sortedProperties);
        }

        return sortedProperties;
    }

    /**
     * Sort interface properties with TypeScript-specific rules
     */
    private sortInterfaceProperties(properties: ParsedProperty[]): ParsedProperty[] {
        let sorted = [...properties];

        // Group by required vs optional if prioritizeRequired is enabled
        if (this.options.prioritizeRequired) {
            sorted = this.groupByRequiredOptional(sorted);
        }
        // Group by required vs optional if prioritizePublicMembers is enabled
        else if (this.options.prioritizePublicMembers) {
            sorted = this.groupByRequiredOptional(sorted);
        }
        // Sort alphabetically only if no grouping is applied
        else {
            sorted = this.sortAlphabetically(sorted);
        }

        return sorted;
    }

    /**
     * Sort object properties
     */
    private sortObjectProperties(properties: ParsedProperty[]): ParsedProperty[] {
        let sorted = [...properties];

        // Group by required vs optional if prioritizeRequired is enabled
        if (this.options.prioritizeRequired) {
            sorted = this.groupByRequiredOptional(sorted);
            return sorted; // Return early as groupByRequiredOptional handles sorting within groups
        }

        // Preserve method chaining if enabled
        if (this.options.preserveMethodChaining) {
            sorted = this.preserveMethodChains(sorted);
        } else {
            // Sort alphabetically only if method chaining preservation is disabled
            sorted = this.sortAlphabetically(sorted);
        }

        return sorted;
    }

    /**
     * Sort type alias properties
     */
    private sortTypeProperties(properties: ParsedProperty[]): ParsedProperty[] {
        return this.sortAlphabetically([...properties]);
    }

    /**
     * Generic property sorting
     */
    private sortGenericProperties(properties: ParsedProperty[]): ParsedProperty[] {
        return this.sortAlphabetically([...properties]);
    }

    /**
     * Group properties by required vs optional
     */
    private groupByRequiredOptional(properties: ParsedProperty[]): ParsedProperty[] {
        const required = properties.filter(p => !p.optional);
        const optional = properties.filter(p => p.optional);
        
        // Sort each group alphabetically
        const sortedRequired = this.sortAlphabetically(required);
        const sortedOptional = this.sortAlphabetically(optional);
        
        return [...sortedRequired, ...sortedOptional];
    }

    /**
     * Preserve method chaining order
     */
    private preserveMethodChains(properties: ParsedProperty[]): ParsedProperty[] {
        if (!this.options.preserveMethodChaining) {
            return properties;
        }

        // Detect properties that contain method chaining
        const chainedProperties: ParsedProperty[] = [];
        const regularProperties: ParsedProperty[] = [];

        properties.forEach(property => {
            if (this.hasMethodChaining(property.value)) {
                chainedProperties.push(property);
            } else {
                regularProperties.push(property);
            }
        });

        // Sort regular properties alphabetically, but preserve order of chained properties
        const sortedRegular = this.sortAlphabetically(regularProperties);
        
        // Combine: chained properties first (in original order), then sorted regular properties
        return [...chainedProperties, ...sortedRegular];
    }

    /**
     * Detect if a property value contains method chaining
     */
    private hasMethodChaining(value: string): boolean {
        if (!value || typeof value !== 'string') {
            return false;
        }

        // Remove string literals and comments to avoid false positives
        const cleanValue = value
            .replace(/'[^']*'/g, '""')  // Remove single-quoted strings
            .replace(/"[^"]*"/g, '""')  // Remove double-quoted strings
            .replace(/`[^`]*`/g, '""')  // Remove template literals
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
            .replace(/\/\/.*$/gm, '');  // Remove single-line comments

        // Look for method chaining patterns:
        // 1. Multiple dots with method calls: .method().method()
        // 2. Fluent API patterns: .then().catch()
        // 3. Builder patterns: .set().build()
        const methodChainPatterns = [
            /\.\w+\([^)]*\)\s*\.\w+\([^)]*\)/, // .method().method()
            /\.\w+\([^)]*\)\s*\.\w+/, // .method().property
            /\w+\([^)]*\)\s*\.\w+\([^)]*\)/, // function().method()
        ];

        return methodChainPatterns.some(pattern => pattern.test(cleanValue));
    }

    /**
     * Sort properties alphabetically, considering visibility grouping
     */
    private sortAlphabeticallyWithVisibility(properties: ParsedProperty[]): ParsedProperty[] {
        if (!this.options.prioritizePublicMembers) {
            return this.sortAlphabetically(properties);
        }

        const exported = properties.filter(p => !p.optional);
        const unexported = properties.filter(p => p.optional);
        
        const sortedExported = this.sortAlphabetically(exported);
        const sortedUnexported = this.sortAlphabetically(unexported);
        
        return [...sortedExported, ...sortedUnexported];
    }

    /**
     * Sort properties alphabetically
     */
    private sortAlphabetically(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const comparison = nameA.localeCompare(nameB);
            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Sort nested object properties recursively
     */
    private sortNestedProperties(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.map(property => {
            // If the property has nested properties, sort them recursively
            if (property.nestedProperties && property.nestedProperties.length > 0) {
                return {
                    ...property,
                    nestedProperties: this.sortProperties(property.nestedProperties)
                };
            }
            return property;
        });
    }

    /**
     * Update sorting options
     */
    public updateOptions(newOptions: Partial<TypeScriptSortOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current options
     */
    public getOptions(): TypeScriptSortOptions {
        return { ...this.options };
    }
}

/**
 * CSS-specific property sorter
 */
export class CSSPropertySorter {
    private options: CSSSortOptions;

    // CSS property categories for grouping
    private static readonly PROPERTY_CATEGORIES = {
        positioning: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
        display: ['display', 'visibility', 'opacity', 'overflow', 'overflow-x', 'overflow-y'],
        flexbox: ['flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content', 'align-items', 'align-content', 'align-self', 'order', 'flex-grow', 'flex-shrink', 'flex-basis'],
        grid: ['grid', 'grid-template', 'grid-template-rows', 'grid-template-columns', 'grid-template-areas', 'grid-gap', 'grid-row-gap', 'grid-column-gap'],
        boxModel: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
        border: ['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-width', 'border-style', 'border-color', 'border-radius'],
        background: ['background', 'background-color', 'background-image', 'background-repeat', 'background-position', 'background-size', 'background-attachment'],
        typography: ['font', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align', 'text-decoration', 'text-transform', 'letter-spacing', 'word-spacing'],
        animation: ['animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'],
        transition: ['transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
        transform: ['transform', 'transform-origin', 'transform-style', 'perspective', 'perspective-origin']
    };

    constructor(options: CSSSortOptions = {}) {
        this.options = {
            sortOrder: 'asc',
            sortNestedObjects: false,
            groupByCategory: false,
            preserveMediaQueryOrder: true,
            sortNestedRules: false,
            groupVariables: true,
            sortKeyframes: false,
            preserveVendorPrefixOrder: true,
            sortAtRules: false,
            groupVendorPrefixes: false,
            sortByImportance: false,
            ...options
        };
    }

    /**
     * Sort CSS properties with CSS-specific logic
     */
    public sortProperties(properties: ParsedProperty[], entity?: ParsedEntity): ParsedProperty[] {
        if (!properties || properties.length === 0) {
            return properties;
        }

        // Handle keyframe sorting if this is a keyframe entity and the option is enabled
        if (this.options.sortKeyframes && entity && entity.type === 'css-keyframe') {
            return this.sortKeyframeProperties(properties);
        }

        let sorted = [...properties];

        // Group CSS custom properties (variables) at the beginning
        if (this.options.groupVariables) {
            sorted = this.groupVariables(sorted);
        }

        // Group by category if enabled
        if (this.options.groupByCategory) {
            sorted = this.groupByCategory(sorted);
            // Don't apply overall alphabetical sorting when grouping by category
            // as it would destroy the category grouping
            return sorted;
        }

        // Group vendor prefixes if enabled
        if (this.options.groupVendorPrefixes) {
            sorted = this.groupVendorPrefixes(sorted);
        }

        // Sort alphabetically within groups (handles importance internally)
        sorted = this.sortAlphabetically(sorted);

        return sorted;
    }

    /**
     * Sort keyframe properties by percentage order
     */
    private sortKeyframeProperties(properties: ParsedProperty[]): ParsedProperty[] {
        // For keyframe properties, we want to sort the CSS properties within each keyframe
        // normally, but if we're dealing with multiple keyframes, we'd sort them by percentage
        
        // Since this method receives properties from a single keyframe entity,
        // we just sort them normally but respect the keyframe context
        return this.sortAlphabetically([...properties]);
    }

    /**
     * Group CSS custom properties (variables) at the beginning
     */
    private groupVariables(properties: ParsedProperty[]): ParsedProperty[] {
        const variables = properties.filter(p => p.name.startsWith('--'));
        const regular = properties.filter(p => !p.name.startsWith('--'));
        return [...variables, ...regular];
    }

    /**
     * Group properties by CSS category
     */
    private groupByCategory(properties: ParsedProperty[]): ParsedProperty[] {
        const categorized: { [key: string]: ParsedProperty[] } = {};
        const uncategorized: ParsedProperty[] = [];

        // Initialize categories
        Object.keys(CSSPropertySorter.PROPERTY_CATEGORIES).forEach(category => {
            categorized[category] = [];
        });

        // Categorize properties
        properties.forEach(property => {
            let found = false;
            for (const [category, props] of Object.entries(CSSPropertySorter.PROPERTY_CATEGORIES)) {
                if (props.includes(property.name)) {
                    categorized[category].push(property);
                    found = true;
                    break;
                }
            }
            if (!found) {
                uncategorized.push(property);
            }
        });

        // Combine in order: positioning, display, flexbox, grid, boxModel, border, background, typography, animation, transition, transform, uncategorized
        const result: ParsedProperty[] = [];
        const categoryOrder = ['positioning', 'display', 'flexbox', 'grid', 'boxModel', 'border', 'background', 'typography', 'animation', 'transition', 'transform'];
        
        categoryOrder.forEach(category => {
            result.push(...categorized[category]);
        });
        result.push(...uncategorized);

        return result;
    }

    /**
     * Group vendor-prefixed properties
     */
    private groupVendorPrefixes(properties: ParsedProperty[]): ParsedProperty[] {
        const prefixed: { [key: string]: ParsedProperty[] } = {};
        const unprefixed: ParsedProperty[] = [];

        properties.forEach(property => {
            if (property.vendorPrefix) {
                if (!prefixed[property.vendorPrefix]) {
                    prefixed[property.vendorPrefix] = [];
                }
                prefixed[property.vendorPrefix].push(property);
            } else {
                unprefixed.push(property);
            }
        });

        // Standard vendor prefix order
        const prefixOrder = ['-webkit-', '-moz-', '-ms-', '-o-'];
        const result: ParsedProperty[] = [];

        prefixOrder.forEach(prefix => {
            if (prefixed[prefix]) {
                result.push(...prefixed[prefix]);
            }
        });

        // Add any other prefixes
        Object.keys(prefixed).forEach(prefix => {
            if (!prefixOrder.includes(prefix)) {
                result.push(...prefixed[prefix]);
            }
        });

        result.push(...unprefixed);
        return result;
    }

    /**
     * Sort properties alphabetically
     */
    private sortAlphabetically(properties: ParsedProperty[]): ParsedProperty[] {
        // If sortByImportance is enabled, sort within importance groups
        if (this.options.sortByImportance) {
            const important = properties.filter(p => p.important);
            const normal = properties.filter(p => !p.important);
            
            const sortedImportant = important.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                const comparison = nameA.localeCompare(nameB);
                return this.options.sortOrder === 'desc' ? -comparison : comparison;
            });
            
            const sortedNormal = normal.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                const comparison = nameA.localeCompare(nameB);
                return this.options.sortOrder === 'desc' ? -comparison : comparison;
            });
            
            return [...sortedImportant, ...sortedNormal];
        }
        
        // Regular alphabetical sorting
        return properties.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const comparison = nameA.localeCompare(nameB);
            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Update sorting options
     */
    public updateOptions(newOptions: Partial<CSSSortOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current options
     */
    public getOptions(): CSSSortOptions {
        return { ...this.options };
    }
}

/**
 * Go-specific property sorter
 */
export class GoPropertySorter {
    private options: GoSortOptions;

    constructor(options: GoSortOptions = {}) {
        this.options = {
            sortOrder: 'asc',
            sortNestedObjects: false,
            sortStructFields: 'alphabetical',
            groupEmbeddedFields: true,
            sortMethodReceivers: false,
            preserveStructTags: true,
            groupByVisibility: true,
            sortInterfaceMethods: true,
            preserveMethodSets: false,
            ...options
        };
    }

    /**
     * Sort Go properties with Go-specific logic
     */
    public sortProperties(properties: ParsedProperty[], entity?: ParsedEntity): ParsedProperty[] {
        if (!properties || properties.length === 0) {
            return properties;
        }

        let sorted = [...properties];

        // Apply Go-specific sorting based on entity type
        if (entity) {
            switch (entity.type) {
                case 'struct':
                    sorted = this.sortStructFields(sorted);
                    break;
                default:
                    sorted = this.sortGenericProperties(sorted);
            }
        } else {
            sorted = this.sortGenericProperties(sorted);
        }

        return sorted;
    }

    /**
     * Sort struct fields with Go-specific rules
     */
    private sortStructFields(properties: ParsedProperty[]): ParsedProperty[] {
        let sorted = [...properties];

        // Group embedded fields at the beginning if enabled
        if (this.options.groupEmbeddedFields) {
            sorted = this.groupEmbeddedFields(sorted);
        }

        // Sort based on the specified strategy, considering visibility grouping
        switch (this.options.sortStructFields) {
            case 'alphabetical':
                sorted = this.sortAlphabeticallyWithVisibility(sorted);
                break;
            case 'by-type':
                sorted = this.sortByTypeWithVisibility(sorted);
                break;
            case 'by-size':
                sorted = this.sortBySizeWithVisibility(sorted);
                break;
            case 'preserve-tags':
                sorted = this.sortPreservingTags(sorted);
                break;
            default:
                sorted = this.sortAlphabeticallyWithVisibility(sorted);
        }

        return sorted;
    }

    /**
     * Group embedded fields at the beginning
     */
    private groupEmbeddedFields(properties: ParsedProperty[]): ParsedProperty[] {
        const embedded = properties.filter(p => p.isEmbedded);
        const regular = properties.filter(p => !p.isEmbedded);
        return [...embedded, ...regular];
    }

    /**
     * Group by visibility (exported vs unexported)
     */
    private groupByVisibility(properties: ParsedProperty[]): ParsedProperty[] {
        const exported = properties.filter(p => this.isExported(p.name));
        const unexported = properties.filter(p => !this.isExported(p.name));
        return [...exported, ...unexported];
    }

    /**
     * Check if a field name is exported (starts with uppercase)
     */
    private isExported(name: string): boolean {
        return name.length > 0 && name[0] === name[0].toUpperCase();
    }

    /**
     * Sort properties alphabetically, considering visibility grouping
     */
    private sortAlphabeticallyWithVisibility(properties: ParsedProperty[]): ParsedProperty[] {
        if (!this.options.groupByVisibility) {
            return this.sortAlphabetically(properties);
        }

        const exported = properties.filter(p => this.isExported(p.name));
        const unexported = properties.filter(p => !this.isExported(p.name));
        
        const sortedExported = this.sortAlphabetically(exported);
        const sortedUnexported = this.sortAlphabetically(unexported);
        
        return [...sortedExported, ...sortedUnexported];
    }

    /**
     * Sort by type, considering visibility grouping
     */
    private sortByTypeWithVisibility(properties: ParsedProperty[]): ParsedProperty[] {
        if (!this.options.groupByVisibility) {
            return this.sortByType(properties);
        }

        const exported = properties.filter(p => this.isExported(p.name));
        const unexported = properties.filter(p => !this.isExported(p.name));
        
        const sortedExported = this.sortByType(exported);
        const sortedUnexported = this.sortByType(unexported);
        
        return [...sortedExported, ...sortedUnexported];
    }

    /**
     * Sort by type
     */
    private sortByType(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.sort((a, b) => {
            const typeA = a.value.toLowerCase();
            const typeB = b.value.toLowerCase();
            let typeComparison = typeA.localeCompare(typeB);
            if (typeComparison !== 0) {
                typeComparison = this.options.sortOrder === 'desc' ? -typeComparison : typeComparison;
                return typeComparison;
            }
            // If types are the same, sort by name
            const nameComparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            return this.options.sortOrder === 'desc' ? -nameComparison : nameComparison;
        });
    }

    /**
     * Sort by size, considering visibility grouping
     */
    private sortBySizeWithVisibility(properties: ParsedProperty[]): ParsedProperty[] {
        if (!this.options.groupByVisibility) {
            return this.sortBySize(properties);
        }

        const exported = properties.filter(p => this.isExported(p.name));
        const unexported = properties.filter(p => !this.isExported(p.name));
        
        const sortedExported = this.sortBySize(exported);
        const sortedUnexported = this.sortBySize(unexported);
        
        return [...sortedExported, ...sortedUnexported];
    }

    /**
     * Sort by estimated size (basic heuristic)
     */
    private sortBySize(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.sort((a, b) => {
            const sizeA = this.getTypeSize(a.value);
            const sizeB = this.getTypeSize(b.value);
            if (sizeA !== sizeB) {
                const sizeComparison = sizeA - sizeB;
                return this.options.sortOrder === 'desc' ? -sizeComparison : sizeComparison;
            }
            // If sizes are the same, sort by name
            const nameComparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            return this.options.sortOrder === 'desc' ? -nameComparison : nameComparison;
        });
    }

    /**
     * Get estimated type size for sorting (enhanced version)
     */
    private getTypeSize(type: string): number {
        const sizeMap: { [key: string]: number } = {
            // Basic types
            'bool': 1,
            'byte': 1,
            'rune': 4,
            'int8': 1,
            'uint8': 1,
            'int16': 2,
            'uint16': 2,
            'int32': 4,
            'uint32': 4,
            'int64': 8,
            'uint64': 8,
            'int': 8,    // Platform dependent, assume 64-bit
            'uint': 8,   // Platform dependent, assume 64-bit
            'uintptr': 8,
            'float32': 4,
            'float64': 8,
            'complex64': 8,
            'complex128': 16,
            'string': 16, // pointer + length
            // Interface types
            'interface{}': 16, // 2 pointers (type + value)
            'error': 16,
        };

        // Clean and analyze the type
        const cleanType = type.trim();
        
        // Handle pointers (*Type)
        if (cleanType.startsWith('*')) {
            return 8; // Pointer size on 64-bit systems
        }
        
        // Handle slices ([]Type)
        if (cleanType.startsWith('[]')) {
            return 24; // slice header: pointer + len + cap
        }
        
        // Handle arrays ([n]Type)
        const arrayMatch = cleanType.match(/^\[(\d+)\](.+)$/);
        if (arrayMatch) {
            const arraySize = parseInt(arrayMatch[1], 10);
            const elementType = arrayMatch[2];
            const elementSize = this.getTypeSize(elementType);
            return arraySize * elementSize;
        }
        
        // Handle maps (map[KeyType]ValueType)
        if (cleanType.startsWith('map[')) {
            return 8; // Map is a pointer to runtime map structure
        }
        
        // Handle channels (chan Type, <-chan Type, chan<- Type)
        if (cleanType.includes('chan')) {
            return 8; // Channel is a pointer
        }
        
        // Handle function types (func(...) ...)
        if (cleanType.startsWith('func')) {
            return 8; // Function is a pointer
        }
        
        // Extract base type (remove any remaining decorators)
        const baseType = cleanType.replace(/[[\]*<>-]/g, '').trim();
        
        // Check for qualified types (package.Type)
        const qualifiedMatch = baseType.match(/^(\w+)\.(\w+)$/);
        if (qualifiedMatch) {
            // For qualified types, treat as custom types
            return 999;
        }
        
        // Check basic types
        const size = sizeMap[baseType];
        if (size !== undefined) {
            return size;
        }
        
        // Custom types and structs - assign larger values to sort them last
        // Use type name length as a rough heuristic for consistency
        return 1000 + baseType.length;
    }

    /**
     * Sort while preserving struct tag relationships
     */
    private sortPreservingTags(properties: ParsedProperty[]): ParsedProperty[] {
        // Group fields by their struct tag patterns and relationships
        const groups = this.groupByTagRelationships(properties);
        
        let result: ParsedProperty[] = [];
        
        // Sort within each group and then concatenate
        for (const group of groups) {
            const sortedGroup = this.sortAlphabeticallyWithVisibility(group);
            result = result.concat(sortedGroup);
        }
        
        return result;
    }

    /**
     * Group properties by struct tag relationships
     */
    private groupByTagRelationships(properties: ParsedProperty[]): ParsedProperty[][] {
        if (!properties.length) return [];
        
        const tagGroups = new Map<string, ParsedProperty[]>();
        const noTagProperties: ParsedProperty[] = [];
        
        for (const property of properties) {
            const tagPattern = this.getTagPattern(property.structTags);
            
            if (!tagPattern) {
                noTagProperties.push(property);
                continue;
            }
            
            if (!tagGroups.has(tagPattern)) {
                tagGroups.set(tagPattern, []);
            }
            tagGroups.get(tagPattern)!.push(property);
        }
        
        // Return groups: tagged groups first (sorted by pattern), then untagged
        const result: ParsedProperty[][] = [];
        
        // Sort tag patterns for consistent grouping
        const sortedPatterns = Array.from(tagGroups.keys()).sort();
        for (const pattern of sortedPatterns) {
            result.push(tagGroups.get(pattern)!);
        }
        
        // Add fields without tags at the end
        if (noTagProperties.length > 0) {
            result.push(noTagProperties);
        }
        
        return result;
    }

    /**
     * Extract tag pattern for grouping related fields
     */
    private getTagPattern(structTags?: string): string | null {
        if (!structTags) return null;
        
        // Extract common tag keys to determine grouping
        const jsonMatch = structTags.match(/json:"([^"]+)"/);
        const dbMatch = structTags.match(/db:"([^"]+)"/);
        const xmlMatch = structTags.match(/xml:"([^"]+)"/);
        const gormMatch = structTags.match(/gorm:"([^"]+)"/);
        const validateMatch = structTags.match(/validate:"([^"]+)"/);
        
        // Create a pattern based on which tag types are present
        const tagTypes = [];
        if (jsonMatch) tagTypes.push('json');
        if (dbMatch) tagTypes.push('db');
        if (xmlMatch) tagTypes.push('xml');
        if (gormMatch) tagTypes.push('gorm');
        if (validateMatch) tagTypes.push('validate');
        
        if (tagTypes.length === 0) return null;
        
        // Group by tag type combination (e.g., "json+db", "json+xml", etc.)
        return tagTypes.sort().join('+');
    }

    /**
     * Generic property sorting
     */
    private sortGenericProperties(properties: ParsedProperty[]): ParsedProperty[] {
        return this.sortAlphabetically(properties);
    }

    /**
     * Sort properties alphabetically
     */
    private sortAlphabetically(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const comparison = nameA.localeCompare(nameB);
            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Update sorting options
     */
    public updateOptions(newOptions: Partial<GoSortOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current options
     */
    public getOptions(): GoSortOptions {
        return { ...this.options };
    }
}

/**
 * JSON-specific property sorter
 */
export class JSONPropertySorter {
    private options: JSONSortOptions;

    constructor(options: JSONSortOptions = {}) {
        this.options = {
            sortOrder: 'asc',
            sortNestedObjects: false,
            preserveFormatting: true,
            includeComments: true,
            indentation: '  ',
            lineEnding: '\n',
            commentStyle: 'preserve',
            propertySpacing: 'spaced',
            trailingCommas: 'preserve',
            blankLinesBetweenGroups: false,
            sortObjectKeys: true,
            preserveArrayOrder: true,
            customKeyOrder: [],
            groupBySchema: false,
            ...options
        };
    }

    /**
     * Sort properties with JSON-specific logic
     */
    public sortProperties(properties: ParsedProperty[], entity?: ParsedEntity): ParsedProperty[] {
        if (!properties || properties.length === 0) {
            return properties;
        }

        // Create a copy to avoid mutating the original array
        let sortedProperties = [...properties];

        // Apply JSON-specific sorting based on entity type
        if (entity) {
            switch (entity.type) {
                case 'json-object':
                    sortedProperties = this.sortObjectProperties(sortedProperties);
                    break;
                case 'json-array':
                    sortedProperties = this.sortArrayProperties(sortedProperties);
                    break;
                default:
                    sortedProperties = this.sortGenericProperties(sortedProperties);
            }
        } else {
            sortedProperties = this.sortGenericProperties(sortedProperties);
        }

        // Handle nested object sorting if enabled
        if (this.options.sortNestedObjects) {
            sortedProperties = this.sortNestedProperties(sortedProperties);
        }

        return sortedProperties;
    }

    /**
     * Sort JSON object properties with custom key order and schema grouping
     */
    private sortObjectProperties(properties: ParsedProperty[]): ParsedProperty[] {
        if (!this.options.sortObjectKeys) {
            return properties;
        }

        const sorted = [...properties];

        // Apply custom key order if specified (and return early)
        if (this.options.customKeyOrder && this.options.customKeyOrder.length > 0) {
            return this.applyCustomKeyOrder(sorted);
        }

        // Group by schema patterns if enabled
        if (this.options.groupBySchema) {
            return this.groupBySchema(sorted);
        }

        // Sort alphabetically as fallback
        return this.sortAlphabetically(sorted);
    }

    /**
     * Sort JSON array properties (preserve order by default)
     */
    private sortArrayProperties(properties: ParsedProperty[]): ParsedProperty[] {
        if (this.options.preserveArrayOrder) {
            return properties; // Keep original order
        }

        // Sort array elements alphabetically if preserve order is disabled
        return this.sortAlphabetically([...properties]);
    }

    /**
     * Apply custom key order to properties
     */
    private applyCustomKeyOrder(properties: ParsedProperty[]): ParsedProperty[] {
        const customOrder = this.options.customKeyOrder || [];
        const ordered: ParsedProperty[] = [];
        const remaining: ParsedProperty[] = [];

        // First, add properties in custom order
        customOrder.forEach(key => {
            const prop = properties.find(p => p.name === key);
            if (prop) {
                ordered.push(prop);
            }
        });

        // Then add remaining properties alphabetically
        properties.forEach(prop => {
            if (!customOrder.includes(prop.name)) {
                remaining.push(prop);
            }
        });

        // Sort remaining properties alphabetically
        remaining.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });

        return [...ordered, ...remaining];
    }

    /**
     * Group properties by common JSON schema patterns
     */
    private groupBySchema(properties: ParsedProperty[]): ParsedProperty[] {
        const groups = {
            metadata: [] as ParsedProperty[], // id, type, version, etc.
            required: [] as ParsedProperty[], // name, title, required fields
            optional: [] as ParsedProperty[], // description, optional fields
            nested: [] as ParsedProperty[],   // objects and arrays
            other: [] as ParsedProperty[]     // everything else
        };

        // Common metadata keys
        const metadataKeys = ['id', 'type', 'version', '$schema', '$id', '$ref'];
        // Common required keys
        const requiredKeys = ['name', 'title', 'required', 'properties'];
        // Common optional keys
        const optionalKeys = ['description', 'default', 'example', 'examples'];

        properties.forEach(prop => {
            if (metadataKeys.includes(prop.name)) {
                groups.metadata.push(prop);
            } else if (requiredKeys.includes(prop.name)) {
                groups.required.push(prop);
            } else if (optionalKeys.includes(prop.name)) {
                groups.optional.push(prop);
            } else if (prop.hasNestedObject || this.isComplexValue(prop.value)) {
                groups.nested.push(prop);
            } else {
                groups.other.push(prop);
            }
        });

        // Sort each group alphabetically
        Object.values(groups).forEach(group => {
            group.sort((a, b) => {
                const comparison = a.name.localeCompare(b.name);
                return this.options.sortOrder === 'desc' ? -comparison : comparison;
            });
        });

        return [
            ...groups.metadata,
            ...groups.required,
            ...groups.optional,
            ...groups.nested,
            ...groups.other
        ];
    }

    /**
     * Check if a value is complex (object or array)
     */
    private isComplexValue(value: any): boolean {
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return typeof parsed === 'object' && parsed !== null;
            } catch {
                return false;
            }
        }
        return typeof value === 'object' && value !== null;
    }

    /**
     * Sort properties alphabetically
     */
    private sortAlphabetically(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Sort nested properties recursively
     */
    private sortNestedProperties(properties: ParsedProperty[]): ParsedProperty[] {
        return properties.map(prop => {
            if (prop.nestedProperties && prop.nestedProperties.length > 0) {
                return {
                    ...prop,
                    nestedProperties: this.sortProperties(prop.nestedProperties)
                };
            }
            return prop;
        });
    }

    /**
     * Sort generic properties (fallback)
     */
    private sortGenericProperties(properties: ParsedProperty[]): ParsedProperty[] {
        return this.sortAlphabetically([...properties]);
    }

    /**
     * Update sorting options
     */
    public updateOptions(newOptions: Partial<JSONSortOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current sorting options
     */
    public getOptions(): JSONSortOptions {
        return { ...this.options };
    }
}

/**
 * Factory function to create language-specific sorters
 */
export function createLanguageSorter(
    language: 'typescript' | 'css' | 'go' | 'json',
    options: LanguageSortOptions = {}
): TypeScriptPropertySorter | CSSPropertySorter | GoPropertySorter | JSONPropertySorter {
    switch (language) {
        case 'typescript':
            return new TypeScriptPropertySorter(options.typescript);
        case 'css':
            return new CSSPropertySorter(options.css);
        case 'go':
            return new GoPropertySorter(options.go);
        case 'json':
            return new JSONPropertySorter(options.json);
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
} 