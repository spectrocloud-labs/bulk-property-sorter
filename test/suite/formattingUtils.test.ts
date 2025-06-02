import * as assert from 'assert';
import {
    resolveIndentation,
    resolveLineEnding,
    shouldIncludeComments,
    calculatePropertySpacing,
    formatTrailingComma,
    getGroupSeparator,
    convertCommentStyle
} from '../../src/formattingUtils';
import { CoreProcessorOptions } from '../../src/coreProcessor';

// Helper function to create minimal options for testing
function createTestOptions(overrides: Partial<CoreProcessorOptions> = {}): CoreProcessorOptions {
    return {
        sortOrder: 'asc',
        preserveFormatting: true,
        includeComments: true,
        indentation: '    ',
        sortNestedObjects: false,
        ...overrides
    };
}

suite('FormattingUtils Test Suite', () => {
    
    suite('resolveIndentation', () => {
        test('Should return tab character when indentationType is tabs', () => {
            const options = createTestOptions({ indentationType: 'tabs' });
            const result = resolveIndentation(options);
            assert.strictEqual(result, '\t');
        });

        test('Should return spaces when indentationType is spaces with default size', () => {
            const options = createTestOptions({ indentationType: 'spaces' });
            const result = resolveIndentation(options);
            assert.strictEqual(result, '    '); // 4 spaces default
        });

        test('Should return custom number of spaces when indentationSize is specified', () => {
            const options = createTestOptions({ 
                indentationType: 'spaces',
                indentationSize: 2
            });
            const result = resolveIndentation(options);
            assert.strictEqual(result, '  '); // 2 spaces
        });

        test('Should return 8 spaces when indentationSize is 8', () => {
            const options = createTestOptions({ 
                indentationType: 'spaces',
                indentationSize: 8
            });
            const result = resolveIndentation(options);
            assert.strictEqual(result, '        '); // 8 spaces
        });

        test('Should auto-detect from editor when insertSpaces is true', () => {
            const options = createTestOptions();
            const mockEditor = {
                options: {
                    insertSpaces: true,
                    tabSize: 3
                }
            } as any;
            const result = resolveIndentation(options, mockEditor);
            assert.strictEqual(result, '   '); // 3 spaces
        });

        test('Should auto-detect tabs from editor when insertSpaces is false', () => {
            const options = createTestOptions();
            const mockEditor = {
                options: {
                    insertSpaces: false,
                    tabSize: 4
                }
            } as any;
            const result = resolveIndentation(options, mockEditor);
            assert.strictEqual(result, '\t');
        });

        test('Should handle editor with non-numeric tabSize', () => {
            const options = createTestOptions();
            const mockEditor = {
                options: {
                    insertSpaces: true,
                    tabSize: 'auto' // non-numeric
                }
            } as any;
            const result = resolveIndentation(options, mockEditor);
            assert.strictEqual(result, '    '); // fallback to 4 spaces
        });

        test('Should fallback to 4 spaces when no options or editor provided', () => {
            const options = createTestOptions();
            const result = resolveIndentation(options);
            assert.strictEqual(result, '    '); // 4 spaces fallback
        });
    });

    suite('resolveLineEnding', () => {
        test('Should return LF when lineEnding is lf', () => {
            const options = createTestOptions({ lineEnding: 'lf' });
            const result = resolveLineEnding(options);
            assert.strictEqual(result, '\n');
        });

        test('Should return CRLF when lineEnding is crlf', () => {
            const options = createTestOptions({ lineEnding: 'crlf' });
            const result = resolveLineEnding(options);
            assert.strictEqual(result, '\r\n');
        });

        test('Should auto-detect CRLF from file content when more CRLF than LF', () => {
            const options = createTestOptions();
            const fileContent = 'line1\r\nline2\r\nline3\nline4';
            const result = resolveLineEnding(options, fileContent);
            assert.strictEqual(result, '\r\n');
        });

        test('Should auto-detect LF from file content when more LF than CRLF', () => {
            const options = createTestOptions();
            const fileContent = 'line1\nline2\nline3\r\nline4';
            const result = resolveLineEnding(options, fileContent);
            assert.strictEqual(result, '\n');
        });

        test('Should handle file content with only LF', () => {
            const options = createTestOptions();
            const fileContent = 'line1\nline2\nline3\n';
            const result = resolveLineEnding(options, fileContent);
            assert.strictEqual(result, '\n');
        });

        test('Should handle file content with only CRLF', () => {
            const options = createTestOptions();
            const fileContent = 'line1\r\nline2\r\nline3\r\n';
            const result = resolveLineEnding(options, fileContent);
            assert.strictEqual(result, '\r\n');
        });

        test('Should handle empty file content', () => {
            const options = createTestOptions();
            const fileContent = '';
            const result = resolveLineEnding(options, fileContent);
            // Should return platform default
            const expected = process.platform === 'win32' ? '\r\n' : '\n';
            assert.strictEqual(result, expected);
        });

        test('Should return platform default when no file content provided', () => {
            const options = createTestOptions();
            const result = resolveLineEnding(options);
            const expected = process.platform === 'win32' ? '\r\n' : '\n';
            assert.strictEqual(result, expected);
        });
    });

    suite('shouldIncludeComments', () => {
        test('Should return false when preserveComments is explicitly false', () => {
            const options = createTestOptions({ 
                preserveComments: false,
                includeComments: true // should be overridden
            });
            const result = shouldIncludeComments(options);
            assert.strictEqual(result, false);
        });

        test('Should return true when preserveComments is true', () => {
            const options = createTestOptions({ preserveComments: true });
            const result = shouldIncludeComments(options);
            assert.strictEqual(result, true);
        });

        test('Should return false when includeComments is false', () => {
            const options = createTestOptions({ includeComments: false });
            const result = shouldIncludeComments(options);
            assert.strictEqual(result, false);
        });

        test('Should return true when includeComments is true', () => {
            const options = createTestOptions({ includeComments: true });
            const result = shouldIncludeComments(options);
            assert.strictEqual(result, true);
        });

        test('Should return true when no comment options specified (default)', () => {
            const options = createTestOptions();
            const result = shouldIncludeComments(options);
            assert.strictEqual(result, true);
        });

        test('Should return true when preserveComments is undefined and includeComments is undefined', () => {
            const options = createTestOptions({ 
                preserveComments: undefined,
                includeComments: undefined
            });
            const result = shouldIncludeComments(options);
            assert.strictEqual(result, true);
        });
    });

    suite('calculatePropertySpacing', () => {
        test('Should return spaced format when propertySpacing is spaced', () => {
            const options = createTestOptions({ propertySpacing: 'spaced' });
            const result = calculatePropertySpacing(options);
            assert.deepStrictEqual(result, {
                beforeColon: ' ',
                afterColon: ' '
            });
        });

        test('Should return aligned format with alignment when propertySpacing is aligned', () => {
            const options = createTestOptions({ propertySpacing: 'aligned' });
            const properties = ['name', 'description', 'id'];
            const result = calculatePropertySpacing(options, properties);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' ',
                alignment: 11 // length of 'description'
            });
        });

        test('Should return aligned format without alignment when no properties provided', () => {
            const options = createTestOptions({ propertySpacing: 'aligned' });
            const result = calculatePropertySpacing(options);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' '
            });
        });

        test('Should return aligned format without alignment when empty properties array', () => {
            const options = createTestOptions({ propertySpacing: 'aligned' });
            const result = calculatePropertySpacing(options, []);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' '
            });
        });

        test('Should return compact format when propertySpacing is compact', () => {
            const options = createTestOptions({ propertySpacing: 'compact' });
            const result = calculatePropertySpacing(options);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' '
            });
        });

        test('Should return compact format as default when propertySpacing is undefined', () => {
            const options = createTestOptions();
            const result = calculatePropertySpacing(options);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' '
            });
        });

        test('Should handle single character property names in aligned mode', () => {
            const options = createTestOptions({ propertySpacing: 'aligned' });
            const properties = ['a', 'b', 'c'];
            const result = calculatePropertySpacing(options, properties);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' ',
                alignment: 1
            });
        });

        test('Should handle very long property names in aligned mode', () => {
            const options = createTestOptions({ propertySpacing: 'aligned' });
            const properties = ['short', 'veryLongPropertyNameThatExceedsNormalLength'];
            const result = calculatePropertySpacing(options, properties);
            assert.deepStrictEqual(result, {
                beforeColon: '',
                afterColon: ' ',
                alignment: 43 // length of the long property name
            });
        });
    });

    suite('formatTrailingComma', () => {
        test('Should add comma for last property when trailingCommas is add', () => {
            const options = createTestOptions({ trailingCommas: 'add' });
            const result = formatTrailingComma(options, '', true);
            assert.strictEqual(result, ',');
        });

        test('Should preserve semicolon for last property when trailingCommas is add and original has semicolon', () => {
            const options = createTestOptions({ trailingCommas: 'add' });
            const result = formatTrailingComma(options, ';', true);
            assert.strictEqual(result, ';');
        });

        test('Should add comma for non-last property when trailingCommas is add', () => {
            const options = createTestOptions({ trailingCommas: 'add' });
            const result = formatTrailingComma(options, '', false);
            assert.strictEqual(result, ',');
        });

        test('Should preserve original punctuation for non-last property when trailingCommas is add', () => {
            const options = createTestOptions({ trailingCommas: 'add' });
            const result = formatTrailingComma(options, ';', false);
            assert.strictEqual(result, ';');
        });

        test('Should remove comma for last property when trailingCommas is remove', () => {
            const options = createTestOptions({ trailingCommas: 'remove' });
            const result = formatTrailingComma(options, ',', true);
            assert.strictEqual(result, '');
        });

        test('Should preserve semicolon for last property when trailingCommas is remove', () => {
            const options = createTestOptions({ trailingCommas: 'remove' });
            const result = formatTrailingComma(options, ';', true);
            assert.strictEqual(result, ';');
        });

        test('Should preserve comma for non-last property when trailingCommas is remove', () => {
            const options = createTestOptions({ trailingCommas: 'remove' });
            const result = formatTrailingComma(options, ',', false);
            assert.strictEqual(result, ',');
        });

        test('Should preserve original punctuation when trailingCommas is preserve', () => {
            const options = createTestOptions({ trailingCommas: 'preserve' });
            const result = formatTrailingComma(options, ';', true);
            assert.strictEqual(result, ';');
        });

        test('Should preserve original punctuation as default when trailingCommas is undefined', () => {
            const options = createTestOptions();
            const result = formatTrailingComma(options, ',', false);
            assert.strictEqual(result, ',');
        });

        test('Should handle empty original punctuation', () => {
            const options = createTestOptions({ trailingCommas: 'preserve' });
            const result = formatTrailingComma(options, '', false);
            assert.strictEqual(result, '');
        });

        test('Should handle mixed punctuation in original', () => {
            const options = createTestOptions({ trailingCommas: 'add' });
            const result = formatTrailingComma(options, ',;', true);
            assert.strictEqual(result, ';'); // semicolon takes precedence
        });
    });

    suite('getGroupSeparator', () => {
        test('Should return line ending when blankLinesBetweenGroups is true and groups differ', () => {
            const options = createTestOptions({ blankLinesBetweenGroups: true });
            const result = getGroupSeparator(options, 'group1', 'group2', '\n');
            assert.strictEqual(result, '\n');
        });

        test('Should return empty string when blankLinesBetweenGroups is false', () => {
            const options = createTestOptions({ blankLinesBetweenGroups: false });
            const result = getGroupSeparator(options, 'group1', 'group2', '\n');
            assert.strictEqual(result, '');
        });

        test('Should return empty string when groups are the same', () => {
            const options = createTestOptions({ blankLinesBetweenGroups: true });
            const result = getGroupSeparator(options, 'group1', 'group1', '\n');
            assert.strictEqual(result, '');
        });

        test('Should return empty string when previousGroup is null', () => {
            const options = createTestOptions({ blankLinesBetweenGroups: true });
            const result = getGroupSeparator(options, 'group1', null, '\n');
            assert.strictEqual(result, '');
        });

        test('Should use CRLF line ending when specified', () => {
            const options = createTestOptions({ blankLinesBetweenGroups: true });
            const result = getGroupSeparator(options, 'group1', 'group2', '\r\n');
            assert.strictEqual(result, '\r\n');
        });

        test('Should return empty string when blankLinesBetweenGroups is undefined (default false)', () => {
            const options = createTestOptions();
            const result = getGroupSeparator(options, 'group1', 'group2', '\n');
            assert.strictEqual(result, '');
        });
    });

    suite('convertCommentStyle', () => {
        test('Should preserve single-line comment when targetStyle is preserve', () => {
            const result = convertCommentStyle('test comment', 'single', 'preserve');
            assert.strictEqual(result, '// test comment');
        });

        test('Should preserve multi-line comment when targetStyle is preserve', () => {
            const result = convertCommentStyle('test comment', 'multi', 'preserve');
            assert.strictEqual(result, '/* test comment */');
        });

        test('Should convert to single-line when targetStyle is single-line', () => {
            const result = convertCommentStyle('test comment', 'multi', 'single-line');
            assert.strictEqual(result, '// test comment');
        });

        test('Should keep single-line when targetStyle is single-line', () => {
            const result = convertCommentStyle('test comment', 'single', 'single-line');
            assert.strictEqual(result, '// test comment');
        });

        test('Should convert to multi-line when targetStyle is multi-line', () => {
            const result = convertCommentStyle('test comment', 'single', 'multi-line');
            assert.strictEqual(result, '/* test comment */');
        });

        test('Should keep multi-line when targetStyle is multi-line', () => {
            const result = convertCommentStyle('test comment', 'multi', 'multi-line');
            assert.strictEqual(result, '/* test comment */');
        });

        test('Should fallback to preserve behavior with invalid targetStyle', () => {
            const result = convertCommentStyle('test comment', 'single', 'invalid' as any);
            assert.strictEqual(result, '// test comment');
        });

        test('Should handle empty comment text', () => {
            const result = convertCommentStyle('', 'single', 'preserve');
            assert.strictEqual(result, '// ');
        });

        test('Should handle comment text with special characters', () => {
            const result = convertCommentStyle('test /* nested */ comment', 'single', 'multi-line');
            assert.strictEqual(result, '/* test /* nested */ comment */');
        });

        test('Should handle multi-line comment text with line breaks', () => {
            const result = convertCommentStyle('line1\nline2', 'multi', 'single-line');
            assert.strictEqual(result, '// line1\nline2');
        });
    });
}); 