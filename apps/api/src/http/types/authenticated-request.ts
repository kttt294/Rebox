export type Actor = { id: string; aal?: "aal1" | "aal2" };

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  header(name: string): string | undefined;
  method: string;
  path: string;
  route?: { path?: string };
  actor?: Actor;
  requestId?: string;
};
