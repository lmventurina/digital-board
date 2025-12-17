import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, setDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Inject YouTube IFrame API
let ytApiReady = false;
window.onYouTubeIframeAPIReady = () => { ytApiReady = true; };
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// --- Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAtawxqfPOZqKJZcClKBVXSClC3IsIuDtM",
    authDomain: "digital-bulletin-board-6c660.firebaseapp.com",
    projectId: "digital-bulletin-board-6c660",
    storageBucket: "digital-bulletin-board-6c660.firebasestorage.app",
    messagingSenderId: "1051324595132",
    appId: "1:1051324595132:web:bb95ce7acc65d9e80d49b9",
    measurementId: "G-6VW2SKC09Z"
};

const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { console.warn("Analytics skipped", e); }

const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'navajo-pine-hs-v1'; 

let currentUser = null;
let appData = { announcements: [], students: [], teachers: [], events: [], externalEvents: [], ticker: "", settings: {}, media: [] };

const DEPARTMENTS = ["General", "Admin", "History", "Navajo Language", "Math", "ELA", "Science", "Tech", "Special Ed", "PE", "Health", "Welding", "Sports", "Music", "Art"];
const COLLECTIONS = { ANNOUNCEMENTS: 'announcements', STUDENTS: 'students', TEACHERS: 'teachers', EVENTS: 'events', TICKER: 'ticker', SETTINGS: 'settings', MEDIA: 'media' };

const els = {
    schoolName: document.getElementById('header-school-name'),
    schoolSubtitle: document.getElementById('header-subtitle'),
    schoolSubtitle2: document.getElementById('header-subtitle-2'),
    liveTime: document.getElementById('live-time'),
    liveDate: document.getElementById('live-date'),
    ticker: document.getElementById('ticker-content'),
    studentCarousel: document.getElementById('student-carousel'),
    studentProgress: document.getElementById('student-progress'),
    teacherCarousel: document.getElementById('teacher-carousel'),
    teacherProgress: document.getElementById('teacher-progress'),
    announcementCarousel: document.getElementById('announcement-carousel'),
    announcementProgress: document.getElementById('announcement-progress'),
    mediaCarousel: document.getElementById('media-carousel'),
    mediaProgress: document.getElementById('media-progress'),
    eventsList: document.getElementById('events-list'),
    weatherCity: document.getElementById('weather-city'),
    weatherIcon: document.getElementById('weather-current-icon'),
    weatherTemp: document.getElementById('weather-current-temp'),
    weatherForecast: document.getElementById('weather-forecast'),
    adminAnnouncements: document.getElementById('admin-announcements-list'),
    adminStudents: document.getElementById('admin-students-list'),
    adminTeachers: document.getElementById('admin-teachers-list'),
    adminEvents: document.getElementById('admin-events-list'),
    adminTicker: document.getElementById('admin-ticker-list'),
    adminMedia: document.getElementById('admin-media-list'),
    confName: document.getElementById('conf-name'),
    confSubtitle: document.getElementById('conf-subtitle'),
    confSubtitle2: document.getElementById('conf-subtitle-2'),
    confLocation: document.getElementById('conf-location'),
    confCalendar: document.getElementById('conf-calendar')
};

// --- Authentication & Initialization ---
async function initAuth() {
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth); 
        } catch (e) {
            // Silently fail if anonymous auth is disabled; user is just a guest
            console.log("Guest login not enabled. Viewing as public.");
        }
    }
}
initAuth();

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user && !user.isAnonymous) {
        console.log("Admin Logged In:", user.email);
    }
    setupListeners();
});

startClock();

// --- Auth Functions (Attached to Window) ---
window.handleAdminClick = () => {
    if (currentUser && !currentUser.isAnonymous) {
        document.getElementById('admin-modal').classList.remove('hidden');
    } else {
        document.getElementById('login-modal').classList.remove('hidden');
    }
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');
    
    errorMsg.innerText = "Signing in...";
    errorMsg.classList.remove('hidden');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('admin-modal').classList.remove('hidden');
        document.getElementById('login-form').reset();
        errorMsg.classList.add('hidden');
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Login failed: " + error.message;
    }
};

window.handleLogout = async () => {
    try {
        await signOut(auth);
        document.getElementById('admin-modal').classList.add('hidden');
        initAuth();
        alert("Logged out successfully.");
    } catch (error) {
        console.error(error);
    }
};

