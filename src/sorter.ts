import { ParsedProperty, ParsedEntity } from './types';

/**
 * Configuration options for property sorting operations
 * 
 * These options control how properties are sorted, including order, case sensitivity,
 * comment preservation, and nested object handling.
 */
export interface SortOptions {
    /** Sort order: ascending (A-Z) or descending (Z-A) */
    order: 'asc' | 'desc';
    /** Whether to preserve comment associations with properties */
    preserveComments: boolean;
    /** Whether to sort case-sensitively (A != a) */
    caseSensitive: boolean;
    /** Whether to recursively sort nested object properties */
    sortNestedObjects: boolean;
    /** CSS-specific: Whether to sort by property importance (!important first/last) */
    sortByImportance?: boolean;
    /** CSS-specific: Whether to group vendor-prefixed properties */
    groupVendorPrefixes?: boolean;
    /** Whether to use natural sort order for properties containing numbers */
    naturalSort?: boolean;
    /** Custom property order list - properties matching these names will be sorted first */
    customOrder?: string[];
    /** Whether to group properties by their type before sorting alphabetically */
    groupByType?: boolean;
    /** Whether to prioritize required properties before optional ones */
    prioritizeRequired?: boolean;
}

/**
 * Property sorter class that handles intelligent sorting of parsed TypeScript properties
 * 
 * This class provides sophisticated property sorting capabilities, including numeric sorting,
 * case-insensitive sorting, nested object sorting, and comment preservation.
 */
export class PropertySorter {
    /** Current sorting configuration options */
    private options: SortOptions;

    /**
     * Creates a new PropertySorter with the specified sorting options
     * 
     * @param options - Partial sort options that will be merged with defaults
     * 
     * @example
     * ```typescript
     * // Create sorter with default options (ascending, case-insensitive)
     * const sorter = new PropertySorter();
     * const sorted = sorter.sortProperties(properties);
     * ```
     * 
     * @example
     * ```typescript
     * // Create sorter with custom options
     * const sorter = new PropertySorter({
     *   order: 'desc',
     *   caseSensitive: true,
     *   sortNestedObjects: false
     * });
     * ```
     */
    constructor(options: Partial<SortOptions> = {}) {
        this.options = {
            order: 'asc',
            preserveComments: true,
            caseSensitive: false,
            sortNestedObjects: true,
            naturalSort: false,
            customOrder: [],
            groupByType: false,
            prioritizeRequired: false,
            ...options
        };
    }

