// ==========================================
// The Junior Master Chef - App Logic
// ==========================================

// --- Admin Account ---
const ADMIN_ACCOUNT = {
    email: 'the-junior-master-chef@outlook.com',
    password: 'H0nd1408!@',
    name: 'Admin',
    role: 'admin'
};

// --- Initialisatie ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Zorg dat er een users array bestaat in localStorage
    if (!localStorage.getItem('tjmc_users')) {
        localStorage.setItem('tjmc_users', JSON.stringify([]));
    }
    // Open database en laad UI
    openDB().then(() => {
        updateUI();
        loadVideos();
    });
}

// ==========================================
// NAVIGATIE
// ==========================================

function showPage(pageId) {
    // Verberg alle pagina's
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Check of gebruiker ingelogd moet zijn
    const user = getCurrentUser();

    if (pageId === 'admin' && (!user || user.role !== 'admin')) {
        showToast('Je hebt geen toegang tot het admin panel.', 'error');
        return;
    }

    // Toon de gevraagde pagina
    const page = document.getElementById('page-' + pageId);
    if (page) {
        page.classList.add('active');
    }

    // Update actieve nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    // Specifieke pagina-logica
    if (pageId === 'videos') {
        loadVideos();
    }
    if (pageId === 'admin') {
        loadAdminVideos();
    }
    if (pageId === 'feedback') {
        prefillFeedback();
    }

    // Sluit mobiel menu
    document.querySelector('.nav-links').classList.remove('open');

    // Scroll naar boven
    window.scrollTo(0, 0);
}

function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('open');
}

// ==========================================
// AUTHENTICATIE
// ==========================================

function getCurrentUser() {
    const userData = localStorage.getItem('tjmc_session');
    return userData ? JSON.parse(userData) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('tjmc_session', JSON.stringify(user));
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    // Check admin account
    if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
        setCurrentUser({ email: ADMIN_ACCOUNT.email, name: ADMIN_ACCOUNT.name, role: 'admin' });
        showToast('Welkom terug, Admin!', 'success');
        updateUI();
        showPage('home');
        return;
    }

    // Check normale gebruikers
    const users = JSON.parse(localStorage.getItem('tjmc_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        setCurrentUser({ email: user.email, name: user.name, role: 'user' });
        showToast('Welkom terug, ' + user.name + '!', 'success');
        updateUI();
        showPage('home');
    } else {
        errorEl.textContent = 'Ongeldig e-mailadres of wachtwoord.';
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    errorEl.textContent = '';
    successEl.textContent = '';

    // Validatie
    if (password !== password2) {
        errorEl.textContent = 'Wachtwoorden komen niet overeen.';
        return;
    }

    if (email === ADMIN_ACCOUNT.email) {
        errorEl.textContent = 'Dit e-mailadres is al in gebruik.';
        return;
    }

    const users = JSON.parse(localStorage.getItem('tjmc_users') || '[]');

    if (users.find(u => u.email === email)) {
        errorEl.textContent = 'Dit e-mailadres is al geregistreerd.';
        return;
    }

    // Opslaan
    users.push({ name, email, password });
    localStorage.setItem('tjmc_users', JSON.stringify(users));

    successEl.textContent = 'Account aangemaakt! Je kunt nu inloggen.';
    document.getElementById('register-form').reset();

    // Na 2 seconden naar login switchen
    setTimeout(() => {
        switchAuthTab('login');
        successEl.textContent = '';
    }, 2000);
}

function logout() {
    localStorage.removeItem('tjmc_session');
    updateUI();
    showPage('home');
    showToast('Je bent uitgelogd.', 'success');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
    }
    // Clear errors
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    document.getElementById('register-success').textContent = '';
}

// ==========================================
// UI UPDATE
// ==========================================

function updateUI() {
    const user = getCurrentUser();
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navUser = document.getElementById('nav-user');
    const navUsername = document.getElementById('nav-username');
    const adminLinks = document.querySelectorAll('.admin-only');

    if (user) {
        navLogin.style.display = 'none';
        navLogout.style.display = 'inline-block';
        navUser.style.display = 'flex';
        navUsername.textContent = user.name;

        // Toon admin link als admin
        adminLinks.forEach(link => {
            link.style.display = user.role === 'admin' ? 'inline-block' : 'none';
        });
    } else {
        navLogin.style.display = 'inline-block';
        navLogout.style.display = 'none';
        navUser.style.display = 'none';
        adminLinks.forEach(link => { link.style.display = 'none'; });
    }
}

// ==========================================
// INDEXEDDB - Video Opslag
// ==========================================

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) { resolve(db); return; }
        const request = indexedDB.open('tjmc_db', 1);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('videos')) {
                database.createObjectStore('videos', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = () => reject('Database kon niet geopend worden.');
    });
}

function dbGetAllVideos() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('videos', 'readonly');
            const store = tx.objectStore('videos');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Kon video\'s niet ophalen.');
        });
    });
}

function dbAddVideo(videoData) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('videos', 'readwrite');
            const store = tx.objectStore('videos');
            const request = store.add(videoData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Kon video niet opslaan.');
        });
    });
}

function dbDeleteVideo(id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('videos', 'readwrite');
            const store = tx.objectStore('videos');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Kon video niet verwijderen.');
        });
    });
}

