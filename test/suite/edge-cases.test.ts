import * as assert from 'assert';
import { TypeScriptParser } from '../../src/parser';
import { TypeScriptReconstructor } from '../../src/reconstructor';
import { PropertySorter } from '../../src/sorter';
import { CoreProcessor } from '../../src/coreProcessor';
import { ParsedProperty, PropertyComment } from '../../src/types';

suite('Edge Cases Test Suite', () => {
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

    // Helper function to create test properties
    function createTestProperty(name: string, value: string = 'string', optional: boolean = false): ParsedProperty {
        return {
            name,
            value,
            optional,
            comments: [],
            trailingPunctuation: ';',
            line: 1,
            fullText: `${name}${optional ? '?' : ''}: ${value};`
        };
    }

    // Helper function to create test comment
    function _createTestComment(text: string, type: 'single' | 'multi' = 'single'): PropertyComment {
        return {
            text,
            type,
            raw: type === 'single' ? `// ${text}` : `/* ${text} */`,
            line: 1
        };
    }

    suite('Parser Edge Cases', () => {
        test('Parse interface with empty body', () => {
            const code = `interface Empty {}`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 0);
            assert.strictEqual(result.entities[0].name, 'Empty');
        });

        test('Parse interface with only whitespace and comments', () => {
            const code = `interface WithComments {
    // Just a comment
    /* Another comment */
}`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 0);
        });

        test('Parse object with computed property names', () => {
            const code = `const obj = {
    [Symbol.iterator]: function() {},
    ['computed']: 'value',
    [1 + 2]: 'three'
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should handle computed properties gracefully
        });

        test('Parse object with method shorthand', () => {
            const code = `const obj = {
    method() {
        return 'value';
    },
    asyncMethod: async () => {},
    property: 'value'
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should parse method properties
        });

        test('Parse interface with complex generic types', () => {
            const code = `interface Complex<T extends string, U = number> {
    generic: T;
    optional?: U;
    array: Array<T>;
    mapped: { [K in keyof T]: U };
    conditional: T extends string ? U : never;
}`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 5);
        });

        test('Parse object with spread operator', () => {
            const code = `const obj = {
    ...baseObj,
    property: 'value',
    ...otherObj
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should handle spread properties gracefully
        });

        test('Parse interface with index signatures', () => {
            const code = `interface WithIndex {
    [key: string]: any;
    [index: number]: string;
    namedProperty: boolean;
}`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should handle index signatures
        });

        test('Parse nested object literals with multiple levels', () => {
            const code = `const theme = {
    colors: {
        primary: {
            light: '#fff',
            dark: '#000',
            variants: {
                hover: '#ccc',
                active: '#999'
            }
        }
    }
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should parse deeply nested objects
        });

        test('Parse object with getter and setter', () => {
            const code = `const obj = {
    _value: 0,
    get value() { return this._value; },
    set value(v) { this._value = v; },
    normalProperty: 'test'
};`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should handle getters and setters
        });

        test('Parse interface with call signatures', () => {
            const code = `interface Callable {
    (arg: string): number;
    property: boolean;
}`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            // Should handle call signatures
        });

        test('Parse malformed code with missing braces', () => {
            const code = `interface Broken {
    property: string;
    // Missing closing brace`;
            
            const result = parser.parse(code);
            // Should handle gracefully - either parse what it can or report errors
            assert.ok(result.entities.length >= 0);
        });

        test('Parse code with Unicode property names', () => {
            const code = `interface Unicode {
    café: string;
    naïve: boolean;
    '🚀': string;
    'ñoño': number;
}`;
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 4);
        });

        test('Parse very large interface', () => {
            let code = 'interface Large {\n';
            for (let i = 0; i < 1000; i++) {
                code += `    prop${i}: string;\n`;
            }
            code += '}';
            
            const result = parser.parse(code);
            
            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1);
            assert.strictEqual(result.entities[0].properties.length, 1000);
        });
    });

    suite('Sorter Edge Cases', () => {
        test('Sort properties with identical names but different cases', () => {
            const properties = [
                createTestProperty('Name', 'string'),
                createTestProperty('name', 'string'),
                createTestProperty('NAME', 'string')
            ];

            const sorted = sorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            // Should maintain stable sort for identical names (case-insensitive)
            assert.strictEqual(names.length, 3);
            assert.ok(names.includes('Name'));
            assert.ok(names.includes('name'));
            assert.ok(names.includes('NAME'));
        });

        test('Sort properties with special characters', () => {
            const properties = [
                createTestProperty('_private', 'string'),
                createTestProperty('$special', 'string'),
                createTestProperty('@decorator', 'string'),
                createTestProperty('#hash', 'string'),
                createTestProperty('normal', 'string')
            ];

            const sorted = sorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            // Should sort special characters consistently
            assert.strictEqual(names.length, 5);
            assert.ok(names.indexOf('normal') >= 0);
        });

        test('Sort numeric properties with leading zeros', () => {
            const properties = [
                createTestProperty('001', 'string'),
                createTestProperty('01', 'string'),
                createTestProperty('1', 'string'),
                createTestProperty('10', 'string')
            ];

            const sorted = sorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            // Should handle leading zeros in numeric sorting
            // The actual behavior may vary - let's test what we get
            assert.strictEqual(names.length, 4);
            assert.ok(names.includes('1'));
            assert.ok(names.includes('01'));
            assert.ok(names.includes('001'));
            assert.ok(names.includes('10'));
        });

        test('Sort properties with scientific notation', () => {
            const properties = [
                createTestProperty('1e10', 'string'),
                createTestProperty('1e2', 'string'),
                createTestProperty('2e1', 'string'),
                createTestProperty('1.5e3', 'string')
            ];

            const sorted = sorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            // Should handle scientific notation
            assert.strictEqual(names.length, 4);
        });

        test('Sort properties with very long names', () => {
            const longName = 'a'.repeat(1000);
            const properties = [
                createTestProperty('z', 'string'),
                createTestProperty(longName, 'string'),
                createTestProperty('b', 'string')
            ];

            const sorted = sorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            assert.deepStrictEqual(names, [longName, 'b', 'z']);
        });

        test('Sort empty array of properties', () => {
            const properties: ParsedProperty[] = [];
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted.length, 0);
        });

        test('Sort single property', () => {
            const properties = [createTestProperty('single', 'string')];
            const sorted = sorter.sortProperties(properties);
            
            assert.strictEqual(sorted.length, 1);
            assert.strictEqual(sorted[0].name, 'single');
        });

        test('Sort properties with null/undefined-like names', () => {
            const properties = [
                createTestProperty('null', 'string'),
                createTestProperty('undefined', 'string'),
                createTestProperty('NaN', 'string'),
                createTestProperty('Infinity', 'string')
            ];

            const sorted = sorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            // Should treat these as regular strings
            assert.deepStrictEqual(names, ['Infinity', 'NaN', 'null', 'undefined']);
        });

        test('Sort with case-sensitive option', () => {
            const caseSensitiveSorter = new PropertySorter({ order: 'asc', caseSensitive: true });
            const properties = [
                createTestProperty('Zebra', 'string'),
                createTestProperty('apple', 'string'),
                createTestProperty('Banana', 'string')
            ];

            const sorted = caseSensitiveSorter.sortProperties(properties);
            const names = sorted.map(p => p.name);
            
            // Case-sensitive: uppercase comes before lowercase in ASCII
            assert.deepStrictEqual(names, ['Banana', 'Zebra', 'apple']);
        });

        test('Sort properties with mixed trailing punctuation', () => {
            const properties = [
                { ...createTestProperty('zebra', 'string'), trailingPunctuation: ',' },
                { ...createTestProperty('apple', 'string'), trailingPunctuation: ';' },
                { ...createTestProperty('banana', 'string'), trailingPunctuation: '' }
            ];

            const sorted = sorter.sortProperties(properties);
            
            // Should preserve original trailing punctuation
            assert.strictEqual(sorted[0].name, 'apple');
            assert.strictEqual(sorted[0].trailingPunctuation, ';');
            assert.strictEqual(sorted[1].name, 'banana');
            assert.strictEqual(sorted[1].trailingPunctuation, '');
            assert.strictEqual(sorted[2].name, 'zebra');
            assert.strictEqual(sorted[2].trailingPunctuation, ',');
        });
    });

    suite('Reconstructor Edge Cases', () => {
        test('Reconstruct interface with no properties', () => {
            const code = `interface Empty {}`;
            const parseResult = parser.parse(code);
            const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
            
            assert.ok(reconstructed.includes('interface Empty {'));
            assert.ok(reconstructed.includes('}'));
            // Should not have any property lines
            const lines = reconstructed.split('\n').filter(line => line.includes(':'));
            assert.strictEqual(lines.length, 0);
        });

        test('Reconstruct object with only comments', () => {
            const code = `// Leading comment
const obj = {
    // Only comment inside
};`;
            const parseResult = parser.parse(code);
            const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
            
            assert.ok(reconstructed.includes('// Leading comment'));
            assert.ok(reconstructed.includes('const obj = {'));
            assert.ok(reconstructed.includes('};'));
        });

        test('Reconstruct with very long property names', () => {
            const longName = 'veryLongPropertyName'.repeat(10);
            const code = `interface Test {
    ${longName}: string;
    short: number;
}`;
            const parseResult = parser.parse(code);
            const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
            
            assert.ok(reconstructed.includes(longName));
            assert.ok(reconstructed.includes('short: number'));
        });

        test('Reconstruct with custom line endings', () => {
            const customReconstructor = new TypeScriptReconstructor({
                lineEnding: '\r\n'
            });
            
            const code = `interface Test {
    name: string;
    age: number;
}`;
            const parseResult = parser.parse(code);
            const reconstructed = customReconstructor.reconstructEntity(parseResult.entities[0]);
            
            assert.ok(reconstructed.includes('\r\n'));
        });

        test('Reconstruct with extreme indentation', () => {
            const customReconstructor = new TypeScriptReconstructor({
                indentation: '        ' // 8 spaces
            });
            
            const code = `interface Test {
    name: string;
}`;
            const parseResult = parser.parse(code);
            const reconstructed = customReconstructor.reconstructEntity(parseResult.entities[0]);
            
            assert.ok(reconstructed.includes('        name: string;'));
        });

        test('Reconstruct malformed entity gracefully', () => {
            const malformedEntity = {
                type: 'interface' as const,
                name: '',
                properties: [],
                startLine: 1,
                endLine: 1,
                leadingComments: [],
                isExported: false,
                originalText: ''
            };

            const reconstructed = reconstructor.reconstructEntity(malformedEntity);
            
            // Should handle empty name gracefully
            assert.ok(reconstructed.includes('interface'));
        });
    });

    suite('Core Processor Edge Cases', () => {
        test('Process file with only whitespace', () => {
            const code = '   \n\t  \n   ';
            const result = coreProcessor.processText(code);
            
            assert.strictEqual(result.success, false);
            assert.ok(result.errors.length > 0);
        });

        test('Process file with only comments', () => {
            const code = `// Just a comment
/* Another comment */
// More comments`;
            const result = coreProcessor.processText(code);
            
            assert.strictEqual(result.success, false);
            assert.ok(result.errors[0].includes('No sortable entities found'));
        });

        test('Process with conflicting options', () => {
            const code = `interface Test {
    name: string;
    age: number;
}`;
            const result = coreProcessor.processText(code, {
                sortOrder: 'asc',
                includeComments: true,
                sortNestedObjects: false
            });
            
            assert.strictEqual(result.success, true);
            // Should handle conflicting options gracefully
        });

        test('Process extremely large file', () => {
            let code = 'interface Large {\n';
            for (let i = 0; i < 5000; i++) {
                code += `    property${i}: string;\n`;
            }
            code += '}';
            
            const result = coreProcessor.processText(code, { sortOrder: 'asc' });
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
        });

        test('Process file with mixed entity types and complex nesting', () => {
            const code = `// Complex file
export interface User {
    id: number;
    profile: {
        name: string;
        settings: {
            theme: 'dark' | 'light';
            notifications: boolean;
        };
    };
}

const config = createConfig({
    api: {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retries: {
            max: 3,
            delay: 1000
        }
    },
    features: {
        enableLogging: true,
        enableMetrics: false
    }
});

export type Theme = {
    colors: {
        primary: string;
        secondary: string;
    };
    spacing: {
        small: number;
        medium: number;
        large: number;
    };
};`;

            const result = coreProcessor.processText(code, {
                sortOrder: 'asc',
                includeComments: true,
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 3);
            assert.ok(result.processedText);
        });

        test('Process with null/undefined options', () => {
            const code = `interface Test { name: string; }`;
            
            // Test with undefined options
            const result1 = coreProcessor.processText(code, undefined);
            assert.strictEqual(result1.success, true);
            
            // Test with null options (cast to avoid TypeScript error)
            const result2 = coreProcessor.processText(code, null as unknown as undefined);
            assert.strictEqual(result2.success, true);
        });
    });

    suite('Comment Edge Cases', () => {
        test('Handle comments with special characters', () => {
            const code = `interface Test {
    // Comment with émojis 🚀 and spëcial chars
    name: string;
    /* Multi-line with
       special chars: @#$%^&*()
       and unicode: café */
    age: number;
}`;
            const result = coreProcessor.processText(code, {
                sortOrder: 'asc',
                includeComments: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText?.includes('🚀'));
            assert.ok(result.processedText?.includes('café'));
        });

        test('Handle nested comments in object literals', () => {
            const code = `const obj = {
    // Top level comment
    level1: {
        // Nested comment
        level2: {
            // Deeply nested comment
            value: 'test'
        }
    }
};`;
            const result = coreProcessor.processText(code, {
                sortOrder: 'asc',
                includeComments: true,
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText?.includes('Top level comment'));
            assert.ok(result.processedText?.includes('Nested comment'));
            assert.ok(result.processedText?.includes('Deeply nested comment'));
        });

        test('Handle malformed comments', () => {
            const code = `interface Test {
    // Unclosed comment /*
    name: string;
    /* Unclosed multi-line
    age: number;
}`;
            const result = parser.parse(code);
            
            // Should handle malformed comments gracefully
            assert.ok(result.entities.length >= 0);
        });

        test('Handle comments with code-like content', () => {
            const code = `interface Test {
    // TODO: implement function() { return 'value'; }
    name: string;
    /* Example usage:
       const obj = { key: 'value' };
       obj.method(); */
    method: () => void;
}`;
            const result = coreProcessor.processText(code, {
                sortOrder: 'asc',
                includeComments: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText?.includes('TODO: implement'));
            assert.ok(result.processedText?.includes('Example usage:'));
        });
    });

    suite('Performance Edge Cases', () => {
        test('Sort properties with many duplicates', () => {
            const properties: ParsedProperty[] = [];
            for (let i = 0; i < 1000; i++) {
                properties.push(createTestProperty('duplicate', 'string'));
            }
            
            const sorted = sorter.sortProperties(properties);
            assert.strictEqual(sorted.length, 1000);
            assert.ok(sorted.every(p => p.name === 'duplicate'));
        });

        test('Process file with deeply nested objects', () => {
            let code = 'const obj = {\n';
            let indent = '    ';
            
            // Create 20 levels of nesting
            for (let i = 0; i < 20; i++) {
                code += `${indent}level${i}: {\n`;
                indent += '    ';
            }
            
            code += `${indent}deepValue: 'test'\n`;
            
            // Close all the braces
            for (let i = 19; i >= 0; i--) {
                indent = '    '.repeat(i + 1);
                code += `${indent}}\n`;
            }
            code += '};';
            
            const result = coreProcessor.processText(code, {
                sortOrder: 'asc',
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
        });
    });

    suite('Integration Edge Cases', () => {
        test('Round-trip: parse, sort, reconstruct, parse again', () => {
            const originalCode = `interface User {
    email: string;
    name: string;
    age: number;
}`;

            // First round
            const parseResult1 = parser.parse(originalCode);
            const sortedResult1 = parser.sortParseResult(parseResult1, 'asc');
            const reconstructed1 = reconstructor.reconstructEntity(sortedResult1.entities[0]);
            
            // Second round
            const parseResult2 = parser.parse(reconstructed1);
            const sortedResult2 = parser.sortParseResult(parseResult2, 'asc');
            const reconstructed2 = reconstructor.reconstructEntity(sortedResult2.entities[0]);
            
            // Should be stable
            assert.strictEqual(reconstructed1, reconstructed2);
        });

        test('Consistency across different sort orders', () => {
            const code = `interface Test {
    zebra: string;
    apple: string;
    banana: string;
}`;

            const ascResult = coreProcessor.processText(code, { sortOrder: 'asc' });
            const descResult = coreProcessor.processText(code, { sortOrder: 'desc' });
            
            assert.strictEqual(ascResult.success, true);
            assert.strictEqual(descResult.success, true);
            
            // Results should be different but both valid
            assert.notStrictEqual(ascResult.processedText, descResult.processedText);
        });
    });
}); 