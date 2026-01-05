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
  itvDate?: string
  itvExpiryDate?: string
  insuranceCompany?: string
  insurancePolicyNumber?: string
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
  spareParts: FleetSparePart[]
  maintenanceRecords: MaintenanceRecord[]
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

export interface FleetSparePart {
  id: string
  name: string
  partNumber?: string
  category: string
  location: string
  price: number
  laborCost: number
  totalCost: number
  quantityInStock: number
}

export interface MaintenanceRecord {
  id: string
  type: string
  description: string
  mileage: number
  totalCost?: number
  status: string
  scheduledDate?: string
  completedAt?: string
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

const DAMAGE_LOCATIONS = [
  'FRONT', 'FRONT_LEFT', 'FRONT_RIGHT', 'LEFT', 'RIGHT', 'REAR', 'REAR_LEFT', 'REAR_RIGHT',
  'TOP', 'BOTTOM', 'HANDLEBAR', 'SEAT', 'WHEELS', 'MIRROR_LEFT', 'MIRROR_RIGHT',
  'LIGHTS_FRONT', 'LIGHTS_REAR', 'DASHBOARD', 'OTHER'
]

const DAMAGE_LOCATION_LABELS: Record<string, string> = {
  FRONT: 'Avant', FRONT_LEFT: 'Avant gauche', FRONT_RIGHT: 'Avant droit',
  LEFT: 'Gauche', RIGHT: 'Droite', REAR: 'Arrière', REAR_LEFT: 'Arrière gauche', REAR_RIGHT: 'Arrière droit',
  TOP: 'Dessus', BOTTOM: 'Dessous', HANDLEBAR: 'Guidon', SEAT: 'Selle', WHEELS: 'Roues',
  MIRROR_LEFT: 'Rétro gauche', MIRROR_RIGHT: 'Rétro droit', LIGHTS_FRONT: 'Phare avant',
  LIGHTS_REAR: 'Feu arrière', DASHBOARD: 'Tableau de bord', OTHER: 'Autre'
}

const DOCUMENT_TYPES = [
  { value: 'CARTE_GRISE', label: 'Carte grise' },
  { value: 'PERMIS_CIRCULATION', label: 'Permis de circulation' },
  { value: 'FICHE_TECHNIQUE', label: 'Fiche technique' },
  { value: 'ASSURANCE', label: 'Assurance' },
  { value: 'RAPPORT_ITV', label: 'Rapport ITV' },
  { value: 'CONSTAT_PREREMPLI', label: 'Constat pré-rempli' },
  { value: 'TUTORIEL_VIDEO', label: 'Tutoriel vidéo' },
  { value: 'TUTORIEL_PHOTO', label: 'Tutoriel photo' },
  { value: 'MANUEL_UTILISATEUR', label: 'Manuel utilisateur' },
  { value: 'OTHER', label: 'Autre' }
]

const SPARE_PART_CATEGORIES = [
  { value: 'BODY', label: 'Carrosserie' },
  { value: 'MIRROR', label: 'Rétroviseur' },
  { value: 'LIGHT', label: 'Éclairage' },
  { value: 'WHEEL', label: 'Roue' },
  { value: 'BRAKE', label: 'Frein' },
  { value: 'HANDLEBAR', label: 'Guidon' },
  { value: 'SEAT', label: 'Selle' },
  { value: 'BATTERY', label: 'Batterie' },
  { value: 'ACCESSORY', label: 'Accessoire' },
  { value: 'OTHER', label: 'Autre' }
]

const MAINTENANCE_TYPES = [
  { value: 'SCHEDULED', label: 'Planifiée' },
  { value: 'REPAIR', label: 'Réparation' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'CLEANING', label: 'Nettoyage' },
  { value: 'TIRE_CHANGE', label: 'Changement pneu' },
  { value: 'BATTERY', label: 'Batterie' },
  { value: 'OIL_CHANGE', label: 'Vidange' },
  { value: 'BRAKE', label: 'Freins' },
  { value: 'OTHER', label: 'Autre' }
]

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

