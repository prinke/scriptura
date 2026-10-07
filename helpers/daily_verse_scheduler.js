/**
 * Daily Verse Scheduler
 *
 * Posts the daily verse to each server's configured channel at its chosen
 * local time. Schedules are stored in MongoDB (see helpers/guild_settings),
 * so they survive restarts; the scheduler checks for due posts once a minute.
 *
 * @module helpers/daily_verse_scheduler
 */

const { RESTJSONErrorCodes } = require('discord.js');
const { esvPassageRequest } = require('./esv_api_request');
const { bibleBrainGetPassage } = require('./biblebrain_request');
const { BIBLE_BRAIN_BIBLES } = require('./translations');
const { getDailyVerseReference } = require('./daily_verse');
const verseEmbed = require('./verse_embed');
const { getZonedParts, nextOccurrence } = require('./timezones');
const {
	findDueDailyVerses,
	claimDailyVerse,
	markDailyVersePosted,
	clearDailyVerseSettings,
} = require('./guild_settings');

/** @constant {number} How often to check for due posts (1 minute) */
const TICK_MS = 60 * 1000;

/** @constant {number} Posts more than this late (e.g., after downtime) are skipped */
const LATE_GRACE_MS = 60 * 60 * 1000;

/** @constant {Set<number>} Discord errors meaning the channel is gone for good */
const CHANNEL_GONE_CODES = new Set([
	RESTJSONErrorCodes.UnknownChannel,
	RESTJSONErrorCodes.UnknownGuild,
]);

let ticking = false;

/**
 * Fetches a passage and builds its embed for a scheduled post.
 * Uses default display settings since the post is shared by the whole server.
 *
 * @param {string} reference - Bible reference
 * @param {string} translation - Translation code
 * @param {string} label - Label shown above the title
 * @returns {Promise<import('discord.js').EmbedBuilder>} Verse embed
 * @throws {Error} If the passage couldn't be fetched
 */
async function buildPassageEmbed(reference, translation, label) {
	if (translation === 'ESV') {
		const result = await esvPassageRequest(reference);
		const text = result?.passages?.[0];
		if (!text) throw new Error(`ESV returned no passage for "${reference}"`);
		return verseEmbed(text, result.passage_meta?.[0]?.canonical ?? reference, translation, { label });
	}

	const result = await bibleBrainGetPassage(BIBLE_BRAIN_BIBLES[translation], reference);
	if (result.error || !result.text) {
		throw new Error(`Bible Brain returned no passage for "${reference}": ${result.message ?? result.kind}`);
	}
	return verseEmbed(result.text, result.reference ?? reference, translation, { label });
}

/**
 * Posts the daily verse to a server's configured channel.
 *
 * The verse is chosen from the server's local date at `at`, so a server
 * posting at 7am in Tokyo gets that day's verse rather than yesterday's UTC verse.
 *
 * @param {import('discord.js').Client} client - Discord client
 * @param {string} guildId - Discord guild ID
 * @param {import('./guild_settings').DailyVerseSettings} settings - Daily verse settings
 * @param {Date} [at=new Date()] - The scheduled time of the post
 * @returns {Promise<import('discord.js').Message>} The sent message
 */
async function postDailyVerse(client, guildId, settings, at = new Date()) {
	const local = getZonedParts(at, settings.timezone);
	const reference = getDailyVerseReference(new Date(Date.UTC(local.year, local.month - 1, local.day)));
	const dateLabel = new Intl.DateTimeFormat('en-US', {
		timeZone: settings.timezone,
		weekday: 'long',
		month: 'long',
		day: 'numeric',
	}).format(at);

	const embed = await buildPassageEmbed(
		reference,
		settings.translation,
		`☀️ Verse of the Day · ${dateLabel}`,
	);

	const channel = await client.channels.fetch(settings.channelId);
	if (!channel?.isSendable()) {
		throw new Error(`Channel ${settings.channelId} is not a sendable channel`);
	}

	const message = await channel.send({ embeds: [embed] });
	await markDailyVersePosted(guildId, new Date());
	return message;
}

/**
 * Handles one due server: claims the slot, moves the schedule forward, then posts.
 *
 * @param {import('discord.js').Client} client - Discord client
 * @param {{guildId: string, dailyVerse: Object}} doc - Guild settings document
 * @param {Date} now - Current time
 * @returns {Promise<void>}
 */
async function processDueGuild(client, { guildId, dailyVerse: settings }, now) {
	const scheduledAt = settings.nextPostAt;
	const next = nextOccurrence(now, settings.hour, settings.minute, settings.timezone);
	if (!(await claimDailyVerse(guildId, scheduledAt, next))) return;

	if (now - scheduledAt > LATE_GRACE_MS) {
		console.log(`[INFO] Skipped late daily verse for guild ${guildId} (was due ${scheduledAt.toISOString()})`);
		return;
	}

	try {
		await postDailyVerse(client, guildId, settings, scheduledAt);
	}
	catch (error) {
		if (CHANNEL_GONE_CODES.has(error?.code)) {
			console.log(`[INFO] Daily verse channel for guild ${guildId} no longer exists; removing schedule.`);
			await clearDailyVerseSettings(guildId);
			return;
		}
		console.error(`[ERROR] Failed to post daily verse for guild ${guildId}:`, error);
	}
}

/**
 * Checks for and posts any due daily verses.
 *
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<void>}
 */
async function postDueDailyVerses(client) {
	if (ticking) return;
	ticking = true;
	try {
		const now = new Date();
		const due = await findDueDailyVerses(now);
		for (const doc of due) {
			// Leave servers the bot isn't in (or can't see right now) for later.
			if (!client.guilds.cache.has(doc.guildId)) continue;
			await processDueGuild(client, doc, now);
		}
	}
	catch (error) {
		console.error('[ERROR] Daily verse scheduler tick failed:', error);
	}
	finally {
		ticking = false;
	}
}

/**
 * Starts the scheduler, aligned to the start of each minute.
 *
 * @param {import('discord.js').Client} client - Discord client
 */
function startDailyVerseScheduler(client) {
	const delay = TICK_MS - (Date.now() % TICK_MS);
	setTimeout(() => {
		postDueDailyVerses(client);
		setInterval(() => postDueDailyVerses(client), TICK_MS);
	}, delay);
}

module.exports = {
	startDailyVerseScheduler,
	postDueDailyVerses,
	postDailyVerse,
};
