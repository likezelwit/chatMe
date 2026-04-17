// ========== FIREBASE CONFIG ==========
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
const SYNC_INTERVAL = 2000;
const MAX_SYNC_DRIFT = 2; 
const PRE_ROLL_VIDEO_ID = "9v1atEBmUIc";
const PRE_ROLL_DURATION_SEC = 0; // Set 0 to disable pre-roll ads

// ========== GLOBAL STATE ==========
let currentPage = 'home';
let selectedMovie = null;
let currentTier = 'free';
let currentRoomId = null;
let player = null; 
let playerType = 'youtube'; 
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
let isPreRollPlaying = false; 

// ========== HELPERS ==========
function loketRoomToGlobal(loket, room) {
    return ((loket - 1) * ROOMS_PER_LOKET) + room;
}
function globalToLoketRoom(globalNum) {
    const loket = Math.floor((globalNum - 1) / ROOMS_PER_LOKET) + 1;
    const room = ((globalNum - 1) % ROOMS_PER_LOKET) + 1;
    return { loket, room };
}

function getVideoSource(url) {
    if (!url) return null;
    
    // YouTube Parsing
    const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[2].length === 11) {
        return { type: 'youtube', id: ytMatch[2] };
    }
    
    // SeekStreaming Detection (Simple check for our embed domain)
    if (url.includes('embedseek.com')) {
        return { type: 'seekstream', url: url };
    }

    return null;
}

function randomQuota() {
    return Math.floor(Math.random() * 28) + 30; 
}
