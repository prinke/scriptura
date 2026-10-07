# Scriptura — Documentation Site Brief

> **Who this is for:** an AI (or person) building the documentation website for Scriptura at **https://scriptura.prinke.dev**.
> This file is the complete source of truth. Everything in it reflects how the bot actually behaves.
> For a list of what changed since the site was last updated, see `site-changes-2026-10.md` in this folder.
>
> **Focus:** the site is mainly for **people using the public, hosted Scriptura bot** in Discord. Self-hosting and development material goes in a **single separate tab** (§10). Don't feature it on the landing page or in the main navigation flow.

---

## 1. Product summary

| Field | Value |
|---|---|
| Name | **Scriptura** |
| One-liner | A Discord bot for reading, searching and listening to Bible scripture with slash commands. |
| Website / docs | https://scriptura.prinke.dev |
| Add to Discord | https://discord.com/oauth2/authorize?client_id=1291760421115527251 |
| Source code | https://github.com/prinketaru/scriptura |
| Issues / feedback | https://github.com/prinketaru/scriptura/issues |
| Maintainer | prinke (GitHub: `prinketaru`) |
| License | GNU GPL-3.0 (open source) |
| Brand / embed color | `#2F5233` (dark forest green) |

**Key features:**
- Look up verses by reference (`John 3:16`, `Romans 8:1-11`, `Psalm 23`) **or** search by phrase (`love is patient`).
- 6 English translations, with ESV as the default.
- **Listen to the ESV audio Bible** in a voice channel with `/audio`.
- A daily verse that everyone sees on the same day. The bot's Discord status shows today's reference.
- **Automatic daily verse posts:** server admins can pick a channel and a time, and Scriptura posts the daily verse there every day.
- An easy **settings panel** (`/preferences`) for your translation and how verses are displayed.
- Works in servers **and** anywhere else in Discord: add it to a server, or add it to your own account and use it in DMs, group DMs and servers where it isn't installed. Audio and automatic daily posts need Scriptura to be added to the server.
- Privacy-focused: it stores only your own preferences, plus a server's daily-post schedule if an admin sets one up.
- Free and open source.

---

## 2. Site structure

**Main navigation (user-facing, the primary focus):**
```
/                    Home: hero, "Add to Discord" button, feature highlights, mock verse embed
/getting-started     Adding the bot (server vs. personal), running your first command, permissions
/commands            Overview of all commands, with one section per command
/audio               Listening to the ESV audio Bible in voice channels (can live under /commands)
/daily-channel       Automatic daily verse posts, for server admins (can live under /commands)
/translations        Supported translations
/references          How to type references and phrase searches, plus accepted book abbreviations
/daily-verse         How the daily verse works (links to /daily-channel)
/preferences         Customizing translation and display (can live under /commands)
/faq                 FAQ & troubleshooting
/privacy             Privacy policy
```

**Separate tab, secondary:**
```
/self-hosting        One page (or a small sub-section) covering running your own instance and contributing
```

The footer should include: GitHub link, GPL-3.0 license, Add to Discord link, and scripture attribution (§5).

---

## 3. Getting started

### Adding Scriptura
Open the invite link: `https://discord.com/oauth2/authorize?client_id=1291760421115527251`. Discord offers two options:

- **Add to Server.** The bot joins a server and everyone there can use its commands. This requires the Manage Server permission.
- **Add to My Apps** (user install). The commands follow *you* around Discord, so you can use them in DMs, group DMs and servers where Scriptura isn't installed. Servers can restrict user apps, so it may not work everywhere.

`/verse`, `/preferences` and `/ping` work everywhere: servers, DMs with the bot, and private/group DMs. `/audio` and `/daily-channel` only work in servers where Scriptura has been added with **Add to Server**.

### First command
Type `/verse search` and enter `John 3:16` in the `query` field. You'll get an embed with the verse in ESV. Next steps:
- Try a phrase: `/verse search query:love is patient`
- Pick a translation: `/verse search query:Psalm 23 translation:KJV`
- Save your favorite translation: run `/preferences` and pick one from the dropdown
- Listen in a voice channel: join one, then run `/audio play passage:Psalm 23`
- Server admin? Run `/daily-channel set` to post the daily verse every morning

