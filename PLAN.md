# MangaTracker — Plan for the Rest of the Project

Working plan. Nothing here is built yet. We tick items off as we go.

**Run locally:** `npm run dev` in `backend/` (port 3001) and in `frontend/` (port 3000).

---

## Where we are

Done and on `main`:

- Search, home page "popular" list, and per-user library (Supabase + auth)
- Claude recommendations on `/explore`: auto-load, "Get more", and a cache keyed on a hash of the library (migrations 001–004)
- Backend split into `routes/` and `services/`

Order of the remaining work:

1. **In-app reader**: "Read Now" opens chapter pages inside the app instead of linking to MangaDex
2. **Reading progress**: the library actually tracks chapters read (the reader makes this mostly automatic)
3. **Deploy + cleanup**

---

## Phase 1 — In-app reader ✅ built (not yet committed)

### What MangaDex gives us (tested against the live API, Oct 2026)

- **Chapter list:** we use `GET /manga/{id}/feed?translatedLanguage[]=en&includeExternalUrl=0`, paged 500 at a time, and keep one entry per chapter number ourselves (Berserk: 425 entries → 404 chapters). We don't use `/aggregate`: it also lists chapters that only link out to an official site. For One Piece, all 12 of its English chapters are link-outs, so it would have looked readable and then failed.
- **Pages:** `GET /at-home/server/{chapterId}` returns `baseUrl`, `hash`, and two lists of filenames. A page URL is `{baseUrl}/data/{hash}/{file}` for full quality, or `{baseUrl}/data-saver/{hash}/{file}` for compressed (about 40% smaller).
- **`baseUrl` expires.** MangaDex only guarantees 15 minutes. After that, images return 403 and we have to ask for a new one.
- **Rate limits:** about 5 requests per second per IP overall, and **40 per minute** on the at-home endpoint.
- **Not everything is readable.** Licensed titles often only link out to the official publisher. Of the 20 most-followed titles, **14 have English chapters on MangaDex and 6 have none** (e.g. Frieren, One Punch-Man, Solo Leveling).
- **Images load fine in a plain `<img>` today.** Bytes were identical with or without a third-party `Referer`. But the docs say apps *must* proxy images and that hotlinking "returns wrong content", so this could change.
- **Usage rules:** API requests must send a real, non-spoofed `User-Agent`. For image hosts that aren't `mangadex.org`, MangaDex requires a report to `https://api.mangadex.network/report` (success, bytes, duration). Never send auth headers when fetching images.

### Manga source: MangaDex only (decided)

We stay on MangaDex and accept that some licensed titles can't be read in the app.

