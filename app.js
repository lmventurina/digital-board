// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

// Data Root Path
const APP_ID = "digital-bulletin-board-6c660"; // Matching your Project ID for clarity
const DATA_ROOT = `artifacts/${APP_ID}/public/data`;

// --- State Management ---
const carousels = {
    students: { id: 'student-carousel', interval: null, duration: 10000, data: [] },
    teachers: { id: 'teacher-carousel', interval: null, duration: 12000, data: [] },
    announcements: { id: 'announcement-carousel', interval: null, duration: 10000, data: [] },
    media: { id: 'media-carousel', interval: null, duration: 10000, data: [], currentIndex: 0, isVideoPlaying: false }
};

let player; // YouTube Player Instance

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    setupListeners();
    loadYouTubeAPI();
    
    // Check for Auth to determine button behavior
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Admin logged in:", user.email);
        }
    });
});

// --- YouTube API Logic ---
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Global callback for YouTube API
window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube API Ready");
};

// --- Core Logic: Rendering & Data ---

function setupListeners() {
    // 1. Settings (Header, Config)
    onSnapshot(doc(db, `${DATA_ROOT}/settings`), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            document.getElementById('school-name').textContent = data.schoolName || "Welcome";
            document.getElementById('sub-1').textContent = data.subtitle || "Loading Info...";
            document.getElementById('sub-2').textContent = data.subtitle2 || "Home of the Tech Warriors (Tó éí Tech Naalʼánígíí Kéyah)";
            
            // Only update logo if a URL is actually present
            if (data.logo && data.logo.length > 10) {
                document.getElementById('school-logo').src = data.logo;
            }
            
            if (data.location) fetchWeather(data.location);
        } else {
            // Create default settings if they don't exist yet
            console.log("Initializing Settings...");
        }
    });

    // 2. Ticker
    onSnapshot(doc(db, `${DATA_ROOT}/ticker`), (doc) => {
        if (doc.exists()) {
            const span = document.querySelector('#ticker-content span');
            span.textContent = doc.data().text || "Welcome to our digital bulletin board!";
        }
    });

    // 3. Events (Firestore)
    onSnapshot(collection(db, `${DATA_ROOT}/events`), (snapshot) => {
        const container = document.getElementById('events-list');
        container.innerHTML = '';
        
        let events = [];
        snapshot.forEach(doc => events.push({ ...doc.data(), id: doc.id }));
        
        // Sort by datetime
        events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        events.forEach(event => {
            const dateObj = new Date(event.datetime);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            const el = document.createElement('div');
            el.className = "p-3 border-l-4 border-gold bg-white shadow-sm rounded-r-lg hover:bg-gray-50 transition";
            el.innerHTML = `
                <div class="text-navy font-bold text-sm">${dateStr} <span class="text-gray-400 font-normal">| ${timeStr}</span></div>
                <div class="font-semibold text-gray-800">${event.title}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="fa-solid fa-location-dot"></i> ${event.location || 'Campus'}</div>
            `;
            container.appendChild(el);
        });
    });

    // 4. Carousels
    setupCarousel('students', renderGenericCard);
    setupCarousel('teachers', renderGenericCard);
    setupCarousel('announcements', renderGenericCard);

    // 5. Media Feed
    onSnapshot(collection(db, `${DATA_ROOT}/media`), (snapshot) => {
        const items = [];
        snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
        carousels.media.data = items;
        renderMediaFeed();
    });
}

// 4. Standard Carousels (Students, Teachers, Announcements)
const setupCarousel = (key, renderFunc) => {
    onSnapshot(collection(db, `${DATA_ROOT}/${key}`), (snapshot) => {
        const items = [];
        snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
        carousels[key].data = items;
        renderFunc(carousels[key].id, items, key);
        startCarouselRotation(key);
    });
};

