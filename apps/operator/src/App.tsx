import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import { Login } from './Login'
import { CheckInModal } from './CheckInModal'
import { NewBookingModal } from './NewBookingModal'
import { FleetEditModal } from './FleetEditModal'
import { NewFleetModal } from './NewFleetModal'
import { CheckOutModal } from './CheckOutModal'
import { getName } from './types'

export default function App() {
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [lang, setLang] = useState<'fr' | 'es'>(() => (localStorage.getItem('lang') as 'fr' | 'es') || 'fr')
  
  // Traductions
  const t: Record<string, Record<string, string>> = {
    fr: {
      dashboard: 'Dashboard',
      planning: 'Planning',
      bookings: 'Réservations',
      fleet: 'Flotte',
      checkout: 'Check-out',
      customers: 'Clients',
      contracts: 'Contrats',
      invoices: 'Factures',
      settings: 'Paramètres',
      logout: 'Déconnexion',
      allAgencies: 'Toutes les agences',
      loading: 'Chargement...',
      todayDepartures: 'Départs du jour',
      todayReturns: 'Retours du jour',
      newBooking: 'Nouvelle réservation',
      newUser: 'Nouvel utilisateur',
      save: 'Sauvegarder',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      create: 'Créer',
      permissions: 'Permissions par rôle',
      users: 'Utilisateurs',
      legalDocs: 'Documents légaux',
      usersRoles: 'Utilisateurs & Rôles',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Email',
      password: 'Mot de passe',
      role: 'Rôle',
      brands: 'Marques',
      status: 'Statut',
      actions: 'Actions',
      active: 'Actif',
      inactive: 'Inactif'
    },
    es: {
      dashboard: 'Panel',
      planning: 'Planificación',
      bookings: 'Reservas',
      fleet: 'Flota',
      checkout: 'Devolución',
      customers: 'Clientes',
      contracts: 'Contratos',
      invoices: 'Facturas',
      settings: 'Ajustes',
      logout: 'Cerrar sesión',
      allAgencies: 'Todas las agencias',
      loading: 'Cargando...',
      todayDepartures: 'Salidas del día',
      todayReturns: 'Devoluciones del día',
      newBooking: 'Nueva reserva',
      newUser: 'Nuevo usuario',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      permissions: 'Permisos por rol',
      users: 'Usuarios',
      legalDocs: 'Documentos legales',
      usersRoles: 'Usuarios y Roles',
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Email',
      password: 'Contraseña',
      role: 'Rol',
      brands: 'Marcas',
      status: 'Estado',
      actions: 'Acciones',
      active: 'Activo',
      inactive: 'Inactivo'
    }
  }

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setAuthLoading(false)
  }, [])

  const handleLogin = (userData: any, userToken: string) => {
    setUser(userData)
    setToken(userToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    window.location.reload()
  }

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
  const [fleetModalMode, setFleetModalMode] = useState<'view' | 'edit'>('view')
  const [showNewFleet, setShowNewFleet] = useState(false)
  const [fleetStatusFilter, setFleetStatusFilter] = useState('ALL')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedCheckoutBooking, setSelectedCheckoutBooking] = useState(null)
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
  const [settings, setSettings] = useState<any>({
    voltride: {
      cgvResume: { fr: '', es: '', en: '' },
      cgvComplete: { fr: '', es: '', en: '' },
      rgpd: { fr: '', es: '', en: '' },
      mentionsLegales: { fr: '', es: '', en: '' }
    },
    motorrent: {
      cgvResume: { fr: '', es: '', en: '' },
      cgvComplete: { fr: '', es: '', en: '' },
      rgpd: { fr: '', es: '', en: '' },
      mentionsLegales: { fr: '', es: '', en: '' }
    }
  })
  const [settingsTab, setSettingsTab] = useState<'voltride' | 'motorrent'>('voltride')
  const [settingsSection, setSettingsSection] = useState<string>('cgvResume')
  const [settingsMainTab, setSettingsMainTab] = useState<'documents' | 'users'>('documents')
  const [permissions, setPermissions] = useState<any[]>([])
  const [usersList, setUsersList] = useState<any[]>([])
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => { loadData() }, [selectedAgency, brand])
  // Charger les permissions
  const loadPermissions = async () => {
    try {
      const data = await api.getPermissions()
      setPermissions(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Erreur chargement permissions:', e) }
  }

  // Charger les utilisateurs
  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsersList(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Erreur chargement utilisateurs:', e) }
  }

  useEffect(() => { 
    loadBrandSettings('VOLTRIDE')
    loadBrandSettings('MOTOR-RENT')
    loadPermissions()
    loadUsers()
  }, [])

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


  const handleFleetClick = (fleet, mode = 'view') => {
    setSelectedFleetForEdit(fleet)
    setFleetModalMode(mode)
    setShowFleetEdit(true)
  }

  const handleFleetDelete = () => {
    setShowFleetEdit(false)
    setSelectedFleetForEdit(null)
    loadData()
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

  // Charger les paramètres d'une marque
  const loadBrandSettings = async (brandName: string) => {
    try {
      const data = await api.getBrandSettings(brandName)
      if (data) {
        const tab = brandName === 'VOLTRIDE' ? 'voltride' : 'motorrent'
        setSettings(prev => ({
          ...prev,
          [tab]: {
            ...data,
            cgvResume: data.cgvResume || { fr: '', es: '', en: '' },
            cgvComplete: data.cgvComplete || { fr: '', es: '', en: '' },
            rgpd: data.rgpd || { fr: '', es: '', en: '' },
            mentionsLegales: data.mentionsLegales || { fr: '', es: '', en: '' }
          }
        }))
      }
    } catch (e) { console.error('Erreur chargement settings:', e) }
  }

  // Sauvegarder les paramètres
  const handleSaveSettings = async () => {
    try {
      const brandName = settingsTab === 'voltride' ? 'VOLTRIDE' : 'MOTOR-RENT'
      const data = settings[settingsTab]
      await api.saveBrandSettings(brandName, {
        name: data?.name || brandName,
        cgvResume: data?.cgvResume,
        cgvComplete: data?.cgvComplete,
        rgpd: data?.rgpd,
        mentionsLegales: data?.mentionsLegales
      })
      alert('✅ Paramètres sauvegardés avec succès !')
    } catch (e) {
      console.error('Erreur sauvegarde:', e)
      alert('❌ Erreur lors de la sauvegarde')
    }
  }

  const formatDate = (d) => d.toISOString().split('T')[0]
  const today = formatDate(new Date())
  const todayDepartures = bookings.filter(b => b.startDate?.split('T')[0] === today && !b.checkedIn)
  const todayReturns = bookings.filter(b => b.endDate?.split('T')[0] === today && b.checkedIn && !b.checkedOut)
  const filteredFleet = fleet.filter(f => !selectedAgency || f.agencyId === selectedAgency)
  
  // Vehicles currently rented (for checkout)
  const rentedBookings = bookings.filter(b => 
    b.status === 'CHECKED_IN' && 
    (!selectedAgency || b.agencyId === selectedAgency)
  )

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


  const handleFleetClick = (fleet, mode = 'view') => {
    setSelectedFleetForEdit(fleet)
    setFleetModalMode(mode)
    setShowFleetEdit(true)
  }

  const handleFleetDelete = () => {
    setShowFleetEdit(false)
    setSelectedFleetForEdit(null)
    loadData()
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Show login if not authenticated  
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 flex flex-col shadow-xl" style={{ background: 'linear-gradient(180deg, #abdee6 0%, #ffaf10 100%)' }}>
        <div className="p-4 border-b border-white/20">
          <div className="flex justify-center mb-3">
            {brand === 'VOLTRIDE' ? (
              <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766928342/d5uv1qrfwr86rd1abtd1.png" className="h-12" alt="Voltride" />
            ) : (
              <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766930480/logo-2024-e1699439584325-removebg-preview_sv6yxg.png" className="h-12" alt="Motor-Rent" />
            )}
          </div>
          <select value={brand} onChange={e => { setBrand(e.target.value); setSelectedAgency('') }}
            className="w-full text-sm bg-white/90 border-0 rounded-lg p-2 font-medium">
            <option value="VOLTRIDE">Voltride</option>
            <option value="MOTOR-RENT">Motor-Rent</option>
          </select>
        </div>
        
        <nav className="flex-1 p-2">
          {[
            { id: 'dashboard', label: t[lang].dashboard },
            { id: 'planning', label: t[lang].planning },
            { id: 'bookings', label: t[lang].bookings },
            { id: 'fleet', label: t[lang].fleet },
            { id: 'checkout', label: t[lang].checkout },
            { id: 'customers', label: t[lang].customers },
            { id: 'contracts', label: t[lang].contracts },
            { id: 'invoices', label: t[lang].invoices },
            { id: 'settings', label: t[lang].settings },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={'w-full text-left px-4 py-2.5 rounded-xl mb-1 transition-all ' +
                (tab === item.id ? 'bg-white/90 text-gray-800 font-semibold shadow-md' : 'text-white/90 hover:bg-white/20')}>
              {item.label}
            </button>
          ))}
        </nav>
        
        {/* User info & Logout */}
        <div className="p-3 border-t border-white/20">
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-white font-medium text-sm">{user?.firstName} {user?.lastName}</div>
            <div className="text-white/70 text-xs">{user?.role}</div>
            <div className="flex gap-1 mt-2">
              <button onClick={() => { setLang('fr'); localStorage.setItem('lang', 'fr') }}
                className={'flex-1 py-1 text-xs rounded transition ' + (lang === 'fr' ? 'bg-white text-gray-800 font-bold' : 'bg-white/30 text-white')}>
                🇫🇷 FR
              </button>
              <button onClick={() => { setLang('es'); localStorage.setItem('lang', 'es') }}
                className={'flex-1 py-1 text-xs rounded transition ' + (lang === 'es' ? 'bg-white text-gray-800 font-bold' : 'bg-white/30 text-white')}>
                🇪🇸 ES
              </button>
            </div>
            <button 
              type="button"
              onClick={() => { handleLogout(); }}
              className="mt-2 w-full py-2 bg-red-500/80 hover:bg-red-600 text-white text-sm rounded-lg transition font-medium"
            >
              {t[lang].logout}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white/95 backdrop-blur shadow-sm px-6 py-4 flex items-center gap-4 border-b border-gray-100">
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


  const handleFleetClick = (fleet, mode = 'view') => {
    setSelectedFleetForEdit(fleet)
    setFleetModalMode(mode)
    setShowFleetEdit(true)
  }

  const handleFleetDelete = () => {
    setShowFleetEdit(false)
    setSelectedFleetForEdit(null)
    loadData()
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


  const handleFleetClick = (fleet, mode = 'view') => {
    setSelectedFleetForEdit(fleet)
    setFleetModalMode(mode)
    setShowFleetEdit(true)
  }

  const handleFleetDelete = () => {
    setShowFleetEdit(false)
    setSelectedFleetForEdit(null)
    loadData()
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


  const handleFleetClick = (fleet, mode = 'view') => {
    setSelectedFleetForEdit(fleet)
    setFleetModalMode(mode)
    setShowFleetEdit(true)
  }

  const handleFleetDelete = () => {
    setShowFleetEdit(false)
    setSelectedFleetForEdit(null)
    loadData()
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


  const handleFleetClick = (fleet, mode = 'view') => {
    setSelectedFleetForEdit(fleet)
    setFleetModalMode(mode)
    setShowFleetEdit(true)
  }

  const handleFleetDelete = () => {
    setShowFleetEdit(false)
    setSelectedFleetForEdit(null)
    loadData()
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Flotte</h2>
                <button onClick={() => setShowNewFleet(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  + Nouveau véhicule
                </button>
              </div>
              
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'ALL', label: 'Tous', color: 'bg-gray-100 text-gray-700' },
                  { id: 'AVAILABLE', label: 'Disponibles', color: 'bg-green-100 text-green-700' },
                  { id: 'RENTED', label: 'En location', color: 'bg-blue-100 text-blue-700' },
                  { id: 'MAINTENANCE', label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
                  { id: 'OUT_OF_SERVICE', label: 'Hors service', color: 'bg-red-100 text-red-700' }
                ].map(s => (
                  <button key={s.id} onClick={() => setFleetStatusFilter(s.id)}
                    className={'px-3 py-1.5 rounded-lg text-sm font-medium transition ' + 
                      (fleetStatusFilter === s.id ? s.color + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
                    {s.label}
                    <span className="ml-1 text-xs opacity-70">
                      ({s.id === 'ALL' ? filteredFleet.length : filteredFleet.filter(f => f.status === s.id).length})
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFleet.filter(f => fleetStatusFilter === 'ALL' || f.status === fleetStatusFilter).map(f => (
                  <div key={f.id} className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition cursor-pointer"
                    onClick={() => handleFleetClick(f, 'view')}>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {f.vehicle?.imageUrl ? <img src={f.vehicle.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">🚲</span>}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{f.vehicleNumber}</div>
                        <div className="text-sm text-gray-600">{getName(f.vehicle?.name)}</div>
                        <div className="text-xs text-gray-500">{getName(f.vehicle?.category?.name)}</div>
                        <div className={'text-xs px-2 py-0.5 rounded inline-block mt-1 ' + 
                          (f.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 
                           f.status === 'RENTED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')}>
                          {f.status === 'AVAILABLE' ? 'Disponible' : f.status === 'RENTED' ? 'En location' : 'Maintenance'}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleFleetClick(f, 'edit') }} 
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                        Éditer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          

          {/* CHECKOUT */}
          {!loading && tab === 'checkout' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Check-out</h2>
              <p className="text-gray-600">Véhicules actuellement en location</p>
              
              {rentedBookings.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                  Aucun véhicule en location actuellement
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentedBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition cursor-pointer"
                      onClick={() => { setSelectedCheckoutBooking(booking); setShowCheckoutModal(true) }}>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {booking.fleetVehicle?.vehicle?.imageUrl ? (
                            <img src={booking.fleetVehicle.vehicle.imageUrl} className="w-full h-full object-cover" />
                          ) : <span className="text-2xl">🚲</span>}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{booking.fleetVehicle?.vehicleNumber}</div>
                          <div className="text-sm text-gray-600">{getName(booking.fleetVehicle?.vehicle?.name)}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.customer?.firstName} {booking.customer?.lastName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Depuis</div>
                          <div className="text-sm font-medium">{booking.startDate?.split('T')[0]}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            Retour prévu: {booking.endDate?.split('T')[0]}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {!loading && tab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Paramètres</h2>
                <a href="https://backoffice-vandm-production.up.railway.app/" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm flex items-center gap-2">
                  Ouvrir le Backoffice
                  <span>↗</span>
                </a>
              </div>
              
              {/* Onglets principaux */}
              <div className="flex gap-2 border-b pb-4">
                <button onClick={() => setSettingsMainTab('documents')}
                  className={'px-4 py-2 rounded-lg font-medium ' + (settingsMainTab === 'documents' ? 'bg-gradient-to-r from-cyan-500 to-orange-400 text-white' : 'bg-gray-100 hover:bg-gray-200')}>
                  📄 Documents légaux
                </button>
                <button onClick={() => setSettingsMainTab('users')}
                  className={'px-4 py-2 rounded-lg font-medium ' + (settingsMainTab === 'users' ? 'bg-gradient-to-r from-cyan-500 to-orange-400 text-white' : 'bg-gray-100 hover:bg-gray-200')}>
                  👥 Utilisateurs & Rôles
                </button>
              </div>

              {/* ===== ONGLET DOCUMENTS LÉGAUX ===== */}
              {settingsMainTab === 'documents' && (
                <>
                  {/* Sélecteur de marque */}
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => { setSettingsTab('voltride'); loadBrandSettings('VOLTRIDE') }} 
                      className={'px-4 py-2 rounded-lg font-medium flex items-center gap-2 ' + (settingsTab === 'voltride' ? 'bg-blue-600 text-white' : 'bg-gray-100')}>
                      <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766928342/d5uv1qrfwr86rd1abtd1.png" className="h-6" alt="Voltride" />
                      Voltride
                    </button>
                    <button onClick={() => { setSettingsTab('motorrent'); loadBrandSettings('MOTOR-RENT') }} 
                      className={'px-4 py-2 rounded-lg font-medium flex items-center gap-2 ' + (settingsTab === 'motorrent' ? 'bg-orange-600 text-white' : 'bg-gray-100')}>
                      <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766930480/logo-2024-e1699439584325-removebg-preview_sv6yxg.png" className="h-6" alt="Motor-Rent" />
                      Motor-Rent
                    </button>
                  </div>

              {/* Sélecteur de section */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'cgvResume', label: '📄 CGV Résumé', desc: 'Version courte pour le contrat' },
                  { id: 'cgvComplete', label: '📋 CGV Complètes', desc: 'Version complète (verso)' },
                  { id: 'rgpd', label: '🔒 RGPD', desc: 'Politique de confidentialité' },
                  { id: 'mentionsLegales', label: '⚖️ Mentions Légales', desc: 'Pour les factures' }
                ].map(s => (
                  <button key={s.id} onClick={() => setSettingsSection(s.id)}
                    className={'px-3 py-2 rounded-lg text-sm ' + (settingsSection === s.id ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200')}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Zone d'édition */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-2">
                  {settingsSection === 'cgvResume' && '📄 Conditions Générales de Vente - Résumé'}
                  {settingsSection === 'cgvComplete' && '📋 Conditions Générales de Vente - Complètes'}
                  {settingsSection === 'rgpd' && '🔒 Politique RGPD'}
                  {settingsSection === 'mentionsLegales' && '⚖️ Mentions Légales'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {settingsSection === 'cgvResume' && 'Version courte affichée sur le recto du contrat de location'}
                  {settingsSection === 'cgvComplete' && 'Version complète affichée au verso du contrat'}
                  {settingsSection === 'rgpd' && 'Politique de protection des données personnelles'}
                  {settingsSection === 'mentionsLegales' && 'Mentions légales pour les factures et documents officiels'}
                </p>
                <div className="space-y-4">
                  {['fr', 'es', 'en'].map(lang => (
                    <div key={lang}>
                      <label className="block text-sm font-medium mb-1">
                        {lang === 'fr' ? '🇫🇷 Français' : lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                      </label>
                      <textarea
                        value={settings[settingsTab]?.[settingsSection]?.[lang] || ''}
                        onChange={e => setSettings({
                          ...settings, 
                          [settingsTab]: {
                            ...settings[settingsTab], 
                            [settingsSection]: {
                              ...settings[settingsTab]?.[settingsSection], 
                              [lang]: e.target.value
                            }
                          }
                        })}
                        className="w-full border rounded-lg p-3 h-40 font-mono text-sm"
                        placeholder={`Entrez le texte en ${lang === 'fr' ? 'français' : lang === 'es' ? 'espagnol' : 'anglais'}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <button onClick={handleSaveSettings} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  💾 Sauvegarder les paramètres
                </button>
                <button onClick={() => loadBrandSettings(settingsTab === 'voltride' ? 'VOLTRIDE' : 'MOTOR-RENT')} 
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  🔄 Recharger
                </button>
              </div>
                </>
              )}

              {/* ===== ONGLET UTILISATEURS & RÔLES ===== */}
              {settingsMainTab === 'users' && (
                <div className="space-y-6">
                  {/* Gestion des permissions par rôle */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">🔐 Permissions par rôle</h3>
                      <button onClick={async () => { await api.initPermissions(); loadPermissions(); }} 
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm">
                        🔄 Réinitialiser
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Permission</th>
                            <th className="text-center py-2 px-3">ADMIN</th>
                            <th className="text-center py-2 px-3">MANAGER</th>
                            <th className="text-center py-2 px-3">OPERATOR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['dashboard', 'planning', 'bookings', 'fleet', 'checkout', 'customers', 'contracts', 'invoices', 'settings', 'users'].map(perm => (
                            <tr key={perm} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium capitalize">{perm === 'bookings' ? 'Réservations' : perm === 'fleet' ? 'Flotte' : perm === 'checkout' ? 'Check-out' : perm === 'customers' ? 'Clients' : perm === 'contracts' ? 'Contrats' : perm === 'invoices' ? 'Factures' : perm === 'settings' ? 'Paramètres' : perm === 'users' ? 'Utilisateurs' : perm}</td>
                              {['ADMIN', 'MANAGER', 'OPERATOR'].map(role => (
                                <td key={role} className="text-center py-2 px-3">
                                  <input 
                                    type="checkbox" 
                                    checked={permissions.find(p => p.role === role && p.permission === perm)?.allowed ?? (role === 'ADMIN')}
                                    onChange={async (e) => {
                                      await api.updatePermission(role, perm, e.target.checked)
                                      loadPermissions()
                                    }}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Liste des utilisateurs */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">👥 Utilisateurs</h3>
                      <button onClick={() => setShowNewUserModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        + Nouvel utilisateur
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-3">Nom</th>
                            <th className="text-left py-3 px-3">Email</th>
                            <th className="text-left py-3 px-3">Rôle</th>
                            <th className="text-left py-3 px-3">Marques</th>
                            <th className="text-left py-3 px-3">Statut</th>
                            <th className="text-center py-3 px-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(u => (
                            <tr key={u.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-3 font-medium">{u.firstName} {u.lastName}</td>
                              <td className="py-3 px-3 text-gray-600">{u.email}</td>
                              <td className="py-3 px-3">
                                <span className={'px-2 py-1 rounded text-xs font-medium ' + 
                                  (u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-gray-600 text-xs">{u.brands?.join(', ')}</td>
                              <td className="py-3 px-3">
                                <span className={'px-2 py-1 rounded text-xs ' + (u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                                  {u.isActive ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button onClick={() => { setEditingUser(u); setShowNewUserModal(true) }} className="text-blue-600 hover:underline mr-2">Modifier</button>
                                {u.id !== user?.id && <button onClick={async () => { if(confirm('Supprimer cet utilisateur ?')) { await api.deleteUser(u.id); loadUsers() }}} className="text-red-600 hover:underline">Supprimer</button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Modal Nouvel Utilisateur */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editingUser ? '✏️ Modifier utilisateur' : '➕ Nouvel utilisateur'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = new FormData(form)
              const data = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                password: formData.get('password') || undefined,
                role: formData.get('role'),
                brands: Array.from(form.querySelectorAll('input[name="brands"]:checked')).map((el: any) => el.value),
                isActive: (form.querySelector('input[name="isActive"]') as HTMLInputElement)?.checked ?? true
              }
              if (editingUser) {
                if (!data.password) delete data.password
                await api.updateUser(editingUser.id, data)
              } else {
                await api.createUser(data)
              }
              setShowNewUserModal(false)
              setEditingUser(null)
              loadUsers()
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom</label>
                  <input name="firstName" defaultValue={editingUser?.firstName || ''} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input name="lastName" defaultValue={editingUser?.lastName || ''} required className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input name="email" type="email" defaultValue={editingUser?.email || ''} required className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}</label>
                <input name="password" type="password" required={!editingUser} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select name="role" defaultValue={editingUser?.role || 'OPERATOR'} className="w-full border rounded-lg px-3 py-2">
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OPERATOR">Opérateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marques autorisées</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="brands" value="VOLTRIDE" defaultChecked={editingUser?.brands?.includes('VOLTRIDE') ?? true} className="w-4 h-4" />
                    <span>Voltride</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="brands" value="MOTOR-RENT" defaultChecked={editingUser?.brands?.includes('MOTOR-RENT') ?? true} className="w-4 h-4" />
                    <span>Motor-Rent</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" defaultChecked={editingUser?.isActive ?? true} className="w-4 h-4" />
                  <span className="text-sm font-medium">Utilisateur actif</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingUser ? 'Enregistrer' : 'Créer'}
                </button>
                <button type="button" onClick={() => { setShowNewUserModal(false); setEditingUser(null) }} className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* CheckOut Modal */}
      {showCheckoutModal && selectedCheckoutBooking && (
        <CheckOutModal
          booking={selectedCheckoutBooking}
          brand={brand}
          onClose={() => { setShowCheckoutModal(false); setSelectedCheckoutBooking(null) }}
          onComplete={() => { setShowCheckoutModal(false); setSelectedCheckoutBooking(null); loadData() }}
        />
      )}

      {/* New Fleet Modal */}
      {showNewFleet && (
        <NewFleetModal
          agencyId={selectedAgency || agencies[0]?.id}
          onClose={() => setShowNewFleet(false)}
          onSave={() => { setShowNewFleet(false); loadData() }}
        />
      )}

      {/* Fleet Edit Modal */}
      {showFleetEdit && selectedFleetForEdit && (
        <FleetEditModal
          fleet={selectedFleetForEdit}
          mode={fleetModalMode}
          onClose={() => { setShowFleetEdit(false); setSelectedFleetForEdit(null) }}
          onSave={() => { setShowFleetEdit(false); setSelectedFleetForEdit(null); loadData() }}
          onDelete={handleFleetDelete}
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
