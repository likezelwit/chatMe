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
    console.error("Firebase Init Error:", e);
}

// ========== CONSTANTS ==========
const TOTAL_LOKET = 6;
const ROOMS_PER_LOKET = 30;
const PRE_ROLL_VIDEO_ID = ""; // Kosongkan jika tidak mau pakai iklan
const PRE_ROLL_DURATION_SEC = 0;

// ========== GLOBAL STATE ==========
let currentPage = 'home';
let selectedMovie = null;
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
let presenceCleanup = null; 
let occupiedRooms = {}; 
let isHost = false; // Track if current user is host
let isPreRollPlaying = false;

// ========== HELPERS ==========
function loketRoomToGlobal(loket, room) {
    return ((loket - 1) * ROOMS_PER_LOKET) + room;
}

function randomQuota() {
    return Math.floor(Math.random() * 28) + 30; 
}
