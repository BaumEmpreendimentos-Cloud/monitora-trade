import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.lifetime_access) {
      return Response.json({ error: 'Assinatura vitalícia não pode ser cancelada.' }, { status: 400 });
    }

    if (!user.stripe_customer_id) {
      return Response.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 400 });
    }

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 10
    });

    if (!subscriptions.data.length) {
      return Response.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 400 });
    }

    let canceledSub = null;
    for (const sub of subscriptions.data) {
      canceledSub = await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: true
      });
    }

    const periodEnd = canceledSub && canceledSub.current_period_end
      ? new Date(canceledSub.current_period_end * 1000).toISOString()
      : null;

    await base44.asServiceRole.entities.User.update(user.id, {
      current_period_end: periodEnd,
      cancel_at_period_end: true
    });

    return Response.json({
      success: true,
      cancel_at_period_end: true,
      current_period_end: periodEnd
    });
  } catch (error) {
    console.error('cancelSubscription error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}