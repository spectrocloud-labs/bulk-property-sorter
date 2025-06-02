# Bulk Property Sorter

A VS Code extension that provides intelligent property sorting for TypeScript, JavaScript, CSS, SCSS, SASS, LESS, JSON, and Go files while preserving comments, formatting, and code structure.

## Features

- **Multi-language Support**: Sort properties in TypeScript/JavaScript interfaces, object literals, CSS rules, JSON objects, and Go structs
- **Smart Comment Preservation**: Maintains inline and block comments with their associated properties
- **Recursive Nested Sorting**: Sort properties in nested object declarations and CSS rules (configurable)
- **Spread Syntax Support**: Preserve object spread syntax (`...obj`) properties during sorting
- **Semicolon Preservation**: Maintains original trailing punctuation style (semicolons, commas, or none) during sorting
- **Vendor Prefix Handling**: Intelligent grouping of CSS vendor-prefixed properties
- **Go Struct Tag Preservation**: Maintains complex Go struct tags exactly as written
- **Format-aware Processing**: Respects different file formats (CSS, SCSS, SASS indented syntax, LESS)
- **Configurable Sorting Options**: Extensive customization for different languages and use cases

## Installation

1. Open VS Code, Cursor, or any other editor that supports VS Code extensions
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Bulk Property Sorter"
4. Click Install
5. ???
6. Profit!

## Usage

1. Open a supported file type (TypeScript, JavaScript, CSS, SCSS, SASS, LESS, or Go)
2. Either:
   - Select specific text to sort just that selection
   - Place cursor anywhere to sort the entire file
3. Use one of these methods:
   - Press `Ctrl+[` (or `Cmd+[` on Mac) for ascending sort
   - Press `Ctrl+Shift+[` (or `Cmd+Shift+[` on Mac) for descending sort
   - Right-click and select "Sort Properties" from the context menu
   - Open Command Palette (`Ctrl+Shift+P`) and search for "Sort Properties"

## Requirements

- VS Code, Cursor, or any other editor that supports VS Code extensions
- Files must be in a supported language (TypeScript, JavaScript, CSS, SCSS, SASS, LESS, Go)

## Detailed Architecture Overview

See [docs/bulk-property-sorter.md](docs/bulk-property-sorter.md) for detailed architectural diagrams and information.

## Examples

### TypeScript/JavaScript

**Basic Interface Sorting:**
```typescript
// Before
interface User {
    name: string;
    age: number;
    email: string;
}

// After
interface User {
    age: number;
    email: string;
    name: string;
}
```

**Comment Preservation:**
```typescript
// Before
interface User {
    // User's full name
    name: string;
    age: number;
    /**
     * Contact email address
     */
    email: string;
}

// After
interface User {
    age: number;
    /**
     * Contact email address
     */
    email: string;
    // User's full name
    name: string;
}
```

**Semicolon Preservation** - maintains original trailing punctuation style:
```typescript
// Before - mixed punctuation styles
interface Config {
    theme: string;
    version: number
    enabled: boolean;
}

// After - original punctuation preserved during sorting
interface Config {
    enabled: boolean;
    theme: string;
    version: number
}
```

**Object Literals with Spread Syntax:**
```typescript
// Before
const config = {
    fontWeight: 'bold',
    ...baseStyles,
    fontSize: 16,
    color: 'red',
}

// After - spread syntax preserved
const config = {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    ...baseStyles,  // Spread syntax maintained in position
}
```

**Nested Object Sorting:**
```typescript
// Before
const theme = {
    colors: {
        warning: '#ff9800',
        primary: '#2196f3',
        error: '#f44336',
    },
    spacing: {
        large: 24,
        small: 8,
        medium: 16,
    },
}

// After (with nested sorting enabled)
const theme = {
    colors: {
        error: '#f44336',
        primary: '#2196f3',
        warning: '#ff9800',
    },
    spacing: {
        large: 24,
        medium: 16,
        small: 8,
    },
}
```

### CSS/SCSS/SASS/LESS

