/**
 * Preferences Command - Verse Display Settings
 *
 * Opens an interactive settings panel where users can pick their preferred
 * translation and toggle footnotes, headings, verse numbers, and
 * line-by-line formatting. Changes are saved as soon as they are made.
 *
 * @module commands/utility/preferences
 */

const {
	SlashCommandBuilder,
	InteractionContextType,
	ApplicationIntegrationType,
	MessageFlags,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	TextDisplayBuilder,
} = require('discord.js');

const {
	translationChoices,
	TRANSLATION_NAMES,
	DEFAULT_TRANSLATION,
	isValidTranslation,
} = require('../../helpers/translations');

const {
	getPreferredTranslation,
	setPreferredTranslation,
	getVerseDisplayPreferences,
	setVerseDisplayPreferences,
	resetVerseDisplayPreferences,
} = require('../../helpers/user_preferences');

const { COLORS, errorReply } = require('../../helpers/ui');

/** @constant {number} How long the panel stays interactive (5 minutes) */
const PANEL_TIMEOUT_MS = 5 * 60 * 1000;

/** @constant {string[]} Cycle order for three-state settings */
const TRI_STATE_ORDER = ['auto', 'on', 'off'];

/**
 * Settings shown in the panel, in display order.
 *
 * `boolean` settings flip between On and Off; `tri` settings cycle
 * through Auto → On → Off.
 */
const SETTINGS = [
	{
		key: 'footnotes',
		label: 'Footnotes',
		description: 'Show footnotes and study notes below the passage',
		type: 'boolean',
	},
	{
		key: 'verseNumbers',
		label: 'Verse numbers',
		description: 'Show a number before each verse',
		type: 'boolean',
	},
	{
		key: 'headings',
		label: 'Section headings',
		description: 'Auto shows headings where the translation provides them',
		type: 'tri',
	},
	{
		key: 'lineByLine',
		label: 'Line by line',
		description: 'Put each verse on its own line · Auto uses this for Psalms',
		type: 'tri',
	},
];

const data = new SlashCommandBuilder()
	.setName('preferences')
	.setDescription('Change how Bible verses are displayed')
	.setIntegrationTypes([
		ApplicationIntegrationType.GuildInstall,
		ApplicationIntegrationType.UserInstall,
	])
	.setContexts([
		InteractionContextType.Guild,
		InteractionContextType.PrivateChannel,
		InteractionContextType.BotDM,
	]);

/**
 * Loads the user's current translation and display preferences.
 *
 * @param {string} userId - Discord user ID
 * @returns {Promise<{translation: string, display: Object}>} Current preferences
 */
async function loadPreferences(userId) {
	const [preferred, display] = await Promise.all([
		getPreferredTranslation(userId),
		getVerseDisplayPreferences(userId),
	]);
	return {
		translation: isValidTranslation(preferred) ? preferred : DEFAULT_TRANSLATION,
		display,
	};
}

/**
 * Builds the toggle button for a single setting.
 *
 * @param {Object} setting - Entry from SETTINGS
 * @param {boolean|string} value - Current value
 * @param {string} customId - Button custom ID
 * @param {boolean} disabled - Whether the button is disabled
 * @returns {ButtonBuilder} Toggle button
 */
function buildToggleButton(setting, value, customId, disabled) {
	let label;
	let style;

	if (setting.type === 'boolean') {
		label = value ? 'On' : 'Off';
		style = value ? ButtonStyle.Success : ButtonStyle.Secondary;
	}
	else if (value === 'on') {
		label = 'On';
		style = ButtonStyle.Success;
	}
	else if (value === 'off') {
		label = 'Off';
		style = ButtonStyle.Secondary;
	}
	else {
		label = 'Auto';
		style = ButtonStyle.Primary;
	}

	return new ButtonBuilder()
		.setCustomId(customId)
		.setLabel(label)
		.setStyle(style)
		.setDisabled(disabled);
}

/**
 * Builds the full settings panel as a Components V2 container.
 *
 * @param {Object} prefs - Result of loadPreferences
 * @param {string} idPrefix - Prefix for component custom IDs
 * @param {Object} [options={}] - Panel state
 * @param {boolean} [options.expired=false] - Disable all controls
 * @param {string} [options.status] - Short status line shown at the bottom
 * @returns {ContainerBuilder} Settings panel
 */
