export const LIGHTHOUSE_CATEGORY_THRESHOLDS = Object.freeze({
  performance: 0.95,
  accessibility: 0.98,
  "best-practices": 0.95,
  seo: 0.95,
});

export const LIGHTHOUSE_METRIC_BUDGETS = Object.freeze({
  "largest-contentful-paint": Object.freeze({
    label: "LCP",
    maximum: 2_500,
    unit: "ms",
  }),
  "cumulative-layout-shift": Object.freeze({
    label: "CLS",
    maximum: 0.1,
    unit: "",
  }),
});

const REQUIRED_NUMERIC_AUDITS = Object.freeze([
  ...Object.keys(LIGHTHOUSE_METRIC_BUDGETS),
  "total-blocking-time",
]);

const requireFiniteNumber = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
};

export const validateLighthouseRunCount = (value) => {
  if (!Number.isSafeInteger(value) || value < 1 || value % 2 === 0) {
    throw new Error("LIGHTHOUSE_RUNS must be a positive odd safe integer");
  }
  return value;
};

export const median = (values, label = "median input") => {
  if (!Array.isArray(values) || values.length === 0 || values.length % 2 === 0) {
    throw new Error(`${label} must contain a positive odd number of values`);
  }
  const ordered = values
    .map((value) => requireFiniteNumber(value, label))
    .sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
};

export const summarizeLighthouseRuns = (lighthouseResults) => {
  validateLighthouseRunCount(lighthouseResults?.length);

  const scores = Object.fromEntries(
    Object.keys(LIGHTHOUSE_CATEGORY_THRESHOLDS).map((category) => [
      category,
      median(
        lighthouseResults.map((result) =>
          requireFiniteNumber(
            result?.categories?.[category]?.score,
            `${category} score`,
          )
        ),
        `${category} scores`,
      ),
    ]),
  );
  const metrics = Object.fromEntries(
    REQUIRED_NUMERIC_AUDITS.map((auditId) => [
      auditId,
      median(
        lighthouseResults.map((result) =>
          requireFiniteNumber(
            result?.audits?.[auditId]?.numericValue,
            `${auditId} numericValue`,
          )
        ),
        `${auditId} values`,
      ),
    ]),
  );
  return { metrics, scores };
};

export const lighthouseThresholdFailures = ({ metrics, scores }) => {
  const categoryFailures = Object.entries(
    LIGHTHOUSE_CATEGORY_THRESHOLDS,
  ).flatMap(([category, threshold]) => {
    const score = scores?.[category];
    return typeof score !== "number"
      || !Number.isFinite(score)
      || score < threshold
      ? [{
          actual: score,
          category,
          threshold,
          type: "category",
        }]
      : [];
  });
  const metricFailures = Object.entries(LIGHTHOUSE_METRIC_BUDGETS)
    .flatMap(([auditId, budget]) => {
      const numericValue = metrics?.[auditId];
      return typeof numericValue !== "number"
        || !Number.isFinite(numericValue)
        || numericValue > budget.maximum
        ? [{
            ...budget,
            actual: numericValue,
            auditId,
            type: "metric",
          }]
        : [];
    });
  return [...categoryFailures, ...metricFailures];
};

export const formatLighthouseFailure = (failure) => {
  if (failure.type === "category") {
    return `${failure.category} ${
      typeof failure.actual === "number" && Number.isFinite(failure.actual)
        ? Math.round(failure.actual * 100)
        : "missing"
    } < ${Math.round(failure.threshold * 100)}`;
  }
  return `${failure.label} ${
    typeof failure.actual === "number" && Number.isFinite(failure.actual)
      ? failure.actual.toFixed(failure.label === "CLS" ? 3 : 0)
      : "missing"
  }${failure.unit} > ${failure.maximum}${failure.unit}`;
};
