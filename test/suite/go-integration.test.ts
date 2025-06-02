import * as assert from 'assert';
import { CoreProcessor } from '../../src/coreProcessor';

suite('Go Language Integration Tests', () => {
    let processor: CoreProcessor;

    setup(() => {
        processor = new CoreProcessor();
    });

    test('should parse and sort Go structs with all features', () => {
        const goCode = `package main

// User represents a user in the system
type User struct {
    // User's email address
    Email string \`json:"email" validate:"required,email"\`
    // User's unique identifier
    ID int \`json:"id" db:"user_id"\`
    // User's full name
    Name string \`json:"name" validate:"required"\`
    // User's age
    Age int \`json:"age" validate:"min=0,max=150"\`
}

// Product represents a product
type Product struct {
    /* Product price */
    Price int \`json:"price"\`
    // Product name
    Name string \`json:"name"\`
    // Product ID
    ID string \`json:"id"\`
}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 2);
        assert.ok(result.processedText);

        // Verify User struct is sorted alphabetically
        const userStructMatch = result.processedText!.match(/type User struct \{([^}]+)\}/s);
        assert.ok(userStructMatch, 'User struct should be found');
        
        const userFields = userStructMatch[1];
        const ageIndex = userFields.indexOf('Age int');
        const emailIndex = userFields.indexOf('Email string');
        const idIndex = userFields.indexOf('ID int');
        const nameIndex = userFields.indexOf('Name string');
        
        assert.ok(ageIndex < emailIndex, 'Age should come before Email');
        assert.ok(emailIndex < idIndex, 'Email should come before ID');
        assert.ok(idIndex < nameIndex, 'ID should come before Name');

        // Verify comments are preserved
        assert.ok(result.processedText!.includes('// User\'s age'), 'Age comment should be preserved');
        assert.ok(result.processedText!.includes('// User\'s email address'), 'Email comment should be preserved');

        // Verify struct tags are preserved
        assert.ok(result.processedText!.includes('`json:"email" validate:"required,email"`'), 'Email struct tags should be preserved');
        assert.ok(result.processedText!.includes('`json:"id" db:"user_id"`'), 'ID struct tags should be preserved');
    });

    test('should handle descending sort order', () => {
        const goCode = `type Config struct {
    Port int \`json:"port"\`
    Host string \`json:"host"\`
    Name string \`json:"name"\`
    Debug bool \`json:"debug"\`
}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'desc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        const structMatch = result.processedText!.match(/type Config struct \{([^}]+)\}/s);
        assert.ok(structMatch, 'Config struct should be found');
        
        const fields = structMatch[1];
        const portIndex = fields.indexOf('Port int');
        const nameIndex = fields.indexOf('Name string');
        const hostIndex = fields.indexOf('Host string');
        const debugIndex = fields.indexOf('Debug bool');
        
        // In descending order: Port > Name > Host > Debug
        assert.ok(portIndex < nameIndex, 'Port should come before Name in desc order');
        assert.ok(nameIndex < hostIndex, 'Name should come before Host in desc order');
        assert.ok(hostIndex < debugIndex, 'Host should come before Debug in desc order');
    });

    test('should handle embedded fields', () => {
        const goCode = `type Order struct {
    // Order ID
    ID string \`json:"id"\`
    // Embedded user
    User
    // Order total
    Total int \`json:"total"\`
    // Embedded address
    Address
}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Verify embedded fields are sorted with regular fields
        const structMatch = result.processedText!.match(/type Order struct \{([^}]+)\}/s);
        assert.ok(structMatch, 'Order struct should be found');
        
        const fields = structMatch[1];
        
        // Should be sorted: Address, ID, Total, User
        const addressIndex = fields.indexOf('Address');
        const idIndex = fields.indexOf('ID string');
        const totalIndex = fields.indexOf('Total int');
        const userIndex = fields.indexOf('User');
        
        assert.ok(addressIndex < idIndex, 'Address should come before ID');
        assert.ok(idIndex < totalIndex, 'ID should come before Total');
        assert.ok(totalIndex < userIndex, 'Total should come before User');
    });

    test('should handle multi-line comments', () => {
        const goCode = `type User struct {
    /*
     * User's unique identifier
     * This is a primary key
     */
    ID int \`json:"id"\`
    // Simple comment
    Name string \`json:"name"\`
    /*
     * User's email address
     */
    Email string \`json:"email"\`
}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Verify multi-line comments are preserved
        assert.ok(result.processedText!.includes('/*'), 'Multi-line comment start should be preserved');
        assert.ok(result.processedText!.includes('*/'), 'Multi-line comment end should be preserved');
        assert.ok(result.processedText!.includes('User\'s unique identifier'), 'Multi-line comment content should be preserved');
        assert.ok(result.processedText!.includes('This is a primary key'), 'Multi-line comment content should be preserved');
    });

    test('should handle unexported structs and fields', () => {
        const goCode = `type internalConfig struct {
    // exported field
    PublicField string \`json:"public_field"\`
    // unexported field
    privateField int
    // another exported field
    AnotherPublic bool \`json:"another_public"\`
}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        const structMatch = result.processedText!.match(/type internalConfig struct \{([^}]+)\}/s);
        assert.ok(structMatch, 'internalConfig struct should be found');
        
        const fields = structMatch[1];
        
        // Should be sorted: AnotherPublic, PublicField, privateField
        const anotherPublicIndex = fields.indexOf('AnotherPublic bool');
        const publicFieldIndex = fields.indexOf('PublicField string');
        const privateFieldIndex = fields.indexOf('privateField int');
        
        assert.ok(anotherPublicIndex < publicFieldIndex, 'AnotherPublic should come before PublicField');
        assert.ok(publicFieldIndex < privateFieldIndex, 'PublicField should come before privateField');
    });

    test('should handle empty structs gracefully', () => {
        const goCode = `type EmptyStruct struct {
}

type AnotherEmpty struct{}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.entitiesProcessed, 2);
        assert.ok(result.processedText);

        // Verify empty structs are preserved
        assert.ok(result.processedText!.includes('type EmptyStruct struct {'), 'EmptyStruct should be preserved');
        assert.ok(result.processedText!.includes('type AnotherEmpty struct{}'), 'AnotherEmpty should be preserved');
    });

    test('should handle complex struct tags', () => {
        const goCode = `type User struct {
    Name string \`json:"name" xml:"name" validate:"required,min=1,max=100" db:"user_name"\`
    Email string \`json:"email,omitempty" validate:"required,email" gorm:"unique;not null"\`
    ID int \`json:"id" db:"user_id,primary_key" validate:"required"\`
}`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.processedText);

        // Verify complex struct tags are preserved exactly
        assert.ok(result.processedText!.includes('`json:"email,omitempty" validate:"required,email" gorm:"unique;not null"`'), 
                 'Complex Email struct tags should be preserved');
        assert.ok(result.processedText!.includes('`json:"name" xml:"name" validate:"required,min=1,max=100" db:"user_name"`'), 
                 'Complex Name struct tags should be preserved');
        assert.ok(result.processedText!.includes('`json:"id" db:"user_id,primary_key" validate:"required"`'), 
                 'Complex ID struct tags should be preserved');
    });

    test('should handle files with no structs', () => {
        const goCode = `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}

var globalVar = "test"

const CONSTANT = 42`;

        const result = processor.processText(goCode, {
            fileType: 'go',
            sortOrder: 'asc',
            includeComments: true
        });

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.entitiesProcessed, 0);
        assert.ok(result.errors.length > 0);
        assert.ok(result.errors[0].includes('No sortable entities found'));
    });
}); 