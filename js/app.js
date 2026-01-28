import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, appId, COLLECTIONS, els, appData } from './config.js';
import { initCircuitAnimation, startClock, startWeatherAutoUpdate, initTheme, particlesRef } from './components/visual.js';
import { renderCarousel, mergeAndRenderEvents, renderBottomTicker, renderAdminList } from './components/render.js';
import { updateUIConfig } from './components/admin.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global currentUser
let currentUser = null;

// Export fetchLiveNews to be used in other modules
export async function fetchLiveNews() {
    const apiKey = appData.settings?.finnhubApiKey || "d5t4u39r01qt62nh9is0d5t4u39r01qt62nh9isg";
    let marketData = [];
    if (apiKey) {
        try {
            const syms = [
                { s: 'SPY', n: 'S&P 500', t: 'Market Index' }, { s: 'DIA', n: 'DOW', t: 'Market Index' }, { s: 'QQQ', n: 'NASDAQ', t: 'Market Index' },
                { s: 'AAPL', n: 'Apple', t: 'Stock' }, { s: 'MSFT', n: 'Microsoft', t: 'Stock' }, { s: 'NVDA', n: 'Nvidia', t: 'Stock' },
                { s: 'GOOGL', n: 'Google', t: 'Stock' }, { s: 'AMZN', n: 'Amazon', t: 'Stock' },
                { s: 'BINANCE:BTCUSDT', n: 'BTC', t: 'Crypto' }, { s: 'BINANCE:ETHUSDT', n: 'ETH', t: 'Crypto' },
                { s: 'BINANCE:SOLUSDT', n: 'SOL', t: 'Crypto' }, { s: 'BINANCE:BNBUSDT', n: 'BNB', t: 'Crypto' }, { s: 'BINANCE:XRPUSDT', n: 'XRP', t: 'Crypto' }
            ];
            for (const obj of syms) {
                const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${obj.s}&token=${apiKey}`);
                const d = await res.json();
                if (d.c) {
                    const change = d.dp >= 0 ? `▲ +${d.dp.toFixed(2)}%` : `▼ ${d.dp.toFixed(2)}%`;
                    marketData.push({ title: `${obj.n}: ${d.c.toFixed(2)} ${change}`, source: obj.t });
                }
            }
        } catch (e) { console.error(e); }
    }
    const feeds = [
        { u: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', t: 'Stock Market' },
        { u: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', t: 'Business' },
        { u: 'http://feeds.feedburner.com/EducationWeek', t: 'Education' },
        { u: 'https://news.google.com/rss/search?q=Navajo+Nation&hl=en-US&gl=US&ceid=US:en', t: 'Navajo Nation' }
    ];
    let allItems = [];
    for (const f of feeds) {
        try {
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.u)}`);
            const data = await res.json();
            if (data.status === 'ok') allItems.push(...data.items.slice(0, 3).map(i => ({ title: i.title, source: f.t })));
        } catch (e) { }
    }
    allItems.sort(() => Math.random() - 0.5);
    appData.liveNews = [...marketData, ...allItems];
    renderBottomTicker();
}

function setupListeners() {
    const getCollectionRef = (c) => collection(db, 'artifacts', appId, 'public', 'data', c);
    window.getCollectionRef = getCollectionRef;
    const listen = (c, cb) => onSnapshot(getCollectionRef(c), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    listen(COLLECTIONS.ANNOUNCEMENTS, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); appData.announcements = d; renderCarousel('announcement', d.filter(i => !i.hidden)); renderAdminList('announcements', d); });
    listen(COLLECTIONS.STUDENTS, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); appData.students = d; renderCarousel('student', d.filter(i => !i.hidden)); renderAdminList('students', d); });
    listen(COLLECTIONS.TEACHERS, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); appData.teachers = d; renderCarousel('teacher', d.filter(i => !i.hidden)); renderAdminList('teachers', d); });
    listen(COLLECTIONS.EVENTS, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); appData.events = d; mergeAndRenderEvents(); renderAdminList('events', d); });
    listen(COLLECTIONS.TICKER, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); const v = d.filter(i => !i.hidden); els.ticker.innerHTML = v.length ? v.map(i => i.text).join(' &nbsp; <span class="text-school-navy/50 mx-2">●</span> &nbsp; ') : "Welcome to School Board"; renderAdminList('ticker', d); });
    listen(COLLECTIONS.NEWS, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); appData.news = d; renderBottomTicker(); renderAdminList('news', d); });
    listen(COLLECTIONS.MEDIA, d => { d.sort((a, b) => (a.order || 0) - (b.order || 0)); appData.media = d; renderCarousel('media', d.filter(i => !i.hidden)); renderAdminList('media', d); });
    listen(COLLECTIONS.SETTINGS, d => {
        if (d.length) { appData.settings = d[0]; appData.settingsId = d[0].id; updateUIConfig(d[0]); startWeatherAutoUpdate(d[0].location); fetchLiveNews(); }
        else if (currentUser) addDoc(getCollectionRef(COLLECTIONS.SETTINGS), { schoolName: "Navajo Pine HS", subtitle: "School of Technology", location: "Navajo, NM" });
    });
}

// Global functions extending window
window.checkTutorial = function () {
    if (!localStorage.getItem('tutorial_seen')) document.getElementById('tutorial-modal').classList.remove('hidden');
}
window.closeTutorial = () => {
    document.getElementById('tutorial-modal').classList.add('hidden');
    localStorage.setItem('tutorial_seen', 'true');
};
window.openTutorial = () => document.getElementById('tutorial-modal').classList.remove('hidden');

window.toggleTheme = () => {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    html.classList.toggle('dark');
    if (html.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
        icon.classList.replace('fa-sun', 'fa-moon');
    } else {
        localStorage.setItem('theme', 'light');
        icon.classList.replace('fa-moon', 'fa-sun');
    }
    if (particlesRef) particlesRef();
};

async function initAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        window.checkTutorial();
        initCircuitAnimation();
        initTheme();
    } catch (e) {
        console.error("Auth failed", e);
    }
}

initAuth();
startClock();

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        setupListeners();
        fetchLiveNews();
        setInterval(() => fetchLiveNews(), 3600000);
    }
});
