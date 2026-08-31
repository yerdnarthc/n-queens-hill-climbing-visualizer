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
  const totalSteps = useSimulationStore(selectTotalSteps);
  const isAtStart = useSimulationStore(selectIsAtStart);
  const isAtEnd = useSimulationStore(selectIsAtEnd);

  const togglePlay = useSimulationStore((s) => s.togglePlay);
  const stepForward = useSimulationStore((s) => s.stepForward);
  const stepBack = useSimulationStore((s) => s.stepBack);
  const jumpToStart = useSimulationStore((s) => s.jumpToStart);
  const jumpToEnd = useSimulationStore((s) => s.jumpToEnd);
  const jumpTo = useSimulationStore((s) => s.jumpTo);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const run = useSimulationStore((s) => s.run);

  const handleSliderChange = React.useCallback(
    (values: number[]) => {
      if (values[0] !== undefined) {
        jumpTo(values[0]);
      }
    },
    [jumpTo],
  );

  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
      {/* Timeline Scrubber */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Timeline</span>
            <span className="font-mono text-[11px] font-semibold text-foreground">
              Step {currentStep}
            </span>
          </div>
          <span className="font-mono text-[11px]">{progressPercent}%</span>
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
      </div>

      {/* Main Playback Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
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
                  className={`rounded px-2 py-1 font-mono text-[11px] font-semibold transition-all ${
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
      </div>
    </div>
  );
}
