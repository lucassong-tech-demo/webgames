"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  createRecordedGame,
  recordedGameReducer,
} from "@/lib/game/client/recorded-game";
import {
  BOARD_SIZE,
  type Direction,
} from "@/lib/game/engine";

type SaveStatus = {
  isSaving: boolean;
  error: string | null;
};

type LeaderboardEntry = {
  player_name: string;
  score: number;
};


const CELL_SIZE = 20;
const CANVAS_SIZE = BOARD_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150;
const SPEED_MULTIPLIER = 0.5;
const MIN_SPEED = 50;  // 最快速度
const MAX_SPEED = 300; // 最慢速度

function createLocalSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] & 0x7fffffff;
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 修改 gameLoopRef 的定义，提供 null 作为初始值
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const scoreSubmissionLockedRef = useRef(false);
  const [recordedGame, dispatchGame] = useReducer(
    recordedGameReducer,
    undefined,
    () => createRecordedGame(createLocalSeed()),
  );
  const { game } = recordedGame;
  const { snake, food, score, gameOver } = game;
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ isSaving: false, error: null });
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLeaderboardError(null);
      const response = await fetch('/api/scores', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load leaderboard');
      }

      setLeaderboard(data.scores);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboardError('Unable to load leaderboard');
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, []);
 
  // 添加处理输入的函数
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
  };

  // 移动蛇
  const moveSnake = useCallback(() => {
    dispatchGame({ type: 'advance' });
  }, []);

  // 绘制游戏
  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    // 清空画布
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 绘制网格
    ctx.strokeStyle = '#ddd';
    for (let i = 0; i < CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // 绘制蛇
    ctx.fillStyle = '#4CAF50';
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;
      ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
      // 绘制蛇头
      if (index === 0) {
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    });

    // 绘制食物
    if (food) {
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }, [snake, food]);

  // 键盘控制
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const keyDirections: Record<string, Direction> = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT'
    };

    const newDirection = keyDirections[event.key];
    if (!newDirection) return;

    dispatchGame({ type: 'change-direction', direction: newDirection });
    event.preventDefault();
  }, []);

  // 添加保存分数的函数
  const saveScore = async () => {
    const normalizedPlayerName = playerName.trim();
    if (
      !normalizedPlayerName ||
      countdown === 0 ||
      hasSubmittedScore ||
      scoreSubmissionLockedRef.current
    ) return;

    scoreSubmissionLockedRef.current = true;
    
    try {
      setSaveStatus({ isSaving: true, error: null });
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: normalizedPlayerName,
          score,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        scoreSubmissionLockedRef.current = false;
        setSaveStatus({
          isSaving: false,
          error: data.error || 'Failed to save score',
        });
        return;
      }

      setSaveStatus({ isSaving: false, error: null });
      setHasSubmittedScore(true);
      await loadLeaderboard();
      alert('Score saved successfully!');
    } catch (error) {
      console.error('Error saving score:', error);
      scoreSubmissionLockedRef.current = false;
      setSaveStatus({ 
        isSaving: false, 
        error: 'Failed to save score' 
      });
    }
  };

  // 重置游戏
  const resetGame = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    dispatchGame({ type: 'reset', seed: createLocalSeed() });
    setPlayerName('');
    setHasSubmittedScore(false);
    setSaveStatus({ isSaving: false, error: null });
    scoreSubmissionLockedRef.current = false;

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(10);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);


  const handleSpeedChange = useCallback((type: 'increase' | 'decrease') => {
    setSpeed(currentSpeed => {
      const newSpeed = type === 'increase' 
        ? currentSpeed * (1 - SPEED_MULTIPLIER)  // 加速（减少间隔时间）
        : currentSpeed * (1 + SPEED_MULTIPLIER); // 减速（增加间隔时间）
      
      // 确保速度在合理范围内
      return Math.min(Math.max(newSpeed, MIN_SPEED), MAX_SPEED);
    });
  }, []);

  // 绘制最新的确定性游戏状态
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGame(ctx);
  }, [drawGame]);

  // 初始化键盘控制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.focus();
    canvas.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 游戏循环只推进引擎 tick；绘制由独立 effect 处理
  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      moveSnake();
    }, speed);

    gameLoopRef.current = gameLoop;

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameOver, moveSnake, speed]);

  useEffect(() => {
    if (!gameOver) return;

    setCountdown(10);
    countdownRef.current = setInterval(() => {
      setCountdown(currentCountdown => {
        if (currentCountdown <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }

        return currentCountdown - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [gameOver]);
  
  // 在 return 语句前添加错误检查
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reload Game
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      
      
      {/* 使用 flex row 来并排放置游戏和控制按钮 */}
      <div className="flex w-full flex-col items-center justify-center gap-6 lg:flex-row lg:items-start">
       
        {/* 游戏主区域 */}
        <div className="flex w-full max-w-[400px] flex-col items-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Snake Game</h1>
          <div className="text-2xl font-semibold text-gray-700 mb-4">Score: {score}</div>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="h-auto max-w-full border-4 border-gray-300 rounded-lg shadow-lg bg-white focus:outline-none"
            tabIndex={0}
          />
        </div>

        <div className="flex w-full max-w-[400px] flex-col gap-6 lg:w-60">
          {/* 右侧速度控制区域 */}
          <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700 text-center">Speed</h3>
            <button
              onClick={() => handleSpeedChange('increase')}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                      transition-colors duration-200 focus:outline-none flex items-center justify-center"
              title="Speed Up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="ml-2"></span>
            </button>

            <div className="text-sm font-medium text-gray-600 text-center">
              Speed: {Math.round((INITIAL_SPEED / speed) * 100)}%
            </div>

            <button
              onClick={() => handleSpeedChange('decrease')}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                      transition-colors duration-200 focus:outline-none flex items-center justify-center"
              title="Slow Down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="ml-2"></span>
            </button>
          </div>

          {/* 玩家排行榜 */}
          <section className="rounded-lg bg-white p-4 shadow-lg" aria-labelledby="leaderboard-title">
            <h3 id="leaderboard-title" className="mb-3 text-center text-lg font-semibold text-gray-700">
              Top 5 Players
            </h3>

            {isLeaderboardLoading ? (
              <p className="py-4 text-center text-sm text-gray-500">Loading...</p>
            ) : leaderboardError ? (
              <div className="py-2 text-center">
                <p className="mb-2 text-sm text-red-500">{leaderboardError}</p>
                <button
                  type="button"
                  onClick={loadLeaderboard}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Try again
                </button>
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No scores yet</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <li
                    key={`${entry.player_name}-${entry.score}-${index}`}
                    className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="w-5 font-bold text-gray-500">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-800" title={entry.player_name}>
                      {entry.player_name}
                    </span>
                    <span className="font-bold tabular-nums text-blue-600">{entry.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Game Over 显示 */}
      {gameOver && (
        <div className="mt-4 text-center">
          <h2 className="text-3xl font-bold text-red-600 mb-4">Game Over!</h2>
          <div className="flex flex-col items-center gap-4 mb-4">
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              disabled={hasSubmittedScore}
              placeholder="Enter your name"
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900
                      caret-blue-600 placeholder:text-gray-400
                      disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      w-64" // 增加输入框宽度
              maxLength={50}
              autoFocus // 自动聚焦
            />
            {hasSubmittedScore ? (
              <div className="text-lg font-medium text-green-600">Score saved</div>
            ) : (
              <div className="text-lg text-gray-600">Time to save: {countdown}s</div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold
                      hover:bg-green-600 transition-colors duration-200"
            >
              Play Again
            </button>
            <button
              onClick={saveScore}
              disabled={!playerName.trim() || countdown === 0 || saveStatus.isSaving || hasSubmittedScore}
              className={`px-6 py-3 rounded-lg font-bold transition-colors duration-200
                ${!playerName.trim() || countdown === 0 || saveStatus.isSaving || hasSubmittedScore
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              {saveStatus.isSaving ? 'Saving...' : hasSubmittedScore ? 'Saved' : 'Save Score'}
            </button>
          </div>
          {saveStatus.error && (
            <div className="mt-2 text-red-500">{saveStatus.error}</div>
          )}
        </div>
      )}

      <div className="mt-4 text-gray-600 text-center">
        <p>Use arrow keys to control the snake</p>
      </div>
    </div>
  );
}
