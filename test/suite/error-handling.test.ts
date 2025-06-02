import * as assert from 'assert';
import { TypeScriptParser } from '../../src/parser';
import { TypeScriptReconstructor } from '../../src/reconstructor';
import { PropertySorter } from '../../src/sorter';
import { CoreProcessor } from '../../src/coreProcessor';

suite('Error Handling Test Suite', () => {
    let parser: TypeScriptParser;
    let reconstructor: TypeScriptReconstructor;
    let sorter: PropertySorter;
    let coreProcessor: CoreProcessor;

    setup(() => {
        parser = new TypeScriptParser({ includeComments: true });
        reconstructor = new TypeScriptReconstructor({ includeComments: true });
        sorter = new PropertySorter({ order: 'asc' });
        coreProcessor = new CoreProcessor();
    });

    suite('Parser Error Handling', () => {
        test('Handle completely empty input', () => {
            const result = parser.parse('');
            assert.strictEqual(result.entities.length, 0);
            assert.ok(result.errors.length >= 0); // May or may not have errors
        });

        test('Handle input with only whitespace', () => {
            const result = parser.parse('   \n\t  \r\n   ');
            assert.strictEqual(result.entities.length, 0);
        });

        test('Handle input with only comments', () => {
            const code = `
// Just comments
/* More comments */
// Even more comments
`;
            const result = parser.parse(code);
            assert.strictEqual(result.entities.length, 0);
        });

        test('Handle severely malformed TypeScript', () => {
            const code = `
interface {{{
    broken syntax here
    no closing braces
    random: symbols: everywhere:
`;
            const result = parser.parse(code);
            // Should not crash, may or may not find entities
            assert.ok(result.entities.length >= 0);
        });

        test('Handle extremely long property names', () => {
            const longName = 'a'.repeat(10000);
            const code = `interface Test {
    ${longName}: string;
    normal: number;
}`;
            const result = parser.parse(code);
            assert.strictEqual(result.entities.length, 1);
            const entity = result.entities[0];
            assert.ok(entity.properties.some(p => p.name === longName));
        });

        test('Handle properties with extremely long values', () => {
            const longValue = 'string'.repeat(1000);
            const code = `interface Test {
    name: ${longValue};
    age: number;
}`;
            const result = parser.parse(code);
            assert.strictEqual(result.entities.length, 1);
        });

        test('Handle nested objects with circular-like references', () => {
            const code = `
const obj = {
    self: obj,
    parent: {
        child: {
            grandparent: obj
        }
    }
};`;
            const result = parser.parse(code);
            // Should parse without infinite loops
            assert.strictEqual(result.entities.length, 1);
        });

        test('Handle properties with null and undefined values', () => {
            const code = `
const obj = {
    nullValue: null,
    undefinedValue: undefined,
    normalValue: 'test'
};`;
            const result = parser.parse(code);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 3);
        });
    });

    suite('Sorter Error Handling', () => {
        test('Handle properties with null names', () => {
            const properties = [
                {
                    name: '',
                    value: 'string',
                    optional: false,
                    comments: [],
                    trailingPunctuation: ';',
                    line: 1,
                    fullText: ': string;'
                }
            ];
            
            const sorted = sorter.sortProperties(properties);
            assert.strictEqual(sorted.length, 1);
        });

        test('Handle properties with special Unicode characters', () => {
            const properties = [
                {
                    name: '🚀',
                    value: 'string',
                    optional: false,
                    comments: [],
                    trailingPunctuation: ';',
                    line: 1,
                    fullText: '🚀: string;'
                },
                {
                    name: '测试',
                    value: 'string',
                    optional: false,
                    comments: [],
                    trailingPunctuation: ';',
                    line: 2,
                    fullText: '测试: string;'
                },
                {
                    name: 'café',
                    value: 'string',
                    optional: false,
                    comments: [],
                    trailingPunctuation: ';',
                    line: 3,
                    fullText: 'café: string;'
                }
            ];
            
            const sorted = sorter.sortProperties(properties);
            assert.strictEqual(sorted.length, 3);
            // Should handle Unicode sorting gracefully
        });

        test('Handle properties with extremely long comments', () => {
            const longComment = 'This is a very long comment. '.repeat(1000);
            const properties = [
                {
                    name: 'test',
                    value: 'string',
                    optional: false,
                    comments: [{
                        text: longComment,
                        type: 'single' as const,
                        raw: `// ${longComment}`,
                        line: 1
                    }],
                    trailingPunctuation: ';',
                    line: 1,
                    fullText: 'test: string;'
                }
            ];
            
            const sorted = sorter.sortProperties(properties);
            assert.strictEqual(sorted.length, 1);
            assert.strictEqual(sorted[0].comments[0].text, longComment);
        });

        test('Handle sorting with invalid options', () => {
            const invalidSorter = new PropertySorter({
                order: 'invalid' as unknown as 'asc',
                caseSensitive: 'not-boolean' as unknown as boolean
            });
            
            const properties = [
                {
                    name: 'test',
                    value: 'string',
                    optional: false,
                    comments: [],
                    trailingPunctuation: ';',
                    line: 1,
                    fullText: 'test: string;'
                }
            ];
            
            // Should handle invalid options gracefully
            const sorted = invalidSorter.sortProperties(properties);
            assert.strictEqual(sorted.length, 1);
        });
    });

    suite('Reconstructor Error Handling', () => {
        test('Handle entity with missing required fields', () => {
            const malformedEntity = {
                type: 'interface' as const,
                name: 'Test',
                properties: [],
                startLine: 1,
                endLine: 1,
                leadingComments: [],
                isExported: false,
                originalText: ''
                // Missing some fields that might be expected
            };

            const result = reconstructor.reconstructEntity(malformedEntity);
            assert.ok(result.includes('interface Test'));
        });

        test('Handle properties with malformed comments', () => {
            const entity = {
                type: 'interface' as const,
                name: 'Test',
                properties: [{
                    name: 'test',
                    value: 'string',
                    optional: false,
                    comments: [{
                        text: '',
                        type: 'single' as const,
                        raw: '',
                        line: 0
                    }],
                    trailingPunctuation: ';',
                    line: 1,
                    fullText: 'test: string;'
                }],
                startLine: 1,
                endLine: 1,
                leadingComments: [],
                isExported: false,
                originalText: 'interface Test { test: string; }'
            };

            const result = reconstructor.reconstructEntity(entity);
            assert.ok(result.includes('test: string'));
        });

        test('Handle reconstruction with extreme indentation', () => {
            const extremeReconstructor = new TypeScriptReconstructor({
                indentation: '\t'.repeat(100) // 100 tabs
            });

            const entity = {
                type: 'interface' as const,
                name: 'Test',
                properties: [{
                    name: 'test',
                    value: 'string',
                    optional: false,
                    comments: [],
                    trailingPunctuation: ';',
                    line: 1,
                    fullText: 'test: string;'
                }],
                startLine: 1,
                endLine: 1,
                leadingComments: [],
                isExported: false,
                originalText: 'interface Test { test: string; }'
            };

            const result = extremeReconstructor.reconstructEntity(entity);
            assert.ok(result.includes('test: string'));
        });
    });

    suite('Core Processor Error Handling', () => {
        test('Handle processing with invalid sort order', () => {
            const result = coreProcessor.processText(
                'interface Test { b: string; a: number; }',
                { sortOrder: 'invalid' as unknown as 'asc' }
            );
            
            // Should handle gracefully - either succeed with default or fail gracefully
            assert.ok(typeof result.success === 'boolean');
        });

        test('Handle processing with circular object options', () => {
            const circularOptions: Record<string, unknown> = { sortOrder: 'asc' };
            circularOptions.self = circularOptions;
            
            const result = coreProcessor.processText(
                'interface Test { b: string; a: number; }',
                circularOptions
            );
            
            // Should handle gracefully
            assert.ok(typeof result.success === 'boolean');
        });

        test('Handle processing extremely large files', () => {
            let largeCode = 'interface Huge {\n';
            for (let i = 0; i < 10000; i++) {
                largeCode += `    prop${i}: string;\n`;
            }
            largeCode += '}';
            
            const result = coreProcessor.processText(largeCode, { sortOrder: 'asc' });
            
            // Should complete without timeout or memory issues
            assert.ok(typeof result.success === 'boolean');
            if (result.success) {
                assert.strictEqual(result.entitiesProcessed, 1);
            }
        });

        test('Handle processing with memory-intensive nested objects', () => {
            let nestedCode = 'const obj = {\n';
            let currentLevel = '';
            
            // Create 50 levels of nesting
            for (let i = 0; i < 50; i++) {
                currentLevel += '    ';
                nestedCode += `${currentLevel}level${i}: {\n`;
            }
            
            nestedCode += `${currentLevel}    deepValue: 'test'\n`;
            
            // Close all levels
            for (let i = 49; i >= 0; i--) {
                currentLevel = '    '.repeat(i + 1);
                nestedCode += `${currentLevel}}\n`;
            }
            nestedCode += '};';
            
            const result = coreProcessor.processText(nestedCode, {
                sortOrder: 'asc',
                sortNestedObjects: true
            });
            
            // Should handle deep nesting without stack overflow
            assert.ok(typeof result.success === 'boolean');
        });
    });

    suite('Integration Error Handling', () => {
        test('Handle full pipeline with malformed input', () => {
            const malformedCode = `
interface Broken {
    // Missing closing brace
    prop1: string;
    prop2: number
    // Syntax errors everywhere
    prop3 string;
    prop4: 
`;
            
            const result = coreProcessor.processText(malformedCode, { sortOrder: 'asc' });
            
            // Should not crash the entire pipeline
            assert.ok(typeof result.success === 'boolean');
            assert.ok(Array.isArray(result.errors));
        });

        test('Handle pipeline with mixed valid and invalid entities', () => {
            const mixedCode = `
interface Valid {
    b: string;
    a: number;
}

interface Broken {
    // Missing closing brace
    prop: string;

const validObject = {
    zebra: 'value',
    apple: 123
};

interface AnotherBroken {
    // Another broken interface
    prop1: string
    prop2: // incomplete
`;
            
            const result = coreProcessor.processText(mixedCode, { sortOrder: 'asc' });
            
            // Should process what it can
            assert.ok(typeof result.success === 'boolean');
            if (result.success) {
                assert.ok(result.entitiesProcessed >= 0);
            }
        });
    });
}); 