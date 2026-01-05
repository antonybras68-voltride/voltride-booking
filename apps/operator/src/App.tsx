import { useState, useEffect } from 'react'
import { FleetList, FleetDetail, FleetVehicle } from './FleetComponents'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

// Types
interface Agency { id: string; code: string; name: any; city: string; brand: string }
interface Vehicle { id: string; sku: string; name: any; imageUrl?: string; category?: { name: any; brand: string }; hasPlate: boolean; deposit: number }
interface Customer { id: string; firstName: string; lastName: string; email: string; phone: string; address?: string; city?: string; postalCode?: string }
interface Booking {
  id: string; reference: string; startDate: string; endDate: string; startTime: string; endTime: string
  totalPrice: number; depositAmount: number; status: string; language: string
  agency: Agency; customer: Customer
  items: { id: string; quantity: number; unitPrice: number; vehicle: Vehicle }[]
  options: { id: string; quantity: number; unitPrice: number; option: { name: any } }[]
}

type Tab = 'planning' | 'bookings' | 'fleet' | 'vehicles' | 'customers' | 'contracts' | 'invoices'

const BOOKING_COLORS = [
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
]

function App() {
  const [tab, setTab] = useState<Tab>('planning')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedAgency, setSelectedAgency] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showNewBookingModal, setShowNewBookingModal] = useState(false)
  const [newBookingData, setNewBookingData] = useState<{ vehicleId: string; date: string } | null>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<FleetVehicle | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [agRes, vehRes, bookRes, custRes] = await Promise.all([
        fetch(`${API_URL}/api/agencies`),
        fetch(`${API_URL}/api/vehicles`),
        fetch(`${API_URL}/api/bookings`),
        fetch(`${API_URL}/api/customers`)
      ])
      setAgencies(await agRes.json())
      setVehicles(await vehRes.json())
      setBookings(await bookRes.json())
      setCustomers(await custRes.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

  const getWeekDays = () => {
    const start = new Date(currentWeek)
    start.setDate(start.getDate() - start.getDay() + 1)
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const formatDateShort = (d: Date) => {
    const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
    return { day: days[d.getDay()], num: d.getDate() }
  }

  const getBookingStyle = (booking: Booking, days: Date[]) => {
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
    return { left: `${left}%`, width: `${width}%` }
  }

  const getBookingsForVehicle = (vehicleId: string, days: Date[]) => {
    const firstDay = formatDate(days[0])
    const lastDay = formatDate(days[days.length - 1])
    return bookings.filter(b => {
      if (selectedAgency !== 'all' && b.agency.id !== selectedAgency) return false
      const start = b.startDate.split('T')[0]
      const end = b.endDate.split('T')[0]
      const hasVehicle = b.items.some(item => item.vehicle.id === vehicleId)
      return hasVehicle && start <= lastDay && end >= firstDay
    })
  }

  const filteredVehicles = vehicles.filter(v => {
    if (selectedBrand !== 'ALL' && v.category?.brand !== selectedBrand) return false
    return true
  })

  const filteredBookings = bookings.filter(b => {
    if (selectedAgency !== 'all' && b.agency.id !== selectedAgency) return false
    if (selectedBrand !== 'ALL' && b.agency.brand !== selectedBrand) return false
    return true
  })

  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d) }
  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d) }

  const handleCellClick = (vehicleId: string, date: Date) => {
    setNewBookingData({ vehicleId, date: formatDate(date) })
    setShowNewBookingModal(true)
  }

  const getVehicleStatus = (vehicleId: string) => {
    const today = formatDate(new Date())
    const todayBookings = bookings.filter(b => {
      const start = b.startDate.split('T')[0]
      const end = b.endDate.split('T')[0]
      return b.items.some(i => i.vehicle.id === vehicleId) && today >= start && today <= end
    })
    if (todayBookings.length > 0) return { status: 'En location', color: 'bg-red-500' }
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowBookings = bookings.filter(b => {
      const start = b.startDate.split('T')[0]
      return b.items.some(i => i.vehicle.id === vehicleId) && start === formatDate(tomorrow)
    })
    if (tomorrowBookings.length > 0) return { status: 'Dispo demain', color: 'bg-yellow-500' }
    return { status: 'Disponible', color: 'bg-green-500' }
  }

  const openContract = (booking: Booking) => { setSelectedBooking(booking); setShowContractModal(true) }
  const openInvoice = (booking: Booking) => { setSelectedBooking(booking); setShowInvoiceModal(true) }

  const days = getWeekDays()

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">⚡ VOLTRIDE OPERATOR</h1>
          <div className="flex items-center gap-4">
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="border rounded-lg px-4 py-2">
              <option value="ALL">Toutes les marques</option>
              <option value="VOLTRIDE">Voltride</option>
              <option value="MOTOR-RENT">Motor-Rent</option>
            </select>
            <select value={selectedAgency} onChange={e => setSelectedAgency(e.target.value)} className="border rounded-lg px-4 py-2">
              <option value="all">Toutes les agences</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.city}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-56 bg-white border-r min-h-screen p-4">
          {[
            { id: 'planning', icon: '📅', label: 'Planning' },
            { id: 'bookings', icon: '📋', label: 'Réservations' },
            { id: 'fleet', icon: '🏍️', label: 'Flotte' },
            { id: 'vehicles', icon: '��', label: 'Types véhicules' },
            { id: 'customers', icon: '👥', label: 'Clients' },
            { id: 'contracts', icon: '📄', label: 'Contrats' },
            { id: 'invoices', icon: '💰', label: 'Factures' },
          ].map(item => (
            <button key={item.id} onClick={() => { setTab(item.id as Tab); setSelectedFleetVehicle(null) }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 mb-1 ${tab === item.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Main */}
        <main className="flex-1 p-6">
          {/* PLANNING */}
          {tab === 'planning' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Planning des Réservations</h2>
                  <p className="text-gray-500">Semaine du {days[0].toLocaleDateString('fr-FR')} au {days[9].toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={prevWeek} className="px-4 py-2 bg-gray-200 rounded-lg">← Précédent</button>
                  <button onClick={() => setCurrentWeek(new Date())} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Aujourd'hui</button>
                  <button onClick={nextWeek} className="px-4 py-2 bg-gray-200 rounded-lg">Suivant →</button>
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div><span className="text-sm">Impaire</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-500 rounded"></div><span className="text-sm">Paire</span></div>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="grid" style={{ gridTemplateColumns: '180px repeat(10, 1fr)' }}>
                  <div className="p-3 bg-gray-50 border-b border-r font-bold">Véhicule</div>
                  {days.map((day, i) => {
                    const { day: d, num } = formatDateShort(day)
                    const isToday = formatDate(day) === formatDate(new Date())
                    return <div key={i} className={`p-2 text-center border-b ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-50'}`}>
                      <p className="text-xs">{d}</p><p className="text-lg font-bold">{num}</p>{isToday && <p className="text-xs">Aujourd'hui</p>}
                    </div>
                  })}
                </div>
                {filteredVehicles.map(vehicle => {
                  const vBookings = getBookingsForVehicle(vehicle.id, days)
                  const status = getVehicleStatus(vehicle.id)
                  return (
                    <div key={vehicle.id} className="grid border-b" style={{ gridTemplateColumns: '180px repeat(10, 1fr)' }}>
                      <div className="p-2 border-r flex items-center gap-2">
                        {vehicle.imageUrl ? <img src={vehicle.imageUrl} className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">🚲</div>}
                        <div>
                          <p className="font-bold text-sm truncate">{getName(vehicle.name)}</p>
                          <span className={`text-xs px-1 rounded text-white ${status.color}`}>{status.status}</span>
                        </div>
                      </div>
                      <div className="col-span-10 relative h-16">
                        <div className="absolute inset-0 grid grid-cols-10">
                          {days.map((day, i) => (
                            <div key={i} onClick={() => handleCellClick(vehicle.id, day)} className={`border-l h-full cursor-pointer hover:bg-blue-50 ${formatDate(day) === formatDate(new Date()) ? 'bg-blue-50' : ''}`} />
                          ))}
                        </div>
                        {vBookings.map((b, i) => {
                          const style = getBookingStyle(b, days)
                          if (!style) return null
                          const colors = BOOKING_COLORS[i % 2]
                          return (
                            <div key={b.id} onClick={() => { setSelectedBooking(b); setShowBookingModal(true) }}
                              className={`absolute top-1 bottom-1 ${colors.bg} text-white rounded-lg cursor-pointer shadow flex items-center px-2 text-sm`}
                              style={{ left: style.left, width: style.width }}>
                              <span className="text-xs mr-1">{b.startTime}</span>
                              <span className="flex-1 truncate font-bold">{b.customer.lastName} {b.customer.firstName.charAt(0)}.</span>
                              <span className="text-xs ml-1">{b.endTime}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* RESERVATIONS */}
          {tab === 'bookings' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Réservations ({filteredBookings.length})</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">Référence</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Dates</th>
                    <th className="px-4 py-3 text-left">Véhicules</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.map(b => (
                      <tr key={b.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-blue-600">{b.reference}</td>
                        <td className="px-4 py-3"><p className="font-bold">{b.customer.firstName} {b.customer.lastName}</p><p className="text-sm text-gray-500">{b.customer.email}</p></td>
                        <td className="px-4 py-3"><p>{new Date(b.startDate).toLocaleDateString('fr-FR')} {b.startTime}</p><p className="text-sm text-gray-500">→ {new Date(b.endDate).toLocaleDateString('fr-FR')} {b.endTime}</p></td>
                        <td className="px-4 py-3">{b.items.map(i => <p key={i.id} className="text-sm">{getName(i.vehicle.name)} x{i.quantity}</p>)}</td>
                        <td className="px-4 py-3 font-bold">{b.totalPrice}€</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs text-white ${b.status === 'CONFIRMED' ? 'bg-green-500' : b.status === 'PENDING' ? 'bg-yellow-500' : 'bg-gray-500'}`}>{b.status}</span></td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => openContract(b)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Contrat</button>
                          <button onClick={() => openInvoice(b)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Facture</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FLEET */}
          {tab === 'fleet' && (
            selectedFleetVehicle ? (
              <FleetDetail 
                vehicle={selectedFleetVehicle} 
                onBack={() => setSelectedFleetVehicle(null)}
                onUpdate={() => setSelectedFleetVehicle(null)}
              />
            ) : (
              <FleetList 
                selectedAgency={selectedAgency}
                selectedBrand={selectedBrand}
                onSelectVehicle={setSelectedFleetVehicle}
              />
            )
          )}

          {/* VEHICULES (Types) */}
          {tab === 'vehicles' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Types de véhicules ({filteredVehicles.length})</h2>
              <div className="grid grid-cols-4 gap-4">
                {filteredVehicles.map(v => {
                  const status = getVehicleStatus(v.id)
                  return (
                    <div key={v.id} className="bg-white rounded-xl shadow overflow-hidden">
                      {v.imageUrl ? <img src={v.imageUrl} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-4xl">🚲</div>}
                      <div className="p-4">
                        <h3 className="font-bold">{getName(v.name)}</h3>
                        <p className="text-sm text-gray-500">{v.sku}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded text-white ${v.category?.brand === 'VOLTRIDE' ? 'bg-blue-500' : 'bg-red-500'}`}>{v.category?.brand}</span>
                          <span className={`text-xs px-2 py-1 rounded text-white ${status.color}`}>{status.status}</span>
                        </div>
                        <p className="text-sm mt-2">Caution: <span className="font-bold">{v.deposit}€</span></p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CLIENTS */}
          {tab === 'customers' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Clients ({customers.length})</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">Nom</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Téléphone</th>
                    <th className="px-4 py-3 text-left">Ville</th>
                    <th className="px-4 py-3 text-left">Réservations</th>
                  </tr></thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold">{c.firstName} {c.lastName}</td>
                        <td className="px-4 py-3">{c.email}</td>
                        <td className="px-4 py-3">{c.phone}</td>
                        <td className="px-4 py-3">{c.city || '-'}</td>
                        <td className="px-4 py-3">{bookings.filter(b => b.customer.id === c.id).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTRATS */}
          {tab === 'contracts' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Contrats de location</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">Référence</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Période</th>
                    <th className="px-4 py-3 text-left">Véhicule</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.filter(b => b.status === 'CONFIRMED').map(b => (
                      <tr key={b.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono">{b.reference}</td>
                        <td className="px-4 py-3">{b.customer.firstName} {b.customer.lastName}</td>
                        <td className="px-4 py-3">{new Date(b.startDate).toLocaleDateString('fr-FR')} → {new Date(b.endDate).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">{b.items.map(i => getName(i.vehicle.name)).join(', ')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openContract(b)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">📄 Générer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FACTURES */}
          {tab === 'invoices' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Factures</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">N° Facture</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Montant</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.filter(b => b.status === 'CONFIRMED').map(b => (
                      <tr key={b.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono">FAC-{b.reference}</td>
                        <td className="px-4 py-3">{b.customer.firstName} {b.customer.lastName}</td>
                        <td className="px-4 py-3">{new Date(b.startDate).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 font-bold">{b.totalPrice}€</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openInvoice(b)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">💰 Générer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Booking Details */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBookingModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{selectedBooking.reference}</h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Client</p>
                <p className="font-bold">{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p>
                <p className="text-sm">{selectedBooking.customer.email} • {selectedBooking.customer.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Début</p>
                  <p className="font-bold">{new Date(selectedBooking.startDate).toLocaleDateString('fr-FR')}</p>
                  <p>{selectedBooking.startTime}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Fin</p>
                  <p className="font-bold">{new Date(selectedBooking.endDate).toLocaleDateString('fr-FR')}</p>
                  <p>{selectedBooking.endTime}</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Véhicules</p>
                {selectedBooking.items.map(i => <p key={i.id}>{getName(i.vehicle.name)} x{i.quantity} - {i.unitPrice * i.quantity}€</p>)}
              </div>
              <div className="p-3 bg-blue-50 rounded-lg flex justify-between">
                <span>Total</span>
                <span className="text-xl font-bold text-blue-600">{selectedBooking.totalPrice}€</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowBookingModal(false); openContract(selectedBooking) }} className="flex-1 py-2 bg-blue-500 text-white rounded-lg">📄 Contrat</button>
              <button onClick={() => { setShowBookingModal(false); openInvoice(selectedBooking) }} className="flex-1 py-2 bg-green-500 text-white rounded-lg">💰 Facture</button>
              <button onClick={() => setShowBookingModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contrat */}
      {showContractModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowContractModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8" id="contract">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">CONTRAT DE LOCATION</h1>
                <p className="text-gray-500">N° {selectedBooking.reference}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold mb-2">LOUEUR</h3>
                  <p>Voltride Group</p>
                  <p>{selectedBooking.agency.city}</p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">LOCATAIRE</h3>
                  <p>{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p>
                  <p>{selectedBooking.customer.email}</p>
                  <p>{selectedBooking.customer.phone}</p>
                </div>
              </div>
              <div className="border rounded-lg p-4 mb-6">
                <h3 className="font-bold mb-2">VÉHICULE(S) LOUÉ(S)</h3>
                <table className="w-full">
                  <thead><tr className="border-b"><th className="text-left py-2">Véhicule</th><th className="text-left py-2">Qté</th><th className="text-right py-2">Prix</th></tr></thead>
                  <tbody>
                    {selectedBooking.items.map(i => (
                      <tr key={i.id} className="border-b"><td className="py-2">{getName(i.vehicle.name)}</td><td className="py-2">{i.quantity}</td><td className="text-right py-2">{i.unitPrice * i.quantity}€</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2">PÉRIODE DE LOCATION</h3>
                  <p>Du: {new Date(selectedBooking.startDate).toLocaleDateString('fr-FR')} à {selectedBooking.startTime}</p>
                  <p>Au: {new Date(selectedBooking.endDate).toLocaleDateString('fr-FR')} à {selectedBooking.endTime}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2">MONTANTS</h3>
                  <p>Total: <span className="font-bold">{selectedBooking.totalPrice}€</span></p>
                  <p>Acompte: {selectedBooking.depositAmount}€</p>
                  <p>Caution: {selectedBooking.items.reduce((acc, i) => acc + (i.vehicle.deposit || 0) * i.quantity, 0)}€</p>
                </div>
              </div>
              <div className="border-t pt-6 grid grid-cols-2 gap-6">
                <div><p className="text-sm text-gray-500 mb-8">Signature du loueur:</p><div className="border-b border-gray-400 h-16"></div></div>
                <div><p className="text-sm text-gray-500 mb-8">Signature du locataire:</p><div className="border-b border-gray-400 h-16"></div></div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-500 text-white rounded-lg">🖨️ Imprimer</button>
              <button onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture */}
      {showInvoiceModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8" id="invoice">
              <div className="flex justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-blue-600">FACTURE</h1>
                  <p className="text-gray-500">N° FAC-{selectedBooking.reference}</p>
                  <p className="text-gray-500">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <h2 className="font-bold text-xl">Voltride Group</h2>
                  <p>{selectedBooking.agency.city}</p>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="font-bold mb-2">FACTURER À:</h3>
                <p>{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p>
                <p>{selectedBooking.customer.email}</p>
              </div>
              <table className="w-full mb-6">
                <thead><tr className="bg-gray-100"><th className="text-left p-3">Description</th><th className="text-center p-3">Qté</th><th className="text-right p-3">Prix unit.</th><th className="text-right p-3">Total</th></tr></thead>
                <tbody>
                  {selectedBooking.items.map(i => (
                    <tr key={i.id} className="border-b"><td className="p-3">{getName(i.vehicle.name)}<br/><span className="text-sm text-gray-500">{new Date(selectedBooking.startDate).toLocaleDateString('fr-FR')} - {new Date(selectedBooking.endDate).toLocaleDateString('fr-FR')}</span></td><td className="text-center p-3">{i.quantity}</td><td className="text-right p-3">{i.unitPrice}€</td><td className="text-right p-3">{i.unitPrice * i.quantity}€</td></tr>
                  ))}
                  {selectedBooking.options?.map(o => (
                    <tr key={o.id} className="border-b"><td className="p-3">{getName(o.option.name)}</td><td className="text-center p-3">{o.quantity}</td><td className="text-right p-3">{o.unitPrice}€</td><td className="text-right p-3">{o.unitPrice * o.quantity}€</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2"><span>Sous-total HT</span><span>{(selectedBooking.totalPrice / 1.21).toFixed(2)}€</span></div>
                  <div className="flex justify-between py-2"><span>TVA (21%)</span><span>{(selectedBooking.totalPrice - selectedBooking.totalPrice / 1.21).toFixed(2)}€</span></div>
                  <div className="flex justify-between py-2 border-t font-bold text-lg"><span>Total TTC</span><span className="text-blue-600">{selectedBooking.totalPrice}€</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded-lg">🖨️ Imprimer</button>
              <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Réservation */}
      {showNewBookingModal && newBookingData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewBookingModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Nouvelle réservation</h2>
            <p className="mb-4">Véhicule: <strong>{getName(vehicles.find(v => v.id === newBookingData.vehicleId)?.name)}</strong></p>
            <p className="mb-4">Date: <strong>{new Date(newBookingData.date).toLocaleDateString('fr-FR')}</strong></p>
            <p className="text-gray-500 text-sm">Fonctionnalité de création en cours de développement...</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowNewBookingModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
