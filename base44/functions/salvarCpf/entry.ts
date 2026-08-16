import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TRIAL_DAYS = 15;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const cpf = (body?.cpf || '').toString().replace(/\D/g, '');
    if (cpf.length !== 11) return Response.json({ error: 'CPF inválido.' }, { status: 400 });

    const updates: Record<string, any> = { cpf };

    // Determine trial_start server-side (only on first CPF save)
    if (!user.trial_start) {
      const usersWithCpf = await base44.asServiceRole.entities.User.filter({ cpf });
      const trialJaUsado = usersWithCpf.some((u) => u.id !== user.id && u.trial_start);
      updates.trial_start = trialJaUsado
        ? new Date(Date.now() - (TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();
    }

    await base44.asServiceRole.entities.User.update(user.id, updates);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('salvarCpf error', error);
    return Response.json({ error: 'Erro ao salvar CPF.' }, { status: 500 });
  }
}