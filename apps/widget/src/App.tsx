import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'
const BRAND = 'VOLTRIDE'

interface Agency { id: string; code: string; name: { fr: string; es: string; en: string }; address: string; city: string; phone: string; email: string; closedOnSunday?: boolean; isActive?: boolean; showStockUrgency?: boolean }
interface Vehicle { id: string; sku: string; name: { fr: string; es: string; en: string }; description: { fr: string; es: string; en: string }; deposit: number; hasPlate: boolean; licenseType?: { fr: string; es: string; en: string }; kmIncluded?: { fr: string; es: string; en: string }; imageUrl?: string; category: { id: string; name: { fr: string; es: string; en: string }; brand: string }; pricing: any[]; inventory: any[] }
interface Option { id: string; code: string; name: { fr: string; es: string; en: string }; description?: { fr: string; es: string; en: string }; maxQuantity: number; imageUrl?: string; day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; day8: number; day9: number; day10: number; day11: number; day12: number; day13: number; day14: number; includedByDefault?: boolean; categories?: any[] }
interface WidgetSettings { stripeEnabled: boolean; stripeMode: string; stripePublishableKey: string }

type Lang = 'fr' | 'es' | 'en'
type Step = 'dates' | 'vehicles' | 'options' | 'customer' | 'payment' | 'deposit' | 'confirmation'

