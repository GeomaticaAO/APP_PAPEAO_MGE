import csv
import tempfile
from pathlib import Path

MAIN_FIELDS = [
    'local_id','capturista_nombre','capturista_telefono','clave_vivienda','nombre','edad','telefono',
    'calle','numero','manzana_inegi','manzana','lote','curp','direccion_base','fecha_captura'
]

REM_FIELDS = [
    'reemplazo_id','fecha_reemplazo','clave_vivienda','capturista_reemplazo',
    'local_id_anterior','local_id_actual',
    'nombre_anterior','edad_anterior','telefono_anterior','calle_anterior','numero_anterior','manzana_inegi_anterior','manzana_anterior','lote_anterior','curp_anterior','direccion_base_anterior',
    'nombre_nuevo','edad_nueva','telefono_nuevo','calle_nueva','numero_nuevo','manzana_inegi_nueva','manzana_nueva','lote_nuevo','curp_nuevo','direccion_base_nueva'
]


def csv_escape(value):
    s = '' if value is None else str(value)
    if ',' in s or '"' in s or '\n' in s:
        return '"' + s.replace('"', '""') + '"'
    return s


def items_to_csv(items):
    lines = [','.join(MAIN_FIELDS)]
    for row in items:
        lines.append(','.join(csv_escape(row.get(h, '')) for h in MAIN_FIELDS))
    return '\n'.join(lines)


def remplazados_to_csv(items):
    lines = [','.join(REM_FIELDS)]
    for row in items:
        lines.append(','.join(csv_escape(row.get(h, '')) for h in REM_FIELDS))
    return '\n'.join(lines)


def data_row_count(csv_text):
    rows = [r for r in csv_text.replace('\r', '').split('\n') if r]
    return max(len(rows) - 1, 0)


def collect_rows(dirs, fields, key_field, is_main=False):
    rows_by_key = {}
    for base_dir in dirs:
        if not base_dir.exists():
            continue
        for file in sorted(base_dir.rglob('*.csv')):
            if is_main and 'remplazados' in file.name.lower():
                continue
            with file.open('r', encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    row_key = (row.get(key_field) or '').strip()
                    if not row_key:
                        continue
                    rows_by_key[row_key] = {k: (row.get(k, '') or '').strip() for k in fields}
    return list(rows_by_key.values())


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def run():
    pending = [
        {
            'local_id': 'L1', 'capturista_nombre': 'Ana', 'capturista_telefono': '111', 'clave_vivienda': 'VIV-001',
            'nombre': 'Maria', 'edad': 35, 'telefono': '5551', 'calle': 'A', 'numero': '10', 'manzana_inegi': 'M1',
            'manzana': 'M1', 'lote': '1', 'curp': 'CURP1', 'direccion_base': 'Dir1', 'fecha_captura': '2026-03-05T10:00:00Z'
        },
        {
            'local_id': 'L2', 'capturista_nombre': 'Ana', 'capturista_telefono': '111', 'clave_vivienda': 'VIV-002',
            'nombre': 'Luisa', 'edad': 29, 'telefono': '5552', 'calle': 'B', 'numero': '20', 'manzana_inegi': 'M2',
            'manzana': 'M2', 'lote': '2', 'curp': 'CURP2', 'direccion_base': 'Dir2', 'fecha_captura': '2026-03-05T10:05:00Z'
        }
    ]

    reemplazo_entry = {
        'reemplazo_id': 'R1', 'fecha_reemplazo': '2026-03-05T10:10:00Z', 'clave_vivienda': 'VIV-001', 'capturista_reemplazo': 'Ana',
        'local_id_anterior': 'L1', 'local_id_actual': 'L1',
        'nombre_anterior': 'Maria', 'edad_anterior': '35', 'telefono_anterior': '5551', 'calle_anterior': 'A', 'numero_anterior': '10',
        'manzana_inegi_anterior': 'M1', 'manzana_anterior': 'M1', 'lote_anterior': '1', 'curp_anterior': 'CURP1', 'direccion_base_anterior': 'Dir1',
        'nombre_nuevo': 'Maria Actualizada', 'edad_nueva': '36', 'telefono_nuevo': '7771', 'calle_nueva': 'A', 'numero_nuevo': '11',
        'manzana_inegi_nueva': 'M1', 'manzana_nueva': 'M1', 'lote_nuevo': '1', 'curp_nuevo': 'CURP1', 'direccion_base_nueva': 'Dir1'
    }

    pending_after_replace = [
        {
            **pending[0],
            'nombre': 'Maria Actualizada',
            'edad': 36,
            'telefono': '7771',
            'numero': '11',
            'fecha_captura': '2026-03-05T10:10:00Z'
        },
        pending[1]
    ]

    csv_main = items_to_csv(pending_after_replace)
    csv_rem = remplazados_to_csv([reemplazo_entry])

    assert data_row_count(csv_main) == 2, 'CSV principal perdió filas'
    assert data_row_count(csv_rem) == 1, 'CSV de remplazados perdió filas'

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        bases = root / 'Bases de datos'
        write_text(
            bases / 'ana' / 'device1' / '2026-03-05T10-00-00.csv',
            items_to_csv(pending)
        )
        write_text(
            bases / 'ana' / 'device1' / '2026-03-05T10-10-00.csv',
            items_to_csv(pending_after_replace)
        )
        write_text(
            bases / 'Remplazados' / 'ana' / 'device1' / '2026-03-05T10-10-00_remplazados.csv',
            csv_rem
        )

        main_rows = collect_rows([bases], MAIN_FIELDS, 'local_id', is_main=True)
        rem_rows = collect_rows([bases / 'Remplazados'], REM_FIELDS, 'reemplazo_id', is_main=False)

        assert len(main_rows) == 2, f'Consolidado principal incorrecto: {len(main_rows)} filas'
        row_l1 = next((r for r in main_rows if r['local_id'] == 'L1'), None)
        assert row_l1 is not None, 'No existe local_id L1 en consolidado'
        assert row_l1['nombre'] == 'Maria Actualizada', 'Consolidado conservó versión vieja de L1'

        assert len(rem_rows) == 1, f'Consolidado remplazados incorrecto: {len(rem_rows)} filas'
        assert rem_rows[0]['reemplazo_id'] == 'R1', 'No consolidó reemplazo R1'

    print('OK: CSV principal sin pérdida de filas (2/2)')
    print('OK: CSV remplazados sin pérdida de filas (1/1)')
    print('OK: Consolidado principal conserva última versión por local_id')
    print('OK: Consolidado remplazados incluye reemplazo esperado')


if __name__ == '__main__':
    run()
