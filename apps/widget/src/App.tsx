import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://voltride-booking-production.up.railway.app'
const BRAND = 'VOLTRIDE'

interface Agency { id: string; code: string; name: { fr: string; es: string; en: string }; address: string; city: string; phone: string; email: string }
interface Vehicle { id: string; sku: string; name: { fr: string; es: string; en: string }; description: { fr: string; es: string; en: string }; deposit: number; hasPlate: boolean; licenseType?: { fr: string; es: string; en: string }; kmIncluded?: { fr: string; es: string; en: string }; imageUrl?: string; category: { name: { fr: string; es: string; en: string }; brand: string }; pricing: any[]; inventory: any[] }
interface Option { id: string; code: string; name: { fr: string; es: string; en: string }; price: number; maxQuantity: number; categories?: any[] }

type Lang = 'fr' | 'es' | 'en'
type Step = 'dates' | 'vehicles' | 'options' | 'customer' | 'payment' | 'confirmation'

const translations = {
  fr: { title: 'Location de vélos & e-bikes', selectAgency: 'Agence', selectDates: 'Sélectionnez vos dates', pickupDate: 'Date de retrait', returnDate: 'Date de retour', pickupTime: 'Heure de retrait', returnTime: 'Heure de retour', continue: 'Continuer', back: 'Retour', selectVehicles: 'Choisissez vos véhicules', quantity: 'Quantité', available: 'disponible(s)', deposit: 'Caution', perDay: '/jour', options: 'Options & Accessoires', yourInfo: 'Vos informations', firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone', address: 'Adresse', postalCode: 'Code postal', city: 'Ville', country: 'Pays', payment: 'Paiement', summary: 'Récapitulatif', total: 'Total', depositToPay: 'Acompte à payer', depositInfo20: '20% car montant > 100€', depositInfo50: '50% car montant ≤ 100€', payNow: 'Payer maintenant', confirmation: 'Réservation confirmée !', bookingRef: 'Référence', emailSent: 'Un email de confirmation a été envoyé.', requiredDocs: 'Documents requis', docId: "Pièce d'identité ou passeport", docLicense: "Permis AM/A1/A2/B selon véhicule", securityDeposit: 'Caution à régler sur place', cashOrCard: 'En espèces ou carte de crédit (pas de carte de débit)', days: 'jour(s)', hours: 'heure(s) sup.', noVehicles: 'Aucun véhicule disponible pour cette agence', processing: 'Traitement en cours...', licensePlateWarning: '1 seul par réservation', helmetIncluded: 'Casque inclus' },
  es: { title: 'Alquiler de bicicletas y e-bikes', selectAgency: 'Agencia', selectDates: 'Seleccione sus fechas', pickupDate: 'Fecha de recogida', returnDate: 'Fecha de devolución', pickupTime: 'Hora de recogida', returnTime: 'Hora de devolución', continue: 'Continuar', back: 'Volver', selectVehicles: 'Elija sus vehículos', quantity: 'Cantidad', available: 'disponible(s)', deposit: 'Fianza', perDay: '/día', options: 'Opciones y Accesorios', yourInfo: 'Sus datos', firstName: 'Nombre', lastName: 'Apellido', email: 'Email', phone: 'Teléfono', address: 'Dirección', postalCode: 'Código postal', city: 'Ciudad', country: 'País', payment: 'Pago', summary: 'Resumen', total: 'Total', depositToPay: 'Anticipo a pagar', depositInfo20: '20% porque importe > 100€', depositInfo50: '50% porque importe ≤ 100€', payNow: 'Pagar ahora', confirmation: '¡Reserva confirmada!', bookingRef: 'Referencia', emailSent: 'Se ha enviado un email de confirmación.', requiredDocs: 'Documentos requeridos', docId: 'Documento de identidad o pasaporte', docLicense: 'Permiso AM/A1/A2/B según vehículo', securityDeposit: 'Fianza a pagar en tienda', cashOrCard: 'En efectivo o tarjeta de crédito (no débito)', days: 'día(s)', hours: 'hora(s) extra', noVehicles: 'No hay vehículos disponibles para esta agencia', processing: 'Procesando...', licensePlateWarning: 'solo 1 por reserva', helmetIncluded: 'Casco incluido' },
  en: { title: 'Bike & E-Bike Rental', selectAgency: 'Agency', selectDates: 'Select your dates', pickupDate: 'Pickup date', returnDate: 'Return date', pickupTime: 'Pickup time', returnTime: 'Return time', continue: 'Continue', back: 'Back', selectVehicles: 'Choose your vehicles', quantity: 'Quantity', available: 'available', deposit: 'Deposit', perDay: '/day', options: 'Options & Accessories', yourInfo: 'Your information', firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', address: 'Address', postalCode: 'Postal code', city: 'City', country: 'Country', payment: 'Payment', summary: 'Summary', total: 'Total', depositToPay: 'Deposit to pay', depositInfo20: '20% because amount > 100€', depositInfo50: '50% because amount ≤ 100€', payNow: 'Pay now', confirmation: 'Booking confirmed!', bookingRef: 'Reference', emailSent: 'A confirmation email has been sent.', requiredDocs: 'Required documents', docId: 'ID card or passport', docLicense: 'AM/A1/A2/B license depending on vehicle', securityDeposit: 'Security deposit payable on site', cashOrCard: 'Cash or credit card (no debit cards)', days: 'day(s)', hours: 'extra hour(s)', noVehicles: 'No vehicles available for this agency', processing: 'Processing...', licensePlateWarning: 'only 1 per booking', helmetIncluded: 'Helmet included' }
}

const getTimeSlots = (dateStr: string): string[] => {
  const date = dateStr ? new Date(dateStr) : new Date()
  const month = date.getMonth()
  const isSummer = month >= 3 && month <= 8
  const endHour = isSummer ? 19 : 16
  const slots: string[] = []
  for (let h = 10; h <= endHour; h++) {
    for (const m of ['00', '15', '30', '45']) {
      if (h === endHour && m !== '00') continue
      slots.push(`${h.toString().padStart(2, '0')}:${m}`)
    }
  }
  return slots
}

const WavesBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '40%' }}>
      <path fill="rgba(255,255,255,0.3)" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
        <animate attributeName="d" dur="10s" repeatCount="indefinite" values="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,128L48,144C96,160,192,192,288,197.3C384,203,480,181,576,165.3C672,149,768,139,864,154.7C960,171,1056,213,1152,218.7C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </path>
    </svg>
    <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '30%' }}>
      <path fill="rgba(255,255,255,0.5)" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
        <animate attributeName="d" dur="8s" repeatCount="indefinite" values="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,261.3C672,256,768,224,864,208C960,192,1056,192,1152,202.7C1248,213,1344,235,1392,245.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </path>
    </svg>
    <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '20%' }}>
      <path fill="rgba(255,255,255,0.9)" d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,245.3C672,256,768,256,864,245.3C960,235,1056,213,1152,208C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
        <animate attributeName="d" dur="6s" repeatCount="indefinite" values="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,245.3C672,256,768,256,864,245.3C960,235,1056,213,1152,208C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,261.3C960,277,1056,299,1152,293.3C1248,288,1344,256,1392,240L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,245.3C672,256,768,256,864,245.3C960,235,1056,213,1152,208C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </path>
    </svg>
  </div>
)

