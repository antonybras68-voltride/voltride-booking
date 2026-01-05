import { useState, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

// Types Fleet
export interface FleetVehicle {
  id: string
  vehicleNumber: string
  licensePlate?: string
  chassisNumber: string
  status: 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  currentMileage: number
  year?: number
  color?: string
  itvExpiryDate?: string
  insuranceExpiryDate?: string
  notes?: string
  vehicle: {
    id: string
    sku: string
    name: any
    imageUrl?: string
    deposit: number
    category: { id: string; name: any; brand: string }
  }
  agency: { id: string; code: string; name: any; city: string }
  damages: FleetDamage[]
  documents: FleetDocument[]
}

export interface FleetDamage {
  id: string
  description: string
  location: string
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL'
  photoUrl: string
  isResolved: boolean
  reportedAt: string
}

export interface FleetDocument {
  id: string
  type: string
  name: string
  fileUrl: string
  expiryDate?: string
  sendToCustomer: boolean
}

export interface RentalContract {
  id: string
  contractNumber: string
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  currentStartDate: string
  currentEndDate: string
  totalAmount: number
  depositAmount: number
  depositStatus: string
  paymentStatus: string
  fleetVehicle: FleetVehicle
  customer: { id: string; firstName: string; lastName: string; email: string; phone: string }
  agency: { id: string; city: string }
}

const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

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

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-green-500',
  GOOD: 'bg-blue-500',
  FAIR: 'bg-yellow-500',
  POOR: 'bg-red-500'
}

// ============== FLEET LIST ==============
export function FleetList({ 
  selectedAgency, 
  selectedBrand,
  onSelectVehicle 
}: { 
  selectedAgency: string
  selectedBrand: string
  onSelectVehicle: (vehicle: FleetVehicle) => void 
}) {
  const [fleet, setFleet] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadFleet()
  }, [selectedAgency])

  const loadFleet = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedAgency !== 'all') params.append('agencyId', selectedAgency)
      const res = await fetch(`${API_URL}/api/fleet?${params}`)
      setFleet(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const filteredFleet = fleet.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (selectedBrand !== 'ALL' && f.vehicle.category.brand !== selectedBrand) return false
    return true
  })

  const stats = {
    total: fleet.length,
    available: fleet.filter(f => f.status === 'AVAILABLE').length,
    rented: fleet.filter(f => f.status === 'RENTED').length,
    maintenance: fleet.filter(f => f.status === 'MAINTENANCE').length
  }

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Flotte de véhicules</h2>
          <p className="text-gray-500">{filteredFleet.length} véhicules</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2">
          <span>+</span> Ajouter un véhicule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Disponibles</p>
          <p className="text-3xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">En location</p>
          <p className="text-3xl font-bold text-blue-600">{stats.rented}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-orange-500">
          <p className="text-gray-500 text-sm">Maintenance</p>
          <p className="text-3xl font-bold text-orange-600">{stats.maintenance}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['all', 'AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm ${statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {status === 'all' ? 'Tous' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredFleet.map(f => (
          <div 
            key={f.id} 
            onClick={() => onSelectVehicle(f)}
            className="bg-white rounded-xl shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="relative">
              {f.vehicle.imageUrl ? (
                <img src={f.vehicle.imageUrl} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-4xl">🚲</div>
              )}
              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${STATUS_COLORS[f.status]}`}>
                {STATUS_LABELS[f.status]}
              </span>
              {f.damages.filter(d => !d.isResolved).length > 0 && (
                <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs bg-red-500 text-white">
                  ⚠️ {f.damages.filter(d => !d.isResolved).length} dégât(s)
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{f.vehicleNumber}</h3>
                <span className={`text-xs px-2 py-1 rounded text-white ${f.vehicle.category.brand === 'VOLTRIDE' ? 'bg-blue-500' : 'bg-red-500'}`}>
                  {f.vehicle.category.brand}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{getName(f.vehicle.name)}</p>
              {f.licensePlate && <p className="text-gray-500 text-sm">🚗 {f.licensePlate}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${CONDITION_COLORS[f.condition]}`}></span>
                  <span className="text-xs text-gray-500">{f.condition}</span>
                </div>
                <span className="text-sm text-gray-500">{f.currentMileage.toLocaleString()} km</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">📍 {f.agency.city}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredFleet.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">🚲</p>
          <p>Aucun véhicule trouvé</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddFleetModal 
          onClose={() => setShowAddModal(false)} 
          onAdded={() => { loadFleet(); setShowAddModal(false) }}
          selectedAgency={selectedAgency}
        />
      )}
    </div>
  )
}