Scriptura only responds to slash commands. It doesn't read the messages in your channels.

### Permissions
For audio, Scriptura needs **Connect** and **Speak** in the voice channel. For automatic daily posts, it needs **View Channel**, **Send Messages** and **Embed Links** in the chosen channel. If something is missing, Scriptura says which permission to add.

> **Maintainer note:** check whether the public invite link requests Connect and Speak. If it doesn't, servers have to grant them by hand.

---

## 4. Commands

There are five commands: `/verse`, `/audio`, `/daily-channel`, `/preferences`, `/ping`.

### Summary

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

Error messages are always visible only to you. They appear as small red embeds with a short headline, an optional tip, and (for verse lookups) your query and translation in the footer.

### 4.1 `/verse search`

Get a Bible passage by reference, or search the Bible for a word or phrase.

| Option | Required | Description |
|---|---|---|
| `query` | Yes | A Bible reference (e.g. `John 3:16`) or a phrase (e.g. `in love`) |
| `translation` | No | Pick from ESV, NKJV, KJV, NASB, NLT, ASV |

**Which translation is used:**
1. The `translation` you picked in the command, if any
2. Otherwise, your saved preferred translation (set in `/preferences`)
3. Otherwise, **ESV**

**References vs. phrases:** if your query looks like a reference, you get that passage. If it doesn't, Scriptura searches for it as a phrase. See §6 for reference formats.

**Passage result:** a green embed.
- **Title:** the reference, e.g. **John 3:16**. Clicking it opens the passage on BibleGateway in the same translation.
- **Body:** the passage text, with verse numbers shown as small superscript numbers (¹⁶ For God so loved…). Very long passages, such as some full chapters, are cut off at Discord's 4,096-character limit.
- **Footnotes** (ESV, when turned on) appear in their own **Footnotes** section below the passage. Their markers in the text are superscript numbers (¹, ²) that match the notes.
- **Footer:** the translation's full name and code, e.g. **English Standard Version (ESV)**.

**Search result:**
- **Title:** `Search: “<your phrase>”`.
- Up to **10 matching verses per page**. Each shows a **bold reference that links to BibleGateway**, with the verse text underneath (long verses are shortened).
- **Footer:** translation, total results and page, e.g. `English Standard Version · 47 results · Page 1 of 5`.
- With more than one page, navigation buttons appear: **◀️ `1 / 5` ▶️**. The middle button just shows the current page.
- Only the person who ran the command can use the buttons. They stop working after **2 minutes**.

**Examples:**
```
/verse search query:John 3:16
/verse search query:Psalm 23 translation:KJV
/verse search query:Romans 8:1-11 translation:NLT
/verse search query:1 Cor 13:4-7
/verse search query:love is patient
/verse search query:armor of God translation:NASB
```

**Possible errors** (shown only to you):

| Headline | When it appears | Tip shown |
|---|---|---|
| **No results found** | The reference doesn't exist in that translation, or the phrase had no matches | "Try a reference like “John 3:16” or a different phrase." |
| **Something went wrong** | The scripture service didn't respond | "Couldn’t reach the ESV API / Bible Brain. Please try again in a moment." |
| **Couldn’t read that passage** | The verse was found but its text couldn't be read | "Try a different translation." |

Example error:
```
┃ No results found
┃ Try a reference like “John 3:16” or a different phrase.
┃ “Hezekiah 3:1” · ESV
```

### 4.2 `/verse daily`

Shows today's daily verse. It has no options. It uses your saved translation (ESV if you haven't set one) and your display settings. The reply looks like a normal passage embed with a **☀️ Verse of the Day** label above the reference. See §7.

### 4.3 `/audio`

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

### 4.4 `/daily-channel` (server admins)

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

If no time zone was chosen, it adds a reminder: *"Times are in UTC. Add the timezone option to use your local time."*

**Changing the schedule:** run `/daily-channel set` again. If you leave out `timezone` or `translation`, Scriptura keeps what you chose last time.

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
- The verse follows **the server's local date**. A server posting at 7am in Tokyo gets that day's verse, not the previous day's (UTC) verse.
- Daylight saving time is handled automatically. An 8am post stays at 8am local time all year.
- If Scriptura is offline at posting time and comes back **within an hour**, it still posts. If it's later than that, it skips that day rather than posting at an odd time.
- If the channel is deleted, the schedule is removed automatically.
- If Scriptura loses permission to post in the channel, it skips posts until the permission is restored.
- One daily channel per server.

