import Stripe from 'stripe';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const tierPriceMap = {
  demon_mark: { priceId: 'price_demon_mark_test', amount: 900 },
  full_counter: { priceId: 'price_full_counter_test', amount: 2900 },
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tierPriceMap[tier]) return res.status(400).json({ message: 'Invalid tier' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Meliodas AI - ${tier.replace('_', ' ')}` },
            unit_amount: tierPriceMap[tier].amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/chat.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing.html`,
      customer_email: user.email,
      metadata: { userId: user._id.toString(), tier },
    });
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Stripe session failed' });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const tier = session.metadata.tier;
    await User.findByIdAndUpdate(userId, { subscriptionTier: tier, stripeCustomerId: session.customer });
  }
  res.json({ received: true });
};