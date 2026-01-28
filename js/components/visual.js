import { els, appData } from '../config.js';
import { mergeAndRenderEvents } from './render.js';

export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && true);
    if (isDark) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-icon').classList.replace('fa-sun', 'fa-moon');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
    }
}

export let particlesRef = null;

export function initCircuitAnimation() {
    const canvas = document.getElementById('circuit-bg'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, particles = [];

    const initParticles = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        particles = [];
        const isDark = document.documentElement.classList.contains('dark');
        const c1 = isDark ? 'rgba(6, 182, 212, 0.5)' : 'rgba(0, 56, 147, 0.5)';
        const c2 = isDark ? 'rgba(250, 204, 21, 0.5)' : 'rgba(37, 99, 235, 0.5)';

        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.floor(Math.random() * width / 30) * 30, y: Math.floor(Math.random() * height / 30) * 30,
                history: [], maxLength: 10 + Math.random() * 20, step: 0, dir: Math.floor(Math.random() * 4),
                color: Math.random() > 0.5 ? c1 : c2
            });
        }
    };

    particlesRef = initParticles;
    window.addEventListener('resize', initParticles);
    initParticles();

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.step += 2;
            if (p.step >= 30) {
                p.step = 0; p.history.push({ x: p.x, y: p.y });
                if (p.history.length > p.maxLength) p.history.shift();
                if (p.dir === 0) p.x += 30; else if (p.dir === 1) p.y += 30; else if (p.dir === 2) p.x -= 30; else p.y -= 30;
                if (Math.random() < 0.2 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                    p.dir = Math.floor(Math.random() * 4);
                    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) { p.x = Math.floor(Math.random() * width / 30) * 30; p.y = Math.floor(Math.random() * height / 30) * 30; p.history = []; }
                }
            }
            if (p.history.length < 2) return;
            ctx.beginPath(); ctx.strokeStyle = p.color; ctx.lineWidth = 2;
            for (let i = 0; i < p.history.length - 1; i++) { ctx.moveTo(p.history[i].x, p.history[i].y); ctx.lineTo(p.history[i + 1].x, p.history[i + 1].y); }
            let lx = p.history[p.history.length - 1].x, ly = p.history[p.history.length - 1].y;
            if (p.dir === 0) lx += p.step; else if (p.dir === 1) ly += p.step; else if (p.dir === 2) lx -= p.step; else ly -= p.step;
            ctx.lineTo(lx, ly); ctx.stroke();
            ctx.fillStyle = p.color.replace('0.5', '1'); ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

let lastDateString = "";

export function startClock() {
    const update = () => {
        const now = new Date();
        els.liveTime.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        els.liveDate.innerText = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        if (lastDateString !== "" && els.liveDate.innerText !== lastDateString) {
            if (appData.settings?.location) fetchWeather(appData.settings.location);
        }
        lastDateString = els.liveDate.innerText;
    };
    update(); setInterval(update, 1000);
}

export async function fetchWeather(location) {
    if (!location) { if (els.weatherCity) els.weatherCity.innerText = "NO LOCATION"; return; }
    if (els.weatherCity) els.weatherCity.innerText = location;
    let lat = 35.8973, lon = -109.0289;
    const loc = location.toLowerCase();
    if (loc.includes('gallup')) { lat = 35.5281; lon = -108.7426; }
    if (loc.includes('window rock')) { lat = 35.6731; lon = -109.0556; }
    if (loc.includes('albuquerque')) { lat = 35.0844; lon = -106.6504; }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto`;
    try {
        const res = await fetch(url); const data = await res.json();
        const getWeatherIcon = (code) => {
            if (code === 0) return 'fa-sun'; if (code <= 3) return 'fa-cloud-sun'; if (code <= 48) return 'fa-smog';
            if (code <= 67) return 'fa-cloud-rain'; if (code <= 77) return 'fa-snowflake'; if (code <= 82) return 'fa-cloud-showers-heavy';
            if (code <= 86) return 'fa-snowflake'; if (code <= 99) return 'fa-bolt'; return 'fa-cloud';
        };
        if (data.current_weather) {
            els.weatherTemp.innerText = `${Math.round(data.current_weather.temperature)}°`;
            els.weatherIcon.innerHTML = `<i class="fas ${getWeatherIcon(data.current_weather.weathercode)}"></i>`;
            els.weatherIcon.classList.remove('weather-update-active');
            void els.weatherIcon.offsetWidth; els.weatherIcon.classList.add('weather-update-active');
            setTimeout(() => els.weatherIcon.classList.remove('weather-update-active'), 1000);
        }
        if (data.daily) {
            let h = '';
            for (let i = 1; i <= 3; i++) {
                if (!data.daily.time[i]) continue;
                const d = new Date(data.daily.time[i]); d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                h += `<div class="flex flex-col items-center justify-center"><span class="text-[10px] text-gray-300 font-bold uppercase mb-1">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}</span><div class="text-xl my-1 text-white"><i class="fas ${getWeatherIcon(data.daily.weathercode[i])}"></i></div><span class="text-xs font-bold leading-none text-gray-200">${Math.round(data.daily.temperature_2m_max[i])}°/${Math.round(data.daily.temperature_2m_min[i])}°</span></div>`;
            }
            els.weatherForecast.innerHTML = h;
        }
    } catch (e) { console.error(e); if (els.weatherCity) els.weatherCity.innerText = "Weather Unavail"; }
}

let weatherRefreshInterval;
export function startWeatherAutoUpdate(location) {
    if (weatherRefreshInterval) clearInterval(weatherRefreshInterval);
    fetchWeather(location);
    weatherRefreshInterval = setInterval(() => fetchWeather(location), 1800000);
}

export async function fetchCalendar(icalUrl) {
    if (icalUrl && icalUrl.length > 10) {
        appData.externalEvents = [{ title: "School Board Mtg", datetime: new Date(Date.now() + 86400000).toISOString().split('T')[0], location: "Admin" }, { title: "Early Release", datetime: new Date(Date.now() + 172800000).toISOString().split('T')[0], location: "Campus" }];
        mergeAndRenderEvents();
    } else { appData.externalEvents = []; mergeAndRenderEvents(); }
}
