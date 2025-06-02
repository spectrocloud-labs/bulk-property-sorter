import * as assert from 'assert';
import { PropertySorter } from '../../src/sorter';
import { ParsedProperty, PropertyComment } from '../../src/types';

suite('Comment Preservation Test Suite', () => {
    let sorter: PropertySorter;

    setup(() => {
        sorter = new PropertySorter({ order: 'asc' });
    });

    // Helper function to create a test comment
    function createTestComment(text: string, type: 'single' | 'multi' = 'single', line: number = 1): PropertyComment {
        const raw = type === 'single' ? `// ${text}` : `/* ${text} */`;
        return {
            text,
            type,
            raw,
            line
        };
    }

    // Helper function to create a test property with comments
    function createTestPropertyWithComments(
        name: string, 
        value: string = 'string', 
        comments: PropertyComment[] = []
    ): ParsedProperty {
        return {
            name,
            value,
            comments,
            optional: false,
            line: 1,
            fullText: `${name}: ${value};`,
            trailingPunctuation: ';'
        };
    }

    test('Single-line comments are preserved during sorting', () => {
        const properties = [
            createTestPropertyWithComments('zebra', 'string', [
                createTestComment('This is zebra property')
            ]),
            createTestPropertyWithComments('apple', 'string', [
                createTestComment('This is apple property')
            ]),
            createTestPropertyWithComments('banana', 'string', [
                createTestComment('This is banana property')
            ])
        ];

        const sorted = sorter.sortProperties(properties);

        // Check that properties are sorted correctly
        const names = sorted.map(p => p.name);
        assert.deepStrictEqual(names, ['apple', 'banana', 'zebra']);
        
        // Check that comments are preserved with correct properties
        const appleProperty = sorted.find(p => p.name === 'apple');
        const bananaProperty = sorted.find(p => p.name === 'banana');
        const zebraProperty = sorted.find(p => p.name === 'zebra');

        assert.ok(appleProperty, 'Apple property should exist');
        assert.ok(bananaProperty, 'Banana property should exist');
        assert.ok(zebraProperty, 'Zebra property should exist');

        assert.strictEqual(appleProperty.comments[0].text, 'This is apple property');
        assert.strictEqual(bananaProperty.comments[0].text, 'This is banana property');
        assert.strictEqual(zebraProperty.comments[0].text, 'This is zebra property');
    });

    test('Multi-line comments are preserved during sorting', () => {
        const properties = [
            createTestPropertyWithComments('zebra', 'string', [
                createTestComment('This is a multi-line\ncomment for zebra', 'multi')
            ]),
            createTestPropertyWithComments('apple', 'string', [
                createTestComment('This is a multi-line\ncomment for apple', 'multi')
            ])
        ];

        const sorted = sorter.sortProperties(properties);

        const appleProperty = sorted.find(p => p.name === 'apple');
        const zebraProperty = sorted.find(p => p.name === 'zebra');

        assert.ok(appleProperty, 'Apple property should exist');
        assert.ok(zebraProperty, 'Zebra property should exist');

        assert.strictEqual(appleProperty.comments[0].text, 'This is a multi-line\ncomment for apple');
        assert.strictEqual(appleProperty.comments[0].type, 'multi');
        assert.strictEqual(zebraProperty.comments[0].text, 'This is a multi-line\ncomment for zebra');
        assert.strictEqual(zebraProperty.comments[0].type, 'multi');
    });

    test('Multiple comments per property are preserved', () => {
        const properties = [
            createTestPropertyWithComments('zebra', 'string', [
                createTestComment('First comment for zebra'),
                createTestComment('Second comment for zebra', 'multi')
            ]),
            createTestPropertyWithComments('apple', 'string', [
                createTestComment('First comment for apple'),
                createTestComment('Second comment for apple', 'multi'),
                createTestComment('Third comment for apple')
            ])
        ];

        const sorted = sorter.sortProperties(properties);

        const appleProperty = sorted.find(p => p.name === 'apple');
        const zebraProperty = sorted.find(p => p.name === 'zebra');

        assert.ok(appleProperty, 'Apple property should exist');
        assert.ok(zebraProperty, 'Zebra property should exist');

        assert.strictEqual(appleProperty.comments.length, 3);
        assert.strictEqual(appleProperty.comments[0].text, 'First comment for apple');
        assert.strictEqual(appleProperty.comments[1].text, 'Second comment for apple');
        assert.strictEqual(appleProperty.comments[2].text, 'Third comment for apple');

        assert.strictEqual(zebraProperty.comments.length, 2);
        assert.strictEqual(zebraProperty.comments[0].text, 'First comment for zebra');
        assert.strictEqual(zebraProperty.comments[1].text, 'Second comment for zebra');
    });

    test('Properties without comments mixed with commented properties', () => {
        const properties = [
            createTestPropertyWithComments('zebra', 'string', [
                createTestComment('Only zebra has comments')
            ]),
            createTestPropertyWithComments('apple', 'string', []), // No comments
            createTestPropertyWithComments('banana', 'string', [
                createTestComment('Only banana has comments')
            ]),
            createTestPropertyWithComments('cherry', 'string', []) // No comments
        ];

        const sorted = sorter.sortProperties(properties);

        const names = sorted.map(p => p.name);
        assert.deepStrictEqual(names, ['apple', 'banana', 'cherry', 'zebra']);

        const appleProperty = sorted.find(p => p.name === 'apple');
        const bananaProperty = sorted.find(p => p.name === 'banana');
        const cherryProperty = sorted.find(p => p.name === 'cherry');
        const zebraProperty = sorted.find(p => p.name === 'zebra');

        assert.ok(appleProperty, 'Apple property should exist');
        assert.ok(bananaProperty, 'Banana property should exist');
        assert.ok(cherryProperty, 'Cherry property should exist');
        assert.ok(zebraProperty, 'Zebra property should exist');

        assert.strictEqual(appleProperty.comments.length, 0);
        assert.strictEqual(bananaProperty.comments.length, 1);
        assert.strictEqual(bananaProperty.comments[0].text, 'Only banana has comments');
        assert.strictEqual(cherryProperty.comments.length, 0);
        assert.strictEqual(zebraProperty.comments.length, 1);
        assert.strictEqual(zebraProperty.comments[0].text, 'Only zebra has comments');
    });

    test('Descending sort preserves comments correctly', () => {
        const descSorter = new PropertySorter({ order: 'desc' });
        const properties = [
            createTestPropertyWithComments('apple', 'string', [
                createTestComment('Apple comment')
            ]),
            createTestPropertyWithComments('zebra', 'string', [
                createTestComment('Zebra comment')
            ]),
            createTestPropertyWithComments('banana', 'string', [
                createTestComment('Banana comment')
            ])
        ];

        const sorted = descSorter.sortProperties(properties);

        const names = sorted.map(p => p.name);
        assert.deepStrictEqual(names, ['zebra', 'banana', 'apple']);

        const appleProperty = sorted.find(p => p.name === 'apple');
        const bananaProperty = sorted.find(p => p.name === 'banana');
        const zebraProperty = sorted.find(p => p.name === 'zebra');

        assert.ok(appleProperty, 'Apple property should exist');
        assert.ok(bananaProperty, 'Banana property should exist');
        assert.ok(zebraProperty, 'Zebra property should exist');

        assert.strictEqual(appleProperty.comments[0].text, 'Apple comment');
        assert.strictEqual(bananaProperty.comments[0].text, 'Banana comment');
        assert.strictEqual(zebraProperty.comments[0].text, 'Zebra comment');
    });

    test('Comment line numbers and raw text are preserved', () => {
        const properties = [
            createTestPropertyWithComments('zebra', 'string', [
                { text: 'Zebra comment', type: 'single', raw: '// Zebra comment', line: 10 }
            ]),
            createTestPropertyWithComments('apple', 'string', [
                { text: 'Apple comment', type: 'multi', raw: '/* Apple comment */', line: 5 }
            ])
        ];

        const sorted = sorter.sortProperties(properties);

        const appleProperty = sorted.find(p => p.name === 'apple');
        const zebraProperty = sorted.find(p => p.name === 'zebra');

        assert.ok(appleProperty, 'Apple property should exist');
        assert.ok(zebraProperty, 'Zebra property should exist');

        const appleCommentDetails = appleProperty.comments[0];
        const zebraCommentDetails = zebraProperty.comments[0];

        assert.strictEqual(appleCommentDetails.text, 'Apple comment');
        assert.strictEqual(appleCommentDetails.type, 'multi');
        assert.strictEqual(appleCommentDetails.raw, '/* Apple comment */');
        assert.strictEqual(appleCommentDetails.line, 5);

        assert.strictEqual(zebraCommentDetails.text, 'Zebra comment');
        assert.strictEqual(zebraCommentDetails.type, 'single');
        assert.strictEqual(zebraCommentDetails.raw, '// Zebra comment');
        assert.strictEqual(zebraCommentDetails.line, 10);
    });

    test('Comment preservation option can be controlled', () => {
        // Test that the preserveComments option exists and defaults to true
        const defaultSorter = new PropertySorter();
        const options = defaultSorter.getOptions();
        
        assert.strictEqual(options.preserveComments, true, 'preserveComments should default to true');

        // Test that we can create a sorter with preserveComments set to false
        const noCommentSorter = new PropertySorter({ preserveComments: false });
        const noCommentOptions = noCommentSorter.getOptions();
        
        assert.strictEqual(noCommentOptions.preserveComments, false, 'preserveComments should be false when explicitly set');
    });
}); 