import { useState, useRef, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

// Types
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
  totalPrice: number
  status: string
  customer: { firstName: string; lastName: string; email: string; phone: string }
  items: { vehicle: { id: string; name: any } }[]
  fleetVehicleId?: string
  checkedIn?: boolean
  checkedOut?: boolean
}

interface PlanningProps {
  fleet: FleetVehicle[]
  bookings: Booking[]
  days: Date[]
  selectedAgency: string
  onBookingClick: (booking: Booking) => void
  onCellClick: (fleetVehicle: FleetVehicle, date: Date) => void
  onBookingUpdate: () => void
  onCheckIn: (booking: Booking) => void
  onCheckOut: (booking: Booking) => void
}

const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''
const formatDate = (d: Date) => d.toISOString().split('T')[0]

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  RESERVED: 'bg-yellow-500',
  RENTED: 'bg-blue-500',
  MAINTENANCE: 'bg-orange-500',
  OUT_OF_SERVICE: 'bg-red-500'
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  RENTED: 'En location',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Hors service'
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
}: PlanningProps) {
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null)
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [dropTarget, setDropTarget] = useState<{ fleetId: string; dayIndex: number } | null>(null)
  const [hasConflict, setHasConflict] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ booking: Booking; x: number; y: number } | null>(null)
  const planningRef = useRef<HTMLDivElement>(null)

  // Get bookings for a fleet vehicle
  const getBookingsForFleet = (fleetVehicle: FleetVehicle) => {
    const firstDay = formatDate(days[0])
    const lastDay = formatDate(days[days.length - 1])
    
    return bookings.filter(b => {
      if (selectedAgency !== 'all' && !fleet.find(f => f.id === b.fleetVehicleId && f.agency.id === selectedAgency)) return false
      const start = b.startDate.split('T')[0]
      const end = b.endDate.split('T')[0]
      
      if (b.fleetVehicleId === fleetVehicle.id) {
        return start <= lastDay && end >= firstDay
      }
      
      if (!b.fleetVehicleId && fleet.find(f => f.id === fleetVehicle.id)?.agency.id === selectedAgency) {
        const hasVehicleType = b.items.some(item => item.vehicle.id === fleetVehicle.vehicle.id)
        return hasVehicleType && start <= lastDay && end >= firstDay
      }
      
      return false
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }

  // Calculate booking position and style
  const getBookingStyle = (booking: Booking, allBookings: Booking[]) => {
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    
    const effectiveStart = startDate < firstDay ? firstDay : startDate
    const effectiveEnd = endDate > lastDay ? lastDay : endDate
    
    const startIndex = days.findIndex(d => formatDate(d) === formatDate(effectiveStart))
    const endIndex = days.findIndex(d => formatDate(d) === formatDate(effectiveEnd))
    
    if (startIndex === -1 || endIndex === -1) return null
    
    const left = startIndex * (100 / days.length)
    const width = ((endIndex - startIndex + 1) * (100 / days.length))
    
    // Determine if this booking is at the start/end of visible range
    const isStartVisible = startDate >= firstDay
    const isEndVisible = endDate <= lastDay
    
    // Check if there's a booking immediately before or after
    const bookingIndex = allBookings.findIndex(b => b.id === booking.id)
    const prevBooking = bookingIndex > 0 ? allBookings[bookingIndex - 1] : null
    const nextBooking = bookingIndex < allBookings.length - 1 ? allBookings[bookingIndex + 1] : null
    
    const prevEnd = prevBooking ? new Date(prevBooking.endDate) : null
    const nextStart = nextBooking ? new Date(nextBooking.startDate) : null
    
    const isConnectedToPrev = prevEnd && formatDate(prevEnd) === formatDate(new Date(startDate.getTime() - 86400000))
    const isConnectedToNext = nextStart && formatDate(nextStart) === formatDate(new Date(endDate.getTime() + 86400000))
    
    // Determine border radius
    let borderRadius = ''
    if (isStartVisible && !isConnectedToPrev) {
      borderRadius += 'rounded-l-lg '
    }
    if (isEndVisible && !isConnectedToNext) {
      borderRadius += 'rounded-r-lg '
    }
    
    return { left: `${left}%`, width: `${width}%`, borderRadius: borderRadius.trim() }
  }

  // Get booking color based on status
  const getBookingColor = (booking: Booking) => {
    if (booking.checkedOut) return 'bg-gray-400' // Terminé
    if (booking.checkedIn) return 'bg-green-600' // En cours (client parti)
    if (booking.status === 'CONFIRMED') return 'bg-blue-500' // Confirmé
    if (booking.status === 'PENDING') return 'bg-yellow-500' // En attente
    return 'bg-gray-300'
  }

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, booking: Booking, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedBooking(booking)
    setDragType(type)
    setDragStartPos({ x: e.clientX, y: e.clientY })
  }

  // Handle drag over cell
  const handleDragOver = (fleetId: string, dayIndex: number) => {
    if (!draggedBooking) return
    
    setDropTarget({ fleetId, dayIndex })
    
    // Check for conflicts
    const targetFleet = fleet.find(f => f.id === fleetId)
    if (!targetFleet) return
    
    const existingBookings = getBookingsForFleet(targetFleet)
    const targetDate = days[dayIndex]
    
    const conflict = existingBookings.some(b => {
      if (b.id === draggedBooking.id) return false
      const start = new Date(b.startDate)
      const end = new Date(b.endDate)
      return targetDate >= start && targetDate <= end
    })
    
    setHasConflict(conflict)
  }

  // Handle drop
  const handleDrop = async () => {
    if (!draggedBooking || !dropTarget || hasConflict) {
      resetDrag()
      return
    }
    
    const newDate = days[dropTarget.dayIndex]
    const originalStart = new Date(draggedBooking.startDate)
    const originalEnd = new Date(draggedBooking.endDate)
    const duration = Math.ceil((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24))
    
    let newStartDate: Date
    let newEndDate: Date
    
    if (dragType === 'move') {
      newStartDate = newDate
      newEndDate = new Date(newDate.getTime() + duration * 86400000)
    } else if (dragType === 'resize-start') {
      newStartDate = newDate
      newEndDate = originalEnd
    } else {
      newStartDate = originalStart
      newEndDate = newDate
    }
    
    // Update booking via API
    try {
      const updates: any = {}
      
      if (dragType === 'move' && dropTarget.fleetId !== draggedBooking.fleetVehicleId) {
        updates.fleetVehicleId = dropTarget.fleetId
      }
      
      if (formatDate(newStartDate) !== formatDate(originalStart)) {
        updates.startDate = newStartDate.toISOString()
      }
      
      if (formatDate(newEndDate) !== formatDate(originalEnd)) {
        updates.endDate = newEndDate.toISOString()
      }
      
      if (Object.keys(updates).length > 0) {
        // Note: You'll need to add this endpoint to the API
        await fetch(`${API_URL}/api/bookings/${draggedBooking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        onBookingUpdate()
      }
    } catch (e) {
      console.error('Failed to update booking:', e)
    }
    
    resetDrag()
  }

  // Reset drag state
  const resetDrag = () => {
    setDraggedBooking(null)
    setDragType(null)
    setDragStartPos(null)
    setDropTarget(null)
    setHasConflict(false)
  }

  // Handle double click for quick check-in
  const handleDoubleClick = (booking: Booking) => {
    if (!booking.checkedIn && booking.status === 'CONFIRMED') {
      onCheckIn(booking)
    } else if (booking.checkedIn && !booking.checkedOut) {
      onCheckOut(booking)
    }
  }

  // Handle right click for context menu
  const handleContextMenu = (e: React.MouseEvent, booking: Booking) => {
    e.preventDefault()
    setContextMenu({ booking, x: e.clientX, y: e.clientY })
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Handle mouse up (drop)
  useEffect(() => {
    const handleMouseUp = () => {
      if (draggedBooking) handleDrop()
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [draggedBooking, dropTarget, hasConflict])

  const formatDateShort = (d: Date) => {
    const daysArr = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
    return { day: daysArr[d.getDay()], num: d.getDate() }
  }

  const filteredFleet = fleet.filter(f => {
    if (selectedAgency !== 'all' && f.agency.id !== selectedAgency) return false
    return true
  })

  return (
    <div ref={planningRef} className="relative">
      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div><span className="text-sm">Confirmé</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div><span className="text-sm">En attente</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-600 rounded"></div><span className="text-sm">Check-in fait</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-400 rounded"></div><span className="text-sm">Terminé</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div><span className="text-sm">Maintenance</span></div>
      </div>
      
      {/* Planning Grid */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: '200px repeat(10, 1fr)' }}>
          <div className="p-3 bg-gray-50 border-b border-r font-bold">Véhicule</div>
          {days.map((day, i) => {
            const { day: d, num } = formatDateShort(day)
            const isToday = formatDate(day) === formatDate(new Date())
            return (
              <div key={i} className={`p-2 text-center border-b ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-50'}`}>
                <p className="text-xs">{d}</p>
                <p className="text-lg font-bold">{num}</p>
                {isToday && <p className="text-xs">Aujourd'hui</p>}
              </div>
            )
          })}
        </div>
        
        {/* Rows */}
        {filteredFleet.map(fleetVehicle => {
          const fleetBookings = getBookingsForFleet(fleetVehicle)
          const isUnavailable = fleetVehicle.status === 'MAINTENANCE' || fleetVehicle.status === 'OUT_OF_SERVICE'
          
          return (
            <div key={fleetVehicle.id} className="grid border-b" style={{ gridTemplateColumns: '200px repeat(10, 1fr)' }}>
              {/* Vehicle Info */}
              <div className="p-2 border-r flex items-center gap-2">
                {fleetVehicle.vehicle.imageUrl ? (
                  <img src={fleetVehicle.vehicle.imageUrl} className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">🚲</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{fleetVehicle.vehicleNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{getName(fleetVehicle.vehicle.name)}</p>
                  <span className={`text-xs px-1 rounded text-white ${STATUS_COLORS[fleetVehicle.status]}`}>
                    {STATUS_LABELS[fleetVehicle.status]}
                  </span>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="col-span-10 relative h-16">
                {/* Background cells */}
                <div className="absolute inset-0 grid grid-cols-10">
                  {days.map((day, i) => {
                    const isDropTarget = dropTarget?.fleetId === fleetVehicle.id && dropTarget?.dayIndex === i
                    return (
                      <div
                        key={i}
                        onClick={() => !isUnavailable && onCellClick(fleetVehicle, day)}
                        onMouseEnter={() => draggedBooking && handleDragOver(fleetVehicle.id, i)}
                        className={`border-l h-full transition-colors ${
                          isUnavailable ? 'bg-gray-100 cursor-not-allowed' :
                          isDropTarget && hasConflict ? 'bg-red-100' :
                          isDropTarget ? 'bg-green-100' :
                          formatDate(day) === formatDate(new Date()) ? 'bg-blue-50' : ''
                        } ${!isUnavailable && !draggedBooking ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                      />
                    )
                  })}
                </div>
                
                {/* Unavailable overlay */}
                {isUnavailable && (
                  <div className={`absolute inset-0 ${fleetVehicle.status === 'MAINTENANCE' ? 'bg-orange-100' : 'bg-red-100'} opacity-50`} />
                )}
                
                {/* Bookings */}
                {fleetBookings.map((booking) => {
                  const style = getBookingStyle(booking, fleetBookings)
                  if (!style) return null
                  
                  const isAssigned = booking.fleetVehicleId === fleetVehicle.id
                  const isDragging = draggedBooking?.id === booking.id
                  const color = getBookingColor(booking)
                  
                  return (
                    <div
                      key={booking.id}
                      className={`absolute top-1 bottom-1 ${color} ${style.borderRadius} text-white cursor-grab shadow flex items-center group transition-all ${
                        isDragging ? 'opacity-50 scale-95' : ''
                      } ${!isAssigned ? 'border-2 border-dashed border-blue-700 bg-opacity-70' : ''}`}
                      style={{ left: style.left, width: style.width }}
                      onMouseDown={(e) => handleDragStart(e, booking, 'move')}
                      onDoubleClick={() => handleDoubleClick(booking)}
                      onContextMenu={(e) => handleContextMenu(e, booking)}
                      onMouseEnter={(e) => {
                        setHoveredBooking(booking)
                        setTooltipPos({ x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => setHoveredBooking(null)}
                    >
                      {/* Resize handle left */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30"
                        onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, booking, 'resize-start') }}
                      />
                      
                      {/* Content */}
                      <div className="flex-1 px-2 flex items-center overflow-hidden">
                        <span className="text-xs mr-1 opacity-75">{booking.startTime}</span>
                        <span className="flex-1 truncate font-bold text-sm">{booking.customer.lastName}</span>
                        <span className="text-xs ml-1 opacity-75">{booking.endTime}</span>
                      </div>
                      
                      {/* Check-in indicator */}
                      {booking.checkedIn && !booking.checkedOut && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                      )}
                      
                      {/* Resize handle right */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30"
                        onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, booking, 'resize-end') }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Tooltip */}
      {hoveredBooking && tooltipPos && !draggedBooking && (
        <div
          className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-sm max-w-xs"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
        >
          <p className="font-bold">{hoveredBooking.customer.firstName} {hoveredBooking.customer.lastName}</p>
          <p className="text-gray-300">{hoveredBooking.customer.email}</p>
          <p className="text-gray-300">{hoveredBooking.customer.phone}</p>
          <div className="border-t border-gray-700 mt-2 pt-2">
            <p>{new Date(hoveredBooking.startDate).toLocaleDateString('fr-FR')} {hoveredBooking.startTime}</p>
            <p>→ {new Date(hoveredBooking.endDate).toLocaleDateString('fr-FR')} {hoveredBooking.endTime}</p>
          </div>
          <p className="font-bold mt-2">{hoveredBooking.totalPrice}€</p>
          <p className="text-xs text-gray-400 mt-1">Double-clic = Check-in rapide</p>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            onClick={() => { onBookingClick(contextMenu.booking); setContextMenu(null) }}
          >
            <span>👁️</span> Voir détails
          </button>
          {!contextMenu.booking.checkedIn && contextMenu.booking.status === 'CONFIRMED' && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-green-50 text-green-700 flex items-center gap-2"
              onClick={() => { onCheckIn(contextMenu.booking); setContextMenu(null) }}
            >
              <span>✅</span> Check-in
            </button>
          )}
          {contextMenu.booking.checkedIn && !contextMenu.booking.checkedOut && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-700 flex items-center gap-2"
              onClick={() => { onCheckOut(contextMenu.booking); setContextMenu(null) }}
            >
              <span>🏁</span> Check-out
            </button>
          )}
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            onClick={() => { /* TODO: Modifier */ setContextMenu(null) }}
          >
            <span>✏️</span> Modifier
          </button>
          <button
            className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-700 flex items-center gap-2"
            onClick={() => { /* TODO: Annuler */ setContextMenu(null) }}
          >
            <span>❌</span> Annuler
          </button>
        </div>
      )}
      
      {/* Drag indicator */}
      {draggedBooking && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl z-50">
          {hasConflict ? (
            <span className="text-red-400">⚠️ Conflit détecté - Déposez ailleurs</span>
          ) : (
            <span>📦 Déplacez vers une nouvelle position</span>
          )}
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
  booking: Booking
  fleetVehicle: FleetVehicle | null
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
    depositMethod: 'CARD',
    depositPaid: false
  })

  const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Create contract and inspection via API
      // Note: This is a simplified version - you'd need to implement the full flow
      await fetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          fleetVehicleId: fleetVehicle?.id,
          agencyId: fleetVehicle?.agency.id,
          customer: booking.customer,
          startDate: booking.startDate,
          endDate: booking.endDate,
          source: 'ONLINE_WIDGET',
          dailyRate: booking.totalPrice / Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)),
          totalDays: Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)),
          subtotal: booking.totalPrice / 1.21,
          taxRate: 21,
          taxAmount: booking.totalPrice - booking.totalPrice / 1.21,
          totalAmount: booking.totalPrice,
          depositAmount: booking.depositAmount
        })
      })
      onComplete()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Check-in - {booking.reference}</h2>
          <p className="text-gray-500">{booking.customer.firstName} {booking.customer.lastName}</p>
        </div>
        
        {/* Progress Steps */}
        <div className="flex border-b">
          {['vehicle', 'inspection', 'signature', 'payment'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                step === s ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' :
                i < ['vehicle', 'inspection', 'signature', 'payment'].indexOf(step) ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {i + 1}. {s === 'vehicle' ? 'Véhicule' : s === 'inspection' ? 'Inspection' : s === 'signature' ? 'Signature' : 'Paiement'}
            </div>
          ))}
        </div>
        
        <div className="p-6">
          {/* Step 1: Vehicle */}
          {step === 'vehicle' && (
            <div className="space-y-4">
              <h3 className="font-bold">Véhicule assigné</h3>
              {fleetVehicle ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-4">
                  {fleetVehicle.vehicle.imageUrl && <img src={fleetVehicle.vehicle.imageUrl} className="w-16 h-16 rounded object-cover" />}
                  <div>
                    <p className="font-bold text-lg">{fleetVehicle.vehicleNumber}</p>
                    <p className="text-gray-600">{getName(fleetVehicle.vehicle.name)}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">⚠️ Aucun véhicule assigné - Veuillez en sélectionner un</p>
                </div>
              )}
              <button onClick={() => setStep('inspection')} className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium">
                Continuer →
              </button>
            </div>
          )}
          
          {/* Step 2: Inspection */}
          {step === 'inspection' && (
            <div className="space-y-4">
              <h3 className="font-bold">État du véhicule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kilométrage</label>
                  <input
                    type="number"
                    value={form.mileage}
                    onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Niveau carburant</label>
                  <select
                    value={form.fuelLevel}
                    onChange={e => setForm({...form, fuelLevel: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="FULL">Plein</option>
                    <option value="THREE_QUARTERS">3/4</option>
                    <option value="HALF">1/2</option>
                    <option value="QUARTER">1/4</option>
                    <option value="EMPTY">Vide</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">État général</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({...form, condition: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Bon</option>
                    <option value="FAIR">Moyen</option>
                    <option value="POOR">Mauvais</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes / Remarques</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Dégâts existants, accessoires remis..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('vehicle')} className="px-4 py-2 bg-gray-200 rounded-lg">← Retour</button>
                <button onClick={() => setStep('signature')} className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium">Continuer →</button>
              </div>
            </div>
          )}
          
          {/* Step 3: Signature */}
          {step === 'signature' && (
            <div className="space-y-4">
              <h3 className="font-bold">Signature du client</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center">
                <p className="text-gray-400">Zone de signature (à implémenter)</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('inspection')} className="px-4 py-2 bg-gray-200 rounded-lg">← Retour</button>
                <button onClick={() => setStep('payment')} className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium">Continuer →</button>
              </div>
            </div>
          )}
          
          {/* Step 4: Payment */}
          {step === 'payment' && (
            <div className="space-y-4">
              <h3 className="font-bold">Paiement de la caution</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Caution à encaisser</span>
                  <span className="font-bold">{booking.depositAmount}€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mode de paiement</label>
                <select
                  value={form.depositMethod}
                  onChange={e => setForm({...form, depositMethod: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="CARD">Carte bancaire</option>
                  <option value="CASH">Espèces</option>
                  <option value="TRANSFER">Virement</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.depositPaid}
                  onChange={e => setForm({...form, depositPaid: e.target.checked})}
                />
                <span>Caution encaissée</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setStep('signature')} className="px-4 py-2 bg-gray-200 rounded-lg">← Retour</button>
                <button
                  onClick={handleComplete}
                  disabled={!form.depositPaid || loading}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Validation...' : '✅ Valider le Check-in'}
                </button>
              </div>
            </div>
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
  booking: Booking
  fleetVehicle: FleetVehicle | null
  onClose: () => void
  onComplete: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    mileage: fleetVehicle?.currentMileage || 0,
    fuelLevel: 'FULL',
    condition: 'GOOD',
    hasDamages: false,
    damageDescription: '',
    deductionAmount: 0,
    notes: ''
  })

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Mark as checked out via API
      // Note: Implement the actual API call
      console.log('Check-out:', form)
      onComplete()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Check-out - {booking.reference}</h2>
          <p className="text-gray-500">{booking.customer.firstName} {booking.customer.lastName}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <h3 className="font-bold">État du véhicule au retour</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage final</label>
              <input
                type="number"
                value={form.mileage}
                onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Niveau carburant</label>
              <select
                value={form.fuelLevel}
                onChange={e => setForm({...form, fuelLevel: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="FULL">Plein</option>
                <option value="THREE_QUARTERS">3/4</option>
                <option value="HALF">1/2</option>
                <option value="QUARTER">1/4</option>
                <option value="EMPTY">Vide</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">État général</label>
              <select
                value={form.condition}
                onChange={e => setForm({...form, condition: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Bon</option>
                <option value="FAIR">Moyen</option>
                <option value="POOR">Mauvais</option>
              </select>
            </div>
          </div>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasDamages}
              onChange={e => setForm({...form, hasDamages: e.target.checked})}
            />
            <span className="font-medium text-red-600">Dégâts constatés</span>
          </label>
          
          {form.hasDamages && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Description des dégâts</label>
                <textarea
                  value={form.damageDescription}
                  onChange={e => setForm({...form, damageDescription: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Montant à déduire de la caution (€)</label>
                <input
                  type="number"
                  value={form.deductionAmount}
                  onChange={e => setForm({...form, deductionAmount: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Récapitulatif caution</h4>
            <div className="flex justify-between">
              <span>Caution encaissée</span>
              <span>{booking.depositAmount}€</span>
            </div>
            {form.hasDamages && (
              <div className="flex justify-between text-red-600">
                <span>Déduction dégâts</span>
                <span>-{form.deductionAmount}€</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t mt-2 pt-2">
              <span>À rembourser</span>
              <span className="text-green-600">{booking.depositAmount - form.deductionAmount}€</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
            <button
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Validation...' : '🏁 Valider le Check-out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default { AdvancedPlanning, CheckInModal, CheckOutModal }
