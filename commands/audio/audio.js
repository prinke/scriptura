/**
 * Audio Command - ESV Audio Bible in Voice Channels
 *
 * Joins the user's current voice channel and plays the ESV audio recording
 * of a passage. A "Now playing" message offers Pause/Resume and Stop buttons,
 * and the bot leaves when the passage finishes or the channel empties.
 *
 * @module commands/audio/audio
 */

const {
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
} = require('discord.js');

const {
	esvAudioUrl,
	esvPassageRequest,
} = require('../../helpers/esv_api_request');
const {
	getSession,
	playInChannel,
	stopSession,
	togglePause,
} = require('../../helpers/voice_session');
const { COLORS, bibleGatewayUrl, errorEmbed, errorReply } = require('../../helpers/ui');

/** @constant {string} Footer shown on audio messages */
const AUDIO_FOOTER = 'English Standard Version (ESV) · Audio © Crossway';

/** @constant {Object.<string, string>} Status lines shown when playback ends */
const END_LABELS = {
	finished: '✓ Finished',
	stopped: '⏹ Stopped',
	replaced: '⏭ Skipped',
	empty: '👋 Left the empty channel',
	disconnected: '🔌 Disconnected',
	error: '⚠️ Playback failed',
};

const data = new SlashCommandBuilder()
	.setName('audio')
	.setDescription('Listen to the ESV audio Bible in a voice channel')
	.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setContexts([InteractionContextType.Guild])
	.addSubcommand((subcommand) =>
		subcommand
			.setName('play')
			.setDescription('Join your voice channel and play a passage')
			.addStringOption((option) =>
				option
					.setName('passage')
					.setDescription('A Bible reference (e.g., John 3, Psalm 23, Romans 8:1-11)')
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('stop')
			.setDescription('Stop playback and leave the voice channel'),
	);

/**
 * Builds the "Now playing" embed, or its final state once playback ends.
 *
 * @param {Object} track - Track info
 * @param {string} track.reference - Canonical passage reference
 * @param {string} track.channelId - Voice channel ID
 * @param {string} track.requesterId - User who requested the passage
 * @param {Object} [state={}] - Playback state
 * @param {boolean} [state.paused=false] - Whether playback is paused
 * @param {string} [state.endReason] - Why playback ended, if it has
 * @param {string} [state.endedBy] - User ID who stopped playback
 * @returns {EmbedBuilder} Now playing embed
 */
function buildNowPlayingEmbed({ reference, channelId, requesterId }, { paused = false, endReason, endedBy } = {}) {
	let status = paused ? '⏸ Paused' : '🎧 Now playing';
	if (endReason) {
		status = END_LABELS[endReason] ?? END_LABELS.finished;
	}

	const lines = [`<#${channelId}> · Requested by <@${requesterId}>`];
	if (endedBy) lines.push(`-# Stopped by <@${endedBy}>`);

	return new EmbedBuilder()
		.setColor(endReason ? COLORS.muted : COLORS.brand)
		.setAuthor({ name: status })
		.setTitle(reference)
		.setURL(bibleGatewayUrl(reference, 'ESV'))
		.setDescription(lines.join('\n'))
		.setFooter({ text: AUDIO_FOOTER });
}

/**
 * Builds the playback control buttons.
 *
 * @param {string} idPrefix - Prefix for button custom IDs
 * @param {boolean} paused - Whether playback is paused
 * @returns {ActionRowBuilder} Control row
 */
function buildControls(idPrefix, paused) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`${idPrefix}:pause`)
			.setEmoji(paused ? '▶️' : '⏸️')
			.setLabel(paused ? 'Resume' : 'Pause')
			.setStyle(paused ? ButtonStyle.Primary : ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(`${idPrefix}:stop`)
			.setEmoji('⏹️')
			.setLabel('Stop')
			.setStyle(ButtonStyle.Danger),
	);
}

/**
 * Checks that the user can start playback in their current voice channel.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {{ channel?: import('discord.js').VoiceBasedChannel, error?: Object }} Channel or reply payload
 */
function resolveVoiceChannel(interaction) {
	const channel = interaction.member?.voice?.channel;
	if (!channel) {
		return { error: errorReply('Join a voice channel first', {
			hint: 'Hop into a voice channel, then run /audio play again.',
		}) };
	}

	if (channel.type === ChannelType.GuildStageVoice) {
		return { error: errorReply('Stage channels aren’t supported', {
			hint: 'Use a regular voice channel instead.',
		}) };
	}

	const permissions = channel.permissionsFor(interaction.guild.members.me);
	if (!permissions?.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
		return { error: errorReply('I can’t speak in that channel', {
			description: `I need the **Connect** and **Speak** permissions in <#${channel.id}>.`,
		}) };
	}

	const session = getSession(interaction.guildId);
	if (session && session.channelId !== channel.id) {
		return { error: errorReply('Already playing elsewhere', {
			description: `I’m currently playing in <#${session.channelId}>.`,
			hint: 'Join that channel, or stop playback there first.',
		}) };
	}

	return { channel };
}

