// ========== FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyAumySmaAi8oHFnTu8QDtp_u_dZmoHlQd8",
    authDomain: "thmovie-3646f.firebaseapp.com",
    databaseURL: "https://thmovie-3646f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thmovie-3646f",
    storageBucket: "thmovie-3646f.firebasestorage.app",
    messagingSenderId: "1041137356432",
    appId: "1:1041137356432:web:96edbe3402937c82f09215"
};

let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch(e) {
    console.error("Firebase init error:", e);
}

// ========== CONSTANTS ==========
const TOTAL_LOKET = 6;
const ROOMS_PER_LOKET = 30;
const TOTAL_ROOMS = TOTAL_LOKET * ROOMS_PER_LOKET;
const SYNC_INTERVAL = 2000;
const MAX_SYNC_DRIFT = 2; 

// ========== STATE ==========
let currentPage = 'home';
let selectedMovie = null;
let currentTier = 'free';
let currentRoomId = null;
let player = null; // Bisa YT Player atau Iframe Drive
let playerType = 'youtube'; // 'youtube' atau 'drive'
let playerReady = false;
let roomData = null;
let dbRoomRef = null;
let dbChatRef = null;
let dbPresenceRef = null;
let myUsername = "User_" + Math.floor(Math.random() * 9000 + 1000);
let countdownInterval = null;
let syncInterval = null;
let verifiedVideoData = null;
let tempRoomData = null;
let pendingJoinRoomId = null;
let isSyncing = false;
let lastSyncState = -1; 
let lastSyncTime = -1;
let presenceCleanup = null;
let occupiedRooms = {}; 

// ========== SAMPLE MOVIES ==========
// UPDATE: Menambahkan Jumbo dengan ID unik (kita pakai URL sebagai ID unik untuk Drive)
const sampleMovies = [
    { id:"9v1atEBmUIc", title:"The Midnight Cinema", genre:"Horror • Mystery", duration:"1j 45m", rating:"8.5", poster:"https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60" },
    { id:"dQw4w9WgXcQ", title:"Golden Hour Jazz", genre:"Music • Documentary", duration:"2j 10m", rating:"9.0", poster:"https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop&q=60" },
    { id:"M7lc1UVf-VE", title:"Cyber Dreams", genre:"Sci-Fi • Action", duration:"2j 15m", rating:"8.8", poster:"https://images.unsplash.com/photo-1535016120720-40c6874c3b1c?w=500&auto=format&fit=crop&q=60" },
    { id:"tgbNymZ7vqY", title:"Ocean Waves", genre:"Drama • Romance", duration:"1j 55m", rating:"8.2", poster:"https://images.unsplash.com/photo-1560167016-022b78a0258e?w=500&auto=format&fit=crop&q=60" },
    { id:"aqz-KE-bpKQ", title:"Big Buck Bunny", genre:"Animation • Comedy", duration:"10m", rating:"7.5", poster:"https://images.unsplash.com/photo-1560167016-022b78a0258e?w=500&auto=format&fit=crop&q=60" },
    { id:"LXb3EKWsInQ", title:"Nature's Beauty", genre:"Documentary", duration:"1j 30m", rating:"9.2", poster:"https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&auto=format&fit=crop&q=60" },
    { id:"jNQXAC9IVRw", title:"First YouTube Video", genre:"Classic • Viral", duration:"19d", rating:"6.0", poster:"https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&auto=format&fit=crop&q=60" },
    { id:"kJQP7kiw5Fk", title:"Despacito Remix", genre:"Music • Latin", duration:"4m", rating:"8.1", poster:"https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=60" },
    { id:"drive_JUMBO", title:"Jumbo", genre:"Animasi • 2026", duration:"1j 30m", rating:"NEW", poster:"https://i.ibb.co.com/NdCM9CWw/images.jpg", url:"https://drive.google.com/file/d/1ZASz3sSmMUxzz5RAm3dC0Hteot9K3PfQ/preview" }
];

// ========== HELPERS ==========
function loketRoomToGlobal(loket, room) {
    return ((loket - 1) * ROOMS_PER_LOKET) + room;
}
function globalToLoketRoom(globalNum) {
    const loket = Math.floor((globalNum - 1) / ROOMS_PER_LOKET) + 1;
    const room = ((globalNum - 1) % ROOMS_PER_LOKET) + 1;
    return { loket, room };
}

// Helper: Cek apakah link ini YouTube atau Drive
function getVideoSource(url) {
    if (!url) return null;
    // Cek YouTube
    const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[2].length === 11) {
        return { type: 'youtube', id: ytMatch[2] };
    }
    // Cek Google Drive (Sederhana: cek string 'drive.google.com')
    if (url.includes('drive.google.com')) {
        return { type: 'drive', url: url };
    }
    return null;
}

