import { useState, useRef, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

const FUEL_LEVELS = [
  { id: 'FULL', label: 'Plein', labelEs: 'Lleno', labelEn: 'Full', icon: '⛽' },
  { id: 'THREE_QUARTERS', label: '¾', labelEs: '¾', labelEn: '¾', icon: '🔋' },
  { id: 'HALF', label: '½', labelEs: '½', labelEn: '½', icon: '🔋' },
  { id: 'QUARTER', label: '¼', labelEs: '¼', labelEn: '¼', icon: '🪫' },
  { id: 'EMPTY', label: 'Vide', labelEs: 'Vacío', labelEn: 'Empty', icon: '⚠️' }
]

const DEFAULT_EQUIPMENT = [
  { id: 'helmet1', name: 'Casque conducteur', nameEs: 'Casco conductor', nameEn: 'Driver helmet' },
  { id: 'helmet2', name: 'Casque passager', nameEs: 'Casco pasajero', nameEn: 'Passenger helmet' },
  { id: 'lock', name: 'Antivol', nameEs: 'Candado', nameEn: 'Lock' },
  { id: 'charger', name: 'Chargeur', nameEs: 'Cargador', nameEn: 'Charger' },
  { id: 'topcase', name: 'Top case', nameEs: 'Top case', nameEn: 'Top case' }
]

interface CheckInModalProps {
  booking: any
  fleetVehicle: any
  settings: any
  onClose: () => void
  onComplete: () => void
}

export function CheckInModal({ booking, fleetVehicle, settings, onClose, onComplete }: CheckInModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Step 1 - Vehicle
  const [startMileage, setStartMileage] = useState(fleetVehicle?.currentMileage || 0)
  
  // Step 2 - Inspection
  const [fuelLevel, setFuelLevel] = useState('FULL')
  const [photos, setPhotos] = useState({ front: '', left: '', right: '', rear: '', counter: '' })
  const [damages, setDamages] = useState([])
  
  // Step 3 - Equipment (options de la réservation)
  const [equipment, setEquipment] = useState(() => {
    // Récupérer les options de la réservation et les pré-cocher
    const bookingOptions = booking?.options || []
    if (bookingOptions.length > 0) {
      return bookingOptions.map(opt => ({
        id: opt.option?.id || opt.optionId,
        name: opt.option?.name?.fr || opt.option?.name || 'Option',
        nameEs: opt.option?.name?.es || opt.option?.name || 'Opción',
        nameEn: opt.option?.name?.en || opt.option?.name || 'Option',
        checked: true, // Pré-coché car sélectionné lors de la réservation
        qty: opt.quantity || 1,
        unitPrice: opt.unitPrice || 0,
        totalPrice: opt.totalPrice || 0,
        fromBooking: true // Pour identifier les options de la réservation
      }))
    }
    // Fallback sur les équipements par défaut si pas d'options
    return DEFAULT_EQUIPMENT.map(e => ({ ...e, checked: false, qty: 1, unitPrice: 0, totalPrice: 0, fromBooking: false }))
  })
  
  // Calculer la réduction si des options sont décochées
  const [optionsDiscount, setOptionsDiscount] = useState(0)
  
  // Mettre à jour la réduction quand les options changent
  const updateOptionsDiscount = (newEquipment) => {
    const uncheckedTotal = newEquipment
      .filter(e => e.fromBooking && !e.checked)
      .reduce((sum, e) => sum + (e.totalPrice || 0), 0)
    setOptionsDiscount(uncheckedTotal)
  }
  
  // Step 4 - Documents
  const [idCardUrl, setIdCardUrl] = useState('')
  const [idCardVersoUrl, setIdCardVersoUrl] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [licenseVersoUrl, setLicenseVersoUrl] = useState('')
  
  // Step 5 - Signature
  const [termsLang, setTermsLang] = useState(booking?.language || 'fr')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const [tabletSessionId, setTabletSessionId] = useState(null)
  const [tabletStatus, setTabletStatus] = useState(null) // null | 'waiting' | 'signed'
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Step 6 - Payment
  const [locationPaid, setLocationPaid] = useState(booking?.paidAmount > 0)
  const [depositPaid, setDepositPaid] = useState(false)
  const [depositMethod, setDepositMethod] = useState('CARD')
  const [discount, setDiscount] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CARD')

  const totalSteps = 6
  const lang = termsLang
  
  // Calculations
  const locationAmount = booking?.totalPrice || 0
  const paidOnline = booking?.paidAmount || 0
  const depositAmount = fleetVehicle?.vehicle?.deposit || 500  // Caution/garantie du véhicule
  const subtotal = Math.max(0, locationAmount - paidOnline - discount - optionsDiscount)
  const totalToPay = subtotal // Prices already include TVA

  // Upload photo
  const uploadPhoto = async (file) => {
    setUploading(true)
    try {
      const url = await api.uploadImage(file, 'checkin/' + booking.reference)
      return url
    } catch (e) {
      console.error(e)
      alert('Erreur upload')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoUpload = async (e, key) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadPhoto(file)
    if (url) setPhotos({ ...photos, [key]: url })
  }

  // Damage schema click
  const handleDamageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const type = e.shiftKey ? 'scratch' : 'broken'
    setDamages([...damages, { x, y, type, id: Date.now() }])
  }

  const removeDamage = (id) => {
    setDamages(damages.filter(d => d.id !== id))
  }

  // Signature canvas
  useEffect(() => {
    if (step === 5 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
    }
  }, [step])

  const startDrawing = (e) => {
    if (tabletStatus === 'waiting') return
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing || tabletStatus === 'waiting') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignature(canvasRef.current.toDataURL())
    }
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  // Send to tablet
  const sendToTablet = async () => {
    const sessionId = 'checkin_' + booking.id + '_' + Date.now()
    setTabletSessionId(sessionId)
    setTabletStatus('waiting')
    
    // Get agencyId from booking or fleetVehicle
    const agencyId = booking.agency?.id || fleetVehicle?.agency?.id || fleetVehicle?.agencyId || booking.agencyId
    
    if (!agencyId) {
      alert('Erreur: Aucune agence associée à cette réservation')
      setTabletStatus(null)
      return
    }
    
    // Save session to API (will be polled by tablet)
    try {
      const response = await fetch('https://api-voltrideandmotorrent-production.up.railway.app/api/tablet-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          bookingId: booking.id,
          agencyId,
          type: 'checkin',
          language: termsLang,
          customerName: (booking.customer?.firstName || '') + ' ' + (booking.customer?.lastName || ''),
          cgvText: settings?.cgv?.[termsLang] || 'CGV non configurées',
          rgpdText: settings?.rgpd?.[termsLang] || 'RGPD non configuré',
          status: 'pending'
        })
      })
      if (!response.ok) {
        throw new Error('Erreur API: ' + response.status)
      }
      // Start polling for signature
      pollTabletSignature(sessionId)
    } catch (e: any) {
      console.error(e)
      alert('Erreur: ' + e.message)
      setTabletStatus(null)
    }
    
    // Generate tablet URL
    const tabletUrl = window.location.origin.replace('operator', 'tablet') + '?session=' + sessionId
    
    // Copy to clipboard
    navigator.clipboard.writeText(tabletUrl)
    alert('Lien copié ! Ouvrez ce lien sur la tablette comptoir:\n\n' + tabletUrl)
    
    // Start polling for signature
    pollTabletSignature(sessionId)
  }

  const pollTabletSignature = (sessionId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('https://api-voltrideandmotorrent-production.up.railway.app/api/tablet-sessions/' + sessionId)
        const data = await res.json()
        if (data.status === 'signed' && data.signature) {
          setSignature(data.signature)
          setTermsAccepted(true)
          setRgpdAccepted(true)
          setTabletStatus('signed')
          clearInterval(interval)
        }
      } catch (e) {}
    }, 2000)
    
    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(interval), 600000)
  }

  const cancelTabletSession = () => {
    setTabletSessionId(null)
    setTabletStatus(null)
  }

  // Validation
  const canProceed = () => {
    switch (step) {
      case 1: return startMileage >= 0
      case 2: return photos.front && photos.left && photos.right && photos.rear
      case 3: return true
      case 4: 
        // Documents non-obligatoires au check-in
        return true
      case 5: return termsAccepted && rgpdAccepted && signature
      case 6: return locationPaid && depositPaid
      default: return true
    }
  }

  // Submit
  const handleComplete = async () => {
    setLoading(true)
    try {
      // Create/update contract
      await api.createContract({
        bookingId: booking.id,
        fleetVehicleId: fleetVehicle.id,
        customerId: booking.customer?.id,
        agencyId: booking.agency?.id || fleetVehicle.agency?.id,
        startMileage,
        startFuelLevel: fuelLevel,
        photoFront: photos.front,
        photoLeft: photos.left,
        photoRight: photos.right,
        photoRear: photos.rear,
        photoCounter: photos.counter,
        damageSchema: damages,
        equipmentChecklist: equipment.filter(e => e.checked),
        customerIdCardUrl: idCardUrl,
        customerIdCardVersoUrl: idCardVersoUrl,
        customerLicenseUrl: licenseUrl,
        customerLicenseVersoUrl: licenseVersoUrl,
        paymentMethod,
        customerSignature: signature,
        termsAcceptedAt: new Date().toISOString(),
        termsLanguage: termsLang,
        discountAmount: discount,
        discountReason,
        depositMethod,
        depositStatus: depositPaid ? 'CAPTURED' : 'PENDING',
        paymentStatus: locationPaid ? 'PAID' : 'PENDING',
        status: 'ACTIVE'
      })

      // Update booking
      await api.updateBooking(booking.id, {
        checkedIn: true,
        checkedInAt: new Date().toISOString()
      })

      // Update fleet vehicle
      await api.updateFleetVehicle(fleetVehicle.id, {
        status: 'RENTED',
        currentMileage: startMileage
      })

      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors du check-in')
    }
    setLoading(false)
  }

  const stepLabels = {
    1: { fr: 'Véhicule', es: 'Vehículo', en: 'Vehicle' },
    2: { fr: 'Inspection', es: 'Inspección', en: 'Inspection' },
    3: { fr: 'Équipements', es: 'Equipamiento', en: 'Equipment' },
    4: { fr: 'Documents', es: 'Documentos', en: 'Documents' },
    5: { fr: 'Signature', es: 'Firma', en: 'Signature' },
    6: { fr: 'Paiement', es: 'Pago', en: 'Payment' }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">✅ Check-in</h2>
              <p className="text-green-100">{booking?.reference} - {booking?.customer?.firstName} {booking?.customer?.lastName}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex border-b bg-gray-50">
          {[1,2,3,4,5,6].map(s => (
            <button key={s} onClick={() => s <= step && setStep(s)}
              className={'flex-1 py-3 text-center text-sm font-medium transition-colors ' +
                (step === s ? 'bg-white text-green-600 border-b-2 border-green-600' :
                 s < step ? 'text-green-600 bg-green-50' : 'text-gray-400')}>
              {s}. {stepLabels[s][lang]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* STEP 1: Vehicle */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                {fleetVehicle?.vehicle?.imageUrl ? (
                  <img src={fleetVehicle.vehicle.imageUrl} className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">🚲</div>
                )}
                <div>
                  <p className="text-2xl font-bold">{fleetVehicle?.vehicleNumber}</p>
                  <p className="text-gray-600">{getName(fleetVehicle?.vehicle?.name, lang)}</p>
                  {fleetVehicle?.licensePlate && (
                    <p className="text-sm text-gray-500 mt-1">🔢 {fleetVehicle.licensePlate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kilométrage au départ</label>
                <input type="number" value={startMileage} onChange={e => setStartMileage(parseInt(e.target.value) || 0)}
                  className="w-full border-2 rounded-xl px-4 py-3 text-xl" />
                <p className="text-sm text-gray-500 mt-1">Dernier relevé: {fleetVehicle?.currentMileage || 0} km</p>
              </div>
            </div>
          )}

          {/* STEP 2: Inspection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Niveau de carburant</label>
                <div className="grid grid-cols-5 gap-2">
                  {FUEL_LEVELS.map(f => (
                    <button key={f.id} onClick={() => setFuelLevel(f.id)}
                      className={'p-3 rounded-xl border-2 text-center transition-all ' +
                        (fuelLevel === f.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                      <div className="text-xl">{f.icon}</div>
                      <div className="text-xs mt-1">{f['label' + (lang === 'fr' ? '' : lang.charAt(0).toUpperCase() + lang.slice(1))] || f.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Photos du véhicule <span className="text-red-500">(4 obligatoires)</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'front', label: 'Avant', required: true },
                    { key: 'left', label: 'Gauche', required: true },
                    { key: 'right', label: 'Droite', required: true },
                    { key: 'rear', label: 'Arrière', required: true },
                    { key: 'counter', label: 'Compteur', required: false }
                  ].map(p => (
                    <label key={p.key} className={'relative block border-2 border-dashed rounded-xl h-24 cursor-pointer transition-all overflow-hidden ' +
                      (photos[p.key] ? 'border-green-500' : p.required ? 'border-orange-300 hover:border-orange-400' : 'border-gray-300 hover:border-gray-400')}>
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => handlePhotoUpload(e, p.key)} />
                      {photos[p.key] ? (
                        <img src={photos[p.key]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">📷</span>
                          <span className="text-xs">{p.label}</span>
                          {p.required && <span className="text-xs text-orange-500">*</span>}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                {uploading && <p className="text-blue-600 text-sm mt-2">⏳ Upload en cours...</p>}
              </div>

            </div>
          )}

          {/* STEP 3: Equipment/Options */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-gray-600 mb-4">
                {equipment.some(e => e.fromBooking) 
                  ? (lang === 'fr' ? 'Options sélectionnées lors de la réservation :' : 'Opciones seleccionadas durante la reserva:')
                  : (lang === 'fr' ? 'Cochez les équipements fournis au client :' : 'Marque los equipos entregados al cliente:')}
              </p>
              {equipment.map((item, i) => (
                <label key={item.id} className={'flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ' +
                  (item.checked ? 'border-green-500 bg-green-50' : 'border-orange-300 bg-orange-50')}>
                  <input type="checkbox" checked={item.checked} className="w-5 h-5 accent-green-600"
                    onChange={e => {
                      const newEquip = [...equipment]
                      newEquip[i].checked = e.target.checked
                      setEquipment(newEquip)
                      updateOptionsDiscount(newEquip)
                    }} />
                  <div className="flex-1">
                    <span className="font-medium">{typeof item.name === 'object' ? (item.name[lang] || item.name.fr || item.name.es) : item['name' + (lang === 'fr' ? '' : lang.charAt(0).toUpperCase() + lang.slice(1))] || item.name}</span>
                    {item.fromBooking && !item.checked && (
                      <span className="ml-2 text-xs text-orange-600">({lang === 'fr' ? 'sera déduit' : 'se deducirá'})</span>
                    )}
                  </div>
                  <div className="text-right">
                    {item.fromBooking && item.totalPrice > 0 && (
                      <span className={item.checked ? 'text-green-600 font-medium' : 'text-orange-600 line-through'}>
                        {item.totalPrice.toFixed(2)}€
                      </span>
                    )}
                    {item.checked && !item.fromBooking && (
                      <input type="number" min="1" value={item.qty} className="w-16 border rounded px-2 py-1 text-center"
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const newEquip = [...equipment]
                          newEquip[i].qty = parseInt(e.target.value) || 1
                          setEquipment(newEquip)
                        }} />
                    )}
                    {item.fromBooking && (
                      <span className="text-gray-500 text-sm ml-2">x{item.qty}</span>
                    )}
                  </div>
                </label>
              ))}
              
              {/* Afficher la réduction si des options sont décochées */}
              {optionsDiscount > 0 && (
                <div className="mt-4 p-3 bg-orange-100 rounded-xl text-orange-700">
                  <div className="flex justify-between font-medium">
                    <span>{lang === 'fr' ? 'Options annulées - À déduire :' : 'Opciones canceladas - A deducir:'}</span>
                    <span>-{optionsDiscount.toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-700 text-sm">
                ℹ️ Documents <strong>facultatifs maintenant</strong>, mais <strong>obligatoires au retour</strong> pour rembourser la caution.
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Carte d'identité <span className="text-gray-400 text-xs">(optionnel)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                    (idCardUrl ? 'border-green-500' : 'border-gray-300 hover:border-gray-400')}>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await uploadPhoto(file)
                          if (url) setIdCardUrl(url)
                        }
                      }} />
                    {idCardUrl ? (
                      <img src={idCardUrl} className="w-full h-full object-contain" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-2xl">🪪</span>
                        <span className="text-sm">Recto</span>
                      </div>
                    )}
                  </label>
                  <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                    (idCardVersoUrl ? 'border-green-500' : 'border-gray-300 hover:border-gray-400')}>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await uploadPhoto(file)
                          if (url) setIdCardVersoUrl(url)
                        }
                      }} />
                    {idCardVersoUrl ? (
                      <img src={idCardVersoUrl} className="w-full h-full object-contain" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-2xl">🪪</span>
                        <span className="text-sm">Verso</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {fleetVehicle?.vehicle?.hasPlate && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permis de conduire <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                      (licenseUrl ? 'border-green-500' : 'border-orange-300 hover:border-orange-400')}>
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = await uploadPhoto(file)
                            if (url) setLicenseUrl(url)
                          }
                        }} />
                      {licenseUrl ? (
                        <img src={licenseUrl} className="w-full h-full object-contain" />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">🪪</span>
                          <span className="text-sm">Recto</span>
                        </div>
                      )}
                    </label>
                    <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                      (licenseVersoUrl ? 'border-green-500' : 'border-orange-300 hover:border-orange-400')}>
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = await uploadPhoto(file)
                            if (url) setLicenseVersoUrl(url)
                          }
                        }} />
                      {licenseVersoUrl ? (
                        <img src={licenseVersoUrl} className="w-full h-full object-contain" />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">🪪</span>
                          <span className="text-sm">Verso</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {!fleetVehicle?.vehicle?.hasPlate && (
                <div className="p-4 bg-blue-50 rounded-xl text-blue-700">
                  ℹ️ Permis non requis pour ce type de véhicule
                </div>
              )}
            </div>
          )}

          {/* STEP 5: CGV/RGPD/Signature */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Language selector */}
              <div className="flex gap-2">
                {['fr', 'es', 'en'].map(l => (
                  <button key={l} onClick={() => setTermsLang(l)}
                    className={'px-4 py-2 rounded-lg border-2 transition-all ' +
                      (termsLang === l ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                    {l === 'fr' ? '🇫🇷 FR' : l === 'es' ? '🇪🇸 ES' : '🇬🇧 EN'}
                  </button>
                ))}
              </div>

              {/* Tablet button */}
              {tabletStatus !== 'signed' && (
                <button onClick={sendToTablet} disabled={tabletStatus === 'waiting'}
                  className={'w-full py-3 rounded-xl font-medium transition-all ' +
                    (tabletStatus === 'waiting' 
                      ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-700')}>
                  {tabletStatus === 'waiting' ? '⏳ En attente de signature sur tablette...' : '📱 Envoyer sur tablette comptoir'}
                </button>
              )}

              {tabletStatus === 'waiting' && (
                <button onClick={cancelTabletSession} className="w-full py-2 text-gray-600 hover:text-gray-800">
                  Annuler et signer ici
                </button>
              )}

              {tabletStatus === 'signed' && (
                <div className="p-4 bg-green-100 rounded-xl text-green-700 text-center">
                  ✅ Signature reçue de la tablette comptoir
                </div>
              )}

              {/* CGV */}
              <div>
                <label className="block text-sm font-medium mb-2">Conditions Générales de Vente</label>
                <div className="border rounded-xl p-3 h-32 overflow-auto bg-gray-50 text-sm">
                  {settings?.cgv?.[termsLang] || 'CGV non configurées. Allez dans Paramètres pour les ajouter.'}
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                    disabled={tabletStatus === 'waiting'} className="w-5 h-5 accent-green-600" />
                  <span>{termsLang === 'fr' ? "J'accepte les CGV" : termsLang === 'es' ? 'Acepto las CGV' : 'I accept the T&C'}</span>
                </label>
              </div>

              {/* RGPD */}
              <div>
                <label className="block text-sm font-medium mb-2">RGPD / Protection des données</label>
                <div className="border rounded-xl p-3 h-24 overflow-auto bg-gray-50 text-sm">
                  {settings?.rgpd?.[termsLang] || 'RGPD non configuré. Allez dans Paramètres pour les ajouter.'}
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={rgpdAccepted} onChange={e => setRgpdAccepted(e.target.checked)}
                    disabled={tabletStatus === 'waiting'} className="w-5 h-5 accent-green-600" />
                  <span>{termsLang === 'fr' ? "J'accepte la politique RGPD" : termsLang === 'es' ? 'Acepto la política RGPD' : 'I accept the GDPR policy'}</span>
                </label>
              </div>

              {/* Signature */}
              {tabletStatus !== 'waiting' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Signature du client</label>
                  <div className="border-2 rounded-xl overflow-hidden bg-white">
                    <canvas ref={canvasRef} width={500} height={150}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                  </div>
                  <button onClick={clearSignature} className="mt-2 text-sm text-red-600 hover:text-red-700">
                    🗑️ Effacer la signature
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Payment */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span>Location</span>
                  <span>{locationAmount.toFixed(2)}€</span>
                </div>
                {paidOnline > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Payé en ligne</span>
                    <span>-{paidOnline.toFixed(2)}€</span>
                  </div>
                )}
                {optionsDiscount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Options annulées</span>
                    <span>-{optionsDiscount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm">Remise</span>
                  <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 border rounded px-2 py-1 text-right" min="0" />
                  <span>€</span>
                  <input type="text" value={discountReason} onChange={e => setDiscountReason(e.target.value)}
                    placeholder="Motif" className="flex-1 border rounded px-2 py-1 text-sm" />
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Reste à payer (TTC)</span>
                  <span className="text-green-600">{totalToPay.toFixed(2)}€</span>
                </div>
              </div>

              <div className="p-4 border-2 rounded-xl mb-4">
                <div className="font-medium mb-3">Mode de paiement location</div>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setPaymentMethod('CARD')}
                    className={'flex-1 py-2 rounded-lg border-2 transition-all ' +
                      (paymentMethod === 'CARD' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                    💳 CB
                  </button>
                  <button onClick={() => setPaymentMethod('CASH')}
                    className={'flex-1 py-2 rounded-lg border-2 transition-all ' +
                      (paymentMethod === 'CASH' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                    💵 Espèces
                  </button>
                </div>
                <label className={'flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ' +
                  (locationPaid ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                  <input type="checkbox" checked={locationPaid} onChange={e => setLocationPaid(e.target.checked)}
                    className="w-5 h-5 accent-green-600" />
                  <span className="font-medium">✅ Location payée</span>
                </label>
              </div>

              <div className="p-4 border-2 rounded-xl">
                <div className="flex justify-between mb-3">
                  <span className="font-medium">Caution / Garantie véhicule</span>
                  <span className="text-xl font-bold">{depositAmount.toFixed(2)}€</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setDepositMethod('CARD')}
                    className={'flex-1 py-2 rounded-lg border-2 transition-all ' +
                      (depositMethod === 'CARD' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                    💳 CB
                  </button>
                  <button onClick={() => setDepositMethod('CASH')}
                    className={'flex-1 py-2 rounded-lg border-2 transition-all ' +
                      (depositMethod === 'CASH' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                    💵 Espèces
                  </button>
                </div>
                <label className={'flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ' +
                  (depositPaid ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                  <input type="checkbox" checked={depositPaid} onChange={e => setDepositPaid(e.target.checked)}
                    className="w-5 h-5 accent-green-600" />
                  <span className="font-medium">✅ Caution encaissée</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">
              ← Retour
            </button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="px-8 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Continuer →
            </button>
          ) : (
            <button onClick={handleComplete} disabled={loading || !canProceed()}
              className="px-8 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
              {loading ? '⏳ Traitement...' : '✅ Valider le check-in'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckInModal
