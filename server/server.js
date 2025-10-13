const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
console.log(__dirname);

// Import Firebase Admin
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({
  origin: [
    "http://localhost:5500", 
    "http://127.0.0.1:5500",
    "https://mood-movie-d0jh.onrender.com", 
    "https://mood-movie.onrender.com"
  ], 
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
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

// Groq chat completion function
async function getGroqChatCompletion(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

app.get('/api/firebase-config', (req, res) => {
  // Only provide public Firebase config parameters
  const clientFirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
  
  res.json(clientFirebaseConfig);
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Analyze mood endpoint
app.post('/api/analyze-mood', authenticateUser, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Analyze the following text and identify the primary emotions expressed. 
    Choose from: Happy, Sad, Angry, Excited, Romantic, Scared, Neutral, Anxious, Peaceful, Confused.
    Respond ONLY with a comma-separated list of emotions in order of prominence. 
    Text: "${text}"`;

    const response = await getGroqChatCompletion([{ role: "user", content: prompt }]);
    const moods = response.split(',').map(mood => mood.trim());

    res.json({ moods });
  } catch (error) {
    console.error('Mood analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
});

// Get movie recommendation endpoint
app.post('/api/recommend-movie', authenticateUser, async (req, res) => {
  try {
    const { text, moods } = req.body;
    if (!text || !moods) {
      return res.status(400).json({ error: 'Text and moods are required' });
    }

    const primaryMood = moods[0];
    const isSurprise = text.includes("Surprise me") || text.includes("can't decide");

    const prompt = isSurprise
      ? `Recommend an unexpected or lesser-known ${primaryMood.toLowerCase()} movie. 
         Format your response EXACTLY like this:
         Title: [Movie Title]
         Year: [Release Year]
         Reason: [1-2 sentences why this is a delightful surprise]
         Description: [Brief 1-2 sentence movie description]
         YouTube: [Optional YouTube trailer ID]`
      : `Recommend a random hollywood or bollywood movie based on this text: "${text}". 
         Format your response EXACTLY like this:
         Title: [Movie Title]
         Year: [Release Year]
         Reason: [1-2 sentences why this matches their mood]
         Description: [Brief 1-2 sentence movie description]
         YouTube: [Optional YouTube trailer ID]`;

    const response = await getGroqChatCompletion([{ role: "user", content: prompt }]);

    // Parse the response
    const lines = response.split('\n');
    const movieData = {};

    lines.forEach(line => {
      if (line.startsWith('Title:')) movieData.title = line.replace('Title:', '').trim();
      if (line.startsWith('Year:')) movieData.year = line.replace('Year:', '').trim();
      if (line.startsWith('Reason:')) movieData.reason = line.replace('Reason:', '').trim();
      if (line.startsWith('Description:')) movieData.description = line.replace('Description:', '').trim();
      if (line.startsWith('YouTube:')) movieData.youtubeId = line.replace('YouTube:', '').trim();
    });

    res.json({ movieData });
  } catch (error) {
    console.error('Movie recommendation error:', error);
    res.status(500).json({ error: 'Failed to get movie recommendation' });
  }
});

// Get YouTube trailer endpoint
app.get('/api/youtube-trailer', authenticateUser, async (req, res) => {
  try {
    const { movieTitle } = req.query;
    
    if (!movieTitle) {
      return res.status(400).json({ error: 'Movie title is required' });
    }

    const query = `${movieTitle} movie official trailer`;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_API_KEY}&maxResults=1`
    );
    
    const data = await response.json();
    const videoId = data.items?.[0]?.id?.videoId || null;

    res.json({ videoId });
  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({ error: 'Failed to get trailer' });
  }
});

// Save to history endpoint
app.post('/api/save-history', authenticateUser, async (req, res) => {
  try {
    const { mood, movieData } = req.body;
    const userId = req.user.uid;

    // In a real app, you'd save this to a database
    // For now, we'll just return success
    console.log(`Saving history for user ${userId}:`, { mood, movieData });

    res.json({ success: true, message: 'History saved' });
  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({ error: 'Failed to save history' });
  }
});

// Get history endpoint
app.get('/api/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // In a real app, you'd fetch this from a database
    // For now, we'll return empty array
    const history = [];

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Surprise me endpoint
app.post('/api/surprise-me', authenticateUser, async (req, res) => {
  try {
    const prompt = `Recommend a completely random, unexpected movie that could be from any genre, era, or country. 
    Make it something surprising and delightful. 
    Format your response EXACTLY like this:
    Title: [Movie Title]
    Year: [Release Year]
    Reason: [1-2 sentences why this is a delightful surprise]
    Description: [Brief 1-2 sentence movie description]
    YouTube: [Optional YouTube trailer ID]`;

    const response = await getGroqChatCompletion([{ role: "user", content: prompt }]);
    
    // Parse the response
    const lines = response.split('\n');
    const movieData = {};
    
    lines.forEach(line => {
      if (line.startsWith('Title:')) movieData.title = line.replace('Title:', '').trim();
      if (line.startsWith('Year:')) movieData.year = line.replace('Year:', '').trim();
      if (line.startsWith('Reason:')) movieData.reason = line.replace('Reason:', '').trim();
      if (line.startsWith('Description:')) movieData.description = line.replace('Description:', '').trim();
      if (line.startsWith('YouTube:')) movieData.youtubeId = line.replace('YouTube:', '').trim();
    });

    res.json({ movieData });
  } catch (error) {
    console.error('Surprise me error:', error);
    res.status(500).json({ error: 'Failed to get surprise recommendation' });
  }
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Mood movie running!")
});