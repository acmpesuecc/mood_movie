// Firebase Configuration
import firebaseConfig from './firebaseconfig.js';

// Import Firebase SDKs (using modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global chart instance
let moodChart = null;

// API Base URL
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://mood-movie.onrender.com/api"; 

// Initialize Theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').innerHTML = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('themeToggle').innerHTML = '🌙';
  }
}

// Get Auth Token
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return await user.getIdToken();
}

// API Helper Functions
async function apiCall(endpoint, options = {}) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

// Auth State Listener
onAuthStateChanged(auth, user => {
  console.log("Auth state changed. User:", user);
  
  const authModal = document.getElementById('authModal');
  const resultSection = document.getElementById('result');
  
  if (user) {
    console.log("User is signed in, hiding modal");
    authModal.classList.remove('active');
    resultSection.classList.remove('hidden');
    displayHistory();
    setupMoodChart();
  } else {
    console.log("No user, showing modal");
    authModal.classList.add('active');
    resultSection.classList.add('hidden');
  }
});

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  // Show auth modal on page load if user is not logged in
  if (!auth.currentUser) {
    document.getElementById('authModal').classList.add('active');
  }
  
  // Theme toggle logic for header button
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Set initial theme state for header button
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙';
  }

  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
      themeIcon.textContent = '🌙';
    } else {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
      themeIcon.textContent = '☀️';
    }
    if (moodChart) {
      setupMoodChart();
    }
  });

  // Auth Modal Logic
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.add('hidden');
        form.querySelectorAll('input, button').forEach(el => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(10px)';
        });
      });
      
      const activeForm = document.getElementById(`${tab.dataset.tab}Form`);
      activeForm.classList.remove('hidden');
      
      // Re-trigger animations
      setTimeout(() => {
        activeForm.querySelectorAll('input, button').forEach((el, i) => {
          el.style.animation = `fadeIn 0.5s ease-out ${i * 0.1 + 0.1}s forwards`;
        });
      }, 10);
    });
  });
  
  // Auth Navigation
  document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-tab="signup"]').click();
  });
  
  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-tab="login"]').click();
  });
  
  // Close Modal
  document.getElementById('closeAuthModal').addEventListener('click', () => {
    document.getElementById('authModal').classList.remove('active');
  });
  
  // Login
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
  
  // Signup
  document.getElementById('signupBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  });
  
  document.getElementById('profileBtn').addEventListener('click', showProfile);
  
  // Google Sign-In
  document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert(error.message);
    }
  });

  // Google Sign-Up
  document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      alert(error.message);
    }
  });
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth);
  });
  
  // Voice Input
  document.getElementById('voiceBtn').addEventListener('click', () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('userText').value = transcript;
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert('Speech recognition failed. Please try again.');
      };
      
      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  });
  
  // Analyze Button
  document.getElementById('analyzeBtn').addEventListener('click', analyzeMoodAndRecommend);
  
  // Surprise Me Button
  document.getElementById('surpriseBtn').addEventListener('click', surpriseMe);
});

