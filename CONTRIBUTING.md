# Contributing to Scriptura

Thank you for contributing to Scriptura! This guide will help you get started.

## Code of Conduct

Please be respectful and constructive in all interactions.

## Development Setup

Requirements: **Node.js 22.12+**, a MongoDB database, and FFmpeg (normally installed automatically by `ffmpeg-static`).

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Register slash commands: `npm run deploy`
5. Start the bot: `npm run dev` (auto-reloads on changes) or `npm start`

### Environment Variables

| Variable | Purpose |
|---|---|
| `TOKEN` | Discord bot token from https://discord.com/developers/applications |
| `CLIENT_ID` | Discord application ID |
| `ESV_API_KEY` | ESV API key from https://api.esv.org/ (text and audio) |
| `BIBLE_BRAIN_KEY` | Bible Brain key from https://www.faithcomesbyhearing.com/bible-brain/developer-documentation (non-ESV translations) |
| `MONGO_URI` | MongoDB connection string, including the database name |
| `GUILD_ID` | Optional. Clears leftover server-only commands in this server after a global deploy |

## Code Style

- Tabs for indentation, single quotes, semicolons
- JSDoc comments on functions (`@param`, `@returns`) and a module comment at the top of each file
- Run `npm run lint` before committing

## Coding Standards

### Error Handling
- Wrap API and database calls in `try`/`catch` and log errors with context
- Show users friendly errors with `errorReply()` from `helpers/ui.js`. Errors are ephemeral (visible only to the user)

### Testing
- Test every changed command in Discord before opening a PR
- Test with more than one translation (ESV uses the ESV API; the others use Bible Brain)
- Check error paths, pagination, and buttons

## Adding New Features

### Adding a Command

1. Create `commands/<category>/<name>.js`
2. Export `data` (a `SlashCommandBuilder`) and `execute(interaction)`. Optionally export `autocomplete(interaction)` for options with autocomplete
3. Run `npm run deploy` to register it. Commands are loaded automatically

### Adding a Translation

1. Find the translation's text fileset IDs in Bible Brain
2. In `helpers/translations.js`, add them to `BIBLE_BRAIN_BIBLES`, add an entry to `translationChoices`, and add its full name to `TRANSLATION_NAMES`
3. Run `npm run deploy` and test lookups and searches

## Project Structure

```
scriptura/
├── commands/
│   ├── audio/          # /audio (ESV audio in voice channels)
│   ├── utility/        # /preferences, /daily-channel, /ping
│   └── verses/         # /verse
├── helpers/            # API clients, storage, embeds, voice, scheduler, time zones
├── docs/               # Documentation site brief and change notes
├── daily_verses.json   # Daily verse list
├── deploy-commands.js  # Registers slash commands
└── index.js            # Bot entry point
```

See [`docs/site-brief.md`](docs/site-brief.md) §10 for a description of each helper file.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and run `npm run lint`
4. Commit with clear messages
5. Push to your fork and open a pull request with a description of the change

## Getting Help

- Open an issue for bugs or feature requests: https://github.com/prinketaru/scriptura/issues
- Check existing issues first, and include reproduction steps

## License

By contributing, you agree that your contributions will be licensed under the project's GPL-3.0 license.
