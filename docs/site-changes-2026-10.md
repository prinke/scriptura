# Scriptura — Site Changes (October 2026)

> **Who this is for:** whoever updates **https://scriptura.prinke.dev**.
> `site-brief.md` (in this folder) already includes all of these changes and is the full source of truth. Use this file to see what's different from the version of the site that's currently live.
> This file lists every user-facing change since the previous version of the brief. It follows the brief's section numbers (§1–§11), so each change maps onto a page. Where the live site is now wrong, this file gives the replacement text. Where something is new, it gives the full content.
>
> **Summary of what changed**
> 1. **New `/audio` command:** listen to the ESV audio Bible in a voice channel.
> 2. **New `/daily-channel` command:** server admins can have the daily verse posted automatically in a channel at a set time and time zone.
> 3. **`/preferences` redesigned:** one command that opens an interactive settings panel with buttons and a dropdown. It replaces the `set` / `view` / `reset` subcommands.
> 4. **All replies restyled:** cleaner verse embeds, search results, error messages and `/ping`.
> 5. **Verse numbers now work in ESV** (before, they were always shown).

---

## Quick checklist of statements on the live site that are now wrong

| Section | Old statement | Now |
|---|---|---|
| §2 Site structure | No audio or server-setup pages | Add `/audio` and `/daily-channel` (see §2 below) |
| §3 Getting started | "All commands work in servers, DMs with the bot, and private/group DMs." | `/audio` and `/daily-channel` work **in servers only**, and only when Scriptura is added to the server |
| §3 Getting started | "Save your favorite translation: `/preferences set translation:NKJV`" | "Save your favorite translation: run `/preferences` and pick one from the dropdown" |
| §4 Commands | "There are three commands" | There are **five**: `/verse`, `/audio`, `/daily-channel`, `/preferences`, `/ping` |
| §4.1 Passage result | Title like **John 3:16 (ESV)** | Title is just the reference (**John 3:16**). The translation's full name is in the footer |
| §4.1 Search result | Title `Search results: "<phrase>"`, Previous/Next buttons, footer `Page 1/5 · Showing 1-10 of 47 results` | Title `Search: “<phrase>”`, ◀️ `1 / 5` ▶️ buttons, footer `English Standard Version · 47 results · Page 1 of 5` |
| §4.1 Possible errors | Plain-text errors (`No results found.` etc.) | Small red embeds with a short headline (see §4.1 below) |
| §4.3 `/preferences` | `set`, `view`, `reset` subcommands with options | One `/preferences` command that opens a button panel |
| §4.3 Settings table | Verse numbers: "Always shown" for ESV | Verse numbers can be turned off in **ESV** too |
| §4.4 `/ping` | "Replies with `Pong!` and the latency" | Embed showing **Round trip** and **Heartbeat** in ms |
| §7 Daily verse | `/verse daily` is the only way to get it | Servers can also have it posted automatically with `/daily-channel` |
| §8 Privacy | "Server information" is not stored | Servers that use `/daily-channel` have their schedule stored (see §8 below) |
| §10 Requirements | Node.js 18 or newer | **Node.js 22.12 or newer**, plus FFmpeg for audio |
| §11 Design notes | Mock embed with linked title like **John 3:16 (ESV)** | Mock embed title **John 3:16**, footer **English Standard Version (ESV)** |

---

## §1. Product summary: additions

Add to **Key features**:
- **Listen to the ESV audio Bible** in a voice channel with `/audio`.
- **Automatic daily verse posts:** server admins can choose a channel and a time, and Scriptura posts the daily verse there every day.
- **Easy settings panel:** change your translation and display settings with buttons in `/preferences`.

Update the "Works in servers **and** anywhere else in Discord" bullet to add:
> Audio and automatic daily posts need Scriptura to be added to the server.

---

## §2. Site structure: additions

Add to the main navigation:
```
/audio               Listening to the ESV audio Bible in voice channels
/daily-channel       Setting up automatic daily verse posts (for server admins)
```
These can also be sections under `/commands`. `/daily-verse` should link to `/daily-channel`.

---

## §3. Getting started: changes

Replace the "All commands work in…" sentence with:
> `/verse`, `/preferences` and `/ping` work everywhere: servers, DMs with the bot, and private/group DMs. `/audio` and `/daily-channel` only work in servers where Scriptura has been added with **Add to Server**.

