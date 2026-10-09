import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { getSessionUserId } from '@/lib/accounts';
import { getDailyBoard, refreshDailyBoard, subscribeDailyBoard, watchCalendarDate } from '@/lib/daily-board';

export function useDailyBoard() {
  const board = useSyncExternalStore(subscribeDailyBoard, getDailyBoard, getDailyBoard);
  const userId = getSessionUserId();

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }
      void refreshDailyBoard(userId);
      watchCalendarDate(userId);
    }, [userId]),
  );

  return board;
}
