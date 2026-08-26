import { Check, Gauge } from "lucide-react";

export type ReviewRatingOption<RatingValue extends number> = {
  rating: RatingValue;
  key: string;
  label: string;
  hint: string;
  className: string;
};

type ReviewRatingConsoleProps<RatingValue extends number> = {
  busy?: boolean;
  heading: string;
  headingId: string;
  helper: string;
  onGrade: (rating: RatingValue) => Promise<void> | void;
  options: ReadonlyArray<ReviewRatingOption<RatingValue>>;
};

export function ReviewRatingConsole<RatingValue extends number>({
  busy = false,
  heading,
  headingId,
  helper,
  onGrade,
  options,
}: ReviewRatingConsoleProps<RatingValue>) {
  return (
    <section
      className="review-action-console rating-console"
      aria-labelledby={headingId}
      data-review-action="rating"
    >
      <div className="review-action-inner">
        <div className="rating-heading">
          <span className="review-command-sigil" aria-hidden="true"><Gauge size={19} /></span>
          <span>
            <b>PHÁN ĐỊNH KÝ ỨC</b>
            <strong id={headingId}>{heading}</strong>
            <small>{helper}</small>
          </span>
        </div>
        <div className="rating-buttons">
          {options.map((option, optionIndex) => (
            <button
              aria-label={`${option.label}. ${option.hint}`}
              autoFocus={optionIndex === 0}
              className={option.className}
              disabled={busy}
              key={option.rating}
              type="button"
              onClick={() => void onGrade(option.rating)}
            >
              <i className="rating-rune" aria-hidden="true">{option.key.padStart(2, "0")}</i>
              <span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
              {option.className === "good" && <Check aria-hidden="true" size={17} />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
