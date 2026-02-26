import { useEffect, useMemo, useRef, useState } from 'react';
import { shapeLoader, type ViewportBounds, type VisibleShape } from '../services/shape-loader';
import { gtfsParser } from '../utils/gtfs-parser';

const BATCH_SIZE = 8; // Shapes to add per frame
const BATCH_DELAY = 60; // ms between batches — gives the UI thread breathing room

export function useShapes(bounds?: ViewportBounds) {
  const [gtfsLoaded, setGtfsLoaded] = useState(gtfsParser.isLoaded);
  const [renderedShapes, setRenderedShapes] = useState<VisibleShape[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueueRef = useRef<VisibleShape[]>([]);
  const currentBoundsKeyRef = useRef<string>('');

  // Poll for GTFS loaded state
  useEffect(() => {
    if (gtfsLoaded) return;

    const interval = setInterval(() => {
      if (gtfsParser.isLoaded) {
        setGtfsLoaded(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gtfsLoaded]);

  // Compute all shapes that SHOULD be visible for the current bounds
  const targetShapes = useMemo(() => {
    if (!gtfsLoaded) return [];
    if (bounds) {
      return shapeLoader.getVisibleShapes(bounds, 0.5);
    }
    return shapeLoader.getAllShapes();
  }, [gtfsLoaded, bounds?.minLat, bounds?.maxLat, bounds?.minLon, bounds?.maxLon]);

  // Progressive batching: when targetShapes changes, drip-feed them to the renderer
  useEffect(() => {
    // Cancel any in-progress batching
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    pendingQueueRef.current = [];

    const boundsKey = bounds
      ? `${bounds.minLat.toFixed(3)},${bounds.maxLat.toFixed(3)},${bounds.minLon.toFixed(3)},${bounds.maxLon.toFixed(3)}`
      : 'all';

    // Build a set of currently rendered shape IDs for fast lookup
    const renderedIds = new Set(renderedShapes.map(s => s.id));
    const targetIds = new Set(targetShapes.map(s => s.id));

    // Shapes to keep (already rendered and still in target)
    const keep = renderedShapes.filter(s => targetIds.has(s.id));

    // New shapes to add (in target but not yet rendered)
    const toAdd = targetShapes.filter(s => !renderedIds.has(s.id));

    // If we're zooming in (fewer shapes), just set immediately — removal is cheap
    if (toAdd.length === 0) {
      setRenderedShapes(keep);
      currentBoundsKeyRef.current = boundsKey;
      return;
    }

    // Start with what we can keep, then progressively add new shapes
    setRenderedShapes(keep);
    pendingQueueRef.current = [...toAdd];
    currentBoundsKeyRef.current = boundsKey;

    const drainBatch = () => {
      const queue = pendingQueueRef.current;
      if (queue.length === 0) return;

      const batch = queue.splice(0, BATCH_SIZE);
      setRenderedShapes(prev => [...prev, ...batch]);

      if (queue.length > 0) {
        batchTimerRef.current = setTimeout(drainBatch, BATCH_DELAY);
      }
    };

    // Start first batch on next frame
    batchTimerRef.current = setTimeout(drainBatch, BATCH_DELAY);

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, [targetShapes]);

  return { visibleShapes: renderedShapes };
}
