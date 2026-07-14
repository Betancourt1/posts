export type Language = "en" | "es";

export interface TagItem {
  label: string;
  slug?: string;
  href?: string;
  count?: number;
}

export interface NavItem {
  title: string;
  href: string;
  section?: string;
  active?: boolean;
  external?: boolean;
}

export interface ArchiveMonth {
  key: string;
  count: number;
}

export interface GraphPost {
  title: string;
  permalink: string;
  tags: string[];
}

export interface GraphData {
  posts: GraphPost[];
  tagLinks: Record<string, string>;
  focusTags?: string[];
}

export interface InfrastructureNode {
  type: "dir" | "file";
  name: string;
  children?: InfrastructureNode[];
  url?: string;
  content?: string;
}

export interface ShellPage {
  section?: string;
  kind?: string;
  layout?: "default" | "books" | "photography" | "code" | "not-found";
  sourcePath?: string | null;
  canonical?: string | null;
  socialImage?: string | null;
  noindex?: boolean;
  isHome?: boolean;
  updatedAt?: string | Date | null;
  graphData?: GraphData | null;
  infrastructureTree?: InfrastructureNode | null;
}

export interface ContentListItem {
  title: string;
  href: string;
  date?: string | Date | null;
  summary?: string | null;
  summaryHtml?: string | null;
  tags?: TagItem[];
  section?: string;
  hidden?: boolean;
}

export interface BookItem extends ContentListItem {
  author?: string | null;
  status?: "currently-reading" | "read" | "to-read" | string | null;
  progress?: number | null;
  rating?: number | string | null;
  review?: string | null;
}

export interface PhotoItem extends ContentListItem {
  image?: string | null;
  thumbnail?: string | null;
  imageAlt?: string | null;
  caption?: string | null;
  imageCount?: number;
  width?: number;
  height?: number;
}

export interface PhotoImage {
  src: string;
  alt?: string | null;
  caption?: string | null;
}

export interface CodeProject extends ContentListItem {
  shortTitle?: string | null;
  technologies?: string[];
  private?: boolean;
}

export interface GithubMonth {
  column: number;
  label?: string;
  en?: string;
  es?: string;
}

export interface GithubSnapshot {
  username: string;
  profileUrl: string;
  snapshotEnd?: string;
  weekCount?: number;
  levels?: string;
  months?: GithubMonth[];
}

export interface ArchiveItem extends ContentListItem {
  section: string;
}

export interface BacklinkItem {
  title: string;
  href: string;
  date?: string | Date | null;
}