/**
 * Handles /audio play.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function handlePlay(interaction) {
	const { channel, error } = resolveVoiceChannel(interaction);
	if (error) return interaction.reply(error);

	const query = interaction.options.getString('passage', true);
	await interaction.deferReply();

	// Errors are shown privately, so swap the public "thinking" message for an ephemeral one.
	const fail = async (title, details) => {
		await interaction.deleteReply().catch(() => null);
		await interaction.followUp(errorReply(title, details));
	};

	let reference;
	let audioUrl;
	try {
		const passage = await esvPassageRequest(query);
		reference = passage?.passage_meta?.[0]?.canonical;
		if (!reference) {
			return fail('Passage not found', {
				query,
				translation: 'ESV',
				hint: 'Try a reference like “John 3” or “Psalm 23”.',
			});
		}

		audioUrl = await esvAudioUrl(reference);
		if (!audioUrl) {
			return fail('No audio for that passage', { query, translation: 'ESV' });
		}
	}
	catch (err) {
		console.error('[ERROR] ESV audio lookup failed:', err);
		return fail('Something went wrong', {
			description: 'Couldn’t reach the ESV API. Please try again in a moment.',
			query,
			translation: 'ESV',
			status: true,
		});
	}

	const idPrefix = `audio:${interaction.id}`;
	const track = {
		reference,
		channelId: channel.id,
		requesterId: interaction.user.id,
	};

	let paused = false;
	let message = null;
	let collector = null;
	let endPayload = null;

	const showEnded = () => {
		// The interaction token expires after 15 minutes, so edit the message directly.
		message.edit(endPayload).catch((editError) => {
			console.error('[ERROR] Failed to update now playing message:', editError);
		});
	};

	const playback = {
		title: reference,
		onEnd: (reason, details = {}) => {
			collector?.stop();
			endPayload = {
				embeds: [buildNowPlayingEmbed(track, { endReason: reason, endedBy: details.by })],
				components: [],
			};
			// If the message isn't sent yet, it's updated right after sending.
			if (message) showEnded();
		},
	};

	try {
		await playInChannel(channel, audioUrl, playback);
	}
	catch (err) {
		console.error('[ERROR] Failed to start audio playback:', err);
		return fail('Couldn’t start playback', {
			description: `I wasn’t able to join <#${channel.id}> or load the audio.`,
			hint: 'Please try again in a moment.',
		});
	}

	message = await interaction.editReply({
		embeds: [buildNowPlayingEmbed(track)],
		components: [buildControls(idPrefix, false)],
	});

	// Playback may have already ended (e.g., a very short clip) before the message was sent.
	if (endPayload) {
		showEnded();
		return;
	}

	collector = message.createMessageComponentCollector({
		filter: (i) => i.customId.startsWith(`${idPrefix}:`),
	});

	collector.on('collect', async (i) => {
		const session = getSession(interaction.guildId);
		if (!session || i.member?.voice?.channelId !== session.channelId) {
			await i.reply(errorReply('Join the voice channel to use these controls', {
				hint: session ? `Playback is in <#${session.channelId}>.` : undefined,
			}));
			return;
		}

		const action = i.customId.slice(idPrefix.length + 1);
		if (action === 'stop') {
			await i.deferUpdate();
			stopSession(interaction.guildId, 'stopped', { by: i.user.id });
			return;
		}

		if (action === 'pause') {
			const nowPaused = togglePause(interaction.guildId);
			if (nowPaused === null) {
				await i.deferUpdate();
				return;
			}
			paused = nowPaused;
			await i.update({
				embeds: [buildNowPlayingEmbed(track, { paused })],
				components: [buildControls(idPrefix, paused)],
			});
		}
	});
}

/**
 * Handles /audio stop.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function handleStop(interaction) {
	const session = getSession(interaction.guildId);
	if (!session) {
		return interaction.reply(errorReply('Nothing is playing'));
	}

	if (interaction.member?.voice?.channelId !== session.channelId) {
		return interaction.reply(errorReply('Join the voice channel to stop playback', {
			description: `Playback is in <#${session.channelId}>.`,
		}));
	}

	stopSession(interaction.guildId, 'stopped', { by: interaction.user.id });

	return interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setColor(COLORS.muted)
				.setDescription('⏹ Stopped playback and left the voice channel.'),
		],
		flags: MessageFlags.Ephemeral,
	});
}

/**
 * Execute the audio command.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	if (!interaction.inCachedGuild()) {
		return interaction.reply(errorReply('Audio only works in servers', {
			hint: 'Add Scriptura to a server to use voice channels.',
		}));
	}

	const subcommand = interaction.options.getSubcommand();
	if (subcommand === 'play') return handlePlay(interaction);
	if (subcommand === 'stop') return handleStop(interaction);

	return interaction.reply({ embeds: [errorEmbed('Unknown subcommand')], flags: MessageFlags.Ephemeral });
}

module.exports = { data, execute };
