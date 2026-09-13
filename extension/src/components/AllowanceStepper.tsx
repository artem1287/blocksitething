interface AllowanceStepperProps {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function AllowanceStepper({ label, minutes, onChange, step = 5, min = 10, max = 480 }: AllowanceStepperProps) {
  return (
    <div className="allowance-stepper">
      <span className="allowance-label">{label}</span>
      <div className="stepper-controls">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.max(min, minutes - step))}
          aria-label={`Decrease ${label} by ${step} minutes`}
        >
          −
        </button>
        <span className="stepper-value mono">{minutes}m</span>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.min(max, minutes + step))}
          aria-label={`Increase ${label} by ${step} minutes`}
        >
          +
        </button>
      </div>
    </div>
  );
}
