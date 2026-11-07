// src/utils/filenameSanitizer.ts
var NOISE_TAGS = [
	/\[official\s*(music\s*)?video\]/gi,
	/\[official\s*audio\]/gi,
	/\[official\s*hd\s*video\]/gi,
	/\[official\s*4k\]/gi,
	/\[official\s*visualizer\]/gi,
	/\[audio\]/gi,
	/\[hd\]/gi,
	/\[4k\]/gi,
	/\[hq\]/gi,
	/\[lyrics?\]/gi,
	/\[clean\]/gi,
	/\[explicit\]/gi,
	/\(official\s*(music\s*)?video\)/gi,
	/\(official\s*audio\)/gi,
	/\(official\s*visualizer\)/gi,
	/\(lyrics?\)/gi,
	/\(audio\)/gi,
	/\(visualizer\)/gi,
	/\(slowed\s*\+\s*reverb\)/gi,
	/\(sped\s*up\)/gi,
	/\(radio\s*edit\)/gi,
	/\(original\s*mix\)/gi
];
function sanitizeFilename(filename) {
	const extMatch = filename.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i);
	let ext = extMatch ? extMatch[1].toUpperCase() : "MP3";
	let format = "MP3";
	if (ext === "WAV") format = "WAV";
	else if (ext === "FLAC") format = "FLAC";
	else format = "MP3";
	let clean = filename.replace(/\.[^/.]+$/, "");
	for (const pattern of NOISE_TAGS) clean = clean.replace(pattern, "");
	clean = clean.replace(/^\s*\d{1,3}\s*[-._]\s*/, "");
	clean = clean.replace(/_+/g, " ");
	clean = clean.replace(/[\uFFFD]/g, "");
	let artist = "Unknown Artist";
	let title = clean.trim();
	let album = "Unknown Album";
	if (clean.includes(" - ")) {
		const parts = clean.split(" - ");
		if (parts.length >= 2) {
			artist = parts[0].trim();
			title = parts.slice(1).join(" - ").trim();
		}
	} else if (clean.toLowerCase().includes(" by ")) {
		const parts = clean.split(/ by /i);
		if (parts.length === 2) {
			title = parts[0].trim();
			artist = parts[1].trim();
		}
	}
	title = title.replace(/\s+/g, " ").trim() || "Untitled Track";
	artist = artist.replace(/\s+/g, " ").trim() || "Unknown Artist";
	return {
		title,
		artist,
		album,
		format
	};
}
export { sanitizeFilename };
