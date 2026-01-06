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

// Couleurs alternées pour les réservations
const BOOKING_COLORS = {
  CONFIRMED: ['bg-blue-500', 'bg-blue-400'],
  PENDING: ['bg-yellow-500', 'bg-yellow-400'],
  CHECKED_IN: ['bg-green-600', 'bg-green-500'],
  CHECKED_OUT: ['bg-gray-400', 'bg-gray-300'],
  MAINTENANCE: ['bg-orange-500', 'bg-orange-400']
}

// ============== ADVANCED PLANNING WITH DRAG & DROP ==============
export function AdvancedPlanning({
  fleet,
  bookings,
  days,
  selectedAgency,
  onBookingClick,
  onCellClick,
  onBookingUpdate,
  onCheckIn,
  onCheckOut,
  onExtend
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
  onExtend?: (b: Booking) => void
}) {
  const [tooltip, setTooltip] = useState<{ booking: Booking; x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ booking: Booking; x: number; y: number } | null>(null)
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null)
  const [dropTarget, setDropTarget] = useState<{ fleetId: string; date: string } | null>(null)

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const today = formatDate(new Date())

  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

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
    let colorType: keyof typeof BOOKING_COLORS = 'CONFIRMED'
    if (booking.checkedOut) colorType = 'CHECKED_OUT'
    else if (booking.checkedIn) colorType = 'CHECKED_IN'
    else if (booking.status === 'PENDING') colorType = 'PENDING'
    
    const vehicleBookings = sortedBookings.filter(b => b.fleetVehicleId === fleetId)
    const bookingIndex = vehicleBookings.findIndex(b => b.id === booking.id)
    const colorIndex = bookingIndex % 2
    return BOOKING_COLORS[colorType][colorIndex]
  }

  const getBookingPosition = (booking: Booking, date: Date) => {
    const dateStr = formatDate(date)
    const start = booking.startDate.split('T')[0]
    const end = booking.endDate.split('T')[0]
    return { isStart: dateStr === start, isEnd: dateStr === end }
  }

  // ========== DRAG & DROP HANDLERS ==========
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    // Ne pas permettre le drag si check-in fait ou terminé
    if (booking.checkedIn || booking.checkedOut) {
      e.preventDefault()
      return
    }
    setDraggedBooking(booking)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', booking.id)
  }

  const handleDragOver = (e: React.DragEvent, fleetId: string, date: Date) => {
    e.preventDefault()
    if (!draggedBooking) return
    
    const dateStr = formatDate(date)
    setDropTarget({ fleetId, date: dateStr })
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFleet: FleetVehicle, targetDate: Date) => {
    e.preventDefault()
    if (!draggedBooking) return

    const targetDateStr = formatDate(targetDate)
    const originalStartDate = draggedBooking.startDate.split('T')[0]
    const originalEndDate = draggedBooking.endDate.split('T')[0]
    
    // Calculer le décalage de jours
    const daysDiff = Math.floor((targetDate.getTime() - new Date(originalStartDate).getTime()) / (1000 * 60 * 60 * 24))
    
    // Nouvelles dates
    const newStartDate = new Date(originalStartDate)
    newStartDate.setDate(newStartDate.getDate() + daysDiff)
    const newEndDate = new Date(originalEndDate)
    newEndDate.setDate(newEndDate.getDate() + daysDiff)

    // Vérifier si le véhicule cible est compatible (même type de véhicule)
    const originalFleet = fleet.find(f => f.id === draggedBooking.fleetVehicleId)
    if (originalFleet && targetFleet.vehicle.id !== originalFleet.vehicle.id) {
      alert('⚠️ Attention: Les véhicules sont de types différents. Voulez-vous vraiment déplacer cette réservation ?')
    }

    // Vérifier les conflits
    const conflictingBookings = bookings.filter(b => {
      if (b.id === draggedBooking.id) return false
      if (b.fleetVehicleId !== targetFleet.id) return false
      const bStart = new Date(b.startDate)
      const bEnd = new Date(b.endDate)
      return newStartDate <= bEnd && newEndDate >= bStart
    })

    if (conflictingBookings.length > 0) {
      alert('❌ Conflit: Il y a déjà une réservation sur ce véhicule pour ces dates.')
      setDraggedBooking(null)
      setDropTarget(null)
      return
    }

    // Mettre à jour la réservation
    try {
      const res = await fetch(API_URL + '/api/bookings/' + draggedBooking.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fleetVehicleId: targetFleet.id,
          startDate: newStartDate.toISOString().split('T')[0],
          endDate: newEndDate.toISOString().split('T')[0]
        })
      })

      if (res.ok) {
        onBookingUpdate()
      } else {
        alert('Erreur lors du déplacement de la réservation')
      }
    } catch (error) {
      console.error('Error moving booking:', error)
      alert('Erreur réseau')
    }

    setDraggedBooking(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedBooking(null)
    setDropTarget(null)
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
        <div className="ml-auto text-gray-500 text-xs">💡 Glissez-déposez les réservations pour les déplacer</div>
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
                  <th key={i} className={'px-1 py-2 text-center min-w-[80px] ' + (isToday ? 'bg-blue-100' : isWeekend ? 'bg-gray-100' : '')}>
                    <div className={'text-xs uppercase ' + (isToday ? 'text-blue-600 font-bold' : 'text-gray-500')}>
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div className={'text-lg ' + (isToday ? 'text-blue-600 font-bold' : '')}>
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
                      <span className={'text-xs px-1 py-0.5 rounded ' + (f.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
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
                  const isDropTarget = dropTarget?.fleetId === f.id && dropTarget?.date === dateStr
                  
                  return (
                    <td 
                      key={dayIndex} 
                      className={'px-0.5 py-1 h-16 relative transition-colors ' + 
                        (isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : '') +
                        (isDropTarget ? ' ring-2 ring-blue-500 ring-inset bg-blue-100' : '')}
                      onClick={() => cellBookings.length === 0 && onCellClick(f, day)}
                      onDragOver={(e) => handleDragOver(e, f.id, day)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, f, day)}
                    >
                      {cellBookings.map(booking => {
                        const { isStart, isEnd } = getBookingPosition(booking, day)
                        const color = getBookingColor(booking, f.id)
                        const isDragging = draggedBooking?.id === booking.id
                        const canDrag = !booking.checkedIn && !booking.checkedOut
                        
                        return (
                          <div
                            key={booking.id}
                            draggable={canDrag}
                            onDragStart={(e) => handleDragStart(e, booking)}
                            onDragEnd={handleDragEnd}
                            className={'absolute inset-y-1 text-white text-xs overflow-hidden transition-all ' + color +
                              (isDragging ? ' opacity-50 scale-95' : ' hover:brightness-110') +
                              (canDrag ? ' cursor-grab active:cursor-grabbing' : ' cursor-not-allowed')}
                            style={{
                              left: isStart ? '4px' : '0',
                              right: isEnd ? '4px' : '0',
                              borderTopLeftRadius: isStart ? '6px' : '0',
                              borderBottomLeftRadius: isStart ? '6px' : '0',
                              borderTopRightRadius: isEnd ? '6px' : '0',
                              borderBottomRightRadius: isEnd ? '6px' : '0',
                            }}
                            onClick={(e) => { e.stopPropagation(); onBookingClick(booking) }}
                            onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(booking) }}
                            onContextMenu={(e) => handleContextMenu(e, booking)}
                            onMouseEnter={(e) => !isDragging && setTooltip({ booking, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {isStart && (
                              <div className="p-1 h-full flex flex-col justify-center">
                                <p className="font-medium truncate">{booking.startTime} {booking.customer.lastName}</p>
                              </div>
                            )}
                            {isEnd && (
                              <div className="absolute right-1 top-1 flex items-center gap-1">
                                <span className="text-xs opacity-75">{booking.endTime}</span>
                                {booking.checkedIn && !booking.checkedOut && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onExtend && onExtend(booking) }} 
                                    className="w-5 h-5 bg-white/90 text-blue-600 rounded-full text-xs font-bold hover:bg-white flex items-center justify-center shadow"
                                  >+</button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Empty cell indicator */}
                      {cellBookings.length === 0 && !isDropTarget && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-gray-400 text-xl">+</span>
                        </div>
                      )}
                      
                      {/* Drop indicator */}
                      {isDropTarget && cellBookings.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-blue-500 text-xl font-bold">↓</span>
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
      {tooltip && !draggedBooking && (
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
          <p className="mt-2 text-xs text-gray-400">
            {tooltip.booking.checkedIn ? '🔒 Check-in fait' : '✋ Glissez pour déplacer'}
          </p>
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
export function CheckInModal({ booking, fleetVehicle, onClose, onComplete }: {
  booking: any; fleetVehicle: any; onClose: () => void; onComplete: () => void
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
      await fetch(API_URL + '/api/contracts', {
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
      
      await fetch(API_URL + '/api/bookings/' + booking.id, {
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
        
        <div className="flex border-b">
          {['vehicle', 'inspection', 'signature', 'payment'].map((s, i) => (
            <div key={s} className={'flex-1 py-2 text-center text-xs font-medium ' +
              (step === s ? 'bg-green-50 text-green-600 border-b-2 border-green-500' :
              ['vehicle', 'inspection', 'signature', 'payment'].indexOf(step) > i ? 'text-green-600 bg-green-50' : 'text-gray-400')}>
              {i + 1}. {s === 'vehicle' ? 'Véhicule' : s === 'inspection' ? 'Inspection' : s === 'signature' ? 'Signature' : 'Paiement'}
            </div>
          ))}
        </div>
        
        <div className="p-6">
          {step === 'vehicle' && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              {fleetVehicle?.vehicle?.imageUrl && <img src={fleetVehicle.vehicle.imageUrl} className="w-20 h-20 rounded object-cover" />}
              <div>
                <p className="font-bold text-lg">{fleetVehicle?.vehicleNumber}</p>
                <p className="text-gray-600">{getName(fleetVehicle?.vehicle?.name)}</p>
                <p className="text-sm text-gray-500">Kilométrage: {fleetVehicle?.currentMileage} km</p>
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
                <select value={form.fuelLevel} onChange={e => setForm({...form, fuelLevel: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="FULL">Plein</option>
                  <option value="THREE_QUARTERS">3/4</option>
                  <option value="HALF">1/2</option>
                  <option value="QUARTER">1/4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">État général</label>
                <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Bon</option>
                  <option value="FAIR">Moyen</option>
                  <option value="POOR">Mauvais</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
              </div>
            </div>
          )}
          
          {step === 'signature' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg h-40 flex items-center justify-center bg-gray-50">
                <p className="text-gray-400">Zone de signature</p>
              </div>
              <p className="text-sm text-gray-500">Le client doit signer pour accepter les conditions.</p>
            </div>
          )}
          
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between mb-2"><span>Caution</span><span className="font-bold">{booking.depositAmount}€</span></div>
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-blue-600">{booking.totalPrice}€</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mode de paiement</label>
                <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} className="w-full border rounded-lg px-3 py-2">
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
            <button onClick={handleComplete} disabled={loading} className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Validation...' : '✅ Valider'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============== CHECK-OUT MODAL ==============
export function CheckOutModal({ booking, fleetVehicle, onClose, onComplete }: {
  booking: any; fleetVehicle: any; onClose: () => void; onComplete: () => void
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
      const contractRes = await fetch(API_URL + '/api/contracts/by-booking/' + booking.id)
      if (contractRes.ok) {
        const contract = await contractRes.json()
        await fetch(API_URL + '/api/contracts/' + contract.id + '/checkout', {
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
      
      await fetch(API_URL + '/api/bookings/' + booking.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedOut: true })
      })
      
      if (fleetVehicle) {
        await fetch(API_URL + '/api/fleet/' + fleetVehicle.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentMileage: form.endMileage, status: 'AVAILABLE', condition: form.condition })
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
              <select value={form.fuelLevel} onChange={e => setForm({...form, fuelLevel: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="FULL">Plein</option>
                <option value="THREE_QUARTERS">3/4</option>
                <option value="HALF">1/2</option>
                <option value="QUARTER">1/4</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">État général</label>
            <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full border rounded-lg px-3 py-2">
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
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} />
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex justify-between mb-2"><span>Caution initiale</span><span>{booking.depositAmount}€</span></div>
            {form.deductionAmount > 0 && (
              <div className="flex justify-between mb-2 text-red-600"><span>Déduction</span><span>-{form.deductionAmount}€</span></div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>À rembourser</span><span className="text-green-600">{refundAmount}€</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleComplete} disabled={loading} className="flex-1 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Validation...' : '🏁 Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default { AdvancedPlanning, CheckInModal, CheckOutModal }

// ============== EXTEND BOOKING MODAL ==============
export function ExtendBookingModal({ booking, fleetVehicle, onClose, onComplete }: {
  booking: any; fleetVehicle: any; onClose: () => void; onComplete: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [newEndDate, setNewEndDate] = useState(booking.endDate.split('T')[0])
  const [newEndTime, setNewEndTime] = useState(booking.endTime || '10:00')
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE_LINK' | 'ON_RETURN' | 'IMMEDIATE'>('IMMEDIATE')
  const [extraPrice, setExtraPrice] = useState(0)
  const [sendEmail, setSendEmail] = useState(true)

  const originalEndDate = booking.endDate.split('T')[0]
  
  // Calculer les jours supplémentaires et le prix
  const calculateExtra = () => {
    const originalEnd = new Date(originalEndDate + 'T' + booking.endTime)
    const newEnd = new Date(newEndDate + 'T' + newEndTime)
    const diffMs = newEnd.getTime() - originalEnd.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours <= 0) return { days: 0, hours: 0, price: 0 }
    
    const fullDays = Math.floor(diffHours / 24)
    const remainingHours = diffHours % 24
    const extraHours = remainingHours > 4 ? 0 : Math.ceil(remainingHours)
    const totalDays = remainingHours > 4 ? fullDays + 1 : fullDays
    
    // Récupérer le pricing du véhicule
    const pricing = fleetVehicle?.vehicle?.pricing?.[0]
    if (!pricing) return { days: totalDays, hours: extraHours, price: 0 }
    
    let price = 0
    // Pour la prolongation, on utilise le tarif journalier moyen
    const avgDailyRate = pricing.day7 ? pricing.day7 / 7 : pricing.day1
    price = totalDays * avgDailyRate
    
    // Ajouter les heures sup
    if (extraHours > 0 && extraHours <= 4) {
      price += pricing['extraHour' + extraHours] || 0
    }
    
    return { days: totalDays, hours: extraHours, price: Math.round(price) }
  }
  
  const extra = calculateExtra()
  
  const handleExtend = async () => {
    if (extra.days === 0 && extra.hours === 0) {
      alert('Veuillez sélectionner une date de fin ultérieure')
      return
    }
    
    setLoading(true)
    try {
      // 1. Mettre à jour la réservation
      const updateRes = await fetch(API_URL + '/api/bookings/' + booking.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endDate: newEndDate,
          endTime: newEndTime,
          totalPrice: booking.totalPrice + extra.price,
          extensionAmount: extra.price,
          extensionPaymentMethod: paymentMethod,
          extensionPaid: paymentMethod === 'IMMEDIATE'
        })
      })
      
      if (!updateRes.ok) throw new Error('Failed to update booking')
      
      // 2. Créer l'avenant au contrat
      await fetch(API_URL + '/api/contracts/amendment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          originalEndDate: originalEndDate,
          originalEndTime: booking.endTime,
          newEndDate: newEndDate,
          newEndTime: newEndTime,
          extraDays: extra.days,
          extraHours: extra.hours,
          extraAmount: extra.price,
          paymentMethod: paymentMethod,
          sendToCustomer: sendEmail
        })
      })
      
      // 3. Si paiement Stripe, créer le lien de paiement
      if (paymentMethod === 'STRIPE_LINK') {
        const stripeRes = await fetch(API_URL + '/api/payments/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: booking.id,
            amount: extra.price,
            description: 'Prolongation de location - ' + booking.reference,
            customerEmail: booking.customer.email,
            sendEmail: sendEmail
          })
        })
        
        if (stripeRes.ok) {
          const { paymentUrl } = await stripeRes.json()
          if (!sendEmail) {
            // Copier le lien dans le presse-papier
            navigator.clipboard.writeText(paymentUrl)
            alert('Lien de paiement copié dans le presse-papier !\n\n' + paymentUrl)
          }
        }
      }
      
      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la prolongation')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">📅 Prolonger la réservation</h2>
          <p className="text-gray-500">{booking.reference} - {booking.customer.firstName} {booking.customer.lastName}</p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Dates actuelles */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Période actuelle</p>
            <p className="font-medium">
              {new Date(booking.startDate).toLocaleDateString('fr-FR')} {booking.startTime}
              {' → '}
              {new Date(originalEndDate).toLocaleDateString('fr-FR')} {booking.endTime}
            </p>
          </div>
          
          {/* Nouvelle date de fin */}
          <div>
            <label className="block text-sm font-medium mb-2">Nouvelle date de fin</label>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                min={originalEndDate} className="w-full border rounded-lg px-3 py-2" />
              <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          
          {/* Calcul du supplément */}
          {(extra.days > 0 || extra.hours > 0) && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Supplément calculé :</p>
              <div className="flex justify-between mb-1">
                <span>Durée supplémentaire</span>
                <span className="font-medium">
                  {extra.days > 0 && extra.days + ' jour' + (extra.days > 1 ? 's' : '')}
                  {extra.days > 0 && extra.hours > 0 && ' + '}
                  {extra.hours > 0 && extra.hours + 'h sup'}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span>Montant à payer</span>
                <span className="text-blue-600">{extra.price}€</span>
              </div>
            </div>
          )}
          
          {/* Mode de paiement */}
          <div>
            <label className="block text-sm font-medium mb-2">Mode de paiement</label>
            <div className="space-y-2">
              <label className={'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' + (paymentMethod === 'IMMEDIATE' ? 'border-blue-500 bg-blue-50' : '')}>
                <input type="radio" name="payment" checked={paymentMethod === 'IMMEDIATE'} onChange={() => setPaymentMethod('IMMEDIATE')} />
                <div>
                  <p className="font-medium">💳 Paiement immédiat</p>
                  <p className="text-sm text-gray-500">Le client paie maintenant en agence</p>
                </div>
              </label>
              
              <label className={'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' + (paymentMethod === 'STRIPE_LINK' ? 'border-blue-500 bg-blue-50' : '')}>
                <input type="radio" name="payment" checked={paymentMethod === 'STRIPE_LINK'} onChange={() => setPaymentMethod('STRIPE_LINK')} />
                <div>
                  <p className="font-medium">🔗 Lien de paiement Stripe</p>
                  <p className="text-sm text-gray-500">Envoyer un lien de paiement par email</p>
                </div>
              </label>
              
              <label className={'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' + (paymentMethod === 'ON_RETURN' ? 'border-blue-500 bg-blue-50' : '')}>
                <input type="radio" name="payment" checked={paymentMethod === 'ON_RETURN'} onChange={() => setPaymentMethod('ON_RETURN')} />
                <div>
                  <p className="font-medium">🏁 Paiement au retour</p>
                  <p className="text-sm text-gray-500">Le client paiera lors du check-out</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Options d'envoi */}
          {paymentMethod === 'STRIPE_LINK' && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
              <span>Envoyer automatiquement par email au client</span>
            </label>
          )}
          
          {/* Avenant */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              📄 Un avenant au contrat sera automatiquement généré et envoyé au client.
            </p>
          </div>
        </div>
        
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleExtend} disabled={loading || (extra.days === 0 && extra.hours === 0)}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Traitement...' : '✅ Prolonger la réservation'}
          </button>
        </div>
      </div>
    </div>
  )
}
