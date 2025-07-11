# Spectro Tab Tools

A VS Code extension that provides 

## Features

## Installation

1. Open VS Code, Cursor, or any other editor that supports VS Code extensions
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Spectro Tab Tools"
4. Click Install
5. ???
6. Profit!

## Usage

1. Open a supported file type (TypeScript, JavaScript, CSS, SCSS, SASS, LESS, JSON, YAML, or Go)
2. Either:
   - Select specific text to sort just that selection
   - Place cursor anywhere to sort the entire file
3. Use one of these methods:
   - Press `Ctrl+[` (or `Cmd+[` on Mac) for ascending sort
   - Press `Ctrl+Shift+[` (or `Cmd+Shift+[` on Mac) for descending sort
   - Right-click and select "Sort Properties" from the context menu (only appears for supported file types)
   - Open Command Palette (`Ctrl+Shift+P`) and search for "Sort Properties"

## Requirements

- VS Code, Cursor, or any other editor that supports VS Code extensions
- Files must be in a supported language (TypeScript, JavaScript, CSS, SCSS, SASS, LESS, JSON, YAML, Go)

## Detailed Architecture Overview

See [docs/spectro-tab-tools.md](docs/spectro-tab-tools.md) for detailed architectural diagrams and information.

## Examples

TODO

## Configuration

TODO

## Commands

- **Sort Properties** (`spectro-tab-tools.sortProperties`) 
  - **Shortcut**: `Ctrl+[` / `Cmd+[`
  - Sort properties in ascending order (A-Z)

- **Sort Properties Descending** (`spectro-tab-tools.sortPropertiesDescending`)
  - **Shortcut**: `Ctrl+Shift+[` / `Cmd+Shift+[`
  - Sort properties in descending order (Z-A)

Both commands work on the entire file or just the selected text if you have a selection.

### Context Menu

## Known Issues

## Contributing

This extension is maintained by Spectro Cloud. Contributions, issues, and feature requests are welcome at the [GitHub repository](https://github.com/spectrocloud/spectro-tab-tools).

## License

This extension is licensed under the MIT License. See the repository for full license details.
