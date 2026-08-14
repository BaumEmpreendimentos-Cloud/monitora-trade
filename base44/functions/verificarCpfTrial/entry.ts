import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const cpf = body?.cpf;
    if (!cpf) return Response.json({ error: 'CPF é obrigatório' }, { status: 400 });

    // Busca outros usuários com o mesmo CPF que já iniciaram trial
    const usersWithCpf = await base44.asServiceRole.entities.User.filter({ cpf: cpf });
    const trialJaUsado = usersWithCpf.some((u) => u.id !== user.id && u.trial_start);

    return Response.json({ trial_bloqueado: trialJaUsado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}