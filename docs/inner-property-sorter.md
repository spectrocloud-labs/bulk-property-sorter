# Bulk Property Sorter Extension Documentation

## Table of Contents

- [Overview](#overview)
  - [Supported File Types](#supported-file-types)
- [Architecture Overview](#architecture-overview)
- [Data Flow Architecture](#data-flow-architecture)
- [Core Components](#core-components)
  - [1. Extension Entry Point (`extension.ts`)](#1-extension-entry-point-extensionts)
  - [2. File Processor (`fileProcessor.ts`)](#2-file-processor-fileprocessorts)
  - [3. Core Processor (`coreProcessor.ts`)](#3-core-processor-coreprocessorts)
  - [4. Language Sorters (`languageSorters.ts`)](#4-language-sorters-languagesortersts)
  - [5. TypeScript Parser (`parser.ts`)](#5-typescript-parser-parserts)
  - [6. CSS Parser (`cssParser.ts`)](#6-css-parser-cssparsersts)
  - [7. Go Parser (`goParser.ts`)](#7-go-parser-goparsersts)
  - [8. Property Sorter (`sorter.ts`)](#8-property-sorter-sorterts)
  - [9. Reconstructors](#9-reconstructors)
- [Data Structures](#data-structures)
  - [Core Types](#core-types)
- [Processing Pipeline](#processing-pipeline)
  - [Complete Processing Flow](#complete-processing-flow)
  - [Nested Object Processing](#nested-object-processing)
- [Configuration System](#configuration-system)
  - [Configuration Options](#configuration-options)
  - [Configuration Flow](#configuration-flow)
- [Command System](#command-system)
  - [Available Commands](#available-commands)
  - [Configuration Options Detail](#configuration-options-detail)
    - [showDescendingOption](#showdescendingoption)
- [Language Support](#language-support)
  - [TypeScript/JavaScript Support](#typescriptjavascript-support)
  - [CSS/SCSS/SASS/LESS Support](#cssscssassless-support)
  - [Go Language Support](#go-language-support)
- [Recent Improvements (Version 0.4.6)](#recent-improvements-version-046)

## Overview

The Bulk Property Sorter is a VS Code extension that provides intelligent property sorting for TypeScript/JavaScript interfaces, type aliases, object literals, CSS/SCSS/SASS/LESS stylesheets, and Go struct definitions. It preserves comments, handles nested objects and CSS rules, maintains code formatting, preserves original trailing punctuation styles (semicolons, commas, or none), and supports object spread syntax while sorting properties alphabetically or in reverse order.

### Supported File Types

- **TypeScript/JavaScript**: Interfaces, type aliases, object literals, class members
- **CSS**: CSS rules, media queries, keyframes, property declarations
- **SCSS**: Nested rules, parent selectors, mixins, variables
- **SASS**: Indented syntax support without braces and semicolons
- **LESS**: Variables, mixins, nested rules, property declarations
- **Go**: Struct definitions with field sorting and tag preservation, and much more

## Architecture Overview

```mermaid
graph TB
    subgraph "VS Code Extension"
        A[Extension Entry Point<br/>extension.ts] --> B[File Processor<br/>fileProcessor.ts]
        B --> C[Core Processor<br/>coreProcessor.ts]
        C --> D[Language Sorters<br/>languageSorters.ts]
    end
    
    subgraph "TypeScript Processing Pipeline"
        D --> E[TypeScript Parser<br/>parser.ts]
        E --> F[Property Sorter<br/>sorter.ts]
        F --> G[TypeScript Reconstructor<br/>reconstructor.ts]
    end
    
    subgraph "CSS Processing Pipeline"
        D --> H[CSS Parser<br/>cssParser.ts]
        H --> F
        F --> I[CSS Reconstructor<br/>cssReconstructor.ts]
    end
    
    subgraph "Go Processing Pipeline"
        D --> J[Go Parser<br/>goParser.ts]
        J --> F
        F --> K[Go Reconstructor<br/>goReconstructor.ts]
    end
    
    subgraph "Data Structures & Utilities"
        L[Types<br/>types.ts]
        M[Parser Utils<br/>parserUtils.ts]
        N[Formatting Utils<br/>formattingUtils.ts]
        O[File Pattern Filter<br/>filePatternFilter.ts]
    end
    
    E -.-> L
    H -.-> L
    J -.-> L
    F -.-> L
    G -.-> L
    I -.-> L
    K -.-> L
    
    E -.-> M
    H -.-> M
    J -.-> M
    
    G -.-> N
    I -.-> N
    K -.-> N
    
    B -.-> O
    
    subgraph "VS Code Integration"
        P[Commands]
        Q[Configuration]
        R[Context Menus]
        S[Keybindings]
    end
    
    A --> P
    A --> Q
    A --> R
    A --> S
    
    style A stroke:#e1f5fe
    style C stroke:#e8f5e8
    style D stroke:#fff3e0
    style F stroke:#f3e5f5
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant VSCode
    participant Extension
    participant FileProcessor
    participant CoreProcessor
    participant LanguageSorters
    participant Parser
    participant Sorter
    participant Reconstructor
    
    User->>VSCode: Trigger sort command
    VSCode->>Extension: Execute command
    Extension->>Extension: Get configuration
    Extension->>FileProcessor: Process document/selection
    FileProcessor->>CoreProcessor: Process text
    CoreProcessor->>LanguageSorters: Determine language processor
    LanguageSorters->>Parser: Parse code by language
    Parser->>Parser: Extract entities & properties
    Parser->>Sorter: Sort properties
    Sorter->>Sorter: Apply sorting algorithm
    Sorter->>Reconstructor: Reconstruct code
    Reconstructor->>CoreProcessor: Return processed text
    CoreProcessor->>FileProcessor: Return result
    FileProcessor->>Extension: Apply to editor
    Extension->>VSCode: Update document
    VSCode->>User: Show result
```

## Core Components

### 1. Extension Entry Point (`extension.ts`)

The main extension file that handles VS Code integration:

```mermaid
graph LR
    A[Extension Activation] --> B[Register Commands]
    B --> C[Sort Properties Ascending]
    B --> D[Sort Properties Descending]
    C --> E[Handle Sort Command]
    D --> E
    E --> F[Get Configuration]
    F --> G[Check Language Exclusions]
    G --> H[Process Document/Selection]
    H --> I[Apply Changes]
    I --> J[Show Status Message]
```

**Key Features:**
- Command registration for ascending/descending sort
- Configuration management with extensive options
- Language exclusion and file pattern filtering
- Editor integration and change application

### 2. File Processor (`fileProcessor.ts`)

Orchestrates the processing workflow with VS Code integration:

```mermaid
graph TB
    A[FileProcessor] --> B[Process Document]
    A --> C[Process Selection]
    A --> D[Apply to Editor]
    
    B --> E[CoreProcessor.processText]
    C --> E
    E --> F[Return ProcessingResult]
    F --> D
    
    D --> G[Edit Builder]
    G --> H[Replace Text]
    H --> I[Success/Failure]
```

**Responsibilities:**
- VS Code document handling
- Selection processing
- Editor change application
- Error handling and user feedback

### 3. Core Processor (`coreProcessor.ts`)

The main processing engine without VS Code dependencies:

```mermaid
graph LR
    A[Text Input] --> B[Language Detection]
    B --> C[Language Sorters]
    C --> D[Parse Result]
    D --> E[Property Sorter]
    E --> F[Sorted Entities]
    F --> G[Language Reconstructor]
    G --> H[Processed Text]
    
    style B stroke:#e8f5e8
    style E stroke:#fff3e0
    style G stroke:#f3e5f5
```

### 4. Language Sorters (`languageSorters.ts`)

Coordinates language-specific processing:

```mermaid
graph TB
    A[Language Sorters] --> B{File Type Detection}
    
    B -->|.ts,.tsx,.js,.jsx| C[TypeScript/JavaScript Processor]
    B -->|.css,.scss,.sass,.less| D[CSS Processor]
    B -->|.go| E[Go Processor]
    
    C --> F[TypeScript Parser]
    D --> G[CSS Parser]
    E --> H[Go Parser]
    
    F --> I[Common Sorter]
    G --> I
    H --> I
    
    I --> J[TypeScript Reconstructor]
    I --> K[CSS Reconstructor]
    I --> L[Go Reconstructor]
```

### 5. TypeScript Parser (`parser.ts`)

Parses TypeScript/JavaScript code and extracts sortable entities:

```mermaid
graph TB
    A[Source Code] --> B[TypeScript AST]
    B --> C{Node Type}
    
    C -->|Interface| D[Parse Interface]
    C -->|Variable Statement| E[Parse Object Literal]
    C -->|Type Alias| F[Parse Type Alias]
    
    D --> G[Extract Properties]
    E --> G
    F --> G
    
    G --> H[Extract Comments]
    H --> I[Handle Nested Objects]
    I --> J[Handle Spread Syntax]
    J --> K[Extract Trailing Punctuation]
    K --> L[ParsedEntity]
    
    subgraph "Property Extraction Features"
        M[Property Name]
        N[Property Type/Value]
        O[Comments]
        P[Optional Marker]
        Q[Nested Properties]
        R[Spread Properties]
        S[Trailing Punctuation]
    end
    
    G --> M
    G --> N
    H --> O
    G --> P
    I --> Q
    J --> R
    K --> S
```

#### Semicolon Preservation Feature

The TypeScript parser includes sophisticated trailing punctuation detection to preserve the original code style during sorting operations:

```mermaid
graph TB
    A[Property AST Node] --> B{Node Type}
    
    B -->|Interface/Type Property| C[Check Node Text]
    B -->|Object Property| D[Check After Node]
    
    C --> E[Extract Last Character]
    D --> F[Scan Following Characters]
    
    E --> G{Found Punctuation?}
    F --> G
    
    G -->|Semicolon| H[Store ';']
    G -->|Comma| I[Store ',']
    G -->|None| J[Store '']
    
    H --> K[Preserve in trailingPunctuation]
    I --> K
    J --> K
    
    K --> L[Use During Reconstruction]
    
    style C stroke:#e8f5e8
    style F stroke:#fff3e0
    style K stroke:#f3e5f5
```

### 6. CSS Parser (`cssParser.ts`)

Parses CSS and its variants with format-specific handling:

```mermaid
graph TB
    A[CSS Source Code] --> B{File Format}
    
    B -->|.css| C[Standard CSS Parsing]
    B -->|.scss,.less| D[Nested Rules Parsing]
    B -->|.sass| E[Indented Syntax Parsing]
    
    C --> F[Extract CSS Rules]
    D --> F
    E --> F
    
    F --> G[Parse Properties]
    G --> H[Handle Vendor Prefixes]
    H --> I[Process !important]
    I --> J[Associate Comments]
    J --> K[ParsedEntity]
```

### 7. Go Parser (`goParser.ts`)

Parses Go source code and extracts struct definitions:

```mermaid
graph TB
    A[Go Source Code] --> B[Struct Detection]
    B --> C[Field Extraction]
    C --> D{Field Type}
    
    D -->|Named Field| E[Extract Field Name & Type]
    D -->|Embedded Field| F[Extract Type Name]
    
    E --> G[Parse Struct Tags]
    F --> G
    G --> H[Associate Comments]
    H --> I[Handle Export Status]
    I --> J[ParsedEntity]
```

### 8. Property Sorter (`sorter.ts`)

Implements the sorting algorithm with various options:

```mermaid
graph TB
    A[Properties Array] --> B{Sort Options}
    
    B --> C[Case Sensitivity]
    B --> D[Sort Order]
    B --> E[Nested Object Sorting]
    B --> F[Spread Syntax Handling]
    
    C --> G[Normalize Names]
    D --> H[Apply Sort Direction]
    E --> I[Recursive Sorting]
    F --> J[Preserve Spread Position]
    
    G --> K{Property Type}
    K -->|Numeric| L[Numeric Comparison]
    K -->|String| M[Alphabetic Comparison]
    K -->|Spread| N[Skip Sorting]
    
    L --> O[Sorted Properties]
    M --> O
    N --> P[Maintain Position]
    
    I --> Q[Sort Nested Properties]
    Q --> O
    P --> O
    
    style J stroke:#e8f5e8
    style N stroke:#fff3e0
    style P stroke:#f3e5f5
```

### 9. Reconstructors

Language-specific reconstructors rebuild code from sorted entities:

- **TypeScript Reconstructor** (`reconstructor.ts`): Handles interfaces, objects, and type aliases
- **CSS Reconstructor** (`cssReconstructor.ts`): Handles CSS rules and properties with format awareness
- **Go Reconstructor** (`goReconstructor.ts`): Handles Go struct definitions with tag preservation

## Data Structures

### Core Types

```mermaid
classDiagram
    class ParsedEntity {
        +string type
        +string name
        +ParsedProperty[] properties
        +number startLine
        +number endLine
        +PropertyComment[] leadingComments
        +boolean isExported
        +string originalText
    }
    
    class ParsedProperty {
        +string name
        +string value
        +PropertyComment[] comments
        +boolean optional
        +number line
        +string fullText
        +string trailingPunctuation
        +ParsedProperty[] nestedProperties
        +boolean hasNestedObject
        +boolean isSpread
    }
    
    class PropertyComment {
        +string text
        +string type
        +string raw
        +number line
    }
    
    class ParseResult {
        +ParsedEntity[] entities
        +string[] errors
        +string sourceCode
    }
    
    ParsedEntity --> ParsedProperty
    ParsedProperty --> PropertyComment
    ParsedProperty --> ParsedProperty : nested
    ParseResult --> ParsedEntity
```

## Processing Pipeline

### Complete Processing Flow

```mermaid
flowchart TD
    A[User Input] --> B{Command Type}
    B -->|Sort Ascending| C[sortProperties]
    B -->|Sort Descending| D[sortPropertiesDescending]
    
    C --> E[handleSortCommand]
    D --> E
    
    E --> F[Get Active Editor]
    F --> G{Editor Available?}
    G -->|No| H[Show Error]
    G -->|Yes| I[Get Configuration]
    
    I --> J[Check Language Exclusions]
    J --> K{Language Excluded?}
    K -->|Yes| L[Show Info Message]
    K -->|No| M[Check File Patterns]
    
    M --> N{File Included?}
    N -->|No| L
    N -->|Yes| O[Determine Processing Options]
    
    O --> P{Selection Empty?}
    P -->|Yes| Q[Process Entire Document]
    P -->|No| R[Process Selection]
    
    Q --> S[FileProcessor.processDocument]
    R --> T[FileProcessor.processSelection]
    
    S --> U[CoreProcessor.processText]
    T --> U
    
    U --> V[LanguageSorters.processText]
    V --> W{Language Type}
    
    W -->|TypeScript/JS| X[TypeScript Parser]
    W -->|CSS Variants| Y[CSS Parser]
    W -->|Go| Z[Go Parser]
    
    X --> AA[PropertySorter.sortProperties]
    Y --> AA
    Z --> AA
    
    AA --> BB{Language Type}
    BB -->|TypeScript/JS| CC[TypeScript Reconstructor]
    BB -->|CSS Variants| DD[CSS Reconstructor]
    BB -->|Go| EE[Go Reconstructor]
    
    CC --> FF[Return ProcessingResult]
    DD --> FF
    EE --> FF
    
    FF --> GG{Success?}
    GG -->|No| HH[Show Error Message]
    GG -->|Yes| II[Apply Changes to Editor]
    
    II --> JJ[Show Success Message]
    
    style E stroke:#e1f5fe
    style V stroke:#f3e5f5
    style AA stroke:#fff3e0
    style FF stroke:#e8f5e8
```

### Nested Object Processing

```mermaid
graph TB
    A[Property with Object Value] --> B[Detect Nested Object]
    B --> C{Has Nested Properties?}
    
    C -->|Yes| D[Extract Nested Properties]
    C -->|No| E[Process as Simple Property]
    
    D --> F[Check for Spread Syntax]
    F --> G[Parse Nested Object]
    G --> H[Apply Sorting Recursively]
    H --> I[Preserve Spread Positions]
    I --> J[Reconstruct Nested Object]
    J --> K[Embed in Parent Property]
    
    E --> L[Standard Property Processing]
    K --> M[Continue with Parent]
    L --> M
    
    style D stroke:#e8f5e8
    style H stroke:#fff3e0
    style I stroke:#f3e5f5
    style J stroke:#f3e5f5
```

## Configuration System

### Configuration Options

```mermaid
graph LR
    A[VS Code Settings] --> B[bulk-property-sorter.*]
    
    B --> C[General Options]
    B --> D[Sorting Options]
    B --> E[TypeScript Options]
    B --> F[CSS/SCSS/SASS/LESS Options]
    B --> G[Go Options]
    B --> H[Formatting Options]
    
    C --> C1[excludedLanguages]
    C --> C2[sortNestedObjects]
    C --> C3[showDescendingOption]
    
    D --> D1[caseSensitive]
    D --> D2[naturalSort]
    D --> D3[customOrder]
    D --> D4[groupByType]
    D --> D5[prioritizeRequired]
    
    E --> E1[sortMethods]
    E --> E2[separateInterfacesAndClasses]
    E --> E3[sortImportsExports]
    E --> E4[groupImportsByType]
    E --> E5[preserveMethodChaining]
    E --> E6[sortConstructorParameters]
    E --> E7[prioritizePublicMembers]
    
    F --> F1[groupVendorPrefixes]
    F --> F2[sortByImportance]
    F --> F3[groupByCategory]
    F --> F4[preserveMediaQueryOrder]
    F --> F5[sortNestedRules]
    F --> F6[groupVariables]
    F --> F7[sortKeyframes]
    F --> F8[preserveVendorPrefixOrder]
    F --> F9[sortAtRules]
    
    G --> G1[sortStructFields]
    G --> G2[groupEmbeddedFields]
    G --> G3[sortMethodReceivers]
    G --> G4[preserveStructTags]
    G --> G5[groupByVisibility]
    G --> G6[sortInterfaceMethods]
    G --> G7[preserveMethodSets]
    
    H --> H1[indentationType]
    H --> H2[indentationSize]
    H --> H3[lineEnding]
    H --> H4[preserveComments]
    H --> H5[commentStyle]
    H --> H6[propertySpacing]
    H --> H7[trailingCommas]
    H --> H8[blankLinesBetweenGroups]
    
    style C stroke:#e1f5fe
    style D stroke:#e8f5e8
    style E stroke:#fff3e0
    style F stroke:#f3e5f5
    style G stroke:#e0f2f1
    style H stroke:#fce4ec
```

#### General Options

- **`excludedLanguages`** (`string[]`, default: `[]`): Array of language IDs where the extension should be disabled
- **`includedFilePatterns`** (`string[]`, default: `["**/*"]`): File patterns to include for sorting (glob patterns)
- **`excludedFilePatterns`** (`string[]`, default: `[]`): File patterns to exclude from sorting (glob patterns)
- **`sortNestedObjects`** (`boolean`, default: `true`): Enable/disable recursive sorting of nested object properties
- **`showDescendingOption`** (`boolean`, default: `false`): Show the "Sort Properties Descending" option in the context menu

#### Sorting Options

- **`sorting.caseSensitive`** (`boolean`, default: `true`): Enable case-sensitive property sorting
- **`sorting.naturalSort`** (`boolean`, default: `false`): Enable natural sort order for properties containing numbers
- **`sorting.customOrder`** (`string[]`, default: `[]`): Custom property order list - properties matching these names will be sorted first
- **`sorting.groupByType`** (`boolean`, default: `false`): Group properties by their type before sorting alphabetically
- **`sorting.prioritizeRequired`** (`boolean`, default: `false`): Sort required properties before optional ones

#### TypeScript-Specific Options

- **`typescript.sortMethods`** (`string`, default: `"alphabetical"`): Method sorting preference for TypeScript classes
  - `"alphabetical"`: Sort by method name
  - `"visibility"`: Group by public/private/protected
  - `"static-first"`: Put static methods first
  - `"lifecycle"`: Follow component lifecycle order
- **`typescript.separateInterfacesAndClasses`** (`boolean`, default: `false`): Handle interfaces and classes with different sorting rules
- **`typescript.sortImportsExports`** (`boolean`, default: `false`): Sort import and export statements alphabetically
- **`typescript.groupImportsByType`** (`boolean`, default: `true`): Group imports by type: external libraries, internal modules, relative imports
- **`typescript.preserveMethodChaining`** (`boolean`, default: `true`): Preserve method chaining order in object properties
- **`typescript.sortConstructorParameters`** (`boolean`, default: `false`): Sort constructor parameters alphabetically
- **`typescript.prioritizePublicMembers`** (`boolean`, default: `false`): Sort public class members before private/protected

#### CSS/SCSS/SASS/LESS Options

- **`css.groupVendorPrefixes`** (`boolean`, default: `true`): Group vendor-prefixed properties together
- **`css.sortByImportance`** (`boolean`, default: `false`): Sort properties with `!important` declarations first
- **`css.groupByCategory`** (`boolean`, default: `false`): Group CSS properties by category before sorting alphabetically
- **`css.preserveMediaQueryOrder`** (`boolean`, default: `true`): Preserve the original order of media queries
- **`css.sortNestedRules`** (`boolean`, default: `true`): Sort nested rules in SCSS/SASS/LESS files
- **`css.groupVariables`** (`boolean`, default: `true`): Group CSS custom properties at the beginning of rule blocks
- **`css.sortKeyframes`** (`boolean`, default: `false`): Sort keyframe percentages in `@keyframes` rules
- **`css.preserveVendorPrefixOrder`** (`boolean`, default: `true`): Preserve the standard order of vendor prefixes
- **`css.sortAtRules`** (`boolean`, default: `false`): Sort `@import`, `@use`, `@forward` statements alphabetically

#### Go-Specific Options

- **`go.sortStructFields`** (`string`, default: `"alphabetical"`): Struct field sorting preference
  - `"alphabetical"`: Sort by field name
  - `"by-type"`: Group by field type
  - `"by-size"`: Order by memory size
  - `"preserve-tags"`: Maintain fields with struct tags together
- **`go.groupEmbeddedFields`** (`boolean`, default: `true`): Group embedded struct fields at the beginning
- **`go.sortMethodReceivers`** (`boolean`, default: `false`): Sort methods by receiver type name
- **`go.preserveStructTags`** (`boolean`, default: `true`): Preserve struct tag formatting and order
- **`go.groupByVisibility`** (`boolean`, default: `false`): Group exported fields before unexported fields
- **`go.sortInterfaceMethods`** (`boolean`, default: `true`): Sort method signatures alphabetically within interfaces
- **`go.preserveMethodSets`** (`boolean`, default: `false`): Keep related methods together based on functionality

#### Formatting Options

- **`formatting.indentationType`** (`string`, default: `"auto"`): Indentation type to use
  - `"auto"`: Detect from editor settings
  - `"spaces"`: Use spaces
  - `"tabs"`: Use tabs
- **`formatting.indentationSize`** (`number`, default: `4`): Number of spaces for indentation when using spaces
- **`formatting.lineEnding`** (`string`, default: `"auto"`): Line ending style
  - `"auto"`: Detect from file or use platform default
  - `"lf"`: Unix-style (`\n`)
  - `"crlf"`: Windows-style (`\r\n`)
- **`formatting.preserveComments`** (`boolean`, default: `true`): Whether to preserve comments in the output
- **`formatting.commentStyle`** (`string`, default: `"preserve"`): Comment formatting style
  - `"preserve"`: Keep original style
  - `"single-line"`: Convert to `//`
  - `"multi-line"`: Convert to `/* */`
- **`formatting.propertySpacing`** (`string`, default: `"compact"`): Property spacing style
  - `"compact"`: Use minimal spacing
  - `"spaced"`: Add space around colons
  - `"aligned"`: Align property values
- **`formatting.trailingCommas`** (`string`, default: `"preserve"`): Trailing comma handling
  - `"preserve"`: Keep original
  - `"add"`: Ensure trailing commas
  - `"remove"`: Remove trailing commas
- **`formatting.blankLinesBetweenGroups`** (`boolean`, default: `false`): Add blank lines between property groups

## Command System

### Available Commands

```mermaid
graph TB
    A[Commands] --> B[bulk-property-sorter.sortProperties]
    A --> C[bulk-property-sorter.sortPropertiesDescending]
    
    B --> D["Keybinding: Ctrl+["]
    C --> E["Keybinding: Ctrl+Shift+["]
    
    B --> F[Context Menu: Sort Properties]
    C --> G[Context Menu: Sort Properties Descending]
    
    G --> H{showDescendingOption}
    H -->|true| I[Show in Menu]
    H -->|false| J[Hidden from Menu]
    
    D --> K[Ascending Sort]
    E --> L[Descending Sort]
    F --> K
    I --> L
    
    style B stroke:#e1f5fe
    style C stroke:#e1f5fe
    style H stroke:#fff3e0
```
