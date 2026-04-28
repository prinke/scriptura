/**
 * Verse Command - Bible Verse Retrieval and Search
 *
 * This command provides comprehensive Bible verse lookup functionality with:
 * - Direct verse references (e.g., "John 3:16")
 * - Passage ranges (e.g., "Romans 8:1-11")
 * - Phrase-based search (e.g., "love your neighbor")
 * - Multiple translations support (23+ Bible versions)
 * - Paginated search results
 * - Daily verse feature (planned)
 *
 * @module commands/verses/verse
 */

const {
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
} = require('discord.js');

const {
	esvPassageRequest,
	esvSearchRequest,
} = require('../../helpers/esv_api_request.js');
const verseEmbed = require('../../helpers/verse_embed.js');
const {
	bibleBrainResolveQuery,
	bibleBrainSearch,
} = require('../../helpers/biblebrain_request.js');
const {
	BIBLE_BRAIN_BIBLES,
	translationChoices,
	DEFAULT_TRANSLATION,
	isValidTranslation,
} = require('../../helpers/translations');
const {
	getPreferredTranslation,
	getVerseDisplayPreferences,
} = require('../../helpers/user_preferences');
const { getDailyVerseReference } = require('../../helpers/daily_verse');


const data = new SlashCommandBuilder()
	.setName('verse')
	.setDescription('Get Bible verses or search for phrases')
	.setIntegrationTypes([
		ApplicationIntegrationType.GuildInstall,
		ApplicationIntegrationType.UserInstall,
	])
	.setContexts([
		InteractionContextType.Guild,
		InteractionContextType.PrivateChannel,
		InteractionContextType.BotDM,
	])
	.addSubcommand((subcommand) =>
		subcommand
			.setName('search')
			.setDescription('Search for a verse or phrase')
			.addStringOption((option) =>
				option
					.setName('query')
					.setDescription(
						'A Bible reference (e.g., John 3:16) or a phrase (e.g., in love)',
					)
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName('translation')
					.setDescription('Bible translation to use')
					.addChoices(...translationChoices)
					.setRequired(false),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand.setName('daily').setDescription('Get the daily verse'),
	);

/** @constant {number} Maximum number of search results per page */
const MAX_SEARCH_FIELDS = 10;

/** @constant {number} Pagination button timeout (2 minutes) */
const PAGINATION_TIMEOUT_MS = 2 * 60 * 1000;

/** @constant {Object} Flag for ephemeral (private) Discord replies */
const EPHEMERAL_REPLY = { flags: MessageFlags.Ephemeral };

const DEFAULT_DISPLAY_PREFS = {
	footnotes: false,
	headings: 'auto',
	verseNumbers: true,
	lineByLine: 'auto',
};

function resolveToggle(setting, defaultValue) {
	if (setting === 'on') return true;
	if (setting === 'off') return false;
	return defaultValue;
}

/**
 * Builds a formatted error message with contextual details.
 *
 * Creates a user-friendly error message that includes relevant context
 * like the query, translation, and helpful hints. Details are formatted
 * as a subtle footer using Discord's -# markdown syntax.
 *
 * @param {string} content - Main error message
 * @param {Object} [details={}] - Optional contextual information
 * @param {string} [details.query] - The verse query that failed
 * @param {string} [details.translation] - The Bible translation used
 * @param {string} [details.hint] - Additional helpful information
 * @returns {string} Formatted error message
 */
function buildErrorMessage(content, { query, translation, hint } = {}) {
	const details = [];
	if (query) details.push(`Query: ${query}`);
	if (translation) details.push(`Translation: ${translation}`);
	if (hint) details.push(hint);
	if (details.length === 0) return content;
	return `${content}\n-# ${details.join(' • ')}`;
}

/**
 * Sends an ephemeral error reply to a Discord interaction.
 *
 * Convenience wrapper around interaction.reply that sends
 * an error message visible only to the user who triggered the command.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {string} content - Error message to display
 * @param {Object} [details] - Optional details (passed to buildErrorMessage)
 * @returns {Promise<void>}
 */
function replyError(interaction, content, details) {
	return interaction.reply({
		content: buildErrorMessage(content, details),
		...EPHEMERAL_REPLY,
	});
}

/**
 * Resolves the translation to use for a request.
 *
 * Priority:
 * 1) Explicit translation provided by the user
 * 2) User preference stored in MongoDB
 * 3) Default translation (ESV)
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {string|null} explicitTranslation - Translation option provided by user
 * @returns {Promise<string>} Resolved translation code
 */
async function resolveTranslation(interaction, explicitTranslation) {
	if (isValidTranslation(explicitTranslation)) return explicitTranslation;

	try {
		const preferred = await getPreferredTranslation(interaction.user.id);
		if (isValidTranslation(preferred)) return preferred;
	}
	catch (error) {
		console.error('[ERROR] Failed to load user translation preference:', error);
	}

	return DEFAULT_TRANSLATION;
}

/**
 * Formats a range of results as a human-readable string.
 *
 * Examples:
 * - formatRange(0, 0) => "0"
 * - formatRange(0, 5) => "1-5"
 * - formatRange(10, 5) => "11-15"
 *
 * @param {number} start - Zero-based start index
 * @param {number} count - Number of items in range
 * @returns {string} Formatted range (e.g., "1-10" or "0")
 */
function formatRange(start, count) {
	if (count === 0) return '0';
	return `${start + 1}-${start + count}`;
}

/**
 * Builds a Discord embed for Bible Brain search results.
 *
 * Creates a paginated embed displaying Bible search results with:
 * - Query and translation information
 * - Individual verse fields (up to MAX_SEARCH_FIELDS)
 * - Page number and result count in footer
 * - Automatic text truncation for long verses
 *
 * @param {Object} data - Search result data
 * @param {string} data.query - The search query
 * @param {Array<{reference: string, text: string}>} data.verses - Array of verse results
 * @param {number} [data.total] - Total number of results
 * @param {string} translation - Bible translation code
 * @param {number} page - Current page number (0-indexed)
 * @param {number} pageSize - Number of results per page
 * @param {number} totalPages - Total number of pages
 * @returns {EmbedBuilder} Discord embed with search results
 */
function buildSearchResultsEmbed(
	{ query, verses, total },
	translation,
	page,
	pageSize,
	totalPages,
) {
	const start = page * pageSize;
	const pageVerses = verses;
	const embed = new EmbedBuilder()
		.setTitle(`Search results: "${query}"`)
		.setDescription(`Translation: **${translation}**`);

	if (totalPages > 1) {
		embed.setFooter({
			text:
        typeof total === 'number'
        	? `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageVerses.length)} of ${total} results`
        	: `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageVerses.length)} results`,
		});
	}

	for (const verse of pageVerses) {
		const value = (verse.text || '').trim();
		embed.addFields({
			name: verse.reference || 'Result',
			value:
        value.length > 1024 ? value.slice(0, 1021) + '…' : value || '(no text)',
		});
	}

	return embed;
}

/**
 * Builds a Discord embed for ESV API search results.
 *
 * Similar to buildSearchResultsEmbed but tailored for ESV API response format.
 * Handles ESV-specific data structure where results may have 'content' instead of 'text'.
 *
 * @param {Object} data - ESV search result data
 * @param {Array<{reference: string, content?: string, text?: string}>} data.results - ESV search hits
 * @param {number} [data.total] - Total number of ESV results
 * @param {string} translation - Bible translation code (should be 'ESV')
 * @param {string} query - The search query
 * @param {number} page - Current page number (0-indexed)
 * @param {number} pageSize - Number of results per page
 * @param {number} totalPages - Total number of pages
 * @returns {EmbedBuilder} Discord embed with ESV search results
 */
function buildEsvSearchResultsEmbed(
	{ results, total },
	translation,
	query,
	page,
	pageSize,
	totalPages,
) {
	const start = page * pageSize;
	const pageResults = results || [];
	const embed = new EmbedBuilder()
		.setTitle(`Search results: "${query}"`)
		.setDescription(`Translation: **${translation}**`);

	if (totalPages > 1) {
		embed.setFooter({
			text:
        typeof total === 'number'
        	? `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageResults.length)} of ${total} results`
        	: `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageResults.length)} results`,
		});
	}

	for (const hit of pageResults) {
		const value = (hit.content || hit.text || '').trim();
		embed.addFields({
			name: hit.reference || 'Result',
			value:
        value.length > 1024 ? value.slice(0, 1021) + '…' : value || '(no text)',
		});
	}

	return embed;
}

/**
 * Sends paginated search results with interactive navigation buttons.
 *
 * This function handles the complete pagination lifecycle:
 * 1. Fetches and displays the first page of results
 * 2. Adds Previous/Next buttons if multiple pages exist
 * 3. Handles button clicks to navigate between pages
 * 4. Disables buttons after timeout or when reaching boundaries
 *
 * The fetchPage callback is called dynamically as users navigate,
 * allowing for on-demand data fetching.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {Object} config - Pagination configuration
 * @param {number} config.pageSize - Number of results per page
 * @param {Function} config.fetchPage - Async function that returns page data
 * @param {Object} config.errorDetails - Error context for debugging
 * @returns {Promise<void>}
 */
async function sendPaginatedSearch(interaction, { pageSize, fetchPage, errorDetails }) {
	let page = 0;
	let totalItems = null;
	let totalPages = 1;

	const prevId = `verse_prev_${interaction.id}`;
	const nextId = `verse_next_${interaction.id}`;

	const buildRow = () =>
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(prevId)
				.setLabel('Previous')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === 0),
			new ButtonBuilder()
				.setCustomId(nextId)
				.setLabel('Next')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page >= totalPages - 1),
		);

	const first = await fetchPage(0);
	if (first.error) {
		return replyError(
			interaction,
			'There was an error while executing this command!',
			errorDetails,
		);
	}

	if (!first.hasResults) {
		return replyError(interaction, 'No results found.', errorDetails);
	}

	if (typeof first.totalItems === 'number') {
		totalItems = first.totalItems;
		totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	}

	const message = await interaction.reply({
		embeds: [first.embed],
		components: totalPages > 1 ? [buildRow()] : [],
	});

	if (totalPages <= 1) return;

	const collector = message.createMessageComponentCollector({
		time: PAGINATION_TIMEOUT_MS,
		filter: (i) =>
			i.user.id === interaction.user.id && (i.customId === prevId || i.customId === nextId),
	});

	const updatePage = async (newPage, i) => {
		const res = await fetchPage(newPage);
		if (res.error) {
			await i.reply({
				content: buildErrorMessage(
					'There was an error while executing this command!',
					errorDetails,
				),
				...EPHEMERAL_REPLY,
			});
			return;
		}

		if (typeof res.totalItems === 'number') {
			totalItems = res.totalItems;
			totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
		}

		page = newPage;
		await i.update({
			embeds: [res.embed],
			components: [buildRow()],
		});
	};

	collector.on('collect', async (i) => {
		if (i.customId === prevId) {
			await updatePage(Math.max(0, page - 1), i);
		}
		else if (i.customId === nextId) {
			await updatePage(Math.min(totalPages - 1, page + 1), i);
		}
	});

	collector.on('end', async () => {
		if (totalPages <= 1) return;
		const row = buildRow();
		row.components.forEach((component) => component.setDisabled(true));
		await message.edit({ components: [row] });
	});
}

/**
 * Handles Bible verse lookups using the ESV API.
 *
 * Processing flow:
 * 1. Try to fetch the query as a direct passage reference
 * 2. If passage found, return the verse(s) as an embed
 * 3. If no passage found, fall back to phrase-based search
 * 4. Display search results with pagination if multiple hits
 *
 * The ESV API is used only for the ESV translation. All other
 * translations use Bible Brain.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {string} verseQuery - Bible reference or search phrase
 * @param {string} translation - Translation code (should be 'ESV')
 * @returns {Promise<void>}
 */
async function handleEsv(interaction, verseQuery, translation, displayPrefs) {
	let passageResult;
	try {
		const includeFootnotes = displayPrefs?.footnotes === true;
		const includeHeadings = resolveToggle(displayPrefs?.headings, false);
		passageResult = await esvPassageRequest(verseQuery, {
			includeFootnotes,
			includeHeadings,
		});
	}
	catch (error) {
		console.error('ESV passage request failed:', error);
		return replyError(
			interaction,
			'There was an error while executing this command!',
			{ query: verseQuery, translation, hint: 'ESV passage request failed.' },
		);
	}

	if (passageResult?.passages && passageResult.passages.length > 0) {
		const embed = await verseEmbed(
			passageResult.passages[0],
			passageResult.passage_meta?.[0]?.canonical ?? verseQuery,
			translation,
		);

		return interaction.reply({ embeds: [embed] });
	}

	let searchResult;
	try {
		searchResult = await esvSearchRequest(verseQuery);
	}
	catch (error) {
		console.error('ESV search request failed:', error);
		return replyError(
			interaction,
			'There was an error while executing this command!',
			{ query: verseQuery, translation, hint: 'ESV search request failed.' },
		);
	}

	if (!searchResult?.results || searchResult.results.length === 0) {
		return replyError(interaction, 'No results found.', {
			query: verseQuery,
			translation,
		});
	}

	return sendPaginatedSearch(interaction, {
		pageSize: MAX_SEARCH_FIELDS,
		errorDetails: {
			query: verseQuery,
			translation,
			hint: 'ESV search request failed.',
		},
		fetchPage: async (page) => {
			try {
				const pageNumber = page + 1;
				const res = await esvSearchRequest(verseQuery, {
					page: pageNumber,
					pageSize: MAX_SEARCH_FIELDS,
				});

				const totalItems =
          typeof res?.total_results === 'number' ? res.total_results : null;
				const results = Array.isArray(res?.results) ? res.results : [];
				const totalPages =
          typeof totalItems === 'number'
          	? Math.max(1, Math.ceil(totalItems / MAX_SEARCH_FIELDS))
          	: 1;

				return {
					error: false,
					hasResults: results.length > 0,
					totalItems,
					embed: buildEsvSearchResultsEmbed(
						{ results, total: totalItems },
						translation,
						verseQuery,
						page,
						MAX_SEARCH_FIELDS,
						totalPages,
					),
				};
			}
			catch (error) {
				console.error('ESV search request failed:', error);
				return { error: true };
			}
		},
	});
}

