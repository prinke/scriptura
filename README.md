# Scriptura

![License](https://img.shields.io/github/license/prinketaru/scriptura)
![GitHub stars](https://img.shields.io/github/stars/prinketaru/scriptura?style=social)
![GitHub issues](https://img.shields.io/github/issues/prinketaru/scriptura)
[![Docs](https://img.shields.io/badge/docs-scriptura.prinke.dev-blue)](https://scriptura.prinke.dev)

Scriptura is an open-source Discord bot that allows users to retrieve Bible scripture directly in Discord using simple slash commands.

🌐 Website & Docs: https://scriptura.prinke.dev  
➕ [Add to Discord](https://discord.com/oauth2/authorize?client_id=1291760421115527251)  

---

## Features

- Retrieve Bible verses instantly in Discord
- Search scripture by **reference or phrase**
- Flexible verse reference parsing
- Multiple Bible translations supported
- Daily verse command
- Works as:
  - A server-installed bot
  - A Discord user app (usable anywhere user apps are allowed)
- Privacy-focused by design
- Fully open source

---

## Commands

### `/verse`

Retrieve scripture by **reference or search phrase**.

This command supports:
- Exact verse references
- Passage ranges
- Keyword and phrase-based searches

**Usage**
- `/verse <reference or phrase> <translation?>`

**Reference Examples**
- `/verse John 3:16`
- `/verse Psalm 23 NIV`
- `/verse Romans 8:1–11 NLT`

**Phrase Search Examples**
- `/verse for God so loved the world`
- `/verse love is patient love is kind`
- `/verse armor of God ESV`

If no translation is specified, Scriptura defaults to **ESV**.

---

### `/daily-verse`

Get the daily verse.

**Usage**
- `/daily-verse <translation?>`

**Examples**
- `/daily-verse`
- `/daily-verse CSB`

The daily verse is the same for all users on a given day, but translations may vary.

---

## Bible Translations

Scriptura supports multiple Bible translations and defaults to **ESV (English Standard Version)**.

Scripture text is retrieved using third-party APIs:
- **ESV.org API**
- **Bible Brain**

Users may optionally save a preferred translation. This is the only user data Scriptura stores.

---

## Privacy

Scriptura is built with privacy as a core principle.

- No message logging
- No verse history storage
- No analytics or tracking
- No advertising
- Only optional stored data: preferred Bible translation

See the full Privacy Policy for details.

---

## Open Source

Scriptura is fully open source.

You are encouraged to:
- Review the code
- Open issues
- Submit pull requests
- Improve documentation
- Fork and self-host

---

## Self-Hosting Scriptura

You can run your own instance of Scriptura.

### Requirements

- Node.js (version specified in the repository)
- A Discord application and bot token
- API access to:
  - ESV.org (API key required)
  - Bible Brain (API key required)

---

### Setup Steps

1. Clone the repository
2. Install dependencies
3. Create a Discord application and bot
4. Configure environment variables
5. Register slash commands
6. Start the bot

Example environment variables:

`
DISCORD_TOKEN=your_discord_bot_token
ESV_API_KEY=your_esv_api_key
BIBLE_BRAIN_KEY=your_bible_brain_key
`

Refer to the repository documentation for exact setup instructions and command registration steps.

---

## License

Scriptura is released under GPL-3.0 open-source license. See the [LICENSE](https://github.com/prinketaru/scriptura/blob/master/LICENSE) file for details.

---

## Links

- Website & Docs: https://scriptura.prinke.dev
- Add to Discord: https://discord.com/oauth2/authorize?client_id=1291760421115527251
- Issues & Contributions: https://github.com/prinketaru/scriptura/issues

---

If you find Scriptura useful, contributions and feedback are always welcome.