// Main Analysis Function
async function analyzeMoodAndRecommend() {
  const text = document.getElementById('userText').value.trim();
  
  if (!text) {
    alert('Please enter how you feel!');
    return;
  }

  try {
    // Show loading state
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalText = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Analyzing...</span>';
    analyzeBtn.disabled = true;

    // Analyze mood
    const moodResponse = await apiCall('/analyze-mood', {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    const moods = moodResponse.moods;

    // Get movie recommendation
    const movieResponse = await apiCall('/recommend-movie', {
      method: 'POST',
      body: JSON.stringify({ text, moods })
    });

    const movieData = movieResponse.movieData;

    // Display results
    await displayResults(moods, movieData);

    // Create confetti effect
    createConfetti();

  } catch (error) {
    console.error('Analysis error:', error);
    alert('Sorry, something went wrong. Please try again.');
  } finally {
    // Reset button
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.innerHTML = '<span class="btn-icon">🍿</span><span class="btn-text">Find My Movie</span>';
    analyzeBtn.disabled = false;
  }
}

// Display Results
async function displayResults(moods, movieData) {
  // Display moods
  const moodBubbles = document.getElementById('moodBubbles');
  moodBubbles.innerHTML = '';
  
  moods.forEach(mood => {
    const bubble = document.createElement('span');
    bubble.className = `mood-bubble mood-${mood.toLowerCase()}`;
    bubble.textContent = mood;
    moodBubbles.appendChild(bubble);
  });
  
  // Display movie
  document.getElementById('movieTitle').textContent = `${movieData.title} (${movieData.year})`;
  document.getElementById('movieDesc').textContent = movieData.description;
  document.getElementById('movieWhy').textContent = movieData.reason;
  
  // Show result section
  document.getElementById('result').classList.remove('hidden');
  
  // Save to history
  await saveToHistory(moods.join(', '), movieData);
  
  // Get trailer
  try {
    const trailerResponse = await apiCall(`/youtube-trailer?movieTitle=${encodeURIComponent(movieData.title)}`);
    if (trailerResponse.videoId) {
      showTrailer(trailerResponse.videoId);
    }
  } catch (error) {
    console.error('Trailer error:', error);
  }
  
  setupMoodChart();
}

// Show Trailer
function showTrailer(videoId) {
  if (!videoId) {
    return;
  }

  const container = document.getElementById('trailerContainer');
  const iframe = document.getElementById('ytTrailer');

  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
  container.classList.remove('hidden');
}

// Save to History
async function saveToHistory(mood, movieData) {
  try {
    await apiCall('/save-history', {
      method: 'POST',
      body: JSON.stringify({ mood, movieData })
    });
    
    // Also save to localStorage for immediate display
    const user = auth.currentUser;
    if (user) {
      const userId = user.uid;
      const historyKey = `moodHistory_${userId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || "[]");

      const newEntry = {
        date: new Date().toLocaleString(),
        mood: mood,
        movie: movieData.title,
        description: movieData.description,
        why: movieData.reason
      };

      history.unshift(newEntry);
      if (history.length > 10) history.pop();

      localStorage.setItem(historyKey, JSON.stringify(history));
      displayHistory();
    }
  } catch (error) {
    console.error('Save history error:', error);
  }
}

// Display History
function displayHistory() {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const historyKey = `moodHistory_${userId}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
  const container = document.getElementById("historyList");

  if (history.length === 0) {
    container.innerHTML = `<tr><td colspan="4">No history yet!</td></tr>`;
    return;
  }

  container.innerHTML = history.map(entry => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.mood}</td>
      <td>${entry.movie}</td>
      <td>${Math.floor(Math.random() * 5) + 5}/10</td>
    </tr>
  `).join("");
}

// Setup Mood Chart
function setupMoodChart() {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const historyKey = `moodHistory_${userId}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
  const ctx = document.getElementById('moodChart').getContext('2d');

  // Destroy previous chart if exists
  if (moodChart) {
    moodChart.destroy();
  }

  if (history.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
    ctx.font = '16px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText('No mood data yet!', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  // Count moods
  const moodCounts = {};
  history.forEach(entry => {
    const moods = entry.mood.split(',').map(m => m.trim());
    moods.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
  });

  const labels = Object.keys(moodCounts);
  const data = Object.values(moodCounts);
  const colors = labels.map(() => getRandomColor());

  moodChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
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
            color: getComputedStyle(document.documentElement).getPropertyValue('--text'),
            font: {
              family: 'Poppins',
              size: 12
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true
      }
    }
  });
}

// Create Confetti
function createConfetti() {
  const confettiContainer = document.getElementById('confetti');
  confettiContainer.innerHTML = '';

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'absolute';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = getRandomColor();
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';
    confetti.style.borderRadius = '50%';
    confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
    confettiContainer.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }
}

// Get Random Color
function getRandomColor() {
  const colors = ['#6c5ce7', '#00b894', '#fd79a8', '#fdcb6e', '#a29bfe', '#55efc4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Surprise Me Function
async function surpriseMe() {
  try {
    // Show loading state
    const surpriseBtn = document.getElementById('surpriseBtn');
    const originalText = surpriseBtn.innerHTML;
    surpriseBtn.innerHTML = '<span class="btn-icon">🎲</span><span class="btn-text">Surprising...</span>';
    surpriseBtn.disabled = true;

    // Add surprise effect
    surpriseBtn.classList.add('surprise-effect');

    const response = await apiCall('/surprise-me', {
      method: 'POST'
    });

    const movieData = response.movieData;

    // Display surprise movie
    document.getElementById('movieTitle').textContent = `${movieData.title} (${movieData.year})`;
    document.getElementById('movieDesc').textContent = movieData.description;
    document.getElementById('movieWhy').textContent = movieData.reason;

    // Show result section
    document.getElementById('result').classList.remove('hidden');

    // Add surprise reveal effect
    const movieCard = document.querySelector('.movie-card');
    movieCard.classList.add('surprise-reveal');

    // Get trailer
    try {
      const trailerResponse = await apiCall(`/youtube-trailer?movieTitle=${encodeURIComponent(movieData.title)}`);
      if (trailerResponse.videoId) {
        showTrailer(trailerResponse.videoId);
      }
    } catch (error) {
      console.error('Trailer error:', error);
    }

    // Create confetti
    createConfetti();

    // Save to history
    await saveToHistory('Surprise', movieData);
    setupMoodChart();

  } catch (error) {
    console.error('Surprise error:', error);
    alert('Sorry, something went wrong with the surprise!');
  } finally {
    // Reset button
    const surpriseBtn = document.getElementById('surpriseBtn');
    surpriseBtn.innerHTML = '<span class="btn-icon">🎲</span><span class="btn-text">Surprise Me</span>';
    surpriseBtn.disabled = false;
    surpriseBtn.classList.remove('surprise-effect');
  }
}

// Show Profile
function showProfile() {
  const user = auth.currentUser;
  if (!user) return;

  // Create profile modal
  const modal = document.createElement('div');
  modal.className = 'profile-modal';
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  modal.style.visibility = 'hidden';

  modal.innerHTML = `
    <div class="profile-container">
      <button class="close-btn" onclick="this.closest('.profile-modal').remove()">×</button>
      <div class="profile-header">
        <div class="profile-avatar">${user.email ? user.email[0].toUpperCase() : 'U'}</div>
        <div class="profile-info">
          <h2>${user.displayName || user.email}</h2>
          <p>${user.email}</p>
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat-card">
          <span class="stat-value" id="totalMovies">0</span>
          <span class="stat-label">Movies Watched</span>
        </div>
        <div class="stat-card">
          <span class="stat-value" id="favoriteMood">-</span>
          <span class="stat-label">Favorite Mood</span>
        </div>
        <div class="stat-card">
          <span class="stat-value" id="avgScore">0</span>
          <span class="stat-label">Avg Score</span>
        </div>
      </div>
      <div class="mood-frequency-list" id="moodFrequency">
        <!-- Mood frequency will be populated here -->
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Animate in
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
  }, 10);

  // Load profile stats
  loadProfileStats(user.uid);
}

// Load Profile Stats
function loadProfileStats(userId) {
  const historyKey = `moodHistory_${userId}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || "[]");

  // Update stats
  document.getElementById('totalMovies').textContent = history.length;

  // Calculate favorite mood
  const moodCounts = {};
  history.forEach(entry => {
    const moods = entry.mood.split(',').map(m => m.trim());
    moods.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
  });

  const favoriteMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b, 'None');
  
  document.getElementById('favoriteMood').textContent = favoriteMood;

  // Calculate average score
  const avgScore = history.length > 0 ? 
    Math.round(history.reduce((sum, entry) => sum + (Math.floor(Math.random() * 5) + 5), 0) / history.length) : 0;
  document.getElementById('avgScore').textContent = avgScore;

  // Display mood frequency
  const moodFrequency = document.getElementById('moodFrequency');
  if (Object.keys(moodCounts).length === 0) {
    moodFrequency.innerHTML = '<p>No mood data yet!</p>';
  } else {
    moodFrequency.innerHTML = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([mood, count]) => `
        <div class="mood-frequency-item">
          <span class="mood-frequency-name">${mood}</span>
          <span class="mood-frequency-count">${count}</span>
        </div>
      `).join('');
  }
}

// Add CSS for fall animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
  
  .surprise-effect {
    animation: shake 0.5s ease-in-out;
  }
  
  .surprise-reveal {
    animation: bounce 0.6s ease-out;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
  }
  
  .profile-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    transition: all 0.3s ease;
  }
  
  .profile-container {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    transform: translateY(20px);
    transition: all 0.3s ease;
    box-shadow: var(--shadow);
  }
  
  .profile-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 1rem;
    color: white;
  }
  
  .profile-info h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .profile-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: var(--light);
    padding: 1rem;
    border-radius: 10px;
    text-align: center;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
    display: block;
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: var(--text);
    opacity: 0.8;
  }
  
  .mood-frequency-list {
    margin-top: 1rem;
  }
  
  .mood-frequency-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(108, 92, 231, 0.1);
  }
  
  .mood-frequency-name {
    font-weight: 600;
    color: var(--text);
  }
  
  .mood-frequency-count {
    background: var(--primary);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }
`;
document.head.appendChild(style);