// Render Functions
function renderGenericCard(containerId, items, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400">No ${type} added</div>`;
        return;
    }
    
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `slide ${index === 0 ? 'active' : ''}`;
        
        // Background Image logic
        let bg = '';
        let hasBg = false;
        // Use placeholder if image is missing but required
        if (item.image && item.image.length > 5) {
            bg = `<img src="${item.image}" class="slide-bg-image" alt="bg">`;
            hasBg = true;
        }

        let content = '';
        if (type === 'students') {
            content = `
                <div class="slide-content z-10 ${hasBg ? 'slide-text-overlay' : ''}">
                    <h3 class="text-3xl font-bold mb-2 text-navy ${hasBg ? 'text-white drop-shadow-md' : ''}">${item.name}</h3>
                    <p class="text-gold font-bold uppercase tracking-widest text-lg mb-4 bg-navy px-3 py-1 inline-block rounded-full shadow">${item.focus || 'Student'}</p>
                    <p class="text-base line-clamp-4 ${hasBg ? 'text-white' : 'text-gray-600'}">${item.description || ''}</p>
                </div>`;
        } else if (type === 'teachers') {
            content = `
                <div class="slide-content z-10">
                    <div class="w-32 h-32 rounded-full border-4 border-gold overflow-hidden mb-4 mx-auto shadow-lg">
                        <img src="${item.image || 'https://placehold.co/150x150?text=Staff'}" class="w-full h-full object-cover">
                    </div>
                    <h3 class="text-2xl font-bold text-navy">${item.name}</h3>
                    <p class="text-base font-semibold text-gray-600 mb-2">${item.dept || ''}</p>
                    <p class="text-sm italic text-gray-500 max-w-[80%]">"${item.bio || ''}"</p>
                </div>`;
        } else if (type === 'announcements') {
            // Apply urgent styling
            if (item.urgent) div.classList.add('bg-red-50');
            
            content = `
                <div class="slide-content z-10">
                     ${item.urgent ? '<div class="animate-pulse"><i class="fa-solid fa-circle-exclamation text-5xl text-red-600 mb-4"></i></div>' : ''}
                    <h3 class="text-2xl font-bold text-navy mb-3 uppercase tracking-tight">${item.title}</h3>
                    <p class="text-lg text-gray-800 leading-relaxed">${item.description}</p>
                </div>`;
        }

        div.innerHTML = `${bg}${content}<div class="progress-bar-container"><div class="progress-bar"></div></div>`;
        container.appendChild(div);
    });
}

// 5. Media Feed Logic
function renderMediaFeed() {
    const container = document.getElementById('media-carousel');
    // If no items, show placeholder
    if (carousels.media.data.length === 0) {
        container.innerHTML = '<div class="text-white flex flex-col items-center justify-center h-full"><i class="fa-solid fa-photo-film text-4xl mb-2"></i><p>No Media</p></div>';
        return;
    }
    showMediaSlide(0);
}