#### Possible errors (shown only to you)

| Headline | Why |
|---|---|
| **Couldn’t read that time** | The time wasn't in a format Scriptura understands |
| **Unknown time zone** | The time zone wasn't recognized. Pick one from the autocomplete list |
| **I can’t post in that channel** | Scriptura needs View Channel, Send Messages and Embed Links there |
| **Unsupported translation** | The translation isn't one of the six supported |
| **Couldn’t save / load / update the schedule** | A temporary problem saving or loading settings. Try again |
| **This only works in servers** | You ran it outside a server |

### 4.5 `/preferences`

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

#### Defaults
| Setting | Default |
|---|---|
| Translation | ESV |
| Footnotes | Off |
| Headings | Auto |
| Verse numbers | On |
| Line by line | Auto |

#### Which settings apply to which translations
Each translation comes from a different scripture source, and not every source supports every setting:

| Setting | ESV | NKJV, KJV, NASB, NLT, ASV |
|---|---|---|
| Footnotes | ✅ | — |
| Headings | ✅ (Auto = off) | — |
| Verse numbers | ✅ | ✅ |
| Line by line | Uses ESV's own formatting | ✅ (Auto = on for Psalms only) |

Present this as a small table on the preferences page, using wording like "Some settings only apply to certain translations."

**Possible errors** (shown only to you): **Couldn’t load your preferences**, **Couldn’t save that change**. Both are temporary, so try again.

### 4.6 `/ping`

Replies (only to you) with a small **🏓 Pong!** embed showing two numbers:
- **Round trip:** how long Scriptura took to respond to your command, in ms.
- **Heartbeat:** Scriptura's connection latency to Discord, in ms.

Use it to check that the bot is online and responding.

---

## 5. Translations

| Code | Name |
|---|---|
| **ESV** (default) | English Standard Version |
| NKJV | New King James Version |
| KJV | King James (Authorized) Version |
| NASB | New American Standard Bible |
| NLT | New Living Translation |
| ASV | American Standard Version |

They appear in Discord's dropdown in this order: ESV, NKJV, KJV, NASB, NLT, ASV.

You can choose a translation per command with the `translation` option, or save a default in `/preferences`.

`/audio` is ESV-only. `/daily-channel` posts can use any of the six translations.

**Attribution (show on this page and in the footer):**
- ESV text: **ESV® Bible (The Holy Bible, English Standard Version®), © Crossway**, via the ESV API (api.esv.org).
- ESV audio (used by `/audio`): **ESV® audio, © Crossway**, via the ESV API.
- All other translations are provided through **Bible Brain by Faith Comes By Hearing** (faithcomesbyhearing.com/bible-brain).

---

## 6. Writing references

**Supported formats:**
| Format | Example |
|---|---|
| Whole chapter | `Psalm 23` |
| Single verse | `John 3:16` |
| Verse range | `Romans 8:1-11` |
| Abbreviated book | `1 Cor 13:4-7`, `Gen 1:1`, `Ps 46:1` |

**Tips:**
- Capitalization and periods don't matter: `jn 3:16`, `Gen. 1:1`.
- Use a normal hyphen `-` for ranges.
- **Ranges across chapters** (e.g. `John 3:16-4:2`) work in **ESV only**. In other translations, request each chapter separately.
- If Scriptura doesn't recognize the query as a reference, it searches for it as a phrase instead.
- `/audio play` accepts references only, not phrase searches. Whole chapters (`John 3`) work, and a book name on its own (`Jonah`) plays chapter 1.
- ESV is the most flexible about how references are written.
- All 66 books of the Protestant Bible are supported.

**Accepted book names and abbreviations** (all translations):

