import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { getSessionUserId } from '@/lib/accounts';
import { getDailyBoard, pauseCalendarWatch, refreshDailyBoard, subscribeDailyBoard, watchCalendarDate } from '@/lib/daily-board';

export function useDailyBoard(dateKey?: string | null) {
  const board = useSyncExternalStore(subscribeDailyBoard, getDailyBoard, getDailyBoard);
  const userId = getSessionUserId();

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }
      if (dateKey) {
        pauseCalendarWatch();
        void refreshDailyBoard(userId, dateKey);
        return;
      }
      void refreshDailyBoard(userId);
      watchCalendarDate(userId);
    }, [userId, dateKey]),
  );

  return board;
}
