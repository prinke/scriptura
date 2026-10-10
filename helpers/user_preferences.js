/**
 * User Preferences Store
 * 
 * Handles persistence for user-specific settings (e.g., preferred translation).
 * 
 * @module helpers/user_preferences
 */

const { getDb } = require('./mongo');

const COLLECTION_NAME = 'user_preferences';

const DEFAULT_VERSE_DISPLAY = Object.freeze({
	footnotes: false,
	headings: 'auto',
	verseNumbers: true,
	lineByLine: 'auto',
});

/**
 * Retrieves a user's preferred translation.
 * 
 * @param {string} userId - Discord user ID
 * @returns {Promise<string|null>} Preferred translation code, or null if not set
 */
async function getPreferredTranslation(userId) {
	const db = await getDb();
	const doc = await db.collection(COLLECTION_NAME).findOne({ userId });
	return doc?.preferredTranslation ?? null;
}

/**
 * Retrieves a user's verse display preferences.
 *
 * @param {string} userId - Discord user ID
 * @returns {Promise<{footnotes: boolean, headings: 'auto'|'on'|'off', verseNumbers: boolean, lineByLine: 'auto'|'on'|'off'}>} Verse display preferences
 */
async function getVerseDisplayPreferences(userId) {
	const db = await getDb();
	const doc = await db.collection(COLLECTION_NAME).findOne({ userId });
	const stored = doc?.verseDisplay ?? {};
	return {
		...DEFAULT_VERSE_DISPLAY,
		...stored,
	};
}

/**
 * Sets a user's preferred translation.
 * 
 * @param {string} userId - Discord user ID
 * @param {string} translation - Translation code (e.g., 'ESV', 'KJV')
 * @returns {Promise<void>}
 */
async function setPreferredTranslation(userId, translation) {
	const db = await getDb();
	await db.collection(COLLECTION_NAME).updateOne(
		{ userId },
		{
			$set: {
				preferredTranslation: translation,
				updatedAt: new Date(),
			},
		},
		{ upsert: true },
	);
}

/**
 * Updates a user's verse display preferences.
 *
 * @param {string} userId - Discord user ID
 * @param {Object} updates - Partial preference updates
 * @returns {Promise<void>}
 */
async function setVerseDisplayPreferences(userId, updates) {
	const db = await getDb();
	const setPayload = {
		updatedAt: new Date(),
	};

	if (typeof updates.footnotes === 'boolean') {
		setPayload['verseDisplay.footnotes'] = updates.footnotes;
	}
	if (typeof updates.headings === 'string') {
		setPayload['verseDisplay.headings'] = updates.headings;
	}
	if (typeof updates.verseNumbers === 'boolean') {
		setPayload['verseDisplay.verseNumbers'] = updates.verseNumbers;
	}
	if (typeof updates.lineByLine === 'string') {
		setPayload['verseDisplay.lineByLine'] = updates.lineByLine;
	}

	await db.collection(COLLECTION_NAME).updateOne(
		{ userId },
		{
			$set: {
				...setPayload,
			},
		},
		{ upsert: true },
	);
}

/**
 * Resets a user's verse display preferences to defaults.
 *
 * @param {string} userId - Discord user ID
 * @returns {Promise<void>}
 */
async function resetVerseDisplayPreferences(userId) {
	const db = await getDb();
	await db.collection(COLLECTION_NAME).updateOne(
		{ userId },
		{
			$unset: {
				verseDisplay: '',
			},
			$set: {
				updatedAt: new Date(),
			},
		},
		{ upsert: true },
	);
}

module.exports = {
	getPreferredTranslation,
	setPreferredTranslation,
	getVerseDisplayPreferences,
	setVerseDisplayPreferences,
	resetVerseDisplayPreferences,
};
