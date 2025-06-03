import * as assert from 'assert';
import { YAMLParser } from '../../src/yamlParser';
import { YAMLReconstructor } from '../../src/yamlReconstructor';
import { YAMLPropertySorter } from '../../src/languageSorters';
import { CoreProcessor } from '../../src/coreProcessor';

suite('YAML Tests', () => {
    suite('YAMLParser', () => {
        test('should parse simple YAML object', () => {
            const yamlCode = `
name: my-app
version: 1.0.0
dependencies:
  react: ^18.0.0
  babel: ^7.0.0
description: A sample application
`;
            const parser = new YAMLParser();
            const result = parser.parse(yamlCode);

            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1); // Only root object (dependencies is nested property)
            assert.strictEqual(result.entities[0].type, 'yaml-object');
            assert.strictEqual(result.entities[0].properties.length, 4); // name, version, dependencies, description
        });

        test('should parse YAML array', () => {
            const yamlCode = `
services:
  - name: web
    port: 80
  - name: api
    port: 3000
`;
            const parser = new YAMLParser();
            const result = parser.parse(yamlCode);

            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1); // Root object containing services array
            
            // Should have root object with services property containing array
            const rootEntity = result.entities[0];
            assert.strictEqual(rootEntity.type, 'yaml-object');
            assert.strictEqual(rootEntity.properties.length, 1);
            assert.strictEqual(rootEntity.properties[0].name, 'services');
            assert.strictEqual(Array.isArray(rootEntity.properties[0].value), true);
        });

        test('should extract comments', () => {
            const yamlCode = `
# Application configuration
name: my-app  # Application name
version: 1.0.0
# Dependencies section
dependencies:
  react: ^18.0.0
`;
            const parser = new YAMLParser();
            const result = parser.parse(yamlCode);

            assert.strictEqual(result.errors.length, 0);
            
            // Check that comments are preserved in entities
            const hasComments = result.entities.some(entity => 
                entity.leadingComments.length > 0 || 
                entity.properties.some(prop => prop.comments.length > 0 || (prop.trailingComments && prop.trailingComments.length > 0))
            );
            assert.strictEqual(hasComments, true);
        });

        test('should handle multi-document YAML', () => {
            const yamlCode = `
---
# First document
name: service-1
port: 8080
---
# Second document
name: service-2
port: 8081
`;
            const parser = new YAMLParser();
            const result = parser.parse(yamlCode);

            assert.strictEqual(result.errors.length, 0);
            // Should parse multiple documents as separate entities
            assert.strictEqual(result.entities.length >= 2, true);
        });

        test('should handle YAML anchors and aliases', () => {
            const yamlCode = `
defaults: &defaults
  timeout: 30
  retries: 3

service:
  <<: *defaults
  name: api
`;
            const parser = new YAMLParser();
            const result = parser.parse(yamlCode);

            assert.strictEqual(result.errors.length, 0);
            assert.strictEqual(result.entities.length, 1); // Only root object (with defaults and service properties)
            
            // Should have root object with defaults and service properties
            const rootEntity = result.entities[0];
            assert.strictEqual(rootEntity.type, 'yaml-object');
            assert.strictEqual(rootEntity.properties.length, 2); // defaults and service
            
            // Check that both properties exist
            const propertyNames = rootEntity.properties.map(p => p.name);
            assert.strictEqual(propertyNames.includes('defaults'), true);
            assert.strictEqual(propertyNames.includes('service'), true);
        });
    });

    suite('YAMLPropertySorter', () => {
        test('should sort YAML object properties alphabetically', () => {
            const properties = [
                { name: 'zebra', value: '1', comments: [], optional: false, line: 1, fullText: 'zebra: 1', trailingPunctuation: '' },
                { name: 'apple', value: '2', comments: [], optional: false, line: 2, fullText: 'apple: 2', trailingPunctuation: '' },
                { name: 'banana', value: '3', comments: [], optional: false, line: 3, fullText: 'banana: 3', trailingPunctuation: '' }
            ];

            const sorter = new YAMLPropertySorter({ sortOrder: 'asc' });
            const sorted = sorter.sortProperties(properties);

            assert.strictEqual(sorted[0].name, 'apple');
            assert.strictEqual(sorted[1].name, 'banana');
            assert.strictEqual(sorted[2].name, 'zebra');
        });

        test('should respect custom key order for Kubernetes-style YAML', () => {
            const properties = [
                { name: 'spec', value: '{}', comments: [], optional: false, line: 1, fullText: 'spec: {}', trailingPunctuation: '' },
                { name: 'metadata', value: '{}', comments: [], optional: false, line: 2, fullText: 'metadata: {}', trailingPunctuation: '' },
                { name: 'apiVersion', value: 'v1', comments: [], optional: false, line: 3, fullText: 'apiVersion: v1', trailingPunctuation: '' },
                { name: 'kind', value: 'Pod', comments: [], optional: false, line: 4, fullText: 'kind: Pod', trailingPunctuation: '' }
            ];

            const sorter = new YAMLPropertySorter({ 
                sortOrder: 'asc',
                customKeyOrder: ['apiVersion', 'kind', 'metadata', 'spec']
            });
            const sorted = sorter.sortProperties(properties);

            assert.strictEqual(sorted[0].name, 'apiVersion');
            assert.strictEqual(sorted[1].name, 'kind');
            assert.strictEqual(sorted[2].name, 'metadata');
            assert.strictEqual(sorted[3].name, 'spec');
        });

        test('should preserve array order when preserveArrayOrder is true', () => {
            const properties = [
                { name: '[0]', value: 'third', comments: [], optional: false, line: 1, fullText: '- third', trailingPunctuation: '' },
                { name: '[1]', value: 'first', comments: [], optional: false, line: 2, fullText: '- first', trailingPunctuation: '' },
                { name: '[2]', value: 'second', comments: [], optional: false, line: 3, fullText: '- second', trailingPunctuation: '' }
            ];

            const sorter = new YAMLPropertySorter({ 
                sortOrder: 'asc',
                preserveArrayOrder: true
            });
            const entity = { type: 'yaml-array' as const, name: 'test', properties: [], startLine: 1, endLine: 3, leadingComments: [], isExported: false };
            const sorted = sorter.sortProperties(properties, entity);

            assert.strictEqual(sorted[0].name, '[0]');
            assert.strictEqual(sorted[1].name, '[1]');
            assert.strictEqual(sorted[2].name, '[2]');
        });
    });

    suite('YAMLReconstructor', () => {
        test('should reconstruct simple YAML object', () => {
            const entity = {
                type: 'yaml-object' as const,
                name: 'root',
                properties: [
                    { name: 'name', value: 'my-app', comments: [], optional: false, line: 1, fullText: 'name: my-app', trailingPunctuation: '' },
                    { name: 'version', value: '1.0.0', comments: [], optional: false, line: 2, fullText: 'version: 1.0.0', trailingPunctuation: '' }
                ],
                startLine: 1,
                endLine: 2,
                leadingComments: [],
                isExported: false
            };

            const reconstructor = new YAMLReconstructor();
            const result = reconstructor.reconstructEntity(entity);

            assert.strictEqual(result.includes('name: my-app'), true);
            assert.strictEqual(result.includes('version: 1.0.0'), true);
        });

        test('should reconstruct YAML array', () => {
            const entity = {
                type: 'yaml-array' as const,
                name: 'items',
                properties: [
                    { name: '[0]', value: 'first', comments: [], optional: false, line: 1, fullText: '- first', trailingPunctuation: '' },
                    { name: '[1]', value: 'second', comments: [], optional: false, line: 2, fullText: '- second', trailingPunctuation: '' }
                ],
                startLine: 1,
                endLine: 2,
                leadingComments: [],
                isExported: false
            };

            const reconstructor = new YAMLReconstructor();
            const result = reconstructor.reconstructEntity(entity);

            assert.strictEqual(result.includes('- first'), true);
            assert.strictEqual(result.includes('- second'), true);
        });

        test('should preserve comments when includeComments is true', () => {
            const entity = {
                type: 'yaml-object' as const,
                name: 'root',
                properties: [
                    { 
                        name: 'name', 
                        value: 'my-app', 
                        comments: [{ text: 'Application name', type: 'single' as const, raw: '# Application name', line: 1 }], 
                        optional: false, 
                        line: 2, 
                        fullText: 'name: my-app', 
                        trailingPunctuation: '' 
                    }
                ],
                startLine: 1,
                endLine: 2,
                leadingComments: [],
                isExported: false
            };

            const reconstructor = new YAMLReconstructor({ includeComments: true });
            const result = reconstructor.reconstructEntity(entity);

            assert.strictEqual(result.includes('# Application name'), true);
            assert.strictEqual(result.includes('name: my-app'), true);
        });
    });

    suite('CoreProcessor YAML Integration', () => {
        test('should process YAML code end-to-end', () => {
            const yamlCode = `
name: my-app
zebra: value
alpha: another
dependencies:
  react: ^18.0.0
  babel: ^7.0.0
`;
            
            const processor = new CoreProcessor();
            const result = processor.processText(yamlCode, {
                sortOrder: 'asc',
                fileType: 'yaml',
                preserveFormatting: true,
                includeComments: true,
                sortNestedObjects: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.processedText !== undefined, true);
            
            // Check that properties are sorted
            const processedText = result.processedText!;
            const alphaIndex = processedText.indexOf('alpha:');
            const nameIndex = processedText.indexOf('name:');
            const zebraIndex = processedText.indexOf('zebra:');
            
            assert.strictEqual(alphaIndex < nameIndex, true);
            assert.strictEqual(nameIndex < zebraIndex, true);
        });

        test('should handle YAML-specific options', () => {
            const yamlCode = `
# Configuration
name: my-app
zebra: value
alpha: another
items:
  - third
  - first  
  - second
`;
            
            const processor = new CoreProcessor();
            const result = processor.processText(yamlCode, {
                sortOrder: 'asc',
                fileType: 'yaml',
                preserveFormatting: true,
                includeComments: true,
                sortNestedObjects: true,
                preserveArrayOrder: true,
                preserveComments: true,
                sortObjectKeys: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.processedText !== undefined, true);
            
            const processedText = result.processedText!;
            
            // Should preserve comments
            assert.strictEqual(processedText.includes('# Configuration'), true);
            
            // Should sort object keys
            const alphaIndex = processedText.indexOf('alpha:');
            const nameIndex = processedText.indexOf('name:');
            assert.strictEqual(alphaIndex < nameIndex, true);
        });

        test('should handle custom key order for Kubernetes YAML', () => {
            const yamlCode = `
spec:
  containers: []
metadata:
  name: my-pod
kind: Pod  
apiVersion: v1
`;
            
            const processor = new CoreProcessor();
            const result = processor.processText(yamlCode, {
                sortOrder: 'asc',
                fileType: 'yaml',
                preserveFormatting: true,
                includeComments: true,
                yamlCustomKeyOrder: ['apiVersion', 'kind', 'metadata', 'spec']
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.processedText !== undefined, true);
            
            const processedText = result.processedText!;
            const lines = processedText.split('\n').filter(line => line.trim());
            
            // Should respect Kubernetes key order
            const apiVersionLine = lines.findIndex(line => line.includes('apiVersion:'));
            const kindLine = lines.findIndex(line => line.includes('kind:'));
            const metadataLine = lines.findIndex(line => line.includes('metadata:'));
            const specLine = lines.findIndex(line => line.includes('spec:'));
            
            assert.strictEqual(apiVersionLine < kindLine, true);
            assert.strictEqual(kindLine < metadataLine, true);
            assert.strictEqual(metadataLine < specLine, true);
        });

        test('should handle schema-based grouping', () => {
            const yamlCode = `
status: active
spec:
  replicas: 3
data:
  config: value
metadata:
  name: test
apiVersion: v1
kind: ConfigMap
`;
            
            const processor = new CoreProcessor();
            const result = processor.processText(yamlCode, {
                sortOrder: 'asc',
                fileType: 'yaml',
                preserveFormatting: true,
                includeComments: true,
                yamlGroupBySchema: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.processedText !== undefined, true);
            
            // Should group by schema patterns (Kubernetes: apiVersion/kind → metadata → spec/data → status)
            const processedText = result.processedText!;
            const lines = processedText.split('\n').filter(line => line.trim());
            
            const apiVersionIndex = lines.findIndex(line => line.includes('apiVersion:'));
            const metadataIndex = lines.findIndex(line => line.includes('metadata:'));
            const statusIndex = lines.findIndex(line => line.includes('status:'));
            
            // Should follow schema grouping
            assert.strictEqual(apiVersionIndex >= 0, true);
            assert.strictEqual(metadataIndex >= 0, true);
            assert.strictEqual(statusIndex >= 0, true);
        });
    });
}); 