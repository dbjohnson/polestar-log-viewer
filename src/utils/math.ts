export function calculateLinearRegression(data: { x: number; y: number }[]): { m: number; b: number } | null {
  if (data.length < 2) return null;

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += data[i].x;
    sumY += data[i].y;
    sumXY += data[i].x * data[i].y;
    sumXX += data[i].x * data[i].x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null; // Avoid division by zero if all x values are the same

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  return { m, b };
}

export function generateTrendline(
  data: { x: number; y: number }[],
  minX: number,
  maxX: number
): { x: number; trendline: number }[] {
  const regression = calculateLinearRegression(data);
  if (!regression) return [];

  return [
    { x: minX, trendline: regression.m * minX + regression.b },
    { x: maxX, trendline: regression.m * maxX + regression.b },
  ];
}
