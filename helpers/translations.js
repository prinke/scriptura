/**
 * Translation Constants
 *
 * Centralized translation definitions used by commands and helpers.
 *
 * @module helpers/translations
 */

/** @constant {string} Default Bible translation when none is specified */
const DEFAULT_TRANSLATION = 'ESV';

/**
 * Mapping of user-facing translation codes to Bible Brain text filesets.
 *
 * IMPORTANT: Keep this list synchronized with the `translationChoices` array below.
 *
 * @constant {Object.<string, Object>}
 */
const BIBLE_BRAIN_BIBLES = {
	KJV: {
		bibleId: 'ENGKJV',
		filesets: { OT: 'ENGKJVO_ET', NT: 'ENGKJVN_ET' },
	},
	NKJV: {
		bibleId: 'ENGNKJV',
		filesets: { OT: 'ENGNKJO_ET', NT: 'ENGNKJN_ET' },
	},
	NASB: {
		bibleId: 'ENGNAS',
		filesets: { OT: 'ENGNASO_ET', NT: 'ENGNASN_ET' },
	},
	NLT: {
		bibleId: 'ENGNLT',
		filesets: { OT: 'ENGNLTO_ET', NT: 'ENGNLTN_ET' },
	},
	ASV: {
		bibleId: 'ENGASV',
		filesets: { C: 'ENGASV' },
	},
};

/**
 * Available Bible translations for the slash command.
 *
 * @constant {Array<{name: string, value: string}>}
 */
const translationChoices = [
	{ name: 'ESV (English Standard Version) 🇬🇧', value: 'ESV' },
	{ name: 'NKJV (New King James Version) 🇬🇧', value: 'NKJV' },
	{ name: 'KJV (King James (Authorized) Version) 🇬🇧', value: 'KJV' },
	{ name: 'NASB (New American Standard Bible) 🇬🇧', value: 'NASB' },
	{ name: 'NLT (New Living Translation) 🇬🇧', value: 'NLT' },
	{ name: 'ASV (American Standard Version) 🇬🇧', value: 'ASV' },
];

/**
 * Validates a translation code against supported options.
 *
 * @param {string} translation - Translation code to validate
 * @returns {boolean} True if translation is supported
 */
function isValidTranslation(translation) {
	if (!translation) return false;
	if (translation === 'ESV') return true;
	return Boolean(BIBLE_BRAIN_BIBLES[translation]);
}

module.exports = {
	BIBLE_BRAIN_BIBLES,
	translationChoices,
	DEFAULT_TRANSLATION,
	isValidTranslation,
};
