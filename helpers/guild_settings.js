/**
 * Guild Settings Store
 *
 * Handles persistence for server-wide settings, currently the
 * scheduled daily verse channel.
 *
 * @module helpers/guild_settings
 */

const { getDb } = require('./mongo');

const COLLECTION_NAME = 'guild_settings';

/**
 * @typedef {Object} DailyVerseSettings
 * @property {string} channelId - Channel to post in
 * @property {number} hour - Local hour (0-23)
 * @property {number} minute - Local minute (0-59)
 * @property {string} timezone - IANA time zone
 * @property {string} translation - Translation code
 * @property {Date} nextPostAt - Next scheduled post (UTC)
 * @property {Date|null} [lastPostedAt] - Last successful post
 * @property {string} [updatedBy] - User ID of the admin who last changed it
 */

/**
 * Retrieves a guild's daily verse settings.
 *
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<DailyVerseSettings|null>} Settings, or null if not configured
 */
async function getDailyVerseSettings(guildId) {
	const db = getDb();
	const doc = await db.collection(COLLECTION_NAME).findOne({ guildId });
	return doc?.dailyVerse ?? null;
}

/**
 * Saves a guild's daily verse settings, replacing any existing ones.
 *
 * @param {string} guildId - Discord guild ID
 * @param {DailyVerseSettings} settings - Settings to save
 * @returns {Promise<void>}
 */
async function setDailyVerseSettings(guildId, settings) {
	const db = getDb();
	await db.collection(COLLECTION_NAME).updateOne(
		{ guildId },
		{
			$set: {
				dailyVerse: { lastPostedAt: null, ...settings },
				updatedAt: new Date(),
			},
		},
		{ upsert: true },
	);
}

/**
 * Removes a guild's daily verse settings.
 *
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<boolean>} True if settings existed
 */
async function clearDailyVerseSettings(guildId) {
	const db = getDb();
	const result = await db.collection(COLLECTION_NAME).updateOne(
		{ guildId, dailyVerse: { $exists: true } },
		{
			$unset: { dailyVerse: '' },
			$set: { updatedAt: new Date() },
		},
	);
	return result.modifiedCount > 0;
}

/**
 * Finds guilds whose daily verse is due.
 *
 * @param {Date} now - Current time
 * @returns {Promise<Array<{guildId: string, dailyVerse: DailyVerseSettings}>>} Due guilds
 */
async function findDueDailyVerses(now) {
	const db = getDb();
	return db
		.collection(COLLECTION_NAME)
		.find(
			{ 'dailyVerse.nextPostAt': { $lte: now } },
			{ projection: { guildId: 1, dailyVerse: 1 } },
		)
		.toArray();
}

/**
 * Atomically moves a guild's schedule forward so only one worker posts it.
 *
 * @param {string} guildId - Discord guild ID
 * @param {Date} expectedNextPostAt - The nextPostAt value the caller saw
 * @param {Date} nextPostAt - The new nextPostAt value
 * @returns {Promise<boolean>} True if this caller claimed the post
 */
async function claimDailyVerse(guildId, expectedNextPostAt, nextPostAt) {
	const db = getDb();
	const result = await db.collection(COLLECTION_NAME).updateOne(
		{ guildId, 'dailyVerse.nextPostAt': expectedNextPostAt },
		{ $set: { 'dailyVerse.nextPostAt': nextPostAt } },
	);
	return result.modifiedCount > 0;
}

/**
 * Records a successful daily verse post.
 *
 * @param {string} guildId - Discord guild ID
 * @param {Date} postedAt - When the post was sent
 * @returns {Promise<void>}
 */
async function markDailyVersePosted(guildId, postedAt) {
	const db = getDb();
	await db.collection(COLLECTION_NAME).updateOne(
		{ guildId },
		{ $set: { 'dailyVerse.lastPostedAt': postedAt } },
	);
}

module.exports = {
	getDailyVerseSettings,
	setDailyVerseSettings,
	clearDailyVerseSettings,
	findDueDailyVerses,
	claimDailyVerse,
	markDailyVersePosted,
};
