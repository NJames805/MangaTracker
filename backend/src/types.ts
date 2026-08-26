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
      year?: number;
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
  
  export interface ReadingProgress {
    id: string;
    mangaId: string;
    chaptersRead: number;
    volumesRead: number;
    status: "reading" | "completed" | "dropped";
    dateAdded: Date;
    lastUpdated: Date;
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