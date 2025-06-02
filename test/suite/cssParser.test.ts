import * as assert from 'assert';
import { CSSParser } from '../../src/cssParser';
import { CSSReconstructor } from '../../src/cssReconstructor';
import { PropertySorter } from '../../src/sorter';

suite('CSS Comment Duplication Test Suite', () => {
    let parser: CSSParser;
    let reconstructor: CSSReconstructor;
    let sorter: PropertySorter;

    setup(() => {
        parser = new CSSParser();
        reconstructor = new CSSReconstructor();
        sorter = new PropertySorter({
            order: 'asc',
            preserveComments: true,
            caseSensitive: false
        });
    });

    test('should not duplicate standalone comments when sorting CSS rules', () => {
        const cssCode = `/* Improve the gutter appearance */
.cm-gutters {
    border-right: 1px solid #404040 !important;
    background-color: #1e1e1e !important;
    color: #858585 !important;
}

/* Improve the cursor appearance */
.cm-cursor {
    border-left: 2px solid #aeafad !important;
}

/* Selection color */
.cm-selectionBackground {
    background-color: rgba(58, 61, 65, 0.6) !important;
}

/* Active line highlight */
.cm-activeLine {
    background-color: rgba(33, 36, 41, 0.5) !important;
}`;

        const result = parser.parse(cssCode);
        
        // Check that we have the expected number of entities
        assert.strictEqual(result.entities.length, 4);
        
        // Check that each entity has exactly one leading comment
        for (const entity of result.entities) {
            assert.strictEqual(entity.leadingComments.length, 1, 
                `Entity ${entity.name} should have exactly 1 leading comment, but has ${entity.leadingComments.length}`);
        }
        
        // Check that the comments are correctly associated
        assert.strictEqual(result.entities[0].leadingComments[0].text, 'Improve the gutter appearance');
        assert.strictEqual(result.entities[1].leadingComments[0].text, 'Improve the cursor appearance');
        assert.strictEqual(result.entities[2].leadingComments[0].text, 'Selection color');
        assert.strictEqual(result.entities[3].leadingComments[0].text, 'Active line highlight');
    });

    test('should not duplicate comments during full reconstruction process', () => {
        const cssCode = `/* Improve the gutter appearance */
.cm-gutters {
    border-right: 1px solid #404040 !important;
    background-color: #1e1e1e !important;
    color: #858585 !important;
}

/* Improve the cursor appearance */
.cm-cursor {
    border-left: 2px solid #aeafad !important;
}

/* Selection color */
.cm-selectionBackground {
    background-color: rgba(58, 61, 65, 0.6) !important;
}

/* Active line highlight */
.cm-activeLine {
    background-color: rgba(33, 36, 41, 0.5) !important;
}`;

        // Parse the CSS
        const parseResult = parser.parse(cssCode);
        
        // Sort the entities
        const sortedEntities = sorter.sortMultipleEntities(parseResult.entities);
        
        // Reconstruct the CSS
        const reconstructedCSS = reconstructor.reconstruct(cssCode, parseResult, sortedEntities);
        
        // Check that comments are not duplicated
        const commentOccurrences = (reconstructedCSS.match(/\/\* Improve the gutter appearance \*\//g) || []).length;
        assert.strictEqual(commentOccurrences, 1, 
            `Comment "Improve the gutter appearance" should appear exactly once, but appears ${commentOccurrences} times`);
        
        const cursorCommentOccurrences = (reconstructedCSS.match(/\/\* Improve the cursor appearance \*\//g) || []).length;
        assert.strictEqual(cursorCommentOccurrences, 1, 
            `Comment "Improve the cursor appearance" should appear exactly once, but appears ${cursorCommentOccurrences} times`);
        
        const selectionCommentOccurrences = (reconstructedCSS.match(/\/\* Selection color \*\//g) || []).length;
        assert.strictEqual(selectionCommentOccurrences, 1, 
            `Comment "Selection color" should appear exactly once, but appears ${selectionCommentOccurrences} times`);
        
        const activeLineCommentOccurrences = (reconstructedCSS.match(/\/\* Active line highlight \*\//g) || []).length;
        assert.strictEqual(activeLineCommentOccurrences, 1, 
            `Comment "Active line highlight" should appear exactly once, but appears ${activeLineCommentOccurrences} times`);
    });
}); 