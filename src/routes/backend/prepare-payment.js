import { config } from '$lib/config'
import stripe from 'stripe'

const stripeClient = stripe(config.stripe_key)

async function validateInput(data) {
  if (isNaN(parseInt(data.station_id))) throw new Error()
  if (data.email !== data.email_confirmation) return false
  for (let field in data) {
    if (!data[field]) return false
  }
  return true
}

async function getStation(id) {
    const response = await fetch(`https://api.pioupiou.fr/v1/live/${id}?contract=true`)
    if (response.status === 404) {
      return null
    } else if (response.status !== 200) {
      throw new Error()
    } else {
      return response.json()
    }
}

export async function POST({ request }) {
  try {
    const data = await request.json()
    console.log(data)
    if (!await validateInput(data)) return { status: 400 }
    
    const station = await getStation(data.station_id)
    if (!station) return { status: 404 }
    
    // return 409 Conflict if this station does not need a communication contract (does not use Sigfox..)
    if (!(station.data.contract || station.data.contract === null )) return { status: 409 }
    
    const paymentSession = await stripeClient.checkout.sessions.create({
      customer_email: data.email,
      client_reference_id: `communication-contract-${data.station_id}`,
      payment_method_types: ['card'],
      mode: 'payment',
      payment_intent_data: {
        metadata: data
      },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Abonnement balise météo n°${data.station_id}`,
            },
            unit_amount: '2000',
          },
          quantity: 1,
        },
      ],
      cancel_url: 'https://abo.openwindmap.org/',
      success_url: 'https://abo.openwindmap.org/thank-you',
    })
    
    const redirect = paymentSession.url
    return {
      status: 200,
      body: { redirect }
    }
  } catch (e) {
    console.error(e)
    return { status: 500 }
  }
}