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

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 * 
 * @returns {Promise<import('mongodb').Db>} Connected MongoDB database instance
 */
async function connectMongo() {
	if (db) return db;

	const uri = process.env.MONGO_URI;
	if (!uri) {
		throw new Error('MONGO_URI is not defined in the environment variables.');
	}

	// Fail fast instead of the 30s default so lookups don't stall commands
	client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
	await client.connect();
	
	db = client.db();
	console.log('[SUCCESS] Connected to MongoDB');
	return db;
}

/**
 * Returns the active MongoDB database instance.
 * 
 * @returns {import('mongodb').Db} MongoDB database instance
 */
function getDb() {
	if (!db) {
		throw new Error('MongoDB has not been initialized. Call connectMongo() first.');
	}
	return db;
}

module.exports = {
	connectMongo,
	getDb,
};