// --- Firebase Listeners ---
function getCollectionRef(colName) {
    return collection(db, 'artifacts', appId, 'public', 'data', colName);
}

function setupListeners() {
    if(window.listenersActive) return;
    window.listenersActive = true;

    const listen = (colName, callback) => {
        onSnapshot(getCollectionRef(colName), (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(data);
        }, (error) => console.error(`Error listening to ${colName}:`, error));
    };

    listen(COLLECTIONS.ANNOUNCEMENTS, (data) => {
        appData.announcements = data;
        renderCarousel('announcement', data);
        renderAdminList('announcements', data);
    });

    listen(COLLECTIONS.STUDENTS, (data) => {
        appData.students = data;
        renderCarousel('student', data);
        renderAdminList('students', data);
    });

    listen(COLLECTIONS.TEACHERS, (data) => {
        appData.teachers = data;
        renderCarousel('teacher', data);
        renderAdminList('teachers', data);
    });

    listen(COLLECTIONS.EVENTS, (data) => {
        appData.events = data;
        mergeAndRenderEvents();
        renderAdminList('events', data);
    });

    listen(COLLECTIONS.TICKER, (data) => {
        if (data.length > 0) {
            appData.ticker = data;
            const combinedText = data.map(item => item.text).join(' &nbsp; <span class="text-school-navy/50 mx-2">●</span> &nbsp; ');
            els.ticker.innerHTML = combinedText;
        } else {
             els.ticker.innerHTML = "Welcome to School Board";
        }
        renderAdminList('ticker', data);
    });

    listen(COLLECTIONS.SETTINGS, (data) => {
        if (data.length > 0) {
            appData.settings = data[0];
            appData.settingsId = data[0].id;
            updateUIConfig(data[0]);
        }
    });

    listen(COLLECTIONS.MEDIA, (data) => {
        appData.media = data;
        renderCarousel('media', data);
        renderAdminList('media', data);
    });
}

// --- Core Logic ---
function updateUIConfig(settings) {
    if(settings.schoolName) els.schoolName.innerHTML = settings.schoolName;
    if(settings.subtitle) els.schoolSubtitle.innerHTML = settings.subtitle;
    if(settings.subtitle2) els.schoolSubtitle2.innerHTML = settings.subtitle2;
    if(settings.logo) {
        document.getElementById('header-logo').src = settings.logo;
    }
    els.confName.value = settings.schoolName || "";
    els.confSubtitle.value = settings.subtitle || "";
    els.confSubtitle2.value = settings.subtitle2 || "";
    els.confLocation.value = settings.location || "";
    els.confCalendar.value = settings.googleCalendar || "";
    fetchWeather(settings.location);
    fetchCalendar(settings.googleCalendar);
}

// Carousel Logic
const carousels = {
    student: { index: 0, timer: null, interval: 8000 },
    teacher: { index: 0, timer: null, interval: 10000 },
    announcement: { index: 0, timer: null, interval: 12000 },
    media: { index: 0, timer: null, interval: 15000 }
};

function extractYouTubeID(url) {
    let videoId = '';
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) {
            if (u.searchParams.has('v')) videoId = u.searchParams.get('v');
            else if (u.pathname.includes('/shorts/')) videoId = u.pathname.split('/shorts/')[1];
            else if (u.pathname.includes('/embed/')) videoId = u.pathname.split('/embed/')[1];
        } else if (u.hostname.includes('youtu.be')) {
            videoId = u.pathname.slice(1);
        }
    } catch(e) {}
    return videoId ? videoId.split('?')[0].split('&')[0] : null;
}

