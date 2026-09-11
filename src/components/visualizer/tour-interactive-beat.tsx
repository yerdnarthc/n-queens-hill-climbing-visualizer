'use client';

/**
 * Interactive tour beats (Step 1, beats 3–4: hover-invite + hit-ring).
 *
 * Each beat runs a `watch → continue → do → done` phase machine:
 * watch a looping demo video (locked — no nav), Continue once the first
 * loop ends, perform the action on the real board (gated — Next stays
 * hidden), then an acknowledgment with Next. Back is always available and
 * resets the phase; the header X skips the whole tour as usual.
 *
 * Gates are observed from the DOM via MutationObserver (rays overlay for
 * beat 3, `queen-ray-hit-*` nodes for beat 4) — hover state stays local to
 * Chessboard by design, so the tour watches rather than subscribes. Hover,
 * keyboard focus, and tap-to-pin ALL satisfy the gates through the same
 * inspect path, which is also what makes this work on touch devices.
 *
 * Copy adapts to input capability: coarse pointers read "tap", fine
 * pointers read "hover (or tap, on touch screens)". Evaluated at beat
 * mount (content remounts per beat), so mid-tour input switches behave.
 */
import * as React from 'react';
import { useTour } from '@reactour/tour';
import { GripVertical, X } from 'lucide-react';
import { simulationStore, tourUiStore } from '@/store';
import { cn } from '@/lib/utils';
import type { FlatTourBeat } from './tour-adapter';

export type InteractiveBeatId = 'hover-invite' | 'hit-ring';

/** Beat keys (with group prefix) that render the interactive flow. */
export const INTERACTIVE_BEAT_KEYS: ReadonlySet<string> = new Set([
  'chessboard:hover-invite',
  'chessboard:hit-ring',
]);

type InteractivePhase = 'watch' | 'continue' | 'do' | 'done';

const DEMO_VIDEO_SRC: Record<InteractiveBeatId, string> = {
  'hover-invite': '/tour-demo-vids/hover-queen-demo.mp4',
  'hit-ring': '/tour-demo-vids/queen-red-ring-demo.mp4',
};

const DEMO_VIDEO_LABEL: Record<InteractiveBeatId, string> = {
  'hover-invite': 'Demo: hovering a queen reveals its attack lines',
  'hit-ring': 'Demo: hovering a queen in sight shows red rings',
};

