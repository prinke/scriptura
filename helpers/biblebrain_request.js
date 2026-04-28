/**
 * Bible Brain Client
 *
 * Provides helper functions for interacting with the Bible Brain / Digital Bible
 * Platform v4 API while returning the same shapes the verse command expects.
 *
 * API Documentation:
 * https://www.faithcomesbyhearing.com/bible-brain/developer-documentation
 *
 * Required Environment Variables:
 * - BIBLE_BRAIN_KEY: Authentication key from Bible Brain
 *
 * @module helpers/biblebrain_request
 */

/** @constant {string} Base URL for Bible Brain REST API */
const BIBLE_BRAIN_BASE_URL = 'https://4.dbt.io/api';

/** @constant {number} Bible Brain API version */
const BIBLE_BRAIN_API_VERSION = 4;

/** @constant {number} Request timeout in milliseconds (10 seconds) */
const REQUEST_TIMEOUT_MS = 10000;

/** @constant {string|null} Bible Brain authentication key from environment */
const BIBLE_BRAIN_KEY = process.env.BIBLE_BRAIN_KEY || null;

const OLD_TESTAMENT_BOOKS = new Set([
	'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
	'1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
	'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
	'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
]);

const BOOK_ALIASES = {
	GEN: ['genesis', 'gen'],
	EXO: ['exodus', 'exod', 'exo', 'ex'],
	LEV: ['leviticus', 'lev'],
	NUM: ['numbers', 'number', 'num', 'nu', 'nm'],
	DEU: ['deuteronomy', 'deut', 'deu', 'dt'],
	JOS: ['joshua', 'josh', 'jos'],
	JDG: ['judges', 'judg', 'jdg', 'jg'],
	RUT: ['ruth', 'rut'],
	'1SA': ['1 samuel', '1samuel', 'first samuel', 'i samuel', '1 sam', '1sam', '1 sa'],
	'2SA': ['2 samuel', '2samuel', 'second samuel', 'ii samuel', '2 sam', '2sam', '2 sa'],
	'1KI': ['1 kings', '1kings', 'first kings', 'i kings', '1 kgs', '1kgs', '1 ki'],
	'2KI': ['2 kings', '2kings', 'second kings', 'ii kings', '2 kgs', '2kgs', '2 ki'],
	'1CH': ['1 chronicles', '1chronicles', 'first chronicles', 'i chronicles', '1 chron', '1chron', '1 chr', '1chr'],
	'2CH': ['2 chronicles', '2chronicles', 'second chronicles', 'ii chronicles', '2 chron', '2chron', '2 chr', '2chr'],
	EZR: ['ezra', 'ezr'],
	NEH: ['nehemiah', 'neh'],
	EST: ['esther', 'est'],
	JOB: ['job'],
	PSA: ['psalms', 'psalm', 'ps', 'psa'],
	PRO: ['proverbs', 'prov', 'pro', 'prv'],
	ECC: ['ecclesiastes', 'eccles', 'ecc'],
	SNG: ['song of songs', 'song of solomon', 'song', 'songs', 'sng', 'sos'],
	ISA: ['isaiah', 'isa'],
	JER: ['jeremiah', 'jer'],
	LAM: ['lamentations', 'lam'],
	EZK: ['ezekiel', 'ezek', 'ezk'],
	DAN: ['daniel', 'dan'],
	HOS: ['hosea', 'hos'],
	JOL: ['joel', 'jol'],
	AMO: ['amos', 'amo'],
	OBA: ['obadiah', 'obad', 'oba'],
	JON: ['jonah', 'jon'],
	MIC: ['micah', 'mic'],
	NAM: ['nahum', 'nah', 'nam'],
	HAB: ['habakkuk', 'hab'],
	ZEP: ['zephaniah', 'zeph', 'zep'],
	HAG: ['haggai', 'hag'],
	ZEC: ['zechariah', 'zech', 'zec'],
	MAL: ['malachi', 'mal'],
	MAT: ['matthew', 'matt', 'mat', 'mt'],
	MRK: ['mark', 'mrk', 'mk'],
	LUK: ['luke', 'luk', 'lk'],
	JHN: ['john', 'jhn', 'jn'],
	ACT: ['acts', 'act'],
	ROM: ['romans', 'rom'],
	'1CO': ['1 corinthians', '1corinthians', 'first corinthians', 'i corinthians', '1 cor', '1cor', '1 co'],
	'2CO': ['2 corinthians', '2corinthians', 'second corinthians', 'ii corinthians', '2 cor', '2cor', '2 co'],
	GAL: ['galatians', 'gal'],
	EPH: ['ephesians', 'eph'],
	PHP: ['philippians', 'philippians', 'phil', 'php'],
	COL: ['colossians', 'col'],
	'1TH': ['1 thessalonians', '1thessalonians', 'first thessalonians', 'i thessalonians', '1 thess', '1thess', '1 th'],
	'2TH': ['2 thessalonians', '2thessalonians', 'second thessalonians', 'ii thessalonians', '2 thess', '2thess', '2 th'],
	'1TI': ['1 timothy', '1timothy', 'first timothy', 'i timothy', '1 tim', '1tim', '1 ti'],
	'2TI': ['2 timothy', '2timothy', 'second timothy', 'ii timothy', '2 tim', '2tim', '2 ti'],
	TIT: ['titus', 'tit'],
	PHM: ['philemon', 'phlm', 'phm'],
	HEB: ['hebrews', 'heb'],
	JAS: ['james', 'jas', 'jam'],
	'1PE': ['1 peter', '1peter', 'first peter', 'i peter', '1 pet', '1pet', '1 pe'],
	'2PE': ['2 peter', '2peter', 'second peter', 'ii peter', '2 pet', '2pet', '2 pe'],
	'1JN': ['1 john', '1john', 'first john', 'i john', '1 jn', '1jn'],
	'2JN': ['2 john', '2john', 'second john', 'ii john', '2 jn', '2jn'],
	'3JN': ['3 john', '3john', 'third john', 'iii john', '3 jn', '3jn'],
	JUD: ['jude', 'jud'],
	REV: ['revelation', 'revelations', 'rev'],
};

