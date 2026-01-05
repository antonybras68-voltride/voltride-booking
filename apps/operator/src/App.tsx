import { useState, useEffect } from 'react'
import { FleetList, FleetDetail, FleetVehicle } from './FleetComponents'
import { AdvancedPlanning, CheckInModal, CheckOutModal } from './PlanningComponents'
import { NewBookingModal, AssignVehicleModal } from './BookingComponents'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface Agency { id: string; code: string; name: any; city: string; brand: string }
interface Vehicle { id: string; sku: string; name: any; imageUrl?: string; category?: { name: any; brand: string }; hasPlate: boolean; deposit: number }
interface Customer { id: string; firstName: string; lastName: string; email: string; phone: string; address?: string; city?: string; postalCode?: string }
interface Booking {
  id: string; reference: string; startDate: string; endDate: string; startTime: string; endTime: string
  totalPrice: number; depositAmount: number; status: string; language: string
  agency: Agency; customer: Customer
  items: { id: string; quantity: number; unitPrice: number; vehicle: Vehicle }[]
  options: { id: string; quantity: number; unitPrice: number; option: { name: any } }[]
  fleetVehicleId?: string; checkedIn?: boolean; checkedOut?: boolean
}

type Tab = 'dashboard' | 'planning' | 'bookings' | 'fleet' | 'vehicles' | 'customers' | 'contracts' | 'invoices'
const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

function App() {
  const [tab, setTab] = useState<Tab>('planning')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fleet, setFleet] = useState<FleetVehicle[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedAgency, setSelectedAgency] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showNewBookingModal, setShowNewBookingModal] = useState(false)
  const [newBookingData, setNewBookingData] = useState<{ fleetVehicle: FleetVehicle; date: string } | null>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<FleetVehicle | null>(null)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignBooking, setAssignBooking] = useState<Booking | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [agRes, vehRes, bookRes, custRes, fleetRes] = await Promise.all([
        fetch(API_URL + '/api/agencies'), fetch(API_URL + '/api/vehicles'),
        fetch(API_URL + '/api/bookings'), fetch(API_URL + '/api/customers'), fetch(API_URL + '/api/fleet')
      ])
      setAgencies(await agRes.json()); setVehicles(await vehRes.json())
      setBookings(await bookRes.json()); setCustomers(await custRes.json()); setFleet(await fleetRes.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const getWeekDays = () => {
    const start = new Date(currentWeek); start.setDate(start.getDate() - start.getDay() + 1)
    return Array.from({ length: 10 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const filteredFleet = fleet.filter(f => (selectedAgency === 'all' || f.agency.id === selectedAgency) && (selectedBrand === 'ALL' || f.vehicle.category.brand === selectedBrand))
  const filteredVehicles = vehicles.filter(v => selectedBrand === 'ALL' || v.category?.brand === selectedBrand)
  const filteredBookings = bookings.filter(b => (selectedAgency === 'all' || b.agency.id === selectedAgency) && (selectedBrand === 'ALL' || b.agency.brand === selectedBrand))

  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d) }
  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d) }
  const handleCellClick = (fleetVehicle: FleetVehicle, date: Date) => { setNewBookingData({ fleetVehicle, date: formatDate(date) }); setShowNewBookingModal(true) }
  const handleCheckIn = (booking: Booking) => { setCheckInBooking(booking); setShowCheckInModal(true) }
  const handleCheckOut = (booking: Booking) => { setCheckInBooking(booking); setShowCheckOutModal(true) }
  const handleAssign = (booking: Booking) => { setAssignBooking(booking); setShowAssignModal(true) }
  const openContract = (booking: Booking) => { setSelectedBooking(booking); setShowContractModal(true) }
  const openInvoice = (booking: Booking) => { setSelectedBooking(booking); setShowInvoiceModal(true) }

  const days = getWeekDays()
  const today = formatDate(new Date())
  const checkInsToday = bookings.filter(b => b.startDate.split('T')[0] === today && !b.checkedIn && b.status === 'CONFIRMED')
  const checkOutsToday = bookings.filter(b => b.endDate.split('T')[0] === today && b.checkedIn && !b.checkedOut)
  const pendingBookings = bookings.filter(b => b.status === 'PENDING')
  const unassignedBookings = bookings.filter(b => !b.fleetVehicleId && (b.status === 'CONFIRMED' || b.status === 'PENDING'))

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">⚡ VOLTRIDE OPERATOR</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => { setNewBookingData(null); setShowNewBookingModal(true) }} className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">+ Nouvelle réservation</button>
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="border rounded-lg px-4 py-2">
              <option value="ALL">Toutes les marques</option><option value="VOLTRIDE">Voltride</option><option value="MOTOR-RENT">Motor-Rent</option>
            </select>
            <select value={selectedAgency} onChange={e => setSelectedAgency(e.target.value)} className="border rounded-lg px-4 py-2">
              <option value="all">Toutes les agences</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.city}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-56 bg-white border-r min-h-screen p-4">
          {[
            { id: 'dashboard', icon: '🏠', label: 'Dashboard', badge: checkInsToday.length + checkOutsToday.length },
            { id: 'planning', icon: '📅', label: 'Planning', badge: 0 },
            { id: 'bookings', icon: '📋', label: 'Réservations', badge: pendingBookings.length },
            { id: 'fleet', icon: '🏍️', label: 'Flotte', badge: 0 },
            { id: 'vehicles', icon: '🚲', label: 'Types véhicules', badge: 0 },
            { id: 'customers', icon: '👥', label: 'Clients', badge: 0 },
            { id: 'contracts', icon: '📄', label: 'Contrats', badge: 0 },
            { id: 'invoices', icon: '💰', label: 'Factures', badge: 0 },
          ].map(item => (
            <button key={item.id} onClick={() => { setTab(item.id as Tab); setSelectedFleetVehicle(null) }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 mb-1 ${tab === item.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
              <span>{item.icon}</span><span>{item.label}</span>
              {item.badge > 0 && <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${tab === item.id ? 'bg-white text-blue-500' : 'bg-yellow-500 text-white'}`}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6">
          {tab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-6 shadow border-l-4 border-green-500"><p className="text-gray-500 text-sm">Check-ins</p><p className="text-4xl font-bold text-green-600">{checkInsToday.length}</p></div>
                <div className="bg-white rounded-xl p-6 shadow border-l-4 border-orange-500"><p className="text-gray-500 text-sm">Check-outs</p><p className="text-4xl font-bold text-orange-600">{checkOutsToday.length}</p></div>
                <div className="bg-white rounded-xl p-6 shadow border-l-4 border-yellow-500"><p className="text-gray-500 text-sm">En attente</p><p className="text-4xl font-bold text-yellow-600">{pendingBookings.length}</p></div>
                <div className="bg-white rounded-xl p-6 shadow border-l-4 border-red-500"><p className="text-gray-500 text-sm">Non assignées</p><p className="text-4xl font-bold text-red-600">{unassignedBookings.length}</p></div>
              </div>
              {unassignedBookings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-red-800 mb-2">⚠️ Réservations sans véhicule</h3>
                  {unassignedBookings.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-white p-3 rounded-lg mb-2">
                      <span>{b.reference} - {b.customer.lastName} - {new Date(b.startDate).toLocaleDateString('fr-FR')}</span>
                      <button onClick={() => handleAssign(b)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Assigner</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'planning' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="text-2xl font-bold">Planning</h2><p className="text-gray-500">Semaine du {days[0].toLocaleDateString('fr-FR')} au {days[9].toLocaleDateString('fr-FR')}</p></div>
                <div className="flex gap-2">
                  <button onClick={prevWeek} className="px-4 py-2 bg-gray-200 rounded-lg">← Précédent</button>
                  <button onClick={() => setCurrentWeek(new Date())} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Aujourd'hui</button>
                  <button onClick={nextWeek} className="px-4 py-2 bg-gray-200 rounded-lg">Suivant →</button>
                </div>
              </div>
              {filteredFleet.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-8 text-center">
                  <p className="text-4xl mb-4">🚲</p><p className="text-gray-500 mb-4">Aucun véhicule dans la flotte</p>
                  <button onClick={() => setTab('fleet')} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Gérer la flotte</button>
                </div>
              ) : (
                <AdvancedPlanning fleet={filteredFleet} bookings={filteredBookings} days={days} selectedAgency={selectedAgency}
                  onBookingClick={(b) => { setSelectedBooking(b); setShowBookingModal(true) }} onCellClick={handleCellClick}
                  onBookingUpdate={loadData} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
              )}
            </div>
          )}

          {tab === 'bookings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Réservations ({filteredBookings.length})</h2>
                <button onClick={() => { setNewBookingData(null); setShowNewBookingModal(true) }} className="px-4 py-2 bg-green-500 text-white rounded-lg">+ Nouvelle</button>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">Référence</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Dates</th>
                    <th className="px-4 py-3 text-left">Véhicule</th><th className="px-4 py-3 text-left">Assigné</th><th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const assigned = fleet.find(f => f.id === b.fleetVehicleId)
                      return (
                        <tr key={b.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-blue-600">{b.reference}</td>
                          <td className="px-4 py-3"><p className="font-bold">{b.customer.firstName} {b.customer.lastName}</p></td>
                          <td className="px-4 py-3">{new Date(b.startDate).toLocaleDateString('fr-FR')} → {new Date(b.endDate).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3">{b.items.map(i => getName(i.vehicle.name)).join(', ')}</td>
                          <td className="px-4 py-3">{assigned ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{assigned.vehicleNumber}</span> : <button onClick={() => handleAssign(b)} className="text-blue-600 text-sm">Assigner</button>}</td>
                          <td className="px-4 py-3 font-bold">{b.totalPrice}€</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs text-white ${b.checkedOut ? 'bg-gray-400' : b.checkedIn ? 'bg-green-600' : b.status === 'CONFIRMED' ? 'bg-blue-500' : 'bg-yellow-500'}`}>{b.checkedOut ? 'Terminé' : b.checkedIn ? 'En cours' : b.status}</span></td>
                          <td className="px-4 py-3"><button onClick={() => { setSelectedBooking(b); setShowBookingModal(true) }} className="px-2 py-1 bg-gray-200 rounded text-xs">Détails</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'fleet' && (selectedFleetVehicle ? <FleetDetail vehicle={selectedFleetVehicle} onBack={() => setSelectedFleetVehicle(null)} onUpdate={() => { loadData(); setSelectedFleetVehicle(null) }} /> : <FleetList selectedAgency={selectedAgency} selectedBrand={selectedBrand} onSelectVehicle={setSelectedFleetVehicle} />)}

          {tab === 'vehicles' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Types de véhicules ({filteredVehicles.length})</h2>
              <div className="grid grid-cols-4 gap-4">
                {filteredVehicles.map(v => (
                  <div key={v.id} className="bg-white rounded-xl shadow overflow-hidden">
                    {v.imageUrl ? <img src={v.imageUrl} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-4xl">🚲</div>}
                    <div className="p-4"><h3 className="font-bold">{getName(v.name)}</h3><p className="text-sm text-gray-500">{v.sku}</p><p className="text-sm mt-2">Caution: {v.deposit}€</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'customers' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Clients ({customers.length})</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Nom</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Téléphone</th><th className="px-4 py-3 text-left">Réservations</th></tr></thead>
                  <tbody>{customers.map(c => <tr key={c.id} className="border-t"><td className="px-4 py-3 font-bold">{c.firstName} {c.lastName}</td><td className="px-4 py-3">{c.email}</td><td className="px-4 py-3">{c.phone}</td><td className="px-4 py-3">{bookings.filter(b => b.customer.id === c.id).length}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'contracts' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Contrats</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Référence</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Période</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
                  <tbody>{filteredBookings.filter(b => b.status === 'CONFIRMED' || b.checkedIn).map(b => <tr key={b.id} className="border-t"><td className="px-4 py-3 font-mono">{b.reference}</td><td className="px-4 py-3">{b.customer.firstName} {b.customer.lastName}</td><td className="px-4 py-3">{new Date(b.startDate).toLocaleDateString('fr-FR')} → {new Date(b.endDate).toLocaleDateString('fr-FR')}</td><td className="px-4 py-3"><button onClick={() => openContract(b)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Voir</button></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'invoices' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Factures</h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">N°</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Montant</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
                  <tbody>{filteredBookings.filter(b => b.status === 'CONFIRMED' || b.checkedIn).map(b => <tr key={b.id} className="border-t"><td className="px-4 py-3 font-mono">FAC-{b.reference}</td><td className="px-4 py-3">{b.customer.firstName} {b.customer.lastName}</td><td className="px-4 py-3">{new Date(b.startDate).toLocaleDateString('fr-FR')}</td><td className="px-4 py-3 font-bold">{b.totalPrice}€</td><td className="px-4 py-3"><button onClick={() => openInvoice(b)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Voir</button></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBookingModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{selectedBooking.reference}</h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg"><p className="font-bold">{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p><p className="text-sm">{selectedBooking.customer.email} • {selectedBooking.customer.phone}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Début</p><p className="font-bold">{new Date(selectedBooking.startDate).toLocaleDateString('fr-FR')} {selectedBooking.startTime}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Fin</p><p className="font-bold">{new Date(selectedBooking.endDate).toLocaleDateString('fr-FR')} {selectedBooking.endTime}</p></div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg flex justify-between"><span>Total</span><span className="text-xl font-bold text-blue-600">{selectedBooking.totalPrice}€</span></div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {!selectedBooking.checkedIn && selectedBooking.status === 'CONFIRMED' && selectedBooking.fleetVehicleId && <button onClick={() => { setShowBookingModal(false); handleCheckIn(selectedBooking) }} className="px-4 py-2 bg-green-500 text-white rounded-lg">Check-in</button>}
              {selectedBooking.checkedIn && !selectedBooking.checkedOut && <button onClick={() => { setShowBookingModal(false); handleCheckOut(selectedBooking) }} className="px-4 py-2 bg-orange-500 text-white rounded-lg">Check-out</button>}
              <button onClick={() => { setShowBookingModal(false); openContract(selectedBooking) }} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Contrat</button>
              <button onClick={() => setShowBookingModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg ml-auto">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowContractModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8"><h1 className="text-2xl font-bold">CONTRAT DE LOCATION</h1><p className="text-gray-500">N° {selectedBooking.reference}</p></div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div><h3 className="font-bold mb-2">LOUEUR</h3><p>Voltride Group</p><p>{selectedBooking.agency.city}</p></div>
              <div><h3 className="font-bold mb-2">LOCATAIRE</h3><p>{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p><p>{selectedBooking.customer.email}</p></div>
            </div>
            <div className="border rounded-lg p-4 mb-6"><h3 className="font-bold mb-2">VÉHICULES</h3>{selectedBooking.items.map(i => <p key={i.id}>{getName(i.vehicle.name)} x{i.quantity} - {i.unitPrice * i.quantity}€</p>)}</div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="border rounded-lg p-4"><h3 className="font-bold mb-2">PÉRIODE</h3><p>Du: {new Date(selectedBooking.startDate).toLocaleDateString('fr-FR')} {selectedBooking.startTime}</p><p>Au: {new Date(selectedBooking.endDate).toLocaleDateString('fr-FR')} {selectedBooking.endTime}</p></div>
              <div className="border rounded-lg p-4"><h3 className="font-bold mb-2">MONTANTS</h3><p>Total: {selectedBooking.totalPrice}€</p><p>Caution: {selectedBooking.depositAmount}€</p></div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4"><button onClick={() => window.print()} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Imprimer</button><button onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Fermer</button></div>
          </div>
        </div>
      )}

      {showInvoiceModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-8"><div><h1 className="text-3xl font-bold text-blue-600">FACTURE</h1><p className="text-gray-500">N° FAC-{selectedBooking.reference}</p></div><div className="text-right"><h2 className="font-bold">Voltride Group</h2><p>{selectedBooking.agency.city}</p></div></div>
            <div className="mb-6"><h3 className="font-bold mb-2">FACTURER À:</h3><p>{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p><p>{selectedBooking.customer.email}</p></div>
            <table className="w-full mb-6"><thead><tr className="bg-gray-100"><th className="text-left p-3">Description</th><th className="text-center p-3">Qté</th><th className="text-right p-3">Prix</th><th className="text-right p-3">Total</th></tr></thead><tbody>{selectedBooking.items.map(i => <tr key={i.id} className="border-b"><td className="p-3">{getName(i.vehicle.name)}</td><td className="text-center p-3">{i.quantity}</td><td className="text-right p-3">{i.unitPrice}€</td><td className="text-right p-3">{i.unitPrice * i.quantity}€</td></tr>)}</tbody></table>
            <div className="flex justify-end"><div className="w-64"><div className="flex justify-between py-2"><span>Sous-total HT</span><span>{(selectedBooking.totalPrice / 1.21).toFixed(2)}€</span></div><div className="flex justify-between py-2"><span>TVA (21%)</span><span>{(selectedBooking.totalPrice - selectedBooking.totalPrice / 1.21).toFixed(2)}€</span></div><div className="flex justify-between py-2 border-t font-bold text-lg"><span>Total TTC</span><span className="text-blue-600">{selectedBooking.totalPrice}€</span></div></div></div>
            <div className="flex justify-end gap-3 border-t pt-4 mt-4"><button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded-lg">Imprimer</button><button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Fermer</button></div>
          </div>
        </div>
      )}

      {showNewBookingModal && <NewBookingModal fleetVehicle={newBookingData?.fleetVehicle || null} initialDate={newBookingData?.date} agencies={agencies} onClose={() => { setShowNewBookingModal(false); setNewBookingData(null) }} onCreated={() => { setShowNewBookingModal(false); setNewBookingData(null); loadData() }} />}
      {showAssignModal && assignBooking && <AssignVehicleModal booking={assignBooking} fleet={fleet} onClose={() => { setShowAssignModal(false); setAssignBooking(null) }} onAssigned={() => { setShowAssignModal(false); setAssignBooking(null); loadData() }} />}
      {showCheckInModal && checkInBooking && <CheckInModal booking={checkInBooking} fleetVehicle={fleet.find(f => f.id === checkInBooking.fleetVehicleId) || null} onClose={() => { setShowCheckInModal(false); setCheckInBooking(null) }} onComplete={() => { setShowCheckInModal(false); setCheckInBooking(null); loadData() }} />}
      {showCheckOutModal && checkInBooking && <CheckOutModal booking={checkInBooking} fleetVehicle={fleet.find(f => f.id === checkInBooking.fleetVehicleId) || null} onClose={() => { setShowCheckOutModal(false); setCheckInBooking(null) }} onComplete={() => { setShowCheckOutModal(false); setCheckInBooking(null); loadData() }} />}
    </div>
  )
}

export default App
