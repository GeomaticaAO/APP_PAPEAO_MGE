import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { getPendingItems, savePendingItems } from './storage';
import { syncItems } from './api';

export async function attemptSyncNow(usuario = 'capturista') {
  const net = await Network.getNetworkStateAsync();
  const isConnected = Boolean(net.isConnected && net.isInternetReachable);

  if (!isConnected) {
    return { ok: false, reason: 'Sin internet' };
  }

  const items = await getPendingItems();
  if (!items.length) {
    return { ok: true, synced: 0 };
  }

  const enriched = items.map((item) => ({
    ...item,
    dispositivo_id: Device.osInternalBuildId || Device.modelId || 'desconocido',
    usuario,
    fecha_captura: item.fecha_captura || new Date().toISOString()
  }));

  const result = await syncItems(enriched);
  await savePendingItems([]);
  return { ok: true, synced: result.synced || enriched.length };
}
