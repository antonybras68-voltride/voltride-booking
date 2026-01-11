import { useState, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

const COUNTRIES = [
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'France', prefix: '+33', flag: '🇫🇷' },
  { code: 'GB', name: 'United Kingdom', prefix: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Deutschland', prefix: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italia', prefix: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Nederland', prefix: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgique', prefix: '+32', flag: '🇧🇪' },
]

interface NewBookingModalProps {
  fleetVehicle?: any
  startDate?: string
  agencyId: string
  brand: string
  onClose: () => void
  onComplete: () => void
}

export function NewBookingModal({ fleetVehicle, startDate, agencyId, brand, onClose, onComplete }: NewBookingModalProps) {
  const [step, setStep] = useState(1) // 1: Vehicle/Dates, 2: Options, 3: Customer, 4: Summary
  const [options, setOptions] = useState([])
  const [selectedOptions, setSelectedOptions] = useState({})
  const [loading, setLoading] = useState(false)
  
  // Vehicle & dates
  const [selectedFleet, setSelectedFleet] = useState(fleetVehicle || null)
  const [availableFleet, setAvailableFleet] = useState([])
  const [bookingStartDate, setBookingStartDate] = useState(startDate || new Date().toISOString().split('T')[0])
  const [bookingEndDate, setBookingEndDate] = useState(startDate || new Date().toISOString().split('T')[0])
  const [bookingStartTime, setBookingStartTime] = useState('10:00')
  const [bookingEndTime, setBookingEndTime] = useState('10:00')
  
  // Customer
  const [customerMode, setCustomerMode] = useState('search') // 'search' | 'tablet' | 'manual'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerForm, setCustomerForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES'
  })
  
  // Tablet walkin
  const [walkinSessionId, setWalkinSessionId] = useState(null)
  const [walkinStatus, setWalkinStatus] = useState(null)
  const [walkinData, setWalkinData] = useState(null)
  
  // Pricing
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [depositAmount, setDepositAmount] = useState(0)

  // Load available fleet
  useEffect(() => {
    if (agencyId) {
      api.getFleet({ agencyId, status: 'AVAILABLE' }).then(data => {
        setAvailableFleet(Array.isArray(data) ? data : [])
      })
    }
  }, [agencyId])
  // Load options for category
  useEffect(() => {
    if (selectedFleet?.vehicle?.categoryId) {
      fetch("https://api-voltrideandmotorrent-production.up.railway.app/api/options")
        .then(res => res.json())
        .then(data => {
          const categoryOptions = data.filter((opt: any) => 
            opt.categories?.some((c: any) => c.categoryId === selectedFleet.vehicle.categoryId)
          )
          setOptions(categoryOptions.length > 0 ? categoryOptions : data)
        })
    }
  }, [selectedFleet])

  // Search customers
  useEffect(() => {
    if (searchQuery.length >= 2) {
      api.searchCustomers(searchQuery).then(data => {
        setSearchResults(Array.isArray(data) ? data : [])
      })
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  // Calculate price when dates change
  // Calculate option price based on days
  const getOptionPrice = (option: any, days: number): number => {
    if (days <= 14) {
      return option["day" + days] || option.day14 || 0
    }
    return option.day14 || 0
  }

  // Calculate total options price
  const calculateOptionsTotal = (): number => {
    const start = new Date(bookingStartDate)
    const end = new Date(bookingEndDate)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    return Object.entries(selectedOptions).reduce((total, [optId, qty]) => {
      const opt = options.find((o: any) => o.id === optId)
      if (opt && qty > 0) {
        return total + (getOptionPrice(opt, days) * (qty as number))
      }
      return total
    }, 0)
  }
  useEffect(() => {
    if (selectedFleet && bookingStartDate && bookingEndDate) {
      const start = new Date(bookingStartDate)
      const end = new Date(bookingEndDate)
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
      
      const pricing = selectedFleet.vehicle?.pricing?.[0]
      if (pricing) {
        let price = 0
        if (days <= 14) {
          price = pricing['day' + days] || pricing.day14 || 0
        } else {
          price = (pricing.day14 || 0) + ((days - 14) * (pricing.extraDayPrice || 10))
        }
        setCalculatedPrice(price)
      }
      setDepositAmount(selectedFleet.vehicle?.deposit || 100)
    }
  }, [selectedFleet, bookingStartDate, bookingEndDate])

  // Send walkin to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    try {
      await fetch('https://api-voltrideandmotorrent-production.up.railway.app/api/walkin-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          agencyId,
          language: 'fr',
          brand
        })
      })
      pollWalkinSession(sessionId)
    } catch (e) {
      alert('Erreur lors de l\'envoi')
      setWalkinStatus(null)
    }
  }

  const pollWalkinSession = (sessionId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('https://api-voltrideandmotorrent-production.up.railway.app/api/walkin-sessions/' + sessionId)
        const data = await res.json()
        if (data && data.status === 'completed') {
          setWalkinData(data)
          setWalkinStatus('completed')
          setCustomerForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phone: data.phone || '',
            phonePrefix: data.phonePrefix || '+34',
            address: data.address || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            country: data.country || 'ES'
          })
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000)
  }

  const cancelWalkin = () => {
    setWalkinSessionId(null)
    setWalkinStatus(null)
    setWalkinData(null)
  }

  // Validate step
  const canProceed = () => {
    switch (step) {
      case 1: return selectedFleet && bookingStartDate && bookingEndDate
      case 2: return true // Options step - always can proceed
      case 3: 
        if (customerMode === 'search') return selectedCustomer
        if (customerMode === 'tablet') return walkinStatus === 'completed'
        if (customerMode === 'manual') return customerForm.firstName && customerForm.lastName && customerForm.email && customerForm.phone
        return false
      case 4: return true
      default: return false
    }
  }

  // Create booking
  const handleCreateBooking = async () => {
    setLoading(true)
    try {
      let customerId = selectedCustomer?.id

      // Create customer if new
      if (customerMode !== 'search') {
        const customerData = customerMode === 'tablet' ? walkinData : customerForm
        const res = await fetch('https://api-voltrideandmotorrent-production.up.railway.app/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            email: customerData.email,
            phone: (customerData.phonePrefix || '+34') + customerData.phone,
            address: customerData.address,
            city: customerData.city,
            postalCode: customerData.postalCode,
            country: customerData.country
          })
        })
        const newCustomer = await res.json()
        customerId = newCustomer.id
      }

      // Create booking
      const bookingRes = await api.createBooking({
        customerId,
        agencyId,
        fleetVehicleId: selectedFleet.id,
        vehicleId: selectedFleet.vehicle?.id,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        totalPrice: calculatedPrice,
        depositAmount,
        status: 'CONFIRMED',
        source: 'WALK_IN',
        language: 'fr'
      })

      if (bookingRes.error) {
        throw new Error(bookingRes.error)
      }

      // Update fleet status
      await api.updateFleetVehicle(selectedFleet.id, { status: 'RENTED' })

      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la création: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b" style={{ backgroundColor: brand === 'VOLTRIDE' ? '#abdee6' : '#ffaf10' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">➕ Nouvelle réservation</h2>
            <button onClick={onClose} className="text-2xl opacity-70 hover:opacity-100">&times;</button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex border-b">
          {['Véhicule & Dates', 'Options', 'Client', 'Récapitulatif'].map((label, i) => (
            <button key={i} onClick={() => i + 1 <= step && setStep(i + 1)}
              className={'flex-1 py-3 text-center text-sm font-medium ' +
                (step === i + 1 ? 'bg-white border-b-2 border-blue-500 text-blue-600' :
                 i + 1 < step ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400')}>
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* Step 1: Vehicle & Dates */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Vehicle selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Véhicule</label>
                {selectedFleet ? (
                  <div className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                    {selectedFleet.vehicle?.imageUrl ? (
                      <img src={selectedFleet.vehicle.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">🚲</div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold">{selectedFleet.vehicleNumber}</p>
                      <p className="text-sm text-gray-600">{getName(selectedFleet.vehicle?.name)}</p>
                    </div>
                    <button onClick={() => setSelectedFleet(null)} className="text-red-500 text-sm">Changer</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-auto">
                    {availableFleet.map(f => (
                      <button key={f.id} onClick={() => setSelectedFleet(f)}
                        className="flex items-center gap-3 p-3 border-2 rounded-xl hover:border-blue-500 text-left">
                        {f.vehicle?.imageUrl ? (
                          <img src={f.vehicle.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">🚲</div>
                        )}
                        <div>
                          <p className="font-bold text-sm">{f.vehicleNumber}</p>
                          <p className="text-xs text-gray-500">{getName(f.vehicle?.name)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date début</label>
                  <input type="date" value={bookingStartDate}
                    onChange={e => setBookingStartDate(e.target.value)}
                    className="w-full border-2 rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure début</label>
                  <input type="time" value={bookingStartTime}
                    onChange={e => setBookingStartTime(e.target.value)}
                    className="w-full border-2 rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date fin</label>
                  <input type="date" value={bookingEndDate}
                    onChange={e => setBookingEndDate(e.target.value)}
                    min={bookingStartDate}
                    className="w-full border-2 rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure fin</label>
                  <input type="time" value={bookingEndTime}
                    onChange={e => setBookingEndTime(e.target.value)}
                    className="w-full border-2 rounded-xl p-3" />
                </div>
              </div>

              {/* Price preview */}
              {selectedFleet && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex justify-between text-lg">
                    <span>Prix location</span>
                    <span className="font-bold">{calculatedPrice.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Caution</span>
                    <span>{depositAmount.toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Step 2: Options */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Options & Accessoires</h3>
              {options.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune option disponible</p>
              ) : (
                <div className="space-y-3">
                  {options.map((option: any) => {
                    const start = new Date(bookingStartDate)
                    const end = new Date(bookingEndDate)
                    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                    const price = getOptionPrice(option, days)
                    return (
                      <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!selectedOptions[option.id]}
                            onChange={(e) => setSelectedOptions({...selectedOptions, [option.id]: e.target.checked ? 1 : 0})}
                            className="w-5 h-5 rounded"
                          />
                          <div>
                            <p className="font-medium">{getName(option.name)}</p>
                            <p className="text-sm text-gray-500">{price}€ pour {days} jour(s)</p>
                          </div>
                        </div>
                        {selectedOptions[option.id] > 0 && option.maxQuantity > 1 && (
                          <select
                            value={selectedOptions[option.id] || 1}
                            onChange={(e) => setSelectedOptions({...selectedOptions, [option.id]: parseInt(e.target.value)})}
                            className="p-2 border rounded-lg"
                          >
                            {Array.from({length: option.maxQuantity}, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total options: <span className="font-bold">{calculateOptionsTotal()}€</span></p>
              </div>
            </div>
          )}

          {/* Step 3: Customer */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Mode selector */}
              <div className="flex gap-2">
                <button onClick={() => { setCustomerMode('search'); cancelWalkin() }}
                  className={'flex-1 py-3 rounded-xl border-2 font-medium text-sm ' + 
                    (customerMode === 'search' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>
                  🔍 Client existant
                </button>
                <button onClick={() => { setCustomerMode('tablet'); setSelectedCustomer(null) }}
                  className={'flex-1 py-3 rounded-xl border-2 font-medium text-sm ' + 
                    (customerMode === 'tablet' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>
                  📱 Nouveau (tablette)
                </button>
                <button onClick={() => { setCustomerMode('manual'); setSelectedCustomer(null); cancelWalkin() }}
                  className={'flex-1 py-3 rounded-xl border-2 font-medium text-sm ' + 
                    (customerMode === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200')}>
                  ✏️ Nouveau (manuel)
                </button>
              </div>

              {/* Search mode */}
              {customerMode === 'search' && (
                <div className="space-y-4">
                  <input type="text" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, email ou téléphone..."
                    className="w-full border-2 rounded-xl p-3" />
                  
                  {selectedCustomer ? (
                    <div className="p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                          <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                          <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                        </div>
                        <button onClick={() => setSelectedCustomer(null)} className="text-red-500 text-sm">Changer</button>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {searchResults.map(c => (
                        <button key={c.id} onClick={() => setSelectedCustomer(c)}
                          className="w-full p-3 border-2 rounded-xl hover:border-blue-500 text-left">
                          <p className="font-medium">{c.firstName} {c.lastName}</p>
                          <p className="text-sm text-gray-500">{c.email} • {c.phone}</p>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <p className="text-center text-gray-500 py-4">Aucun client trouvé</p>
                  ) : (
                    <p className="text-center text-gray-400 py-4">Tapez au moins 2 caractères pour rechercher</p>
                  )}
                </div>
              )}

              {/* Tablet mode */}
              {customerMode === 'tablet' && (
                <div>
                  {!walkinStatus && (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">Le client remplira ses informations sur la tablette comptoir</p>
                      <button onClick={sendWalkinToTablet}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                        📱 Envoyer sur tablette
                      </button>
                    </div>
                  )}
                  
                  {walkinStatus === 'waiting' && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4 animate-pulse">⏳</div>
                      <p className="text-gray-600">En attente des informations client...</p>
                      <p className="text-sm text-gray-400 mt-2">Le client remplit le formulaire sur la tablette</p>
                      <button onClick={cancelWalkin} className="mt-4 text-red-600">Annuler</button>
                    </div>
                  )}
                  
                  {walkinStatus === 'completed' && (
                    <div className="p-4 bg-green-50 border-2 border-green-500 rounded-xl">
                      <p className="font-bold text-green-700 mb-2">✅ Informations reçues !</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-500">Nom:</span> <strong>{customerForm.firstName} {customerForm.lastName}</strong></p>
                        <p><span className="text-gray-500">Email:</span> <strong>{customerForm.email}</strong></p>
                        <p><span className="text-gray-500">Tél:</span> <strong>{customerForm.phonePrefix}{customerForm.phone}</strong></p>
                        <p><span className="text-gray-500">Ville:</span> <strong>{customerForm.city}</strong></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {customerMode === 'manual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Prénom *</label>
                      <input type="text" value={customerForm.firstName}
                        onChange={e => setCustomerForm({...customerForm, firstName: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom *</label>
                      <input type="text" value={customerForm.lastName}
                        onChange={e => setCustomerForm({...customerForm, lastName: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input type="email" value={customerForm.email}
                      onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                      className="w-full border-2 rounded-xl p-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone *</label>
                    <div className="flex gap-2">
                      <select value={customerForm.phonePrefix}
                        onChange={e => setCustomerForm({...customerForm, phonePrefix: e.target.value})}
                        className="border-2 rounded-xl p-3 w-28">
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.prefix}>{c.flag} {c.prefix}</option>
                        ))}
                      </select>
                      <input type="tel" value={customerForm.phone}
                        onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                        className="flex-1 border-2 rounded-xl p-3" placeholder="612345678" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Adresse</label>
                    <input type="text" value={customerForm.address}
                      onChange={e => setCustomerForm({...customerForm, address: e.target.value})}
                      className="w-full border-2 rounded-xl p-3" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ville</label>
                      <input type="text" value={customerForm.city}
                        onChange={e => setCustomerForm({...customerForm, city: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">CP</label>
                      <input type="text" value={customerForm.postalCode}
                        onChange={e => setCustomerForm({...customerForm, postalCode: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Pays</label>
                      <select value={customerForm.country}
                        onChange={e => setCustomerForm({...customerForm, country: e.target.value})}
                        className="w-full border-2 rounded-xl p-3">
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold mb-3">🚲 Véhicule</h3>
                <div className="flex items-center gap-3">
                  {selectedFleet?.vehicle?.imageUrl && (
                    <img src={selectedFleet.vehicle.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-bold">{selectedFleet?.vehicleNumber}</p>
                    <p className="text-sm text-gray-600">{getName(selectedFleet?.vehicle?.name)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold mb-3">📅 Période</h3>
                <p>{bookingStartDate} {bookingStartTime} → {bookingEndDate} {bookingEndTime}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold mb-3">👤 Client</h3>
                {customerMode === 'search' && selectedCustomer ? (
                  <div>
                    <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.email} • {selectedCustomer.phone}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">{customerForm.firstName} {customerForm.lastName}</p>
                    <p className="text-sm text-gray-600">{customerForm.email} • {customerForm.phonePrefix}{customerForm.phone}</p>
                    <p className="text-xs text-green-600">Nouveau client - sera créé automatiquement</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <h3 className="font-bold mb-3">💰 Tarification</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span className="font-bold">{calculatedPrice.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Caution</span>
                    <span>{depositAmount.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total à payer</span>
                    <span className="text-green-600">{(calculatedPrice + depositAmount).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">
              ← Retour
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="px-8 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
              Continuer →
            </button>
          ) : (
            <button onClick={handleCreateBooking} disabled={loading}
              className="px-8 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
              {loading ? '⏳ Création...' : '✅ Créer la réservation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewBookingModal
