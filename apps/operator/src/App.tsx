import { useState, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

// ============== MAIN APP ==============
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

  const days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => { loadData() }, [selectedAgency, brand])

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

  // Dashboard counts
  const todayDepartures = bookings.filter(b => b.startDate?.split('T')[0] === today && !b.checkedIn)
  const todayReturns = bookings.filter(b => b.endDate?.split('T')[0] === today && b.checkedIn && !b.checkedOut)

  const filteredFleet = fleet.filter(f => !selectedAgency || f.agencyId === selectedAgency)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold" style={{ color: brand === 'VOLTRIDE' ? '#abdee6' : '#ffaf10' }}>
            {brand === 'VOLTRIDE' ? '⚡ VOLTRIDE' : '🏍️ MOTOR-RENT'}
          </h1>
          <select 
            value={brand} 
            onChange={e => { setBrand(e.target.value); setSelectedAgency('') }}
            className="mt-2 w-full text-sm border rounded p-1"
          >
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
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={'w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 ' +
                (tab === item.id ? 'bg-primary/20 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100')}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white shadow px-6 py-4 flex items-center gap-4">
          <select 
            value={selectedAgency} 
            onChange={e => setSelectedAgency(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Toutes les agences</option>
            {agencies.map(a => (
              <option key={a.id} value={a.id}>{a.city} ({a.code})</option>
            ))}
          </select>
          <div className="flex-1" />
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div className="p-6">
          {loading && <div className="text-center py-10">Chargement...</div>}

          {/* DASHBOARD */}
          {!loading && tab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg transition">
                  <div className="text-4xl font-bold text-blue-600">{todayDepartures.length}</div>
                  <div className="text-gray-600">Départs du jour</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg transition">
                  <div className="text-4xl font-bold text-green-600">{todayReturns.length}</div>
                  <div className="text-gray-600">Retours du jour</div>
                </div>
              </div>
            </div>
          )}

          {/* PLANNING */}
          {!loading && tab === 'planning' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Planning</h2>
                <div className="flex-1" />
                <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })} className="px-3 py-1 bg-gray-200 rounded">← Précédent</button>
                <button onClick={() => setWeekStart(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d })} className="px-3 py-1 bg-primary text-gray-800 rounded">Aujourd'hui</button>
                <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })} className="px-3 py-1 bg-gray-200 rounded">Suivant →</button>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-medium w-48 z-10">Véhicule</th>
                        {days.map((day, i) => {
                          const dateStr = formatDate(day)
                          const isToday = dateStr === today
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          return (
                            <th key={i} className={'px-2 py-2 text-center min-w-[90px] ' + (isToday ? 'bg-yellow-100' : isWeekend ? 'bg-gray-100' : '')}>
                              <div className="text-xs text-gray-500">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                              <div className={'text-lg ' + (isToday ? 'font-bold text-yellow-600' : '')}>{day.getDate()}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFleet.map((f, vehicleIndex) => (
                        <tr key={f.id} className="border-t">
                          <td className="sticky left-0 bg-white px-4 py-2 z-10 border-r">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                {f.vehicle?.imageUrl ? <img src={f.vehicle.imageUrl} className="w-10 h-10 rounded object-cover" /> : '🚲'}
                              </div>
                              <div>
                                <div className="font-bold text-sm">{f.vehicleNumber}</div>
                                <div className="text-xs text-gray-500">{getName(f.vehicle?.name)}</div>
                              </div>
                            </div>
                          </td>
                          {days.map((day, dayIndex) => {
                            const dateStr = formatDate(day)
                            const isToday = dateStr === today
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6
                            
                            const cellBookings = bookings.filter(b => {
                              if (b.fleetVehicleId !== f.id) return false
                              const start = b.startDate?.split('T')[0]
                              const end = b.endDate?.split('T')[0]
                              return dateStr >= start && dateStr <= end
                            })

                            return (
                              <td key={dayIndex} className={'px-1 py-1 h-14 relative ' + (isToday ? 'bg-yellow-50' : isWeekend ? 'bg-gray-50' : '')}>
                                {cellBookings.map((booking, bi) => {
                                  const start = booking.startDate?.split('T')[0]
                                  const end = booking.endDate?.split('T')[0]
                                  const isStart = dateStr === start
                                  const isEnd = dateStr === end
                                  const colorClass = booking.checkedIn ? 'bg-green-600' : (bi % 2 === 0 ? 'bg-blue-500' : 'bg-violet-500')
                                  
                                  return (
                                    <div
                                      key={booking.id}
                                      className={'absolute inset-y-1 text-white text-xs flex items-center px-2 cursor-pointer hover:brightness-110 ' + colorClass}
                                      style={{
                                        left: isStart ? '4px' : '0',
                                        right: isEnd ? '4px' : '0',
                                        borderRadius: (isStart ? '6px ' : '0 ') + (isEnd ? '6px ' : '0 ') + (isEnd ? '6px ' : '0 ') + (isStart ? '6px' : '0'),
                                        marginLeft: isStart ? '0' : '-1px',
                                        marginRight: isEnd ? '0' : '-1px'
                                      }}
                                      title={booking.customer?.firstName + ' ' + booking.customer?.lastName}
                                    >
                                      {isStart && <span className="truncate">{booking.startTime} {booking.customer?.lastName}</span>}
                                    </div>
                                  )
                                })}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* BOOKINGS */}
          {!loading && tab === 'bookings' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Réservations à assigner</h2>
              <div className="bg-white rounded-xl shadow">
                {bookings.filter(b => !b.fleetVehicleId && b.status !== 'CANCELLED').length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Toutes les réservations sont assignées ✓</div>
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
                        <tr key={b.id} className="border-t">
                          <td className="px-4 py-3 font-mono text-sm">{b.reference}</td>
                          <td className="px-4 py-3">{b.customer?.firstName} {b.customer?.lastName}</td>
                          <td className="px-4 py-3 text-sm">{new Date(b.startDate).toLocaleDateString('fr-FR')} → {new Date(b.endDate).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3">{getName(b.items?.[0]?.vehicle?.name)}</td>
                          <td className="px-4 py-3"><button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Assigner</button></td>
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
                  <div key={f.id} className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-center gap-3">
                      {f.vehicle?.imageUrl ? (
                        <img src={f.vehicle.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">🚲</div>
                      )}
                      <div className="flex-1">
                        <div className="font-bold">{f.vehicleNumber}</div>
                        <div className="text-sm text-gray-600">{getName(f.vehicle?.name)}</div>
                        <div className={'text-xs px-2 py-0.5 rounded inline-block mt-1 ' + 
                          (f.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 
                           f.status === 'RENTED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}>
                          {f.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOMERS */}
          {!loading && tab === 'customers' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Clients</h2>
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                Module Clients - À développer
              </div>
            </div>
          )}

          {/* CONTRACTS */}
          {!loading && tab === 'contracts' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Contrats</h2>
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                Module Contrats - À développer
              </div>
            </div>
          )}

          {/* INVOICES */}
          {!loading && tab === 'invoices' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Factures</h2>
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                Module Factures - À développer
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
