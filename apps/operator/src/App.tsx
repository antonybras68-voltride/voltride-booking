import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import { CheckInModal } from './CheckInModal'
import { NewBookingModal } from './NewBookingModal'
import { FleetEditModal } from './FleetEditModal'
import { getName } from './types'

export default function App() {
  const [tab, setTab] = useState('planning')
  const [brand, setBrand] = useState('VOLTRIDE')
  const [agencies, setAgencies] = useState([])
  const [selectedAgency, setSelectedAgency] = useState('')
  const [fleet, setFleet] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Planning state
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return d
  })
  
  // Drag & drop state
  const [draggedBooking, setDraggedBooking] = useState(null)
  const [dragType, setDragType] = useState(null) // 'move' | 'resize-start' | 'resize-end'
  const [dropTarget, setDropTarget] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  
  // Modals
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [showFleetEdit, setShowFleetEdit] = useState(false)
  const [selectedFleetForEdit, setSelectedFleetForEdit] = useState(null)
  const [newBookingData, setNewBookingData] = useState(null)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInBooking, setCheckInBooking] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelBooking, setCancelBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [showWalkinModal, setShowWalkinModal] = useState(false)
  const [walkinSessionId, setWalkinSessionId] = useState(null)
  const [walkinStatus, setWalkinStatus] = useState(null) // null | 'waiting' | 'completed'
  const [walkinData, setWalkinData] = useState(null)
  const [walkinForm, setWalkinForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES'
  })
  const [walkinMode, setWalkinMode] = useState('tablet') // 'tablet' | 'manual'
  const [settings, setSettings] = useState({
    cgv: {
      fr: "CONDITIONS GÉNÉRALES DE LOCATION\n\n1. Le locataire s'engage à utiliser le véhicule de manière responsable.\n2. Le véhicule doit être restitué dans le même état.\n3. Tout dommage sera facturé au locataire.\n4. La caution sera restituée après vérification.",
      es: "CONDICIONES GENERALES DE ALQUILER\n\n1. El arrendatario se compromete a utilizar el vehículo de manera responsable.\n2. El vehículo debe ser devuelto en el mismo estado.\n3. Cualquier daño será facturado al arrendatario.\n4. La fianza será devuelta tras la verificación.",
      en: "GENERAL RENTAL CONDITIONS\n\n1. The tenant agrees to use the vehicle responsibly.\n2. The vehicle must be returned in the same condition.\n3. Any damage will be charged to the tenant.\n4. The deposit will be refunded after verification."
    },
    rgpd: {
      fr: "POLITIQUE RGPD\n\nVos données personnelles sont collectées uniquement pour la gestion de votre location. Elles ne seront pas transmises à des tiers sans votre consentement.",
      es: "POLÍTICA RGPD\n\nSus datos personales se recopilan únicamente para la gestión de su alquiler. No se transmitirán a terceros sin su consentimiento.",
      en: "GDPR POLICY\n\nYour personal data is collected only for the management of your rental. It will not be transmitted to third parties without your consent."
    }
  })

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => { loadData() }, [selectedAgency, brand])
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
  
  // Send walkin form to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    const agencyId = selectedAgency || agencies[0]?.id
    if (!agencyId) {
      alert('Veuillez sélectionner une agence')
      return
    }
    
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
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000) // 10 min timeout
  }

  const createWalkinCustomer = async () => {
    const customerData = walkinMode === 'tablet' ? walkinData : walkinForm
    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email) {
      alert('Informations client incomplètes')
      return
    }
    
    try {
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
      alert('Client créé: ' + newCustomer.firstName + ' ' + newCustomer.lastName)
      setShowWalkinModal(false)
      setWalkinStatus(null)
      setWalkinData(null)
      setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
      loadData()
    } catch (e) {
      alert('Erreur lors de la création')
    }
  }

  const cancelWalkin = () => {
    setShowWalkinModal(false)
    setWalkinStatus(null)
    setWalkinData(null)
    setWalkinSessionId(null)
  }


  const handleFleetClick = (fleet) => {
    setSelectedFleetForEdit(fleet)
    setShowFleetEdit(true)
  }

  return () => window.removeEventListener('click', handleClick)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [agenciesData, fleetData, bookingsData] = await Promise.all([
        api.getAgencies(),
        api.getFleet(selectedAgency ? { agencyId: selectedAgency } : {}),
        api.getBookings(selectedAgency ? { agencyId: selectedAgency } : {})
      ])
      setAgencies(agenciesData.filter(a => a.brand === brand))
      setFleet(Array.isArray(fleetData) ? fleetData.filter(f => f.agency?.brand === brand || !brand) : [])
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const formatDate = (d) => d.toISOString().split('T')[0]
  const today = formatDate(new Date())
  const todayDepartures = bookings.filter(b => b.startDate?.split('T')[0] === today && !b.checkedIn)
  const todayReturns = bookings.filter(b => b.endDate?.split('T')[0] === today && b.checkedIn && !b.checkedOut)
  const filteredFleet = fleet.filter(f => !selectedAgency || f.agencyId === selectedAgency)

  // Get bookings for a vehicle, sorted by start date
  const getVehicleBookings = (fleetId) => {
    return bookings
      .filter(b => b.fleetVehicleId === fleetId && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  }

  // Check if two bookings are consecutive (for alternating colors)
  const getBookingColorIndex = (booking, vehicleBookings) => {
    const idx = vehicleBookings.findIndex(b => b.id === booking.id)
    return idx % 2
  }

  // Drag handlers
  const handleDragStart = (e, booking, type = 'move') => {
    if (booking.checkedIn && type === 'move') {
      e.preventDefault()
      return
    }
    setDraggedBooking(booking)
    setDragType(type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, fleetId, date) => {
    e.preventDefault()
    if (!draggedBooking) return
    setDropTarget({ fleetId, date: formatDate(date) })
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e, targetFleet, targetDate) => {
    e.preventDefault()
    if (!draggedBooking) return

    const dateStr = formatDate(targetDate)
    const originalStart = draggedBooking.startDate.split('T')[0]
    const originalEnd = draggedBooking.endDate.split('T')[0]
    const daysDiff = Math.round((targetDate - new Date(originalStart)) / (1000 * 60 * 60 * 24))

    let newStart, newEnd, newFleetId

    if (dragType === 'move') {
      newStart = dateStr
      const duration = Math.round((new Date(originalEnd) - new Date(originalStart)) / (1000 * 60 * 60 * 24))
      const endDate = new Date(targetDate)
      endDate.setDate(endDate.getDate() + duration)
      newEnd = formatDate(endDate)
      newFleetId = targetFleet.id
    } else if (dragType === 'resize-start') {
      newStart = dateStr
      newEnd = originalEnd
      newFleetId = draggedBooking.fleetVehicleId
    } else if (dragType === 'resize-end') {
      newStart = originalStart
      newEnd = dateStr
      newFleetId = draggedBooking.fleetVehicleId
    }

    // Check for conflicts
    const hasConflict = bookings.some(b => {
      if (b.id === draggedBooking.id || b.fleetVehicleId !== newFleetId || b.status === 'CANCELLED') return false
      const bStart = b.startDate.split('T')[0]
      const bEnd = b.endDate.split('T')[0]
      return newStart <= bEnd && newEnd >= bStart
    })

    if (hasConflict) {
      alert('❌ Conflit : une réservation existe déjà sur cette période')
      setDraggedBooking(null)
      setDragType(null)
      setDropTarget(null)
      return
    }

    // Update booking
    try {
      await api.updateBooking(draggedBooking.id, {
        startDate: newStart,
        endDate: newEnd,
        fleetVehicleId: newFleetId
      })
      loadData()
    } catch (e) {
      alert('Erreur lors de la modification')
    }

    setDraggedBooking(null)
    setDragType(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedBooking(null)
    setDragType(null)
    setDropTarget(null)
  }

  // Double click = quick check-in
  const handleDoubleClick = (booking) => {
    if (!booking.checkedIn) {
      setCheckInBooking(booking)
      setShowCheckIn(true)
    }
  }

  // Right click context menu
  const handleContextMenu = (e, booking) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      booking
    })
  }

  // Click empty cell = new booking
  const handleCellClick = (fleetVehicle, date) => {
    if (draggedBooking) return
    setNewBookingData({ fleetVehicle, date: formatDate(date) })
    setShowNewBooking(true)
  }

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!cancelBooking || !cancelReason.trim()) return
    try {
      await api.cancelBooking(cancelBooking.id, cancelReason)
      loadData()
      setShowCancelModal(false)
      setCancelBooking(null)
      setCancelReason('')
    } catch (e) {
      alert('Erreur lors de l\'annulation')
    }
  }


  // Send walkin form to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    const agencyId = selectedAgency || agencies[0]?.id
    if (!agencyId) {
      alert('Veuillez sélectionner une agence')
      return
    }
    
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
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000) // 10 min timeout
  }

  const createWalkinCustomer = async () => {
    const customerData = walkinMode === 'tablet' ? walkinData : walkinForm
    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email) {
      alert('Informations client incomplètes')
      return
    }
    
    try {
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
      alert('Client créé: ' + newCustomer.firstName + ' ' + newCustomer.lastName)
      setShowWalkinModal(false)
      setWalkinStatus(null)
      setWalkinData(null)
      setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
      loadData()
    } catch (e) {
      alert('Erreur lors de la création')
    }
  }

  const cancelWalkin = () => {
    setShowWalkinModal(false)
    setWalkinStatus(null)
    setWalkinData(null)
    setWalkinSessionId(null)
  }


  const handleFleetClick = (fleet) => {
    setSelectedFleetForEdit(fleet)
    setShowFleetEdit(true)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold" style={{ color: brand === 'VOLTRIDE' ? '#abdee6' : '#ffaf10' }}>
            {brand === 'VOLTRIDE' ? '⚡ VOLTRIDE' : '🏍️ MOTOR-RENT'}
          </h1>
          <select value={brand} onChange={e => { setBrand(e.target.value); setSelectedAgency('') }}
            className="mt-2 w-full text-sm border rounded p-1">
            <option value="VOLTRIDE">Voltride</option>
            <option value="MOTOR-RENT">Motor-Rent</option>
          </select>
        </div>
        
        <nav className="flex-1 p-2">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'planning', icon: '📅', label: 'Planning' },
            { id: 'bookings', icon: '📋', label: 'Réservations' },
            { id: 'fleet', icon: '🚲', label: 'Flotte' },
            { id: 'customers', icon: '👥', label: 'Clients' },
            { id: 'contracts', icon: '📄', label: 'Contrats' },
            { id: 'invoices', icon: '💰', label: 'Factures' },
            { id: 'settings', icon: '⚙️', label: 'Paramètres' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={'w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 ' +
                (tab === item.id ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100')}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white shadow px-6 py-4 flex items-center gap-4">
          <select value={selectedAgency} onChange={e => setSelectedAgency(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">Toutes les agences</option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.city}</option>)}
          </select>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div className="p-6">
          {loading && <div className="text-center py-10">⏳ Chargement...</div>}

          {/* DASHBOARD */}
          {!loading && tab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg">
                  <div className="text-4xl font-bold text-blue-600">{todayDepartures.length}</div>
                  <div className="text-gray-600 mb-4">Départs du jour</div>
                  {todayDepartures.slice(0, 5).map(b => (
                    <div key={b.id} className="flex justify-between py-1 text-sm border-t">
                      <span>{b.startTime} - {b.customer?.lastName}</span>
                      <span className="text-gray-500">{getName(b.items?.[0]?.vehicle?.name)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg">
                  <div className="text-4xl font-bold text-green-600">{todayReturns.length}</div>
                  <div className="text-gray-600 mb-4">Retours du jour</div>
                  {todayReturns.slice(0, 5).map(b => (
                    <div key={b.id} className="flex justify-between py-1 text-sm border-t">
                      <span>{b.endTime} - {b.customer?.lastName}</span>
                      <span className="text-gray-500">{getName(b.items?.[0]?.vehicle?.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PLANNING */}
          {!loading && tab === 'planning' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-2xl font-bold">Planning</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-4 h-4 rounded bg-blue-500"></span> Confirmé
                  <span className="w-4 h-4 rounded bg-violet-500 ml-2"></span> Confirmé (alt)
                  <span className="w-4 h-4 rounded bg-green-600 ml-2"></span> Check-in fait
                </div>
                <div className="flex-1" />
                <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })} 
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">← Précédent</button>
                <button onClick={() => setWeekStart(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d })} 
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Aujourd'hui</button>
                <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })} 
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Suivant →</button>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ minWidth: '1000px' }}>
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-medium w-44 z-20 border-r">Véhicule</th>
                        {days.map((day, i) => {
                          const dateStr = formatDate(day)
                          const isToday = dateStr === today
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                        
  // Send walkin form to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    const agencyId = selectedAgency || agencies[0]?.id
    if (!agencyId) {
      alert('Veuillez sélectionner une agence')
      return
    }
    
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
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000) // 10 min timeout
  }

  const createWalkinCustomer = async () => {
    const customerData = walkinMode === 'tablet' ? walkinData : walkinForm
    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email) {
      alert('Informations client incomplètes')
      return
    }
    
    try {
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
      alert('Client créé: ' + newCustomer.firstName + ' ' + newCustomer.lastName)
      setShowWalkinModal(false)
      setWalkinStatus(null)
      setWalkinData(null)
      setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
      loadData()
    } catch (e) {
      alert('Erreur lors de la création')
    }
  }

  const cancelWalkin = () => {
    setShowWalkinModal(false)
    setWalkinStatus(null)
    setWalkinData(null)
    setWalkinSessionId(null)
  }


  const handleFleetClick = (fleet) => {
    setSelectedFleetForEdit(fleet)
    setShowFleetEdit(true)
  }

  return (
                            <th key={i} className={'px-1 py-2 text-center w-24 ' + (isToday ? 'bg-yellow-100' : isWeekend ? 'bg-gray-100' : '')}>
                              <div className="text-xs text-gray-500 uppercase">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                              <div className={'text-lg ' + (isToday ? 'font-bold text-yellow-600' : '')}>{day.getDate()}</div>
                              {isToday && <div className="text-xs text-yellow-600">Aujourd'hui</div>}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFleet.map(f => {
                        const vehicleBookings = getVehicleBookings(f.id)
                      
  // Send walkin form to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    const agencyId = selectedAgency || agencies[0]?.id
    if (!agencyId) {
      alert('Veuillez sélectionner une agence')
      return
    }
    
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
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000) // 10 min timeout
  }

  const createWalkinCustomer = async () => {
    const customerData = walkinMode === 'tablet' ? walkinData : walkinForm
    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email) {
      alert('Informations client incomplètes')
      return
    }
    
    try {
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
      alert('Client créé: ' + newCustomer.firstName + ' ' + newCustomer.lastName)
      setShowWalkinModal(false)
      setWalkinStatus(null)
      setWalkinData(null)
      setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
      loadData()
    } catch (e) {
      alert('Erreur lors de la création')
    }
  }

  const cancelWalkin = () => {
    setShowWalkinModal(false)
    setWalkinStatus(null)
    setWalkinData(null)
    setWalkinSessionId(null)
  }


  const handleFleetClick = (fleet) => {
    setSelectedFleetForEdit(fleet)
    setShowFleetEdit(true)
  }

  return (
                          <tr key={f.id} className="border-t hover:bg-gray-50/50">
                            <td className="sticky left-0 bg-white px-3 py-2 z-10 border-r">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                                  {f.vehicle?.imageUrl ? <img src={f.vehicle.imageUrl} className="w-full h-full object-cover" /> : '🚲'}
                                </div>
                                <div>
                                  <div className="font-bold text-sm">{f.vehicleNumber}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-[100px]">{getName(f.vehicle?.name)}</div>
                                </div>
                              </div>
                            </td>
                            {days.map((day, dayIndex) => {
                              const dateStr = formatDate(day)
                              const isToday = dateStr === today
                              const isWeekend = day.getDay() === 0 || day.getDay() === 6
                              const isDropTarget = dropTarget?.fleetId === f.id && dropTarget?.date === dateStr

                              // Find booking for this cell
                              const cellBooking = vehicleBookings.find(b => {
                                const start = b.startDate?.split('T')[0]
                                const end = b.endDate?.split('T')[0]
                                return dateStr >= start && dateStr <= end
                              })

                              if (cellBooking) {
                                const start = cellBooking.startDate?.split('T')[0]
                                const end = cellBooking.endDate?.split('T')[0]
                                const isStart = dateStr === start
                                const isEnd = dateStr === end
                                const colorIdx = getBookingColorIndex(cellBooking, vehicleBookings)
                                const bgColor = cellBooking.checkedIn ? 'bg-green-600' : (colorIdx === 0 ? 'bg-blue-500' : 'bg-violet-500')
                                const isDragging = draggedBooking?.id === cellBooking.id

                              
  // Send walkin form to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    const agencyId = selectedAgency || agencies[0]?.id
    if (!agencyId) {
      alert('Veuillez sélectionner une agence')
      return
    }
    
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
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000) // 10 min timeout
  }

  const createWalkinCustomer = async () => {
    const customerData = walkinMode === 'tablet' ? walkinData : walkinForm
    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email) {
      alert('Informations client incomplètes')
      return
    }
    
    try {
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
      alert('Client créé: ' + newCustomer.firstName + ' ' + newCustomer.lastName)
      setShowWalkinModal(false)
      setWalkinStatus(null)
      setWalkinData(null)
      setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
      loadData()
    } catch (e) {
      alert('Erreur lors de la création')
    }
  }

  const cancelWalkin = () => {
    setShowWalkinModal(false)
    setWalkinStatus(null)
    setWalkinData(null)
    setWalkinSessionId(null)
  }


  const handleFleetClick = (fleet) => {
    setSelectedFleetForEdit(fleet)
    setShowFleetEdit(true)
  }

  return (
                                  <td key={dayIndex} className={'relative h-14 ' + (isToday ? 'bg-yellow-50' : isWeekend ? 'bg-gray-50' : '')}
                                    onDragOver={(e) => handleDragOver(e, f.id, day)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, f, day)}>
                                    <div
                                      draggable={!cellBooking.checkedIn}
                                      onDragStart={(e) => handleDragStart(e, cellBooking, 'move')}
                                      onDragEnd={handleDragEnd}
                                      onDoubleClick={() => handleDoubleClick(cellBooking)}
                                      onContextMenu={(e) => handleContextMenu(e, cellBooking)}
                                      onMouseEnter={() => setTooltip({ booking: cellBooking, x: 0, y: 0 })}
                                      onMouseLeave={() => setTooltip(null)}
                                      className={'absolute inset-y-1 text-white text-xs flex items-center cursor-grab active:cursor-grabbing transition-all ' + bgColor + (isDragging ? ' opacity-50 scale-95' : '')}
                                      style={{
                                        left: isStart ? '4px' : '0',
                                        right: isEnd ? '4px' : '0',
                                        borderTopLeftRadius: isStart ? '8px' : '0',
                                        borderBottomLeftRadius: isStart ? '8px' : '0',
                                        borderTopRightRadius: isEnd ? '8px' : '0',
                                        borderBottomRightRadius: isEnd ? '8px' : '0',
                                        zIndex: 5
                                      }}>
                                      {/* Resize handle start */}
                                      {isStart && !cellBooking.checkedIn && (
                                        <div draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, cellBooking, 'resize-start') }}
                                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                                      )}
                                      
                                      <div className="flex-1 px-2 truncate">
                                        {isStart && <span>{cellBooking.startTime} {cellBooking.customer?.lastName}</span>}
                                      </div>
                                      
                                      {isEnd && <span className="pr-2 text-xs opacity-75">{cellBooking.endTime}</span>}
                                      
                                      {/* Resize handle end */}
                                      {isEnd && !cellBooking.checkedOut && (
                                        <div draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, cellBooking, 'resize-end') }}
                                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                                      )}
                                    </div>
                                  </td>
                                )
                              }

                              // Empty cell
                            
  // Send walkin form to tablet
  const sendWalkinToTablet = async () => {
    const sessionId = 'walkin_' + Date.now()
    setWalkinSessionId(sessionId)
    setWalkinStatus('waiting')
    
    const agencyId = selectedAgency || agencies[0]?.id
    if (!agencyId) {
      alert('Veuillez sélectionner une agence')
      return
    }
    
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
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 600000) // 10 min timeout
  }

  const createWalkinCustomer = async () => {
    const customerData = walkinMode === 'tablet' ? walkinData : walkinForm
    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email) {
      alert('Informations client incomplètes')
      return
    }
    
    try {
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
      alert('Client créé: ' + newCustomer.firstName + ' ' + newCustomer.lastName)
      setShowWalkinModal(false)
      setWalkinStatus(null)
      setWalkinData(null)
      setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
      loadData()
    } catch (e) {
      alert('Erreur lors de la création')
    }
  }

  const cancelWalkin = () => {
    setShowWalkinModal(false)
    setWalkinStatus(null)
    setWalkinData(null)
    setWalkinSessionId(null)
  }


  const handleFleetClick = (fleet) => {
    setSelectedFleetForEdit(fleet)
    setShowFleetEdit(true)
  }

  return (
                                <td key={dayIndex} 
                                  className={'relative h-14 cursor-pointer transition-colors ' + 
                                    (isToday ? 'bg-yellow-50 hover:bg-yellow-100' : isWeekend ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-blue-50') +
                                    (isDropTarget ? ' ring-2 ring-blue-500 ring-inset' : '')}
                                  onClick={() => handleCellClick(f, day)}
                                  onDragOver={(e) => handleDragOver(e, f.id, day)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, f, day)}>
                                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 opacity-0 hover:opacity-100">
                                    <span className="text-2xl">+</span>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                💡 Glissez-déposez pour déplacer • Tirez les bords pour étendre • Double-clic pour check-in • Clic droit pour options
              </p>
            </div>
          )}

          {/* BOOKINGS */}
          {!loading && tab === 'bookings' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Réservations à assigner</h2>
              <div className="bg-white rounded-xl shadow">
                {bookings.filter(b => !b.fleetVehicleId && b.status !== 'CANCELLED').length === 0 ? (
                  <div className="p-8 text-center text-gray-500">✓ Toutes les réservations sont assignées</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Référence</th>
                        <th className="px-4 py-3 text-left">Client</th>
                        <th className="px-4 py-3 text-left">Dates</th>
                        <th className="px-4 py-3 text-left">Véhicule</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.filter(b => !b.fleetVehicleId && b.status !== 'CANCELLED').map(b => (
                        <tr key={b.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{b.reference}</td>
                          <td className="px-4 py-3">{b.customer?.firstName} {b.customer?.lastName}</td>
                          <td className="px-4 py-3 text-sm">{new Date(b.startDate).toLocaleDateString('fr-FR')} → {new Date(b.endDate).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3">{getName(b.items?.[0]?.vehicle?.name)}</td>
                          <td className="px-4 py-3"><button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Assigner</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* FLEET */}
          {!loading && tab === 'fleet' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Flotte</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFleet.map(f => (
                  <div key={f.id} className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {f.vehicle?.imageUrl ? <img src={f.vehicle.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">🚲</span>}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{f.vehicleNumber}</div>
                        <div className="text-sm text-gray-600">{getName(f.vehicle?.name)}</div>
                        <div className={'text-xs px-2 py-0.5 rounded inline-block mt-1 ' + 
                          (f.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 
                           f.status === 'RENTED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')}>
                          {f.status === 'AVAILABLE' ? 'Disponible' : f.status === 'RENTED' ? 'En location' : 'Maintenance'}
                        </div>
                      </div>
                      <button onClick={() => handleFleetClick(f)} 
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium">
                        ✏️ Éditer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {/* SETTINGS */}
          {!loading && tab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">⚙️ Paramètres</h2>
              
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">Conditions Générales de Vente (CGV)</h3>
                <div className="space-y-4">
                  {['fr', 'es', 'en'].map(lang => (
                    <div key={lang}>
                      <label className="block text-sm font-medium mb-1">
                        {lang === 'fr' ? '🇫🇷 Français' : lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                      </label>
                      <textarea
                        value={settings.cgv[lang]}
                        onChange={e => setSettings({...settings, cgv: {...settings.cgv, [lang]: e.target.value}})}
                        className="w-full border rounded-lg p-3 h-32"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">Politique RGPD</h3>
                <div className="space-y-4">
                  {['fr', 'es', 'en'].map(lang => (
                    <div key={lang}>
                      <label className="block text-sm font-medium mb-1">
                        {lang === 'fr' ? '🇫🇷 Français' : lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                      </label>
                      <textarea
                        value={settings.rgpd[lang]}
                        onChange={e => setSettings({...settings, rgpd: {...settings.rgpd, [lang]: e.target.value}})}
                        className="w-full border rounded-lg p-3 h-24"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                💾 Sauvegarder les paramètres
              </button>
            </div>
          )}

          {/* Other tabs placeholder */}
          {!loading && ['customers', 'contracts', 'invoices'].includes(tab) && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Module {tab} - À développer
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white rounded-lg shadow-xl border py-2 z-50" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {!contextMenu.booking.checkedIn && (
            <button onClick={() => { setCheckInBooking(contextMenu.booking); setShowCheckIn(true); setContextMenu(null) }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
              ✅ Check-in
            </button>
          )}
          {contextMenu.booking.checkedIn && !contextMenu.booking.checkedOut && (
            <button onClick={() => { alert('Check-out à implémenter'); setContextMenu(null) }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
              🏁 Check-out
            </button>
          )}
          <button onClick={() => { alert('Modification à implémenter'); setContextMenu(null) }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
            ✏️ Modifier
          </button>
          {!contextMenu.booking.checkedIn && (
            <button onClick={() => { setCancelBooking(contextMenu.booking); setShowCancelModal(true); setContextMenu(null) }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2">
              ❌ Annuler
            </button>
          )}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed bg-gray-900 text-white text-sm rounded-lg px-3 py-2 z-50 pointer-events-none shadow-lg"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="font-bold">{tooltip.booking.customer?.firstName} {tooltip.booking.customer?.lastName}</div>
          <div className="text-gray-300">{tooltip.booking.reference}</div>
          <div className="text-gray-300">{tooltip.booking.startDate?.split('T')[0]} → {tooltip.booking.endDate?.split('T')[0]}</div>
          <div className="text-gray-300">{tooltip.booking.startTime} - {tooltip.booking.endTime}</div>
          {tooltip.booking.checkedIn && <div className="text-green-400">✓ Check-in effectué</div>}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && cancelBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">❌ Annuler la réservation</h3>
            <p className="text-gray-600 mb-4">Réservation {cancelBooking.reference} - {cancelBooking.customer?.lastName}</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Motif d'annulation (obligatoire)"
              className="w-full border rounded-lg p-3 h-24 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Retour</button>
              <button onClick={handleCancelBooking} disabled={!cancelReason.trim()}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Edit Modal */}
      {showFleetEdit && selectedFleetForEdit && (
        <FleetEditModal
          fleet={selectedFleetForEdit}
          onClose={() => { setShowFleetEdit(false); setSelectedFleetForEdit(null) }}
          onSave={() => { setShowFleetEdit(false); setSelectedFleetForEdit(null); loadData() }}
        />
      )}

      {/* New Booking Modal */}
      {showNewBooking && (
        <NewBookingModal
          fleetVehicle={newBookingData?.fleetVehicle}
          startDate={newBookingData?.date}
          agencyId={selectedAgency || agencies[0]?.id}
          brand={brand}
          onClose={() => { setShowNewBooking(false); setNewBookingData(null) }}
          onComplete={() => { setShowNewBooking(false); setNewBookingData(null); loadData() }}
        />
      )}

      {/* Check-in Modal */}
      {showCheckIn && checkInBooking && (
        <CheckInModal
          booking={checkInBooking}
          fleetVehicle={fleet.find(f => f.id === checkInBooking.fleetVehicleId)}
          settings={settings}
          onClose={() => setShowCheckIn(false)}
          onComplete={() => { setShowCheckIn(false); setCheckInBooking(null); loadData() }}
        />
      )}

      {/* Walkin Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cancelWalkin}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-green-600 text-white p-4 rounded-t-2xl">
              <h2 className="text-xl font-bold">👤 Nouveau client walk-in</h2>
            </div>
            
            <div className="p-6">
              {/* Mode selector */}
              {!walkinStatus && (
                <div className="flex gap-2 mb-6">
                  <button onClick={() => setWalkinMode('tablet')}
                    className={'flex-1 py-3 rounded-xl border-2 font-medium ' + 
                      (walkinMode === 'tablet' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200')}>
                    📱 Tablette comptoir
                  </button>
                  <button onClick={() => setWalkinMode('manual')}
                    className={'flex-1 py-3 rounded-xl border-2 font-medium ' + 
                      (walkinMode === 'manual' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200')}>
                    ✏️ Saisie manuelle
                  </button>
                </div>
              )}

              {/* Tablet mode */}
              {walkinMode === 'tablet' && !walkinStatus && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Le client remplira ses informations sur la tablette comptoir</p>
                  <button onClick={sendWalkinToTablet}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                    📱 Envoyer sur tablette
                  </button>
                </div>
              )}

              {walkinMode === 'tablet' && walkinStatus === 'waiting' && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 animate-pulse">⏳</div>
                  <p className="text-gray-600">En attente des informations client...</p>
                  <p className="text-sm text-gray-400 mt-2">Le client remplit le formulaire sur la tablette</p>
                  <button onClick={cancelWalkin} className="mt-4 text-red-600">Annuler</button>
                </div>
              )}

              {walkinMode === 'tablet' && walkinStatus === 'completed' && walkinData && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="font-bold text-green-700">✅ Informations reçues !</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Prénom:</span> <strong>{walkinData.firstName}</strong></div>
                    <div><span className="text-gray-500">Nom:</span> <strong>{walkinData.lastName}</strong></div>
                    <div><span className="text-gray-500">Email:</span> <strong>{walkinData.email}</strong></div>
                    <div><span className="text-gray-500">Tél:</span> <strong>{walkinData.phonePrefix}{walkinData.phone}</strong></div>
                    <div className="col-span-2"><span className="text-gray-500">Adresse:</span> <strong>{walkinData.address}, {walkinData.postalCode} {walkinData.city}, {walkinData.country}</strong></div>
                  </div>
                  <button onClick={createWalkinCustomer}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
                    ✅ Créer le client
                  </button>
                </div>
              )}

              {/* Manual mode */}
              {walkinMode === 'manual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Prénom *</label>
                      <input type="text" value={walkinForm.firstName}
                        onChange={e => setWalkinForm({...walkinForm, firstName: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom *</label>
                      <input type="text" value={walkinForm.lastName}
                        onChange={e => setWalkinForm({...walkinForm, lastName: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input type="email" value={walkinForm.email}
                      onChange={e => setWalkinForm({...walkinForm, email: e.target.value})}
                      className="w-full border-2 rounded-xl p-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone *</label>
                    <div className="flex gap-2">
                      <select value={walkinForm.phonePrefix}
                        onChange={e => setWalkinForm({...walkinForm, phonePrefix: e.target.value})}
                        className="border-2 rounded-xl p-3 w-24">
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+49">🇩🇪 +49</option>
                      </select>
                      <input type="tel" value={walkinForm.phone}
                        onChange={e => setWalkinForm({...walkinForm, phone: e.target.value})}
                        className="flex-1 border-2 rounded-xl p-3" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Adresse</label>
                    <input type="text" value={walkinForm.address}
                      onChange={e => setWalkinForm({...walkinForm, address: e.target.value})}
                      className="w-full border-2 rounded-xl p-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ville</label>
                      <input type="text" value={walkinForm.city}
                        onChange={e => setWalkinForm({...walkinForm, city: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Code postal</label>
                      <input type="text" value={walkinForm.postalCode}
                        onChange={e => setWalkinForm({...walkinForm, postalCode: e.target.value})}
                        className="w-full border-2 rounded-xl p-3" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pays</label>
                    <select value={walkinForm.country}
                      onChange={e => setWalkinForm({...walkinForm, country: e.target.value})}
                      className="w-full border-2 rounded-xl p-3">
                      <option value="ES">🇪🇸 España</option>
                      <option value="FR">🇫🇷 France</option>
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="DE">🇩🇪 Deutschland</option>
                    </select>
                  </div>
                  <button onClick={createWalkinCustomer}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
                    ✅ Créer le client
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <button onClick={cancelWalkin} className="w-full py-2 text-gray-600 hover:text-gray-800">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
