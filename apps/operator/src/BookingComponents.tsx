import { useState, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface FleetVehicle {
  id: string
  vehicleNumber: string
  status: string
  vehicle: { id: string; name: any; imageUrl?: string; deposit: number; category: { brand: string }; pricing?: any[] }
  agency: { id: string; city: string; code: string }
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface Agency {
  id: string
  code: string
  name: any
  city: string
  brand: string
}

const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

// Calculer le prix selon la grille tarifaire
const calculatePrice = (pricing: any, days: number): number => {
  if (!pricing) return 0
  
  // Si le nombre de jours correspond à un tarif direct
  const dayKey = `day${days}`
  if (pricing[dayKey] !== undefined) {
    return pricing[dayKey]
  }
  
  // Si plus de 14 jours, calculer proportionnellement
  if (days > 14) {
    const day14Price = pricing.day14 || 0
    const extraDays = days - 14
    const avgDailyRate = day14Price / 14
    return day14Price + (extraDays * avgDailyRate * 0.8) // Réduction de 20% pour jours supplémentaires
  }
  
  return 0
}

// ============== NEW BOOKING MODAL ==============
export function NewBookingModal({
  fleetVehicle,
  initialDate,
  agencies,
  onClose,
  onCreated
}: {
  fleetVehicle?: FleetVehicle | null
  initialDate?: string
  agencies: Agency[]
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<'vehicle' | 'customer' | 'dates' | 'summary'>('vehicle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Vehicle selection
  const [selectedAgency, setSelectedAgency] = useState(fleetVehicle?.agency.id || '')
  const [availableFleet, setAvailableFleet] = useState<FleetVehicle[]>([])
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<FleetVehicle | null>(fleetVehicle || null)
  
  // Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  
  // Dates
  const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:00')
  
  // Pricing (auto-calculated)
  const [totalDays, setTotalDays] = useState(1)
  const [totalPrice, setTotalPrice] = useState(0)
  const [depositAmount, setDepositAmount] = useState(0)
  const [priceOverride, setPriceOverride] = useState<number | null>(null) // Pour override manuel

  // Load fleet when agency changes
  useEffect(() => {
    if (selectedAgency) {
      loadFleet()
    }
  }, [selectedAgency])

  // Calculate pricing when dates or vehicle change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      setTotalDays(days)
      
      // Auto-calculate price from vehicle pricing
      if (selectedFleetVehicle?.vehicle?.pricing?.[0] && priceOverride === null) {
        const pricing = selectedFleetVehicle.vehicle.pricing[0]
        const calculatedPrice = calculatePrice(pricing, days)
        setTotalPrice(calculatedPrice)
      }
    }
  }, [startDate, endDate, selectedFleetVehicle, priceOverride])

  // Set deposit from vehicle
  useEffect(() => {
    if (selectedFleetVehicle) {
      setDepositAmount(selectedFleetVehicle.vehicle.deposit || 0)
      // Reset price override when vehicle changes
      setPriceOverride(null)
    }
  }, [selectedFleetVehicle])

  const loadFleet = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedAgency) params.append('agencyId', selectedAgency)
      if (startDate && endDate) {
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      const res = await fetch(`${API_URL}/api/fleet/available?${params}`)
      const data = await res.json()
      setAvailableFleet(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setAvailableFleet([])
    }
  }

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/customers/search?q=${encodeURIComponent(query)}`)
      setSearchResults(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(timer)
  }, [customerSearch])

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const body: any = {
        agencyId: selectedAgency,
        fleetVehicleId: selectedFleetVehicle?.id,
        startDate,
        endDate,
        startTime,
        endTime,
        vehicleId: selectedFleetVehicle?.vehicle.id,
        quantity: 1,
        unitPrice: priceOverride !== null ? priceOverride : totalPrice,
        totalPrice: priceOverride !== null ? priceOverride : totalPrice,
        depositAmount,
        language: 'fr'
      }
      
      if (selectedCustomer) {
        body.customerId = selectedCustomer.id
      } else if (isNewCustomer) {
        body.customerData = newCustomer
      } else {
        setError('Veuillez sélectionner ou créer un client')
        setLoading(false)
        return
      }
      
      const res = await fetch(`${API_URL}/api/bookings/operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la création')
      }
    } catch (e) {
      setError('Erreur réseau')
    }
    setLoading(false)
  }

  const canProceed = () => {
    switch (step) {
      case 'vehicle': return selectedFleetVehicle !== null
      case 'customer': return selectedCustomer !== null || (isNewCustomer && newCustomer.firstName && newCustomer.lastName && newCustomer.email && newCustomer.phone)
      case 'dates': return startDate && endDate && startTime && endTime && totalPrice > 0
      default: return true
    }
  }

  const nextStep = () => {
    if (step === 'vehicle') setStep('customer')
    else if (step === 'customer') setStep('dates')
    else if (step === 'dates') setStep('summary')
  }

  const prevStep = () => {
    if (step === 'customer') setStep('vehicle')
    else if (step === 'dates') setStep('customer')
    else if (step === 'summary') setStep('dates')
  }

  // Get pricing grid for display
  const getPricingInfo = () => {
    if (!selectedFleetVehicle?.vehicle?.pricing?.[0]) return null
    const p = selectedFleetVehicle.vehicle.pricing[0]
    return { day1: p.day1, day2: p.day2, day3: p.day3, day7: p.day7, day14: p.day14 }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-bold">Nouvelle réservation</h2>
        </div>
        
        {/* Progress */}
        <div className="flex border-b overflow-x-auto">
          {['vehicle', 'customer', 'dates', 'summary'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 min-w-0 py-3 text-center text-sm font-medium cursor-pointer whitespace-nowrap px-2 ${
                step === s ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' :
                ['vehicle', 'customer', 'dates', 'summary'].indexOf(step) > i ? 'text-green-600 bg-green-50' : 'text-gray-400'
              }`}
              onClick={() => {
                const steps = ['vehicle', 'customer', 'dates', 'summary']
                if (steps.indexOf(s) < steps.indexOf(step)) setStep(s as any)
              }}
            >
              {i + 1}. {s === 'vehicle' ? 'Véhicule' : s === 'customer' ? 'Client' : s === 'dates' ? 'Dates & Prix' : 'Résumé'}
            </div>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6">
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
          
          {/* Step 1: Vehicle */}
          {step === 'vehicle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agence *</label>
                <select
                  value={selectedAgency}
                  onChange={e => { setSelectedAgency(e.target.value); setSelectedFleetVehicle(null) }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Sélectionner une agence...</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.city} ({a.code}) - {a.brand}</option>
                  ))}
                </select>
              </div>
              
              {selectedAgency && (
                <div>
                  <label className="block text-sm font-medium mb-2">Véhicule disponible *</label>
                  {availableFleet.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucun véhicule disponible dans cette agence</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-auto">
                      {availableFleet.map(f => (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFleetVehicle(f)}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            selectedFleetVehicle?.id === f.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500' : 'hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {f.vehicle.imageUrl ? (
                              <img src={f.vehicle.imageUrl} className="w-12 h-12 rounded object-cover" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">🚲</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold">{f.vehicleNumber}</p>
                              <p className="text-sm text-gray-600 truncate">{getName(f.vehicle.name)}</p>
                              <p className="text-xs text-gray-400">Caution: {f.vehicle.deposit}€</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedFleetVehicle && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">✅ Véhicule sélectionné: {selectedFleetVehicle.vehicleNumber}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Customer */}
          {step === 'customer' && (
            <div className="space-y-4">
              <div className="flex gap-2 sm:gap-4 mb-4">
                <button
                  onClick={() => { setIsNewCustomer(false); setNewCustomer({ firstName: '', lastName: '', email: '', phone: '' }) }}
                  className={`flex-1 py-2 rounded-lg border text-sm ${!isNewCustomer ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}
                >
                  Client existant
                </button>
                <button
                  onClick={() => { setIsNewCustomer(true); setSelectedCustomer(null) }}
                  className={`flex-1 py-2 rounded-lg border text-sm ${isNewCustomer ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}
                >
                  Nouveau client
                </button>
              </div>
              
              {!isNewCustomer ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Rechercher un client</label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Nom, email ou téléphone..."
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-auto">
                      {searchResults.map(c => (
                        <div
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setSearchResults([]) }}
                          className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                            selectedCustomer?.id === c.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p className="font-medium">{c.firstName} {c.lastName}</p>
                          <p className="text-sm text-gray-500">{c.email} • {c.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                      <button onClick={() => setSelectedCustomer(null)} className="mt-2 text-sm text-red-600">Changer</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Prénom *</label>
                      <input
                        type="text"
                        value={newCustomer.firstName}
                        onChange={e => setNewCustomer({...newCustomer, firstName: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom *</label>
                      <input
                        type="text"
                        value={newCustomer.lastName}
                        onChange={e => setNewCustomer({...newCustomer, lastName: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="+34 612 345 678"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Dates & Pricing */}
          {step === 'dates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date de début *</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Heure de début *</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date de fin *</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Heure de fin *</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              
              {/* Pricing Info */}
              {getPricingInfo() && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Grille tarifaire :</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-white rounded">1j: {getPricingInfo()?.day1}€</span>
                    <span className="px-2 py-1 bg-white rounded">2j: {getPricingInfo()?.day2}€</span>
                    <span className="px-2 py-1 bg-white rounded">3j: {getPricingInfo()?.day3}€</span>
                    <span className="px-2 py-1 bg-white rounded">7j: {getPricingInfo()?.day7}€</span>
                    <span className="px-2 py-1 bg-white rounded">14j: {getPricingInfo()?.day14}€</span>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Tarification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Prix total (€) * 
                      <span className="text-xs text-gray-500 ml-1">(auto-calculé)</span>
                    </label>
                    <input
                      type="number"
                      value={priceOverride !== null ? priceOverride : totalPrice}
                      onChange={e => setPriceOverride(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      min="0"
                      step="0.01"
                    />
                    {priceOverride !== null && (
                      <button onClick={() => setPriceOverride(null)} className="text-xs text-blue-600 mt-1">
                        ↩ Revenir au tarif auto
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Caution (€)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Durée</span>
                    <span className="font-medium">{totalDays} jour(s)</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">{(priceOverride !== null ? priceOverride : totalPrice).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Summary */}
          {step === 'summary' && (
            <div className="space-y-4">
              <h3 className="font-bold">Récapitulatif de la réservation</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Véhicule</p>
                  <p className="font-bold">{selectedFleetVehicle?.vehicleNumber}</p>
                  <p className="text-sm text-gray-600">{getName(selectedFleetVehicle?.vehicle.name)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Agence</p>
                  <p className="font-bold">{agencies.find(a => a.id === selectedAgency)?.city}</p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Client</p>
                {selectedCustomer ? (
                  <>
                    <p className="font-bold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.email} • {selectedCustomer.phone}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold">{newCustomer.firstName} {newCustomer.lastName}</p>
                    <p className="text-sm text-gray-600">{newCustomer.email} • {newCustomer.phone}</p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Nouveau client</span>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Début</p>
                  <p className="font-bold">{new Date(startDate).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm">{startTime}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Fin</p>
                  <p className="font-bold">{new Date(endDate).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm">{endTime}</p>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Durée</span>
                  <span>{totalDays} jour(s)</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Prix location</span>
                  <span>{(priceOverride !== null ? priceOverride : totalPrice).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Caution</span>
                  <span>{depositAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total à payer</span>
                  <span className="text-blue-600">{(priceOverride !== null ? priceOverride : totalPrice).toFixed(2)}€</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 sm:p-6 border-t flex flex-wrap gap-3">
          {step !== 'vehicle' && (
            <button onClick={prevStep} className="px-4 py-2 bg-gray-200 rounded-lg">← Retour</button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          {step !== 'summary' ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              Continuer →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Création...' : '✅ Créer la réservation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============== ASSIGN VEHICLE MODAL ==============
export function AssignVehicleModal({
  booking,
  fleet,
  onClose,
  onAssigned
}: {
  booking: any
  fleet: FleetVehicle[]
  onClose: () => void
  onAssigned: () => void
}) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(booking.fleetVehicleId)
  const [loading, setLoading] = useState(false)
  
  const compatibleFleet = fleet.filter(f => {
    if (f.agency.id !== booking.agency.id) return false
    const bookingVehicleIds = booking.items.map((i: any) => i.vehicle.id)
    if (!bookingVehicleIds.includes(f.vehicle.id)) return false
    if (f.status !== 'AVAILABLE' && f.id !== booking.fleetVehicleId) return false
    return true
  })

  const handleAssign = async () => {
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/bookings/${booking.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleetVehicleId: selectedVehicle })
      })
      onAssigned()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Assigner un véhicule</h2>
        <p className="text-gray-600 mb-4">Réservation: <span className="font-mono">{booking.reference}</span></p>
        
        {compatibleFleet.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <p className="text-yellow-800">Aucun véhicule compatible disponible.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-64 overflow-auto">
            {compatibleFleet.map(f => (
              <div
                key={f.id}
                onClick={() => setSelectedVehicle(f.id)}
                className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${
                  selectedVehicle === f.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                {f.vehicle.imageUrl && <img src={f.vehicle.imageUrl} className="w-10 h-10 rounded object-cover" />}
                <div className="flex-1">
                  <p className="font-bold">{f.vehicleNumber}</p>
                  <p className="text-sm text-gray-600">{getName(f.vehicle.name)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button
            onClick={handleAssign}
            disabled={!selectedVehicle || loading}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Assignation...' : 'Assigner'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default { NewBookingModal, AssignVehicleModal }
