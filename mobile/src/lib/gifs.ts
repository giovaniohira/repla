import { Image } from 'expo-image';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { gifUrl } from './catalog';

// When a routine starts: download the exercise GIFs into the local cache.
// When the workout ends: clearGifs() wipes it all (expo-image cache; the app has no other remote images).
export async function prefetchWorkoutGifs(workoutId: string) {
  const { data } = await supabase.from('workout_exercises').select('exercises(catalog_key)')
    .eq('workout_id', workoutId).is('deleted_at', null);
  const urls = [...new Set((data ?? []).flatMap((x: any) => gifUrl(x.exercises?.catalog_key) ?? []))];
  if (urls.length) await Image.prefetch(urls, 'disk');
}

export async function clearGifs() {
  await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
}

// Opens the session after giving the GIF download a head start; a slow gym signal never holds the start button.
export async function startWorkout(workoutId: string) {
  await Promise.race([prefetchWorkoutGifs(workoutId).catch(() => {}), new Promise((ok) => setTimeout(ok, 2500))]);
  router.push({ pathname: '/session', params: { workout: workoutId } });
}