function renderCarousel(type, data) {
    const container = els[`${type}Carousel`];
    const progressBar = els[`${type}Progress`];
    const config = carousels[type];

    if (config.timer) { clearTimeout(config.timer); clearInterval(config.timer); }
    if (type === 'media' && window.currentMediaPlayer) { try { window.currentMediaPlayer.destroy(); } catch(e){} window.currentMediaPlayer = null; }

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="w-full h-full flex items-center justify-center text-center text-gray-400">No content available</div>`;
        return;
    }
    if (config.index >= data.length) config.index = 0;

    const showSlide = () => {
        if (progressBar) { progressBar.style.transition = 'none'; progressBar.style.width = '0%'; }
        const item = data[config.index];
        container.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center opacity-0 transition-opacity duration-500 relative" id="${type}-slide-content"></div>`;
        const slide = document.getElementById(`${type}-slide-content`);
        
        const queueNext = (delay) => {
            if (progressBar) { setTimeout(() => { progressBar.style.transition = `width ${delay}ms linear`; progressBar.style.width = '100%'; }, 50); }
            config.timer = setTimeout(() => { config.index = (config.index + 1) % data.length; showSlide(); }, delay);
        };

        if (type === 'media' && item.type === 'youtube') {
            slide.classList.remove('opacity-0'); 
            let videoId = extractYouTubeID(item.content);
            if (videoId && ytApiReady) {
                const playerId = `yt-player-${Date.now()}`;
                slide.innerHTML = `<div id="${playerId}" style="width:100%; height:100%;"></div>`;
                
                // Safe origin check to avoid protocol errors
                const origin = window.location.protocol.startsWith('http') ? window.location.origin : undefined;

                window.currentMediaPlayer = new YT.Player(playerId, {
                    height: '100%', width: '100%', videoId: videoId,
                    playerVars: { 
                        'autoplay': 1, 
                        'controls': 0, 
                        'rel': 0, 
                        'showinfo': 0, 
                        'modestbranding': 1, 
                        'mute': 0, 
                        'origin': origin, // Only send origin if HTTP/HTTPS
                        'enablejsapi': 1 
                    },
                    events: {
                        'onReady': (event) => { event.target.playVideo(); },
                        'onStateChange': (event) => { if (event.data === 0) { config.index = (config.index + 1) % data.length; showSlide(); } },
                        'onError': (e) => { 
                            // Suppress console spam for restricted videos
                            console.warn("Skipping restricted/unavailable video."); 
                            slide.innerHTML = `<div class="flex items-center justify-center h-full text-white bg-black"><p>Video Unavailable</p></div>`; 
                            queueNext(3000); 
                        }
                    }
                });
                config.timer = setTimeout(() => { config.index = (config.index + 1) % data.length; showSlide(); }, 600000); 
            } else {
                slide.innerHTML = `<p class="text-red-500">Video Loading...</p>`;
                if (!ytApiReady) setTimeout(showSlide, 1000); else queueNext(5000);
            }
        } else if (type === 'media' && item.type === 'facebook') {
            slide.innerHTML = item.content.includes('<iframe') ? item.content : `<div class="flex items-center justify-center h-full text-red-500 font-bold">Invalid Embed Code</div>`;
            const fbFrame = slide.querySelector('iframe');
            if (fbFrame) { fbFrame.style.width = '100%'; fbFrame.style.height = '100%'; }
            setTimeout(() => slide.classList.remove('opacity-0'), 50);
            queueNext(config.interval);
        } else {
            // Standard content
            if (type === 'media' && item.type === 'image') {
                 slide.innerHTML = `<img src="${item.content}" class="w-full h-full object-cover">`;
            } else if (type === 'student') {
                slide.innerHTML = `
                    <div class="relative w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-school-gold overflow-hidden shadow-lg mb-4">
                        <img src="${item.image || 'https://placehold.co/200?text=Student'}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200?text=No+Img'">
                    </div>
                    <h3 class="text-2xl font-bold text-school-navy mb-1">${item.name}</h3>
                    <span class="bg-school-gold text-school-navy px-3 py-1 rounded-full text-sm font-bold mb-3">${item.focus || 'Student'}</span>
                    <p class="text-center text-gray-600 italic line-clamp-3 px-4">"${item.description}"</p>
                `;
            } else if (type === 'teacher') {
                slide.innerHTML = `
                    <div class="flex flex-row items-center space-x-6 w-full px-4">
                        <div class="w-1/3 flex justify-end">
                            <div class="w-32 h-32 rounded-full border-4 border-school-navy overflow-hidden shadow-lg">
                                <img src="${item.image || 'https://placehold.co/200?text=Staff'}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200?text=No+Img'">
                            </div>
                        </div>
                        <div class="w-2/3 text-left">
                            <h3 class="text-2xl font-bold text-gray-800">${item.name}</h3>
                            <div class="text-school-navy font-bold uppercase tracking-wide text-sm mb-2">${item.dept}</div>
                            <p class="text-gray-600 text-sm line-clamp-4 border-l-4 border-school-gold pl-3">${item.bio}</p>
                        </div>
                    </div>
                `;
            } else if (type === 'announcement') {
                const isImg = item.image && item.image.length > 50; 
                slide.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full w-full">
                        ${isImg ? 
                            `<img src="${item.image}" class="max-h-32 rounded-lg shadow-sm mb-4 object-contain">` : 
                            `<div class="mb-4 text-school-gold"><i class="fas fa-bullhorn fa-3x"></i></div>`
                        }
                        <h3 class="text-2xl md:text-3xl font-bold text-center text-school-navy mb-2 leading-tight">${item.title}</h3>
                        <div class="h-1 w-20 bg-school-gold mb-3"></div>
                        <p class="text-center text-gray-700 text-lg md:text-xl line-clamp-4 px-6">${item.description}</p>
                        ${item.urgent ? '<span class="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg uppercase animate-pulse">Urgent</span>' : ''}
                    </div>
                `;
            }
            setTimeout(() => slide.classList.remove('opacity-0'), 50);
            queueNext(config.interval);
        }
    };
    showSlide();
}

// --- Weather & Calendar ---
async function fetchWeather(location) {
     if (!location) return;
     try {
        const q = encodeURIComponent(location);
        let geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`);
        let geoData = await geoRes.json();
        if (!geoData.results && location.includes(',')) {
            const city = location.split(',')[0].trim();
            geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            geoData = await geoRes.json();
        }
        if (!geoData.results) { els.weatherCity.innerText = "Loc not found"; return; }
        const { latitude, longitude, name, admin1 } = geoData.results[0];
        els.weatherCity.innerText = `${name}, ${admin1 || ''}`;
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=fahrenheit`);
        const wData = await wRes.json();
        els.weatherTemp.innerText = Math.round(wData.current.temperature_2m) + "°F";
        els.weatherIcon.innerHTML = getWeatherIcon(wData.current.weather_code);
        let forecastHTML = '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for(let i=0; i<3; i++) {
            const date = new Date(wData.daily.time[i]);
            const dayName = i === 0 ? 'Today' : days[date.getDay()];
            const max = Math.round(wData.daily.temperature_2m_max[i]);
            const min = Math.round(wData.daily.temperature_2m_min[i]);
            const code = wData.daily.weather_code[i];
            forecastHTML += `<div class="flex flex-col items-center"><span class="font-bold text-gray-200">${dayName}</span><span class="text-lg my-1">${getWeatherIcon(code)}</span><span class="text-xs font-semibold">${max}°/${min}°</span></div>`;
        }
        els.weatherForecast.innerHTML = forecastHTML;
    } catch (e) { console.error("Weather error", e); els.weatherCity.innerText = "Weather Unavailable"; }
}

function getWeatherIcon(code) {
    if (code <= 1) return '<i class="fas fa-sun text-yellow-400"></i>';
    if (code <= 3) return '<i class="fas fa-cloud-sun text-gray-300"></i>';
    if (code <= 48) return '<i class="fas fa-smog text-gray-400"></i>';
    if (code <= 67) return '<i class="fas fa-cloud-rain text-blue-400"></i>';
    if (code <= 77) return '<i class="fas fa-snowflake text-white"></i>';
    if (code <= 82) return '<i class="fas fa-cloud-showers-heavy text-blue-500"></i>';
    if (code <= 99) return '<i class="fas fa-bolt text-yellow-500"></i>';
    return '<i class="fas fa-cloud"></i>';
}

async function fetchCalendar(url) {
    if (!url || !url.startsWith('http')) { appData.externalEvents = []; mergeAndRenderEvents(); return; }
    try {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Proxy error');
        const icsData = await res.text();
        appData.externalEvents = parseICS(icsData);
        mergeAndRenderEvents();
    } catch (e) {
        console.warn("Primary calendar proxy failed, trying fallback...", e);
        try {
             const res2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
             const data2 = await res2.json();
             if (data2.contents) { appData.externalEvents = parseICS(data2.contents); mergeAndRenderEvents(); }
        } catch (err2) { console.error("All calendar fetches failed", err2); }
    }
}

function parseICS(icsData) {
    const events = [];
    const lines = icsData.split(/\r\n|\n|\r/);
    let inEvent = false;
    let currentEvent = {};
    const parseICSDate = (val) => {
        if(!val) return null;
        const year = val.substring(0,4);
        const month = val.substring(4,6);
        const day = val.substring(6,8);
        return `${year}-${month}-${day}`;
    };
    for (let line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; currentEvent = {}; } 
        else if (line.startsWith('END:VEVENT')) {
            inEvent = false;
            if (currentEvent.start) {
                const evtDate = new Date(currentEvent.start);
                const today = new Date();
                today.setHours(0,0,0,0);
                if (evtDate >= today) events.push(currentEvent);
            }
        } else if (inEvent) {
            const parts = line.split(':');
            const key = parts[0].split(';')[0];
            const val = parts.slice(1).join(':');
            if (key === 'DTSTART') currentEvent.start = parseICSDate(val);
            if (key === 'SUMMARY') currentEvent.title = val;
            if (key === 'LOCATION') currentEvent.location = val.replace(/\\,/g, ',');
        }
    }
    return events;
}

function mergeAndRenderEvents() {
    const allEvents = [
        ...appData.events.map(e => ({ ...e, source: 'manual', dateObj: new Date(e.datetime) })),
        ...appData.externalEvents.map(e => ({ ...e, source: 'google', dateObj: new Date(e.start), datetime: e.start }))
    ];
    allEvents.sort((a, b) => a.dateObj - b.dateObj);
    const displayEvents = allEvents.slice(0, 10);
    if (displayEvents.length === 0) { els.eventsList.innerHTML = `<div class="text-center text-gray-500 mt-4">No upcoming events.</div>`; return; }
    els.eventsList.innerHTML = displayEvents.map(e => {
        const date = new Date(e.datetime); 
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        const isGoogle = e.source === 'google';
        const borderColor = isGoogle ? 'border-green-500' : 'border-school-gold';
        return `
        <div class="flex items-center bg-gray-50 p-3 rounded-lg border-l-4 ${borderColor} shadow-sm hover:bg-gray-100 transition-colors">
            <div class="flex-none w-12 h-12 bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center mr-3 shadow-sm">
                <span class="text-xs font-bold text-gray-500 uppercase">${month}</span>
                <span class="text-xl font-bold text-school-navy leading-none">${day}</span>
            </div>
            <div class="flex-grow min-w-0">
                <h4 class="font-bold text-gray-800 truncate">${e.title}</h4>
                <p class="text-xs text-gray-500 truncate"><i class="fas fa-map-marker-alt mr-1"></i> ${e.location || 'TBA'} ${isGoogle ? '(Google Cal)' : ''}</p>
            </div>
        </div>
        `;
    }).join('');
}

// --- Admin Interface ---
window.formatText = (identifier, tag) => {
    let textarea = document.querySelector(`textarea[name="${identifier}"]`);
    if (!textarea) textarea = document.getElementById(identifier);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + `<${tag}>` + text.substring(start, end) + `</${tag}>` + text.substring(end);
    textarea.focus();
};

window.toggleAdminModal = () => { document.getElementById('admin-modal').classList.toggle('hidden'); };

window.switchTab = (tabId) => {
    document.querySelectorAll('.admin-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(el => {
        el.classList.remove('bg-white', 'shadow-sm', 'border-l-4', 'border-school-navy', 'text-school-navy');
        el.classList.add('border-transparent');
    });
    document.getElementById(tabId).classList.remove('hidden');
    const btn = Array.from(document.querySelectorAll('.admin-tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if(btn) {
        btn.classList.add('bg-white', 'shadow-sm', 'border-l-4', 'border-school-navy', 'text-school-navy');
        btn.classList.remove('border-transparent');
    }
};

window.saveTicker = async () => { /* managed by list now */ };

window.saveConfig = async () => {
    showLoader();
    try {
        const logoFile = document.getElementById('conf-logo-file').files[0];
        let logoBase64 = appData.settings?.logo || "";
        if (logoFile) { try { logoBase64 = await convertBase64(logoFile); } catch (err) { console.error(err); } }
        const conf = {
            schoolName: els.confName.value,
            subtitle: els.confSubtitle.value,
            subtitle2: els.confSubtitle2.value,
            location: els.confLocation.value,
            googleCalendar: els.confCalendar.value,
            logo: logoBase64
        };
        if (appData.settingsId) await updateDoc(doc(getCollectionRef(COLLECTIONS.SETTINGS), appData.settingsId), conf);
        else await addDoc(getCollectionRef(COLLECTIONS.SETTINGS), conf);
    } catch(e) { console.error(e); }
    hideLoader();
};

function showLoader() { document.getElementById('global-loader').classList.remove('hidden'); }
function hideLoader() { document.getElementById('global-loader').classList.add('hidden'); }

function renderAdminList(type, data) {
    const container = els[`admin${type.charAt(0).toUpperCase() + type.slice(1)}`];
    if (!container) return;
    if (data.length === 0) { container.innerHTML = `<p class="text-gray-500 italic col-span-3">No items found.</p>`; return; }
    container.innerHTML = data.map(item => {
        let mainText = item.title || item.name || item.text;
        let subText = item.description || item.dept || item.datetime || '';
        let img = item.image;
        if (type === 'ticker') { const tmp = document.createElement("DIV"); tmp.innerHTML = mainText; mainText = tmp.textContent || tmp.innerText || ""; subText = "Ticker Message"; } 
        else if (type === 'media') { mainText = item.type.toUpperCase() + ' Media'; subText = item.content ? item.content.substring(0, 40) + '...' : 'No Content'; if (item.type === 'image') img = item.content; }
        return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-start group">
            <div class="flex items-start space-x-3 overflow-hidden">
                ${img ? `<img src="${img}" class="w-10 h-10 rounded-full object-cover border">` : ''}
                <div class="min-w-0"><h4 class="font-bold text-gray-800 truncate text-sm">${mainText}</h4><p class="text-xs text-gray-500 truncate">${subText || ''}</p></div>
            </div>
            <div class="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="editEntry('${type}', '${item.id}')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i></button>
                <button onclick="deleteEntry('${type}', '${item.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

let currentEditType = null;
let currentEditId = null;

window.openEntryModal = (type) => {
    currentEditType = type;
    currentEditId = null;
    document.getElementById('entry-modal-title').innerText = `Add ${type.charAt(0).toUpperCase() + type.slice(1, type.endsWith('s') ? -1 : undefined)}`; 
    document.getElementById('entry-form').reset();
    generateFormFields(type, null);
    document.getElementById('entry-modal').classList.remove('hidden');
};

window.editEntry = (type, id) => {
    currentEditType = type;
    currentEditId = id;
    const item = appData[type].find(i => i.id === id);
    if (!item) return;
    document.getElementById('entry-modal-title').innerText = `Edit ${type.charAt(0).toUpperCase() + type.slice(1, type.endsWith('s') ? -1 : undefined)}`;
    generateFormFields(type, item);
    document.getElementById('entry-modal').classList.remove('hidden');
};

window.closeEntryModal = () => { document.getElementById('entry-modal').classList.add('hidden'); };

window.deleteEntry = async (type, id) => {
    if(!confirm("Are you sure?")) return;
    showLoader();
    try { await deleteDoc(doc(getCollectionRef(type), id)); } catch(e) { console.error(e); }
    hideLoader();
};

window.handleEntrySubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    if (currentEditType === 'announcements') data.urgent = formData.get('urgent') === 'on';
    const fileInput = document.getElementById('form-image-file');
    if (fileInput && fileInput.files.length > 0) {
        try { data.image = await convertBase64(fileInput.files[0]); } catch(err) { console.error("Image error"); }
    } else if (!data.image && currentEditId) {
         const oldItem = appData[currentEditType].find(i => i.id === currentEditId);
         if(oldItem && oldItem.image) data.image = oldItem.image;
    }
    if (data.image && data.image.includes('drive.google.com')) {
        const idMatch = data.image.match(/[-\w]{25,}/);
        if(idMatch) data.image = `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
    }
    showLoader();
    try {
        if (currentEditId) await updateDoc(doc(getCollectionRef(currentEditType), currentEditId), data);
        else await addDoc(getCollectionRef(currentEditType), data);
        closeEntryModal();
    } catch(err) { console.error(err); alert("Error saving."); }
    hideLoader();
};

