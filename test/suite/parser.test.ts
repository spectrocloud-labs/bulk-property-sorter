import * as assert from 'assert';
import { TypeScriptParser } from '../../src/parser';

suite('TypeScript Parser Test Suite', () => {
    let parser: TypeScriptParser;

    setup(() => {
        parser = new TypeScriptParser();
    });

    test('Parse simple interface', () => {
        const code = `
interface User {
    name: string;
    age: number;
    email: string;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
        assert.strictEqual(result.entities.length, 1, 'Should find one entity');
        
        const entity = result.entities[0];
        assert.strictEqual(entity.type, 'interface');
        assert.strictEqual(entity.name, 'User');
        assert.strictEqual(entity.properties.length, 3);
        
        // Check properties are parsed correctly
        const properties = entity.properties;
        assert.strictEqual(properties[0].name, 'name');
        assert.strictEqual(properties[0].value, 'string');
        assert.strictEqual(properties[1].name, 'age');
        assert.strictEqual(properties[1].value, 'number');
        assert.strictEqual(properties[2].name, 'email');
        assert.strictEqual(properties[2].value, 'string');
    });

    test('Parse interface with single-line comments', () => {
        const code = `
interface User {
    // This is a comment
    name: string;
    age: number;
    email: string;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        const nameProperty = entity.properties.find(p => p.name === 'name');
        
        assert.ok(nameProperty, 'Should find name property');
        assert.strictEqual(nameProperty.comments.length, 1);
        assert.strictEqual(nameProperty.comments[0].type, 'single');
        assert.strictEqual(nameProperty.comments[0].text, 'This is a comment');
    });

    test('Parse interface with multi-line comments', () => {
        const code = `
interface User {
    /**
     * This is a comment
     */
    name: string;
    age: number;
    email: string;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        const nameProperty = entity.properties.find(p => p.name === 'name');
        
        assert.ok(nameProperty, 'Should find name property');
        assert.strictEqual(nameProperty.comments.length, 1);
        assert.strictEqual(nameProperty.comments[0].type, 'multi');
        assert.ok(nameProperty.comments[0].text.includes('This is a comment'));
    });

    test('Parse object literal', () => {
        const code = `
export const myStyle = createStyle({
    fontWeight: 'bold',
    fontSize: 16,
    color: 'red',
});`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        assert.strictEqual(entity.type, 'object');
        assert.strictEqual(entity.name, 'myStyle');
        assert.strictEqual(entity.isExported, true);
        assert.strictEqual(entity.properties.length, 3);
        
        // Check properties
        const properties = entity.properties;
        assert.strictEqual(properties[0].name, 'fontWeight');
        assert.strictEqual(properties[0].value, "'bold'");
        assert.strictEqual(properties[1].name, 'fontSize');
        assert.strictEqual(properties[1].value, '16');
        assert.strictEqual(properties[2].name, 'color');
        assert.strictEqual(properties[2].value, "'red'");
    });

    test('Parse exported interface', () => {
        const code = `
export interface User {
    name: string;
    age: number;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        assert.strictEqual(entity.isExported, true);
    });

    test('Parse optional properties', () => {
        const code = `
interface User {
    name: string;
    age?: number;
    email: string;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        const ageProperty = entity.properties.find(p => p.name === 'age');
        
        assert.ok(ageProperty, 'Should find age property');
        assert.strictEqual(ageProperty.optional, true);
        
        const nameProperty = entity.properties.find(p => p.name === 'name');
        assert.ok(nameProperty, 'Should find name property');
        assert.strictEqual(nameProperty.optional, false);
    });

    test('Parse type alias with object type', () => {
        const code = `
type UserType = {
    name: string;
    age: number;
};`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        assert.strictEqual(entity.type, 'type');
        assert.strictEqual(entity.name, 'UserType');
        assert.strictEqual(entity.properties.length, 2);
    });

    test('Parse multiple entities in one file', () => {
        const code = `
interface User {
    name: string;
    age: number;
}

const config = {
    theme: 'dark',
    version: 1
};

export type Settings = {
    enabled: boolean;
};`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 3);
        
        // Check all entities are found
        const interfaceEntity = result.entities.find(e => e.type === 'interface');
        const objectEntity = result.entities.find(e => e.type === 'object');
        const typeEntity = result.entities.find(e => e.type === 'type');
        
        assert.ok(interfaceEntity, 'Should find interface');
        assert.ok(objectEntity, 'Should find object');
        assert.ok(typeEntity, 'Should find type alias');
        
        assert.strictEqual(interfaceEntity.name, 'User');
        assert.strictEqual(objectEntity.name, 'config');
        assert.strictEqual(typeEntity.name, 'Settings');
    });

    test('Parse object with quoted property keys (CSS-like)', () => {
        const code = `
export const baseButton = style({
    alignItems: 'center',
    backgroundColor: 'blue',
    ':hover': {
        backgroundColor: 'darkblue',
    },
    ':focus': {
        outline: 'none',
    },
});`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        assert.strictEqual(entity.type, 'object');
        assert.strictEqual(entity.name, 'baseButton');
        assert.strictEqual(entity.properties.length, 4);
        
        // Check that quoted property keys are preserved
        const hoverProperty = entity.properties.find(p => p.name === "':hover'");
        const focusProperty = entity.properties.find(p => p.name === "':focus'");
        
        assert.ok(hoverProperty, 'Should find :hover property with quotes');
        assert.ok(focusProperty, 'Should find :focus property with quotes');
        
        // Verify the property names include quotes
        assert.strictEqual(hoverProperty.name, "':hover'");
        assert.strictEqual(focusProperty.name, "':focus'");
    });

    test('End-to-end: Parse, sort, and reconstruct CSS-like object with quoted keys', () => {
        const code = `
export const baseButton = style({
    userSelect: 'none',
    alignItems: 'center',
    backgroundColor: 'blue',
    ':hover': {
        backgroundColor: 'darkblue',
    },
    cursor: 'pointer',
    ':focus': {
        outline: 'none',
    },
});`;

        // Parse with sorting enabled
        const parserWithSort = new TypeScriptParser({ sortOrder: 'asc' });
        const result = parserWithSort.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const entity = result.entities[0];
        assert.strictEqual(entity.properties.length, 6);
        
        // Verify properties are sorted alphabetically (quoted keys should sort correctly)
        const propertyNames = entity.properties.map(p => p.name);
        const expectedOrder = [':focus', ':hover', 'alignItems', 'backgroundColor', 'cursor', 'userSelect'];
        
        // Convert to quoted format for comparison
        const expectedOrderQuoted = expectedOrder.map(name => 
            name.startsWith(':') ? `'${name}'` : name
        );
        
        assert.deepStrictEqual(propertyNames, expectedOrderQuoted, 'Properties should be sorted alphabetically with quoted keys preserved');
        
        // Verify quoted properties still have their quotes
        assert.ok(propertyNames.includes("':focus'"), 'Should preserve quotes for :focus');
        assert.ok(propertyNames.includes("':hover'"), 'Should preserve quotes for :hover');
    });

    test('Handle parsing errors gracefully', () => {
        const code = `
interface User {
    name: string
    age: number // missing semicolon
    email string; // syntax error
}`;

        const result = parser.parse(code);
        
        // Should still parse what it can, even with syntax errors
        assert.strictEqual(result.entities.length, 1);
        const entity = result.entities[0];
        assert.strictEqual(entity.name, 'User');
        // Properties might still be parsed despite syntax errors
    });

    test('Parse interface with readonly properties', () => {
        const code = `
interface ReadonlyInterface {
    readonly id: number;
    readonly name: string;
    mutable: boolean;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].properties.length, 3);
        
        // Should parse readonly properties
        const properties = result.entities[0].properties;
        assert.ok(properties.some(p => p.name === 'id'));
        assert.ok(properties.some(p => p.name === 'name'));
        assert.ok(properties.some(p => p.name === 'mutable'));
    });

    test('Parse object with numeric keys', () => {
        const code = `
const numericKeys = {
    1: 'one',
    2: 'two',
    10: 'ten',
    '3': 'three'
};`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].properties.length, 4);
        
        const properties = result.entities[0].properties;
        const names = properties.map(p => p.name);
        assert.ok(names.includes('1'));
        assert.ok(names.includes('2'));
        assert.ok(names.includes('10'));
        assert.ok(names.includes("'3'"));
    });

    test('Parse interface with function types', () => {
        const code = `
interface WithFunctions {
    callback: (arg: string) => void;
    asyncFn: () => Promise<number>;
    overloaded: {
        (x: number): string;
        (x: string): number;
    };
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].properties.length, 3);
    });

    test('Parse object with array and object values', () => {
        const code = `
const complexValues = {
    array: [1, 2, 3],
    object: { nested: true },
    nullValue: null,
    undefinedValue: undefined,
    booleanValue: false
};`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].properties.length, 5);
    });

    test('Parse interface with extends clause', () => {
        const code = `
interface Base {
    id: number;
}

interface Extended extends Base {
    name: string;
    age: number;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 2);
        
        const extendedInterface = result.entities.find(e => e.name === 'Extended');
        assert.ok(extendedInterface);
        assert.strictEqual(extendedInterface.properties.length, 2);
    });

    test('Parse interface with union and intersection types', () => {
        const code = `
interface ComplexTypes {
    union: string | number | boolean;
    intersection: { a: string } & { b: number };
    conditional: T extends string ? number : boolean;
    mapped: { [K in keyof T]: string };
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        assert.strictEqual(result.entities[0].properties.length, 4);
    });

    test('Parse object with symbol keys', () => {
        const code = `
const symbolKeys = {
    [Symbol.iterator]: function*() {},
    [Symbol.toStringTag]: 'CustomObject',
    regularKey: 'value'
};`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        // Should handle symbol keys gracefully
    });

    test('Parse very deeply nested comments', () => {
        const code = `
interface Nested {
    /**
     * This is a very long comment that spans multiple lines
     * and contains various special characters
     */
    documentedProperty: string;
    // Simple comment
    simpleProperty: number;
}`;

        const result = parser.parse(code);
        
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.entities.length, 1);
        
        const documentedProperty = result.entities[0].properties.find(p => p.name === 'documentedProperty');
        assert.ok(documentedProperty);
        assert.strictEqual(documentedProperty.comments.length, 1);
        assert.strictEqual(documentedProperty.comments[0].type, 'multi');
    });
}); 