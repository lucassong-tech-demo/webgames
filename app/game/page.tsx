"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// 定义类型
type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type SaveStatus = {
  isSaving: boolean;
  error: string | null;
};


const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const INITIAL_SPEED = 150;
const INITIAL_POSITION = { x: 200, y: 200 };
const SPEED_MULTIPLIER = 0.5;
const MIN_SPEED = 50;  // 最快速度
const MAX_SPEED = 300; // 最慢速度

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 修改 gameLoopRef 的定义，提供 null 作为初始值
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [snake, setSnake] = useState<Position[]>([INITIAL_POSITION]);
  const [food, setFood] = useState<Position>({ x: 0, y: 0 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  // 添加新的状态
  const [countdown, setCountdown] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ isSaving: false, error: null });
 
  // 添加处理输入的函数
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
  };
  // 生成食物的函数
  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)) * GRID_SIZE,
      y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)) * GRID_SIZE
    };
    setFood(newFood);
  }, []); // 不需要任何依赖

  // 移动蛇
  const moveSnake = useCallback(() => {
    if (gameOver) return;

    setSnake(currentSnake => {
      const head = { ...currentSnake[0] };

      // 计算新的头部位置
      switch (direction) {
        case 'UP':
          head.y = (head.y - GRID_SIZE + CANVAS_SIZE) % CANVAS_SIZE;
          break;
        case 'DOWN':
          head.y = (head.y + GRID_SIZE) % CANVAS_SIZE;
          break;
        case 'LEFT':
          head.x = (head.x - GRID_SIZE + CANVAS_SIZE) % CANVAS_SIZE;
          break;
        case 'RIGHT':
          head.x = (head.x + GRID_SIZE) % CANVAS_SIZE;
          break;
      }

      // 检查是否撞到自己
      if (currentSnake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        return currentSnake;
      }

      const newSnake = [head, ...currentSnake];
      
      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        setTimeout(generateFood, 0); // 使用 setTimeout 延迟生成食物
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food.x, food.y, gameOver]); // 明确指定依赖

  // 绘制游戏
  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    // 清空画布
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 绘制网格
    ctx.strokeStyle = '#ddd';
    for (let i = 0; i < CANVAS_SIZE; i += GRID_SIZE) {
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
      ctx.fillRect(segment.x, segment.y, GRID_SIZE - 1, GRID_SIZE - 1);
      // 绘制蛇头
      if (index === 0) {
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(segment.x, segment.y, GRID_SIZE - 1, GRID_SIZE - 1);
      }
    });

    // 绘制食物
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(
      food.x + GRID_SIZE/2,
      food.y + GRID_SIZE/2,
      GRID_SIZE/2 - 1,
      0,
      Math.PI * 2
    );
    ctx.fill();
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

    // 防止反向移动
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT'
    };

    if (opposites[newDirection] !== direction) {
      setDirection(newDirection);
      event.preventDefault(); // 只阻止方向键的默认行为
    }
  }, [direction]);

  // 添加保存分数的函数
  const saveScore = async () => {
    if (!playerName || countdown === 0) return;
    
    try {
      setSaveStatus({ isSaving: true, error: null });
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          score,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save score');
      }

      setSaveStatus({ isSaving: false, error: null });
      alert('Score saved successfully!');
      setPlayerName('');
    } catch (error) {
      console.error('Error saving score:', error);
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
    setSnake([INITIAL_POSITION]);
    setDirection('RIGHT');
    setScore(0);
    setGameOver(false);
    generateFood();

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setCountdown(10);
  }, []);


  const handleSpeedChange = useCallback((type: 'increase' | 'decrease') => {
    setSpeed(currentSpeed => {
      const newSpeed = type === 'increase' 
        ? currentSpeed * (1 - SPEED_MULTIPLIER)  // 加速（减少间隔时间）
        : currentSpeed * (1 + SPEED_MULTIPLIER); // 减速（增加间隔时间）
      
      // 确保速度在合理范围内
      return Math.min(Math.max(newSpeed, MIN_SPEED), MAX_SPEED);
    });
  }, []);

  // 初始化游戏
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 初始生成食物
    if (!food.x && !food.y) {
      generateFood();
    }

    // 确保 canvas 获得焦点
    canvas.focus();

    // 游戏循环
    const gameLoop = setInterval(() => {
      if (!gameOver) {
        moveSnake();
        drawGame(ctx);
      }
    }, speed); // 使用当前速度

    gameLoopRef.current = gameLoop;

    // 只在 canvas 上添加键盘事件监听
    canvas.addEventListener('keydown', handleKeyDown);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameOver, moveSnake, drawGame, handleKeyDown, food.x, food.y, generateFood, speed]); // 添加 speed 依赖
  
  // 添加倒计时的 useEffect
  useEffect(() => {
    if (gameOver) {
      // 初始化倒计时
      setCountdown(10);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // 清理函数
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [gameOver]); // 只依赖 gameOver 状态

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
      <div className="flex flex-row items-start gap-6">
       
        {/* 游戏主区域 */}
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Snake Game</h1>
          <div className="text-2xl font-semibold text-gray-700 mb-4">Score: {score}</div>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="border-4 border-gray-300 rounded-lg shadow-lg bg-white focus:outline-none"
            tabIndex={0}
          />
        </div>

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
              placeholder="Enter your name"
              className="px-4 py-2 border border-gray-300 rounded-lg 
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      w-64" // 增加输入框宽度
              maxLength={50}
              autoFocus // 自动聚焦
            />
            <div className="text-lg text-gray-600">
              Time to save: {countdown}s
            </div>
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
              disabled={countdown === 0 || saveStatus.isSaving}
              className={`px-6 py-3 rounded-lg font-bold transition-colors duration-200
                ${countdown === 0 || saveStatus.isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              {saveStatus.isSaving ? 'Saving...' : 'Save Score'}
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
