import { useState, useRef, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'
const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload'
const CLOUDINARY_PRESET = 'voltride'

interface CheckInModalProps {
  booking: any
  fleetVehicle: any
  onClose: () => void
  onComplete: () => void
}

const getName = (obj: any) => obj?.fr || obj?.es || obj?.en || ''

// Conditions générales en 3 langues
const TERMS = {
  FR: `CONDITIONS GÉNÉRALES DE LOCATION

1. Le locataire s'engage à utiliser le véhicule de manière responsable et conforme au code de la route.
2. Le véhicule doit être restitué dans le même état qu'à la prise en charge.
3. Tout dommage constaté lors du retour sera facturé au locataire.
4. La caution sera restituée après vérification de l'état du véhicule.
5. En cas de retard de restitution, des frais supplémentaires seront appliqués.
6. Le locataire doit signaler tout incident ou problème technique immédiatement.
7. L'utilisation du véhicule est interdite sous l'emprise de l'alcool ou de stupéfiants.
8. Le locataire est responsable des amendes et infractions commises pendant la location.`,

  ES: `CONDICIONES GENERALES DE ALQUILER

1. El arrendatario se compromete a utilizar el vehículo de manera responsable y conforme al código de circulación.
2. El vehículo debe ser devuelto en el mismo estado que en el momento de la recogida.
3. Cualquier daño detectado en la devolución será facturado al arrendatario.
4. La fianza será devuelta tras la verificación del estado del vehículo.
5. En caso de retraso en la devolución, se aplicarán cargos adicionales.
6. El arrendatario debe informar de cualquier incidente o problema técnico inmediatamente.
7. Está prohibido el uso del vehículo bajo los efectos del alcohol o estupefacientes.
8. El arrendatario es responsable de las multas e infracciones cometidas durante el alquiler.`,

  EN: `GENERAL RENTAL CONDITIONS

1. The tenant agrees to use the vehicle responsibly and in accordance with traffic regulations.
2. The vehicle must be returned in the same condition as at pick-up.
3. Any damage found upon return will be charged to the tenant.
4. The deposit will be refunded after verification of the vehicle's condition.
5. In case of late return, additional charges will apply.
6. The tenant must report any incident or technical problem immediately.
7. Use of the vehicle under the influence of alcohol or drugs is prohibited.
8. The tenant is responsible for fines and violations committed during the rental.`
}

// Équipements par défaut
const DEFAULT_EQUIPMENT = [
  { id: 'helmet1', name: 'Casque conducteur', nameEs: 'Casco conductor', nameEn: 'Driver helmet' },
  { id: 'helmet2', name: 'Casque passager', nameEs: 'Casco pasajero', nameEn: 'Passenger helmet' },
  { id: 'lock', name: 'Antivol', nameEs: 'Candado', nameEn: 'Lock' },
  { id: 'charger', name: 'Chargeur', nameEs: 'Cargador', nameEn: 'Charger' },
  { id: 'topcase', name: 'Top case', nameEs: 'Top case', nameEn: 'Top case' },
]

export function CheckInModal({ booking, fleetVehicle, onClose, onComplete }: CheckInModalProps) {
  const [step, setStep] = useState<'vehicle' | 'inspection' | 'equipment' | 'documents' | 'signature' | 'payment'>('vehicle')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Données du formulaire
  const [form, setForm] = useState({
    // Étape 1 - Véhicule
    startMileage: fleetVehicle?.currentMileage || 0,
    
    // Étape 2 - Inspection
    startFuelLevel: fleetVehicle?.lastFuelLevel || 'FULL',
    photoFront: '',
    photoLeft: '',
    photoRight: '',
    photoRear: '',
    photoCounter: '',
    damageSchema: [] as { x: number; y: number; type: 'broken' | 'scratch'; note?: string }[],
    
    // Étape 3 - Équipements
    equipment: DEFAULT_EQUIPMENT.map(e => ({ ...e, checked: false, quantity: 1 })),
    
    // Étape 4 - Documents
    customerIdCardUrl: '',
    customerLicenseUrl: '',
    
    // Étape 5 - Signature
    signature: '',
    termsLanguage: 'FR',
    termsAccepted: false,
    
    // Étape 6 - Paiement
    locationPaid: booking?.paidAmount > 0,
    depositPaid: false,
    depositMethod: 'CARD' as 'CARD' | 'CASH',
    discount: 0,
    discountReason: ''
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Calculs de paiement
  const locationAmount = booking?.totalPrice || 0
  const paidOnline = booking?.paidAmount || 0
  const remainingLocation = Math.max(0, locationAmount - paidOnline - form.discount)
  const depositAmount = booking?.depositAmount || fleetVehicle?.vehicle?.deposit || 0
  const taxRate = 0.21
  const subtotal = remainingLocation
  const taxAmount = subtotal * taxRate
  const totalToPay = subtotal + taxAmount

  // Upload photo vers Cloudinary
  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)
    formData.append('folder', `checkin/${booking.reference}`)
    
    const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData })
    const data = await res.json()
    return data.secure_url
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const url = await uploadPhoto(file)
      setForm({ ...form, [field]: url })
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Erreur lors de l\'upload de la photo')
    }
    setUploading(false)
  }

  // Canvas signature
  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }

  useEffect(() => {
    if (step === 'signature') {
      setTimeout(initCanvas, 100)
    }
  }, [step])

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setForm({ ...form, signature: canvas.toDataURL() })
    }
  }

  const clearSignature = () => {
    initCanvas()
    setForm({ ...form, signature: '' })
  }

  // Schéma de dégâts - clic sur le véhicule
  const handleDamageClick = (e: React.MouseEvent<HTMLDivElement>, type: 'broken' | 'scratch') => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setForm({
      ...form,
      damageSchema: [...form.damageSchema, { x, y, type }]
    })
  }

  const removeDamage = (index: number) => {
    setForm({
      ...form,
      damageSchema: form.damageSchema.filter((_, i) => i !== index)
    })
  }

  // Validation par étape
  const canProceed = () => {
    switch (step) {
      case 'vehicle':
        return true
      case 'inspection':
        return form.photoFront && form.photoLeft && form.photoRight && form.photoRear
      case 'equipment':
        return true
      case 'documents':
        const needsLicense = fleetVehicle?.vehicle?.hasPlate
        return form.customerIdCardUrl && (!needsLicense || form.customerLicenseUrl)
      case 'signature':
        return form.signature && form.termsAccepted
      case 'payment':
        return form.locationPaid && form.depositPaid
      default:
        return true
    }
  }

  const nextStep = () => {
    const steps: Array<typeof step> = ['vehicle', 'inspection', 'equipment', 'documents', 'signature', 'payment']
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: Array<typeof step> = ['vehicle', 'inspection', 'equipment', 'documents', 'signature', 'payment']
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // 1. Créer/mettre à jour le contrat
      const contractData = {
        bookingId: booking.id,
        fleetVehicleId: fleetVehicle?.id,
        agencyId: booking.agency?.id,
        customerId: booking.customer?.id,
        startMileage: form.startMileage,
        startFuelLevel: form.startFuelLevel,
        photoFront: form.photoFront,
        photoLeft: form.photoLeft,
        photoRight: form.photoRight,
        photoRear: form.photoRear,
        photoCounter: form.photoCounter,
        damageSchema: form.damageSchema,
        equipmentChecklist: form.equipment.filter(e => e.checked),
        customerIdCardUrl: form.customerIdCardUrl,
        customerLicenseUrl: form.customerLicenseUrl,
        customerSignature: form.signature,
        termsAcceptedAt: new Date().toISOString(),
        termsLanguage: form.termsLanguage,
        discountAmount: form.discount,
        discountReason: form.discountReason,
        depositMethod: form.depositMethod,
        depositStatus: form.depositPaid ? 'CAPTURED' : 'PENDING',
        paymentStatus: form.locationPaid ? 'PAID' : 'PENDING'
      }

      await fetch(API_URL + '/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      })

      // 2. Mettre à jour la réservation
      await fetch(API_URL + '/api/bookings/' + booking.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn: true, checkedInAt: new Date().toISOString() })
      })

      // 3. Mettre à jour le véhicule
      await fetch(API_URL + '/api/fleet/' + fleetVehicle.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RENTED', currentMileage: form.startMileage })
      })

      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors du check-in')
    }
    setLoading(false)
  }

  const stepLabels = {
    vehicle: 'Véhicule',
    inspection: 'Inspection',
    equipment: 'Équipements',
    documents: 'Documents',
    signature: 'Signature',
    payment: 'Paiement'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-green-50">
          <h2 className="text-xl font-bold text-green-800">✅ Check-in</h2>
          <p className="text-green-600">{booking?.reference} - {booking?.customer?.firstName} {booking?.customer?.lastName}</p>
        </div>

        {/* Progress */}
        <div className="flex border-b overflow-x-auto">
          {Object.entries(stepLabels).map(([key, label], i) => (
            <div
              key={key}
              className={'flex-1 min-w-0 py-2 px-1 text-center text-xs font-medium cursor-pointer whitespace-nowrap ' +
                (step === key ? 'bg-green-50 text-green-600 border-b-2 border-green-500' :
                Object.keys(stepLabels).indexOf(step) > i ? 'text-green-600 bg-green-50/50' : 'text-gray-400')}
              onClick={() => {
                const steps = Object.keys(stepLabels)
                if (steps.indexOf(key) <= steps.indexOf(step)) setStep(key as any)
              }}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          
          {/* ÉTAPE 1: VÉHICULE */}
          {step === 'vehicle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {fleetVehicle?.vehicle?.imageUrl ? (
                  <img src={fleetVehicle.vehicle.imageUrl} className="w-24 h-24 rounded-lg object-cover" />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">🚲</div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-xl">{fleetVehicle?.vehicleNumber}</p>
                  <p className="text-gray-600">{getName(fleetVehicle?.vehicle?.name)}</p>
                  {fleetVehicle?.licensePlate && (
                    <p className="text-sm text-gray-500 mt-1">🔢 Plaque: <span className="font-mono font-bold">{fleetVehicle.licensePlate}</span></p>
                  )}
                  <p className="text-sm text-gray-500">État: <span className={fleetVehicle?.condition === 'GOOD' ? 'text-green-600' : 'text-orange-600'}>{fleetVehicle?.condition}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kilométrage au départ</label>
                <input
                  type="number"
                  value={form.startMileage}
                  onChange={e => setForm({ ...form, startMileage: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Dernier relevé: {fleetVehicle?.currentMileage} km</p>
              </div>
            </div>
          )}

          {/* ÉTAPE 2: INSPECTION & PHOTOS */}
          {step === 'inspection' && (
            <div className="space-y-4">
              {/* Niveau carburant */}
              <div>
                <label className="block text-sm font-medium mb-2">Niveau de carburant</label>
                <div className="grid grid-cols-5 gap-2">
                  {['FULL', 'THREE_QUARTERS', 'HALF', 'QUARTER', 'EMPTY'].map(level => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, startFuelLevel: level })}
                      className={'p-2 rounded-lg border text-center text-xs ' +
                        (form.startFuelLevel === level ? 'bg-green-500 text-white border-green-500' : 'hover:bg-gray-50')}
                    >
                      {level === 'FULL' ? '⛽ Plein' :
                       level === 'THREE_QUARTERS' ? '¾' :
                       level === 'HALF' ? '½' :
                       level === 'QUARTER' ? '¼' : 'Vide'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos obligatoires */}
              <div>
                <label className="block text-sm font-medium mb-2">Photos du véhicule (4 obligatoires)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'photoFront', label: 'Avant', required: true },
                    { key: 'photoLeft', label: 'Gauche', required: true },
                    { key: 'photoRight', label: 'Droite', required: true },
                    { key: 'photoRear', label: 'Arrière', required: true },
                    { key: 'photoCounter', label: 'Compteur', required: false }
                  ].map(({ key, label, required }) => (
                    <div key={key} className="relative">
                      <label className={'block border-2 border-dashed rounded-lg h-24 cursor-pointer transition-colors ' +
                        (form[key as keyof typeof form] ? 'border-green-500 bg-green-50' : required ? 'border-orange-300 hover:border-orange-400' : 'border-gray-300 hover:border-gray-400')}>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => handlePhotoUpload(e, key)}
                        />
                        {form[key as keyof typeof form] ? (
                          <img src={form[key as keyof typeof form] as string} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <span className="text-2xl">📷</span>
                            <span className="text-xs">{label}</span>
                            {required && <span className="text-xs text-orange-500">*</span>}
                          </div>
                        )}
                      </label>
                      {form[key as keyof typeof form] && (
                        <button
                          onClick={() => setForm({ ...form, [key]: '' })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
                {uploading && <p className="text-sm text-blue-600 mt-2">⏳ Upload en cours...</p>}
              </div>

              {/* Schéma des dégâts */}
              <div>
                <label className="block text-sm font-medium mb-2">Dégâts existants (cliquez pour marquer)</label>
                <div className="flex gap-2 mb-2">
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm" onClick={() => {}}>
                    ❌ Cassé (clic)
                  </button>
                  <button className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm" onClick={() => {}}>
                    🟠 Rayure (Shift+clic)
                  </button>
                </div>
                <div
                  className="relative bg-gray-100 rounded-lg h-48 cursor-crosshair border-2"
                  onClick={(e) => handleDamageClick(e, e.shiftKey ? 'scratch' : 'broken')}
                  style={{ backgroundImage: `url(${fleetVehicle?.vehicle?.imageUrl || ''})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
                >
                  {form.damageSchema.map((damage, i) => (
                    <div
                      key={i}
                      className={'absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ' +
                        (damage.type === 'broken' ? 'text-red-500 text-xl' : 'text-orange-500 text-lg')}
                      style={{ left: `${damage.x}%`, top: `${damage.y}%` }}
                      onClick={(e) => { e.stopPropagation(); removeDamage(i) }}
                      title="Cliquez pour supprimer"
                    >
                      {damage.type === 'broken' ? '❌' : '🟠'}
                    </div>
                  ))}
                </div>
                {form.damageSchema.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{form.damageSchema.length} dégât(s) marqué(s) - cliquez dessus pour supprimer</p>
                )}
              </div>
            </div>
          )}

          {/* ÉTAPE 3: ÉQUIPEMENTS */}
          {step === 'equipment' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Cochez les équipements fournis au client :</p>
              <div className="space-y-2">
                {form.equipment.map((item, i) => (
                  <label key={item.id} className={'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ' +
                    (item.checked ? 'bg-green-50 border-green-500' : 'hover:bg-gray-50')}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={e => {
                        const newEquipment = [...form.equipment]
                        newEquipment[i].checked = e.target.checked
                        setForm({ ...form, equipment: newEquipment })
                      }}
                      className="w-5 h-5"
                    />
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.checked && (
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const newEquipment = [...form.equipment]
                          newEquipment[i].quantity = parseInt(e.target.value) || 1
                          setForm({ ...form, equipment: newEquipment })
                        }}
                        className="w-16 border rounded px-2 py-1 text-center"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 4: DOCUMENTS */}
          {step === 'documents' && (
            <div className="space-y-4">
              {/* Carte d'identité - toujours obligatoire */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Carte d'identité <span className="text-red-500">*</span>
                </label>
                <label className={'block border-2 border-dashed rounded-lg h-32 cursor-pointer transition-colors ' +
                  (form.customerIdCardUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400')}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handlePhotoUpload(e, 'customerIdCardUrl')}
                  />
                  {form.customerIdCardUrl ? (
                    <img src={form.customerIdCardUrl} className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <span className="text-3xl">🪪</span>
                      <span className="text-sm">Photographier la CNI</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Permis - seulement si véhicule immatriculé */}
              {fleetVehicle?.vehicle?.hasPlate && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permis de conduire <span className="text-red-500">*</span>
                  </label>
                  <label className={'block border-2 border-dashed rounded-lg h-32 cursor-pointer transition-colors ' +
                    (form.customerLicenseUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400')}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => handlePhotoUpload(e, 'customerLicenseUrl')}
                    />
                    {form.customerLicenseUrl ? (
                      <img src={form.customerLicenseUrl} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-3xl">🪪</span>
                        <span className="text-sm">Photographier le permis</span>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {!fleetVehicle?.vehicle?.hasPlate && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-700 text-sm">ℹ️ Permis de conduire non requis pour ce type de véhicule (vélo/e-bike)</p>
                </div>
              )}

              {uploading && <p className="text-sm text-blue-600">⏳ Upload en cours...</p>}
            </div>
          )}

          {/* ÉTAPE 5: SIGNATURE */}
          {step === 'signature' && (
            <div className="space-y-4">
              {/* Sélection langue */}
              <div className="flex gap-2">
                {['FR', 'ES', 'EN'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setForm({ ...form, termsLanguage: lang })}
                    className={'px-4 py-2 rounded-lg border ' +
                      (form.termsLanguage === lang ? 'bg-blue-500 text-white' : 'hover:bg-gray-50')}
                  >
                    {lang === 'FR' ? '🇫🇷 Français' : lang === 'ES' ? '🇪🇸 Español' : '🇬🇧 English'}
                  </button>
                ))}
              </div>

              {/* Conditions générales */}
              <div className="border rounded-lg p-3 h-40 overflow-auto bg-gray-50 text-sm">
                <pre className="whitespace-pre-wrap font-sans">{TERMS[form.termsLanguage as keyof typeof TERMS]}</pre>
              </div>

              {/* Checkbox acceptation */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={e => setForm({ ...form, termsAccepted: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm">
                  {form.termsLanguage === 'FR' && "J'accepte les conditions générales de location"}
                  {form.termsLanguage === 'ES' && "Acepto las condiciones generales de alquiler"}
                  {form.termsLanguage === 'EN' && "I accept the general rental conditions"}
                </span>
              </label>

              {/* Zone signature */}
              <div>
                <label className="block text-sm font-medium mb-2">Signature du client</label>
                <div className="border-2 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <button onClick={clearSignature} className="mt-2 text-sm text-red-600 hover:underline">
                  🗑️ Effacer la signature
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 6: PAIEMENT */}
          {step === 'payment' && (
            <div className="space-y-4">
              {/* Récapitulatif */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Location</span>
                  <span>{locationAmount.toFixed(2)}€</span>
                </div>
                {paidOnline > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Déjà payé en ligne</span>
                    <span>-{paidOnline.toFixed(2)}€</span>
                  </div>
                )}
                
                {/* Remise */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm">Remise</span>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                    className="w-20 border rounded px-2 py-1 text-sm text-right"
                    min="0"
                  />
                  <span>€</span>
                  <input
                    type="text"
                    placeholder="Motif"
                    value={form.discountReason}
                    onChange={e => setForm({ ...form, discountReason: e.target.value })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <span>Sous-total HT</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA (21%)</span>
                  <span>{taxAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Reste à payer</span>
                  <span className="text-blue-600">{totalToPay.toFixed(2)}€</span>
                </div>
              </div>

              {/* Location payée */}
              <label className={'flex items-center gap-3 p-4 border rounded-lg cursor-pointer ' +
                (form.locationPaid ? 'bg-green-50 border-green-500' : 'hover:bg-gray-50')}>
                <input
                  type="checkbox"
                  checked={form.locationPaid}
                  onChange={e => setForm({ ...form, locationPaid: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="font-medium">✅ Location payée</span>
              </label>

              {/* Caution */}
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between mb-3">
                  <span className="font-medium">Caution</span>
                  <span className="font-bold text-lg">{depositAmount.toFixed(2)}€</span>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setForm({ ...form, depositMethod: 'CARD' })}
                    className={'flex-1 py-2 rounded-lg border ' +
                      (form.depositMethod === 'CARD' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50')}
                  >
                    💳 CB
                  </button>
                  <button
                    onClick={() => setForm({ ...form, depositMethod: 'CASH' })}
                    className={'flex-1 py-2 rounded-lg border ' +
                      (form.depositMethod === 'CASH' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50')}
                  >
                    💵 Espèces
                  </button>
                </div>

                <label className={'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' +
                  (form.depositPaid ? 'bg-green-50 border-green-500' : 'hover:bg-gray-50')}>
                  <input
                    type="checkbox"
                    checked={form.depositPaid}
                    onChange={e => setForm({ ...form, depositPaid: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="font-medium">✅ Caution encaissée</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t flex flex-wrap gap-3 bg-gray-50">
          {step !== 'vehicle' && (
            <button onClick={prevStep} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
              ← Retour
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            Annuler
          </button>
          {step !== 'payment' ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50 hover:bg-green-600"
            >
              Continuer →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading || !canProceed()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 hover:bg-green-700"
            >
              {loading ? '⏳ Traitement...' : '✅ Valider le check-in'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckInModal
