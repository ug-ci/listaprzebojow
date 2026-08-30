const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const CHART_TRACKS = [
  { id: 't-01', position: 1, prevPosition: 2, trend: 'UP', weeks: 5, peak: 1, title: 'Bałtycki Sztorm', artist: 'Neon Wave & MORS Collective', album: 'Zatoka Dźwięków', duration: '3:42', votes: 412, coverBg: '#0041d2', bpm: 124, genre: 'Synthwave / Indie', audioKey: 'synth_chill' },
  { id: 't-02', position: 2, prevPosition: 1, trend: 'DOWN', weeks: 8, peak: 1, title: 'Nocny Tramwaj na Oliwę', artist: 'Studencki Nokturn', album: 'Godziny Rektorskie EP', duration: '4:15', votes: 398, coverBg: '#032c73', bpm: 118, genre: 'Alt-Pop', audioKey: 'guitar_groove' },
  { id: 't-03', position: 3, prevPosition: 4, trend: 'UP', weeks: 3, peak: 3, title: 'Sesja Poprawkowa Blues', artist: 'Dziekanat Funk Squad', album: 'Warunkowy Wpis', duration: '3:18', votes: 365, coverBg: '#00214d', bpm: 105, genre: 'Funk / Rock', audioKey: 'funk_bass' },
  { id: 't-04', position: 4, prevPosition: 3, trend: 'DOWN', weeks: 11, peak: 1, title: 'Kawa z Automatu', artist: 'Pola & Czysty Zysk', album: 'Akademik Numer 3', duration: '2:54', votes: 341, coverBg: '#0041d2', bpm: 95, genre: 'Lo-Fi Indie', audioKey: 'lofi_keys' },
  { id: 't-05', position: 5, prevPosition: 0, trend: 'NEW', weeks: 1, peak: 5, title: 'Plaża w Jelitkowie o 4:00', artist: 'Sonar Moods', album: 'Wschody Słońca', duration: '3:50', votes: 320, coverBg: '#032c73', bpm: 120, genre: 'Dream Pop', audioKey: 'synth_chill' },
  { id: 't-06', position: 6, prevPosition: 6, trend: 'SAME', weeks: 6, peak: 2, title: 'Erazmus Romance', artist: 'The Campus Lights', album: 'International Exchange', duration: '3:30', votes: 295, coverBg: '#0041d2', bpm: 128, genre: 'Dance Pop', audioKey: 'guitar_groove' },
  { id: 't-07', position: 7, prevPosition: 10, trend: 'UP', weeks: 2, peak: 7, title: 'Szybki Zjazd do Domu', artist: 'SKM Express', album: 'Tory i Perony', duration: '3:05', votes: 280, coverBg: '#00214d', bpm: 140, genre: 'Post-Punk', audioKey: 'punk_drive' },
  { id: 't-08', position: 8, prevPosition: 7, trend: 'DOWN', weeks: 9, peak: 3, title: 'Cisza Przed Kolokwium', artist: 'Biblioteka Główna', album: 'Czytelnia Czasopism', duration: '4:02', votes: 264, coverBg: '#032c73', bpm: 88, genre: 'Ambient Rock', audioKey: 'lofi_keys' },
  { id: 't-09', position: 9, prevPosition: 12, trend: 'UP', weeks: 4, peak: 9, title: 'Darmowa Pizza w Samorządzie', artist: 'Koło Naukowe Groovu', album: 'Budżet Obywatelski', duration: '3:12', votes: 248, coverBg: '#0041d2', bpm: 112, genre: 'Indie Pop', audioKey: 'funk_bass' },
  { id: 't-10', position: 10, prevPosition: 8, trend: 'DOWN', weeks: 7, peak: 5, title: 'Widok ze Skweru Kościuszki', artist: 'Gdynia Calling', album: 'Port Północny', duration: '3:35', votes: 231, coverBg: '#00214d', bpm: 122, genre: 'Electro Rock', audioKey: 'synth_chill' },
  { id: 't-11', position: 11, prevPosition: 14, trend: 'UP', weeks: 2, peak: 11, title: 'Legitymacja Przestała Działać', artist: 'Druk 3D', album: 'Błąd 404', duration: '2:48', votes: 219, coverBg: '#032c73', bpm: 132, genre: 'Garage Rock', audioKey: 'punk_drive' },
  { id: 't-12', position: 12, prevPosition: 9, trend: 'DOWN', weeks: 12, peak: 1, title: 'Mgła nad Zaspą', artist: 'Blokowiska', album: 'Wielka Płyta', duration: '4:30', votes: 205, coverBg: '#0041d2', bpm: 92, genre: 'Coldwave', audioKey: 'lofi_keys' },
  { id: 't-13', position: 13, prevPosition: 13, trend: 'SAME', weeks: 4, peak: 10, title: 'Kierunkowy do Szczęścia', artist: 'Kasia & Radiowcy', album: 'Antena 98.4 FM', duration: '3:22', votes: 194, coverBg: '#00214d', bpm: 125, genre: 'Synthpop', audioKey: 'synth_chill' },
  { id: 't-14', position: 14, prevPosition: 18, trend: 'UP', weeks: 2, peak: 14, title: 'Ostatni Żeton na Pralnię', artist: 'Dom Studencki 5', album: 'Wirowanie', duration: '3:10', votes: 180, coverBg: '#032c73', bpm: 115, genre: 'Indie Pop', audioKey: 'guitar_groove' },
  { id: 't-15', position: 15, prevPosition: 0, trend: 'NEW', weeks: 1, peak: 15, title: 'Żurawie na Stoczni', artist: 'Industrial Baltic Project', album: 'Rzeźba Rdzy', duration: '4:40', votes: 168, coverBg: '#0041d2', bpm: 130, genre: 'Techno / Industrial', audioKey: 'punk_drive' },
  { id: 't-16', position: 16, prevPosition: 15, trend: 'DOWN', weeks: 5, peak: 12, title: 'Zajęcia o 8:00 Rano', artist: 'Zombie Crew', album: 'Brak Energii', duration: '2:50', votes: 155, coverBg: '#00214d', bpm: 80, genre: 'Slacker Rock', audioKey: 'funk_bass' },
  { id: 't-17', position: 17, prevPosition: 19, trend: 'UP', weeks: 2, peak: 17, title: 'Światłowód w Kampusie', artist: 'IT Syndicate', album: 'Gigabit Ethernet', duration: '3:38', votes: 142, coverBg: '#032c73', bpm: 126, genre: 'Electro Indie', audioKey: 'synth_chill' },
  { id: 't-18', position: 18, prevPosition: 16, trend: 'DOWN', weeks: 8, peak: 8, title: 'Promenada Gwiazd', artist: 'Sopot Summer Vibes', album: 'Molo nocą', duration: '3:25', votes: 130, coverBg: '#0041d2', bpm: 116, genre: 'Nu-Disco', audioKey: 'guitar_groove' },
  { id: 't-19', position: 19, prevPosition: 20, trend: 'UP', weeks: 3, peak: 19, title: 'Przegląd Prasy Muzycznej', artist: 'Koło Dziennikarzy UG', album: 'Wydanie Specjalne', duration: '3:14', votes: 118, coverBg: '#00214d', bpm: 110, genre: 'Indie Pop', audioKey: 'lofi_keys' },
  { id: 't-20', position: 20, prevPosition: 17, trend: 'DOWN', weeks: 14, peak: 2, title: 'Ostatnia Strona Pracy Inżynierskiej', artist: 'Absolwenci 2026', album: 'Wnioski i Bibliografia', duration: '4:05', votes: 102, coverBg: '#032c73', bpm: 100, genre: 'Post-Rock', audioKey: 'lofi_keys' },
];

