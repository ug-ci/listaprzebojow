const COVER_PALETTE = ['#0041d2', '#032c73', '#00214d'];

function coverBgFor(trackId) {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash * 31 + trackId.charCodeAt(i)) >>> 0;
  }
  return COVER_PALETTE[hash % COVER_PALETTE.length];
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function serializeChartEntry(entry) {
  const track = entry.track;
  return {
    id: entry.id,
    trackId: track.id,
    position: entry.position,
    prevPosition: entry.previousPosition,
    trend: entry.trend,
    weeks: entry.weeksOnChart,
    peak: track.peakPosition,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: formatDuration(track.durationSeconds),
    votes: entry.votesCount,
    coverBg: coverBgFor(track.id),
    coverImage: track.coverImageUrl || null,
    audioUrl: track.audioUrl || null,
    bpm: track.bpm,
    genre: track.genre,
    audioKey: track.audioKey || 'synth_chill',
    isChart: !entry.isInWaitingRoom,
  };
}

function serializeWaitingEntry(entry) {
  const track = entry.track;
  return {
    id: entry.id,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    duration: formatDuration(track.durationSeconds),
    votes: entry.votesCount,
    weeksInWaiting: entry.weeksOnChart,
    coverBg: coverBgFor(track.id),
    coverImage: track.coverImageUrl || null,
    audioUrl: track.audioUrl || null,
    tag: entry.tag,
    isChart: false,
  };
}

module.exports = { serializeChartEntry, serializeWaitingEntry, formatDuration, coverBgFor };
