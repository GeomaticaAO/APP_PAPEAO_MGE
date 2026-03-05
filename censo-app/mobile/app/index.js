import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addPendingItem, getPendingItems } from '../src/storage';
import { fetchViviendaByClave } from '../src/api';
import { attemptSyncNow } from '../src/sync';

const initialForm = {
  clave_vivienda: '',
  nombre: '',
  edad: '',
  telefono: '',
  calle: '',
  numero: '',
  manzana: '',
  lote: '',
  curp: ''
};

export default function HomeScreen() {
  const [form, setForm] = useState(initialForm);
  const [loadingClave, setLoadingClave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingItems().then((items) => setPendingCount(items.length));
  }, []);

  function patch(values) {
    setForm((prev) => ({ ...prev, ...values }));
  }

  async function buscarPorClave() {
    if (!form.clave_vivienda.trim()) {
      Alert.alert('Dato faltante', 'Ingresa la clave vivienda.');
      return;
    }

    setLoadingClave(true);
    try {
      const data = await fetchViviendaByClave(form.clave_vivienda.trim());
      patch({
        nombre: data.nombre_base || '',
        edad: data.edad_base ? String(data.edad_base) : '',
        telefono: data.telefono_base || '',
        calle: data.calle_base || '',
        numero: data.numero_base || '',
        manzana: data.manzana_base || '',
        lote: data.lote_base || '',
        curp: data.curp_base || ''
      });
      Alert.alert('Clave encontrada', 'Se cargaron los datos del censo previo.');
    } catch (error) {
      Alert.alert('No encontrada', error.message || 'No existe esa clave en la base.');
    } finally {
      setLoadingClave(false);
    }
  }

  async function guardarOffline() {
    if (!form.clave_vivienda.trim()) {
      Alert.alert('Dato faltante', 'La clave vivienda es obligatoria.');
      return;
    }

    setSaving(true);
    try {
      const localItem = {
        ...form,
        local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        edad: form.edad ? Number(form.edad) : null,
        fecha_captura: new Date().toISOString()
      };
      const total = await addPendingItem(localItem);
      setPendingCount(total);
      setForm((prev) => ({ ...initialForm, clave_vivienda: prev.clave_vivienda }));
      Alert.alert('Guardado', 'Registro guardado en el celular.');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar localmente.');
    } finally {
      setSaving(false);
    }
  }

  async function sincronizar() {
    setSyncing(true);
    try {
      const result = await attemptSyncNow('capturista_campo');
      if (!result.ok) {
        Alert.alert('Sin sincronizar', result.reason || 'No se pudo sincronizar.');
      } else {
        const items = await getPendingItems();
        setPendingCount(items.length);
        Alert.alert('Sincronización completada', `Registros enviados: ${result.synced}`);
      }
    } catch (error) {
      Alert.alert('Error de sincronización', error.message || 'No se pudo sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Censo Offline</Text>
      <Text style={styles.pending}>Pendientes por enviar: {pendingCount}</Text>

      <Text style={styles.label}>Clave Vivienda</Text>
      <TextInput
        style={styles.input}
        value={form.clave_vivienda}
        onChangeText={(value) => patch({ clave_vivienda: value })}
        placeholder="Ej: VIV-000123"
      />

      <TouchableOpacity style={styles.button} onPress={buscarPorClave} disabled={loadingClave}>
        <Text style={styles.buttonText}>{loadingClave ? 'Buscando...' : 'Buscar clave vivienda'}</Text>
      </TouchableOpacity>

      {[
        ['Nombre', 'nombre'],
        ['Edad', 'edad'],
        ['Teléfono', 'telefono'],
        ['Calle', 'calle'],
        ['Número', 'numero'],
        ['Manzana', 'manzana'],
        ['Lote', 'lote'],
        ['CURP', 'curp']
      ].map(([label, key]) => (
        <View key={key}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(value) => patch({ [key]: value })}
            autoCapitalize={key === 'curp' ? 'characters' : 'sentences'}
            keyboardType={key === 'edad' ? 'numeric' : 'default'}
          />
        </View>
      ))}

      <TouchableOpacity style={[styles.button, styles.save]} onPress={guardarOffline} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Guardando...' : 'Guardar offline'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.sync]} onPress={sincronizar} disabled={syncing}>
        <Text style={styles.buttonText}>{syncing ? 'Sincronizando...' : 'Sincronizar por WiFi/Internet'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    gap: 6
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6
  },
  pending: {
    marginBottom: 8,
    color: '#444'
  },
  label: {
    fontWeight: '600',
    marginTop: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4
  },
  button: {
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center'
  },
  save: {
    backgroundColor: '#047857'
  },
  sync: {
    backgroundColor: '#6D28D9',
    marginBottom: 32
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700'
  }
});
