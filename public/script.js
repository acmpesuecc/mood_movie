// Firebase Configuration
import firebaseConfig from './firebaseconfig.js';

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- GLOBAL STATE ---
let userHistory = [];
let userWatchlist = [];
let currentMovieData = null;
let moodChart = null;
const API_BASE_URL = "/api";

// --- API HELPER ---
async function apiCall(endpoint, options = {}) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }
        return response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, user => {
    const authModal = document.getElementById('authModal');
    if (user) {
        authModal.classList.remove('active');
        loadUserData();
    } else {
        userHistory = [];
        userWatchlist = [];
        currentMovieData = null;
        document.getElementById('result').classList.add('hidden');
        authModal.classList.add('active');
    }
});

// --- DATA HANDLING ---
async function loadUserData() {
    try {
        const [historyData, watchlistData] = await Promise.all([
            apiCall('/history'),
            apiCall('/watchlist')
        ]);
        userHistory = historyData.history || [];
        userWatchlist = watchlistData.watchlist || [];
        displayHistory();
        setupMoodChart();
    } catch (error) {
        console.error("Failed to load user data:", error);
    }
}

async function saveToHistory(mood, movieData) {
    try {
        await apiCall('/save-history', {
            method: 'POST',
            body: JSON.stringify({ mood, movieData })
        });
        // Refresh all data from the database for consistency
        await loadUserData();
    } catch (error) {
        console.error('Save history error:', error);
    }
}

// --- UI RENDERING ---
function displayHistory() {
    const container = document.getElementById("historyList");
    if (!userHistory || userHistory.length === 0) {
        container.innerHTML = `<tr><td colspan="4">No history yet!</td></tr>`;
        return;
    }
    container.innerHTML = userHistory.map(entry => `
    <tr>
        <td>${new Date(entry.watchedOn).toLocaleDateString()}</td>
        <td>${entry.mood}</td>
        <td>${entry.title}</td>
        <td>${Math.floor(Math.random() * 3) + 7}/10</td>
    </tr>`).join("");
}

function setupMoodChart() {
    const ctx = document.getElementById('moodChart').getContext('2d');
    if (moodChart) moodChart.destroy();

    if (!userHistory || userHistory.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
        ctx.textAlign = 'center';
        ctx.fillText('No mood data yet!', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const moodCounts = userHistory.reduce((acc, entry) => {
        const moods = entry.mood.split(',').map(m => m.trim());
        moods.forEach(mood => {
            acc[mood] = (acc[mood] || 0) + 1;
        });
        return acc;
    }, {});

    const labels = Object.keys(moodCounts);
    const data = Object.values(moodCounts);

    moodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#6c5ce7', '#00b894', '#fd79a8', '#fdcb6e', '#a29bfe', '#55efc4'],
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text')
                    }
                }
            }
        }
    });
}

async function displayResults(moods, movieData) {
    currentMovieData = movieData;
    document.getElementById('movieTitle').textContent = `${movieData.title} (${movieData.year})`;
    document.getElementById('movieDesc').textContent = movieData.description;
    document.getElementById('movieWhy').textContent = movieData.reason;
    const poster = document.getElementById("poster-image");
    if (movieData.poster) {
        poster.src = movieData.poster;
        poster.classList.remove('hidden');
    } else {
        poster.classList.add('hidden');
    }
    document.getElementById('result').classList.remove('hidden');
    document.getElementById('addToWatchlistBtn').disabled = false;
    document.getElementById('markAsWatchedBtn').disabled = false;
}

