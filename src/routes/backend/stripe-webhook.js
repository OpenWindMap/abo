import { config } from '$lib/config'
import stripe from 'stripe'

import formData from 'form-data'
import Mailgun from 'mailgun.js'
const mailgun = new Mailgun(formData)
const mg = mailgun.client({username: config.mailgun_id, key: config.mailgun_key, url: 'https://api.eu.mailgun.net' })

const stripeClient = stripe(config.stripe_key)

async function createInvoice(data, payment) {
  // const date = new Date(payment.created * 1000).toISOString().substr(0, 10)
  // TODO : date should be CET/CEST and not UTC

  const cents = String(payment.amount)
  const amountTxt = `${cents.substr(0, cents.length-2)}.${cents.substr(-2)}`
  
  const invoiceData = {
    'api_token': config.vosfactures_key,
    'invoice': {
      'kind': 'vat',
      // 'sell_date': date,
      'test': config.vosfactures_test,
      'buyer_name': data.invoice_name,
      'buyer_street': data.invoice_street,
      'buyer_city': data.invoice_city,
      'buyer_post_code': data.invoice_post_code,
      'buyer_country': data.invoice_country,
      'status': 'paid',
      // 'paid_date': date,
      'payment_type': 'Carte bancaire internet',
      'paid': amountTxt,
      'buyer_email': data.email,
      'payment_to_kind': 'off',
      'positions': {
        'name': `Abonnement de communication`,
        'description': `Balise météo n°${data.station_id}\nDurée : 1 an`,
        'quantity': '1',
        'tax': '20',
        'total_price_gross': amountTxt
      }
    }
  }

  const creationResponse = await fetch(`https://${config.vosfactures_domain}/invoices.json`, {
    method: 'POST',
    body: JSON.stringify(invoiceData),
    headers: { 'Content-Type': 'application/json' }
  })
  if (!creationResponse.ok) throw new Error('Could not create invoice')
  const invoice = await creationResponse.json()

  const emailResponse = await fetch(`https://${config.vosfactures_domain}/invoices/${invoice.id}/send_by_email.json`, {
    method: 'POST',
    body: JSON.stringify({
      force: 'true',
      api_token: config.vosfactures_key
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  if (!emailResponse.ok) throw new Error('Could not send invoice')
}

async function activateContract(data) {
  const response = await fetch(`https://api.pioupiou.fr/v1/contract/activate/${data.station_id}`, {
    method: 'POST',
    body: JSON.stringify({
      key: config.activate_key,
      sponsor: data.sponsor
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  if (!response.ok) throw new Error('Could not activate communications')
}

export async function POST({ request }) {
  const body = await request.text()
  let payment = null

  try {

    let event
    try {      
      event = stripeClient.webhooks.constructEvent(
        await body,
        request.headers.get('stripe-signature'),
        config.stripe_webhook_key
      )
    } catch (e) {
      console.error(e)
      return { status: 400 }
    }
    if (event.type !== 'payment_intent.succeeded') return { status: 400 }

    payment = event.data.object
    if (payment.status !== 'succeeded') return { status: 400 }
    
    const data = payment.metadata

    if (!data.station_id) return { status: 400 }
    
    await activateContract(data)
    await createInvoice(data, payment)

    return { status: 200 }
    
  } catch (e) {
    console.error(e)
    mg.messages.create('ml.openwindmap.org', {
      from: 'abo@ml.openwindmap.org',
      to: 'contact@openwindmap.org',
      subject: '[AUTO] Erreur abo',
      text: String(e.stack) + '\n\n' + body
    })
    return { status: 204 } // return success so stripe will not retry and fuck up everything
  }  
}