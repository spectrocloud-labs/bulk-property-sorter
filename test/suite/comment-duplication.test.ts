import * as assert from 'assert';
import { TypeScriptParser } from '../../src/parser';
import { TypeScriptReconstructor } from '../../src/reconstructor';
import { CoreProcessor } from '../../src/coreProcessor';

suite('Comment Duplication Bug Test Suite', () => {
    let parser: TypeScriptParser;
    let reconstructor: TypeScriptReconstructor;
    let coreProcessor: CoreProcessor;

    setup(() => {
        parser = new TypeScriptParser({ includeComments: true });
        reconstructor = new TypeScriptReconstructor({ includeComments: true });
        coreProcessor = new CoreProcessor();
    });

    test('Single line comment should not be duplicated during reconstruction', () => {
        const code = `// Main container for the properties panel
export const container = style({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: theme.color.background.white,
    overflow: 'auto',
})`;

        // Parse the code
        const parseResult = parser.parse(code);
        
        assert.strictEqual(parseResult.errors.length, 0, 'Should parse without errors');
        assert.strictEqual(parseResult.entities.length, 1, 'Should find one entity');
        
        // Sort the properties (this triggers the issue)
        const sortedResult = parser.sortParseResult(parseResult, 'asc');
        const sortedEntity = sortedResult.entities[0];
        
        // Reconstruct the code
        const reconstructed = reconstructor.reconstructEntity(sortedEntity);
        
        // Check that the comment appears only once
        const commentOccurrences = (reconstructed.match(/\/\/ Main container for the properties panel/g) || []).length;
        assert.strictEqual(commentOccurrences, 1, 'Comment should appear only once, not duplicated');
        
        // Verify the comment is in the right place (before the export statement)
        const lines = reconstructed.split('\n');
        const commentLineIndex = lines.findIndex(line => line.includes('Main container for the properties panel'));
        const exportLineIndex = lines.findIndex(line => line.includes('export const container'));
        
        assert.ok(commentLineIndex >= 0, 'Comment should be present');
        assert.ok(exportLineIndex >= 0, 'Export statement should be present');
        assert.ok(commentLineIndex < exportLineIndex, 'Comment should come before export statement');
    });

    test('Leading comments should be extracted correctly for object literals', () => {
        const code = `// Main container for the properties panel
export const container = style({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: theme.color.background.white,
    overflow: 'auto',
})`;

        const parseResult = parser.parse(code);
        const entity = parseResult.entities[0];
        
        // Should have exactly one leading comment
        assert.strictEqual(entity.leadingComments.length, 1, 'Should have exactly one leading comment');
        assert.strictEqual(entity.leadingComments[0].text, 'Main container for the properties panel');
        assert.strictEqual(entity.leadingComments[0].type, 'single');
    });

    test('Multiple leading comments should not be duplicated', () => {
        const code = `// First comment
// Second comment
export const container = style({
    display: 'flex',
    flexDirection: 'column',
})`;

        const parseResult = parser.parse(code);
        const sortedResult = parser.sortParseResult(parseResult, 'asc');
        const reconstructed = reconstructor.reconstructEntity(sortedResult.entities[0]);
        
        // Check that each comment appears only once
        const firstCommentOccurrences = (reconstructed.match(/\/\/ First comment/g) || []).length;
        const secondCommentOccurrences = (reconstructed.match(/\/\/ Second comment/g) || []).length;
        
        assert.strictEqual(firstCommentOccurrences, 1, 'First comment should appear only once');
        assert.strictEqual(secondCommentOccurrences, 1, 'Second comment should appear only once');
    });

    test('Comment with property comments should not interfere', () => {
        const code = `// Main container comment
export const container = style({
    // Display property comment
    display: 'flex',
    flexDirection: 'column',
})`;

        const parseResult = parser.parse(code);
        
        const sortedResult = parser.sortParseResult(parseResult, 'asc');
        const reconstructed = reconstructor.reconstructEntity(sortedResult.entities[0]);
        
        // Check that the main comment appears only once
        const mainCommentOccurrences = (reconstructed.match(/\/\/ Main container comment/g) || []).length;
        const propertyCommentOccurrences = (reconstructed.match(/\/\/ Display property comment/g) || []).length;
        
        assert.strictEqual(mainCommentOccurrences, 1, 'Main comment should appear only once');
        assert.strictEqual(propertyCommentOccurrences, 1, 'Property comment should appear only once');
    });

    test('Interface with leading comment should not duplicate', () => {
        const code = `// User interface definition
export interface User {
    name: string;
    age: number;
    email: string;
}`;

        const parseResult = parser.parse(code);
        const sortedResult = parser.sortParseResult(parseResult, 'asc');
        const reconstructed = reconstructor.reconstructEntity(sortedResult.entities[0]);
        
        const commentOccurrences = (reconstructed.match(/\/\/ User interface definition/g) || []).length;
        assert.strictEqual(commentOccurrences, 1, 'Interface comment should appear only once');
    });

    test('Type alias with leading comment should not duplicate', () => {
        const code = `// User type definition
export type User = {
    name: string;
    age: number;
    email: string;
}`;

        const parseResult = parser.parse(code);
        const sortedResult = parser.sortParseResult(parseResult, 'asc');
        const reconstructed = reconstructor.reconstructEntity(sortedResult.entities[0]);
        
        const commentOccurrences = (reconstructed.match(/\/\/ User type definition/g) || []).length;
        assert.strictEqual(commentOccurrences, 1, 'Type alias comment should appear only once');
    });

    test('Multiple entities in file should not duplicate comments (potential bug scenario)', () => {
        const code = `// First container comment
export const container1 = style({
    display: 'flex',
    width: '100%',
})

// Second container comment  
export const container2 = style({
    height: '100%',
    backgroundColor: 'red',
})`;

        // Use CoreProcessor which handles multiple entities differently
        const result = coreProcessor.processText(code, { 
            sortOrder: 'asc',
            includeComments: true 
        });
        
        assert.strictEqual(result.success, true, 'Processing should succeed');
        assert.ok(result.processedText, 'Should have processed text');
        
        // Check that each comment appears only once
        const firstCommentOccurrences = (result.processedText!.match(/\/\/ First container comment/g) || []).length;
        const secondCommentOccurrences = (result.processedText!.match(/\/\/ Second container comment/g) || []).length;
        
        assert.strictEqual(firstCommentOccurrences, 1, 'First container comment should appear only once');
        assert.strictEqual(secondCommentOccurrences, 1, 'Second container comment should appear only once');
    });

    test('File processing with single entity should not duplicate comments', () => {
        const code = `// Main container for the properties panel
export const container = style({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: theme.color.background.white,
    overflow: 'auto',
})`;

        // Use CoreProcessor to simulate file processing
        const result = coreProcessor.processText(code, { 
            sortOrder: 'asc',
            includeComments: true 
        });
        
        assert.strictEqual(result.success, true, 'Processing should succeed');
        assert.ok(result.processedText, 'Should have processed text');
        
        // Check that the comment appears only once
        const commentOccurrences = (result.processedText!.match(/\/\/ Main container for the properties panel/g) || []).length;
        assert.strictEqual(commentOccurrences, 1, 'Comment should appear only once, not duplicated');
    });

    test('Multiple entities with mixed comment types should not duplicate', () => {
        const code = `/**
 * Multi-line comment for interface
 */
export interface User {
    name: string;
    age: number;
}

// Single line comment for object
export const config = {
    theme: 'dark',
    version: '1.0',
}`;

        const result = coreProcessor.processText(code, { 
            sortOrder: 'asc',
            includeComments: true 
        });
        
        assert.strictEqual(result.success, true, 'Processing should succeed');
        assert.ok(result.processedText, 'Should have processed text');
        
        // Check that multi-line comment appears only once
        const multiLineCommentOccurrences = (result.processedText!.match(/Multi-line comment for interface/g) || []).length;
        const singleLineCommentOccurrences = (result.processedText!.match(/\/\/ Single line comment for object/g) || []).length;
        
        assert.strictEqual(multiLineCommentOccurrences, 1, 'Multi-line comment should appear only once');
        assert.strictEqual(singleLineCommentOccurrences, 1, 'Single line comment should appear only once');
    });

    test('Entity with no leading comments should work correctly in multi-entity file', () => {
        const code = `// Comment for first entity
export const first = {
    a: 1,
    b: 2,
}

export const second = {
    z: 26,
    y: 25,
}`;

        const result = coreProcessor.processText(code, { 
            sortOrder: 'asc',
            includeComments: true 
        });
        
        assert.strictEqual(result.success, true, 'Processing should succeed');
        assert.ok(result.processedText, 'Should have processed text');
        
        // Check that the comment for the first entity appears only once
        const commentOccurrences = (result.processedText!.match(/\/\/ Comment for first entity/g) || []).length;
        assert.strictEqual(commentOccurrences, 1, 'Comment should appear only once');
        
        // Verify both entities are properly sorted
        assert.ok(result.processedText!.includes('a: 1,\n    b: 2,'), 'First entity should be sorted');
        assert.ok(result.processedText!.includes('y: 25,\n    z: 26,'), 'Second entity should be sorted');
    });

    test('Multiple comments with gaps should not duplicate', () => {
        const code = `// First comment

// Second comment after gap
export const container = style({
    display: 'flex',
    width: '100%',
})`;

        const result = coreProcessor.processText(code, { 
            sortOrder: 'asc',
            includeComments: true 
        });
        
        assert.strictEqual(result.success, true, 'Processing should succeed');
        assert.ok(result.processedText, 'Should have processed text');
        
        const firstCommentOccurrences = (result.processedText!.match(/\/\/ First comment/g) || []).length;
        const secondCommentOccurrences = (result.processedText!.match(/\/\/ Second comment after gap/g) || []).length;
        
        assert.strictEqual(firstCommentOccurrences, 1, 'First comment should appear only once');
        assert.strictEqual(secondCommentOccurrences, 1, 'Second comment should appear only once');
    });
}); 