// --- CORE APP LOGIC ---
async function analyzeMoodAndRecommend() {
    const text = document.getElementById('userText').value.trim();
    if (!text) return;
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span>⏳</span><span>Analyzing...</span>';

    try {
        const moodResponse = await apiCall('/analyze-mood', { method: 'POST', body: JSON.stringify({ text }) });
        const movieResponse = await apiCall('/recommend-movie', { method: 'POST', body: JSON.stringify({ text, moods: moodResponse.moods }) });
        await displayResults(moodResponse.moods, movieResponse.movieData);
    } catch (error) {
        alert('Sorry, something went wrong. Please try again.');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<span>🍿</span><span>Find My Movie</span>';
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Auth form listeners
    document.getElementById('loginBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('signupBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        if (password !== document.getElementById('signupConfirmPassword').value) {
            alert("Passwords don't match!");
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    });

    const handleGoogleAuth = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            alert("Google sign-in error: " + error.message);
        }
    };
    document.getElementById('googleLoginBtn').addEventListener('click', handleGoogleAuth);
    document.getElementById('googleSignupBtn').addEventListener('click', handleGoogleAuth);
    
    document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
    
    // Main app buttons
    document.getElementById('analyzeBtn').addEventListener('click', analyzeMoodAndRecommend);
    document.getElementById('profileBtn').addEventListener('click', showProfile);

    // --- DELETED THE OLD, BROKEN BUTTON LISTENERS FROM HERE ---
});

// --- REPLACED WITH THIS UNIVERSAL EVENT DELEGATION LISTENER ---
// This one listener handles clicks for buttons that might not exist on page load.
document.addEventListener('click', async (event) => {
    // Check for "Add to Watchlist" button click
    if (event.target.closest('#addToWatchlistBtn')) {
        if (!currentMovieData) return;
        
        const btn = event.target.closest('#addToWatchlistBtn');
        btn.disabled = true;

        try {
            await apiCall('/watchlist', {
                method: 'POST',
                body: JSON.stringify({ movieData: currentMovieData })
            });
            alert(`${currentMovieData.title} added to your watchlist!`);
            await loadUserData(); // Refresh data
        } catch (error) {
            alert("Could not add to watchlist.");
            btn.disabled = false; // Re-enable on error
        }
    }

    // Check for "Mark as Watched" button click
    if (event.target.closest('#markAsWatchedBtn')) {
        if (!currentMovieData) return;
        
        const btn = event.target.closest('#markAsWatchedBtn');
        btn.disabled = true;

        try {
            await saveToHistory('Watched', currentMovieData);
            alert(`${currentMovieData.title} marked as watched!`);
        } catch (error) {
            alert("Could not mark as watched.");
            btn.disabled = false; // Re-enable on error
        }
    }
});


// --- PROFILE MODAL ---
function showProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.innerHTML = `
        <div class="profile-container">
            <button class="close-btn" onclick="this.closest('.profile-modal').remove()">×</button>
            <div class="profile-header">
                <div class="profile-avatar">${user.email ? user.email[0].toUpperCase() : 'U'}</div>
                <h2>${user.displayName || user.email}</h2>
            </div>
            <div class="profile-tabs">
                <button class="profile-tab active" data-tab="watchlist">Watchlist (${userWatchlist.length})</button>
                <button class="profile-tab" data-tab="history">History (${userHistory.length})</button>
            </div>
            <div class="profile-tab-content active" id="watchlistContent"></div>
            <div class="profile-tab-content" id="historyContent" style="display: none;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}Content`).style.display = 'block';
        });
    });
    
    displayWatchlistInProfile();
    displayHistoryInProfile();
}

function displayWatchlistInProfile() {
    const container = document.getElementById('watchlistContent');
    if (!container) return;
    if (!userWatchlist || userWatchlist.length === 0) {
        container.innerHTML = '<p>Your watchlist is empty!</p>';
        return;
    }
    container.innerHTML = userWatchlist.map(movie => `
        <div class="list-item">
            <span>${movie.title} (${movie.year})</span>
            <button class="remove-btn" data-movie-id="${movie.id}">Remove</button>
        </div>`).join('');
    
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const movieId = e.target.dataset.movieId;
            try {
                await apiCall(`/watchlist/${movieId}`, { method: 'DELETE' });
                await loadUserData();
                document.querySelector('.profile-modal').remove();
                showProfile();
            } catch (error) {
                console.error("Failed to remove from watchlist", error);
            }
        });
    });
}

function displayHistoryInProfile() {
    const container = document.getElementById('historyContent');
    if (!container) return;
    if (!userHistory || userHistory.length === 0) {
        container.innerHTML = '<p>Your watch history is empty!</p>';
        return;
    }
    container.innerHTML = userHistory.map(movie => `
        <div class="list-item">
            <span>${movie.title} - Watched on ${new Date(movie.watchedOn).toLocaleDateString()}</span>
        </div>`).join('');
}