**CSS Property Sorting with Vendor Prefixes:**
```css
/* Before */
.button {
    z-index: 10;
    background: blue;
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    transform: rotate(45deg);
    color: white !important;
    border: none;
}

/* After */
.button {
    background: blue;
    border: none;
    color: white !important;
    -moz-transform: rotate(45deg);
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg);
    z-index: 10;
}
```

**SCSS Nested Rules:**
```scss
// Before
.card {
    z-index: 1;
    background: white;
    border: 1px solid gray;
    
    &:hover {
        background: lightgray;
        cursor: pointer;
    }
    
    .title {
        font-weight: bold;
        color: black;
        font-size: 18px;
    }
}

// After
.card {
    background: white;
    border: 1px solid gray;
    z-index: 1;
    
    &:hover {
        background: lightgray;
        cursor: pointer;
    }
    
    .title {
        color: black;
        font-size: 18px;
        font-weight: bold;
    }
}
```

**SASS Indented Syntax:**
```sass
// Before
.button
  z-index: 10
  background: blue
  color: white
  border: none

// After
.button
  background: blue
  border: none
  color: white
  z-index: 10
```

### Go

**Go Struct Sorting with Tag Preservation:**
```go
// Before
type User struct {
    // User's email address
    Email string `json:"email" validate:"required,email"`
    // User's unique identifier
    ID int `json:"id" db:"user_id"`
    // User's full name
    Name string `json:"name" validate:"required"`
    // User's age
    Age int `json:"age" validate:"min=0,max=150"`
}

// After
type User struct {
    // User's age
    Age int `json:"age" validate:"min=0,max=150"`
    // User's email address
    Email string `json:"email" validate:"required,email"`
    // User's unique identifier
    ID int `json:"id" db:"user_id"`
    // User's full name
    Name string `json:"name" validate:"required"`
}
```

**Embedded Fields and Complex Tags:**
```go
// Before
type Order struct {
    ID string `json:"id" db:"order_id,primary_key"`
    User
    Total int `json:"total" validate:"min=0"`
    Address
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// After
type Order struct {
    Address
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    ID string `json:"id" db:"order_id,primary_key"`
    Total int `json:"total" validate:"min=0"`
    User
}
```

### JSON

**Package.json Sorting:**
```json
// Before
{
    "scripts": {
        "test": "npm run compile && node ./out/test/runTest.js",
        "compile": "tsc -p ./"
    },
    "name": "bulk-property-sorter",
    "version": "0.5.1",
    "description": "Sort properties in TypeScript interfaces, objects, and more",
    "main": "./out/extension.js",
    "engines": {
        "vscode": "^1.83.0"
    }
}

// After
{
    "description": "Sort properties in TypeScript interfaces, objects, and more",
    "engines": {
        "vscode": "^1.83.0"
    },
    "main": "./out/extension.js",
    "name": "bulk-property-sorter",
    "scripts": {
        "compile": "tsc -p ./",
        "test": "npm run compile && node ./out/test/runTest.js"
    },
    "version": "0.5.1"
}
```

**Configuration Files with Custom Key Order:**
```json
// Before
{
    "dependencies": {
        "react": "^18.0.0",
        "typescript": "^4.9.0"
    },
    "name": "my-app",
    "version": "1.0.0",
    "description": "A sample application"
}

// After (with custom key order: name, version, description)
{
    "name": "my-app",
    "version": "1.0.0",
    "description": "A sample application",
    "dependencies": {
        "react": "^18.0.0",
        "typescript": "^4.9.0"
    }
}
```

**API Response JSON:**
```json
// Before
{
    "meta": {
        "version": "v1",
        "timestamp": "2023-12-01T10:00:00Z"
    },
    "data": {
        "users": [
            {
                "profile": {
                    "lastName": "Doe",
                    "firstName": "John"
                },
                "email": "john@example.com",
                "id": 1,
                "username": "john_doe"
            }
        ]
    },
    "status": "success"
}

// After (with nested sorting enabled)
{
    "data": {
        "users": [
            {
                "email": "john@example.com",
                "id": 1,
                "profile": {
                    "firstName": "John",
                    "lastName": "Doe"
                },
                "username": "john_doe"
            }
        ]
    },
    "meta": {
        "timestamp": "2023-12-01T10:00:00Z",
        "version": "v1"
    },
    "status": "success"
}
```

