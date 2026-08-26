# MangaTracker

A full-stack web application to track manga you've read and get personalized recommendations powered by Claude AI.

## Overview

MangaTracker lets you:
- Search and add manga to your personal library (via MangaDex API)
- Track reading progress (chapters/volumes read, status)
- Get AI-powered recommendations based on your reading history
- View your manga library in one place

Built as a warmup project for Accenture Forward Deployed Engineer role. Exercises full-stack development, external API integration, LLM prompt design, and deployment.

## Features

- ✅ Search manga from MangaDex (real data, no mocking)
- ✅ Persistent library (save manga to database)
- ✅ Track reading progress (chapters read, completion status)
- ✅ Claude API recommendations ("Based on what you've read, you should try...")
- ✅ Deployed frontend + backend (Vercel + Railway)
- ✅ Responsive UI (works on desktop + mobile)

## Tech Stack

**Frontend:**
- Next.js (React + TypeScript)
- TailwindCSS (styling)
- Deployed on Vercel

**Backend:**
- Node.js + Express
- TypeScript
- Deployed on Railway

**Database:**
- Supabase (PostgreSQL hosted)

**External APIs:**
- MangaDex API (manga data)
- Anthropic Claude API (recommendations)

## Architecture

```
┌─────────────────────────────────────┐
│   MangaTracker Frontend (Vercel)    │
│   - Search UI                       │
│   - Library Dashboard               │
│   - Recommendation Display          │
└─────────────────┬───────────────────┘
                  │ API calls
┌─────────────────▼───────────────────┐
│   Node.js Backend (Railway)         │
│   - GET /api/search                 │
│   - POST /api/library               │
│   - GET /api/library                │
│   - PATCH /api/library/:id          │
│   - POST /api/recommend             │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
    ┌───▼──┐ ┌───▼──┐  ┌───▼──┐
    │Supabase│MangaDex│Claude │
    │  DB   │  API   │  API   │
    └───────┘ └───────┘ └───────┘
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier is fine)
- Claude API key (from Anthropic)
- Git

### Local Development

1. **Clone repo** (when created)
   ```bash
   git clone <repo-url>
   cd manga-tracker
   ```

2. **Frontend setup**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Add your API URL to .env.local
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

3. **Backend setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add:
   # - DATABASE_URL (from Supabase)
   # - CLAUDE_API_KEY (from Anthropic)
   # - MANGADEX_API_BASE (https://api.mangadex.org)
   npm run dev
   ```
   Backend runs on `http://localhost:5000`

4. **Database**
   - Create Supabase project at https://supabase.com
   - Run migrations (see `backend/db/migrations/`)
   ```bash
   npm run db:migrate
   ```

### Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@host:port/dbname
CLAUDE_API_KEY=sk-ant-...
MANGADEX_API_BASE=https://api.mangadex.org
PORT=5000
NODE_ENV=development
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## API Documentation

### Search Manga
```
GET /api/search?query=attack%20on%20titan
```
**Returns:** Array of manga from MangaDex
```json
[
  {
    "id": "manga-id-123",
    "title": "Attack on Titan",
    "description": "...",
    "coverUrl": "https://...",
    "rating": 8.5,
    "genres": ["action", "dark", "supernatural"]
  }
]
```

### Get Library
```
GET /api/library
```
**Returns:** User's manga library with progress
```json
[
  {
    "id": "progress-id-456",
    "manga": { "id": "123", "title": "Attack on Titan", ... },
    "chaptersRead": 50,
    "volumesRead": 5,
    "status": "reading",
    "dateAdded": "2024-08-25T10:30:00Z"
  }
]
```

### Add to Library
```
POST /api/library
Content-Type: application/json

{
  "mangaId": "manga-id-123",
  "status": "reading"
}
```

### Update Progress
```
PATCH /api/library/:mangaId
Content-Type: application/json

{
  "chaptersRead": 75,
  "status": "reading"
}
```

### Get Recommendations
```
POST /api/recommend
Content-Type: application/json

{
  "libraryIds": ["manga-id-1", "manga-id-2", "manga-id-3"]
}
```
**Returns:** Claude's recommendations
```json
{
  "recommendations": [
    {
      "title": "Jujutsu Kaisen",
      "reason": "Similar dark action tone to Attack on Titan"
    },
    {
      "title": "Demon Slayer",
      "reason": "Strong character development and stunning fight choreography"
    }
  ]
}
```

## Deployment

### Deploy Backend (Railway)
1. Push code to GitHub
2. Connect repo to Railway
3. Add environment variables (DATABASE_URL, CLAUDE_API_KEY)
4. Railway auto-deploys on push

### Deploy Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Add `NEXT_PUBLIC_API_URL` pointing to deployed backend
4. Vercel auto-deploys on push

### Database (Supabase)
- Already hosted, no deployment needed
- Run migrations once

## Project Structure

```
manga-tracker/
├── frontend/                 # Next.js app
│   ├── app/                  # Pages + API routes
│   ├── components/           # React components
│   ├── lib/                  # Utilities, API client
│   └── public/               # Static assets
├── backend/                  # Node.js + Express
│   ├── routes/               # API endpoints
│   ├── controllers/          # Business logic
│   ├── db/                   # Database schemas, migrations
│   ├── services/             # External API calls (MangaDex, Claude)
│   └── middleware/           # Auth, error handling
└── README.md
```

## Development Notes

### Data Model

**Users** (optional — currently single-user)
```
id (UUID)
created_at
```

**Manga**
```
id (MangaDex ID)
title
description
coverUrl
rating
genres (array)
```

**ReadingProgress**
```
id (UUID)
userId (or implicit single user)
mangaId
chaptersRead
volumesRead
status ("reading" | "completed" | "dropped")
dateAdded
lastUpdated
```

### Claude Recommendation Prompt

```
You are a manga recommendation assistant.

User has read these manga:
{list of title, genre, description}

Recommend 3-5 manga they might enjoy based on similar themes, tone, or genre.
Return as JSON: { "recommendations": [ { "title": "...", "reason": "..." } ] }
```

## Next Steps / Nice-to-Haves

- [ ] Multi-user support with authentication
- [ ] Manga ratings/reviews (user can rate what they've read)
- [ ] Advanced recommendations (multi-turn Claude conversation)
- [ ] Social sharing (link to your library)
- [ ] Progress visualization (chart of chapters over time)
- [ ] Mobile app (React Native)

## Timeline

- **Week 1:** Backend + MangaDex + Claude integration
- **Week 2:** Frontend + full UI
- **Week 3:** Deployment + polish

Target completion: Sept 14 (2 days before start date)

## Lessons Learned / Reflections

*To be filled in after completion*
- Architecture decisions made and why
- What went smoothly
- What was harder than expected
- What I'd do differently next time

## Resources

- [MangaDex API Docs](https://mangadex.dev)
- [Claude API Docs](https://docs.anthropic.com)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Express.js Docs](https://expressjs.com)

## License

MIT

---

**Built by:** Nathanael  
**Purpose:** Accenture FDE warmup project  
**Start date:** Sept 16, 2024