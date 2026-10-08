/**
 * UI Helpers
 *
 * Shared colors and embed builders so every bot response has a consistent look.
 *
 * @module helpers/ui
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');

/** @constant {Object.<string, number>} Embed accent colors */
const COLORS = Object.freeze({
	brand: 0x2F5233,
	error: 0xB33A3A,
	muted: 0x4F545C,
});

/** @constant {string} Public status page for the bot */
const STATUS_URL = 'https://status.prinke.dev/status/scriptura';

/**
 * Truncates text to a maximum length, appending an ellipsis when cut.
 *
 * @param {string} text - Text to truncate
 * @param {number} max - Maximum length including the ellipsis
 * @returns {string} Truncated text
 */
function truncate(text, max) {
	const value = String(text ?? '');
	return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/**
 * Builds a BibleGateway link for a reference.
 *
 * @param {string} reference - Bible reference (e.g., "John 3:16")
 * @param {string} translation - Translation code
 * @returns {string} BibleGateway URL
 */
function bibleGatewayUrl(reference, translation) {
	return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${translation}`;
}

/**
 * Builds a compact error embed.
 *
 * @param {string} title - Short error headline
 * @param {Object} [details={}] - Optional context
 * @param {string} [details.description] - Longer explanation
 * @param {string} [details.query] - The query that failed
 * @param {string} [details.translation] - The translation used
 * @param {string} [details.hint] - Suggestion for the user
 * @param {boolean} [details.status] - Link the status page (for outages, not user mistakes)
 * @returns {EmbedBuilder} Error embed
 */
function errorEmbed(title, { description, query, translation, hint, status } = {}) {
	const embed = new EmbedBuilder().setColor(COLORS.error).setTitle(title);

	const lines = [];
	if (description) lines.push(description);
	if (hint) lines.push(`-# ${hint}`);
	if (status) lines.push(`-# Check the [status page](${STATUS_URL}) for ongoing issues.`);
	if (lines.length) embed.setDescription(lines.join('\n'));

	const meta = [];
	if (query) meta.push(`“${truncate(query, 80)}”`);
	if (translation) meta.push(translation);
	if (meta.length) embed.setFooter({ text: meta.join(' · ') });

	return embed;
}

/**
 * Builds an ephemeral reply payload containing an error embed.
 *
 * @param {string} title - Short error headline
 * @param {Object} [details] - Passed to errorEmbed
 * @returns {Object} Reply options
 */
function errorReply(title, details) {
	return { embeds: [errorEmbed(title, details)], flags: MessageFlags.Ephemeral };
}

module.exports = {
	COLORS,
	STATUS_URL,
	truncate,
	bibleGatewayUrl,
	errorEmbed,
	errorReply,
};
