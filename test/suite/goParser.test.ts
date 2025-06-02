import * as assert from 'assert';
import { GoParser } from '../../src/goParser';

suite('GoParser Tests', () => {
    let parser: GoParser;

    setup(() => {
        parser = new GoParser();
    });

    test('should parse simple struct', () => {
        const code = `type User struct {
    Name string
    Age int
    Email string
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        assert.strictEqual(entity.type, 'struct');
        assert.strictEqual(entity.name, 'User');
        assert.strictEqual(entity.properties.length, 3);
        
        // Check properties are parsed correctly
        assert.strictEqual(entity.properties[0].name, 'Name');
        assert.strictEqual(entity.properties[0].value, 'string');
        assert.strictEqual(entity.properties[1].name, 'Age');
        assert.strictEqual(entity.properties[1].value, 'int');
        assert.strictEqual(entity.properties[2].name, 'Email');
        assert.strictEqual(entity.properties[2].value, 'string');
    });

    test('should parse struct with tags', () => {
        const code = `type User struct {
    ID int \`json:"id" db:"user_id"\`
    Name string \`json:"name" validate:"required"\`
    Email string \`json:"email"\`
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.entities.length, 1);
        const entity = result.entities[0];
        assert.strictEqual(entity.properties.length, 3);
        
        // Check struct tags are preserved
        assert.strictEqual(entity.properties[0].structTags, 'json:"id" db:"user_id"');
        assert.strictEqual(entity.properties[1].structTags, 'json:"name" validate:"required"');
        assert.strictEqual(entity.properties[2].structTags, 'json:"email"');
    });

    test('should parse struct with comments', () => {
        const code = `type User struct {
    // User identifier
    ID int \`json:"id"\`
    Name string \`json:"name"\` // User's full name
    Email string // Contact email
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.entities.length, 1);
        const entity = result.entities[0];
        assert.strictEqual(entity.properties.length, 3);
        
        // Check leading comments (comments that appear above the field)
        assert.strictEqual(entity.properties[0].comments.length, 1);
        assert.strictEqual(entity.properties[0].comments[0].text, 'User identifier');
        
        // Check trailing comments (comments that appear on the same line as the field)
        assert.strictEqual(entity.properties[1].trailingComments?.length, 1);
        assert.strictEqual(entity.properties[1].trailingComments?.[0].text, "User's full name");
        
        assert.strictEqual(entity.properties[2].trailingComments?.length, 1);
        assert.strictEqual(entity.properties[2].trailingComments?.[0].text, 'Contact email');
    });

    test('should parse embedded fields', () => {
        const code = `type User struct {
    BaseModel
    Name string
    Email string
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.entities.length, 1);
        const entity = result.entities[0];
        assert.strictEqual(entity.properties.length, 3);
        
        // Check embedded field
        assert.strictEqual(entity.properties[0].name, 'BaseModel');
        assert.strictEqual(entity.properties[0].value, 'BaseModel');
        assert.strictEqual(entity.properties[0].isEmbedded, true);
        
        // Check regular fields
        assert.strictEqual(entity.properties[1].isEmbedded, false);
        assert.strictEqual(entity.properties[2].isEmbedded, false);
    });

    test('should sort struct fields alphabetically', () => {
        const code = `type User struct {
    Zebra string
    Alpha int
    Beta bool
}`;

        const result = parser.parse(code, 'test.go');
        const sortedResult = parser.sortParseResult(result, 'asc');
        
        assert.strictEqual(sortedResult.entities.length, 1);
        const entity = sortedResult.entities[0];
        assert.strictEqual(entity.properties.length, 3);
        
        // Check properties are sorted alphabetically
        assert.strictEqual(entity.properties[0].name, 'Alpha');
        assert.strictEqual(entity.properties[1].name, 'Beta');
        assert.strictEqual(entity.properties[2].name, 'Zebra');
    });

    test('should handle multiple structs', () => {
        const code = `type User struct {
    Name string
    Email string
}

type Product struct {
    Title string
    Price float64
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.entities.length, 2);
        
        assert.strictEqual(result.entities[0].name, 'User');
        assert.strictEqual(result.entities[0].properties.length, 2);
        
        assert.strictEqual(result.entities[1].name, 'Product');
        assert.strictEqual(result.entities[1].properties.length, 2);
    });

    test('should detect exported vs unexported structs', () => {
        const code = `type User struct {
    Name string
}

type internalConfig struct {
    secret string
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.entities.length, 2);
        
        // User should be exported (starts with capital)
        assert.strictEqual(result.entities[0].isExported, true);
        
        // internalConfig should not be exported (starts with lowercase)
        assert.strictEqual(result.entities[1].isExported, false);
    });
}); 