import { useState } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface FleetVehicle {
  id: string
  vehicleNumber: string
  status: string
  vehicle: { id: string; name: any; imageUrl?: string; category: { brand: string } }
  agency: { id: string; city: string }
}

interface Booking {
  id: string
  reference: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  status: string
  customer: { firstName: string; lastName: string }
  fleetVehicleId?: string
  checkedIn?: boolean
  checkedOut?: boolean
}

const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

// Couleurs alternées pour les réservations - une normale et une plus claire
const BOOKING_COLORS = {
  CONFIRMED: ['bg-blue-500', 'bg-blue-400'],
  PENDING: ['bg-yellow-500', 'bg-yellow-400'],
  CHECKED_IN: ['bg-green-600', 'bg-green-500'],
  CHECKED_OUT: ['bg-gray-400', 'bg-gray-300'],
  MAINTENANCE: ['bg-orange-500', 'bg-orange-400']
}

// ============== ADVANCED PLANNING ==============
export function AdvancedPlanning({
  fleet,
  bookings,
  days,
  selectedAgency,
  onBookingClick,
  onCellClick,
  onBookingUpdate,
  onCheckIn,
  onCheckOut
}: {
  fleet: FleetVehicle[]
  bookings: Booking[]
  days: Date[]
  selectedAgency: string
  onBookingClick: (b: Booking) => void
  onCellClick: (f: FleetVehicle, d: Date) => void
  onBookingUpdate: () => void
  onCheckIn: (b: Booking) => void
  onCheckOut: (b: Booking) => void
}) {
  const [tooltip, setTooltip] = useState<{ booking: Booking; x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ booking: Booking; x: number; y: number } | null>(null)

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const today = formatDate(new Date())

  // Trier les bookings par date de début pour pouvoir alterner les couleurs
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  // Pour chaque véhicule, tracker l'index de la dernière réservation pour alterner les couleurs
  const vehicleBookingIndex: Record<string, number> = {}

  const getBookingsForCell = (fleetId: string, date: Date) => {
    const dateStr = formatDate(date)
    return bookings.filter(b => {
      if (b.fleetVehicleId !== fleetId) return false
      const start = b.startDate.split('T')[0]
      const end = b.endDate.split('T')[0]
      return dateStr >= start && dateStr <= end
    })
  }

  const getBookingColor = (booking: Booking, fleetId: string): string => {
    // Déterminer le type de couleur
    let colorType: keyof typeof BOOKING_COLORS = 'CONFIRMED'
    if (booking.checkedOut) colorType = 'CHECKED_OUT'
    else if (booking.checkedIn) colorType = 'CHECKED_IN'
    else if (booking.status === 'PENDING') colorType = 'PENDING'
    
    // Calculer l'index pour ce véhicule
    const key = `${fleetId}-${booking.startDate}`
    if (vehicleBookingIndex[fleetId] === undefined) {
      vehicleBookingIndex[fleetId] = 0
    }
    
    // Trouver l'index de cette réservation parmi toutes les réservations de ce véhicule
    const vehicleBookings = sortedBookings.filter(b => b.fleetVehicleId === fleetId)
    const bookingIndex = vehicleBookings.findIndex(b => b.id === booking.id)
    
    // Alterner: index pair = couleur normale, index impair = couleur claire
    const colorIndex = bookingIndex % 2
    return BOOKING_COLORS[colorType][colorIndex]
  }

  const getBookingPosition = (booking: Booking, date: Date, cellIndex: number) => {
    const dateStr = formatDate(date)
    const start = booking.startDate.split('T')[0]
    const end = booking.endDate.split('T')[0]
    
    const isStart = dateStr === start
    const isEnd = dateStr === end
    
    // Vérifier si une autre réservation se termine juste avant ou commence juste après
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    return { isStart, isEnd }
  }

  const handleContextMenu = (e: React.MouseEvent, booking: Booking) => {
    e.preventDefault()
    setContextMenu({ booking, x: e.clientX, y: e.clientY })
  }

  const handleDoubleClick = (booking: Booking) => {
    if (!booking.checkedIn && booking.status === 'CONFIRMED' && booking.fleetVehicleId) {
      onCheckIn(booking)
    } else if (booking.checkedIn && !booking.checkedOut) {
      onCheckOut(booking)
    }
  }

  // Fermer le menu contextuel quand on clique ailleurs
  const handleClickOutside = () => {
    setContextMenu(null)
    setTooltip(null)
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden" onClick={handleClickOutside}>
      {/* Legend */}
      <div className="p-3 border-b flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500"></div> Confirmé</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500"></div> En attente</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-600"></div> Check-in fait</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-400"></div> Terminé</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500"></div> Maintenance</div>
      </div>
      
      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-medium w-48 z-10">Véhicule</th>
              {days.map((day, i) => {
                const dateStr = formatDate(day)
                const isToday = dateStr === today
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <th key={i} className={`px-1 py-2 text-center min-w-[80px] ${isToday ? 'bg-blue-100' : isWeekend ? 'bg-gray-100' : ''}`}>
                    <div className={`text-xs uppercase ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                      {day.getDate()}
                    </div>
                    {isToday && <div className="text-xs text-blue-600">Aujourd'hui</div>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {fleet.map(f => (
              <tr key={f.id} className="border-t hover:bg-gray-50">
                <td className="sticky left-0 bg-white px-4 py-2 z-10 border-r">
                  <div className="flex items-center gap-2">
                    {f.vehicle.imageUrl ? (
                      <img src={f.vehicle.imageUrl} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-lg">🚲</div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{f.vehicleNumber}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{getName(f.vehicle.name)}</p>
                      <span className={`text-xs px-1 py-0.5 rounded ${f.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {f.status === 'AVAILABLE' ? 'Disponible' : f.status}
                      </span>
                    </div>
                  </div>
                </td>
                {days.map((day, dayIndex) => {
                  const dateStr = formatDate(day)
                  const isToday = dateStr === today
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const cellBookings = getBookingsForCell(f.id, day)
                  
                  return (
                    <td 
                      key={dayIndex} 
                      className={`px-0.5 py-1 h-16 relative ${isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : ''}`}
                      onClick={() => cellBookings.length === 0 && onCellClick(f, day)}
                    >
                      {cellBookings.map(booking => {
                        const { isStart, isEnd } = getBookingPosition(booking, day, dayIndex)
                        const color = getBookingColor(booking, f.id)
                        
                        // Calculer les marges pour l'espacement entre réservations
                        const marginLeft = isStart ? '2px' : '0'
                        const marginRight = isEnd ? '2px' : '0'
                        
                        return (
                          <div
                            key={booking.id}
                            className={`absolute inset-y-1 ${color} text-white text-xs cursor-pointer overflow-hidden transition-all hover:brightness-110`}
                            style={{
                              left: marginLeft,
                              right: marginRight,
                              borderTopLeftRadius: isStart ? '6px' : '0',
                              borderBottomLeftRadius: isStart ? '6px' : '0',
                              borderTopRightRadius: isEnd ? '6px' : '0',
                              borderBottomRightRadius: isEnd ? '6px' : '0',
                            }}
                            onClick={(e) => { e.stopPropagation(); onBookingClick(booking) }}
                            onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(booking) }}
                            onContextMenu={(e) => handleContextMenu(e, booking)}
                            onMouseEnter={(e) => setTooltip({ booking, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {isStart && (
                              <div className="p-1 h-full flex flex-col justify-center">
                                <p className="font-medium truncate">{booking.startTime} {booking.customer.lastName}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Empty cell indicator */}
                      {cellBookings.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-gray-400 text-xl">+</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-sm max-w-xs pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          <p className="font-bold">{tooltip.booking.customer.firstName} {tooltip.booking.customer.lastName}</p>
          <p className="text-gray-300">{tooltip.booking.reference}</p>
          <p className="mt-1">
            {new Date(tooltip.booking.startDate).toLocaleDateString('fr-FR')} {tooltip.booking.startTime}
            {' → '}
            {new Date(tooltip.booking.endDate).toLocaleDateString('fr-FR')} {tooltip.booking.endTime}
          </p>
          <p className="mt-1 text-xs text-gray-400">Double-clic = Check-in/out rapide</p>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
            onClick={() => { onBookingClick(contextMenu.booking); setContextMenu(null) }}
          >
            👁️ Voir détails
          </button>
          {!contextMenu.booking.checkedIn && contextMenu.booking.status === 'CONFIRMED' && contextMenu.booking.fleetVehicleId && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-green-600"
              onClick={() => { onCheckIn(contextMenu.booking); setContextMenu(null) }}
            >
              ✅ Check-in
            </button>
          )}
          {contextMenu.booking.checkedIn && !contextMenu.booking.checkedOut && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-orange-600"
              onClick={() => { onCheckOut(contextMenu.booking); setContextMenu(null) }}
            >
              🏁 Check-out
            </button>
          )}
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-red-600"
            onClick={() => { setContextMenu(null) }}
          >
            ❌ Annuler réservation
          </button>
        </div>
      )}
    </div>
  )
}

// ============== CHECK-IN MODAL ==============
export function CheckInModal({
  booking,
  fleetVehicle,
  onClose,
  onComplete
}: {
  booking: any
  fleetVehicle: any
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState<'vehicle' | 'inspection' | 'signature' | 'payment'>('vehicle')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    mileage: fleetVehicle?.currentMileage || 0,
    fuelLevel: 'FULL',
    condition: 'GOOD',
    notes: '',
    depositPaid: false,
    paymentMethod: 'CARD'
  })

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Créer le contrat
      await fetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          fleetVehicleId: fleetVehicle?.id,
          agencyId: booking.agency.id,
          customerId: booking.customer.id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalAmount: booking.totalPrice,
          depositAmount: booking.depositAmount,
          startMileage: form.mileage,
          startFuelLevel: form.fuelLevel,
          startCondition: form.condition,
          notes: form.notes,
          depositPaid: form.depositPaid,
          paymentMethod: form.paymentMethod
        })
      })
      
      // Mettre à jour le booking
      await fetch(`${API_URL}/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn: true })
      })
      
      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors du check-in')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">✅ Check-in</h2>
          <p className="text-gray-500">{booking.reference} - {booking.customer.firstName} {booking.customer.lastName}</p>
        </div>
        
        {/* Progress */}
        <div className="flex border-b">
          {['vehicle', 'inspection', 'signature', 'payment'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-2 text-center text-xs font-medium ${
                step === s ? 'bg-green-50 text-green-600 border-b-2 border-green-500' :
                ['vehicle', 'inspection', 'signature', 'payment'].indexOf(step) > i ? 'text-green-600 bg-green-50' : 'text-gray-400'
              }`}
            >
              {i + 1}. {s === 'vehicle' ? 'Véhicule' : s === 'inspection' ? 'Inspection' : s === 'signature' ? 'Signature' : 'Paiement'}
            </div>
          ))}
        </div>
        
        <div className="p-6">
          {step === 'vehicle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {fleetVehicle?.vehicle?.imageUrl && (
                  <img src={fleetVehicle.vehicle.imageUrl} className="w-20 h-20 rounded object-cover" />
                )}
                <div>
                  <p className="font-bold text-lg">{fleetVehicle?.vehicleNumber}</p>
                  <p className="text-gray-600">{getName(fleetVehicle?.vehicle?.name)}</p>
                  <p className="text-sm text-gray-500">Kilométrage actuel: {fleetVehicle?.currentMileage} km</p>
                </div>
              </div>
            </div>
          )}
          
          {step === 'inspection' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kilométrage au départ</label>
                <input type="number" value={form.mileage} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Niveau de carburant</label>
                <select value={form.fuelLevel} onChange={e => setForm({...form, fuelLevel: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="FULL">Plein</option>
                  <option value="THREE_QUARTERS">3/4</option>
                  <option value="HALF">1/2</option>
                  <option value="QUARTER">1/4</option>
                  <option value="EMPTY">Vide</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">État général</label>
                <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Bon</option>
                  <option value="FAIR">Moyen</option>
                  <option value="POOR">Mauvais</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Remarques sur l'état du véhicule..." />
              </div>
            </div>
          )}
          
          {step === 'signature' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg h-40 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400">Zone de signature (à implémenter)</p>
              </div>
              <p className="text-sm text-gray-500">Le client doit signer pour accepter les conditions de location.</p>
            </div>
          )}
          
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Caution</span>
                  <span className="font-bold">{booking.depositAmount}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total à encaisser</span>
                  <span className="text-blue-600">{booking.totalPrice}€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mode de paiement</label>
                <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="CARD">Carte bancaire</option>
                  <option value="CASH">Espèces</option>
                  <option value="TRANSFER">Virement</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.depositPaid} onChange={e => setForm({...form, depositPaid: e.target.checked})} />
                <span>Caution encaissée</span>
              </label>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t flex gap-3">
          {step !== 'vehicle' && (
            <button onClick={() => {
              if (step === 'inspection') setStep('vehicle')
              else if (step === 'signature') setStep('inspection')
              else if (step === 'payment') setStep('signature')
            }} className="px-4 py-2 bg-gray-200 rounded-lg">← Retour</button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          {step !== 'payment' ? (
            <button onClick={() => {
              if (step === 'vehicle') setStep('inspection')
              else if (step === 'inspection') setStep('signature')
              else if (step === 'signature') setStep('payment')
            }} className="px-6 py-2 bg-green-500 text-white rounded-lg">Continuer →</button>
          ) : (
            <button onClick={handleComplete} disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Validation...' : '✅ Valider le check-in'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============== CHECK-OUT MODAL ==============
export function CheckOutModal({
  booking,
  fleetVehicle,
  onClose,
  onComplete
}: {
  booking: any
  fleetVehicle: any
  onClose: () => void
  onComplete: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    endMileage: fleetVehicle?.currentMileage || 0,
    fuelLevel: 'FULL',
    condition: 'GOOD',
    hasDamage: false,
    damageDescription: '',
    deductionAmount: 0,
    notes: ''
  })

  const refundAmount = Math.max(0, booking.depositAmount - form.deductionAmount)

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Mettre à jour le contrat
      const contractRes = await fetch(`${API_URL}/api/contracts/by-booking/${booking.id}`)
      if (contractRes.ok) {
        const contract = await contractRes.json()
        await fetch(`${API_URL}/api/contracts/${contract.id}/checkout`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endMileage: form.endMileage,
            endFuelLevel: form.fuelLevel,
            endCondition: form.condition,
            damageDescription: form.hasDamage ? form.damageDescription : null,
            deductionAmount: form.deductionAmount,
            notes: form.notes
          })
        })
      }
      
      // Mettre à jour le booking
      await fetch(`${API_URL}/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedOut: true })
      })
      
      // Mettre à jour le véhicule
      if (fleetVehicle) {
        await fetch(`${API_URL}/api/fleet/${fleetVehicle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentMileage: form.endMileage,
            status: 'AVAILABLE',
            condition: form.condition
          })
        })
      }
      
      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors du check-out')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">🏁 Check-out</h2>
          <p className="text-gray-500">{booking.reference} - {booking.customer.firstName} {booking.customer.lastName}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage final</label>
              <input type="number" value={form.endMileage} onChange={e => setForm({...form, endMileage: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Niveau carburant</label>
              <select value={form.fuelLevel} onChange={e => setForm({...form, fuelLevel: e.target.value})}
                className="w-full border rounded-lg px-3 py-2">
                <option value="FULL">Plein</option>
                <option value="THREE_QUARTERS">3/4</option>
                <option value="HALF">1/2</option>
                <option value="QUARTER">1/4</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">État général</label>
            <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
              className="w-full border rounded-lg px-3 py-2">
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Bon</option>
              <option value="FAIR">Moyen</option>
              <option value="POOR">Mauvais</option>
            </select>
          </div>
          
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.hasDamage} onChange={e => setForm({...form, hasDamage: e.target.checked})} />
            <span className="font-medium text-red-600">Dégâts constatés</span>
          </label>
          
          {form.hasDamage && (
            <div className="space-y-3 p-4 bg-red-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Description des dégâts</label>
                <textarea value={form.damageDescription} onChange={e => setForm({...form, damageDescription: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Montant à déduire (€)</label>
                <input type="number" value={form.deductionAmount} onChange={e => setForm({...form, deductionAmount: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded-lg px-3 py-2" max={booking.depositAmount} />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full border rounded-lg px-3 py-2" rows={2} />
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Caution initiale</span>
              <span>{booking.depositAmount}€</span>
            </div>
            {form.deductionAmount > 0 && (
              <div className="flex justify-between mb-2 text-red-600">
                <span>Déduction dégâts</span>
                <span>-{form.deductionAmount}€</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>À rembourser</span>
              <span className="text-green-600">{refundAmount}€</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleComplete} disabled={loading}
            className="flex-1 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Validation...' : '🏁 Valider le check-out'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default { AdvancedPlanning, CheckInModal, CheckOutModal }
