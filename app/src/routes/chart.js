const express = require('express');
const prisma = require('../services/prisma');
const { serializeChartEntry, serializeWaitingEntry } = require('../services/chartSerializer');

const router = express.Router();

async function getCurrentEdition() {
  return prisma.chartEdition.findFirst({ where: { isCurrent: true } });
}

router.get('/current', async (req, res, next) => {
  try {
    const edition = await getCurrentEdition();
    if (!edition) {
      return res.status(404).json({ success: false, message: 'Brak aktywnego notowania.' });
    }

    const entries = await prisma.chartEntry.findMany({
      where: { editionId: edition.id, isInWaitingRoom: false },
      include: { track: true },
      orderBy: { position: 'asc' },
    });

    const allEntries = await prisma.chartEntry.findMany({ where: { editionId: edition.id } });
    const totalVotesCount = allEntries.reduce((sum, e) => sum + e.votesCount, 0);

    res.json({
      success: true,
      edition: {
        id: edition.id,
        number: edition.editionNumber,
        title: edition.title,
        endsAt: edition.votingEndsAt,
        status: edition.status,
        totalVotesCount,
        onlineListeners: 300 + Math.floor(Math.random() * 90),
      },
      chartTracks: entries.map(serializeChartEntry),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/waiting-room', async (req, res, next) => {
  try {
    const edition = await getCurrentEdition();
    if (!edition) {
      return res.status(404).json({ success: false, message: 'Brak aktywnego notowania.' });
    }

    const entries = await prisma.chartEntry.findMany({
      where: { editionId: edition.id, isInWaitingRoom: true },
      include: { track: true },
      orderBy: { votesCount: 'desc' },
    });

    res.json({
      success: true,
      waitingRoomTracks: entries.map(serializeWaitingEntry),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.getCurrentEdition = getCurrentEdition;
