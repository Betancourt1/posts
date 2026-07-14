/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    GITHUB_TOKEN: string;
    GITHUB_WEBHOOK_SECRET: string;
    GITHUB_USERNAME?: string;
    ARE_NA_API_KEY_RW?: string;
    ARENA_ACCESS_TOKEN?: string;
    ARENA_ASSET_ORIGIN?: string;
    CF_ACCESS_DOMAIN: string;
    CF_ACCESS_AUD: string;
    AUTHOR_EMAIL: string;
  }
}
