import { useState, useEffect, useCallback } from 'react';
import type { AggregateStats, SimProgress } from '../../sim/types.js';

export function useSimData(): {
  data: AggregateStats | null;
  progress: SimProgress | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<AggregateStats | null>(null);
  const [progress, setProgress] = useState<SimProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/sim-data/current/aggregate.json');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll progress every 2 seconds
  useEffect(() => {
    let prevHadProgress = false;

    const poll = async () => {
      try {
        const res = await fetch('/sim-data/progress.json');
        if (res.ok) {
          const json = await res.json();
          setProgress(json);
          prevHadProgress = true;
        } else {
          if (prevHadProgress) {
            // Sim just finished — re-fetch data
            prevHadProgress = false;
            setProgress(null);
            fetchData();
          } else {
            setProgress(null);
          }
        }
      } catch {
        if (prevHadProgress) {
          prevHadProgress = false;
          setProgress(null);
          fetchData();
        } else {
          setProgress(null);
        }
      }
    };

    const interval = setInterval(poll, 2000);
    poll(); // initial poll
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, progress, loading, error };
}