// ============== FLEET DETAIL ==============
export function FleetDetail({ 
  vehicle, 
  onBack,
  onUpdate
}: { 
  vehicle: FleetVehicle
  onBack: () => void
  onUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'damages' | 'maintenance' | 'history'>('info')
  const [damages, setDamages] = useState<FleetDamage[]>(vehicle.damages || [])
  const [documents, setDocuments] = useState<FleetDocument[]>(vehicle.documents || [])
  const [showAddDamageModal, setShowAddDamageModal] = useState(false)

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`${API_URL}/api/fleet/${vehicle.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      onUpdate()
    } catch (e) { console.error(e) }
  }

  const unresolvedDamages = damages.filter(d => !d.isResolved)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">← Retour</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{vehicle.vehicleNumber}</h2>
            <span className={`px-3 py-1 rounded-full text-white text-sm ${STATUS_COLORS[vehicle.status]}`}>
              {STATUS_LABELS[vehicle.status]}
            </span>
          </div>
          <p className="text-gray-500">{getName(vehicle.vehicle.name)} • {vehicle.agency.city}</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={vehicle.status} 
            onChange={(e) => updateStatus(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="AVAILABLE">Disponible</option>
            <option value="RESERVED">Réservé</option>
            <option value="RENTED">En location</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Hors service</option>
          </select>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Kilométrage</p>
          <p className="text-2xl font-bold">{vehicle.currentMileage.toLocaleString()} km</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">État</p>
          <p className="text-2xl font-bold">{vehicle.condition}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Dégâts non résolus</p>
          <p className={`text-2xl font-bold ${unresolvedDamages.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {unresolvedDamages.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Caution</p>
          <p className="text-2xl font-bold">{vehicle.vehicle.deposit}€</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow">
        <div className="flex border-b">
          {[
            { id: 'info', label: '📋 Informations' },
            { id: 'documents', label: '📄 Documents' },
            { id: 'damages', label: `⚠️ Dégâts (${unresolvedDamages.length})` },
            { id: 'maintenance', label: '🔧 Maintenance' },
            { id: 'history', label: '📜 Historique' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-6 py-4 font-medium ${activeTab === t.id ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-4">Identification</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Numéro</span>
                    <span className="font-mono font-bold">{vehicle.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Plaque</span>
                    <span>{vehicle.licensePlate || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Châssis</span>
                    <span className="font-mono text-sm">{vehicle.chassisNumber}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Année</span>
                    <span>{vehicle.year || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Couleur</span>
                    <span>{vehicle.color || '-'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-4">Documents officiels</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">ITV expire le</span>
                    <span className={vehicle.itvExpiryDate && new Date(vehicle.itvExpiryDate) < new Date() ? 'text-red-500 font-bold' : ''}>
                      {vehicle.itvExpiryDate ? new Date(vehicle.itvExpiryDate).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Assurance expire le</span>
                    <span className={vehicle.insuranceExpiryDate && new Date(vehicle.insuranceExpiryDate) < new Date() ? 'text-red-500 font-bold' : ''}>
                      {vehicle.insuranceExpiryDate ? new Date(vehicle.insuranceExpiryDate).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                </div>
                {vehicle.notes && (
                  <div className="mt-4">
                    <h3 className="font-bold mb-2">Notes</h3>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{vehicle.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Documents du véhicule</h3>
                <button className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm">+ Ajouter</button>
              </div>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun document</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {documents.map(d => (
                    <div key={d.id} className="border rounded-lg p-4">
                      <p className="font-bold">{d.name}</p>
                      <p className="text-sm text-gray-500">{d.type}</p>
                      {d.expiryDate && (
                        <p className={`text-sm ${new Date(d.expiryDate) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                          Expire: {new Date(d.expiryDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      {d.sendToCustomer && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Client</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Damages Tab */}
          {activeTab === 'damages' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Dégâts signalés</h3>
                <button 
                  onClick={() => setShowAddDamageModal(true)}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                >
                  + Signaler un dégât
                </button>
              </div>
              {damages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun dégât signalé ✅</p>
              ) : (
                <div className="space-y-4">
                  {damages.map(d => (
                    <div key={d.id} className={`border rounded-lg p-4 ${d.isResolved ? 'bg-gray-50 opacity-60' : ''}`}>
                      <div className="flex gap-4">
                        {d.photoUrl && <img src={d.photoUrl} className="w-24 h-24 rounded object-cover" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs text-white ${
                              d.severity === 'CRITICAL' ? 'bg-red-600' :
                              d.severity === 'MAJOR' ? 'bg-red-500' :
                              d.severity === 'MODERATE' ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}>{d.severity}</span>
                            <span className="text-sm text-gray-500">{d.location}</span>
                            {d.isResolved && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Résolu</span>}
                          </div>
                          <p className="font-medium">{d.description}</p>
                          <p className="text-xs text-gray-400 mt-1">Signalé le {new Date(d.reportedAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {!d.isResolved && (
                          <button className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm h-fit">
                            ✓ Résoudre
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Historique de maintenance</h3>
                <button className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm">+ Nouvelle intervention</button>
              </div>
              <p className="text-gray-500 text-center py-8">Aucune maintenance enregistrée</p>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="font-bold mb-4">Historique des locations</h3>
              <p className="text-gray-500 text-center py-8">Historique à venir...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============== ADD FLEET MODAL ==============
function AddFleetModal({ 
  onClose, 
  onAdded,
  selectedAgency 
}: { 
  onClose: () => void
  onAdded: () => void
  selectedAgency: string
}) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [agencies, setAgencies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    vehicleId: '',
    agencyId: selectedAgency !== 'all' ? selectedAgency : '',
    chassisNumber: '',
    licensePlate: '',
    year: '',
    color: '',
    currentMileage: '0'
  })

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/vehicles`).then(r => r.json()),
      fetch(`${API_URL}/api/agencies`).then(r => r.json())
    ]).then(([v, a]) => {
      setVehicles(v)
      setAgencies(a)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/fleet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : null,
          currentMileage: parseInt(form.currentMileage) || 0
        })
      })
      if (res.ok) onAdded()
      else alert('Erreur lors de la création')
    } catch (e) { alert('Erreur réseau') }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Ajouter un véhicule à la flotte</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de véhicule *</label>
            <select 
              value={form.vehicleId} 
              onChange={e => setForm({...form, vehicleId: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Sélectionner...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{getName(v.name)} ({v.sku})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agence *</label>
            <select 
              value={form.agencyId} 
              onChange={e => setForm({...form, agencyId: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Sélectionner...</option>
              {agencies.map(a => (
                <option key={a.id} value={a.id}>{a.city} ({a.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">N° de châssis *</label>
            <input 
              type="text"
              value={form.chassisNumber}
              onChange={e => setForm({...form, chassisNumber: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plaque d'immatriculation</label>
              <input 
                type="text"
                value={form.licensePlate}
                onChange={e => setForm({...form, licensePlate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Année</label>
              <input 
                type="number"
                value={form.year}
                onChange={e => setForm({...form, year: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <input 
                type="text"
                value={form.color}
                onChange={e => setForm({...form, color: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage initial</label>
              <input 
                type="number"
                value={form.currentMileage}
                onChange={e => setForm({...form, currentMileage: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Ajouter le véhicule'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default { FleetList, FleetDetail }
