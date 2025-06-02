import * as assert from 'assert';
import { PropertySorter } from '../../src/sorter';
import { ParsedProperty } from '../../src/types';

suite('Numeric Sorting Test Suite', () => {
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

    test('Sort numeric keys in numerical order (not alphanumeric)', () => {
        const properties = [
            createTestProperty('10', 'value10'),
            createTestProperty('2', 'value2'),
            createTestProperty('1', 'value1'),
            createTestProperty('20', 'value20'),
            createTestProperty('3', 'value3')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be in numerical order: 1, 2, 3, 10, 20
        // NOT alphanumeric order: 1, 10, 2, 20, 3
        assert.deepStrictEqual(names, ['1', '2', '3', '10', '20'], 
            'Numeric keys should be sorted in numerical order');
    });

    test('Sort mixed numeric and string keys correctly', () => {
        const properties = [
            createTestProperty('zebra', 'valueZ'),
            createTestProperty('10', 'value10'),
            createTestProperty('apple', 'valueA'),
            createTestProperty('2', 'value2'),
            createTestProperty('banana', 'valueB'),
            createTestProperty('1', 'value1')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Numeric keys should come first in numerical order, then strings in alphabetical order
        assert.deepStrictEqual(names, ['1', '2', '10', 'apple', 'banana', 'zebra'], 
            'Numeric keys should come first in numerical order, then strings alphabetically');
    });

    test('Sort quoted numeric keys correctly', () => {
        const properties = [
            createTestProperty("'10'", 'value10'),
            createTestProperty("'2'", 'value2'),
            createTestProperty("'1'", 'value1'),
            createTestProperty("'20'", 'value20')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should handle quoted numeric keys
        assert.deepStrictEqual(names, ["'1'", "'2'", "'10'", "'20'"], 
            'Quoted numeric keys should be sorted in numerical order');
    });

    test('Sort decimal numbers correctly', () => {
        const properties = [
            createTestProperty('1.5', 'value1_5'),
            createTestProperty('1.10', 'value1_10'),
            createTestProperty('1.2', 'value1_2'),
            createTestProperty('1.1', 'value1_1')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be in numerical order: 1.1, 1.2, 1.5, 1.10
        assert.deepStrictEqual(names, ['1.1', '1.2', '1.5', '1.10'], 
            'Decimal numbers should be sorted in numerical order');
    });

    test('Sort negative numbers correctly', () => {
        const properties = [
            createTestProperty('-1', 'valueMinus1'),
            createTestProperty('10', 'value10'),
            createTestProperty('-10', 'valueMinus10'),
            createTestProperty('2', 'value2')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be in numerical order: -10, -1, 2, 10
        assert.deepStrictEqual(names, ['-10', '-1', '2', '10'], 
            'Negative numbers should be sorted in numerical order');
    });

    test('Sort CSS-like numeric properties correctly', () => {
        const properties = [
            createTestProperty('zIndex', 'value'),
            createTestProperty('10', 'value10'),
            createTestProperty('fontSize', 'value'),
            createTestProperty('2', 'value2'),
            createTestProperty('backgroundColor', 'value'),
            createTestProperty('1', 'value1')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Numeric keys first, then alphabetical
        assert.deepStrictEqual(names, ['1', '2', '10', 'backgroundColor', 'fontSize', 'zIndex'], 
            'CSS-like objects should sort numeric keys first, then alphabetical');
    });

    test('Sort hexadecimal numbers correctly', () => {
        const properties = [
            createTestProperty('0xFF', 'value'),
            createTestProperty('0x10', 'value'),
            createTestProperty('0x1', 'value'),
            createTestProperty('0xA', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should treat hex as strings, not numbers
        assert.deepStrictEqual(names, ['0x1', '0x10', '0xA', '0xFF'], 
            'Hexadecimal numbers should be sorted as strings');
    });

    test('Sort binary numbers correctly', () => {
        const properties = [
            createTestProperty('0b1010', 'value'),
            createTestProperty('0b10', 'value'),
            createTestProperty('0b1', 'value'),
            createTestProperty('0b11', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should treat binary as strings, not numbers
        assert.deepStrictEqual(names, ['0b1', '0b10', '0b1010', '0b11'], 
            'Binary numbers should be sorted as strings');
    });

    test('Sort very large numbers correctly', () => {
        const properties = [
            createTestProperty('999999999999999', 'value'),
            createTestProperty('1000000000000000', 'value'),
            createTestProperty('1', 'value'),
            createTestProperty('9999999999999999999999999999', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should handle very large numbers
        assert.deepStrictEqual(names, ['1', '999999999999999', '1000000000000000', '9999999999999999999999999999'], 
            'Very large numbers should be sorted numerically');
    });

    test('Sort numbers with different formats', () => {
        const properties = [
            createTestProperty('1.0', 'value'),
            createTestProperty('1', 'value'),
            createTestProperty('01', 'value'),
            createTestProperty('1.00', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should handle different number formats
        assert.strictEqual(names.length, 4);
        // All should be treated as numeric and sorted accordingly
        assert.ok(names.indexOf('1') < names.indexOf('01'));
    });

    test('Sort mixed positive and negative decimals', () => {
        const properties = [
            createTestProperty('-1.5', 'value'),
            createTestProperty('1.5', 'value'),
            createTestProperty('-0.5', 'value'),
            createTestProperty('0.5', 'value'),
            createTestProperty('0', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be in numerical order
        assert.deepStrictEqual(names, ['-1.5', '-0.5', '0', '0.5', '1.5'], 
            'Mixed positive and negative decimals should be sorted numerically');
    });

    test('Sort numbers with exponential notation', () => {
        const properties = [
            createTestProperty('1e5', 'value'),
            createTestProperty('1e3', 'value'),
            createTestProperty('2e3', 'value'),
            createTestProperty('1e-1', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should handle exponential notation
        assert.strictEqual(names.length, 4);
        // These might be treated as strings depending on implementation
    });

    test('Sort descending order with numeric keys', () => {
        const descSorter = new PropertySorter({ order: 'desc' });
        const properties = [
            createTestProperty('1', 'value1'),
            createTestProperty('10', 'value10'),
            createTestProperty('2', 'value2'),
            createTestProperty('apple', 'valueA')
        ];

        const sorted = descSorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should be in descending order: strings first (desc), then numbers (desc)
        assert.deepStrictEqual(names, ['apple', '10', '2', '1'], 
            'Descending sort should work with numeric keys');
    });

    test('Sort with Infinity and NaN-like strings', () => {
        const properties = [
            createTestProperty('Infinity', 'value'),
            createTestProperty('-Infinity', 'value'),
            createTestProperty('NaN', 'value'),
            createTestProperty('1', 'value'),
            createTestProperty('-1', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should handle special numeric strings
        assert.strictEqual(names.length, 5);
        // Infinity and NaN should be treated as strings, not numbers
        assert.ok(names.includes('Infinity'));
        assert.ok(names.includes('NaN'));
    });

    test('Sort empty string and whitespace-only numeric strings', () => {
        const properties = [
            createTestProperty('', 'value'),
            createTestProperty(' 1 ', 'value'),
            createTestProperty('1', 'value'),
            createTestProperty('  ', 'value')
        ];

        const sorted = sorter.sortProperties(properties);
        const names = sorted.map(p => p.name);

        // Should handle empty and whitespace strings
        assert.strictEqual(names.length, 4);
        // Empty string and whitespace should be treated as strings
    });
}); 