**JSONC (JSON with Comments) Support:**
```jsonc
// Before
{
    // Application configuration
    "database": {
        "port": 5432,
        "host": "localhost" // Default database host
    },
    "cache": {
        "redis": {
            "url": "redis://localhost:6379"
        }
    },
    /* 
     * Application metadata
     */
    "name": "my-api",
    "version": "1.0.0"
}

// After (comments preserved with their properties)
{
    /* 
     * Application metadata
     */
    "cache": {
        "redis": {
            "url": "redis://localhost:6379"
        }
    },
    // Application configuration
    "database": {
        "host": "localhost", // Default database host
        "port": 5432
    },
    "name": "my-api",
    "version": "1.0.0"
}
```

**Array Order Preservation:**
```json
// Before (arrays preserve order by default)
{
    "steps": [
        "compile",
        "test",
        "deploy"
    ],
    "environments": ["dev", "staging", "prod"]
}

// After (array elements maintain their original order)
{
    "environments": ["dev", "staging", "prod"],
    "steps": [
        "compile",
        "test", 
        "deploy"
    ]
}
```

## Configuration

## Supported File Types

- **TypeScript**: `.ts`, `.tsx` - Interfaces, type aliases, object literals, class members
- **JavaScript**: `.js`, `.jsx` - Object literals, class members
- **CSS**: `.css` - CSS rules, properties, media queries
- **SCSS**: `.scss` - Nested rules, variables, mixins
- **SASS**: `.sass` - Indented syntax support
- **LESS**: `.less` - Variables, mixins, nested rules
- **JSON**: `.json`, `.jsonc` - Object properties, configuration files, API responses
- **Go**: `.go` - Struct definitions with field sorting

## Commands

- **Sort Properties** (`bulk-property-sorter.sortProperties`) 
  - **Shortcut**: `Ctrl+[` / `Cmd+[`
  - Sort properties in ascending order (A-Z)

- **Sort Properties Descending** (`bulk-property-sorter.sortPropertiesDescending`)
  - **Shortcut**: `Ctrl+Shift+[` / `Cmd+Shift+[`
  - Sort properties in descending order (Z-A)

Both commands work on the entire file or just the selected text if you have a selection.

### Context Menu

By default, only the "Sort Properties" command appears in the right-click context menu for a cleaner interface. To show the "Sort Properties Descending" option in the context menu as well, enable the `bulk-property-sorter.showDescendingOption` setting in your VS Code preferences.

**Note:** Keyboard shortcuts for both commands remain available regardless of the context menu visibility setting.

## Language-Specific Features

### TypeScript/JavaScript
- Interface and type alias sorting
- Object literal property sorting
- Optional property handling (`property?: type`)
- Method signature sorting in interfaces
- Nested object recursive sorting
- Export detection and preservation
- Spread syntax preservation

### CSS/SCSS/SASS/LESS
- Property sorting with vendor prefix intelligence
- Media query and keyframe handling
- Nested rule sorting (SCSS/SASS/LESS)
- Comment preservation with property association
- `!important` declaration handling
- CSS variable grouping
- Format-specific reconstruction (indented SASS, etc.)

### Go
- Struct field sorting with multiple strategies
- Struct tag preservation (complex tags with multiple key-value pairs)
- Embedded/anonymous field support
- Export status recognition (capitalized vs lowercase)
- Comment association and preservation
- Multiple struct processing in single files

### JSON
- Object property sorting with alphabetical ordering
- Array order preservation (configurable)
- Nested object recursive sorting
- JSONC comment preservation (single-line and multi-line)
- Custom key ordering for specific JSON schemas
- Schema-based property grouping (metadata, required, optional)
- Package.json and configuration file optimization
- API response and data structure sorting
- Support for both standard JSON and JSONC formats

## Known Issues

- Complex nested structures with mixed content types may require manual review
- Some edge cases with malformed syntax may not be handled gracefully

## Contributing

This extension is maintained by Spectro Cloud. Contributions, issues, and feature requests are welcome at the [GitHub repository](https://github.com/spectrocloud/bulk-property-sorter).

## License

This extension is licensed under the MIT License. See the repository for full license details.
