import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { c } from '@/theme';

// Pull-to-refresh control that runs the given loaders in parallel while the spinner shows.
export function useRefresh(...loads: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all(loads.map((l) => l()));
    setRefreshing(false);
  };
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />;
}
