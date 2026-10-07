/**
 * Voice Session Manager
 *
 * Keeps one voice connection and audio player per guild, plays audio
 * tracks through it, and cleans up when playback ends, the bot is
 * disconnected, or everyone else leaves the channel.
 *
 * @module helpers/voice_session
 */

const { Readable } = require('node:stream');
const {
	AudioPlayerStatus,
	NoSubscriberBehavior,
	StreamType,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	entersState,
	joinVoiceChannel,
} = require('@discordjs/voice');

/** @constant {number} How long to wait for a voice connection to become ready */
const CONNECT_TIMEOUT_MS = 20_000;

/** @constant {number} Grace period for Discord to reconnect a dropped connection */
const RECONNECT_TIMEOUT_MS = 5_000;

/**
 * Active sessions keyed by guild ID.
 *
 * @type {Map<string, {
 *   guildId: string,
 *   channelId: string,
 *   connection: import('@discordjs/voice').VoiceConnection,
 *   player: import('@discordjs/voice').AudioPlayer,
 *   track: Track|null,
 * }>}
 */
const sessions = new Map();

/**
 * @typedef {Object} Track
 * @property {string} title - Display title
 * @property {(reason: string, details?: Object) => void} onEnd - Called once when the track stops for any reason
 * @property {boolean} [ended] - Set once onEnd has been called
 */

/**
 * Returns the active session for a guild, if any.
 *
 * @param {string} guildId - Discord guild ID
 * @returns {Object|undefined} Active session
 */
function getSession(guildId) {
	return sessions.get(guildId);
}

/**
 * Ends the session's current track exactly once.
 *
 * @param {Object} session - Voice session
 * @param {string} reason - Why the track ended (finished, stopped, replaced, error, disconnected, empty)
 * @param {Object} [details] - Extra context passed to the track's onEnd
 */
function endTrack(session, reason, details) {
	const track = session.track;
	if (!track || track.ended) return;
	track.ended = true;
	session.track = null;
	try {
		track.onEnd(reason, details);
	}
	catch (error) {
		console.error('[ERROR] Track end handler failed:', error);
	}
}

/**
 * Stops playback, leaves the voice channel, and forgets the session.
 *
 * @param {string} guildId - Discord guild ID
 * @param {string} [reason='stopped'] - Why the session ended
 * @param {Object} [details] - Extra context passed to the track's onEnd
 */
function stopSession(guildId, reason = 'stopped', details) {
	const session = sessions.get(guildId);
	if (!session) return;
	sessions.delete(guildId);

	endTrack(session, reason, details);
	session.player.stop(true);
	if (session.connection.state.status !== VoiceConnectionStatus.Destroyed) {
		session.connection.destroy();
	}
}

/**
 * Creates a voice connection and player for a channel and wires up cleanup.
 *
 * @param {import('discord.js').VoiceBasedChannel} channel - Channel to join
 * @returns {Object} New session
 */
function createSession(channel) {
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: channel.guild.voiceAdapterCreator,
		selfDeaf: true,
	});

	const player = createAudioPlayer({
		behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
	});
	connection.subscribe(player);

	const session = {
		guildId: channel.guild.id,
		channelId: channel.id,
		connection,
		player,
		track: null,
	};

	// Discord drops connections when the bot is moved or regions change; give it
	// a moment to recover before treating it as a real disconnect.
	connection.on(VoiceConnectionStatus.Disconnected, async () => {
		try {
			await Promise.race([
				entersState(connection, VoiceConnectionStatus.Signalling, RECONNECT_TIMEOUT_MS),
				entersState(connection, VoiceConnectionStatus.Connecting, RECONNECT_TIMEOUT_MS),
			]);
		}
		catch {
			if (sessions.get(session.guildId) === session) {
				stopSession(session.guildId, 'disconnected');
			}
		}
	});

	connection.on(VoiceConnectionStatus.Destroyed, () => {
		if (sessions.get(session.guildId) === session) {
			sessions.delete(session.guildId);
			endTrack(session, 'disconnected');
		}
	});

	player.on(AudioPlayerStatus.Idle, () => {
		if (sessions.get(session.guildId) === session) {
			stopSession(session.guildId, 'finished');
		}
	});

	player.on('error', (error) => {
		console.error('[ERROR] Audio player error:', error);
		if (sessions.get(session.guildId) === session) {
			stopSession(session.guildId, 'error');
		}
	});

	sessions.set(session.guildId, session);
	return session;
}

/**
 * Downloads an audio file as a stream and wraps it as a playable resource.
 * FFmpeg transcodes the stream to Opus.
 *
 * @param {string} url - Public audio file URL
 * @returns {Promise<import('@discordjs/voice').AudioResource>} Audio resource
 */
async function createResourceFromUrl(url) {
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		throw new Error(`Audio download failed with status ${response.status}`);
	}
	return createAudioResource(Readable.fromWeb(response.body), {
		inputType: StreamType.Arbitrary,
	});
}

/**
 * Joins a voice channel (if needed) and plays an audio file.
 * Any track already playing in the guild is ended with reason "replaced".
 *
 * @param {import('discord.js').VoiceBasedChannel} channel - Channel to play in
 * @param {string} url - Public audio file URL
 * @param {Track} track - Track metadata and end handler
 * @returns {Promise<Object>} The voice session
 */
async function playInChannel(channel, url, track) {
	let session = sessions.get(channel.guild.id);
	if (session && session.channelId !== channel.id) {
		throw new Error('A session is already active in another channel.');
	}
	if (!session) session = createSession(channel);

	try {
		const [resource] = await Promise.all([
			createResourceFromUrl(url),
			entersState(session.connection, VoiceConnectionStatus.Ready, CONNECT_TIMEOUT_MS),
		]);

		endTrack(session, 'replaced');
		session.track = track;
		session.player.play(resource);
		return session;
	}
	catch (error) {
		// Only tear down if nothing else is playing; otherwise keep the current track going.
		if (!session.track && sessions.get(session.guildId) === session) {
			stopSession(session.guildId, 'error');
		}
		throw error;
	}
}

/**
 * Pauses or resumes playback.
 *
 * @param {string} guildId - Discord guild ID
 * @returns {boolean|null} True if now paused, false if now playing, null if nothing to toggle
 */
function togglePause(guildId) {
	const session = sessions.get(guildId);
	if (!session?.track) return null;

	const { status } = session.player.state;
	if (status === AudioPlayerStatus.Paused || status === AudioPlayerStatus.AutoPaused) {
		session.player.unpause();
		return false;
	}
	session.player.pause();
	return true;
}

/**
 * Handles voice state changes so sessions follow the bot if it's moved
 * and end when everyone else has left the channel.
 *
 * @param {import('discord.js').VoiceState} oldState - Previous voice state
 * @param {import('discord.js').VoiceState} newState - New voice state
 */
function handleVoiceStateUpdate(oldState, newState) {
	const session = sessions.get(newState.guild.id);
	if (!session) return;

	const botId = newState.client.user.id;
	if (newState.id === botId && newState.channelId && newState.channelId !== session.channelId) {
		session.channelId = newState.channelId;
	}

	if (oldState.channelId !== session.channelId && newState.channelId !== session.channelId) return;

	const channel = newState.guild.channels.cache.get(session.channelId);
	const listeners = channel?.members.filter((member) => !member.user.bot).size ?? 0;
	if (listeners === 0) stopSession(session.guildId, 'empty');
}

module.exports = {
	getSession,
	playInChannel,
	stopSession,
	togglePause,
	handleVoiceStateUpdate,
};
