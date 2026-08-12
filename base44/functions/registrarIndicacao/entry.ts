import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const refId = (body.ref || '').toString().trim();
    if (!refId) return Response.json({ error: 'Parâmetro ref obrigatório.' }, { status: 400 });
    if (refId === user.id) return Response.json({ error: 'Não é possível indicar a si mesmo.' }, { status: 400 });

    // Check if already has an indication
    const existing = await base44.asServiceRole.entities.Indicacao.filter({ user_id: user.id });
    if (existing.length) return Response.json({ ok: true, message: 'Indicação já registrada.' });

    // Look up referrer
    let referrer;
    try {
      referrer = await base44.asServiceRole.entities.User.get(refId);
    } catch {
      return Response.json({ error: 'Indicador não encontrado.' }, { status: 400 });
    }

    await base44.entities.Indicacao.create({
      indicado_por_id: refId,
      indicado_por_email: referrer.email,
      user_id: user.id,
      user_email: user.email,
      status: 'pendente',
      recompensa_aplicada: false,
      data_indicacao: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('registrarIndicacao error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}