function randomQuota() {
    return Math.floor(Math.random() * 28) + 30; 
}

// ========== INIT ==========
window.onload = function() {
    renderMovies();
    renderLoket();
    setupDateTimeMin();
    handleURLRoute();
    initJazzIndicator();

    window.addEventListener('scroll', () => {
        document.getElementById('nav-header').classList.toggle('scrolled', window.scrollY > 40);
    });

    window.addEventListener('beforeunload', () => {
        if (currentRoomId && dbPresenceRef) {
            dbPresenceRef.remove();
        }
    });
};

// ========== URL ROUTING ==========
function handleURLRoute() {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if (rid && rid.length > 5) {
        showToast('Membuka room dari link...');
        joinRoomById(rid);
    }
}

function updateURL(roomId) {
    if (!roomId) return;
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('room', roomId);
    window.history.replaceState({}, '', url.toString());
}

function getRoomShareURL(roomId) {
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('room', roomId);
    return url.toString();
}

function copyRoomUrl() {
    if (!currentRoomId) return;
    const url = getRoomShareURL(currentRoomId);
    navigator.clipboard.writeText(url).then(() => {
        showToast('URL room berhasil disalin!', 'success');
    }).catch(() => {
        showToast('Gagal menyalin URL', 'error');
    });
}

// ========== JAZZ INDICATOR ==========
function initJazzIndicator() {
    const el = document.getElementById('jazz-indicator');
    el.addEventListener('click', () => {
        el.classList.toggle('muted');
        showToast(el.classList.contains('muted') ? 'Jazz Lounge Paused' : 'Jazz Lounge Playing');
    });
}

// ========== NAVIGATION ==========
function showPage(page) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById('cinema-view').classList.remove('active');

    const pageMap = { home:'home-page', loket:'loket-page', create:'create-page' };
    if (pageMap[page]) {
        document.getElementById(pageMap[page]).classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === page);
    });

    currentPage = page;
    window.scrollTo(0, 0);
}

function scrollToMovies() {
    if (currentPage !== 'home') showPage('home');
    setTimeout(() => document.getElementById('movies-section').scrollIntoView({ behavior:'smooth' }), 100);
}

// ========== MOVIE CARDS ==========
function renderMovies() {
    document.getElementById('movie-grid').innerHTML = sampleMovies.map(m => `
        <div class="movie-card" onclick="selectMovie('${m.id}')">
            <img class="movie-poster" src="${m.poster}" alt="${m.title}" loading="lazy">
            <span class="badge-rating" style="display:${m.rating === 'NEW' ? 'none' : 'flex'}">★ ${m.rating}</span>
            ${m.rating === 'NEW' ? '<span class="badge-rating" style="background:var(--accent-gold); color:#000; width:auto; padding:2px 6px; font-size:0.6rem;">NEW</span>' : ''}
            <div class="movie-overlay">
                <div class="movie-info">
                    <h3 class="movie-title-card">${m.title}</h3>
                    <p class="movie-meta-card">${m.genre} • ${m.duration}</p>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();createRoomFromMovie('${m.id}')">Tonton Sekarang</button>
                </div>
            </div>
        </div>
    `).join('');
}

function selectMovie(id) {
    selectedMovie = sampleMovies.find(m => m.id === id);
    if (selectedMovie) showToast('Dipilih: ' + selectedMovie.title, 'success');
}

function createRoomFromMovie(id) {
    const movie = sampleMovies.find(m => m.id === id);
    if (!movie) return;
    selectedMovie = movie;
    
    // Logic Beda untuk Drive dan YouTube
    let videoUrl = '';
    if (movie.url) {
        // Ini Link Drive / Lainnya langsung
        videoUrl = movie.url;
    } else if (movie.id) {
        // Ini YouTube
        videoUrl = 'https://youtube.com/watch?v=' + movie.id;
    }

    document.getElementById('selected-movie-display').value = movie.title;
    document.getElementById('room-video-url').value = videoUrl; // Simpan full URL
    document.getElementById('manual-video-url').value = '';
    
    // Preview Logic
    const source = getVideoSource(videoUrl);
    document.getElementById('video-preview').classList.add('active');
    document.getElementById('preview-thumb').src = movie.poster;
    document.getElementById('preview-title').textContent = movie.title;
    document.getElementById('preview-channel').textContent = source.type === 'youtube' ? 'YouTube' : 'Google Drive';
    document.getElementById('preview-duration').textContent = movie.duration;
    
    verifiedVideoData = { id: movie.id, title: movie.title, url: movie.url, type: source.type };
    showPage('create');
}

