import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import { Login } from './Login'
import { CheckInModal } from './CheckInModal'
import { NewBookingModal } from './NewBookingModal'
import { FleetEditModal } from './FleetEditModal'
import { NewFleetModal } from './NewFleetModal'
import { CheckOutModal } from './CheckOutModal'
import { getName } from './types'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

export default function App() {
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [lang, setLang] = useState<'fr' | 'es'>(() => (localStorage.getItem('lang') as 'fr' | 'es') || 'es')
  
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
      inactive: 'Inactif',
      vehicle: 'Véhicule',
      today: "Aujourd'hui",
      previous: 'Précédent',
      next: 'Suivant',
      confirmed: 'Confirmé',
      confirmedAlt: 'Confirmé (alt)',
      checkedIn: 'Check-in fait',
      dragTip: 'Glissez-déposez pour déplacer • Tirez les bords pour étendre • Double-clic pour check-in • Clic droit pour options',
      openBackoffice: 'Ouvrir le Backoffice',
      cgvResume: 'CGV Résumé',
      cgvComplete: 'CGV Complètes',
      rgpd: 'RGPD',
      legalMentions: 'Mentions Légales',
      french: 'Français',
      spanish: 'Español',
      english: 'English',
      enterText: 'Entrez le texte en',
      saveSettings: 'Sauvegarder les paramètres',
      reload: 'Recharger',
      editUser: 'Modifier utilisateur',
      newPassword: 'Nouveau mot de passe (laisser vide pour ne pas changer)',
      authorizedBrands: 'Marques autorisées',
      activeUser: 'Utilisateur actif',
      confirmDelete: 'Supprimer cet utilisateur ?',
      module: 'Module',
      toDevelop: 'À développer',
      walkin: 'Walk-in',
      checkin: 'Check-in',
      language: 'Langue',
      contractNumber: "N° Contrat",
      client: "Client",
      vehicleContract: "Véhicule",
      period: "Période",
      amount: "Montant",
      contractStatus: "Statut",
      filterByPeriod: "Filtrer par période",
      from: "Du",
      to: "Au",
      allStatuses: "Tous les statuts",
      draft: "Brouillon",
      completed: "Terminé",
      cancelled: "Annulé",
      viewContract: "Voir contrat",
      downloadPdf: "Télécharger PDF",
      downloadInvoice: "Télécharger facture",
      noContracts: "Aucun contrat trouvé",
      noInvoices: "Aucune facture trouvée",
      totalHT: "Total HT",
      tva: "TVA",
      totalTTC: "Total TTC",
      deposit: "Caution",
      invoiceNumber: "N° Facture",
      invoiceDate: "Date facture",
      dueDate: "Échéance",
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
      inactive: 'Inactivo',
      vehicle: 'Vehículo',
      today: 'Hoy',
      previous: 'Anterior',
      next: 'Siguiente',
      confirmed: 'Confirmado',
      confirmedAlt: 'Confirmado (alt)',
      checkedIn: 'Check-in hecho',
      dragTip: 'Arrastre para mover • Tire los bordes para extender • Doble clic para check-in • Clic derecho para opciones',
      openBackoffice: 'Abrir Backoffice',
      cgvResume: 'CGV Resumen',
      cgvComplete: 'CGV Completas',
      rgpd: 'RGPD',
      legalMentions: 'Menciones Legales',
      french: 'Français',
      spanish: 'Español',
      english: 'English',
      enterText: 'Ingrese el texto en',
      saveSettings: 'Guardar ajustes',
      reload: 'Recargar',
      editUser: 'Editar usuario',
      newPassword: 'Nueva contraseña (dejar vacío para no cambiar)',
      authorizedBrands: 'Marcas autorizadas',
      activeUser: 'Usuario activo',
      confirmDelete: '¿Eliminar este usuario?',
      module: 'Módulo',
      toDevelop: 'Por desarrollar',
      walkin: 'Walk-in',
      checkin: 'Check-in',
      language: 'Idioma',
      contractNumber: "N° Contrato",
      client: "Cliente",
      vehicleContract: "Vehículo",
      period: "Período",
      amount: "Importe",
      contractStatus: "Estado",
      filterByPeriod: "Filtrar por período",
      from: "Desde",
      to: "Hasta",
      allStatuses: "Todos los estados",
      draft: "Borrador",
      completed: "Completado",
      cancelled: "Cancelado",
      viewContract: "Ver contrato",
      downloadPdf: "Descargar PDF",
      downloadInvoice: "Descargar factura",
      noContracts: "Ningún contrato encontrado",
      noInvoices: "Ninguna factura encontrada",
      totalHT: "Total sin IVA",
      tva: "IVA",
      totalTTC: "Total con IVA",
      deposit: "Depósito",
      invoiceNumber: "N° Factura",
      invoiceDate: "Fecha factura",
      dueDate: "Vencimiento",
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
    if (userData.language) {
      setLang(userData.language as 'fr' | 'es')
      localStorage.setItem('lang', userData.language)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    window.location.reload()
  }

  const [tab, setTab] = useState('planning')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [brand, setBrand] = useState('VOLTRIDE')
  const [agencies, setAgencies] = useState([])
  const [allAgencies, setAllAgencies] = useState([])
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
  const [assigningBooking, setAssigningBooking] = useState<any>(null)
  const [availableFleetForAssign, setAvailableFleetForAssign] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL')
  const [bookingAssignFilter, setBookingAssignFilter] = useState('ALL')
  const [bookingSourceFilter, setBookingSourceFilter] = useState('ALL')
  const [fleetStatusFilter, setFleetStatusFilter] = useState('ALL')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedCheckoutBooking, setSelectedCheckoutBooking] = useState(null)
  const [newBookingData, setNewBookingData] = useState(null)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInBooking, setCheckInBooking] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showBookingDetail, setShowBookingDetail] = useState(false)
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null)
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
  const [contracts, setContracts] = useState<any[]>([])
  const [contractsFilter, setContractsFilter] = useState({ startDate: "", endDate: "", status: "" })
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => { loadData() }, [selectedAgency, brand])
  useEffect(() => { if (tab === "contracts" || tab === "invoices") loadContracts() }, [tab, brand])
  // Charger les permissions
  const loadPermissions = async () => {
    try {
      const data = await api.getPermissions()
      setPermissions(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Erreur chargement permissions:', e) }
  }

  // Ouvrir le modal d'assignation
  const openAssignModal = async (booking: any) => {
    setAssigningBooking(booking)
    // Charger les véhicules Fleet disponibles pour ce type de véhicule et ces dates
    try {
      const vehicleTypeId = booking.items?.[0]?.vehicleId
      const res = await fetch(API_URL + '/api/fleet?agencyId=' + booking.agencyId)
      const allFleet = await res.json()
      // Filtrer par type de véhicule et disponibilité
      const available = allFleet.filter((f: any) => 
        f.vehicleId === vehicleTypeId && 
        (f.status === 'AVAILABLE' || f.status === 'RESERVED')
      )
      setAvailableFleetForAssign(available)
    } catch (e) { console.error(e) }
  }

  // Assigner un véhicule à une réservation
  const assignVehicle = async (fleetId: string) => {
    if (!assigningBooking) return
    try {
      await fetch(API_URL + '/api/bookings/' + assigningBooking.id + '/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleetVehicleId: fleetId })
      })
      setAssigningBooking(null)
      loadData()
    } catch (e) { console.error(e) }
  }

  // Charger les clients
  const loadCustomers = async () => {
    try {
      const res = await fetch(API_URL + '/api/customers')
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Erreur chargement clients:', e) }
  }

  // Supprimer un client
  const deleteCustomer = async (customerId: string) => {
    if (!confirm(lang === 'fr' ? 'Supprimer ce client et toutes ses données ?' : '¿Eliminar este cliente y todos sus datos?')) return
    try {
      await fetch(API_URL + '/api/customers/' + customerId, { method: 'DELETE' })
      loadCustomers()
      setSelectedCustomer(null)
    } catch (e) { console.error(e) }
  }

  // Sauvegarder un client
  const saveCustomer = async (customerData: any) => {
    try {
      const method = editingCustomer ? 'PUT' : 'POST'
      const url = editingCustomer ? API_URL + '/api/customers/' + editingCustomer.id : API_URL + '/api/customers'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      })
      loadCustomers()
      setShowCustomerModal(false)
      setEditingCustomer(null)
    } catch (e) { console.error(e) }
  }

  // Supprimer une réservation
  const deleteBooking = async (bookingId: string) => {
    if (!confirm(lang === 'fr' ? 'Supprimer cette réservation ?' : '¿Eliminar esta reserva?')) return
    try {
      await fetch(API_URL + '/api/bookings/' + bookingId, { method: 'DELETE' })
      loadData()
    } catch (e) { console.error(e) }
  }

  // Charger les utilisateurs
  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsersList(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Erreur chargement utilisateurs:', e) }
  }
  const loadContracts = async () => {
    try {
      const res = await fetch(API_URL + "/api/contracts")
      const data = await res.json()
      setContracts(Array.isArray(data) ? data.filter(c => c.agency?.brand === brand) : [])
    } catch (e) { console.error("Erreur chargement contrats:", e) }
  }

  // Vérifier si l'utilisateur a accès à une permission
  const hasPermission = (permissionId: string): boolean => {
    if (!user) return false
    // Admin a toujours accès à tout
    if (user.role === 'ADMIN') return true
    // Chercher dans les permissions chargées
    const perm = permissions.find(p => p.role === user.role && p.permission === permissionId)
    if (perm) return perm.allowed
    // Permissions par défaut si pas trouvé
    const defaults: Record<string, string[]> = {
      MANAGER: ['dashboard', 'planning', 'bookings', 'fleet', 'checkout', 'customers', 'contracts', 'invoices'],
      OPERATOR: ['dashboard', 'planning', 'bookings', 'checkout'],
      COLLABORATOR: ['planning', 'fleet', 'checkout', 'contracts'],
      FRANCHISEE: ['dashboard', 'planning', 'bookings', 'fleet', 'checkout', 'customers', 'contracts', 'invoices']
    }
    return defaults[user.role]?.includes(permissionId) ?? false
  }

  useEffect(() => { 
    loadBrandSettings('VOLTRIDE')
    loadBrandSettings('MOTOR-RENT')
    loadPermissions()
    loadUsers()
    loadCustomers()
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
        api.getFleet({}),
        api.getBookings(selectedAgency ? { agencyId: selectedAgency } : {})
      ])
      
      // Filtrer selon le role utilisateur
      let filteredAgencies = agenciesData.filter(a => a.brand === brand)
      let filteredFleet = Array.isArray(fleetData) ? fleetData.filter(f => f.agency?.brand === brand || !brand) : []
      let filteredBookings = Array.isArray(bookingsData) ? bookingsData.filter(b => b.agency?.brand === brand) : []
      
      // COLLABORATOR et FRANCHISEE: ne voir que leur agence
      if (user && (user.role === 'COLLABORATOR' || user.role === 'FRANCHISEE')) {
        const userAgencyIds = user.agencyIds || []
        filteredAgencies = filteredAgencies.filter(a => userAgencyIds.includes(a.id))
        filteredFleet = filteredFleet.filter(f => userAgencyIds.includes(f.agency?.id))
        filteredBookings = filteredBookings.filter(b => userAgencyIds.includes(b.agencyId))
      }
      
      setAgencies(filteredAgencies)
      setAllAgencies(agenciesData)
      setFleet(filteredFleet)
      setBookings(filteredBookings)
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
      alert(lang === 'fr' ? '✅ Paramètres sauvegardés avec succès !' : '✅ Ajustes guardados con éxito!')
    } catch (e) {
      console.error('Erreur sauvegarde:', e)
      alert('❌ Erreur lors de la sauvegarde')
    }
  }

  const formatDate = (d) => d.toISOString().split('T')[0]
  const today = formatDate(new Date())
  const todayDepartures = bookings.filter(b => b.startDate?.split('T')[0] === today && !b.checkedIn)
  const todayReturns = bookings.filter(b => b.endDate?.split('T')[0] === today && b.checkedIn && !b.checkedOut)
  const selectedAgencyData = agencies.find(a => a.id === selectedAgency)
  const filteredFleet = fleet.filter(f => {
    if (!selectedAgency) return true
    // Filtrer UNIQUEMENT par locationCode qui correspond au code de l'agence
    if (selectedAgencyData && f.locationCode === selectedAgencyData.code) return true
    // Si pas de locationCode défini, afficher le véhicule partout
    if (!f.locationCode) return true
    return false
  })
  
  // Vehicles currently rented (for checkout)
  const rentedBookings = bookings.filter(b => 
    b.checkedIn && !b.checkedOut && 
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

  // Créer un contrat depuis une réservation
  const createContractFromBooking = async (booking) => {
    if (!booking.fleetVehicleId) {
      alert(lang === 'fr' ? 'Veuillez d\'abord assigner un véhicule' : 'Por favor asigne un vehículo primero')
      return
    }
    
    const assignedVehicle = fleet.find(f => f.id === booking.fleetVehicleId)
    if (!assignedVehicle) {
      alert(lang === 'fr' ? 'Véhicule non trouvé' : 'Vehículo no encontrado')
      return
    }
    
    // Calculer le nombre de jours
    const start = new Date(booking.startDate)
    const end = new Date(booking.endDate)
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
    
    // Calculer les montants
    const subtotal = booking.totalPrice || 0
    const optionsTotal = booking.options?.reduce((sum, opt) => sum + (opt.totalPrice || 0), 0) || 0
    const taxRate = 21
    const taxAmount = Math.round((subtotal + optionsTotal) * taxRate) / 100
    const totalAmount = subtotal + optionsTotal + taxAmount
    const depositAmount = booking.depositAmount || assignedVehicle.vehicle?.deposit || 100
    const dailyRate = totalDays > 0 ? Math.round(subtotal / totalDays * 100) / 100 : subtotal
    
    try {
      const res = await fetch('https://api-voltrideandmotorrent-production.up.railway.app/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          fleetVehicleId: booking.fleetVehicleId,
          agencyId: booking.agencyId,
          customer: {
            firstName: booking.customer?.firstName,
            lastName: booking.customer?.lastName,
            email: booking.customer?.email,
            phone: booking.customer?.phone,
            address: booking.customer?.address,
            postalCode: booking.customer?.postalCode,
            city: booking.customer?.city,
            country: booking.customer?.country || 'ES',
            language: booking.language || 'es'
          },
          startDate: booking.startDate,
          endDate: booking.endDate,
          source: booking.source || 'WIDGET',
          dailyRate,
          totalDays,
          subtotal,
          optionsTotal,
          taxRate,
          taxAmount,
          totalAmount,
          depositAmount
        })
      })
      
      const contract = await res.json()
      
      if (contract.error) {
        throw new Error(contract.error)
      }
      
      alert(lang === 'fr' 
        ? `✅ Contrat ${contract.contractNumber} créé avec succès!` 
        : `✅ Contrato ${contract.contractNumber} creado con éxito!`)
      
      setShowBookingDetail(false)
      loadData()
      
    } catch (error) {
      console.error('Erreur création contrat:', error)
      alert(lang === 'fr' ? '❌ Erreur lors de la création du contrat' : '❌ Error al crear el contrato')
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
    <div className="flex h-screen bg-gray-100 relative">
      {/* Sidebar */}
      <div className={(mobileMenuOpen ? "translate-x-0" : "-translate-x-full") + " md:translate-x-0 fixed md:relative z-40 w-56 flex flex-col shadow-xl transition-transform duration-300"} style={{ background: 'linear-gradient(180deg, #abdee6 0%, #ffaf10 100%)' }}>
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
          ].filter(item => hasPermission(item.id)).map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); setMobileMenuOpen(false) }}
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

      {/* Mobile overlay */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
      {/* Main content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 w-full">
        <div className="bg-white/95 backdrop-blur shadow-sm px-4 md:px-6 py-4 flex items-center gap-4 border-b border-gray-100">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <select value={selectedAgency} onChange={e => setSelectedAgency(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">{t[lang].allAgencies}</option>
            {allAgencies
              .filter((a: any) => a.brand === brand)
              .filter((a: any) => {
                if (user && (user.role === 'COLLABORATOR' || user.role === 'FRANCHISEE')) {
                  return user.agencyIds?.includes(a.id)
                }
                return true
              })
              .map((a: any) => <option key={a.id} value={a.id}>{getName(a.name, lang)}{a.agencyType && a.agencyType !== 'OWN' ? (a.agencyType === 'PARTNER' ? ' (P)' : ' (F)') : ''}</option>)}
          </select>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div className="p-6">
          {loading && <div className="text-center py-10">⏳ {t[lang].loading}</div>}

          {/* DASHBOARD */}
          {!loading && tab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{t[lang].dashboard}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg">
                  <div className="text-4xl font-bold text-blue-600">{todayDepartures.length}</div>
                  <div className="text-gray-600 mb-4">{t[lang].todayDepartures}</div>
                  {todayDepartures.slice(0, 5).map(b => (
                    <div key={b.id} className="flex justify-between py-1 text-sm border-t">
                      <span>{b.startTime} - {b.customer?.lastName}</span>
                      <span className="text-gray-500">{getName(b.items?.[0]?.vehicle?.name)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg">
                  <div className="text-4xl font-bold text-green-600">{todayReturns.length}</div>
                  <div className="text-gray-600 mb-4">{t[lang].todayReturns}</div>
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
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold">Planning</h2>
                <div className="flex items-center gap-2 text-xs md:text-sm flex-wrap">
                  <span className="w-4 h-4 rounded bg-blue-500"></span> {t[lang].confirmed}
                  <span className="w-4 h-4 rounded bg-violet-500 ml-2"></span> {t[lang].confirmedAlt}
                  <span className="w-4 h-4 rounded bg-green-600 ml-2"></span> {t[lang].checkedIn}
                </div>
                <div className="flex-1" />
                <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })} 
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">← {t[lang].previous}</button>
                <button onClick={() => setWeekStart(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d })} 
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">{t[lang].today}</button>
                <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })} 
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">{t[lang].next} →</button>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full border-collapse" style={{ minWidth: '1000px' }}>
                    <thead className="sticky top-0 z-30 bg-gray-50">
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-medium w-44 z-20 border-r">{t[lang].vehicle}</th>
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
                              {isToday && <div className="text-xs text-yellow-600">{t[lang].today}</div>}
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
                                      onClick={() => { setSelectedBookingDetail(cellBooking); setShowBookingDetail(true) }}
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
                {t[lang].dragTip}
              </p>
            </div>
          )}

          {/* BOOKINGS */}
{!loading && tab === 'bookings' && (
  <div className="space-y-4">
    {/* Header avec titre et recherche */}
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">{lang === "fr" ? "Réservations" : "Reservas"}</h2>
      <input
        type="text"
        placeholder={lang === 'fr' ? "Rechercher (nom, email, tel, ref...)" : "Buscar (nombre, email, tel, ref...)"}
        value={bookingSearch}
        onChange={(e) => setBookingSearch(e.target.value)}
        className="px-4 py-2 border rounded-lg w-80 text-sm"
      />
    </div>
    
    {/* Filtres */}
    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow">
      {/* Filtre par statut */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">{lang === 'fr' ? 'Statut:' : 'Estado:'}</span>
        <div className="flex gap-1">
          {[
            { id: 'ALL', label: lang === 'fr' ? 'Tous' : 'Todos', color: 'bg-gray-100 text-gray-700' },
            { id: 'PENDING', label: lang === 'fr' ? 'En attente' : 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
            { id: 'CONFIRMED', label: lang === 'fr' ? 'Confirmé' : 'Confirmado', color: 'bg-green-100 text-green-700' },
            { id: 'CANCELLED', label: lang === 'fr' ? 'Annulé' : 'Cancelado', color: 'bg-red-100 text-red-700' },
          ].map(s => (
            <button key={s.id} onClick={() => setBookingStatusFilter(s.id)}
              className={'px-3 py-1 rounded-lg text-xs font-medium transition ' + 
                (bookingStatusFilter === s.id ? s.color + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Filtre par assignation */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">{lang === 'fr' ? 'Véhicule:' : 'Vehículo:'}</span>
        <div className="flex gap-1">
          {[
            { id: 'ALL', label: lang === 'fr' ? 'Tous' : 'Todos' },
            { id: 'ASSIGNED', label: lang === 'fr' ? 'Assigné' : 'Asignado' },
            { id: 'UNASSIGNED', label: lang === 'fr' ? 'Non assigné' : 'Sin asignar' },
          ].map(s => (
            <button key={s.id} onClick={() => setBookingAssignFilter(s.id)}
              className={'px-3 py-1 rounded-lg text-xs font-medium transition ' + 
                (bookingAssignFilter === s.id ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Filtre par source */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">Source:</span>
        <div className="flex gap-1">
          {[
            { id: 'ALL', label: lang === 'fr' ? 'Toutes' : 'Todas' },
            { id: 'WIDGET', label: 'Widget' },
            { id: 'WALK_IN', label: 'Walk-in' },
          ].map(s => (
            <button key={s.id} onClick={() => setBookingSourceFilter(s.id)}
              className={'px-3 py-1 rounded-lg text-xs font-medium transition ' + 
                (bookingSourceFilter === s.id ? 'bg-purple-100 text-purple-700 ring-2 ring-offset-1 ring-purple-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Compteur */}
      <div className="ml-auto text-sm text-gray-500">
        {bookings.filter(b => {
          if (bookingSearch) {
            const search = bookingSearch.toLowerCase()
            const matchesSearch = (
              b.reference?.toLowerCase().includes(search) ||
              b.customer?.firstName?.toLowerCase().includes(search) ||
              b.customer?.lastName?.toLowerCase().includes(search) ||
              b.customer?.email?.toLowerCase().includes(search) ||
              b.customer?.phone?.toLowerCase().includes(search)
            )
            if (!matchesSearch) return false
          }
          if (bookingStatusFilter !== 'ALL' && b.status !== bookingStatusFilter) return false
          if (bookingAssignFilter === 'ASSIGNED' && !b.fleetVehicleId) return false
          if (bookingAssignFilter === 'UNASSIGNED' && b.fleetVehicleId) return false
          if (bookingSourceFilter !== 'ALL' && b.source !== bookingSourceFilter) return false
          return true
        }).length} {lang === 'fr' ? 'réservation(s)' : 'reserva(s)'}
      </div>
    </div>
    
    {/* Tableau */}
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Référence</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Dates</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{t[lang].vehicle}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{lang === 'fr' ? 'Véhicule assigné' : 'Vehículo asignado'}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{t[lang].status}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Source</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{t[lang].actions}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.filter(b => {
            if (bookingSearch) {
              const search = bookingSearch.toLowerCase()
              const matchesSearch = (
                b.reference?.toLowerCase().includes(search) ||
                b.customer?.firstName?.toLowerCase().includes(search) ||
                b.customer?.lastName?.toLowerCase().includes(search) ||
                b.customer?.email?.toLowerCase().includes(search) ||
                b.customer?.phone?.toLowerCase().includes(search)
              )
              if (!matchesSearch) return false
            }
            if (bookingStatusFilter !== 'ALL' && b.status !== bookingStatusFilter) return false
            if (bookingAssignFilter === 'ASSIGNED' && !b.fleetVehicleId) return false
            if (bookingAssignFilter === 'UNASSIGNED' && b.fleetVehicleId) return false
            if (bookingSourceFilter !== 'ALL' && b.source !== bookingSourceFilter) return false
            return true
          }).length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                {lang === 'fr' ? 'Aucune réservation trouvée' : 'No se encontraron reservas'}
              </td>
            </tr>
          ) : (
            bookings.filter(b => {
              if (bookingSearch) {
                const search = bookingSearch.toLowerCase()
                const matchesSearch = (
                  b.reference?.toLowerCase().includes(search) ||
                  b.customer?.firstName?.toLowerCase().includes(search) ||
                  b.customer?.lastName?.toLowerCase().includes(search) ||
                  b.customer?.email?.toLowerCase().includes(search) ||
                  b.customer?.phone?.toLowerCase().includes(search)
                )
                if (!matchesSearch) return false
              }
              if (bookingStatusFilter !== 'ALL' && b.status !== bookingStatusFilter) return false
              if (bookingAssignFilter === 'ASSIGNED' && !b.fleetVehicleId) return false
              if (bookingAssignFilter === 'UNASSIGNED' && b.fleetVehicleId) return false
              if (bookingSourceFilter !== 'ALL' && b.source !== bookingSourceFilter) return false
              return true
            }).map(b => {
              const assignedVehicle = fleet.find(f => f.id === b.fleetVehicleId)
              return (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-medium">{b.reference}</td>
                  <td className="px-4 py-3">
                    <div>{b.customer?.firstName} {b.customer?.lastName}</div>
                    <div className="text-xs text-gray-500">{b.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>{new Date(b.startDate).toLocaleDateString('fr-FR')} {b.startTime}</div>
                    <div className="text-gray-500">→ {new Date(b.endDate).toLocaleDateString('fr-FR')} {b.endTime}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{getName(b.items?.[0]?.vehicle?.name)}</td>
                  <td className="px-4 py-3">
                    {assignedVehicle ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {assignedVehicle.vehicleNumber}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                        {lang === 'fr' ? 'Non assigné' : 'Sin asignar'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={'px-2 py-1 rounded text-xs font-medium ' + 
                      (b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                       b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                       b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={'px-2 py-1 rounded text-xs ' + 
                      (b.source === 'WIDGET' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                      {b.source || 'WIDGET'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!b.fleetVehicleId && (
                        <button onClick={(e) => { e.stopPropagation(); openAssignModal(b) }} 
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                          {lang === 'fr' ? 'Assigner' : 'Asignar'}
                        </button>
                      )}
                      {b.fleetVehicleId && b.status === 'CONFIRMED' && !b.checkedIn && (
                        <button onClick={() => { setCheckInBooking(b); setShowCheckIn(true) }} 
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                          Check-in
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteBooking(b.id) }} 
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

          {/* FLEET */}
          {!loading && tab === 'fleet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Flotte</h2>
                {user?.role !== 'COLLABORATOR' && (
                  <button onClick={() => setShowNewFleet(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    + Nouveau véhicule
                  </button>
                )}
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
              <p className="text-gray-600">{lang === "fr" ? "Véhicules actuellement en location" : "Vehículos actualmente en alquiler"}</p>
              
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
                          <div className="text-sm font-medium">{new Date(booking.startDate).toLocaleDateString('fr-FR')}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            Retour prévu: {new Date(booking.endDate).toLocaleDateString('fr-FR')}
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
                <h2 className="text-2xl font-bold">{t[lang].settings}</h2>
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
                      <h3 className="text-lg font-bold">🔐 {t[lang].permissions}</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-30 bg-gray-50">
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">{lang === "fr" ? "Permission" : "Permiso"}</th>
                            <th className="text-center py-2 px-3">ADMIN</th>
                            <th className="text-center py-2 px-3">MANAGER</th>
                            <th className="text-center py-2 px-3">OPERATOR</th>
                            <th className="text-center py-2 px-3">COLLABORATOR</th>
                            <th className="text-center py-2 px-3">FRANCHISEE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['dashboard', 'planning', 'bookings', 'fleet', 'checkout', 'customers', 'contracts', 'invoices', 'settings', 'users'].map(perm => (
                            <tr key={perm} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium capitalize">{t[lang][perm] || perm}</td>
                              {['ADMIN', 'MANAGER', 'OPERATOR', 'COLLABORATOR', 'FRANCHISEE'].map(role => (
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
                      <h3 className="text-lg font-bold">👥 {t[lang].users}</h3>
                      <button onClick={() => setShowNewUserModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        + Nouvel utilisateur
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-30 bg-gray-50">
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-3">{t[lang].lastName}</th>
                            <th className="text-left py-3 px-3">{t[lang].email}</th>
                            <th className="text-left py-3 px-3">{t[lang].role}</th>
                            <th className="text-left py-3 px-3">{t[lang].brands}</th>
                            <th className="text-left py-3 px-3">{t[lang].status}</th>
                            <th className="text-center py-3 px-3">{t[lang].actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(u => (
                            <tr key={u.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-3 font-medium">{u.firstName} {u.lastName}</td>
                              <td className="py-3 px-3 text-gray-600">{u.email}</td>
                              <td className="py-3 px-3">
                                <span className={'px-2 py-1 rounded text-xs font-medium ' + 
                                  (u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : u.role === 'COLLABORATOR' ? 'bg-yellow-100 text-yellow-700' : u.role === 'FRANCHISEE' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700')}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-gray-600 text-xs">{u.brands?.join(', ')}</td>
                              <td className="py-3 px-3">
                                <span className={'px-2 py-1 rounded text-xs ' + (u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                                  {u.isActive ? t[lang].active : t[lang].inactive}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button onClick={() => { setEditingUser(u); setShowNewUserModal(true) }} className="text-blue-600 hover:underline mr-2">{t[lang].edit}</button>
                                {u.id !== user?.id && <button onClick={async () => { if(confirm(t[lang].confirmDelete)) { await api.deleteUser(u.id); loadUsers() }}} className="text-red-600 hover:underline">{t[lang].delete}</button>}
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
          {/* CUSTOMERS */}
          {!loading && tab === 'customers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t[lang].customers}</h2>
                <button onClick={() => { setEditingCustomer(null); setShowCustomerModal(true) }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  + {lang === 'fr' ? 'Nouveau client' : 'Nuevo cliente'}
                </button>
              </div>
              
              {/* Barre de recherche */}
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={lang === 'fr' ? 'Rechercher un client...' : 'Buscar un cliente...'}
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg pl-10"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Liste des clients */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow overflow-hidden">
                  <div className="max-h-[600px] overflow-auto">
                    {customers
                      .filter(c => 
                        !customerSearch || 
                        (c.firstName + ' ' + c.lastName + ' ' + c.email).toLowerCase().includes(customerSearch.toLowerCase())
                      )
                      .map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setSelectedCustomer(c)}
                          className={'p-4 border-b cursor-pointer hover:bg-gray-50 ' + (selectedCustomer?.id === c.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : '')}
                        >
                          <div className="font-medium">{c.firstName} {c.lastName}</div>
                          <div className="text-sm text-gray-500">{c.email}</div>
                          <div className="text-xs text-gray-400">{c.phone}</div>
                        </div>
                      ))
                    }
                    {customers.length === 0 && (
                      <div className="p-8 text-center text-gray-500">{lang === 'fr' ? 'Aucun client' : 'Sin clientes'}</div>
                    )}
                  </div>
                </div>

                {/* Fiche client */}
                <div className="lg:col-span-2">
                  {selectedCustomer ? (
                    <div className="bg-white rounded-xl shadow p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-bold">{selectedCustomer.firstName} {selectedCustomer.lastName}</h3>
                          <p className="text-gray-500">{selectedCustomer.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingCustomer(selectedCustomer); setShowCustomerModal(true) }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
                            {t[lang].edit}
                          </button>
                          <button onClick={() => deleteCustomer(selectedCustomer.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">
                            {t[lang].delete}
                          </button>
                        </div>
                      </div>

                      {/* Coordonnées */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="text-xs text-gray-500 uppercase">{lang === 'fr' ? 'Téléphone' : 'Teléfono'}</label>
                          <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 uppercase">{lang === 'fr' ? 'Langue' : 'Idioma'}</label>
                          <p className="font-medium">{selectedCustomer.language === 'fr' ? '🇫🇷 Français' : selectedCustomer.language === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 uppercase">{lang === 'fr' ? 'Adresse' : 'Dirección'}</label>
                          <p className="font-medium">{selectedCustomer.address || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 uppercase">{lang === 'fr' ? 'Ville' : 'Ciudad'}</label>
                          <p className="font-medium">{selectedCustomer.city || '-'} {selectedCustomer.postalCode}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 uppercase">{lang === 'fr' ? 'Pays' : 'País'}</label>
                          <p className="font-medium">{selectedCustomer.country || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 uppercase">{lang === 'fr' ? 'Créé le' : 'Creado el'}</label>
                          <p className="font-medium">{selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString('fr-FR') : '-'}</p>
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="border-t pt-4">
                        <h4 className="font-bold mb-3">{lang === 'fr' ? 'Documents' : 'Documentos'}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{lang === 'fr' ? "Pièce d'identité" : 'Documento de identidad'}</span>
                              {selectedCustomer.idDocumentUrl ? (
                                <span className="text-green-600 text-sm">✓ {lang === 'fr' ? 'Vérifié' : 'Verificado'}</span>
                              ) : (
                                <span className="text-orange-600 text-sm">⚠ {lang === 'fr' ? 'Manquant' : 'Faltante'}</span>
                              )}
                            </div>
                            {selectedCustomer.idDocumentUrl && (
                              <a href={selectedCustomer.idDocumentUrl} target="_blank" className="text-blue-600 text-sm hover:underline">
                                {lang === 'fr' ? 'Voir le document' : 'Ver documento'}
                              </a>
                            )}
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{lang === 'fr' ? 'Permis de conduire' : 'Permiso de conducir'}</span>
                              {selectedCustomer.licenseDocumentUrl ? (
                                <span className="text-green-600 text-sm">✓ {lang === 'fr' ? 'Vérifié' : 'Verificado'}</span>
                              ) : (
                                <span className="text-orange-600 text-sm">⚠ {lang === 'fr' ? 'Manquant' : 'Faltante'}</span>
                              )}
                            </div>
                            {selectedCustomer.licenseDocumentUrl && (
                              <a href={selectedCustomer.licenseDocumentUrl} target="_blank" className="text-blue-600 text-sm hover:underline">
                                {lang === 'fr' ? 'Voir le document' : 'Ver documento'}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Historique des réservations */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-bold mb-3">{lang === 'fr' ? 'Historique des réservations' : 'Historial de reservas'}</h4>
                        <div className="space-y-2">
                          {bookings.filter(b => b.customerId === selectedCustomer.id).length === 0 ? (
                            <p className="text-gray-500 text-sm">{lang === 'fr' ? 'Aucune réservation' : 'Sin reservas'}</p>
                          ) : (
                            bookings.filter(b => b.customerId === selectedCustomer.id).map(b => (
                              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <span className="font-mono text-sm">{b.reference}</span>
                                  <span className="ml-2 text-sm text-gray-500">
                                    {new Date(b.startDate).toLocaleDateString('fr-FR')} → {new Date(b.endDate).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                                <span className={'px-2 py-1 rounded text-xs ' + 
                                  (b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                   b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700')}>
                                  {b.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                      {lang === 'fr' ? 'Sélectionnez un client pour voir sa fiche' : 'Seleccione un cliente para ver su ficha'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONTRACTS & INVOICES - À développer */}
          {!loading && tab === 'contracts' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[lang].from}</label>
                  <input type="date" value={contractsFilter.startDate} onChange={(e) => setContractsFilter({...contractsFilter, startDate: e.target.value})} className="border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[lang].to}</label>
                  <input type="date" value={contractsFilter.endDate} onChange={(e) => setContractsFilter({...contractsFilter, endDate: e.target.value})} className="border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[lang].contractStatus}</label>
                  <select value={contractsFilter.status} onChange={(e) => setContractsFilter({...contractsFilter, status: e.target.value})} className="border rounded-lg px-3 py-2">
                    <option value="">{t[lang].allStatuses}</option>
                    <option value="DRAFT">{t[lang].draft}</option>
                    <option value="ACTIVE">{t[lang].active}</option>
                    <option value="COMPLETED">{t[lang].completed}</option>
                    <option value="CANCELLED">{t[lang].cancelled}</option>
                  </select>
                </div>
                <button onClick={() => setContractsFilter({ startDate: '', endDate: '', status: '' })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Reset</button>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].contractNumber}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].client}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].vehicleContract}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].period}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].amount}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].contractStatus}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contracts.filter(c => {
                      if (contractsFilter.status && c.status !== contractsFilter.status) return false;
                      if (contractsFilter.startDate && new Date(c.currentStartDate) < new Date(contractsFilter.startDate)) return false;
                      if (contractsFilter.endDate && new Date(c.currentEndDate) > new Date(contractsFilter.endDate)) return false;
                      return true;
                    }).map((contract: any) => (
                      <tr key={contract.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{contract.contractNumber}</td>
                        <td className="px-4 py-3">{contract.customer?.firstName} {contract.customer?.lastName}</td>
                        <td className="px-4 py-3">{contract.fleetVehicle?.vehicleNumber || contract.fleetVehicle?.vehicle?.name?.fr || contract.fleetVehicle?.vehicle?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{new Date(contract.currentStartDate).toLocaleDateString('fr-FR')} - {new Date(contract.currentEndDate).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 font-semibold">{(Number(contract.totalAmount) || 0).toFixed(2)} EUR</td>
                        <td className="px-4 py-3"><span className={"px-2 py-1 rounded-full text-xs font-medium " + (contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : contract.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : contract.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800')}>{contract.status}</span></td>
                        <td className="px-4 py-3 space-x-2">
                          <a href={API_URL + '/api/contracts/' + contract.id + '/pdf'} target="_blank" className="text-blue-600 hover:underline text-sm">PDF</a>
                          <a href={API_URL + '/api/contracts/' + contract.id + '/invoice-pdf'} target="_blank" className="text-green-600 hover:underline text-sm">{t[lang].invoices}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contracts.length === 0 && <div className="p-8 text-center text-gray-500">{t[lang].noContracts}</div>}
              </div>
            </div>
          )}
          {!loading && tab === 'invoices' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[lang].from}</label>
                  <input type="date" value={contractsFilter.startDate} onChange={(e) => setContractsFilter({...contractsFilter, startDate: e.target.value})} className="border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[lang].to}</label>
                  <input type="date" value={contractsFilter.endDate} onChange={(e) => setContractsFilter({...contractsFilter, endDate: e.target.value})} className="border rounded-lg px-3 py-2" />
                </div>
                <button onClick={() => setContractsFilter({ startDate: '', endDate: '', status: '' })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Reset</button>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].invoiceNumber}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].client}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].invoiceDate}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].totalHT}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].tva}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].totalTTC}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t[lang].actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contracts.filter(c => {
                      if (c.status !== 'COMPLETED' && c.status !== 'CHECKED_IN') return false;
                      if (contractsFilter.startDate && new Date(c.currentStartDate) < new Date(contractsFilter.startDate)) return false;
                      if (contractsFilter.endDate && new Date(c.currentEndDate) > new Date(contractsFilter.endDate)) return false;
                      return true;
                    }).map((contract: any) => (
                      <tr key={contract.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">FAC-{contract.contractNumber}</td>
                        <td className="px-4 py-3">{contract.customer?.firstName} {contract.customer?.lastName}</td>
                        <td className="px-4 py-3">{new Date(contract.actualEndDate || contract.currentEndDate).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">{Number(contract.subtotal).toFixed(2)} EUR</td>
                        <td className="px-4 py-3">{Number(contract.taxAmount).toFixed(2)} EUR ({Number(contract.taxRate)}%)</td>
                        <td className="px-4 py-3 font-semibold">{(Number(contract.totalAmount) || 0).toFixed(2)} EUR</td>
                        <td className="px-4 py-3">
                          <a href={API_URL + '/api/contracts/' + contract.id + '/invoice-pdf'} target="_blank" className="text-green-600 hover:underline text-sm">{t[lang].downloadPdf}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contracts.filter(c => c.status === 'COMPLETED' || c.status === 'CHECKED_IN').length === 0 && <div className="p-8 text-center text-gray-500">{t[lang].noInvoices}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouvel Utilisateur */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editingUser ? '✏️ ' + t[lang].editUser : '➕ ' + t[lang].newUser}</h3>
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
                language: formData.get('language'),
                brands: Array.from(form.querySelectorAll('input[name="brands"]:checked')).map((el: any) => el.value),
                agencyIds: Array.from(form.querySelectorAll('input[name="agencyIds"]:checked')).map((el: any) => el.value),
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
                  <label className="block text-sm font-medium mb-1">{t[lang].firstName}</label>
                  <input name="firstName" defaultValue={editingUser?.firstName || ''} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[lang].lastName}</label>
                  <input name="lastName" defaultValue={editingUser?.lastName || ''} required className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[lang].email}</label>
                <input name="email" type="email" defaultValue={editingUser?.email || ''} required className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{editingUser ? t[lang].newPassword : t[lang].password}</label>
                <input name="password" type="password" required={!editingUser} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[lang].role}</label>
                <select name="role" defaultValue={editingUser?.role || 'OPERATOR'} className="w-full border rounded-lg px-3 py-2">
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OPERATOR">{lang === "fr" ? "Opérateur" : "Operador"}</option>
                  <option value="COLLABORATOR">{lang === "fr" ? "Collaborateur (Partenaire)" : "Colaborador (Socio)"}</option>
                  <option value="FRANCHISEE">{lang === "fr" ? "Franchisé" : "Franquiciado"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[lang].language}</label>
                <select name="language" defaultValue={editingUser?.language || 'es'} className="w-full border rounded-lg px-3 py-2">
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t[lang].authorizedBrands}</label>
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
                <label className="block text-sm font-medium mb-2">{lang === 'fr' ? 'Agences autorisees' : 'Agencias autorizadas'}</label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {allAgencies.map((a: any) => (
                    <label key={a.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                      <input type="checkbox" name="agencyIds" value={a.id} defaultChecked={editingUser?.agencyIds?.includes(a.id) ?? false} className="w-4 h-4" />
                      <span className="text-sm">{getName(a.name, lang)} ({a.code})</span>
                      {a.agencyType && a.agencyType !== 'OWN' && (
                        <span className={'text-xs px-1 rounded ' + (a.agencyType === 'PARTNER' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700')}>
                          {a.agencyType === 'PARTNER' ? 'Partenaire' : 'Franchise'}
                        </span>
                      )}
                    </label>
                  ))}
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
                  {editingUser ? t[lang].save : t[lang].create}
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
          {tooltip.booking.customer?.phone && <div className="text-yellow-300">📞 {tooltip.booking.customer.phone}</div>}
          <div className="text-gray-300">{tooltip.booking.reference}</div>
          <div className="text-gray-300">{new Date(tooltip.booking.startDate).toLocaleDateString('fr-FR')} → {new Date(tooltip.booking.endDate).toLocaleDateString('fr-FR')}</div>
          <div className="text-gray-300">{tooltip.booking.startTime} - {tooltip.booking.endTime}</div>
          {tooltip.booking.checkedIn && <div className="text-green-400">✓ {t[lang].checkedIn}</div>}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && cancelBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">❌ {lang === "fr" ? "Annuler la réservation" : "Cancelar la reserva"}</h3>
            <p className="text-gray-600 mb-4">{lang === "fr" ? "Réservation" : "Reserva"} {cancelBooking.reference} - {cancelBooking.customer?.lastName}</p>
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
          userRole={user?.role}
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

      {/* Modal Assignation */}
      {assigningBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAssigningBooking(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{lang === 'fr' ? 'Assigner un véhicule' : 'Asignar un vehículo'}</h3>
            <p className="text-gray-600 mb-4">{lang === 'fr' ? 'Réservation' : 'Reserva'}: {assigningBooking.reference}</p>
            <p className="text-gray-600 mb-4">{lang === 'fr' ? 'Type' : 'Tipo'}: {getName(assigningBooking.items?.[0]?.vehicle?.name)}</p>
            <div className="space-y-2 max-h-60 overflow-auto">
              {availableFleetForAssign.length === 0 ? (
                <p className="text-gray-500 text-center py-4">{lang === 'fr' ? 'Aucun véhicule disponible' : 'No hay vehículos disponibles'}</p>
              ) : (
                availableFleetForAssign.map(f => (
                  <div key={f.id} onClick={() => assignVehicle(f.id)}
                    className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                    <div>
                      <span className="font-bold">{f.vehicleNumber}</span>
                      {f.locationCode && <span className="ml-2 text-gray-500">({f.locationCode})</span>}
                      {f.licensePlate && <span className="ml-2 text-gray-400">{f.licensePlate}</span>}
                    </div>
                    <span className={'px-2 py-1 rounded text-xs ' + (f.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>{f.status}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setAssigningBooking(null)} className="px-4 py-2 bg-gray-200 rounded-lg">{t[lang].cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Client */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">
              {editingCustomer ? (lang === 'fr' ? 'Modifier le client' : 'Editar cliente') : (lang === 'fr' ? 'Nouveau client' : 'Nuevo cliente')}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const formData = new FormData(form)
              const data = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                postalCode: formData.get('postalCode'),
                city: formData.get('city'),
                country: formData.get('country'),
                language: formData.get('language'),
                idDocumentUrl: formData.get('idDocumentUrl') || editingCustomer?.idDocumentUrl,
                licenseDocumentUrl: formData.get('licenseDocumentUrl') || editingCustomer?.licenseDocumentUrl
              }
              await saveCustomer(data)
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t[lang].firstName}</label>
                  <input name="firstName" defaultValue={editingCustomer?.firstName || ''} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t[lang].lastName}</label>
                  <input name="lastName" defaultValue={editingCustomer?.lastName || ''} required className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[lang].email}</label>
                <input name="email" type="email" defaultValue={editingCustomer?.email || ''} required className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{lang === 'fr' ? 'Téléphone' : 'Teléfono'}</label>
                <input name="phone" defaultValue={editingCustomer?.phone || ''} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{lang === 'fr' ? 'Adresse' : 'Dirección'}</label>
                <input name="address" defaultValue={editingCustomer?.address || ''} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{lang === 'fr' ? 'Code postal' : 'Código postal'}</label>
                  <input name="postalCode" defaultValue={editingCustomer?.postalCode || ''} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{lang === 'fr' ? 'Ville' : 'Ciudad'}</label>
                  <input name="city" defaultValue={editingCustomer?.city || ''} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{lang === 'fr' ? 'Pays' : 'País'}</label>
                  <input name="country" defaultValue={editingCustomer?.country || 'ES'} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t[lang].language}</label>
                <select name="language" defaultValue={editingCustomer?.language || 'es'} className="w-full border rounded-lg px-3 py-2">
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              
              {editingCustomer && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">{lang === 'fr' ? 'Documents' : 'Documentos'}</h4>
                    <div>
                      <label className="block text-sm font-medium mb-1">{lang === 'fr' ? "URL Pièce d'identité" : 'URL Documento identidad'}</label>
                      <input name="idDocumentUrl" defaultValue={editingCustomer?.idDocumentUrl || ''} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1">{lang === 'fr' ? 'URL Permis de conduire' : 'URL Permiso conducir'}</label>
                      <input name="licenseDocumentUrl" defaultValue={editingCustomer?.licenseDocumentUrl || ''} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingCustomer ? t[lang].save : t[lang].create}
                </button>
                <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  {t[lang].cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* Booking Detail Modal */}
      {showBookingDetail && selectedBookingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBookingDetail(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">📋 Détails réservation</h2>
                  <p className="text-blue-100 text-sm">{selectedBookingDetail.reference}</p>
                </div>
                <button onClick={() => setShowBookingDetail(false)} className="text-2xl opacity-70 hover:opacity-100">&times;</button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Statut et Source */}
              <div className="flex gap-3">
                <span className={'px-3 py-1 rounded-full text-sm font-medium ' + 
                  (selectedBookingDetail.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                   selectedBookingDetail.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                   selectedBookingDetail.checkedIn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}>
                  {selectedBookingDetail.checkedIn ? '✅ Check-in fait' : selectedBookingDetail.status}
                </span>
                <span className={'px-3 py-1 rounded-full text-sm ' + 
                  (selectedBookingDetail.source === 'WIDGET' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700')}>
                  {selectedBookingDetail.source === 'WIDGET' ? '🌐 En ligne' : '🏪 Walk-in (agence)'}
                </span>
              </div>
              
              {/* Client */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">👤 Client</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nom complet</p>
                    <p className="font-medium">{selectedBookingDetail.customer?.firstName} {selectedBookingDetail.customer?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">
                      <a href={'tel:' + selectedBookingDetail.customer?.phone} className="text-blue-600 hover:underline">
                        📞 {selectedBookingDetail.customer?.phone}
                      </a>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-sm">{selectedBookingDetail.customer?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Langue</p>
                    <p className="font-medium">{selectedBookingDetail.language === 'fr' ? '🇫🇷 Français' : selectedBookingDetail.language === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}</p>
                  </div>
                </div>
              </div>
              
              {/* Véhicule */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">🚲 Véhicule</h3>
                {(() => {
                  const assignedVehicle = fleet.find(f => f.id === selectedBookingDetail.fleetVehicleId)
                  return (
                    <div className="flex items-center gap-4">
                      {assignedVehicle?.vehicle?.imageUrl ? (
                        <img src={assignedVehicle.vehicle.imageUrl} className="w-20 h-20 rounded-lg object-cover" />
                      ) : selectedBookingDetail.items?.[0]?.vehicle?.imageUrl ? (
                        <img src={selectedBookingDetail.items[0].vehicle.imageUrl} className="w-20 h-20 rounded-lg object-cover" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">🚲</div>
                      )}
                      <div>
                        {assignedVehicle ? (
                          <>
                            <p className="font-bold text-lg text-green-600">{assignedVehicle.vehicleNumber}</p>
                            <p className="text-gray-600">{getName(assignedVehicle.vehicle?.name)}</p>
                            <p className="text-sm text-gray-500">{getName(assignedVehicle.vehicle?.category?.name)}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-lg text-orange-600">⚠️ Non assigné</p>
                            <p className="text-gray-600">{getName(selectedBookingDetail.items?.[0]?.vehicle?.name)}</p>
                            <p className="text-sm text-gray-500">{getName(selectedBookingDetail.items?.[0]?.vehicle?.category?.name)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
              
              {/* Dates */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">📅 Période de location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Début</p>
                    <p className="font-medium">{new Date(selectedBookingDetail.startDate).toLocaleDateString('fr-FR')} à {selectedBookingDetail.startTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fin</p>
                    <p className="font-medium">{new Date(selectedBookingDetail.endDate).toLocaleDateString('fr-FR')} à {selectedBookingDetail.endTime}</p>
                  </div>
                </div>
              </div>
              
              {/* Options */}
              {selectedBookingDetail.options && selectedBookingDetail.options.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-700 mb-3">🎁 Options</h3>
                  <div className="space-y-2">
                    {selectedBookingDetail.options.map((opt, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{getName(opt.option?.name)} x{opt.quantity}</span>
                        <span className="font-medium">{opt.totalPrice?.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tarification */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">💰 Tarification</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Prix location</span>
                    <span className="font-medium">{selectedBookingDetail.totalPrice?.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Caution</span>
                    <span>{selectedBookingDetail.depositAmount?.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
                    <span>Total</span>
                    <span className="text-blue-600">{((selectedBookingDetail.totalPrice || 0) + (selectedBookingDetail.depositAmount || 0)).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
              
              {/* Infos réservation */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">📝 Informations</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date de réservation</p>
                    <p className="font-medium">{new Date(selectedBookingDetail.createdAt).toLocaleDateString('fr-FR')} à {new Date(selectedBookingDetail.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Agence</p>
                    <p className="font-medium">{getName(selectedBookingDetail.agency?.name)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer avec actions */}
            <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-3 rounded-b-2xl">
              {!selectedBookingDetail.fleetVehicleId && (
                <button onClick={() => { setShowBookingDetail(false); openAssignModal(selectedBookingDetail) }}
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  🚲 Assigner véhicule
                </button>
              )}
              {!selectedBookingDetail.checkedIn && selectedBookingDetail.fleetVehicleId && (
                <button onClick={() => { setShowBookingDetail(false); setCheckInBooking(selectedBookingDetail); setShowCheckIn(true) }}
                  className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  ✅ Check-in
                </button>
              )}

              <button onClick={() => setShowBookingDetail(false)}
                className="py-2 px-4 bg-gray-200 rounded-lg hover:bg-gray-300 ml-auto">
                Fermer
              </button>
            </div>
          </div>
        </div>
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
                  <button onClick={cancelWalkin} className="mt-4 text-red-600">{t[lang].cancel}</button>
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
