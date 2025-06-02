import * as assert from 'assert';
import { CSSParser } from '../../src/cssParser';
import { CSSReconstructor } from '../../src/cssReconstructor';
import { PropertySorter } from '../../src/sorter';
import { CoreProcessor } from '../../src/coreProcessor';

suite('CSS Parser Test Suite', () => {
    let parser: CSSParser;

    setup(() => {
        parser = new CSSParser();
    });

    test('Parse simple CSS rule', () => {
        const css = `
.button {
    z-index: 10;
    background: blue;
    color: white;
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].name, '.button');
        assert.strictEqual(result.entities[0].properties.length, 3);
        assert.strictEqual(result.entities[0].properties[0].name, 'z-index');
        assert.strictEqual(result.entities[0].properties[0].value, '10');
        assert.strictEqual(result.entities[0].properties[1].name, 'background');
        assert.strictEqual(result.entities[0].properties[1].value, 'blue');
    });

    test('Parse CSS with !important', () => {
        const css = `
.urgent {
    color: red !important;
    background: white;
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities[0].properties[0].important, true);
        assert.strictEqual(result.entities[0].properties[1].important, false);
    });

    test('Parse CSS with vendor prefixes', () => {
        const css = `
.transform {
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    transform: rotate(45deg);
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities[0].properties[0].vendorPrefix, '-webkit-');
        assert.strictEqual(result.entities[0].properties[1].vendorPrefix, '-moz-');
        assert.strictEqual(result.entities[0].properties[2].vendorPrefix, undefined);
    });

    test('Parse CSS with comments', () => {
        const css = `
/* Main button styles */
.button {
    /* Primary color */
    color: blue; /* Blue theme */
    background: white;
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities[0].leadingComments.length, 1);
        assert.strictEqual(result.entities[0].properties[0].comments.length, 2);
    });

    test('Parse multiple CSS rules', () => {
        const css = `
.button {
    color: blue;
    background: white;
}

.input {
    border: 1px solid gray;
    padding: 10px;
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 2);
        assert.strictEqual(result.entities[0].name, '.button');
        assert.strictEqual(result.entities[1].name, '.input');
    });

    test('Parse SCSS nested rules', () => {
        const scss = `
.card {
    background: white;
    border: 1px solid gray;
    
    &:hover {
        background: lightgray;
    }
}`;
        
        const result = parser.parse(scss);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 2);
        assert.strictEqual(result.entities[0].name, '.card');
        assert.strictEqual(result.entities[1].name, '&:hover');
    });

    test('Parse CSS media queries', () => {
        const css = `
@media (max-width: 768px) {
    .button {
        font-size: 14px;
        padding: 8px;
    }
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].name, '.button');
    });

    test('Parse CSS keyframes', () => {
        const css = `
@keyframes fadeIn {
    0% {
        opacity: 0;
        transform: translateY(20px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 2);
        assert.strictEqual(result.entities[0].name, '0%');
        assert.strictEqual(result.entities[1].name, '100%');
    });

    test('Convert SASS indented syntax', () => {
        const sass = `
.button
  color: blue
  background: white
  &:hover
    color: red`;
        
        const result = parser.parse(sass, 'temp.sass');
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 2);
        assert.strictEqual(result.entities[0].name, '.button');
        assert.strictEqual(result.entities[1].name, '&:hover');
    });

    test('Handle empty CSS', () => {
        const css = '';
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 0);
    });

    test('Handle CSS with only comments', () => {
        const css = `
/* This is a comment */
/* Another comment */`;
        
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 0);
    });

    test('Sort CSS keyframe percentages when sortKeyframes is enabled', () => {
        const css = `
@keyframes slideIn {
    100% {
        transform: translateX(0);
        opacity: 1;
    }
    from {
        transform: translateX(-100%);
        opacity: 0;
    }
    50% {
        transform: translateX(-50%);
        opacity: 0.5;
    }
    25% {
        transform: translateX(-75%);
        opacity: 0.25;
    }
}`;
        
        const parser = new CSSParser({
            sortKeyframes: true,
            sortOrder: 'asc'
        });
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 4);
        
        // Keyframes should be sorted by percentage: from (0%), 25%, 50%, 100%
        assert.strictEqual(result.entities[0].name, 'from');
        assert.strictEqual(result.entities[1].name, '25%');
        assert.strictEqual(result.entities[2].name, '50%');
        assert.strictEqual(result.entities[3].name, '100%');
    });

    test('Preserve keyframe order when sortKeyframes is disabled', () => {
        const css = `
@keyframes slideIn {
    100% {
        transform: translateX(0);
        opacity: 1;
    }
    from {
        transform: translateX(-100%);
        opacity: 0;
    }
    50% {
        transform: translateX(-50%);
        opacity: 0.5;
    }
}`;
        
        const parser = new CSSParser({
            sortKeyframes: false,
            sortOrder: 'asc'
        });
        const result = parser.parse(css);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 3);
        
        // Keyframes should preserve original order when sorting is disabled
        assert.strictEqual(result.entities[0].name, '100%');
        assert.strictEqual(result.entities[1].name, 'from');
        assert.strictEqual(result.entities[2].name, '50%');
    });
});

suite('CSS Reconstructor Test Suite', () => {
    let reconstructor: CSSReconstructor;

    setup(() => {
        reconstructor = new CSSReconstructor();
    });

    test('Reconstruct simple CSS rule', () => {
        const entity = {
            type: 'css-rule' as const,
            name: '.button',
            properties: [
                { 
                    name: 'background', 
                    value: 'blue', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 1,
                    fullText: 'background: blue;',
                    trailingPunctuation: ';'
                },
                { 
                    name: 'color', 
                    value: 'white', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 2,
                    fullText: 'color: white;',
                    trailingPunctuation: ';'
                },
                { 
                    name: 'z-index', 
                    value: '10', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 3,
                    fullText: 'z-index: 10;',
                    trailingPunctuation: ';'
                }
            ],
            leadingComments: [],
            startLine: 1,
            endLine: 5,
            isExported: false,
            originalText: '.button { background: blue; color: white; z-index: 10; }'
        };
        
        const result = reconstructor.reconstructEntity(entity);
        
        assert.ok(result.includes('.button {'));
        assert.ok(result.includes('background: blue;'));
        assert.ok(result.includes('color: white;'));
        assert.ok(result.includes('z-index: 10;'));
        assert.ok(result.includes('}'));
    });

    test('Reconstruct CSS with !important', () => {
        const entity = {
            type: 'css-rule' as const,
            name: '.urgent',
            properties: [
                { 
                    name: 'color', 
                    value: 'red', 
                    comments: [], 
                    important: true,
                    optional: false,
                    line: 1,
                    fullText: 'color: red !important;',
                    trailingPunctuation: ';'
                },
                { 
                    name: 'background', 
                    value: 'white', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 2,
                    fullText: 'background: white;',
                    trailingPunctuation: ';'
                }
            ],
            leadingComments: [],
            startLine: 1,
            endLine: 4,
            isExported: false,
            originalText: '.urgent { color: red !important; background: white; }'
        };
        
        const result = reconstructor.reconstructEntity(entity);
        
        assert.ok(result.includes('color: red !important;'));
        assert.ok(result.includes('background: white;'));
    });

    test('Reconstruct CSS with comments', () => {
        const entity = {
            type: 'css-rule' as const,
            name: '.button',
            properties: [
                { 
                    name: 'color', 
                    value: 'blue', 
                    comments: [{ text: 'Primary color', type: 'multi' as const, raw: '/* Primary color */', line: 2 }], 
                    important: false,
                    optional: false,
                    line: 2,
                    fullText: 'color: blue;',
                    trailingPunctuation: ';'
                }
            ],
            leadingComments: [{ text: 'Button styles', type: 'multi' as const, raw: '/* Button styles */', line: 1 }],
            startLine: 1,
            endLine: 4,
            isExported: false,
            originalText: '/* Button styles */ .button { color: blue; }'
        };
        
        const result = reconstructor.reconstructEntity(entity);
        
        assert.ok(result.includes('/* Button styles */'));
        assert.ok(result.includes('color: blue; /* Primary color */'));
    });

    test('Reconstruct SASS without braces', () => {
        const reconstructorSass = new CSSReconstructor({
            fileType: 'sass',
            addBraces: false,
            addSemicolons: false
        });
        
        const entity = {
            type: 'css-rule' as const,
            name: '.button',
            properties: [
                { 
                    name: 'color', 
                    value: 'blue', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 1,
                    fullText: 'color: blue',
                    trailingPunctuation: ''
                },
                { 
                    name: 'background', 
                    value: 'white', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 2,
                    fullText: 'background: white',
                    trailingPunctuation: ''
                }
            ],
            leadingComments: [],
            startLine: 1,
            endLine: 3,
            isExported: false,
            originalText: '.button\n  color: blue\n  background: white'
        };
        
        const result = reconstructorSass.reconstructEntity(entity);
        
        assert.ok(result.includes('.button'));
        assert.ok(result.includes('  color: blue'));
        assert.ok(result.includes('  background: white'));
        assert.ok(!result.includes('{'));
        assert.ok(!result.includes('}'));
        assert.ok(!result.includes(';'));
    });

    test('Reconstruct with custom indentation', () => {
        const reconstructorCustom = new CSSReconstructor({
            indentation: '\t'
        });
        
        const entity = {
            type: 'css-rule' as const,
            name: '.button',
            properties: [
                { 
                    name: 'color', 
                    value: 'blue', 
                    comments: [], 
                    important: false,
                    optional: false,
                    line: 1,
                    fullText: 'color: blue;',
                    trailingPunctuation: ';'
                }
            ],
            leadingComments: [],
            startLine: 1,
            endLine: 3,
            isExported: false,
            originalText: '.button { color: blue; }'
        };
        
        const result = reconstructorCustom.reconstructEntity(entity);
        
        assert.ok(result.includes('\tcolor: blue;'));
    });

    test('Update reconstructor options', () => {
        reconstructor.updateOptions({ indentation: '\t' });
        const options = reconstructor.getOptions();
        
        assert.strictEqual(options.indentation, '\t');
    });
});

suite('CSS Integration Test Suite', () => {
    let coreProcessor: CoreProcessor;

    setup(() => {
        coreProcessor = new CoreProcessor();
    });

    test('Process CSS file end-to-end', () => {
        const css = `
.button {
    z-index: 10;
    background: blue;
    color: white;
    border: none;
}`;
        
        const result = coreProcessor.processText(css, { fileType: 'css' });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Properties should be sorted alphabetically
        const lines = result.processedText.split('\n');
        const propertyLines = lines.filter(line => line.trim().includes(':'));
        
        assert.ok(propertyLines[0].includes('background'));
        assert.ok(propertyLines[1].includes('border'));
        assert.ok(propertyLines[2].includes('color'));
        assert.ok(propertyLines[3].includes('z-index'));
    });

    test('Process SCSS file with nested rules', () => {
        const scss = `
.card {
    z-index: 1;
    background: white;
    border: 1px solid gray;
    
    &:hover {
        background: lightgray;
        cursor: pointer;
    }
}`;
        
        const result = coreProcessor.processText(scss, { fileType: 'scss' });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Both rules should be sorted
        assert.ok(result.processedText.includes('background: white;'));
        assert.ok(result.processedText.includes('background: lightgray;'));
    });

    test('Process CSS with vendor prefixes and grouping', () => {
        const css = `
.transform {
    color: blue;
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    transform: rotate(45deg);
    background: white;
}`;
        
        const result = coreProcessor.processText(css, { 
            fileType: 'css',
            groupVendorPrefixes: true 
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Vendor prefixes should be grouped together
        const lines = result.processedText.split('\n').map(line => line.trim());
        const transformLines = lines.filter(line => line.includes('transform') && line.includes(':'));
        
        assert.strictEqual(transformLines.length, 3);
        assert.ok(transformLines[0].includes('-moz-transform'));
        assert.ok(transformLines[1].includes('-webkit-transform'));
        assert.ok(transformLines[2].includes('transform') && !transformLines[2].includes('-'));
    });

    test('Process CSS with !important sorting', () => {
        const css = `
.urgent {
    background: white;
    color: red !important;
    border: none;
    font-weight: bold !important;
}`;
        
        const result = coreProcessor.processText(css, { 
            fileType: 'css',
            sortByImportance: true 
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // !important properties should come first
        const lines = result.processedText.split('\n').map(line => line.trim());
        const propertyLines = lines.filter(line => line.includes(':') && line.includes(';'));
        
        assert.ok(propertyLines[0].includes('!important'));
        assert.ok(propertyLines[1].includes('!important'));
        assert.ok(!propertyLines[2].includes('!important'));
        assert.ok(!propertyLines[3].includes('!important'));
    });

    test('Process SASS indented syntax', () => {
        const sass = `
.button
  z-index: 10
  background: blue
  color: white`;
        
        const result = coreProcessor.processText(sass, { 
            fileType: 'sass'
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Should maintain SASS syntax (no braces/semicolons)
        assert.ok(!result.processedText.includes('{'));
        assert.ok(!result.processedText.includes('}'));
        assert.ok(!result.processedText.includes(';'));
        
        // Properties should be sorted
        const lines = result.processedText.split('\n').map(line => line.trim());
        const propertyLines = lines.filter(line => line.includes(':') && !line.includes('{'));
        
        assert.ok(propertyLines[0].includes('background'));
        assert.ok(propertyLines[1].includes('color'));
        assert.ok(propertyLines[2].includes('z-index'));
    });

    test('Process LESS file', () => {
        const less = `
@primary-color: blue;

.button {
    z-index: 10;
    background: @primary-color;
    color: white;
}`;
        
        const result = coreProcessor.processText(less, { fileType: 'less' });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Should preserve LESS variables and sort properties
        assert.ok(result.processedText.includes('@primary-color'));
        assert.ok(result.processedText.includes('background: @primary-color;'));
    });

    test('Handle CSS with syntax errors gracefully', () => {
        const malformedCss = `
.button {
    color: blue
    background white;
    /* missing closing brace`;
        
        const result = coreProcessor.processText(malformedCss, { fileType: 'css' });
        
        // Should handle gracefully and return original text
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
    });

    test('Process empty CSS file', () => {
        const css = '';
        
        const result = coreProcessor.processText(css, { fileType: 'css' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.processedText, '');
    });

    test('Process CSS with only comments', () => {
        const css = `
/* This is a CSS file */
/* With only comments */`;
        
        const result = coreProcessor.processText(css, { fileType: 'css' });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        assert.ok(result.processedText.includes('/* This is a CSS file */'));
    });

    test('Group CSS properties by category when groupByCategory is enabled', () => {
        const css = `
.card {
    font-size: 16px;
    z-index: 10;
    background: white;
    position: relative;
    border: 1px solid gray;
    color: blue;
    width: 200px;
    top: 10px;
}`;
        
        const result = coreProcessor.processText(css, { 
            fileType: 'css',
            groupByCategory: true,
            sortOrder: 'asc'
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Properties should be grouped by category: positioning, boxModel, border, background, typography
        const lines = result.processedText.split('\n').map(line => line.trim()).filter(line => line.includes(':'));
        
        // Extract property names from the lines
        const propertyNames = lines.map(line => line.split(':')[0].trim());
        
        // Check that positioning properties come first
        const positionIndex = propertyNames.indexOf('position');
        
        // Check that box model properties come after positioning
        const widthIndex = propertyNames.indexOf('width');
        
        // Check that border properties come after box model
        const borderIndex = propertyNames.indexOf('border');
        
        // Check that background properties come after border
        const backgroundIndex = propertyNames.indexOf('background');
        
        // Check that typography properties come after background
        const colorIndex = propertyNames.indexOf('color');
        
        // Verify category ordering (positioning < box model < border < background < typography)
        assert.ok(positionIndex < widthIndex, 'positioning should come before box model');
        assert.ok(widthIndex < borderIndex, 'box model should come before border');
        assert.ok(borderIndex < backgroundIndex, 'border should come before background');
        assert.ok(backgroundIndex < colorIndex, 'background should come before typography');
    });
});

suite('CSS Property Sorter Integration', () => {
    let sorter: PropertySorter;

    setup(() => {
        sorter = new PropertySorter();
    });

    test('Sort CSS properties with vendor prefixes grouped', () => {
        const properties = [
            { 
                name: 'color', 
                value: 'blue', 
                comments: [], 
                important: false, 
                vendorPrefix: undefined,
                optional: false,
                line: 1,
                fullText: 'color: blue;',
                trailingPunctuation: ';'
            },
            { 
                name: 'transform', 
                value: 'rotate(45deg)', 
                comments: [], 
                important: false, 
                vendorPrefix: '-webkit-',
                optional: false,
                line: 2,
                fullText: '-webkit-transform: rotate(45deg);',
                trailingPunctuation: ';'
            },
            { 
                name: 'transform', 
                value: 'rotate(45deg)', 
                comments: [], 
                important: false, 
                vendorPrefix: '-moz-',
                optional: false,
                line: 3,
                fullText: '-moz-transform: rotate(45deg);',
                trailingPunctuation: ';'
            },
            { 
                name: 'transform', 
                value: 'rotate(45deg)', 
                comments: [], 
                important: false, 
                vendorPrefix: undefined,
                optional: false,
                line: 4,
                fullText: 'transform: rotate(45deg);',
                trailingPunctuation: ';'
            },
            { 
                name: 'background', 
                value: 'white', 
                comments: [], 
                important: false, 
                vendorPrefix: undefined,
                optional: false,
                line: 5,
                fullText: 'background: white;',
                trailingPunctuation: ';'
            }
        ];
        
        const sorted = sorter.sortProperties(properties, { 
            order: 'asc',
            preserveComments: true,
            caseSensitive: false,
            sortNestedObjects: true,
            groupVendorPrefixes: true 
        });
        
        // Should group vendor prefixes together
        assert.strictEqual(sorted[0].name, 'background');
        assert.strictEqual(sorted[1].name, 'color');
        assert.strictEqual(sorted[2].vendorPrefix, undefined); // Non-prefixed transform comes first
        assert.strictEqual(sorted[3].vendorPrefix, '-moz-');   // Then -moz- prefix
        assert.strictEqual(sorted[4].vendorPrefix, '-webkit-'); // Then -webkit- prefix
    });

    test('Sort CSS properties by importance', () => {
        const properties = [
            { 
                name: 'background', 
                value: 'white', 
                comments: [], 
                important: false,
                optional: false,
                line: 1,
                fullText: 'background: white;',
                trailingPunctuation: ';'
            },
            { 
                name: 'color', 
                value: 'red', 
                comments: [], 
                important: true,
                optional: false,
                line: 2,
                fullText: 'color: red !important;',
                trailingPunctuation: ';'
            },
            { 
                name: 'border', 
                value: 'none', 
                comments: [], 
                important: false,
                optional: false,
                line: 3,
                fullText: 'border: none;',
                trailingPunctuation: ';'
            },
            { 
                name: 'font-weight', 
                value: 'bold', 
                comments: [], 
                important: true,
                optional: false,
                line: 4,
                fullText: 'font-weight: bold !important;',
                trailingPunctuation: ';'
            }
        ];
        
        const sorted = sorter.sortProperties(properties, { 
            order: 'asc',
            preserveComments: true,
            caseSensitive: false,
            sortNestedObjects: true,
            sortByImportance: true 
        });
        
        // Important properties should come first
        assert.strictEqual(sorted[0].important, true);
        assert.strictEqual(sorted[1].important, true);
        assert.strictEqual(sorted[2].important, false);
        assert.strictEqual(sorted[3].important, false);
        
        // Within each group, should be alphabetical
        assert.strictEqual(sorted[0].name, 'color');
        assert.strictEqual(sorted[1].name, 'font-weight');
        assert.strictEqual(sorted[2].name, 'background');
        assert.strictEqual(sorted[3].name, 'border');
    });
}); 