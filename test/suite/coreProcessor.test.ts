import * as assert from 'assert';
import { CoreProcessor, processText } from '../../src/coreProcessor';

suite('Core Processor Test Suite', () => {
    let processor: CoreProcessor;

    setup(() => {
        processor = new CoreProcessor();
    });

    test('Process simple interface - ascending order', () => {
        const code = `
interface User {
    email: string;
    age: number;
    name: string;
}`;

        const result = processor.processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 1);
        assert.strictEqual(result.errors.length, 0);
        assert.ok(result.processedText);
        
        // Check that properties are sorted alphabetically
        const lines = result.processedText.split('\n');
        const ageIndex = lines.findIndex(line => line.includes('age: number'));
        const emailIndex = lines.findIndex(line => line.includes('email: string'));
        const nameIndex = lines.findIndex(line => line.includes('name: string'));
        
        assert.ok(ageIndex < emailIndex, 'age should come before email');
        assert.ok(emailIndex < nameIndex, 'email should come before name');
    });

    test('Process simple interface - descending order', () => {
        const code = `
interface User {
    age: number;
    email: string;
    name: string;
}`;

        const result = processor.processText(code, { sortOrder: 'desc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 1);
        assert.ok(result.processedText);
        
        // Check that properties are sorted in descending order
        const lines = result.processedText.split('\n');
        const ageIndex = lines.findIndex(line => line.includes('age: number'));
        const emailIndex = lines.findIndex(line => line.includes('email: string'));
        const nameIndex = lines.findIndex(line => line.includes('name: string'));
        
        assert.ok(nameIndex < emailIndex, 'name should come before email');
        assert.ok(emailIndex < ageIndex, 'email should come before age');
    });

    test('Process interface with comments', () => {
        const code = `
interface User {
    // User's email address
    email: string;
    /**
     * User's age in years
     */
    age: number;
    name: string;
}`;

        const result = processor.processText(code, { 
            sortOrder: 'asc',
            includeComments: true 
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Check that comments are preserved
        assert.ok(result.processedText.includes("User's email address"));
        assert.ok(result.processedText.includes("User's age in years"));
        
        // Check sorting with comments preserved
        const lines = result.processedText.split('\n');
        const ageCommentIndex = lines.findIndex(line => line.includes("User's age in years"));
        const emailCommentIndex = lines.findIndex(line => line.includes("User's email address"));
        
        assert.ok(ageCommentIndex < emailCommentIndex, 'age comment should come before email comment after sorting');
    });

    test('Process object literal', () => {
        const code = `
const config = {
    version: 1,
    theme: 'dark',
    enabled: true
};`;

        const result = processor.processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 1);
        assert.ok(result.processedText);
        
        // Check that properties are sorted
        const lines = result.processedText.split('\n');
        const enabledIndex = lines.findIndex(line => line.includes('enabled: true'));
        const themeIndex = lines.findIndex(line => line.includes('theme:'));
        const versionIndex = lines.findIndex(line => line.includes('version: 1'));
        
        assert.ok(enabledIndex < themeIndex, 'enabled should come before theme');
        assert.ok(themeIndex < versionIndex, 'theme should come before version');
    });

    test('Process multiple entities in one file', () => {
        const code = `
interface User {
    email: string;
    name: string;
    age: number;
}

const config = {
    version: 1,
    theme: 'dark'
};

type Settings = {
    enabled: boolean;
    debug: boolean;
};`;

        const result = processor.processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 3);
        assert.ok(result.processedText);
        
        // All entities should be processed and sorted
        const processedText = result.processedText;
        
        // Check interface sorting
        const userAgeIndex = processedText.indexOf('age: number');
        const userEmailIndex = processedText.indexOf('email: string');
        const userNameIndex = processedText.indexOf('name: string');
        assert.ok(userAgeIndex < userEmailIndex && userEmailIndex < userNameIndex);
        
        // Check object sorting
        const configThemeIndex = processedText.indexOf('theme:');
        const configVersionIndex = processedText.indexOf('version: 1');
        assert.ok(configThemeIndex < configVersionIndex);
        
        // Check type alias sorting
        const settingsDebugIndex = processedText.indexOf('debug: boolean');
        const settingsEnabledIndex = processedText.indexOf('enabled: boolean');
        assert.ok(settingsDebugIndex < settingsEnabledIndex);
    });

    test('Handle already sorted properties', () => {
        const code = `
interface User {
    age: number;
    email: string;
    name: string;
}`;

        const result = processor.processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 1);
        assert.strictEqual(result.warnings.length, 1);
        assert.ok(result.warnings[0].includes('already sorted'));
        assert.strictEqual(result.processedText, code);
    });

    test('Handle empty file', () => {
        const code = '';

        const result = processor.processText(code);
        
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.entitiesProcessed, 0);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('No sortable entities found'));
    });

    test('Handle file with no sortable entities', () => {
        const code = `
const simpleVariable = 'hello';
function myFunction() {
    return 42;
}`;

        const result = processor.processText(code);
        
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.entitiesProcessed, 0);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('No sortable entities found'));
    });

    test('Handle syntax errors gracefully', () => {
        const code = `
interface User {
    name: string
    age: number // missing semicolon
    email string; // syntax error
}`;

        const result = processor.processText(code);
        
        // Should either succeed with partial parsing or fail gracefully
        if (result.success) {
            assert.ok(result.entitiesProcessed >= 0);
        } else {
            assert.ok(result.errors.length > 0);
        }
    });

    test('Process with custom indentation', () => {
        const code = `
interface User {
    name: string;
    age: number;
}`;

        const result = processor.processText(code, { 
            sortOrder: 'asc',
            indentation: '\t' // Use tabs
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Check that tabs are used for indentation
        const lines = result.processedText.split('\n');
        const propertyLine = lines.find(line => line.includes('age: number'));
        assert.ok(propertyLine?.startsWith('\t'), 'Should use tab indentation');
    });

    test('Process with comments disabled', () => {
        const code = `
interface User {
    // This comment should be removed
    name: string;
    age: number;
}`;

        const result = processor.processText(code, { 
            sortOrder: 'asc',
            includeComments: false 
        });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Comments should not be included
        assert.ok(!result.processedText.includes('This comment should be removed'));
    });

    test('Convenience function processText', () => {
        const code = `
interface User {
    email: string;
    name: string;
}`;

        const result = processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 1);
        assert.ok(result.processedText);
        
        // Check sorting
        const emailIndex = result.processedText.indexOf('email: string');
        const nameIndex = result.processedText.indexOf('name: string');
        assert.ok(emailIndex < nameIndex, 'email should come before name');
    });

    test('Process function call object pattern', () => {
        const code = `
export const myStyle = createStyle({
    zIndex: 100,
    fontSize: 16,
    color: 'red'
});`;

        const result = processor.processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 1);
        assert.ok(result.processedText);
        
        // Check that the function call pattern is preserved
        assert.ok(result.processedText.includes('createStyle({'));
        assert.ok(result.processedText.includes('});'));
        
        // Check sorting
        const colorIndex = result.processedText.indexOf('color:');
        const fontSizeIndex = result.processedText.indexOf('fontSize:');
        const zIndexIndex = result.processedText.indexOf('zIndex:');
        
        assert.ok(colorIndex < fontSizeIndex, 'color should come before fontSize');
        assert.ok(fontSizeIndex < zIndexIndex, 'fontSize should come before zIndex');
    });

    test('Process optional properties', () => {
        const code = `
interface User {
    name: string;
    age?: number;
    email: string;
}`;

        const result = processor.processText(code, { sortOrder: 'asc' });
        
        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);
        
        // Check that optional marker is preserved
        assert.ok(result.processedText.includes('age?: number'));
        
        // Check sorting
        const ageIndex = result.processedText.indexOf('age?:');
        const emailIndex = result.processedText.indexOf('email:');
        const nameIndex = result.processedText.indexOf('name:');
        
        assert.ok(ageIndex < emailIndex, 'age should come before email');
        assert.ok(emailIndex < nameIndex, 'email should come before name');
    });
}); 