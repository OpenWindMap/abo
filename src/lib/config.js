const config = {
  stripe_key: process.env.CONFIG_STRIPE_KEY,
  stripe_webhook_key: process.env.CONFIG_STRIPE_WEBHOOK_KEY,
  vosfactures_key: process.env.CONFIG_VOSFACTURES_KEY,
  vosfactures_domain: process.env.CONFIG_VOSFACTURES_DOMAIN,
  vosfactures_test: process.env.CONFIG_VOSFACTURES_TEST,
  activate_key: process.env.CONFIG_ACTIVATE_KEY,
  mailgun_id: process.env.CONFIG_MAILGUN_ID,
  mailgun_key: process.env.CONFIG_MAILGUN_KEY
}

for (let item in config) {
  if (!config[item]) throw new Error(`config/${item} must be set`)
}

export { config }