Replace the next-steps bullet `Save your favorite translation: /preferences set translation:NKJV` with:
- Save your favorite translation: run `/preferences` and pick one from the dropdown.

Add two more next steps:
- Listen in a voice channel: join one, then run `/audio play passage:Psalm 23`.
- Server admin? Run `/daily-channel set` to post the daily verse every morning.

Add a short **Permissions** note:
> For audio, Scriptura needs **Connect** and **Speak** in the voice channel. For automatic daily posts, it needs **View Channel**, **Send Messages** and **Embed Links** in the chosen channel. If something's missing, Scriptura tells you which permission to add.

> **Maintainer note:** check whether the public invite link requests Connect and Speak. If it doesn't, servers will have to grant them by hand.

---

## §4. Commands: changes

Replace the intro with: **There are five commands: `/verse`, `/audio`, `/daily-channel`, `/preferences`, `/ping`.**

### Summary (replace the table)

| Command | What it does | Who sees the reply | Where |
|---|---|---|---|
| `/verse search query:<text> [translation]` | Get a passage or search for a phrase | Everyone in the channel | Anywhere |
| `/verse daily` | Today's daily verse | Everyone in the channel | Anywhere |
| `/audio play passage:<reference>` | Play the ESV audio Bible in your voice channel | Everyone in the channel | Servers |
| `/audio stop` | Stop playback and leave the voice channel | Only you | Servers |
| `/daily-channel set channel:<channel> time:<time> [timezone] [translation]` | Post the daily verse in a channel every day | Only you | Servers (admins) |
| `/daily-channel view` | Show the daily post schedule | Only you | Servers (admins) |
| `/daily-channel disable` | Stop the daily posts | Only you | Servers (admins) |
| `/preferences` | Open your settings panel | Only you | Anywhere |
| `/ping` | Check the bot's response time | Only you | Anywhere |

Error messages are always visible only to you.

### 4.1 `/verse search`: changes to how results look

The options, translation priority and examples haven't changed.

**Passage result:** a green embed.
- **Title:** just the reference, e.g. **John 3:16**. Clicking it opens the passage on BibleGateway in the same translation.
- **Body:** the passage text. Verse numbers are shown as small superscript numbers (¹⁶ For God so loved…). Very long passages are cut off at Discord's 4,096-character limit.
- **Footnotes** (ESV, when turned on) appear in their own **Footnotes** section below the passage. Their markers in the text are superscript numbers (¹, ²) that match the notes.
- **Footer:** the translation's full name and code, e.g. **English Standard Version (ESV)**.

**Search result:**
- **Title:** `Search: “<your phrase>”`.
- Up to **10 matching verses per page**. Each shows a **bold reference that links to BibleGateway**, with the verse text underneath (long verses are shortened).
- **Footer:** translation, total results and page, e.g. `English Standard Version · 47 results · Page 1 of 5`.
- With more than one page, navigation buttons appear: **◀️ `1 / 5` ▶️**. The middle button just shows the current page.
- As before, only the person who ran the command can use the buttons, and they stop working after **2 minutes**.

**Possible errors** (replace the list). Errors are now small red embeds with a short headline, an optional tip, and your query and translation in the footer:

| Headline | When it appears | Tip shown |
|---|---|---|
| **No results found** | The reference doesn't exist in that translation, or the phrase had no matches | "Try a reference like “John 3:16” or a different phrase." |
| **Something went wrong** | The scripture service didn't respond | "Couldn’t reach the ESV API / Bible Brain. Please try again in a moment." |
| **Couldn’t read that passage** | The verse was found but its text couldn't be read | "Try a different translation." |

Example error (replace the old example):
```
┃ No results found
┃ Try a reference like “John 3:16” or a different phrase.
┃ “Hezekiah 3:1” · ESV
```

### 4.2 `/verse daily`: small change

Same behavior as before. The embed now has a **☀️ Verse of the Day** label above the reference.

### 4.3 `/audio`: NEW

Listen to the **ESV audio Bible** in a voice channel. Scriptura joins the voice channel you're in and reads the passage aloud.

#### `/audio play`

