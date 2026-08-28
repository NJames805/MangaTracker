BASE_URL: http://localhost:5000/api/v1

ERROR FORMAT (all endpoints):
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query parameter required",
    "status": 400
  }
}

---

ENDPOINT: Search Manga
GET /api/v1/search
Query params:
  - query (required, string)
  - limit (optional, int, default 10)
  - offset (optional, int, default 0)

Response (200):
{
  "data": [
    {
      "id": "e1234567-890a-bcde-f123-456789abcdef",
      "title": "Attack on Titan",
      "description": "Humanity fights for survival...",
      "coverUrl": "https://...",
      "rating": 8.5,
      "genres": ["action", "dark", "supernatural"],
      "status": "ongoing"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0
  }
}

Errors:
  - 400: Missing query parameter
  - 500: MangaDex API failure

---

ENDPOINT: Get User Library
GET /api/v1/library
Query params:
  - status (optional, "reading" | "completed" | "dropped")
  - limit (optional, int, default 20)
  - offset (optional, int, default 0)

Response (200):
{
  "data": [
    {
      "id": "prog-uuid-123",
      "manga": {
        "id": "manga-uuid-456",
        "title": "Attack on Titan",
        "coverUrl": "https://..."
      },
      "chaptersRead": 50,
      "volumesRead": 5,
      "status": "reading",
      "dateAdded": "2024-08-25T10:30:00Z",
      "lastUpdated": "2024-08-28T14:22:00Z"
    }
  ],
  "pagination": { "total": 12, "limit": 20, "offset": 0 }
}

Errors:
  - 500: Database failure

---

ENDPOINT: Add to Library
POST /api/v1/library
Body:
{
  "mangaId": "manga-uuid-123",
  "status": "reading",
  "chaptersRead": 0
}

Response (201):
{
  "data": {
    "id": "prog-uuid-999",
    "manga": { "id": "manga-uuid-123", "title": "...", ... },
    "chaptersRead": 0,
    "status": "reading",
    "dateAdded": "2024-08-28T15:00:00Z",
    "lastUpdated": "2024-08-28T15:00:00Z"
  }
}

Errors:
  - 400: Invalid mangaId or status
  - 409: Already in library
  - 500: Database failure

---

ENDPOINT: Update Progress
PATCH /api/v1/library/:progressId
Body:
{
  "chaptersRead": 75,
  "status": "reading"
}

Response (200):
{
  "data": { ...updated progress object... }
}

Errors:
  - 404: Progress entry not found
  - 400: Invalid update data
  - 500: Database failure

---

ENDPOINT: Get Recommendations
POST /api/v1/recommendations
Body:
{
  "libraryIds": ["manga-uuid-1", "manga-uuid-2", "manga-uuid-3"]
}

Response (200):
{
  "data": {
    "recommendations": [
      {
        "id": "manga-uuid-999",
        "title": "Jujutsu Kaisen",
        "reason": "Similar dark action tone to Attack on Titan",
        "coverUrl": "https://...",
        "rating": 8.7
      },
      {
        "id": "manga-uuid-888",
        "title": "Demon Slayer",
        "reason": "Strong character development and stunning fight choreography",
        "coverUrl": "https://...",
        "rating": 8.2
      }
    ]
  }
}

Errors:
  - 400: Empty libraryIds
  - 500: Claude API failure, database failure