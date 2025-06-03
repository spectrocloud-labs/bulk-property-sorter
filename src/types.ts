/**
 * Represents a comment associated with a property
 * 
 * @example
 * ```typescript
 * // Single-line comment example
 * const singleLineComment: PropertyComment = {
 *   text: "This is a property description",
 *   type: "single",
 *   raw: "// This is a property description",
 *   line: 5
 * };
 * 
 * // Multi-line comment example
 * const multiLineComment: PropertyComment = {
 *   text: "This is a longer\nproperty description",
 *   type: "multi", 
 *   raw: "/* This is a longer\n   property description * \/",
 *   line: 10
 * };
 * ```
 */
export interface PropertyComment {
    /** The comment text (without comment markers) */
    text: string;
    /** Whether this is a single-line (//) or multi-line comment */
    type: 'single' | 'multi';
    /** The original comment text including markers */
    raw: string;
    /** Line number where the comment starts */
    line: number;
}

/**
 * Represents a property within an interface, object, or CSS rule
 */
export interface ParsedProperty {
    /** Property name */
    name: string;
    /** Property type, value, or CSS property value */
    value: string;
    /** Leading comments associated with this property (comments that appear before the property) */
    comments: PropertyComment[];
    /** Trailing comments associated with this property (comments that appear after the property on the same line) */
    trailingComments?: PropertyComment[];
    /** Whether the property is optional (has ?) - TypeScript only */
    optional: boolean;
    /** Original line number in source */
    line: number;
    /** Full property text including type/value */
    fullText: string;
    /** Trailing punctuation from original source (';', ',', or '') */
    trailingPunctuation: string;
    /** Nested object properties if this property contains an object literal */
    nestedProperties?: ParsedProperty[];
    /** Whether this property contains a nested object that should be sorted */
    hasNestedObject?: boolean;
    /** Whether this is a spread property (...obj) */
    isSpread?: boolean;
    /** CSS-specific: Whether this property has !important declaration */
    important?: boolean;
    /** CSS-specific: Vendor prefix if present (e.g., '-webkit-', '-moz-') */
    vendorPrefix?: string;
    /** Go-specific: Struct tags for field metadata (e.g., 'json:"name" xml:"name"') */
    structTags?: string;
    /** Go-specific: Whether this is an embedded field (anonymous field) */
    isEmbedded?: boolean;
}

/**
 * Represents a parsed entity (interface, object, CSS rule, etc.)
 */
export interface ParsedEntity {
    /** Type of entity */
    type: 'interface' | 'object' | 'type' | 'css-rule' | 'css-keyframe' | 'css-media' | 'css-at-rule' | 'struct' | 'json-object' | 'json-array' | 'yaml-object' | 'yaml-array';
    /** Name of the interface/variable/selector */
    name: string;
    /** Properties within this entity */
    properties: ParsedProperty[];
    /** Start line in source code */
    startLine: number;
    /** End line in source code */
    endLine: number;
    /** Leading comments for the entire entity */
    leadingComments: PropertyComment[];
    /** Export modifier if present - TypeScript only */
    isExported: boolean;
    /** Original full text of the entity */
    originalText?: string;
    /** CSS-specific: Selector specificity for sorting rules */
    specificity?: number;
    /** CSS-specific: Media query conditions */
    mediaQuery?: string;
    /** CSS-specific: Keyframe percentage or keyword */
    keyframeSelector?: string;
}

/**
 * Result of parsing a file
 */
export interface ParseResult {
    /** All parsed entities found in the file */
    entities: ParsedEntity[];
    /** Any parsing errors encountered */
    errors: string[];
    /** Original source code */
    sourceCode: string;
    /** File type that was parsed */
    fileType: 'typescript' | 'javascript' | 'css' | 'scss' | 'sass' | 'less' | 'go' | 'json' | 'jsonc' | 'yaml' | 'yml';
}

/**
 * Options for the parser
 */
export interface ParserOptions {
    /** Whether to preserve formatting */
    preserveFormatting: boolean;
    /** Whether to include comments */
    includeComments: boolean;
    /** Sort order - if not specified, no sorting is applied */
    sortOrder?: 'asc' | 'desc';
    /** Whether to recursively sort nested object properties */
    sortNestedObjects?: boolean;
    /** File type being parsed */
    fileType?: 'typescript' | 'javascript' | 'css' | 'scss' | 'sass' | 'less' | 'go' | 'json' | 'jsonc' | 'yaml' | 'yml';
    /** CSS-specific: Whether to sort by property importance (!important first/last) */
    sortByImportance?: boolean;
    /** CSS-specific: Whether to group vendor-prefixed properties */
    groupVendorPrefixes?: boolean;
    /** CSS-specific: Whether to sort keyframe percentages in @keyframes rules */
    sortKeyframes?: boolean;
    /** CSS-specific: Whether to group properties by category before sorting alphabetically */
    groupByCategory?: boolean;
    /** JSON-specific: Whether to sort object keys alphabetically */
    sortObjectKeys?: boolean;
    /** JSON-specific: Whether to preserve array order instead of sorting elements */
    preserveArrayOrder?: boolean;
    /** JSON-specific: Custom key order list for JSON objects */
    customKeyOrder?: string[];
    /** JSON-specific: Group properties by common schema patterns */
    groupBySchema?: boolean;
    /** YAML-specific: Whether to preserve YAML anchors (&anchor) and aliases (*alias) during sorting */
    preserveAnchorsAndAliases?: boolean;
    /** YAML-specific: Whether to preserve YAML document separators (---) and maintain multi-document structure */
    preserveDocumentSeparators?: boolean;
    /** YAML-specific: Whether to preserve YAML string folding styles (|, >, |-, >-) and quoting styles */
    preserveStringStyles?: boolean;
    /** YAML-specific: YAML indentation style ('auto', '2-spaces', '4-spaces') */
    indentationStyle?: 'auto' | '2-spaces' | '4-spaces';
    /** YAML-specific: Whether to handle complex keys (nested objects/arrays as keys) by preserving their structure during sorting */
    handleComplexKeys?: boolean;
} 