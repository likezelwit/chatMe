// ========== APP LOGIC ==========

// --- MOVIE RENDERING ---
function renderMovies() {
    const grid = document.getElementById('movie-grid');
    if(!grid) return;
    
    grid.innerHTML = movieDatabase.map(m => `
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
    selectedMovie = movieDatabase.find(m => m.id === id);
    if (selectedMovie) showToast('Dipilih: ' + selectedMovie.title, 'success');
}

function createRoomFromMovie(id) {
    const movie = movieDatabase.find(m => m.id === id);
    if (!movie) return;
    selectedMovie = movie;
    
    let videoUrl = movie.url;

    const displayEl = document.getElementById('selected-movie-display');
    if(displayEl) displayEl.value = movie.title;
    
    const urlInput = document.getElementById('room-video-url');
    if(urlInput) urlInput.value = videoUrl;
    
    const manualInput = document.getElementById('manual-video-url');
    if(manualInput) manualInput.value = '';
    
    const source = getVideoSource(videoUrl);
    const preview = document.getElementById('video-preview');
    if(preview) preview.classList.add('active');
    
    const thumb = document.getElementById('preview-thumb');
    const titleEl = document.getElementById('preview-title');
    const channel = document.getElementById('preview-channel');
    const duration = document.getElementById('preview-duration');

    if(thumb) thumb.src = movie.poster;
    if(titleEl) titleEl.textContent = movie.title;
    if(channel) channel.textContent = source.type === 'youtube' ? 'YouTube' : 'Google Drive';
    if(duration) duration.textContent = movie.duration;
    
    verifiedVideoData = { id: movie.id, title: movie.title, url: movie.url, type: source.type };
    showPage('create');
}

// --- LOKET SYSTEM ---
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
    if(!grid) return;
    let html = '';

    for (let l = 1; l <= TOTAL_LOKET; l++) {
        let roomsHtml = '';
        let occupiedCount = 0;
        const startGlobal = (l - 1) * ROOMS_PER_LOKET + 1;

        for (let r = 1; r <= ROOMS_PER_LOKET; r++) {
            const globalNum = startGlobal + r - 1;
            const isOccupied = !!occupiedRooms[globalNum];
            
            if (isOccupied) occupiedCount++;
            
            const clickAction = isOccupied ? 
                `onclick="joinRoomFromLoket('${occupiedRooms[globalNum]}')"` :
                `onclick="event.stopPropagation();clickRoomFromLoket(${l},${r})"`;

            roomsHtml += `<div class="room-mini ${isOccupied ? 'occupied' : 'available'}" 
                ${clickAction}
                title="${isOccupied ? 'Klik untuk gabung' : 'Room ' + r + ' - Klik untuk pesan'}">${r}</div>`;
        }

        const available = ROOMS_PER_LOKET - occupiedCount;
        html += `
            <div class="loket-card" onclick="openLoketDetail(${l})">
                <div class="loket-card-header">
                    <div class="loket-number">LOKET ${l}</div>
                    <div class="loket-status"><span class="status-dot"></span>${available > 0 ? available + ' tersedia' : 'Penuh'}</div>
                </div>
                <div class="loket-desc">Room ${startGlobal} s/d ${startGlobal + ROOMS_PER_LOKET - 1} • Hijau: Kosong, Merah: Isi (Klik untuk gabung)</div>
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

function joinRoomFromLoket(roomId) {
    if (!db) return;
    db.ref('rooms/' + roomId).once('value').then(snap => {
        if (!snap.exists()) return;
        const room = snap.val();
        
        if (room.visibility === 'private') {
            joinRoomById(roomId); 
        } else {
            myUsername = "User_" + Math.floor(Math.random() * 9000 + 1000);
            enterCinema(roomId, room, false);
            showToast('Berhasil bergabung ke Room Publik!', 'success');
        }
    });
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
    // Optional
}

// --- CREATE ROOM & BOOKING ---
function openCreateRoom(preLoket, preRoom) {
    selectedMovie = null;
    verifiedVideoData = null;
    
    const displayEl = document.getElementById('selected-movie-display');
    if(displayEl) {
        displayEl.value = '';
        displayEl.placeholder = 'Belum memilih film (opsional)';
        delete displayEl.dataset.preLoket;
        delete displayEl.dataset.preRoom;
    }

    const urlInput = document.getElementById('room-video-url');
    if(urlInput) urlInput.value = '';
    
    const manualInput = document.getElementById('manual-video-url');
    if(manualInput) manualInput.value = '';
    
    const preview = document.getElementById('video-preview');
    if(preview) preview.classList.remove('active');
    
    const timeInput = document.getElementById('room-time');
    if(timeInput) timeInput.value = '';
    
    const publicRadio = document.querySelector('input[name="roomVisibility"][value="public"]');
    if(publicRadio) publicRadio.checked = true;
    
    togglePasswordInput();
    setupDateTimeMin();
    updateQuota();

    if (preLoket && preRoom) {
        if(displayEl) {
            displayEl.placeholder = `Loket ${preLoket} • Room ${preRoom}`;
            displayEl.dataset.preLoket = preLoket;
            displayEl.dataset.preRoom = preRoom;
        }
    }

    showPage('create');
}

function togglePasswordInput() {
    const isPrivate = document.querySelector('input[name="roomVisibility"]:checked').value === 'private';
    const passGroup = document.getElementById('password-group');
    if (passGroup) {
        if (isPrivate) {
            passGroup.classList.remove('hidden');
            const passInput = document.getElementById('room-password');
            if(passInput) passInput.focus();
        } else {
            passGroup.classList.add('hidden');
            const passInput = document.getElementById('room-password');
            if(passInput) passInput.value = '';
        }
    }
}

function verifyManualVideo() {
    const urlInput = document.getElementById('manual-video-url');
    if(!urlInput) return;
    const url = urlInput.value.trim();
    const preview = document.getElementById('video-preview');
    if(!preview) return;
    
    if (!url) { 
        preview.classList.remove('active'); 
        verifiedVideoData = null; 
        return; 
    }
    
    const source = getVideoSource(url);
    if (!source) { 
        preview.classList.remove('active'); 
        verifiedVideoData = null; 
        showToast('URL Video tidak valid!', 'error');
        return; 
    }
    
    preview.classList.add('active');
    const thumb = document.getElementById('preview-thumb');
    const channel = document.getElementById('preview-channel');
    const duration = document.getElementById('preview-duration');
    
    if (source.type === 'youtube') {
        if(thumb) thumb.src = 'https://img.youtube.com/vi/' + source.id + '/mqdefault.jpg';
        if(channel) channel.textContent = 'YouTube';
        verifiedVideoData = { id: source.id, title: 'Video YouTube', type: 'youtube' };
    } else {
        if(thumb) thumb.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/1200px-Google_Drive_icon_%282020%29.svg.png';
        if(channel) channel.textContent = 'Google Drive';
        verifiedVideoData = { id: null, title: 'Video Drive', url: url, type: 'drive' };
    }
    if(duration) duration.textContent = 'Durasi terdeteksi otomatis';
    
    const roomUrlInput = document.getElementById('room-video-url');
    if(roomUrlInput) roomUrlInput.value = url;
}

// --- QUICK TIME SCHEDULE ---
function setQuickTime(offsetMinutes) {
    const timeInput = document.getElementById('room-time');
    if(!timeInput) return;
    
    const now = new Date();
    now.setMinutes(now.getMinutes() + offsetMinutes);
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

function setupDateTimeMin() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const timeInput = document.getElementById('room-time');
    if(timeInput) timeInput.min = now.toISOString().slice(0, 16);
}

function selectTier(tier) {
    if (tier !== 'free') return;
    document.querySelectorAll('.tier-option').forEach(o => o.classList.remove('selected'));
    const freeOption = document.querySelector('[data-tier="free"]');
    if(freeOption) freeOption.classList.add('selected');
    currentTier = 'free';
    updateQuota();
}

function updateQuota() {
    const q = randomQuota();
    const quotaDisplay = document.getElementById('quota-display');
    if(quotaDisplay) quotaDisplay.textContent = q;
    return q;
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

function processBooking() {
    const timeInput = document.getElementById('room-time');
    if(!timeInput) return;
    const timeValue = timeInput.value;

    const manualUrlInput = document.getElementById('manual-video-url');
    const manualUrl = manualUrlInput ? manualUrlInput.value.trim() : '';
    
    const savedUrlInput = document.getElementById('room-video-url');
    const savedUrl = savedUrlInput ? savedUrlInput.value : '';

    const displayEl = document.getElementById('selected-movie-display');

    let finalUrl = manualUrl || savedUrl;
    if (!finalUrl && selectedMovie && selectedMovie.url) {
        finalUrl = selectedMovie.url;
    } else if (!finalUrl && selectedMovie && selectedMovie.id) {
        finalUrl = 'https://youtube.com/watch?v=' + selectedMovie.id;
    }

    let videoTitle = 'Unknown Movie';
    if (verifiedVideoData && verifiedVideoData.title) {
        videoTitle = verifiedVideoData.title;
    } else if (selectedMovie) {
        videoTitle = selectedMovie.title;
    }

    const source = getVideoSource(finalUrl);

    if (!source) { showToast('Link video tidak valid (Hanya YouTube / Drive)!', 'error'); return; }
    if (!timeValue) { showToast('Pilih jadwal tayang terlebih dahulu!', 'error'); return; }

    const scheduleTime = new Date(timeValue).getTime();
    const now = Date.now();
    if (scheduleTime <= now) { showToast('Jadwal harus minimal 1 menit dari sekarang!', 'error'); return; }

    const quotaDisplay = document.getElementById('quota-display');
    const quota = quotaDisplay ? parseInt(quotaDisplay.textContent) || randomQuota() : randomQuota();
    
    const visibilityInput = document.querySelector('input[name="roomVisibility"]:checked');
    const visibility = visibilityInput ? visibilityInput.value : 'public';
    
    let password = null;
    if (visibility === 'private') {
        const passInput = document.getElementById('room-password');
        const passValue = passInput ? passInput.value.trim() : '';
        if (!passValue) {
            showToast('Masukkan password untuk room Private!', 'error');
            return;
        }
        password = passValue;
    }

    let loket, room;
    const preLoket = displayEl && displayEl.dataset.preLoket ? parseInt(displayEl.dataset.preLoket) : 0;
    const preRoom = displayEl && displayEl.dataset.preRoom ? parseInt(displayEl.dataset.preRoom) : 0;

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
        videoSource: source.type, 
        videoId: source.type === 'youtube' ? source.id : null,
        videoUrl: source.type === 'drive' ? source.url : null,
        videoTitle: videoTitle,
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

function showPrinterAnimation(loket, room, quota, roomId, roomObj) {
    const overlay = document.getElementById('printer-overlay');
    const container = document.getElementById('ticket-animation-container');
    if(overlay) overlay.classList.add('active');
    if(container) {
        container.innerHTML = `
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
    }
    setTimeout(() => {
        if(overlay) overlay.classList.remove('active');
        enterCinema(roomId, roomObj, true);
    }, 2600);
}

// --- CINEMA & PLAYER ---
function enterCinema(roomId, room, isHost) {
    cleanupCinema();
    currentRoomId = roomId;
    roomData = room;
    dbRoomRef = db.ref('rooms/' + roomId);
    dbChatRef = db.ref('rooms/' + roomId + '/chat');
    dbPresenceRef = db.ref('rooms/' + roomId + '/presence/' + myUsername);

    const endOverlay = document.getElementById('end-screen-overlay');
    if(endOverlay) endOverlay.classList.remove('active');

    const badge = document.getElementById('cinema-badge');
    if(badge) badge.textContent = 'LOKET ' + room.loket + ' | ROOM ' + room.room;
    
    const title = document.getElementById('cinema-movie-title');
    if(title) title.textContent = room.videoTitle || 'Unknown Movie';
    
    const countInfo = document.getElementById('countdown-room-info');
    if(countInfo) countInfo.innerHTML = 'Loket <strong>' + room.loket + '</strong> • Room <strong>' + room.room + '</strong>';

    const cinemaView = document.getElementById('cinema-view');
    if(cinemaView) cinemaView.classList.add('active');
    
    const loading = document.getElementById('cinema-loading');
    if(loading) loading.style.display = 'flex';
    
    const syncInd = document.getElementById('sync-indicator');
    if(syncInd) syncInd.style.display = 'none';
    
    const lockInd = document.getElementById('lock-indicator');
    if(lockInd) {
        lockInd.style.display = (room.videoSource === 'youtube') ? 'flex' : 'none';
    }

    updateURL(roomId);

    if(dbPresenceRef) {
        dbPresenceRef.set({
            username: myUsername,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            isHost: !!isHost
        });
        dbPresenceRef.onDisconnect().remove();
    }

    presenceCleanup = setTimeout(() => {
        if (dbPresenceRef) dbPresenceRef.remove();
    }, 86400000);

    setupChat();
    setupPresenceListener();
    dbRoomRef.on('value', handleRoomUpdate);

    if (room.phase === 'waiting') {
        startCountdown();
    } else if (room.phase === 'playing') {
        const countdownOverlay = document.getElementById('countdown-overlay');
        if(countdownOverlay) countdownOverlay.style.display = 'none';
        // PERBAIKAN UTAMA 1: Langsung ke player utama, lewat pre-roll
        initMainPlayer(room); 
    }
}

function cleanupCinema() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    if (presenceCleanup) { clearTimeout(presenceCleanup); presenceCleanup = null; }
    
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
    isPreRollPlaying = false;

    const cinemaView = document.getElementById('cinema-view');
    if(cinemaView) cinemaView.classList.remove('active');
    
    const countdownOverlay = document.getElementById('countdown-overlay');
    if(countdownOverlay) countdownOverlay.style.display = 'flex';
    
    const loading = document.getElementById('cinema-loading');
    if(loading) loading.style.display = 'none';
    
    const syncInd = document.getElementById('sync-indicator');
    if(syncInd) syncInd.style.display = 'none';
    
    const lockInd = document.getElementById('lock-indicator');
    if(lockInd) lockInd.style.display = 'none';
    
    const endOverlay = document.getElementById('end-screen-overlay');
    if(endOverlay) endOverlay.classList.remove('active');
    
    const chatBox = document.getElementById('chat-messages');
    if(chatBox) chatBox.innerHTML = '';
    
    const usersBar = document.getElementById('online-users-bar');
    if(usersBar) usersBar.innerHTML = '';
    
    const playerContainer = document.getElementById('player-container');
    if(playerContainer) playerContainer.innerHTML = '';
}

// --- CHAT & PRESENCE ---
function setupChat() {
    const box = document.getElementById('chat-messages');
    if(!box) return;
    box.innerHTML = '';
    addChatMessage('system', '🎬 Selamat datang di ThMOvie Watch Party!');
    addChatMessage('system', '💡 Bagikan URL room ke teman agar bisa bergabung');
    if (roomData && roomData.videoSource === 'youtube') {
        addChatMessage('system', '🔒 Video dikunci — tidak bisa dimajukan/mundurkan');
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
    if(!box) return;
    
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
    const text = input ? input.value.trim() : '';
    if (!text || !dbChatRef) return;
    dbChatRef.push({
        sender: myUsername,
        text: text.slice(0, 500),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    addChatMessage('own', text, myUsername);
    if(input) input.value = '';
}

function setupPresenceListener() {
    if(!currentRoomId) return;
    db.ref('rooms/' + currentRoomId + '/presence').on('value', snap => {
        const bar = document.getElementById('online-users-bar');
        const usersEl = document.getElementById('chat-users');
        if(!bar || !usersEl) return;
        
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

// --- COUNTDOWN & SYNC ---
function startCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    const overlay = document.getElementById('countdown-overlay');
    if(!timerEl || !overlay) return;

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

function startPreRoll(room) {
    isPreRollPlaying = true;
    showToast('Memutar iklan pembuka...', 'success');
    addChatMessage('system', '📺 Memutar iklan pembuka selama ' + PRE_ROLL_DURATION_SEC + ' detik...');

    initYoutubePlayer(PRE_ROLL_VIDEO_ID);
    
    setTimeout(() => {
        if (!isPreRollPlaying) return; 
        isPreRollPlaying = false;
        addChatMessage('system', '✅ Iklan selesai. Memutar film utama...');
        initMainPlayer(room);
    }, PRE_ROLL_DURATION_SEC * 1000);
}

function initMainPlayer(room) {
    if (room.videoSource === 'drive') {
        initDrivePlayer(room.videoUrl);
    } else {
        initYoutubePlayer(room.videoId);
    }
}

// --- YOUTUBE PLAYER WRAPPER ---
function initYoutubePlayer(videoId) {
    const loading = document.getElementById('cinema-loading');
    if(loading) loading.style.display = 'flex';
    
    const container = document.getElementById('player-container');
    if(container) container.innerHTML = '';
    
    playerReady = false;

    if (playerType === 'youtube' && player) { 
        try { player.destroy(); } catch(e){} 
    }
    player = null;

    playerType = 'youtube';
    
    if (typeof YT !== 'undefined') {
        player = new YT.Player('player-container', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                controls: 0,        
                disablekb: 1,       
                fs: 0,              
                modestbranding: 1,
                rel: 0, 
                iv_load_policy: 3,
                playsinline: 1,
                enablejsapi: 1,
                widget_referrer: window.location.origin
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: onPlayerError
            }
        });
    } else {
        showToast('YouTube API belum siap. Refresh halaman.', 'error');
    }
}

function onPlayerReady(e) {
    playerReady = true;
    const loading = document.getElementById('cinema-loading');
    if(loading) loading.style.display = 'none';
    
    const syncInd = document.getElementById('sync-indicator');
    if(syncInd) syncInd.style.display = 'flex';
    
    e.target.playVideo();
    
    if (!isPreRollPlaying) {
        startSyncLoop();
    }
}

function onPlayerStateChange(e) {
    if (!playerReady || playerType !== 'youtube') return;

    const ytState = e.data; 

    if (ytState === YT.PlayerState.ENDED) {
        if (isPreRollPlaying) return;

        const endOverlay = document.getElementById('end-screen-overlay');
        if(endOverlay) endOverlay.classList.add('active');
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
    const loading = document.getElementById('cinema-loading');
    if(loading) loading.style.display = 'none';
    
    let msg = 'Terjadi kesalahan pada video';
    if (e.data === 2) msg = 'Video ID tidak valid';
    else if (e.data === 5) msg = 'Error konten HTML5';
    else if (e.data === 100) msg = 'Video tidak ditemukan atau privat';
    else if (e.data === 101 || e.data === 150) msg = 'Video tidak bisa di-embed';
    
    showToast(msg, 'error');
    addChatMessage('system', '❌ ' + msg);
}

// --- DRIVE PLAYER WRAPPER ---
function initDrivePlayer(url) {
    const loading = document.getElementById('cinema-loading');
    if(loading) loading.style.display = 'flex';
    
    const container = document.getElementById('player-container');
    if(container) container.innerHTML = '';
    
    playerReady = false;

    if (playerType === 'youtube' && player) { 
        try { player.destroy(); } catch(e){} 
    }
    player = null;

    playerType = 'drive';
    
    let finalUrl = url;
    if (url.includes('/view') || url.includes('/edit')) {
        finalUrl = url.replace(/\/view|\/edit/, '/preview');
    }
    
    if(container) {
        container.innerHTML = `
            <div class="drive-player-container" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000;">
                <iframe src="${finalUrl}" allow="autoplay" style="width:100%; height:100%; border:none; position:absolute; top:0; left:0;"></iframe>
                <div class="drive-sync-overlay" style="position:absolute; inset:0; z-index:10; background:transparent; cursor:default;"></div>
            </div>
        `;
    }
    
    playerReady = true;
    // PERBAIKAN 2: Tambah delay untuk iframe drive agar tidak hitam
    setTimeout(() => {
        if(loading) loading.style.display = 'none';
    }, 1500); 
    
    const syncInd = document.getElementById('sync-indicator');
    if(syncInd) syncInd.style.display = 'flex';
    
    startSyncLoop(); 
}

function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(() => {
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
        const overlay = document.getElementById('countdown-overlay');
        if(overlay) overlay.style.display = 'none';
        // PERBAIKAN UTAMA 2: Langsung ke player utama, lewat pre-roll
        initMainPlayer(data); 
    }

    if (data.phase === 'ended' && prevPhase !== 'ended') {
        addChatMessage('system', '🎬 Room ini telah berakhir. Terima kasih!');
    }

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

// --- JOIN ROOM LOGIC ---
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

        const modalBody = document.getElementById('join-modal-body');
        if(modalBody) {
            modalBody.innerHTML = `
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
        }
        const modal = document.getElementById('join-modal');
        if(modal) modal.classList.add('active');
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

    if (pendingJoinRoomId) {
        db.ref('rooms/' + pendingJoinRoomId).once('value').then(snap => {
             const room = snap.val();
             if (!room) return;
             
             if (room.visibility === 'private') {
                const passInput = document.getElementById('join-password');
                if (!passInput || passInput.value !== room.password) {
                    showToast('Password salah!', 'error');
                    return;
                }
            }
            
            closeJoinModal();
            if (!pendingJoinRoomId) return;
            enterCinema(pendingJoinRoomId, room, false);
            pendingJoinRoomId = null;
        });
    }
}

function closeJoinModal(e) {
    if (e) {
        const modal = document.getElementById('join-modal');
        if (e.target !== modal) return;
    }
    const modal = document.getElementById('join-modal');
    if(modal) modal.classList.remove('active');
}

// --- UI HELPERS ---
function showPage(page) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById('cinema-view').classList.remove('active');

    const pageMap = { home:'home-page', loket:'loket-page', create:'create-page' };
    if (pageMap[page]) {
        const el = document.getElementById(pageMap[page]);
        if(el) el.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === page);
    });

    currentPage = page;
    window.scrollTo(0, 0);
}

function scrollToMovies() {
    if (currentPage !== 'home') showPage('home');
    setTimeout(() => {
        const el = document.getElementById('movies-section');
        if(el) el.scrollIntoView({ behavior:'smooth' });
    }, 100);
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

function confirmExit() {
    const modal = document.getElementById('exit-modal');
    if(modal) modal.classList.add('active');
}
function closeExitModal(e) {
    if (e) {
        const modal = document.getElementById('exit-modal');
        if (e.target !== modal) return;
    } else {
        const modal = document.getElementById('exit-modal');
        if(modal) modal.classList.remove('active');
    }
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

function showRules() {
    const modal = document.getElementById('rules-modal');
    if(modal) modal.classList.add('active');
}
function closeRules(e) {
    if (!e || e.target.id === 'rules-modal' || e.target.tagName === 'BUTTON') {
        const modal = document.getElementById('rules-modal');
        if(modal) modal.classList.remove('active');
    }
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
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

function initJazzIndicator() {
    const el = document.getElementById('jazz-indicator');
    if(el) {
        el.addEventListener('click', () => {
            el.classList.toggle('muted');
            showToast(el.classList.contains('muted') ? 'Jazz Lounge Paused' : 'Jazz Lounge Playing');
        });
    }
}

function handleURLRoute() {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if (rid && rid.length > 5) {
        showToast('Membuka room dari link...');
        joinRoomById(rid);
    }
}

// --- MAIN INIT ---
window.onload = function() {
    renderMovies();
    renderLoket();
    setupDateTimeMin();
    handleURLRoute();
    initJazzIndicator();

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('nav-header');
        if(nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    });

    window.addEventListener('beforeunload', () => {
        if (currentRoomId && dbPresenceRef) {
            dbPresenceRef.remove();
        }
    });
};

// --- CRON JOBS ---
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

setInterval(() => {
    if (currentPage === 'loket') {
        fetchOccupiedRooms().then(() => renderLoket());
    }
}, 15000);
