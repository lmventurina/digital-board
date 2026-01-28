export function extractYouTubeID(url) {
    let videoId = '';
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) {
            if (u.searchParams.has('v')) videoId = u.searchParams.get('v');
            else if (u.pathname.includes('/shorts/')) videoId = u.pathname.split('/shorts/')[1];
            else if (u.pathname.includes('/embed/')) videoId = u.pathname.split('/embed/')[1];
        } else if (u.hostname.includes('youtu.be')) videoId = u.pathname.slice(1);
    } catch (e) { }
    return videoId ? videoId.split('?')[0].split('&')[0] : null;
}

export const processAndCompressImage = (file, maxWidth) => new Promise((resolve, reject) => {
    if (file.size < 800 * 1024) {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
        return;
    }
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = e => {
        const i = new Image();
        i.src = e.target.result;
        i.onload = () => {
            const c = document.createElement('canvas'), ctx = c.getContext('2d');
            let w = i.width, h = i.height;
            if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
            c.width = w; c.height = h;
            ctx.fillStyle = "#FFF";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(i, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', 0.7));
        }
    }
});

export function showLoader() {
    const el = document.getElementById('global-loader');
    if (el) el.classList.remove('hidden');
}

export function hideLoader() {
    const el = document.getElementById('global-loader');
    if (el) el.classList.add('hidden');
}
