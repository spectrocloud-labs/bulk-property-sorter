import * as assert from 'assert';
import { GoPropertySorter } from '../../src/languageSorters';
import { ParsedProperty, ParsedEntity } from '../../src/types';
import { CoreProcessor } from '../../src/coreProcessor';

suite('Go Advanced Features Test Suite', () => {
    let sorter: GoPropertySorter;
    let processor: CoreProcessor;

    setup(() => {
        processor = new CoreProcessor();
    });

    suite('Preserve Tags Sorting Tests', () => {
        test('Group fields by tag patterns', () => {
            sorter = new GoPropertySorter({
                sortStructFields: 'preserve-tags',
                sortOrder: 'asc'
            });

            const properties: ParsedProperty[] = [
                {
                    name: 'Email',
                    value: 'string',
                    optional: false,
                    comments: [],
                    line: 1,
                    fullText: 'Email string `json:"email" validate:"required,email"`',
                    trailingPunctuation: '',
                    structTags: 'json:"email" validate:"required,email"'
                },
                {
                    name: 'Name',
                    value: 'string',
                    optional: false,
                    comments: [],
                    line: 2,
                    fullText: 'Name string `json:"name" xml:"name"`',
                    trailingPunctuation: '',
                    structTags: 'json:"name" xml:"name"'
                },
                {
                    name: 'Age',
                    value: 'int',
                    optional: false,
                    comments: [],
                    line: 3,
                    fullText: 'Age int `json:"age" validate:"min=0"`',
                    trailingPunctuation: '',
                    structTags: 'json:"age" validate:"min=0"'
                },
                {
                    name: 'Description',
                    value: 'string',
                    optional: false,
                    comments: [],
                    line: 4,
                    fullText: 'Description string `json:"description" xml:"description"`',
                    trailingPunctuation: '',
                    structTags: 'json:"description" xml:"description"'
                },
                {
                    name: 'ID',
                    value: 'int',
                    optional: false,
                    comments: [],
                    line: 5,
                    fullText: 'ID int',
                    trailingPunctuation: ''
                }
            ];

            const entity: ParsedEntity = {
                type: 'struct',
                name: 'User',
                properties: [],
                isExported: true,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);

            // Fields should be grouped by tag patterns:
            // 1. json+validate (Age, Email)
            // 2. json+xml (Description, Name)
            // 3. no tags (ID)
            
            const names = sorted.map(p => p.name);
            
            // Within each group, should be alphabetically sorted
            // Group 1: json+validate - Age, Email
            assert.strictEqual(names[0], 'Age');
            assert.strictEqual(names[1], 'Email');
            
            // Group 2: json+xml - Description, Name
            assert.strictEqual(names[2], 'Description');
            assert.strictEqual(names[3], 'Name');
            
            // Group 3: no tags - ID
            assert.strictEqual(names[4], 'ID');
        });

        test('Handle fields with only single tag types', () => {
            sorter = new GoPropertySorter({
                sortStructFields: 'preserve-tags',
                sortOrder: 'asc'
            });

            const properties: ParsedProperty[] = [
                {
                    name: 'UpdatedAt',
                    value: 'time.Time',
                    optional: false,
                    comments: [],
                    line: 1,
                    fullText: 'UpdatedAt time.Time `db:"updated_at"`',
                    trailingPunctuation: '',
                    structTags: 'db:"updated_at"'
                },
                {
                    name: 'CreatedAt',
                    value: 'time.Time',
                    optional: false,
                    comments: [],
                    line: 2,
                    fullText: 'CreatedAt time.Time `db:"created_at"`',
                    trailingPunctuation: '',
                    structTags: 'db:"created_at"'
                },
                {
                    name: 'Title',
                    value: 'string',
                    optional: false,
                    comments: [],
                    line: 3,
                    fullText: 'Title string `json:"title"`',
                    trailingPunctuation: '',
                    structTags: 'json:"title"'
                },
                {
                    name: 'Content',
                    value: 'string',
                    optional: false,
                    comments: [],
                    line: 4,
                    fullText: 'Content string `json:"content"`',
                    trailingPunctuation: '',
                    structTags: 'json:"content"'
                }
            ];

            const entity: ParsedEntity = {
                type: 'struct',
                name: 'Post',
                properties: [],
                isExported: true,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);
            const names = sorted.map(p => p.name);

            // Should group by tag type:
            // Group 1: db tags (CreatedAt, UpdatedAt)
            // Group 2: json tags (Content, Title)
            assert.strictEqual(names[0], 'CreatedAt');
            assert.strictEqual(names[1], 'UpdatedAt');
            assert.strictEqual(names[2], 'Content');
            assert.strictEqual(names[3], 'Title');
        });
    });

    suite('Enhanced By-Size Sorting Tests', () => {
        test('Sort by enhanced type sizes', () => {
            sorter = new GoPropertySorter({
                sortStructFields: 'by-size',
                sortOrder: 'asc'
            });

            const properties: ParsedProperty[] = [
                {
                    name: 'BigArray',
                    value: '[100]int64',
                    optional: false,
                    comments: [],
                    line: 1,
                    fullText: 'BigArray [100]int64',
                    trailingPunctuation: ''
                },
                {
                    name: 'Flag',
                    value: 'bool',
                    optional: false,
                    comments: [],
                    line: 2,
                    fullText: 'Flag bool',
                    trailingPunctuation: ''
                },
                {
                    name: 'Data',
                    value: '[]byte',
                    optional: false,
                    comments: [],
                    line: 3,
                    fullText: 'Data []byte',
                    trailingPunctuation: ''
                },
                {
                    name: 'Pointer',
                    value: '*string',
                    optional: false,
                    comments: [],
                    line: 4,
                    fullText: 'Pointer *string',
                    trailingPunctuation: ''
                },
                {
                    name: 'Text',
                    value: 'string',
                    optional: false,
                    comments: [],
                    line: 5,
                    fullText: 'Text string',
                    trailingPunctuation: ''
                },
                {
                    name: 'Counter',
                    value: 'int32',
                    optional: false,
                    comments: [],
                    line: 6,
                    fullText: 'Counter int32',
                    trailingPunctuation: ''
                }
            ];

            const entity: ParsedEntity = {
                type: 'struct',
                name: 'TestStruct',
                properties: [],
                isExported: true,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);
            const names = sorted.map(p => p.name);

            // Expected order by size (ascending):
            // 1. bool (1 byte) - Flag
            // 2. int32 (4 bytes) - Counter  
            // 3. *string (8 bytes) - Pointer
            // 4. string (16 bytes) - Text
            // 5. []byte (24 bytes) - Data
            // 6. [100]int64 (800 bytes) - BigArray
            assert.strictEqual(names[0], 'Flag');
            assert.strictEqual(names[1], 'Counter');
            assert.strictEqual(names[2], 'Pointer');
            assert.strictEqual(names[3], 'Text');
            assert.strictEqual(names[4], 'Data');
            assert.strictEqual(names[5], 'BigArray');
        });

        test('Handle complex types in size sorting', () => {
            sorter = new GoPropertySorter({
                sortStructFields: 'by-size',
                sortOrder: 'asc'
            });

            const properties: ParsedProperty[] = [
                {
                    name: 'CustomType',
                    value: 'mypackage.CustomStruct',
                    optional: false,
                    comments: [],
                    line: 1,
                    fullText: 'CustomType mypackage.CustomStruct',
                    trailingPunctuation: ''
                },
                {
                    name: 'Channel',
                    value: 'chan int',
                    optional: false,
                    comments: [],
                    line: 2,
                    fullText: 'Channel chan int',
                    trailingPunctuation: ''
                },
                {
                    name: 'Mapper',
                    value: 'map[string]int',
                    optional: false,
                    comments: [],
                    line: 3,
                    fullText: 'Mapper map[string]int',
                    trailingPunctuation: ''
                },
                {
                    name: 'Callback',
                    value: 'func(int) string',
                    optional: false,
                    comments: [],
                    line: 4,
                    fullText: 'Callback func(int) string',
                    trailingPunctuation: ''
                },
                {
                    name: 'Number',
                    value: 'int64',
                    optional: false,
                    comments: [],
                    line: 5,
                    fullText: 'Number int64',
                    trailingPunctuation: ''
                }
            ];

            const entity: ParsedEntity = {
                type: 'struct',
                name: 'ComplexStruct',
                properties: [],
                isExported: true,
                startLine: 1,
                endLine: 10,
                leadingComments: [],
                originalText: ''
            };

            const sorted = sorter.sortProperties(properties, entity);
            const names = sorted.map(p => p.name);

            // Expected order by size:
            // 1. int64, chan, map, func (all 8 bytes) - Callback, Channel, Mapper, Number (alphabetical within same size)
            // 2. custom types (999+ bytes) - CustomType
            assert.strictEqual(names[0], 'Callback');
            assert.strictEqual(names[1], 'Channel');
            assert.strictEqual(names[2], 'Mapper');
            assert.strictEqual(names[3], 'Number');
            assert.strictEqual(names[4], 'CustomType');
        });
    });

    suite('Integration Tests with Core Processor', () => {
        test('Preserve tags sorting with real Go code', () => {
            const goCode = `type User struct {
    // Basic identification
    ID int \`json:"id" db:"user_id"\`
    Username string \`json:"username" db:"username"\`
    
    // Profile information  
    Name string \`json:"name" xml:"name"\`
    Bio string \`json:"bio" xml:"bio"\`
    
    // Validation only
    Password string \`validate:"required,min=8"\`
    
    // No tags
    Internal string
    Debug bool
}`;

            const result = processor.processText(goCode, {
                fileType: 'go',
                sortOrder: 'asc',
                includeComments: true,
                sortStructFields: 'preserve-tags'
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);

            const structMatch = result.processedText!.match(/type User struct \{([^}]+)\}/s);
            assert.ok(structMatch, 'User struct should be found');
            
            const fields = structMatch[1];
            
            // Check that fields are grouped by tag patterns
            // Group 1: json+db (ID, Username)
            // Group 2: json+xml (Bio, Name) 
            // Group 3: validate only (Password)
            // Group 4: no tags (Debug, Internal)
            
            const idIndex = fields.indexOf('ID int');
            const usernameIndex = fields.indexOf('Username string');
            const bioIndex = fields.indexOf('Bio string');
            const nameIndex = fields.indexOf('Name string');
            const passwordIndex = fields.indexOf('Password string');
            const debugIndex = fields.indexOf('Debug bool');
            const internalIndex = fields.indexOf('Internal string');
            
            // ID and Username should be together (json+db group)
            assert.ok(Math.abs(idIndex - usernameIndex) < Math.abs(idIndex - bioIndex), 
                     'ID and Username should be closer together than ID and Bio');
            
            // Bio and Name should be together (json+xml group)
            assert.ok(Math.abs(bioIndex - nameIndex) < Math.abs(bioIndex - passwordIndex),
                     'Bio and Name should be closer together than Bio and Password');
            
            // Debug and Internal should be at the end (no tags)
            assert.ok(debugIndex > passwordIndex && internalIndex > passwordIndex,
                     'Fields without tags should come last');
        });

        test('Enhanced by-size sorting with real Go code', () => {
            const goCode = `type DataStruct struct {
    // Different sizes to test sorting
    BigArray [50]int64          // 400 bytes
    Flag bool                   // 1 byte
    Slice []string              // 24 bytes
    Pointer *int               // 8 bytes
    Text string                // 16 bytes
    Counter int32              // 4 bytes
    LargeArray [10]float64     // 80 bytes
}`;

            const result = processor.processText(goCode, {
                fileType: 'go',
                sortOrder: 'asc',
                includeComments: true,
                sortStructFields: 'by-size'
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);

            const structMatch = result.processedText!.match(/type DataStruct struct \{([^}]+)\}/s);
            assert.ok(structMatch, 'DataStruct should be found');
            
            const fields = structMatch[1];
            
            // Check order by increasing size
            const flagIndex = fields.indexOf('Flag bool');           // 1 byte
            const counterIndex = fields.indexOf('Counter int32');     // 4 bytes
            const pointerIndex = fields.indexOf('Pointer *int');      // 8 bytes
            const textIndex = fields.indexOf('Text string');         // 16 bytes
            const sliceIndex = fields.indexOf('Slice []string');     // 24 bytes
            const largeArrayIndex = fields.indexOf('LargeArray [10]float64'); // 80 bytes
            const bigArrayIndex = fields.indexOf('BigArray [50]int64'); // 400 bytes
            
            // Verify ascending size order
            assert.ok(flagIndex < counterIndex, 'Flag (1 byte) should come before Counter (4 bytes)');
            assert.ok(counterIndex < pointerIndex, 'Counter (4 bytes) should come before Pointer (8 bytes)');
            assert.ok(pointerIndex < textIndex, 'Pointer (8 bytes) should come before Text (16 bytes)');
            assert.ok(textIndex < sliceIndex, 'Text (16 bytes) should come before Slice (24 bytes)');
            assert.ok(sliceIndex < largeArrayIndex, 'Slice (24 bytes) should come before LargeArray (80 bytes)');
            assert.ok(largeArrayIndex < bigArrayIndex, 'LargeArray (80 bytes) should come before BigArray (400 bytes)');
        });
    });

    suite('Go Sorter Options Tests', () => {
        test('Update Go sorter options', () => {
            sorter = new GoPropertySorter({
                sortStructFields: 'alphabetical',
                preserveMethodSets: false
            });

            sorter.updateOptions({
                sortStructFields: 'preserve-tags',
                preserveMethodSets: true
            });

            const options = sorter.getOptions();
            assert.strictEqual(options.sortStructFields, 'preserve-tags');
            assert.strictEqual(options.preserveMethodSets, true);
        });

        test('Get Go sorter options', () => {
            const initialOptions = {
                sortOrder: 'desc' as const,
                sortStructFields: 'by-size' as const,
                groupEmbeddedFields: false,
                preserveMethodSets: true
            };

            sorter = new GoPropertySorter(initialOptions);
            const retrievedOptions = sorter.getOptions();

            assert.strictEqual(retrievedOptions.sortOrder, 'desc');
            assert.strictEqual(retrievedOptions.sortStructFields, 'by-size');
            assert.strictEqual(retrievedOptions.groupEmbeddedFields, false);
            assert.strictEqual(retrievedOptions.preserveMethodSets, true);
        });
    });
}); 