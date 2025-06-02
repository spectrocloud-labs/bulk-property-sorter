import * as assert from 'assert';
import { TypeScriptParser } from '../../src/parser';
import { TypeScriptReconstructor } from '../../src/reconstructor';

suite('Trailing Comments Test Suite', () => {
    let parser: TypeScriptParser;
    let reconstructor: TypeScriptReconstructor;

    setup(() => {
        parser = new TypeScriptParser({ includeComments: true });
        reconstructor = new TypeScriptReconstructor({ includeComments: true });
    });

    test('Should preserve trailing comments on same line as property', () => {
        const input = `interface Config {
    apiUrl: string; // API endpoint URL
    timeout: number; // Request timeout in ms
    debug: boolean; // Enable debug mode
}`;

        const parseResult = parser.parse(input);
        const result = reconstructor.reconstructEntities(parseResult.entities);

        console.log('Input:', input);
        console.log('Parsed entities:', JSON.stringify(parseResult.entities, null, 2));
        console.log('Result:', result);

        // Should preserve trailing comments
        assert.ok(result.includes('apiUrl: string; // API endpoint URL'), 'Should preserve trailing comment for apiUrl');
        assert.ok(result.includes('timeout: number; // Request timeout in ms'), 'Should preserve trailing comment for timeout');
        assert.ok(result.includes('debug: boolean; // Enable debug mode'), 'Should preserve trailing comment for debug');
    });

    test('Should preserve trailing comments in object literals', () => {
        const input = `const config = {
    apiUrl: "https://api.example.com", // API endpoint URL
    timeout: 5000, // Request timeout in ms
    debug: true // Enable debug mode
};`;

        const parseResult = parser.parse(input);
        const result = reconstructor.reconstructEntities(parseResult.entities);

        console.log('Input:', input);
        console.log('Parsed entities:', JSON.stringify(parseResult.entities, null, 2));
        console.log('Result:', result);

        // Should preserve trailing comments
        assert.ok(result.includes('apiUrl: "https://api.example.com", // API endpoint URL'), 'Should preserve trailing comment for apiUrl');
        assert.ok(result.includes('timeout: 5000, // Request timeout in ms'), 'Should preserve trailing comment for timeout');
        assert.ok(result.includes('debug: true // Enable debug mode'), 'Should preserve trailing comment for debug');
    });

    test('Should preserve multi-line trailing comments', () => {
        const input = `interface Config {
    apiUrl: string; /* API endpoint URL */
    timeout: number; /* Request timeout 
                        in milliseconds */
    debug: boolean; /* Enable debug mode */
}`;

        const parseResult = parser.parse(input);
        const result = reconstructor.reconstructEntities(parseResult.entities);

        console.log('Input:', input);
        console.log('Parsed entities:', JSON.stringify(parseResult.entities, null, 2));
        console.log('Result:', result);

        // Should preserve trailing multi-line comments
        assert.ok(result.includes('apiUrl: string; /* API endpoint URL */'), 'Should preserve trailing multi-line comment for apiUrl');
        assert.ok(result.includes('timeout: number; /* Request timeout') || result.includes('Request timeout'), 'Should preserve trailing multi-line comment for timeout');
        assert.ok(result.includes('debug: boolean; /* Enable debug mode */'), 'Should preserve trailing multi-line comment for debug');
    });

    test('Should handle mixed leading and trailing comments', () => {
        const input = `interface Config {
    // Leading comment for apiUrl
    apiUrl: string; // Trailing comment for apiUrl
    
    /* Leading comment for timeout */
    timeout: number; /* Trailing comment for timeout */
    
    debug: boolean; // Just trailing comment
}`;

        const parseResult = parser.parse(input);
        const result = reconstructor.reconstructEntities(parseResult.entities);

        console.log('Input:', input);
        console.log('Parsed entities:', JSON.stringify(parseResult.entities, null, 2));
        console.log('Result:', result);

        // Should preserve both leading and trailing comments
        assert.ok(result.includes('// Leading comment for apiUrl'), 'Should preserve leading comment for apiUrl');
        assert.ok(result.includes('apiUrl: string; // Trailing comment for apiUrl'), 'Should preserve trailing comment for apiUrl');
        assert.ok(result.includes('/* Leading comment for timeout */'), 'Should preserve leading comment for timeout');
        assert.ok(result.includes('timeout: number; /* Trailing comment for timeout */'), 'Should preserve trailing comment for timeout');
        assert.ok(result.includes('debug: boolean; // Just trailing comment'), 'Should preserve trailing comment for debug');
    });

    test('Should preserve trailing comments when sorting properties', () => {
        const input = `interface Config {
    zebra: string; // Z property
    apple: string; // A property  
    banana: string; // B property
}`;

        const parseResult = parser.parse(input);
        const sortedResult = parser.sortParseResult(parseResult, 'asc');
        const result = reconstructor.reconstructEntities(sortedResult.entities);

        console.log('Input:', input);
        console.log('Sorted entities:', JSON.stringify(sortedResult.entities, null, 2));
        console.log('Result:', result);

        // Should preserve trailing comments after sorting
        assert.ok(result.includes('apple: string; // A property'), 'Should preserve trailing comment for apple after sorting');
        assert.ok(result.includes('banana: string; // B property'), 'Should preserve trailing comment for banana after sorting');
        assert.ok(result.includes('zebra: string; // Z property'), 'Should preserve trailing comment for zebra after sorting');
        
        // Check sort order
        const appleIndex = result.indexOf('apple:');
        const bananaIndex = result.indexOf('banana:');
        const zebraIndex = result.indexOf('zebra:');
        
        assert.ok(appleIndex < bananaIndex, 'Apple should come before banana');
        assert.ok(bananaIndex < zebraIndex, 'Banana should come before zebra');
    });
}); 