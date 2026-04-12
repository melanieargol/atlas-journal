"use client";

type CheckInValue = number | null;

export type CheckInValues = {
  mood: CheckInValue;
  stress: CheckInValue;
  energy: CheckInValue;
};

type CheckInFieldsProps = {
  values: CheckInValues;
  onChange: (key: keyof CheckInValues, value: CheckInValue) => void;
  helperText: string;
};

function CheckInControl({
  id,
  label,
  description,
  scaleLabels,
  value,
  onChange
}: {
  id: string;
  label: string;
  description: string;
  scaleLabels: { min: string; mid: string; max: string };
  value: CheckInValue;
  onChange: (value: CheckInValue) => void;
}) {
  return (
    <div className="checkin-card">
      <div className="checkin-head">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <button className="ghost-button" type="button" onClick={() => onChange(null)}>
          Clear
        </button>
      </div>
      <p className="muted-text checkin-description">{description}</p>
      <div className="checkin-value">{value ?? "Not set"}</div>
      <input
        id={id}
        className="checkin-slider"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      <div className="checkin-scale" aria-hidden="true">
        <span>{`1 - ${scaleLabels.min}`}</span>
        <span>{`5 - ${scaleLabels.mid}`}</span>
        <span>{`10 - ${scaleLabels.max}`}</span>
      </div>
    </div>
  );
}

export function CheckInFields({ values, onChange, helperText }: CheckInFieldsProps) {
  return (
    <div className="checkin-section">
      <div className="section-head compact-head">
        <div>
          <p className="section-label">Optional check-ins</p>
          <h3>Anchor today's trends with your own numbers.</h3>
        </div>
        <p className="muted-text">{helperText}</p>
      </div>

      <div className="checkin-grid">
        <CheckInControl
          id="user-mood"
          label="Mood"
          description="How positive or negative the overall emotional tone felt."
          scaleLabels={{ min: "very negative", mid: "neutral", max: "very positive" }}
          value={values.mood}
          onChange={(value) => onChange("mood", value)}
        />
        <CheckInControl
          id="user-stress"
          label="Stress"
          description="How activated, pressured, or overwhelmed your system felt."
          scaleLabels={{ min: "very relaxed", mid: "moderate stress", max: "panic-level stress" }}
          value={values.stress}
          onChange={(value) => onChange("stress", value)}
        />
        <CheckInControl
          id="user-energy"
          label="Energy"
          description="How physically or mentally energized you felt overall."
          scaleLabels={{ min: "exhausted", mid: "moderate energy", max: "very energetic" }}
          value={values.energy}
          onChange={(value) => onChange("energy", value)}
        />
      </div>
    </div>
  );
}
