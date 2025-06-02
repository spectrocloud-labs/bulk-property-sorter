import * as assert from 'assert';
import { PropertySorter } from '../../src/sorter';
import { ParsedProperty } from '../../src/types';

suite('Quoted Properties Sorting Test Suite', () => {
    let sorter: PropertySorter;

    setup(() => {
        sorter = new PropertySorter({ order: 'asc' });
    });

    function createTestProperty(name: string, value: string): ParsedProperty {
        return {
            name,
            value,
            optional: false,
            comments: [],
            trailingPunctuation: ',',
            line: 1,
            fullText: `${name}: ${value}`
        };
    }

    test('Sort quoted and unquoted properties alphabetically', () => {
        const properties = [
            createTestProperty("'warning-bold-pressed'", "'#A8882F'"),
            createTestProperty('danger', "'#FFD0DD'"),
            createTestProperty('green', "'#F0F2F2'")
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be sorted alphabetically: danger, green, warning-bold-pressed
        // The quoted property should be sorted by its content, not by the quotes
        assert.deepStrictEqual(names, ['danger', 'green', "'warning-bold-pressed'"], 
            'Quoted and unquoted properties should be sorted alphabetically by their content');
    });

    test('Sort mixed quoted properties with CSS-like selectors', () => {
        const properties = [
            createTestProperty("':hover'", "{ color: 'red' }"),
            createTestProperty('backgroundColor', "'blue'"),
            createTestProperty("':focus'", "{ outline: 'none' }"),
            createTestProperty('alignItems', "'center'")
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be sorted alphabetically by content: :focus, :hover, alignItems, backgroundColor
        assert.deepStrictEqual(names, ["':focus'", "':hover'", 'alignItems', 'backgroundColor'], 
            'CSS-like quoted selectors should be sorted alphabetically with regular properties');
    });

    test('Sort quoted numeric properties with string properties', () => {
        const properties = [
            createTestProperty("'10'", 'value10'),
            createTestProperty('zebra', 'valueZ'),
            createTestProperty("'2'", 'value2'),
            createTestProperty('apple', 'valueA')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Numeric properties (even quoted) should come first, then alphabetical
        assert.deepStrictEqual(names, ["'2'", "'10'", 'apple', 'zebra'], 
            'Quoted numeric properties should be sorted numerically, then alphabetical properties');
    });

    test('Sort single and double quoted properties together', () => {
        const properties = [
            createTestProperty('"zebra"', 'valueZ'),
            createTestProperty("'apple'", 'valueA'),
            createTestProperty('banana', 'valueB'),
            createTestProperty('"cherry"', 'valueC')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be sorted alphabetically regardless of quote type
        assert.deepStrictEqual(names, ["'apple'", 'banana', '"cherry"', '"zebra"'], 
            'Single and double quoted properties should be sorted alphabetically together');
    });

    test('Sort complex CSS theme properties', () => {
        const properties = [
            createTestProperty("'warning-bold-pressed'", "'#A8882F'"),
            createTestProperty('danger', "'#FFD0DD'"),
            createTestProperty('green', "'#F0F2F2'"),
            createTestProperty("'primary-hover'", "'#0056B3'"),
            createTestProperty('background', "'#FFFFFF'"),
            createTestProperty("'text-muted'", "'#6C757D'")
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be sorted alphabetically by content
        assert.deepStrictEqual(names, [
            'background', 
            'danger', 
            'green', 
            "'primary-hover'", 
            "'text-muted'", 
            "'warning-bold-pressed'"
        ], 'Complex CSS theme properties should be sorted alphabetically by content');
    });
}); 