const WAITING_TRACKS = [
  { id: 'p-01', title: 'Cisza Nocna na Morenie', artist: 'Kwartał 4', duration: '3:20', votes: 94, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-02', title: 'Promotor Nie Odpisuje', artist: 'Termin Wrześniowy', duration: '2:45', votes: 88, weeksInWaiting: 2, tag: 'Gorący debiut' },
  { id: 'p-03', title: 'Pętla Łostowice', artist: 'Południowe Linie', duration: '3:35', votes: 82, weeksInWaiting: 3, tag: 'Wybór słuchaczy' },
  { id: 'p-04', title: 'Deszcz na Wita Stwosza', artist: 'Maja & Syntezatory', duration: '3:50', votes: 79, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-05', title: 'Ksero za 15 Groszy', artist: 'Punkt Usługowy', duration: '2:30', votes: 75, weeksInWaiting: 4, tag: 'Ostatnia szansa' },
  { id: 'p-06', title: 'Neony w Starym Maneżu', artist: 'Garnizon Sound', duration: '4:10', votes: 71, weeksInWaiting: 2, tag: 'Wybór słuchaczy' },
  { id: 'p-07', title: 'Kebab po Koncercie', artist: 'Wrzeszcz Squad', duration: '3:02', votes: 68, weeksInWaiting: 3, tag: 'Lokalne granie' },
  { id: 'p-08', title: 'Rewolucja w Kwadracie', artist: 'Klub Studencki Kwadratowa', duration: '3:40', votes: 65, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-09', title: 'Stypendium Rektora', artist: 'Średnia 4.95', duration: '3:15', votes: 62, weeksInWaiting: 2, tag: 'Wybór słuchaczy' },
  { id: 'p-10', title: 'Kajakiem przez Motławę', artist: 'Wodne Ptaki', duration: '3:55', votes: 59, weeksInWaiting: 3, tag: 'Chillout' },
  { id: 'p-11', title: 'Zgubiony Pendrive z Prezentacją', artist: 'Panika na Sali', duration: '2:50', votes: 57, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-12', title: 'Widok na Zatokę z Pachołka', artist: 'Oliwskie Wzgórza', duration: '4:20', votes: 54, weeksInWaiting: 2, tag: 'Indie Folk' },
  { id: 'p-13', title: 'Autobus Linii 199', artist: 'Spóźnieni Pasażerowie', duration: '3:08', votes: 51, weeksInWaiting: 4, tag: 'Ostatnia szansa' },
  { id: 'p-14', title: 'Płyty Winylowe z Targu', artist: 'Dominik & Kolekcjonerzy', duration: '3:44', votes: 49, weeksInWaiting: 2, tag: 'Retro Wave' },
  { id: 'p-15', title: 'Zajęcia z WF o 7:15', artist: 'Basen AWFiS', duration: '2:40', votes: 47, weeksInWaiting: 3, tag: 'Lokalne granie' },
  { id: 'p-16', title: 'Gofry w Brzeźnie', artist: 'Mewy i Frytki', duration: '3:10', votes: 44, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-17', title: 'Zimne Piwo na Polance', artist: 'Reduta Redłowska', duration: '3:30', votes: 42, weeksInWaiting: 2, tag: 'Wybór słuchaczy' },
  { id: 'p-18', title: 'Projekt Grupowy Solo', artist: 'Liderzy z Przymusu', duration: '3:05', votes: 39, weeksInWaiting: 3, tag: 'Rock Alternatywny' },
  { id: 'p-19', title: 'Elektryczna Hulajnoga w Rowu', artist: 'Młode Miasto', duration: '2:55', votes: 37, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-20', title: 'Wiatr od Helu', artist: 'Zimna Fala', duration: '4:00', votes: 35, weeksInWaiting: 4, tag: 'Ostatnia szansa' },
  { id: 'p-21', title: 'Naleśniki ze Szpinakiem', artist: 'Bar Mleczny Jantar', duration: '2:48', votes: 33, weeksInWaiting: 2, tag: 'Lokalne granie' },
  { id: 'p-22', title: 'Niewyspani na Wykładzie', artist: 'Katedra Neurobiologii', duration: '3:38', votes: 30, weeksInWaiting: 1, tag: 'Nowość redakcji' },
  { id: 'p-23', title: 'Impreza w Falowcu', artist: 'Długie Korytarze', duration: '3:22', votes: 28, weeksInWaiting: 3, tag: 'Wybór słuchaczy' },
  { id: 'p-24', title: 'Koniec Rundy Rekrutacyjnej', artist: 'Biuro Karier', duration: '3:12', votes: 25, weeksInWaiting: 2, tag: 'Pop-Punk' },
  { id: 'p-25', title: 'Świt nad Kampusem UG', artist: 'MORS Radioteam', duration: '4:32', votes: 22, weeksInWaiting: 1, tag: 'Nowość redakcji' },
];

function durationToSeconds(str) {
  const parts = str.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

async function main() {
  console.log('🌱 Rozpoczynanie seedowania bazy danych Radio MORS...');

  // Wyczyść istniejące dane
  await prisma.auditLog.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.voter.deleteMany();
  await prisma.chartEntry.deleteMany();
  await prisma.chartEdition.deleteMany();
  await prisma.track.deleteMany();
  await prisma.adminUser.deleteMany();

  console.log('🗑️  Wyczyszczono istniejące dane');

  // Utwórz edycję notowania
  const now = new Date();
  const votingEndsAt = new Date(now.getTime() + (2 * 24 * 3600 + 14 * 3600 + 28 * 60) * 1000);

  const edition = await prisma.chartEdition.create({
    data: {
      editionNumber: 142,
      title: 'Notowanie 142 • Sezon Akademicki 2025/2026',
      votingStartsAt: now,
      votingEndsAt: votingEndsAt,
      status: 'ACTIVE',
      isCurrent: true,
    }
  });
  console.log(`✅ Utworzono edycję notowania #${edition.editionNumber}`);

  // Utwórz tracks z TOP 20
  for (const t of CHART_TRACKS) {
    const track = await prisma.track.create({
      data: {
        title: t.title,
        artist: t.artist,
        album: t.album || null,
        genre: t.genre || null,
        status: 'CHART',
        durationSeconds: durationToSeconds(t.duration),
        totalWeeksOnChart: t.weeks,
        peakPosition: t.peak,
        bpm: t.bpm || null,
        audioKey: t.audioKey || 'synth_chill',
      }
    });

    const trendMap = { UP: 'UP', DOWN: 'DOWN', NEW: 'NEW', SAME: 'SAME' };

    await prisma.chartEntry.create({
      data: {
        editionId: edition.id,
        trackId: track.id,
        position: t.position,
        previousPosition: t.prevPosition || null,
        trend: trendMap[t.trend] || 'SAME',
        votesCount: t.votes,
        weeksOnChart: t.weeks,
        isInWaitingRoom: false,
      }
    });
  }
  console.log(`✅ Dodano ${CHART_TRACKS.length} utworów do notowania`);

  // Utwórz tracks z poczekalni
  for (const t of WAITING_TRACKS) {
    const track = await prisma.track.create({
      data: {
        title: t.title,
        artist: t.artist,
        status: 'WAITING_ROOM',
        durationSeconds: durationToSeconds(t.duration),
        totalWeeksOnChart: 0,
      }
    });

    await prisma.chartEntry.create({
      data: {
        editionId: edition.id,
        trackId: track.id,
        position: null,
        trend: 'NEW',
        votesCount: t.votes,
        weeksOnChart: t.weeksInWaiting,
        isInWaitingRoom: true,
        tag: t.tag || null,
      }
    });
  }
  console.log(`✅ Dodano ${WAITING_TRACKS.length} utworów do poczekalni`);

  // Utwórz konta administratorów z LOSOWYMI hasłami (pokazywane tylko raz, poniżej).
  const accounts = [
    { email: 'redakcja@mors.ug.edu.pl', fullName: 'Tomasz Nowak', role: 'SUPER_ADMIN' },
    { email: 'anna.kowalska@ug.edu.pl', fullName: 'dr Anna Kowalska', role: 'MUSIC_EDITOR' },
    { email: 'maciej.wisniewski@mors.ug.edu.pl', fullName: 'Maciej Wiśniewski', role: 'PRESENTER' },
  ];

  const created = [];
  for (const acc of accounts) {
    const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({ data: { ...acc, passwordHash, isActive: true } });
    created.push({ email: acc.email, password });
  }
  console.log('✅ Dodano 3 konta redaktorów');
  console.log('');
  console.log('🎉 Seedowanie zakończone pomyślnie!');
  console.log('');
  console.log('📋 Dane logowania (zapisz teraz — nie będą pokazane ponownie):');
  for (const c of created) {
    console.log(`   ${c.email}  →  ${c.password}`);
  }
  console.log('');
  console.log('   (Możesz też ustawić wspólne hasło startowe zmienną SEED_ADMIN_PASSWORD.)');
}

main()
  .catch((e) => {
    console.error('❌ Błąd seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