const translations = {
  fr: { title: 'Location de vélos & e-bikes', selectAgency: 'Agence', selectDates: 'Sélectionnez vos dates', pickupDate: 'Date de retrait', returnDate: 'Date de retour', pickupTime: 'Heure de retrait', returnTime: 'Heure de retour', continue: 'Continuer', back: 'Retour', selectVehicles: 'Choisissez vos véhicules', quantity: 'Quantité', available: 'disponible(s)', deposit: 'Caution', perDay: '/jour', options: 'Options & Accessoires', yourInfo: 'Vos informations', firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone', address: 'Adresse', postalCode: 'Code postal', city: 'Ville', country: 'Pays', payment: 'Paiement', summary: 'Récapitulatif', total: 'Total', depositToPay: 'Acompte à payer', depositInfo20: '20% car montant > 100€', depositInfo50: '50% car montant ≤ 100€', payNow: 'Payer maintenant', confirmation: 'Réservation confirmée !', bookingRef: 'Référence', emailSent: 'Un email de confirmation a été envoyé.', requiredDocs: 'Documents requis', docId: "Pièce d'identité ou passeport", docLicense: "Permis AM/A1/A2/B selon véhicule", securityDeposit: 'Caution à régler sur place', cashOrCard: 'En espèces ou carte de crédit (pas de carte de débit)', days: 'jour(s)', hours: 'heure(s) sup.', noVehicles: 'Aucun véhicule disponible pour cette agence', processing: 'Traitement en cours...', licensePlateWarning: '1 seul par réservation', helmetIncluded: 'Casque inclus', free: 'Gratuit', included: 'Inclus', depositCardTitle: 'Enregistrement de la caution', depositCardDesc: 'Votre carte sera pré-autorisée la veille de votre location. Aucun montant ne sera débité si le véhicule est retourné en bon état.', depositCardAmount: 'Montant de la caution', saveCard: 'Enregistrer ma carte', cardSaved: 'Carte enregistrée !', skipDeposit: 'Payer la caution sur place' },
  es: { title: 'Alquiler de bicicletas y e-bikes', selectAgency: 'Agencia', selectDates: 'Seleccione sus fechas', pickupDate: 'Fecha de recogida', returnDate: 'Fecha de devolución', pickupTime: 'Hora de recogida', returnTime: 'Hora de devolución', continue: 'Continuar', back: 'Volver', selectVehicles: 'Elija sus vehículos', quantity: 'Cantidad', available: 'disponible(s)', deposit: 'Fianza', perDay: '/día', options: 'Opciones y Accesorios', yourInfo: 'Sus datos', firstName: 'Nombre', lastName: 'Apellido', email: 'Email', phone: 'Teléfono', address: 'Dirección', postalCode: 'Código postal', city: 'Ciudad', country: 'País', payment: 'Pago', summary: 'Resumen', total: 'Total', depositToPay: 'Anticipo a pagar', depositInfo20: '20% porque importe > 100€', depositInfo50: '50% porque importe ≤ 100€', payNow: 'Pagar ahora', confirmation: '¡Reserva confirmada!', bookingRef: 'Referencia', emailSent: 'Se ha enviado un email de confirmación.', requiredDocs: 'Documentos requeridos', docId: 'Documento de identidad o pasaporte', docLicense: 'Permiso AM/A1/A2/B según vehículo', securityDeposit: 'Fianza a pagar en tienda', cashOrCard: 'En efectivo o tarjeta de crédito (no débito)', days: 'día(s)', hours: 'hora(s) extra', noVehicles: 'No hay vehículos disponibles para esta agencia', processing: 'Procesando...', licensePlateWarning: 'solo 1 por reserva', helmetIncluded: 'Casco incluido', free: 'Gratis', included: 'Incluido', depositCardTitle: 'Registro de la fianza', depositCardDesc: 'Su tarjeta será pre-autorizada el día antes de su alquiler. No se cobrará ningún importe si el vehículo se devuelve en buen estado.', depositCardAmount: 'Importe de la fianza', saveCard: 'Registrar mi tarjeta', cardSaved: '¡Tarjeta registrada!', skipDeposit: 'Pagar la fianza en tienda' },
  en: { title: 'Bike & E-Bike Rental', selectAgency: 'Agency', selectDates: 'Select your dates', pickupDate: 'Pickup date', returnDate: 'Return date', pickupTime: 'Pickup time', returnTime: 'Return time', continue: 'Continue', back: 'Back', selectVehicles: 'Choose your vehicles', quantity: 'Quantity', available: 'available', deposit: 'Deposit', perDay: '/day', options: 'Options & Accessories', yourInfo: 'Your information', firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', address: 'Address', postalCode: 'Postal code', city: 'City', country: 'Country', payment: 'Payment', summary: 'Summary', total: 'Total', depositToPay: 'Deposit to pay', depositInfo20: '20% because amount > 100€', depositInfo50: '50% because amount ≤ 100€', payNow: 'Pay now', confirmation: 'Booking confirmed!', bookingRef: 'Reference', emailSent: 'A confirmation email has been sent.', requiredDocs: 'Required documents', docId: 'ID card or passport', docLicense: 'AM/A1/A2/B license depending on vehicle', securityDeposit: 'Security deposit payable on site', cashOrCard: 'Cash or credit card (no debit cards)', days: 'day(s)', hours: 'extra hour(s)', noVehicles: 'No vehicles available for this agency', processing: 'Processing...', licensePlateWarning: 'only 1 per booking', helmetIncluded: 'Helmet included', free: 'Free', included: 'Included', depositCardTitle: 'Security deposit registration', depositCardDesc: 'Your card will be pre-authorized the day before your rental. No amount will be charged if the vehicle is returned in good condition.', depositCardAmount: 'Deposit amount', saveCard: 'Save my card', cardSaved: 'Card saved!', skipDeposit: 'Pay deposit on site' }
}

const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
  const startH = parseInt(openTime.split(':')[0])
  const startM = parseInt(openTime.split(':')[1] || '0')
  const endH = parseInt(closeTime.split(':')[0])
  const endM = parseInt(closeTime.split(':')[1] || '0')
  const slots: string[] = []
  for (let h = startH; h <= endH; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === startH && m < startM) continue
      if (h === endH && m > endM) continue
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return slots
}
const getTimeSlotsDefault = (dateStr: string): string[] => {
  const date = dateStr ? new Date(dateStr) : new Date()
  const month = date.getMonth()
  const isSummer = month >= 3 && month <= 8
  return generateTimeSlots('10:00', isSummer ? '19:00' : '16:00')
}


// Composant pour collecter la carte de caution
const DepositCardForm = ({ 
  bookingId, 
  bookingRef: _bookingRef,
  customerEmail,
  customerName,
  depositAmount, 
  lang: _lang, 
  t, 
  onSuccess, 
  onSkip 
}: { 
  bookingId: string
  bookingRef: string
  customerEmail: string
  customerName: string
  depositAmount: number
  lang: Lang
  t: any
  onSuccess: () => void
  onSkip: () => void
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    try {
      // 1. Créer le SetupIntent
      // 1. Créer le SetupIntent
      const setupRes = await fetch(`${API_URL}/api/create-setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: 'VOLTRIDE',
          bookingId,
          customerEmail,
          customerName,
          depositAmount
        })
      })
      const { clientSecret, stripeCustomerId } = await setupRes.json()

      if (!clientSecret) {
        throw new Error('Erreur lors de la création du SetupIntent')
      }

      // 2. Confirmer le SetupIntent avec la carte
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Élément carte non trouvé')
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { email: customerEmail }
        }
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (setupIntent?.payment_method) {
        // 3. Sauvegarder le paymentMethodId sur la réservation
        await fetch(`${API_URL}/api/save-payment-method`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: 'VOLTRIDE',
            bookingId,
            paymentMethodId: setupIntent.payment_method,
            stripeCustomerId
          })
        })

        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{t.depositCardTitle}</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">{t.depositCardDesc}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="font-bold text-amber-800">{t.depositCardAmount}: {depositAmount}€</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' }
                },
                invalid: { color: '#9e2146' }
              },
              hidePostalCode: true
            }}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50"
        >
          {processing ? t.processing : t.saveCard}
        </button>
      </form>

      <button
        onClick={onSkip}
        className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition"
      >
        {t.skipDeposit}
      </button>
    </div>
  )
}

function App() {
  const [lang] = useState<Lang>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get('lang')
    if (urlLang === 'es' || urlLang === 'en' || urlLang === 'fr') return urlLang
    return 'fr'
  })
  const [categoryFilter] = useState<string[]>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const cat = urlParams.get('category')
    if (!cat) return []
    return cat.split(',')
  })
  const [returnUrl] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('returnUrl') || window.location.href.split('?')[0]
  })
  const [step, setStep] = useState<Step>('dates')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [startSchedule, setStartSchedule] = useState<{open: string, close: string} | null>(null)
  const [endSchedule, setEndSchedule] = useState<{open: string, close: string} | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fleetAvailability, setFleetAvailability] = useState<Record<string, number>>({})
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgency, setSelectedAgency] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:00')
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, number>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', postalCode: '', city: '', country: 'ES' })
  const [phonePrefix, setPhonePrefix] = useState('+34')
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({ stripeEnabled: false, stripeMode: 'test', stripePublishableKey: '' })
  const [stripePromise, setStripePromise] = useState<any>(null)
  const [currentBookingId, setCurrentBookingId] = useState<string>('')
  const [returnedDepositAmount, setReturnedDepositAmount] = useState<number>(0)
  const [cardRegistered, setCardRegistered] = useState<boolean>(false)
  const [returnedEmail, setReturnedEmail] = useState<string>("")
  const [returnedName, setReturnedName] = useState<string>("")
  
  const phonePrefixes = [
    { code: '+34', country: '🇪🇸 España' },
    { code: '+33', country: '🇫🇷 France' },
    { code: '+44', country: '🇬🇧 UK' },
    { code: '+49', country: '🇩🇪 Deutschland' },
    { code: '+39', country: '🇮🇹 Italia' },
    { code: '+351', country: '🇵🇹 Portugal' },
    { code: '+31', country: '🇳🇱 Nederland' },
    { code: '+32', country: '🇧🇪 Belgique' },
    { code: '+352', country: '🇱🇺 Luxembourg' },
    { code: '+41', country: '🇨🇭 Suisse' },
    { code: '+43', country: '🇦🇹 Österreich' },
    { code: '+353', country: '🇮🇪 Ireland' },
    { code: '+46', country: '🇸🇪 Sverige' },
    { code: '+47', country: '🇳🇴 Norge' },
    { code: '+45', country: '🇩🇰 Danmark' },
    { code: '+358', country: '🇫🇮 Suomi' },
    { code: '+354', country: '🇮🇸 Ísland' },
    { code: '+48', country: '🇵🇱 Polska' },
    { code: '+420', country: '🇨🇿 Česko' },
    { code: '+421', country: '🇸🇰 Slovensko' },
    { code: '+36', country: '🇭🇺 Magyarország' },
    { code: '+40', country: '🇷🇴 România' },
    { code: '+359', country: '🇧🇬 България' },
    { code: '+385', country: '🇭🇷 Hrvatska' },
    { code: '+386', country: '🇸🇮 Slovenija' },
    { code: '+381', country: '🇷🇸 Srbija' },
    { code: '+387', country: '🇧🇦 BiH' },
    { code: '+383', country: '🇽🇰 Kosovo' },
    { code: '+382', country: '🇲🇪 Crna Gora' },
    { code: '+389', country: '🇲🇰 Makedonija' },
    { code: '+355', country: '🇦🇱 Shqipëria' },
    { code: '+370', country: '🇱🇹 Lietuva' },
    { code: '+371', country: '🇱🇻 Latvija' },
    { code: '+372', country: '🇪🇪 Eesti' },
    { code: '+375', country: '🇧🇾 Belarus' },
    { code: '+380', country: '🇺🇦 Україна' },
    { code: '+373', country: '🇲🇩 Moldova' },
    { code: '+30', country: '🇬🇷 Ελλάδα' },
    { code: '+90', country: '🇹🇷 Türkiye' },
    { code: '+357', country: '🇨🇾 Κύπρος' },
    { code: 'other', country: '🌍 Otro/Other' },
  ]
  const [customPrefix, setCustomPrefix] = useState('')
  
  const countries = [
    'España', 'France', 'United Kingdom', 'Deutschland', 'Italia', 'Portugal', 
    'Nederland', 'Belgique', 'Luxembourg', 'Suisse', 'Österreich', 'Ireland',
    'Sverige', 'Norge', 'Danmark', 'Suomi', 'Ísland',
    'Polska', 'Česko', 'Slovensko', 'Magyarország', 'România', 'България',
    'Hrvatska', 'Slovenija', 'Srbija', 'BiH', 'Kosovo', 'Crna Gora', 'Makedonija', 'Shqipëria',
    'Lietuva', 'Latvija', 'Eesti', 'Belarus', 'Україна', 'Moldova',
    'Ελλάδα', 'Türkiye', 'Κύπρος',
    'Maroc', 'Algérie', 'Tunisie', 'Libya', 'Egypt',
    'Autre/Other'
  ]
  
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  
  const [additionalDrivers, setAdditionalDrivers] = useState<Array<{ firstName: string; lastName: string; email: string; phone: string }>>([])
  

  // Auto-resize iframe
  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage({ type: 'voltride-widget-resize', height }, '*')
    }
    sendHeight()
    const observer = new ResizeObserver(sendHeight)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [step])

  useEffect(() => {
    const platedCount = getPlatedVehiclesCount()
    const driversNeeded = Math.max(0, platedCount - 1)
    if (additionalDrivers.length < driversNeeded) {
      const newDrivers = [...additionalDrivers]
      for (let i = additionalDrivers.length; i < driversNeeded; i++) {
        newDrivers.push({ firstName: '', lastName: '', email: '', phone: '' })
      }
      setAdditionalDrivers(newDrivers)
    } else if (additionalDrivers.length > driversNeeded) {
      setAdditionalDrivers(additionalDrivers.slice(0, driversNeeded))
    }
  }, [selectedVehicles])
  
  const [bookingRef, setBookingRef] = useState('')
  const [processing, setProcessing] = useState(false)

  const t = translations[lang]
  const startTimeSlots = startSchedule ? generateTimeSlots(startSchedule.open, startSchedule.close) : getTimeSlotsDefault(startDate)
  const endTimeSlots = endSchedule ? generateTimeSlots(endSchedule.open, endSchedule.close) : getTimeSlotsDefault(endDate)

  useEffect(() => { 
    // Lire params depuis search OU hash (Stripe redirige avec #)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const searchParams = new URLSearchParams(window.location.search)
    const params = hashParams.get('ref') ? hashParams : searchParams
    const isSuccess = params.get('success') === 'true' || (params.get('ref') !== null && params.get('bookingId') !== null)
    const isCanceled = params.get('canceled') === 'true' || hashParams.get('canceled') === 'true'
    
    loadData()
    
    if (isSuccess) {
      const ref = params.get('ref')
      const bid = params.get('bookingId')
      const dep = params.get('deposit')
      const email = params.get('email')
      const name = params.get('name')
      console.log('[WIDGET] Success detected:', { ref, bid, dep, email, name })
      if (ref) setBookingRef(ref)
      if (bid) setCurrentBookingId(bid)
      if (dep) setReturnedDepositAmount(parseFloat(dep))
      if (email) setReturnedEmail(decodeURIComponent(email))
      if (name) setReturnedName(decodeURIComponent(name))
      
      if (bid) {
        console.log('[WIDGET] Going to deposit step')
        setTimeout(() => setStep('deposit'), 100)
      } else if (ref) {
        console.log('[WIDGET] Going to confirmation step')
        setTimeout(() => setStep('confirmation'), 100)
      }
      
      const keep = new URLSearchParams()
      if (params.get('lang')) keep.set('lang', params.get('lang')!)
      if (params.get('category')) keep.set('category', params.get('category')!)
      if (params.get('returnUrl')) keep.set('returnUrl', params.get('returnUrl')!)
      window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
    }
    
    if (isCanceled) {
      alert(lang === 'fr' ? 'Paiement annulé' : lang === 'es' ? 'Pago cancelado' : 'Payment canceled');
      const keep = new URLSearchParams()
      if (params.get('lang')) keep.set('lang', params.get('lang')!)
      if (params.get('category')) keep.set('category', params.get('category')!)
      if (params.get('returnUrl')) keep.set('returnUrl', params.get('returnUrl')!)
      window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
    }
  }, [])
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.parent.postMessage({ type: 'voltride-widget-scroll-top' }, '*')
  }, [step])
  useEffect(() => { if (selectedAgency) loadVehicles() }, [selectedAgency])
  useEffect(() => { if (selectedAgency && startDate && endDate) loadFleetAvailability() }, [startDate, endDate])
  useEffect(() => {
    if (selectedAgency && startDate) {
      fetch(`${API_URL}/api/agencies/${selectedAgency}/schedule?date=${startDate}`)
        .then(r => r.json())
        .then(data => {
          if (data.openTime && data.closeTime) setStartSchedule({ open: data.openTime, close: data.closeTime })
          else setStartSchedule(null)
        })
        .catch(() => setStartSchedule(null))
    }
  }, [selectedAgency, startDate])
  useEffect(() => {
    if (selectedAgency && endDate) {
      fetch(`${API_URL}/api/agencies/${selectedAgency}/schedule?date=${endDate}`)
        .then(r => r.json())
        .then(data => {
          if (data.openTime && data.closeTime) setEndSchedule({ open: data.openTime, close: data.closeTime })
          else setEndSchedule(null)
        })
        .catch(() => setEndSchedule(null))
    }
  }, [selectedAgency, endDate])
  useEffect(() => { if (startDate && !startTimeSlots.includes(startTime)) setStartTime(startTimeSlots[0] || '10:00') }, [startDate, startTimeSlots])
  useEffect(() => { if (endDate && !endTimeSlots.includes(endTime)) setEndTime(endTimeSlots[0] || '10:00') }, [endDate, endTimeSlots])

  // Charger Stripe quand les settings sont disponibles
  useEffect(() => {
    if (widgetSettings.stripeEnabled && widgetSettings.stripePublishableKey) {
      setStripePromise(loadStripe(widgetSettings.stripePublishableKey))
    }
  }, [widgetSettings])

  const loadData = async () => {
    try {
      const [agenciesRes, optionsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/agencies`), 
        fetch(`${API_URL}/api/options`),
        fetch(`${API_URL}/api/widget-settings/voltride`)
      ])
      const agenciesData = await agenciesRes.json()
      const filteredAgencies = agenciesData.filter((a: any) => a.brand === BRAND)
      setAgencies(filteredAgencies)
      if (filteredAgencies.length > 0) setSelectedAgency(filteredAgencies[0].id)
      setOptions(await optionsRes.json())
      
      // Charger les settings du widget
      const settings = await settingsRes.json()
      if (settings) {
        setWidgetSettings({
          stripeEnabled: settings.stripeEnabled || false,
          stripeMode: settings.stripeMode || 'test',
          stripePublishableKey: settings.stripePublishableKey || ''
        })
      }
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const loadVehicles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vehicles?agencyId=${selectedAgency}`)
      const data = await res.json()
      const filtered = (Array.isArray(data) ? data : []).filter((v: Vehicle) => {
        if (v.category?.brand !== BRAND) return false
        if (categoryFilter.length > 0) {
          const catName = v.category?.name
          const catStr = typeof catName === 'object' ? JSON.stringify(catName).toLowerCase() : ''
          return categoryFilter.some(f => catStr.includes(f.toLowerCase()))
        }
        return true
      })
      setVehicles(filtered)
      await loadFleetAvailability()
    } catch (error) { console.error('Error:', error) }
  }
  
  const loadFleetAvailability = async () => {
    if (!selectedAgency) return
    try {
      let url = API_URL + '/api/fleet-availability?agencyId=' + selectedAgency
      if (startDate) url += '&startDate=' + startDate
      if (endDate) url += '&endDate=' + endDate
      const res = await fetch(url)
      const data = await res.json()
      setFleetAvailability(data)
    } catch (error) { console.error('Fleet availability error:', error) }
  }

  const getName = (obj: any) => obj?.[lang] || obj?.fr || ''
  const isSundayBlocked = (date: string): boolean => {
    if (!date) return false
    const agency = agencies.find(a => a.id === selectedAgency)
    if (!agency?.closedOnSunday) return false
    const d = new Date(date)
    return d.getDay() === 0
  }
  
  const calculateDays = (): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays)
  }
  
  const calculateExtraHours = (): number => {
    if (!startTime || !endTime) return 0
    const [sH, sM] = startTime.split(':').map(Number)
    const [eH, eM] = endTime.split(':').map(Number)
    const diff = (eH * 60 + eM) - (sH * 60 + sM)
    return diff > 0 ? Math.ceil(diff / 60) : 0
  }
  
  const getVehiclePrice = (vehicle: Vehicle, days: number, extraHours: number): number => {
    const pricing = vehicle.pricing?.[0]
    if (!pricing) return 0
    const dayKey = `day${Math.min(days, 14)}` as keyof typeof pricing
    let total = Number(pricing[dayKey]) || 0
    if (days > 14) {
      const dailyRate = (Number(pricing.day14) || 0) / 14
      total += (days - 14) * dailyRate
    }
    for (let i = 1; i <= Math.min(extraHours, 4); i++) {
      total += Number(pricing[`extraHour${i}` as keyof typeof pricing]) || 0
    }
    return total
  }
  
  const getAvailableQuantity = (vehicle: Vehicle): number => {
    return fleetAvailability[vehicle.id] || 0
  }

  const getMaxQuantity = (vehicle: Vehicle): number => {
    const available = getAvailableQuantity(vehicle)
    return available
  }

  const hasPlatedVehicleSelected = (): boolean => {
    return Object.entries(selectedVehicles).some(([id, qty]) => {
      if (qty <= 0) return false
      const v = vehicles.find(x => x.id === id)
      return v?.hasPlate === true
    })
  }

  const getOptionPrice = (option: Option, days: number): number => {
    const dayKey = ("day" + Math.min(days, 14)) as keyof Option
    let total = Number(option[dayKey]) || 0
    if (days > 14) total += (days - 14) * (Number(option.day14) || 0) / 14
    return total
  }
  
  const calculateTotal = (): number => {
    const days = calculateDays()
    const extraHours = calculateExtraHours()
    let total = 0
    Object.entries(selectedVehicles).forEach(([id, qty]) => {
      const v = vehicles.find(x => x.id === id)
      if (v && qty > 0) {
        total += getVehiclePrice(v, days, extraHours) * qty
      }
    })
    Object.entries(selectedOptions).forEach(([id, qty]) => {
      const o = options.find(x => x.id === id)
      if (o && qty > 0) {
        total += getOptionPrice(o, days) * qty
      }
    })
    return total
  }
  
  const calculateDeposit = (): number => {
    const total = calculateTotal()
    return total > 100 ? Math.ceil(total * 0.2) : Math.ceil(total * 0.5)
  }
  
  const calculateSecurityDeposit = (): number => {
    let total = 0
    Object.entries(selectedVehicles).forEach(([id, qty]) => {
      const v = vehicles.find(x => x.id === id)
      if (v && qty > 0) total += v.deposit * qty
    })
    return total
  }

  const hasSelectedVehicles = (): boolean => {
    return Object.values(selectedVehicles).some(qty => qty > 0)
  }

  const getTotalSelectedVehicles = (): number => {
    return Object.values(selectedVehicles).reduce((sum, qty) => sum + qty, 0)
  }

  const getSelectedCategoryIds = (): string[] => {
    const categoryIds: string[] = []
    Object.entries(selectedVehicles).forEach(([id, qty]) => {
      if (qty > 0) {
        const v = vehicles.find(x => x.id === id)
        if (v?.category?.id && !categoryIds.includes(v.category.id)) {
          categoryIds.push(v.category.id)
        }
      }
    })
    return categoryIds
  }

  const getFilteredOptions = (): Option[] => {
    const selectedCatIds = getSelectedCategoryIds()
    return options.filter(opt => {
      if (!opt.categories || opt.categories.length === 0) return false
      return opt.categories.some((c: any) => selectedCatIds.includes(c.categoryId))
    })
  }
  
  const handleVehicleSelect = (vehicleId: string, quantity: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (vehicle?.hasPlate) {
      if (quantity > 0) {
        setSelectedVehicles({ [vehicleId]: quantity })
      } else {
        setSelectedVehicles({ ...selectedVehicles, [vehicleId]: 0 })
      }
    } else {
      if (quantity > 0) {
        const newSelection: Record<string, number> = {}
        Object.entries(selectedVehicles).forEach(([id, qty]) => {
          const v = vehicles.find(x => x.id === id)
          if (!v?.hasPlate && qty > 0) {
            newSelection[id] = qty
          }
        })
        newSelection[vehicleId] = quantity
        setSelectedVehicles(newSelection)
      } else {
        setSelectedVehicles({ ...selectedVehicles, [vehicleId]: quantity })
      }
    }
  }
  
  const getPlatedVehiclesCount = (): number => {
    let count = 0
    Object.entries(selectedVehicles).forEach(([id, qty]) => {
      const v = vehicles.find(x => x.id === id)
      if (v?.hasPlate && qty > 0) count += qty
    })
    return count
  }

  const handleSubmit = async () => {
    setProcessing(true)
    try {
      const days = calculateDays()
      const extraHours = calculateExtraHours()
      const items = Object.entries(selectedVehicles)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const vehicle = vehicles.find(v => v.id === id)!
          const unitPrice = getVehiclePrice(vehicle, days, extraHours)
          return { vehicleId: id, quantity: qty, unitPrice, totalPrice: unitPrice * qty }
        })
      const optionItems = Object.entries(selectedOptions)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const option = options.find(o => o.id === id)!
          const unitPrice = getOptionPrice(option, days)
          return { optionId: id, quantity: qty, unitPrice, totalPrice: unitPrice * qty }
        })
      
      const bookingRes = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: 'VOLTRIDE',
          agencyId: selectedAgency,
          startDate, endDate, startTime, endTime,
          totalPrice: calculateTotal(),
          depositAmount: calculateDeposit(),
          language: lang,
          customer: { ...customer, phone: phonePrefix === 'other' ? customPrefix + customer.phone : phonePrefix + customer.phone },
          items,
          options: optionItems
        })
      })
      const booking = await bookingRes.json()
      
      // Ajouter bookingId dans l'URL de retour pour l'étape caution
      const stripeRes = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: 'VOLTRIDE',
          bookingId: booking.id,
          amount: calculateDeposit(),
          customerEmail: customer.email,
          locale: lang,
          successUrl: returnUrl + `#success=true&ref=${booking.reference}&bookingId=${booking.id}&deposit=${calculateSecurityDeposit()}&email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + ' ' + customer.lastName)}&lang=${lang}`,
          cancelUrl: returnUrl + '#canceled=true'
        })
      })
      const { url } = await stripeRes.json()
      
      if (url) {
        (window.top || window).location.href = url
      }
    } catch (error) {
      console.error(error)
      alert(lang === 'fr' ? 'Erreur lors du paiement' : lang === 'es' ? 'Error en el pago' : 'Payment error')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'transparent' }}>
      <div className="text-gray-800 text-xl z-10">Chargement...</div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 relative overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex justify-between mb-6 px-4">
          {['dates', 'vehicles', 'options', 'customer', 'payment', 'deposit'].map((s, i) => (
            <div key={s} className={`flex items-center ${i < 5 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${['dates', 'vehicles', 'options', 'customer', 'payment', 'deposit'].indexOf(step) >= i ? 'bg-white text-[#ffaf10]' : 'bg-white/50 text-gray-500'}`}>{i + 1}</div>
              {i < 5 && <div className={`flex-1 h-1 mx-2 rounded ${['dates', 'vehicles', 'options', 'customer', 'payment', 'deposit'].indexOf(step) > i ? 'bg-white' : 'bg-white/50'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          {step === 'dates' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">{t.selectDates}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t.selectAgency}</label>
                <select value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none">
                  {agencies.map(a => <option key={a.id} value={a.id}>{getName(a.name)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.pickupDate}</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.pickupTime}</label>
                  <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none">
                    {startTimeSlots.map(ts => <option key={ts} value={ts}>{ts}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.returnDate}</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.returnTime}</label>
                  <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none">
                    {endTimeSlots.map(ts => <option key={ts} value={ts}>{ts}</option>)}
                  </select>
                </div>
              </div>
              {(isSundayBlocked(startDate) || isSundayBlocked(endDate)) && <p className="text-red-500 text-sm mb-2">{lang === "fr" ? "⚠️ Cette agence est fermée le dimanche. Veuillez choisir une autre date." : lang === "es" ? "⚠️ Esta agencia está cerrada los domingos. Por favor, elija otra fecha." : "⚠️ This agency is closed on Sundays. Please choose another date."}</p>}
              <button onClick={() => setStep("vehicles")} disabled={!startDate || !endDate || isSundayBlocked(startDate) || isSundayBlocked(endDate)} className="w-full py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
                {t.continue}
              </button>
            </div>
          )}

          {step === 'vehicles' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">{t.selectVehicles}</h2>
              <p className="text-gray-500">{calculateDays()} {t.days} {calculateExtraHours() > 0 && `+ ${calculateExtraHours()} ${t.hours}`}</p>
              
              {vehicles.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t.noVehicles}</p>
              ) : (
                <div className="space-y-3">
                  {[...vehicles].sort((a, b) => getVehiclePrice(a, calculateDays(), calculateExtraHours()) - getVehiclePrice(b, calculateDays(), calculateExtraHours())).map(vehicle => {
                    const available = getAvailableQuantity(vehicle)
                    const maxQty = getMaxQuantity(vehicle)
                    const price = getVehiclePrice(vehicle, calculateDays(), calculateExtraHours())
                    const isPlated = vehicle.hasPlate
                    const otherPlatedSelected = hasPlatedVehicleSelected() && !selectedVehicles[vehicle.id]
                    
                    return (
                      <div key={vehicle.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-4 transition ${isPlated ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:shadow-md'}`}>
                        <div className="w-full sm:w-24 h-32 sm:h-24 bg-gradient-to-br from-[#abdee6]/30 to-[#ffaf10]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          {vehicle.imageUrl ? <img src={vehicle.imageUrl} alt={getName(vehicle.name)} className="w-full h-full object-cover rounded-lg" /> : <span className="text-4xl">🚲</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">{getName(vehicle.name)}</h3>
                          </div>
                          <p className="text-sm text-gray-500">{getName(vehicle.category?.name)}</p>
                          <p className="text-sm text-gray-400">{t.deposit}: {vehicle.deposit}€</p>
                          
                          <div className="flex flex-wrap gap-2 mt-1">
                            {getName(vehicle.licenseType) && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🪪 {getName(vehicle.licenseType)}</span>}
                            {getName(vehicle.kmIncluded) && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">📍 {getName(vehicle.kmIncluded)}</span>}
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-[#ffaf10] text-lg">{price * (selectedVehicles[vehicle.id] || 1)}€ {(selectedVehicles[vehicle.id] || 0) > 1 && <span className="text-sm font-normal text-gray-500">({price}€ x {selectedVehicles[vehicle.id]})</span>}</span>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const currentAgency = agencies.find(a => a.id === selectedAgency)
                                if (available === 0) {
                                  const otherAgency = agencies.find(a => a.id !== selectedAgency && a.isActive)
                                  return otherAgency ? (
                                    <button onClick={() => { setSelectedAgency(''); setStep('dates'); }} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg hover:bg-red-200">
                                      {lang === 'fr' ? 'Voir autre agence' : lang === 'es' ? 'Ver otra agencia' : 'See other agency'}
                                    </button>
                                  ) : <span className="text-xs text-red-500">{lang === 'fr' ? 'Indisponible' : lang === 'es' ? 'No disponible' : 'Unavailable'}</span>
                                }
                                if (currentAgency?.showStockUrgency && available <= 3) {
                                  return <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-lg font-medium animate-pulse">{lang === 'fr' ? `Plus que ${available} !` : lang === 'es' ? `¡Solo quedan ${available}!` : `Only ${available} left!`}</span>
                                }
                                return null
                              })()}
                              <select 
                                value={selectedVehicles[vehicle.id] || 0} 
                                onChange={(e) => handleVehicleSelect(vehicle.id, parseInt(e.target.value))}
                                disabled={available === 0 || (isPlated && otherPlatedSelected)}
                                className="p-2 border border-gray-200 rounded-lg disabled:opacity-50"
                              >
                                {[...Array(maxQty + 1)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              <div className="flex gap-3">
                <button onClick={() => setStep('dates')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={() => setStep('options')} disabled={!hasSelectedVehicles()} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
                  {t.continue}
                </button>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">{t.options}</h2>
              <div className="space-y-3">
                {getFilteredOptions().map(option => {
                  const isIncluded = option.includedByDefault;
                  const price = getOptionPrice(option, calculateDays());
                  return (
                    <div key={option.id} className={'border rounded-xl p-4 flex justify-between items-center hover:shadow-md transition ' + (isIncluded ? 'border-green-300 bg-green-50/50' : 'border-gray-200')}>
                      <div className="flex items-center gap-3">
                        {option.imageUrl ? (
                          <img src={option.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🎁</div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">{getName(option.name)}</h3>
                            {isIncluded && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">✓ {t.included}</span>}
                          </div>
                          {option.description && getName(option.description) && (
                          <details className="mt-1">
                            <summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-700">{lang === 'fr' ? "+ d'infos" : lang === 'es' ? '+ info' : '+ info'}</summary>
                            <p className="text-xs text-gray-500 mt-1">{getName(option.description)}</p>
                          </details>
                        )}
                          <p className="text-sm text-[#ffaf10]">{isIncluded ? t.free : (price > 0 ? price + '€' : t.free)}</p>
                        </div>
                      </div>
                      {isIncluded ? (
                        <span className="text-green-600 text-xl">✓</span>
                      ) : (
                        <select value={selectedOptions[option.id] || 0} onChange={(e) => setSelectedOptions({ ...selectedOptions, [option.id]: parseInt(e.target.value) })} className="p-2 border border-gray-200 rounded-lg">
                          {[...Array(getTotalSelectedVehicles() + 1)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('vehicles')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={() => setStep('customer')} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition">{t.continue}</button>
              </div>
            </div>
          )}

          {step === 'customer' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">{t.yourInfo} {getPlatedVehiclesCount() > 1 && <span className="text-sm font-normal text-gray-500">({lang === 'fr' ? 'Conducteur 1' : lang === 'es' ? 'Conductor 1' : 'Driver 1'})</span>}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.firstName}</label>
                  <input type="text" value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.lastName}</label>
                  <input type="text" value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t.email}</label>
                <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className={`w-full p-3 border rounded-xl focus:outline-none ${customer.email && !isValidEmail(customer.email) ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-[#ffaf10]'}`} />
                {customer.email && !isValidEmail(customer.email) && <p className="text-xs text-red-500 mt-1">{lang === 'fr' ? 'Email invalide' : lang === 'es' ? 'Email inválido' : 'Invalid email'}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t.phone}</label>
                <div className="flex gap-2">
                  <select value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)} className="p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none">
                    {phonePrefixes.map(p => <option key={p.code} value={p.code}>{p.country} {p.code !== 'other' ? p.code : ''}</option>)}
                  </select>
                  {phonePrefix === 'other' && <input type="text" value={customPrefix} onChange={(e) => setCustomPrefix(e.target.value)} className="w-20 p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" placeholder="+XX" />}
                  <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="flex-1 p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" placeholder="612345678" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t.address}</label>
                <input type="text" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.postalCode}</label>
                  <input type="text" value={customer.postalCode} onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.city}</label>
                  <input type="text" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t.country}</label>
                  <select value={customer.country} onChange={(e) => setCustomer({ ...customer, country: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none">
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              {additionalDrivers.map((driver, index) => (
                <div key={index} className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">{lang === 'fr' ? `Conducteur ${index + 2}` : lang === 'es' ? `Conductor ${index + 2}` : `Driver ${index + 2}`}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">{t.firstName}</label>
                      <input type="text" value={driver.firstName} onChange={(e) => { const newDrivers = [...additionalDrivers]; newDrivers[index].firstName = e.target.value; setAdditionalDrivers(newDrivers); }} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">{t.lastName}</label>
                      <input type="text" value={driver.lastName} onChange={(e) => { const newDrivers = [...additionalDrivers]; newDrivers[index].lastName = e.target.value; setAdditionalDrivers(newDrivers); }} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-600 mb-1">{t.email}</label>
                    <input type="email" value={driver.email} onChange={(e) => { const newDrivers = [...additionalDrivers]; newDrivers[index].email = e.target.value; setAdditionalDrivers(newDrivers); }} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{t.phone}</label>
                    <input type="tel" value={driver.phone} onChange={(e) => { const newDrivers = [...additionalDrivers]; newDrivers[index].phone = e.target.value; setAdditionalDrivers(newDrivers); }} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                  </div>
                </div>
              ))}
              
              <div className="flex gap-3">
                <button onClick={() => setStep('options')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={() => setStep('payment')} disabled={!customer.firstName || !customer.lastName || !customer.email || !isValidEmail(customer.email) || !customer.phone || (phonePrefix === "other" && !customPrefix) || additionalDrivers.some(d => !d.firstName || !d.lastName || !d.email || !d.phone)} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">{t.continue}</button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">{t.payment}</h2>
              <div className="bg-gradient-to-br from-[#abdee6]/20 to-[#ffaf10]/20 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-gray-700">{t.summary}</h3>
                <div className="text-sm text-gray-600 border-b border-[#ffaf10]/30 pb-2 mb-2">
                  <p>{startDate} {startTime} → {endDate} {endTime}</p>
                  <p>{agencies.find(a => a.id === selectedAgency)?.city}</p>
                </div>
                {Object.entries(selectedVehicles).filter(([, qty]) => qty > 0).map(([id, qty]) => {
                  const v = vehicles.find(x => x.id === id)!
                  const price = getVehiclePrice(v, calculateDays(), calculateExtraHours())
                  return <div key={id} className="flex justify-between text-sm"><span>{getName(v.name)} x{qty}</span><span>{price * qty}€</span></div>
                })}
                {Object.entries(selectedOptions).filter(([, qty]) => qty > 0).map(([id, qty]) => {
                  const o = options.find(x => x.id === id)!
                  return <div key={id} className="flex justify-between text-sm"><span>{getName(o.name)} x{qty}</span><span>{getOptionPrice(o, calculateDays()) * qty}€</span></div>
                })}
                <div className="border-t border-[#ffaf10]/30 pt-2 flex justify-between font-bold text-lg">
                  <span>{t.total}</span>
                  <span className="text-[#ffaf10]">{calculateTotal()}€</span>
                </div>
                <p className="text-xs text-gray-500 text-right">IVA inclusa (21%)</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-bold text-green-800">{t.depositToPay}: {calculateDeposit()}€</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-bold text-amber-800">⚠️ {t.securityDeposit}: {calculateSecurityDeposit()}€</p>
                <p className="text-sm text-amber-600">{widgetSettings.stripeEnabled ? (lang === 'fr' ? 'Carte enregistrée à l\'étape suivante' : lang === 'es' ? 'Tarjeta registrada en el siguiente paso' : 'Card registered in next step') : t.cashOrCard}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('customer')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={handleSubmit} disabled={processing} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
                  {processing ? t.processing : t.payNow}
                </button>
              </div>
            </div>
          )}

          {step === 'deposit' && widgetSettings.stripeEnabled && stripePromise && (
            <Elements stripe={stripePromise}>
              <DepositCardForm
                bookingId={currentBookingId}
                bookingRef={bookingRef}
                customerEmail={returnedEmail || customer.email}
                customerName={returnedName || (customer.firstName + " " + customer.lastName)}
                depositAmount={returnedDepositAmount || calculateSecurityDeposit()}
                lang={lang}
                t={t}
                onSuccess={() => { setCardRegistered(true); setStep('confirmation') }}
                onSkip={() => setStep('confirmation')}
              />
            </Elements>
          )}

          {step === 'deposit' && widgetSettings.stripeEnabled === false && (
            <div className="text-center space-y-4">
              <p className="text-gray-600">{t.processing}</p>
              {setTimeout(() => setStep('confirmation'), 1000) && null}
            </div>
          )}

          {step === 'confirmation' && (
            <div className="text-center space-y-4">
              {(() => {
                const redirectUrls: Record<string, string> = { fr: 'https://voltride.es/fr/', es: 'https://voltride.es/', en: 'https://voltride.es/en/' }
                setTimeout(() => {
                  const url = redirectUrls[lang] || redirectUrls.es
                  if (window.top !== window.self) {
                    window.parent.postMessage({ type: 'voltride-widget-redirect', url }, '*')
                  } else {
                    window.location.href = url
                  }
                }, 15000)
                return null
              })()}
              <h2 className="text-2xl font-bold text-gray-800">{t.confirmation}</h2>
              <div className="bg-gradient-to-br from-[#abdee6]/20 to-[#ffaf10]/20 rounded-xl p-4">
                <p className="text-gray-600">{t.bookingRef}</p>
                <p className="text-2xl font-bold text-[#ffaf10]">{bookingRef}</p>
              </div>
              <p className="text-gray-600">{t.emailSent}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                <h3 className="font-bold text-blue-800 mb-2">{t.requiredDocs}</h3>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• {t.docId}</li>
                  <li>• {lang === 'fr' ? 'Permis AM, si location moto électrique' : lang === 'es' ? 'Permiso AM, si alquiler de moto eléctrica' : 'AM license, if electric motorcycle rental'}</li>
                </ul>
              </div>
              <div className={`rounded-xl p-4 text-left ${cardRegistered ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
  <h3 className={`font-bold ${cardRegistered ? 'text-green-800' : 'text-amber-800'}`}>
    {t.securityDeposit}: {returnedDepositAmount || calculateSecurityDeposit()}€
  </h3>
  <p className={`text-sm ${cardRegistered ? 'text-green-600' : 'text-amber-600'}`}>
    {cardRegistered 
      ? (lang === 'fr' ? 'Votre carte sera pré-autorisée la veille de votre location' : lang === 'es' ? 'Su tarjeta será pre-autorizada el día antes de su alquiler' : 'Your card will be pre-authorized the day before your rental')
      : t.cashOrCard
    }
  </p>
</div>
              <p className="text-gray-500 text-sm mt-4">{lang === 'fr' ? 'Merci pour votre confiance ! À bientôt chez Voltride.' : lang === 'es' ? '¡Gracias por su confianza! Hasta pronto en Voltride.' : 'Thank you for your trust! See you soon at Voltride.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
