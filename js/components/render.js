
import { els, appData, carousels } from '../config.js';
import { extractYouTubeID } from '../utils.js';

let ytApiReady = false;
window.onYouTubeIframeAPIReady = () => { ytApiReady = true; };
// Inject YouTube IFrame API if not already present
if (!document.getElementById('youtube-iframe-api')) {
    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

export function renderCarousel(t, d) {
    const c = els[`${t}Carousel`], p = els[`${t}Progress`], cfg = carousels[t];
    if (cfg.timer) clearTimeout(cfg.timer);
    if (!d || !d.length) { c.innerHTML = `<div class="w-full h-full flex items-center justify-center text-center text-gray-400">No content available</div>`; return; }
    if (cfg.index >= d.length) cfg.index = 0;
    const show = () => {
        if (t === 'media' && window.currentMediaPlayer) { try { window.currentMediaPlayer.destroy() } catch (e) { } window.currentMediaPlayer = null; }
        if (p) { p.style.transition = 'none'; p.style.width = '0%'; }
        const item = d[cfg.index];
        c.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center opacity-0 transition-opacity duration-500 relative" id="${t}-slide"></div>`;
        const s = document.getElementById(`${t}-slide`);
        const next = (ms) => {
            if (d.length <= 1) { if (p) { p.style.width = '0%'; p.style.display = 'none'; } return; }
            if (p) { p.style.display = 'block'; setTimeout(() => { p.style.transition = `width ${ms}ms linear`; p.style.width = '100%'; }, 50); }
            cfg.timer = setTimeout(() => { cfg.index = (cfg.index + 1) % d.length; show(); }, ms);
        };
        if (t === 'media' && item.type === 'youtube') {
            s.classList.remove('opacity-0');
            const vid = extractYouTubeID(item.content);
            if (vid && ytApiReady) {
                s.innerHTML = `<div id="yt-p-${Date.now()}" style="width:100%;height:100%"></div>`;
                window.currentMediaPlayer = new YT.Player(s.firstElementChild.id, {
                    height: '100%', width: '100%', videoId: vid,
                    playerVars: { autoplay: 1, controls: 0, rel: 0, showinfo: 0, mute: 0, origin: window.location.origin, enablejsapi: 1 },
                    events: {
                        'onReady': e => e.target.playVideo(),
                        'onStateChange': e => { if (e.data === 0) next(100); },
                        'onError': () => next(3000)
                    }
                });
                if (d.length > 1) cfg.timer = setTimeout(() => { cfg.index = (cfg.index + 1) % d.length; show(); }, 600000);
            } else next(5000);
        } else if (t === 'media' && item.type === 'facebook') {
            s.innerHTML = item.content.includes('<iframe') ? item.content : 'Invalid Code';
            const f = s.querySelector('iframe'); if (f) { f.style.width = '100%'; f.style.height = '100%'; }
            setTimeout(() => s.classList.remove('opacity-0'), 50); next(cfg.interval);
        } else {
            if (t === 'media' && item.type === 'image') s.innerHTML = `<img src="${item.content}" class="w-full h-full object-cover">`;
            else if (t === 'student') s.innerHTML = `<div class="flex flex-row items-center w-full h-full gap-3"><div class="flex-none w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-school-gold overflow-hidden shadow-lg bg-gray-200 ml-2"><img src="${item.image || 'https://placehold.co/200'}" class="w-full h-full object-cover"></div><div class="flex-1 flex flex-col items-start justify-center text-left min-w-0 pr-2"><h3 class="text-2xl font-bold text-school-navy dark:text-school-gold mb-1 leading-tight">${item.name}</h3><span class="bg-school-gold text-school-navy px-3 py-1 rounded-full text-sm font-bold mb-3">${item.focus || 'Student'}</span><p class="text-gray-600 dark:text-gray-300 italic line-clamp-4 text-sm md:text-base">"${item.description}"</p></div></div>`;
            else if (t === 'teacher') s.innerHTML = `<div class="flex flex-row items-center w-full h-full gap-3"><div class="flex-none w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-school-navy dark:border-white overflow-hidden shadow-lg bg-gray-200 ml-2"><img src="${item.image || 'https://placehold.co/200'}" class="w-full h-full object-cover"></div><div class="flex-1 text-left min-w-0 pr-2"><h3 class="text-2xl font-bold text-gray-800 dark:text-white leading-tight">${item.name}</h3><div class="text-school-navy dark:text-school-gold font-bold uppercase tracking-wide text-sm mb-2">${item.dept}</div><p class="text-gray-600 dark:text-gray-300 text-sm line-clamp-5 border-l-4 border-school-gold pl-3">${item.bio}</p></div></div>`;
            else if (t === 'announcement') s.innerHTML = `<div class="flex flex-row items-center w-full h-full gap-4 relative ${item.urgent ? 'border-4 border-red-600 rounded-xl bg-red-50 dark:bg-red-900/20' : ''} overflow-hidden">${(item.image && item.image.length > 50) ? `<div class="flex-none w-1/3 h-full flex items-center justify-center p-1"><img src="${item.image}" class="w-full h-full rounded-lg shadow-sm object-contain"></div>` : `<div class="flex-none w-24 flex items-center justify-center text-school-gold ml-2"><i class="fas fa-bullhorn fa-4x"></i></div>`}<div class="flex-1 flex flex-col justify-center text-left min-w-0 pr-2"><h3 class="text-xl md:text-2xl font-bold text-school-navy dark:text-school-gold mb-2 leading-tight">${item.title}</h3><div class="h-1 w-20 bg-school-gold mb-3"></div><p class="text-gray-700 dark:text-gray-300 text-sm md:text-lg line-clamp-5">${item.description}</p></div>${item.urgent ? '<span class="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg uppercase animate-pulse">Urgent</span>' : ''}</div>`;
            setTimeout(() => s.classList.remove('opacity-0'), 50); next(cfg.interval);
        }
    };
    show();
}

export function mergeAndRenderEvents() {
    const all = [...appData.events, ...appData.externalEvents].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const valid = all.filter(e => {
        const d = new Date(e.datetime); d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        if (e.endDate) { const ed = new Date(e.endDate); ed.setMinutes(ed.getMinutes() + ed.getTimezoneOffset()); if (now > ed) return false; }
        else if (now > d) return false;
        return true;
    });
    if (!valid.length) { els.eventsList.innerHTML = `<p class="text-center text-gray-400 mt-4">No Upcoming Events</p>`; return; }
    els.eventsList.innerHTML = valid.map(e => {
        const d = new Date(e.datetime); d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        const diff = d.getTime() - now.getTime(); const days = Math.ceil(diff / (86400000));
        const soon = days >= 0 && days <= 3;
        const bCls = soon ? 'border-red-600 bg-red-900/30' : 'border-school-gold bg-white dark:bg-gray-800/50';
        const tCls = soon ? 'text-red-400' : 'text-school-navy dark:text-school-gold';
        return `<div class="flex items-center p-3 rounded-lg shadow-sm mb-3 border-l-4 ${bCls} transition-colors duration-300"><div class="flex-none w-14 text-center flex flex-col items-center justify-center"><div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase leading-none">${d.toLocaleDateString([], { month: 'short' })}</div><div class="text-xl font-bold ${tCls} leading-none my-0.5">${d.getDate()}</div>${soon ? '<div class="bg-red-600 text-white text-[9px] px-1 py-0.5 rounded font-bold uppercase mt-1 animate-pulse leading-none inline-block">Soon</div>' : ''}</div><div class="ml-3 flex-1 min-w-0"><h4 class="font-bold text-sm text-gray-800 dark:text-gray-100 leading-tight truncate">${e.title}</h4><p class="text-xs text-gray-500 dark:text-gray-400 truncate">${e.location || 'TBA'}</p></div></div>`;
    }).join('');
}

export function renderBottomTicker() {
    const manual = appData.news.filter(i => !i.hidden).map(i => ({ title: i.text, source: 'School News' }));
    const combined = [...manual, ...appData.liveNews];
    if (combined.length === 0) { els.bottomTicker.innerHTML = `<span class="inline-block mx-4 text-gray-400 font-mono">Waiting for news update...</span>`; return; }
    els.bottomTicker.innerHTML = combined.map(item => {
        let iconColor = 'text-school-gold'; let icon = 'fa-newspaper';
        if (item.source === 'Navajo Nation') { iconColor = 'text-orange-400'; icon = 'fa-feather'; }
        if (item.source === 'Business') { iconColor = 'text-blue-400'; icon = 'fa-briefcase'; }
        if (item.source === 'Stock Market') { iconColor = 'text-emerald-400'; icon = 'fa-chart-line'; }
        if (item.source === 'Education') { iconColor = 'text-yellow-200'; icon = 'fa-graduation-cap'; }
        if (['Market Index', 'Stock', 'Crypto'].includes(item.source)) {
            const isUp = item.title.includes('▲') || item.title.includes('+');
            const trendColor = isUp ? 'text-green-400' : 'text-red-400';
            if (item.source === 'Market Index') icon = 'fa-chart-pie';
            if (item.source === 'Stock') icon = 'fa-building';
            if (item.source === 'Crypto') icon = 'fa-coins';
            return `<span class="inline-flex items-center mx-8"><i class="fas ${icon} text-gray-400 mr-2 text-sm"></i><span class="font-mono font-bold text-lg tracking-tight text-white mr-2">${item.title.split(':')[0]}:</span><span class="font-mono font-bold text-lg ${trendColor}">${item.title.split(':')[1]}</span></span>`;
        }
        return `<span class="inline-flex items-center mx-12"><i class="fas ${icon} ${iconColor} mr-3 text-sm opacity-80"></i><span class="font-display font-semibold text-lg tracking-wide text-gray-100">${item.title}</span></span>`;
    }).join('');
}

export function renderAdminList(type, data) {
    const container = els[`admin${type.charAt(0).toUpperCase() + type.slice(1)}`];
    if (!container) return;
    if (data.length === 0) { container.innerHTML = `<p class="text-gray-500 italic col-span-3">No items found.</p>`; return; }
    container.innerHTML = data.map((item, index) => {
        let mainText = item.title || item.name || item.text;
        let subText = item.description || item.dept || item.datetime || '';
        let img = item.image;
        if (type === 'ticker' || type === 'news') { mainText = item.text; subText = "Headline"; }
        if (type === 'media') { mainText = item.type.toUpperCase(); subText = item.content ? item.content.substring(0, 30) + '...' : ''; if (item.type === 'image') img = item.content; }
        if (type === 'events' && item.datetime) {
            const d = new Date(item.datetime); d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
            subText = d.toLocaleDateString() + (item.location ? ` - ${item.location}` : '');
        }
        const hiddenClass = item.hidden ? 'opacity-60 bg-gray-50' : '';
        const hiddenIcon = item.hidden ? 'fa-eye-slash text-gray-500' : 'fa-eye text-green-600';
        return `<div class="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-start group ${hiddenClass}"><div class="flex items-start space-x-3 overflow-hidden">${img ? `<img src="${img}" class="w-10 h-10 rounded-full object-cover border">` : ''}<div class="min-w-0"><h4 class="font-bold text-gray-800 truncate text-sm">${mainText}</h4><p class="text-xs text-gray-500 truncate">${subText || ''}</p></div></div><div class="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity items-center"><div class="flex flex-col space-y-1 items-center mr-2">${index > 0 ? `<button onclick="window.moveItem('${type}', '${item.id}', -1)" class="text-gray-500 hover:text-school-navy"><i class="fas fa-arrow-up"></i></button>` : `<span class="w-4"></span>`}${index < data.length - 1 ? `<button onclick="window.moveItem('${type}', '${item.id}', 1)" class="text-gray-500 hover:text-school-navy"><i class="fas fa-arrow-down"></i></button>` : `<span class="w-4"></span>`}</div><div class="h-8 w-px bg-gray-200 mx-1"></div><button onclick="window.toggleVisibility('${type}', '${item.id}', ${item.hidden || false})" class="${hiddenIcon} hover:text-gray-800"><i class="fas ${hiddenIcon}"></i></button><button onclick="window.editEntry('${type}', '${item.id}')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i></button><button onclick="window.deleteEntry('${type}', '${item.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button></div></div>`;
    }).join('');
}