      <div className="flex gap-2 mb-4">
        {['all', 'AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'].map(status => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm ${statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
            {status === 'all' ? 'Tous' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filteredFleet.map(f => (
          <div key={f.id} onClick={() => onSelectVehicle(f)}
            className="bg-white rounded-xl shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
            <div className="relative">
              {f.vehicle.imageUrl ? (
                <img src={f.vehicle.imageUrl} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-4xl">��</div>
              )}
              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${STATUS_COLORS[f.status]}`}>
                {STATUS_LABELS[f.status]}
              </span>
              {f.damages && f.damages.filter(d => !d.isResolved).length > 0 && (
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
              <p className="text-xs text-gray-400 mt-1">�� {f.agency.city}</p>
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

      {showAddModal && (
        <AddFleetModal onClose={() => setShowAddModal(false)} onAdded={() => { loadFleet(); setShowAddModal(false) }} selectedAgency={selectedAgency} />
      )}
    </div>
  )
}

// ============== FLEET DETAIL ==============
export function FleetDetail({ vehicle, onBack, onUpdate }: { vehicle: FleetVehicle; onBack: () => void; onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'damages' | 'maintenance' | 'spareparts'>('info')
  const [fullVehicle, setFullVehicle] = useState<FleetVehicle>(vehicle)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddDocModal, setShowAddDocModal] = useState(false)
  const [showAddDamageModal, setShowAddDamageModal] = useState(false)
  const [showAddMaintenanceModal, setShowAddMaintenanceModal] = useState(false)
  const [showAddSparePartModal, setShowAddSparePartModal] = useState(false)

  useEffect(() => { loadFullVehicle() }, [vehicle.id])

  const loadFullVehicle = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fleet/${vehicle.id}`)
      if (res.ok) setFullVehicle(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`${API_URL}/api/fleet/${vehicle.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      loadFullVehicle()
    } catch (e) { console.error(e) }
  }

  const damages = fullVehicle.damages || []
  const documents = fullVehicle.documents || []
  const spareParts = fullVehicle.spareParts || []
  const maintenanceRecords = fullVehicle.maintenanceRecords || []
  const unresolvedDamages = damages.filter(d => !d.isResolved)

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">← Retour</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{fullVehicle.vehicleNumber}</h2>
            <span className={`px-3 py-1 rounded-full text-white text-sm ${STATUS_COLORS[fullVehicle.status]}`}>
              {STATUS_LABELS[fullVehicle.status]}
            </span>
          </div>
          <p className="text-gray-500">{getName(fullVehicle.vehicle.name)} • {fullVehicle.agency.city}</p>
        </div>
        <select value={fullVehicle.status} onChange={(e) => updateStatus(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="AVAILABLE">Disponible</option>
          <option value="RESERVED">Réservé</option>
          <option value="RENTED">En location</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OUT_OF_SERVICE">Hors service</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Kilométrage</p>
          <p className="text-2xl font-bold">{fullVehicle.currentMileage.toLocaleString()} km</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">État</p>
          <p className="text-2xl font-bold">{fullVehicle.condition}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Dégâts non résolus</p>
          <p className={`text-2xl font-bold ${unresolvedDamages.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{unresolvedDamages.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Caution</p>
          <p className="text-2xl font-bold">{fullVehicle.vehicle.deposit}€</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'info', label: '📋 Informations' },
            { id: 'documents', label: `📄 Documents (${documents.length})` },
            { id: 'damages', label: `⚠️ Dégâts (${unresolvedDamages.length})` },
            { id: 'maintenance', label: `🔧 Maintenance (${maintenanceRecords.length})` },
            { id: 'spareparts', label: `🔩 Pièces (${spareParts.length})` }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`px-6 py-4 font-medium whitespace-nowrap ${activeTab === t.id ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowEditModal(true)} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm">✏️ Modifier</button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold mb-4">Identification</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Numéro</span><span className="font-mono font-bold">{fullVehicle.vehicleNumber}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Plaque</span><span>{fullVehicle.licensePlate || '-'}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Châssis</span><span className="font-mono text-sm">{fullVehicle.chassisNumber}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Année</span><span>{fullVehicle.year || '-'}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Couleur</span><span>{fullVehicle.color || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold mb-4">Documents officiels</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">ITV passée le</span>
                      <span>{fullVehicle.itvDate ? new Date(fullVehicle.itvDate).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">ITV expire le</span>
                      <span className={fullVehicle.itvExpiryDate && new Date(fullVehicle.itvExpiryDate) < new Date() ? 'text-red-500 font-bold' : ''}>
                        {fullVehicle.itvExpiryDate ? new Date(fullVehicle.itvExpiryDate).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Assureur</span>
                      <span>{fullVehicle.insuranceCompany || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">N° Police</span>
                      <span>{fullVehicle.insurancePolicyNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Assurance expire le</span>
                      <span className={fullVehicle.insuranceExpiryDate && new Date(fullVehicle.insuranceExpiryDate) < new Date() ? 'text-red-500 font-bold' : ''}>
                        {fullVehicle.insuranceExpiryDate ? new Date(fullVehicle.insuranceExpiryDate).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </div>
                  </div>
                  {fullVehicle.notes && (
                    <div className="mt-4">
                      <h3 className="font-bold mb-2">Notes</h3>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{fullVehicle.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Documents du véhicule</h3>
                <button onClick={() => setShowAddDocModal(true)} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm">+ Ajouter</button>
              </div>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun document</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {documents.map(d => (
                    <div key={d.id} className="border rounded-lg p-4">
                      <p className="font-bold">{d.name}</p>
                      <p className="text-sm text-gray-500">{DOCUMENT_TYPES.find(t => t.value === d.type)?.label || d.type}</p>
                      {d.expiryDate && (
                        <p className={`text-sm ${new Date(d.expiryDate) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                          Expire: {new Date(d.expiryDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {d.sendToCustomer && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Envoyé au client</span>}
                        <a href={d.fileUrl} target="_blank" className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Voir</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DAMAGES TAB */}
          {activeTab === 'damages' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Dégâts signalés</h3>
                <button onClick={() => setShowAddDamageModal(true)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">+ Signaler un dégât</button>
              </div>
              {damages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun dégât signalé ✅</p>
              ) : (
                <div className="space-y-4">
                  {damages.map(d => (
                    <DamageCard key={d.id} damage={d} fleetId={fullVehicle.id} onResolved={loadFullVehicle} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Historique de maintenance</h3>
                <button onClick={() => setShowAddMaintenanceModal(true)} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm">+ Nouvelle intervention</button>
              </div>
              {maintenanceRecords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune maintenance enregistrée</p>
              ) : (
                <div className="space-y-4">
                  {maintenanceRecords.map(m => (
                    <div key={m.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-1 rounded text-xs text-white ${m.status === 'COMPLETED' ? 'bg-green-500' : m.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-yellow-500'}`}>
                            {m.status}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">{MAINTENANCE_TYPES.find(t => t.value === m.type)?.label || m.type}</span>
                        </div>
                        {m.totalCost && <span className="font-bold">{Number(m.totalCost).toFixed(2)}€</span>}
                      </div>
                      <p className="font-medium mt-2">{m.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{m.mileage.toLocaleString()} km • {m.completedAt ? new Date(m.completedAt).toLocaleDateString('fr-FR') : m.scheduledDate ? `Prévu: ${new Date(m.scheduledDate).toLocaleDateString('fr-FR')}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SPARE PARTS TAB */}
          {activeTab === 'spareparts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Pièces détachées & Prix</h3>
                <button onClick={() => setShowAddSparePartModal(true)} className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm">+ Ajouter une pièce</button>
              </div>
              {spareParts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune pièce enregistrée</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Pièce</th>
                      <th className="px-4 py-2 text-left">Catégorie</th>
                      <th className="px-4 py-2 text-left">Emplacement</th>
                      <th className="px-4 py-2 text-right">Prix pièce</th>
                      <th className="px-4 py-2 text-right">Main d'œuvre</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-center">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spareParts.map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.name}</p>
                          {p.partNumber && <p className="text-xs text-gray-500">{p.partNumber}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm">{SPARE_PART_CATEGORIES.find(c => c.value === p.category)?.label || p.category}</td>
                        <td className="px-4 py-3 text-sm">{DAMAGE_LOCATION_LABELS[p.location] || p.location}</td>
                        <td className="px-4 py-3 text-right">{Number(p.price).toFixed(2)}€</td>
                        <td className="px-4 py-3 text-right">{Number(p.laborCost).toFixed(2)}€</td>
                        <td className="px-4 py-3 text-right font-bold">{Number(p.totalCost).toFixed(2)}€</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${p.quantityInStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.quantityInStock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showEditModal && <EditFleetModal vehicle={fullVehicle} onClose={() => setShowEditModal(false)} onSaved={() => { loadFullVehicle(); setShowEditModal(false) }} />}
      {showAddDocModal && <AddDocumentModal fleetId={fullVehicle.id} onClose={() => setShowAddDocModal(false)} onAdded={() => { loadFullVehicle(); setShowAddDocModal(false) }} />}
      {showAddDamageModal && <AddDamageModal fleetId={fullVehicle.id} onClose={() => setShowAddDamageModal(false)} onAdded={() => { loadFullVehicle(); setShowAddDamageModal(false) }} />}
      {showAddMaintenanceModal && <AddMaintenanceModal fleetId={fullVehicle.id} currentMileage={fullVehicle.currentMileage} onClose={() => setShowAddMaintenanceModal(false)} onAdded={() => { loadFullVehicle(); setShowAddMaintenanceModal(false) }} />}
      {showAddSparePartModal && <AddSparePartModal fleetId={fullVehicle.id} onClose={() => setShowAddSparePartModal(false)} onAdded={() => { loadFullVehicle(); setShowAddSparePartModal(false) }} />}
    </div>
  )
}

// ============== DAMAGE CARD ==============
function DamageCard({ damage, fleetId, onResolved }: { damage: FleetDamage; fleetId: string; onResolved: () => void }) {
  const [resolving, setResolving] = useState(false)

  const handleResolve = async () => {
    setResolving(true)
    try {
      await fetch(`${API_URL}/api/fleet/damages/${damage.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'operator', resolutionNote: 'Résolu' })
      })
      onResolved()
    } catch (e) { console.error(e) }
    setResolving(false)
  }

  return (
    <div className={`border rounded-lg p-4 ${damage.isResolved ? 'bg-gray-50 opacity-60' : ''}`}>
      <div className="flex gap-4">
        {damage.photoUrl && <img src={damage.photoUrl} className="w-24 h-24 rounded object-cover" />}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-1 rounded text-xs text-white ${
              damage.severity === 'CRITICAL' ? 'bg-red-600' :
              damage.severity === 'MAJOR' ? 'bg-red-500' :
              damage.severity === 'MODERATE' ? 'bg-orange-500' : 'bg-yellow-500'
            }`}>{damage.severity}</span>
            <span className="text-sm text-gray-500">{DAMAGE_LOCATION_LABELS[damage.location] || damage.location}</span>
            {damage.isResolved && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Résolu</span>}
          </div>
          <p className="font-medium">{damage.description}</p>
          <p className="text-xs text-gray-400 mt-1">Signalé le {new Date(damage.reportedAt).toLocaleDateString('fr-FR')}</p>
        </div>
        {!damage.isResolved && (
          <button onClick={handleResolve} disabled={resolving} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm h-fit disabled:opacity-50">
            {resolving ? '...' : '✓ Résoudre'}
          </button>
        )}
      </div>
    </div>
  )
}

// ============== EDIT FLEET MODAL ==============
function EditFleetModal({ vehicle, onClose, onSaved }: { vehicle: FleetVehicle; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    licensePlate: vehicle.licensePlate || '',
    year: vehicle.year?.toString() || '',
    color: vehicle.color || '',
    currentMileage: vehicle.currentMileage.toString(),
    itvDate: vehicle.itvDate?.split('T')[0] || '',
    itvExpiryDate: vehicle.itvExpiryDate?.split('T')[0] || '',
    insuranceCompany: vehicle.insuranceCompany || '',
    insurancePolicyNumber: vehicle.insurancePolicyNumber || '',
    insuranceExpiryDate: vehicle.insuranceExpiryDate?.split('T')[0] || '',
    condition: vehicle.condition,
    notes: vehicle.notes || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : null,
          currentMileage: parseInt(form.currentMileage) || 0,
          itvDate: form.itvDate || null,
          itvExpiryDate: form.itvExpiryDate || null,
          insuranceExpiryDate: form.insuranceExpiryDate || null
        })
      })
      onSaved()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Modifier {vehicle.vehicleNumber}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plaque d'immatriculation</label>
              <input type="text" value={form.licensePlate} onChange={e => setForm({...form, licensePlate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Année</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage</label>
              <input type="number" value={form.currentMileage} onChange={e => setForm({...form, currentMileage: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          
          <h3 className="font-bold mt-6">ITV</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date ITV</label>
              <input type="date" value={form.itvDate} onChange={e => setForm({...form, itvDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiration ITV</label>
              <input type="date" value={form.itvExpiryDate} onChange={e => setForm({...form, itvExpiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <h3 className="font-bold mt-6">Assurance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Compagnie d'assurance</label>
              <input type="text" value={form.insuranceCompany} onChange={e => setForm({...form, insuranceCompany: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">N° de police</label>
              <input type="text" value={form.insurancePolicyNumber} onChange={e => setForm({...form, insurancePolicyNumber: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiration assurance</label>
              <input type="date" value={form.insuranceExpiryDate} onChange={e => setForm({...form, insuranceExpiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">État</label>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value as any})} className="w-full border rounded-lg px-3 py-2">
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Bon</option>
                <option value="FAIR">Moyen</option>
                <option value="POOR">Mauvais</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============== ADD DOCUMENT MODAL ==============
function AddDocumentModal({ fleetId, onClose, onAdded }: { fleetId: string; onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ type: 'OTHER', name: '', fileUrl: '', expiryDate: '', sendToCustomer: false })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleetId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fileType: 'url', expiryDate: form.expiryDate || null })
      })
      onAdded()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Ajouter un document</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de document *</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
              {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom du document *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL du fichier *</label>
            <input type="url" value={form.fileUrl} onChange={e => setForm({...form, fileUrl: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." required />
            <p className="text-xs text-gray-500 mt-1">Uploadez le fichier sur Cloudinary ou Google Drive et collez l'URL</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date d'expiration</label>
            <input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.sendToCustomer} onChange={e => setForm({...form, sendToCustomer: e.target.checked})} />
            <span className="text-sm">Envoyer au client lors de la location</span>
          </label>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">{loading ? 'Ajout...' : 'Ajouter'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============== ADD DAMAGE MODAL ==============
function AddDamageModal({ fleetId, onClose, onAdded }: { fleetId: string; onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ description: '', location: 'FRONT', severity: 'MINOR', photoUrl: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleetId}/damages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      onAdded()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Signaler un dégât</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Emplacement *</label>
              <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {DAMAGE_LOCATIONS.map(l => <option key={l} value={l}>{DAMAGE_LOCATION_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sévérité *</label>
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="MINOR">Mineur</option>
                <option value="MODERATE">Modéré</option>
                <option value="MAJOR">Majeur</option>
                <option value="CRITICAL">Critique</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL de la photo *</label>
            <input type="url" value={form.photoUrl} onChange={e => setForm({...form, photoUrl: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." required />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50">{loading ? 'Ajout...' : 'Signaler le dégât'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============== ADD MAINTENANCE MODAL ==============
function AddMaintenanceModal({ fleetId, currentMileage, onClose, onAdded }: { fleetId: string; currentMileage: number; onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ type: 'SCHEDULED', description: '', mileage: currentMileage.toString(), laborCost: '', partsCost: '', scheduledDate: '', status: 'SCHEDULED', notes: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const totalCost = (parseFloat(form.laborCost) || 0) + (parseFloat(form.partsCost) || 0)
      await fetch(`${API_URL}/api/fleet/${fleetId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          mileage: parseInt(form.mileage) || currentMileage,
          laborCost: parseFloat(form.laborCost) || 0,
          partsCost: parseFloat(form.partsCost) || 0,
          totalCost,
          scheduledDate: form.scheduledDate || null
        })
      })
      onAdded()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Nouvelle maintenance</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {MAINTENANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage</label>
              <input type="number" value={form.mileage} onChange={e => setForm({...form, mileage: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date prévue</label>
              <input type="date" value={form.scheduledDate} onChange={e => setForm({...form, scheduledDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Coût main d'œuvre (€)</label>
              <input type="number" step="0.01" value={form.laborCost} onChange={e => setForm({...form, laborCost: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coût pièces (€)</label>
              <input type="number" step="0.01" value={form.partsCost} onChange={e => setForm({...form, partsCost: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50">{loading ? 'Ajout...' : 'Ajouter'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============== ADD SPARE PART MODAL ==============
function AddSparePartModal({ fleetId, onClose, onAdded }: { fleetId: string; onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', partNumber: '', category: 'OTHER', location: 'OTHER', price: '', laborCost: '', quantityInStock: '0' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleetId}/spare-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          laborCost: parseFloat(form.laborCost) || 0,
          quantityInStock: parseInt(form.quantityInStock) || 0
        })
      })
      onAdded()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Ajouter une pièce détachée</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom de la pièce *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Référence</label>
              <input type="text" value={form.partNumber} onChange={e => setForm({...form, partNumber: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {SPARE_PART_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Emplacement *</label>
            <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              {DAMAGE_LOCATIONS.map(l => <option key={l} value={l}>{DAMAGE_LOCATION_LABELS[l]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prix pièce (€) *</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Main d'œuvre (€)</label>
              <input type="number" step="0.01" value={form.laborCost} onChange={e => setForm({...form, laborCost: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">En stock</label>
              <input type="number" value={form.quantityInStock} onChange={e => setForm({...form, quantityInStock: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50">{loading ? 'Ajout...' : 'Ajouter la pièce'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============== ADD FLEET MODAL ==============
function AddFleetModal({ onClose, onAdded, selectedAgency }: { onClose: () => void; onAdded: () => void; selectedAgency: string }) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [agencies, setAgencies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ vehicleId: '', agencyId: selectedAgency !== 'all' ? selectedAgency : '', vehicleNumber: '', chassisNumber: '', licensePlate: '', year: '', color: '', currentMileage: '0' })

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/vehicles`).then(r => r.json()),
      fetch(`${API_URL}/api/agencies`).then(r => r.json())
    ]).then(([v, a]) => { setVehicles(v); setAgencies(a) })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/fleet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: form.vehicleId, agencyId: form.agencyId, vehicleNumber: form.vehicleNumber, chassisNumber: form.chassisNumber,
          licensePlate: form.licensePlate || null, year: form.year ? parseInt(form.year) : null, color: form.color || null, currentMileage: parseInt(form.currentMileage) || 0
        })
      })
      if (res.ok) onAdded()
      else { const data = await res.json(); setError(data.error || 'Erreur lors de la création') }
    } catch (e) { setError('Erreur réseau') }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Ajouter un véhicule à la flotte</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Numéro du véhicule *</label>
            <input type="text" value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value})} placeholder="Ex: VH-001, SC-001..." className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type de véhicule *</label>
            <select value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
              <option value="">Sélectionner...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{getName(v.name)} ({v.sku})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agence *</label>
            <select value={form.agencyId} onChange={e => setForm({...form, agencyId: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
              <option value="">Sélectionner...</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.city} ({a.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">N° de châssis *</label>
            <input type="text" value={form.chassisNumber} onChange={e => setForm({...form, chassisNumber: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plaque</label>
              <input type="text" value={form.licensePlate} onChange={e => setForm({...form, licensePlate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Année</label>
              <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="2024" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kilométrage</label>
              <input type="number" value={form.currentMileage} onChange={e => setForm({...form, currentMileage: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">{loading ? 'Création...' : 'Ajouter'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default { FleetList, FleetDetail }
