# Upwork Extension

A Chrome extension that helps filter Upwork job listings by filtering out jobs from clients with low spending amounts.

## Features

- **Smart Job Filtering**: Automatically hides job cards from clients who have spent less than a specified amount
- **Reversible Filtering**: Hidden jobs can be restored by changing the minimum spend setting
- **Configurable Minimum Spend**: Set your preferred minimum client spend threshold through the popup UI
- **Real-time Updates**: Settings are applied immediately and persist across browser sessions
- **Seamless Integration**: Works on Upwork's "Most Recent" and "Best Match" job pages

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

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

## Settings

- **Minimum Client Spend**: The minimum amount a client must have spent on Upwork for their jobs to be shown
- Settings are saved to Chrome's sync storage and persist across browser sessions
- Changes are applied immediately without requiring a page refresh

## Development

### Prerequisites
- Node.js and npm/pnpm
- TypeScript

### Setup
```bash
# Install dependencies
pnpm install

# Build the extension
npm run build

# Watch for changes during development
npm run dev
```

### Project Structure
```
├── manifest.json          # Extension manifest
├── src/
│   ├── popup/
│   │   ├── index.html     # Popup UI
│   │   ├── popup.js       # Popup functionality
│   │   └── tailwind.js    # Tailwind CSS
│   ├── scripts/
│   │   ├── content.ts     # Content script (TypeScript)
│   │   └── content.js     # Compiled content script
│   └── assets/
│       └── favicon.ico    # Extension icon
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `storage` (for saving settings), `tabs` (for communication)
- **Content Scripts**: Automatically injected on Upwork job pages
- **Storage**: Uses Chrome's sync storage for cross-device settings persistence

## Contributing

Feel free to submit issues and enhancement requests!
