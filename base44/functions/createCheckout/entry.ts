import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';

const PRICE_ID = 'price_1U14POBJEQaGzLPK4wivGjqV';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const origin = (body.origin || '').toString().trim();
    if (!origin) return Response.json({ error: 'origin é obrigatório.' }, { status: 400 });

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        base44_app_id: secrets.get('BASE44_APP_ID') || ''
      },
      success_url: `${origin}/assinatura?status=success`,
      cancel_url: `${origin}/assinatura?status=canceled`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}