/** Shared tooltip header: grip + counter + tour-exit X. */
export function BeatHeader({ beat, isWelcome }: { beat: FlatTourBeat; isWelcome: boolean }) {
  const { setIsOpen, setMeta } = useTour();
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          aria-hidden="true"
          data-testid="tour-drag-handle"
        />
        <p className="font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
          {isWelcome
            ? 'Welcome'
            : `Step ${beat.topIndex + 1} of ${beat.topTotal}` +
              (beat.subTotal > 1 ? ` · ${beat.subIndex + 1}/${beat.subTotal}` : '')}
        </p>
      </div>
      {!isWelcome && (
        <button
          type="button"
          onClick={() => {
            setMeta?.('1');
            setIsOpen(false);
          }}
          aria-label="Skip tour"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Shared progress dots: one per top-level group (shape + position). */
export function BeatDots({ beat }: { beat: FlatTourBeat }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: beat.topTotal }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === beat.topIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

/** True once the user has performed this beat's required board action. */
function gateSatisfied(beatId: InteractiveBeatId): boolean {
  if (typeof document === 'undefined') return false;
  if (beatId === 'hover-invite') {
    // Any inspect (hover, focus, or pin) renders the rays overlay.
    return document.querySelector('[data-testid="queen-rays"]') !== null;
  }
  // At least one red ring actually rendered — hovering a queen with nobody
  // in sight keeps waiting.
  return document.querySelector('[data-testid^="queen-ray-hit-"]') !== null;
}

function promptCopy(beatId: InteractiveBeatId, coarsePointer: boolean): string {
  if (beatId === 'hover-invite') {
    return coarsePointer
      ? 'Now you try — tap any queen on the board.'
      : 'Now you try — hover any queen on the board (or tap, on touch screens).';
  }
  return coarsePointer
    ? 'Now you try — tap a queen that has another queen in sight.'
    : 'Now you try — hover a queen that has another queen in sight (or tap, on touch screens).';
}

function ackCopy(beatId: InteractiveBeatId): string {
  if (beatId === 'hover-invite') {
    return 'There — the tints are its attack lines: every square it can reach.';
  }
  return 'There! These red rings mean these queens are in sight of another queen.';
}

const PRIMARY_BUTTON_CLASS =
  'h-8 min-w-20 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-transform hover:scale-[1.03] active:scale-95';
const GHOST_BUTTON_CLASS =
  'rounded-md px-2 py-1.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
const BACK_BUTTON_CLASS =
  'h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export function InteractiveBeat({
  beat,
  beatId,
}: {
  beat: FlatTourBeat;
  beatId: InteractiveBeatId;
}) {
  const { currentStep, setCurrentStep, setIsOpen, setMeta, steps } = useTour();
  const [phase, setPhase] = React.useState<InteractivePhase>('watch');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  // Input capability at beat mount (content remounts per beat).
  const [coarsePointer] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
  );

  // Pause on watch entry: a moving board makes hovering a specific queen
  // luck, not skill. No auto-resume — the user re-presses Play if wanted.
  React.useEffect(() => {
    simulationStore.getState().pause();
  }, []);

  // Board lock: dim + pointer-block the board during watch/continue so the
  // user watches first and touches only when the perform phase starts.
  // Cleanup clears on unmount (Back/advance/close), so the veil can never
  // strand over the board.
  React.useEffect(() => {
    tourUiStore.getState().setLockBoard(phase === 'watch' || phase === 'continue');
    return () => {
      tourUiStore.getState().setLockBoard(false);
    };
  }, [phase]);

  // Gate observer, live only during the `do` phase.
  React.useEffect(() => {
    if (phase !== 'do' || typeof document === 'undefined') return;
    if (gateSatisfied(beatId)) {
      // Deferred: the set-state-in-effect rule forbids the synchronous
      // form; a microtask is still effectively immediate here.
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setPhase('done');
      });
      return () => {
        cancelled = true;
      };
    }
    const observer = new MutationObserver(() => {
      if (gateSatisfied(beatId)) setPhase('done');
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [phase, beatId]);

  const replayVideo = () => {
    // `loop` is deliberately absent (it suppresses `ended`): restart by
    // hand so the demo loops until Continue. Guarded — jsdom has no media.
    try {
      const play = videoRef.current?.play();
      if (play) void play.catch(() => {});
    } catch {
      // No media engine (tests) — the phase advance already happened.
    }
  };

  const isLast = currentStep >= steps.length - 1;
  const advance = () => {
    if (isLast) {
      setMeta?.('1');
      setIsOpen(false);
    } else setCurrentStep(currentStep + 1);
  };
  return (
    <div className="flex flex-col gap-2.5" data-testid="tour-interactive-beat" data-phase={phase}>
      <BeatHeader beat={beat} isWelcome={false} />
      <h2 className="text-sm font-semibold tracking-tight">{beat.title}</h2>
      {phase === 'watch' || phase === 'continue' ? (
        <>
          <video
            ref={videoRef}
            data-testid="tour-demo-video"
            src={DEMO_VIDEO_SRC[beatId]}
            aria-label={DEMO_VIDEO_LABEL[beatId]}
            className="w-full rounded-md border border-border"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => {
              setPhase('continue');
              replayVideo();
            }}
            onError={() => {
              // A missing/broken video must never trap the user.
              setPhase('continue');
            }}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {phase === 'watch' ? 'Watch the demo — then it’s your turn.' : 'Got it? Now your turn.'}
          </p>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {phase === 'do' ? promptCopy(beatId, coarsePointer) : ackCopy(beatId)}
        </p>
      )}
      <BeatDots beat={beat} />
      <div className="flex items-center justify-between gap-2 pt-1">
        {phase === 'do' ? (
          <button type="button" onClick={advance} className={GHOST_BUTTON_CLASS}>
            Skip this demo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMeta?.('forever');
              setIsOpen(false);
            }}
            className={GHOST_BUTTON_CLASS}
          >
            Don’t show again
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className={BACK_BUTTON_CLASS}
            >
              Back
            </button>
          )}
          {phase === 'continue' && (
            <button type="button" onClick={() => setPhase('do')} className={PRIMARY_BUTTON_CLASS}>
              Continue
            </button>
          )}
          {phase === 'done' && (
            <button type="button" onClick={advance} className={PRIMARY_BUTTON_CLASS}>
              {isLast ? 'Done' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