function App() {
  const [lang, setLang] = useState<Lang>('fr')
  const [step, setStep] = useState<Step>('dates')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
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
  const [bookingRef, setBookingRef] = useState('')
  const [processing, setProcessing] = useState(false)

  const t = translations[lang]
  const startTimeSlots = getTimeSlots(startDate)
  const endTimeSlots = getTimeSlots(endDate)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedAgency) loadVehicles() }, [selectedAgency])
  useEffect(() => { if (startDate && !startTimeSlots.includes(startTime)) setStartTime(startTimeSlots[0] || '10:00') }, [startDate, startTimeSlots])
  useEffect(() => { if (endDate && !endTimeSlots.includes(endTime)) setEndTime(endTimeSlots[0] || '10:00') }, [endDate, endTimeSlots])

  const loadData = async () => {
    try {
      const [agenciesRes, optionsRes] = await Promise.all([fetch(`${API_URL}/api/agencies`), fetch(`${API_URL}/api/options`)])
      const agenciesData = await agenciesRes.json()
      const filteredAgencies = agenciesData.filter((a: any) => a.brand === BRAND)
      setAgencies(filteredAgencies)
      if (filteredAgencies.length > 0) setSelectedAgency(filteredAgencies[0].id)
      setOptions(await optionsRes.json())
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const loadVehicles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vehicles?agencyId=${selectedAgency}`)
      const data = await res.json()
      // Filtrer par marque ET par stock > 0
      const filtered = (Array.isArray(data) ? data : []).filter((v: Vehicle) => {
        if (v.category?.brand !== BRAND) return false
        const inv = v.inventory?.find((i: any) => i.agencyId === selectedAgency)
        return inv && inv.quantity > 0
      })
      setVehicles(filtered)
    } catch (error) { console.error('Error:', error) }
  }

  const getName = (obj: any) => obj?.[lang] || obj?.fr || ''
  
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
    let total = 0
    for (let i = 1; i <= Math.min(days, 14); i++) {
      total += Number(pricing[`day${i}`]) || 0
    }
    if (days > 14) {
      total += (days - 14) * (Number(pricing.day14) || 0)
    }
    for (let i = 1; i <= Math.min(extraHours, 4); i++) {
      total += Number(pricing[`extraHour${i}`]) || 0
    }
    return total
  }
  
  const getAvailableQuantity = (vehicle: Vehicle): number => {
    const inv = vehicle.inventory?.find((i: any) => i.agencyId === selectedAgency)
    return inv?.quantity || 0
  }

  const getMaxQuantity = (vehicle: Vehicle): number => {
    const available = getAvailableQuantity(vehicle)
    if (vehicle.hasPlate) return Math.min(1, available)
    return available
  }

  const hasPlatedVehicleSelected = (): boolean => {
    return Object.entries(selectedVehicles).some(([id, qty]) => {
      if (qty <= 0) return false
      const v = vehicles.find(x => x.id === id)
      return v?.hasPlate === true
    })
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
        total += o.price * qty * days
      }
    })
    return total
  }
  
  // Voltride: 50% si <= 100€, 20% si > 100€
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


  // Récupérer les catégories des véhicules sélectionnés
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

  // Filtrer les options pour ne montrer que celles liées aux catégories sélectionnées
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
        const newSelection: Record<string, number> = {}
        Object.entries(selectedVehicles).forEach(([id, qty]) => {
          const v = vehicles.find(x => x.id === id)
          if (!v?.hasPlate) {
            newSelection[id] = qty
          }
        })
        newSelection[vehicleId] = quantity
        setSelectedVehicles(newSelection)
      } else {
        setSelectedVehicles({ ...selectedVehicles, [vehicleId]: 0 })
      }
    } else {
      setSelectedVehicles({ ...selectedVehicles, [vehicleId]: quantity })
    }
  }

  const handleSubmit = async () => {
    setProcessing(true)
    try {
      const days = calculateDays()
      const extraHours = calculateExtraHours()
      const items = Object.entries(selectedVehicles)
        .filter(([, qty]) => qty > 0)
        .map(([vehicleId, quantity]) => {
          const vehicle = vehicles.find(v => v.id === vehicleId)!
          const unitPrice = getVehiclePrice(vehicle, days, extraHours)
          return { vehicleId, quantity, unitPrice, totalPrice: unitPrice * quantity }
        })
      const opts = Object.entries(selectedOptions)
        .filter(([, qty]) => qty > 0)
        .map(([optionId, quantity]) => {
          const option = options.find(o => o.id === optionId)!
          const unitPrice = option.price * days
          return { optionId, quantity, unitPrice, totalPrice: unitPrice * quantity }
        })
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: selectedAgency,
          customer: { ...customer, language: lang },
          startDate, endDate, startTime, endTime,
          items, options: opts,
          totalPrice: calculateTotal(),
          depositAmount: calculateDeposit(),
          language: lang
        })
      })
      const booking = await res.json()
      setBookingRef(booking.reference)
      setStep('confirmation')
    } catch (error) { console.error('Booking error:', error) }
    setProcessing(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #abdee6 60%, #ffaf10 100%)' }}>
      <WavesBackground />
      <div className="text-gray-800 text-xl z-10">Chargement...</div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #abdee6 60%, #ffaf10 100%)' }}>
      <WavesBackground />
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-6">
          <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766883143/IMG-20251228-WA0001-removebg-preview_n0fsq5.png" alt="Voltride" className="h-20 mx-auto mb-2 drop-shadow-lg" />
          <p className="text-gray-700 font-medium">{t.title}</p>
          <div className="flex justify-center gap-2 mt-3">
            {(['fr', 'es', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-full text-sm font-bold transition shadow-md ${lang === l ? 'bg-white text-[#ffaf10]' : 'bg-white/50 text-gray-700 hover:bg-white/70'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between mb-6 px-4">
          {['dates', 'vehicles', 'options', 'customer', 'payment'].map((s, i) => (
            <div key={s} className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${['dates', 'vehicles', 'options', 'customer', 'payment'].indexOf(step) >= i ? 'bg-white text-[#ffaf10]' : 'bg-white/50 text-gray-500'}`}>{i + 1}</div>
              {i < 4 && <div className={`flex-1 h-1 mx-2 rounded ${['dates', 'vehicles', 'options', 'customer', 'payment'].indexOf(step) > i ? 'bg-white' : 'bg-white/50'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          {step === 'dates' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">🌴 {t.selectDates}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t.selectAgency}</label>
                <select value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none">
                  {agencies.map(a => <option key={a.id} value={a.id}>{getName(a.name)} - {a.city}</option>)}
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
              <button onClick={() => setStep('vehicles')} disabled={!startDate || !endDate} className="w-full py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
                {t.continue}
              </button>
            </div>
          )}

          {step === 'vehicles' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">🚲 {t.selectVehicles}</h2>
              <p className="text-gray-500">{calculateDays()} {t.days} {calculateExtraHours() > 0 && `+ ${calculateExtraHours()} ${t.hours}`}</p>
              
              {vehicles.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t.noVehicles}</p>
              ) : (
                <div className="space-y-3">
                  {vehicles.map(vehicle => {
                    const available = getAvailableQuantity(vehicle)
                    const maxQty = getMaxQuantity(vehicle)
                    const price = getVehiclePrice(vehicle, calculateDays(), calculateExtraHours())
                    const isPlated = vehicle.hasPlate
                    const otherPlatedSelected = hasPlatedVehicleSelected() && !selectedVehicles[vehicle.id]
                    
                    return (
                      <div key={vehicle.id} className={`border rounded-xl p-4 flex gap-4 transition ${isPlated ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:shadow-md'}`}>
                        <div className="w-24 h-24 bg-gradient-to-br from-[#abdee6]/30 to-[#ffaf10]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          {vehicle.imageUrl ? <img src={vehicle.imageUrl} alt={getName(vehicle.name)} className="w-full h-full object-cover rounded-lg" /> : <span className="text-4xl">🚲</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">{getName(vehicle.name)}</h3>
                            
                          </div>
                          <p className="text-sm text-gray-500">{getName(vehicle.category?.name)}</p>
                          <p className="text-sm text-gray-400">{t.deposit}: {vehicle.deposit}€</p>
                          {isPlated && <p className="text-xs text-amber-600 mt-1">{t.licensePlateWarning}</p>}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {getName(vehicle.licenseType) && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🪪 {getName(vehicle.licenseType)}</span>}
                            {getName(vehicle.kmIncluded) && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">📍 {getName(vehicle.kmIncluded)}</span>}
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-[#ffaf10] text-lg">{price}€</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{available} {t.available}</span>
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
              <h2 className="text-xl font-bold text-gray-800">🎒 {t.options}</h2>
              <div className="space-y-3">
                {getFilteredOptions().map(option => (
                  <div key={option.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition">
                    <div>
                      <h3 className="font-bold text-gray-800">{getName(option.name)}</h3>
                      <p className="text-sm text-[#ffaf10]">{option.price}€ {t.perDay}</p>
                    </div>
                    <input type="checkbox" checked={(selectedOptions[option.id] || 0) > 0} onChange={(e) => setSelectedOptions({ ...selectedOptions, [option.id]: e.target.checked ? 1 : 0 })} className="w-6 h-6 accent-[#ffaf10]" />

                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('vehicles')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={() => setStep('customer')} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition">{t.continue}</button>
              </div>
            </div>
          )}

          {step === 'customer' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">👤 {t.yourInfo}</h2>
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
                <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t.phone}</label>
                <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
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
                  <input type="text" value={customer.country} onChange={(e) => setCustomer({ ...customer, country: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-[#ffaf10] focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('options')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={() => setStep('payment')} disabled={!customer.firstName || !customer.lastName || !customer.email || !customer.phone} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">{t.continue}</button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">💳 {t.payment}</h2>
              <div className="bg-gradient-to-br from-[#abdee6]/20 to-[#ffaf10]/20 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-gray-700">{t.summary}</h3>
                {Object.entries(selectedVehicles).filter(([, qty]) => qty > 0).map(([id, qty]) => {
                  const v = vehicles.find(x => x.id === id)!
                  const price = getVehiclePrice(v, calculateDays(), calculateExtraHours())
                  return <div key={id} className="flex justify-between text-sm"><span>{getName(v.name)} x{qty}</span><span>{price * qty}€</span></div>
                })}
                {Object.entries(selectedOptions).filter(([, qty]) => qty > 0).map(([id, qty]) => {
                  const o = options.find(x => x.id === id)!
                  return <div key={id} className="flex justify-between text-sm"><span>{getName(o.name)} x{qty}</span><span>{o.price * qty * calculateDays()}€</span></div>
                })}
                <div className="border-t border-[#ffaf10]/30 pt-2 flex justify-between font-bold text-lg">
                  <span>{t.total}</span>
                  <span className="text-[#ffaf10]">{calculateTotal()}€</span>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-bold text-green-800">✅ {t.depositToPay}: {calculateDeposit()}€</p>
                <p className="text-sm text-green-600">{calculateTotal() > 100 ? t.depositInfo20 : t.depositInfo50}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-bold text-amber-800">⚠️ {t.securityDeposit}: {calculateSecurityDeposit()}€</p>
                <p className="text-sm text-amber-600">{t.cashOrCard}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('customer')} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">{t.back}</button>
                <button onClick={handleSubmit} disabled={processing} className="flex-1 py-3 bg-gradient-to-r from-[#abdee6] to-[#ffaf10] text-gray-800 font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
                  {processing ? t.processing : t.payNow}
                </button>
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="text-center space-y-4">
              <div className="text-6xl animate-bounce">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800">{t.confirmation}</h2>
              <div className="bg-gradient-to-br from-[#abdee6]/20 to-[#ffaf10]/20 rounded-xl p-4">
                <p className="text-gray-600">{t.bookingRef}</p>
                <p className="text-2xl font-bold text-[#ffaf10]">{bookingRef}</p>
              </div>
              <p className="text-gray-600">📧 {t.emailSent}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                <h3 className="font-bold text-blue-800 mb-2">�� {t.requiredDocs}</h3>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• {t.docId}</li>
                  <li>• {t.docLicense}</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <h3 className="font-bold text-amber-800">💰 {t.securityDeposit}: {calculateSecurityDeposit()}€</h3>
                <p className="text-sm text-amber-600">{t.cashOrCard}</p>
              </div>
              <p className="text-4xl">🌴☀️🚲</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
