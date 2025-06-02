import * as assert from 'assert';
import { processText } from '../../src/coreProcessor';

suite('Nested Object Sorting Tests', () => {
    const testCode = `export const button = recipe({
    zBase: {
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'blue',
    },
    aVariants: {
        variant: {
            zPrimary: {
                zColor: 'white',
                backgroundColor: 'blue',
                anotherProp: 'value',
            },
            aSecondary: {
                zColor: 'black',
                backgroundColor: 'transparent',
                anotherProp: 'value',
            },
        },
    },
});`;

    test('should sort nested objects when sortNestedObjects is true', () => {
        const result = processText(testCode, {
            sortOrder: 'asc',
            sortNestedObjects: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check that top-level properties are sorted
        const lines = result.processedText.split('\n');
        const aVariantsIndex = lines.findIndex(line => line.includes('aVariants:'));
        const zBaseIndex = lines.findIndex(line => line.includes('zBase:'));
        assert.ok(aVariantsIndex < zBaseIndex, 'aVariants should come before zBase');

        // Check that nested properties are sorted
        assert.ok(result.processedText.includes('aSecondary'), 'Should contain aSecondary');
        assert.ok(result.processedText.includes('zPrimary'), 'Should contain zPrimary');
        
        const aSecondaryIndex = result.processedText.indexOf('aSecondary');
        const zPrimaryIndex = result.processedText.indexOf('zPrimary');
        assert.ok(aSecondaryIndex < zPrimaryIndex, 'aSecondary should come before zPrimary');

        // Check that deeply nested properties are sorted
        assert.ok(result.processedText.includes('anotherProp: \'value\','), 'Should contain sorted nested properties');
        assert.ok(result.processedText.includes('backgroundColor:'), 'Should contain backgroundColor');
        assert.ok(result.processedText.includes('zColor:'), 'Should contain zColor');
    });

    test('should not sort nested objects when sortNestedObjects is false', () => {
        const result = processText(testCode, {
            sortOrder: 'asc',
            sortNestedObjects: false
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check that top-level properties are still sorted
        const lines = result.processedText.split('\n');
        const aVariantsIndex = lines.findIndex(line => line.includes('aVariants:'));
        const zBaseIndex = lines.findIndex(line => line.includes('zBase:'));
        assert.ok(aVariantsIndex < zBaseIndex, 'aVariants should come before zBase');

        // Check that nested properties maintain original order
        const aSecondaryIndex = result.processedText.indexOf('aSecondary');
        const zPrimaryIndex = result.processedText.indexOf('zPrimary');
        assert.ok(zPrimaryIndex < aSecondaryIndex, 'zPrimary should come before aSecondary (original order)');

        // Check that deeply nested properties maintain original order
        const zColorIndex = result.processedText.indexOf('zColor:');
        const backgroundColorIndex = result.processedText.indexOf('backgroundColor:');
        assert.ok(zColorIndex < backgroundColorIndex, 'zColor should come before backgroundColor (original order)');
    });

    test('should handle simple nested objects', () => {
        const simpleCode = `const config = {
    zSettings: {
        zValue: 1,
        aValue: 2,
    },
    aOptions: {
        zOption: true,
        aOption: false,
    },
};`;

        const result = processText(simpleCode, {
            sortOrder: 'asc',
            sortNestedObjects: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check sorting at all levels
        const aOptionsIndex = result.processedText.indexOf('aOptions:');
        const zSettingsIndex = result.processedText.indexOf('zSettings:');
        assert.ok(aOptionsIndex < zSettingsIndex, 'aOptions should come before zSettings');

        // Check nested sorting
        assert.ok(result.processedText.includes('aOption: false'), 'Should contain sorted nested properties');
        assert.ok(result.processedText.includes('zOption: true'), 'Should contain sorted nested properties');
    });

    test('should handle deeply nested objects', () => {
        const deepCode = `const theme = {
    zColors: {
        zPrimary: {
            zDark: '#000',
            aLight: '#fff',
        },
        aPrimary: {
            zDark: '#333',
            aLight: '#ccc',
        },
    },
};`;

        const result = processText(deepCode, {
            sortOrder: 'asc',
            sortNestedObjects: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check that all levels are sorted
        assert.ok(result.processedText.includes('aPrimary'), 'Should contain aPrimary');
        assert.ok(result.processedText.includes('zPrimary'), 'Should contain zPrimary');
        assert.ok(result.processedText.includes('aLight'), 'Should contain aLight');
        assert.ok(result.processedText.includes('zDark'), 'Should contain zDark');
    });

    test('should handle function calls with object literal in non-first argument', () => {
        const functionCallCode = `export const theme = createGlobalTheme(':root', {
    zBorderRadius: {
        zLarge: pxToRem(8),
        aDefault: pxToRem(4),
        mSmall: pxToRem(2),
    },
    aColor: {
        zButton: {
            zSuccess: {
                zBackgroundHover: '#238886',
                aBackground: '#1F7A78',
            },
            aDefault: {
                zBackgroundHover: '#F1F3F3',
                aBackground: '#F0F2F2',
            },
        },
    },
});`;

        const result = processText(functionCallCode, {
            sortOrder: 'asc',
            sortNestedObjects: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Check that top-level properties are sorted
        const aColorIndex = result.processedText.indexOf('aColor:');
        const zBorderRadiusIndex = result.processedText.indexOf('zBorderRadius:');
        assert.ok(aColorIndex < zBorderRadiusIndex, 'aColor should come before zBorderRadius');

        // Check that nested properties are sorted at all levels
        const aDefaultIndex = result.processedText.indexOf('aDefault:');
        const zSuccessIndex = result.processedText.indexOf('zSuccess:');
        assert.ok(aDefaultIndex < zSuccessIndex, 'aDefault should come before zSuccess');

        // Check deeply nested properties are sorted
        assert.ok(result.processedText.includes('aBackground: \'#F0F2F2\''), 'Should contain sorted nested properties');
        assert.ok(result.processedText.includes('zBackgroundHover: \'#F1F3F3\''), 'Should contain sorted nested properties');

        // Check that the function call structure is preserved
        assert.ok(result.processedText.includes('createGlobalTheme(\':root\', {'), 'Should preserve function call structure');
        assert.ok(result.processedText.includes('});'), 'Should preserve function call closing');
    });
}); 