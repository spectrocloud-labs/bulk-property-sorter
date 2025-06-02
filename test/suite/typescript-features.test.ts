import * as assert from 'assert';
import { TypeScriptPropertySorter } from '../../src/languageSorters';
import { ParsedProperty, ParsedEntity } from '../../src/types';
import { CoreProcessor } from '../../src/coreProcessor';

suite('TypeScript-Specific Features Test Suite', () => {
    let sorter: TypeScriptPropertySorter;

    suite('Method Chaining Preservation Tests', () => {
        test('Preserve method chaining when enabled', () => {
            sorter = new TypeScriptPropertySorter({
                preserveMethodChaining: true,
                sortOrder: 'asc'
            });

            const properties: ParsedProperty[] = [
                {
                    name: 'zRegularProperty',
                    value: '"simple value"',
                    optional: false,
                    comments: [],
                    line: 1,
                    fullText: 'zRegularProperty: "simple value"',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                },
                {
                    name: 'aChainedMethod',
                    value: 'api.get("/users").then(response => response.json()).catch(error => console.log(error))',
                    optional: false,
                    comments: [],
                    line: 2,
                    fullText: 'aChainedMethod: api.get("/users").then(response => response.json()).catch(error => console.log(error))',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                },
                {
                    name: 'bRegularProperty',
                    value: '42',
                    optional: false,
                    comments: [],
                    line: 3,
                    fullText: 'bRegularProperty: 42',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                },
                {
                    name: 'cBuilderPattern',
                    value: 'new QueryBuilder().select("*").from("users").where("active", true).build()',
                    optional: false,
                    comments: [],
                    line: 4,
                    fullText: 'cBuilderPattern: new QueryBuilder().select("*").from("users").where("active", true).build()',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                }
            ];

            const entity: ParsedEntity = {
                type: 'object',
                name: 'testObject',
                properties: [],
                isExported: false,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);

            // Chained properties should come first in original order, then regular properties sorted
            assert.strictEqual(sorted[0].name, 'aChainedMethod', 'First chained property should be preserved');
            assert.strictEqual(sorted[1].name, 'cBuilderPattern', 'Second chained property should be preserved');
            assert.strictEqual(sorted[2].name, 'bRegularProperty', 'Regular properties should be sorted alphabetically');
            assert.strictEqual(sorted[3].name, 'zRegularProperty', 'Regular properties should be sorted alphabetically');
        });

        test('Sort all properties when method chaining preservation is disabled', () => {
            sorter = new TypeScriptPropertySorter({
                preserveMethodChaining: false,
                sortOrder: 'asc'
            });

            const properties: ParsedProperty[] = [
                {
                    name: 'zRegularProperty',
                    value: '"simple value"',
                    optional: false,
                    comments: [],
                    line: 1,
                    fullText: 'zRegularProperty: "simple value"',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                },
                {
                    name: 'aChainedMethod',
                    value: 'api.get("/users").then(response => response.json())',
                    optional: false,
                    comments: [],
                    line: 2,
                    fullText: 'aChainedMethod: api.get("/users").then(response => response.json())',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                },
                {
                    name: 'bRegularProperty',
                    value: '42',
                    optional: false,
                    comments: [],
                    line: 3,
                    fullText: 'bRegularProperty: 42',
                    trailingPunctuation: ',',
                    hasNestedObject: false
                }
            ];

            const entity: ParsedEntity = {
                type: 'object',
                name: 'testObject',
                properties: [],
                isExported: false,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);

            // All properties should be sorted alphabetically
            assert.strictEqual(sorted[0].name, 'aChainedMethod');
            assert.strictEqual(sorted[1].name, 'bRegularProperty');
            assert.strictEqual(sorted[2].name, 'zRegularProperty');
        });

        test('Detect various method chaining patterns', () => {
            sorter = new TypeScriptPropertySorter({
                preserveMethodChaining: true,
                sortOrder: 'asc'
            });

            const testCases = [
                {
                    name: 'fluentApi',
                    value: 'promise.then().catch()',
                    shouldBeChained: true
                },
                {
                    name: 'builderPattern',
                    value: 'builder.set("key", value).build()',
                    shouldBeChained: true
                },
                {
                    name: 'jqueryChaining',
                    value: '$(element).addClass("active").fadeIn()',
                    shouldBeChained: true
                },
                {
                    name: 'simpleProperty',
                    value: '"not chained"',
                    shouldBeChained: false
                },
                {
                    name: 'singleMethod',
                    value: 'api.get("/users")',
                    shouldBeChained: false
                },
                {
                    name: 'stringWithDots',
                    value: '"file.name.extension"',
                    shouldBeChained: false
                },
                {
                    name: 'complexChain',
                    value: 'fetch("/api").then(r => r.json()).then(data => process(data))',
                    shouldBeChained: true
                }
            ];

            const properties: ParsedProperty[] = testCases.map((testCase, index) => ({
                name: testCase.name,
                value: testCase.value,
                optional: false,
                comments: [],
                line: index + 1,
                fullText: `${testCase.name}: ${testCase.value}`,
                trailingPunctuation: ',',
                hasNestedObject: false
            }));

            const entity: ParsedEntity = {
                type: 'object',
                name: 'testObject',
                properties: [],
                isExported: false,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);

            // Count chained vs regular properties
            const chainedCount = testCases.filter(tc => tc.shouldBeChained).length;

            // First properties should be chained (in original order)
            const chainedProperties = sorted.slice(0, chainedCount);
            const regularProperties = sorted.slice(chainedCount);

            // Verify chained properties are preserved in order
            const expectedChained = testCases.filter(tc => tc.shouldBeChained);
            chainedProperties.forEach((prop: ParsedProperty, index: number) => {
                assert.strictEqual(prop.name, expectedChained[index].name, 
                    `Chained property ${index} should be ${expectedChained[index].name}`);
            });

            // Verify regular properties are sorted alphabetically
            const expectedRegular = testCases
                .filter(tc => !tc.shouldBeChained)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            regularProperties.forEach((prop: ParsedProperty, index: number) => {
                assert.strictEqual(prop.name, expectedRegular[index].name,
                    `Regular property ${index} should be ${expectedRegular[index].name}`);
            });
        });

        test('Handle edge cases in method chaining detection', () => {
            sorter = new TypeScriptPropertySorter({
                preserveMethodChaining: true,
                sortOrder: 'asc'
            });

            const edgeCases = [
                {
                    name: 'emptyValue',
                    value: '',
                    shouldBeChained: false
                },
                {
                    name: 'nullValue',
                    value: 'null',
                    shouldBeChained: false
                },
                {
                    name: 'undefinedValue',
                    value: 'undefined',
                    shouldBeChained: false
                },
                {
                    name: 'stringWithMethodLike',
                    value: '"this.looks.like().chaining()"',
                    shouldBeChained: false
                },
                {
                    name: 'commentedChain',
                    value: '/* api.get().then() */ "not chained"',
                    shouldBeChained: false
                },
                {
                    name: 'actualChainWithComments',
                    value: 'api.get() /* comment */ .then()',
                    shouldBeChained: true
                }
            ];

            const properties: ParsedProperty[] = edgeCases.map((testCase, index) => ({
                name: testCase.name,
                value: testCase.value,
                optional: false,
                comments: [],
                line: index + 1,
                fullText: `${testCase.name}: ${testCase.value}`,
                trailingPunctuation: ',',
                hasNestedObject: false
            }));

            const entity: ParsedEntity = {
                type: 'object',
                name: 'testObject',
                properties: [],
                isExported: false,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            // This should not throw any errors
            const sorted = sorter.sortProperties(properties, entity);
            assert.strictEqual(sorted.length, edgeCases.length, 'All properties should be preserved');
        });
    });

    suite('Integration Tests with CoreProcessor', () => {
        test('Method chaining preservation works end-to-end through CoreProcessor', () => {
            const sourceCode = `
const apiConfig = {
    zSimpleProperty: "value",
    aChainedCall: fetch("/api").then(r => r.json()).catch(err => console.error(err)),
    bRegularProperty: 42,
    cBuilderPattern: new QueryBuilder().select("*").from("users").where("active", true).build(),
    dAnotherRegular: "test"
};`;

            const processor = new CoreProcessor();
            const result = processor.processText(sourceCode, {
                sortOrder: 'asc',
                preserveMethodChaining: true,
                fileType: 'typescript'
            });

            // Verify the result contains the expected structure
            assert.ok(result.processedText, 'Should have processed text');
            assert.strictEqual(result.success, true, 'Should process successfully');
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');

            // Check that chained properties come first in the output
            const lines = result.processedText.split('\n').filter((line: string) => line.trim() && !line.includes('{') && !line.includes('}'));
            
            // Find property lines (excluding the object declaration line)
            const propertyLines = lines.filter((line: string) => line.includes(':'));
            
            // The first two properties should be the chained ones (in original order)
            assert.ok(propertyLines[0].includes('aChainedCall'), 'First property should be aChainedCall (chained)');
            assert.ok(propertyLines[1].includes('cBuilderPattern'), 'Second property should be cBuilderPattern (chained)');
            
            // The remaining properties should be sorted alphabetically
            assert.ok(propertyLines[2].includes('bRegularProperty'), 'Third property should be bRegularProperty (sorted)');
            assert.ok(propertyLines[3].includes('dAnotherRegular'), 'Fourth property should be dAnotherRegular (sorted)');
            assert.ok(propertyLines[4].includes('zSimpleProperty'), 'Fifth property should be zSimpleProperty (sorted)');
        });

        test('Method chaining preservation can be disabled through CoreProcessor', () => {
            const sourceCode = `
const apiConfig = {
    zSimpleProperty: "value",
    aChainedCall: fetch("/api").then(r => r.json()).catch(err => console.error(err)),
    bRegularProperty: 42
};`;

            const processor = new CoreProcessor();
            const result = processor.processText(sourceCode, {
                sortOrder: 'asc',
                preserveMethodChaining: false,
                fileType: 'typescript'
            });

            // Verify the result contains the expected structure
            assert.ok(result.processedText, 'Should have processed text');
            assert.strictEqual(result.success, true, 'Should process successfully');
            assert.strictEqual(result.errors.length, 0, 'Should have no errors');

            // Check that all properties are sorted alphabetically (no chaining preservation)
            const lines = result.processedText.split('\n').filter((line: string) => line.trim() && !line.includes('{') && !line.includes('}'));
            const propertyLines = lines.filter((line: string) => line.includes(':'));
            
            // All properties should be sorted alphabetically
            assert.ok(propertyLines[0].includes('aChainedCall'), 'First property should be aChainedCall (alphabetical)');
            assert.ok(propertyLines[1].includes('bRegularProperty'), 'Second property should be bRegularProperty (alphabetical)');
            assert.ok(propertyLines[2].includes('zSimpleProperty'), 'Third property should be zSimpleProperty (alphabetical)');
        });
    });

    suite('TypeScript Sorting Options Tests', () => {
        test('Update sorting options', () => {
            sorter = new TypeScriptPropertySorter({
                preserveMethodChaining: false,
                sortOrder: 'asc'
            });

            // Update options
            sorter.updateOptions({
                preserveMethodChaining: true,
                sortOrder: 'desc'
            });

            const options = sorter.getOptions();
            assert.strictEqual(options.preserveMethodChaining, true);
            assert.strictEqual(options.sortOrder, 'desc');
        });

        test('Get current options', () => {
            const initialOptions = {
                preserveMethodChaining: true,
                sortOrder: 'desc' as const,
                prioritizePublicMembers: true
            };

            sorter = new TypeScriptPropertySorter(initialOptions);
            const retrievedOptions = sorter.getOptions();

            assert.strictEqual(retrievedOptions.preserveMethodChaining, true);
            assert.strictEqual(retrievedOptions.sortOrder, 'desc');
            assert.strictEqual(retrievedOptions.prioritizePublicMembers, true);
        });
    });
}); 