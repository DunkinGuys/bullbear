export function shouldRefreshAuth(apiKey: string | null, hasAgent: boolean): boolean {
  return Boolean(apiKey) && !hasAgent;
}
