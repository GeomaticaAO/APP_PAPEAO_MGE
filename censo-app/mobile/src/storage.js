import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'censo_pending_items';

export async function getPendingItems() {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function savePendingItems(items) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(items));
}

export async function addPendingItem(item) {
  const items = await getPendingItems();
  items.push(item);
  await savePendingItems(items);
  return items.length;
}
