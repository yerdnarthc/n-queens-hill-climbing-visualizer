'use client';

import * as React from 'react';
import { Dices, Settings2, SlidersHorizontal, ChevronDown, Info, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSimulationStore } from '@/store';
import { BOARD_SIZE_LIMITS, STRATEGY_IDS, type StrategyId } from '@/lib/engine';
import { STRATEGY_INFO } from '@/lib/strategy-info';
import { copyTextToClipboard } from '@/lib/clipboard';

export interface ConfigPanelProps {
  /**
   * `compact` tightens padding, font sizes, and slider heights so the panel
   * fits gracefully inside a narrow left column (e.g. the 2/7 workspace
   * sidebar that lives next to the chessboard). The "Advanced" collapsible
   * already starts closed, so only the essentials show by default.
   *
   * Default `false` keeps the original standalone card look.
   */
  compact?: boolean;
}

export function ConfigPanel({ compact = false }: ConfigPanelProps = {}) {
  const config = useSimulationStore((s) => s.config);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const newSeed = useSimulationStore((s) => s.newSeed);

  const [isOpenAdvanced, setIsOpenAdvanced] = React.useState(false);
  const [seedText, setSeedText] = React.useState(String(config.seed));
  const [copiedLink, setCopiedLink] = React.useState(false);
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setSeedText(String(config.seed));
  }, [config.seed]);

  // Clear any pending "copied" reset timer on unmount.
  React.useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(window.location.href);
    if (!ok) return;
    setCopiedLink(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSeedBlur = () => {
    const parsed = parseInt(seedText, 10);
    if (!Number.isNaN(parsed)) {
      setConfig({ seed: parsed });
    } else {
      setSeedText(String(config.seed));
    }
  };

  const handleStrategyChange = (val: string) => {
    if (STRATEGY_IDS.includes(val as StrategyId)) {
      setConfig({ strategy: val as StrategyId });
    }
  };

  const currentStratInfo = STRATEGY_INFO[config.strategy];
  const isSA = config.strategy === 'simulated-annealing';

  return (
    <div
      data-compact={compact ? 'true' : 'false'}
      className={
        compact
          ? // Narrow-column variant: tighter padding so the form fits in a
            // ~200-330px sidebar. The "Advanced" collapsible (state below)
            // starts closed by default, so only essentials show first.
            'flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm'
          : // Standalone card (default).
            'flex flex-col gap-4 rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm'
      }
    >
      <div
        className={
          compact
            ? 'flex items-center justify-between border-b border-border/50 pb-2'
            : 'flex items-center justify-between border-b-1 border-border/60 pb-3'
        }
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h2
            className={
              compact
                ? 'text-sm font-semibold tracking-tight'
                : 'text-sm font-semibold tracking-tight'
            }
          >
            Configuration
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy share link"
            title="Copy share link — the URL reproduces this exact run"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 text-green-pill" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className={compact ? 'flex flex-col gap-4' : 'flex flex-col gap-4 gap-y-5'}>
        {/* Board Size N */}
        <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-2'}>
          <div className="flex items-center justify-between">
            <Label htmlFor="board-size-slider" className="text-[0.7rem] font-semibold">
              Board Dimension (N × N)
            </Label>
            <span className="font-mono text-xs font-bold text-foreground">
              {config.boardSize} × {config.boardSize}
            </span>
          </div>

          <Slider
            id="board-size-slider"
            min={BOARD_SIZE_LIMITS.min}
            max={BOARD_SIZE_LIMITS.max}
            step={1}
            value={[config.boardSize]}
            onValueChange={(val) => val[0] !== undefined && setConfig({ boardSize: val[0] })}
            className={compact ? 'cursor-pointer py-0.5' : 'cursor-pointer py-1'}
          />

          <div
            className={
              compact
                ? 'flex justify-between font-sans text-[0.5rem] text-muted-foreground'
                : 'flex justify-between font-sans text-[0.6rem] text-muted-foreground'
            }
          >
            <span>N={BOARD_SIZE_LIMITS.min} (Fast)</span>
            <span>N=8 (Standard)</span>
            <span>N={BOARD_SIZE_LIMITS.max} (Complex)</span>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className={compact ? 'flex flex-col gap-1' : 'flex flex-col gap-1.5'}>
          <Label className="text-[0.7rem] font-semibold">Hill Climbing Variant</Label>

          <Select value={config.strategy} onValueChange={handleStrategyChange}>
            <SelectTrigger
              id="strategy-select"
              className={
                compact
                  ? 'h-8 w-full border-transparent bg-transparent text-[0.7rem] font-medium transition-all hover:border-primary/30 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50'
                  : 'w-full border-transparent bg-transparent text-xs font-medium transition-all hover:border-primary/30 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50'
              }
            >
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              {STRATEGY_IDS.map((stratId) => {
                const strat = STRATEGY_INFO[stratId];
                return (
                  <SelectItem key={stratId} value={stratId} className="py-2 text-[0.7rem]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{strat.name}</span>
                        <span className="py-0.2 rounded bg-primary/10 px-1.5 text-[10px] text-primary"></span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Strategy Mini Callout */}
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/40 p-2.5 font-sans text-[0.6rem] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{currentStratInfo.description}</span>
          </div>
        </div>

        {/* Seed Input & Randomizer */}
        <div className={compact ? 'flex flex-col gap-1' : 'flex flex-col gap-1.5'}>
          <div className="flex items-center justify-between">
            <Label htmlFor="seed-input" className="text-[0.7rem] font-semibold">
              RNG Seed (Determinism)
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Input
              id="seed-input"
              type="number"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              onBlur={handleSeedBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleSeedBlur()}
              className={
                compact
                  ? 'h-8 font-mono text-[0.7rem] font-semibold'
                  : 'h-9 font-mono text-xs font-semibold'
              }
              placeholder="e.g. 27"
            />
            <Button
              variant="outline"
              size="default"
              onClick={newSeed}
              title="Pick a random seed"
              className={
                compact
                  ? 'h-8 shrink-0 gap-1.5 rounded-lg text-[0.7rem] font-semibold transition-all hover:border-primary/30 dark:hover:bg-accent/50'
                  : 'h-9 shrink-0 gap-1.5 rounded-lg text-xs font-semibold transition-all hover:border-primary/30 dark:hover:bg-accent/50'
              }
            >
              <Dices className="h-4 w-4" />
              <span>Random</span>
            </Button>
          </div>
        </div>

        {/* Advanced Policy & Knobs Collapsible */}
        <Collapsible
          open={isOpenAdvanced}
          onOpenChange={setIsOpenAdvanced}
          className="rounded-lg border border-border/60 bg-dark-accent"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center justify-between p-5 text-[0.7rem] font-medium text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                <span>Advanced Policy Knobs</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isOpenAdvanced ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="flex flex-col gap-5 border-t border-border/50 p-3 pt-3">
            {/* Sideways Moves Policy */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="allow-sideways-switch" className="text-[0.7rem] font-medium">
                  Allow Sideways Moves
                </Label>
                <span className="text-[0.6rem] text-muted-foreground">
                  Traverse plateaus (Δ = 0)
                </span>
              </div>
              <Switch
                id="allow-sideways-switch"
                checked={config.allowSideways ?? true}
                onCheckedChange={(checked) => setConfig({ allowSideways: checked })}
              />
            </div>

            {(config.allowSideways ?? true) && (
              <div className="flex flex-col gap-1 border-l-2 border-primary/20 pl-2">
                <div className="flex items-center justify-between text-[0.65rem]">
                  <span className="text-muted-foreground">Max Plateau Streak</span>
                  <span className="font-mono font-semibold">
                    {config.maxConsecutiveSideways ?? 100}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={200}
                  step={5}
                  value={[config.maxConsecutiveSideways ?? 100]}
                  onValueChange={(v) =>
                    v[0] !== undefined && setConfig({ maxConsecutiveSideways: v[0] })
                  }
                  className="cursor-pointer py-1"
                />
              </div>
            )}

            {/* Random Restarts Policy */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="allow-restarts-switch" className="text-[0.7rem] font-medium">
                  Random Restarts
                </Label>
                <span className="text-[0.6rem] text-muted-foreground">
                  Restart from new board if stuck
                </span>
              </div>
              <Switch
                id="allow-restarts-switch"
                checked={config.allowRestarts ?? false}
                onCheckedChange={(checked) => setConfig({ allowRestarts: checked })}
              />
            </div>

            {config.allowRestarts && (
              <div className="flex flex-col gap-1 border-l-2 border-primary/20 pl-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Max Restarts Limit</span>
                  <span className="font-mono font-semibold">{config.maxRestarts ?? 10}</span>
                </div>
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[config.maxRestarts ?? 10]}
                  onValueChange={(v) => v[0] !== undefined && setConfig({ maxRestarts: v[0] })}
                  className="cursor-pointer py-1"
                />
              </div>
            )}

            {/* Simulated Annealing Knobs (if SA is selected) */}
            {isSA && (
              <div className="flex flex-col gap-2 border-t border-border/40 pt-2">
                <div className="flex items-center gap-1 text-xs font-medium">
                  <span>Simulated Annealing Knobs</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[0.65rem]">
                    <span className="text-muted-foreground">Cooling Rate (α)</span>
                    <span className="font-mono font-semibold">{config.saCoolingRate ?? 0.99}</span>
                  </div>
                  <Slider
                    min={0.8}
                    max={0.999}
                    step={0.005}
                    value={[config.saCoolingRate ?? 0.99]}
                    onValueChange={(v) => v[0] !== undefined && setConfig({ saCoolingRate: v[0] })}
                    className="cursor-pointer py-1"
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
