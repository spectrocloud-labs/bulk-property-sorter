import * as assert from 'assert';
import { BaseParserUtils, ParserUtils } from '../../src/parserUtils';
import { ParseResult, ParserOptions, ParsedEntity, ParsedProperty } from '../../src/types';

// Concrete implementation of BaseParserUtils for testing
class TestParserUtils extends BaseParserUtils {
    constructor(options: Partial<ParserOptions> = {}) {
        super(options);
    }

    // Expose protected methods for testing
    public testGetLineNumber(position: number): number {
        return this.getLineNumber(position);
    }

    public testApplySorting(result: ParseResult): void {
        return this.applySorting(result);
    }

    public testIsExported(name: string): boolean {
        return this.isExported(name);
    }

    public setSourceCode(sourceCode: string): void {
        this.sourceCode = sourceCode;
    }

    public getOptions(): ParserOptions {
        return this.options;
    }
}

// Helper function to create test entities
function createTestEntity(name: string, properties: ParsedProperty[] = []): ParsedEntity {
    return {
        name,
        type: 'interface',
        properties,
        startLine: 1,
        endLine: 1,
        isExported: false,
        leadingComments: [],
        originalText: `interface ${name} {\n  // properties\n}`
    };
}

// Helper function to create test properties
function createTestProperty(name: string, value: string = 'string'): ParsedProperty {
    return {
        name,
        value,
        optional: false,
        line: 1,
        comments: [],
        fullText: `${name}: ${value}`,
        trailingPunctuation: ','
    };
}

// Helper function to create test parse result
function createTestParseResult(entities: ParsedEntity[] = [], errors: string[] = [], sourceCode: string = '', fileType: 'typescript' | 'javascript' | 'css' | 'scss' | 'sass' | 'less' | 'go' = 'typescript'): ParseResult {
    return {
        entities,
        errors,
        sourceCode,
        fileType
    };
}