| Book | You can type |
|---|---|
| Genesis | genesis, gen |
| Exodus | exodus, exod, exo, ex |
| Leviticus | leviticus, lev |
| Numbers | numbers, number, num, nu, nm |
| Deuteronomy | deuteronomy, deut, deu, dt |
| Joshua | joshua, josh, jos |
| Judges | judges, judg, jdg, jg |
| Ruth | ruth, rut |
| 1 Samuel | 1 samuel, 1samuel, first samuel, i samuel, 1 sam, 1sam, 1 sa |
| 2 Samuel | 2 samuel, 2samuel, second samuel, ii samuel, 2 sam, 2sam, 2 sa |
| 1 Kings | 1 kings, 1kings, first kings, i kings, 1 kgs, 1kgs, 1 ki |
| 2 Kings | 2 kings, 2kings, second kings, ii kings, 2 kgs, 2kgs, 2 ki |
| 1 Chronicles | 1 chronicles, 1chronicles, first chronicles, i chronicles, 1 chron, 1chron, 1 chr, 1chr |
| 2 Chronicles | 2 chronicles, 2chronicles, second chronicles, ii chronicles, 2 chron, 2chron, 2 chr, 2chr |
| Ezra | ezra, ezr |
| Nehemiah | nehemiah, neh |
| Esther | esther, est |
| Job | job |
| Psalms | psalms, psalm, ps, psa |
| Proverbs | proverbs, prov, pro, prv |
| Ecclesiastes | ecclesiastes, eccles, ecc |
| Song of Songs | song of songs, song of solomon, song, songs, sng, sos |
| Isaiah | isaiah, isa |
| Jeremiah | jeremiah, jer |
| Lamentations | lamentations, lam |
| Ezekiel | ezekiel, ezek, ezk |
| Daniel | daniel, dan |
| Hosea | hosea, hos |
| Joel | joel, jol |
| Amos | amos, amo |
| Obadiah | obadiah, obad, oba |
| Jonah | jonah, jon |
| Micah | micah, mic |
| Nahum | nahum, nah, nam |
| Habakkuk | habakkuk, hab |
| Zephaniah | zephaniah, zeph, zep |
| Haggai | haggai, hag |
| Zechariah | zechariah, zech, zec |
| Malachi | malachi, mal |
| Matthew | matthew, matt, mat, mt |
| Mark | mark, mrk, mk |
| Luke | luke, luk, lk |
| John | john, jhn, jn |
| Acts | acts, act |
| Romans | romans, rom |
| 1 Corinthians | 1 corinthians, 1corinthians, first corinthians, i corinthians, 1 cor, 1cor, 1 co |
| 2 Corinthians | 2 corinthians, 2corinthians, second corinthians, ii corinthians, 2 cor, 2cor, 2 co |
| Galatians | galatians, gal |
| Ephesians | ephesians, eph |
| Philippians | philippians, phil, php |
| Colossians | colossians, col |
| 1 Thessalonians | 1 thessalonians, 1thessalonians, first thessalonians, i thessalonians, 1 thess, 1thess, 1 th |
| 2 Thessalonians | 2 thessalonians, 2thessalonians, second thessalonians, ii thessalonians, 2 thess, 2thess, 2 th |
| 1 Timothy | 1 timothy, 1timothy, first timothy, i timothy, 1 tim, 1tim, 1 ti |
| 2 Timothy | 2 timothy, 2timothy, second timothy, ii timothy, 2 tim, 2tim, 2 ti |
| Titus | titus, tit |
| Philemon | philemon, phlm, phm |
| Hebrews | hebrews, heb |
| James | james, jas, jam |
| 1 Peter | 1 peter, 1peter, first peter, i peter, 1 pet, 1pet, 1 pe |
| 2 Peter | 2 peter, 2peter, second peter, ii peter, 2 pet, 2pet, 2 pe |
| 1 John | 1 john, 1john, first john, i john, 1 jn, 1jn |
| 2 John | 2 john, 2john, second john, ii john, 2 jn, 2jn |
| 3 John | 3 john, 3john, third john, iii john, 3 jn, 3jn |
| Jude | jude, jud |
| Revelation | revelation, revelations, rev |

Consider making this table collapsible or searchable on the site.

**Phrase search tips:** use distinctive words (`armor of God` rather than `God`). Results come from the selected translation, so wording differs between translations. If a phrase finds nothing, try another translation or fewer words.

---

## 7. Daily verse

