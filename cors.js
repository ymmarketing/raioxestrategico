/**
 * CORS — permite que o front (GitHub Pages ou o próprio domínio Vercel)
 * converse com estas funções, e bloqueia o resto.
 *
 * Configure ALLOWED_ORIGINS na Vercel com a lista separada por vírgula, ex.:
 *   https://yasminmenezes.github.io,https://raioxestrategico.vercel.app
 *
 * Se ALLOWED_ORIGINS não estiver definida, cai num padrão seguro:
 * só o próprio PUBLIC_BASE_URL.
 */

function origensPermitidas() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.PUBLIC_BASE_URL || '';
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/**
 * Aplica os headers de CORS. Devolve true se a requisição era um preflight
 * (OPTIONS) e já foi respondida — nesse caso, o handler deve retornar.
 */
export function aplicarCors(req, res) {
  const permitidas = origensPermitidas();
  const origin = req.headers.origin;

  if (origin && permitidas.includes(origin.replace(/\/$/, ''))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (permitidas.length === 1) {
    // origem única configurada: usa ela como padrão
    res.setHeader('Access-Control-Allow-Origin', permitidas[0]);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

/** Rejeita métodos não permitidos. Devolve true se já respondeu. */
export function exigirMetodo(req, res, metodo) {
  if (req.method !== metodo) {
    res.setHeader('Allow', metodo);
    res.status(405).json({ ok: false, error: 'Método não permitido.' });
    return true;
  }
  return false;
}
