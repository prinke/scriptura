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
	TRANSLATION_NAMES,
	DEFAULT_TRANSLATION,
	isValidTranslation,
} = require('../../helpers/translations');
const {
	getPreferredTranslation,
	getVerseDisplayPreferences,
} = require('../../helpers/user_preferences');
const { getDailyVerseReference } = require('../../helpers/daily_verse');
const {
	COLORS,
	truncate,
	bibleGatewayUrl,
	errorReply,
} = require('../../helpers/ui');


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

/** @constant {number} Maximum characters shown per search result */
const MAX_RESULT_LENGTH = 300;

/** @constant {number} Pagination button timeout (2 minutes) */
const PAGINATION_TIMEOUT_MS = 2 * 60 * 1000;

const DEFAULT_DISPLAY_PREFS = {
	footnotes: false,
	headings: 'auto',
	verseNumbers: true,
	lineByLine: 'auto',
};

/** @constant {string} Generic failure headline shown to users */
const GENERIC_ERROR = 'Something went wrong';

function resolveToggle(setting, defaultValue) {
	if (setting === 'on') return true;
	if (setting === 'off') return false;
	return defaultValue;
}

/**
 * Sends an ephemeral error embed in reply to a Discord interaction.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {string} title - Short error headline
 * @param {Object} [details] - Optional details (passed to errorEmbed)
 * @returns {Promise<void>}
 */