// ========== PASSWORD INPUT TOGGLE ==========
function togglePasswordInput() {
    const isPrivate = document.querySelector('input[name="roomVisibility"]:checked').value === 'private';
    const passGroup = document.getElementById('password-group');
    if (isPrivate) {
        passGroup.classList.remove('hidden');
        document.getElementById('room-password').focus();
    } else {
        passGroup.classList.add('hidden');
        document.getElementById('room-password').value = '';
    }
}

// ========== LOKET ==========
async function fetchOccupiedRooms() {
    if (!db) return;
    try {
        const snap = await db.ref('rooms').once('value');
        occupiedRooms = {};
        if (snap.exists()) {
            snap.forEach(child => {
                const r = child.val();
                if (r && r.globalRoomNum) {
                    occupiedRooms[r.globalRoomNum] = child.key;
                }
            });
        }
    } catch(e) {
        console.error('Fetch occupied error:', e);
    }
}

async function renderLoket() {
    await fetchOccupiedRooms();
    const grid = document.getElementById('loket-grid');
    let html = '';

    for (let l = 1; l <= TOTAL_LOKET; l++) {
        let roomsHtml = '';
        let occupiedCount = 0;
        const startGlobal = (l - 1) * ROOMS_PER_LOKET + 1;

        for (let r = 1; r <= ROOMS_PER_LOKET; r++) {
            const globalNum = startGlobal + r - 1;
            const isOccupied = !!occupiedRooms[globalNum];
            if (isOccupied) occupiedCount++;
            roomsHtml += `<div class="room-mini ${isOccupied ? 'occupied' : 'available'}" 
                ${isOccupied ? '' : `onclick="event.stopPropagation();clickRoomFromLoket(${l},${r})"`}
                title="${isOccupied ? 'Sudah terisi' : 'Room ' + r + ' - Klik untuk pesan'}">${r}</div>`;
        }

        const available = ROOMS_PER_LOKET - occupiedCount;
        html += `
            <div class="loket-card" onclick="openLoketDetail(${l})">
                <div class="loket-card-header">
                    <div class="loket-number">LOKET ${l}</div>
                    <div class="loket-status"><span class="status-dot"></span>${available > 0 ? available + ' tersedia' : 'Penuh'}</div>
                </div>
                <div class="loket-desc">Room ${startGlobal} s/d ${startGlobal + ROOMS_PER_LOKET - 1} • Klik room kosong untuk pesan tiket</div>
                <div class="loket-rooms-label">Peta Room (30 unit)</div>
                <div class="room-grid-mini">${roomsHtml}</div>
                <div class="loket-footer">
                    <span class="loket-available-count" style="color:${available > 0 ? 'var(--success)' : 'var(--accent-red)'}">${available} room kosong</span>
                </div>
            </div>
        `;
    }
    grid.innerHTML = html;
}

function clickRoomFromLoket(loket, room) {
    const globalNum = loketRoomToGlobal(loket, room);
    if (occupiedRooms[globalNum]) {
        showToast('Room ini sudah terisi!', 'error');
        return;
    }
    showToast(`Room ${room} di Loket ${loket} tersedia. Silakan isi form pemesanan.`, 'success');
    openCreateRoom(loket, room);
}

function openLoketDetail(loket) {
    showToast(`Loket ${loket}: Klik room kosong (warna abu) untuk memesan`);
}

// ========== CREATE ROOM ==========
function setupDateTimeMin() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('room-time').min = now.toISOString().slice(0, 16);
}

function openCreateRoom(preLoket, preRoom) {
    selectedMovie = null;
    verifiedVideoData = null;
    document.getElementById('selected-movie-display').value = '';
    document.getElementById('selected-movie-display').placeholder = 'Belum memilih film (opsional)';
    document.getElementById('room-video-url').value = '';
    document.getElementById('manual-video-url').value = '';
    document.getElementById('video-preview').classList.remove('active');
    document.getElementById('room-time').value = '';
    
    document.querySelector('input[name="roomVisibility"][value="public"]').checked = true;
    togglePasswordInput();

    setupDateTimeMin();
    updateQuota();

    if (preLoket && preRoom) {
        document.getElementById('selected-movie-display').placeholder = `Loket ${preLoket} • Room ${preRoom}`;
        document.getElementById('selected-movie-display').dataset.preLoket = preLoket;
        document.getElementById('selected-movie-display').dataset.preRoom = preRoom;
    } else {
        delete document.getElementById('selected-movie-display').dataset.preLoket;
        delete document.getElementById('selected-movie-display').dataset.preRoom;
    }

    showPage('create');
}

