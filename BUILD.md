# Build Instructions

This document explains how to build and develop the web-daterangepicker component.

## Quick Start

### Option 1: Using Makefile (Linux/Mac/WSL/Git Bash)

```bash
# Install dependencies
make setup

# Start development server (watches for changes)
make dev

# Build for production
make build

# Create npm package
make package

# Publish (dry-run)
make publish-dry

# Publish to npm
make publish

# See all available commands
make help
```

### Option 2: Using npm scripts directly

```bash
# Install dependencies
npm install

# Start development server (watches for changes)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Create npm package
npm run package

# Publish (dry-run)
npm run publish:dry

# Publish to npm
npm publish

# Clean build artifacts
npm run clean
```

## Development Workflow

### 1. Initial Setup

```bash
make setup
# or
npm install
```

This installs all dependencies including TypeScript, Vite, Sass, and Floating UI.

### 2. Development

```bash
make dev
# or
npm run dev
```

This starts the Vite development server with:
- Hot Module Replacement (HMR)
- Fast refresh on file changes
- Available at http://localhost:5173

Open the demo page to test your changes in real-time.

### 3. Building

```bash
make build
# or
npm run build
```

This:
1. Compiles TypeScript to JavaScript
2. Bundles the code with Vite
3. Processes SCSS to CSS
4. Creates two output formats:
   - `dist/web-daterangepicker.js` (ES module)
   - `dist/web-daterangepicker.umd.js` (UMD format)
5. Generates TypeScript declarations (`dist/index.d.ts`)

### 4. Testing Locally

Create a package and test it in another project:

```bash
# Create package tarball
make package

# In another project, install it
npm install /path/to/web-daterangepicker-0.1.0.tgz
```

### 5. Publishing

Before publishing, update the version in `package.json`:

```json
{
  "version": "0.1.0"  // Change this
}
```

Then:

```bash
# Dry-run to see what would be published
make publish-dry

# Actually publish (requires npm login)
make publish
```

## Project Structure

```
web-daterangepicker/
├── src/
│   ├── index.ts              # Entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── date-picker.ts        # Core date picker class
│   ├── web-component.ts      # Web component wrapper
│   └── scss/
│       └── _date-picker.scss # Styles with CSS variables
├── index.html                # Demo page
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── Makefile                  # Build automation (Unix)
└── README.md                 # Documentation
```

## Build Output

After running `make build`, the `dist/` folder contains:

```
dist/
├── web-daterangepicker.js      # ES module (modern bundlers)
├── web-daterangepicker.umd.js  # UMD format (legacy/CDN)
└── index.d.ts                # TypeScript declarations
```

## Troubleshooting

### Make command not found (Windows)

Run `make` from Git Bash (it ships with Git for Windows), or use npm scripts:
```bash
npm run dev
```

### TypeScript errors

Make sure you've run `make setup` or `npm install` first.

### Port already in use

If port 5173 is in use, Vite will automatically try the next available port. Check the console output for the actual URL.

### Build fails

1. Clean the dist folder: `make clean-dist`
2. Delete node_modules: `make clean`
3. Reinstall: `make setup`
4. Try building again: `make build`

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: make setup
      - run: make build
      - run: make package
```

## Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Breaking changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes

Update version before publishing:
```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

Then:
```bash
make publish
```
