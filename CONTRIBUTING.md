# Contributing

Thanks for your interest in contributing! Please follow these guidelines to help us keep things consistent and easy to review.

## Getting Started
- Fork the repository and clone your fork
- Install dependencies: `pnpm install`
- Create a feature branch: `git checkout -b feat/your-feature`
- Build/Watch during development: `pnpm run dev`

## Commit Messages
- Use concise, descriptive messages (e.g., `feat: add filter toggle` or `fix: handle missing spend data`)

## Pull Requests
- Keep PRs focused and small when possible
- Include screenshots/GIFs for UI changes
- Ensure `pnpm run build:prod` succeeds locally
- Link related issues (e.g., `Closes #123`)

## Code Style
- Use TypeScript where applicable
- Prefer clear, explicit naming
- Handle edge cases and errors defensively

## Testing
- Manually test on Upwork pages: Most Recent and Best Match
- Verify settings persist across sessions and devices

## Release
- Maintainers tag releases. GitHub Actions builds `dist.zip` on tags.
