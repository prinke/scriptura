/**
 * Daily Channel Command - Scheduled Daily Verse Posts
 *
 * Lets server admins pick a channel where the daily verse is posted
 * automatically at a chosen time and time zone each day.
 *
 * Requires the Manage Server permission by default; server owners can
 * change who has access under Server Settings → Integrations.
 *
 * @module commands/utility/daily-channel
 */

const {
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
	ChannelType,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
} = require('discord.js');

const {
	translationChoices,
	TRANSLATION_NAMES,
	DEFAULT_TRANSLATION,
	isValidTranslation,
} = require('../../helpers/translations');
const {
	getDailyVerseSettings,
	setDailyVerseSettings,
	clearDailyVerseSettings,
} = require('../../helpers/guild_settings');
const {
	isValidTimeZone,
	nextOccurrence,
	parseTimeOfDay,
	formatTimeOfDay,
	formatOffset,
	searchTimeZones,
} = require('../../helpers/timezones');
const { COLORS, errorReply } = require('../../helpers/ui');

/** @constant {string} Time zone used when none is given */
const DEFAULT_TIMEZONE = 'UTC';

/** @constant {bigint[]} Permissions the bot needs in the daily verse channel */
const REQUIRED_CHANNEL_PERMISSIONS = [
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages,
	PermissionFlagsBits.EmbedLinks,
];

