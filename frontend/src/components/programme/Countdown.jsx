import { START_DATE, START_LABEL } from "@/lib/programme";
import { useCountdown, pad } from "@/components/programme/useCountdown";

/** Days / hours / minutes / seconds to the batch start, as four tiles. */
export const Countdown = ({ className = "", testId = "programme-countdown" }) => {
  const left = useCountdown(START_DATE);

  if (left.done) {
    return (
      <div className={`border border-line p-5 ${className}`} data-testid={testId}>
        <p className="label-tech text-accentText">Batch 01 is live</p>
        <p className="mt-2 text-sm text-mutedInk">Classes began on {START_LABEL}. Apply to join the next batch.</p>
      </div>
    );
  }

  const tiles = [
    [left.days, "Days"],
    [pad(left.hours), "Hours"],
    [pad(left.minutes), "Min"],
    [pad(left.seconds), "Sec"],
  ];

  return (
    <div className={className} data-testid={testId}>
      <div className="grid grid-cols-4 gap-px bg-line border border-line" role="timer" aria-live="off">
        {tiles.map(([v, u]) => (
          <div key={u} className="bg-bg px-2 py-4 text-center">
            <p className="font-grotesk font-semibold text-3xl md:text-4xl text-inkStrong tabular-nums leading-none">{v}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-mutedInk">{u}</p>
          </div>
        ))}
      </div>
      <p className="sr-only">
        {left.days} days, {left.hours} hours until the batch starts on {START_LABEL}.
      </p>
    </div>
  );
};

export default Countdown;
