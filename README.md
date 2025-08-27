# Upwork Extension

A Chrome extension that helps filter Upwork job listings by filtering out jobs from clients with low spending amounts. Built with TypeScript for better maintainability and type safety.

## Features

- **Smart Job Filtering**: Automatically hides job cards from clients who have spent less than a specified amount
- **Reversible Filtering**: Hidden jobs can be restored by changing the minimum spend setting
- **Configurable Minimum Spend**: Set your preferred minimum client spend threshold through the popup UI
- **Real-time Updates**: Settings are applied immediately and persist across browser sessions
- **Seamless Integration**: Works on Upwork's "Most Recent" and "Best Match" job pages
- **TypeScript Support**: Built with TypeScript for better code quality and developer experience

## Installation

### For Users
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

### For Developers
```bash
# Clone the repository
git clone <repository-url>
cd upwork-extension

# Install dependencies
pnpm install

# Build the extension
pnpm run build

# Load the extension in Chrome using the dist folder
```

## Usage

1. **Set Minimum Spend**: Click the extension icon to open the popup
2. Enter your desired minimum client spend amount in dollars
3. Click "Save" to apply the settings
4. Navigate to Upwork job pages (Most Recent or Best Match)
5. The extension will automatically filter out jobs from clients who have spent less than your specified amount

## How It Works

The extension:
- Monitors Upwork job pages for new job listings
- Parses client spending information from job cards
- Filters out jobs where the client has spent less than your minimum threshold
- Updates in real-time as new jobs are loaded
- Uses Chrome's sync storage for cross-device settings persistence

## Settings

- **Minimum Client Spend**: The minimum amount a client must have spent on Upwork for their jobs to be shown
- Settings are saved to Chrome's sync storage and persist across browser sessions
- Changes are applied immediately without requiring a page refresh

## Development

### Prerequisites
- Node.js (v16 or higher)
- pnpm (recommended) or npm
- TypeScript knowledge

### Available Scripts

```bash
# Install dependencies
pnpm install

# Build the extension (TypeScript compilation)
pnpm run build

# Watch for changes during development
pnpm run watch

# Development mode (build + watch)
pnpm run dev

# Clean build artifacts
pnpm run clean

# Copy files to dist folder
pnpm run copy:dist

# Create production zip file
pnpm run zip:dist

# Full production build (clean + build + copy + zip)
pnpm run build:prod
```

### Project Structure
```
upwork-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── package.json               # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── pnpm-lock.yaml           # Dependency lock file
├── README.md                # This file
├── .gitignore               # Git ignore rules
├── src/                     # Source code
│   ├── popup/              # Extension popup UI
│   │   ├── index.html      # Popup HTML
│   │   ├── popup.js        # Popup JavaScript
│   │   └── tailwind.js     # Tailwind CSS styles
│   ├── scripts/            # Content scripts
│   │   ├── content.ts      # TypeScript source
│   │   ├── content.js      # Compiled JavaScript
│   │   └── content.js.map  # Source map
│   └── assets/             # Static assets
│       └── favicon.ico     # Extension icon
├── dist/                   # Build output (generated)
│   ├── manifest.json       # Copied manifest
│   └── src/               # Copied source files
└── dist.zip               # Production package (generated)
```

### Development Workflow

1. **Setup**: Run `pnpm install` to install dependencies
2. **Development**: Use `pnpm run dev` for development with hot reloading
3. **Build**: Use `pnpm run build` to compile TypeScript
4. **Production**: Use `pnpm run build:prod` to create a distributable package

## Technical Details

### Extension Configuration
- **Manifest Version**: 3 (latest Chrome extension manifest)
- **Permissions**: 
  - `storage` - For saving and syncing settings across devices
  - `tabs` - For communication between popup and content scripts
- **Content Scripts**: Automatically injected on Upwork job pages (`https://www.upwork.com/nx/find-work/*`)
- **Storage**: Uses Chrome's sync storage for cross-device settings persistence

### Technology Stack
- **TypeScript**: For type safety and better development experience
- **Chrome Extension APIs**: For browser integration
- **Tailwind CSS**: For styling the popup interface
- **pnpm**: For fast and efficient package management

### Build Process
1. TypeScript compilation (`content.ts` → `content.js`)
2. Source map generation for debugging
3. File copying to `dist/` directory
4. Optional ZIP packaging for distribution

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build and test the extension
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Test the extension on Upwork job pages
- Ensure settings persist correctly
- Maintain backward compatibility with existing users

## Troubleshooting

### Common Issues
- **Extension not loading**: Ensure you're loading the correct directory (use `dist/` for production builds)
- **Settings not saving**: Check that the extension has storage permissions
- **Jobs not filtering**: Verify you're on a supported Upwork page (`/nx/find-work/`)

### Debugging
- Use Chrome DevTools to inspect the popup
- Check the console for any JavaScript errors
- Verify content script injection on Upwork pages

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have feature requests, please open an issue on the repository.
