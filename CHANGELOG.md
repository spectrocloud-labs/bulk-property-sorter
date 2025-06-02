# Changelog

## [0.6.0]

### Added

- **JSON and JSONC Support**: Full support for sorting properties in JSON and JSONC (JSON with Comments) files
- **JSON Object Property Sorting**: Alphabetical sorting of object keys in JSON files
- **Array Order Preservation**: Configurable option to preserve or sort array elements (preserves by default)
- **Nested JSON Object Sorting**: Recursive sorting support for deeply nested JSON structures
- **JSONC Comment Preservation**: Maintains both single-line (`//`) and multi-line (`/* */`) comments in JSONC files
- **Custom Key Ordering**: Allows custom property order for specific JSON schemas (e.g., package.json)
- **Schema-Based Grouping**: Groups JSON properties by common patterns (metadata, required, optional)

### JSON-Specific Configuration Options

- `bulk-property-sorter.json.sortObjectKeys` (default: `true`) - Enable/disable object key sorting
- `bulk-property-sorter.json.preserveArrayOrder` (default: `true`) - Preserve array element order
- `bulk-property-sorter.json.sortNestedObjects` (default: `true`) - Enable recursive nested object sorting
- `bulk-property-sorter.json.customKeyOrder` (default: `[]`) - Custom key order for specific schemas
- `bulk-property-sorter.json.groupBySchema` (default: `false`) - Group properties by schema patterns
- `bulk-property-sorter.json.preserveComments` (default: `true`) - Preserve comments in JSONC files

### Supported JSON File Types

- **Standard JSON** (`.json`) - Configuration files, API responses, data files
- **JSONC** (`.jsonc`) - JSON with Comments for configuration files like VS Code settings
- **Common Formats**: package.json, tsconfig.json, VS Code settings, API responses, configuration files

### Examples

**Package.json Optimization:**
```json
// Before
{
    "scripts": { "test": "jest", "build": "tsc" },
    "name": "my-package", 
    "version": "1.0.0",
    "main": "./dist/index.js"
}

// After
{
    "main": "./dist/index.js",
    "name": "my-package",
    "scripts": { "build": "tsc", "test": "jest" },
    "version": "1.0.0"
}
```

**JSONC Comment Preservation:**
```jsonc
// Before
{
    "cache": { "enabled": true },
    // Database configuration
    "database": { "host": "localhost" }
}

// After
{
    "cache": { "enabled": true },
    // Database configuration  
    "database": { "host": "localhost" }
}
```

### Technical Implementation

- **JSON Parser**: New dedicated JSON/JSONC parser with comment extraction and preservation
- **JSON Property Sorter**: Specialized sorter with custom key ordering and schema-based grouping
- **JSON Reconstructor**: Advanced reconstructor that rebuilds JSON while preserving formatting and comments
- **File Type Detection**: Automatic detection of JSON vs JSONC based on file extension and content
- **Comprehensive Testing**: 160+ new tests covering all JSON parsing, sorting, and reconstruction scenarios

## [0.5.1]

### Fixed

- **Package Size Optimization**: Reduced the size of the extension package by excluding unnecessary files and dependencies

## [0.5.0]

### Fixed

- **Spread Syntax Preservation**: Fixed critical issue where object spread syntax (`...obj`) was being removed during property sorting operations
- **Recursive Sorting Enhancement**: Resolved issue where recursive sorting was not working correctly for deeply nested object properties and complex object structures
- **Semicolon Preservation**: Fixed inconsistent handling of TypeScript interface and type alias properties not preserving their original trailing semicolon style during sorting
- **Mixed Punctuation Support**: Enhanced parser to correctly handle properties with mixed trailing punctuation (semicolons, commas, or none) within the same entity
- **Parser Enhancement**: Improved trailing punctuation extraction for interface and type alias properties to correctly detect semicolons included in the AST node text

### Enhanced

- **Comment Duplication Prevention**: Enhanced CSS comment handling to prevent duplicate comments during property sorting
- **Spread Property Positioning**: Spread properties now maintain their original relative positions and are excluded from alphabetical sorting
- **Cross-language Compatibility**: Improved processing pipeline to handle edge cases across TypeScript, JavaScript, CSS variants, and Go files

### Technical Improvements

- Enhanced `extractTrailingPunctuation` method to handle different AST node types appropriately
- Updated `reconstructProperty` method to use `trailingPunctuation` field instead of hardcoding semicolons
- Added comprehensive test suite for semicolon preservation scenarios across multiple language contexts
- Improved spread syntax detection and preservation in nested object literals
- Enhanced comment tracking system to prevent duplication in CSS processing

### Examples

**Before (Incorrect Behavior):**
```typescript
// Original interface with mixed punctuation
interface User {
    name: string;
    age: number
    email: string;
}

// After sorting - semicolons were incorrectly added/removed
interface User {
    age: number;  // Semicolon added incorrectly
    email: string;
    name: string;
}
```