function showMediaSlide(index) {
    const items = carousels.media.data;
    if (items.length === 0) return;
    
    // Wrap index
    const i = index % items.length;
    carousels.media.currentIndex = i;
    const item = items[i];
    const container = document.getElementById('media-carousel');
    container.innerHTML = ''; // Clear previous

    if (item.type === 'youtube') {
        // Create div for player
        const vidDiv = document.createElement('div');
        vidDiv.id = 'yt-player';
        vidDiv.className = "w-full h-full";
        container.appendChild(vidDiv);

        // Extract ID (handles standard links and youtu.be links)
        let videoId = item.content;
        if (item.content.includes('v=')) {
            videoId = item.content.split('v=')[1]?.split('&')[0];
        } else if (item.content.includes('youtu.be/')) {
            videoId = item.content.split('youtu.be/')[1];
        }

        player = new YT.Player('yt-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'controls': 0, 'mute': 1, 'loop': 0, 'rel': 0 }, // Muted for autoplay policy compliance usually
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
        carousels.media.isVideoPlaying = true;
    } else {
        // Image
        carousels.media.isVideoPlaying = false;
        const img = document.createElement('img');
        img.src = item.content;
        img.className = "w-full h-full object-cover animate-fade-in";
        container.appendChild(img);
        
        // Manual rotation for images
        setTimeout(() => {
            // Check if we are still on the image slide (user didn't manually intervene, though no controls exist here)
            // And ensure we aren't somehow playing a video now.
            if(!carousels.media.isVideoPlaying) showMediaSlide(i + 1);
        }, 10000);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        carousels.media.isVideoPlaying = false;
        showMediaSlide(carousels.media.currentIndex + 1);
    }
    // Handle errors (skip video)
    if(event.data === -1) { /* unstarted */ }
}

// --- Rotation Logic ---
function startCarouselRotation(key) {
    if (carousels[key].interval) clearInterval(carousels[key].interval);
    
    const container = document.getElementById(carousels[key].id);
    let index = 0;
    
    carousels[key].interval = setInterval(() => {
        const slides = container.querySelectorAll('.slide');
        if (slides.length < 2) return;
        
        slides[index].classList.remove('active');
        index = (index + 1) % slides.length;
        slides[index].classList.add('active');
    }, carousels[key].duration);
}

// --- Utilities ---
async function fetchWeather(location) {
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=1`);
        const geoData = await geoRes.json();
        
        if(!geoData.results) {
            document.querySelector('#weather span').textContent = "Locating...";
            return;
        }
        
        const { latitude, longitude } = geoData.results[0];
        
        // Fetch Fahrenheit for US context
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherData = await weatherRes.json();
        
        const temp = Math.round(weatherData.current_weather.temperature);
        document.querySelector('#weather span').textContent = `${temp}°F ${location}`;
    } catch (e) {
        console.error("Weather Error", e);
    }
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

// --- ADMIN & SECURITY ---

// Selectors
const adminBtn = document.getElementById('admin-btn');
const loginModal = document.getElementById('login-modal');
const adminPanel = document.getElementById('admin-panel');
const closeBtns = document.querySelectorAll('.modal-close');

// Toggle UI
adminBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        openAdminPanel();
    } else {
        loginModal.classList.remove('hidden');
    }
});

closeBtns.forEach(btn => btn.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    adminPanel.classList.add('hidden');
}));

// Login Logic
document.getElementById('login-submit').addEventListener('click', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p)
        .then(() => {
            loginModal.classList.add('hidden');
            openAdminPanel();
        })
        .catch(err => alert("Login Failed: " + err.message));
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        adminPanel.classList.add('hidden');
        alert("Logged out");
    });
});

// Admin Panel Logic
function openAdminPanel() {
    adminPanel.classList.remove('hidden');
    loadAdminTab('config'); // Load default
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // UI Update
        document.querySelectorAll('.admin-tab-btn').forEach(b => {
            b.classList.remove('bg-navy', 'text-white');
            b.classList.add('hover:bg-gray-200', 'text-gray-700');
        });
        e.target.classList.remove('hover:bg-gray-200', 'text-gray-700');
        e.target.classList.add('bg-navy', 'text-white');
        
        loadAdminTab(e.target.dataset.tab);
    });
});

// Admin Content Renderer
function loadAdminTab(tabName) {
    const content = document.getElementById('admin-content');
    content.innerHTML = `<h2 class="text-2xl font-bold mb-4 capitalize text-navy">${tabName} Manager</h2>`;

    if(tabName === 'config') {
        renderConfigForm(content);
        return;
    }
    
    // Form Container
    const formDiv = document.createElement('div');
    formDiv.className = "bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200";
    formDiv.innerHTML = getFormFields(tabName);
    
    const addBtn = document.createElement('button');
    addBtn.className = "mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition";
    addBtn.textContent = `Add to ${tabName}`;
    addBtn.onclick = () => saveItem(tabName);
    formDiv.appendChild(addBtn);
    
    // List Container
    const listDiv = document.createElement('div');
    listDiv.className = "grid grid-cols-1 gap-4";
    
    content.appendChild(formDiv);
    content.appendChild(listDiv);

    // Fetch existing
    getFirestoreDataForAdmin(tabName, listDiv);
}

function getFormFields(tab) {
    if(tab === 'announcements') return `
        <div class="grid grid-cols-1 gap-3">
            <input id="inp-title" placeholder="Announcement Title" class="border p-3 rounded w-full">
            <textarea id="inp-desc" placeholder="Details..." class="border p-3 rounded w-full h-24"></textarea>
            <div class="flex items-center space-x-2">
                <input type="checkbox" id="inp-urgent" class="w-5 h-5">
                <label for="inp-urgent" class="font-bold text-red-600">Urgent / Red Alert?</label>
            </div>
            <input id="inp-image" placeholder="Image URL (Optional)" class="border p-3 rounded w-full">
        </div>`;
        
    if(tab === 'students') return `
        <div class="grid grid-cols-1 gap-3">
            <input id="inp-name" placeholder="Student Name" class="border p-3 rounded w-full">
            <input id="inp-focus" placeholder="Achievement / Grade (e.g. 'Class of 2026')" class="border p-3 rounded w-full">
            <textarea id="inp-desc" placeholder="Description of achievement..." class="border p-3 rounded w-full h-24"></textarea>
            <input id="inp-image" placeholder="Photo URL (Optional)" class="border p-3 rounded w-full">
        </div>`;
        
    if(tab === 'teachers') return `
        <div class="grid grid-cols-1 gap-3">
            <input id="inp-name" placeholder="Teacher Name" class="border p-3 rounded w-full">
            <input id="inp-dept" placeholder="Department (e.g. 'Science')" class="border p-3 rounded w-full">
            <textarea id="inp-bio" placeholder="Short Bio / Quote..." class="border p-3 rounded w-full h-24"></textarea>
            <input id="inp-image" placeholder="Photo URL" class="border p-3 rounded w-full">
        </div>`;
        
    if(tab === 'media') return `
        <div class="grid grid-cols-1 gap-3">
            <select id="inp-type" class="border p-3 rounded w-full bg-white">
                <option value="youtube">YouTube Video</option>
                <option value="image">Image Display</option>
            </select>
            <input id="inp-content" placeholder="Paste YouTube Link or Image URL here" class="border p-3 rounded w-full">
        </div>`;
        
    if(tab === 'events') return `
        <div class="grid grid-cols-1 gap-3">
            <input id="inp-title" placeholder="Event Title" class="border p-3 rounded w-full">
            <input type="datetime-local" id="inp-datetime" class="border p-3 rounded w-full">
            <input id="inp-loc" placeholder="Location (e.g. Gym)" class="border p-3 rounded w-full">
        </div>`;
        
    if(tab === 'ticker') return `<input id="inp-text" placeholder="Scrolling Text" class="border p-3 rounded w-full">`;

    return `<p>Configuration error.</p>`;
}

async function saveItem(collectionName) {
    const data = {};
    
    // Ticker special case (single doc usually, but we'll treat as list for now or just update the main one)
    if(collectionName === 'ticker') {
        const text = document.getElementById('inp-text').value;
        await setDoc(doc(db, `${DATA_ROOT}/ticker`), { text: text });
        alert("Ticker Updated!");
        return;
    }

    // Harvesting IDs
    const titleEl = document.getElementById('inp-title');
    const nameEl = document.getElementById('inp-name');
    const descEl = document.getElementById('inp-desc');
    const urgentEl = document.getElementById('inp-urgent');
    const focusEl = document.getElementById('inp-focus');
    const typeEl = document.getElementById('inp-type');
    const contentEl = document.getElementById('inp-content');
    const deptEl = document.getElementById('inp-dept');
    const bioEl = document.getElementById('inp-bio');
    const imgEl = document.getElementById('inp-image');
    const dateEl = document.getElementById('inp-datetime');
    const locEl = document.getElementById('inp-loc');

    if(titleEl) data.title = titleEl.value;
    if(nameEl) data.name = nameEl.value;
    if(descEl) data.description = descEl.value;
    if(urgentEl) data.urgent = urgentEl.checked;
    if(focusEl) data.focus = focusEl.value;
    if(typeEl) data.type = typeEl.value;
    if(contentEl) data.content = contentEl.value;
    if(deptEl) data.dept = deptEl.value;
    if(bioEl) data.bio = bioEl.value;
    if(imgEl) data.image = imgEl.value;
    if(dateEl) data.datetime = dateEl.value;
    if(locEl) data.location = locEl.value;

    try {
        await addDoc(collection(db, `${DATA_ROOT}/${collectionName}`), data);
        loadAdminTab(collectionName); // Refresh UI
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Error saving: " + error.message);
    }
}

function getFirestoreDataForAdmin(colName, container) {
    if(colName === 'ticker') return; // Handled separately in config usually
    
    onSnapshot(collection(db, `${DATA_ROOT}/${colName}`), (snapshot) => {
        container.innerHTML = '';
        if(snapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 italic">No items found.</p>';
            return;
        }
        
        snapshot.forEach(d => {
            const item = d.data();
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border-l-4 border-navy";
            
            let label = item.title || item.name || item.content || 'Item';
            if (item.datetime) label += ` (${new Date(item.datetime).toLocaleDateString()})`;
            
            div.innerHTML = `
                <span class="font-semibold text-gray-700 truncate max-w-[70%]">${label}</span> 
                <button id="del-${d.id}" class="text-red-500 hover:text-red-700 font-bold px-3 py-1 rounded hover:bg-red-50 transition">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>`;
            
            container.appendChild(div);
            
            // Bind delete event
            document.getElementById(`del-${d.id}`).addEventListener('click', () => {
                if(confirm("Are you sure you want to delete this?")) {
                    deleteDoc(doc(db, `${DATA_ROOT}/${colName}`, d.id));
                }
            });
        });
    });
}

function renderConfigForm(container) {
    container.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md border-t-4 border-gold">
            <h3 class="text-lg font-bold mb-4">General Settings</h3>
            
            <label class="block text-sm font-bold mb-1">School Name</label>
            <input id="cfg-name" class="border p-2 w-full mb-4 rounded" placeholder="e.g. Central High School">
            
            <label class="block text-sm font-bold mb-1">Subtitle 1</label>
            <input id="cfg-sub1" class="border p-2 w-full mb-4 rounded" placeholder="e.g. Home of the...">
            
            <label class="block text-sm font-bold mb-1">Subtitle 2</label>
            <input id="cfg-sub2" class="border p-2 w-full mb-4 rounded" value="Home of the Tech Warriors (Tó éí Tech Naalʼánígíí Kéyah)">
            
            <label class="block text-sm font-bold mb-1">Location (City, ST)</label>
            <input id="cfg-loc" class="border p-2 w-full mb-4 rounded" placeholder="e.g. Gallup, NM">
            
            <label class="block text-sm font-bold mb-1">Logo URL</label>
            <input id="cfg-logo" class="border p-2 w-full mb-4 rounded" placeholder="https://...">

            <button id="save-cfg" class="bg-navy hover:bg-blue-900 text-white px-6 py-2 rounded shadow font-bold transition">Save Configuration</button>
        </div>
    `;
    
    // Load current values
    getFirestoreDataForConfig();
    
    document.getElementById('save-cfg').addEventListener('click', () => {
        setDoc(doc(db, `${DATA_ROOT}/settings`), {
            schoolName: document.getElementById('cfg-name').value,
            subtitle: document.getElementById('cfg-sub1').value,
            subtitle2: document.getElementById('cfg-sub2').value,
            location: document.getElementById('cfg-loc').value,
            logo: document.getElementById('cfg-logo').value
        }, { merge: true });
        alert("Configuration Saved!");
    });
}

function getFirestoreDataForConfig() {
    onSnapshot(doc(db, `${DATA_ROOT}/settings`), (doc) => {
        if (doc.exists()) {
            const d = doc.data();
            if(document.getElementById('cfg-name')) {
                document.getElementById('cfg-name').value = d.schoolName || '';
                document.getElementById('cfg-sub1').value = d.subtitle || '';
                document.getElementById('cfg-sub2').value = d.subtitle2 || '';
                document.getElementById('cfg-loc').value = d.location || '';
                document.getElementById('cfg-logo').value = d.logo || '';
            }
        }
    });
}
