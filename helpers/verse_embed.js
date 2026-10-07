/**
 * Verse Embed Builder
 *
 * Utility for creating standardized Discord embeds for Bible verses.
 * Formats verses with superscript verse numbers, separates footnotes,
 * and links the reference to BibleGateway.
 *
 * @module helpers/verse_embed
 */

const { EmbedBuilder } = require('discord.js');
const { TRANSLATION_NAMES } = require('./translations');
const { COLORS, truncate, bibleGatewayUrl } = require('./ui');

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/**
 * Converts a number to Unicode superscript digits (e.g., 16 → ¹⁶).
 *
 * @param {string} digits - Digits to convert
 * @returns {string} Superscript digits
 */
function toSuperscript(digits) {
	return String(digits).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[d]);
}

/**
 * Cleans raw passage text for display.
 *
 * - Replaces "[16]" style verse numbers with superscript numbers
 * - Collapses runs of blank lines
 * - Splits a trailing ESV "Footnotes" section from the body and
 *   restyles its "(1)" markers as superscripts
 *
 * @param {string} text - Raw passage text
 * @returns {{ body: string, footnotes: string|null }} Formatted parts
 */
function formatPassage(text) {
	let body = String(text ?? '');
	let footnotes = null;

	const footnoteMatch = body.match(/\n\s*Footnotes\s*\n/);
	if (footnoteMatch) {
		footnotes = body.slice(footnoteMatch.index + footnoteMatch[0].length).trim();
		body = body.slice(0, footnoteMatch.index);
	}

	body = body
		.replace(/\[(\d+)\]\s*/g, (_, n) => `${toSuperscript(n)} `)
		.replace(/[ \t]+$/gm, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	if (footnotes) {
		// ESV marks footnotes inline as "(1)"; match them to the superscript style
		body = body.replace(/\((\d+)\)/g, (_, n) => toSuperscript(n));
		footnotes = footnotes
			.split(/\n+/)
			.map((line) => line.trim().replace(/^\((\d+)\)\s*/, (_, n) => `${toSuperscript(n)} `))
			.filter(Boolean)
			.join('\n');
	}

	return { body, footnotes };
}

/**
 * Builds a Discord embed for displaying a Bible verse.
 *
 * @param {string} verse - The verse text to display
 * @param {string} reference - Bible reference (e.g., "John 3:16", "Psalm 23:1-6")
 * @param {string} translation - Translation code (e.g., "ESV", "KJV")
 * @param {Object} [options={}] - Extra display options
 * @param {string} [options.label] - Small label shown above the title (e.g., "Verse of the Day")
 * @returns {Promise<EmbedBuilder>} Configured Discord embed builder
 *
 * @example
 * const embed = await verseEmbed(
 *   "For God so loved the world...",
 *   "John 3:16",
 *   "ESV"
 * );
 * await interaction.reply({ embeds: [embed] });
 */
async function verseEmbed(verse, reference, translation, { label } = {}) {
	const { body, footnotes } = formatPassage(verse);
	const translationName = TRANSLATION_NAMES[translation] ?? translation;

	const embed = new EmbedBuilder()
		.setColor(COLORS.brand)
		.setTitle(reference)
		.setURL(bibleGatewayUrl(reference, translation))
		// Discord embeds have a 4096 character limit for descriptions
		.setDescription(truncate(body || '*No text returned.*', 4096))
		.setFooter({ text: `${translationName} (${translation})` });

	if (label) embed.setAuthor({ name: label });

	if (footnotes) {
		embed.addFields({ name: 'Footnotes', value: truncate(footnotes, 1024) });
	}

	return embed;
}

module.exports = verseEmbed;
