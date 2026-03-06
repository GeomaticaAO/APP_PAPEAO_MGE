export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, message: 'Method not allowed' }, 405);
    }

    try {
      const body = await request.json();
      const { owner, repo, branch = 'main', folder = 'capturas', type = 'main', deviceId = 'web-device', items = [] } = body || {};

      if (!owner || !repo || !Array.isArray(items) || !items.length) {
        return json({ ok: false, message: 'Payload inválido' }, 400);
      }

      const token = env.GITHUB_TOKEN;
      if (!token) {
        return json({ ok: false, message: 'Falta secret GITHUB_TOKEN en el servidor' }, 500);
      }

      const stamp = new Date().toISOString().replace(/[.:]/g, '-');
      const capturistaRaw = String(items[0]?.capturista_nombre || items[0]?.capturista_reemplazo || 'sin_capturista').toLowerCase();
      const capturista = capturistaRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      const safeDeviceId = String(items[0]?.dispositivo_id || deviceId || 'web-device').replace(/\s+/g, '_');

      const mainHeaders = [
        'local_id','capturista_nombre','capturista_telefono','clave_vivienda','nombre','edad','telefono',
        'calle','numero','manzana_inegi','manzana','lote','curp','coordenadas_gps','direccion_base','fecha_captura'
      ];

      const remHeaders = [
        'reemplazo_id','fecha_reemplazo','clave_vivienda','capturista_reemplazo',
        'local_id_anterior','local_id_actual',
        'nombre_anterior','edad_anterior','telefono_anterior','calle_anterior','numero_anterior','manzana_inegi_anterior','manzana_anterior','lote_anterior','curp_anterior','coordenadas_gps_anterior','direccion_base_anterior',
        'nombre_nuevo','edad_nueva','telefono_nuevo','calle_nueva','numero_nuevo','manzana_inegi_nueva','manzana_nueva','lote_nuevo','curp_nuevo','coordenadas_gps_nueva','direccion_base_nueva'
      ];

      const headers = type === 'reemplazados' ? remHeaders : mainHeaders;
      const suffix = type === 'reemplazados' ? '_remplazados' : '';
      const filePath = `${folder}/${capturista}/${safeDeviceId}/${stamp}${suffix}.csv`;

      const escapeCsv = (v) => {
        const s = String(v ?? '');
        return (s.includes(',') || s.includes('"') || s.includes('\n'))
          ? '"' + s.replaceAll('"', '""') + '"'
          : s;
      };

      const lines = [headers.join(',')];
      for (const item of items) {
        lines.push(headers.map((h) => escapeCsv(item[h])).join(','));
      }
      const csv = lines.join('\n');
      const content = btoa(unescape(encodeURIComponent(csv)));

      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `sync: ${capturista} ${stamp}`,
          content,
          branch
        })
      });

      if (!ghRes.ok) {
        const err = await ghRes.json().catch(() => ({}));
        return json({ ok: false, message: err.message || `GitHub error ${ghRes.status}` }, 500);
      }

      return json({ ok: true, filePath, count: items.length });
    } catch (error) {
      return json({ ok: false, message: error.message || 'Unexpected error' }, 500);
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json'
    }
  });
}
