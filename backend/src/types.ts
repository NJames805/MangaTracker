// MangaDex API response types
export interface MangaDexSearchResponse {
    result: "ok" | "error";
    response: "collection" | "entity" | "manga_collection";
    data: MangaDexManga[];
  }
  
  export interface MangaDexManga {
    id: string;
    type: "manga";
    attributes: {
      title: Record<string, string>; // { "en": "Attack on Titan", "ja": "...", etc }
      altTitles?: Array<Record<string, string>>;
      description?: Record<string, string>;
      status: "ongoing" | "completed" | "hiatus" | "cancelled";
      year?: number | null;
      contentRating: "safe" | "suggestive" | "erotica" | "pornographic";
      publicationDemographic?: string;
      tags: MangaDexTag[];
      lastChapter?: string;
      lastVolume?: string;
      createdAt: string;
      updatedAt: string;
    };
    relationships?: Array<{
      id: string;
      type: string;
      attributes?: {
        fileName?: string;
      };
    }>;
  }
  
  export interface MangaDexTag {
    id: string;
    type: "tag";
    attributes: {
      name: Record<string, string>;
      group: "genre" | "theme" | "format" | "demographic";
    };
  }

  export interface MangaDexEntityResponse {
    result: "ok" | "error";
    data: MangaDexManga;
  }

  // Only the chapter fields we use.
  export interface MangaDexChapter {
    id: string;
    attributes: {
      chapter: string | null;
      volume: string | null;
      title: string | null;
      pages: number;
      externalUrl: string | null;
    };
    relationships: Array<{
      id: string;
      type: string;
      attributes?: {
        name?: string;
      };
    }>;
  }

  export interface MangaDexChapterFeedResponse {
    data: MangaDexChapter[];
    total: number;
  }

  export interface MangaDexAtHomeResponse {
    baseUrl: string;
    chapter: {
      hash: string;
      data: string[];
      dataSaver: string[];
    };
  }
  
  // Your simplified types (what your API returns to frontend)
  export interface Manga {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    rating?: number;
    genres: string[];
    status: "ongoing" | "completed" | "hiatus" | "cancelled";
    year?: number;
  }

  // A chapter that can be read in the app (hosted on MangaDex, English).
  export interface Chapter {
    id: string;
    chapter: string | null;
    volume: string | null;
    title: string | null;
    pages: number;
    group: string | null;
  }

  export type PageQuality = "data" | "data-saver";

  // A Manga plus Claude's explanation of why it was recommended.
  export interface Recommendation extends Manga {
    reason: string;
  }

  export interface ReadingProgress {
    id: string;
    mangaId: string;
    title: string;
    description?: string;
    coverUrl?: string;
    genres: string[];
    mangaStatus: "ongoing" | "completed" | "hiatus" | "cancelled";
    year?: number;
    chaptersRead: number;
    volumesRead: number;
    readingStatus: "reading" | "completed" | "dropped";
    dateAdded: string;
    lastUpdated: string;
  }
  
  // API Response wrapper
  export interface ApiResponse<T> {
    data: T;
  }
  
  export interface ApiErrorResponse {
    error: {
      code: string;
      message: string;
      status: number;
    };
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }