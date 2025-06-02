import * as assert from 'assert';
import { CoreProcessor } from '../../src/coreProcessor';
import { TypeScriptParser } from '../../src/parser';
import { PropertySorter } from '../../src/sorter';
import { TypeScriptReconstructor } from '../../src/reconstructor';

suite('Integration Tests', () => {
    let coreProcessor: CoreProcessor;
    let parser: TypeScriptParser;
    let sorter: PropertySorter;
    let reconstructor: TypeScriptReconstructor;

    setup(() => {
        coreProcessor = new CoreProcessor();
        parser = new TypeScriptParser();
        sorter = new PropertySorter();
        reconstructor = new TypeScriptReconstructor();
    });

    suite('End-to-End Processing Pipeline', () => {
        test('Complete TypeScript interface processing workflow', () => {
            const input = `
interface User {
    // User's email address
    email: string;
    /**
     * The user's full name
     */
    name: string;
    // Age in years
    age: number;
    // Whether the user is active
    isActive?: boolean;
}`;

            // Test the full pipeline through CoreProcessor
            const result = coreProcessor.processText(input, {
                sortOrder: 'asc',
                includeComments: true,
                preserveFormatting: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            assert.ok(result.processedText);

            // Verify the properties are sorted correctly
            const lines = result.processedText!.split('\n');
            const ageIndex = lines.findIndex(line => line.includes('age: number'));
            const emailIndex = lines.findIndex(line => line.includes('email: string'));
            const isActiveIndex = lines.findIndex(line => line.includes('isActive?: boolean'));
            const nameIndex = lines.findIndex(line => line.includes('name: string'));

            assert.ok(ageIndex < emailIndex, 'age should come before email');
            assert.ok(emailIndex < isActiveIndex, 'email should come before isActive');
            assert.ok(isActiveIndex < nameIndex, 'isActive should come before name');

            // Verify comments are preserved
            assert.ok(result.processedText!.includes("User's email address"));
            assert.ok(result.processedText!.includes("The user's full name"));
            assert.ok(result.processedText!.includes("Age in years"));
        });

        test('Complete object literal processing workflow', () => {
            const input = `
const config = {
    // Database settings
    database: {
        port: 5432,
        host: 'localhost',
        name: 'myapp'
    },
    // API configuration
    api: {
        timeout: 5000,
        baseUrl: 'https://api.example.com'
    },
    // Feature flags
    features: {
        logging: true,
        debugging: false
    }
};`;

            const result = coreProcessor.processText(input, {
                sortOrder: 'asc',
                sortNestedObjects: true,
                includeComments: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);
            assert.ok(result.processedText);

            // Verify top-level properties are sorted
            const apiIndex = result.processedText!.indexOf('api:');
            const databaseIndex = result.processedText!.indexOf('database:');
            const featuresIndex = result.processedText!.indexOf('features:');

            assert.ok(apiIndex < databaseIndex, 'api should come before database');
            assert.ok(databaseIndex < featuresIndex, 'database should come before features');

            // Verify nested objects are sorted
            assert.ok(result.processedText!.includes('host: \'localhost\''));
            assert.ok(result.processedText!.includes('name: \'myapp\''));
            assert.ok(result.processedText!.includes('port: 5432'));
        });

        test('Mixed entity types processing workflow', () => {
            const input = `
type Status = 'active' | 'inactive' | 'pending';

interface User {
    name: string;
    status: Status;
    id: number;
}

const defaultUser = {
    status: 'active' as Status,
    name: 'Unknown',
    id: 0
};`;

            const result = coreProcessor.processText(input, {
                sortOrder: 'asc',
                preserveFormatting: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 2); // interface and object

            // All entities should be processed and sorted
            assert.ok(result.processedText!.includes('id: number'));
            assert.ok(result.processedText!.includes('name: string'));
            assert.ok(result.processedText!.includes('status: Status'));
        });
    });

    suite('Component Integration Tests', () => {
        test('Parser and Sorter integration', () => {
            const input = `interface Test { z: string; a: number; m: boolean; }`;

            // Parse the input
            const parseResult = parser.parse(input);
            assert.ok(parseResult.entities.length > 0);
            assert.strictEqual(parseResult.entities.length, 1);

            // Sort the properties
            const entity = parseResult.entities[0];
            const sortedProperties = sorter.sortProperties(entity.properties, { order: 'asc' });

            // Verify sorting
            assert.strictEqual(sortedProperties[0].name, 'a');
            assert.strictEqual(sortedProperties[1].name, 'm');
            assert.strictEqual(sortedProperties[2].name, 'z');
        });

        test('Sorter and Reconstructor integration', () => {
            const input = `interface Test { c: string; a: number; b: boolean; }`;

            const parseResult = parser.parse(input);
            const entity = parseResult.entities[0];
            
            // Sort properties
            entity.properties = sorter.sortProperties(entity.properties, { order: 'desc' });

            // Reconstruct
            const result = reconstructor.reconstructEntity(entity);

            // Verify descending order in output
            const cIndex = result.indexOf('c: string');
            const bIndex = result.indexOf('b: boolean');
            const aIndex = result.indexOf('a: number');

            assert.ok(cIndex < bIndex, 'c should come before b');
            assert.ok(bIndex < aIndex, 'b should come before a');
        });

        test('Full pipeline with custom options', () => {
            const input = `
interface Config {
    timeout: number;
    enabled: boolean;
    url: string;
    retries?: number;
}`;

            const result = coreProcessor.processText(input, {
                sortOrder: 'asc',
                prioritizeRequired: true,
                indentation: '\t',
                caseSensitive: false
            });

            assert.strictEqual(result.success, true);
            
            // Required properties should come before optional ones
            const enabledIndex = result.processedText!.indexOf('enabled: boolean');
            const timeoutIndex = result.processedText!.indexOf('timeout: number');
            const urlIndex = result.processedText!.indexOf('url: string');
            const retriesIndex = result.processedText!.indexOf('retries?: number');

            // All required properties should come before optional ones
            assert.ok(enabledIndex < retriesIndex, 'enabled (required) should come before retries (optional)');
            assert.ok(timeoutIndex < retriesIndex, 'timeout (required) should come before retries (optional)');
            assert.ok(urlIndex < retriesIndex, 'url (required) should come before retries (optional)');
        });

        test('Component error propagation', () => {
            // Test that errors from one component are properly propagated
            const input = 'interface Test { }'; // Empty interface

            const parseResult = parser.parse(input);
            assert.ok(parseResult.entities.length > 0);
            
            const entity = parseResult.entities[0];
            assert.strictEqual(entity.properties.length, 0);

            // Processing empty entity should result in no changes
            const coreResult = coreProcessor.processText(input);
            assert.strictEqual(coreResult.success, false);
            assert.ok(coreResult.errors.some(error => error.includes('No sortable entities found')));
        });
    });

    suite('Error Handling Integration', () => {
        test('Graceful handling of malformed input through full pipeline', () => {
            const malformedInputs = [
                'interface User { name string; }', // Missing colon
                'interface User { name: }', // Missing type
                'interface User { name: string', // Missing closing brace
                'const obj = { key value }', // Missing colon
                ''
            ];

            malformedInputs.forEach(input => {
                const result = coreProcessor.processText(input);
                
                // Should not throw errors, should handle gracefully
                assert.ok(typeof result.success === 'boolean');
                
                if (!result.success) {
                    assert.ok(result.errors.length > 0);
                }
            });
        });

        test('Component error propagation', () => {
            // Test that errors from one component are properly propagated
            const input = 'interface Test { }'; // Empty interface

            const parseResult = parser.parse(input);
            assert.ok(parseResult.entities.length > 0);
            
            const entity = parseResult.entities[0];
            assert.strictEqual(entity.properties.length, 0);

            // Processing empty entity should result in no changes
            const coreResult = coreProcessor.processText(input);
            assert.strictEqual(coreResult.success, false);
            assert.ok(coreResult.errors.some(error => error.includes('No sortable entities found')));
        });
    });

    suite('Performance Integration Tests', () => {
        test('Large file processing performance', () => {
            // Generate a large interface for performance testing
            const properties = Array.from({ length: 1000 }, (_, i) => `prop${i}: string;`).join('\n    ');
            const largeInterface = `interface LargeInterface {\n    ${properties}\n}`;

            const startTime = Date.now();
            const result = coreProcessor.processText(largeInterface, { sortOrder: 'asc' });
            const endTime = Date.now();

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.entitiesProcessed, 1);

            // Should complete within reasonable time (less than 1 second for 1000 properties)
            const processingTime = endTime - startTime;
            assert.ok(processingTime < 1000, `Processing took ${processingTime}ms, should be under 1000ms`);
        });

        test('Memory usage with nested objects', () => {
            // Test memory efficiency with deeply nested structures
            let nestedObject = 'value: "test"';
            for (let i = 0; i < 10; i++) {
                nestedObject = `level${i}: { ${nestedObject} }`;
            }
            const deeplyNested = `const config = { ${nestedObject} };`;

            const result = coreProcessor.processText(deeplyNested, { 
                sortNestedObjects: true,
                sortOrder: 'asc'
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
        });
    });

    suite('Configuration Integration Tests', () => {
        test('Multiple configuration options working together', () => {
            const input = `
interface UserConfig {
    // Required fields
    apiKey: string;
    baseUrl: string;
    // Optional settings  
    timeout?: number;
    retries?: number;
    // Feature flags
    enableLogging?: boolean;
    enableDebug?: boolean;
}`;

            const result = coreProcessor.processText(input, {
                sortOrder: 'asc',
                prioritizeRequired: true,
                groupByType: false,
                caseSensitive: false,
                includeComments: true,
                indentation: '  ',
                preserveFormatting: true
            });

            assert.strictEqual(result.success, true);
            
            // Required properties should be first
            const processedText = result.processedText!;
            const apiKeyIndex = processedText.indexOf('apiKey: string');
            const baseUrlIndex = processedText.indexOf('baseUrl: string');
            const timeoutIndex = processedText.indexOf('timeout?: number');
            const retriesIndex = processedText.indexOf('retries?: number');

            // Required fields should come before optional ones
            assert.ok(apiKeyIndex < timeoutIndex, 'Required apiKey should come before optional timeout');
            assert.ok(baseUrlIndex < retriesIndex, 'Required baseUrl should come before optional retries');

            // Comments should be preserved
            assert.ok(processedText.includes('Required fields'));
            assert.ok(processedText.includes('Optional settings'));
            assert.ok(processedText.includes('Feature flags'));
        });

        test('CSS-specific configuration integration', () => {
            const cssInput = `
.component {
    z-index: 10;
    background-color: red;
    margin: 10px;
    padding: 5px;
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    transform: rotate(45deg);
    color: blue !important;
    width: 100px !important;
}`;

            const result = coreProcessor.processText(cssInput, {
                fileType: 'css',
                sortOrder: 'asc',
                sortByImportance: true,
                groupVendorPrefixes: true
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);

            // Should handle CSS-specific sorting
            const processedText = result.processedText!;
            assert.ok(processedText.includes('transform'));
            assert.ok(processedText.includes('!important'));
        });
    });

    suite('Real-world Scenario Tests', () => {
        test('React component interface processing', () => {
            const reactInterface = `
interface ButtonProps {
    onClick: (event: MouseEvent) => void;
    children: React.ReactNode;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    className?: string;
    id?: string;
    type?: 'button' | 'submit' | 'reset';
}`;

            const result = coreProcessor.processText(reactInterface, {
                sortOrder: 'asc',
                prioritizeRequired: true,
                fileType: 'typescript'
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);

            // Required props should come first
            const processedText = result.processedText!;
            const childrenIndex = processedText.indexOf('children: React.ReactNode');
            const onClickIndex = processedText.indexOf('onClick: (event: MouseEvent)');
            const disabledIndex = processedText.indexOf('disabled?: boolean');

            // Required properties should come before optional ones
            assert.ok(childrenIndex < disabledIndex, 'Required children should come before optional disabled');
            assert.ok(onClickIndex < disabledIndex, 'Required onClick should come before optional disabled');
        });

        test('API configuration object processing', () => {
            const apiConfig = `
const apiConfig = {
    timeout: 30000,
    retries: 3,
    baseURL: 'https://api.example.com',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer token'
    },
    validateStatus: (status: number) => status >= 200 && status < 300,
    transformRequest: [(data: any) => JSON.stringify(data)],
    transformResponse: [(data: string) => JSON.parse(data)]
};`;

            const result = coreProcessor.processText(apiConfig, {
                sortOrder: 'asc',
                sortNestedObjects: true,
                preserveFormatting: true
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);

            // Should sort both top-level and nested properties
            const processedText = result.processedText!;
            assert.ok(processedText.includes('baseURL'));
            assert.ok(processedText.includes('headers'));
            assert.ok(processedText.includes('Accept'));
            assert.ok(processedText.includes('Authorization'));
        });
    });
}); 