- **Rejected: mangahook-api** (github.com/kiraaziz/mangahook-api). It scrapes `ww6.mangakakalot.tv`, an unlicensed repost site, rather than providing real data. That site now serves a JavaScript bot-check page, so the scraper no longer works. The repo hasn't been updated since January 2024 and has no license.
- **Possible later:** MANGA Plus (Shueisha's official free reader) could legally fill some gaps, but it has no public API.

### Decisions (all decided)

| # | Question | Decision |
|---|---|---|
| 1 | How do images reach the browser? | **Straight from MangaDex** in a plain `<img>`. No bandwidth cost to us. Page URLs are built in one backend function (`getChapterPages`), so switching to a backend proxy later is contained. |
| 2 | Reading layout | **Vertical scroll.** Page-by-page can come later. |
| 3 | Image quality | **`data-saver` by default**, with a toggle that's remembered in the browser |
| 4 | Language | **English only** |
| 5 | Title with no readable chapters | **Show "Not available to read here"** |
| 6 | Duplicate translations of a chapter | **First translation in MangaDex's feed order**, with the group credited in the reader. (Changed from "aggregate's pick" once `/aggregate` turned out to include link-outs.) |

### Backend

- [x] `services/mangadex.ts`: real `User-Agent` on every MangaDex request, including search and recommendations
- [x] `GET /manga/:id`: one manga's details
- [x] `GET /manga/:id/chapters`: readable English chapters, deduplicated, sorted numerically `{ id, chapter, volume, title, pages, group }`
- [x] `GET /chapters/:id/pages?quality=data-saver|data&refresh=1`: ready-made page URLs, cached in memory for 10 minutes; `refresh=1` skips the cache
- [x] `POST /report`: forwards image load reports to `api.mangadex.network/report`; only accepts MangaDex@Home hosts
- [x] **Bug fix found along the way:** the library and recommendations routers applied `requireAuth` to *every* request reaching them, so any route mounted after them required a login (an unknown URL returned 401 instead of 404). Both are now scoped to their own paths.

### Frontend

> Next.js in this repo has breaking changes from what most docs describe. Per `frontend/AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing routes. For example, route `params` is a Promise.

- [x] `/manga/[id]`: details page with the chapter list. "Read Now" on every card links here instead of to mangadex.org.
- [x] `/manga/[id]/read/[chapterId]`: the reader. Lazy-loaded pages, previous/next buttons, chapter dropdown, ← → keys, quality toggle, "Scanlated by {group}, via MangaDex" credit.
- [x] Expired image URLs: the reader fetches fresh URLs and remounts the images (fresh URLs are often identical, and a browser won't re-request an unchanged `src`). If they fail again within 30 seconds it shows "Some pages didn't load. Try again".
- [x] "Not available to read here" for titles with no readable English chapters

**Done when:** from a card, I can open a readable title, read a chapter top to bottom, move to the next chapter, and a licensed title shows the "not available" message instead of an empty reader. ✅ Verified in a browser, including forced 403s on images.

**Known limitation:** image load reports send `bytes: 0`. A plain `<img>` doesn't send an `Origin` header, so the image server doesn't send `Timing-Allow-Origin` back and the browser hides the download size. Adding `crossOrigin="anonymous"` would expose real sizes (the server we tested does answer with CORS and timing headers when asked). But any image server that doesn't send them would then fail to load pages entirely, so we're not doing that for now.

---

## Phase 2 — Reading progress

The table already has `chapters_read`, `volumes_read` and `reading_status`, but nothing updates them. There's no update route yet.

- [ ] `PATCH /library/:mangaId`: update `chapters_read`, `reading_status`, and `last_updated`
- [ ] Reader: when you reach the end of a chapter of a manga in your list, save that chapter as read
- [ ] My Manga cards: show progress ("Ch. 42 / 404") and a **Continue reading** button that opens the next unread chapter
- [ ] Status control on My Manga: reading / completed / dropped
- [ ] Decide: should opening a chapter of a manga *not* in your list offer to add it?

---

## Phase 3 — Deploy + cleanup

### Needed to deploy (README plan: frontend on Vercel, backend on Railway)

- [ ] Replace the 7 hardcoded `http://localhost:3001` URLs in the frontend with `NEXT_PUBLIC_API_URL`
- [ ] Move the backend CORS origin (`http://localhost:3000`) into an env var
- [ ] Set env vars on Vercel and Railway; production Supabase URL in Auth settings

### Worth fixing

- [ ] **Card covers are full-size originals**, e.g. Berserk's is a 16 MB PNG. Use MangaDex thumbnails (`{fileName}.512.jpg`) for cards. This is likely the biggest page-load win in the app.
- [ ] **Recommendations fire 10 MangaDex searches at once** (`Promise.all`), which is over the ~5/second limit. Rate-limited lookups are silently dropped, which may be why we sometimes get 9 results instead of 10. Add a small shared rate limiter in `services/mangadex.ts`. (The reader needs it too.)
- [ ] Clean up old cache rows: delete rows past `expires_at` or on an old `PROMPT_VERSION` (manual SQL, or a scheduled job)
- [ ] Rename `frontend/middleware.ts` to `proxy.ts` (Next.js deprecation warning). There's a codemod for it.
- [ ] Delete the empty `frontend/app/api/route.tsx` (it's the one TypeScript error)
- [ ] `npm audit fix` in `backend/` (moderate `qs` vulnerability)
- [ ] Update `frontend/README.md` and `backend/API.md` to match reality. README marks deployment done, and API.md describes routes, ports and response shapes that don't exist.

---

## Risks

- **MangaDex may block direct image loading** (their docs already say to proxy). Mitigation: decision 1's single helper, so switching to a backend proxy is contained.
- **Many popular titles can't be read in-app** because they're licensed. That's a content limit, not a bug. The "not available" state needs to make this clear.
- **Rate limits get tighter with a reader.** Every chapter opened is an at-home call (40/min shared across all users on one server IP). The 10-minute page cache matters more once deployed.
