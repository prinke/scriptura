# Scriptura

![License](https://img.shields.io/github/license/prinketaru/scriptura)
![GitHub stars](https://img.shields.io/github/stars/prinketaru/scriptura?style=social)
![GitHub issues](https://img.shields.io/github/issues/prinketaru/scriptura)
[![Docs](https://img.shields.io/badge/docs-scriptura.prinke.dev-blue)](https://scriptura.prinke.dev)

Scriptura is an open-source Discord bot for reading, searching, and listening to Bible scripture directly in Discord using simple slash commands.

🌐 Website & Docs: https://scriptura.prinke.dev  
➕ [Add to Discord](https://discord.com/oauth2/authorize?client_id=1291760421115527251)  

---

## Features

- Look up verses by **reference** or search by **phrase**
- 6 English translations, with ESV as the default
- Listen to the **ESV audio Bible** in voice channels
- A daily verse, plus **automatic daily posts** in a channel of your choice
- A settings panel for your translation and how verses are displayed
- Works as:
  - A server-installed bot
  - A Discord user app (usable anywhere user apps are allowed)
- Privacy-focused by design
- Fully open source

---

## Commands

| Command | What it does |
|---|---|
| `/verse search query:<text> [translation]` | Get a passage or search for a phrase |
| `/verse daily` | Today's daily verse |
| `/audio play passage:<reference>` | Play the ESV audio Bible in your voice channel |
| `/audio stop` | Stop playback and leave the voice channel |
| `/daily-channel set / view / disable` | Post the daily verse in a channel every day (server admins) |
| `/preferences` | Open your settings panel |
| `/ping` | Check the bot's response time |

### `/verse`

Retrieve scripture by **reference or search phrase**. If the query looks like a reference you get that passage. Otherwise Scriptura searches for it as a phrase.

**Examples**
- `/verse search query:John 3:16`
- `/verse search query:Psalm 23 translation:KJV`
- `/verse search query:Romans 8:1-11 translation:NLT`
- `/verse search query:love is patient`
- `/verse daily`

If no translation is chosen, Scriptura uses your saved preference, or **ESV**.

### `/audio`

Listen to the **ESV audio Bible** in a voice channel. Scriptura joins the voice channel you're in, plays the passage, and leaves when it finishes or when everyone else has left.

- `/audio play passage:John 3`
- `/audio play passage:Psalm 23`
- `/audio stop`

The "Now playing" message has **Pause/Resume** and **Stop** buttons, usable by anyone in the same voice channel. Audio works in servers only.

### `/daily-channel`

Have Scriptura post the daily verse in a channel automatically, every day at a time you choose. Requires the **Manage Server** permission by default (server owners can change this under *Server Settings → Integrations*).

- `/daily-channel set channel:#daily-verse time:8am timezone:America/New_York`
- `/daily-channel set channel:#announcements time:07:30 timezone:Europe/London translation:KJV`
- `/daily-channel view`
- `/daily-channel disable`

Time accepts formats like `08:00`, `8am`, or `7:30 PM`. The timezone option autocompletes as you type a city and defaults to UTC.

### `/preferences`

Opens a settings panel (visible only to you) to choose your default translation and toggle footnotes, verse numbers, section headings, and line-by-line formatting. Changes save instantly.

---

## Bible Translations

ESV (default), NKJV, KJV, NASB, NLT, and ASV.

Scripture is provided by:
- **ESV API** by Crossway (ESV text and audio)
- **Bible Brain** by Faith Comes By Hearing (all other translations)

---

## Privacy

Scriptura is built with privacy as a core principle.

- No message logging
- No verse or search history
- No analytics, tracking, or advertising
- Never listens to or records voice channels
- Stores only your preferences (if you change them) and a server's daily-post schedule (if an admin sets one up)

See the [privacy policy](https://scriptura.prinke.dev/privacy) for details.

---

## Self-Hosting

You can run your own instance of Scriptura.

**Requirements:** Node.js 22.12+, a Discord bot token, an [ESV API](https://api.esv.org/) key, a [Bible Brain](https://www.faithcomesbyhearing.com/bible-brain/developer-documentation) key, a MongoDB database, and FFmpeg (installed automatically by `ffmpeg-static`).

```bash
git clone https://github.com/prinketaru/scriptura.git
cd scriptura
npm install
cp .env.example .env    # fill in your values
npm run deploy          # register slash commands
npm start               # or: npm run dev
```

```env
TOKEN=your_bot_token
CLIENT_ID=your_client_id
ESV_API_KEY=your_esv_api_key
BIBLE_BRAIN_KEY=your_bible_brain_key
MONGO_URI=mongodb+srv://user:pass@host/scriptura
```

---

## Documentation

| File | What's in it |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Development setup, code style, adding commands and translations |
| [`docs/site-brief.md`](docs/site-brief.md) | Complete reference for the documentation website: every command, privacy, FAQ, self-hosting |
| [`docs/site-changes-2026-10.md`](docs/site-changes-2026-10.md) | What changed in the October 2026 update, for updating the website |

---

## License

Scriptura is released under the GPL-3.0 open-source license. See the [LICENSE](LICENSE) file for details.

---

## Links

- Website & Docs: https://scriptura.prinke.dev
- Add to Discord: https://discord.com/oauth2/authorize?client_id=1291760421115527251
- Issues & Contributions: https://github.com/prinketaru/scriptura/issues

---

If you find Scriptura useful, contributions and feedback are always welcome.
