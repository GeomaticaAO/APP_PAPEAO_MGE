import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, testConnection } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.SYNC_API_KEY || 'CAMBIAR_ESTA_CLAVE';

function auth(req, res, next) {
  const token = req.header('x-api-key');
  if (!token || token !== API_KEY) {
    return res.status(401).json({ ok: false, message: 'No autorizado' });
  }
  next();
}

app.get('/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ ok: true, message: 'API activa' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error DB', error: error.message });
  }
});

app.get('/api/viviendas/:clave', auth, async (req, res) => {
  const { clave } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT clave_vivienda, nombre_base, edad_base, telefono_base, calle_base, numero_base, manzana_base, lote_base, curp_base
       FROM viviendas_base
       WHERE clave_vivienda = $1
       LIMIT 1`,
      [clave]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Clave no encontrada en base inicial' });
    }

    return res.json({ ok: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al consultar clave', error: error.message });
  }
});

app.post('/api/sync', auth, async (req, res) => {
  const payload = req.body;
  const items = Array.isArray(payload) ? payload : payload?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: 'No hay registros para sincronizar' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const {
        local_id,
        clave_vivienda,
        nombre,
        edad,
        telefono,
        calle,
        numero,
        manzana,
        lote,
        curp,
        dispositivo_id,
        usuario,
        fecha_captura
      } = item;

      await client.query(
        `INSERT INTO censos_campo (
          local_id, clave_vivienda, nombre, edad, telefono, calle, numero, manzana, lote, curp,
          dispositivo_id, usuario, fecha_captura, raw_json
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        ) ON CONFLICT (local_id) DO UPDATE SET
          clave_vivienda = EXCLUDED.clave_vivienda,
          nombre = EXCLUDED.nombre,
          edad = EXCLUDED.edad,
          telefono = EXCLUDED.telefono,
          calle = EXCLUDED.calle,
          numero = EXCLUDED.numero,
          manzana = EXCLUDED.manzana,
          lote = EXCLUDED.lote,
          curp = EXCLUDED.curp,
          dispositivo_id = EXCLUDED.dispositivo_id,
          usuario = EXCLUDED.usuario,
          fecha_captura = EXCLUDED.fecha_captura,
          raw_json = EXCLUDED.raw_json,
          updated_at = NOW()`,
        [
          local_id,
          clave_vivienda,
          nombre,
          edad || null,
          telefono,
          calle,
          numero,
          manzana,
          lote,
          curp,
          dispositivo_id,
          usuario,
          fecha_captura || null,
          JSON.stringify(item)
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ ok: true, synced: items.length });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ ok: false, message: 'Error de sincronización', error: error.message });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`API de censo en puerto ${PORT}`);
});