function generateFormFields(type, values) {
    const container = document.getElementById('entry-fields');
    let html = '';
    const v = values || {};
    const toolbar = (fieldName) => `
        <div class="space-x-1 flex items-center">
            <button type="button" onclick="formatText('${fieldName}', 'b')" class="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold" title="Bold">B</button>
            <button type="button" onclick="formatText('${fieldName}', 'i')" class="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs italic" title="Italic">I</button>
        </div>
    `;
    
    if (type === 'announcements') {
        html += `
            <div><label class="block text-sm font-bold mb-1">Title</label><input name="title" required value="${v.title || ''}" class="w-full p-2 border rounded"></div>
            <div><div class="flex justify-between items-center mb-1"><div class="flex items-center"><label class="block text-sm font-bold mr-2">Description</label></div>${toolbar('description')}</div><textarea name="description" required rows="3" class="w-full p-2 border rounded">${v.description || ''}</textarea></div>
            <div class="flex items-center mt-2"><input type="checkbox" name="urgent" ${v.urgent ? 'checked' : ''} class="h-4 w-4"><label class="ml-2 text-sm font-bold text-red-600">Mark as Urgent</label></div>
        `;
    } else if (type === 'students') {
        html += `
            <div><label class="block text-sm font-bold mb-1">Student Name</label><input name="name" required value="${v.name || ''}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm font-bold mb-1">Focus Area</label><input name="focus" placeholder="e.g. Science, Basketball" value="${v.focus || ''}" class="w-full p-2 border rounded"></div>
            <div><div class="flex justify-between items-center mb-1"><div class="flex items-center"><label class="block text-sm font-bold mr-2">Quote / Description</label></div>${toolbar('description')}</div><textarea name="description" required rows="3" class="w-full p-2 border rounded">${v.description || ''}</textarea></div>
        `;
    } else if (type === 'teachers') {
        html += `
            <div><label class="block text-sm font-bold mb-1">Name</label><input name="name" required value="${v.name || ''}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm font-bold mb-1">Department</label><select name="dept" class="w-full p-2 border rounded">${DEPARTMENTS.map(d => `<option value="${d}" ${v.dept === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div><div class="flex justify-between items-center mb-1"><div class="flex items-center"><label class="block text-sm font-bold mr-2">Bio</label></div>${toolbar('bio')}</div><textarea name="bio" required rows="3" class="w-full p-2 border rounded">${v.bio || ''}</textarea></div>
        `;
    } else if (type === 'events') {
        html += `
            <div><label class="block text-sm font-bold mb-1">Event Title</label><input name="title" required value="${v.title || ''}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm font-bold mb-1">Date</label><input type="date" name="datetime" required value="${v.datetime || ''}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm font-bold mb-1">Location</label><input name="location" value="${v.location || ''}" class="w-full p-2 border rounded"></div>
        `;
    } else if (type === 'ticker') {
        html += `<div><div class="flex justify-between items-center mb-1"><div class="flex items-center"><label class="block text-sm font-bold mr-2">Message</label></div></div><textarea name="text" required rows="3" class="w-full p-2 border rounded">${v.text || ''}</textarea></div>`;
    } else if (type === 'media') {
        html += `
            <div><label class="block text-sm font-bold mb-1">Media Type</label><select name="type" class="w-full p-2 border rounded">
                <option value="youtube" ${v.type === 'youtube' ? 'selected' : ''}>YouTube Video</option>
                <option value="facebook" ${v.type === 'facebook' ? 'selected' : ''}>Facebook Embed Code</option>
                <option value="image" ${v.type === 'image' ? 'selected' : ''}>Image URL</option>
            </select></div>
            <div><label class="block text-sm font-bold mb-1">Content (URL or Code)</label><textarea name="content" required rows="3" class="w-full p-2 border rounded font-mono text-xs" placeholder="Paste URL or Code here...">${v.content || ''}</textarea></div>
        `;
    }
    if (type !== 'events' && type !== 'ticker' && type !== 'media') {
        html += `
            <div class="border-t pt-4 mt-2">
                <label class="block text-sm font-bold mb-1">Image (URL or Upload)</label>
                <input name="image" placeholder="https://..." value="${v.image && v.image.startsWith('http') ? v.image : ''}" class="w-full p-2 border rounded mb-2 text-sm">
                <input type="file" id="form-image-file" accept="image/*" class="text-sm">
                <p class="text-xs text-gray-500 mt-1">Upload converts to Base64 (Max 1MB). URLs preferred.</p>
            </div>
        `;
    }
    container.innerHTML = html;
}

const convertBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = (error) => reject(error);
    });
};