async function replyError(interaction, title, details) {
	if (!interaction.deferred) return interaction.reply(errorReply(title, details));

	// The deferred placeholder is public; swap it for an ephemeral error
	await interaction.deleteReply().catch(() => {});
	return interaction.followUp(errorReply(title, details));
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
 * Builds a Discord embed for a page of search results.
 *
 * Each result is shown as a linked reference followed by the verse text,
 * with page and total counts in the footer.
 *
 * @param {Object} data - Search result data
 * @param {string} data.query - The search query
 * @param {Array<{reference: string, text: string}>} data.results - Results on this page
 * @param {number|null} data.total - Total number of results, if known
 * @param {string} data.translation - Bible translation code
 * @param {number} data.page - Current page number (0-indexed)
 * @param {number} data.totalPages - Total number of pages
 * @returns {EmbedBuilder} Discord embed with search results
 */
function buildSearchResultsEmbed({ query, results, total, translation, page, totalPages }) {
	const description = results
		.map(({ reference, text }) => {
			const ref = reference || 'Result';
			const body = truncate((text || '').replace(/\s+/g, ' ').trim(), MAX_RESULT_LENGTH);
			return `**[${ref}](${bibleGatewayUrl(ref, translation)})**\n${body || '*No text*'}`;
		})
		.join('\n\n');

	const footer = [TRANSLATION_NAMES[translation] ?? translation];
	if (typeof total === 'number') footer.push(`${total} result${total === 1 ? '' : 's'}`);
	if (totalPages > 1) footer.push(`Page ${page + 1} of ${totalPages}`);

	return new EmbedBuilder()
		.setColor(COLORS.brand)
		.setTitle(`Search: “${truncate(query, 200)}”`)
		.setDescription(truncate(description, 4096))
		.setFooter({ text: footer.join(' · ') });
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
	let totalPages = 1;

	const prevId = `verse_prev_${interaction.id}`;
	const nextId = `verse_next_${interaction.id}`;
	const pageId = `verse_page_${interaction.id}`;

	const buildRow = (disabled = false) =>
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(prevId)
				.setEmoji('◀️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(disabled || page === 0),
			new ButtonBuilder()
				.setCustomId(pageId)
				.setLabel(`${page + 1} / ${totalPages}`)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true),
			new ButtonBuilder()
				.setCustomId(nextId)
				.setEmoji('▶️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(disabled || page >= totalPages - 1),
		);

	const first = await fetchPage(0);
	if (first.error) {
		return replyError(interaction, GENERIC_ERROR, { ...errorDetails, status: true });
	}

	if (!first.hasResults) {
		return replyError(interaction, 'No results found', {
			...errorDetails,
			hint: 'Try a different phrase or check the spelling.',
		});
	}

	if (typeof first.totalItems === 'number') {
		totalPages = Math.max(1, Math.ceil(first.totalItems / pageSize));
	}

	const message = await interaction.editReply({
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
			await i.reply(errorReply(GENERIC_ERROR, { ...errorDetails, status: true }));
			return;
		}

		if (typeof res.totalItems === 'number') {
			totalPages = Math.max(1, Math.ceil(res.totalItems / pageSize));
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
		await message.edit({ components: [buildRow(true)] }).catch((error) => {
			console.error('[ERROR] Failed to disable pagination buttons:', error);
		});
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
async function handleEsv(interaction, verseQuery, translation, displayPrefs, embedOptions) {
	let passageResult;
	try {
		const includeFootnotes = displayPrefs?.footnotes === true;
		const includeHeadings = resolveToggle(displayPrefs?.headings, false);
		const includeVerseNumbers = displayPrefs?.verseNumbers !== false;
		passageResult = await esvPassageRequest(verseQuery, {
			includeFootnotes,
			includeHeadings,
			includeVerseNumbers,
		});
	}
	catch (error) {
		console.error('ESV passage request failed:', error);
		return replyError(interaction, GENERIC_ERROR, {
			description: 'Couldn’t reach the ESV API. Please try again in a moment.',
			query: verseQuery,
			translation,
			status: true,
		});
	}

	if (passageResult?.passages && passageResult.passages.length > 0) {
		const embed = await verseEmbed(
			passageResult.passages[0],
			passageResult.passage_meta?.[0]?.canonical ?? verseQuery,
			translation,
			embedOptions,
		);

		return interaction.editReply({ embeds: [embed] });
	}

	let searchResult;
	try {
		searchResult = await esvSearchRequest(verseQuery);
	}
	catch (error) {
		console.error('ESV search request failed:', error);
		return replyError(interaction, GENERIC_ERROR, {
			description: 'Couldn’t reach the ESV API. Please try again in a moment.',
			query: verseQuery,
			translation,
			status: true,
		});
	}

	if (!searchResult?.results || searchResult.results.length === 0) {
		return replyError(interaction, 'No results found', {
			query: verseQuery,
			translation,
			hint: 'Try a reference like “John 3:16” or a different phrase.',
		});
	}

	return sendPaginatedSearch(interaction, {
		pageSize: MAX_SEARCH_FIELDS,
		errorDetails: { query: verseQuery, translation },
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
					embed: buildSearchResultsEmbed({
						query: verseQuery,
						results: results.map((hit) => ({
							reference: hit.reference,
							text: hit.content || hit.text,
						})),
						total: totalItems,
						translation,
						page,
						totalPages,
					}),
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
async function handleBibleBrain(interaction, verseQuery, translation, displayPrefs, embedOptions) {
	const bibleConfig = BIBLE_BRAIN_BIBLES[translation];
	if (!bibleConfig) {
		return replyError(interaction, 'Unsupported translation', { translation });
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
		console.error(`[ERROR] Bible Brain (${translation} / "${verseQuery}"):`, result.message, result.status ?? '');
		return replyError(interaction, GENERIC_ERROR, {
			description: 'Couldn’t reach Bible Brain. Please try again in a moment.',
			query: verseQuery,
			translation,
			status: true,
		});
	}

	if (result.kind === 'empty') {
		return replyError(interaction, 'No results found', {
			query: verseQuery,
			translation,
			hint: 'Try a reference like “John 3:16” or a different phrase.',
		});
	}

	if (result.kind === 'passage') {
		if (!result.text) {
			return replyError(interaction, 'Couldn’t read that passage', {
				query: verseQuery,
				translation,
				hint: 'Try a different translation.',
			});
		}

		const embed = await verseEmbed(
			result.text,
			result.reference ?? verseQuery,
			translation,
			embedOptions,
		);
		return interaction.editReply({ embeds: [embed] });
	}

	if (result.kind === 'search') {
		return sendPaginatedSearch(interaction, {
			pageSize: MAX_SEARCH_FIELDS,
			errorDetails: { query: verseQuery, translation },
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
					embed: buildSearchResultsEmbed({
						query: resultData?.query ?? verseQuery,
						results: verses.map((v) => ({
							reference: v.reference,
							text: v.text,
						})),
						total: totalItems,
						translation,
						page,
						totalPages,
					}),
				};
			},
		});
	}

	return replyError(interaction, GENERIC_ERROR, {
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
		return replyError(interaction, 'Choose a subcommand', {
			hint: 'Try /verse search with a reference or phrase, or /verse daily.',
		});
	}

	// Mongo + API lookups can exceed Discord's 3s window, so acknowledge first
	await interaction.deferReply();

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
		const embedOptions = { label: '☀️ Verse of the Day' };
		if (translation === 'ESV') {
			return handleEsv(interaction, verseReference, translation, displayPrefs, embedOptions);
		}
		return handleBibleBrain(interaction, verseReference, translation, displayPrefs, embedOptions);
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
