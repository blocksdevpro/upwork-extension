# Chrome Web Store Publishing Checklist

Use this checklist to prepare and submit the extension to the Chrome Web Store.

## 1) Prepare Assets
- 128x128 icon (PNG) — required
- 16x16 and 32x32 icons (PNG) for the toolbar (optional but recommended)
- Screenshots (at least one): 1280x800 or 640x400 PNG/JPG
- Promotional tile (optional)

Note: Replace current `.ico` icons with PNGs in `manifest.json` before submission.

## 2) Build Package
```bash
pnpm install
pnpm run build:prod
# Result: dist.zip
```

## 3) Developer Dashboard
- Create a developer account (one-time $5 fee)
- Go to `https://chrome.google.com/webstore/devconsole`
- Click "New Item" and upload `dist.zip`

## 4) Store Listing
- Title: Upwork Extensions
- Short description and detailed description
- Category: Productivity (recommended)
- Privacy policy URL: link to `PRIVACY.md` in GitHub
- Website/support URL: GitHub repository URL

## 5) Permissions & Data Use
- Permissions: `storage`, `tabs`, content script on `https://www.upwork.com/nx/find-work/*`
- Data disclosure: Select "No data is collected"

## 6) Submit for Review
- Confirm all assets and texts are complete
- Submit and monitor the review status

## 7) After Approval
- Add the Chrome Web Store link to `README.md`
- Tag a release on GitHub and update release notes
