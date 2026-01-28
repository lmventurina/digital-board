// Firebase Configuration
export let firebaseConfig;
if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
} else {
    firebaseConfig = {
        apiKey: "AIzaSyAtawxqfPOZqKJZcClKBVXSClC3IsIuDtM",
        authDomain: "digital-bulletin-board-6c660.firebaseapp.com",
        projectId: "digital-bulletin-board-6c660",
        storageBucket: "digital-bulletin-board-6c660.firebasestorage.app",
        messagingSenderId: "1051324595132",
        appId: "1:1051324595132:web:bb95ce7acc65d9e80d49b9",
        measurementId: "G-6VW2SKC09Z"
    };
}

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'navajo-pine-hs-v2';

export const DEPARTMENTS = ["General", "Admin", "History", "Navajo Language", "Math", "ELA", "Science", "Tech", "Special Ed", "PE", "Health", "Welding", "Sports", "Music", "Art"];

export const COLLECTIONS = { 
    ANNOUNCEMENTS: 'announcements', 
    STUDENTS: 'students', 
    TEACHERS: 'teachers', 
    EVENTS: 'events', 
    TICKER: 'ticker', 
    SETTINGS: 'settings', 
    MEDIA: 'media', 
    NEWS: 'news' 
};

// Carousel Configuration
export const carousels = {
    student: { index: 0, timer: null, interval: 8000 },
    teacher: { index: 0, timer: null, interval: 10000 },
    announcement: { index: 0, timer: null, interval: 12000 },
    media: { index: 0, timer: null, interval: 15000 }
};

// UI Elements Reference
export const els = {
    schoolName: document.getElementById('header-school-name'),
    schoolSubtitle: document.getElementById('header-subtitle'),
    schoolSubtitle2: document.getElementById('header-subtitle-2'),
    liveTime: document.getElementById('live-time'),
    liveDate: document.getElementById('live-date'),
    ticker: document.getElementById('ticker-content'),
    bottomTicker: document.getElementById('bottom-ticker-content'),
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
    adminNews: document.getElementById('admin-news-list'),
    adminMedia: document.getElementById('admin-media-list'),
    confName: document.getElementById('conf-name'),
    confSubtitle: document.getElementById('conf-subtitle'),
    confSubtitle2: document.getElementById('conf-subtitle-2'),
    confLocation: document.getElementById('conf-location'),
    confCalendar: document.getElementById('conf-calendar')
};

// Global App Data State
export const appData = { 
    announcements: [], 
    students: [], 
    teachers: [], 
    events: [], 
    externalEvents: [], 
    ticker: "", 
    settings: {}, 
    media: [], 
    news: [], 
    liveNews: [] 
};
