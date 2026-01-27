import { useState, useEffect } from 'react'
import { getName } from './types'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface NewFleetModalProps {
  agencyId: string
  onClose: () => void
  onSave: () => void
}

export function NewFleetModal({ agencyId, onClose, onSave }: NewFleetModalProps) {
  const [agencies, setAgencies] = useState([])
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  
  const [form, setForm] = useState({
    vehicleNumber: '',
    licensePlate: '',
    chassisNumber: '',
    brand: '',
    model: '',
    engineSize: '',
    year: new Date().getFullYear(),
    color: '',
    categoryId: '',
    vehicleId: '',
    currentMileage: 0,
    locationCode: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (form.categoryId) {
      setFilteredVehicles(vehicles.filter(v => v.categoryId === form.categoryId))
      setForm(prev => ({ ...prev, vehicleId: '' }))
    } else {
      setFilteredVehicles([])
    }
  }, [form.categoryId, vehicles])

  const loadData = async () => {
    try {
      const [catRes, vehRes, agRes] = await Promise.all([
        fetch(`${API_URL}/api/categories/brand/VOLTRIDE`),
        fetch(`${API_URL}/api/vehicles`),
        fetch(`${API_URL}/api/agencies/brand/VOLTRIDE`)
      ])
      setCategories(await catRes.json())
      setVehicles(await vehRes.json())
      setAgencies(await agRes.json())
    } catch (e) {
      console.error(e)
    }
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.vehicleNumber || !form.chassisNumber || !form.vehicleId) {
      alert('Veuillez remplir les champs obligatoires : Numéro, N° châssis, Type de véhicule')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/fleet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          agencyId,
          year: parseInt(form.year) || null,
          currentMileage: parseInt(form.currentMileage) || 0
        })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur création')
      }
      
      onSave()
    } catch (e: any) {
      console.error(e)
      alert('Erreur: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}>
        
        <div className="bg-gray-800 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Nouveau véhicule</h2>
            <button onClick={onClose} className="text-2xl opacity-70 hover:opacity-100">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          
          {/* Category & Vehicle Type Selection */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <p className="text-sm font-medium text-blue-800">Sélectionnez le type de véhicule (lié au backoffice)</p>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Catégorie *</label>
              <select value={form.categoryId} onChange={e => updateForm('categoryId', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm">
                <option value="">-- Sélectionner une catégorie --</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{getName(cat.name)}</option>
                ))}
              </select>
            </div>

            {form.categoryId && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Type de véhicule *</label>
                <select value={form.vehicleId} onChange={e => updateForm('vehicleId', e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm">
                  <option value="">-- Sélectionner un type --</option>
                  {filteredVehicles.map((veh: any) => (
                    <option key={veh.id} value={veh.id}>{getName(veh.name)}</option>
                  ))}
                </select>
                {filteredVehicles.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Aucun véhicule dans cette catégorie</p>
                )}
              </div>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Numéro véhicule *</label>
              <input type="text" value={form.vehicleNumber} onChange={e => updateForm('vehicleNumber', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" placeholder="S50-001" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Agence *</label>
              <select value={form.locationCode} onChange={e => updateForm('locationCode', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm">
                <option value="">-- Sélectionner une agence --</option>
                {agencies.map((ag: any) => (
                  <option key={ag.id} value={ag.code}>{ag.code} - {ag.name?.fr || ag.name?.es || ag.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Immatriculation</label>
              <input type="text" value={form.licensePlate} onChange={e => updateForm('licensePlate', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" placeholder="1234 ABC" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">N° châssis *</label>
            <input type="text" value={form.chassisNumber} onChange={e => updateForm('chassisNumber', e.target.value)}
              className="w-full border rounded-lg p-2 text-sm" />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Marque</label>
              <input type="text" value={form.brand} onChange={e => updateForm('brand', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Modèle</label>
              <input type="text" value={form.model} onChange={e => updateForm('model', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Cylindrée</label>
              <input type="text" value={form.engineSize} onChange={e => updateForm('engineSize', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" placeholder="125cc" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Année</label>
              <input type="number" value={form.year} onChange={e => updateForm('year', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Couleur</label>
              <input type="text" value={form.color} onChange={e => updateForm('color', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Kilométrage initial</label>
              <input type="number" value={form.currentMileage} onChange={e => updateForm('currentMileage', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
            Annuler
          </button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
            {saving ? 'Création...' : 'Créer le véhicule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewFleetModal
