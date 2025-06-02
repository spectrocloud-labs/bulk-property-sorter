import * as assert from 'assert';
import { TypeScriptReconstructor, ReconstructorOptions } from '../../src/reconstructor';
import { TypeScriptParser } from '../../src/parser';

suite('Advanced Formatting Options Test Suite', () => {
    let parser: TypeScriptParser;
    let reconstructor: TypeScriptReconstructor;

    setup(() => {
        parser = new TypeScriptParser({
            preserveFormatting: true,
            includeComments: true,
            sortNestedObjects: true,
            fileType: 'typescript'
        });
    });

    suite('Property Spacing Tests', () => {
        test('Compact spacing (default)', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'compact',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  name: string;
  age: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            assert.ok(result.includes('name: string'));
            assert.ok(result.includes('age: number'));
        });

        test('Spaced spacing', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'spaced',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  name: string;
  age: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            assert.ok(result.includes('name : string'));
            assert.ok(result.includes('age : number'));
        });

        test('Aligned spacing', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'aligned',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  name: string;
  veryLongPropertyName: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should align property values
            const lines = result.split('\n');
            const nameLine = lines.find(line => line.includes('name'));
            const longLine = lines.find(line => line.includes('veryLongPropertyName'));
            
            assert.ok(nameLine);
            assert.ok(longLine);
            
            // Both should have the same position for the colon
            const nameColonPos = nameLine.indexOf(':');
            const longColonPos = longLine.indexOf(':');
            assert.strictEqual(nameColonPos, longColonPos);
        });
    });

    suite('Trailing Comma Tests', () => {
        test('Preserve trailing commas (default)', () => {
            const options: Partial<ReconstructorOptions> = {
                trailingCommas: 'preserve',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `const obj = {
  name: "test",
  age: 25,
};`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should preserve the trailing comma
            assert.ok(result.includes('age: 25,'));
        });

        test('Add trailing commas', () => {
            const options: Partial<ReconstructorOptions> = {
                trailingCommas: 'add',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `const obj = {
  name: "test",
  age: 25
};`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should add trailing comma
            assert.ok(result.includes('age: 25,'));
        });

        test('Remove trailing commas', () => {
            const options: Partial<ReconstructorOptions> = {
                trailingCommas: 'remove',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `const obj = {
  name: "test",
  age: 25,
};`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should remove trailing comma
            assert.ok(result.includes('age: 25\n'));
            assert.ok(!result.includes('age: 25,'));
        });
    });

    suite('Comment Style Tests', () => {
        test('Preserve comment style (default)', () => {
            const options: Partial<ReconstructorOptions> = {
                commentStyle: 'preserve',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  // Single line comment
  name: string;
  /* Multi-line comment */
  age: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            assert.ok(result.includes('// Single line comment'));
            assert.ok(result.includes('/* Multi-line comment */'));
        });

        test('Convert to single-line comments', () => {
            const options: Partial<ReconstructorOptions> = {
                commentStyle: 'single-line',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  /* Multi-line comment */
  name: string;
  // Already single line
  age: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should convert multi-line to single-line
            assert.ok(result.includes('// Multi-line comment'));
            assert.ok(result.includes('// Already single line'));
            assert.ok(!result.includes('/*'));
            assert.ok(!result.includes('*/'));
        });

        test('Convert to multi-line comments', () => {
            const options: Partial<ReconstructorOptions> = {
                commentStyle: 'multi-line',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  // Single line comment
  name: string;
  /* Already multi-line */
  age: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should convert single-line to multi-line
            assert.ok(result.includes('/* Single line comment */'));
            assert.ok(result.includes('/* Already multi-line */'));
            assert.ok(!result.includes('//'));
        });
    });

    suite('Combined Formatting Options Tests', () => {
        test('All formatting options together', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'aligned',
                trailingCommas: 'add',
                commentStyle: 'single-line',
                indentation: '    ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  /* Comment for name */
  name: string;
  // Comment for age
  veryLongPropertyName: number
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Check aligned spacing
            const lines = result.split('\n');
            const nameLine = lines.find(line => line.includes('name') && line.includes(':'));
            const longLine = lines.find(line => line.includes('veryLongPropertyName'));
            
            if (nameLine && longLine) {
                const nameColonPos = nameLine.indexOf(':');
                const longColonPos = longLine.indexOf(':');
                assert.strictEqual(nameColonPos, longColonPos);
            }

            // Check single-line comments
            assert.ok(result.includes('// Comment for name'));
            assert.ok(result.includes('// Comment for age'));

            // Check trailing commas added
            assert.ok(result.includes('string,'));
            assert.ok(result.includes('number,'));
        });

        test('Object literal with all formatting options', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'spaced',
                trailingCommas: 'remove',
                commentStyle: 'multi-line',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `const config = {
  // API endpoint
  apiUrl: "https://api.example.com",
  // Timeout in milliseconds
  timeout: 5000,
};`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Check spaced formatting
            assert.ok(result.includes('apiUrl : "https://api.example.com"'));
            assert.ok(result.includes('timeout : 5000'));

            // Check multi-line comments
            assert.ok(result.includes('/* API endpoint */'));
            assert.ok(result.includes('/* Timeout in milliseconds */'));

            // Check trailing commas removed
            assert.ok(!result.includes('5000,'));
        });
    });

    suite('Blank Lines Between Groups Tests', () => {
        test('Blank lines between groups disabled (default)', () => {
            const options: Partial<ReconstructorOptions> = {
                blankLinesBetweenGroups: false,
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  name: string;
  age: number;
  active: boolean;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Should not have extra blank lines
            const lines = result.split('\n').filter(line => line.trim() !== '');
            assert.ok(lines.length <= 6); // interface line + 3 properties + closing brace + possible empty line
        });

        test('Blank lines between groups enabled', () => {
            const options: Partial<ReconstructorOptions> = {
                blankLinesBetweenGroups: true,
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Test {
  name: string;
  age: number;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            // Note: This feature would need groupByType to be meaningful
            // For now, just verify it doesn't break reconstruction
            assert.ok(result.includes('interface Test'));
            assert.ok(result.includes('name: string'));
            assert.ok(result.includes('age: number'));
        });
    });

    suite('Edge Cases', () => {
        test('Empty interface with formatting options', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'aligned',
                trailingCommas: 'add',
                commentStyle: 'single-line',
                indentation: '  ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Empty {}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            assert.ok(result.includes('interface Empty'));
            assert.ok(result.includes('{}'));
        });

        test('Single property with all formatting options', () => {
            const options: Partial<ReconstructorOptions> = {
                propertySpacing: 'spaced',
                trailingCommas: 'add',
                commentStyle: 'multi-line',
                indentation: '    ',
                lineEnding: '\n'
            };
            reconstructor = new TypeScriptReconstructor(options);

            const input = `interface Single {
  // Only property
  value: string;
}`;

            const parseResult = parser.parse(input);
            const result = reconstructor.reconstructEntities(parseResult.entities);

            assert.ok(result.includes('/* Only property */'));
            assert.ok(result.includes('value : string,'));
        });
    });
}); 