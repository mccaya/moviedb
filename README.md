# CineVault

A beautiful, production-ready personal movie collection manager built with React, TypeScript, and Tailwind CSS. Features AI-powered recommendations, media server integration, and a modern, responsive design.

## ✨ Features

### Core Features
- 🎬 **Movie Search**: Search movies using The Movie Database (TMDB) API
- 📝 **Personal Collection**: Add, remove, and organize your movies
- ✅ **Watch Status**: Mark movies as watched/unwatched
- ⭐ **Personal Ratings**: Rate movies from 1-10
- 🔍 **Advanced Filtering**: Filter by watch status, genre, rating
- 📱 **Responsive Design**: Works perfectly on all devices

### AI-Powered Features
- 🤖 **AI Recommendations**: Get personalized movie suggestions using OpenAI
- 📊 **Collection Analysis**: AI insights about your movie preferences
- 🎯 **Smart Search**: Natural language movie search

### Media Server Integration
- 📡 **Radarr Integration**: Connect to your Radarr instance
- ⬇️ **One-Click Downloads**: Add movies directly to your download queue
- 📊 **Server Status**: Monitor your media server connection

### Import & Export
- 📄 **CSV Import**: Import movies from IMDB lists or CSV files
- 🔄 **Bulk Operations**: Add multiple movies at once
- 📈 **Progress Tracking**: Real-time import progress

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- A Supabase account (free tier available)
- TMDB API key (free)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your API keys:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project
   - `VITE_TMDB_API_KEY` from [TMDB](https://www.themoviedb.org/settings/api)
   - `VITE_OPENAI_API_KEY` from [OpenAI](https://platform.openai.com/api-keys) (optional)

3. **Set up Supabase database**:
   
   **⚠️ CRITICAL FIRST STEP - Disable Email Confirmation:**
   
   Before creating any accounts, you MUST disable email confirmation to prevent signup errors:
   
   1. Go to your Supabase Dashboard → Authentication → Settings
   2. Under "Email Settings", toggle OFF "Enable Email Confirmations"
   3. Click "Save" to apply the changes
   
   **This prevents the "Database error saving new user" error during signup.**
   
   Click the "Connect to Supabase" button in the app, or manually create these tables:

   ```sql
   -- Watchlist items table
   CREATE TABLE watchlist_items (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users NOT NULL,
     tmdb_id INTEGER NOT NULL,
     title TEXT NOT NULL,
     poster_path TEXT,
     overview TEXT,
     release_date DATE,
     rating DECIMAL(3,1),
     genres TEXT[],
     watched BOOLEAN DEFAULT false,
     personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
     added_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(user_id, tmdb_id)
   );

   -- Enable Row Level Security
   ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

   -- Create separate policies for better granular control
   CREATE POLICY "Users can view and update their own watchlist" ON watchlist_items
     FOR SELECT, UPDATE, DELETE USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert their own watchlist items" ON watchlist_items
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🎯 Usage

### Basic Usage
1. **Sign up/Sign in** to create your account
2. **Search for movies** using the search bar
3. **Add movies** to your CineVault by clicking the + button
4. **Mark as watched** and rate movies you've seen
5. **Filter and sort** your collection as it grows

### AI Features
1. **Toggle AI mode** in the search bar (sparkles icon)
2. **Ask natural questions** like "Movies like Inception but funnier"
3. **Get personalized insights** about your movie preferences

### Media Server Integration
1. **Click the server icon** in the bottom right
2. **Configure your Radarr** connection (URL + API key)
3. **Add movies directly** to your download queue

### Import Movies
1. **Click Import** in the header
2. **Upload a CSV file** with movie titles or IMDB IDs
3. **Watch the progress** as movies are automatically added

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **APIs**: TMDB (movies), OpenAI (AI features)
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Deployment**: Vercel/Netlify ready

## 🎨 Design Philosophy

FilmFolio follows Apple-level design aesthetics with:
- **Clean, minimal interface** with thoughtful spacing
- **Smooth animations** and micro-interactions
- **Consistent color system** with proper contrast ratios
- **Responsive design** that works on all screen sizes
- **Intuitive navigation** with clear visual hierarchy

## 🔧 Configuration

### Environment Variables
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_TMDB_API_KEY`: Your TMDB API key (required)
- `VITE_OPENAI_API_KEY`: Your OpenAI API key (optional)

### Media Server Setup
For Radarr integration:
1. Find your Radarr URL (usually `http://localhost:7878`)
2. Get your API key from Settings → General → Security
3. Configure in the app's media server settings

## 📱 Features in Detail

### Search & Discovery
- Real-time movie search with TMDB
- AI-powered recommendations
- Trending movies display
- Genre-based filtering

### Collection Management
- Add/remove movies instantly
- Mark as watched with visual indicators
- Personal rating system (1-10 stars)
- Sort by date added, title, rating, release date

### User Experience
- Smooth hover effects and transitions
- Loading states for all async operations
- Error handling with user-friendly messages
- Keyboard shortcuts and accessibility

### Data & Privacy
- All data stored securely in Supabase
- Row-level security ensures data privacy
- Real-time sync across devices
- Export capabilities for data portability

## 🚀 Deployment

This app is ready for deployment on:
- **Vercel** (recommended)
- **Netlify** 
- **Cloudflare Pages**

Simply connect your repository and set the environment variables in your deployment platform.

## 🤝 Contributing

This is a demonstration project showcasing modern web development practices. Feel free to use it as a starting point for your own movie tracking application!

## 📄 License

MIT License - feel free to use this code for your own projects.

---

Built with ❤️ using React, TypeScript, and modern web technologies.