import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};
const API_URL = extra.apiUrl || 'http://localhost:4000';
const API_KEY = extra.apiKey || 'CAMBIAR_ESTA_CLAVE';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

export async function fetchViviendaByClave(claveVivienda) {
  const response = await fetch(`${API_URL}/api/viviendas/${encodeURIComponent(claveVivienda)}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'No se pudo consultar la clave');
  }

  const data = await response.json();
  return data.data;
}

export async function syncItems(items) {
  const response = await fetch(`${API_URL}/api/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ items })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al sincronizar');
  }

  return response.json();
}