    /**
     * Sorts an array of parsed properties using intelligent sorting algorithms
     * 
     * This method applies sophisticated sorting logic that handles numeric properties,
     * quoted properties, case sensitivity, and nested objects. It preserves the original
     * array and returns a new sorted array. Spread properties maintain their relative
     * positions and are not sorted alphabetically.
     * 
     * @param properties - Array of properties to sort
     * @param customOptions - Optional custom sort options for this operation
     * @returns New array of properties sorted according to the specified criteria
     * 
     * @example
     * ```typescript
     * // Sort interface properties alphabetically
     * const sorter = new PropertySorter();
     * const properties = [
     *   { name: 'zebra', value: 'string', ... },
     *   { name: 'apple', value: 'number', ... },
     *   { name: 'banana', value: 'boolean', ... }
     * ];
     * const sorted = sorter.sortProperties(properties);
     * // Result: [apple, banana, zebra]
     * ```
     * 
     * @example
     * ```typescript
     * // Sort with numeric properties and custom order
     * const sorter = new PropertySorter();
     * const properties = [
     *   { name: '10', value: 'string', ... },
     *   { name: '2', value: 'number', ... },
     *   { name: 'alpha', value: 'boolean', ... }
     * ];
     * const sorted = sorter.sortProperties(properties, { order: 'desc' });
     * // Result: [alpha, 10, 2] (numeric sorting applied)
     * ```
     */
    public sortProperties(properties: ParsedProperty[], customOptions?: Partial<SortOptions>): ParsedProperty[] {
        const sortOptions = { ...this.options, ...customOptions };
        
        // Create a copy to avoid mutating the original array
        const sortedProperties = [...properties];

        // Separate spread properties from regular properties to preserve their positions
        const spreadProperties: { property: ParsedProperty; originalIndex: number }[] = [];
        const regularProperties: ParsedProperty[] = [];

        sortedProperties.forEach((property, index) => {
            if (property.isSpread) {
                spreadProperties.push({ property, originalIndex: index });
            } else {
                regularProperties.push(property);
            }
        });

        // Sort only the regular properties
        regularProperties.sort((a, b) => {
            // 1. Custom order: Check if either property is in the custom order list
            if (sortOptions.customOrder && sortOptions.customOrder.length > 0) {
                const aCustomIndex = sortOptions.customOrder.indexOf(a.name);
                const bCustomIndex = sortOptions.customOrder.indexOf(b.name);
                
                if (aCustomIndex !== -1 && bCustomIndex !== -1) {
                    // Both are in custom order - sort by their position in the list
                    return aCustomIndex - bCustomIndex;
                } else if (aCustomIndex !== -1) {
                    // Only A is in custom order - A comes first
                    return -1;
                } else if (bCustomIndex !== -1) {
                    // Only B is in custom order - B comes first
                    return 1;
                }
                // Neither is in custom order - continue with other sorting criteria
            }

            // 2. Required property prioritization (TypeScript-specific)
            if (sortOptions.prioritizeRequired) {
                const aIsRequired = !a.optional; // Properties without '?' are required
                const bIsRequired = !b.optional;
                
                if (aIsRequired && !bIsRequired) {
                    return -1; // Required properties come first
                } else if (!aIsRequired && bIsRequired) {
                    return 1; // Required properties come first
                }
                // Both have same optionality - continue with other criteria
            }

            // 3. Type grouping: Group properties by their type
            if (sortOptions.groupByType) {
                const aTypeGroup = this.getPropertyTypeGroup(a);
                const bTypeGroup = this.getPropertyTypeGroup(b);
                
                if (aTypeGroup !== bTypeGroup) {
                    // Different type groups - sort by group priority
                    const typeGroupOrder = ['method', 'getter', 'setter', 'property'];
                    const aGroupIndex = typeGroupOrder.indexOf(aTypeGroup);
                    const bGroupIndex = typeGroupOrder.indexOf(bTypeGroup);
                    return aGroupIndex - bGroupIndex;
                }
                // Same type group - continue with other criteria
            }

            // CSS-specific sorting: Handle importance first
            if (sortOptions.sortByImportance && (a.important !== b.important)) {
                // Important properties come first (or last depending on sort order)
                const importanceComparison = (a.important ? 1 : 0) - (b.important ? 1 : 0);
                return sortOptions.order === 'desc' ? importanceComparison : -importanceComparison;
            }

            // CSS-specific sorting: Handle vendor prefixes
            if (sortOptions.groupVendorPrefixes) {
                // If both have the same property name (ignoring prefix), group them together
                const aBaseName = a.vendorPrefix ? a.name : a.name;
                const bBaseName = b.vendorPrefix ? b.name : b.name;
                
                if (aBaseName === bBaseName) {
                    // Same property name - order by vendor prefix priority
                    const prefixOrder = [undefined, '-moz-', '-webkit-', '-ms-', '-o-']; // undefined = no prefix comes first
                    const aIndex = prefixOrder.indexOf(a.vendorPrefix);
                    const bIndex = prefixOrder.indexOf(b.vendorPrefix);
                    
                    if (aIndex !== bIndex) {
                        return aIndex - bIndex;
                    }
                }
                
                // Different property names - fall through to normal sorting
            }

            let nameA = a.name;
            let nameB = b.name;

            // Handle case sensitivity
            if (!sortOptions.caseSensitive) {
                nameA = nameA.toLowerCase();
                nameB = nameB.toLowerCase();
            }

            // Natural sort: Handle numeric values in property names
            if (sortOptions.naturalSort) {
                const naturalComparison = this.naturalCompare(nameA, nameB);
                if (naturalComparison !== 0) {
                    return sortOptions.order === 'desc' ? -naturalComparison : naturalComparison;
                }
            }

            // Check if both names are numeric (including quoted numbers)
            const numericA = this.extractNumericValue(nameA);
            const numericB = this.extractNumericValue(nameB);

            let comparison = 0;

            if (numericA !== null && numericB !== null) {
                // Both are numeric - compare numerically
                comparison = numericA - numericB;
            } else if (numericA !== null && numericB === null) {
                // A is numeric, B is not - numeric comes first
                comparison = -1;
            } else if (numericA === null && numericB !== null) {
                // A is not numeric, B is - numeric comes first
                comparison = 1;
            } else {
                // Both are non-numeric - compare alphabetically
                // For alphabetical comparison, remove quotes to compare content
                const cleanNameA = this.removeQuotes(nameA);
                const cleanNameB = this.removeQuotes(nameB);
                
                if (cleanNameA < cleanNameB) {
                    comparison = -1;
                } else if (cleanNameA > cleanNameB) {
                    comparison = 1;
                }
            }

            // Apply sort order
            return sortOptions.order === 'desc' ? -comparison : comparison;
        });

        // Reconstruct the array with spread properties in their original relative positions
        const result: ParsedProperty[] = [];
        let regularIndex = 0;
        let spreadIndex = 0;

        for (let i = 0; i < properties.length; i++) {
            if (spreadIndex < spreadProperties.length && spreadProperties[spreadIndex].originalIndex === i) {
                // Insert spread property at its original position
                result.push(spreadProperties[spreadIndex].property);
                spreadIndex++;
            } else {
                // Insert next regular property (now sorted)
                if (regularIndex < regularProperties.length) {
                    result.push(regularProperties[regularIndex]);
                    regularIndex++;
                }
            }
        }

        // Recursively sort nested objects if enabled
        if (sortOptions.sortNestedObjects) {
            return result.map(property => this.sortNestedProperties(property, sortOptions));
        }

        return result;
    }

