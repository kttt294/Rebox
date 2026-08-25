export type Actor = { id: string };

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  header(name: string): string | undefined;
  method: string;
  path: string;
  route?: { path?: string };
  actor?: Actor;
  requestId?: string;
};
