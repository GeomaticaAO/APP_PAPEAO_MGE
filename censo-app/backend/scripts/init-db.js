import 'dotenv/config';
import { pool } from '../src/db.js';

const sql = `
CREATE TABLE IF NOT EXISTS viviendas_base (
  id BIGSERIAL PRIMARY KEY,
  clave_vivienda TEXT NOT NULL UNIQUE,
  nombre_base TEXT,
  edad_base INTEGER,
  telefono_base TEXT,
  calle_base TEXT,
  numero_base TEXT,
  manzana_base TEXT,
  lote_base TEXT,
  curp_base TEXT,
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS censos_campo (
  id BIGSERIAL PRIMARY KEY,
  local_id TEXT NOT NULL UNIQUE,
  clave_vivienda TEXT NOT NULL,
  nombre TEXT,
  edad INTEGER,
  telefono TEXT,
  calle TEXT,
  numero TEXT,
  manzana TEXT,
  lote TEXT,
  curp TEXT,
  dispositivo_id TEXT,
  usuario TEXT,
  fecha_captura TIMESTAMP,
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viviendas_base_clave ON viviendas_base (clave_vivienda);
CREATE INDEX IF NOT EXISTS idx_censos_campo_clave ON censos_campo (clave_vivienda);
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('Error al inicializar DB:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