**After (Fixed Behavior):**
```typescript
// Original interface with mixed punctuation
interface User {
    name: string;
    age: number
    email: string;
}

// After sorting - original punctuation preserved
interface User {
    age: number    // No semicolon preserved
    email: string;
    name: string;
}
```

**Spread Syntax Preservation:**
```typescript
// Before - spread syntax was lost
const config = {
    fontWeight: 'bold',
    ...baseStyles,
    fontSize: 16,
    color: 'red',
}

// Now correctly preserved
const config = {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    ...baseStyles,  // Spread syntax maintained
}
```

This release ensures that the extension respects the original code style and doesn't introduce unwanted formatting changes during property sorting operations.

## [0.4.4]

### Fixed
- **Object Spread Syntax Support**: Fixed issue where object spread properties (`...obj`) were being removed during property sorting
- **Spread Property Preservation**: Spread properties now maintain their original relative positions and are not sorted alphabetically
- **Nested Object Spreads**: Added support for spread syntax in nested object literals
- **Function Call Object Spreads**: Fixed spread syntax handling in object literals passed to function calls

### Added
- **Comprehensive Spread Tests**: Added extensive test suite covering various spread syntax scenarios
- **Spread Property Parsing**: Enhanced TypeScript parser to properly handle `SpreadAssignment` AST nodes
- **Spread Property Reconstruction**: Updated reconstructor to properly output spread properties with correct syntax

## [0.4.3]

## Bug Fixes

### CSS Comment Duplication Fix

- **Fixed CSS Comment Duplication**: Resolved issue where CSS comments were being duplicated during property sorting
- **Improved Comment Association**: Enhanced logic for associating comments with their corresponding CSS properties and rules
- **Comment Tracking**: Added tracking system to prevent comments from being assigned to multiple properties
- **Precise Comment Handling**: Improved distinction between inline comments and standalone comments for better preservation

### Technical Changes

- Added `usedComments` Set to track comments that have already been assigned to properties
- Enhanced `getPropertyComments()` method to prevent duplicate comment associations
- Improved `getLeadingComments()` method with better entity-comment relationship detection
- Added more precise logic for determining which comments belong to which CSS rules and properties
- Enhanced comment parsing to handle both inline and standalone comments correctly

### Testing

- Added comprehensive test suite for CSS comment duplication scenarios
- Tests cover standalone comments, inline comments, and mixed comment types
- Verification of comment preservation during full reconstruction process

---

# [0.4.0]

## Go Language Support

### Major Features

- **Go Struct Sorting**: Full support for sorting Go struct fields in `.go` files
- **Struct Tag Preservation**: Maintains Go struct tags exactly as written (e.g., `json:"field_name" validate:"required"`)
- **Comment Preservation**: Preserves both single-line (`//`) and multi-line (`/* */`) comments with their associated fields
- **Embedded Field Support**: Proper handling of anonymous/embedded fields in Go structs
- **Export Status Detection**: Recognizes exported (capitalized) vs unexported (lowercase) field names
- **Multiple Struct Support**: Processes multiple struct definitions within a single Go file

### Go-Specific Features

- **Struct Tag Handling**: Preserves complex struct tags with multiple key-value pairs
- **Field Type Recognition**: Supports all Go field types including slices, maps, custom types, and built-in types
- **Embedded Fields**: Correctly sorts anonymous fields alongside named fields
- **Comment Association**: Maintains proper comment-to-field relationships during sorting
- **Format Preservation**: Maintains original Go code formatting and indentation

### Technical Implementation

- **Go Parser**: New dedicated Go parser with regex-based struct parsing for accurate Go syntax handling
- **Go Reconstructor**: Specialized reconstructor that rebuilds Go structs while preserving all metadata
- **Modular Architecture**: Extends existing parser utilities for consistent behavior across all language parsers
- **Comprehensive Testing**: 211+ tests including 8 new Go-specific integration tests

### Supported Go Constructs

- Struct definitions (`type StructName struct { ... }`)
- Named fields with types (`FieldName FieldType`)
- Struct tags with backticks (`` `json:"name" validate:"required"` ``)
- Embedded/anonymous fields (`EmbeddedType`)
- Single-line comments (`// comment`)
- Multi-line comments (`/* comment */`)
- Exported and unexported structs and fields
- Empty structs (`struct{}`)

### Configuration

- All existing configuration options apply to Go files
- `bulk-property-sorter.excludedLanguages` can include "go" to disable Go processing
- `bulk-property-sorter.sortNestedObjects` affects nested struct handling

---

# [0.3.2]

## Bug Fixes

### Critical Extension Activation Fix

- **Fixed Extension Activation Failure**: Resolved "Cannot find module 'typescript'" error that prevented the extension from loading
- **Dependency Bundling**: Added TypeScript as a runtime dependency and included it in the extension package
- **Package Configuration**: Updated `.vscodeignore` to properly bundle the TypeScript module with the extension
- **Improved Reliability**: Extension now activates correctly in all VS Code environments without requiring separate TypeScript installation

