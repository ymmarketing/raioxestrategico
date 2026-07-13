/**
 * POST /api/relatorio
 *
 * Body: { diagnostico: {...}, ref?: "ym_raiox_..." }
 * Resp: { relatorio: {...} }  |  { ok:false, error:"..." }
 *
 * A IA é APENAS REDATORA. O Motor já decidiu tudo. Ela não recalcula nota,
 * não muda pilar, não rediagnostica.
 *
 * PROTEÇÃO: se REQUER_PAGAMENTO_RELATORIO estiver ligado (padrão), a rota
 * exige uma `ref` com status approved. Sem isso, qualquer um poderia
 * chamar esta rota e consumir sua cota da Anthropic.
 *
 * Se a Anthropic falhar, devolvemos erro claro — o front cai no redatorLocal
 * (fallback que monta o relatório direto do Motor). O produto nunca trava.
 */

import { aplicarCors, exigirMetodo } from '../lib/cors.js';
import { store, STATUS, temRedis } from '../lib/store.js';
import { gerarRelatorio, temChaveAnthropic } from '../lib/anthropic.js';
import { refValida, erroSeguro, log, limitarTaxa } from '../lib/security.js';

const EXIGE_PAGAMENTO =
  String(process.env.REQUER_PAGAMENTO_RELATORIO ?? 'true').toLowerCase() !== 'false';

export default async function handler(req, res) {
  if (aplicarCors(req, res)) return;
  if (exigirMetodo(req, res, 'POST')) return;

  if (!temChaveAnthropic) {
    return erroSeguro(res, 503, 'Redação por IA indisponível.', {
      causa: 'ANTHROPIC_API_KEY ausente',
    });
  }

  // rate limit por IP: protege a cota da Anthropic
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'desconhecido';
  if (temRedis) {
    const ok = await limitarTaxa(store, `relatorio:${ip}`, 6);
    if (!ok) {
      return erroSeguro(res, 429, 'Muitas tentativas. Aguarde um minuto.', { ip });
    }
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== 'object') {
    return erroSeguro(res, 400, 'Requisição inválida.');
  }

  const { diagnostico, ref } = body;

  if (!diagnostico || typeof diagnostico !== 'object') {
    return erroSeguro(res, 400, 'Diagnóstico ausente.');
  }
  // sanidade: o objeto precisa parecer o do Motor
  if (!diagnostico.pilares || !diagnostico.veredito) {
    return erroSeguro(res, 400, 'Diagnóstico em formato inesperado.');
  }

  /* ---------- só gera relatório para quem pagou ---------- */
  if (EXIGE_PAGAMENTO) {
    if (!temRedis) {
      return erroSeguro(res, 503, 'Serviço temporariamente indisponível.', {
        causa: 'storage ausente',
      });
    }
    if (!ref || !refValida(ref)) {
      return erroSeguro(res, 403, 'Acesso não autorizado.', { causa: 'ref ausente/invalida' });
    }
    let registro = null;
    try {
      registro = await store.buscar(ref);
    } catch (e) {
      return erroSeguro(res, 503, 'Serviço temporariamente indisponível.', {
        motivo: e.message,
      });
    }
    if (!registro || registro.status !== STATUS.APPROVED) {
      log('warn', 'Tentativa de gerar relatório sem pagamento aprovado.', {
        ref,
        status: registro?.status || 'inexistente',
      });
      return erroSeguro(res, 403, 'Acesso não autorizado.');
    }
  }

  /* ---------- redação ---------- */
  try {
    const relatorio = await gerarRelatorio(diagnostico);
    log('info', 'Relatório gerado com sucesso.', { ref: ref || null });
    return res.status(200).json({ ok: true, relatorio });
  } catch (e) {
    // O front tem redatorLocal como fallback. Erro claro, sem detalhe interno.
    return erroSeguro(
      res,
      502,
      'A redação por IA falhou. O relatório será montado localmente.',
      { motivo: e.message, ref: ref || null }
    );
  }
}
