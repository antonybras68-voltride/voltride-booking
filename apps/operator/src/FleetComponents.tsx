import { useState, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

// Types
export interface FleetVehicle {
  id: string
  vehicleNumber: string
  licensePlate?: string
  chassisNumber: string
  status: string
  condition: string
  currentMileage: number
  year?: number
  color?: string
  itvDate?: string
  itvExpiryDate?: string
  insuranceCompany?: string
  insurancePolicyNumber?: string
  insuranceExpiryDate?: string
  notes?: string
  vehicle: { id: string; name: any; imageUrl?: string; deposit: number; category: { brand: string } }
  agency: { id: string; city: string; code: string }
  documents?: any[]
  damages?: any[]
  maintenanceRecords?: any[]
  spareParts?: any[]
}

const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500', RESERVED: 'bg-yellow-500', RENTED: 'bg-blue-500',
  MAINTENANCE: 'bg-orange-500', OUT_OF_SERVICE: 'bg-red-500'
}
const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', RESERVED: 'Réservé', RENTED: 'En location',
  MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Hors service'
}
const CONDITION_LABELS: Record<string, string> = {
  EXCELLENT: 'Excellent', GOOD: 'Bon', FAIR: 'Moyen', POOR: 'Mauvais'
}

// ============== FLEET LIST ==============
export function FleetList({ selectedAgency, selectedBrand, onSelectVehicle }: {
  selectedAgency: string; selectedBrand: string; onSelectVehicle: (v: FleetVehicle) => void
}) {
  const [fleet, setFleet] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => { loadFleet() }, [selectedAgency, selectedBrand])

  const loadFleet = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/fleet`)
      let data = await res.json()
      if (selectedAgency !== 'all') data = data.filter((f: FleetVehicle) => f.agency.id === selectedAgency)
      if (selectedBrand !== 'ALL') data = data.filter((f: FleetVehicle) => f.vehicle.category.brand === selectedBrand)
      setFleet(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/fleet/${id}`, { method: 'DELETE' })
      loadFleet()
      setDeleteConfirm(null)
    } catch (e) { console.error(e) }
  }

  const filtered = filter === 'ALL' ? fleet : fleet.filter(f => f.status === filter)
  const stats = {
    total: fleet.length,
    available: fleet.filter(f => f.status === 'AVAILABLE').length,
    rented: fleet.filter(f => f.status === 'RENTED').length,
    maintenance: fleet.filter(f => f.status === 'MAINTENANCE').length
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Flotte de véhicules</h2>
          <p className="text-gray-500">{fleet.length} véhicules</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg">+ Ajouter un véhicule</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Total</p><p className="text-2xl sm:text-3xl font-bold">{stats.total}</p></div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-green-500"><p className="text-gray-500 text-sm">Disponibles</p><p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.available}</p></div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-blue-500"><p className="text-gray-500 text-sm">En location</p><p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.rented}</p></div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-orange-500"><p className="text-gray-500 text-sm">Maintenance</p><p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.maintenance}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['ALL', 'AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
            {s === 'ALL' ? 'Tous' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(f => (
          <div key={f.id} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="relative">
              {f.vehicle.imageUrl ? (
                <img src={f.vehicle.imageUrl} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-4xl">🚲</div>
              )}
              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-white text-xs ${STATUS_COLORS[f.status]}`}>
                {STATUS_LABELS[f.status]}
              </span>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{f.vehicleNumber}</h3>
                  <p className="text-gray-600 text-sm">{getName(f.vehicle.name)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded text-white ${f.vehicle.category.brand === 'VOLTRIDE' ? 'bg-blue-500' : 'bg-red-500'}`}>
                  {f.vehicle.category.brand}
                </span>
              </div>
              {f.licensePlate && <p className="text-sm text-gray-500">🚗 {f.licensePlate}</p>}
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-gray-500">● {CONDITION_LABELS[f.condition] || f.condition}</span>
                <span>{f.currentMileage.toLocaleString()} km</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">📍 {f.agency.city}</p>
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button onClick={() => onSelectVehicle(f)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">
                  Voir détails
                </button>
                <button onClick={() => setDeleteConfirm(f.id)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-4xl mb-4">🚲</p>
          <p className="text-gray-500">Aucun véhicule trouvé</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">⚠️ Supprimer ce véhicule ?</h3>
            <p className="text-gray-600 mb-6">Cette action est irréversible. Le véhicule sera définitivement supprimé de la flotte.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-red-500 text-white rounded-lg">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && <AddFleetModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); loadFleet() }} />}
    </div>
  )
}

// ============== FLEET DETAIL ==============
export function FleetDetail({ vehicle, onBack, onUpdate }: { vehicle: FleetVehicle; onBack: () => void; onUpdate: () => void }) {
  const [tab, setTab] = useState<'info' | 'documents' | 'damages' | 'maintenance' | 'parts'>('info')
  const [data, setData] = useState<FleetVehicle>(vehicle)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddDocModal, setShowAddDocModal] = useState(false)
  const [showAddDamageModal, setShowAddDamageModal] = useState(false)
  const [showAddMaintenanceModal, setShowAddMaintenanceModal] = useState(false)
  const [showAddSparePartModal, setShowAddSparePartModal] = useState(false)
  const [editingPart, setEditingPart] = useState<any>(null)

  useEffect(() => { loadDetails() }, [vehicle.id])

  const loadDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fleet/${vehicle.id}`)
      setData(await res.json())
    } catch (e) { console.error(e) }
  }

  const handleStatusChange = async (status: string) => {
    try {
      await fetch(`${API_URL}/api/fleet/${vehicle.id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      loadDetails()
    } catch (e) { console.error(e) }
  }

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Supprimer cette pièce ?')) return
    try {
      await fetch(`${API_URL}/api/fleet/spare-parts/${partId}`, { method: 'DELETE' })
      loadDetails()
    } catch (e) { console.error(e) }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await fetch(`${API_URL}/api/fleet/documents/${docId}`, { method: 'DELETE' })
      loadDetails()
    } catch (e) { console.error(e) }
  }

  const tabs = [
    { id: 'info', label: '📋 Informations', count: null },
    { id: 'documents', label: '📄 Documents', count: data.documents?.length || 0 },
    { id: 'damages', label: '⚠️ Dégâts', count: data.damages?.filter((d: any) => !d.resolved).length || 0 },
    { id: 'maintenance', label: '🔧 Maintenance', count: data.maintenanceRecords?.length || 0 },
    { id: 'parts', label: '🔩 Pièces', count: data.spareParts?.length || 0 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Retour</button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold">{data.vehicleNumber}</h2>
              <span className={`px-2 py-1 rounded text-white text-xs ${STATUS_COLORS[data.status]}`}>{STATUS_LABELS[data.status]}</span>
            </div>
            <p className="text-gray-500">{getName(data.vehicle.name)} • {data.agency.city}</p>
          </div>
        </div>
        <select value={data.status} onChange={e => handleStatusChange(e.target.value)} className="w-full sm:w-auto border rounded-lg px-4 py-2">
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Kilométrage</p><p className="text-xl sm:text-2xl font-bold">{data.currentMileage.toLocaleString()} km</p></div>
        <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">État</p><p className="text-xl sm:text-2xl font-bold">{CONDITION_LABELS[data.condition]}</p></div>
        <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Dégâts non résolus</p><p className="text-xl sm:text-2xl font-bold text-orange-600">{data.damages?.filter((d: any) => !d.resolved).length || 0}</p></div>
        <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Caution</p><p className="text-xl sm:text-2xl font-bold">{data.vehicle.deposit}€</p></div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm whitespace-nowrap ${tab === t.id ? 'bg-white shadow font-medium' : 'hover:bg-gray-200'}`}>
            {t.label} {t.count !== null && `(${t.count})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        {tab === 'info' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowEditModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">✏️ Modifier</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-4">Identification</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Numéro</span><span className="font-mono">{data.vehicleNumber}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Plaque</span><span>{data.licensePlate || '-'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Châssis</span><span className="font-mono text-xs">{data.chassisNumber}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Année</span><span>{data.year || '-'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Couleur</span><span>{data.color || '-'}</span></div>
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-4">Documents officiels</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">ITV passée le</span><span>{data.itvDate ? new Date(data.itvDate).toLocaleDateString('fr-FR') : '-'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">ITV expire le</span><span>{data.itvExpiryDate ? new Date(data.itvExpiryDate).toLocaleDateString('fr-FR') : '-'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Assureur</span><span>{data.insuranceCompany || '-'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">N° Police</span><span>{data.insurancePolicyNumber || '-'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Assurance expire le</span><span>{data.insuranceExpiryDate ? new Date(data.insuranceExpiryDate).toLocaleDateString('fr-FR') : '-'}</span></div>
                </div>
              </div>
            </div>
            {data.notes && <div className="mt-6 p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Notes</p><p>{data.notes}</p></div>}
          </div>
        )}

        {tab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Documents</h3>
              <button onClick={() => setShowAddDocModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">+ Ajouter</button>
            </div>
            {data.documents?.length ? (
              <div className="space-y-3">
                {data.documents.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-sm text-gray-500">{d.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.fileUrl && <a href={d.fileUrl} target="_blank" className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">Voir</a>}
                      <button onClick={() => handleDeleteDoc(d.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center py-8">Aucun document</p>}
          </div>
        )}

        {tab === 'damages' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Dégâts</h3>
              <button onClick={() => setShowAddDamageModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">+ Signaler</button>
            </div>
            {data.damages?.length ? (
              <div className="space-y-3">
                {data.damages.map((d: any) => (
                  <div key={d.id} className={`p-4 rounded-lg ${d.resolved ? 'bg-gray-100 opacity-60' : 'bg-red-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs text-white ${d.severity === 'CRITICAL' ? 'bg-red-600' : d.severity === 'MAJOR' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                          {d.severity}
                        </span>
                        <p className="font-medium mt-2">{d.description}</p>
                        <p className="text-sm text-gray-500">{d.location} • {new Date(d.reportedAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      {!d.resolved && (
                        <button onClick={async () => {
                          await fetch(`${API_URL}/api/fleet/damages/${d.id}/resolve`, { method: 'PUT' })
                          loadDetails()
                        }} className="px-3 py-1 bg-green-500 text-white rounded text-sm">✓ Résolu</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center py-8">Aucun dégât signalé</p>}
          </div>
        )}

        {tab === 'maintenance' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Maintenance</h3>
              <button onClick={() => setShowAddMaintenanceModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">+ Ajouter</button>
            </div>
            {data.maintenanceRecords?.length ? (
              <div className="space-y-3">
                {data.maintenanceRecords.map((m: any) => (
                  <div key={m.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs text-white ${m.status === 'COMPLETED' ? 'bg-green-500' : m.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-yellow-500'}`}>
                          {m.status}
                        </span>
                        <p className="font-medium mt-2">{m.type}</p>
                        <p className="text-sm text-gray-500">{m.description}</p>
                        <p className="text-xs text-gray-400">{m.mileage} km • {new Date(m.scheduledDate || m.completedAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      {m.totalCost && <p className="font-bold">{m.totalCost}€</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center py-8">Aucune maintenance enregistrée</p>}
          </div>
        )}

        {tab === 'parts' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Pièces détachées</h3>
              <button onClick={() => { setEditingPart(null); setShowAddSparePartModal(true) }} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">+ Ajouter</button>
            </div>
            {data.spareParts?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-2 text-left">Pièce</th>
                    <th className="px-4 py-2 text-left hidden sm:table-cell">Catégorie</th>
                    <th className="px-4 py-2 text-right">Prix</th>
                    <th className="px-4 py-2 text-right hidden sm:table-cell">M.O.</th>
                    <th className="px-4 py-2 text-right">Stock</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr></thead>
                  <tbody>
                    {data.spareParts.map((p: any) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-4 py-2"><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.partNumber}</p></td>
                        <td className="px-4 py-2 hidden sm:table-cell">{p.category}</td>
                        <td className="px-4 py-2 text-right">{p.price}€</td>
                        <td className="px-4 py-2 text-right hidden sm:table-cell">{p.laborCost}€</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`px-2 py-1 rounded text-xs ${p.quantityInStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.quantityInStock}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => { setEditingPart(p); setShowAddSparePartModal(true) }} className="px-2 py-1 text-blue-600 text-sm">✏️</button>
                          <button onClick={() => handleDeletePart(p.id)} className="px-2 py-1 text-red-600 text-sm">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-gray-500 text-center py-8">Aucune pièce enregistrée</p>}
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && <EditFleetModal vehicle={data} onClose={() => setShowEditModal(false)} onSaved={() => { setShowEditModal(false); loadDetails() }} />}
      {showAddDocModal && <AddDocumentModal fleetId={data.id} onClose={() => setShowAddDocModal(false)} onSaved={() => { setShowAddDocModal(false); loadDetails() }} />}
      {showAddDamageModal && <AddDamageModal fleetId={data.id} onClose={() => setShowAddDamageModal(false)} onSaved={() => { setShowAddDamageModal(false); loadDetails() }} />}
      {showAddMaintenanceModal && <AddMaintenanceModal fleetId={data.id} onClose={() => setShowAddMaintenanceModal(false)} onSaved={() => { setShowAddMaintenanceModal(false); loadDetails() }} />}
      {showAddSparePartModal && <AddSparePartModal fleetId={data.id} editPart={editingPart} onClose={() => { setShowAddSparePartModal(false); setEditingPart(null) }} onSaved={() => { setShowAddSparePartModal(false); setEditingPart(null); loadDetails() }} />}
    </div>
  )
}

// ============== ADD FLEET MODAL ==============
function AddFleetModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [agencies, setAgencies] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    vehicleId: '', agencyId: '', vehicleNumber: '', chassisNumber: '', licensePlate: '',
    year: new Date().getFullYear(), color: '', currentMileage: 0
  })

  useEffect(() => {
    fetch(`${API_URL}/api/agencies`).then(r => r.json()).then(setAgencies)
    fetch(`${API_URL}/api/vehicles`).then(r => r.json()).then(setVehicles)
  }, [])

  const handleSubmit = async () => {
    if (!form.vehicleId || !form.agencyId || !form.vehicleNumber || !form.chassisNumber) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/fleet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) onCreated()
      else alert('Erreur lors de la création')
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b"><h2 className="text-xl font-bold">Ajouter un véhicule à la flotte</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de véhicule *</label>
            <select value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              <option value="">Sélectionner...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{getName(v.name)} ({v.sku})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agence *</label>
            <select value={form.agencyId} onChange={e => setForm({...form, agencyId: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              <option value="">Sélectionner...</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.city} ({a.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Numéro de véhicule *</label>
            <input type="text" value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value})}
              className="w-full border rounded-lg px-3 py-2" placeholder="Ex: S50-001, VH-001..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Numéro de châssis *</label>
            <input type="text" value={form.chassisNumber} onChange={e => setForm({...form, chassisNumber: e.target.value})}
              className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plaque d'immatriculation</label>
              <input type="text" value={form.licensePlate} onChange={e => setForm({...form, licensePlate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Année</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage</label>
              <input type="number" value={form.currentMileage} onChange={e => setForm({...form, currentMileage: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== EDIT FLEET MODAL ==============
function EditFleetModal({ vehicle, onClose, onSaved }: { vehicle: FleetVehicle; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    licensePlate: vehicle.licensePlate || '',
    year: vehicle.year || new Date().getFullYear(),
    color: vehicle.color || '',
    currentMileage: vehicle.currentMileage || 0,
    condition: vehicle.condition || 'GOOD',
    itvDate: vehicle.itvDate?.split('T')[0] || '',
    itvExpiryDate: vehicle.itvExpiryDate?.split('T')[0] || '',
    insuranceCompany: vehicle.insuranceCompany || '',
    insurancePolicyNumber: vehicle.insurancePolicyNumber || '',
    insuranceExpiryDate: vehicle.insuranceExpiryDate?.split('T')[0] || '',
    notes: vehicle.notes || ''
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${vehicle.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      onSaved()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b"><h2 className="text-xl font-bold">Modifier {vehicle.vehicleNumber}</h2></div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plaque</label>
              <input type="text" value={form.licensePlate} onChange={e => setForm({...form, licensePlate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Année</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage</label>
              <input type="number" value={form.currentMileage} onChange={e => setForm({...form, currentMileage: parseInt(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">État</label>
            <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="border-t pt-4"><h3 className="font-medium mb-3">ITV</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1">Date ITV</label><input type="date" value={form.itvDate} onChange={e => setForm({...form, itvDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm mb-1">Expiration</label><input type="date" value={form.itvExpiryDate} onChange={e => setForm({...form, itvExpiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
            </div>
          </div>
          <div className="border-t pt-4"><h3 className="font-medium mb-3">Assurance</h3>
            <div className="space-y-3">
              <input type="text" value={form.insuranceCompany} onChange={e => setForm({...form, insuranceCompany: e.target.value})} placeholder="Compagnie" className="w-full border rounded-lg px-3 py-2" />
              <input type="text" value={form.insurancePolicyNumber} onChange={e => setForm({...form, insurancePolicyNumber: e.target.value})} placeholder="N° Police" className="w-full border rounded-lg px-3 py-2" />
              <div><label className="block text-sm mb-1">Expiration</label><input type="date" value={form.insuranceExpiryDate} onChange={e => setForm({...form, insuranceExpiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== ADD DOCUMENT MODAL WITH UPLOAD ==============
function AddDocumentModal({ fleetId, onClose, onSaved }: { fleetId: string; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ type: 'CARTE_GRISE', name: '', fileUrl: '', expiryDate: '', sendToCustomer: false })

  const DOCUMENT_TYPES = [
    { value: 'CARTE_GRISE', label: 'Carte grise' },
    { value: 'ASSURANCE', label: 'Assurance' },
    { value: 'RAPPORT_ITV', label: 'Rapport ITV' },
    { value: 'FACTURE_ACHAT', label: 'Facture d\'achat' },
    { value: 'MANUEL', label: 'Manuel' },
    { value: 'TUTORIEL_VIDEO', label: 'Tutoriel vidéo' },
    { value: 'AUTRE', label: 'Autre' },
  ]

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'voltride_docs')

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/auto/upload', {
        method: 'POST', body: formData
      })
      const data = await res.json()
      setForm({ ...form, fileUrl: data.secure_url, name: form.name || file.name })
    } catch (e) { console.error(e); alert('Erreur lors de l\'upload') }
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.fileUrl) { alert('Nom et fichier requis'); return }
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleetId}/documents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      onSaved()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b"><h2 className="text-xl font-bold">Ajouter un document</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom du document</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fichier</label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {form.fileUrl ? (
                <div>
                  <p className="text-green-600 mb-2">✅ Fichier uploadé</p>
                  <a href={form.fileUrl} target="_blank" className="text-blue-600 text-sm">Voir le fichier</a>
                </div>
              ) : (
                <div>
                  <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" accept="image/*,.pdf" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploading ? (
                      <span className="text-gray-500">Upload en cours...</span>
                    ) : (
                      <span className="text-blue-600">📁 Cliquez pour sélectionner un fichier</span>
                    )}
                  </label>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date d'expiration (optionnel)</label>
            <input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.sendToCustomer} onChange={e => setForm({...form, sendToCustomer: e.target.checked})} />
            <span className="text-sm">Envoyer au client avec le contrat</span>
          </label>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={loading || uploading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== ADD DAMAGE MODAL ==============
function AddDamageModal({ fleetId, onClose, onSaved }: { fleetId: string; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ description: '', location: 'FRONT', severity: 'MINOR', photoUrl: '' })

  const LOCATIONS = ['FRONT', 'REAR', 'LEFT_SIDE', 'RIGHT_SIDE', 'TOP', 'HANDLEBAR', 'WHEEL_FRONT', 'WHEEL_REAR', 'SEAT', 'MIRROR', 'LIGHT']
  const SEVERITIES = ['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']

  const handleSubmit = async () => {
    if (!form.description) { alert('Description requise'); return }
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleetId}/damages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      onSaved()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b"><h2 className="text-xl font-bold">Signaler un dégât</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Emplacement</label>
              <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gravité</label>
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Ajout...' : 'Signaler'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== ADD MAINTENANCE MODAL ==============
function AddMaintenanceModal({ fleetId, onClose, onSaved }: { fleetId: string; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ type: 'SCHEDULED', description: '', mileage: 0, scheduledDate: '', status: 'SCHEDULED', laborCost: 0, partsCost: 0, notes: '' })

  const TYPES = ['SCHEDULED', 'REPAIR', 'INSPECTION', 'TIRE_CHANGE', 'OIL_CHANGE', 'BRAKE_SERVICE', 'BATTERY', 'OTHER']

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleetId}/maintenance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalCost: form.laborCost + form.partsCost })
      })
      onSaved()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b"><h2 className="text-xl font-bold">Ajouter maintenance</h2></div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="SCHEDULED">Planifié</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage</label>
              <input type="number" value={form.mileage} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={form.scheduledDate} onChange={e => setForm({...form, scheduledDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Main d'œuvre (€)</label>
              <input type="number" value={form.laborCost} onChange={e => setForm({...form, laborCost: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pièces (€)</label>
              <input type="number" value={form.partsCost} onChange={e => setForm({...form, partsCost: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total: <span className="font-bold">{form.laborCost + form.partsCost}€</span></p>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== ADD/EDIT SPARE PART MODAL ==============
function AddSparePartModal({ fleetId, editPart, onClose, onSaved }: { fleetId: string; editPart?: any; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: editPart?.name || '',
    partNumber: editPart?.partNumber || '',
    category: editPart?.category || 'BODY',
    location: editPart?.location || 'FRONT',
    price: editPart?.price || 0,
    laborCost: editPart?.laborCost || 0,
    quantityInStock: editPart?.quantityInStock || 0
  })

  const CATEGORIES = ['BODY', 'MIRROR', 'LIGHT', 'WHEEL', 'BRAKE', 'BATTERY', 'ELECTRICAL', 'ENGINE', 'TRANSMISSION', 'OTHER']
  const LOCATIONS = ['FRONT', 'REAR', 'LEFT_SIDE', 'RIGHT_SIDE', 'TOP', 'HANDLEBAR', 'WHEEL_FRONT', 'WHEEL_REAR', 'SEAT']

  const handleSubmit = async () => {
    if (!form.name) { alert('Nom requis'); return }
    setLoading(true)
    try {
      const url = editPart ? `${API_URL}/api/fleet/spare-parts/${editPart.id}` : `${API_URL}/api/fleet/${fleetId}/spare-parts`
      await fetch(url, {
        method: editPart ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalCost: form.price + form.laborCost })
      })
      onSaved()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b"><h2 className="text-xl font-bold">{editPart ? 'Modifier la pièce' : 'Ajouter une pièce'}</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Référence</label>
            <input type="text" value={form.partNumber} onChange={e => setForm({...form, partNumber: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Emplacement</label>
              <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prix (€)</label>
              <input type="number" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">M.O. (€)</label>
              <input type="number" value={form.laborCost} onChange={e => setForm({...form, laborCost: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input type="number" value={form.quantityInStock} onChange={e => setForm({...form, quantityInStock: parseInt(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total (pièce + M.O.): <span className="font-bold">{form.price + form.laborCost}€</span></p>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Sauvegarde...' : editPart ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default { FleetList, FleetDetail }