// ==========================================
// VIDEO'S
// ==========================================

function handleAddVideo(e) {
    e.preventDefault();
    const title = document.getElementById('video-title').value.trim();
    const description = document.getElementById('video-description').value.trim();
    const fileInput = document.getElementById('video-file');
    const category = document.getElementById('video-category').value;
    const errorEl = document.getElementById('video-error');
    const successEl = document.getElementById('video-success');
    const submitBtn = document.querySelector('#video-form .btn');
    errorEl.textContent = '';
    successEl.textContent = '';

    const file = fileInput.files[0];
    if (!file) {
        errorEl.textContent = 'Selecteer een videobestand.';
        return;
    }

    if (!file.type.startsWith('video/')) {
        errorEl.textContent = 'Dit is geen geldig videobestand.';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploaden...';

    const reader = new FileReader();
    reader.onload = function(event) {
        const videoData = {
            id: Date.now().toString(),
            title,
            description,
            category,
            fileName: file.name,
            fileType: file.type,
            fileData: event.target.result,
            dateAdded: new Date().toLocaleDateString('nl-NL')
        };

        dbAddVideo(videoData).then(() => {
            successEl.textContent = 'Video succesvol geupload!';
            document.getElementById('video-form').reset();
            loadAdminVideos();
            setTimeout(() => { successEl.textContent = ''; }, 3000);
        }).catch(err => {
            errorEl.textContent = 'Fout bij opslaan: ' + err;
        }).finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Video Toevoegen';
        });
    };
    reader.onerror = function() {
        errorEl.textContent = 'Kon het bestand niet lezen.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Video Toevoegen';
    };
    reader.readAsArrayBuffer(file);
}

function deleteVideo(id) {
    if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
    dbDeleteVideo(id).then(() => {
        loadAdminVideos();
        loadVideos();
        showToast('Video verwijderd.', 'success');
    });
}

function loadVideos() {
    const user = getCurrentUser();
    const grid = document.getElementById('videos-grid');
    const loginMsg = document.getElementById('videos-login-msg');
    const noVideosMsg = document.getElementById('no-videos-msg');

    if (!user) {
        grid.style.display = 'none';
        loginMsg.style.display = 'block';
        noVideosMsg.style.display = 'none';
        return;
    }

    loginMsg.style.display = 'none';

    dbGetAllVideos().then(videos => {
        // Sorteer nieuwste eerst
        videos.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        if (videos.length === 0) {
            grid.style.display = 'none';
            noVideosMsg.style.display = 'block';
            return;
        }

        noVideosMsg.style.display = 'none';
        grid.style.display = 'grid';
        grid.innerHTML = '';

        videos.forEach(video => {
            const blob = new Blob([video.fileData], { type: video.fileType });
            const url = URL.createObjectURL(blob);

            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <video controls preload="metadata">
                    <source src="${url}" type="${video.fileType}">
                    Je browser ondersteunt geen video.
                </video>
                <div class="video-info">
                    <h3>${escapeHtml(video.title)}</h3>
                    <p>${escapeHtml(video.description)}</p>
                    <span class="video-category">${escapeHtml(video.category)}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

function loadAdminVideos() {
    const list = document.getElementById('admin-videos-list');

    dbGetAllVideos().then(videos => {
        videos.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        if (videos.length === 0) {
            list.innerHTML = '<p style="color:#999; padding:1rem;">Nog geen video\'s toegevoegd.</p>';
            return;
        }

        list.innerHTML = videos.map(video => `
            <div class="admin-video-item">
                <div class="admin-video-info">
                    <h4>${escapeHtml(video.title)}</h4>
                    <span>${video.category} &bull; ${video.dateAdded}</span>
                </div>
                <button class="btn btn-danger" onclick="deleteVideo('${video.id}')">Verwijderen</button>
            </div>
        `).join('');
    });
}

// ==========================================
// FEEDBACK
// ==========================================

function prefillFeedback() {
    const user = getCurrentUser();
    const nameField = document.getElementById('fb-name');
    const emailField = document.getElementById('fb-email');
    if (user) {
        nameField.value = user.name;
        nameField.readOnly = true;
        emailField.value = user.email;
        emailField.readOnly = true;
    } else {
        nameField.value = '';
        nameField.readOnly = false;
        emailField.value = '';
        emailField.readOnly = false;
    }
}

function handleFeedback(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const name = user ? user.name : document.getElementById('fb-name').value.trim();
    const email = user ? user.email : document.getElementById('fb-email').value.trim();
    const subject = document.getElementById('fb-subject').value.trim();
    const message = document.getElementById('fb-message').value.trim();

    const submitBtn = document.querySelector('#feedback-form .btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Versturen...';

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            access_key: 'b5ab7932-cc36-4c73-ac5e-46bddad9bafe',
            name: name,
            email: email,
            subject: subject,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Feedback succesvol verstuurd!', 'success');
            document.getElementById('feedback-form').reset();
            prefillFeedback();
        } else {
            showToast('Er ging iets mis. Probeer het opnieuw.', 'error');
        }
    })
    .catch(() => {
        showToast('Kon niet versturen. Controleer je internetverbinding.', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verstuur Feedback';
    });
}

// ==========================================
// HULPFUNCTIES
// ==========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + (type || '');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
