import { useState, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface FleetEditModalProps {
  fleet: any
  onClose: () => void
  onSave: () => void
}

const CONTRACT_FIELDS = [
  { id: 'vehicleNumber', label: 'Numéro véhicule' },
  { id: 'licensePlate', label: 'Immatriculation' },
  { id: 'brand', label: 'Marque' },
  { id: 'model', label: 'Modèle' },
  { id: 'chassisNumber', label: 'N° châssis' },
  { id: 'year', label: 'Année' },
  { id: 'color', label: 'Couleur' },
  { id: 'engineSize', label: 'Cylindrée' },
]

const DOCUMENT_TYPES = [
  { type: 'REGISTRATION', label: '📋 Carte grise', icon: '📋' },
  { type: 'TECHNICAL_SHEET', label: '📑 Fiche technique', icon: '📑' },
  { type: 'INSURANCE', label: '🛡️ Assurance', icon: '🛡️' },
  { type: 'ITV', label: '🔍 ITV', icon: '🔍' },
  { type: 'TUTORIAL', label: '🎥 Tutoriel', icon: '🎥' },
  { type: 'ACCIDENT_REPORT', label: '📝 Constat pré-rempli', icon: '📝' },
  { type: 'OTHER', label: '📎 Autre document', icon: '📎' },
]

export function FleetEditModal({ fleet, onClose, onSave }: FleetEditModalProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  
  // General info
  const [form, setForm] = useState({
    vehicleNumber: fleet?.vehicleNumber || '',
    licensePlate: fleet?.licensePlate || '',
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

  // Contract fields config
  const [contractFields, setContractFields] = useState([])
  const [draggedField, setDraggedField] = useState(null)

  // Documents
  const [documents, setDocuments] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [newDocType, setNewDocType] = useState('OTHER')

  // Equipment
  const [equipment, setEquipment] = useState([])
  const [newEquipment, setNewEquipment] = useState({ name: '', price: '', quantity: 1 })

  // Spare parts
  const [spareParts, setSpareParts] = useState([])
  const [newPart, setNewPart] = useState({ name: '', partNumber: '', price: '', laborCost: '' })

  // Maintenance
  const [maintenance, setMaintenance] = useState([])
  const [newMaintenance, setNewMaintenance] = useState({ 
    type: 'SERVICE', scheduledDate: '', description: '', cost: '', performedBy: '' 
  })

  // Load data
  useEffect(() => {
    if (fleet?.id) {
      loadFleetData()
    }
  }, [fleet?.id])

  const loadFleetData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}`)
      const data = await res.json()
      
      setDocuments(data.documents || [])
      setEquipment(data.equipment || [])
      setSpareParts(data.spareParts || [])
      
      // Initialize contract fields
      const savedFields = data.contractFields || []
      const allFields = CONTRACT_FIELDS.map((f, i) => {
        const saved = savedFields.find(sf => sf.fieldName === f.id)
        return {
          ...f,
          showInContract: saved?.showInContract ?? true,
          displayOrder: saved?.displayOrder ?? i
        }
      }).sort((a, b) => a.displayOrder - b.displayOrder)
      setContractFields(allFields)

      // Load maintenance
      const maintRes = await fetch(`${API_URL}/api/fleet/${fleet.id}/maintenance`)
      const maintData = await maintRes.json()
      setMaintenance(maintData || [])
    } catch (e) {
      console.error(e)
    }
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Contract fields drag & drop
  const handleDragStart = (index) => {
    setDraggedField(index)
  }

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

  const handleDragEnd = () => {
    setDraggedField(null)
  }

  const toggleContractField = (index) => {
    const newFields = [...contractFields]
    newFields[index].showInContract = !newFields[index].showInContract
    setContractFields(newFields)
  }

  // Document upload
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
          body: JSON.stringify({
            type: newDocType,
            name: file.name,
            fileUrl: url,
            fileType: file.type.startsWith('video') ? 'video' : 'image'
          })
        })
        const doc = await res.json()
        setDocuments(prev => [...prev, doc])
      }
    } catch (e) {
      alert('Erreur upload')
    }
    setUploadingDoc(false)
  }

  const toggleDocSendToCustomer = async (doc) => {
    try {
      await fetch(`${API_URL}/api/fleet/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendToCustomer: !doc.sendToCustomer })
      })
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, sendToCustomer: !d.sendToCustomer } : d
      ))
    } catch (e) {
      console.error(e)
    }
  }

  const deleteDocument = async (id) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await fetch(`${API_URL}/api/fleet/documents/${id}`, { method: 'DELETE' })
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  // Equipment
  const addEquipment = async () => {
    if (!newEquipment.name || !newEquipment.price) return
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquipment)
      })
      const eq = await res.json()
      setEquipment(prev => [...prev, eq])
      setNewEquipment({ name: '', price: '', quantity: 1 })
    } catch (e) {
      console.error(e)
    }
  }

  const deleteEquipment = async (id) => {
    try {
      await fetch(`${API_URL}/api/fleet/equipment/${id}`, { method: 'DELETE' })
      setEquipment(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  // Spare parts
  const addSparePart = async () => {
    if (!newPart.name || !newPart.price) return
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/spare-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPart,
          category: 'OTHER',
          location: 'OTHER'
        })
      })
      const part = await res.json()
      setSpareParts(prev => [...prev, part])
      setNewPart({ name: '', partNumber: '', price: '', laborCost: '' })
    } catch (e) {
      console.error(e)
    }
  }

  const deleteSparePart = async (id) => {
    try {
      await fetch(`${API_URL}/api/fleet/spare-parts/${id}`, { method: 'DELETE' })
      setSpareParts(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  // Maintenance
  const addMaintenance = async () => {
    if (!newMaintenance.scheduledDate || !newMaintenance.description) return
    try {
      const res = await fetch(`${API_URL}/api/fleet/${fleet.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMaintenance,
          mileageAtService: form.currentMileage
        })
      })
      const record = await res.json()
      setMaintenance(prev => [record, ...prev])
      setNewMaintenance({ type: 'SERVICE', scheduledDate: '', description: '', cost: '', performedBy: '' })
    } catch (e) {
      console.error(e)
    }
  }

  const deleteMaintenance = async (id) => {
    if (!confirm('Supprimer cette intervention ?')) return
    try {
      await fetch(`${API_URL}/api/fleet/maintenance/${id}`, { method: 'DELETE' })
      setMaintenance(prev => prev.filter(m => m.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  // Save all
  const handleSave = async () => {
    setSaving(true)
    try {
      // Save fleet info
      await fetch(`${API_URL}/api/fleet/${fleet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: parseInt(form.year) || null,
          currentMileage: parseInt(form.currentMileage) || 0,
          maintenanceIntervalKm: parseInt(form.maintenanceIntervalKm) || 1000,
          maintenanceIntervalDays: parseInt(form.maintenanceIntervalDays) || 30
        })
      })

      // Save contract fields
      await fetch(`${API_URL}/api/fleet/${fleet.id}/contract-fields/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: contractFields.map(f => ({
            fieldName: f.id,
            displayOrder: f.displayOrder,
            showInContract: f.showInContract
          }))
        })
      })

      onSave()
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  const tabs = [
    { id: 'general', label: '📋 Général' },
    { id: 'documents', label: '📄 Documents' },
    { id: 'equipment', label: '🎒 Équipements' },
    { id: 'parts', label: '🔧 Pièces' },
    { id: 'maintenance', label: '🛠️ Maintenance' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" 
           onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {fleet?.vehicle?.imageUrl && (
                <img src={fleet.vehicle.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div>
                <h2 className="text-xl font-bold">{form.vehicleNumber || 'Nouveau véhicule'}</h2>
                <p className="opacity-90">{getName(fleet?.vehicle?.name)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-3xl opacity-70 hover:opacity-100">&times;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={'flex-1 py-3 px-4 text-sm font-medium whitespace-nowrap ' +
                (activeTab === tab.id ? 'bg-white border-b-2 border-blue-500 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Numéro véhicule *</label>
                  <input type="text" value={form.vehicleNumber} onChange={e => updateForm('vehicleNumber', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Immatriculation</label>
                  <input type="text" value={form.licensePlate} onChange={e => updateForm('licensePlate', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select value={form.status} onChange={e => updateForm('status', e.target.value)}
                    className="w-full border-2 rounded-xl p-2">
                    <option value="AVAILABLE">🟢 Disponible</option>
                    <option value="RENTED">🔵 En location</option>
                    <option value="MAINTENANCE">🟠 Maintenance</option>
                    <option value="OUT_OF_SERVICE">🔴 Hors service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marque</label>
                  <input type="text" value={form.brand} onChange={e => updateForm('brand', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modèle</label>
                  <input type="text" value={form.model} onChange={e => updateForm('model', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cylindrée</label>
                  <input type="text" value={form.engineSize} onChange={e => updateForm('engineSize', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" placeholder="125cc" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Année</label>
                  <input type="number" value={form.year} onChange={e => updateForm('year', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">N° châssis</label>
                  <input type="text" value={form.chassisNumber} onChange={e => updateForm('chassisNumber', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Couleur</label>
                  <input type="text" value={form.color} onChange={e => updateForm('color', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kilométrage</label>
                  <input type="number" value={form.currentMileage} onChange={e => updateForm('currentMileage', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date ITV</label>
                  <input type="date" value={form.itvDate} onChange={e => updateForm('itvDate', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiration ITV</label>
                  <input type="date" value={form.itvExpiryDate} onChange={e => updateForm('itvExpiryDate', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
              </div>

              {/* Contract fields order */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">📜 Champs affichés dans le contrat</h3>
                <p className="text-sm text-gray-500 mb-3">Glissez-déposez pour réorganiser, cochez pour afficher</p>
                <div className="space-y-2">
                  {contractFields.map((field, index) => (
                    <div key={field.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={'flex items-center gap-3 p-2 border rounded-lg cursor-move ' + 
                        (draggedField === index ? 'bg-blue-50 border-blue-300' : 'bg-white')}>
                      <span className="text-gray-400">☰</span>
                      <input type="checkbox" checked={field.showInContract}
                        onChange={() => toggleContractField(index)}
                        className="w-4 h-4 accent-blue-600" />
                      <span>{field.label}</span>
                      <span className="text-xs text-gray-400 ml-auto">{form[field.id] || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <select value={newDocType} onChange={e => setNewDocType(e.target.value)}
                  className="border-2 rounded-xl p-2">
                  {DOCUMENT_TYPES.map(dt => (
                    <option key={dt.type} value={dt.type}>{dt.label}</option>
                  ))}
                </select>
                <label className="px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700">
                  📤 Uploader
                  <input type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleUploadDocument} />
                </label>
                {uploadingDoc && <span className="text-blue-600">⏳</span>}
              </div>

              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucun document</p>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-xl">
                      <span className="text-2xl">
                        {DOCUMENT_TYPES.find(dt => dt.type === doc.type)?.icon || '📎'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.type}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={doc.sendToCustomer}
                          onChange={() => toggleDocSendToCustomer(doc)}
                          className="w-4 h-4 accent-green-600" />
                        Envoyer au client
                      </label>
                      <a href={doc.fileUrl} target="_blank" className="text-blue-600 hover:underline text-sm">Voir</a>
                      <button onClick={() => deleteDocument(doc.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium mb-3">➕ Ajouter un équipement</h4>
                <div className="flex gap-2">
                  <input type="text" value={newEquipment.name} onChange={e => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1 border-2 rounded-xl p-2" placeholder="Nom équipement" />
                  <input type="number" value={newEquipment.quantity} onChange={e => setNewEquipment(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-20 border-2 rounded-xl p-2" placeholder="Qté" />
                  <input type="number" value={newEquipment.price} onChange={e => setNewEquipment(prev => ({ ...prev, price: e.target.value }))}
                    className="w-24 border-2 rounded-xl p-2" placeholder="Prix €" />
                  <button onClick={addEquipment} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">➕</button>
                </div>
              </div>

              <div className="space-y-2">
                {equipment.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucun équipement configuré</p>
                ) : (
                  equipment.map(eq => (
                    <div key={eq.id} className="flex items-center gap-3 p-3 border rounded-xl">
                      <span className="text-2xl">🎒</span>
                      <div className="flex-1">
                        <p className="font-medium">{eq.name}</p>
                        <p className="text-xs text-gray-500">Qté: {eq.quantity}</p>
                      </div>
                      <span className="font-bold text-green-600">{parseFloat(eq.price).toFixed(2)}€</span>
                      <button onClick={() => deleteEquipment(eq.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium mb-3">➕ Ajouter une pièce</h4>
                <div className="grid grid-cols-5 gap-2">
                  <input type="text" value={newPart.name} onChange={e => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-2 border-2 rounded-xl p-2" placeholder="Nom pièce" />
                  <input type="text" value={newPart.partNumber} onChange={e => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="border-2 rounded-xl p-2" placeholder="Réf." />
                  <input type="number" value={newPart.price} onChange={e => setNewPart(prev => ({ ...prev, price: e.target.value }))}
                    className="border-2 rounded-xl p-2" placeholder="Prix €" />
                  <input type="number" value={newPart.laborCost} onChange={e => setNewPart(prev => ({ ...prev, laborCost: e.target.value }))}
                    className="border-2 rounded-xl p-2" placeholder="M.O. €" />
                </div>
                <button onClick={addSparePart} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">➕ Ajouter</button>
              </div>

              <div className="space-y-2">
                {spareParts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune pièce configurée</p>
                ) : (
                  spareParts.map(part => (
                    <div key={part.id} className="flex items-center gap-3 p-3 border rounded-xl">
                      <span className="text-2xl">🔧</span>
                      <div className="flex-1">
                        <p className="font-medium">{part.name}</p>
                        <p className="text-xs text-gray-500">Réf: {part.partNumber || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{parseFloat(part.totalCost).toFixed(2)}€</p>
                        <p className="text-xs text-gray-500">Pièce: {parseFloat(part.price).toFixed(2)}€ + MO: {parseFloat(part.laborCost || 0).toFixed(2)}€</p>
                      </div>
                      <button onClick={() => deleteSparePart(part.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium mb-1">Intervalle km</label>
                  <input type="number" value={form.maintenanceIntervalKm} 
                    onChange={e => updateForm('maintenanceIntervalKm', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Intervalle jours</label>
                  <input type="number" value={form.maintenanceIntervalDays}
                    onChange={e => updateForm('maintenanceIntervalDays', e.target.value)}
                    className="w-full border-2 rounded-xl p-2" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium mb-3">➕ Nouvelle intervention</h4>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <select value={newMaintenance.type} onChange={e => setNewMaintenance(prev => ({ ...prev, type: e.target.value }))}
                    className="border-2 rounded-xl p-2">
                    <option value="SERVICE">🛠️ Entretien</option>
                    <option value="REPAIR">🔧 Réparation</option>
                    <option value="INSPECTION">�� Contrôle</option>
                    <option value="OTHER">📋 Autre</option>
                  </select>
                  <input type="date" value={newMaintenance.scheduledDate}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="border-2 rounded-xl p-2" />
                  <input type="number" value={newMaintenance.cost}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, cost: e.target.value }))}
                    className="border-2 rounded-xl p-2" placeholder="Coût €" />
                  <input type="text" value={newMaintenance.performedBy}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, performedBy: e.target.value }))}
                    className="border-2 rounded-xl p-2" placeholder="Prestataire" />
                </div>
                <input type="text" value={newMaintenance.description}
                  onChange={e => setNewMaintenance(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border-2 rounded-xl p-2 mb-2" placeholder="Description" />
                <button onClick={addMaintenance} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">➕ Ajouter</button>
              </div>

              <div className="space-y-2">
                {maintenance.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune intervention enregistrée</p>
                ) : (
                  maintenance.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 border rounded-xl">
                      <span className="text-2xl">
                        {m.type === 'SERVICE' ? '🛠️' : m.type === 'REPAIR' ? '🔧' : m.type === 'INSPECTION' ? '🔍' : '📋'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{m.description}</p>
                        <p className="text-xs text-gray-500">
                          {m.scheduledDate?.split('T')[0]} • {m.performedBy || '-'}
                        </p>
                      </div>
                      {m.totalCost && <span className="font-bold">{parseFloat(m.totalCost).toFixed(2)}€</span>}
                      <span className={'px-2 py-1 rounded text-xs ' + 
                        (m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                        {m.status === 'COMPLETED' ? 'Terminé' : 'Prévu'}
                      </span>
                      <button onClick={() => deleteMaintenance(m.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">Annuler</button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
            {saving ? '⏳ Sauvegarde...' : '✅ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FleetEditModal
