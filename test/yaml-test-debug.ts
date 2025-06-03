import { CoreProcessor } from '../src/coreProcessor';
import { YAMLParser } from '../src/yamlParser';
import { ParsedEntity } from '../src/types';

console.log('=== YAML Debug Testing ===\n');

const processor = new CoreProcessor();

// Test 1: Single-document YAML (check output formatting)
const singleDocYaml = `name: my-app
version: 1.0.0
dependencies:
  react: ^18.0.0
  babel: ^7.0.0
ports:
  - 3000
  - 8080`;

console.log('Test 1: Single-document YAML');
console.log('Input:');
console.log(singleDocYaml);
console.log('\n--- Processing ---');

const singleResult = processor.processText(singleDocYaml, {
    fileType: 'yaml',
    sortOrder: 'asc',
    preserveFormatting: true,
    includeComments: true
});

console.log('Success:', singleResult.success);
console.log('Errors:', singleResult.errors);
console.log('Warnings:', singleResult.warnings);
console.log('Output:');
console.log(singleResult.processedText || 'NO OUTPUT');
console.log('\n=====================================\n');

// Test 2: Multi-document YAML (check parsing error)
const multiDocYaml = `---
# First document
name: service-a
version: 1.0.0
config:
  database: postgres
  cache: redis
---
# Second document  
name: service-b
version: 2.0.0
config:
  database: mysql
  cache: memcached`;

console.log('Test 2: Multi-document YAML');
console.log('Input:');
console.log(multiDocYaml);
console.log('\n--- Processing ---');

const multiResult = processor.processText(multiDocYaml, {
    fileType: 'yaml',
    sortOrder: 'asc',
    preserveFormatting: true,
    includeComments: true,
    preserveDocumentSeparators: true
});

console.log('Success:', multiResult.success);
console.log('Errors:', multiResult.errors);
console.log('Warnings:', multiResult.warnings);

// Debug: Let's see what entities were parsed
console.log('\n--- DEBUG: Parsed Entities ---');
const yamlParser = new YAMLParser();
const parseResult = yamlParser.parse(multiDocYaml);
console.log('Number of entities:', parseResult.entities.length);

// Debug: Show all extracted comments first
console.log('\n--- DEBUG: All Comments ---');
const allComments = yamlParser['extractComments'](multiDocYaml);
console.log('Total comments extracted:', allComments.length);
allComments.forEach((comment, index) => {
    console.log(`Comment ${index}:`, {
        text: comment.text,
        line: comment.line,
        raw: comment.raw
    });
});

parseResult.entities.forEach((entity: ParsedEntity, index: number) => {
    console.log(`Entity ${index}:`, {
        name: entity.name,
        type: entity.type,
        properties: entity.properties.length,
        leadingComments: entity.leadingComments.length,
        startLine: entity.startLine,
        endLine: entity.endLine
    });
    
    if (entity.leadingComments.length > 0) {
        console.log('  Leading comments:');
        entity.leadingComments.forEach((comment, commentIndex) => {
            console.log(`    ${commentIndex}: "${comment.text}" (line ${comment.line})`);
        });
    }
});

console.log('Output:');
console.log(multiResult.processedText || 'NO OUTPUT');
console.log('\n=====================================\n');

// Test 3: Simple YAML to see basic reconstruction
const simpleYaml = `zebra: z-value
apple: a-value
banana: b-value`;

console.log('Test 3: Simple YAML properties');
console.log('Input:');
console.log(simpleYaml);
console.log('\n--- Processing ---');

const simpleResult = processor.processText(simpleYaml, {
    fileType: 'yaml',
    sortOrder: 'asc',
    preserveFormatting: true,
    includeComments: true
});

console.log('Success:', simpleResult.success);
console.log('Errors:', simpleResult.errors);
console.log('Warnings:', simpleResult.warnings);
console.log('Output:');
console.log(simpleResult.processedText || 'NO OUTPUT'); 