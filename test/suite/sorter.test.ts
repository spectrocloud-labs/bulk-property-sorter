import * as assert from 'assert';
import { PropertySorter, SortOptions } from '../../src/sorter';
import { ParsedProperty, ParsedEntity } from '../../src/types';

// Helper function to create test properties
function createTestProperty(name: string, value: string = 'string', options: Partial<ParsedProperty> = {}): ParsedProperty {
    return {
        name,
        value,
        optional: false,
        line: 1,
        comments: [],
        fullText: `${name}: ${value}`,
        trailingPunctuation: ',',
        ...options
    };
}

// Helper function to create test entity
function createTestEntity(name: string, properties: ParsedProperty[] = []): ParsedEntity {
    return {
        name,
        type: 'interface',
        properties,
        startLine: 1,
        endLine: 1,
        isExported: false,
        leadingComments: [],
        originalText: `interface ${name} { ... }`
    };
}

suite('PropertySorter Test Suite', () => {

    suite('Constructor and Options', () => {
        test('Should initialize with default options', () => {
            const sorter = new PropertySorter();
            const options = sorter.getOptions();
            
            assert.strictEqual(options.order, 'asc');
            assert.strictEqual(options.preserveComments, true);
            assert.strictEqual(options.caseSensitive, false);
            assert.strictEqual(options.sortNestedObjects, true);
            assert.strictEqual(options.naturalSort, false);
            assert.deepStrictEqual(options.customOrder, []);
            assert.strictEqual(options.groupByType, false);
            assert.strictEqual(options.prioritizeRequired, false);
        });

        test('Should initialize with custom options', () => {
            const customOptions: Partial<SortOptions> = {
                order: 'desc',
                caseSensitive: true,
                sortNestedObjects: false,
                naturalSort: true,
                customOrder: ['id', 'name', 'email'],
                groupByType: true,
                prioritizeRequired: true,
                sortByImportance: true,
                groupVendorPrefixes: true
            };
            
            const sorter = new PropertySorter(customOptions);
            const options = sorter.getOptions();
            
            assert.strictEqual(options.order, 'desc');
            assert.strictEqual(options.caseSensitive, true);
            assert.strictEqual(options.sortNestedObjects, false);
            assert.strictEqual(options.naturalSort, true);
            assert.deepStrictEqual(options.customOrder, ['id', 'name', 'email']);
            assert.strictEqual(options.groupByType, true);
            assert.strictEqual(options.prioritizeRequired, true);
            assert.strictEqual(options.sortByImportance, true);
            assert.strictEqual(options.groupVendorPrefixes, true);
        });

        test('Should merge options correctly', () => {
            const sorter = new PropertySorter({ order: 'desc', naturalSort: true });
            const options = sorter.getOptions();
            
            // Should have provided options
            assert.strictEqual(options.order, 'desc');
            assert.strictEqual(options.naturalSort, true);
            // Should have default options
            assert.strictEqual(options.preserveComments, true);
            assert.strictEqual(options.caseSensitive, false);
        });
    });

    suite('Basic Property Sorting', () => {
        test('Should sort properties in ascending order', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('alpha'),
                createTestProperty('beta')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'alpha');
            assert.strictEqual(sorted[1].name, 'beta');
            assert.strictEqual(sorted[2].name, 'zebra');
        });

        test('Should sort properties in descending order', () => {
            const sorter = new PropertySorter({ order: 'desc' });
            const properties = [
                createTestProperty('alpha'),
                createTestProperty('zebra'),
                createTestProperty('beta')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'zebra');
            assert.strictEqual(sorted[1].name, 'beta');
            assert.strictEqual(sorted[2].name, 'alpha');
        });

        test('Should handle case-insensitive sorting (default)', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('Zebra'),
                createTestProperty('alpha'),
                createTestProperty('Beta')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'alpha');
            assert.strictEqual(sorted[1].name, 'Beta');
            assert.strictEqual(sorted[2].name, 'Zebra');
        });

        test('Should handle case-sensitive sorting', () => {
            const sorter = new PropertySorter({ caseSensitive: true });
            const properties = [
                createTestProperty('Zebra'),
                createTestProperty('alpha'),
                createTestProperty('Beta')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Case-sensitive: uppercase comes before lowercase
            assert.strictEqual(sorted[0].name, 'Beta');
            assert.strictEqual(sorted[1].name, 'Zebra');
            assert.strictEqual(sorted[2].name, 'alpha');
        });

        test('Should preserve original array and return new array', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('alpha')
            ];
            const originalOrder = properties.map(p => p.name);
            
            const sorted = sorter.sortProperties(properties);
            
            // Original array should be unchanged
            assert.deepStrictEqual(properties.map(p => p.name), originalOrder);
            // New array should be sorted
            assert.strictEqual(sorted[0].name, 'alpha');
            assert.strictEqual(sorted[1].name, 'zebra');
        });
    });

    suite('Numeric Property Sorting', () => {
        test('Should sort numeric properties numerically', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('10'),
                createTestProperty('2'),
                createTestProperty('100')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, '2');
            assert.strictEqual(sorted[1].name, '10');
            assert.strictEqual(sorted[2].name, '100');
        });

        test('Should sort quoted numeric properties numerically', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('"10"'),
                createTestProperty("'2'"),
                createTestProperty('"100"')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, "'2'");
            assert.strictEqual(sorted[1].name, '"10"');
            assert.strictEqual(sorted[2].name, '"100"');
        });

        test('Should sort decimal numbers correctly', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('1.5'),
                createTestProperty('1.2'),
                createTestProperty('1.10')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, '1.2');
            assert.strictEqual(sorted[1].name, '1.5');
            assert.strictEqual(sorted[2].name, '1.10');
        });

        test('Should sort negative numbers correctly', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('5'),
                createTestProperty('-1'),
                createTestProperty('0'),
                createTestProperty('-10')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, '-10');
            assert.strictEqual(sorted[1].name, '-1');
            assert.strictEqual(sorted[2].name, '0');
            assert.strictEqual(sorted[3].name, '5');
        });

        test('Should put numeric properties before alphabetic properties', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('10'),
                createTestProperty('alpha'),
                createTestProperty('2')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, '2');
            assert.strictEqual(sorted[1].name, '10');
            assert.strictEqual(sorted[2].name, 'alpha');
            assert.strictEqual(sorted[3].name, 'zebra');
        });
    });

    suite('Custom Order Sorting', () => {
        test('Should prioritize custom order properties', () => {
            const sorter = new PropertySorter({
                customOrder: ['id', 'name', 'email']
            });
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('email'),
                createTestProperty('alpha'),
                createTestProperty('id'),
                createTestProperty('name')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'id');
            assert.strictEqual(sorted[1].name, 'name');
            assert.strictEqual(sorted[2].name, 'email');
            assert.strictEqual(sorted[3].name, 'alpha');
            assert.strictEqual(sorted[4].name, 'zebra');
        });

        test('Should sort custom order properties by their position in custom order list', () => {
            const sorter = new PropertySorter({
                customOrder: ['third', 'first', 'second']
            });
            const properties = [
                createTestProperty('second'),
                createTestProperty('third'),
                createTestProperty('first')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'third');
            assert.strictEqual(sorted[1].name, 'first');
            assert.strictEqual(sorted[2].name, 'second');
        });

        test('Should handle partial custom order with other properties', () => {
            const sorter = new PropertySorter({
                customOrder: ['priority']
            });
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('alpha'),
                createTestProperty('priority'),
                createTestProperty('beta')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'priority');
            assert.strictEqual(sorted[1].name, 'alpha');
            assert.strictEqual(sorted[2].name, 'beta');
            assert.strictEqual(sorted[3].name, 'zebra');
        });
    });

    suite('Required Property Prioritization', () => {
        test('Should prioritize required properties over optional ones', () => {
            const sorter = new PropertySorter({ prioritizeRequired: true });
            const properties = [
                createTestProperty('optionalProp', 'string', { optional: true }),
                createTestProperty('requiredProp', 'string', { optional: false }),
                createTestProperty('anotherOptional', 'string', { optional: true }),
                createTestProperty('anotherRequired', 'string', { optional: false })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Required properties should come first
            assert.strictEqual(sorted[0].name, 'anotherRequired');
            assert.strictEqual(sorted[1].name, 'requiredProp');
            // Then optional properties
            assert.strictEqual(sorted[2].name, 'anotherOptional');
            assert.strictEqual(sorted[3].name, 'optionalProp');
        });

        test('Should sort within required and optional groups', () => {
            const sorter = new PropertySorter({ prioritizeRequired: true });
            const properties = [
                createTestProperty('zOptional', 'string', { optional: true }),
                createTestProperty('zRequired', 'string', { optional: false }),
                createTestProperty('aOptional', 'string', { optional: true }),
                createTestProperty('aRequired', 'string', { optional: false })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Required properties first, sorted alphabetically
            assert.strictEqual(sorted[0].name, 'aRequired');
            assert.strictEqual(sorted[1].name, 'zRequired');
            // Optional properties second, sorted alphabetically
            assert.strictEqual(sorted[2].name, 'aOptional');
            assert.strictEqual(sorted[3].name, 'zOptional');
        });
    });

    suite('Type Grouping', () => {
        test('Should group properties by type', () => {
            const sorter = new PropertySorter({ groupByType: true });
            const properties = [
                createTestProperty('regularProp', 'string'),
                createTestProperty('methodProp', '() => void'),
                createTestProperty('get getter', 'string'),
                createTestProperty('set setter', '(value: string) => void'),
                createTestProperty('anotherProp', 'number')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Methods should come first
            assert.strictEqual(sorted[0].name, 'methodProp');
            // Then setters (alphabetically before getters within same type group)
            assert.strictEqual(sorted[1].name, 'set setter');
            // Then getters
            assert.strictEqual(sorted[2].name, 'get getter');
            // Then regular properties (sorted alphabetically)
            assert.strictEqual(sorted[3].name, 'anotherProp');
            assert.strictEqual(sorted[4].name, 'regularProp');
        });

        test('Should sort within type groups alphabetically', () => {
            const sorter = new PropertySorter({ groupByType: true });
            const properties = [
                createTestProperty('zMethod', '() => void'),
                createTestProperty('aMethod', '() => string'),
                createTestProperty('zProp', 'string'),
                createTestProperty('aProp', 'number')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Methods sorted alphabetically
            assert.strictEqual(sorted[0].name, 'aMethod');
            assert.strictEqual(sorted[1].name, 'zMethod');
            // Properties sorted alphabetically
            assert.strictEqual(sorted[2].name, 'aProp');
            assert.strictEqual(sorted[3].name, 'zProp');
        });
    });

    suite('CSS-Specific Sorting', () => {
        test('Should sort by importance when sortByImportance is enabled', () => {
            const sorter = new PropertySorter({ sortByImportance: true });
            const properties = [
                createTestProperty('normalProp', 'value', { important: false }),
                createTestProperty('importantProp', 'value', { important: true }),
                createTestProperty('anotherNormal', 'value', { important: false })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Important properties should come first (default asc order)
            assert.strictEqual(sorted[0].name, 'importantProp');
            assert.strictEqual(sorted[1].name, 'anotherNormal');
            assert.strictEqual(sorted[2].name, 'normalProp');
        });

        test('Should sort by importance in descending order', () => {
            const sorter = new PropertySorter({ 
                sortByImportance: true,
                order: 'desc'
            });
            const properties = [
                createTestProperty('normalProp', 'value', { important: false }),
                createTestProperty('importantProp', 'value', { important: true })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // In desc order, important should still be handled properly
            assert.strictEqual(sorted[0].name, 'normalProp');
            assert.strictEqual(sorted[1].name, 'importantProp');
        });

        test('Should group vendor prefixes when groupVendorPrefixes is enabled', () => {
            const sorter = new PropertySorter({ groupVendorPrefixes: true });
            const properties = [
                createTestProperty('transform', 'rotate(45deg)', { vendorPrefix: undefined }),
                createTestProperty('transform', 'rotate(45deg)', { vendorPrefix: '-webkit-' }),
                createTestProperty('transform', 'rotate(45deg)', { vendorPrefix: '-moz-' }),
                createTestProperty('alpha', 'value')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Should group transform properties together
            assert.strictEqual(sorted[0].name, 'alpha');
            assert.strictEqual(sorted[1].name, 'transform'); // no prefix first
            assert.strictEqual(sorted[2].name, 'transform'); // -moz-
            assert.strictEqual(sorted[3].name, 'transform'); // -webkit-
        });
    });

    suite('Natural Sort', () => {
        test('Should sort with natural ordering when naturalSort is enabled', () => {
            const sorter = new PropertySorter({ naturalSort: true });
            const properties = [
                createTestProperty('item10'),
                createTestProperty('item2'),
                createTestProperty('item1')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'item1');
            assert.strictEqual(sorted[1].name, 'item2');
            assert.strictEqual(sorted[2].name, 'item10');
        });

        test('Should handle natural sort with mixed content', () => {
            const sorter = new PropertySorter({ naturalSort: true });
            const properties = [
                createTestProperty('section1item10'),
                createTestProperty('section1item2'),
                createTestProperty('section2item1')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'section1item2');
            assert.strictEqual(sorted[1].name, 'section1item10');
            assert.strictEqual(sorted[2].name, 'section2item1');
        });
    });

    suite('Spread Properties', () => {
        test('Should preserve spread properties in their original positions', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('...spread1', '', { isSpread: true }),
                createTestProperty('alpha'),
                createTestProperty('...spread2', '', { isSpread: true }),
                createTestProperty('beta')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Spread properties should stay in original positions
            assert.strictEqual(sorted[0].name, 'alpha');
            assert.strictEqual(sorted[1].name, '...spread1');
            assert.strictEqual(sorted[2].name, 'beta');
            assert.strictEqual(sorted[3].name, '...spread2');
            assert.strictEqual(sorted[4].name, 'zebra');
        });

        test('Should handle only spread properties', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('...spread1', '', { isSpread: true }),
                createTestProperty('...spread2', '', { isSpread: true })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted.length, 2);
            assert.strictEqual(sorted[0].name, '...spread1');
            assert.strictEqual(sorted[1].name, '...spread2');
        });
    });

    suite('Nested Object Sorting', () => {
        test('Should recursively sort nested properties when sortNestedObjects is enabled', () => {
            const sorter = new PropertySorter({ sortNestedObjects: true });
            const properties = [
                createTestProperty('config', 'object', {
                    nestedProperties: [
                        createTestProperty('zebra'),
                        createTestProperty('alpha')
                    ]
                }),
                createTestProperty('name', 'string')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted[0].name, 'config');
            assert.strictEqual(sorted[1].name, 'name');
            // Nested properties should be sorted
            assert.strictEqual(sorted[0].nestedProperties![0].name, 'alpha');
            assert.strictEqual(sorted[0].nestedProperties![1].name, 'zebra');
        });

        test('Should not sort nested properties when sortNestedObjects is disabled', () => {
            const sorter = new PropertySorter({ sortNestedObjects: false });
            const properties = [
                createTestProperty('config', 'object', {
                    nestedProperties: [
                        createTestProperty('zebra'),
                        createTestProperty('alpha')
                    ]
                })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Nested properties should remain in original order
            assert.strictEqual(sorted[0].nestedProperties![0].name, 'zebra');
            assert.strictEqual(sorted[0].nestedProperties![1].name, 'alpha');
        });

        test('Should handle deeply nested properties', () => {
            const sorter = new PropertySorter({ sortNestedObjects: true });
            const properties = [
                createTestProperty('level1', 'object', {
                    nestedProperties: [
                        createTestProperty('zebra'),
                        createTestProperty('level2', 'object', {
                            nestedProperties: [
                                createTestProperty('charlie'),
                                createTestProperty('alpha')
                            ]
                        }),
                        createTestProperty('alpha')
                    ]
                })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            const level1Props = sorted[0].nestedProperties!;
            assert.strictEqual(level1Props[0].name, 'alpha');
            assert.strictEqual(level1Props[1].name, 'level2');
            assert.strictEqual(level1Props[2].name, 'zebra');
            
            const level2Props = level1Props[1].nestedProperties!;
            assert.strictEqual(level2Props[0].name, 'alpha');
            assert.strictEqual(level2Props[1].name, 'charlie');
        });
    });

    suite('Entity and Multiple Entity Sorting', () => {
        test('Should sort entity properties', () => {
            const sorter = new PropertySorter();
            const entity = createTestEntity('TestInterface', [
                createTestProperty('zebra'),
                createTestProperty('alpha')
            ]);
            
            const sorted = sorter.sortEntityProperties(entity);
            
            assert.strictEqual(sorted.name, 'TestInterface');
            assert.strictEqual(sorted.properties[0].name, 'alpha');
            assert.strictEqual(sorted.properties[1].name, 'zebra');
        });

        test('Should sort multiple entities', () => {
            const sorter = new PropertySorter();
            const entities = [
                createTestEntity('Interface1', [
                    createTestProperty('zebra'),
                    createTestProperty('alpha')
                ]),
                createTestEntity('Interface2', [
                    createTestProperty('charlie'),
                    createTestProperty('beta')
                ])
            ];
            
            const sorted = sorter.sortMultipleEntities(entities);
            
            assert.strictEqual(sorted.length, 2);
            assert.strictEqual(sorted[0].properties[0].name, 'alpha');
            assert.strictEqual(sorted[0].properties[1].name, 'zebra');
            assert.strictEqual(sorted[1].properties[0].name, 'beta');
            assert.strictEqual(sorted[1].properties[1].name, 'charlie');
        });

        test('Should apply custom options to entity sorting', () => {
            const sorter = new PropertySorter();
            const entity = createTestEntity('TestInterface', [
                createTestProperty('alpha'),
                createTestProperty('zebra')
            ]);
            
            const sorted = sorter.sortEntityProperties(entity, { order: 'desc' });
            
            assert.strictEqual(sorted.properties[0].name, 'zebra');
            assert.strictEqual(sorted.properties[1].name, 'alpha');
        });
    });

    suite('Preview and Utility Functions', () => {
        test('Should preview sort results', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('zebra'),
                createTestProperty('alpha')
            ];
            
            const preview = sorter.previewSort(properties);
            
            assert.deepStrictEqual(preview.original, ['zebra', 'alpha']);
            assert.deepStrictEqual(preview.sorted, ['alpha', 'zebra']);
            assert.strictEqual(preview.changes, true);
        });

        test('Should detect when no changes would occur', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('alpha'),
                createTestProperty('zebra')
            ];
            
            const preview = sorter.previewSort(properties);
            
            assert.deepStrictEqual(preview.original, ['alpha', 'zebra']);
            assert.deepStrictEqual(preview.sorted, ['alpha', 'zebra']);
            assert.strictEqual(preview.changes, false);
        });

        test('Should check if sorting would change order', () => {
            const sorter = new PropertySorter();
            
            const unsortedProperties = [
                createTestProperty('zebra'),
                createTestProperty('alpha')
            ];
            assert.strictEqual(sorter.wouldChangeOrder(unsortedProperties), true);
            
            const sortedProperties = [
                createTestProperty('alpha'),
                createTestProperty('zebra')
            ];
            assert.strictEqual(sorter.wouldChangeOrder(sortedProperties), false);
        });

        test('Should check order changes with custom options', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('alpha'),
                createTestProperty('zebra')
            ];
            
            // Would not change for ascending
            assert.strictEqual(sorter.wouldChangeOrder(properties, { order: 'asc' }), false);
            // Would change for descending
            assert.strictEqual(sorter.wouldChangeOrder(properties, { order: 'desc' }), true);
        });
    });

    suite('Options Management', () => {
        test('Should update options correctly', () => {
            const sorter = new PropertySorter({ order: 'asc', caseSensitive: false });
            
            sorter.updateOptions({ order: 'desc', naturalSort: true });
            
            const options = sorter.getOptions();
            assert.strictEqual(options.order, 'desc');
            assert.strictEqual(options.naturalSort, true);
            assert.strictEqual(options.caseSensitive, false); // Should preserve unchanged options
        });

        test('Should return copy of options from getOptions', () => {
            const sorter = new PropertySorter();
            const options1 = sorter.getOptions();
            const options2 = sorter.getOptions();
            
            // Should be different objects (copies)
            assert.notStrictEqual(options1, options2);
            // But with same content
            assert.deepStrictEqual(options1, options2);
            
            // Modifying returned options should not affect sorter
            options1.order = 'desc';
            assert.strictEqual(sorter.getOptions().order, 'asc');
        });
    });

    suite('Edge Cases and Error Handling', () => {
        test('Should handle empty property array', () => {
            const sorter = new PropertySorter();
            const sorted = sorter.sortProperties([]);
            
            assert.strictEqual(sorted.length, 0);
        });

        test('Should handle single property', () => {
            const sorter = new PropertySorter();
            const properties = [createTestProperty('onlyOne')];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted.length, 1);
            assert.strictEqual(sorted[0].name, 'onlyOne');
        });

        test('Should handle properties with same names', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('sameName', 'string'),
                createTestProperty('sameName', 'number')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted.length, 2);
            assert.strictEqual(sorted[0].name, 'sameName');
            assert.strictEqual(sorted[1].name, 'sameName');
        });

        test('Should handle properties with special characters', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('prop-with-dashes'),
                createTestProperty('prop_with_underscores'),
                createTestProperty('prop.with.dots'),
                createTestProperty('prop$with$dollars')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Should sort without errors
            assert.strictEqual(sorted.length, 4);
        });

        test('Should handle quoted properties with escape characters', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('"prop with spaces"'),
                createTestProperty("'prop with quotes'"),
                createTestProperty('"prop\\"with\\"escapes"')
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Should sort without errors
            assert.strictEqual(sorted.length, 3);
        });

        test('Should handle malformed numeric properties', () => {
            const sorter = new PropertySorter();
            const properties = [
                createTestProperty('10abc'), // Not purely numeric
                createTestProperty('abc10'), // Contains number but not numeric
                createTestProperty('10.5.3') // Invalid decimal
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            // Should treat as strings and sort alphabetically
            assert.strictEqual(sorted[0].name, '10.5.3');
            assert.strictEqual(sorted[1].name, '10abc');
            assert.strictEqual(sorted[2].name, 'abc10');
        });

        test('Should handle properties without nestedProperties when sortNestedObjects is enabled', () => {
            const sorter = new PropertySorter({ sortNestedObjects: true });
            const properties = [
                createTestProperty('prop1'), // No nested properties
                createTestProperty('prop2', 'string', { nestedProperties: undefined })
            ];
            
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted.length, 2);
            assert.strictEqual(sorted[0].name, 'prop1');
            assert.strictEqual(sorted[1].name, 'prop2');
        });
    });
}); 