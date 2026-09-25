/** Optional integrations stay absent until Cloudflare Access and Email Service are provisioned. */
export type RuntimeEnv = Env & {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  EMAIL?: SendEmail;
  CONTACT_FROM?: string;
  CONTACT_TO?: string;
};