| Option | Required | Description |
|---|---|---|
| `passage` | Yes | A Bible reference, e.g. `John 3`, `Psalm 23`, `Romans 8:1-11` |

**How to use it:**
1. Join a voice channel in a server where Scriptura is added.
2. Run `/audio play passage:John 3`.
3. Scriptura joins your channel and starts playing.

**The "Now playing" message** (visible to everyone in the text channel):
- Label **🎧 Now playing** (or **⏸ Paused**), with the passage reference as the title (linked to BibleGateway).
- Shows which voice channel it's playing in and who requested it.
- Footer: **English Standard Version (ESV) · Audio © Crossway**.
- Buttons: **⏸️ Pause** / **▶️ Resume** and **⏹️ Stop**. **Anyone in the same voice channel** can use them. People outside the channel get a private "Join the voice channel to use these controls" message.

**When playback ends**, the message updates to show why and the buttons disappear:

| Status | Meaning |
|---|---|
| ✓ Finished | The passage finished playing |
| ⏹ Stopped | Someone pressed Stop or used `/audio stop` (it shows who) |
| ⏭ Skipped | Someone started a different passage in the same channel |
| 👋 Left the empty channel | Everyone else left the voice channel |
| 🔌 Disconnected | Scriptura was disconnected from the voice channel |
| ⚠️ Playback failed | Something went wrong while playing |

**Good to know:**
- Audio is **ESV only**, whatever your saved translation is.
- Any reference works: a verse, a range or a whole chapter. A book name on its own (e.g. `Jonah`) plays its **first chapter**. Phrase searches don't work with audio.
- Scriptura plays in **one voice channel per server** at a time. Running `/audio play` again in the same channel switches to the new passage. Running it from a different channel while audio is playing shows an error.
- Scriptura leaves on its own when the passage ends or when everyone else leaves the channel.
- Stage channels aren't supported. Use a regular voice channel.
- Scriptura needs **Connect** and **Speak** permissions in the voice channel.

**Examples:**
```
/audio play passage:Psalm 23
/audio play passage:John 3
/audio play passage:Romans 8:1-11
/audio play passage:Jonah 2
```

#### `/audio stop`

Stops playback and makes Scriptura leave the voice channel. You have to be in the same voice channel. The reply is visible only to you, and the "Now playing" message updates to **⏹ Stopped**.

#### Possible errors (shown only to you)

| Headline | Why |
|---|---|
| **Join a voice channel first** | You ran `/audio play` while not in a voice channel |
| **Stage channels aren’t supported** | You're in a stage channel |
| **I can’t speak in that channel** | Scriptura is missing Connect or Speak in your voice channel |
| **Already playing elsewhere** | Scriptura is already playing in another voice channel in this server |
| **Passage not found** | The reference isn't valid (e.g. a typo or a phrase instead of a reference) |
| **No audio for that passage** | ESV has no audio for that reference |
| **Couldn’t start playback** | Scriptura couldn't join the channel or load the audio. Try again |
| **Something went wrong** | The ESV service didn't respond |
| **Nothing is playing** | You ran `/audio stop` with nothing playing |
| **Join the voice channel to stop playback** | You ran `/audio stop` from outside the channel where audio is playing |
| **Audio only works in servers** | You ran `/audio` outside a server |

### 4.4 `/daily-channel`: NEW (server admins)

Have Scriptura **post the daily verse automatically** in a channel, every day at a time you choose.

**Who can use it:** members with the **Manage Server** permission, by default. Server owners can change who has access under **Server Settings → Integrations → Scriptura**. All replies are visible only to the person who ran the command.

#### `/daily-channel set`

| Option | Required | Description |
|---|---|---|
| `channel` | Yes | The text or announcement channel to post in |
| `time` | Yes | Time of day to post, e.g. `08:00`, `8am`, `7:30 PM` |
| `timezone` | No | Your time zone. Start typing a city (e.g. `New York`, `London`, `Tokyo`) and pick from the list. **Defaults to UTC** |
| `translation` | No | ESV, NKJV, KJV, NASB, NLT or ASV. **Defaults to ESV** |

**Accepted time formats:** `8`, `08:00`, `20:30` (24-hour), or `8am`, `8:30 PM`, `12pm` (12-hour).

