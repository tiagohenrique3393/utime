import { habitSceneId, type HabitSceneId } from '@/lib/habit-scene';

const sceneImage: Record<HabitSceneId, number> = {
  kimono: require('@/assets/scenes/scene-kimono.jpg'),
  meal: require('@/assets/scenes/scene-meal.jpg'),
  book: require('@/assets/scenes/scene-book.jpg'),
  dumbbell: require('@/assets/scenes/scene-dumbbell.jpg'),
  run: require('@/assets/scenes/scene-run.jpg'),
  meditate: require('@/assets/scenes/scene-meditate.jpg'),
  study: require('@/assets/scenes/scene-study.jpg'),
  bed: require('@/assets/scenes/scene-bed.jpg'),
  water: require('@/assets/scenes/scene-water.jpg'),
  teeth: require('@/assets/scenes/scene-teeth.jpg'),
  coffee: require('@/assets/scenes/scene-coffee.jpg'),
  shower: require('@/assets/scenes/scene-shower.jpg'),
  fallback: require('@/assets/scenes/scene-fallback.jpg'),
};

export function habitSceneSource(label: string) {
  return sceneImage[habitSceneId(label)];
}
