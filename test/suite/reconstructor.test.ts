import * as assert from 'assert';
import { TypeScriptReconstructor, reconstructEntity, reconstructEntities } from '../../src/reconstructor';
import { TypeScriptParser } from '../../src/parser';
import { PropertySorter } from '../../src/sorter';

suite('TypeScript Reconstructor Test Suite', () => {
    let reconstructor: TypeScriptReconstructor;
    let parser: TypeScriptParser;

    setup(() => {
        reconstructor = new TypeScriptReconstructor();
        parser = new TypeScriptParser();
    });

    test('Reconstruct simple interface', () => {
        const code = `interface User {
    name: string;
    age: number;
    email: string;
}`;

        const parseResult = parser.parse(code);
        assert.strictEqual(parseResult.entities.length, 1);

        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        // Should contain the interface structure
        assert.ok(reconstructed.includes('interface User {'));
        assert.ok(reconstructed.includes('name: string;'));
        assert.ok(reconstructed.includes('age: number;'));
        assert.ok(reconstructed.includes('email: string;'));
        assert.ok(reconstructed.includes('}'));
    });

    test('Reconstruct interface with comments', () => {
        const code = `interface User {
    // User's full name
    name: string;
    /**
     * User's age in years
     */
    age: number;
    email: string;
}`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        // Should preserve comments
        assert.ok(reconstructed.includes('// User\'s full name'));
        assert.ok(reconstructed.includes('/**'));
        assert.ok(reconstructed.includes('* User\'s age in years'));
        assert.ok(reconstructed.includes('*/'));
    });

    test('Reconstruct exported interface', () => {
        const code = `export interface User {
    name: string;
    age: number;
}`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('export interface User {'));
    });

    test('Reconstruct interface with optional properties', () => {
        const code = `interface User {
    name: string;
    age?: number;
    email: string;
}`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('age?: number;'));
        assert.ok(reconstructed.includes('name: string;'));
        assert.ok(reconstructed.includes('email: string;'));
    });

    test('Reconstruct object literal', () => {
        const code = `const config = {
    theme: 'dark',
    version: 1,
    enabled: true
};`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('const config = {'));
        assert.ok(reconstructed.includes('theme: \'dark\','));
        assert.ok(reconstructed.includes('version: 1,'));
        assert.ok(reconstructed.includes('enabled: true'));
        assert.ok(!reconstructed.includes('enabled: true,'));
        assert.ok(reconstructed.includes('};'));
    });

    test('Reconstruct object literal with function call', () => {
        const code = `export const myStyle = createStyle({
    fontWeight: 'bold',
    fontSize: 16,
    color: 'red'
});`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('export const myStyle = createStyle({'));
        assert.ok(reconstructed.includes('fontWeight: \'bold\','));
        assert.ok(reconstructed.includes('fontSize: 16,'));
        assert.ok(reconstructed.includes('color: \'red\''));
        assert.ok(!reconstructed.includes('color: \'red\','));
        assert.ok(reconstructed.includes('});'));
    });

    test('Reconstruct type alias', () => {
        const code = `export type UserType = {
    name: string;
    age: number;
};`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('export type UserType = {'));
        assert.ok(reconstructed.includes('name: string;'));
        assert.ok(reconstructed.includes('age: number;'));
        assert.ok(reconstructed.includes('};'));
    });

    test('Reconstruct multiple entities', () => {
        const code = `interface User {
    name: string;
    age: number;
}

const config = {
    theme: 'dark',
    version: 1
};

export type Settings = {
    enabled: boolean;
};`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntities(parseResult.entities);
        
        // Should contain all three entities
        assert.ok(reconstructed.includes('interface User {'));
        assert.ok(reconstructed.includes('const config = {'));
        assert.ok(reconstructed.includes('export type Settings = {'));
        
        // Should be separated by double line breaks
        const parts = reconstructed.split('\n\n');
        assert.strictEqual(parts.length, 3);
    });

    test('Reconstruct with custom indentation', () => {
        const code = `interface User {
    name: string;
    age: number;
}`;

        const parseResult = parser.parse(code);
        const customReconstructor = new TypeScriptReconstructor({
            indentation: '\t' // Use tabs instead of spaces
        });
        
        const reconstructed = customReconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('\tname: string;'));
        assert.ok(reconstructed.includes('\tage: number;'));
    });

    test('Reconstruct without comments', () => {
        const code = `interface User {
    // This comment should be excluded
    name: string;
    age: number;
}`;

        const parseResult = parser.parse(code);
        const noCommentsReconstructor = new TypeScriptReconstructor({
            includeComments: false
        });
        
        const reconstructed = noCommentsReconstructor.reconstructEntity(parseResult.entities[0]);
        
        assert.ok(!reconstructed.includes('// This comment should be excluded'));
        assert.ok(reconstructed.includes('name: string;'));
        assert.ok(reconstructed.includes('age: number;'));
    });

    test('Reconstruct sorted properties', () => {
        const code = `interface User {
    email: string;
    age: number;
    name: string;
}`;

        const parseResult = parser.parse(code);
        const sorter = new PropertySorter({ order: 'asc' });
        const sortedEntity = sorter.sortEntityProperties(parseResult.entities[0]);
        
        const reconstructed = reconstructor.reconstructEntity(sortedEntity);
        
        // Properties should be in alphabetical order
        const lines = reconstructed.split('\n');
        const propertyLines = lines.filter(line => line.includes(': ') && line.includes(';'));
        
        assert.ok(propertyLines[0].includes('age: number;'));
        assert.ok(propertyLines[1].includes('email: string;'));
        assert.ok(propertyLines[2].includes('name: string;'));
    });

    test('Convenience function reconstructEntity', () => {
        const code = `interface User {
    name: string;
    age: number;
}`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructEntity(parseResult.entities[0]);
        
        assert.ok(reconstructed.includes('interface User {'));
        assert.ok(reconstructed.includes('name: string;'));
        assert.ok(reconstructed.includes('age: number;'));
    });

    test('Convenience function reconstructEntities', () => {
        const code = `interface User {
    name: string;
}

const config = {
    theme: 'dark'
};`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructEntities(parseResult.entities);
        
        assert.ok(reconstructed.includes('interface User {'));
        assert.ok(reconstructed.includes('const config = {'));
    });

    test('Handle reconstruction errors gracefully', () => {
        // Create a malformed entity to test error handling
        const malformedEntity = {
            type: 'unknown' as 'interface',
            name: 'Test',
            properties: [],
            startLine: 1,
            endLine: 3,
            leadingComments: [],
            isExported: false,
            originalText: 'malformed'
        };

        const reconstructed = reconstructor.reconstructEntities([malformedEntity]);
        
        assert.ok(reconstructed.includes('// Error reconstructing Test:'));
    });

    test('Preserve shorthand properties in objects', () => {
        const code = `const obj = {
    name,
    age: 25
};`;

        const parseResult = parser.parse(code);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        // Should preserve shorthand property syntax
        assert.ok(reconstructed.includes('name,'));
        assert.ok(reconstructed.includes('age: 25')); // Last property has no comma
        assert.ok(!reconstructed.includes('age: 25,')); // Ensure no comma is added
    });

    test('Update reconstructor options', () => {
        const initialOptions = reconstructor.getOptions();
        assert.strictEqual(initialOptions.indentation, '    ');
        
        reconstructor.updateOptions({ indentation: '\t' });
        
        const updatedOptions = reconstructor.getOptions();
        assert.strictEqual(updatedOptions.indentation, '\t');
    });

    test('Preserve trailing semicolons in object properties when present in original', () => {
        const codeWithSemicolons = `const config = {
    theme: 'dark';
    version: 1;
    enabled: true;
};`;

        const parseResult = parser.parse(codeWithSemicolons);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        // Should preserve semicolons instead of using commas
        assert.ok(reconstructed.includes('theme: \'dark\';'), 'Should preserve semicolon for theme property');
        assert.ok(reconstructed.includes('version: 1;'), 'Should preserve semicolon for version property');
        assert.ok(reconstructed.includes('enabled: true;'), 'Should preserve semicolon for enabled property');
        assert.ok(!reconstructed.includes('theme: \'dark\','), 'Should not use comma when original has semicolon');
    });

    test('Preserve no trailing punctuation in object properties when absent in original', () => {
        const codeWithoutTrailing = `const config = {
    theme: 'dark'
    version: 1
    enabled: true
};`;

        const parseResult = parser.parse(codeWithoutTrailing);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        // Should preserve no trailing punctuation
        assert.ok(reconstructed.includes('theme: \'dark\''), 'Should have theme property');
        assert.ok(reconstructed.includes('version: 1'), 'Should have version property');
        assert.ok(reconstructed.includes('enabled: true'), 'Should have enabled property');
        assert.ok(!reconstructed.includes('theme: \'dark\','), 'Should not add comma when original has none');
        assert.ok(!reconstructed.includes('theme: \'dark\';'), 'Should not add semicolon when original has none');
    });

    test('Preserve mixed trailing punctuation styles in object properties', () => {
        const codeWithMixed = `const config = {
    theme: 'dark',
    version: 1;
    enabled: true
};`;

        const parseResult = parser.parse(codeWithMixed);
        const reconstructed = reconstructor.reconstructEntity(parseResult.entities[0]);
        
        // Should preserve the original punctuation for each property
        assert.ok(reconstructed.includes('theme: \'dark\','), 'Should preserve comma for theme property');
        assert.ok(reconstructed.includes('version: 1;'), 'Should preserve semicolon for version property');
        assert.ok(reconstructed.includes('enabled: true'), 'Should preserve no punctuation for enabled property');
    });
}); 