**After saving**, Scriptura confirms with **✓ Daily verse scheduled** and shows:
- **Channel**
- **Time**, e.g. `08:00 · America/New York (UTC−04:00)`
- **Translation**
- **Next post:** the exact date and time, shown in *each viewer's own local time*, plus a countdown ("in 9 hours")

If you didn't choose a time zone, it adds a reminder: *"Times are in UTC. Add the timezone option to use your local time."*

**Changing the schedule:** run `/daily-channel set` again. If you leave out `timezone` or `translation`, Scriptura keeps what you chose last time. For example, `/daily-channel set channel:#verses time:6am` changes only the channel and time.

**Examples:**
```
/daily-channel set channel:#daily-verse time:8am timezone:America/New_York
/daily-channel set channel:#announcements time:07:30 timezone:Europe/London translation:KJV
/daily-channel set channel:#general time:6:00 PM timezone:Australia/Sydney
```

#### `/daily-channel view`

Shows the current schedule (channel, time, time zone, translation, next post) and when it last posted. If nothing is set up, it says **Daily verse is off**.

#### `/daily-channel disable`

Turns off the daily posts. Use `/daily-channel set` to turn them back on.

#### What the daily post looks like

A normal verse embed with the label **☀️ Verse of the Day · Tuesday, October 6** above the reference. It's in the translation chosen for the server, with default display settings (no footnotes, verse numbers on).

#### Good to know
- The verse follows **your server's local date**. A server posting at 7am in Tokyo gets that day's verse, not the previous day's (UTC) verse. So near midnight UTC it can differ from `/verse daily`, which changes at midnight UTC.
- Daylight saving time is handled automatically. An 8am post stays at 8am local time all year.
- If Scriptura is offline at posting time and comes back **within an hour**, it still posts. If it's later than that, it skips that day rather than posting at an odd time.
- If the channel is deleted, the schedule is removed automatically. Set it up again with a new channel.
- If Scriptura loses permission to post in the channel, it skips posts until the permission is restored.
- One daily channel per server.

#### Possible errors (shown only to you)

| Headline | Why |
|---|---|
| **Couldn’t read that time** | The time wasn't in a format Scriptura understands |
| **Unknown time zone** | The time zone wasn't recognized. Pick one from the autocomplete list |
| **I can’t post in that channel** | Scriptura needs View Channel, Send Messages and Embed Links there |
| **Unsupported translation** | The translation isn't one of the six supported |
| **Couldn’t save the schedule** / **Couldn’t load the schedule** / **Couldn’t update the schedule** | A temporary problem saving or loading settings. Try again |
| **This only works in servers** | You ran it outside a server |

### 4.5 `/preferences`: REPLACE the whole section

Save how Scriptura shows verses to you. Your settings follow you to every server and DM.

Run **`/preferences`** (no options). It opens a **settings panel that only you can see**:

```
┃ ⚙️ Preferences
┃ Choose how Scriptura shows Bible verses. Changes save instantly.
┃ ───────────────────────────────
┃ Translation
┃ Used by /verse unless you pick one. Currently English Standard Version.
┃ [ ESV — English Standard Version          ▾ ]
┃ ───────────────────────────────
┃ Footnotes                                   [ Off ]
┃ Show footnotes and study notes below the passage
┃ Verse numbers                               [ On  ]
┃ Show a number before each verse
┃ Section headings                            [ Auto ]
┃ Auto shows headings where the translation provides them
┃ Line by line                                [ Auto ]
┃ Put each verse on its own line · Auto uses this for Psalms
┃ ───────────────────────────────
┃ [ Reset display settings ]
┃ ✓ Footnotes set to on.
```

**How the controls work:**
- **Translation dropdown:** pick your default translation.
- **Footnotes** and **Verse numbers:** tap to switch between **On** (green) and **Off** (grey).
- **Section headings** and **Line by line:** tap to cycle **Auto** (blue) → **On** (green) → **Off** (grey).
- **Reset display settings** (red): resets footnotes, verse numbers, headings and line by line to their defaults. **Your translation is kept.**
- Every change **saves immediately**. A confirmation line like *"✓ Footnotes set to on."* appears at the bottom.
- The panel stops responding after **5 minutes without a click**. It then says *"This menu has expired. Run /preferences again to make more changes."*

