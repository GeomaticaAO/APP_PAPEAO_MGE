import 'dotenv/config';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from '../src/db.js';

const outputPath = process.argv[2] || path.resolve(process.cwd(), 'CENSO_CAMPO_EXPORT.xlsx');

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT
        clave_vivienda AS "Clave Vivienda",
        nombre AS "Nombre",
        edad AS "Edad",
        telefono AS "Telefono",
        calle AS "Calle",
        numero AS "Numero",
        manzana AS "Manzana",
        lote AS "Lote",
        curp AS "CURP",
        dispositivo_id AS "Dispositivo",
        usuario AS "Usuario",
        fecha_captura AS "Fecha Captura"
      FROM censos_campo
      ORDER BY id DESC
    `);

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'CENSOS_CAMPO');
    xlsx.writeFile(wb, outputPath);

    console.log(`Exportación lista en: ${outputPath}`);
  } catch (error) {
    console.error('Error al exportar:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
