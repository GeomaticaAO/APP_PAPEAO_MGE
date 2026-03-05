import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from '../src/db.js';

const preferredExcelPath = path.resolve(process.cwd(), '..', '..', 'TOTAL_JEFAS FAMILIA.xlsx');
const legacyExcelPath = path.resolve(process.cwd(), '..', '..', 'TOTAL_CENSADOS.xlsx');
const excelPath = process.argv[2]
  || (fs.existsSync(preferredExcelPath) ? preferredExcelPath : legacyExcelPath);

function normalizeRow(row) {
  const key = Object.keys(row).reduce((acc, current) => {
    acc[current.toLowerCase().trim()] = row[current];
    return acc;
  }, {});

  const clave = String(
    key['clave_vivienda'] ?? key['clave vivienda'] ?? key['clave'] ?? ''
  ).trim();

  return {
    clave_vivienda: clave,
    nombre_base: String(key['nombre'] ?? '').trim() || null,
    edad_base: Number.isFinite(Number(key['edad'])) ? Number(key['edad']) : null,
    telefono_base: String(key['telefono'] ?? key['teléfono'] ?? '').trim() || null,
    calle_base: String(key['calle'] ?? '').trim() || null,
    numero_base: String(key['numero'] ?? key['número'] ?? '').trim() || null,
    manzana_base: String(key['manzana'] ?? '').trim() || null,
    lote_base: String(key['lote'] ?? '').trim() || null,
    curp_base: String(key['curp'] ?? '').trim() || null,
    raw_json: row
  };
}

async function run() {
  try {
    const workbook = xlsx.readFile(excelPath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(firstSheet, { defval: '' });

    if (!rows.length) {
      throw new Error('El Excel está vacío o no se pudo leer.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of rows) {
        const item = normalizeRow(row);
        if (!item.clave_vivienda) continue;

        await client.query(
          `INSERT INTO viviendas_base (
            clave_vivienda, nombre_base, edad_base, telefono_base, calle_base, numero_base, manzana_base, lote_base, curp_base, raw_json
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (clave_vivienda) DO UPDATE SET
            nombre_base = EXCLUDED.nombre_base,
            edad_base = EXCLUDED.edad_base,
            telefono_base = EXCLUDED.telefono_base,
            calle_base = EXCLUDED.calle_base,
            numero_base = EXCLUDED.numero_base,
            manzana_base = EXCLUDED.manzana_base,
            lote_base = EXCLUDED.lote_base,
            curp_base = EXCLUDED.curp_base,
            raw_json = EXCLUDED.raw_json,
            updated_at = NOW()`,
          [
            item.clave_vivienda,
            item.nombre_base,
            item.edad_base,
            item.telefono_base,
            item.calle_base,
            item.numero_base,
            item.manzana_base,
            item.lote_base,
            item.curp_base,
            item.raw_json
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`Importación finalizada. Filas leídas: ${rows.length}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en importación:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