    /**
     * Recursively sorts nested properties within a property that contains an object literal
     * 
     * This method handles properties that contain nested objects by recursively applying
     * the same sorting logic to their nested properties, maintaining the hierarchical structure.
     * 
     * @param property - Property that may contain nested objects
     * @param sortOptions - Sort options to apply to nested properties
     * @returns Property with sorted nested properties
     */
    private sortNestedProperties(property: ParsedProperty, sortOptions: SortOptions): ParsedProperty {
        if (!property.nestedProperties || property.nestedProperties.length === 0) {
            return property;
        }

        // Recursively sort the nested properties
        const sortedNestedProperties = this.sortProperties(property.nestedProperties, sortOptions);

        return {
            ...property,
            nestedProperties: sortedNestedProperties
        };
    }

    /**
     * Sorts properties within a parsed entity and returns a new entity with sorted properties
     * 
     * This method applies property sorting to a complete parsed entity (interface, object, or type),
     * preserving all entity metadata while sorting its properties according to the specified options.
     * 
     * @param entity - The parsed entity containing properties to sort
     * @param customOptions - Optional custom sort options for this operation
     * @returns New entity with sorted properties
     * 
     * @example
     * ```typescript
     * // Sort properties in an interface entity
     * const sorter = new PropertySorter();
     * const entity = {
     *   type: 'interface',
     *   name: 'User',
     *   properties: [
     *     { name: 'name', value: 'string', ... },
     *     { name: 'id', value: 'number', ... },
     *     { name: 'email', value: 'string', ... }
     *   ],
     *   ...
     * };
     * const sortedEntity = sorter.sortEntityProperties(entity);
     * // Result: properties sorted as [email, id, name]
     * ```
     * 
     * @example
     * ```typescript
     * // Sort object properties in descending order
     * const sorter = new PropertySorter();
     * const sortedEntity = sorter.sortEntityProperties(objectEntity, { order: 'desc' });
     * // Result: properties sorted Z-A
     * ```
     */
    public sortEntityProperties(entity: ParsedEntity, customOptions?: Partial<SortOptions>): ParsedEntity {
        const sortedProperties = this.sortProperties(entity.properties, customOptions);
        
        return {
            ...entity,
            properties: sortedProperties
        };
    }

