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

/**
 * Calculate a moving average based on cumulative distance.
 * For each point, looks backward to include all points within the specified window distance.
 * @param data Array of trips with distance and efficiency values
 * @param windowDistance The window size in miles (regardless of unit system)
 * @returns Array with movingAverage property added to each data point
 */
export function calculateDistanceMovingAverage(
  data: { distance: number; efficiency: number; date: string }[],
  windowDistance: number
): { distance: number; efficiency: number; date: string; movingAverage: number | null }[] {
  if (data.length === 0) return [];
  
  // Calculate cumulative distance for each point
  let cumulativeDistance = 0;
  const withCumulative = data.map(point => {
    cumulativeDistance += point.distance;
    return {
      ...point,
      cumulativeDistance
    };
  });
  
  return withCumulative.map((point, index) => {
    // Look backward to find all points within the window
    const windowStart = point.cumulativeDistance - windowDistance;
    const windowPoints: number[] = [];
    
    for (let i = 0; i <= index; i++) {
      if (withCumulative[i].cumulativeDistance >= windowStart) {
        windowPoints.push(withCumulative[i].efficiency);
      }
    }
    
    // Only calculate if we have at least 2 points in the window
    if (windowPoints.length < 2) {
      return { ...point, movingAverage: null };
    }
    
    const avg = windowPoints.reduce((sum, val) => sum + val, 0) / windowPoints.length;
    return { ...point, movingAverage: parseFloat(avg.toFixed(2)) };
  });
}
