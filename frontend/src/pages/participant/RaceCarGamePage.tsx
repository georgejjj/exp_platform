import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExperiment } from '../../context/ExperimentContext';
import { useEventLogger } from '../../hooks/useEventLogger';
import {
  startRaceCarGame,
  submitRaceCarPrediction,
  completeRaceCarGame,
} from '../../api';
import type { RaceCarPredictResponse, RaceCarCompleteResponse } from '../../types';

type Phase =
  | 'rules'
  | 'idle' // at intersection, awaiting click
  | 'revealing' // obstacle pops in
  | 'driving' // car drives into the chosen fork
  | 'feedback' // outcome badge visible
  | 'approaching' // road scrolls fast — car "approaches" next intersection
  | 'finished';

type Side = 'L' | 'R';

const TOTAL = 10;

// The button click value IS the predicted obstacle side. The car then
// automatically drives the OTHER way to avoid it.
const obstaclePredictionToCarSide = (s: Side): Side => (s === 'L' ? 'R' : 'L');

export default function RaceCarGamePage() {
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const { setGameResult } = useExperiment();
  const { log } = useEventLogger();

  const [phase, setPhase] = useState<Phase>('rules');
  const [round, setRound] = useState(0); // upcoming round index
  const [coins, setCoins] = useState(1000);
  const [history, setHistory] = useState<Side[]>([]);
  const [carSide, setCarSide] = useState<Side | null>(null); // direction the car is driving this round
  const [lastResult, setLastResult] = useState<RaceCarPredictResponse | null>(null);
  const [finalResult, setFinalResult] = useState<RaceCarCompleteResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decisionStart = useRef<number>(0);

  const initGame = useCallback(async () => {
    try {
      const { data } = await startRaceCarGame();
      setRound(data.current_index);
      setCoins(data.coins);
      setHistory(data.history);
      setPhase(data.current_index >= data.total_intersections ? 'finished' : 'idle');
      decisionStart.current = Date.now();
      log('race_car_start', 'race_car_game', { current_index: data.current_index });
    } catch {
      setError('小游戏加载失败，请刷新重试');
    }
  }, [log]);

  const handleStart = () => {
    setPhase('idle');
    decisionStart.current = Date.now();
    initGame();
  };

  const handlePredictObstacle = async (predictedObstacleSide: Side) => {
    if (phase !== 'idle' || submitting) return;
    setSubmitting(true);
    // Car will go the OPPOSITE side from the predicted obstacle
    const drivenCarSide = obstaclePredictionToCarSide(predictedObstacleSide);
    setCarSide(drivenCarSide);

    const elapsed = Date.now() - decisionStart.current;

    try {
      const { data } = await submitRaceCarPrediction(predictedObstacleSide, elapsed);
      setLastResult(data);
      log('race_car_predict', 'race_car_game', {
        round: data.round_number,
        obstacle_prediction: data.prediction,
        car_side: drivenCarSide,
        obstacle: data.obstacle_side,
        correct: data.predicted_correctly,
        jumped: data.jumped,
        response_time_ms: elapsed,
      });

      // Animation: reveal → drive into fork → feedback → approach next
      setPhase('revealing');
      await delay(500);
      setPhase('driving');
      await delay(1100);
      setPhase('feedback');
      setCoins(data.total_coins);
      setHistory(data.history);
      await delay(950);

      if (data.is_last) {
        try {
          const { data: done } = await completeRaceCarGame();
          setFinalResult(done);
          setGameResult(done);
          setPhase('finished');
          log('race_car_complete', 'race_car_game', {
            coins: done.total_coins,
            fallacy_score: done.fallacy_score,
            combined_score: done.combined_score,
            correct_count: done.correct_count,
          });
        } catch {
          setError('结算失败，请重试');
        }
      } else {
        // Forward-motion transition into next intersection
        setPhase('approaching');
        await delay(900);
        setRound(data.next_index);
        setLastResult(null);
        setCarSide(null);
        setPhase('idle');
        decisionStart.current = Date.now();
      }
    } catch {
      setError('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    setStep('personality_feedback');
    navigate('/personality-feedback');
  };

  // Keep latest handler reachable from the keyboard listener without
  // re-binding the listener on every render.
  const handlePredictRef = useRef(handlePredictObstacle);
  handlePredictRef.current = handlePredictObstacle;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (phase !== 'idle') return;
      // ArrowLeft means "obstacle on left", ArrowRight means "obstacle on right".
      // (The car auto-drives the opposite way to avoid it.)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePredictRef.current('L');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePredictRef.current('R');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  return (
    <div className="min-h-screen bg-ink-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {phase === 'rules' && <RulesScreen onStart={handleStart} />}

        {phase !== 'rules' && phase !== 'finished' && (
          <GameView
            phase={phase}
            round={round}
            total={TOTAL}
            coins={coins}
            history={history}
            carSide={carSide}
            lastResult={lastResult}
            onPredictObstacle={handlePredictObstacle}
            disabled={submitting || phase !== 'idle'}
          />
        )}

        {phase === 'finished' && finalResult && (
          <ResultsScreen result={finalResult} onContinue={handleContinue} />
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/70 border border-red-700 rounded text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

// ---------- Rules ----------

function RulesScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-paper text-ink-900 rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white">
        <div className="text-xs uppercase tracking-widest opacity-80 font-mono">
          Mini Game · 极速测试
        </div>
        <h2 className="text-2xl font-serif font-bold mt-1">直觉与概率：避障小游戏</h2>
      </div>
      <div className="p-6 space-y-5">
        <p className="text-sm leading-relaxed text-ink-700">
          完成行为问卷后，请通过这个小游戏继续测试您的直觉判断方式。
          它将帮助我们更全面地了解您对随机事件的反应。
        </p>

        <ol className="space-y-3 text-sm text-ink-800">
          <Rule index="1">
            前方道路会分叉，<strong>左路或右路</strong>会出现障碍物，左/右概率
            <span className="font-mono text-amber-600 font-bold"> 各 50%</span>，互相独立。
          </Rule>
          <Rule index="2">
            请<strong>预判障碍物会出现在哪一侧</strong>：按
            <span className="text-orange-600 font-bold"> ← 左 </span>
            表示您猜障碍在左，按
            <span className="text-orange-600 font-bold"> 右 → </span>
            表示您猜障碍在右。车辆会
            <strong className="text-ink-900">自动驶向另一侧</strong>避开。
            <span className="block text-xs text-ink-400 mt-1 font-mono">
              💡 也可以用键盘 ← / → 键操作
            </span>
          </Rule>
          <Rule index="3">
            走到没有障碍的车道：<span className="font-mono font-bold text-up">+30</span> 金币 · 撞上障碍：
            <span className="font-mono font-bold text-ink-400"> 0</span> 或 <span className="font-mono font-bold">10</span> 金币（成功跳跃）。
          </Rule>
          <Rule index="4">
            共 <span className="font-mono font-bold">10 个</span> 路口。系好安全带，出发吧！
          </Rule>
        </ol>

        <button
          onClick={onStart}
          className="w-full bg-ink-900 text-white py-3.5 rounded-lg font-medium hover:bg-ink-800 transition active:scale-[0.98]"
        >
          准备出发 →
        </button>
      </div>
    </div>
  );
}

function Rule({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink-900 text-white text-xs font-mono font-bold grid place-items-center mt-0.5">
        {index}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

// ---------- Game ----------

interface GameViewProps {
  phase: Phase;
  round: number;
  total: number;
  coins: number;
  history: Side[];
  carSide: Side | null;
  lastResult: RaceCarPredictResponse | null;
  onPredictObstacle: (side: Side) => void;
  disabled: boolean;
}

function GameView({
  phase,
  round,
  total,
  coins,
  history,
  carSide,
  lastResult,
  onPredictObstacle,
  disabled,
}: GameViewProps) {
  return (
    <div className="bg-[#1d4734] rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
      <HUD round={round} total={total} coins={coins} history={history} />
      <RoadScene phase={phase} carSide={carSide} lastResult={lastResult} round={round} total={total} />
      <Controls onPredictObstacle={onPredictObstacle} disabled={disabled} phase={phase} />
    </div>
  );
}

function HUD({
  round,
  total,
  coins,
  history,
}: {
  round: number;
  total: number;
  coins: number;
  history: Side[];
}) {
  return (
    <div className="bg-[#163b2b] px-4 py-3 border-b border-black/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-300/70 font-mono">
            Intersection · 路口
          </div>
          <div className="font-mono text-white font-bold">
            <span className="text-lg">{Math.min(round + 1, total)}</span>
            <span className="text-emerald-300/60 text-sm"> / {total}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-amber-300/70 font-mono">
            Coins · 金币
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-200/50 grid place-items-center text-[8px] font-bold text-amber-900">
              ¥
            </span>
            <span className="font-mono font-bold text-white text-lg">{coins}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-emerald-100/80 font-medium tracking-wider">
          近5次障碍位置
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const offset = history.length - 5 + i;
            const side = offset >= 0 ? history[offset] : undefined;
            return <HistoryCell key={i} side={side} />;
          })}
        </div>
      </div>
    </div>
  );
}

function HistoryCell({ side }: { side?: Side }) {
  if (!side) {
    return (
      <div className="w-8 h-7 rounded border border-dashed border-emerald-300/30 grid place-items-center text-emerald-300/30 text-[10px]">
        ·
      </div>
    );
  }
  const isLeft = side === 'L';
  const color = isLeft ? 'bg-orange-400' : 'bg-emerald-400';
  return (
    <div
      className={`w-8 h-7 rounded ${color} grid place-items-center text-white font-bold text-[11px] shadow flex-row gap-0.5`}
      title={isLeft ? '障碍在左侧' : '障碍在右侧'}
    >
      <span className="leading-none">{isLeft ? '◀' : '▶'}</span>
      <span className="leading-none text-[10px] ml-0.5">障</span>
    </div>
  );
}

// ---------- Road & Car ----------

function RoadScene({
  phase,
  carSide,
  lastResult,
  round,
  total,
}: {
  phase: Phase;
  carSide: Side | null;
  lastResult: RaceCarPredictResponse | null;
  round: number;
  total: number;
}) {
  const obstacleSide = lastResult?.obstacle_side;
  const showObstacle = phase !== 'idle' && phase !== 'approaching' && !!obstacleSide;
  const carPhase: 'idle' | 'forked' = phase === 'driving' || phase === 'feedback' ? 'forked' : 'idle';
  const hit = !!lastResult && !lastResult.predicted_correctly && !lastResult.jumped;
  const jumped = !!lastResult?.jumped;
  const carVisible = phase !== 'approaching';

  // Idle = slow ambient scroll. Approaching = fast forward sweep. Other phases
  // pause the trunk scroll so the side action reads clearly.
  const scrollSpeed =
    phase === 'approaching' ? 0.45 : phase === 'idle' ? 3.2 : 999;

  // During approach, render two fork layers so the player sees the old
  // intersection slide down past the camera and a fresh one arrive from
  // ahead. After approach, only the static fork is rendered.
  const renderApproachingForks = phase === 'approaching';
  // Roadside trees give parallax motion cues — their position changes per
  // intersection so each round visibly looks like a new place on the road.
  const treeSeed = round;

  // Waypoint sign label for the *currently visible* intersection. When
  // approaching, the arriving fork shows the next waypoint number.
  const currentWaypoint = Math.min(round + 1, total);
  const nextWaypoint = Math.min(round + 2, total);

  return (
    <div className="relative h-[460px] bg-[#3a8f5c] overflow-hidden">
      {/* Animated grass-edge checker patterns (motion cue) */}
      <CheckerPattern side="left" speed={scrollSpeed} />
      <CheckerPattern side="right" speed={scrollSpeed} />

      {/* Trunk (always present, stable position) */}
      <svg
        viewBox="0 0 240 460"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="90" y="200" width="60" height="260" fill="#3a4147" />
      </svg>

      {/* Scrolling trunk centerline (motion cue) */}
      <ScrollingTrunkLine speed={scrollSpeed} />

      {/* Roadside trees — change layout per round and parallax-scroll */}
      <Trees seed={treeSeed} speed={scrollSpeed} />

      {/* Fork layers */}
      {!renderApproachingForks && (
        <ForkLayer
          obstacleSide={showObstacle ? obstacleSide : undefined}
          obstacleAnimateIn={phase === 'revealing'}
          waypoint={currentWaypoint}
          total={total}
        />
      )}
      {renderApproachingForks && (
        <>
          {/* Old intersection sliding past us */}
          <div className="absolute inset-0" style={{ animation: 'fork-pass-down 0.85s ease-in forwards' }}>
            <ForkLayer
              obstacleSide={obstacleSide}
              waypoint={currentWaypoint}
              total={total}
              dimmed
            />
          </div>
          {/* Next intersection arriving from above */}
          <div
            className="absolute inset-0"
            style={{ animation: 'fork-arrive 0.85s ease-out forwards' }}
          >
            <ForkLayer waypoint={nextWaypoint} total={total} />
          </div>
        </>
      )}

      {/* Cloud — moves slightly each round to reinforce scene change */}
      <div
        className="absolute opacity-70 pointer-events-none transition-all duration-500"
        style={{
          top: `${36 + ((treeSeed * 11) % 30)}px`,
          right: `${20 + ((treeSeed * 13) % 80)}px`,
        }}
      >
        <Cloud />
      </div>

      {/* Car — keyed by round so the arrival animation re-runs each intersection */}
      {carVisible && (
        <Car
          key={`car-${round}`}
          phase={carPhase}
          carSide={carSide}
          hit={hit}
          jumped={jumped}
        />
      )}

      {/* Feedback overlay */}
      {phase === 'feedback' && lastResult && <FeedbackBadge result={lastResult} />}

      {/* "Approaching" text cue */}
      {phase === 'approaching' && (
        <div className="absolute inset-x-0 top-6 text-center font-mono text-emerald-100/85 text-xs tracking-widest animate-pulse z-20">
          ▲ 路口 {currentWaypoint} 已通过 · 进入路口 {nextWaypoint} ▲
        </div>
      )}

      <style>{`
        @keyframes bounce-in {
          0% { transform: translateY(-40px) scale(0.4); opacity: 0; }
          60% { transform: translateY(8px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.45s ease-out; }

        @keyframes drive-left {
          0% { transform: translate(-50%, 0) rotate(0deg); }
          100% { transform: translate(-180%, -140px) rotate(-32deg); }
        }
        @keyframes drive-right {
          0% { transform: translate(-50%, 0) rotate(0deg); }
          100% { transform: translate(80%, -140px) rotate(32deg); }
        }
        @keyframes crash-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes jump-up {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-14px) scale(1.05); }
        }
        @keyframes car-idle-bob {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -1.5px); }
        }
        @keyframes car-arrive {
          0% { transform: translate(-50%, 60px) scale(0.85); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .animate-crash { animation: crash-shake 0.18s ease-in-out 3; }
        .animate-jump { animation: jump-up 0.5s ease-out; }
        .animate-idle-bob { animation: car-idle-bob 2.2s ease-in-out infinite; }
        .animate-car-arrive { animation: car-arrive 0.55s ease-out, car-idle-bob 2.2s ease-in-out 0.55s infinite; }

        @keyframes trunk-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 36px; }
        }
        @keyframes checker-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 24px; }
        }

        /* Old intersection slides DOWN past the camera */
        @keyframes fork-pass-down {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(280px); opacity: 0.55; }
        }
        /* Next intersection arrives from the distance (above) */
        @keyframes fork-arrive {
          0% { transform: translateY(-260px); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ForkLayer({
  obstacleSide,
  obstacleAnimateIn,
  waypoint,
  total,
  dimmed = false,
}: {
  obstacleSide?: Side;
  obstacleAnimateIn?: boolean;
  waypoint: number;
  total: number;
  dimmed?: boolean;
}) {
  const fillColor = dimmed ? '#2f363c' : '#3a4147';
  const branchCenterlineOpacity = dimmed ? 0.35 : 0.7;
  // Position the obstacle ON the road by anchoring it to the middle of the
  // chosen branch in SVG coords. At SVG y=110 the road on each branch spans
  // ~60 units (left: x=30→90, right: x=150→210); a 44-wide barrier centered
  // at x=60 (or x=180) fits with margin. A slight rotation makes it look
  // like the barrier follows the road's curve toward the trunk.
  const obstacleTransform = obstacleSide === 'L'
    ? 'translate(60 108) rotate(-26)'
    : 'translate(180 108) rotate(26)';

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        viewBox="0 0 240 460"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={`warn-stripes-${dimmed ? 'dim' : 'live'}`}
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill={dimmed ? '#a13a2a' : '#ef4444'} />
            <rect width="4" height="8" fill="#ffffff" />
          </pattern>
        </defs>

        {/* Left branch */}
        <path
          d="M 90 200 L 90 80 Q 90 30 40 30 L 0 30 L 0 80 Q 40 80 50 130 L 50 200 Z"
          fill={fillColor}
        />
        {/* Right branch */}
        <path
          d="M 150 200 L 150 80 Q 150 30 200 30 L 240 30 L 240 80 Q 200 80 190 130 L 190 200 Z"
          fill={fillColor}
        />
        {/* Branch centerlines */}
        <path
          d="M 120 200 Q 70 100 25 60"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8 6"
          fill="none"
          opacity={branchCenterlineOpacity}
        />
        <path
          d="M 120 200 Q 170 100 215 60"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8 6"
          fill="none"
          opacity={branchCenterlineOpacity}
        />

        {/* Obstacle — drawn inside the SVG so it sits on the road. The outer
            <g> handles positioning with the SVG `transform` attribute; the
            inner <g> handles the CSS pop-in animation (CSS transforms would
            otherwise override the positioning). */}
        {obstacleSide && (
          <g transform={obstacleTransform} opacity={dimmed ? 0.7 : 1}>
            <g
              className={obstacleAnimateIn ? 'svg-obstacle-pop' : ''}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
            >
              {/* Barrier body */}
              <rect
                x="-22"
                y="-8"
                width="44"
                height="14"
                rx="2"
                fill={`url(#warn-stripes-${dimmed ? 'dim' : 'live'})`}
                stroke="white"
                strokeWidth="1.5"
              />
              {/* Two support posts */}
              <rect x="-16" y="6" width="3" height="10" fill="#e0e0e0" stroke="#7a7a7a" strokeWidth="0.4" />
              <rect x="13" y="6" width="3" height="10" fill="#e0e0e0" stroke="#7a7a7a" strokeWidth="0.4" />
              {/* Reflective dot */}
              <circle cx="0" cy="-1" r="1.8" fill="#fff5d1" stroke="#c47e00" strokeWidth="0.4" />
            </g>
          </g>
        )}
      </svg>

      {/* Waypoint sign at the top of the fork */}
      <div
        className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm bg-amber-400/95 border border-amber-700 text-amber-950 text-[10px] font-mono font-bold shadow"
        style={{ opacity: dimmed ? 0.5 : 1 }}
      >
        WP {waypoint}/{total}
      </div>

      <style>{`
        @keyframes svg-obstacle-pop {
          0% { transform: scale(0.4); opacity: 0; }
          55% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .svg-obstacle-pop {
          animation: svg-obstacle-pop 0.45s ease-out both;
        }
      `}</style>
    </div>
  );
}

function Trees({ seed, speed }: { seed: number; speed: number }) {
  const paused = speed > 100;
  // Deterministic positions per round so each intersection feels distinct
  const trees = [
    { side: 'left', topPct: (seed * 17) % 60 + 10, sz: 18 + (seed % 3) * 3 },
    { side: 'right', topPct: (seed * 23) % 65 + 8, sz: 16 + ((seed + 1) % 3) * 3 },
    { side: 'left', topPct: (seed * 31) % 70 + 30, sz: 14 + ((seed + 2) % 3) * 3 },
    { side: 'right', topPct: (seed * 41) % 60 + 25, sz: 20 + ((seed + 1) % 4) * 2 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {trees.map((t, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: `${t.topPct}%`,
            [t.side]: `${10 + (i * 7) % 18}px`,
            animation: paused ? 'none' : `tree-scroll ${Math.max(0.6, speed * 1.4)}s linear infinite`,
          } as React.CSSProperties}
        >
          <Tree size={t.sz} />
        </div>
      ))}
      <style>{`
        @keyframes tree-scroll {
          0% { transform: translateY(-40px); opacity: 0.85; }
          100% { transform: translateY(80px); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function Tree({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 20 26">
      <rect x="9" y="18" width="2.5" height="6" fill="#5b3a16" />
      <circle cx="10" cy="14" r="6.5" fill="#2c5f2d" />
      <circle cx="6.5" cy="11" r="4.5" fill="#3e7d3f" />
      <circle cx="13.5" cy="11" r="4.5" fill="#3e7d3f" />
      <circle cx="10" cy="8" r="4.5" fill="#4a8f4b" />
    </svg>
  );
}

function ScrollingTrunkLine({ speed }: { speed: number }) {
  // A vertical dashed line that translates downward to simulate forward driving.
  const paused = speed > 100;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '200px',
        bottom: 0,
        width: '4px',
        marginLeft: '-2px',
        backgroundImage:
          'repeating-linear-gradient(to bottom, white 0 16px, transparent 16px 36px)',
        backgroundSize: '4px 36px',
        opacity: 0.85,
        animation: paused ? 'none' : `trunk-scroll ${speed}s linear infinite`,
      }}
    />
  );
}

function CheckerPattern({ side, speed }: { side: 'left' | 'right'; speed: number }) {
  const paused = speed > 100;
  return (
    <div
      className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-6 opacity-55`}
      style={{
        backgroundImage:
          'repeating-conic-gradient(#2a6f44 0% 25%, #4ea071 0% 50%)',
        backgroundSize: '12px 12px',
        animation: paused ? 'none' : `checker-scroll ${Math.max(0.4, speed / 4)}s linear infinite`,
      }}
    />
  );
}

function Cloud() {
  return (
    <div className="relative">
      <div className="w-12 h-5 bg-white rounded-full" />
      <div className="absolute -top-2 left-2 w-6 h-6 bg-white rounded-full" />
      <div className="absolute -top-1 right-1 w-5 h-5 bg-white rounded-full" />
    </div>
  );
}

function Car({
  phase,
  carSide,
  hit,
  jumped,
}: {
  phase: 'idle' | 'forked';
  carSide: Side | null;
  hit: boolean;
  jumped: boolean;
}) {
  let animationStyle: React.CSSProperties = {};
  let classes = '';

  if (phase === 'idle') {
    animationStyle = { left: '50%', top: '260px', transform: 'translate(-50%, 0)' };
    classes = 'animate-car-arrive';
  } else if (carSide === 'L') {
    animationStyle = { left: '50%', top: '260px', animation: 'drive-left 1s ease-in forwards' };
  } else if (carSide === 'R') {
    animationStyle = { left: '50%', top: '260px', animation: 'drive-right 1s ease-in forwards' };
  }

  if (phase === 'forked' && hit) classes = 'animate-crash';
  if (phase === 'forked' && jumped) classes = 'animate-jump';

  return (
    <div className={`absolute z-10 ${classes}`} style={animationStyle}>
      <CarBody />
    </div>
  );
}

function CarBody() {
  return (
    <svg width="44" height="72" viewBox="0 0 44 72">
      <ellipse cx="22" cy="68" rx="18" ry="3" fill="rgba(0,0,0,0.3)" />
      <rect x="4" y="6" width="36" height="58" rx="10" fill="#f0a500" />
      <rect x="6" y="8" width="32" height="54" rx="9" fill="#f8c44f" />
      <rect x="9" y="14" width="26" height="20" rx="4" fill="#1a2533" />
      <rect x="10" y="15" width="24" height="6" rx="2" fill="rgba(255,255,255,0.15)" />
      <rect x="10" y="44" width="24" height="14" rx="3" fill="#1a2533" />
      <circle cx="11" cy="10" r="2" fill="#fff5d1" />
      <circle cx="33" cy="10" r="2" fill="#fff5d1" />
      <rect x="1" y="22" width="4" height="4" rx="1" fill="#c47e00" />
      <rect x="39" y="22" width="4" height="4" rx="1" fill="#c47e00" />
    </svg>
  );
}

function FeedbackBadge({ result }: { result: RaceCarPredictResponse }) {
  const correct = result.predicted_correctly;
  const jumped = result.jumped;

  let label = '';
  let color = '';
  if (correct) {
    label = `+${result.coins_earned} 安全通过`;
    color = 'from-emerald-500 to-emerald-700';
  } else if (jumped) {
    label = `+${result.coins_earned} 成功跳跃`;
    color = 'from-amber-500 to-amber-700';
  } else {
    label = '+0 撞上障碍';
    color = 'from-red-500 to-red-700';
  }

  return (
    <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none animate-fade-up">
      <div
        className={`bg-gradient-to-r ${color} text-white font-bold px-5 py-2.5 rounded-full shadow-2xl border-2 border-white/40 text-sm`}
      >
        {label}
      </div>
    </div>
  );
}

function Controls({
  onPredictObstacle,
  disabled,
  phase,
}: {
  onPredictObstacle: (side: Side) => void;
  disabled: boolean;
  phase: Phase;
}) {
  const idle = phase === 'idle';
  return (
    <div className="bg-[#163b2b] px-4 py-4 border-t border-black/30">
      <p
        className={`text-center text-xs mb-3 transition-opacity ${
          idle ? 'text-emerald-100/90 font-medium' : 'text-emerald-200/30'
        }`}
      >
        {idle ? '🚧 预判障碍会出现在哪一侧？·  键盘 ← / →' : '· · ·'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ObstacleSideButton side="L" onClick={() => onPredictObstacle('L')} disabled={disabled} />
        <ObstacleSideButton side="R" onClick={() => onPredictObstacle('R')} disabled={disabled} />
      </div>
    </div>
  );
}

function ObstacleSideButton({
  side,
  onClick,
  disabled,
}: {
  side: Side;
  onClick: () => void;
  disabled: boolean;
}) {
  const isLeft = side === 'L';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-300 text-white rounded-xl shadow-lg border-2 border-white/30 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-3 flex flex-col items-stretch gap-1"
    >
      {/* Top row: barrier icon on the chosen side + arrow on the other side showing car path */}
      <div
        className={`flex items-center ${isLeft ? 'justify-start' : 'justify-end'} gap-2 px-1`}
      >
        {isLeft && <MiniBarrier />}
        <span className="text-xs font-mono font-bold text-white/90">
          {isLeft ? '← 障碍 ' : ' 障碍 →'}
        </span>
        {!isLeft && <MiniBarrier />}
      </div>
      <div className="text-[11px] text-white/80 font-medium text-center bg-black/20 rounded py-0.5">
        车辆走{isLeft ? '右' : '左'}侧
      </div>
    </button>
  );
}

function MiniBarrier() {
  return (
    <span
      className="inline-block w-6 h-2.5 rounded-sm border border-white/80"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #ef4444 0 4px, #fff 4px 7px)',
      }}
    />
  );
}

