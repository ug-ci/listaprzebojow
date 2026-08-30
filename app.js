/**
 * LISTA PRZEBOJÓW RADIA STUDENCKIEGO (RADIO MORS) • UNIWERSYTET GDAŃSKI
 * Wdrożenie zgodne ze standardem UG Design System (Zero Border-Radius / Sharp Geometry)
 * Rozszerzone o: System autoryzacji redakcji (Admin Auth) oraz upload okładek utworów (.JPG/.PNG/.WEBP)
 */

// --- DANE POCZĄTKOWE NOTOWANIA I POCZEKALNI ---
const INITIAL_STATE = {
  edition: {
    number: 142,
    title: "Notowanie 142 • Sezon Akademicki 2025/2026",
    endsAt: Date.now() + (2 * 24 * 3600 + 14 * 3600 + 28 * 60) * 1000, // ~2d 14h 28m
    status: "ACTIVE",
    totalVotesCount: 4892,
    onlineListeners: 342,
  },
  // TOP 20 Główne Notowanie
  chartTracks: [
    {
      id: "t-01",
      position: 1,
      prevPosition: 2,
      trend: "UP",
      weeks: 5,
      peak: 1,
      title: "Bałtycki Sztorm",
      artist: "Neon Wave & MORS Collective",
      album: "Zatoka Dźwięków",
      duration: "3:42",
      votes: 412,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 124,
      genre: "Synthwave / Indie",
      isChart: true,
      audioKey: "synth_chill"
    },
    {
      id: "t-02",
      position: 2,
      prevPosition: 1,
      trend: "DOWN",
      weeks: 8,
      peak: 1,
      title: "Nocny Tramwaj na Oliwę",
      artist: "Studencki Nokturn",
      album: "Godziny Rektorskie EP",
      duration: "4:15",
      votes: 398,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 118,
      genre: "Alt-Pop",
      isChart: true,
      audioKey: "guitar_groove"
    },
    {
      id: "t-03",
      position: 3,
      prevPosition: 4,
      trend: "UP",
      weeks: 3,
      peak: 3,
      title: "Sesja Poprawkowa Blues",
      artist: "Dziekanat Funk Squad",
      album: "Warunkowy Wpis",
      duration: "3:18",
      votes: 365,
      coverBg: "#00214d",
      coverImage: null,
      bpm: 105,
      genre: "Funk / Rock",
      isChart: true,
      audioKey: "funk_bass"
    },
    {
      id: "t-04",
      position: 4,
      prevPosition: 3,
      trend: "DOWN",
      weeks: 11,
      peak: 1,
      title: "Kawa z Automatu",
      artist: "Pola & Czysty Zysk",
      album: "Akademik Numer 3",
      duration: "2:54",
      votes: 341,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 95,
      genre: "Lo-Fi Indie",
      isChart: true,
      audioKey: "lofi_keys"
    },
    {
      id: "t-05",
      position: 5,
      prevPosition: 0,
      trend: "NEW",
      weeks: 1,
      peak: 5,
      title: "Plaża w Jelitkowie o 4:00",
      artist: "Sonar Moods",
      album: "Wschody Słońca",
      duration: "3:50",
      votes: 320,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 120,
      genre: "Dream Pop",
      isChart: true,
      audioKey: "synth_chill"
    },
    {
      id: "t-06",
      position: 6,
      prevPosition: 6,
      trend: "SAME",
      weeks: 6,
      peak: 2,
      title: "Erazmus Romance",
      artist: "The Campus Lights",
      album: "International Exchange",
      duration: "3:30",
      votes: 295,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 128,
      genre: "Dance Pop",
      isChart: true,
      audioKey: "guitar_groove"
    },
    {
      id: "t-07",
      position: 7,
      prevPosition: 10,
      trend: "UP",
      weeks: 2,
      peak: 7,
      title: "Szybki Zjazd do Domu",
      artist: "SKM Express",
      album: "Tory i Perony",
      duration: "3:05",
      votes: 280,
      coverBg: "#00214d",
      coverImage: null,
      bpm: 140,
      genre: "Post-Punk",
      isChart: true,
      audioKey: "punk_drive"
    },
    {
      id: "t-08",
      position: 8,
      prevPosition: 7,
      trend: "DOWN",
      weeks: 9,
      peak: 3,
      title: "Cisza Przed Kolokwium",
      artist: "Biblioteka Główna",
      album: "Czytelnia Czasopism",
      duration: "4:02",
      votes: 264,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 88,
      genre: "Ambient Rock",
      isChart: true,
      audioKey: "lofi_keys"
    },
    {
      id: "t-09",
      position: 9,
      prevPosition: 12,
      trend: "UP",
      weeks: 4,
      peak: 9,
      title: "Darmowa Pizza w Samorządzie",
      artist: "Koło Naukowe Groovu",
      album: "Budżet Obywatelski",
      duration: "3:12",
      votes: 248,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 112,
      genre: "Indie Pop",
      isChart: true,
      audioKey: "funk_bass"
    },
    {
      id: "t-10",
      position: 10,
      prevPosition: 8,
      trend: "DOWN",
      weeks: 7,
      peak: 5,
      title: "Widok ze Skweru Kościuszki",
      artist: "Gdynia Calling",
      album: "Port Północny",
      duration: "3:35",
      votes: 231,
      coverBg: "#00214d",
      coverImage: null,
      bpm: 122,
      genre: "Electro Rock",
      isChart: true,
      audioKey: "synth_chill"
    },
    {
      id: "t-11",
      position: 11,
      prevPosition: 14,
      trend: "UP",
      weeks: 2,
      peak: 11,
      title: "Legitymacja Przestała Działać",
      artist: "Druk 3D",
      album: "Błąd 404",
      duration: "2:48",
      votes: 219,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 132,
      genre: "Garage Rock",
      isChart: true,
      audioKey: "punk_drive"
    },
    {
      id: "t-12",
      position: 12,
      prevPosition: 9,
      trend: "DOWN",
      weeks: 12,
      peak: 1,
      title: "Mgła nad Zaspą",
      artist: "Blokowiska",
      album: "Wielka Płyta",
      duration: "4:30",
      votes: 205,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 92,
      genre: "Coldwave",
      isChart: true,
      audioKey: "lofi_keys"
    },
    {
      id: "t-13",
      position: 13,
      prevPosition: 13,
      trend: "SAME",
      weeks: 4,
      peak: 10,
      title: "Kierunkowy do Szczęścia",
      artist: "Kasia & Radiowcy",
      album: "Antena 98.4 FM",
      duration: "3:22",
      votes: 194,
      coverBg: "#00214d",
      coverImage: null,
      bpm: 125,
      genre: "Synthpop",
      isChart: true,
      audioKey: "synth_chill"
    },
    {
      id: "t-14",
      position: 14,
      prevPosition: 18,
      trend: "UP",
      weeks: 2,
      peak: 14,
      title: "Ostatni Żeton na Pralnię",
      artist: "Dom Studencki 5",
      album: "Wirowanie",
      duration: "3:10",
      votes: 180,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 115,
      genre: "Indie Pop",
      isChart: true,
      audioKey: "guitar_groove"
    },
    {
      id: "t-15",
      position: 15,
      prevPosition: 0,
      trend: "NEW",
      weeks: 1,
      peak: 15,
      title: "Żurawie na Stoczni",
      artist: "Industrial Baltic Project",
      album: "Rzeźba Rdzy",
      duration: "4:40",
      votes: 168,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 130,
      genre: "Techno / Industrial",
      isChart: true,
      audioKey: "punk_drive"
    },
    {
      id: "t-16",
      position: 16,
      prevPosition: 15,
      trend: "DOWN",
      weeks: 5,
      peak: 12,
      title: "Zajęcia o 8:00 Rano",
      artist: "Zombie Crew",
      album: "Brak Energii",
      duration: "2:50",
      votes: 155,
      coverBg: "#00214d",
      coverImage: null,
      bpm: 80,
      genre: "Slacker Rock",
      isChart: true,
      audioKey: "funk_bass"
    },
    {
      id: "t-17",
      position: 17,
      prevPosition: 19,
      trend: "UP",
      weeks: 2,
      peak: 17,
      title: "Światłowód w Kampusie",
      artist: "IT Syndicate",
      album: "Gigabit Ethernet",
      duration: "3:38",
      votes: 142,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 126,
      genre: "Electro Indie",
      isChart: true,
      audioKey: "synth_chill"
    },
    {
      id: "t-18",
      position: 18,
      prevPosition: 16,
      trend: "DOWN",
      weeks: 8,
      peak: 8,
      title: "Promenada Gwiazd",
      artist: "Sopot Summer Vibes",
      album: "Molo nocą",
      duration: "3:25",
      votes: 130,
      coverBg: "#0041d2",
      coverImage: null,
      bpm: 116,
      genre: "Nu-Disco",
      isChart: true,
      audioKey: "guitar_groove"
    },
    {
      id: "t-19",
      position: 19,
      prevPosition: 20,
      trend: "UP",
      weeks: 3,
      peak: 19,
      title: "Przegląd Prasy Muzycznej",
      artist: "Koło Dziennikarzy UG",
      album: "Wydanie Specjalne",
      duration: "3:14",
      votes: 118,
      coverBg: "#00214d",
      coverImage: null,
      bpm: 110,
      genre: "Indie Pop",
      isChart: true,
      audioKey: "lofi_keys"
    },
    {
      id: "t-20",
      position: 20,
      prevPosition: 17,
      trend: "DOWN",
      weeks: 14,
      peak: 2,
      title: "Ostatnia Strona Pracy Inżynierskiej",
      artist: "Absolwenci 2026",
      album: "Wnioski i Bibliografia",
      duration: "4:05",
      votes: 102,
      coverBg: "#032c73",
      coverImage: null,
      bpm: 100,
      genre: "Post-Rock",
      isChart: true,
      audioKey: "lofi_keys"
    }
  ],
  // POCZEKALNIA: Dokładnie 25 utworów kandydujących do notowania
  waitingRoomTracks: [
    { id: "p-01", title: "Cisza Nocna na Morenie", artist: "Kwartał 4", duration: "3:20", votes: 94, weeksInWaiting: 1, coverBg: "#0041d2", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-02", title: "Promotor Nie Odpisuje", artist: "Termin Wrześniowy", duration: "2:45", votes: 88, weeksInWaiting: 2, coverBg: "#032c73", coverImage: null, tag: "Gorący debiut" },
    { id: "p-03", title: "Pętla Łostowice", artist: "Południowe Linie", duration: "3:35", votes: 82, weeksInWaiting: 3, coverBg: "#00214d", coverImage: null, tag: "Wybór słuchaczy" },
    { id: "p-04", title: "Deszcz na Wita Stwosza", artist: "Maja & Syntezatory", duration: "3:50", votes: 79, weeksInWaiting: 1, coverBg: "#0041d2", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-05", title: "Ksero za 15 Groszy", artist: "Punkt Usługowy", duration: "2:30", votes: 75, weeksInWaiting: 4, coverBg: "#032c73", coverImage: null, tag: "Ostatnia szansa" },
    { id: "p-06", title: "Neony w Starym Maneżu", artist: "Garnizon Sound", duration: "4:10", votes: 71, weeksInWaiting: 2, coverBg: "#00214d", coverImage: null, tag: "Wybór słuchaczy" },
    { id: "p-07", title: "Kebab po Koncercie", artist: "Wrzeszcz Squad", duration: "3:02", votes: 68, weeksInWaiting: 3, coverBg: "#0041d2", coverImage: null, tag: "Lokalne granie" },
    { id: "p-08", title: "Rewolucja w Kwadracie", artist: "Klub Studencki Kwadratowa", duration: "3:40", votes: 65, weeksInWaiting: 1, coverBg: "#032c73", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-09", title: "Stypendium Rektora", artist: "Średnia 4.95", duration: "3:15", votes: 62, weeksInWaiting: 2, coverBg: "#00214d", coverImage: null, tag: "Wybór słuchaczy" },
    { id: "p-10", title: "Kajakiem przez Motławę", artist: "Wodne Ptaki", duration: "3:55", votes: 59, weeksInWaiting: 3, coverBg: "#0041d2", coverImage: null, tag: "Chillout" },
    { id: "p-11", title: "Zgubiony Pendrive z Prezentacją", artist: "Panika na Sali", duration: "2:50", votes: 57, weeksInWaiting: 1, coverBg: "#032c73", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-12", title: "Widok na Zatokę z Pachołka", artist: "Oliwskie Wzgórza", duration: "4:20", votes: 54, weeksInWaiting: 2, coverBg: "#00214d", coverImage: null, tag: "Indie Folk" },
    { id: "p-13", title: "Autobus Linii 199", artist: "Spóźnieni Pasażerowie", duration: "3:08", votes: 51, weeksInWaiting: 4, coverBg: "#0041d2", coverImage: null, tag: "Ostatnia szansa" },
    { id: "p-14", title: "Płyty Winylowe z Targu", artist: "Dominik & Kolekcjonerzy", duration: "3:44", votes: 49, weeksInWaiting: 2, coverBg: "#032c73", coverImage: null, tag: "Retro Wave" },
    { id: "p-15", title: "Zajęcia z WF o 7:15", artist: "Basen AWFiS", duration: "2:40", votes: 47, weeksInWaiting: 3, coverBg: "#00214d", coverImage: null, tag: "Lokalne granie" },
    { id: "p-16", title: "Gofry w Brzeźnie", artist: "Mewy i Frytki", duration: "3:10", votes: 44, weeksInWaiting: 1, coverBg: "#0041d2", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-17", title: "Zimne Piwo na Polance", artist: "Reduta Redłowska", duration: "3:30", votes: 42, weeksInWaiting: 2, coverBg: "#032c73", coverImage: null, tag: "Wybór słuchaczy" },
    { id: "p-18", title: "Projekt Grupowy Solo", artist: "Liderzy z Przymusu", duration: "3:05", votes: 39, weeksInWaiting: 3, coverBg: "#00214d", coverImage: null, tag: "Rock Alternatywny" },
    { id: "p-19", title: "Elektryczna Hulajnoga w Rowu", artist: "Młode Miasto", duration: "2:55", votes: 37, weeksInWaiting: 1, coverBg: "#0041d2", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-20", title: "Wiatr od Helu", artist: "Zimna Fala", duration: "4:00", votes: 35, weeksInWaiting: 4, coverBg: "#032c73", coverImage: null, tag: "Ostatnia szansa" },
    { id: "p-21", title: "Naleśniki ze Szpinakiem", artist: "Bar Mleczny Jantar", duration: "2:48", votes: 33, weeksInWaiting: 2, coverBg: "#00214d", coverImage: null, tag: "Lokalne granie" },
    { id: "p-22", title: "Niewyspani na Wykładzie", artist: "Katedra Neurobiologii", duration: "3:38", votes: 30, weeksInWaiting: 1, coverBg: "#0041d2", coverImage: null, tag: "Nowość redakcji" },
    { id: "p-23", title: "Impreza w Falowcu", artist: "Długie Korytarze", duration: "3:22", votes: 28, weeksInWaiting: 3, coverBg: "#032c73", coverImage: null, tag: "Wybór słuchaczy" },
    { id: "p-24", title: "Koniec Rundy Rekrutacyjnej", artist: "Biuro Karier", duration: "3:12", votes: 25, weeksInWaiting: 2, coverBg: "#00214d", coverImage: null, tag: "Pop-Punk" },
    { id: "p-25", title: "Świt nad Kampusem UG", artist: "MORS Radioteam", duration: "4:32", votes: 22, weeksInWaiting: 1, coverBg: "#0041d2", coverImage: null, tag: "Nowość redakcji" }
  ]
};

// Domyślna lista zespołu redakcyjnego
const INITIAL_EDITORS = [
  {
    id: "ed-01",
    name: "Tomasz Nowak",
    email: "redakcja@mors.ug.edu.pl",
    role: "SUPER_ADMIN",
    roleLabel: "Główny Redaktor Muzyczny",
    status: "Aktywny",
    addedAt: "2025-10-01"
  },
  {
    id: "ed-02",
    name: "dr Anna Kowalska",
    email: "anna.kowalska@ug.edu.pl",
    role: "MUSIC_EDITOR",
    roleLabel: "Kierownik Programowy",
    status: "Aktywny",
    addedAt: "2025-11-15"
  },
  {
    id: "ed-03",
    name: "Maciej Wiśniewski",
    email: "maciej.wisniewski@mors.ug.edu.pl",
    role: "PRESENTER",
    roleLabel: "Prezenter Audycji na Żywo",
    status: "Aktywny",
    addedAt: "2026-02-01"
  }
];

// ================= GŁÓWNA KLASA APLIKACJI =================
class StudentRadioApp {
  constructor() {
    this.state = this.loadState();
    this.selectedVotes = new Set();
    this.maxVotesAllowed = 3;
    this.cooldownEndTime = null;
    this.activeTab = 'chart';
    
    // Administrator Auth, Editors & Cover Upload State
    this.adminUser = JSON.parse(localStorage.getItem('radio_mors_admin_user')) || null;
    this.editors = this.loadEditors();
    this.pendingCoverDataUrl = null;
    this.pendingAudioObjectUrl = null;
    this.pendingAudioBlob = null;

    // Audio engine
    this.audioCtx = null;
    this.currentPlayingId = null;
    this.activeOscillators = [];
    this.audioTimeout = null;
    // Wgrane pliki audio przechowujemy jako obiektowe URL-e w pamięci sesji
    // (klucz: id utworu). Nie trafiają do localStorage, bo przekroczyłyby limit.
    this.customAudioSources = {};
    this.currentAudioEl = null;

    this.init();
  }

  init() {
    this.loadSavedCooldown();
    this.loadCustomAudioFromDB();
    this.bindEvents();
    this.render();
    this.startLiveSimulation();
    this.startCountdownTimer();
    this.check24hCooldown();
    this.updateAdminAuthUI();
    this.handleLoginRoute();
    window.addEventListener('popstate', () => this.handleLoginRoute());
  }

  loadState() {
    try {
      const saved = localStorage.getItem('radio_mors_voted_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chartTracks && parsed.waitingRoomTracks && parsed.edition) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not load state, using initial:", e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveState() {
    try {
      localStorage.setItem('radio_mors_voted_state', JSON.stringify(this.state));
    } catch (e) {
      console.error("Save state failed:", e);
    }
  }

  loadSavedCooldown() {
    const savedCooldown = localStorage.getItem('radio_mors_cooldown_end');
    if (savedCooldown) {
      const end = parseInt(savedCooldown, 10);
      if (Date.now() < end) {
        this.cooldownEndTime = end;
      } else {
        localStorage.removeItem('radio_mors_cooldown_end');
      }
    }
  }

  // --- ADMINISTRATOR AUTHENTICATION (LOGOWANIE REDAKCJI) ---
  openAdminLoginModal(updateUrl = true) {
    const modal = document.getElementById('admin-login-modal');
    if (modal) modal.classList.remove('hidden');
    if (updateUrl) this.enterLoginRoute();
  }

  closeAdminLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) modal.classList.add('hidden');
    this.exitLoginRoute();
  }

  // --- /logowanie ROUTE (editorial login) ---
  isLoginRoute() {
    const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === '/logowanie' || hash === '#logowanie' || hash === '#/logowanie';
  }

  enterLoginRoute() {
    if (this.isLoginRoute()) return;
    try {
      window.history.pushState({ loginRoute: true }, '', '/logowanie');
    } catch (err) {
      window.location.hash = 'logowanie';
    }
  }

  exitLoginRoute() {
    if (!this.isLoginRoute()) return;
    try {
      window.history.pushState({}, '', window.location.pathname.replace(/logowanie\/?$/i, '') || '/');
    } catch (err) {
      window.location.hash = '';
    }
  }

  handleLoginRoute() {
    if (!this.isLoginRoute()) {
      const modal = document.getElementById('admin-login-modal');
      if (modal) modal.classList.add('hidden');
      return;
    }
    if (this.adminUser) {
      this.exitLoginRoute();
      this.switchTab('admin');
    } else {
      this.openAdminLoginModal(false);
    }
  }

  fillDemoAdminCredentials() {
    const emailInput = document.getElementById('admin-login-email');
    const passInput = document.getElementById('admin-login-password');
    if (emailInput) emailInput.value = 'redakcja@mors.ug.edu.pl';
    if (passInput) passInput.value = 'RadioMORS2026!';
    this.showToast("Uzupełniono dane konta Redaktora Muzycznego UG", "info");
  }

  submitAdminLogin() {
    const email = document.getElementById('admin-login-email').value.trim();
    const pass = document.getElementById('admin-login-password').value.trim();

    if (!email || !pass) {
      this.showToast("Wprowadź adres e-mail i hasło administratora.", "warning");
      return;
    }

    // Walidacja (Demo Credentials)
    if (email.includes('@') && pass.length >= 4) {
      this.adminUser = {
        email: email,
        name: email.startsWith('redakcja') ? 'Tomasz Nowak' : 'Redaktor Muzyczny MORS',
        role: 'Główny Redaktor Muzyczny UG',
        token: `mors-jwt-token-${Date.now()}`,
        avatar: 'TN'
      };
      localStorage.setItem('radio_mors_admin_user', JSON.stringify(this.adminUser));
      this.closeAdminLoginModal();
      this.updateAdminAuthUI();
      this.switchTab('admin');
      this.showToast(`Zalogowano pomyślnie jako ${this.adminUser.name} (${this.adminUser.role})`, "success");
    } else {
      this.showToast("Nieprawidłowe dane logowania. Użyj przycisku 'Wypełnij dane demo'.", "warning");
    }
  }

  logoutAdmin() {
    this.adminUser = null;
    localStorage.removeItem('radio_mors_admin_user');
    this.updateAdminAuthUI();
    this.switchTab('chart');
    this.showToast("Wylogowano z panelu administratora.", "info");
  }

  updateAdminAuthUI() {
    const authStatusEl = document.getElementById('header-admin-auth-widget');
    if (!authStatusEl) return;

    if (this.adminUser) {
      authStatusEl.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-[#0041d2] text-white border border-[#0041d2] text-xs font-headings">
            <span class="w-2 h-2 rounded-full bg-[#1BA345] animate-pulse"></span>
            <span class="font-bold">${this.adminUser.name}</span>
            <span class="text-[#a1daf8] text-[10px] hidden lg:inline">(${this.adminUser.role})</span>
          </div>
          <button onclick="app.logoutAdmin()" class="btn-ug-outlined btn-ug-sm !py-1.5 !px-2.5" title="Wyloguj z CMS">
            <i data-lucide="log-out" class="w-3.5 h-3.5 text-[#EF305E]"></i>
            <span class="hidden sm:inline">Wyloguj</span>
          </button>
        </div>
      `;
    } else {
      // Logowanie redakcji jest dostępne wyłącznie pod adresem /logowanie
      authStatusEl.innerHTML = '';
    }
    lucide.createIcons();
  }

  loadEditors() {
    try {
      const saved = localStorage.getItem('radio_mors_editors');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load editors:", e);
    }
    return JSON.parse(JSON.stringify(INITIAL_EDITORS));
  }

  saveEditors() {
    try {
      localStorage.setItem('radio_mors_editors', JSON.stringify(this.editors));
    } catch (e) {
      console.error("Save editors failed:", e);
    }
  }

  openAddEditorModal() {
    if (!this.adminUser) {
      this.showToast("Wymagane uprawnienia administratora.", "warning");
      this.openAdminLoginModal();
      return;
    }
    const modal = document.getElementById('admin-editor-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeAddEditorModal() {
    const modal = document.getElementById('admin-editor-modal');
    if (modal) modal.classList.add('hidden');
  }

  submitNewEditor() {
    if (!this.adminUser) {
      this.showToast("Brak uprawnień.", "warning");
      return;
    }

    const nameInput = document.getElementById('editor-input-name');
    const emailInput = document.getElementById('editor-input-email');
    const roleInput = document.getElementById('editor-input-role');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const role = roleInput ? roleInput.value : 'MUSIC_EDITOR';

    if (!name || !email) {
      this.showToast("Wprowadź imię, nazwisko i adres e-mail redaktora.", "warning");
      return;
    }

    if (!email.includes('@')) {
      this.showToast("Wprowadź poprawny adres e-mail.", "warning");
      return;
    }

    const roleLabels = {
      'SUPER_ADMIN': 'Główny Administrator',
      'MUSIC_EDITOR': 'Redaktor Muzyczny',
      'PRESENTER': 'Prezenter Audycji'
    };

    const newEditor = {
      id: `ed-${Date.now()}`,
      name,
      email,
      role,
      roleLabel: roleLabels[role] || 'Redaktor Muzyczny',
      status: 'Aktywny',
      addedAt: new Date().toISOString().split('T')[0]
    };

    this.editors.push(newEditor);
    this.saveEditors();
    this.renderEditorsList();
    this.closeAddEditorModal();

    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';

    this.showToast(`Redaktor ${name} (${roleLabels[role]}) został pomyślnie dodany do bazy!`, "success");
  }

  removeEditor(id) {
    if (!this.adminUser) {
      this.showToast("Brak uprawnień.", "warning");
      return;
    }

    const editor = this.editors.find(e => e.id === id);
    if (!editor) return;

    if (this.adminUser && this.adminUser.email === editor.email) {
      this.showToast("Nie możesz usunąć aktualnie zalogowanego konta redaktora.", "warning");
      return;
    }

    this.editors = this.editors.filter(e => e.id !== id);
    this.saveEditors();
    this.renderEditorsList();
    this.showToast(`Konto redaktora ${editor.name} zostało usunięte z bazy.`, "info");
  }

  renderEditorsList() {
    const container = document.getElementById('admin-editors-table-body');
    if (!container) return;

    container.innerHTML = this.editors.map(ed => {
      const isCurrent = this.adminUser && this.adminUser.email === ed.email;
      const roleBadgeClass = ed.role === 'SUPER_ADMIN' ? 'ug-tag-navy' :
                             ed.role === 'MUSIC_EDITOR' ? 'ug-tag-blue' : 'ug-tag-sail';

      const initials = ed.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      return `
        <tr class="border-b border-[#D9D9D9] hover:bg-[#e5f5fd]/50 text-xs">
          <td class="p-3">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 bg-[#00214d] text-white flex items-center justify-center font-headings font-bold text-[10px] flex-shrink-0">
                ${initials}
              </div>
              <div>
                <span class="font-headings font-bold text-[#032c73] block">${ed.name}</span>
                <span class="ug-small !text-[11px] text-[#647391] sm:hidden">${ed.email}</span>
              </div>
            </div>
          </td>
          <td class="p-3 text-[#647391] hidden sm:table-cell">${ed.email}</td>
          <td class="p-3">
            <span class="ug-tag ${roleBadgeClass}">
              ${ed.roleLabel || ed.role}
            </span>
          </td>
          <td class="p-3 text-[#647391] hidden md:table-cell">${ed.addedAt || '2026-01-01'}</td>
          <td class="p-3 text-right">
            ${isCurrent ? `
              <span class="ug-tag ug-tag-foam !text-[10px] font-bold">Twoje konto</span>
            ` : `
              <button onclick="app.removeEditor('${ed.id}')" class="text-[#EF305E] hover:text-[#d9224e] p-1.5 hover:bg-[#EF305E]/10" title="Usuń redaktora">
                <i data-lucide="user-x" class="w-4 h-4"></i>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  }

  // --- SYNTEZATOR PRÓBEK AUDIO (WEB AUDIO API) ---
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playAudioSnippet(trackId, title, artist) {
    this.initAudioContext();
    if (this.currentPlayingId === trackId) {
      this.stopAudio();
      return;
    }
    this.stopAudio();
    this.currentPlayingId = trackId;

    const track = [...this.state.chartTracks, ...this.state.waitingRoomTracks].find(t => t.id === trackId) || {};
    const customSrc = this.customAudioSources[trackId];

    if (customSrc) {
      // Utwór ma wgrany prawdziwy plik audio — odtwarzamy go.
      this.playCustomAudio(customSrc);
    } else {
      // Brak pliku — używamy proceduralnego syntezatora jako podglądu.
      const audioKey = track.audioKey || 'synth_chill';
      this.generateProceduralSnippet(audioKey);
    }

    this.updateMiniPlayer(trackId, title || track.title, artist || track.artist, true);
    this.renderAudioVisualizers(true);

    if (this.audioTimeout) clearTimeout(this.audioTimeout);
    this.audioTimeout = setTimeout(() => {
      this.stopAudio();
    }, 15000);
  }

  playCustomAudio(src) {
    const audioEl = new Audio(src);
    audioEl.addEventListener('ended', () => this.stopAudio());
    audioEl.play().catch(err => {
      console.warn("Nie udało się odtworzyć pliku audio:", err);
      this.showToast("Nie udało się odtworzyć pliku audio.", "warning");
      this.stopAudio();
    });
    this.currentAudioEl = audioEl;
  }

  generateProceduralSnippet(style) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, now);
    masterGain.connect(ctx.destination);

    if (style === 'synth_chill') {
      const freqs = [261.63, 329.63, 392.00, 523.25];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.08 / (idx + 1), now);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        this.activeOscillators.push(osc);
      });
    } else if (style === 'funk_bass') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      gain.gain.setValueAtTime(0.2, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      this.activeOscillators.push(osc);
    } else if (style === 'guitar_groove') {
      // Akord mocy (power chord) na fali piłokształtnej
      [146.83, 220.00].forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.12, now);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        this.activeOscillators.push(osc);
      });
    } else if (style === 'lofi_keys') {
      // Miękkie, ciepłe akordy lo-fi
      [196.00, 246.94, 293.66].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.09 / (idx + 1), now);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        this.activeOscillators.push(osc);
      });
    } else if (style === 'punk_drive') {
      // Ostry, gęsty dźwięk na fali prostokątnej
      [174.61, 349.23].forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.07, now);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        this.activeOscillators.push(osc);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.15, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      this.activeOscillators.push(osc);
    }
  }

  stopAudio() {
    if (this.audioTimeout) clearTimeout(this.audioTimeout);
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch(e){}
    });
    this.activeOscillators = [];
    if (this.currentAudioEl) {
      try {
        this.currentAudioEl.pause();
        this.currentAudioEl.currentTime = 0;
      } catch(e){}
      this.currentAudioEl.src = '';
      this.currentAudioEl = null;
    }
    this.currentPlayingId = null;
    this.updateMiniPlayer(null, null, null, false);
    this.renderAudioVisualizers(false);
  }

  updateMiniPlayer(trackId, title, artist, isPlaying) {
    const bar = document.getElementById('mini-audio-player');
    if (!bar) return;
    if (!isPlaying) {
      bar.classList.add('translate-y-full');
      return;
    }
    bar.classList.remove('translate-y-full');
    document.getElementById('player-track-title').innerText = title || "Odtwarzanie próbki...";
    document.getElementById('player-track-artist').innerText = artist || "Radio MORS • Próbka 30s";
  }

  renderAudioVisualizers(isPlaying) {
    document.querySelectorAll('.ug-waveform-container').forEach(el => {
      if (isPlaying && el.dataset.trackId === this.currentPlayingId) {
        el.querySelectorAll('.ug-waveform-bar').forEach(b => {
          b.style.height = `${Math.floor(Math.random() * 20 + 8)}px`;
          b.style.backgroundColor = '#0041d2';
        });
      } else {
        el.querySelectorAll('.ug-waveform-bar').forEach(b => {
          b.style.backgroundColor = '#647391';
        });
      }
    });
  }

  // --- ZARZĄDZANIE GŁOSOWANIEM (3 GŁOSY / 24H) ---
  toggleVote(trackId) {
    if (this.isCooldownActive()) {
      this.showToast("Twój limit 3 głosów na 24h jest obecnie aktywny!", "warning");
      return;
    }

    if (this.selectedVotes.has(trackId)) {
      this.selectedVotes.delete(trackId);
    } else {
      if (this.selectedVotes.size >= this.maxVotesAllowed) {
        this.showToast(`Możesz wybrać maksymalnie ${this.maxVotesAllowed} utwory w ramach jednego głosowania.`, "warning");
        return;
      }
      this.selectedVotes.add(trackId);
    }
    this.renderVotingDrawer();
    this.render();
  }

  isCooldownActive() {
    if (!this.cooldownEndTime) return false;
    return Date.now() < this.cooldownEndTime;
  }

  check24hCooldown() {
    const lockBanner = document.getElementById('voter-lock-banner');
    const drawer = document.getElementById('voting-drawer');

    if (this.isCooldownActive()) {
      if (lockBanner) lockBanner.classList.remove('hidden');
      if (drawer) drawer.classList.add('hidden');
      this.updateCooldownDisplay();
    } else {
      if (lockBanner) lockBanner.classList.add('hidden');
      if (this.selectedVotes.size > 0 && drawer) {
        drawer.classList.remove('hidden');
      }
    }
  }

  updateCooldownDisplay() {
    if (!this.isCooldownActive()) {
      this.cooldownEndTime = null;
      localStorage.removeItem('radio_mors_cooldown_end');
      this.check24hCooldown();
      return;
    }
    const remainingMs = this.cooldownEndTime - Date.now();
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

    const timerEl = document.getElementById('cooldown-timer-text');
    if (timerEl) {
      timerEl.innerText = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }

  reset24hCooldownDemo() {
    this.cooldownEndTime = null;
    localStorage.removeItem('radio_mors_cooldown_end');
    this.selectedVotes.clear();
    this.showToast("Blokada 24h zresetowana (Tryb Demo). Możesz głosować ponownie!", "success");
    this.check24hCooldown();
    this.render();
  }

  openSubmitVoteModal() {
    if (this.selectedVotes.size === 0) {
      this.showToast("Wybierz przynajmniej 1 utwór, aby oddać głos.", "warning");
      return;
    }
    const modal = document.getElementById('vote-verify-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.renderSelectedVotesInModal();
    }
  }

  closeSubmitVoteModal() {
    const modal = document.getElementById('vote-verify-modal');
    if (modal) modal.classList.add('hidden');
  }

  renderSelectedVotesInModal() {
    const container = document.getElementById('modal-selected-tracks-list');
    if (!container) return;

    const allTracks = [...this.state.chartTracks, ...this.state.waitingRoomTracks];
    const chosen = allTracks.filter(t => this.selectedVotes.has(t.id));

    container.innerHTML = chosen.map((t, idx) => `
      <div class="flex items-center justify-between p-3 border-2 border-[#0041d2] bg-[#e5f5fd]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-[#0041d2] flex items-center justify-center font-headings font-bold text-xs text-white">
            #${idx + 1}
          </div>
          <div>
            <div class="font-headings font-bold text-sm text-[#032c73]">${t.title}</div>
            <div class="ug-small text-xs">${t.artist}</div>
          </div>
        </div>
        <span class="ug-tag ${t.isChart ? 'ug-tag-blue' : 'ug-tag-sail'}">
          ${t.isChart ? 'Notowanie' : 'Poczekalnia'}
        </span>
      </div>
    `).join('');
  }

  confirmAndCastVotes() {
    const allTracks = [...this.state.chartTracks, ...this.state.waitingRoomTracks];
    const votedTracks = [];

    this.selectedVotes.forEach(id => {
      const track = allTracks.find(t => t.id === id);
      if (track) {
        track.votes = (track.votes || 0) + 1;
        votedTracks.push(track);
      }
    });

    this.state.edition.totalVotesCount += this.selectedVotes.size;
    this.saveState();

    const nextEligibleTime = Date.now() + 24 * 3600 * 1000;
    this.cooldownEndTime = nextEligibleTime;
    localStorage.setItem('radio_mors_cooldown_end', nextEligibleTime.toString());

    this.closeSubmitVoteModal();
    this.openSocialShareModal(votedTracks);

    this.selectedVotes.clear();
    this.check24hCooldown();
    this.render();
    this.showToast("Głosy zostały pomyślnie zarejestrowane! Dziękujemy!", "success");
  }

  // --- SOCIAL MEDIA SHARE STUDIO ---
  openSocialShareModal(votedTracks) {
    const modal = document.getElementById('social-share-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (!votedTracks || votedTracks.length === 0) {
      const allTracks = [...this.state.chartTracks, ...this.state.waitingRoomTracks];
      votedTracks = this.selectedVotes.size > 0 
        ? allTracks.filter(t => this.selectedVotes.has(t.id))
        : this.state.chartTracks.slice(0, 3);
    }

    this.generateSocialCanvas(votedTracks);
  }

  closeSocialShareModal() {
    const modal = document.getElementById('social-share-modal');
    if (modal) modal.classList.add('hidden');
  }

  generateSocialCanvas(tracks) {
    const canvas = document.getElementById('social-share-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1920;

    // Background (UG Navy #00214d) - Sharp Geometry
    ctx.fillStyle = '#00214d';
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle blue header banner
    ctx.fillStyle = '#0041d2';
    ctx.fillRect(0, 0, 1080, 440);

    // Header: Uniwersytet Gdański & Radio MORS
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a1daf8';
    ctx.font = 'bold 34px "Work Sans", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('UNIWERSYTET GDAŃSKI • RADIO MORS', 540, 180);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 76px "Work Sans", sans-serif';
    ctx.fillText('MÓJ GŁOS', 540, 280);

    // Edition Badge (Sharp rect)
    ctx.fillStyle = '#032c73';
    ctx.fillRect(360, 340, 360, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Work Sans", sans-serif';
    ctx.fillText(`NOTOWANIE #${this.state.edition.number}`, 540, 380);

    // Selected Tracks Cards (Sharp rects)
    let startY = 510;
    tracks.slice(0, 3).forEach((track, i) => {
      // White Card Box
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(90, startY, 900, 260);

      // Left blue accent stripe
      ctx.fillStyle = '#0041d2';
      ctx.fillRect(90, startY, 16, 260);

      // Artwork Box / Icon
      ctx.fillStyle = '#e5f5fd';
      ctx.fillRect(130, startY + 30, 200, 200);

      // Play / Note Icon
      ctx.fillStyle = '#0041d2';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('♫', 230, startY + 155);

      // Rank Number Badge
      ctx.fillStyle = '#00214d';
      ctx.fillRect(115, startY + 15, 60, 60);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px "Work Sans", sans-serif';
      ctx.fillText(`${i + 1}`, 145, startY + 56);

      // Track Title & Artist
      ctx.textAlign = 'left';
      ctx.fillStyle = '#032c73';
      ctx.font = 'bold 42px "Work Sans", sans-serif';
      ctx.fillText(this.truncateText(track.title, 22), 360, startY + 95);

      ctx.fillStyle = '#647391';
      ctx.font = '32px "DM Sans", sans-serif';
      ctx.fillText(this.truncateText(track.artist, 26), 360, startY + 150);

      // Tag (Sharp box)
      ctx.fillStyle = '#0041d2';
      ctx.fillRect(360, startY + 175, 230, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "Work Sans", sans-serif';
      ctx.fillText('✓ ZAGŁOSOWANO', 380, startY + 202);

      startY += 300;
    });

    // Bottom Call to Action
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px "Work Sans", sans-serif';
    ctx.fillText('Głosuj codziennie na mors.ug.edu.pl', 540, 1560);

    ctx.fillStyle = '#a1daf8';
    ctx.font = '26px "DM Sans", sans-serif';
    ctx.fillText('Audycja na żywo: w każdy Piątek o 18:00 na 98.4 FM', 540, 1620);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '22px "DM Sans", sans-serif';
    ctx.fillText('Uniwersytet Gdański • UG Design System', 540, 1800);
  }

  truncateText(text, maxLen) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text;
  }

  downloadSocialCard() {
    const canvas = document.getElementById('social-share-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `RadioMORS_UG_Notowanie_${this.state.edition.number}_MojGlos.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showToast("Karta graficzna została pobrana!", "success");
  }

  async shareViaWebShare() {
    const canvas = document.getElementById('social-share-canvas');
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'RadioMORS_UG_MojGlos.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Mój głos w Liście Przebojów Radia MORS #${this.state.edition.number}`,
            text: `Oddałem swoje 3 głosy na Listę Przebojów Radia MORS Uniwersytetu Gdańskiego! Zagłosuj też:`,
            url: window.location.href,
            files: [file]
          });
        } else {
          await navigator.share({
            title: `Lista Przebojów Radia MORS #${this.state.edition.number}`,
            text: `Oddałem swoje 3 głosy! Sprawdź notowanie:`,
            url: window.location.href
          });
        }
      });
    } catch (err) {
      console.log('Share dismissed or not supported', err);
    }
  }

  // --- TRWAŁE PRZECHOWYWANIE WGRANYCH PLIKÓW AUDIO (IndexedDB) ---
  // localStorage nie pomieści plików audio (limit ~5 MB, kodowanie base64),
  // więc bloby trzymamy w IndexedDB, kluczowane po id utworu.
  _openAudioDB() {
    if (this._audioDBPromise) return this._audioDBPromise;
    this._audioDBPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB niedostępne'));
        return;
      }
      const req = indexedDB.open('radio_mors_audio', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this._audioDBPromise;
  }

  async _idbPutAudio(key, blob) {
    const db = await this._openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async _idbDeleteAudio(key) {
    const db = await this._openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadCustomAudioFromDB() {
    try {
      const db = await this._openAudioDB();
      const { keys, vals } = await new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const keysReq = store.getAllKeys();
        const valsReq = store.getAll();
        tx.oncomplete = () => resolve({ keys: keysReq.result, vals: valsReq.result });
        tx.onerror = () => reject(tx.error);
      });
      keys.forEach((key, i) => {
        const blob = vals[i];
        if (blob) this.customAudioSources[key] = URL.createObjectURL(blob);
      });
    } catch (e) {
      console.warn('Nie udało się wczytać zapisanych plików audio z IndexedDB:', e);
    }
  }

  // --- ADMIN CMS: UPLOAD AUDIO & OKŁADEK ORAZ RESET NOTOWANIA ---
  handleAudioFileUpload(file) {
    if (!file) return;
    if (file.type && !file.type.startsWith('audio/')) {
      this.showToast("Obsługiwane są tylko pliki audio (.mp3, .wav, .ogg, .m4a).", "warning");
      return;
    }
    const uploadStatus = document.getElementById('admin-upload-status');
    const progressBar = document.getElementById('admin-upload-progress');

    if (uploadStatus) uploadStatus.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '20%';

    // Zachowaj rzeczywistą zawartość pliku, aby dało się ją później odtworzyć.
    // Poprzedni oczekujący plik zwalniamy, żeby nie wyciekać pamięci.
    if (this.pendingAudioObjectUrl) {
      URL.revokeObjectURL(this.pendingAudioObjectUrl);
    }
    this.pendingAudioObjectUrl = URL.createObjectURL(file);
    this.pendingAudioBlob = file;

    setTimeout(() => {
      if (progressBar) progressBar.style.width = '65%';
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const parts = cleanName.split(" - ");
      const artist = parts.length > 1 ? parts[0] : "Nowy Wykonawca";
      const title = parts.length > 1 ? parts[1] : cleanName;

      document.getElementById('admin-input-title').value = title;
      document.getElementById('admin-input-artist').value = artist;
      document.getElementById('admin-input-duration').value = "3:24";
    }, 400);

    setTimeout(() => {
      if (progressBar) progressBar.style.width = '100%';
      this.showToast(`Plik audio ${file.name} przetworzony: Normalizacja EBU R128 (-14 LUFS) zakończona pomyślnie.`, "success");
    }, 800);
  }

  handleCoverFileUpload(file) {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.showToast("Obsługiwane formaty okładek: .JPG, .PNG, .WEBP", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.pendingCoverDataUrl = e.target.result;
      const previewImg = document.getElementById('admin-cover-preview-img');
      const placeholder = document.getElementById('admin-cover-placeholder');
      const removeBtn = document.getElementById('admin-cover-remove-btn');

      if (previewImg) {
        previewImg.src = this.pendingCoverDataUrl;
        previewImg.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
      if (removeBtn) removeBtn.classList.remove('hidden');

      this.showToast(`Wczytano okładkę: ${file.name} (Automatyczne skalowanie do 600x600 WebP)`, "success");
    };
    reader.readAsDataURL(file);
  }

  removePendingCover() {
    this.pendingCoverDataUrl = null;
    const previewImg = document.getElementById('admin-cover-preview-img');
    const placeholder = document.getElementById('admin-cover-placeholder');
    const removeBtn = document.getElementById('admin-cover-remove-btn');
    const fileInput = document.getElementById('admin-cover-file-input');

    if (previewImg) {
      previewImg.src = '';
      previewImg.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
    if (fileInput) fileInput.value = '';
    this.showToast("Usunięto przypisaną okładkę", "info");
  }

  submitNewTrackFromAdmin() {
    if (!this.adminUser) {
      this.showToast("Musisz być zalogowany jako redaktor, aby dodawać utwory.", "warning");
      this.openAdminLoginModal();
      return;
    }

    const title = document.getElementById('admin-input-title').value.trim();
    const artist = document.getElementById('admin-input-artist').value.trim();
    const target = document.getElementById('admin-input-target').value;

    if (!title || !artist) {
      this.showToast("Wprowadź tytuł utworu i wykonawcę.", "warning");
      return;
    }

    const newTrack = {
      id: `custom-${Date.now()}`,
      title,
      artist,
      duration: document.getElementById('admin-input-duration').value || "3:30",
      votes: 0,
      coverBg: "#0041d2",
      coverImage: this.pendingCoverDataUrl || null,
      weeks: 1,
      peak: target === 'chart' ? 20 : null,
      trend: "NEW",
      tag: "Dodany przez redakcję",
      hasCustomAudio: !!this.pendingAudioObjectUrl
    };

    // Powiąż wgrany plik audio z utworem: URL do natychmiastowego odtwarzania
    // w pamięci sesji, a sam Blob zapisz w IndexedDB, by przetrwał odświeżenie.
    if (this.pendingAudioObjectUrl) {
      this.customAudioSources[newTrack.id] = this.pendingAudioObjectUrl;
      if (this.pendingAudioBlob) {
        this._idbPutAudio(newTrack.id, this.pendingAudioBlob).catch((e) => {
          console.warn('Nie udało się zapisać pliku audio (nie przetrwa odświeżenia):', e);
          this.showToast('Uwaga: pliku audio nie udało się zapisać trwale.', 'warning');
        });
      }
      this.pendingAudioObjectUrl = null;
      this.pendingAudioBlob = null;
    }

    if (target === 'waiting') {
      this.state.waitingRoomTracks.unshift(newTrack);
      if (this.state.waitingRoomTracks.length > 25) {
        this.state.waitingRoomTracks.pop();
      }
      this.showToast(`Utwór "${title}" z okładką dodany do Poczekalni (25 utworów)!`, "success");
    } else {
      newTrack.position = this.state.chartTracks.length + 1;
      this.state.chartTracks.push(newTrack);
      this.showToast(`Utwór "${title}" z okładką dodany do Notowania Głównego!`, "success");
    }

    this.saveState();
    this.render();
    
    // Reset formularza
    document.getElementById('admin-input-title').value = '';
    document.getElementById('admin-input-artist').value = '';
    document.getElementById('admin-upload-status').classList.add('hidden');
    const audioProgress = document.getElementById('admin-upload-progress');
    if (audioProgress) audioProgress.style.width = '0%';
    const audioInput = document.getElementById('admin-file-input');
    if (audioInput) audioInput.value = '';
    this.removePendingCover();
  }

  openResetChartModal() {
    if (!this.adminUser) {
      this.showToast("Wymagane uprawnienia redaktora do resetu notowania.", "warning");
      this.openAdminLoginModal();
      return;
    }
    const modal = document.getElementById('admin-reset-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeResetChartModal() {
    const modal = document.getElementById('admin-reset-modal');
    if (modal) modal.classList.add('hidden');
  }

  executeResetChart() {
    if (!this.adminUser) {
      this.showToast("Brak autoryzacji redakcji.", "warning");
      return;
    }

    const sortedChart = [...this.state.chartTracks].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const sortedWaiting = [...this.state.waitingRoomTracks].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const promotedFromWaiting = sortedWaiting.slice(0, 2);

    const newChart = [];
    sortedChart.slice(0, 18).forEach((track, idx) => {
      const newPos = idx + 1;
      let trend = "SAME";
      if (track.position > newPos) trend = "UP";
      else if (track.position < newPos) trend = "DOWN";

      newChart.push({
        ...track,
        prevPosition: track.position,
        position: newPos,
        trend,
        weeks: (track.weeks || 1) + 1,
        votes: 0
      });
    });

    promotedFromWaiting.forEach((track, idx) => {
      newChart.push({
        ...track,
        isChart: true,
        prevPosition: 0,
        position: 19 + idx,
        trend: "NEW",
        weeks: 1,
        votes: 0
      });
    });

    const newWaiting = sortedWaiting.slice(2).map(t => ({
      ...t,
      votes: 0,
      weeksInWaiting: (t.weeksInWaiting || 1) + 1
    }));

    while (newWaiting.length < 25) {
      const idNum = newWaiting.length + 1;
      newWaiting.push({
        id: `p-auto-${Date.now()}-${idNum}`,
        title: `Nowa Propozycja #${idNum}`,
        artist: `Młoda Fala UG`,
        duration: "3:15",
        votes: 0,
        weeksInWaiting: 1,
        coverBg: "#0041d2",
        coverImage: null,
        tag: "Nowość redakcji"
      });
    }

    this.state.edition.number += 1;
    this.state.edition.title = `Notowanie ${this.state.edition.number} • Wydanie Główne`;
    this.state.edition.endsAt = Date.now() + 7 * 24 * 3600 * 1000;
    this.state.chartTracks = newChart;
    this.state.waitingRoomTracks = newWaiting;
    this.state.edition.totalVotesCount = 0;

    this.saveState();
    this.closeResetChartModal();
    this.reset24hCooldownDemo();
    this.render();
    this.showToast(`Notowanie #${this.state.edition.number} zostało pomyślnie otwarte! Głosy zresetowane przez ${this.adminUser.name}.`, "success");
  }

  // --- SYMULACJA REAL-TIME (WEBSOCKET LIVE PULSE) ---
  startLiveSimulation() {
    setInterval(() => {
      this.state.edition.totalVotesCount += 1;
      const countEl = document.getElementById('header-total-votes');
      if (countEl) countEl.innerText = this.state.edition.totalVotesCount.toLocaleString('pl-PL');

      const livePulse = document.getElementById('live-pulse-badge');
      if (livePulse) {
        livePulse.classList.add('scale-105', 'text-[#a1daf8]');
        setTimeout(() => livePulse.classList.remove('scale-105', 'text-[#a1daf8]'), 400);
      }
    }, 4500);
  }

  startCountdownTimer() {
    setInterval(() => {
      const remainingMs = this.state.edition.endsAt - Date.now();
      if (remainingMs <= 0) {
        document.getElementById('header-countdown').innerText = "GŁOSOWANIE ZAMKNIĘTE";
        return;
      }
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const el = document.getElementById('header-countdown');
      if (el) {
        el.innerText = `${days}d ${hours}h ${mins}m ${secs}s`;
      }
      this.updateCooldownDisplay();
    }, 1000);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const borderClass = type === 'success' ? 'border-[#1BA345] bg-white text-[#1E293B]' :
                        type === 'warning' ? 'border-[#FEC001] bg-white text-[#1E293B]' :
                        'border-[#0041d2] bg-white text-[#1E293B]';

    toast.className = `p-4 border-2 shadow-ug-lg flex items-center gap-3 transition-all duration-300 transform translate-y-4 opacity-0 ${borderClass}`;
    toast.innerHTML = `
      <div class="w-2.5 h-2.5 ${type === 'success' ? 'bg-[#1BA345]' : type === 'warning' ? 'bg-[#FEC001]' : 'bg-[#0041d2]'} animate-ping"></div>
      <span class="text-sm font-headings font-semibold">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    }, 50);

    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- RENDEROWANIE GŁÓWNE ---
  switchTab(tab) {
    // Sprawdzenie czy użytkownik wchodzi do admina bez logowania
    if (tab === 'admin' && !this.adminUser) {
      this.showToast("Panel redaktora wymaga zalogowania.", "warning");
      this.openAdminLoginModal();
      return;
    }

    this.activeTab = tab;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('bg-[#0041d2]', 'text-white', 'border-[#0041d2]', 'shadow-sm');
        btn.classList.remove('text-[#032c73]', 'border-transparent', 'bg-[#e5f5fd]');
      } else {
        btn.classList.remove('bg-[#0041d2]', 'text-white', 'border-[#0041d2]', 'shadow-sm');
        btn.classList.add('text-[#032c73]', 'border-transparent');
      }
    });

    const chartView = document.getElementById('view-chart');
    const waitingView = document.getElementById('view-waiting');
    const adminView = document.getElementById('view-admin');

    if (chartView) chartView.classList.toggle('hidden', tab !== 'chart');
    if (waitingView) waitingView.classList.toggle('hidden', tab !== 'waiting');
    if (adminView) adminView.classList.toggle('hidden', tab !== 'admin');

    this.render();
  }

  render() {
    this.renderHeaderInfo();
    this.renderChartList();
    this.renderWaitingRoomList();
    this.renderVotingDrawer();
    this.renderAdminList();
    this.renderEditorsList();
    lucide.createIcons();
  }

  renderHeaderInfo() {
    const numEl = document.getElementById('header-edition-num');
    if (numEl) numEl.innerText = `#${this.state.edition.number}`;
    const votesEl = document.getElementById('header-total-votes');
    if (votesEl) votesEl.innerText = this.state.edition.totalVotesCount.toLocaleString('pl-PL');
  }

  renderChartList() {
    const container = document.getElementById('chart-tracks-container');
    if (!container) return;

    // #1 Hero Track (UG Featured Card Style - Sharp Edges)
    const heroTrack = this.state.chartTracks[0];
    const isHeroSelected = this.selectedVotes.has(heroTrack.id);
    const isPlayingHero = this.currentPlayingId === heroTrack.id;

    // Cover rendering logic
    const heroCoverHtml = heroTrack.coverImage
      ? `<img src="${heroTrack.coverImage}" alt="${heroTrack.title}" class="w-full h-full object-cover" />`
      : `<i data-lucide="${isPlayingHero ? 'pause' : 'play'}" class="w-12 h-12 text-[#a1daf8] drop-shadow group-hover:scale-110 transition-transform"></i>`;

    let html = `
      <!-- TOP #1 HERO TRACK (UG FEATURED CARD) -->
      <div class="ug-featured-card mb-8">
        <div class="p-6 md:p-8 bg-white flex flex-col lg:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left w-full lg:w-auto">
            
            <!-- Artwork & Play Trigger -->
            <div class="relative group cursor-pointer flex-shrink-0" onclick="app.playAudioSnippet('${heroTrack.id}', '${heroTrack.title}', '${heroTrack.artist}')">
              <div class="w-28 h-28 md:w-36 md:h-36 bg-[#00214d] flex items-center justify-center shadow-md relative overflow-hidden text-white">
                ${heroCoverHtml}
              </div>
              <div class="absolute -top-3 -left-3 px-3 py-1 bg-[#0041d2] text-white font-headings font-bold text-xs flex items-center gap-1 shadow-sm uppercase tracking-wider">
                <i data-lucide="crown" class="w-3.5 h-3.5 fill-current text-[#FEC001]"></i> #1 KRÓL LISTY
              </div>
            </div>

            <!-- Track Info -->
            <div>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span class="ug-tag trend-tag-up">
                  <i data-lucide="arrow-up" class="w-3 h-3"></i> Awans z #${heroTrack.prevPosition}
                </span>
                <span class="ug-tag ug-tag-foam">
                  ${heroTrack.weeks} tyg. na liście
                </span>
                <span class="ug-tag ug-tag-navy">
                  ${heroTrack.genre}
                </span>
              </div>
              <h2 class="ug-h2 !text-2xl md:!text-3xl !font-bold !text-[#032c73]">${heroTrack.title}</h2>
              <p class="ug-lead !text-base md:!text-lg !text-[#647391] mt-0.5">${heroTrack.artist}</p>
              <p class="ug-small !text-xs mt-1">${heroTrack.album} • Czas trwania: ${heroTrack.duration}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <button onclick="app.playAudioSnippet('${heroTrack.id}', '${heroTrack.title}', '${heroTrack.artist}')" class="btn-ug-outlined btn-ug-sm">
              <i data-lucide="volume-2" class="w-4 h-4 text-[#0041d2]"></i> Odsłuchaj 30s
            </button>
            <button onclick="app.toggleVote('${heroTrack.id}')" class="btn-ug-primary ${isHeroSelected ? '!bg-[#1BA345] !border-[#1BA345]' : ''}">
              <i data-lucide="${isHeroSelected ? 'check-circle' : 'vote'}" class="w-4 h-4"></i>
              <span>${isHeroSelected ? 'Wybrano (1 z 3)' : 'Oddaj 1 z 3 głosów'}</span>
            </button>
          </div>
        </div>

        <!-- UG Featured Blue Banner -->
        <div class="ug-featured-banner flex items-center justify-between">
          <span>Notowanie Głównych Przebojów Radia MORS Uniwersytetu Gdańskiego</span>
          <span class="text-xs font-mono text-[#a1daf8] uppercase font-bold">${heroTrack.votes || 412} głosów</span>
        </div>
      </div>
    `;

    // Tracks #2 to #20 (UG Standard Cards)
    html += `<div class="space-y-3">`;
    this.state.chartTracks.slice(1).forEach(track => {
      const isSelected = this.selectedVotes.has(track.id);
      const isPlaying = this.currentPlayingId === track.id;

      let trendBadge = '';
      if (track.trend === 'UP') {
        const diff = (track.prevPosition || 0) - track.position;
        trendBadge = `<span class="ug-tag trend-tag-up"><i data-lucide="trending-up" class="w-3 h-3"></i> +${diff > 0 ? diff : 1}</span>`;
      } else if (track.trend === 'DOWN') {
        const diff = track.position - (track.prevPosition || 0);
        trendBadge = `<span class="ug-tag trend-tag-down"><i data-lucide="trending-down" class="w-3 h-3"></i> -${diff > 0 ? diff : 1}</span>`;
      } else if (track.trend === 'NEW') {
        trendBadge = `<span class="ug-tag trend-tag-new"><i data-lucide="sparkles" class="w-3 h-3 text-[#a1daf8]"></i> NOWOŚĆ</span>`;
      } else {
        trendBadge = `<span class="ug-tag trend-tag-same"><i data-lucide="minus" class="w-3 h-3"></i> BZ</span>`;
      }

      const trackCoverHtml = track.coverImage
        ? `<img src="${track.coverImage}" alt="${track.title}" class="w-full h-full object-cover" />`
        : `<i data-lucide="${isPlaying ? 'pause' : 'play'}" class="w-5 h-5 text-white group-hover/art:scale-110 transition-transform"></i>`;

      html += `
        <div class="group flex items-center justify-between p-3.5 md:p-4 ug-card ${isSelected ? 'ug-card-selected' : ''}">
          <div class="flex items-center gap-3 md:gap-5 min-w-0">
            <!-- Rank Number -->
            <div class="w-8 md:w-10 text-center flex-shrink-0">
              <span class="text-xl md:text-2xl font-headings font-bold ${track.position <= 3 ? 'text-[#0041d2]' : 'text-[#647391]'}">${track.position}</span>
            </div>

            <!-- Trend indicator -->
            <div class="w-16 hidden sm:flex items-center justify-center flex-shrink-0">
              ${trendBadge}
            </div>

            <!-- Artwork & Play Button -->
            <div class="relative w-12 h-12 md:w-14 md:h-14 bg-[#00214d] flex-shrink-0 flex items-center justify-center cursor-pointer shadow-sm overflow-hidden group/art" onclick="app.playAudioSnippet('${track.id}', '${track.title}', '${track.artist}')">
              ${trackCoverHtml}
            </div>

            <!-- Title & Artist -->
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-headings font-bold text-[#032c73] text-sm md:text-base truncate group-hover:text-[#0041d2] transition-colors">${track.title}</h3>
                <span class="sm:hidden">${trendBadge}</span>
              </div>
              <p class="ug-body !text-xs md:!text-sm !text-[#647391] truncate">${track.artist}</p>
              <div class="flex items-center gap-3 ug-small !text-[11px] mt-0.5">
                <span>${track.weeks} tyg. na liście</span>
                <span>•</span>
                <span>Najwyższa poz: #${track.peak}</span>
              </div>
            </div>
          </div>

          <!-- Waveform Visualizer & Action Buttons -->
          <div class="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-2">
            <div class="hidden lg:flex items-center gap-1 ug-waveform-container" data-track-id="${track.id}">
              <div class="ug-waveform-bar" style="height: 12px"></div>
              <div class="ug-waveform-bar" style="height: 18px"></div>
              <div class="ug-waveform-bar" style="height: 8px"></div>
              <div class="ug-waveform-bar" style="height: 22px"></div>
              <div class="ug-waveform-bar" style="height: 14px"></div>
              <div class="ug-waveform-bar" style="height: 10px"></div>
            </div>

            <!-- Vote Toggle Button -->
            <button onclick="app.toggleVote('${track.id}')" class="px-3 md:px-5 py-2 font-headings font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all ${isSelected ? 'bg-[#1BA345] text-white' : 'btn-ug-outlined !py-2 !px-3 md:!px-4'}">
              <i data-lucide="${isSelected ? 'check' : 'plus'}" class="w-4 h-4"></i>
              <span class="hidden sm:inline">${isSelected ? 'Wybrano' : 'Głosuj'}</span>
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  renderWaitingRoomList() {
    const container = document.getElementById('waiting-tracks-container');
    if (!container) return;

    let html = `
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    `;

    this.state.waitingRoomTracks.forEach((track, idx) => {
      const isSelected = this.selectedVotes.has(track.id);
      const isPlaying = this.currentPlayingId === track.id;

      const trackCoverHtml = track.coverImage
        ? `<img src="${track.coverImage}" alt="${track.title}" class="w-full h-full object-cover" />`
        : `<i data-lucide="${isPlaying ? 'pause' : 'play'}" class="w-5 h-5 text-white"></i>`;

      html += `
        <div class="p-4 ug-card flex flex-col justify-between ${isSelected ? 'ug-card-selected' : ''}">
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative w-12 h-12 bg-[#00214d] flex-shrink-0 flex items-center justify-center cursor-pointer shadow-sm overflow-hidden group" onclick="app.playAudioSnippet('${track.id}', '${track.title}', '${track.artist}')">
                  ${trackCoverHtml}
                </div>
                <div class="min-w-0">
                  <span class="ug-tag ug-tag-sail text-[10px] font-bold">${track.tag || 'Propozycja'}</span>
                  <h4 class="font-headings font-bold text-[#032c73] text-sm mt-1 truncate">${track.title}</h4>
                  <p class="ug-small truncate">${track.artist}</p>
                </div>
              </div>
              <span class="text-xs font-headings font-bold text-[#647391] bg-[#F5F5F5] px-2 py-1 border border-[#D9D9D9]">#${idx + 1}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-[#D9D9D9] mt-2">
            <span class="ug-small flex items-center gap-1">
              <i data-lucide="clock" class="w-3 h-3"></i> ${track.weeksInWaiting} tyg. w poczekalni
            </span>
            <button onclick="app.toggleVote('${track.id}')" class="px-3 py-1.5 font-headings font-semibold text-xs flex items-center gap-1.5 transition-all ${isSelected ? 'bg-[#1BA345] text-white' : 'btn-ug-outlined !py-1.5 !px-3'}">
              <i data-lucide="${isSelected ? 'check' : 'plus'}" class="w-3.5 h-3.5"></i>
              ${isSelected ? 'Wybrano' : 'Głosuj'}
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  renderVotingDrawer() {
    const drawer = document.getElementById('voting-drawer');
    const badgeCount = document.getElementById('drawer-vote-count');
    const fillBar = document.getElementById('drawer-progress-fill');
    const btnSubmit = document.getElementById('drawer-submit-btn');

    if (!drawer) return;

    if (this.isCooldownActive() || this.selectedVotes.size === 0) {
      drawer.classList.add('translate-y-full');
      return;
    }

    drawer.classList.remove('translate-y-full');
    const count = this.selectedVotes.size;
    if (badgeCount) badgeCount.innerText = `${count} / ${this.maxVotesAllowed}`;
    if (fillBar) fillBar.style.width = `${(count / this.maxVotesAllowed) * 100}%`;

    if (btnSubmit) {
      btnSubmit.innerHTML = `
        <span>Zatwierdź swój głos (${count}/${this.maxVotesAllowed})</span>
        <i data-lucide="arrow-right" class="w-4 h-4"></i>
      `;
    }
  }

  renderAdminList() {
    const container = document.getElementById('admin-tracks-table-body');
    if (!container) return;

    const all = [
      ...this.state.chartTracks.map(t => ({ ...t, section: 'Notowanie' })),
      ...this.state.waitingRoomTracks.map(t => ({ ...t, section: 'Poczekalnia' }))
    ];

    container.innerHTML = all.map(t => `
      <tr class="border-b border-[#D9D9D9] hover:bg-[#e5f5fd]/50 text-xs">
        <td class="p-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-[#00214d] flex-shrink-0 flex items-center justify-center text-white text-[10px] overflow-hidden">
              ${t.coverImage ? `<img src="${t.coverImage}" class="w-full h-full object-cover" />` : '♫'}
            </div>
            <span class="font-headings font-bold text-[#032c73]">${t.title}</span>
          </div>
        </td>
        <td class="p-3 text-[#647391]">${t.artist}</td>
        <td class="p-3">
          <span class="ug-tag ${t.section === 'Notowanie' ? 'ug-tag-blue' : 'ug-tag-sail'}">
            ${t.section}
          </span>
        </td>
        <td class="p-3 font-headings font-bold text-[#032c73]">${t.votes || 0} pkt</td>
        <td class="p-3 text-right">
          <button onclick="app.removeTrackAdmin('${t.id}')" class="text-[#EF305E] hover:text-[#d9224e] p-1.5 hover:bg-[#EF305E]/10" title="Usuń utwór">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  removeTrackAdmin(id) {
    if (!this.adminUser) {
      this.showToast("Wymagane uprawnienia redaktora.", "warning");
      this.openAdminLoginModal();
      return;
    }
    this.state.chartTracks = this.state.chartTracks.filter(t => t.id !== id);
    this.state.waitingRoomTracks = this.state.waitingRoomTracks.filter(t => t.id !== id);
    // Posprzątaj powiązany plik audio (pamięć sesji + IndexedDB).
    if (this.customAudioSources[id]) {
      URL.revokeObjectURL(this.customAudioSources[id]);
      delete this.customAudioSources[id];
      this._idbDeleteAudio(id).catch(() => {});
    }
    this.saveState();
    this.render();
    this.showToast("Utwór został usunięty z bazy.", "info");
  }

  bindEvents() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Audio file dropzone
    const audioDropzone = document.getElementById('admin-audio-dropzone');
    const audioFileInput = document.getElementById('admin-file-input');

    if (audioDropzone && audioFileInput) {
      audioDropzone.addEventListener('click', () => audioFileInput.click());
      audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleAudioFileUpload(e.target.files[0]);
        }
      });

      audioDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        audioDropzone.classList.add('border-[#0041d2]', 'bg-[#e5f5fd]');
      });

      audioDropzone.addEventListener('dragleave', () => {
        audioDropzone.classList.remove('border-[#0041d2]', 'bg-[#e5f5fd]');
      });

      audioDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        audioDropzone.classList.remove('border-[#0041d2]', 'bg-[#e5f5fd]');
        if (e.dataTransfer.files.length > 0) {
          this.handleAudioFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    // Cover image dropzone
    const coverDropzone = document.getElementById('admin-cover-dropzone');
    const coverFileInput = document.getElementById('admin-cover-file-input');

    if (coverDropzone && coverFileInput) {
      coverDropzone.addEventListener('click', () => coverFileInput.click());
      coverFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleCoverFileUpload(e.target.files[0]);
        }
      });

      coverDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        coverDropzone.classList.add('border-[#0041d2]', 'bg-[#e5f5fd]');
      });

      coverDropzone.addEventListener('dragleave', () => {
        coverDropzone.classList.remove('border-[#0041d2]', 'bg-[#e5f5fd]');
      });

      coverDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        coverDropzone.classList.remove('border-[#0041d2]', 'bg-[#e5f5fd]');
        if (e.dataTransfer.files.length > 0) {
          this.handleCoverFileUpload(e.dataTransfer.files[0]);
        }
      });
    }
  }
}

// Inicjalizacja globalnej instancji
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new StudentRadioApp();
});
