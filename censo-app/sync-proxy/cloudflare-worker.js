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
      const { owner, repo, branch = 'main', folder = 'capturas', items = [] } = body || {};

      if (!owner || !repo || !Array.isArray(items) || !items.length) {
        return json({ ok: false, message: 'Payload inválido' }, 400);
      }

      const token = env.GITHUB_TOKEN;
      if (!token) {
        return json({ ok: false, message: 'Falta secret GITHUB_TOKEN en el servidor' }, 500);
      }

      const stamp = new Date().toISOString().replace(/[.:]/g, '-');
      const capturistaRaw = String(items[0]?.capturista_nombre || 'sin_capturista').toLowerCase();
      const capturista = capturistaRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      const deviceId = String(items[0]?.dispositivo_id || 'web-device').replace(/\s+/g, '_');
      const filePath = `${folder}/${capturista}/${deviceId}/${stamp}.csv`;

      const headers = [
        'local_id','capturista_nombre','capturista_telefono','clave_vivienda','nombre','edad','telefono',
        'calle','numero','manzana_inegi','manzana','lote','curp','direccion_base','fecha_captura'
      ];

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
