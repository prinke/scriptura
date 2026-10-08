/**
 * Uptime Heartbeat
 *
 * Pings an Uptime Kuma push monitor while the bot is connected to Discord.
 * If the process dies or the gateway connection drops, the pushes stop and
 * Kuma marks the bot as down. Disabled unless UPTIME_PUSH_URL is set.
 *
 * @module helpers/uptime_heartbeat
 */

/** @constant {number} How often to push (should be below the monitor's heartbeat interval) */
const PUSH_INTERVAL_MS = 60 * 1000;

/**
 * Sends a single push to Uptime Kuma, including the gateway latency.
 *
 * @param {import('discord.js').Client} client - Discord client
 * @param {string} pushUrl - Uptime Kuma push URL
 */
async function push(client, pushUrl) {
	// Skip while disconnected so Kuma sees missed heartbeats as downtime
	if (!client.isReady()) return;

	const url = new URL(pushUrl);
	url.searchParams.set('status', 'up');
	url.searchParams.set('msg', 'OK');
	if (client.ws.ping >= 0) url.searchParams.set('ping', String(client.ws.ping));

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(10 * 1000) });
		if (!res.ok) console.error(`[ERROR] Uptime push failed with status ${res.status}`);
	}
	catch (error) {
		console.error('[ERROR] Uptime push failed:', error.message);
	}
}

/**
 * Starts pushing heartbeats if UPTIME_PUSH_URL is configured.
 *
 * @param {import('discord.js').Client} client - Discord client
 */
function startUptimeHeartbeat(client) {
	const pushUrl = process.env.UPTIME_PUSH_URL;
	if (!pushUrl) return;

	push(client, pushUrl);
	setInterval(() => push(client, pushUrl), PUSH_INTERVAL_MS);
	console.log('[SUCCESS] Uptime heartbeat started');
}

module.exports = { startUptimeHeartbeat };
