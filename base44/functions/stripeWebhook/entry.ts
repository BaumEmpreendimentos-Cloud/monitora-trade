import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';

function periodEndISO(sub) {
  const ts = sub && sub.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const webhookSecret = secrets.get('STRIPE_WEBHOOK_SECRET');
    const signature = req.headers.get('stripe-signature') || '';
    const rawBody = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('stripeWebhook signature inválida', err.message);
      return Response.json({ error: 'Assinatura inválida: ' + err.message }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      if (userId) {
        let periodEnd = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            periodEnd = periodEndISO(sub);
          } catch (e) { console.error('retrieve sub', e.message); }
        }
        await base44.asServiceRole.entities.User.update(userId, {
          stripe_customer_id: customerId,
          subscription_status: 'active',
          plan: 'premium',
          current_period_end: periodEnd
        });

        // Affiliate: mark indication as converted and reward referrer
        try {
          const indicacoes = await base44.asServiceRole.entities.Indicacao.filter({ user_id: userId, status: 'pendente' });
          for (const ind of indicacoes) {
            let rewarded = false;
            try {
              const referrer = await base44.asServiceRole.entities.User.get(ind.indicado_por_id);
              if (referrer?.stripe_customer_id) {
                await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
                  amount: -((ind.beneficio_dias || 30) * 100),
                  currency: 'brl',
                  description: 'Crédito por indicação de usuário'
                });
                rewarded = true;
              }
            } catch (e) { console.error('affiliate referrer reward', e.message); }
            await base44.asServiceRole.entities.Indicacao.update(ind.id, {
              status: 'convertido',
              data_conversao: new Date().toISOString(),
              recompensa_aplicada: rewarded
            });
          }
        } catch (e) { console.error('affiliate check', e.message); }

        // Affiliate: claim pending rewards for indications this user made
        try {
          const pending = await base44.asServiceRole.entities.Indicacao.filter({ indicado_por_id: userId, status: 'convertido', recompensa_aplicada: false });
          for (const ind of pending) {
            try {
              await stripe.customers.createBalanceTransaction(customerId, {
                amount: -((ind.beneficio_dias || 30) * 100),
                currency: 'brl',
                description: 'Crédito por indicação de usuário'
              });
              await base44.asServiceRole.entities.Indicacao.update(ind.id, { recompensa_aplicada: true });
            } catch (e) { console.error('affiliate claim', e.message); }
          }
        } catch (e) { console.error('pending rewards', e.message); }
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: customerId });
      if (users.length) {
        const u = users[0];
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
        await base44.asServiceRole.entities.User.update(u.id, {
          subscription_status: status,
          current_period_end: periodEndISO(sub)
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}