const data = new SlashCommandBuilder()
	.setName('daily-channel')
	.setDescription('Automatically post the daily verse in a channel')
	.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setContexts([InteractionContextType.Guild])
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('set')
			.setDescription('Choose the channel and time for daily verse posts')
			.addChannelOption((option) =>
				option
					.setName('channel')
					.setDescription('Where to post the daily verse')
					.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName('time')
					.setDescription('Time of day to post (e.g., 08:00, 8am, 7:30 PM)')
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName('timezone')
					.setDescription('Your time zone (start typing a city, e.g., New York). Defaults to UTC')
					.setAutocomplete(true),
			)
			.addStringOption((option) =>
				option
					.setName('translation')
					.setDescription('Bible translation to post in (defaults to ESV)')
					.addChoices(...translationChoices),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('view')
			.setDescription('Show the current daily verse schedule'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('disable')
			.setDescription('Stop posting the daily verse'),
	);

/**
 * Builds an embed describing a daily verse schedule.
 *
 * @param {string} title - Embed title
 * @param {import('../../helpers/guild_settings').DailyVerseSettings} settings - Schedule
 * @param {string} [note] - Optional small note under the fields
 * @returns {EmbedBuilder} Schedule embed
 */
function buildScheduleEmbed(title, settings, note) {
	const nextUnix = Math.floor(new Date(settings.nextPostAt).getTime() / 1000);
	const zoneLabel = settings.timezone === 'UTC'
		? 'UTC'
		: `${settings.timezone.replace(/_/g, ' ')} (${formatOffset(settings.timezone)})`;

	const embed = new EmbedBuilder()
		.setColor(COLORS.brand)
		.setTitle(title)
		.addFields(
			{ name: 'Channel', value: `<#${settings.channelId}>`, inline: true },
			{ name: 'Time', value: `${formatTimeOfDay(settings.hour, settings.minute)} · ${zoneLabel}`, inline: true },
			{ name: 'Translation', value: TRANSLATION_NAMES[settings.translation] ?? settings.translation, inline: true },
			{ name: 'Next post', value: `<t:${nextUnix}:F> · <t:${nextUnix}:R>` },
		);

	const footer = [];
	if (note) footer.push(note);
	if (settings.lastPostedAt) {
		footer.push(`Last posted <t:${Math.floor(new Date(settings.lastPostedAt).getTime() / 1000)}:R>`);
	}
	if (footer.length) embed.setDescription(footer.map((line) => `-# ${line}`).join('\n'));

	return embed;
}

/**
 * Handles /daily-channel set.
 *
 * @param {import('discord.js').ChatInputCommandInteraction<'cached'>} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function handleSet(interaction) {
	const channel = interaction.options.getChannel('channel', true);
	const timeInput = interaction.options.getString('time', true);
	const timezoneInput = interaction.options.getString('timezone');
	const translationInput = interaction.options.getString('translation');

	const time = parseTimeOfDay(timeInput);
	if (!time) {
		return interaction.reply(errorReply('Couldn’t read that time', {
			description: `“${timeInput}” isn’t a time I recognize.`,
			hint: 'Try something like 08:00, 8am, or 7:30 PM.',
		}));
	}

	if (timezoneInput && !isValidTimeZone(timezoneInput)) {
		return interaction.reply(errorReply('Unknown time zone', {
			description: `“${timezoneInput}” isn’t a valid time zone.`,
			hint: 'Start typing a city name and pick one from the list, e.g., America/New_York.',
		}));
	}

	if (translationInput && !isValidTranslation(translationInput)) {
		return interaction.reply(errorReply('Unsupported translation', { translation: translationInput }));
	}

	const permissions = channel.permissionsFor(interaction.guild.members.me);
	if (!permissions?.has(REQUIRED_CHANNEL_PERMISSIONS)) {
		return interaction.reply(errorReply('I can’t post in that channel', {
			description: `I need **View Channel**, **Send Messages**, and **Embed Links** in <#${channel.id}>.`,
		}));
	}

	let existing = null;
	try {
		existing = await getDailyVerseSettings(interaction.guildId);
	}
	catch (error) {
		console.error('[ERROR] Failed to load daily verse settings:', error);
	}

	// Keep previous choices for options that weren't given this time.
	const timezone = timezoneInput ?? existing?.timezone ?? DEFAULT_TIMEZONE;
	const translation = translationInput ?? existing?.translation ?? DEFAULT_TRANSLATION;

	const settings = {
		channelId: channel.id,
		hour: time.hour,
		minute: time.minute,
		timezone,
		translation,
		nextPostAt: nextOccurrence(new Date(), time.hour, time.minute, timezone),
		updatedBy: interaction.user.id,
	};

	try {
		await setDailyVerseSettings(interaction.guildId, settings);
	}
	catch (error) {
		console.error('[ERROR] Failed to save daily verse settings:', error);
		return interaction.reply(errorReply('Couldn’t save the schedule', {
			hint: 'Please try again in a moment.',
			status: true,
		}));
	}

	const note = !timezoneInput && timezone === DEFAULT_TIMEZONE
		? 'Times are in UTC. Add the timezone option to use your local time.'
		: undefined;

	return interaction.reply({
		embeds: [buildScheduleEmbed('✓ Daily verse scheduled', settings, note)],
		flags: MessageFlags.Ephemeral,
	});
}

/**
 * Handles /daily-channel view.
 *
 * @param {import('discord.js').ChatInputCommandInteraction<'cached'>} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function handleView(interaction) {
	let settings;
	try {
		settings = await getDailyVerseSettings(interaction.guildId);
	}
	catch (error) {
		console.error('[ERROR] Failed to load daily verse settings:', error);
		return interaction.reply(errorReply('Couldn’t load the schedule', {
			hint: 'Please try again in a moment.',
			status: true,
		}));
	}

	if (!settings) {
		return interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(COLORS.muted)
					.setTitle('Daily verse is off')
					.setDescription('Use `/daily-channel set` to post the daily verse in a channel every day.'),
			],
			flags: MessageFlags.Ephemeral,
		});
	}

	return interaction.reply({
		embeds: [buildScheduleEmbed('Daily verse schedule', settings)],
		flags: MessageFlags.Ephemeral,
	});
}

/**
 * Handles /daily-channel disable.
 *
 * @param {import('discord.js').ChatInputCommandInteraction<'cached'>} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function handleDisable(interaction) {
	let removed;
	try {
		removed = await clearDailyVerseSettings(interaction.guildId);
	}
	catch (error) {
		console.error('[ERROR] Failed to clear daily verse settings:', error);
		return interaction.reply(errorReply('Couldn’t update the schedule', {
			hint: 'Please try again in a moment.',
			status: true,
		}));
	}

	return interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setColor(COLORS.muted)
				.setTitle(removed ? 'Daily verse turned off' : 'Daily verse was already off')
				.setDescription(removed
					? 'I’ll stop posting the daily verse. Use `/daily-channel set` to turn it back on.'
					: 'Use `/daily-channel set` to post the daily verse in a channel every day.'),
		],
		flags: MessageFlags.Ephemeral,
	});
}

/**
 * Suggests time zones as the user types.
 *
 * @param {import('discord.js').AutocompleteInteraction} interaction - Autocomplete interaction
 * @returns {Promise<void>}
 */
async function autocomplete(interaction) {
	const focused = interaction.options.getFocused(true);
	if (focused.name !== 'timezone') return interaction.respond([]);
	return interaction.respond(searchTimeZones(focused.value));
}

/**
 * Execute the daily-channel command.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	if (!interaction.inCachedGuild()) {
		return interaction.reply(errorReply('This only works in servers'));
	}

	const subcommand = interaction.options.getSubcommand();
	if (subcommand === 'set') return handleSet(interaction);
	if (subcommand === 'view') return handleView(interaction);
	if (subcommand === 'disable') return handleDisable(interaction);

	return interaction.reply(errorReply('Unknown subcommand'));
}

module.exports = { data, execute, autocomplete };
