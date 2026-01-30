import { useState, useRef, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

const FUEL_LEVELS = [
  { id: 'FULL', label: 'Plein', labelEs: 'Lleno', icon: '⛽' },
  { id: 'THREE_QUARTERS', label: '¾', labelEs: '¾', icon: '🔋' },
  { id: 'HALF', label: '½', labelEs: '½', icon: '🔋' },
  { id: 'QUARTER', label: '¼', labelEs: '¼', icon: '🪫' },
  { id: 'EMPTY', label: 'Vide', labelEs: 'Vacío', icon: '⚠️' }
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
  
  // Déterminer la marque (VOLTRIDE ou MOTOR-RENT)
  const brand = booking?.agency?.brand || 'VOLTRIDE'
  const isMotorRent = brand === 'MOTOR-RENT'
  const requiresLicense = fleetVehicle?.vehicle?.hasPlate || isMotorRent
  
  // Step 1 - Vehicle info (pas de km ici, déplacé à l'inspection)
  
  // Step 2 - Documents
  const [idCardUrl, setIdCardUrl] = useState('')
  const [idCardVersoUrl, setIdCardVersoUrl] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [licenseVersoUrl, setLicenseVersoUrl] = useState('')
  
  // Step 3 - Equipment
  const [equipment, setEquipment] = useState(() => {
    const bookingOptions = booking?.options || []
    if (bookingOptions.length > 0) {
      return bookingOptions.map(opt => ({
        id: opt.option?.id || opt.optionId,
        name: opt.option?.name?.fr || opt.option?.name || 'Option',
        nameEs: opt.option?.name?.es || opt.option?.name || 'Opción',
        checked: true,
        qty: opt.quantity || 1,
        unitPrice: opt.unitPrice || 0,
        totalPrice: opt.totalPrice || 0,
        fromBooking: true
      }))
    }
    return []
  })
  const [optionsDiscount, setOptionsDiscount] = useState(0)
  
  // Step 4 - Signature
  const [termsLang, setTermsLang] = useState(booking?.language || 'fr')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const [hasSigned, setHasSigned] = useState(false)
  const [showTextModal, setShowTextModal] = useState<{type: 'cgv' | 'rgpd', text: string} | null>(null)

  // Traductions selon la langue sélectionnée
  const t = {
    // Navigation
    next: termsLang === 'fr' ? 'Suivant' : termsLang === 'es' ? 'Siguiente' : 'Next',
    back: termsLang === 'fr' ? 'Retour' : termsLang === 'es' ? 'Volver' : 'Back',
    finish: termsLang === 'fr' ? 'Terminer le check-in' : termsLang === 'es' ? t.finish : 'Finish check-in',
    loading: termsLang === 'fr' ? 'En cours...' : termsLang === 'es' ? t.loading : 'Loading...',
    
    // Étapes
    steps: termsLang === 'fr' 
      ? t.steps
      : termsLang === 'es'
      ? ['Vehículo', 'Documentos', 'Equipamiento', 'Firma', 'Pago', 'Inspección']
      : ['Vehicle', 'Documents', 'Equipment', 'Signature', 'Payment', 'Inspection'],
    
    // Étape 1
    assignedVehicle: termsLang === 'fr' ? 'Véhicule assigné' : termsLang === 'es' ? 'Vehículo asignado' : 'Assigned vehicle',
    rentalPeriod: termsLang === 'fr' ? 'Période de location' : termsLang === 'es' ? 'Período de alquiler' : 'Rental period',
    start: termsLang === 'fr' ? 'Début' : termsLang === 'es' ? 'Inicio' : 'Start',
    end: termsLang === 'fr' ? 'Fin' : termsLang === 'es' ? 'Fin' : 'End',
    
    // Étape 2
    clientDocuments: termsLang === 'fr' ? 'Documents du client' : termsLang === 'es' ? 'Documentos del cliente' : 'Client documents',
    idCard: termsLang === 'fr' ? 'Pièce d\'identité' : termsLang === 'es' ? 'Documento de identidad' : 'ID Card',
    driverLicense: termsLang === 'fr' ? '{t.driverLicense}' : termsLang === 'es' ? 'Permiso de conducir' : 'Driver\'s license',
    verified: termsLang === 'fr' ? 'Vérifié' : termsLang === 'es' ? 'Verificado' : 'Verified',
    toVerify: termsLang === 'fr' ? 'À vérifier' : termsLang === 'es' ? 'Pendiente' : 'To verify',
    vehicleWithLicense: termsLang === 'fr' ? '{t.vehicleWithLicenseTitle} - {t.licenseIdRequired}' : termsLang === 'es' ? 'Vehículo que requiere permiso - Permiso + DNI obligatorios' : 'Vehicle requiring license - License + ID required',
    vehicleWithoutLicense: termsLang === 'fr' ? '{t.vehicleWithoutLicenseTitle} - Carte d\'identité obligatoire' : termsLang === 'es' ? 'Vehículo sin permiso - DNI obligatorio' : 'Vehicle without license - ID required',
    
    // Étape 3
    includedEquipment: termsLang === 'fr' ? 'Équipements inclus' : termsLang === 'es' ? 'Equipamiento incluido' : 'Included equipment',
    helmet: termsLang === 'fr' ? 'Casque' : termsLang === 'es' ? 'Casco' : 'Helmet',
    lock: termsLang === 'fr' ? '{t.lock}' : termsLang === 'es' ? 'Antirrobo' : 'Lock',
    charger: termsLang === 'fr' ? 'Chargeur' : termsLang === 'es' ? 'Cargador' : 'Charger',
    
    // Étape 4
    cgvLanguage: termsLang === 'fr' ? '{t.cgvLanguage}' : termsLang === 'es' ? 'Idioma de las CGV' : 'Terms language',
    acceptCgv: termsLang === 'fr' ? 'J\'ai lu et j\'accepte les' : termsLang === 'es' ? 'He leído y acepto las' : 'I have read and accept the',
    cgv: termsLang === 'fr' ? 'Conditions Générales de Vente' : termsLang === 'es' ? 'Condiciones Generales de Venta' : 'Terms and Conditions',
    acceptRgpd: termsLang === 'fr' ? 'J\'accepte le traitement de mes données personnelles' : termsLang === 'es' ? 'Acepto el tratamiento de mis datos personales' : 'I accept the processing of my personal data',
    clientSignature: termsLang === 'fr' ? '{t.clientSignature}' : termsLang === 'es' ? 'Firma del cliente' : 'Client signature',
    clearSignature: termsLang === 'fr' ? '{t.clearSignature}' : termsLang === 'es' ? 'Borrar firma' : 'Clear signature',
    close: termsLang === 'fr' ? 'Fermer' : termsLang === 'es' ? 'Cerrar' : 'Close',
    cgvUnavailable: termsLang === 'fr' ? 'CGV non disponibles' : termsLang === 'es' ? 'CGV no disponibles' : 'Terms not available',
    rgpdUnavailable: termsLang === 'fr' ? 'RGPD non disponible' : termsLang === 'es' ? 'RGPD no disponible' : 'GDPR not available',
    
    // Étape 5
    totalRental: termsLang === 'fr' ? 'Total location' : termsLang === 'es' ? 'Total alquiler' : 'Total rental',
    bookingDeposit: termsLang === 'fr' ? 'Acompte réservation' : termsLang === 'es' ? 'Anticipo reserva' : 'Booking deposit',
    online: termsLang === 'fr' ? 'En ligne' : termsLang === 'es' ? 'En línea' : 'Online',
    inAgency: termsLang === 'fr' ? 'En agence' : termsLang === 'es' ? 'En agencia' : 'In agency',
    card: termsLang === 'fr' ? 'CB' : termsLang === 'es' ? 'Tarjeta' : 'Card',
    cash: termsLang === 'fr' ? 'Espèces' : termsLang === 'es' ? 'Efectivo' : 'Cash',
    remainingPayment: termsLang === 'fr' ? 'Reste à payer' : termsLang === 'es' ? 'Pendiente de pago' : 'Remaining payment',
    securityDeposit: termsLang === 'fr' ? 'Caution' : termsLang === 'es' ? 'Fianza' : 'Security deposit',
    noDeposit: termsLang === 'fr' ? '{t.noDeposit}' : termsLang === 'es' ? '{t.noDeposit}' : 'No deposit received',
    commercialDiscount: termsLang === 'fr' ? '{t.commercialDiscount}' : termsLang === 'es' ? '{t.commercialDiscount}' : 'Commercial discount (optional)',
    amountEuro: termsLang === 'fr' ? '{t.amountEuro}' : termsLang === 'es' ? '{t.amountEuro}' : 'Amount in €',
    discountReason: termsLang === 'fr' ? '{t.discountReason}' : termsLang === 'es' ? '{t.discountReason}' : 'Discount reason',
    rentalPaid: termsLang === 'fr' ? '{t.rentalPaid}' : termsLang === 'es' ? '{t.rentalPaid}' : 'Rental paid',
    depositCollected: termsLang === 'fr' ? '{t.depositCollected}' : termsLang === 'es' ? '{t.depositCollected}' : 'Deposit collected',
    
    // Étape 6
    vehicleInspection: termsLang === 'fr' ? 'Inspection du véhicule' : termsLang === 'es' ? 'Inspección del vehículo' : 'Vehicle inspection',
    generalCondition: termsLang === 'fr' ? 'État général' : termsLang === 'es' ? 'Estado general' : 'General condition',
    goodCondition: termsLang === 'fr' ? 'Bon état' : termsLang === 'es' ? 'Buen estado' : 'Good condition',
    existingDamages: termsLang === 'fr' ? 'Dommages existants' : termsLang === 'es' ? 'Daños existentes' : 'Existing damages',
    batteryLevel: termsLang === 'fr' ? 'Niveau de batterie' : termsLang === 'es' ? 'Nivel de batería' : 'Battery level',
    mileage: termsLang === 'fr' ? 'Kilométrage' : termsLang === 'es' ? 'Kilometraje' : 'Mileage',
    
    // Textes supplémentaires
    mileageInfo: termsLang === 'fr' ? 'Le kilométrage de départ sera relevé lors de l\'inspection finale.' : termsLang === 'es' ? 'El kilometraje de salida se registrará en la inspección final.' : 'Starting mileage will be recorded during final inspection.',
    vehicleWithLicenseTitle: termsLang === 'fr' ? 'Véhicule nécessitant un permis' : termsLang === 'es' ? 'Vehículo que requiere permiso' : 'Vehicle requiring license',
    licenseIdRequired: termsLang === 'fr' ? 'Permis + CNI obligatoires' : termsLang === 'es' ? 'Permiso + DNI obligatorios' : 'License + ID required',
    vehicleWithoutLicenseTitle: termsLang === 'fr' ? 'Véhicule sans permis' : termsLang === 'es' ? 'Vehículo sin permiso' : 'Vehicle without license',
    idRequired: termsLang === 'fr' ? 'Carte d\'identité obligatoire' : termsLang === 'es' ? 'DNI obligatorio' : 'ID required',
    frontPhoto: termsLang === 'fr' ? 'Photo recto' : termsLang === 'es' ? 'Foto anverso' : 'Front photo',
    backPhoto: termsLang === 'fr' ? 'Photo verso' : termsLang === 'es' ? 'Foto reverso' : 'Back photo',
    upload: termsLang === 'fr' ? 'Télécharger' : termsLang === 'es' ? 'Subir' : 'Upload',
    equipmentGiven: termsLang === 'fr' ? 'Équipements remis au client' : termsLang === 'es' ? 'Equipamiento entregado al cliente' : 'Equipment given to client',
    topCase: termsLang === 'fr' ? 'Top case' : termsLang === 'es' ? 'Baúl' : 'Top case',
    inspectionPhotos: termsLang === 'fr' ? 'Photos d\'inspection' : termsLang === 'es' ? 'Fotos de inspección' : 'Inspection photos',
    front: termsLang === 'fr' ? 'Avant' : termsLang === 'es' ? 'Delantero' : 'Front',
    backSide: termsLang === 'fr' ? 'Arrière' : termsLang === 'es' ? 'Trasero' : 'Back',
    leftSide: termsLang === 'fr' ? 'Côté gauche' : termsLang === 'es' ? 'Lado izquierdo' : 'Left side',
    rightSide: termsLang === 'fr' ? 'Côté droit' : termsLang === 'es' ? 'Lado derecho' : 'Right side',
    dashboard: termsLang === 'fr' ? 'Compteur/Tableau de bord' : termsLang === 'es' ? 'Contador/Tablero' : 'Dashboard',
    startMileage: termsLang === 'fr' ? 'Kilométrage de départ' : termsLang === 'es' ? 'Kilometraje de salida' : 'Starting mileage',
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Step 5 - Payment
  const [locationPaid, setLocationPaid] = useState(false)
  const [depositPaid, setDepositPaid] = useState(false)
  const [depositMethod, setDepositMethod] = useState('CARD')
  const [discount, setDiscount] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CARD')
  
  // Step 6 - Inspection (À LA FIN)
  const [startMileage, setStartMileage] = useState(fleetVehicle?.currentMileage || 0)
  const [fuelLevel, setFuelLevel] = useState('FULL')
  const [photos, setPhotos] = useState<Record<string, string>>({ front: '', left: '', right: '', rear: '', counter: '' })

  const totalSteps = 6
  const lang = termsLang
  
  // Étapes avec noms
  const stepNames = isMotorRent 
    ? t.steps
    : t.steps
  
  // Photos requises selon la marque
  const getRequiredPhotos = () => {
    if (isMotorRent) {
      return [
        { key: 'front', label: '{t.front}', required: true },
        { key: 'left', label: 'Gauche', required: true },
        { key: 'right', label: 'Droite', required: true },
        { key: 'rear', label: '{t.back}', required: true },
        { key: 'counter', label: 'Compteur', required: false }
      ]
    } else {
      // Voltride: seulement gauche et droite obligatoires
      return [
        { key: 'left', label: 'Gauche', required: true },
        { key: 'right', label: 'Droite', required: true },
        { key: 'counter', label: 'Compteur', required: false }
      ]
    }
  }
  
  // Upload photo
  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'voltride')
      const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/auto/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      return data.secure_url || null
    } catch (e) {
      console.error('Upload error:', e)
      return null
    } finally {
      setUploading(false)
    }
  }
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = await uploadPhoto(file)
      if (url) setPhotos(prev => ({ ...prev, [key]: url }))
    }
  }
  
  // Canvas signature
  useEffect(() => {
    if (step === 4 && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [step])
  
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.moveTo(x, y)
  }
  
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'black'
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  
  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignature(canvasRef.current.toDataURL())
      setHasSigned(true)
    }
    setIsDrawing(false)
  }
  
  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignature('')
    setHasSigned(false)
  }
  
  // Validation par étape
  const canProceed = () => {
    switch (step) {
      case 1: return true // Véhicule - juste affichage
      case 2: // Documents
        if (isMotorRent) {
          // Motor-Rent: permis obligatoire recto/verso
          return licenseUrl && licenseVersoUrl
        } else {
          // Voltride: si véhicule avec plaque -> permis obligatoire
          if (requiresLicense) {
            return licenseUrl && licenseVersoUrl
          }
          // Sans plaque: CNI obligatoire
          return idCardUrl
        }
      case 3: return true // Équipements
      case 4: return termsAccepted && rgpdAccepted && hasSigned // Signature obligatoire
      case 5: return locationPaid && depositPaid // Paiement
      case 6: // Inspection
        const requiredPhotos = getRequiredPhotos().filter(p => p.required)
        return requiredPhotos.every(p => photos[p.key])
      default: return false
    }
  }
  
  // Finaliser le check-in
  const handleComplete = async () => {
    setLoading(true)
    try {
      // Mettre à jour le booking avec les infos de check-in
      await api.updateBooking(booking.id, {
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        startMileage,
        fuelLevelStart: fuelLevel,
        idCardUrl,
        idCardVersoUrl,
        licenseUrl,
        licenseVersoUrl,
        signatureUrl: signature,
        checkInPhotos: photos,
        depositMethod,
        paidAmount: booking.totalPrice,
        status: 'CHECKED_IN'
      })
      
      // Mettre à jour le kilométrage du véhicule
      await api.updateFleetVehicle(fleetVehicle.id, {
        currentMileage: startMileage,
        status: 'RENTED'
      })
      
      onComplete()
    } catch (e) {
      console.error('Check-in error:', e)
      alert('Erreur lors du check-in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Check-in</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
          <p className="text-sm opacity-90">{booking?.customer?.firstName} {booking?.customer?.lastName}</p>
        </div>
        
        {/* Steps indicator */}
        <div className="flex border-b overflow-x-auto">
          {stepNames.map((name, i) => (
            <button
              key={i}
              onClick={() => i + 1 <= step && setStep(i + 1)}
              className={`flex-1 py-3 px-2 text-xs font-medium whitespace-nowrap transition-all ${
                step === i + 1 
                  ? 'bg-white text-green-600 border-b-2 border-green-600' 
                  : i + 1 < step 
                    ? 'bg-green-50 text-green-600' 
                    : 'text-gray-400'
              }`}
            >
              {i + 1}. {name}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* STEP 1: Véhicule */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                {fleetVehicle?.vehicle?.imageUrl ? (
                  <img src={fleetVehicle.vehicle.imageUrl} className="w-24 h-24 rounded-lg object-cover" />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                    {isMotorRent ? '🏍️' : '🚲'}
                  </div>
                )}
                <div>
                  <p className="text-2xl font-bold">{fleetVehicle?.vehicleNumber}</p>
                  <p className="text-gray-600">{getName(fleetVehicle?.vehicle?.name, lang)}</p>
                  {fleetVehicle?.licensePlate && (
                    <p className="text-sm text-gray-500 mt-1">🔢 {fleetVehicle.licensePlate}</p>
                  )}
                  <p className="text-sm text-blue-600 mt-2">
                    {new Date(booking?.startDate).toLocaleDateString('fr-FR')} → {new Date(booking?.endDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-blue-700 text-sm">
                {t.mileageInfo}
              </div>
            </div>
          )}
          
          {/* STEP 2: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              {isMotorRent ? (
                <>
                  {/* Motor-Rent: Permis obligatoire */}
                  <div className="p-3 bg-orange-50 rounded-xl text-orange-700 text-sm">
                    <strong>Permiso de conducir obligatoire</strong> (recto + verso)
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Permiso de conducir <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                        licenseUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400'
                      }`}>
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
                            <span className="text-sm">Recto *</span>
                          </div>
                        )}
                      </label>
                      <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                        licenseVersoUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400'
                      }`}>
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
                            <span className="text-sm">Verso *</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  {/* CNI optionnel Motor-Rent */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Carte d'identité <span className="text-gray-400 text-xs">(optionnel maintenant, obligatoire au check-out)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                        idCardUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                      }`}>
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
                      <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                        idCardVersoUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                      }`}>
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
                </>
              ) : (
                <>
                  {/* Voltride */}
                  {requiresLicense ? (
                    <>
                      {/* Catégorie avec permis */}
                      <div className="p-3 bg-orange-50 rounded-xl text-orange-700 text-sm">
                        <strong>{t.vehicleWithLicenseTitle}</strong> - {t.licenseIdRequired}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Permiso de conducir <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                            licenseUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400'
                          }`}>
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
                                <span className="text-sm">Recto *</span>
                              </div>
                            )}
                          </label>
                          <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                            licenseVersoUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400'
                          }`}>
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
                                <span className="text-sm">Verso *</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Carte d'identité <span className="text-gray-400 text-xs">(optionnel maintenant)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                            idCardUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                          }`}>
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
                          <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                            idCardVersoUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                          }`}>
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
                    </>
                  ) : (
                    <>
                      {/* Catégorie sans permis - CNI obligatoire */}
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-700 text-sm">
                        ℹ️ {t.vehicleWithoutLicenseTitle} - <strong>{t.idRequired}</strong>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Carte d'identité <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                            idCardUrl ? 'border-green-500 bg-green-50' : 'border-orange-300 hover:border-orange-400'
                          }`}>
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
                                <span className="text-sm">Recto *</span>
                              </div>
                            )}
                          </label>
                          <label className={`block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ${
                            idCardVersoUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                          }`}>
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
                    </>
                  )}
                </>
              )}
              {uploading && <p className="text-blue-600 text-sm mt-2">⏳ Upload en cours...</p>}
            </div>
          )}
          
          {/* STEP 3: Équipements */}
          {step === 3 && (
            <div className="space-y-4">
              {equipment.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">Options sélectionnées lors de la réservation :</p>
                  {equipment.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={e => {
                            const newEquip = [...equipment]
                            newEquip[i].checked = e.target.checked
                            setEquipment(newEquip)
                            // Calculer réduction
                            const unchecked = newEquip.filter(eq => eq.fromBooking && !eq.checked)
                            setOptionsDiscount(unchecked.reduce((sum, eq) => sum + (eq.totalPrice || 0), 0))
                          }}
                          className="w-5 h-5 rounded"
                        />
                        <span>{lang === 'es' ? item.nameEs : item.name}</span>
                        {item.qty > 1 && <span className="text-gray-400">x{item.qty}</span>}
                      </label>
                      {item.totalPrice > 0 && (
                        <span className="text-gray-600">{item.totalPrice.toFixed(2)} €</span>
                      )}
                    </div>
                  ))}
                  {optionsDiscount > 0 && (
                    <div className="p-3 bg-green-50 rounded-xl text-green-700">
                      💰 Réduction options non prises : -{optionsDiscount.toFixed(2)} €
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-gray-400">
                  <p className="text-4xl mb-2">📦</p>
                  <p>Aucune option sélectionnée</p>
                </div>
              )}
            </div>
          )}
          
          {/* STEP 4: Signature */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Idioma de las CGV</label>
                <div className="flex gap-2">
                  <button onClick={() => setTermsLang('fr')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${termsLang === 'fr' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
                    <img src="https://flagcdn.com/24x18/fr.png" alt="FR" className="w-6 h-4" /> FR
                  </button>
                  <button onClick={() => setTermsLang('es')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${termsLang === 'es' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
                    <img src="https://flagcdn.com/24x18/es.png" alt="ES" className="w-6 h-4" /> ES
                  </button>
                  <button onClick={() => setTermsLang('en')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${termsLang === 'en' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
                    <img src="https://flagcdn.com/24x18/gb.png" alt="EN" className="w-6 h-4" /> EN
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded cursor-pointer" />
                  <span className="text-sm">
                    He leído y acepto las {settings?.cgvResume?.[termsLang] ? (
                      <span className="text-blue-600 font-medium cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setShowTextModal({ type: 'cgv', text: settings?.cgvResume?.[termsLang] || 'CGV no disponibles' }); }}>Condiciones Generales de Venta</span>
                    ) : (
                      <span className="text-gray-400">(CGV non disponible)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <input type="checkbox" checked={rgpdAccepted} onChange={e => setRgpdAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded cursor-pointer" />
                  <span className="text-sm">
                    Acepto el tratamiento de mis datos personales {settings?.rgpd?.[termsLang] ? (
                      <span className="text-blue-600 font-medium cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setShowTextModal({ type: 'rgpd', text: settings?.rgpd?.[termsLang] || 'RGPD no disponible' }); }}>(RGPD)</span>
                    ) : (
                      <span className="text-gray-400">(RGPD no disponible)</span>
                    )}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Firma del cliente <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white">
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
                  Borrar firma
                </button>
              </div>
            </div>
          )}
          
          {/* STEP 5: Paiement */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Récapitulatif des montants */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span>Total alquiler:</span>
                  <span className="font-bold">{(booking?.totalPrice || 0).toFixed(2)} €</span>
                </div>
                {/* Acompte payé à la réservation */}
                {(booking?.paidAmount || 0) > 0 && (
                  <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between text-green-700">
                      <span>Anticipo reserva:</span>
                      <span className="font-bold">-{(booking?.paidAmount || 0).toFixed(2)} €</span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {booking?.createdAt ? new Date(booking.createdAt).toLocaleDateString('fr-FR') : ''} 
                      {booking?.source === 'WIDGET' ? ' • En línea • {t.card}' : ` • {t.inAgency} • ${booking?.paymentMethod === 'card' ? 'Tarjeta' : booking?.paymentMethod === 'cash' ? 'Efectivo' : '{t.card}/{t.cash}'}`}
                    </div>
                  </div>
                )}
                {(booking?.paidAmount || 0) === 0 && (
                  <div className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-orange-700 text-sm">
                      {t.noDeposit}
                    </div>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Remise commerciale :</span>
                    <span>-{discount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span>Pendiente de pago:</span>
                  <span className="text-blue-600">{Math.max(0, (booking?.totalPrice || 0) - (booking?.paidAmount || 0) - discount).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg mt-2 pt-2 border-t">
                  <span>Fianza:</span>
                  <span className="font-bold">{booking?.depositAmount || fleetVehicle?.vehicle?.deposit || 100} €</span>
                </div>
              </div>
              
              {/* Remise commerciale */}
              <div className="p-4 bg-orange-50 rounded-xl">
                <label className="block text-sm font-medium mb-2">🏷️ {t.commercialDiscount}</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="number" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="{t.amountEuro}" className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <input type="text" value={discountReason} onChange={e => setDiscountReason(e.target.value)}
                      placeholder="{t.discountReason}" className="w-full border rounded-lg p-2" />
                  </div>
                </div>
              </div>
              
              {/* {t.rentalPaid} */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={locationPaid} onChange={e => setLocationPaid(e.target.checked)}
                    className="w-6 h-6 rounded" />
                  <span className="font-medium">{t.rentalPaid}</span>
                </label>
                {locationPaid && (
                  <div className="mt-3 flex gap-2">
                    {['CARD', 'CASH'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${paymentMethod === m ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                        {m === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* {t.depositCollected} */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={depositPaid} onChange={e => setDepositPaid(e.target.checked)}
                    className="w-6 h-6 rounded" />
                  <span className="font-medium">{t.depositCollected}</span>
                </label>
                {depositPaid && (
                  <div className="mt-3 flex gap-2">
                    {['CARD', 'CASH'].map(m => (
                      <button key={m} onClick={() => setDepositMethod(m)}
                        className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${depositMethod === m ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                        {m === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* STEP 6: Inspection (À LA FIN) */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-xl text-green-700 text-sm">
                Dernière étape ! Prenez les photos du véhicule et relevez le kilométrage.
              </div>
              
              {/* Photos */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Photos du véhicule {isMotorRent ? '(4 obligatoires)' : '(2 obligatoires)'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {getRequiredPhotos().map(p => (
                    <label key={p.key} className={`relative block border-2 border-dashed rounded-xl h-24 cursor-pointer transition-all overflow-hidden ${
                      photos[p.key] ? 'border-green-500 bg-green-50' : p.required ? 'border-orange-300 hover:border-orange-400' : 'border-gray-300 hover:border-gray-400'
                    }`}>
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
              
              {/* Kilometraje */}
              <div>
                <label className="block text-sm font-medium mb-2">Kilometraje au départ</label>
                <input type="number" value={startMileage} onChange={e => setStartMileage(parseInt(e.target.value) || 0)}
                  className="w-full border-2 rounded-xl px-4 py-3 text-xl" />
                <p className="text-sm text-gray-500 mt-1">Dernier relevé: {fleetVehicle?.currentMileage || 0} km</p>
              </div>
              
              {/* Niveau de carburant */}
              <div>
                <label className="block text-sm font-medium mb-2">Niveau de carburant</label>
                <div className="grid grid-cols-5 gap-2">
                  {FUEL_LEVELS.map(f => (
                    <button key={f.id} onClick={() => setFuelLevel(f.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        fuelLevel === f.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="text-xl">{f.icon}</div>
                      <div className="text-xs mt-1">{lang === 'es' ? f.labelEs : f.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">
              Volver
            </button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <button onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className={`px-6 py-2 rounded-xl font-medium ${
                canProceed() 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              Siguiente
            </button>
          ) : (
            <button onClick={handleComplete}
              disabled={!canProceed() || loading}
              className={`px-6 py-2 rounded-xl font-medium ${
                canProceed() && !loading
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {loading ? t.loading : t.finish}
            </button>
          )}
        </div>
      </div>
    </div>
    
    {/* Modal CGV/RGPD */}
    {showTextModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowTextModal(null)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="bg-green-600 text-white p-4 flex justify-between items-center">
            <h3 className="text-lg font-bold">{showTextModal.type === 'cgv' ? ' Condiciones Generales de Venta' : 'Política RGPD'}</h3>
            <button onClick={() => setShowTextModal(null)} className="text-white hover:text-gray-200 text-2xl">×</button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="whitespace-pre-wrap text-sm text-gray-700">{showTextModal.text}</div>
          </div>
          <div className="p-4 border-t flex justify-end">
            <button onClick={() => setShowTextModal(null)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{t.close}</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
