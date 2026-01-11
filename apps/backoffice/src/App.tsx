import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://voltride-booking-production.up.railway.app'

type Tab = 'vehicles' | 'agencies' | 'categories' | 'options'

interface Agency { id: string; code: string; name: any; address: string; city: string; postalCode: string; country: string; phone: string; email: string; brand: string; openingTime: string; closingTimeSummer: string; closingTimeWinter: string; summerStartDate: string; summerEndDate: string; isActive: boolean }
interface Category { id: string; code: string; name: any; brand: string; bookingFee: number; _count?: { vehicles: number }; options?: any[] }
interface Vehicle { id: string; sku: string; name: any; description: any; deposit: number; hasPlate: boolean; licenseType?: string; kmIncluded?: string; kmIncludedPerDay?: number; extraKmPrice?: number; helmetIncluded?: boolean; imageUrl?: string; categoryId: string; category?: Category; pricing: any[] }
interface Option { id: string; code: string; name: any; maxQuantity: number; includedByDefault: boolean; imageUrl?: string; day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; day8: number; day9: number; day10: number; day11: number; day12: number; day13: number; day14: number; categories?: any[] }

function App() {
  const [tab, setTab] = useState<Tab>('vehicles')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<any>(null)

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    try {
      const [agRes, catRes, vehRes, optRes] = await Promise.all([
        fetch(API_URL + '/api/agencies'), fetch(API_URL + '/api/categories'), fetch(API_URL + '/api/vehicles'),
        fetch(API_URL + '/api/options')
      ])
      setAgencies(await agRes.json())
      setCategories(await catRes.json())
      setVehicles(await vehRes.json())
      setOptions(await optRes.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSave = async (type: string, data: any) => {
    const isEdit = !!editItem?.id
    const url = isEdit ? API_URL + '/api/' + type + '/' + editItem.id : API_URL + '/api/' + type
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setShowModal(null)
    setEditItem(null)
    loadAllData()
  }

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Supprimer ?')) return
    await fetch(API_URL + '/api/' + type + '/' + id, { method: 'DELETE' })
    loadAllData()
  }

  const getName = (obj: any, lang = 'fr') => obj?.[lang] || obj?.fr || obj?.es || ''

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-xl">Chargement...</p></div>

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 p-4" style={{ background: 'linear-gradient(180deg, #abdee6 0%, #ffaf10 100%)' }}>
        <div className="flex justify-center items-center gap-3 mb-8">
            <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1768119263/IMG-20260111-WA0001-removebg-preview_lpc7xh.png" className="h-10" alt="Voltride" />
            <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766930480/logo-2024-e1699439584325-removebg-preview_sv6yxg.png" className="h-10" alt="Motor-Rent" />
          </div>
        <nav className="space-y-2">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'vehicles', icon: '🚲', label: 'Véhicules' },
            { id: 'categories', icon: '🏷️', label: 'Catégories' },
            { id: 'agencies', icon: '🏢', label: 'Agences' },
            { id: 'options', icon: '🎒', label: 'Options' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id as Tab)} className={'w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ' + (tab === item.id ? 'bg-blue-600' : 'hover:bg-gray-800')}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8">


        {tab === 'vehicles' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Véhicules</h2>
              <button onClick={() => { setEditItem(null); setShowModal('vehicle') }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ Ajouter</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {vehicles.map(v => (
                <div key={v.id} className="bg-white p-4 rounded-xl shadow">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      {v.imageUrl ? <img src={v.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : <span className="text-3xl">🚲</span>}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{getName(v.name)}</h3>
                      <p className="text-sm text-gray-500">{v.sku}</p>
                      <p className="text-sm text-gray-500">{getName(v.category?.name)}</p>
                      <p className="text-sm">Caution: {v.deposit}€ {v.hasPlate && <span className="text-amber-600">🔖</span>}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditItem(v); setShowModal('vehicle') }} className="flex-1 bg-gray-100 py-1 rounded">Modifier</button>
                    <button onClick={() => handleDelete('vehicles', v.id)} className="flex-1 bg-red-100 text-red-600 py-1 rounded">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Catégories</h2>
              <button onClick={() => { setEditItem(null); setShowModal('category') }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ Ajouter</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {categories.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-xl shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{getName(c.name)}</h3>
                      <p className="text-sm text-gray-500">{c.code}</p>
                      <span className={'text-xs px-2 py-1 rounded-full ' + (c.brand === 'VOLTRIDE' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}>{c.brand}</span>
                    </div>
                    <span className="text-sm text-gray-400">{c._count?.vehicles || 0} véh.</span>
                  </div>
                  <p className="text-sm mt-2 text-green-600 font-bold">Acompte: {c.bookingFee}€</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditItem(c); setShowModal('category') }} className="flex-1 bg-gray-100 py-1 rounded">Modifier</button>
                    <button onClick={() => handleDelete('categories', c.id)} className="flex-1 bg-red-100 text-red-600 py-1 rounded">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {tab === 'agencies' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Agences</h2>
              <button onClick={() => { setEditItem(null); setShowModal('agency') }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ Ajouter</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {agencies.map(a => (
                <div key={a.id} className="bg-white p-4 rounded-xl shadow">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-bold">{getName(a.name)}</h3>
                      <p className="text-sm text-gray-500">{a.code} - {a.city}</p>
                      <p className="text-sm text-gray-500">{a.phone}</p>
                    </div>
                    <span className={'text-xs px-2 py-1 h-fit rounded-full ' + (a.brand === 'VOLTRIDE' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}>{a.brand}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditItem(a); setShowModal('agency') }} className="flex-1 bg-gray-100 py-1 rounded">Modifier</button>
                    <button onClick={() => handleDelete('agencies', a.id)} className="flex-1 bg-red-100 text-red-600 py-1 rounded">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'options' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Options & Accessoires</h2>
              <button onClick={() => { setEditItem(null); setShowModal('option') }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ Ajouter</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {options.map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl shadow">
                  <div className="flex gap-3">
                    {o.imageUrl ? (
                      <img src={o.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🎁</div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{getName(o.name)}</h3>
                          <p className="text-sm text-gray-500">{o.code}</p>
                          {o.includedByDefault && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Inclus par défaut</span>}
                        </div>
                        <span className="text-sm text-gray-400">Max: {o.maxQuantity}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Tarifs: J1={o.day1}€, J2={o.day2}€, J3={o.day3}€...</p>
                    <p className="text-xs text-gray-500 mt-1">Catégories: {o.categories?.map((c: any) => getName(c.category?.name)).join(', ') || 'Aucune'}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditItem(o); setShowModal('option') }} className="flex-1 bg-gray-100 py-1 rounded">Modifier</button>
                    <button onClick={() => handleDelete('options', o.id)} className="flex-1 bg-red-100 text-red-600 py-1 rounded">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showModal === 'agency' && <AgencyModal agency={editItem} onSave={(data) => handleSave('agencies', data)} onClose={() => { setShowModal(null); setEditItem(null) }} />}
      {showModal === 'category' && <CategoryModal category={editItem} onSave={(data) => handleSave('categories', data)} onClose={() => { setShowModal(null); setEditItem(null) }} />}
      {showModal === 'vehicle' && <VehicleModal vehicle={editItem} categories={categories} onSave={(data) => handleSave('vehicles', data)} onClose={() => { setShowModal(null); setEditItem(null) }} />}
      {showModal === 'option' && <OptionModal option={editItem} categories={categories} onSave={(data) => handleSave('options', data)} onClose={() => { setShowModal(null); setEditItem(null) }} />}
    </div>
  )
}

function AgencyModal({ agency, onSave, onClose }: { agency: any; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ code: agency?.code || '', nameFr: agency?.name?.fr || '', nameEs: agency?.name?.es || '', nameEn: agency?.name?.en || '', address: agency?.address || '', city: agency?.city || '', postalCode: agency?.postalCode || '', country: agency?.country || 'ES', phone: agency?.phone || '', email: agency?.email || '', brand: agency?.brand || 'VOLTRIDE', openingTime: agency?.openingTime || '10:00', closingTimeSummer: agency?.closingTimeSummer || '19:00', closingTimeWinter: agency?.closingTimeWinter || '16:00', summerStartDate: agency?.summerStartDate || "04-01", summerEndDate: agency?.summerEndDate || "09-30", isActive: agency?.isActive ?? true })
  const handleSubmit = () => onSave({ ...form, name: { fr: form.nameFr, es: form.nameEs, en: form.nameEn } })
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{agency ? 'Modifier' : 'Ajouter'} Agence</h3>
        <div className="space-y-3">
          <input placeholder="Code (ex: AG-01)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom FR" value={form.nameFr} onChange={e => setForm({ ...form, nameFr: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom ES" value={form.nameEs} onChange={e => setForm({ ...form, nameEs: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom EN" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full p-2 border rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Ville" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="p-2 border rounded" />
            <input placeholder="Code postal" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} className="p-2 border rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="p-2 border rounded" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="p-2 border rounded" />
          </div>
          <select value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full p-2 border rounded">
            <option value="VOLTRIDE">VOLTRIDE</option>
            <option value="MOTOR-RENT">MOTOR-RENT</option>
          </select>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ouverture</label>
              <input type="time" value={form.openingTime} onChange={e => setForm({ ...form, openingTime: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fermeture été</label>
              <input type="time" value={form.closingTimeSummer} onChange={e => setForm({ ...form, closingTimeSummer: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fermeture hiver</label>
              <input type="time" value={form.closingTimeWinter} onChange={e => setForm({ ...form, closingTimeWinter: e.target.value })} className="w-full p-2 border rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Début saison été (MM-JJ)</label>
              <input type="text" placeholder="04-01" value={form.summerStartDate} onChange={e => setForm({ ...form, summerStartDate: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fin saison été (MM-JJ)</label>
              <input type="text" placeholder="09-30" value={form.summerEndDate} onChange={e => setForm({ ...form, summerEndDate: e.target.value })} className="w-full p-2 border rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">Annuler</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function CategoryModal({ category, onSave, onClose }: { category: any; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ code: category?.code || '', nameFr: category?.name?.fr || '', nameEs: category?.name?.es || '', nameEn: category?.name?.en || '', brand: category?.brand || 'VOLTRIDE', bookingFee: category?.bookingFee || 0 })
  const handleSubmit = () => onSave({ ...form, name: { fr: form.nameFr, es: form.nameEs, en: form.nameEn }, bookingFee: parseFloat(String(form.bookingFee)) || 0 })
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">{category ? 'Modifier' : 'Ajouter'} Catégorie</h3>
        <div className="space-y-3">
          <input placeholder="Code (ex: CAT-EBIKE)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom FR" value={form.nameFr} onChange={e => setForm({ ...form, nameFr: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom ES" value={form.nameEs} onChange={e => setForm({ ...form, nameEs: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom EN" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="w-full p-2 border rounded" />
          <select value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full p-2 border rounded">
            <option value="VOLTRIDE">VOLTRIDE</option>
            <option value="MOTOR-RENT">MOTOR-RENT</option>
          </select>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Acompte fixe (Motor-Rent)</label>
            <input type="number" placeholder="Acompte € (ex: 50)" value={form.bookingFee} onChange={e => setForm({ ...form, bookingFee: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">Annuler</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function VehicleModal({ vehicle, categories, onSave, onClose }: { vehicle: any; categories: Category[]; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    sku: vehicle?.sku || '', nameFr: vehicle?.name?.fr || '', nameEs: vehicle?.name?.es || '', nameEn: vehicle?.name?.en || '',
    descFr: vehicle?.description?.fr || '', descEs: vehicle?.description?.es || '', descEn: vehicle?.description?.en || '',
    deposit: vehicle?.deposit || 0, hasPlate: vehicle?.hasPlate || false, licenseTypeFr: vehicle?.licenseType?.fr || '', licenseTypeEs: vehicle?.licenseType?.es || '', licenseTypeEn: vehicle?.licenseType?.en || '', kmIncludedFr: vehicle?.kmIncluded?.fr || '', kmIncludedEs: vehicle?.kmIncluded?.es || '', kmIncludedEn: vehicle?.kmIncluded?.en || '', kmIncludedPerDay: vehicle?.kmIncludedPerDay || 100, extraKmPrice: vehicle?.extraKmPrice || 0.15, helmetIncluded: vehicle?.helmetIncluded ?? true, categoryId: vehicle?.categoryId || '', imageUrl: vehicle?.imageUrl || '',
    pricing: vehicle?.pricing?.[0] || {}
  })
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'voltride')
    const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setForm({ ...form, imageUrl: data.secure_url })
    setUploading(false)
  }

  const handleSubmit = () => onSave({
    sku: form.sku, name: { fr: form.nameFr, es: form.nameEs, en: form.nameEn },
    description: { fr: form.descFr, es: form.descEs, en: form.descEn },
    deposit: parseFloat(String(form.deposit)), hasPlate: form.hasPlate, licenseType: { fr: form.licenseTypeFr, es: form.licenseTypeEs, en: form.licenseTypeEn }, kmIncluded: { fr: form.kmIncludedFr, es: form.kmIncludedEs, en: form.kmIncludedEn }, kmIncludedPerDay: parseInt(String(form.kmIncludedPerDay)) || 100, extraKmPrice: parseFloat(String(form.extraKmPrice)) || 0.15, helmetIncluded: form.helmetIncluded, categoryId: form.categoryId, imageUrl: form.imageUrl,
    pricing: form.pricing
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{vehicle ? 'Modifier' : 'Ajouter'} Véhicule</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="SKU (ex: VR-EB-001)" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="p-2 border rounded" />
            <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="p-2 border rounded">
              <option value="">-- Catégorie --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name?.fr} ({c.brand})</option>)}
            </select>
          </div>
          <input placeholder="Nom FR" value={form.nameFr} onChange={e => setForm({ ...form, nameFr: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom ES" value={form.nameEs} onChange={e => setForm({ ...form, nameEs: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom EN" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="w-full p-2 border rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Caution €" value={form.deposit} onChange={e => setForm({ ...form, deposit: parseFloat(e.target.value) || 0 })} className="p-2 border rounded" />
            <label className="flex items-center gap-2 p-2 border rounded">
              <input type="checkbox" checked={form.hasPlate} onChange={e => setForm({ ...form, hasPlate: e.target.checked })} />
              Immatriculé
            </label>
          </div>
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Type de permis</p>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="FR: A1, B +3 ans" value={form.licenseTypeFr} onChange={e => setForm({ ...form, licenseTypeFr: e.target.value })} className="p-2 border rounded text-sm" />
              <input type="text" placeholder="ES: A1, B +3 años" value={form.licenseTypeEs} onChange={e => setForm({ ...form, licenseTypeEs: e.target.value })} className="p-2 border rounded text-sm" />
              <input type="text" placeholder="EN: A1, B +3 years" value={form.licenseTypeEn} onChange={e => setForm({ ...form, licenseTypeEn: e.target.value })} className="p-2 border rounded text-sm" />
            </div>
          </div>
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Kms inclus</p>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="FR: 100km/jour" value={form.kmIncludedFr} onChange={e => setForm({ ...form, kmIncludedFr: e.target.value })} className="p-2 border rounded text-sm" />
              <input type="text" placeholder="ES: 100km/día" value={form.kmIncludedEs} onChange={e => setForm({ ...form, kmIncludedEs: e.target.value })} className="p-2 border rounded text-sm" />
              <input type="text" placeholder="EN: 100km/day" value={form.kmIncludedEn} onChange={e => setForm({ ...form, kmIncludedEn: e.target.value })} className="p-2 border rounded text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Km inclus/jour (calcul)</label>
                <input type="number" value={form.kmIncludedPerDay} onChange={e => setForm({ ...form, kmIncludedPerDay: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="100" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Prix km suppl. (€)</label>
                <input type="number" step="0.01" value={form.extraKmPrice} onChange={e => setForm({ ...form, extraKmPrice: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="0.15" />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 p-2 border rounded">
            <input type="checkbox" checked={form.helmetIncluded} onChange={e => setForm({ ...form, helmetIncluded: e.target.checked })} />
            Casque inclus
          </label>
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Photo</p>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="w-24 h-24 object-cover rounded mb-2" />}
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
            {uploading && <p className="text-sm text-blue-600">Upload...</p>}
          </div>
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Tarifs journaliers (€)</p>
            <div className="grid grid-cols-7 gap-1">
              {[1,2,3,4,5,6,7].map(d => (
                <input key={d} type="number" placeholder={'J' + d} value={form.pricing['day' + d] || ''} onChange={e => setForm({ ...form, pricing: { ...form.pricing, ['day' + d]: parseFloat(e.target.value) || 0 } })} className="p-1 border rounded text-center text-sm" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {[8,9,10,11,12,13,14].map(d => (
                <input key={d} type="number" placeholder={'J' + d} value={form.pricing['day' + d] || ''} onChange={e => setForm({ ...form, pricing: { ...form.pricing, ['day' + d]: parseFloat(e.target.value) || 0 } })} className="p-1 border rounded text-center text-sm" />
              ))}
            </div>
            <p className="text-sm font-medium mt-3 mb-2">Heures supplémentaires (€)</p>
            <div className="grid grid-cols-4 gap-1">
              {[1,2,3,4].map(h => (
                <input key={h} type="number" placeholder={'H' + h} value={form.pricing['extraHour' + h] || ''} onChange={e => setForm({ ...form, pricing: { ...form.pricing, ['extraHour' + h]: parseFloat(e.target.value) || 0 } })} className="p-1 border rounded text-center text-sm" />
              ))}
            </div>
            <p className="text-sm font-medium mt-3 mb-2">Prix jour supplémentaire (après 14j) €</p>
            <input type="number" placeholder="Prix/jour après 14 jours" value={form.pricing.extraDayPrice || ''} onChange={e => setForm({ ...form, pricing: { ...form.pricing, extraDayPrice: parseFloat(e.target.value) || 0 } })} className="w-full p-2 border rounded text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">Annuler</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

function OptionModal({ option, categories, onSave, onClose }: { option: any; categories: Category[]; onSave: (data: any) => void; onClose: () => void }) {
  const existingCatIds = option?.categories?.map((c: any) => c.categoryId) || []
  const [form, setForm] = useState({
    code: option?.code || '', nameFr: option?.name?.fr || '', nameEs: option?.name?.es || '', nameEn: option?.name?.en || '',
    maxQuantity: option?.maxQuantity || 10, includedByDefault: option?.includedByDefault || false, imageUrl: option?.imageUrl || '',
    day1: option?.day1 || 0, day2: option?.day2 || 0, day3: option?.day3 || 0, day4: option?.day4 || 0, day5: option?.day5 || 0, day6: option?.day6 || 0, day7: option?.day7 || 0,
    day8: option?.day8 || 0, day9: option?.day9 || 0, day10: option?.day10 || 0, day11: option?.day11 || 0, day12: option?.day12 || 0, day13: option?.day13 || 0, day14: option?.day14 || 0,
    categoryIds: existingCatIds as string[]
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'voltride')
    const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setForm({ ...form, imageUrl: data.secure_url })
  }

  const toggleCategory = (catId: string) => {
    if (form.categoryIds.includes(catId)) {
      setForm({ ...form, categoryIds: form.categoryIds.filter(id => id !== catId) })
    } else {
      setForm({ ...form, categoryIds: [...form.categoryIds, catId] })
    }
  }

  const handleSubmit = () => onSave({
    code: form.code, name: { fr: form.nameFr, es: form.nameEs, en: form.nameEn },
    maxQuantity: parseInt(String(form.maxQuantity)), includedByDefault: form.includedByDefault, imageUrl: form.imageUrl,
    day1: parseFloat(String(form.day1)) || 0, day2: parseFloat(String(form.day2)) || 0, day3: parseFloat(String(form.day3)) || 0, day4: parseFloat(String(form.day4)) || 0,
    day5: parseFloat(String(form.day5)) || 0, day6: parseFloat(String(form.day6)) || 0, day7: parseFloat(String(form.day7)) || 0, day8: parseFloat(String(form.day8)) || 0,
    day9: parseFloat(String(form.day9)) || 0, day10: parseFloat(String(form.day10)) || 0, day11: parseFloat(String(form.day11)) || 0, day12: parseFloat(String(form.day12)) || 0,
    day13: parseFloat(String(form.day13)) || 0, day14: parseFloat(String(form.day14)) || 0,
    categoryIds: form.categoryIds
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{option ? 'Modifier' : 'Ajouter'} Option</h3>
        <div className="space-y-3">
          <input placeholder="Code (ex: OPT-CASQUE)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom FR" value={form.nameFr} onChange={e => setForm({ ...form, nameFr: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom ES" value={form.nameEs} onChange={e => setForm({ ...form, nameEs: e.target.value })} className="w-full p-2 border rounded" />
          <input placeholder="Nom EN" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="w-full p-2 border rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Quantité max" value={form.maxQuantity} onChange={e => setForm({ ...form, maxQuantity: parseInt(e.target.value) || 10 })} className="p-2 border rounded" />
            <label className="flex items-center gap-2 p-2 border rounded">
              <input type="checkbox" checked={form.includedByDefault} onChange={e => setForm({ ...form, includedByDefault: e.target.checked })} />
              Inclus par défaut
            </label>
          </div>
          
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Image</p>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="w-24 h-24 object-cover rounded mb-2" />}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
          </div>
          
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Catégories associées</p>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(c => (
                <label key={c.id} className={'flex items-center gap-2 p-2 border rounded cursor-pointer ' + (form.categoryIds.includes(c.id) ? 'bg-blue-50 border-blue-300' : '')}>
                  <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                  <span className="text-sm">{c.name?.fr}</span>
                  <span className={'text-xs px-1 rounded ' + (c.brand === 'VOLTRIDE' ? 'bg-blue-100' : 'bg-red-100')}>{c.brand === 'VOLTRIDE' ? 'V' : 'MR'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Tarifs journaliers (€)</p>
            <div className="grid grid-cols-7 gap-1">
              {[1,2,3,4,5,6,7].map(d => (
                <input key={d} type="number" placeholder={'J' + d} value={form['day' + d as keyof typeof form] || ''} onChange={e => setForm({ ...form, ['day' + d]: parseFloat(e.target.value) || 0 })} className="p-1 border rounded text-center text-sm" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {[8,9,10,11,12,13,14].map(d => (
                <input key={d} type="number" placeholder={'J' + d} value={form['day' + d as keyof typeof form] || ''} onChange={e => setForm({ ...form, ['day' + d]: parseFloat(e.target.value) || 0 })} className="p-1 border rounded text-center text-sm" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">Annuler</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

export default App
