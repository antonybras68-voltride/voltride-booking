import { useState, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface FleetModalProps {
  fleet: any
  mode: 'view' | 'edit'
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}

const CONTRACT_FIELDS = [
  { id: 'vehicleNumber', label: 'Numéro véhicule' },
  { id: 'locationCode', label: 'Localisation' },
  { id: 'licensePlate', label: 'Immatriculation' },
  { id: 'brand', label: 'Marque' },
  { id: 'model', label: 'Modèle' },
  { id: 'chassisNumber', label: 'N° châssis' },
  { id: 'year', label: 'Année' },
  { id: 'color', label: 'Couleur' },
  { id: 'engineSize', label: 'Cylindrée' },
]

const DOCUMENT_TYPES = [
  { type: 'CARTE_GRISE', label: 'Carte grise' },
  { type: 'FICHE_TECHNIQUE', label: 'Fiche technique' },
  { type: 'ASSURANCE', label: 'Assurance' },
  { type: 'RAPPORT_ITV', label: 'ITV' },
  { type: 'TUTORIEL_VIDEO', label: 'Tutoriel vidéo' },
  { type: 'TUTORIEL_PHOTO', label: 'Tutoriel photo' },
  { type: 'CONSTAT_PREREMPLI', label: 'Constat pré-rempli' },
  { type: 'MANUEL_UTILISATEUR', label: 'Manuel utilisateur' },
  { type: 'PERMIS_CIRCULATION', label: 'Permis de circulation' },
  { type: 'OTHER', label: 'Autre' },
]

export function FleetEditModal({ fleet, mode: initialMode, onClose, onSave, onDelete }: FleetModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // General info
  const [form, setForm] = useState({
    vehicleNumber: fleet?.vehicleNumber || '',
    licensePlate: fleet?.licensePlate || '',
    locationCode: fleet?.locationCode || '',
    brand: fleet?.brand || '',
    model: fleet?.model || '',
    chassisNumber: fleet?.chassisNumber || '',
    year: fleet?.year || '',
    color: fleet?.color || '',
    engineSize: fleet?.engineSize || '',
    status: fleet?.status || 'AVAILABLE',
    currentMileage: fleet?.currentMileage || 0,
    itvDate: fleet?.itvDate?.split('T')[0] || '',
    itvExpiryDate: fleet?.itvExpiryDate?.split('T')[0] || '',
    insuranceCompany: fleet?.insuranceCompany || '',
    insurancePolicyNumber: fleet?.insurancePolicyNumber || '',
    insuranceExpiryDate: fleet?.insuranceExpiryDate?.split('T')[0] || '',
    maintenanceIntervalKm: fleet?.maintenanceIntervalKm || 1000,
    maintenanceIntervalDays: fleet?.maintenanceIntervalDays || 30,
    notes: fleet?.notes || ''
  })

  const [contractFields, setContractFields] = useState([])
  const [draggedField, setDraggedField] = useState(null)
  const [documents, setDocuments] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [newDocType, setNewDocType] = useState('OTHER')
  const [equipment, setEquipment] = useState([])
  const [newEquipment, setNewEquipment] = useState({ name: '', price: '', quantity: 1 })
  const [spareParts, setSpareParts] = useState([])
  const [newPart, setNewPart] = useState({ name: '', partNumber: '', price: '', laborCost: '' })
  const [maintenance, setMaintenance] = useState([])
  const [newMaintenance, setNewMaintenance] = useState({ type: 'SERVICE', scheduledDate: '', description: '', cost: '', performedBy: '' })
  const [categories, setCategories] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(fleet?.vehicle?.categoryId || '')
  const [selectedVehicleId, setSelectedVehicleId] = useState(fleet?.vehicleId || '')

  useEffect(() => {
    if (fleet?.id) loadFleetData()
  }, [fleet?.id])

  const loadFleetData = async () => {
    // Load categories and vehicles
    try {
      const [catRes, vehRes] = await Promise.all([
        fetch(API_URL + '/api/categories'),
        fetch(API_URL + '/api/vehicles')
      ])
      setCategories(await catRes.json())
      setVehicles(await vehRes.json())
    } catch (e) { console.error(e) }

    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}`)
      const data = await res.json()
      setDocuments(data.documents || [])
      setEquipment(data.equipment || [])
      setSpareParts(data.spareParts || [])
      
      const savedFields = data.contractFields || []
      const allFields = CONTRACT_FIELDS.map((f, i) => {
        const saved = savedFields.find(sf => sf.fieldName === f.id)
        return { ...f, showInContract: saved?.showInContract ?? true, displayOrder: saved?.displayOrder ?? i }
      }).sort((a, b) => a.displayOrder - b.displayOrder)
      setContractFields(allFields)

      const maintRes = await fetch(`${API_URL}/api/fleet/${fleet.id}/maintenance`)
      setMaintenance(await maintRes.json() || [])
    } catch (e) { console.error(e) }
  }

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleDragStart = (index) => setDraggedField(index)
  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedField === null || draggedField === index) return
    const newFields = [...contractFields]
    const dragged = newFields[draggedField]
    newFields.splice(draggedField, 1)
    newFields.splice(index, 0, dragged)
    newFields.forEach((f, i) => f.displayOrder = i)
    setContractFields(newFields)
    setDraggedField(index)
  }
  const handleDragEnd = () => setDraggedField(null)
  const toggleContractField = (index) => {
    const newFields = [...contractFields]
    newFields[index].showInContract = !newFields[index].showInContract
    setContractFields(newFields)
  }

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await api.uploadImage(file, `fleet/${fleet.id}/docs`)
      if (url) {
        const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: newDocType, name: file.name, fileUrl: url, fileType: file.type.startsWith('video') ? 'video' : 'image' })
        })
        const doc = await res.json()
        setDocuments(prev => [...prev, doc])
      }
    } catch (e) { alert('Erreur upload') }
    setUploadingDoc(false)
  }

  const toggleDocSendToCustomer = async (doc) => {
    try {
      await fetch(`${API_URL}/api/fleet/documents/${doc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendToCustomer: !doc.sendToCustomer })
      })
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, sendToCustomer: !d.sendToCustomer } : d))
    } catch (e) { console.error(e) }
  }

  const deleteDocument = async (id) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await fetch(`${API_URL}/api/fleet/documents/${id}`, { method: 'DELETE' })
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (e) { console.error(e) }
  }

  const addEquipment = async () => {
    if (!newEquipment.name || !newEquipment.price) return
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/equipment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquipment)
      })
      const eq = await res.json()
      setEquipment(prev => [...prev, eq])
      setNewEquipment({ name: '', price: '', quantity: 1 })
    } catch (e) { console.error(e) }
  }

  const deleteEquipment = async (id) => {
    try {
      await fetch(`${API_URL}/api/fleet/equipment/${id}`, { method: 'DELETE' })
      setEquipment(prev => prev.filter(e => e.id !== id))
    } catch (e) { console.error(e) }
  }

  const addSparePart = async () => {
    if (!newPart.name || !newPart.price) return
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/spare-parts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPart, category: 'OTHER', location: 'OTHER' })
      })
      const part = await res.json()
      setSpareParts(prev => [...prev, part])
      setNewPart({ name: '', partNumber: '', price: '', laborCost: '' })
    } catch (e) { console.error(e) }
  }

  const deleteSparePart = async (id) => {
    try {
      await fetch(`${API_URL}/api/fleet/spare-parts/${id}`, { method: 'DELETE' })
      setSpareParts(prev => prev.filter(p => p.id !== id))
    } catch (e) { console.error(e) }
  }

  const addMaintenance = async () => {
    if (!newMaintenance.scheduledDate || !newMaintenance.description) return
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/maintenance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMaintenance, mileageAtService: form.currentMileage })
      })
      const record = await res.json()
      setMaintenance(prev => [record, ...prev])
      setNewMaintenance({ type: 'SERVICE', scheduledDate: '', description: '', cost: '', performedBy: '' })
    } catch (e) { console.error(e) }
  }

  const deleteMaintenance = async (id) => {
    if (!confirm('Supprimer cette intervention ?')) return
    try {
      await fetch(`${API_URL}/api/fleet/maintenance/${id}`, { method: 'DELETE' })
      setMaintenance(prev => prev.filter(m => m.id !== id))
    } catch (e) { console.error(e) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleet.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: parseInt(form.year) || null,
          currentMileage: parseInt(form.currentMileage) || 0,
          maintenanceIntervalKm: parseInt(form.maintenanceIntervalKm) || 1000,
          maintenanceIntervalDays: parseInt(form.maintenanceIntervalDays) || 30,
          vehicleId: selectedVehicleId || undefined
        })
      })
      await fetch(`${API_URL}/api/fleet/${fleet.id}/contract-fields/batch`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: contractFields.map(f => ({ fieldName: f.id, displayOrder: f.displayOrder, showInContract: f.showInContract })) })
      })
      onSave()
    } catch (e) { console.error(e); alert('Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ce véhicule ? Cette action est irréversible.')) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/fleet/${fleet.id}`, { method: 'DELETE' })
      onDelete?.()
    } catch (e) { console.error(e); alert('Erreur lors de la suppression') }
    setDeleting(false)
  }

  const tabs = [
    { id: 'general', label: 'Général' },
    { id: 'documents', label: 'Documents' },
    { id: 'equipment', label: 'Équipements' },
    { id: 'parts', label: 'Pièces' },
    { id: 'maintenance', label: 'Maintenance' },
  ]

  const statusColors = {
    AVAILABLE: 'bg-green-100 text-green-700',
    RENTED: 'bg-blue-100 text-blue-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    OUT_OF_SERVICE: 'bg-red-100 text-red-700'
  }

  const statusLabels = {
    AVAILABLE: 'Disponible',
    RENTED: 'En location',
    MAINTENANCE: 'Maintenance',
    OUT_OF_SERVICE: 'Hors service'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {fleet?.vehicle?.imageUrl && (
                <img src={fleet.vehicle.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div>
                <h2 className="text-xl font-bold">{form.vehicleNumber || 'Véhicule'}</h2>
                <p className="text-sm opacity-80">{getName(fleet?.vehicle?.name)}</p>
                <p className="text-xs opacity-60">Catégorie: {getName(fleet?.vehicle?.category?.name) || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[form.status]}`}>
                {statusLabels[form.status]}
              </span>
              <button onClick={onClose} className="text-2xl opacity-70 hover:opacity-100 ml-4">&times;</button>
            </div>
          </div>
        </div>

        {/* Mode toggle & Tabs */}
        <div className="border-b">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
            <div className="flex gap-2">
              <button onClick={() => setMode('view')}
                className={`px-3 py-1 rounded text-sm ${mode === 'view' ? 'bg-white shadow' : 'text-gray-500'}`}>
                Voir
              </button>
              <button onClick={() => setMode('edit')}
                className={`px-3 py-1 rounded text-sm ${mode === 'edit' ? 'bg-white shadow' : 'text-gray-500'}`}>
                Modifier
              </button>
            </div>
            {mode === 'edit' && (
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            )}
          </div>
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={'flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 ' +
                  (activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {mode === 'view' ? (
                // View mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Numéro" value={form.vehicleNumber} />
                    <InfoRow label="Immatriculation" value={form.licensePlate} />
                    <InfoRow label="Marque" value={form.brand} />
                    <InfoRow label="Modèle" value={form.model} />
                    <InfoRow label="Cylindrée" value={form.engineSize} />
                    <InfoRow label="Année" value={form.year} />
                    <InfoRow label="Couleur" value={form.color} />
                    <InfoRow label="N° châssis" value={form.chassisNumber} />
                    <InfoRow label="Kilométrage" value={`${form.currentMileage} km`} />
                    <InfoRow label="Catégorie" value={getName(fleet?.vehicle?.category?.name)} />
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">ITV / Assurance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow label="Date ITV" value={form.itvDate} />
                      <InfoRow label="Expiration ITV" value={form.itvExpiryDate} />
                      <InfoRow label="Assurance" value={form.insuranceCompany} />
                      <InfoRow label="Exp. assurance" value={form.insuranceExpiryDate} />
                    </div>
                  </div>
                  {form.notes && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-2">Notes</h3>
                      <p className="text-gray-600">{form.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Edit mode
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Numéro véhicule" value={form.vehicleNumber} onChange={v => updateForm('vehicleNumber', v)} />
                    <Input label="Immatriculation" value={form.licensePlate} onChange={v => updateForm('licensePlate', v)} />
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Statut</label>
                      <select value={form.status} onChange={e => updateForm('status', e.target.value)}
                        className="w-full border rounded-lg p-2 text-sm">
                        <option value="AVAILABLE">Disponible</option>
                        <option value="RENTED">En location</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OUT_OF_SERVICE">Hors service</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 mb-2">Liaison catalogue (backoffice)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Catégorie</label>
                        <select value={selectedCategoryId} onChange={e => { setSelectedCategoryId(e.target.value); setSelectedVehicleId('') }}
                          className="w-full border rounded-lg p-2 text-sm">
                          <option value="">-- Catégorie --</option>
                          {categories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>{getName(cat.name)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Type véhicule</label>
                        <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm">
                          <option value="">-- Type --</option>
                          {vehicles.filter((v: any) => v.categoryId === selectedCategoryId).map((veh: any) => (
                            <option key={veh.id} value={veh.id}>{getName(veh.name)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <Input label="Marque" value={form.brand} onChange={v => updateForm('brand', v)} />
                    <Input label="Modèle" value={form.model} onChange={v => updateForm('model', v)} />
                    <Input label="Cylindrée" value={form.engineSize} onChange={v => updateForm('engineSize', v)} placeholder="125cc" />
                    <Input label="Année" value={form.year} onChange={v => updateForm('year', v)} type="number" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="N° châssis" value={form.chassisNumber} onChange={v => updateForm('chassisNumber', v)} />
                    <Input label="Couleur" value={form.color} onChange={v => updateForm('color', v)} />
                    <Input label="Kilométrage" value={form.currentMileage} onChange={v => updateForm('currentMileage', v)} type="number" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Date ITV" value={form.itvDate} onChange={v => updateForm('itvDate', v)} type="date" />
                    <Input label="Expiration ITV" value={form.itvExpiryDate} onChange={v => updateForm('itvExpiryDate', v)} type="date" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Assurance" value={form.insuranceCompany} onChange={v => updateForm('insuranceCompany', v)} />
                    <Input label="N° police" value={form.insurancePolicyNumber} onChange={v => updateForm('insurancePolicyNumber', v)} />
                    <Input label="Exp. assurance" value={form.insuranceExpiryDate} onChange={v => updateForm('insuranceExpiryDate', v)} type="date" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Notes</label>
                    <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm h-20" />
                  </div>

                  {/* Contract fields */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Champs du contrat</h3>
                    <p className="text-xs text-gray-500 mb-3">Glissez pour réorganiser, cochez pour afficher dans le contrat</p>
                    <div className="space-y-1">
                      {contractFields.map((field, index) => (
                        <div key={field.id} draggable onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd}
                          className={'flex items-center gap-3 p-2 border rounded cursor-move text-sm ' + 
                            (draggedField === index ? 'bg-blue-50 border-blue-300' : 'bg-white')}>
                          <span className="text-gray-400 text-xs">☰</span>
                          <input type="checkbox" checked={field.showInContract} onChange={() => toggleContractField(index)}
                            className="w-4 h-4" />
                          <span className="flex-1">{field.label}</span>
                          <span className="text-xs text-gray-400">{form[field.id] || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {mode === 'edit' && (
                <div className="flex gap-2 items-center">
                  <select value={newDocType} onChange={e => setNewDocType(e.target.value)} className="border rounded-lg p-2 text-sm">
                    {DOCUMENT_TYPES.map(dt => <option key={dt.type} value={dt.type}>{dt.label}</option>)}
                  </select>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm">
                    Uploader
                    <input type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleUploadDocument} />
                  </label>
                  {uploadingDoc && <span className="text-sm text-gray-500">Chargement...</span>}
                </div>
              )}
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Aucun document</p>
                ) : documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">{DOCUMENT_TYPES.find(dt => dt.type === doc.type)?.label || doc.type}</p>
                    </div>
                    {mode === 'edit' && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={doc.sendToCustomer} onChange={() => toggleDocSendToCustomer(doc)} className="w-3 h-3" />
                        Envoyer au client
                      </label>
                    )}
                    <a href={doc.fileUrl} target="_blank" className="text-blue-600 hover:underline text-xs">Voir</a>
                    {mode === 'edit' && (
                      <button onClick={() => deleteDocument(doc.id)} className="text-red-500 hover:text-red-700 text-xs">Suppr.</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              {mode === 'edit' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex gap-2">
                    <input type="text" value={newEquipment.name} onChange={e => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 border rounded-lg p-2 text-sm" placeholder="Nom" />
                    <input type="number" value={newEquipment.quantity} onChange={e => setNewEquipment(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-16 border rounded-lg p-2 text-sm" placeholder="Qté" />
                    <input type="number" value={newEquipment.price} onChange={e => setNewEquipment(prev => ({ ...prev, price: e.target.value }))}
                      className="w-24 border rounded-lg p-2 text-sm" placeholder="Prix €" />
                    <button onClick={addEquipment} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ajouter</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {equipment.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Aucun équipement</p>
                ) : equipment.map(eq => (
                  <div key={eq.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{eq.name}</p>
                      <p className="text-xs text-gray-500">Qté: {eq.quantity}</p>
                    </div>
                    <span className="font-medium">{parseFloat(eq.price).toFixed(2)}€</span>
                    {mode === 'edit' && (
                      <button onClick={() => deleteEquipment(eq.id)} className="text-red-500 hover:text-red-700 text-xs">Suppr.</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              {mode === 'edit' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-5 gap-2">
                    <input type="text" value={newPart.name} onChange={e => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                      className="col-span-2 border rounded-lg p-2 text-sm" placeholder="Nom" />
                    <input type="text" value={newPart.partNumber} onChange={e => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                      className="border rounded-lg p-2 text-sm" placeholder="Réf." />
                    <input type="number" value={newPart.price} onChange={e => setNewPart(prev => ({ ...prev, price: e.target.value }))}
                      className="border rounded-lg p-2 text-sm" placeholder="Prix €" />
                    <input type="number" value={newPart.laborCost} onChange={e => setNewPart(prev => ({ ...prev, laborCost: e.target.value }))}
                      className="border rounded-lg p-2 text-sm" placeholder="M.O. €" />
                  </div>
                  <button onClick={addSparePart} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ajouter</button>
                </div>
              )}
              <div className="space-y-2">
                {spareParts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Aucune pièce</p>
                ) : spareParts.map(part => (
                  <div key={part.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{part.name}</p>
                      <p className="text-xs text-gray-500">Réf: {part.partNumber || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{parseFloat(part.totalCost).toFixed(2)}€</p>
                      <p className="text-xs text-gray-500">Pièce: {parseFloat(part.price).toFixed(2)}€ + MO: {parseFloat(part.laborCost || 0).toFixed(2)}€</p>
                    </div>
                    {mode === 'edit' && (
                      <button onClick={() => deleteSparePart(part.id)} className="text-red-500 hover:text-red-700 text-xs">Suppr.</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              {mode === 'edit' && (
                <>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <Input label="Intervalle km" value={form.maintenanceIntervalKm} onChange={v => updateForm('maintenanceIntervalKm', v)} type="number" />
                    <Input label="Intervalle jours" value={form.maintenanceIntervalDays} onChange={v => updateForm('maintenanceIntervalDays', v)} type="number" />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <select value={newMaintenance.type} onChange={e => setNewMaintenance(prev => ({ ...prev, type: e.target.value }))}
                        className="border rounded-lg p-2 text-sm">
                        <option value="SERVICE">Entretien</option>
                        <option value="REPAIR">Réparation</option>
                        <option value="INSPECTION">Contrôle</option>
                        <option value="OTHER">Autre</option>
                      </select>
                      <input type="date" value={newMaintenance.scheduledDate} onChange={e => setNewMaintenance(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        className="border rounded-lg p-2 text-sm" />
                      <input type="number" value={newMaintenance.cost} onChange={e => setNewMaintenance(prev => ({ ...prev, cost: e.target.value }))}
                        className="border rounded-lg p-2 text-sm" placeholder="Coût €" />
                      <input type="text" value={newMaintenance.performedBy} onChange={e => setNewMaintenance(prev => ({ ...prev, performedBy: e.target.value }))}
                        className="border rounded-lg p-2 text-sm" placeholder="Prestataire" />
                    </div>
                    <input type="text" value={newMaintenance.description} onChange={e => setNewMaintenance(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border rounded-lg p-2 text-sm mb-2" placeholder="Description" />
                    <button onClick={addMaintenance} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ajouter</button>
                  </div>
                </>
              )}
              <div className="space-y-2">
                {maintenance.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Aucune intervention</p>
                ) : maintenance.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{m.description}</p>
                      <p className="text-xs text-gray-500">{m.scheduledDate?.split('T')[0]} • {m.performedBy || '-'}</p>
                    </div>
                    {m.totalCost && <span className="font-medium">{parseFloat(m.totalCost).toFixed(2)}€</span>}
                    <span className={`px-2 py-1 rounded text-xs ${m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {m.status === 'COMPLETED' ? 'Terminé' : 'Prévu'}
                    </span>
                    {mode === 'edit' && (
                      <button onClick={() => deleteMaintenance(m.id)} className="text-red-500 hover:text-red-700 text-xs">Suppr.</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'edit' && (
          <div className="p-4 border-t bg-gray-50 flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Annuler</button>
            <div className="flex-1" />
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper components
function InfoRow({ label, value }: { label: string, value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-lg p-2 text-sm" />
    </div>
  )
}

export default FleetEditModal