const BOOK_LOOKUP = Object.entries(BOOK_ALIASES)
	.flatMap(([bookId, aliases]) => aliases.map((alias) => [normalizeBookName(alias), bookId]))
	.sort((a, b) => b[0].length - a[0].length);

function buildError(message, { status, raw } = {}) {
	return {
		error: true,
		message,
		status,
		raw: raw ?? null,
	};
}

async function bibleBrainFetch(
	path,
	{ queryParams = {}, signal, timeoutMs = REQUEST_TIMEOUT_MS } = {},
) {
	if (!BIBLE_BRAIN_KEY) {
		return buildError('Missing BIBLE_BRAIN_KEY env var.');
	}

	const url = new URL(`${BIBLE_BRAIN_BASE_URL}${path}`);
	url.searchParams.set('v', String(BIBLE_BRAIN_API_VERSION));
	url.searchParams.set('key', BIBLE_BRAIN_KEY);
	for (const [k, v] of Object.entries(queryParams)) {
		if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	if (signal) {
		if (signal.aborted) {controller.abort();}
		else {
			signal.addEventListener('abort', () => controller.abort(), {
				once: true,
			});
		}
	}

	try {
		const res = await fetch(url.toString(), {
			method: 'GET',
			headers: { accept: 'application/json' },
			signal: controller.signal,
		});

		const json = await res.json().catch(() => null);

		if (!res.ok) {
			const apiMessage = json && (json.message || json.error);
			return buildError(
				apiMessage || `Bible Brain request failed (${res.status})`,
				{ status: res.status, raw: json ?? null },
			);
		}

		return { error: false, data: json };
	}
	catch (err) {
		if (err?.name === 'AbortError') {
			return buildError(`Bible Brain request timed out after ${timeoutMs}ms`);
		}
		return buildError(err?.message || 'Network error while calling Bible Brain');
	}
	finally {
		clearTimeout(timeoutId);
	}
}

function normalizeBookName(value) {
	return String(value ?? '')
		.toLowerCase()
		.replace(/\./g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function parseBibleReference(query) {
	const normalized = normalizeBookName(query);
	if (!normalized) return null;

	for (const [alias, bookId] of BOOK_LOOKUP) {
		if (normalized !== alias && !normalized.startsWith(`${alias} `)) continue;

		const rest = normalized.slice(alias.length).trim();
		const match = rest.match(/^(\d+)(?::(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?)?$/);
		if (!match) continue;

		const chapter = Number.parseInt(match[1], 10);
		const verseStart = match[2] ? Number.parseInt(match[2], 10) : null;
		const endChapter = match[3] ? Number.parseInt(match[3], 10) : chapter;
		const verseEnd = match[4] ? Number.parseInt(match[4], 10) : verseStart;

		if (!Number.isInteger(chapter) || chapter < 1) return null;
		if (endChapter !== chapter) return null;

		return {
			bookId,
			chapter,
			verseStart,
			verseEnd,
			testament: OLD_TESTAMENT_BOOKS.has(bookId) ? 'OT' : 'NT',
		};
	}

	return null;
}

function getFilesets(bibleConfig) {
	if (!bibleConfig) return [];
	if (typeof bibleConfig === 'string') return [bibleConfig];
	if (Array.isArray(bibleConfig.filesets)) return bibleConfig.filesets;

	const filesets = [];
	if (bibleConfig.filesets?.C) filesets.push(bibleConfig.filesets.C);
	if (bibleConfig.filesets?.OT) filesets.push(bibleConfig.filesets.OT);
	if (bibleConfig.filesets?.NT) filesets.push(bibleConfig.filesets.NT);
	return filesets;
}

function getPassageFileset(bibleConfig, testament) {
	if (!bibleConfig) return null;
	if (typeof bibleConfig === 'string') return bibleConfig;
	return bibleConfig.filesets?.C ?? bibleConfig.filesets?.[testament] ?? null;
}

function formatReference(verse) {
	const book = titleCaseBookName(verse.book_name || verse.book_id || 'Result');
	const chapter = verse.chapter ?? verse.chapter_start;
	const start = verse.verse_start ?? verse.verse_number;
	const end = verse.verse_end && verse.verse_end !== start ? `-${verse.verse_end}` : '';
	return `${book} ${chapter}:${start}${end}`;
}

function titleCaseBookName(value) {
	return String(value ?? '')
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase())
		.replace(/\bOf\b/g, 'of');
}

function formatPassageText(verses, { includeVerseNumbers = true, lineByLine = false } = {}) {
	const separator = lineByLine ? '\n' : ' ';
	return verses
		.map((verse) => {
			const number = verse.verse_start ?? verse.verse_number;
			const text = String(verse.verse_text ?? '').trim();
			return includeVerseNumbers && number ? `[${number}] ${text}` : text;
		})
		.filter(Boolean)
		.join(separator)
		.trim();
}

async function bibleBrainGetPassage(
	bibleConfig,
	reference,
	{
		includeVerseNumbers = true,
		lineByLine = 'auto',
		signal,
		timeoutMs,
	} = {},
) {
	const parsed = typeof reference === 'string' ? parseBibleReference(reference) : reference;
	if (!parsed) return buildError('Could not parse Bible reference.');

	const filesetId = getPassageFileset(bibleConfig, parsed.testament);
	if (!filesetId) return buildError('Missing Bible Brain fileset for passage.');

	const res = await bibleBrainFetch(
		`/bibles/filesets/${encodeURIComponent(filesetId)}/${encodeURIComponent(parsed.bookId)}/${encodeURIComponent(parsed.chapter)}`,
		{
			queryParams: {
				verse_start: parsed.verseStart,
				verse_end: parsed.verseEnd,
			},
			signal,
			timeoutMs,
		},
	);
	if (res.error) return res;

	const verses = Array.isArray(res.data?.data) ? res.data.data : [];
	if (verses.length === 0) {
		return {
			error: false,
			kind: 'empty',
			query: reference,
		};
	}

	const first = verses[0];
	const last = verses[verses.length - 1];
	const isPsalm = parsed.bookId === 'PSA';
	const useLineByLine =
    lineByLine === 'auto'
    	? isPsalm
    	: lineByLine === 'on'
    		? true
    		: false;
	const text = formatPassageText(verses, { includeVerseNumbers, lineByLine: useLineByLine });
	const referenceEnd =
    first.chapter === last.chapter && first.verse_start !== last.verse_start
    	? `-${last.verse_start}`
    	: '';

	return {
		error: false,
		kind: 'passage',
		query: reference,
		id: `${filesetId}.${parsed.bookId}.${parsed.chapter}.${parsed.verseStart ?? 'chapter'}`,
		reference: `${titleCaseBookName(first.book_name || parsed.bookId)} ${first.chapter}${first.verse_start ? `:${first.verse_start}${referenceEnd}` : ''}`,
		verseCount: verses.length,
		text,
		copyright: null,
	};
}

async function bibleBrainSearch(
	bibleConfig,
	query,
	{ limit = 10, offset = 0, signal, timeoutMs } = {},
) {
	if (!query) return buildError('Missing query.');

	const filesets = getFilesets(bibleConfig);
	if (filesets.length === 0) return buildError('Missing Bible Brain fileset.');

	const page = Math.max(1, Math.floor(offset / limit) + 1);
	const responses = await Promise.all(
		filesets.map((filesetId) =>
			bibleBrainFetch('/search', {
				queryParams: { query, fileset_id: filesetId, limit, page },
				signal,
				timeoutMs,
			}),
		),
	);

	const failed = responses.find((res) => res.error);
	if (failed) return failed;

	const verses = [];
	let total = 0;
	for (const res of responses) {
		const data = res.data?.verses?.data;
		const pagination = res.data?.verses?.meta?.pagination;
		if (Array.isArray(data)) verses.push(...data);
		if (typeof pagination?.total === 'number') total += pagination.total;
	}

	const pagedVerses = verses.slice(0, limit).map((v) => ({
		id: `${v.book_id}.${v.chapter}.${v.verse_start}`,
		reference: formatReference(v),
		text: v.verse_text,
	}));

	return {
		error: false,
		data: {
			data: {
				query,
				total,
				limit,
				offset,
				verses: pagedVerses,
			},
		},
	};
}

async function bibleBrainResolveQuery(
	bibleConfig,
	query,
	{
		includeRaw = false,
		signal,
		timeoutMs,
		includeVerseNumbers = true,
		lineByLine = 'auto',
	} = {},
) {
	const parsedReference = parseBibleReference(query);
	if (parsedReference) {
		const passage = await bibleBrainGetPassage(bibleConfig, query, {
			includeVerseNumbers,
			lineByLine,
			signal,
			timeoutMs,
		});
		if (includeRaw && !passage.error) passage.raw = passage;
		return passage;
	}

	const searchRes = await bibleBrainSearch(bibleConfig, query, {
		signal,
		timeoutMs,
	});
	if (searchRes.error) return searchRes;

	const data = searchRes.data?.data;
	if (Array.isArray(data?.verses) && data.verses.length > 0) {
		const result = {
			error: false,
			kind: 'search',
			query: data?.query ?? query,
			total: data?.total ?? null,
			limit: data?.limit ?? null,
			offset: data?.offset ?? null,
			verses: data.verses,
		};
		if (includeRaw) result.raw = searchRes.data;
		return result;
	}

	const result = {
		error: false,
		kind: 'empty',
		query,
	};
	if (includeRaw) result.raw = searchRes.data;
	return result;
}

module.exports = {
	bibleBrainSearch,
	bibleBrainGetPassage,
	bibleBrainResolveQuery,
	parseBibleReference,
};
