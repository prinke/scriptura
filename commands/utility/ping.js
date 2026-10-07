/**
 * Ping Command - Bot Latency Check
 * 
 * A simple utility command that reports the bot's websocket latency.
 * Useful for checking if the bot is responsive and measuring connection quality.
 * 
 * @module commands/utility/ping
 */

const {
	SlashCommandBuilder,
	InteractionContextType,
	ApplicationIntegrationType,
	MessageFlags,
	EmbedBuilder,
} = require('discord.js');
const { COLORS } = require('../../helpers/ui');

/**
 * Slash command definition for /ping
 * 
 * This command is available in all contexts:
 * - Guild (server) channels
 * - Private channels/DMs
 * - Bot DMs
 */
const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Get the bot\'s latency')
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
 * Execute the ping command.
 * 
 * Responds with the websocket heartbeat and the round-trip time of the reply.
 * Lower values indicate better connection quality.
 * 
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	const response = await interaction.reply({
		embeds: [new EmbedBuilder().setColor(COLORS.muted).setDescription('Pinging…')],
		flags: MessageFlags.Ephemeral,
		withResponse: true,
	});

	const roundTrip = response.resource.message.createdTimestamp - interaction.createdTimestamp;
	const heartbeat = interaction.client.ws.ping;

	const embed = new EmbedBuilder()
		.setColor(COLORS.brand)
		.setTitle('🏓 Pong!')
		.addFields(
			{ name: 'Round trip', value: `\`${roundTrip} ms\``, inline: true },
			{ name: 'Heartbeat', value: heartbeat >= 0 ? `\`${heartbeat} ms\`` : '`—`', inline: true },
		);

	await interaction.editReply({ embeds: [embed] });
}

module.exports = { data, execute };
