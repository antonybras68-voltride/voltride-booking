import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://voltride-booking-production.up.railway.app'

const DAYS = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' },
]

interface Period {
  id?: string
  name: string
  startDate: string
  endDate: string
  isDefault: boolean
  [key: string]: any
}

interface Closure {
  id?: string
  startDate: string
  endDate: string
  reason: string
}

interface Props {
  agency: any
  onClose: () => void
}

export function AgencyScheduleModal({ agency, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'periods' | 'closures'>('periods')
  const [periods, setPeriods] = useState<Period[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [showClosureForm, setShowClosureForm] = useState(false)

  useEffect(() => { loadData() }, [agency.id])

  const loadData = async () => {
    try {
      const [periodsRes, closuresRes] = await Promise.all([
        fetch(`${API_URL}/api/agencies/${agency.id}/schedule-periods`),
        fetch(`${API_URL}/api/agencies/${agency.id}/closures`)
      ])
      setPeriods(await periodsRes.json())
      setClosures(await closuresRes.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const getName = (obj: any) => obj?.fr || obj?.es || ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📅 Horaires - {getName(agency.name)}</h2>
            <p className="text-sm opacity-70">{agency.code} - {agency.city}</p>
          </div>
          <button onClick={onClose} className="text-2xl opacity-70 hover:opacity-100">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button onClick={() => setActiveTab('periods')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'periods' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            📅 Périodes d'ouverture
          </button>
          <button onClick={() => setActiveTab('closures')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'closures' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500'}`}>
            🚋 Fermetures exceptionnelles
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : activeTab === 'periods' ? (
            <PeriodsTab 
              periods={periods} 
              agencyId={agency.id} 
              onReload={loadData}
              showForm={showPeriodForm}
              setShowForm={setShowPeriodForm}
              editing={editingPeriod}
              setEditing={setEditingPeriod}
            />
          ) : (
            <ClosuresTab 
              closures={closures} 
              agencyId={agency.id} 
              onReload={loadData}
              showForm={showClosureForm}
              setShowForm={setShowClosureForm}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// =========== PERIODS TAB ===========
function PeriodsTab({ periods, agencyId, onReload, showForm, setShowForm, editing, setEditing }: any) {
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette période ?')) return
    await fetch(`${API_URL}/api/schedule-periods/${id}`, { method: 'DELETE' })
    onReload()
  }

  if (showForm) {
    return <PeriodForm agencyId={agencyId} period={editing} onSave={() => { setShowForm(false); setEditing(null); onReload() }} onCancel={() => { setShowForm(false); setEditing(null) }} />
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">Définissez les horaires pour chaque saison</p>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          + Nouvelle période
        </button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-gray-500">Aucune période configurée</p>
          <p className="text-sm text-gray-400 mt-1">Créez une période pour définir les horaires</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p: Period) => (
            <div key={p.id} className="border rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {p.name}
                    {p.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Par défaut</span>}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(p.startDate).toLocaleDateString('fr-FR')} - {new Date(p.endDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(p); setShowForm(true) }} className="text-blue-600 text-sm">Modifier</button>
                  <button onClick={() => handleDelete(p.id!)} className="text-red-600 text-sm">Supprimer</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {DAYS.map(d => (
                  <div key={d.id} className={`p-2 rounded text-center ${p[`${d.id}IsClosed`] ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    <div className="font-medium">{d.label.slice(0,3)}</div>
                    {p[`${d.id}IsClosed`] ? (
                      <div>Fermé</div>
                    ) : (
                      <div>{p[`${d.id}Open`] || '-'} - {p[`${d.id}Close`] || '-'}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =========== PERIOD FORM ===========
function PeriodForm({ agencyId, period, onSave, onCancel }: any) {
  const [form, setForm] = useState<Period>({
    name: period?.name || '',
    startDate: period?.startDate?.split('T')[0] || '',
    endDate: period?.endDate?.split('T')[0] || '',
    isDefault: period?.isDefault || false,
    mondayOpen: period?.mondayOpen || '10:00',
    mondayClose: period?.mondayClose || '19:00',
    mondayIsClosed: period?.mondayIsClosed || false,
    tuesdayOpen: period?.tuesdayOpen || '10:00',
    tuesdayClose: period?.tuesdayClose || '19:00',
    tuesdayIsClosed: period?.tuesdayIsClosed || false,
    wednesdayOpen: period?.wednesdayOpen || '10:00',
    wednesdayClose: period?.wednesdayClose || '19:00',
    wednesdayIsClosed: period?.wednesdayIsClosed || false,
    thursdayOpen: period?.thursdayOpen || '10:00',
    thursdayClose: period?.thursdayClose || '19:00',
    thursdayIsClosed: period?.thursdayIsClosed || false,
    fridayOpen: period?.fridayOpen || '10:00',
    fridayClose: period?.fridayClose || '19:00',
    fridayIsClosed: period?.fridayIsClosed || false,
    saturdayOpen: period?.saturdayOpen || '10:00',
    saturdayClose: period?.saturdayClose || '19:00',
    saturdayIsClosed: period?.saturdayIsClosed || false,
    sundayOpen: period?.sundayOpen || '10:00',
    sundayClose: period?.sundayClose || '19:00',
    sundayIsClosed: period?.sundayIsClosed ?? true,
  })
  const [saving, setSaving] = useState(false)
  // const [selectingDates, setSelectingDates] = useState(false)

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    setSaving(true)
    try {
      const url = period?.id 
        ? `${API_URL}/api/schedule-periods/${period.id}`
        : `${API_URL}/api/agencies/${agencyId}/schedule-periods`
      await fetch(url, {
        method: period?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      onSave()
    } catch (e) { alert('Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  const applyToAllDays = (open: string, close: string) => {
    const updates: any = {}
    DAYS.forEach(d => {
      if (!form[`${d.id}IsClosed`]) {
        updates[`${d.id}Open`] = open
        updates[`${d.id}Close`] = close
      }
    })
    setForm(prev => ({ ...prev, ...updates }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">← Retour</button>
        <h3 className="font-bold">{period ? 'Modifier' : 'Nouvelle'} période</h3>
      </div>

      {/* Nom et dates */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Nom de la période *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Été 2025" className="w-full p-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date début *</label>
          <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
            className="w-full p-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date fin *</label>
          <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
            className="w-full p-2 border rounded-lg" />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
        <span className="text-sm">Définir comme période par défaut (si aucune autre ne correspond)</span>
      </label>

      {/* Appliquer à tous */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm font-medium mb-2">💡 Appliquer à tous les jours ouverts</p>
        <div className="flex gap-2 items-center">
          <input type="time" id="bulkOpen" defaultValue="10:00" className="p-2 border rounded" />
          <span>á</span>
          <input type="time" id="bulkClose" defaultValue="19:00" className="p-2 border rounded" />
          <button onClick={() => {
            const open = (document.getElementById('bulkOpen') as HTMLInputElement).value
            const close = (document.getElementById('bulkClose') as HTMLInputElement).value
            applyToAllDays(open, close)
          }} className="bg-blue-600 text-white px-3 py-2 rounded text-sm">Appliquer</button>
        </div>
      </div>

      {/* Horaires par jour */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Horaires par jour</p>
        {DAYS.map(d => (
          <div key={d.id} className={`flex items-center gap-3 p-2 rounded-lg ${form[`${d.id}IsClosed`] ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="w-24 font-medium">{d.label}</div>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={form[`${d.id}IsClosed`]} onChange={e => setForm({ ...form, [`${d.id}IsClosed`]: e.target.checked })} />
              <span className="text-sm text-red-600">Fermé</span>
            </label>
            {!form[`${d.id}IsClosed`] && (
              <>
                <input type="time" value={form[`${d.id}Open`] || ''} onChange={e => setForm({ ...form, [`${d.id}Open`]: e.target.value })}
                  className="p-2 border rounded" />
                <span>á</span>
                <input type="time" value={form[`${d.id}Close`] || ''} onChange={e => setForm({ ...form, [`${d.id}Close`]: e.target.value })}
                  className="p-2 border rounded" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <button onClick={onCancel} className="flex-1 py-2 bg-gray-200 rounded-lg">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// =========== CLOSURES TAB ===========
function ClosuresTab({ closures, agencyId, onReload, showForm, setShowForm }: any) {
  const [newClosure, setNewClosure] = useState({ startDate: '', endDate: '', reason: '' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newClosure.startDate || !newClosure.endDate || !newClosure.reason) {
      alert('Veuillez remplir tous les champs')
      return
    }
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/agencies/${agencyId}/closures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClosure)
      })
      setNewClosure({ startDate: '', endDate: '', reason: '' })
      setShowForm(false)
      onReload()
    } catch (e) { alert('Erreur') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fermeture ?')) return
    await fetch(`${API_URL}/api/closures/${id}`, { method: 'DELETE' })
    onReload()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">Fériés, vacances, fermetures exceptionnelles</p>
        <button onClick={() => setShowForm(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
          + Ajouter fermeture
        </button>
      </div>

      {showForm && (
        <div className="bg-red-50 p-4 rounded-xl mb-4">
          <h4 className="font-medium mb-3">Nouvelle fermeture</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm mb-1">Du</label>
              <input type="date" value={newClosure.startDate} onChange={e => setNewClosure({ ...newClosure, startDate: e.target.value })}
                className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Au</label>
              <input type="date" value={newClosure.endDate} onChange={e => setNewClosure({ ...newClosure, endDate: e.target.value })}
                className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Raison</label>
              <input type="text" value={newClosure.reason} onChange={e => setNewClosure({ ...newClosure, reason: e.target.value })}
                placeholder="Ex: Vacances d'hiver" className="w-full p-2 border rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded">Annuler</button>
            <button onClick={handleAdd} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">
              {saving ? 'Enrnt...' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {closures.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-gray-500">Aucune fermeture programmée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {closures.map((c: Closure) => (
            <div key={c.id} className="flex justify-between items-center p-3 border border-red-200 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium">🚫 {c.reason}</p>
                <p className="text-sm text-gray-600">
                  {new Date(c.startDate).toLocaleDateString('fr-FR')} - {new Date(c.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button onClick={() => handleDelete(c.id!)} className="text-red-600 hover:text-red-800">Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AgencyScheduleModal