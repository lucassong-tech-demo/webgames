export type StartGameResponse = Readonly<{
  sessionId: string;
  seed: number;
  engineVersion: number;
  expiresAt: string;
}>;
