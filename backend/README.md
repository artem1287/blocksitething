# @taper/backend

Supabase project: schema in `supabase/migrations/`, Stripe integration in
`supabase/functions/`. Nothing here runs automatically — a few one-time steps once you have the
project.

## 1. Apply the schema

Supabase dashboard → **SQL Editor** → paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run. No CLI needed for
this part.

## 2. Create the Stripe products (test mode)

Dashboard → **Product catalog** → **Add product** → "Taper Premium":
- A recurring **Monthly** price: $6.99/mo.
- A recurring **Annual** price: $39.99/yr.

Copy both **Price IDs** (`price_...`, not the product ID) — the checkout function needs them as
`STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`.

## 3. Deploy the Edge Functions

These need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in —
`supabase login` opens a browser sign-in, so that one step has to happen in your own terminal, not
something I can run for you. Once logged in:

```
supabase link --project-ref <your-project-ref>

supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_MONTHLY=price_... \
  STRIPE_PRICE_ANNUAL=price_...

supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for every Edge Function
— no need to set those two yourself.

## 4. Point Stripe at the webhook

Stripe dashboard → **Developers → Webhooks** → **Add endpoint** → URL is the
`stripe-webhook` function's URL from the deploy output
(`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`) → select events
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `customer.subscription.trial_will_end` → copy the **Signing
secret** into `STRIPE_WEBHOOK_SECRET` above (you'll need to re-run the `secrets set` command once
you have it, since the real secret only appears after the endpoint exists).

## What's still a placeholder

`customer.subscription.trial_will_end` is handled (touches the row so you can see it fired) but
doesn't send anything — actually emailing the user before their trial converts needs an email
provider wired in (Resend's free tier is a reasonable pick). Not built yet; flagged rather than
faked.