/**
 * Handles Bible verse lookups using Bible Brain.
 *
 * This function is used for all non-ESV translations. It leverages
 * the bibleBrainResolveQuery helper which intelligently determines
 * whether the query is a passage reference or a search phrase.
 *
 * Processing flow:
 * 1. Resolve the query using bibleBrainResolveQuery
 * 2. If 'passage' kind: Display the verse(s) directly
 * 3. If 'search' kind: Display paginated search results
 * 4. If 'empty' kind: Show "no results" message
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {string} verseQuery - Bible reference or search phrase
 * @param {string} translation - Translation code (e.g., 'KJV', 'NIV')
 * @returns {Promise<void>}
 */
async function handleBibleBrain(interaction, verseQuery, translation, displayPrefs) {
	const bibleConfig = BIBLE_BRAIN_BIBLES[translation];
	if (!bibleConfig) {
		return replyError(interaction, `Unsupported translation: ${translation}.`, {
			translation,
		});
	}

	const includeNotes = displayPrefs?.footnotes === true;
	const includeTitles = resolveToggle(displayPrefs?.headings, true);
	const includeVerseNumbers =
    typeof displayPrefs?.verseNumbers === 'boolean'
    	? displayPrefs.verseNumbers
    	: DEFAULT_DISPLAY_PREFS.verseNumbers;
	const lineByLine =
    typeof displayPrefs?.lineByLine === 'string'
    	? displayPrefs.lineByLine
    	: DEFAULT_DISPLAY_PREFS.lineByLine;

	const result = await bibleBrainResolveQuery(bibleConfig, verseQuery, {
		includeNotes,
		includeTitles,
		includeVerseNumbers,
		lineByLine,
	});

	if (result?.error) {
		return replyError(
			interaction,
			'There was an error while executing this command!',
			{ query: verseQuery, translation, hint: 'Bible Brain request failed.' },
		);
	}

	if (result.kind === 'empty') {
		return replyError(interaction, 'No results found.', {
			query: verseQuery,
			translation,
		});
	}

	if (result.kind === 'passage') {
		if (!result.text) {
			return replyError(
				interaction,
				'Verse found, but could not parse passage content.',
				{ query: verseQuery, translation, hint: 'Try a different translation.' },
			);
		}

		const embed = await verseEmbed(
			result.text,
			result.reference ?? verseQuery,
			translation,
		);
		return interaction.reply({ embeds: [embed] });
	}

	if (result.kind === 'search') {
		return sendPaginatedSearch(interaction, {
			pageSize: MAX_SEARCH_FIELDS,
			errorDetails: {
				query: verseQuery,
				translation,
				hint: 'Bible Brain search request failed.',
			},
			fetchPage: async (page) => {
				const offset = page * MAX_SEARCH_FIELDS;
				const res = await bibleBrainSearch(bibleConfig, verseQuery, {
					limit: MAX_SEARCH_FIELDS,
					offset,
				});

				if (res.error) {
					return { error: true };
				}

				const resultData = res.data?.data;
				const verses = Array.isArray(resultData?.verses) ? resultData.verses : [];
				const totalItems = typeof resultData?.total === 'number' ? resultData.total : null;
				const totalPages =
          typeof totalItems === 'number'
          	? Math.max(1, Math.ceil(totalItems / MAX_SEARCH_FIELDS))
          	: 1;

				return {
					error: false,
					hasResults: verses.length > 0,
					totalItems,
					embed: buildSearchResultsEmbed(
						{
							query: resultData?.query ?? verseQuery,
							verses: verses.map((v) => ({
								reference: v.reference,
								text: v.text,
							})),
							total: totalItems,
						},
						translation,
						page,
						MAX_SEARCH_FIELDS,
						totalPages,
					),
				};
			},
		});
	}

	return replyError(interaction, 'Unexpected response while searching.', {
		query: verseQuery,
		translation,
	});
}

