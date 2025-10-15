# MoodMatcher 
MoodMatcher is a web app that analyzes your mood and recommends a movie based on how you feel. It uses a Node.js/Express backend, a modern HTML/CSS/JS frontend, and integrates with Groq and Firebase for authentication and AI-powered recommendations.
- Maintainer: [Sarah Kazi](https://github.com/Sarah-Kazi)

## Features

-   **AI Mood Analysis**: Uses Groq's Llama-3.3 model to interpret your text input and identify key emotions like Happy, Sad, Anxious, and more.
-   **Personalized Recommendations**: Get movie suggestions (Hollywood or Bollywood) tailored to your mood, complete with a description and a reason for the match.
-   **"Surprise Me" Mode**: Feeling adventurous? Get a completely random and unexpected movie recommendation with a single click.
-   **Voice Input**: Speak your mood directly into the app using your browser's built-in speech recognition capabilities.
-   **User Authentication**: Secure sign-up and login with email/password or Google, powered by Firebase.
-   **Mood History & Trends**: Track your past moods and view your emotional trends over time with an interactive doughnut chart.
-   **Movie Trailers**: Instantly watch the official movie trailer directly within the app, fetched from the YouTube API.
-   **User Profile**: View your personal stats, including total movies watched and your most frequent moods.
-   **Modern UI**: A sleek, responsive, and animated user interface with both light and dark themes.

## Tech Stack

-   **Frontend**: HTML5, CSS3, Vanilla JavaScript
-   **Backend**: Node.js, Express.js
-   **AI**: Groq API (`llama-3.3-70b-versatile` model)
-   **Authentication**: Firebase Authentication
-   **APIs**: YouTube Data API
-   **Libraries**: Chart.js for data visualization

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js and npm installed on your machine.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/sarah-kazi/mood_movie.git
    cd mood_movie
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory by copying the example file:
    ```sh
    cp .env.example .env
    ```
    Now, open the `.env` file and add your secret keys and configuration values. You will need API keys/credentials for:
    -   Groq API
    -   Firebase (for authentication)
    -   YouTube Data API

    ```dotenv
    # .env
    GROQ_API_KEY=your-groq-api-key-here
    
    FIREBASE_PROJECT_ID=your_firebase_project_id
    FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
    FIREBASE_CLIENT_EMAIL=your_firebase_client_email
    FIREBASE_CLIENT_ID=your_firebase_client_id
    # ... other Firebase variables from .env.example
    
    YOUTUBE_API_KEY=your_youtube_api_key_here
    
    PORT=3000
    ```
    Create a `firebaseconfig.js` file in the public directory by copying the below format:
    ```js
    // Replace with your own Firebase config
     const firebaseConfig = {
       apiKey: "",
       authDomain: "",
       projectId: "",
       storageBucket: "",
       messagingSenderId: "",
       appId: "",
       measurementId: ""
     };
     export default firebaseConfig;
    ```

### Running the Application

You have a few options to run the server, based on the scripts in `package.json`:

-   **Demo Mode (No API Keys Required):**
    This script runs a demo version of the application.
    ```sh
    npm run quick
    ```

-   **Development Mode:**
    This command starts the server using `nodemon`, which will automatically restart the server whenever you make changes to the code.
    ```sh
    npm run dev
    ```

-   **Production Mode:**
    This command starts the server in a standard way.
    ```sh
    npm start
    ```

Once the server is running, open your browser and navigate to `http://localhost:3000`.
- Check out [CONTRIBUTING.md](CONTRIBUTING.md) for details regarding how to contribute to each module.

## API Endpoints

The backend server provides the following RESTful API endpoints, which are protected by Firebase authentication.

| Method | Endpoint                    | Description                                       |
| :----- | :-------------------------- | :------------------------------------------------ |
| `POST` | `/api/analyze-mood`         | Analyzes user text to determine primary moods.    |
| `POST` | `/api/recommend-movie`      | Recommends a movie based on user text and mood.   |
| `POST` | `/api/surprise-me`          | Recommends a completely random movie.             |
| `GET`  | `/api/youtube-trailer`      | Fetches a YouTube trailer ID for a given title.   |
| `POST` | `/api/save-history`         | Saves a user's mood and movie choice.             |
| `GET`  | `/api/history`              | Retrieves a user's movie recommendation history.  |
| `GET`  | `/api/health`               | Health check endpoint to confirm server is running. |

## License
This project is licensed under the [MIT License](./LICENSE).

