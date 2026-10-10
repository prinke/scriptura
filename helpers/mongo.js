/**
 * MongoDB Connection Helper
 * 
 * Provides a shared MongoDB client/DB instance for the application.
 * Connection is established once and reused across modules.
 * 
 * @module helpers/mongo
 */

const { MongoClient } = require('mongodb');

let client;
let db;
let connecting;

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 * Concurrent callers share one attempt; a failed attempt is cleared so the
 * next call retries instead of leaving the bot without a database.
 * 
 * @returns {Promise<import('mongodb').Db>} Connected MongoDB database instance
 */
async function connectMongo() {
	if (db) return db;
	if (connecting) return connecting;

	const uri = process.env.MONGO_URI;
	if (!uri) {
		throw new Error('MONGO_URI is not defined in the environment variables.');
	}

	connecting = (async () => {
		// Fail fast instead of the 30s default so lookups don't stall commands
		const attempt = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
		try {
			await attempt.connect();
		} catch (error) {
			await attempt.close().catch(() => {});
			throw error;
		}

		client = attempt;
		db = client.db();
		console.log('[SUCCESS] Connected to MongoDB');
		return db;
	})();

	try {
		return await connecting;
	} finally {
		connecting = undefined;
	}
}

/**
 * Returns the active MongoDB database instance, connecting first if the
 * startup connection failed or hasn't finished yet.
 * 
 * @returns {Promise<import('mongodb').Db>} MongoDB database instance
 */
function getDb() {
	return connectMongo();
}

module.exports = {
	connectMongo,
	getDb,
};