/**
 * Main command execution handler for /verse slash command.
 *
 * Routes subcommands to their appropriate handlers:
 * - /verse search: Bible verse lookup or phrase search
 * - /verse daily: Daily verse feature (not yet implemented)
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord command interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	const subcommand = interaction.options.getSubcommand(false);
	if (!subcommand) {
		return replyError(
			interaction,
			'Please choose a subcommand: search or daily.',
			{ hint: 'Try /verse search with a reference or phrase.' },
		);
	}

	let displayPrefs = DEFAULT_DISPLAY_PREFS;
	try {
		displayPrefs = await getVerseDisplayPreferences(interaction.user.id);
	}
	catch (error) {
		console.error('[ERROR] Failed to load user display preferences:', error);
	}

	if (subcommand === 'daily') {
		const translation = await resolveTranslation(interaction, null);
		const verseReference = getDailyVerseReference();
		if (translation === 'ESV') {
			return handleEsv(interaction, verseReference, translation, displayPrefs);
		}
		return handleBibleBrain(interaction, verseReference, translation, displayPrefs);
	}

	const verseQuery = interaction.options.getString('query');
	const explicitTranslation = interaction.options.getString('translation');
	const translation = await resolveTranslation(interaction, explicitTranslation);

	if (translation === 'ESV') {
		return handleEsv(interaction, verseQuery, translation, displayPrefs);
	}

	return handleBibleBrain(interaction, verseQuery, translation, displayPrefs);
}

module.exports = { data, execute };