function buildPanel(prefs, idPrefix, { expired = false, status } = {}) {
	const container = new ContainerBuilder()
		.setAccentColor(COLORS.brand)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				'## ⚙️ Preferences\nChoose how Scriptura shows Bible verses. Changes save instantly.',
			),
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`**Translation**\n-# Used by /verse unless you pick one. Currently ${TRANSLATION_NAMES[prefs.translation] ?? prefs.translation}.`,
			),
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${idPrefix}:translation`)
					.setPlaceholder('Choose a translation')
					.setDisabled(expired)
					.addOptions(
						translationChoices.map(({ value }) => ({
							label: value,
							description: TRANSLATION_NAMES[value] ?? value,
							value,
							default: value === prefs.translation,
						})),
					),
			),
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

	for (const setting of SETTINGS) {
		container.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`**${setting.label}**\n-# ${setting.description}`),
				)
				.setButtonAccessory(
					buildToggleButton(
						setting,
						prefs.display[setting.key],
						`${idPrefix}:${setting.key}`,
						expired,
					),
				),
		);
	}

	container
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`${idPrefix}:reset`)
					.setLabel('Reset display settings')
					.setStyle(ButtonStyle.Danger)
					.setDisabled(expired),
			),
		);

	const footer = expired
		? 'This menu has expired. Run /preferences again to make more changes.'
		: status;
	if (footer) {
		container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
	}

	return container;
}

/**
 * Applies a single panel interaction to the user's stored preferences.
 *
 * @param {import('discord.js').MessageComponentInteraction} i - Component interaction
 * @param {string} action - Setting key, "translation", or "reset"
 * @param {Object} current - Current preferences (from loadPreferences)
 * @returns {Promise<string>} Status line describing the change
 */
async function applyChange(i, action, current) {
	const userId = i.user.id;

	if (action === 'translation') {
		const translation = i.values[0];
		if (!isValidTranslation(translation)) throw new Error(`Invalid translation: ${translation}`);
		await setPreferredTranslation(userId, translation);
		return `Translation set to ${translation}.`;
	}

	if (action === 'reset') {
		await resetVerseDisplayPreferences(userId);
		return 'Display settings reset to defaults.';
	}

	const setting = SETTINGS.find((s) => s.key === action);
	if (!setting) throw new Error(`Unknown preference: ${action}`);

	const value = current.display[setting.key];
	const next = setting.type === 'boolean'
		? !value
		: TRI_STATE_ORDER[(TRI_STATE_ORDER.indexOf(value) + 1) % TRI_STATE_ORDER.length];

	await setVerseDisplayPreferences(userId, { [setting.key]: next });

	const label = next === true ? 'on' : next === false ? 'off' : next;
	return `${setting.label} set to ${label}.`;
}

/**
 * Execute the preferences command.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	const idPrefix = `prefs:${interaction.id}`;

	let prefs;
	try {
		prefs = await loadPreferences(interaction.user.id);
	}
	catch (error) {
		console.error('[ERROR] Failed to load preferences:', error);
		return interaction.reply(errorReply('Couldn’t load your preferences', {
			hint: 'Please try again in a moment.',
		}));
	}

	const response = await interaction.reply({
		components: [buildPanel(prefs, idPrefix)],
		flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
	});

	const collector = response.createMessageComponentCollector({
		idle: PANEL_TIMEOUT_MS,
		filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(`${idPrefix}:`),
	});

	collector.on('collect', async (i) => {
		const action = i.customId.slice(idPrefix.length + 1);
		try {
			const status = await applyChange(i, action, prefs);
			prefs = await loadPreferences(interaction.user.id);
			await i.update({ components: [buildPanel(prefs, idPrefix, { status: `✓ ${status}` })] });
		}
		catch (error) {
			console.error('[ERROR] Failed to save preferences:', error);
			await i.reply(errorReply('Couldn’t save that change', {
				hint: 'Please try again in a moment.',
			})).catch((replyError) => {
				console.error('[ERROR] Failed to send preferences error:', replyError);
			});
		}
	});

	collector.on('end', async () => {
		await interaction
			.editReply({ components: [buildPanel(prefs, idPrefix, { expired: true })] })
			.catch((error) => {
				console.error('[ERROR] Failed to expire preferences panel:', error);
			});
	});
}

module.exports = { data, execute };