**Defaults** (unchanged):
| Setting | Default |
|---|---|
| Translation | ESV |
| Footnotes | Off |
| Headings | Auto |
| Verse numbers | On |
| Line by line | Auto |

**Which settings apply to which translations** (replace the table; **verse numbers now work in ESV**):

| Setting | ESV | NKJV, KJV, NASB, NLT, ASV |
|---|---|---|
| Footnotes | ✅ | — |
| Headings | ✅ (Auto = off) | — |
| Verse numbers | ✅ | ✅ |
| Line by line | Uses ESV's own formatting | ✅ (Auto = on for Psalms only) |

**Possible errors** (shown only to you): **Couldn’t load your preferences**, **Couldn’t save that change**. Both are temporary, so try again.

### 4.6 `/ping`: replace

Replies (only to you) with a small **🏓 Pong!** embed showing two numbers:
- **Round trip:** how long Scriptura took to respond to your command, in ms.
- **Heartbeat:** Scriptura's connection latency to Discord, in ms.

Use it to check that the bot is online and responding.

---

## §5. Translations: additions

Add to **Attribution**:
- ESV **audio** (used by `/audio`): **ESV® audio, © Crossway**, via the ESV API.

Add a note:
> `/audio` is ESV-only. `/daily-channel` posts can use any of the six translations.

---

## §6. Writing references: small addition

Add a tip:
- `/audio play` accepts references only, not phrase searches. It's flexible like ESV text lookups. Whole chapters (`John 3`) work, and a book name on its own (`Jonah`) plays chapter 1.

---

## §7. Daily verse: additions

Add:
- **Automatic posts in your server:** server admins can use `/daily-channel set` to have the daily verse posted in a channel every day at a chosen local time. See `/daily-channel`.
- `/verse daily` embeds now carry a **☀️ Verse of the Day** label.

Clarify the midnight rule:
> `/verse daily` and the bot's status change at **midnight UTC**. Automatic `/daily-channel` posts use the **server's own local date** in the time zone the admin picked.

The list size in the brief is still correct: **31** references.

---

## §8. Privacy policy: changes

Add a new subsection **What Scriptura stores for servers** (only when an admin uses `/daily-channel set`):
- The server ID
- The channel ID for daily posts
- The posting time, time zone and translation
- The next scheduled post time and the last time it posted
- The user ID of the admin who last changed the schedule

This is deleted when an admin runs `/daily-channel disable`, or automatically if the channel is deleted.

Replace "**Server information**" in *What Scriptura does not store* with:
> Server information, except the daily-post schedule above for servers that set one up

Add to *What Scriptura does not store*:
> Voice: Scriptura only **plays** audio in voice channels. It joins **self-deafened** and never listens to, records or stores anything said in voice.

Add to **Third parties**:
> When you use `/audio`, the passage reference is sent to the ESV API, and the audio file is streamed from Crossway's audio server (audio.esv.org). Nothing that identifies you is sent.

Update **Removing your data**:
> In `/preferences`, **Reset display settings** resets your display settings. Server admins can remove their server's schedule with `/daily-channel disable`. To have your stored preferences removed completely, open an issue… (rest unchanged)

---

## §9. FAQ & troubleshooting: changes

**Replace:**
- ~~**Changing verse numbers or line-by-line did nothing.** Those settings only apply to NKJV, KJV, NASB, NLT and ASV.~~ → **Changing line-by-line did nothing.** That setting only applies to NKJV, KJV, NASB, NLT and ASV. (Verse numbers now work in every translation.)
- ~~**Does `/preferences reset` remove my translation?**~~ → **Does "Reset display settings" remove my translation?** No. It only resets display settings.
- ~~**The Next/Previous buttons stopped working.**~~ → **The ◀️ / ▶️ buttons stopped working.** They expire after 2 minutes and only respond to the person who ran the search. Run the search again.

**Add (audio):**
- **`/audio` doesn't show up.** Audio only works in servers where Scriptura was added with **Add to Server**. It doesn't work in DMs or through "Add to My Apps".
- **Scriptura won't join my voice channel.** Make sure you're in a regular voice channel (not a stage), and that Scriptura has **Connect** and **Speak** there.
- **"Already playing elsewhere."** Scriptura can only be in one voice channel per server. Join that channel, or have someone there stop playback.
- **Can I listen in KJV or another translation?** Not yet. Audio is ESV only.
- **The Pause/Stop buttons say I need to join the voice channel.** Only people in the same voice channel as Scriptura can control playback.
- **Scriptura left the voice channel.** It leaves when the passage ends or when everyone else has left.

