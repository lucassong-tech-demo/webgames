export type FinishGameRequest = Readonly<{
  sessionId: string;
  playerName: string;
  score: number;
}>;

export type FinishGameResponse = Readonly<{
  finalScore: number;
  qualifiedForLeaderboard: boolean;
}>;