- Use `/verse daily` to get today's verse. The embed has a **☀️ Verse of the Day** label.
- Everyone gets the same **reference** on the same day, but the **text** is in each person's own saved translation, with their display settings.
- `/verse daily` and the bot's status change at **midnight UTC**, not at your local midnight.
- **Automatic posts in your server:** server admins can use `/daily-channel set` to have the daily verse posted in a channel every day at a chosen local time. These posts use the **server's own local date** in the admin's chosen time zone, so near midnight UTC they can differ from `/verse daily`. See §4.4.
- The verses come from a hand-picked list of 31 well-known passages that the bot cycles through, such as Genesis 1:1, Psalm 23:1, John 3:16, Romans 8:28, Proverbs 3:5, Isaiah 41:10, Philippians 4:13 and Jeremiah 29:11.
- The bot's Discord status always shows today's verse as **"Listening to <reference>"**. Check its profile to see the daily verse at a glance.

---

## 8. Privacy policy content

**What Scriptura stores for you** (only after you change something in `/preferences`):
- Your Discord user ID
- Your preferred translation
- Your display settings (footnotes, headings, verse numbers, line by line)
- When you last changed them

**What Scriptura stores for servers** (only when an admin uses `/daily-channel set`):
- The server ID
- The channel ID for daily posts
- The posting time, time zone and translation
- The next scheduled post time and the last time it posted
- The user ID of the admin who last changed the schedule

This is deleted when an admin runs `/daily-channel disable`, or automatically if the channel is deleted.

**What Scriptura does not store:**
- Messages: the bot can't read message content
- Your searches, lookups or command history
- Voice: Scriptura only **plays** audio in voice channels. It joins **self-deafened** and never listens to, records or stores anything said in voice
- Server information, except the daily-post schedule above for servers that set one up
- Analytics, tracking or advertising data

**Third parties:** your search text or reference is sent to the scripture providers (ESV API by Crossway; Bible Brain by Faith Comes By Hearing) to get the verse text. When you use `/audio`, the passage reference is sent to the ESV API and the audio is streamed from Crossway's audio server (audio.esv.org). Nothing that identifies you is sent with any of these.

**Removing your data:** in `/preferences`, **Reset display settings** resets your display settings. Server admins can remove their server's schedule with `/daily-channel disable`. To have your stored preferences removed completely, open an issue at https://github.com/prinketaru/scriptura/issues or contact the maintainer.

**Open source:** anyone can review exactly what the bot does at https://github.com/prinketaru/scriptura.

---

## 9. FAQ & troubleshooting

**General**
- **The commands don't show up.** Make sure Scriptura is added to the server, or to your account through "Add to My Apps". Some servers disable user apps or restrict bot commands to certain channels.
- **"No results found."** Check the spelling of the book (see §6), make sure the chapter and verse exist, or try ESV, which is the most flexible with references.
- **A range like `John 3:16-4:2` doesn't work.** Ranges across chapters only work in ESV.
- **The ◀️ / ▶️ buttons stopped working.** They expire after 2 minutes and only respond to the person who ran the search. Run the search again.
- **The passage is cut off.** Discord limits embed length. Request a smaller range.
- **Can I get NIV, CSB or another translation?** Only the six listed translations are available right now. You can request others on GitHub Issues.
- **Is it free?** Yes. It's completely free and open source.
- **How do I report a bug or suggest a feature?** Open an issue at https://github.com/prinketaru/scriptura/issues.

**Preferences**
- **Changing footnotes or headings did nothing.** Those settings only apply to ESV.
- **Changing line-by-line did nothing.** That setting only applies to NKJV, KJV, NASB, NLT and ASV.
- **Does "Reset display settings" remove my translation?** No. It only resets display settings.
- **The preferences buttons stopped working.** The panel expires after 5 minutes without a click. Run `/preferences` again.
- **Can other people see my preferences?** No. The preferences panel is visible only to you.