function verifyManualVideo() {
    const url = document.getElementById('manual-video-url').value.trim();
    const preview = document.getElementById('video-preview');
    if (!url) { preview.classList.remove('active'); verifiedVideoData = null; return; }
    
    const source = getVideoSource(url);
    if (!source) { preview.classList.remove('active'); verifiedVideoData = null; return; }
    
    preview.classList.add('active');
    if (source.type === 'youtube') {
        document.getElementById('preview-thumb').src = 'https://img.youtube.com/vi/' + source.id + '/mqdefault.jpg';
        document.getElementById('preview-channel').textContent = 'YouTube';
        verifiedVideoData = { id: source.id, title: 'Video YouTube', type: 'youtube' };
    } else {
        // Generic thumb for drive
        document.getElementById('preview-thumb').src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/1200px-Google_Drive_icon_%282020%29.svg.png';
        document.getElementById('preview-channel').textContent = 'Google Drive';
        verifiedVideoData = { id: null, title: 'Video Drive', url: url, type: 'drive' };
    }
    document.getElementById('preview-duration').textContent = 'Durasi terdeteksi otomatis';
    document.getElementById('room-video-url').value = url;
}

function selectTier(tier) {
    if (tier !== 'free') return;
    document.querySelectorAll('.tier-option').forEach(o => o.classList.remove('selected'));
    document.querySelector('[data-tier="free"]').add('selected');
    currentTier = 'free';
    updateQuota();
}

function updateQuota() {
    const q = randomQuota();
    document.getElementById('quota-display').textContent = q;
    return q;
}

function processBooking() {
    const timeInput = document.getElementById('room-time').value;
    const manualUrl = document.getElementById('manual-video-url').value.trim();
    const savedUrl = document.getElementById('room-video-url').value;
    const displayEl = document.getElementById('selected-movie-display');

    let finalUrl = manualUrl || savedUrl;
    let videoTitle = 'Unknown';

    // Deteksi Sumber Video
    const source = getVideoSource(finalUrl);

    if (!source) { showToast('Link video tidak valid (Hanya YouTube / Drive)!', 'error'); return; }
    if (!timeInput) { showToast('Pilih jadwal tayang terlebih dahulu!', 'error'); return; }

    const scheduleTime = new Date(timeInput).getTime();
    const now = Date.now();
    if (scheduleTime <= now) { showToast('Jadwal harus minimal 1 menit dari sekarang!', 'error'); return; }

    const quota = parseInt(document.getElementById('quota-display').textContent) || randomQuota();
    const visibility = document.querySelector('input[name="roomVisibility"]:checked').value;
    let password = null;
    if (visibility === 'private') {
        password = document.getElementById('room-password').value.trim();
        if (!password) {
            showToast('Masukkan password untuk room Private!', 'error');
            return;
        }
    }

    let loket, room;
    const preLoket = displayEl.dataset.preLoket ? parseInt(displayEl.dataset.preLoket) : 0;
    const preRoom = displayEl.dataset.preRoom ? parseInt(displayEl.dataset.preRoom) : 0;

    if (preLoket && preRoom) {
        const globalNum = loketRoomToGlobal(preLoket, preRoom);
        if (occupiedRooms[globalNum]) {
            showToast('Room ini sudah diambil! Pilih room lain.', 'error');
            renderLoket();
            return;
        }
        loket = preLoket;
        room = preRoom;
    } else {
        const result = findAvailableRoom();
        if (!result) {
            showToast('Semua room penuh! Coba lagi nanti.', 'error');
            return;
        }
        loket = result.loket;
        room = result.room;
    }

    const globalNum = loketRoomToGlobal(loket, room);

    const roomObj = {
        loket: loket,
        room: room,
        globalRoomNum: globalNum,
        videoSource: source.type, // 'youtube' atau 'drive'
        videoId: source.type === 'youtube' ? source.id : null,
        videoUrl: source.type === 'drive' ? source.url : null,
        videoTitle: verifiedVideoData ? verifiedVideoData.title : videoTitle,
        capacity: quota,
        scheduleTime: scheduleTime,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        phase: 'waiting',
        tier: currentTier,
        hostUsername: myUsername,
        playState: 0,
        currentTime: 0,
        lastSync: firebase.database.ServerValue.TIMESTAMP,
        visibility: visibility,
        password: password 
    };

    tempRoomData = { ...roomObj, roomId: null };
    const newRef = db.ref('rooms').push();
    tempRoomData.roomId = newRef.key;

    newRef.set(roomObj).then(() => {
        showPrinterAnimation(loket, room, quota, newRef.key, roomObj);
    }).catch(err => {
        showToast('Gagal membuat room: ' + err.message, 'error');
    });
}

