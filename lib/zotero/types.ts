export interface ZoteroItem {
  key: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  doi?: string;
  abstract?: string;
  itemType: string;
  url?: string;
  pages?: string;
  volume?: string;
  issue?: string;
}

export interface ZoteroAPIItem {
  key: string;
  data: {
    title: string;
    creators: Array<{
      firstName?: string;
      lastName: string;
      name?: string;
      creatorType: string;
    }>;
    date: string;
    itemType: string;
    publicationTitle?: string;
    journalAbbreviation?: string;
    DOI?: string;
    url?: string;
    abstractNote?: string;
    pages?: string;
    volume?: string;
    issue?: string;
    extra?: string;
  };
}

export interface AppReference {
  id?: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  citation: string;
  doi?: string;
  abstract?: string;
  url?: string;
}

export interface ZoteroSyncResult {
  imported: AppReference[];
  exported: ZoteroItem[];
  conflicts: ConflictItem[];
  error?: string;
}

export interface ConflictItem {
  appReference: AppReference;
  zoteroItem: ZoteroItem;
  reason: string;
}

export interface ZoteroConfig {
  apiKey: string;
  userId: string;
  libraryType?: 'user' | 'group';
  timeout?: number;
  retryAttempts?: number;
}

export interface ZoteroError extends Error {
  status?: number;
  response?: string;
  retryable?: boolean;
}

// Zotero item types
export enum ZoteroItemType {
  JOURNAL_ARTICLE = 'journalArticle',
  BOOK = 'book',
  BOOK_SECTION = 'bookSection',
  CONFERENCE_PAPER = 'conferencePaper',
  THESIS = 'thesis',
  REPORT = 'report',
  WEBPAGE = 'webpage',
  PATENT = 'patent',
  MANUSCRIPT = 'manuscript'
}

// Zotero creator types
export enum ZoteroCreatorType {
  AUTHOR = 'author',
  EDITOR = 'editor',
  TRANSLATOR = 'translator',
  CONTRIBUTOR = 'contributor'
}