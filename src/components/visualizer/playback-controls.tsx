'use client';

import * as React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Gauge,
  RotateCcw,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  useSimulationStore,
  selectTotalSteps,
  selectIsAtStart,
  selectIsAtEnd,
  SPEED_LIMITS,
} from '@/store';

const SPEED_PRESETS = [0.5, 1, 2, 5, 10, 20] as const;

export function PlaybackControls() {
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const speed = useSimulationStore((s) => s.speed);
  const result = useSimulationStore((s) => s.result);
  const totalSteps = useSimulationStore(selectTotalSteps);
  const isAtStart = useSimulationStore(selectIsAtStart);
  const isAtEnd = useSimulationStore(selectIsAtEnd);

  const togglePlay = useSimulationStore((s) => s.togglePlay);
  const stepForward = useSimulationStore((s) => s.stepForward);
  const stepBack = useSimulationStore((s) => s.stepBack);
  const jumpToStart = useSimulationStore((s) => s.jumpToStart);
  const jumpToEnd = useSimulationStore((s) => s.jumpToEnd);
  const jumpToBest = useSimulationStore((s) => s.jumpToBest);
  const jumpTo = useSimulationStore((s) => s.jumpTo);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const run = useSimulationStore((s) => s.run);

  // Restart-event markers: every snapshot after a `restart` phase (the README's
  // "time-travel scrubber with restart/event markers", landed in Phase 5).
  const restartSteps = React.useMemo(() => {
    if (!result) return [];
    return result.snapshots.filter((snap) => snap.phase === 'restart').map((snap) => snap.step);
  }, [result]);

  const bestStep = result?.bestStep ?? null;
  const isAtBest = bestStep !== null && currentStep === bestStep;

  const handleSliderChange = React.useCallback(
    (values: number[]) => {
      if (values[0] !== undefined) {
        jumpTo(values[0]);
      }
    },
    [jumpTo],
  );

  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  const markerPercent = (step: number) => (totalSteps > 0 ? (step / totalSteps) * 100 : 0);

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border/20 bg-background/20 p-4 backdrop-blur-sm">
      {/* Timeline Scrubber */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-5 font-medium">
            <span>Timeline</span>
            <span className="font-mono text-[0.65rem] font-semibold text-foreground">
              Step {currentStep}
            </span>
          </div>
          <span className="font-mono text-[0.65rem]">{progressPercent}%</span>
        </div>

        <Slider
          min={0}
          max={Math.max(1, totalSteps)}
          step={1}
          value={[currentStep]}
          onValueChange={handleSliderChange}
          disabled={totalSteps === 0}
          aria-label="Timeline step scrubber"
          className="cursor-pointer py-1"
        />

        {/* Restart & best-event markers on the timeline (aligned to the track) */}
        {(restartSteps.length > 0 || bestStep !== null) && (
          <div className="relative h-1.5 w-full select-none" aria-hidden="true">
            {restartSteps.map((step) => (
              <span
                key={`restart-${step}`}
                title={`Restart at step ${step}`}
                className="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-local-max ring-2 ring-background/80"
                style={{ left: `${markerPercent(step)}%` }}
              />
            ))}
            {bestStep !== null && (
              <span
                title={`Best (${result?.bestConflicts} conflicts) at step ${bestStep}`}
                className="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-global-max ring-2 ring-background/80"
                style={{ left: `${markerPercent(bestStep)}%` }}
              />
            )}
          </div>
        )}
      </div>

      {/* Main Playback Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {/* Step Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={jumpToStart}
            disabled={isAtStart}
            aria-label="Jump to start"
            className="h-9 w-9 rounded-lg"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={stepBack}
            disabled={isAtStart}
            aria-label="Step backward"
            className="h-9 w-9 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant={isPlaying ? 'secondary' : 'default'}
            size="default"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            className="h-9 min-w-28 gap-2 rounded-lg font-semibold shadow-xs"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>{isAtEnd ? 'Replay' : 'Play'}</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={stepForward}
            disabled={isAtEnd}
            aria-label="Step forward"
            className="h-9 w-9 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={jumpToEnd}
            disabled={isAtEnd}
            aria-label="Jump to end"
            className="h-9 w-9 rounded-lg"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={jumpToBest}
            disabled={!result || isAtBest}
            aria-label="Jump to best"
            title={`Jump to best (${result?.bestConflicts ?? 0} conflicts at step ${bestStep ?? 0})`}
            className="h-9 w-9 rounded-lg"
          >
            <Award className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={run}
            aria-label="Rerun current configuration"
            title="Rerun from step 0"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span className="hidden font-medium sm:inline">Speed:</span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {SPEED_PRESETS.map((p) => {
              const active = speed === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSpeed(p)}
                  className={`rounded px-2 py-1 font-mono text-[0.7rem] font-semibold transition-all ${
                    active
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}×
                </button>
              );
            })}
          </div>

          <div className="hidden w-24 items-center gap-1.5 lg:flex">
            <Slider
              min={SPEED_LIMITS.min}
              max={SPEED_LIMITS.max}
              step={0.5}
              value={[speed]}
              onValueChange={(val) => val[0] !== undefined && setSpeed(val[0])}
              aria-label="Fine speed adjustment"
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Timeline event legend + keyboard shortcuts */}
        <div className="flex w-full flex-wrap items-center justify-between border-t border-border/50 px-5 pt-2.5 text-[0.65rem] text-muted-foreground">
          <div className="flex items-center gap-3">
            {restartSteps.length > 0 && (
              <span className="flex items-center gap-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-local-max" />
                Restart
              </span>
            )}
            {bestStep !== null && (
              <span className="flex items-center gap-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-global-max" />
                Best (step {bestStep})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="hidden sm:inline">Shortcuts:</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/70 bg-muted/95 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-foreground">
                Space
              </kbd>
              Play / Pause
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/70 bg-muted/95 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-foreground">
                ←
              </kbd>
              <kbd className="rounded border border-border/70 bg-muted/95 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-foreground">
                →
              </kbd>
              Step
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/70 bg-muted/95 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-foreground">
                R
              </kbd>
              Reset
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