function findAvailableRoom() {
    const candidates = [];
    for (let l = 1; l <= TOTAL_LOKET; l++) {
        for (let r = 1; r <= ROOMS_PER_LOKET; r++) {
            const g = loketRoomToGlobal(l, r);
            if (!occupiedRooms[g]) candidates.push({ loket: l, room: r });
        }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function showPrinterAnimation(loket, room, quota, roomId, roomObj) {
    document.getElementById('printer-overlay').classList.add('active');
    document.getElementById('ticket-animation-container').innerHTML = `
        <div class="ticket-printing">
            <div style="font-size:.7rem;margin-bottom:6px;opacity:.7">ThMOvie CINEMA</div>
            <div style="font-size:1.4rem;margin-bottom:4px">LOKET ${loket}</div>
            <div style="font-size:1.1rem">ROOM ${room}</div>
            <div style="font-size:.65rem;margin-top:8px;border-top:1px dashed rgba(0,0,0,.3);padding-top:6px;line-height:1.4">
                Kapasitas: ${quota} Kursi<br>
                ID: ${roomId.slice(0,8)}...<br>
                ${roomObj.videoSource === 'drive' ? '💿 GOOGLE DRIVE' : '📺 YOUTUBE'}<br>
                ${roomObj.visibility === 'private' ? '🔒 PRIVATE ROOM' : '🔓 PUBLIC ROOM'}<br>
                Enjoy Your Movie!
            </div>
        </div>
    `;
    setTimeout(() => {
        document.getElementById('printer-overlay').classList.remove('active');
        enterCinema(roomId, roomObj, true);
    }, 2600);
}

// ========== JOIN ROOM ==========
function joinRoomById(roomId) {
    if (!db) { showToast('Firebase tidak tersedia', 'error'); return; }
    pendingJoinRoomId = roomId;

    db.ref('rooms/' + roomId).once('value').then(snap => {
        if (!snap.exists()) {
            showToast('Room tidak ditemukan! Mungkin sudah dihapus.', 'error');
            pendingJoinRoomId = null;
            return;
        }
        const room = snap.val();
        if (room.phase === 'ended') {
            showToast('Room ini sudah selesai.', 'error');
            pendingJoinRoomId = null;
            return;
        }

        let passwordHtml = '';
        if (room.visibility === 'private') {
            passwordHtml = `
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">Password Room</label>
                    <input type="password" id="join-password" class="form-input" placeholder="Masukkan password...">
                </div>
            `;
        }

        document.getElementById('join-modal-body').innerHTML = `
            <div class="join-modal-body">
                <div class="join-room-info">
                    <div class="room-id">LOKET ${room.loket} | ROOM ${room.room}</div>
                    <div class="room-detail">${room.videoTitle || 'Unknown Movie'}</div>
                    <div class="room-detail">${room.videoSource === 'drive' ? '💿 Google Drive' : '📺 YouTube'}</div>
                    <div class="room-detail">Kapasitas: ${room.capacity} kursi • Tier: ${room.tier || 'free'}</div>
                    <div class="room-detail" style="margin-top:4px; color:${room.visibility === 'private' ? 'var(--accent-gold)' : 'var(--success)'}">
                        ${room.visibility === 'private' ? '🔒 Private Room' : '🔓 Public Room'}
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">Nama Anda</label>
                    <input type="text" id="join-username" class="form-input" placeholder="Masukkan nama..." value="${myUsername}" maxlength="20">
                </div>
                ${passwordHtml}
            </div>
        `;
        document.getElementById('join-modal').classList.add('active');
    }).catch(err => {
        showToast('Gagal memuat room: ' + err.message, 'error');
        pendingJoinRoomId = null;
    });
}

function confirmJoinRoom() {
    const nameInput = document.getElementById('join-username');
    if (nameInput && nameInput.value.trim()) {
        myUsername = nameInput.value.trim().slice(0, 20);
    }

    if (roomData && roomData.visibility === 'private') {
        const passInput = document.getElementById('join-password');
        if (!passInput || passInput.value !== roomData.password) {
            showToast('Password salah!', 'error');
            return;
        }
    }

    closeJoinModal();

    if (!pendingJoinRoomId) return;

    db.ref('rooms/' + pendingJoinRoomId).once('value').then(snap => {
        if (!snap.exists()) { showToast('Room tidak ditemukan', 'error'); return; }
        enterCinema(pendingJoinRoomId, snap.val(), false);
        pendingJoinRoomId = null;
    });
}

function closeJoinModal(e) {
    if (e && e.target.id !== 'join-modal') return;
    document.getElementById('join-modal').classList.remove('active');
}

// ========== CINEMA VIEW ==========
function enterCinema(roomId, room, isHost) {
    cleanupCinema();
    currentRoomId = roomId;
    roomData = room;
    dbRoomRef = db.ref('rooms/' + roomId);
    dbChatRef = db.ref('rooms/' + roomId + '/chat');
    dbPresenceRef = db.ref('rooms/' + roomId + '/presence/' + myUsername);

    document.getElementById('end-screen-overlay').classList.remove('active');

    document.getElementById('cinema-badge').textContent = 'LOKET ' + room.loket + ' | ROOM ' + room.room;
    document.getElementById('cinema-movie-title').textContent = room.videoTitle || 'Unknown Movie';
    document.getElementById('countdown-room-info').innerHTML = 'Loket <strong>' + room.loket + '</strong> • Room <strong>' + room.room + '</strong>';

    document.getElementById('cinema-view').classList.add('active');
    document.getElementById('cinema-loading').style.display = 'flex';
    document.getElementById('sync-indicator').style.display = 'none';
    
    // Hide lock indicator for Drive (since we can't lock Drive iframe controls easily)
    if (room.videoSource === 'youtube') {
        document.getElementById('lock-indicator').style.display = 'flex';
    } else {
        document.getElementById('lock-indicator').style.display = 'none';
    }

    updateURL(roomId);

    dbPresenceRef.set({
        username: myUsername,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        isHost: !!isHost
    });
    dbPresenceRef.onDisconnect().remove();

    presenceCleanup = setTimeout(() => {
        if (dbPresenceRef) dbPresenceRef.remove();
    }, 86400000);

    setupChat();
    setupPresenceListener();
    dbRoomRef.on('value', handleRoomUpdate);

    if (room.phase === 'waiting') {
        startCountdown();
    } else if (room.phase === 'playing') {
        document.getElementById('countdown-overlay').style.display = 'none';
        initPlayer(room, 0);
    }
}

function cleanupCinema() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    if (presenceCleanup) { clearTimeout(presenceCleanup); presenceCleanup = null; }
    
    // Cleanup YouTube Player
    if (playerType === 'youtube' && player) {
        try { player.destroy(); } catch(e){}
    }
    player = null; 
    playerType = null;
    playerReady = false;

    if (dbRoomRef) { dbRoomRef.off(); dbRoomRef = null; }
    if (dbChatRef) { dbChatRef.off(); dbChatRef = null; }
    if (dbPresenceRef) { dbPresenceRef.remove(); dbPresenceRef = null; }
    isSyncing = false;
    lastSyncState = -1;
    lastSyncTime = -1;

    document.getElementById('cinema-view').classList.remove('active');
    document.getElementById('countdown-overlay').style.display = 'flex';
    document.getElementById('cinema-loading').style.display = 'none';
    document.getElementById('sync-indicator').style.display = 'none';
    document.getElementById('lock-indicator').style.display = 'none';
    document.getElementById('end-screen-overlay').classList.remove('active');
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('online-users-bar').innerHTML = '';
    document.getElementById('player-container').innerHTML = ''; // Clear iframe or player
}

// ========== CHAT ==========
function setupChat() {
    const box = document.getElementById('chat-messages');
    box.innerHTML = '';
    addChatMessage('system', '🎬 Selamat datang di ThMOvie Watch Party!');
    addChatMessage('system', '💡 Bagikan URL room ke teman agar bisa bergabung');
    if (roomData && roomData.videoSource === 'youtube') {
        addChatMessage('system', '🔒 Video dikunci — tidak bisa dimajukan/mundurkan');
    } else {
        addChatMessage('system', '💿 Menampilkan Google Drive Preview.');
    }

    dbChatRef.orderByChild('timestamp').limitToLast(80).on('child_added', snap => {
        const msg = snap.val();
        if (!msg) return;
        if (msg.sender === myUsername) return; 
        addChatMessage('other', msg.text, msg.sender);
    });
}

function addChatMessage(type, text, sender) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-message ' + type;
    if (type === 'system') {
        div.innerHTML = '<div class="chat-bubble">' + text + '</div>';
    } else {
        const safeText = (text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const safeSender = (sender || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        div.innerHTML = '<div class="chat-sender">' + safeSender + '</div><div class="chat-bubble">' + safeText + '</div>';
    }
    box.appendChild(div);
    while (box.children.length > 100) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !dbChatRef) return;
    dbChatRef.push({
        sender: myUsername,
        text: text.slice(0, 500),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    addChatMessage('own', text, myUsername);
    input.value = '';
}

// ========== PRESENCE ==========
function setupPresenceListener() {
    db.ref('rooms/' + currentRoomId + '/presence').on('value', snap => {
        const bar = document.getElementById('online-users-bar');
        const usersEl = document.getElementById('chat-users');
        let count = 0;
        let html = '';
        if (snap.exists()) {
            snap.forEach(child => {
                const u = child.val();
                count++;
                const initial = (u.username || '?')[0].toUpperCase();
                const isMe = child.key === myUsername;
                html += '<div class="online-avatar" style="' + (isMe ? 'border-color:var(--accent-gold);color:var(--accent-gold)' : '') + '" title="' + (u.username || '?') + (u.isHost ? ' (Host)' : '') + '">' + initial + '</div>';
            });
        }
        bar.innerHTML = html;
        usersEl.textContent = count + ' online';
    });
}

// ========== COUNTDOWN ==========
function startCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    const overlay = document.getElementById('countdown-overlay');
    overlay.style.display = 'flex';

    if (countdownInterval) clearInterval(countdownInterval);

    function tick() {
        if (!roomData) return;
        const diff = roomData.scheduleTime - Date.now();
        if (diff <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            overlay.style.display = 'none';
            if (roomData.phase === 'waiting') {
                dbRoomRef.update({ phase: 'playing', playState: 1, currentTime: 0, lastSync: firebase.database.ServerValue.TIMESTAMP });
            }
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        timerEl.textContent = m + ':' + s.toString().padStart(2, '0');
    }
    tick();
    countdownInterval = setInterval(tick, 500);
}

// ========== PLAYER ==========
function initPlayer(room, startSeconds) {
    document.getElementById('cinema-loading').style.display = 'flex';
    document.getElementById('player-container').innerHTML = '';
    playerReady = false;

    // Cleanup previous
    if (playerType === 'youtube' && player) { 
        try { player.destroy(); } catch(e){} 
    }
    player = null;

    const safeStart = Math.max(0, Math.floor(startSeconds || 0));

    // LOGIC INTI: DETEKSI SOURCE
    if (room.videoSource === 'drive') {
        // Gunakan IFRAME untuk Drive
        playerType = 'drive';
        const driveUrl = room.videoUrl;
        document.getElementById('player-container').innerHTML = `
            <div class="drive-player-container">
                <iframe src="${driveUrl}" allow="autoplay"></iframe>
            </div>
        `;
        playerReady = true;
        document.getElementById('cinema-loading').style.display = 'none';
        document.getElementById('sync-indicator').style.display = 'flex'; // Tetap show sync status (visual saja)
        
    } else {
        // Gunakan YouTube API
        playerType = 'youtube';
        player = new YT.Player('player-container', {
            height: '100%',
            width: '100%',
            videoId: room.videoId,
            playerVars: {
                autoplay: 1,
                controls: 0,        
                disablekb: 1,       
                fs: 0,              
                modestbranding: 1,
                rel: 0, 
                iv_load_policy: 3,
                playsinline: 1,
                start: safeStart,
                enablejsapi: 1,
                widget_referrer: window.location.origin
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: onPlayerError
            }
        });
    }
}

function onPlayerReady(e) {
    playerReady = true;
    document.getElementById('cinema-loading').style.display = 'none';
    document.getElementById('sync-indicator').style.display = 'flex';
    e.target.playVideo();
    startSyncLoop();
}

function onPlayerStateChange(e) {
    if (!playerReady || playerType !== 'youtube') return;

    const ytState = e.data; 

    if (ytState === YT.PlayerState.ENDED) {
        document.getElementById('end-screen-overlay').classList.add('active');
        if (dbRoomRef) {
            dbRoomRef.update({ phase: 'ended', playState: 0, lastSync: firebase.database.ServerValue.TIMESTAMP });
        }
        addChatMessage('system', '🎬 Film telah selesai. Terima kasih telah menonton!');
    }

    if (ytState === YT.PlayerState.PAUSED && roomData && roomData.phase === 'playing') {
        setTimeout(() => {
            if (player && playerReady && roomData && roomData.phase === 'playing') {
                player.playVideo();
            }
        }, 300);
    }
}

function onPlayerError(e) {
    console.error('Player error:', e.data);
    document.getElementById('cinema-loading').style.display = 'none';
    let msg = 'Terjadi kesalahan pada video';
    if (e.data === 2) msg = 'Video ID tidak valid';
    else if (e.data === 5) msg = 'Error konten HTML5';
    else if (e.data === 100) msg = 'Video tidak ditemukan atau privat';
    else if (e.data === 101 || e.data === 150) msg = 'Video tidak bisa di-embed';
    showToast(msg, 'error');
    addChatMessage('system', '❌ ' + msg);
}

// ========== REALTIME SYNC ==========
function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(() => {
        // Hanya sync jika YouTube, karena Drive tidak bisa dikontrol via JS API
        if (!playerReady || playerType !== 'youtube' || !player || !roomData) return;
        if (roomData.phase !== 'playing') return;

        try {
            const currentPos = player.getCurrentTime();
            const playerState = player.getPlayerState();
            const isPlaying = (playerState === YT.PlayerState.PLAYING);

            dbRoomRef.update({
                currentTime: currentPos,
                playState: isPlaying ? 1 : 0,
                lastSync: firebase.database.ServerValue.TIMESTAMP
            });
        } catch(e) {}
    }, SYNC_INTERVAL);
}

function handleRoomUpdate(snapshot) {
    const data = snapshot.val();
    if (!data) {
        showToast('Room telah dihapus', 'error');
        cleanupCinema();
        showPage('home');
        return;
    }

    const prevPhase = roomData ? roomData.phase : null;
    roomData = data;

    if (prevPhase === 'waiting' && data.phase === 'playing') {
        document.getElementById('countdown-overlay').style.display = 'none';
        initPlayer(data, 0); // Pass seluruh object room
    }

    if (data.phase === 'ended' && prevPhase !== 'ended') {
        addChatMessage('system', '🎬 Room ini telah berakhir. Terima kasih!');
    }

    // Hanya handle sync untuk YouTube
    if (playerReady && playerType === 'youtube' && data.phase === 'playing') {
        try {
            const myPos = player.getCurrentTime();
            const serverPos = data.currentTime || 0;
            const drift = Math.abs(myPos - serverPos);

            if (drift > MAX_SYNC_DRIFT) {
                isSyncing = true;
                player.seekTo(serverPos, true);
                setTimeout(() => { isSyncing = false; }, 500);
            }

            const shouldPlay = data.playState === 1;
            const myState = player.getPlayerState();
            const amPlaying = (myState === YT.PlayerState.PLAYING);

            if (shouldPlay && !amPlaying && !isSyncing) {
                player.playVideo();
            }
        } catch(e) {}
    }
}

// ========== EXIT ==========
function confirmExit() {
    document.getElementById('exit-modal').classList.add('active');
}
function closeExitModal(e) {
    if (e && e.target.id !== 'exit-modal') return;
    document.getElementById('exit-modal').classList.remove('active');
}
function doExit() {
    closeExitModal();
    cleanupCinema();
    showPage('home');
    const url = new URL(window.location.href.split('?')[0]);
    window.history.replaceState({}, '', url.toString());
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
}

// ========== MODALS ==========
function showRules() {
    document.getElementById('rules-modal').classList.add('active');
}
function closeRules(e) {
    if (!e || e.target.id === 'rules-modal' || e.target.tagName === 'BUTTON') {
        document.getElementById('rules-modal').classList.remove('active');
    }
}

// ========== TOAST ==========
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    toast.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all .3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ========== CRON: Cleanup & Phase Update ==========
setInterval(() => {
    if (!db) return;
    const now = Date.now();

    db.ref('rooms').once('value').then(snap => {
        if (!snap.exists()) return;
        const updates = {};
        const toRemove = [];

        snap.forEach(child => {
            const room = child.val();
            if (!room) return;
            const key = child.key;

            if (room.phase === 'waiting' && room.scheduleTime && now >= room.scheduleTime) {
                updates[key + '/phase'] = 'playing';
                updates[key + '/playState'] = 1;
                updates[key + '/currentTime'] = 0;
                updates[key + '/lastSync'] = firebase.database.ServerValue.TIMESTAMP;
            }

            // Untuk Drive, kita tidak bisa auto-end karena ga ada event listener, jadi pakai timeout manual 5 jam
            if (room.phase === 'playing' && room.scheduleTime && (now - room.scheduleTime > 5 * 60 * 60 * 1000)) {
                updates[key + '/phase'] = 'ended';
                updates[key + '/playState'] = 0;
            }

            if (room.scheduleTime && (now - room.scheduleTime > 24 * 60 * 60 * 1000)) {
                toRemove.push(key);
            }

            if (!room.scheduleTime && room.createdAt) {
                const created = room.createdAt;
                if (typeof created === 'number' && (now - created > 24 * 60 * 60 * 1000)) {
                    toRemove.push(key);
                }
            }
        });

        if (Object.keys(updates).length > 0) {
            db.ref('rooms').update(updates);
        }
        toRemove.forEach(key => {
            db.ref('rooms/' + key).remove();
        });
    }).catch(() => {});
}, 8000);

// ========== CRON: Refresh Loket Occupied Cache ==========
setInterval(() => {
    if (currentPage === 'loket') {
        fetchOccupiedRooms().then(() => renderLoket());
    }
}, 15000);
