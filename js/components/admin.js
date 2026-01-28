import { els, appData, DEPARTMENTS, COLLECTIONS } from '../config.js';
import { showLoader, hideLoader, processAndCompressImage } from '../utils.js';
import { updateDoc, doc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { startWeatherAutoUpdate, fetchCalendar } from './visual.js';
import { fetchLiveNews } from '../app.js';

export function updateUIConfig(settings) {
    if (settings.schoolName) els.schoolName.innerHTML = settings.schoolName;
    if (settings.subtitle) els.schoolSubtitle.innerHTML = settings.subtitle;
    if (settings.subtitle2) els.schoolSubtitle2.innerHTML = settings.subtitle2;
    if (settings.logo) document.getElementById('header-logo').src = settings.logo;
    const headerEl = document.getElementById('main-header');
    if (settings.headerBackground) { headerEl.style.backgroundImage = `url('${settings.headerBackground}')`; headerEl.style.backgroundSize = 'cover'; headerEl.style.backgroundPosition = 'center'; }
    else headerEl.style.backgroundImage = '';

    const confName = document.getElementById('editor-conf-name');
    const confSub = document.getElementById('editor-conf-subtitle');
    const confSub2 = document.getElementById('editor-conf-subtitle-2');
    if (confName) confName.innerHTML = settings.schoolName || "";
    if (confSub) confSub.innerHTML = settings.subtitle || "";
    if (confSub2) confSub2.innerHTML = settings.subtitle2 || "";
    els.confLocation.value = settings.location || "";
    els.confCalendar.value = settings.googleCalendar || "";
    document.getElementById('conf-finnhub-key').value = settings.finnhubApiKey || "";
    const pinField = document.getElementById('conf-admin-pin');
    if (pinField) pinField.value = settings.adminPin || "1234";

    if (settings.headerBackground) document.getElementById('conf-header-bg-preview').src = settings.headerBackground;
    if (settings.logo) document.getElementById('conf-logo-preview').src = settings.logo;
    if (settings.favicon) {
        document.getElementById('conf-favicon-preview').src = settings.favicon;
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.favicon;
    }

    fetchCalendar(settings.googleCalendar);
}

// Global Admin Functions for HTML interactions

window.handleAdminClick = () => {
    document.getElementById('pin-modal').classList.remove('hidden');
    document.getElementById('pin-input').value = '';
    setTimeout(() => document.getElementById('pin-input').focus(), 100);
};

window.closePinModal = () => document.getElementById('pin-modal').classList.add('hidden');

window.verifyPin = () => {
    const correct = appData.settings?.adminPin || '1234';
    if (document.getElementById('pin-input').value === correct) {
        window.closePinModal();
        document.getElementById('admin-modal').classList.remove('hidden');
    }
    else {
        const el = document.getElementById('pin-input');
        el.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => el.classList.remove('border-red-500', 'animate-pulse'), 500);
    }
};

document.getElementById('pin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.verifyPin();
    if (e.key === 'Escape') window.closePinModal();
});

window.toggleAdminModal = () => document.getElementById('admin-modal').classList.toggle('hidden');