    /**
     * Sorts properties in multiple entities and returns an array of entities with sorted properties
     * 
     * This method applies property sorting to an array of parsed entities, useful for processing
     * entire files that contain multiple interfaces, objects, or type aliases.
     * 
     * @param entities - Array of entities to sort properties within
     * @param customOptions - Optional custom sort options for this operation
     * @returns Array of entities with sorted properties
     * 
     * @example
     * ```typescript
     * // Sort properties in multiple interfaces
     * const sorter = new PropertySorter();
     * const entities = [interfaceEntity, objectEntity, typeEntity];
     * const sortedEntities = sorter.sortMultipleEntities(entities);
     * // Result: all entities have their properties sorted
     * ```
     * 
     * @example
     * ```typescript
     * // Sort multiple entities with custom options
     * const sorter = new PropertySorter();
     * const sortedEntities = sorter.sortMultipleEntities(entities, {
     *   order: 'desc',
     *   caseSensitive: true
     * });
     * ```
     */
    public sortMultipleEntities(entities: ParsedEntity[], customOptions?: Partial<SortOptions>): ParsedEntity[] {
        return entities.map(entity => this.sortEntityProperties(entity, customOptions));
    }

    /**
     * Provides a preview of how properties would be sorted without actually sorting them
     * 
     * This method allows you to see the sorting results before applying them, useful for
     * user interfaces that want to show a preview or for testing sorting behavior.
     * 
     * @param properties - Array of properties to preview
     * @param customOptions - Optional custom sort options for this operation
     * @returns Object containing original names, sorted names, and whether changes would occur
     * 
     * @example
     * ```typescript
     * // Preview sorting results
     * const sorter = new PropertySorter();
     * const preview = sorter.previewSort(properties);
     * console.log('Original:', preview.original);
     * console.log('Sorted:', preview.sorted);
     * console.log('Would change:', preview.changes);
     * ```
     * 
     * @example
     * ```typescript
     * // Preview with different sort order
     * const sorter = new PropertySorter();
     * const ascPreview = sorter.previewSort(properties, { order: 'asc' });
     * const descPreview = sorter.previewSort(properties, { order: 'desc' });
     * // Compare different sorting approaches
     * ```
     */
    public previewSort(properties: ParsedProperty[], customOptions?: Partial<SortOptions>): {
        original: string[];
        sorted: string[];
        changes: boolean;
    } {
        const originalNames = properties.map(p => p.name);
        const sortedProperties = this.sortProperties(properties, customOptions);
        const sortedNames = sortedProperties.map(p => p.name);
        
        const changes = !this.arraysEqual(originalNames, sortedNames);

        return {
            original: originalNames,
            sorted: sortedNames,
            changes
        };
    }

    /**
     * Determines whether sorting would change the order of properties
     * 
     * This method provides a quick way to check if sorting would have any effect
     * on the property order, useful for avoiding unnecessary processing.
     * 
     * @param properties - Array of properties to check
     * @param customOptions - Optional custom sort options for this operation
     * @returns True if sorting would change the order, false if already sorted
     * 
     * @example
     * ```typescript
     * // Check if sorting is needed
     * const sorter = new PropertySorter();
     * if (sorter.wouldChangeOrder(properties)) {
     *   console.log('Properties need sorting');
     *   const sorted = sorter.sortProperties(properties);
     * } else {
     *   console.log('Properties are already sorted');
     * }
     * ```
     * 
     * @example
     * ```typescript
     * // Check different sort orders
     * const sorter = new PropertySorter();
     * const needsAscSort = sorter.wouldChangeOrder(properties, { order: 'asc' });
     * const needsDescSort = sorter.wouldChangeOrder(properties, { order: 'desc' });
     * ```
     */
    public wouldChangeOrder(properties: ParsedProperty[], customOptions?: Partial<SortOptions>): boolean {
        const preview = this.previewSort(properties, customOptions);
        return preview.changes;
    }

