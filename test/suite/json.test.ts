import * as assert from 'assert';
import { JSONParser } from '../../src/jsonParser';
import { JSONPropertySorter } from '../../src/languageSorters';
import { CoreProcessor } from '../../src/coreProcessor';

suite('JSON Parser and Sorting Test Suite', () => {
    let parser: JSONParser;
    let sorter: JSONPropertySorter;
    let coreProcessor: CoreProcessor;

    setup(() => {
        parser = new JSONParser();
        sorter = new JSONPropertySorter();
        coreProcessor = new CoreProcessor();
    });

    suite('JSON Parser Tests', () => {
        test('Parse simple JSON object', () => {
            const jsonCode = `{
    "name": "test-app",
    "version": "1.0.0",
    "dependencies": {
        "react": "^18.0.0",
        "typescript": "^4.9.0"
    }
}`;

            const result = parser.parse(jsonCode);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.fileType, 'json');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.type, 'json-object');
            assert.strictEqual(entity.name, 'root');
            assert.strictEqual(entity.properties.length, 3);
            
            // Check properties are parsed correctly
            const properties = entity.properties;
            assert.strictEqual(properties[0].name, 'name');
            assert.strictEqual(properties[0].value, '"test-app"');
            assert.strictEqual(properties[1].name, 'version');
            assert.strictEqual(properties[1].value, '"1.0.0"');
            assert.strictEqual(properties[2].name, 'dependencies');
            assert.strictEqual(properties[2].hasNestedObject, true);
        });

        test('Parse JSON array', () => {
            const jsonCode = `[
    {
        "id": 1,
        "name": "John"
    },
    {
        "id": 2,
        "name": "Jane"
    }
]`;

            const result = parser.parse(jsonCode);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.type, 'json-array');
            assert.strictEqual(entity.name, 'root');
            assert.strictEqual(entity.properties.length, 2);
        });

        test('Parse JSONC with comments', () => {
            const jsoncCode = `{
    // Application configuration
    "name": "test-app",
    /* 
     * Version information
     */
    "version": "1.0.0",
    "dependencies": {
        "react": "^18.0.0" // Main UI library
    }
}`;

            const result = parser.parse(jsoncCode, 'config.jsonc');
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.fileType, 'jsonc');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.type, 'json-object');
            assert.strictEqual(entity.properties.length, 3);
        });

        test('Parse nested JSON objects', () => {
            const jsonCode = `{
    "database": {
        "host": "localhost",
        "port": 5432,
        "credentials": {
            "username": "admin",
            "password": "secret"
        }
    },
    "cache": {
        "redis": {
            "url": "redis://localhost:6379"
        }
    }
}`;

            const result = parser.parse(jsonCode);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.properties.length, 2);
            
            const databaseProp = entity.properties.find(p => p.name === 'database');
            const cacheProp = entity.properties.find(p => p.name === 'cache');
            
            assert.ok(databaseProp, 'Should find database property');
            assert.ok(cacheProp, 'Should find cache property');
            assert.strictEqual(databaseProp.hasNestedObject, true);
            assert.strictEqual(cacheProp.hasNestedObject, true);
        });

        test('Parse package.json structure', () => {
            const packageJsonCode = `{
    "name": "bulk-property-sorter",
    "displayName": "Bulk Property Sorter",
    "description": "Sort properties in TypeScript interfaces, objects, and more",
    "version": "0.5.1",
    "publisher": "robertparker",
    "engines": {
        "vscode": "^1.83.0"
    },
    "categories": ["Formatters", "Other"],
    "keywords": ["sort", "properties", "typescript", "interface"],
    "activationEvents": ["onLanguage:typescript", "onLanguage:json"],
    "main": "./out/extension.js",
    "contributes": {
        "commands": [
            {
                "command": "bulk-property-sorter.sortAscending",
                "title": "Sort Properties (Ascending)"
            }
        ]
    },
    "scripts": {
        "compile": "tsc -p ./",
        "test": "npm run compile && node ./out/test/runTest.js"
    },
    "devDependencies": {
        "@types/vscode": "^1.83.0",
        "typescript": "^5.2.0"
    },
    "dependencies": {
        "minimatch": "^9.0.3"
    }
}`;

            const result = parser.parse(packageJsonCode);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.ok(entity.properties.length >= 10, 'Should find multiple top-level properties');
            
            const contributesProp = entity.properties.find(p => p.name === 'contributes');
            const scriptsProp = entity.properties.find(p => p.name === 'scripts');
            
            assert.ok(contributesProp, 'Should find contributes property');
            assert.ok(scriptsProp, 'Should find scripts property');
            assert.strictEqual(contributesProp.hasNestedObject, true);
            assert.strictEqual(scriptsProp.hasNestedObject, true);
        });

        test('Parse API response JSON', () => {
            const apiResponseCode = `{
    "status": "success",
    "data": {
        "users": [
            {
                "id": 1,
                "username": "john_doe",
                "email": "john@example.com",
                "profile": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "avatar": "https://example.com/avatar.jpg"
                }
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 1
        }
    },
    "meta": {
        "timestamp": "2023-12-01T10:00:00Z",
        "version": "v1"
    }
}`;

            const result = parser.parse(apiResponseCode);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.properties.length, 3);
            
            const statusProp = entity.properties.find(p => p.name === 'status');
            const dataProp = entity.properties.find(p => p.name === 'data');
            
            assert.ok(statusProp, 'Should find status property');
            assert.ok(dataProp, 'Should find data property');
            assert.strictEqual(statusProp.value, '"success"');
            assert.strictEqual(dataProp.hasNestedObject, true);
        });

        test('Handle malformed JSON', () => {
            const malformedJson = `{
    "name": "test",
    "version": "1.0.0",
    // Missing comma here
    "invalid": true
    "another": false
}`;

            const result = parser.parse(malformedJson);
            
            assert.ok(result.errors.length > 0, 'Should have parsing errors');
            assert.ok(result.errors[0].includes('JSON parsing error'), 'Should indicate JSON parsing error');
        });

        test('Parse empty JSON object', () => {
            const emptyJson = '{}';
            
            const result = parser.parse(emptyJson);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.properties.length, 0, 'Should have no properties');
        });

        test('Parse empty JSON array', () => {
            const emptyArray = '[]';
            
            const result = parser.parse(emptyArray);
            
            assert.strictEqual(result.errors.length, 0, 'Should have no parsing errors');
            assert.strictEqual(result.entities.length, 1, 'Should find one entity');
            
            const entity = result.entities[0];
            assert.strictEqual(entity.type, 'json-array');
            assert.strictEqual(entity.properties.length, 0, 'Should have no properties');
        });
    });

    suite('JSON Property Sorter Tests', () => {
        test('Sort object properties in ascending order', () => {
            const properties = [
                { name: 'zebra', value: '"test"', optional: false, line: 1, comments: [], fullText: '"zebra": "test"', trailingPunctuation: ',' },
                { name: 'alpha', value: '"test"', optional: false, line: 2, comments: [], fullText: '"alpha": "test"', trailingPunctuation: ',' },
                { name: 'beta', value: '"test"', optional: false, line: 3, comments: [], fullText: '"beta": "test"', trailingPunctuation: ',' }
            ];
            
            const sorted = sorter.sortProperties(properties, { type: 'json-object', name: 'test', startLine: 1, endLine: 3, isExported: false, leadingComments: [], originalText: '', properties });
            
            assert.strictEqual(sorted[0].name, 'alpha');
            assert.strictEqual(sorted[1].name, 'beta');
            assert.strictEqual(sorted[2].name, 'zebra');
        });

        test('Sort object properties in descending order', () => {
            const sorterDesc = new JSONPropertySorter({ sortOrder: 'desc' });
            const properties = [
                { name: 'alpha', value: '"test"', optional: false, line: 1, comments: [], fullText: '"alpha": "test"', trailingPunctuation: ',' },
                { name: 'zebra', value: '"test"', optional: false, line: 2, comments: [], fullText: '"zebra": "test"', trailingPunctuation: ',' },
                { name: 'beta', value: '"test"', optional: false, line: 3, comments: [], fullText: '"beta": "test"', trailingPunctuation: ',' }
            ];
            
            const sorted = sorterDesc.sortProperties(properties, { type: 'json-object', name: 'test', startLine: 1, endLine: 3, isExported: false, leadingComments: [], originalText: '', properties });
            
            assert.strictEqual(sorted[0].name, 'zebra');
            assert.strictEqual(sorted[1].name, 'beta');
            assert.strictEqual(sorted[2].name, 'alpha');
        });

        test('Preserve array order by default', () => {
            const arrayProperties = [
                { name: '0', value: '"third"', optional: false, line: 1, comments: [], fullText: '"third"', trailingPunctuation: ',' },
                { name: '1', value: '"first"', optional: false, line: 2, comments: [], fullText: '"first"', trailingPunctuation: ',' },
                { name: '2', value: '"second"', optional: false, line: 3, comments: [], fullText: '"second"', trailingPunctuation: '' }
            ];
            
            const sorted = sorter.sortProperties(arrayProperties, { type: 'json-array', name: 'test', startLine: 1, endLine: 3, isExported: false, leadingComments: [], originalText: '', properties: arrayProperties });
            
            // Should preserve original order for arrays
            assert.strictEqual(sorted[0].name, '0');
            assert.strictEqual(sorted[1].name, '1');
            assert.strictEqual(sorted[2].name, '2');
        });

        test('Sort arrays when preserveArrayOrder is false', () => {
            const sorterNoPreserve = new JSONPropertySorter({ preserveArrayOrder: false });
            const arrayProperties = [
                { name: '0', value: '"zebra"', optional: false, line: 1, comments: [], fullText: '"zebra"', trailingPunctuation: ',' },
                { name: '1', value: '"alpha"', optional: false, line: 2, comments: [], fullText: '"alpha"', trailingPunctuation: ',' },
                { name: '2', value: '"beta"', optional: false, line: 3, comments: [], fullText: '"beta"', trailingPunctuation: '' }
            ];
            
            const sorted = sorterNoPreserve.sortProperties(arrayProperties, { type: 'json-array', name: 'test', startLine: 1, endLine: 3, isExported: false, leadingComments: [], originalText: '', properties: arrayProperties });
            
            // Should sort by property names (array indices)
            assert.strictEqual(sorted[0].name, '0');
            assert.strictEqual(sorted[1].name, '1');
            assert.strictEqual(sorted[2].name, '2');
        });

        test('Apply custom key order', () => {
            const customSorter = new JSONPropertySorter({ customKeyOrder: ['version', 'name', 'description'] });
            const properties = [
                { name: 'description', value: '"A test package"', optional: false, line: 1, comments: [], fullText: '"description": "A test package"', trailingPunctuation: ',' },
                { name: 'author', value: '"John Doe"', optional: false, line: 2, comments: [], fullText: '"author": "John Doe"', trailingPunctuation: ',' },
                { name: 'name', value: '"test-package"', optional: false, line: 3, comments: [], fullText: '"name": "test-package"', trailingPunctuation: ',' },
                { name: 'version', value: '"1.0.0"', optional: false, line: 4, comments: [], fullText: '"version": "1.0.0"', trailingPunctuation: ',' }
            ];
            
            const sorted = customSorter.sortProperties(properties, { type: 'json-object', name: 'test', startLine: 1, endLine: 4, isExported: false, leadingComments: [], originalText: '', properties });
            
            // Should follow custom order: version, name, description, then others alphabetically
            assert.strictEqual(sorted[0].name, 'version');
            assert.strictEqual(sorted[1].name, 'name');
            assert.strictEqual(sorted[2].name, 'description');
            assert.strictEqual(sorted[3].name, 'author'); // Alphabetically after custom order
        });

        test('Group by schema patterns', () => {
            const schemaSorter = new JSONPropertySorter({ groupBySchema: true });
            const properties = [
                { name: 'description', value: '"A test schema"', optional: false, line: 1, comments: [], fullText: '"description": "A test schema"', trailingPunctuation: ',' },
                { name: 'properties', value: '{}', optional: false, line: 2, comments: [], fullText: '"properties": {}', trailingPunctuation: ',' },
                { name: 'type', value: '"object"', optional: false, line: 3, comments: [], fullText: '"type": "object"', trailingPunctuation: ',' },
                { name: 'title', value: '"Test Schema"', optional: false, line: 4, comments: [], fullText: '"title": "Test Schema"', trailingPunctuation: ',' },
                { name: '$schema', value: '"http://json-schema.org/draft-07/schema#"', optional: false, line: 5, comments: [], fullText: '"$schema": "http://json-schema.org/draft-07/schema#"', trailingPunctuation: ',' }
            ];
            
            const sorted = schemaSorter.sortProperties(properties, { type: 'json-object', name: 'test', startLine: 1, endLine: 5, isExported: false, leadingComments: [], originalText: '', properties });
            
            // Should group by schema: metadata first ($schema, type), then required (properties, title), then optional (description)
            assert.strictEqual(sorted[0].name, '$schema'); // metadata
            assert.strictEqual(sorted[1].name, 'type'); // metadata
            assert.strictEqual(sorted[2].name, 'properties'); // required
            assert.strictEqual(sorted[3].name, 'title'); // required
            assert.strictEqual(sorted[4].name, 'description'); // optional
        });

        test('Do not sort when sortObjectKeys is false', () => {
            const noSortSorter = new JSONPropertySorter({ sortObjectKeys: false });
            const properties = [
                { name: 'zebra', value: '"test"', optional: false, line: 1, comments: [], fullText: '"zebra": "test"', trailingPunctuation: ',' },
                { name: 'alpha', value: '"test"', optional: false, line: 2, comments: [], fullText: '"alpha": "test"', trailingPunctuation: ',' },
                { name: 'beta', value: '"test"', optional: false, line: 3, comments: [], fullText: '"beta": "test"', trailingPunctuation: ',' }
            ];
            
            const sorted = noSortSorter.sortProperties(properties, { type: 'json-object', name: 'test', startLine: 1, endLine: 3, isExported: false, leadingComments: [], originalText: '', properties });
            
            // Should preserve original order
            assert.strictEqual(sorted[0].name, 'zebra');
            assert.strictEqual(sorted[1].name, 'alpha');
            assert.strictEqual(sorted[2].name, 'beta');
        });
    });

    suite('Core Processor JSON Integration Tests', () => {
        test('Process simple JSON file', () => {
            const jsonCode = `{
    "name": "test-app",
    "version": "1.0.0",
    "description": "A test application"
}`;

            const result = coreProcessor.processText(jsonCode, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically
            const lines = result.processedText.split('\n');
            const nameIndex = lines.findIndex(line => line.includes('"description"'));
            const versionIndex = lines.findIndex(line => line.includes('"name"'));
            const descIndex = lines.findIndex(line => line.includes('"version"'));
            
            assert.ok(nameIndex < versionIndex); // description before name
            assert.ok(versionIndex < descIndex); // name before version
        });

        test('Process JSONC file with comments', () => {
            const jsoncCode = `{
    // Application name
    "name": "test-app",
    /* Version information */
    "version": "1.0.0",
    "description": "A test application"
}`;

            const result = coreProcessor.processText(jsoncCode, {
                fileType: 'jsonc',
                sortOrder: 'asc',
                sortObjectKeys: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Should preserve comments and sort properties
            assert.ok(result.processedText.includes('// Application name'));
            assert.ok(result.processedText.includes('/* Version information */'));
        });

        test('Process nested JSON objects', () => {
            const jsonCode = `{
    "database": {
        "port": 5432,
        "host": "localhost"
    },
    "app": {
        "name": "test-app"
    }
}`;

            const result = coreProcessor.processText(jsonCode, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Top-level properties should be sorted (app before database)
            const lines = result.processedText.split('\n');
            const appIndex = lines.findIndex(line => line.includes('"app"'));
            const databaseIndex = lines.findIndex(line => line.includes('"database"'));
            
            assert.ok(appIndex < databaseIndex);
            
            // Nested properties should also be sorted (host before port)
            const hostIndex = lines.findIndex(line => line.includes('"host"'));
            const portIndex = lines.findIndex(line => line.includes('"port"'));
            
            assert.ok(hostIndex < portIndex);
        });

        test('Process JSON array', () => {
            const jsonCode = `[
    {
        "name": "John",
        "id": 1
    },
    {
        "name": "Jane",
        "id": 2
    }
]`;

            const result = coreProcessor.processText(jsonCode, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Array order should be preserved, but object properties sorted (id before name)
            const lines = result.processedText.split('\n');
            const firstIdIndex = lines.findIndex(line => line.includes('"id": 1'));
            const firstNameIndex = lines.findIndex(line => line.includes('"name": "John"'));
            
            assert.ok(firstIdIndex < firstNameIndex);
        });

        test('Handle invalid JSON gracefully', () => {
            const invalidJson = `{
    "name": "test"
    "version": "1.0.0"
}`;

            const result = coreProcessor.processText(invalidJson, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true
            });
            
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].includes('JSON parsing error'));
        });
    });

    suite('Real-world JSON File Tests', () => {
        test('Process package.json structure', () => {
            const packageJson = `{
    "scripts": {
        "test": "jest",
        "build": "webpack"
    },
    "name": "my-package",
    "devDependencies": {
        "webpack": "^5.0.0",
        "@types/node": "^18.0.0"
    },
    "version": "1.0.0",
    "dependencies": {
        "react": "^18.0.0",
        "lodash": "^4.17.21"
    }
}`;

            const result = coreProcessor.processText(packageJson, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                customKeyOrder: ['name', 'version', 'description', 'main'],
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Should follow custom order for top-level, then alphabetical
            const lines = result.processedText.split('\n');
            const nameIndex = lines.findIndex(line => line.includes('"name"'));
            const versionIndex = lines.findIndex(line => line.includes('"version"'));
            const dependenciesIndex = lines.findIndex(line => line.includes('"dependencies"'));
            
            assert.ok(nameIndex < versionIndex); // name before version (custom order)
            assert.ok(dependenciesIndex < lines.findIndex(line => line.includes('"scripts"'))); // dependencies before scripts (alphabetical)
        });

        test('Process TSConfig JSON', () => {
            const tsconfigJson = `{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}`;

            const result = coreProcessor.processText(tsconfigJson, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"compilerOptions"')) < lines.findIndex(line => line.includes('"exclude"')));
            assert.ok(lines.findIndex(line => line.includes('"exclude"')) < lines.findIndex(line => line.includes('"include"')));
        });

        test('Process API response JSON', () => {
            const apiResponse = `{
    "meta": {
        "timestamp": "2023-12-01T10:00:00Z",
        "version": "v1"
    },
    "data": {
        "users": [
            {
                "username": "john_doe",
                "id": 1,
                "email": "john@example.com"
            }
        ],
        "pagination": {
            "total": 1,
            "page": 1,
            "limit": 10
        }
    },
    "status": "success"
}`;

            const result = coreProcessor.processText(apiResponse, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Top-level should be sorted: data, meta, status
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"data"')) < lines.findIndex(line => line.includes('"meta"')));
            assert.ok(lines.findIndex(line => line.includes('"meta"')) < lines.findIndex(line => line.includes('"status"')));
        });

        test('Process ESLint configuration JSON', () => {
            const eslintConfig = `{
    "rules": {
        "no-console": "warn",
        "indent": ["error", 2],
        "@typescript-eslint/no-unused-vars": "error"
    },
    "env": {
        "node": true,
        "browser": true
    },
    "extends": [
        "eslint:recommended",
        "@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser"
}`;

            const result = coreProcessor.processText(eslintConfig, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically: env, extends, parser, rules
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"env"')) < lines.findIndex(line => line.includes('"extends"')));
            assert.ok(lines.findIndex(line => line.includes('"extends"')) < lines.findIndex(line => line.includes('"parser"')));
            assert.ok(lines.findIndex(line => line.includes('"parser"')) < lines.findIndex(line => line.includes('"rules"')));
        });

        test('Process VS Code settings JSON', () => {
            const vscodeSettings = `{
    "workbench.colorTheme": "Dark+ (default dark)",
    "editor.fontSize": 14,
    "files.autoSave": "onFocusChange",
    "typescript.preferences.quoteStyle": "single",
    "editor.codeActionsOnSave": {
        "source.organizeImports": true,
        "source.fixAll": true
    }
}`;

            const result = coreProcessor.processText(vscodeSettings, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically: editor.codeActionsOnSave, editor.fontSize, files.autoSave, typescript.preferences.quoteStyle, workbench.colorTheme
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"editor.codeActionsOnSave"')) < lines.findIndex(line => line.includes('"editor.fontSize"')));
            assert.ok(lines.findIndex(line => line.includes('"editor.fontSize"')) < lines.findIndex(line => line.includes('"files.autoSave"')));
            assert.ok(lines.findIndex(line => line.includes('"typescript.preferences"')) < lines.findIndex(line => line.includes('"workbench.colorTheme"')));
        });

        test('Process Babel configuration JSON', () => {
            const babelConfig = `{
    "presets": [
        "@babel/preset-env",
        "@babel/preset-react",
        "@babel/preset-typescript"
    ],
    "plugins": [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-transform-runtime"
    ],
    "env": {
        "test": {
            "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]]
        }
    }
}`;

            const result = coreProcessor.processText(babelConfig, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically: env, plugins, presets
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"env"')) < lines.findIndex(line => line.includes('"plugins"')));
            assert.ok(lines.findIndex(line => line.includes('"env"')) < lines.findIndex(line => line.includes('"presets"')));
        });

        test('Process JSON Schema file', () => {
            const jsonSchema = `{
    "properties": {
        "name": {
            "type": "string",
            "description": "Name of the item"
        },
        "age": {
            "type": "number",
            "minimum": 0
        }
    },
    "type": "object",
    "title": "Person Schema",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "required": ["name"]
}`;

            const result = coreProcessor.processText(jsonSchema, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true,
                groupBySchema: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // When groupBySchema is true, should use schema grouping: $schema and type first, then properties, required, title
            const lines = result.processedText.split('\n');
            const schemaIndex = lines.findIndex(line => line.includes('"$schema"'));
            const typeIndex = lines.findIndex(line => line.includes('"type"'));
            const propertiesIndex = lines.findIndex(line => line.includes('"properties"'));
            const requiredIndex = lines.findIndex(line => line.includes('"required"'));
            const titleIndex = lines.findIndex(line => line.includes('"title"'));
            
            // Check that schema metadata comes first
            assert.ok(schemaIndex < propertiesIndex);
            assert.ok(typeIndex < propertiesIndex);
            // Check that properties and required come before title
            assert.ok(propertiesIndex < titleIndex);
            assert.ok(requiredIndex < titleIndex);
        });

        test('Process Webpack configuration JSON', () => {
            const webpackConfig = `{
    "output": {
        "path": "./dist",
        "filename": "bundle.js"
    },
    "entry": "./src/index.js",
    "module": {
        "rules": [
            {
                "test": "\\\\.tsx?$",
                "use": "ts-loader"
            }
        ]
    },
    "mode": "production"
}`;

            const result = coreProcessor.processText(webpackConfig, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                sortNestedObjects: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically: entry, mode, module, output
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"entry"')) < lines.findIndex(line => line.includes('"mode"')));
            assert.ok(lines.findIndex(line => line.includes('"mode"')) < lines.findIndex(line => line.includes('"module"')));
            assert.ok(lines.findIndex(line => line.includes('"module"')) < lines.findIndex(line => line.includes('"output"')));
        });

        test('Process Jest configuration JSON', () => {
            const jestConfig = `{
    "testEnvironment": "node",
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "testMatch": ["**/__tests__/**/*.test.js"],
    "setupFilesAfterEnv": ["<rootDir>/test/setup.js"],
    "moduleFileExtensions": ["js", "json", "ts"]
}`;

            const result = coreProcessor.processText(jestConfig, {
                fileType: 'json',
                sortOrder: 'asc',
                sortObjectKeys: true,
                preserveArrayOrder: true
            });
            
            assert.strictEqual(result.success, true);
            assert.ok(result.processedText);
            
            // Properties should be sorted alphabetically
            const lines = result.processedText.split('\n');
            assert.ok(lines.findIndex(line => line.includes('"collectCoverage"')) < lines.findIndex(line => line.includes('"coverageDirectory"')));
            assert.ok(lines.findIndex(line => line.includes('"moduleFileExtensions"')) < lines.findIndex(line => line.includes('"setupFilesAfterEnv"')));
        });
    });
}); 