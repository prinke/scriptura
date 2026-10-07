/**
 * Time Zone Helpers
 *
 * Utilities for working with IANA time zones (e.g., "America/New_York")
 * using the built-in Intl API: validation, parsing times of day, and
 * computing the next time a wall-clock time occurs in a zone.
 *
 * @module helpers/timezones
 */

/** @constant {string[]} All supported IANA time zones, with UTC first */
const TIME_ZONES = ['UTC', ...Intl.supportedValuesOf('timeZone').filter((tz) => tz !== 'UTC')];

/** @type {Map<string, Intl.DateTimeFormat>} Cached formatters keyed by time zone */
const formatters = new Map();

function getFormatter(timeZone) {
	let formatter = formatters.get(timeZone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		});
		formatters.set(timeZone, formatter);
	}
	return formatter;
}

/**
 * Checks whether a string is a valid IANA time zone.
 *
 * @param {string} timeZone - Time zone name
 * @returns {boolean} True if valid
 */
function isValidTimeZone(timeZone) {
	if (!timeZone) return false;
	try {
		getFormatter(timeZone);
		return true;
	}
	catch {
		return false;
	}
}

/**
 * Returns the wall-clock date and time of an instant in a time zone.
 *
 * @param {Date|number} date - Instant
 * @param {string} timeZone - IANA time zone
 * @returns {{year: number, month: number, day: number, hour: number, minute: number, second: number}} Local parts (month is 1-12)
 */
function getZonedParts(date, timeZone) {
	const parts = {};
	for (const { type, value } of getFormatter(timeZone).formatToParts(date)) {
		if (type !== 'literal') parts[type] = Number.parseInt(value, 10);
	}
	return parts;
}

/**
 * Returns a time zone's offset from UTC at a given instant, in milliseconds.
 *
 * @param {Date|number} date - Instant
 * @param {string} timeZone - IANA time zone
 * @returns {number} Offset in milliseconds (e.g., -4h for New York in summer)
 */
function getOffsetMs(date, timeZone) {
	const ms = typeof date === 'number' ? date : date.getTime();
	const p = getZonedParts(ms, timeZone);
	const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return asUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * Converts a wall-clock time in a time zone to a UTC instant.
 * Day overflow (e.g., day 32) rolls into the next month.
 *
 * @param {Object} local - Local date and time (month is 1-12)
 * @param {string} timeZone - IANA time zone
 * @returns {Date} UTC instant
 */
function zonedTimeToDate({ year, month, day, hour, minute }, timeZone) {
	const guess = Date.UTC(year, month - 1, day, hour, minute);
	let result = guess - getOffsetMs(guess, timeZone);
	// Re-check the offset at the result in case a DST change falls in between.
	const corrected = guess - getOffsetMs(result, timeZone);
	if (corrected !== result) result = corrected;
	return new Date(result);
}

/**
 * Returns the next instant after `now` when the clock reads hour:minute in a time zone.
 *
 * @param {Date} now - Reference instant
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {string} timeZone - IANA time zone
 * @returns {Date} Next occurrence
 */
function nextOccurrence(now, hour, minute, timeZone) {
	const today = getZonedParts(now, timeZone);
	let candidate = zonedTimeToDate({ ...today, hour, minute }, timeZone);
	if (candidate <= now) {
		candidate = zonedTimeToDate({ ...today, day: today.day + 1, hour, minute }, timeZone);
	}
	return candidate;
}

/**
 * Parses a time of day such as "8", "08:30", "8am", or "8:30 PM".
 *
 * @param {string} input - User-entered time
 * @returns {{hour: number, minute: number}|null} Parsed time, or null if invalid
 */
function parseTimeOfDay(input) {
	const match = String(input ?? '')
		.trim()
		.toLowerCase()
		.replace(/\./g, '')
		.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
	if (!match) return null;

	let hour = Number.parseInt(match[1], 10);
	const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
	const meridiem = match[3]?.[0];

	if (minute > 59) return null;
	if (meridiem) {
		if (hour < 1 || hour > 12) return null;
		if (hour === 12) hour = 0;
		if (meridiem === 'p') hour += 12;
	}
	else if (hour > 23) {
		return null;
	}

	return { hour, minute };
}

/**
 * Formats an hour and minute as a 24-hour "HH:MM" string.
 *
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @returns {string} Formatted time
 */
function formatTimeOfDay(hour, minute) {
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Formats a time zone's current UTC offset (e.g., "UTC−04:00").
 *
 * @param {string} timeZone - IANA time zone
 * @param {Date} [date=new Date()] - Instant to evaluate the offset at
 * @returns {string} Formatted offset
 */
function formatOffset(timeZone, date = new Date()) {
	const totalMinutes = Math.round(getOffsetMs(date, timeZone) / 60000);
	const sign = totalMinutes < 0 ? '−' : '+';
	const abs = Math.abs(totalMinutes);
	return `UTC${sign}${formatTimeOfDay(Math.floor(abs / 60), abs % 60)}`;
}

/**
 * Returns up to 25 autocomplete choices matching a search string.
 *
 * @param {string} query - What the user has typed so far
 * @returns {Array<{name: string, value: string}>} Autocomplete choices
 */
function searchTimeZones(query) {
	const needle = String(query ?? '').trim().toLowerCase().replace(/\s+/g, '_');
	const matches = needle
		? TIME_ZONES.filter((tz) => tz.toLowerCase().includes(needle))
		: TIME_ZONES;

	const now = new Date();
	return matches.slice(0, 25).map((tz) => ({
		name: tz === 'UTC' ? 'UTC' : `${tz.replace(/_/g, ' ')} (${formatOffset(tz, now)})`,
		value: tz,
	}));
}

module.exports = {
	isValidTimeZone,
	getZonedParts,
	nextOccurrence,
	parseTimeOfDay,
	formatTimeOfDay,
	formatOffset,
	searchTimeZones,
};