    /**
     * Removes surrounding quotes from a property name for comparison purposes
     * 
     * This method handles quoted property names (like CSS selectors or special keys)
     * by removing the quotes to compare the actual content.
     * 
     * @param name - Property name that may have quotes
     * @returns Property name without surrounding quotes
     */
    private removeQuotes(name: string): string {
        if ((name.startsWith("'") && name.endsWith("'")) || 
            (name.startsWith('"') && name.endsWith('"'))) {
            return name.slice(1, -1);
        }
        return name;
    }

    /**
     * Extracts numeric value from a property name if it represents a number
     * 
     * This method handles quoted numbers, decimals, and negative numbers,
     * enabling proper numeric sorting of property names that represent numbers.
     * 
     * @param name - Property name to check for numeric content
     * @returns Numeric value if the name represents a number, null otherwise
     */
    private extractNumericValue(name: string): number | null {
        // Remove quotes if present
        const cleanName = this.removeQuotes(name);

        // Check if it's a valid number (including decimals and negatives)
        const numericValue = parseFloat(cleanName);
        
        // Return the numeric value if it's a valid number and the string represents only that number
        if (!isNaN(numericValue) && isFinite(numericValue) && cleanName.trim() === numericValue.toString()) {
            return numericValue;
        }
        
        return null;
    }

    /**
     * Compares two arrays for equality by checking each element
     * 
     * This utility method performs a shallow comparison of two arrays to determine
     * if they contain the same elements in the same order.
     * 
     * @param a - First array to compare
     * @param b - Second array to compare
     * @returns True if arrays are equal, false otherwise
     */
    private arraysEqual<T>(a: T[], b: T[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val === b[index]);
    }

