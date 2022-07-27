<script>
  import { page } from '$app/stores'
  import { countries } from '$lib/countries'

  let form = {
    station_id: 
      {
        label: 'Numéro de la balise',
        value: $page.url.searchParams.get('station_id')
      }, 
    sponsor: 
      {
        label: `Nom qui apparaîtra comme sponsor de l'abonnement  (vous, club, association, entreprise...)`,
        value: ''
      },
    last_name: 
      {
        label: 'Nom',
        value: ''
      },
    first_name: 
      {
        label: 'Prénom',
        value: ''
      },
    email: 
      {
        label: 'Email',
        value: ''
      },
    email_confirmation: 
      {
        label: 'Confirmez l\'email',
        value: ''
      },
    invoice_name: 
      {
        label: 'Nom qui figurera sur la facture (vous, club, association, entreprise...)',
        value: ''
      },
    invoice_street: 
      {
        label: 'Adresse',
        value: ''
      },
    invoice_post_code: 
      {
        label: 'Code postal',
        value: ''
      },
    invoice_city: 
      {
        label: 'Ville',
        value: ''
      },
    invoice_country: 
      {
        label: 'Pays',
        value: 'FR'
      },
    consent:  
      {
        label: 'Acceptation des conditions de vente',
        value: false
      }
  }

  let station_name = ''
  let station_current_contract = ''
  let form_error = null
  let loading = false

  async function lookupStation () {
    station_name = '...'
    station_current_contract = '...'
    if (!form.station_id.value) return station_name = ''
    let id = parseInt(form.station_id.value)
    try {
      if (isNaN(id)) return station_name = 'Numéro invalide'
      const data = await fetch(`https://api.pioupiou.fr/v1/live/${id}?contract=true`)
      const s = await data.json()
      if (data.status === 404) {
        station_name = `!!! Station ${id} introuvable !!!`
        station_current_contract = ``
        return
      }
      station_name = s.data.meta.name
      console.log(s.data.contract)
      if (!(s.data.contract || s.data.contract.status)) return
      switch (s.data.contract.status) {
        case 'valid':
          let expiry = new Date(s.data.contract.expiry).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric' })
          station_current_contract = `Valide jusqu'au ${expiry}`
          break
        case 'activable':
          station_current_contract = `Tout neuf, aucun renouvellement nécessaire`
          break
        case 'expired':
          station_current_contract = '!!! Expiré !!!'
          break
        default:
          station_current_contract = 'n/a'
      }
    } catch (e) {
      station_current_contract = ''
      station_name = ''
    }
  }
  
  async function submit(event) {
    event.stopPropagation()
    event.preventDefault()
    
    form_error = ''

    let body = {}
    if (isNaN(parseInt(form['station_id'].value))) return form_error = `Erreur. Numéro de balise invalide`
    if (form['email'].value !== form['email_confirmation'].value) return form_error = `Erreur. Les deux emails ne sont pas identiques`
    for (let field in form) {
      if (!form[field].value) {
        form_error = `Erreur. Veuillez indiquer : ${form[field].label}`
        return false
      }
      body[field] = form[field].value
    }
    
    try {
      loading = true
      const response = await fetch('/backend/prepare-payment', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
      switch (response.status) {
        case 200:
          window.location.replace((await response.json()).redirect)
          break
        case 400:
          form_error = `Vérifiez les données du formulaire`
          break
        case 404:
          form_error = `La balise ${form['station_id'].value} n'existe pas. Vérifiez le numéro.`
          break
        case 409:
          form_error = `La balise ${form['station_id'].value} n'a pas besoin d'un abonnement. Vérifiez le numéro.`
          break
        default:
          throw new Error('bad answer from server')
      }
    } catch (e) {
      console.error(e)
      form_error = 'Erreur serveur ou réseau. Veuillez ressayer.'
    } finally {
      loading = false
    }
    
  }
  
  lookupStation()
</script>

<h1>Abonnement</h1>
<p>Ici, vous pouvez souscrire ou renouveller un abonnement de communication pour une balise météo Sigfox (Pioupiou, MeteoWind, Arduino...)</p>

<p>Le coût est de 20 € TTC pour un an. Il permet à la balise d'émettre depuis le réseau Sigfox vers OpenWindMap. La consultation et l'accès aux données restent gratuits pour tous.</p>

<p>Pour des raisons techniques, le paiement ne peut se faire qu'en ligne, par carte bancaire. Si vous souhaitez prendre l'abonnement au nom d'une association qui n'a pas de carte bancaire, vous pouvez faire le paiement avec votre carte personelle. Nous fournissons systèmatiquement une facture, que vous pourrez présenter à votre association pour vous faire rembourser, le cas échéant.</p>

<p>Il n'est pas nécessaire d'être le propriétaire d'une balise pour renouveller son abonnement. Vous pouvez sponsoriser une balise locale en payant pour elle.</p>

<p>Nous vous invitons à lire les détails du fonctionnement, présentés en bas de la page.</p>

<form on:submit={submit}>

  <h2>Quelle balise ?</h2>

  <div class="form-group">
    <label>{form.station_id.label}</label>
    <input type="text" class="form-control" placeholder="123..." bind:value={form.station_id.value} on:keyup={lookupStation}>
  </div>
  
  <div class="alert alert-info">
    <p>
      <strong>Nom de la balise :</strong><br>
      {station_name} &nbsp;
    </p>
    <p>
      <strong>Abonnement actuel:</strong><br>
      {station_current_contract} &nbsp;
    </p>
  </div>

  <div class="form-group">
    <label>{form.sponsor.label}</label>
    <input type="text" class="form-control" bind:value={form.sponsor.value}>
  </div>

  <h2>Vos coordonnées</h2>
  <div class="form-group">
    <label>{form.last_name.label}</label>
    <input type="text" class="form-control" bind:value={form.last_name.value}>
  </div>
  <div class="form-group">
    <label>{form.first_name.label}</label>
    <input type="text" class="form-control" bind:value={form.first_name.value}>
  </div>
  <div class="form-group">
    <label>{form.email.label}</label>
    <input type="email" class="form-control" bind:value={form.email.value}>
  </div>
  <div class="form-group">
    <label>{form.email_confirmation.label}</label>
    <input type="email" class="form-control" bind:value={form.email_confirmation.value}>
  </div>
  
  <h2>Facturation</h2>
  <div class="form-group">
    <label>{form.invoice_name.label}</label>
    <input type="text" class="form-control" bind:value={form.invoice_name.value}>
  </div>
  <div class="form-group">
    <label>{form.invoice_street.label}</label>
    <input type="text" class="form-control" bind:value={form.invoice_street.value}>
  </div>
  <div class="form-group">
    <label>{form.invoice_post_code.label}</label>
    <input type="text" class="form-control" bind:value={form.invoice_post_code.value}>
  </div>
  <div class="form-group">
    <label>{form.invoice_city.label}</label>
    <input type="text" class="form-control" bind:value={form.invoice_city.value}>
  </div>
  <div class="form-group">
    <label>{form.invoice_country.label}</label>
    <select class="form-control" bind:value={form.invoice_country.value}>
      {#each countries as country}
        <option value={country[0].toUpperCase()}>
          {country[1]}
        </option>
      {/each}
    </select>
  </div>
  
  <h2>Paiement</h2>

  <p><strong>20 €</strong>, toutes taxes comprises, pour 1 an</p>

  <div class="checkbox">
    <label>
      <input type="checkbox" bind:checked={form.consent.value}> J'accepte le fonctionnement de l'abonnement et les conditions générales de vente, détaillés au bas de cette page.
    </label>
  </div>
  
  {#if form_error}
    <div class="alert alert-danger">{form_error}</div>
  {/if}

  {#if loading}
    <div class="alert alert-info">Patientez...</div>
  {:else}
    <button type="submit" class="btn btn-primary">Aller au paiement</button>
  {/if}
</form>

<p>&nbsp;</p>
<hr>
<p>&nbsp;</p>

<h3>Fonctionnement de l'abonnement / Conditions générales de vente</h3>

<p>La SCIC SA OpenWindMap propose un abonnement permettant de faire communiquer une balise météo, depuis le réseau Sigfox, vers le site internet openwindmap.org</p>

<p>Chaque balise doit disposer de son propre abonnement de communication, dont le prix est fixé à 20 € par an, toutes taxes comprises.</p>

<p>Il n'est pas nécessaire d'être le propriétaire d'une balise pour renouveller son abonnement. N'importe quelle personne peut le faire. Par exemple, vous pouvez sponsoriser une balise locale en payant pour elle. Néanmoins, OpenWindMap n'a aucun contrôle sur les balises installées, et ne peut pas garantir que son propriétaire la maintiendra ou qu'il la laissera au même emplacement. Si vous payez pour une balise, mais qu'elle n'émet pas, vous pourrez vous faire rembourser, dans les conditions expliquées plus bas.</p>

<p>Avant le paiement, le client indique le numéro de la balise pour laquelle il souhaite renouveller l'abonnement. OpenWindMap ne pourra pas rembourser un abonnement souscrit pour un mauvais numéro si celui-ci a déjà été activé.</p>

<p>Le paiement s'effectue depuis le site internet https://abo.openwindmap.org. Une facture sera ensuite adressée par email. Le client doit s'assurer de fournir les bonnes coordonnées de facturation</p>

<p>L'abonnement inclus les frais de communication à travers le réseau Sigfox, pour un maximum de 144 messages / jour, avec une itinérance possible dans les pays Européens couverts par Sigfox. L'abonnement inclus également les frais occasionnés pour le traitement et l'archivage des données sur les serveurs de OpenWindMap.</p>

<p>Après le paiement, l'abonnement devient activable : soit immédiatement si aucun abonnement n'était en cours de validité pour cet appareil, soit dès que l'abonnement précédent prend fin. L'abonnement est ensuite activé dès qu'un message émis par l'appareil est capté par le réseau Sigfox. Il est ensuite valable 365 jours à compter de la date d'activation.</p>

<p>Le client peut demander l'annulation et le remboursement pendant une période de 3 mois après le paiement, tant que l'abonnement n'a pas encore été activé. Dès lors que l'abonnement a été activé (donc qu'un message a été reçu), plus aucun remboursement n'est possible, y compris en cas de panne ou vol de l'appareil.</p>

<p>OpenWindMap fera de son mieux pour assurer le fonctionnement du réseau. Cependant, OpenWindMap ne peut donner aucune garantie de disponibilité ou de fiabilité du réseau. Également, OpenWindMap ne peut donner aucune garantie en ce qui concerne la couverture du réseau Sigfox.</p>

<p>OpenWindMap peut résilier un abonnement à tout moment, sans avoir à fournir de justification. Dans ce cas, un remboursement sera effectué, au prorata du temps d'abonnement restant. Le client ne pourra prétendre à aucune autre indemnisation.</p>

<p>En connectant votre appareil au réseau OpenWindMap, vous autorisez OpenWindMap à redistribuer ses mesures, sa localisation et ses métadonées, sous toutes formes et sous toutes licences, pour tout usage que ce soit-</p>

<p>Toute demande d'aide ou réclamation doit être adressée prioritairement sur le forum disponible à l'adresse https://forum.openwindmap.org, ou par email à contact@openwindmap.org</p>

<p>Nous ne receuillons aucune donnée personelle autre que celles demandées dans ce formulaire. Elles sont utilisées et conservées uniquement pour répondre à nos obligations légales de facturation. Ces données ne sont en aucun cas transmises à un tiers, à l'exception de nos prestataires de paiement et de facturation. Notre prestaire de paiement est susceptible de collecter des informations telles que le nom de votre navigateur, votre adresse IP et probablement d'autres, ceci dans le but d'assurer la transaction en toute sécurité. Nous vous invitons à consulter leur politique de vie privée, conforme au RGPD. Vous disposez d'un droit d'accès à vos données. Pour exercer ce droit, vous pouvez nous contacter par email ou par courrier. Cette page n'utilise pas de cookies.</p>

<p>Les présentes conditions sont valables au moment du paiement et jusqu'à la date de fin de l'abonnement. OpenWindMap se réserve le droit de les modifier, après en avoir informé le client. Dans le cas où le client n'accepterait pas les nouvelles conditions, OpenWindMap pourra procéder à la résiliation et au remboursement prévus plus haut.</p>

<p>Ce contrat est régi par la loi Française. En cas de litige, seul le Tribunal de Commerce de Grenoble sera compétent.</p>

<p>&nbsp;</p>

<h3>Mentions légales :</h3>

<p>Société coopérative d'intérêt collectif OpenWindMap<p>

<p>350 chemin du Pré Neuf, CDV 50068, 38350 La Mure, France</p>

<p>
TVA Intracommunautaire : FR24903301737<br>
R.C.S. Grenoble 903 301 737<br>
Capital social variable, minimum de 18 500,00 Euros
</p>

<p>Contact : contact@openwindmap.org</p>

<p>Directeur de la publication : Nicolas Baldeck</p>

<p>Hébergeur : Netlify, support@netlify.com, 2325 3rd Street, Suite 296, San Francisco, California 94107</p>

<p>&nbsp;</p>

<h3>Open-source</h3>

<p>Cette page est open-source. Le code se trouve à l'adresse <a href="https://github.com/OpenWindMap/abo" target="_blank">https://github.com/OpenWindMap/abo</a></p>

<p>&nbsp;</p>