window.switchTab = (id) => {
    document.querySelectorAll('.admin-content').forEach(e => e.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(e => e.classList.remove('bg-white', 'shadow-sm', 'border-l-4', 'border-school-navy', 'text-school-navy'));
    document.getElementById(id).classList.remove('hidden');
    const btn = [...document.querySelectorAll('.admin-tab-btn')].find(b => b.getAttribute('onclick').includes(id));
    if (btn) btn.classList.add('bg-white', 'shadow-sm', 'border-l-4', 'border-school-navy', 'text-school-navy');
};

window.saveConfig = async () => {
    showLoader();
    try {
        let logo = appData.settings?.logo || "", hdr = appData.settings?.headerBackground || "", fav = appData.settings?.favicon || "";
        const lf = document.getElementById('conf-logo-file'); if (lf && lf.files && lf.files[0]) logo = await processAndCompressImage(lf.files[0], 500);
        const hf = document.getElementById('conf-header-bg-file'); if (hf && hf.files && hf.files[0]) hdr = await processAndCompressImage(hf.files[0], 1280);
        const ff = document.getElementById('conf-favicon-file'); if (ff && ff.files && ff.files[0]) fav = await processAndCompressImage(ff.files[0], 128);

        const c = {
            schoolName: document.getElementById('editor-conf-name').innerHTML,
            subtitle: document.getElementById('editor-conf-subtitle').innerHTML,
            subtitle2: document.getElementById('editor-conf-subtitle-2').innerHTML,
            location: els.confLocation.value, googleCalendar: els.confCalendar.value,
            finnhubApiKey: document.getElementById('conf-finnhub-key').value,
            logo: logo, headerBackground: hdr, favicon: fav, adminPin: document.getElementById('conf-admin-pin').value || "1234"
        };
        if (appData.settingsId) await updateDoc(doc(window.getCollectionRef(COLLECTIONS.SETTINGS), appData.settingsId), c);
        else await addDoc(window.getCollectionRef(COLLECTIONS.SETTINGS), c);
        startWeatherAutoUpdate(c.location);
    } catch (e) { console.error(e); alert("Save failed"); } hideLoader();
};

let currentEditType = null; let currentEditId = null;

function generateFormFields(t, v) {
    v = v || {}; let h = '';
    const re = (n, val, l) => `<div><label class="block text-sm font-bold mb-1">${l}</label><div id="editor-${n}" class="border rounded p-3 min-h-[80px] max-h-48 overflow-y-auto text-sm" contenteditable="true">${val || ''}</div></div>`;
    if (t === 'announcements') h += `<div><label class="block text-sm font-bold mb-1">Title</label><input name="title" required value="${v.title || ''}" class="w-full p-2 border rounded"></div>${re('description', v.description, 'Description')}<div class="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border mt-2"><div><label class="block text-xs font-bold uppercase">Start</label><input type="date" name="startDate" value="${v.startDate || ''}" class="w-full p-2 border rounded"></div><div><label class="block text-xs font-bold uppercase">End</label><input type="date" name="endDate" value="${v.endDate || ''}" class="w-full p-2 border rounded"></div></div><div class="flex items-center mt-2"><input type="checkbox" name="urgent" ${v.urgent ? 'checked' : ''} class="h-4 w-4"><label class="ml-2 text-sm font-bold text-red-600">Urgent</label></div>`;
    else if (t === 'students') h += `<div><label class="block text-sm font-bold mb-1">Name</label><input name="name" required value="${v.name || ''}" class="w-full p-2 border rounded"></div><div><label class="block text-sm font-bold mb-1">Focus</label><input name="focus" value="${v.focus || ''}" class="w-full p-2 border rounded"></div>${re('description', v.description, 'Quote')}`;
    else if (t === 'teachers') h += `<div><label class="block text-sm font-bold mb-1">Name</label><input name="name" required value="${v.name || ''}" class="w-full p-2 border rounded"></div><div><label class="block text-sm font-bold mb-1">Dept</label><select name="dept" class="w-full p-2 border rounded">${DEPARTMENTS.map(d => `<option value="${d}" ${v.dept === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>${re('bio', v.bio, 'Bio')}`;
    else if (t === 'events') h += `<div><label class="block text-sm font-bold mb-1">Title</label><input name="title" required value="${v.title || ''}" class="w-full p-2 border rounded"></div><div><label class="block text-sm font-bold mb-1">Date</label><input type="date" name="datetime" required value="${v.datetime || ''}" class="w-full p-2 border rounded"></div><div><label class="block text-sm font-bold mb-1">Location</label><input name="location" value="${v.location || ''}" class="w-full p-2 border rounded"></div>`;
    else if (t === 'ticker' || t === 'news') h += re('text', v.text, 'Message');
    else if (t === 'media') h += `<div><label class="block text-sm font-bold mb-1">Type</label><select name="type" class="w-full p-2 border rounded"><option value="youtube" ${v.type === 'youtube' ? 'selected' : ''}>YouTube</option><option value="image" ${v.type === 'image' ? 'selected' : ''}>Image</option></select></div><div><label class="block text-sm font-bold mb-1">Content (URL)</label><textarea name="content" required rows="3" class="w-full p-2 border rounded text-xs">${v.content || ''}</textarea></div>`;
    if (!['events', 'ticker', 'news', 'media'].includes(t)) h += `<div class="border-t pt-4 mt-2"><label class="block text-sm font-bold mb-1">Image</label><input type="file" id="form-image-file" accept="image/*" class="text-sm"></div>`;
    document.getElementById('entry-fields').innerHTML = h;
}

window.openEntryModal = (t) => {
    currentEditType = t; currentEditId = null;
    document.getElementById('entry-modal-title').innerText = `Add ${t}`;
    document.getElementById('entry-form').reset();
    generateFormFields(t, null);
    document.getElementById('entry-modal').classList.remove('hidden');
};

window.editEntry = (t, id) => {
    currentEditType = t; currentEditId = id;
    const i = appData[t].find(x => x.id === id);
    if (i) {
        document.getElementById('entry-modal-title').innerText = `Edit ${t}`;
        generateFormFields(t, i);
        document.getElementById('entry-modal').classList.remove('hidden');
    }
};

window.closeEntryModal = () => document.getElementById('entry-modal').classList.add('hidden');

window.deleteEntry = async (t, id) => {
    if (confirm("Delete?")) {
        showLoader();
        await deleteDoc(doc(window.getCollectionRef(t), id));
        hideLoader();
    }
};

window.toggleVisibility = async (t, id, h) => {
    showLoader();
    await updateDoc(doc(window.getCollectionRef(t), id), { hidden: !h });
    hideLoader();
};

window.moveItem = async (t, id, dir) => {
    const arr = [...appData[t]].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = arr.findIndex(i => i.id === id);
    if (idx > -1 && arr[idx + dir]) {
        const c = arr[idx], n = arr[idx + dir], temp = c.order || 0;
        c.order = n.order || 0; n.order = temp;
        showLoader();
        await Promise.all([updateDoc(doc(window.getCollectionRef(t), c.id), { order: c.order }), updateDoc(doc(window.getCollectionRef(t), n.id), { order: n.order })]);
        hideLoader();
    }
};

window.handleEntrySubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const d = Object.fromEntries(fd.entries());
    ['description', 'bio', 'text'].forEach(k => { const el = document.getElementById(`editor-${k}`); if (el) d[k] = el.innerHTML; });
    if (currentEditType === 'announcements') d.urgent = fd.get('urgent') === 'on';
    showLoader();
    try {
        const f = document.getElementById('form-image-file');
        if (f && f.files && f.files[0]) d.image = await processAndCompressImage(f.files[0], 1024);
        else if (!d.image && currentEditId) { const old = appData[currentEditType].find(x => x.id === currentEditId); if (old) d.image = old.image; }
        if (currentEditId) await updateDoc(doc(window.getCollectionRef(currentEditType), currentEditId), d);
        else { d.order = appData[currentEditType].length; await addDoc(window.getCollectionRef(currentEditType), d); }
        window.closeEntryModal();
    } catch (e) { console.error(e); } hideLoader();
};