// ---------- Results ----------

function ResultsScreen({
  result,
  onContinue,
}: {
  result: RaceCarCompleteResponse;
  onContinue: () => void;
}) {
  const game = result.fallacy_score;
  const cognitive = result.cognitive_fallacy_score;
  const combined = result.combined_score;
  const cw = Math.round(result.cognitive_weight * 100);
  const bw = Math.round(result.behavioral_weight * 100);

  const interp = combined !== null && combined !== undefined
    ? combined >= 60
      ? { label: '重度反转倾向', color: 'text-red-300', desc: '您在连续相同方向后倾向于预判反转，这是赌徒谬误的典型表现。在投资中需要特别注意。' }
      : combined >= 30
      ? { label: '中等反转倾向', color: 'text-amber-300', desc: '您在连续相同方向后有时会预判反转。请记住：独立事件中，每次出现都是新的 50%。' }
      : { label: '反转倾向较低', color: 'text-emerald-300', desc: '您较少在连续相同方向后预判反转，对独立性的理解相对稳健。' }
    : null;

  return (
    <div className="bg-paper text-ink-900 rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white">
        <div className="text-xs uppercase tracking-widest opacity-80 font-mono">
          Mini Game · Result
        </div>
        <h2 className="text-2xl font-serif font-bold mt-1">挑战完成</h2>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="累计金币" value={result.total_coins} unit="¥" />
          <Stat
            label="预判正确"
            value={result.correct_count}
            unit={`/ ${result.total_rounds}`}
          />
        </div>

        {/* Combined headline score */}
        {combined !== null && combined !== undefined && interp && (
          <div className="bg-ink-900 text-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-amber-300/80 font-mono">
                综合赌徒谬误指数
              </div>
              <span className={`text-xs font-medium ${interp.color}`}>{interp.label}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-5xl font-serif font-bold">{combined.toFixed(0)}</span>
              <span className="text-sm text-ink-300">/ 100</span>
            </div>
            <ScoreBar value={combined} />
            <p className="text-xs text-ink-300 mt-3 leading-relaxed">{interp.desc}</p>
          </div>
        )}

        {/* Breakdown */}
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-ink-400 font-mono">
            得分构成
          </div>
          {cognitive !== null && cognitive !== undefined && (
            <BreakdownRow
              label="问卷认知偏差"
              weight={`权重 ${cw}%`}
              value={cognitive}
              hint="基于行为问卷答题的赌徒谬误倾向"
            />
          )}
          {game !== null && game !== undefined && (
            <BreakdownRow
              label="小游戏行为偏差"
              weight={`权重 ${bw}%`}
              value={game}
              hint="基于连续序列后反转预判的比例"
            />
          )}
          {game === null && (
            <div className="bg-ink-50 border border-ink-200 rounded-lg p-3 text-xs text-ink-500">
              本次游戏未形成足够长的连续序列，未计入行为偏差。
            </div>
          )}
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-ink-900 text-white py-3.5 rounded-lg font-medium hover:bg-ink-800 transition active:scale-[0.98]"
        >
          查看个性化分析 →
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="bg-ink-50 border border-ink-200 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-ink-400 font-mono mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-serif font-bold text-ink-900">{value}</span>
        {unit && <span className="text-sm text-ink-400 font-mono">{unit}</span>}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  weight,
  value,
  hint,
}: {
  label: string;
  weight: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="bg-ink-50 border border-ink-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-ink-900">{label}</span>
        <span className="text-[10px] font-mono text-ink-400">{weight}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-serif font-bold text-ink-900">{value.toFixed(0)}</span>
        <span className="text-xs text-ink-400 font-mono">/ 100</span>
      </div>
      <ScoreBar value={value} muted />
      <p className="text-[11px] text-ink-500 mt-2 leading-relaxed">{hint}</p>
    </div>
  );
}

function ScoreBar({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <div className={`h-2 rounded-full overflow-hidden ${muted ? 'bg-ink-200' : 'bg-ink-700'}`}>
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
