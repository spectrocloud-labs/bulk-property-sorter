import * as assert from 'assert';
import { TypeScriptParser } from '../../src/parser';

suite('Spread Syntax Test Suite', () => {
    let parser: TypeScriptParser;

    setup(() => {
        parser = new TypeScriptParser();
    });

    suite('Object Spread Parsing', () => {
        test('Parse object with single spread at beginning', () => {
            const code = `const obj = {
    ...baseObj,
    zebra: 'value',
    apple: 'value'
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 3);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, 'zebra');
            assert.strictEqual(properties[2].name, 'apple');
        });

        test('Parse object with single spread at end', () => {
            const code = `const obj = {
    zebra: 'value',
    apple: 'value',
    ...baseObj
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 3);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, 'zebra');
            assert.strictEqual(properties[1].name, 'apple');
            assert.strictEqual(properties[2].name, '...baseObj');
            assert.strictEqual(properties[2].isSpread, true);
        });

        test('Parse object with multiple spreads', () => {
            const code = `const obj = {
    ...baseObj,
    zebra: 'value',
    ...otherObj,
    apple: 'value',
    ...thirdObj
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 5);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, 'zebra');
            assert.strictEqual(properties[2].name, '...otherObj');
            assert.strictEqual(properties[2].isSpread, true);
            assert.strictEqual(properties[3].name, 'apple');
            assert.strictEqual(properties[4].name, '...thirdObj');
            assert.strictEqual(properties[4].isSpread, true);
        });

        test('Parse object with only spread properties', () => {
            const code = `const obj = {
    ...baseObj,
    ...otherObj
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 2);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, '...otherObj');
            assert.strictEqual(properties[1].isSpread, true);
        });

        test('Parse object with complex spread expressions', () => {
            const code = `const obj = {
    ...getBaseConfig(),
    ...config.defaults,
    ...options?.overrides,
    property: 'value'
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 4);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...getBaseConfig()');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, '...config.defaults');
            assert.strictEqual(properties[1].isSpread, true);
            assert.strictEqual(properties[2].name, '...options?.overrides');
            assert.strictEqual(properties[2].isSpread, true);
            assert.strictEqual(properties[3].name, 'property');
        });
    });

    suite('Nested Object Spread Parsing', () => {
        test('Parse nested object with spread', () => {
            const code = `const obj = {
    config: {
        ...defaultConfig,
        zebra: 'value',
        apple: 'value'
    }
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 1);
            
            const configProperty = result.entities[0].properties[0];
            assert.strictEqual(configProperty.name, 'config');
            assert.strictEqual(configProperty.hasNestedObject, true);
            assert.strictEqual(configProperty.nestedProperties?.length, 3);
            
            const nestedProperties = configProperty.nestedProperties!;
            assert.strictEqual(nestedProperties[0].name, '...defaultConfig');
            assert.strictEqual(nestedProperties[0].isSpread, true);
            assert.strictEqual(nestedProperties[1].name, 'zebra');
            assert.strictEqual(nestedProperties[2].name, 'apple');
        });
    });

    suite('Function Call Object Spread Parsing', () => {
        test('Parse function call with spread in object argument', () => {
            const code = `const styles = createStyle({
    ...baseStyles,
    zebra: 'value',
    apple: 'value'
});`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 3);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseStyles');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, 'zebra');
            assert.strictEqual(properties[2].name, 'apple');
        });
    });

    suite('Spread Syntax Sorting', () => {
        test('Sort object with spread at beginning (spread should stay in place)', () => {
            const code = `const obj = {
    ...baseObj,
    zebra: 'value',
    apple: 'value'
};`;
            const result = parser.parse(code);
            const sortedResult = parser.sortParseResult(result, 'asc');
            
            assert.strictEqual(sortedResult.errors.length, 0);
            assert.strictEqual(sortedResult.entities.length, 1);
            
            const properties = sortedResult.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, 'apple');
            assert.strictEqual(properties[2].name, 'zebra');
        });

        test('Sort object with spread at end (spread should stay in place)', () => {
            const code = `const obj = {
    zebra: 'value',
    apple: 'value',
    ...baseObj
};`;
            const result = parser.parse(code);
            const sortedResult = parser.sortParseResult(result, 'asc');
            
            assert.strictEqual(sortedResult.errors.length, 0);
            assert.strictEqual(sortedResult.entities.length, 1);
            
            const properties = sortedResult.entities[0].properties;
            assert.strictEqual(properties[0].name, 'apple');
            assert.strictEqual(properties[1].name, 'zebra');
            assert.strictEqual(properties[2].name, '...baseObj');
            assert.strictEqual(properties[2].isSpread, true);
        });

        test('Sort object with multiple spreads (spreads should maintain relative positions)', () => {
            const code = `const obj = {
    ...baseObj,
    zebra: 'value',
    ...otherObj,
    apple: 'value',
    ...thirdObj
};`;
            const result = parser.parse(code);
            const sortedResult = parser.sortParseResult(result, 'asc');
            
            assert.strictEqual(sortedResult.errors.length, 0);
            assert.strictEqual(sortedResult.entities.length, 1);
            
            const properties = sortedResult.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, 'apple');
            assert.strictEqual(properties[2].name, '...otherObj');
            assert.strictEqual(properties[2].isSpread, true);
            assert.strictEqual(properties[3].name, 'zebra');
            assert.strictEqual(properties[4].name, '...thirdObj');
            assert.strictEqual(properties[4].isSpread, true);
        });

        test('Sort object with only spread properties (order should be preserved)', () => {
            const code = `const obj = {
    ...secondObj,
    ...firstObj
};`;
            const result = parser.parse(code);
            const sortedResult = parser.sortParseResult(result, 'asc');
            
            assert.strictEqual(sortedResult.errors.length, 0);
            assert.strictEqual(sortedResult.entities.length, 1);
            
            const properties = sortedResult.entities[0].properties;
            assert.strictEqual(properties[0].name, '...secondObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[1].name, '...firstObj');
            assert.strictEqual(properties[1].isSpread, true);
        });
    });

    suite('Spread Syntax Reconstruction', () => {
        test('Reconstruct object with spread properties', () => {
            const code = `export const row = style({
    ...baseRowStyle,
    justifyContent: 'flex-start',
});`;
            const result = parser.parse(code);
            const sortedResult = parser.sortParseResult(result, 'asc');
            
            assert.strictEqual(sortedResult.errors.length, 0);
            assert.strictEqual(sortedResult.entities.length, 1);
            
            const entity = sortedResult.entities[0];
            assert.strictEqual(entity.properties.length, 2);
            assert.strictEqual(entity.properties[0].name, '...baseRowStyle');
            assert.strictEqual(entity.properties[0].isSpread, true);
            assert.strictEqual(entity.properties[1].name, 'justifyContent');
        });

        test('Reconstruct object with trailing commas preserved', () => {
            const code = `const obj = {
    ...baseObj,
    property: 'value',
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].trailingPunctuation, ',');
            assert.strictEqual(properties[1].name, 'property');
            assert.strictEqual(properties[1].trailingPunctuation, ',');
        });
    });

    suite('Edge Cases', () => {
        test('Parse empty object (should not crash)', () => {
            const code = `const obj = {};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 0);
        });

        test('Parse object with spread and comments', () => {
            const code = `const obj = {
    // Base configuration
    ...baseObj,
    // Custom property
    property: 'value'
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 2);
            
            const properties = result.entities[0].properties;
            assert.strictEqual(properties[0].name, '...baseObj');
            assert.strictEqual(properties[0].isSpread, true);
            assert.strictEqual(properties[0].comments.length, 1);
            assert.strictEqual(properties[0].comments[0].text, 'Base configuration');
            
            assert.strictEqual(properties[1].name, 'property');
            assert.strictEqual(properties[1].comments.length, 1);
            assert.strictEqual(properties[1].comments[0].text, 'Custom property');
        });
    });
}); 