**Add (daily channel):**
- **I can't see `/daily-channel`.** It needs the **Manage Server** permission by default. Ask a server admin, or have the owner allow it under Server Settings → Integrations.
- **The daily verse posted at the wrong time.** Check the time zone with `/daily-channel view`. Without one, times are in UTC.
- **The daily verse didn't post.** Make sure Scriptura can still view the channel, send messages and embed links there. If the channel was deleted, set it up again.
- **Why is the server's daily verse different from `/verse daily`?** Server posts use the server's local date. `/verse daily` changes at midnight UTC. Near midnight UTC they can differ.
- **Can I post in more than one channel?** Not yet. It's one daily channel per server.

**Add (preferences):**
- **The preferences buttons stopped working.** The panel expires after 5 minutes without a click. Run `/preferences` again.

---

## §10. Self-Hosting & Development: changes

**Requirements (replace the Node line and add FFmpeg):**
- **Node.js 22.12 or newer.** This is required by the voice library (`@discordjs/voice` 0.19).
- **FFmpeg**, for `/audio`. The `ffmpeg-static` npm package normally provides it during `npm install`. If your host blocks install scripts, install FFmpeg on the system instead.

**Discord settings:**
- The bot now uses the **Guild Voice States** gateway intent (not privileged, so nothing needs turning on in the Developer Portal).
- For `/audio`, the bot needs **Connect** and **Speak**. For `/daily-channel`, it needs **View Channel**, **Send Messages** and **Embed Links**. Consider adding these to your invite link's permissions.

**Environment variables:** unchanged. `ESV_API_KEY` is also used for ESV audio.

**Database:** a second MongoDB collection, `guild_settings`, stores `/daily-channel` schedules (one document per server). `user_preferences` is unchanged.

**After updating:** run `npm install` (dependencies changed) and `npm run deploy` (new commands, and `/preferences` no longer has subcommands).

**Project layout (replace):**
```
index.js                      Bot entry point (loads commands, handles interactions, daily status, starts the daily-post scheduler)
deploy-commands.js            Registers slash commands with Discord
daily_verses.json             Daily verse list
commands/verses/              /verse
commands/audio/               /audio
commands/utility/             /preferences, /daily-channel, /ping
helpers/                      Scripture API clients, translations, storage, embeds, voice sessions, scheduler, time zones
```

**New helper files**, for contributors:
| File | Purpose |
|---|---|
| `helpers/ui.js` | Shared embed colors, error embeds, text truncation, BibleGateway links |
| `helpers/voice_session.js` | One voice connection per server; plays audio and cleans up when playback ends or the channel empties |
| `helpers/guild_settings.js` | Stores `/daily-channel` schedules in MongoDB |
| `helpers/daily_verse_scheduler.js` | Checks every minute for servers whose daily verse is due and posts it |
| `helpers/timezones.js` | Time zone validation, time parsing, next-post calculation, autocomplete |

**Code notes:**
- Commands can now export an optional `autocomplete(interaction)` handler, alongside `data` and `execute`. `index.js` routes autocomplete requests to it.
- `/preferences` uses Discord's newer component layout (Components V2: containers, sections and buttons).

---

## §11. Tone & design notes: changes

- Mock verse embeds: **title** is just the reference (**John 3:16**, linked), **verse numbers are superscript** (¹⁶), **footer** reads **English Standard Version (ESV)**, green `#2F5233` left border.
- Error embeds have a **red left border** (`#B33A3A`) and a short headline, e.g. **No results found**.
- Ended or inactive states (finished audio, "Daily verse is off") use a **grey border** (`#4F545C`).
- Worth showing as mockups: the **🎧 Now playing** audio card with Pause/Stop buttons, the **⚙️ Preferences** panel, and a **☀️ Verse of the Day · Tuesday, October 6** daily post.
- Write the new commands the way Discord shows them: `/audio play passage:Psalm 23`, `/daily-channel set channel:#daily-verse time:8am timezone:America/New_York`.