**Audio**
- **`/audio` doesn't show up.** Audio only works in servers where Scriptura was added with **Add to Server**. It doesn't work in DMs or through "Add to My Apps".
- **Scriptura won't join my voice channel.** Make sure you're in a regular voice channel (not a stage), and that Scriptura has **Connect** and **Speak** there.
- **"Already playing elsewhere."** Scriptura can only be in one voice channel per server. Join that channel, or have someone there stop playback.
- **Can I listen in KJV or another translation?** Not yet. Audio is ESV only.
- **The Pause/Stop buttons say I need to join the voice channel.** Only people in the same voice channel as Scriptura can control playback.
- **Scriptura left the voice channel.** It leaves when the passage ends or when everyone else has left.
- **I asked for a whole book but only heard chapter 1.** A book name on its own plays its first chapter. Ask for a specific chapter, e.g. `Jonah 2`.

**Daily verse & daily channel**
- **The daily verse didn't change at my midnight.** `/verse daily` changes at midnight UTC.
- **I can't see `/daily-channel`.** It needs the **Manage Server** permission by default. Ask a server admin, or have the owner allow it under Server Settings → Integrations.
- **The daily verse posted at the wrong time.** Check the time zone with `/daily-channel view`. Without one, times are in UTC.
- **The daily verse didn't post.** Make sure Scriptura can still view the channel, send messages and embed links there. If the channel was deleted, set it up again.
- **Why is the server's daily verse different from `/verse daily`?** Server posts use the server's local date. `/verse daily` changes at midnight UTC. Near midnight UTC they can differ.
- **Can I post in more than one channel?** Not yet. It's one daily channel per server.

---

## 10. Self-Hosting & Development (one separate tab, secondary)

Keep this compact and clearly marked as optional. Most users never need it.

### Run your own instance

**Requirements**
- **Node.js 22.12 or newer.** This is required by the voice library (`@discordjs/voice` 0.19).
- A Discord application and bot token: https://discord.com/developers/applications
- An ESV API key: https://api.esv.org/ (required; also used for ESV audio)
- A Bible Brain API key: https://www.faithcomesbyhearing.com/bible-brain/developer-documentation (needed for every translation except ESV)
- A MongoDB database. Include the database name in the connection string.
- **FFmpeg**, for `/audio`. The `ffmpeg-static` npm package normally provides it during `npm install`. If your host blocks install scripts, install FFmpeg on the system instead.

**Discord settings**
- The bot uses the **Guilds** and **Guild Voice States** gateway intents. Neither is privileged, so nothing needs turning on in the Developer Portal.
- For `/audio`, the bot needs **Connect** and **Speak**. For `/daily-channel`, it needs **View Channel**, **Send Messages** and **Embed Links**. Consider adding these to your invite link's permissions.

**Environment variables (`.env`)**
| Variable | Required | Purpose |
|---|---|---|
| `TOKEN` | Yes | Discord bot token |
| `CLIENT_ID` | Yes | Discord application ID, used to register commands |
| `ESV_API_KEY` | Yes | ESV API key (text and audio) |
| `BIBLE_BRAIN_KEY` | Yes, for non-ESV translations | Bible Brain API key |
| `MONGO_URI` | Yes | MongoDB connection string |
| `GUILD_ID` | No | Clears leftover server-only commands in this server after registering global commands |

```env
TOKEN=your_bot_token
CLIENT_ID=your_client_id
ESV_API_KEY=your_esv_api_key
BIBLE_BRAIN_KEY=your_bible_brain_key
MONGO_URI=mongodb+srv://user:pass@host/scriptura
```

**Setup**
```bash
git clone https://github.com/prinketaru/scriptura.git
cd scriptura
npm install
cp .env.example .env    # fill in your values
npm run deploy          # register slash commands with Discord
npm start               # or: npm run dev for auto-reload
```

**Scripts:** `npm start` (run), `npm run dev` (run with auto-reload), `npm run deploy` (register commands), `npm run lint` / `npm run lint:fix`.

**Database:** two MongoDB collections are used. `user_preferences` stores each user's translation and display settings. `guild_settings` stores `/daily-channel` schedules (one document per server).

**Hosting:** Scriptura runs as a background worker and doesn't need a web port. The included `Procfile` (`worker: node deploy-commands.js && npm start`) works on Heroku-style hosts and Dokku. The repo also includes a GitHub Actions workflow that deploys to Dokku on every push to `master`. It needs the secrets `DOKKU_HOST`, `DOKKU_APP` and `SSH_PRIVATE_KEY`. Run only **one** instance of the bot: audio sessions are kept in memory.