    /**
     * Updates the sorter's configuration options with new values
     * 
     * This method allows changing the sorter's behavior after creation by merging
     * new options with the existing configuration.
     * 
     * @param newOptions - New options to merge with existing configuration
     * 
     * @example
     * ```typescript
     * // Change sort order after creation
     * const sorter = new PropertySorter({ order: 'asc' });
     * sorter.updateOptions({ order: 'desc', caseSensitive: true });
     * ```
     * 
     * @example
     * ```typescript
     * // Disable nested object sorting
     * const sorter = new PropertySorter();
     * sorter.updateOptions({ sortNestedObjects: false });
     * ```
     */
    public updateOptions(newOptions: Partial<SortOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Returns a copy of the current sorting configuration options
     * 
     * This method provides read-only access to the sorter's current configuration,
     * useful for debugging or creating new sorters with the same settings.
     * 
     * @returns Copy of the current sort options
     * 
     * @example
     * ```typescript
     * // Get current configuration
     * const sorter = new PropertySorter({ order: 'desc' });
     * const options = sorter.getOptions();
     * console.log(options.order); // 'desc'
     * ```
     * 
     * @example
     * ```typescript
     * // Clone sorter configuration
     * const sorter1 = new PropertySorter({ order: 'asc', caseSensitive: true });
     * const options = sorter1.getOptions();
     * const sorter2 = new PropertySorter(options);
     * // sorter2 has the same configuration as sorter1
     * ```
     */
    public getOptions(): SortOptions {
        return { ...this.options };
    }

    /**
     * Determines the type group of a property for grouping purposes
     * 
     * @param property - The property to analyze
     * @returns The type group ('method', 'getter', 'setter', or 'property')
     */
    private getPropertyTypeGroup(property: ParsedProperty): string {
        // Check if it's a method (function type or has parentheses)
        if (property.value && (
            property.value.includes('=>') || 
            property.value.includes('function') ||
            property.value.includes('()') ||
            property.name.includes('(')
        )) {
            return 'method';
        }
        
        // Check if it's a getter
        if (property.name.startsWith('get ')) {
            return 'getter';
        }
        
        // Check if it's a setter
        if (property.name.startsWith('set ')) {
            return 'setter';
        }
        
        // Default to property
        return 'property';
    }

    /**
     * Performs natural comparison of two strings, handling embedded numbers correctly
     * 
     * @param a - First string to compare
     * @param b - Second string to compare
     * @returns Comparison result (-1, 0, or 1)
     */
    private naturalCompare(a: string, b: string): number {
        // Split strings into parts (text and numbers)
        const aParts = a.match(/(\d+|\D+)/g) || [];
        const bParts = b.match(/(\d+|\D+)/g) || [];
        
        const maxLength = Math.max(aParts.length, bParts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const aPart = aParts[i] || '';
            const bPart = bParts[i] || '';
            
            // Check if both parts are numeric
            const aIsNumeric = /^\d+$/.test(aPart);
            const bIsNumeric = /^\d+$/.test(bPart);
            
            if (aIsNumeric && bIsNumeric) {
                // Compare as numbers
                const aNum = parseInt(aPart, 10);
                const bNum = parseInt(bPart, 10);
                if (aNum !== bNum) {
                    return aNum - bNum;
                }
            } else {
                // Compare as strings
                if (aPart !== bPart) {
                    return aPart < bPart ? -1 : 1;
                }
            }
        }
        
        return 0;
    }
}

/**
 * Convenience function to sort properties without creating a PropertySorter instance
 * 
 * This function provides a quick way to sort properties when you don't need to reuse
 * the sorter or maintain state between operations.
 * 
 * @param properties - Array of properties to sort
 * @param options - Sort options to control sorting behavior
 * @returns New array of sorted properties
 * 
 * @example
 * ```typescript
 * // Quick property sorting
 * const sorted = sortProperties(properties, { order: 'asc' });
 * ```
 * 
 * @example
 * ```typescript
 * // Sort with multiple options
 * const sorted = sortProperties(properties, {
 *   order: 'desc',
 *   caseSensitive: true,
 *   sortNestedObjects: false
 * });
 * ```
 */
export function sortProperties(properties: ParsedProperty[], options: Partial<SortOptions> = {}): ParsedProperty[] {
    const sorter = new PropertySorter(options);
    return sorter.sortProperties(properties);
}

/**
 * Convenience function to sort properties in ascending order
 * 
 * @param properties - Array of properties to sort
 * @returns New array of properties sorted A-Z
 * 
 * @example
 * ```typescript
 * // Simple ascending sort
 * const sorted = sortPropertiesAsc(properties);
 * // Result: properties sorted alphabetically A-Z
 * ```
 * 
 * @example
 * ```typescript
 * // Use in a processing pipeline
 * const processed = parseCode(source)
 *   .then(result => result.entities.map(entity => ({
 *     ...entity,
 *     properties: sortPropertiesAsc(entity.properties)
 *   })));
 * ```
 */
export function sortPropertiesAsc(properties: ParsedProperty[]): ParsedProperty[] {
    return sortProperties(properties, { order: 'asc' });
}

/**
 * Convenience function to sort properties in descending order
 * 
 * @param properties - Array of properties to sort
 * @returns New array of properties sorted Z-A
 * 
 * @example
 * ```typescript
 * // Simple descending sort
 * const sorted = sortPropertiesDesc(properties);
 * // Result: properties sorted alphabetically Z-A
 * ```
 * 
 * @example
 * ```typescript
 * // Sort object properties in reverse order
 * const objectEntity = parseObjectLiteral(code);
 * const sortedEntity = {
 *   ...objectEntity,
 *   properties: sortPropertiesDesc(objectEntity.properties)
 * };
 * ```
 */
export function sortPropertiesDesc(properties: ParsedProperty[]): ParsedProperty[] {
    return sortProperties(properties, { order: 'desc' });
} 