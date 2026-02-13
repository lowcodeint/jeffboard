// Heartbeat status indicator component

import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';

interface HeartbeatIndicatorProps {
  lastHeartbeat?: Timestamp | null;
  heartbeatMessage?: string | null;
}

type HeartbeatStatus = 'healthy' | 'warning' | 'critical';

/**
 * HeartbeatIndicator component
 * Shows a colored dot indicating how recently a story received a heartbeat update
 *
 * Status thresholds:
 * - Green (healthy): heartbeat within last 5 minutes
 * - Yellow (warning): no heartbeat for 5-15 minutes
 * - Red (critical): no heartbeat for 15+ minutes
 *
 * Updates every 30 seconds to recheck elapsed time
 *
 * @param lastHeartbeat - Firestore timestamp of last heartbeat
 * @param heartbeatMessage - Optional message from the agent's last heartbeat
 */
export function HeartbeatIndicator({
  lastHeartbeat,
  heartbeatMessage
}: HeartbeatIndicatorProps) {
  const [status, setStatus] = useState<HeartbeatStatus>('healthy');
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Calculate heartbeat status based on elapsed time
  const calculateStatus = (): void => {
    if (!lastHeartbeat) {
      setStatus('critical');
      setElapsedMinutes(999);
      return;
    }

    const now = Date.now();
    const heartbeatTime = lastHeartbeat.toMillis();
    const elapsed = now - heartbeatTime;
    const minutes = Math.floor(elapsed / 60000);

    setElapsedMinutes(minutes);

    if (minutes < 5) {
      setStatus('healthy');
    } else if (minutes < 15) {
      setStatus('warning');
    } else {
      setStatus('critical');
    }
  };

  // Initial calculation
  useEffect(() => {
    calculateStatus();
  }, [lastHeartbeat]);

  // Periodic recalculation every 30 seconds
  useEffect(() => {
    const interval = setInterval(calculateStatus, 30000);
    return () => clearInterval(interval);
  }, [lastHeartbeat]);

  // Format tooltip text
  const getTooltipText = (): string => {
    if (!lastHeartbeat) {
      return 'No heartbeat recorded';
    }

    const timestamp = lastHeartbeat.toDate();
    const timeString = timestamp.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });

    let text = `Last heartbeat: ${timeString}`;
    if (elapsedMinutes > 0) {
      text += ` (${elapsedMinutes}m ago)`;
    }
    if (heartbeatMessage) {
      text += `\n${heartbeatMessage}`;
    }

    return text;
  };

  // Color classes based on status
  const getColorClass = (): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500 dark:bg-green-500';
      case 'warning':
        return 'bg-yellow-500 dark:bg-yellow-500';
      case 'critical':
        return 'bg-red-500 dark:bg-red-500';
    }
  };

  return (
    <div
      className="flex items-center justify-center"
      title={getTooltipText()}
      aria-label={`Heartbeat status: ${status}`}
    >
      <div
        className={`
          w-2 h-2 rounded-full
          ${getColorClass()}
          ${status === 'healthy' ? 'animate-pulse' : ''}
        `}
      />
    </div>
  );
}
