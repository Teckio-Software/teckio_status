// GET /api/estado — estado de los monitores de UptimeRobot para la página status.teckio.mx.
// La clave (de solo lectura) vive en la variable de entorno UPTIMEROBOT_API_KEY de Vercel y
// nunca llega al navegador. Vercel guarda la respuesta 60 s: todos los visitantes comparten
// la misma consulta y no se pasa del límite de UptimeRobot.

// UptimeRobot v2: 0 pausado, 1 sin revisar aún, 2 arriba, 8 parece caído, 9 caído.
const ESTADOS = { 0: 'pausado', 1: 'pendiente', 2: 'operando', 8: 'intermitente', 9: 'caido' };
const DIAS = 30;
const DIA = 86400;
// Días de calendario de México (UTC-6, sin horario de verano desde 2022).
const DESFASE_MX = 6 * 3600;

/** Rangos [inicio, fin] (segundos) de los últimos 30 días; el de hoy termina ahora. */
function diasMexico(ahora) {
  const hoy = Math.floor((ahora - DESFASE_MX) / DIA) * DIA + DESFASE_MX;
  return Array.from({ length: DIAS }, (_, i) => {
    const inicio = hoy - (DIAS - 1 - i) * DIA;
    return [inicio, Math.min(inicio + DIA, ahora)];
  });
}

module.exports = async (req, res) => {
  const llave = process.env.UPTIMEROBOT_API_KEY;
  if (!llave) {
    res.status(500).json({ error: 'Falta UPTIMEROBOT_API_KEY en Vercel.' });
    return;
  }

  try {
    const ahora = Math.floor(Date.now() / 1000);
    const dias = diasMexico(ahora);
    const respuesta = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: llave,
        format: 'json',
        custom_uptime_ratios: '30-90',
        custom_uptime_ranges: dias.map(([a, b]) => `${a}_${b}`).join('-'),
        logs: '1',
        logs_limit: '10',
      }),
    });
    const datos = await respuesta.json();
    if (datos.stat !== 'ok') throw new Error(datos.error?.message || 'UptimeRobot respondió con error');

    const monitores = datos.monitors.map((m) => {
      const [dias30, dias90] = String(m.custom_uptime_ratio || '').split('-').map(Number);
      const porDia = String(m.custom_uptime_ranges || '').split('-').map(Number);
      return {
        nombre: m.friendly_name,
        estado: ESTADOS[m.status] ?? 'pendiente',
        disponibilidad30: Number.isFinite(dias30) ? dias30 : null,
        disponibilidad90: Number.isFinite(dias90) ? dias90 : null,
        // Un valor por día (el último es hoy); null si el monitor aún no existía ese día.
        dias: dias.map(([inicio, fin], i) => ({
          fecha: inicio * 1000,
          disponibilidad: fin <= (m.create_datetime || 0) || !Number.isFinite(porDia[i]) ? null : porDia[i],
        })),
        // Solo caídas (tipo 1), con su duración en segundos; las más recientes primero.
        caidas: (m.logs || [])
          .filter((l) => l.type === 1)
          .map((l) => ({ inicio: l.datetime * 1000, duracion: l.duration })),
      };
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ actualizado: Date.now(), monitores });
  } catch (error) {
    // Sin datos frescos: que la página lo diga, en lugar de mostrar todo "operando".
    res.setHeader('Cache-Control', 's-maxage=15');
    res.status(502).json({ error: 'No se pudo consultar UptimeRobot.' });
  }
};
