require('dotenv').config();
const https = require('https');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Import Firebase Admin
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// TMDB & Groq Helper Functions (assuming these are correct and unchanged)
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function getTMDBPoster(title, year) {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    const response = await fetch(url, { agent: httpsAgent });
    if (!response.ok) {
        console.error(`TMDB API error (${response.status})`);
        return null;
    }
    const data = await response.json();
    if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        return movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
    }
    return null;
}

async function getGroqChatCompletion(messages) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages
        })
    });
    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}


// --- API ENDPOINTS ---

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// Analyze mood endpoint
app.post('/api/analyze-mood', authenticateUser, async (req, res) => {
    try {
        const { text } = req.body;
        const prompt = `Analyze the following text and identify primary emotions. Choose from: Happy, Sad, Angry, Excited, Romantic, Scared, Neutral, Anxious, Peaceful. Respond ONLY with a comma-separated list. Text: "${text}"`;
        const response = await getGroqChatCompletion([{ role: "user", content: prompt }]);
        const moods = response.split(',').map(mood => mood.trim());
        res.json({ moods });
    } catch (error) {
        console.error('Mood analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze mood' });
    }
});

// Get movie recommendation endpoint (UPDATED)
app.post('/api/recommend-movie', authenticateUser, async (req, res) => {
    try {
        const { text, moods } = req.body;
        const userId = req.user.uid;

        const historySnapshot = await db.collection('users').doc(userId).collection('watchHistory').get();
        const watchedMovies = historySnapshot.docs.map(doc => doc.data().title);
        const watchedMoviesList = watchedMovies.length > 0 ? watchedMovies.join(', ') : 'None';

        const prompt = `Recommend a random hollywood or bollywood movie based on this text: "${text}". IMPORTANT: DO NOT recommend any of the following movies: ${watchedMoviesList}. Format your response EXACTLY like this:\nTitle: [Movie Title]\nYear: [Release Year]\nReason: [1-2 sentences reason]\nDescription: [1-2 sentence description]`;

        const response = await getGroqChatCompletion([{ role: "user", content: prompt }]);
        const lines = response.split('\n');
        const movieData = {};
        lines.forEach(line => {
            if (line.startsWith('Title:')) movieData.title = line.replace('Title:', '').trim();
            if (line.startsWith('Year:')) movieData.year = line.replace('Year:', '').trim();
            if (line.startsWith('Reason:')) movieData.reason = line.replace('Reason:', '').trim();
            if (line.startsWith('Description:')) movieData.description = line.replace('Description:', '').trim();
        });
        movieData.poster = await getTMDBPoster(movieData.title, movieData.year);
        res.json({ movieData });
    } catch (error) {
        console.error('Movie recommendation error:', error);
        res.status(500).json({ error: 'Failed to get movie recommendation' });
    }
});

// Get YouTube trailer endpoint
app.get('/api/youtube-trailer', authenticateUser, async (req, res) => {
    // ... (This endpoint can remain as is)
});

// --- HISTORY & WATCHLIST ENDPOINTS ---

// Save to watch history (UPDATED)
app.post('/api/save-history', authenticateUser, async (req, res) => {
    try {
        const { mood, movieData } = req.body;
        const userId = req.user.uid;
        const movieId = movieData.title.replace(/[^a-zA-Z0-9]/g, '');
        const userRef = db.collection('users').doc(userId);
        
        await userRef.collection('watchHistory').doc(movieId).set({
            ...movieData,
            mood: mood,
            watchedOn: new Date().toISOString()
        });
        await userRef.collection('watchlist').doc(movieId).delete();
        res.json({ success: true, message: 'History saved.' });
    } catch (error) {
        console.error('Save history error:', error);
        res.status(500).json({ error: 'Failed to save history' });
    }
});

// Get watch history (UPDATED)
app.get('/api/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const historySnapshot = await db.collection('users').doc(userId).collection('watchHistory').orderBy('watchedOn', 'desc').get();
        const history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ history });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Add a movie to the watchlist (NEW)
app.post('/api/watchlist', authenticateUser, async (req, res) => {
    try {
        const { movieData } = req.body;
        const userId = req.user.uid;
        const movieId = movieData.title.replace(/[^a-zA-Z0-9]/g, '');
        await db.collection('users').doc(userId).collection('watchlist').doc(movieId).set({
            ...movieData,
            id: movieId, // Store the ID for easier removal
            addedAt: new Date().toISOString()
        });
        res.status(201).json({ success: true, message: 'Added to watchlist.' });
    } catch (error) {
        console.error('Add watchlist error:', error);
        res.status(500).json({ error: 'Failed to add to watchlist.' });
    }
});

// Get the user's watchlist (NEW)
app.get('/api/watchlist', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const watchlistSnapshot = await db.collection('users').doc(userId).collection('watchlist').orderBy('addedAt', 'desc').get();
        const watchlist = watchlistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ watchlist });
    } catch (error) {
        console.error('Get watchlist error:', error);
        res.status(500).json({ error: 'Failed to get watchlist.' });
    }
});

// Remove a movie from the watchlist (NEW)
app.delete('/api/watchlist/:movieId', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { movieId } = req.params;
        await db.collection('users').doc(userId).collection('watchlist').doc(movieId).delete();
        res.status(200).json({ success: true, message: 'Removed from watchlist.' });
    } catch (error) {
        console.error('Remove watchlist error:', error);
        res.status(500).json({ error: 'Failed to remove from watchlist.' });
    }
});

// Serve the main HTML file for any other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