### Technical Changes

- Moved `typescript` from `devDependencies` to `dependencies` in package.json
- Modified `.vscodeignore` to include `node_modules/typescript/**` in the extension package
- Increased package size to ~7.3MB to include necessary TypeScript compiler API
- All existing functionality remains unchanged - this is purely a packaging fix

---

# [0.3.0]

## CSS/SCSS/SASS/LESS Support

### Major Features

- **CSS Property Sorting**: Full support for sorting CSS properties in `.css`, `.scss`, `.sass`, and `.less` files
- **Vendor Prefix Grouping**: Intelligent grouping of vendor-prefixed properties (e.g., `-webkit-`, `-moz-`, `-ms-`, `-o-`)
- **!important Handling**: Optional sorting of properties with `!important` declarations first or last
- **Nested Rules Support**: Proper handling of SCSS/SASS nested selectors and media queries
- **SASS Indented Syntax**: Native support for SASS indented syntax without braces and semicolons
- **Comment Preservation**: Maintains CSS comments with their associated properties during sorting

### CSS-Specific Features

- **Multi-format Support**: Works seamlessly with CSS, SCSS, SASS (indented), and LESS files
- **Smart Property Detection**: Recognizes CSS properties, vendor prefixes, and importance declarations
- **Format Preservation**: Maintains original indentation, braces, and semicolons based on file type
- **Error Handling**: Graceful handling of malformed CSS with fallback to original content

### Configuration

- `bulk-property-sorter.css.groupVendorPrefixes` - Group vendor-prefixed properties together (default: true)
- `bulk-property-sorter.css.sortByImportance` - Sort properties with !important declarations first (default: false)

### Technical Improvements

- **CSS Parser**: New dedicated CSS parser with custom parsing logic for accurate CSS processing
- **CSS Reconstructor**: Specialized reconstructor that preserves CSS formatting and syntax
- **File Type Detection**: Automatic detection of CSS file types based on file extension
- **Test Coverage**: Comprehensive test suite with 210+ tests covering all CSS functionality

### Supported CSS Constructs

- CSS rules and selectors (`.class`, `#id`, `element`, etc.)
- SCSS nested rules and parent selectors (`&:hover`, `&.active`)
- CSS media queries (`@media`, `@supports`)
- CSS keyframes (`@keyframes`)
- Vendor-prefixed properties (`-webkit-`, `-moz-`, `-ms-`, `-o-`)
- CSS variables and custom properties
- CSS comments (single-line and multi-line)

---

# [0.2.0]

## Menu Visibility Control

### Features

- **Configurable Menu Options**: Added `bulk-property-sorter.showDescendingOption` setting to control visibility of the "Sort Properties Descending" context menu item
- **Cleaner Default Experience**: By default, only "Sort Properties" appears in the right-click menu for a simpler interface
- **Optional Advanced Features**: Users can enable the descending sort option through VS Code settings when needed

### Configuration

- `bulk-property-sorter.showDescendingOption` - Boolean setting to show/hide the "Sort Properties Descending" context menu item (default: false)

### Breaking Changes

- The "Sort Properties Descending" context menu item is now hidden by default and must be explicitly enabled in settings

---

# [0.1.0]

## Initial Release

### Features

- **Property Sorting**: Sort properties in TypeScript interfaces, object literals, and type aliases
- **Dual Sort Orders**: Support for both ascending (A-Z) and descending (Z-A) sorting
- **Smart Selection**: Process entire documents or just selected text
- **Comment Preservation**: Maintain inline and block comments with their associated properties
- **Nested Object Support**: Recursively sort properties in nested object structures
- **Format Preservation**: Maintain original code formatting and indentation style
- **Export Detection**: Properly handle exported interfaces and objects
- **Language Filtering**: Configurable exclusion of specific file types

### Commands

- `bulk-property-sorter.sortProperties` - Sort properties in ascending order (A-Z)
- `bulk-property-sorter.sortPropertiesDescending` - Sort properties in descending order (Z-A)

### Configuration

- `bulk-property-sorter.excludedLanguages` - Array of language IDs to exclude from processing
- `bulk-property-sorter.sortNestedObjects` - Enable/disable recursive sorting of nested objects

### Supported Constructs

- Interface declarations (`interface User { ... }`)
- Object literal assignments (`const config = { ... }`)
- Function call objects (`createStyle({ ... })`)
- Type alias declarations with object types
- Optional properties (`property?: type`)
- Method signatures in interfaces

### Technical Features

- Comprehensive error handling with user-friendly messages
- TypeScript AST-based parsing for accuracy
- Configurable indentation detection (spaces/tabs)
- Robust comment association and preservation
- Memory-efficient processing for large files