suite('ParserUtils Test Suite', () => {

    suite('BaseParserUtils', () => {
        let parser: TestParserUtils;

        setup(() => {
            parser = new TestParserUtils();
        });

        suite('Constructor and Options', () => {
            test('Should initialize with default options', () => {
                const options = parser.getOptions();
                assert.strictEqual(options.preserveFormatting, true);
                assert.strictEqual(options.includeComments, true);
            });

            test('Should override default options with provided options', () => {
                const customParser = new TestParserUtils({
                    preserveFormatting: false,
                    includeComments: false,
                    sortOrder: 'desc'
                });
                const options = customParser.getOptions();
                assert.strictEqual(options.preserveFormatting, false);
                assert.strictEqual(options.includeComments, false);
                assert.strictEqual(options.sortOrder, 'desc');
            });

            test('Should merge options correctly', () => {
                const customParser = new TestParserUtils({
                    sortOrder: 'asc',
                    sortByImportance: true
                });
                const options = customParser.getOptions();
                assert.strictEqual(options.preserveFormatting, true); // default
                assert.strictEqual(options.includeComments, true); // default
                assert.strictEqual(options.sortOrder, 'asc'); // provided
                assert.strictEqual(options.sortByImportance, true); // provided
            });
        });

        suite('getLineNumber', () => {
            test('Should return correct line number for position at start', () => {
                parser.setSourceCode('line1\nline2\nline3');
                const result = parser.testGetLineNumber(0);
                assert.strictEqual(result, 1);
            });

            test('Should return correct line number for position in middle', () => {
                parser.setSourceCode('line1\nline2\nline3');
                const result = parser.testGetLineNumber(8); // middle of 'line2'
                assert.strictEqual(result, 2);
            });

            test('Should return correct line number for position at end', () => {
                parser.setSourceCode('line1\nline2\nline3');
                const result = parser.testGetLineNumber(17); // end of string
                assert.strictEqual(result, 3);
            });

            test('Should handle empty source code', () => {
                parser.setSourceCode('');
                const result = parser.testGetLineNumber(0);
                assert.strictEqual(result, 1);
            });

            test('Should handle single line source code', () => {
                parser.setSourceCode('single line');
                const result = parser.testGetLineNumber(5);
                assert.strictEqual(result, 1);
            });

            test('Should handle position beyond end of string', () => {
                parser.setSourceCode('short');
                const result = parser.testGetLineNumber(100);
                assert.strictEqual(result, 1);
            });

            test('Should handle source with only newlines', () => {
                parser.setSourceCode('\n\n\n');
                const result = parser.testGetLineNumber(2);
                assert.strictEqual(result, 3);
            });
        });

        suite('applySorting', () => {
            test('Should sort properties in ascending order', () => {
                const customParser = new TestParserUtils({ sortOrder: 'asc' });
                const entity = createTestEntity('TestInterface', [
                    createTestProperty('zebra'),
                    createTestProperty('alpha'),
                    createTestProperty('beta')
                ]);
                const result = createTestParseResult([entity]);

                customParser.testApplySorting(result);

                assert.strictEqual(result.entities[0].properties[0].name, 'alpha');
                assert.strictEqual(result.entities[0].properties[1].name, 'beta');
                assert.strictEqual(result.entities[0].properties[2].name, 'zebra');
            });

            test('Should sort properties in descending order', () => {
                const customParser = new TestParserUtils({ sortOrder: 'desc' });
                const entity = createTestEntity('TestInterface', [
                    createTestProperty('alpha'),
                    createTestProperty('zebra'),
                    createTestProperty('beta')
                ]);
                const result = createTestParseResult([entity]);

                customParser.testApplySorting(result);

                assert.strictEqual(result.entities[0].properties[0].name, 'zebra');
                assert.strictEqual(result.entities[0].properties[1].name, 'beta');
                assert.strictEqual(result.entities[0].properties[2].name, 'alpha');
            });

            test('Should not sort when sortOrder is not specified', () => {
                const customParser = new TestParserUtils({});
                const entity = createTestEntity('TestInterface', [
                    createTestProperty('zebra'),
                    createTestProperty('alpha')
                ]);
                const result = createTestParseResult([entity]);
                const originalOrder = result.entities[0].properties.map(p => p.name);

                customParser.testApplySorting(result);

                const finalOrder = result.entities[0].properties.map(p => p.name);
                assert.deepStrictEqual(finalOrder, originalOrder);
            });

            test('Should handle empty entities array', () => {
                const customParser = new TestParserUtils({ sortOrder: 'asc' });
                const result = createTestParseResult([]);

                customParser.testApplySorting(result);

                assert.strictEqual(result.entities.length, 0);
                assert.strictEqual(result.errors.length, 0);
            });

            test('Should handle entity with no properties', () => {
                const customParser = new TestParserUtils({ sortOrder: 'asc' });
                const entity = createTestEntity('TestInterface', []);
                const result = createTestParseResult([entity]);

                customParser.testApplySorting(result);

                assert.strictEqual(result.entities[0].properties.length, 0);
                assert.strictEqual(result.errors.length, 0);
            });

            test('Should handle sorting errors gracefully', () => {
                const customParser = new TestParserUtils({ sortOrder: 'asc' });
                // Create entity with malformed properties that might cause sorting errors
                const entity = createTestEntity('TestInterface');
                entity.properties = [null as any, undefined as any]; // Invalid properties
                const result = createTestParseResult([entity]);

                customParser.testApplySorting(result);

                // Should have added an error message
                assert.ok(result.errors.length > 0);
                assert.ok(result.errors.some(error => error.includes('Sorting error')));
            });
        });

        suite('sortParseResult', () => {
            test('Should return new result with sorted properties', () => {
                const entity = createTestEntity('TestInterface', [
                    createTestProperty('zebra'),
                    createTestProperty('alpha')
                ]);
                const originalResult = createTestParseResult([entity]);

                const sortedResult = parser.sortParseResult(originalResult, 'asc');

                // Original should be unchanged
                assert.strictEqual(originalResult.entities[0].properties[0].name, 'zebra');
                // New result should be sorted
                assert.strictEqual(sortedResult.entities[0].properties[0].name, 'alpha');
                assert.strictEqual(sortedResult.entities[0].properties[1].name, 'zebra');
            });

            test('Should default to ascending sort order', () => {
                const entity = createTestEntity('TestInterface', [
                    createTestProperty('zebra'),
                    createTestProperty('alpha')
                ]);
                const originalResult = createTestParseResult([entity]);

                const sortedResult = parser.sortParseResult(originalResult);

                assert.strictEqual(sortedResult.entities[0].properties[0].name, 'alpha');
                assert.strictEqual(sortedResult.entities[0].properties[1].name, 'zebra');
            });

            test('Should handle descending sort order', () => {
                const entity = createTestEntity('TestInterface', [
                    createTestProperty('alpha'),
                    createTestProperty('zebra')
                ]);
                const originalResult = createTestParseResult([entity]);

                const sortedResult = parser.sortParseResult(originalResult, 'desc');

                assert.strictEqual(sortedResult.entities[0].properties[0].name, 'zebra');
                assert.strictEqual(sortedResult.entities[0].properties[1].name, 'alpha');
            });

            test('Should preserve existing errors and add new ones', () => {
                const entity = createTestEntity('TestInterface');
                entity.properties = [null as any]; // Invalid property to trigger error
                const originalResult = createTestParseResult([entity], ['existing error']);

                const sortedResult = parser.sortParseResult(originalResult, 'asc');

                assert.ok(sortedResult.errors.includes('existing error'));
                assert.ok(sortedResult.errors.some(error => error.includes('Sorting error')));
                assert.ok(sortedResult.errors.length >= 2);
            });

            test('Should handle empty results', () => {
                const originalResult = createTestParseResult([]);

                const sortedResult = parser.sortParseResult(originalResult, 'asc');

                assert.strictEqual(sortedResult.entities.length, 0);
                assert.strictEqual(sortedResult.errors.length, 0);
            });
        });

        suite('isExported', () => {
            test('Should return true for capitalized names', () => {
                const result = parser.testIsExported('PublicInterface');
                assert.strictEqual(result, true);
            });

            test('Should return false for lowercase names', () => {
                const result = parser.testIsExported('privateInterface');
                assert.strictEqual(result, false);
            });

            test('Should return false for empty string', () => {
                const result = parser.testIsExported('');
                assert.strictEqual(result, false);
            });

            test('Should handle names starting with underscore', () => {
                const result = parser.testIsExported('_PrivateInterface');
                assert.strictEqual(result, true);
            });

            test('Should handle names starting with number', () => {
                const result = parser.testIsExported('1Interface');
                assert.strictEqual(result, true);
            });

            test('Should handle single character names', () => {
                assert.strictEqual(parser.testIsExported('A'), true);
                assert.strictEqual(parser.testIsExported('a'), false);
            });
        });
    });

    suite('ParserUtils Static Methods', () => {

        suite('detectFileType', () => {
            test('Should detect JavaScript files', () => {
                assert.strictEqual(ParserUtils.detectFileType('test.js'), 'javascript');
                assert.strictEqual(ParserUtils.detectFileType('component.jsx'), 'javascript');
            });

            test('Should detect TypeScript files', () => {
                assert.strictEqual(ParserUtils.detectFileType('test.ts'), 'typescript');
                assert.strictEqual(ParserUtils.detectFileType('component.tsx'), 'typescript');
            });

            test('Should detect CSS files', () => {
                assert.strictEqual(ParserUtils.detectFileType('styles.css'), 'css');
            });

            test('Should detect SCSS files', () => {
                assert.strictEqual(ParserUtils.detectFileType('styles.scss'), 'scss');
            });

            test('Should detect SASS files', () => {
                assert.strictEqual(ParserUtils.detectFileType('styles.sass'), 'sass');
            });

            test('Should detect LESS files', () => {
                assert.strictEqual(ParserUtils.detectFileType('styles.less'), 'less');
            });

            test('Should detect Go files', () => {
                assert.strictEqual(ParserUtils.detectFileType('main.go'), 'go');
            });

            test('Should default to TypeScript for unknown extensions', () => {
                assert.strictEqual(ParserUtils.detectFileType('test.unknown'), 'typescript');
                assert.strictEqual(ParserUtils.detectFileType('noextension'), 'typescript');
            });

            test('Should handle files with multiple dots', () => {
                assert.strictEqual(ParserUtils.detectFileType('test.spec.ts'), 'typescript');
                assert.strictEqual(ParserUtils.detectFileType('styles.min.css'), 'css');
            });

            test('Should handle uppercase extensions', () => {
                assert.strictEqual(ParserUtils.detectFileType('test.TS'), 'typescript');
                assert.strictEqual(ParserUtils.detectFileType('styles.CSS'), 'css');
            });

            test('Should handle empty filename', () => {
                assert.strictEqual(ParserUtils.detectFileType(''), 'typescript');
            });

            test('Should handle filename with only extension', () => {
                assert.strictEqual(ParserUtils.detectFileType('.ts'), 'typescript');
                assert.strictEqual(ParserUtils.detectFileType('.css'), 'css');
            });
        });

        suite('cleanCommentText', () => {
            test('Should clean single-line comments', () => {
                const result = ParserUtils.cleanCommentText('// This is a comment', false);
                assert.strictEqual(result, 'This is a comment');
            });

            test('Should clean multi-line comments', () => {
                const result = ParserUtils.cleanCommentText('/* This is a comment */', true);
                assert.strictEqual(result, 'This is a comment');
            });

            test('Should clean JSDoc comments', () => {
                const result = ParserUtils.cleanCommentText('/** This is a JSDoc comment */', true);
                assert.strictEqual(result, 'This is a JSDoc comment');
            });

            test('Should handle comments with only whitespace', () => {
                assert.strictEqual(ParserUtils.cleanCommentText('//   ', false), '');
                assert.strictEqual(ParserUtils.cleanCommentText('/*   */', true), '');
            });

            test('Should preserve internal formatting', () => {
                const result = ParserUtils.cleanCommentText('// This  has   multiple   spaces', false);
                assert.strictEqual(result, 'This  has   multiple   spaces');
            });

            test('Should handle malformed comments gracefully', () => {
                assert.strictEqual(ParserUtils.cleanCommentText('/ incomplete comment', false), '/ incomplete comment');
                assert.strictEqual(ParserUtils.cleanCommentText('/* incomplete comment', true), 'incomplete comment');
            });

            test('Should handle nested comment markers', () => {
                const result = ParserUtils.cleanCommentText('/* This /* has */ nested markers */', true);
                assert.strictEqual(result, 'This /* has */ nested markers');
            });
        });

        suite('getLineNumber', () => {
            test('Should return correct line number for position at start', () => {
                const result = ParserUtils.getLineNumber('line1\nline2\nline3', 0);
                assert.strictEqual(result, 1);
            });

            test('Should return correct line number for position in middle', () => {
                const result = ParserUtils.getLineNumber('line1\nline2\nline3', 8);
                assert.strictEqual(result, 2);
            });

            test('Should return correct line number for position at end', () => {
                const result = ParserUtils.getLineNumber('line1\nline2\nline3', 17);
                assert.strictEqual(result, 3);
            });

            test('Should handle empty source code', () => {
                const result = ParserUtils.getLineNumber('', 0);
                assert.strictEqual(result, 1);
            });

            test('Should handle single line', () => {
                const result = ParserUtils.getLineNumber('single line', 5);
                assert.strictEqual(result, 1);
            });

            test('Should handle position beyond end', () => {
                const result = ParserUtils.getLineNumber('short', 100);
                assert.strictEqual(result, 1);
            });

            test('Should handle different line endings', () => {
                assert.strictEqual(ParserUtils.getLineNumber('line1\nline2', 6), 2);
                assert.strictEqual(ParserUtils.getLineNumber('line1\r\nline2', 7), 2);
            });
        });

        suite('getPositionFromLine', () => {
            test('Should return correct position for first line', () => {
                const result = ParserUtils.getPositionFromLine('line1\nline2\nline3', 1);
                assert.strictEqual(result, 0);
            });

            test('Should return correct position for middle line', () => {
                const result = ParserUtils.getPositionFromLine('line1\nline2\nline3', 2);
                assert.strictEqual(result, 6); // length of 'line1\n'
            });

            test('Should return correct position for last line', () => {
                const result = ParserUtils.getPositionFromLine('line1\nline2\nline3', 3);
                assert.strictEqual(result, 12); // length of 'line1\nline2\n'
            });

            test('Should handle empty source code', () => {
                const result = ParserUtils.getPositionFromLine('', 1);
                assert.strictEqual(result, 0);
            });

            test('Should handle single line', () => {
                const result = ParserUtils.getPositionFromLine('single line', 1);
                assert.strictEqual(result, 0);
            });

            test('Should handle line number beyond end', () => {
                const result = ParserUtils.getPositionFromLine('line1\nline2', 5);
                assert.strictEqual(result, 12); // end of available content
            });

            test('Should handle line number 0 or negative', () => {
                const result = ParserUtils.getPositionFromLine('line1\nline2', 0);
                assert.strictEqual(result, 0);
            });

            test('Should handle different line endings', () => {
                const unixResult = ParserUtils.getPositionFromLine('line1\nline2\nline3', 2);
                const windowsResult = ParserUtils.getPositionFromLine('line1\r\nline2\r\nline3', 2);
                assert.strictEqual(unixResult, 6);
                assert.strictEqual(windowsResult, 7); // extra character for \r
            });
        });
    });
}); 