### Contributing

- Fork → create a feature branch → make changes → `npm run lint` → open a pull request with a clear description.
- Code style: tabs, single quotes, semicolons, JSDoc comments, ESLint.
- Test changes in Discord, including multiple translations and pagination.
- Contributions are licensed under GPL-3.0.

**Project layout**
```
index.js                      Bot entry point (loads commands, routes interactions, daily status, daily-post scheduler)
deploy-commands.js            Registers slash commands with Discord
daily_verses.json             Daily verse list
commands/verses/              /verse
commands/audio/               /audio
commands/utility/             /preferences, /daily-channel, /ping
helpers/                      Scripture API clients, translations, storage, embeds, voice, scheduler, time zones
docs/                         Documentation site brief and change notes
```

**Helper files**
| File | Purpose |
|---|---|
| `helpers/esv_api_request.js` | ESV API client: passages, search, audio URLs |
| `helpers/biblebrain_request.js` | Bible Brain client and reference parser |
| `helpers/translations.js` | Supported translations, display names, Bible Brain fileset IDs |
| `helpers/verse_embed.js` | Builds verse embeds (superscript verse numbers, footnotes) |
| `helpers/ui.js` | Shared embed colors, error embeds, BibleGateway links |
| `helpers/user_preferences.js` | Stores user preferences in MongoDB |
| `helpers/guild_settings.js` | Stores `/daily-channel` schedules in MongoDB |
| `helpers/daily_verse.js` | Picks the daily verse reference for a date |
| `helpers/daily_verse_scheduler.js` | Checks every minute for servers whose daily verse is due and posts it |
| `helpers/voice_session.js` | One voice connection per server; plays audio and cleans up |
| `helpers/timezones.js` | Time zone validation, time parsing, next-post calculation, autocomplete |
| `helpers/mongo.js` | Shared MongoDB connection |

**Adding a command:** create `commands/<category>/<name>.js` that exports `data` (a `SlashCommandBuilder`) and `execute(interaction)`, plus an optional `autocomplete(interaction)` for options with autocomplete. Then run `npm run deploy`. Commands load automatically.

**Adding a translation:** in `helpers/translations.js`, add the Bible Brain text fileset IDs to `BIBLE_BRAIN_BIBLES`, a matching entry to `translationChoices`, and its full name to `TRANSLATION_NAMES`. Then run `npm run deploy`. For reference, the existing fileset IDs are:

| Code | Fileset IDs |
|---|---|
| NKJV | OT `ENGNKJO_ET`, NT `ENGNKJN_ET` |
| KJV | OT `ENGKJVO_ET`, NT `ENGKJVN_ET` |
| NASB | OT `ENGNASO_ET`, NT `ENGNASN_ET` |
| NLT | OT `ENGNLTO_ET`, NT `ENGNLTN_ET` |
| ASV | complete `ENGASV` |

---

## 11. Tone & design notes

- Primary audience: everyday Discord users, such as church communities, Bible study groups and Christian servers. Many aren't technical, so keep the user pages short and friendly, and lead with examples.
- Tone: warm, clear, welcoming. Reverent but not preachy.
- Make the "Add to Discord" button prominent on the home page and in the header.
- Show Discord-style mock embeds on the home page and the commands page: dark background, green `#2F5233` left border, linked title like **John 3:16**, superscript verse numbers (¹⁶), footer **English Standard Version (ESV)**.
- Error embeds have a **red left border** (`#B33A3A`) and a short headline, e.g. **No results found**.
- Ended or inactive states (finished audio, "Daily verse is off") use a **grey border** (`#4F545C`).
- Worth showing as mockups: the **🎧 Now playing** audio card with Pause/Stop buttons, the **⚙️ Preferences** panel, and a **☀️ Verse of the Day · Tuesday, October 6** daily post.
- Write commands the way Discord displays them: `/verse search query:John 3:16 translation:KJV`, `/audio play passage:Psalm 23`, `/daily-channel set channel:#daily-verse time:8am timezone:America/New_York`.
- Footer: GitHub link, GPL-3.0, Add to Discord link, and scripture attribution.
