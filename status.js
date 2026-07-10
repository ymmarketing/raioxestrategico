/**
 * GET /api/pagamento/status?ref=<referencia>
 *
 * Devolve o status real, lido do storage (que só o webhook escreve).
 * Se a referência não existir, devolve "pending" — NUNCA libera.
 *
 * Resposta:
 *   { status, ref, updatedAt }
 *   { status: "pending", message: "Pagamento ainda não localizado." }
 */

import { aplicarCors, exigirMetodo } from '../../lib/cors.js';
import { store, STATUS, STATUS_VALIDOS, temRedis } from '../../lib/store.js';
import { refValida, log } from '../../lib/security.js';

export default async function handler(req, res) {
  if (aplicarCors(req, res)) return;
  if (exigirMetodo(req, res, 'GET')) return;

  // sem cache: o status muda
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const ref = String(req.query?.ref || '').trim();

  if (!ref || !refValida(ref)) {
    return res.status(200).json({
      status: STATUS.PENDING,
      message: 'Pagamento ainda não localizado.',
    });
  }

  if (!temRedis) {
    // Sem storage não existe verdade a consultar. Não libera.
    log('error', 'status consultado sem storage configurado', { ref });
    return res.status(200).json({
      status: STATUS.PENDING,
      message: 'Pagamento ainda não localizado.',
    });
  }

  try {
    const registro = await store.buscar(ref);

    if (!registro) {
      return res.status(200).json({
        status: STATUS.PENDING,
        message: 'Pagamento ainda não localizado.',
      });
    }

    // defesa: nunca devolver um status fora do vocabulário
    const status = STATUS_VALIDOS.includes(registro.status)
      ? registro.status
      : STATUS.PENDING;

    return res.status(200).json({
      status,
      ref,
      updatedAt: registro.updatedAt || null,
    });
  } catch (e) {
    log('error', 'Falha ao consultar status', { ref, motivo: e.message });
    // erro de infraestrutura não pode virar liberação
    return res.status(200).json({
      status: STATUS.PENDING,
      message: 'Pagamento ainda não localizado.',
    });
  }
}
