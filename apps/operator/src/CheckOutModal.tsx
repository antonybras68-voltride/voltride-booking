import { useState, useEffect } from 'react'
import { api } from './api'
import { getName } from './types'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface CheckOutModalProps {
  booking: any
  brand: string
  onClose: () => void
  onComplete: () => void
}

interface PhotoValidation {
  originalUrl: string
  validated: boolean | null
  damagePhotoUrl?: string
  damagedParts: any[]
}

export function CheckOutModal({ booking, brand, onClose, onComplete }: CheckOutModalProps) {
  const [step, setStep] = useState(1) // 1: Photos, 2: Fuel, 3: Mileage, 4: Summary, 5: Finalize
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  
  // Data
  const [contract, setContract] = useState<any>(null)
  const [spareParts, setSpareParts] = useState<any[]>([])
  const [checkInPhotos, setCheckInPhotos] = useState<string[]>([])
  
  // Photo validation
  const [photoValidations, setPhotoValidations] = useState<PhotoValidation[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showDamageForm, setShowDamageForm] = useState(false)
  const [uploadingDamage, setUploadingDamage] = useState(false)
  const [selectedParts, setSelectedParts] = useState<string[]>([])
  const [tempDamagePhoto, setTempDamagePhoto] = useState<string>('')
  
  // Vehicle state
  const [fuelLevel, setFuelLevel] = useState('FULL')
  const [endMileage, setEndMileage] = useState(0)
  
  // Computed
  const [deductions, setDeductions] = useState<any[]>([])
  const [fuelCharge, setFuelCharge] = useState(0)
  const [extraKmCharge, setExtraKmCharge] = useState(0)
  const [extraKmCount, setExtraKmCount] = useState(0)
  
  // Documents manquants
  const [missingDocs, setMissingDocs] = useState<string[]>([])
  const [idCardUrl, setIdCardUrl] = useState('')
  const [idCardVersoUrl, setIdCardVersoUrl] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [licenseVersoUrl, setLicenseVersoUrl] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  
  const isMotorRent = brand === 'MOTOR-RENT'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load contract
      const contractRes = await fetch(`${API_URL}/api/contracts/booking/${booking.id}`)
      if (contractRes.ok) {
        const contractData = await contractRes.json()
        setContract(contractData)
        setEndMileage(contractData.startMileage || booking.fleetVehicle?.currentMileage || 0)
        
        // Get check-in photos
        const photos: string[] = []
        if (contractData.photoFront) photos.push(contractData.photoFront)
        if (contractData.photoLeft) photos.push(contractData.photoLeft)
        if (contractData.photoRight) photos.push(contractData.photoRight)
        if (contractData.photoRear) photos.push(contractData.photoRear)
        if (contractData.photoCounter) photos.push(contractData.photoCounter)
        setCheckInPhotos(photos)
        
        // Initialize validations
        setPhotoValidations(photos.map(url => ({
          originalUrl: url,
          validated: null,
          damagedParts: []
        })))
        
        // Vérifier documents manquants
        const missing: string[] = []
        const needsLicense = booking.fleetVehicle?.vehicle?.hasPlate
        if (!contractData.customerIdCardUrl) missing.push('idCardRecto')
        if (!contractData.customerIdCardVersoUrl) missing.push('idCardVerso')
        if (needsLicense && !contractData.customerLicenseUrl) missing.push('licenseRecto')
        if (needsLicense && !contractData.customerLicenseVersoUrl) missing.push('licenseVerso')
        setMissingDocs(missing)
      }

      // Load spare parts
      if (booking.fleetVehicle?.id) {
        const partsRes = await fetch(`${API_URL}/api/fleet/${booking.fleetVehicle.id}/spare-parts`)
        if (partsRes.ok) {
          setSpareParts(await partsRes.json())
        }
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // Upload document manquant
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await api.uploadImage(file, `checkout/${booking.id}/docs`)
      if (url) {
        if (type === 'idCardRecto') setIdCardUrl(url)
        if (type === 'idCardVerso') setIdCardVersoUrl(url)
        if (type === 'licenseRecto') setLicenseUrl(url)
        if (type === 'licenseVerso') setLicenseVersoUrl(url)
        setMissingDocs(prev => prev.filter(d => d !== type))
      }
    } catch (err) { alert('Erreur upload') }
    setUploadingDoc(false)
  }

  // Upload document manquant
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await api.uploadImage(file, `checkout/${booking.id}/docs`)
      if (url) {
        if (type === 'idCardRecto') setIdCardUrl(url)
        if (type === 'idCardVerso') setIdCardVersoUrl(url)
        if (type === 'licenseRecto') setLicenseUrl(url)
        if (type === 'licenseVerso') setLicenseVersoUrl(url)
        setMissingDocs(prev => prev.filter(d => d !== type))
      }
    } catch (err) { alert('Erreur upload') }
    setUploadingDoc(false)
  }

  // Photo validation handlers
  const validateCurrentPhoto = (isValid: boolean) => {
    if (isValid) {
      // Mark as validated and move to next
      setPhotoValidations(prev => prev.map((p, i) => 
        i === currentPhotoIndex ? { ...p, validated: true } : p
      ))
      moveToNextPhoto()
    } else {
      // Show damage form
      setShowDamageForm(true)
    }
  }

  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingDamage(true)
    try {
      const url = await api.uploadImage(file, `checkout/${booking.id}/damage`)
      if (url) setTempDamagePhoto(url)
    } catch (err) {
      console.error(err)
    }
    setUploadingDamage(false)
  }

  const togglePartSelection = (partId: string) => {
    setSelectedParts(prev => 
      prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]
    )
  }

  const confirmDamage = () => {
    if (!tempDamagePhoto || selectedParts.length === 0) {
      alert('Veuillez prendre une photo et sélectionner au moins une pièce endommagée')
      return
    }

    const damagedParts = spareParts.filter(p => selectedParts.includes(p.id))
    
    setPhotoValidations(prev => prev.map((p, i) => 
      i === currentPhotoIndex ? {
        ...p,
        validated: false,
        damagePhotoUrl: tempDamagePhoto,
        damagedParts
      } : p
    ))

    // Add to deductions
    damagedParts.forEach(part => {
      if (!deductions.find(d => d.partId === part.id)) {
        setDeductions(prev => [...prev, {
          id: Date.now() + Math.random(),
          partId: part.id,
          name: part.name,
          price: parseFloat(part.totalCost) || 0,
          photoUrl: tempDamagePhoto
        }])
      }
    })

    // Reset and move to next
    setShowDamageForm(false)
    setTempDamagePhoto('')
    setSelectedParts([])
    moveToNextPhoto()
  }

  const cancelDamage = () => {
    setShowDamageForm(false)
    setTempDamagePhoto('')
    setSelectedParts([])
  }

  const moveToNextPhoto = () => {
    if (currentPhotoIndex < checkInPhotos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1)
    } else {
      // All photos validated, move to fuel or mileage
      setStep(isMotorRent ? 2 : 3)
    }
  }

  // Fuel handlers
  const fuelLevels = [
    { id: 'FULL', label: 'Plein', icon: '████', charge: 0 },
    { id: 'THREE_QUARTER', label: '3/4', icon: '███░', charge: booking.fleetVehicle?.vehicle?.fuelChargeQuarter || 5 },
    { id: 'HALF', label: '1/2', icon: '██░░', charge: booking.fleetVehicle?.vehicle?.fuelChargeHalf || 10 },
    { id: 'QUARTER', label: '1/4', icon: '█░░░', charge: booking.fleetVehicle?.vehicle?.fuelChargeThreeQ || 15 },
    { id: 'EMPTY', label: 'Vide', icon: '░░░░', charge: booking.fleetVehicle?.vehicle?.fuelChargeEmpty || 20 }
  ]

  const selectFuel = (level: string) => {
    setFuelLevel(level)
    const selected = fuelLevels.find(f => f.id === level)
    setFuelCharge(selected?.charge || 0)
  }

  // Calculate extra km when mileage changes
  const calculateExtraKm = (newMileage: number) => {
    setEndMileage(newMileage)
    
    const startMileage = contract?.startMileage || 0
    const kmDriven = Math.max(0, newMileage - startMileage)
    
    // Get vehicle tariff settings
    const kmIncludedPerDay = booking.fleetVehicle?.vehicle?.kmIncludedPerDay || 100
    const extraKmPrice = parseFloat(booking.fleetVehicle?.vehicle?.extraKmPrice) || 0.15
    
    // Calculate days of rental
    const startDate = new Date(booking.startDate)
    const endDate = new Date()
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    const kmIncluded = days * kmIncludedPerDay
    const extraKm = Math.max(0, kmDriven - kmIncluded)
    
    setExtraKmCount(extraKm)
    setExtraKmCharge(extraKm * extraKmPrice)
  }

  // Calculate totals
  const totalDeductions = deductions.reduce((sum, d) => sum + d.price, 0) + fuelCharge + extraKmCharge
  const depositAmount = booking.depositAmount || contract?.depositAmount || 0
  const refundAmount = Math.max(0, depositAmount - totalDeductions)
  const additionalCharge = totalDeductions > depositAmount ? totalDeductions - depositAmount : 0
  const paymentMethod = contract?.depositMethod === 'CASH' ? 'Espèces' : 'Carte bancaire'

  // Finalize
  const handleFinalize = async () => {
    setProcessing(true)
    try {
      // Update contract
      if (contract?.id) {
        await fetch(`${API_URL}/api/contracts/${contract.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETED',
            checkoutAt: new Date().toISOString(),
            endMileage,
            endFuelLevel: fuelLevel,
            totalDeductions,
            depositRefunded: refundAmount
          })
        })

        // Create deductions in DB
        for (const d of deductions) {
          await fetch(`${API_URL}/api/contracts/${contract.id}/deductions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'PART_DAMAGE',
              description: d.name,
              quantity: 1,
              unitPrice: d.price,
              totalPrice: d.price,
              sparePartId: d.partId,
              photoUrls: [d.photoUrl]
            })
          })
        }

        // Add fuel charge if any
        if (fuelCharge > 0) {
          await fetch(`${API_URL}/api/contracts/${contract.id}/deductions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'FUEL_CHARGE',
              description: `Supplément carburant (niveau: ${fuelLevel})`,
              quantity: 1,
              unitPrice: fuelCharge,
              totalPrice: fuelCharge
            })
          })
        }

        // Add extra km charge if any
        if (extraKmCharge > 0) {
          await fetch(`${API_URL}/api/contracts/${contract.id}/deductions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'EXTRA_KM',
              description: `Km supplémentaires: ${extraKmCount} km × ${booking.fleetVehicle?.vehicle?.extraKmPrice || 0.15}€`,
              quantity: extraKmCount,
              unitPrice: booking.fleetVehicle?.vehicle?.extraKmPrice || 0.15,
              totalPrice: extraKmCharge
            })
          })
        }
      }

      // Update booking status
      await api.updateBooking(booking.id, { status: 'COMPLETED' })

      // Update fleet vehicle
      await api.updateFleetVehicle(booking.fleetVehicle.id, { 
        status: 'AVAILABLE',
        currentMileage: endMileage
      })

      // TODO: Generate PDF report and invoice
      // TODO: Send email to customer

      setStep(5) // Success step
      setTimeout(() => onComplete(), 2000)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la finalisation')
    }
    setProcessing(false)
  }

  const removeDeduction = (id: number) => {
    setDeductions(prev => prev.filter(d => d.id !== id))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {booking.fleetVehicle?.vehicle?.imageUrl && (
                <img src={booking.fleetVehicle.vehicle.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div>
                <h2 className="text-lg font-bold">Check-out: {booking.fleetVehicle?.vehicleNumber}</h2>
                <p className="text-sm opacity-80">{booking.customer?.firstName} {booking.customer?.lastName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-2xl opacity-70 hover:opacity-100">&times;</button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex border-b text-xs">
          {[
            { num: 1, label: 'Photos' },
            ...(isMotorRent ? [{ num: 2, label: 'Carburant' }] : []),
            { num: isMotorRent ? 3 : 2, label: 'Kilométrage' },
            { num: isMotorRent ? 4 : 3, label: 'Récapitulatif' },
            { num: isMotorRent ? 5 : 4, label: 'Terminé' }
          ].map((s, i) => (
            <div key={i} className={'flex-1 py-2 text-center border-b-2 ' +
              (step >= s.num ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400')}>
              {s.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* Step 1: Photo Validation */}
          {step === 1 && !showDamageForm && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Photo {currentPhotoIndex + 1} / {checkInPhotos.length}
                </p>
                <p className="font-medium">Le véhicule est-il dans le même état qu'au départ ?</p>
              </div>

              {checkInPhotos.length > 0 ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={checkInPhotos[currentPhotoIndex]} 
                    alt={`Photo check-in ${currentPhotoIndex + 1}`}
                    className="max-h-80 rounded-xl shadow-lg"
                  />
                  
                  <div className="flex gap-4 mt-6">
                    <button onClick={() => validateCurrentPhoto(false)}
                      className="px-8 py-4 bg-red-100 text-red-700 rounded-xl text-lg font-medium hover:bg-red-200 flex items-center gap-2">
                      <span className="text-2xl">✕</span> Dommage
                    </button>
                    <button onClick={() => validateCurrentPhoto(true)}
                      className="px-8 py-4 bg-green-100 text-green-700 rounded-xl text-lg font-medium hover:bg-green-200 flex items-center gap-2">
                      <span className="text-2xl">✓</span> OK
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune photo de check-in disponible</p>
                  <button onClick={() => setStep(isMotorRent ? 2 : 3)}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">
                    Continuer
                  </button>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-4">
                {checkInPhotos.map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${
                    photoValidations[i]?.validated === true ? 'bg-green-500' :
                    photoValidations[i]?.validated === false ? 'bg-red-500' :
                    i === currentPhotoIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                ))}
              </div>
            </div>
          )}

          {/* Damage Form */}
          {step === 1 && showDamageForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button onClick={cancelDamage} className="text-gray-500 hover:text-gray-700">
                  ← Retour
                </button>
                <h3 className="font-medium">Signaler un dommage</h3>
              </div>

              {/* Original photo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Photo check-in (référence)</p>
                  <img src={checkInPhotos[currentPhotoIndex]} className="w-full rounded-lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Nouvelle photo du dommage</p>
                  {tempDamagePhoto ? (
                    <div className="relative">
                      <img src={tempDamagePhoto} className="w-full rounded-lg" />
                      <button onClick={() => setTempDamagePhoto('')}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full">×</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <span className="text-4xl mb-2">📷</span>
                      <span className="text-sm text-gray-500">Prendre une photo</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDamagePhotoUpload} />
                      {uploadingDamage && <span className="text-blue-600 mt-2">Chargement...</span>}
                    </label>
                  )}
                </div>
              </div>

              {/* Parts selection */}
              <div>
                <p className="text-sm font-medium mb-2">Sélectionnez les pièces endommagées :</p>
                {spareParts.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune pièce configurée pour ce véhicule</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                    {spareParts.map(part => (
                      <button key={part.id} onClick={() => togglePartSelection(part.id)}
                        className={'p-3 border rounded-lg text-left text-sm ' +
                          (selectedParts.includes(part.id) ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300')}>
                        <p className="font-medium">{part.name}</p>
                        <p className="text-gray-500">{parseFloat(part.totalCost).toFixed(2)}€</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={confirmDamage}
                disabled={!tempDamagePhoto || selectedParts.length === 0}
                className="w-full py-3 bg-red-600 text-white rounded-lg disabled:opacity-50">
                Confirmer le dommage
              </button>
            </div>
          )}

          {/* Step 2: Fuel (Motor-Rent only) */}
          {step === 2 && isMotorRent && (
            <div className="space-y-6">
              <h3 className="font-medium text-center">Niveau de carburant au retour</h3>
              
              <div className="grid grid-cols-5 gap-2">
                {fuelLevels.map(level => (
                  <button key={level.id} onClick={() => selectFuel(level.id)}
                    className={'p-4 border-2 rounded-xl text-center transition ' +
                      (fuelLevel === level.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                    <div className="text-lg font-mono mb-1">{level.icon}</div>
                    <div className="text-sm font-medium">{level.label}</div>
                    {level.charge > 0 && (
                      <div className="text-xs text-red-600 mt-1">+{level.charge}€</div>
                    )}
                  </button>
                ))}
              </div>

              {fuelCharge > 0 && (
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-red-700">Supplément carburant: <strong>+{fuelCharge}€</strong></p>
                </div>
              )}

              <button onClick={() => setStep(3)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg">
                Continuer
              </button>
            </div>
          )}

          {/* Step 3: Mileage */}
          {step === (isMotorRent ? 3 : 2) && (
            <div className="space-y-6">
              <h3 className="font-medium text-center">Kilométrage au retour</h3>
              
              <div className="flex items-center justify-center gap-4">
                <input type="number" value={endMileage} onChange={e => calculateExtraKm(parseInt(e.target.value) || 0)}
                  className="w-40 text-center text-2xl font-mono border-2 rounded-xl p-4" />
                <span className="text-gray-500">km</span>
              </div>

              {contract?.startMileage && (
                <div className="text-center text-sm text-gray-500">
                  Départ: {contract.startMileage} km → <strong>+{endMileage - contract.startMileage} km</strong> parcourus
                </div>
              )}

              {/* Extra km info */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Km inclus ({booking.fleetVehicle?.vehicle?.kmIncludedPerDay || 100} km/jour)</span>
                  <span>{Math.max(1, Math.ceil((new Date().getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24))) * (booking.fleetVehicle?.vehicle?.kmIncludedPerDay || 100)} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Km parcourus</span>
                  <span>{endMileage - (contract?.startMileage || 0)} km</span>
                </div>
                {extraKmCount > 0 && (
                  <div className="flex justify-between text-red-600 font-medium pt-2 border-t">
                    <span>Km supplémentaires ({extraKmCount} × {booking.fleetVehicle?.vehicle?.extraKmPrice || 0.15}€)</span>
                    <span>+{extraKmCharge.toFixed(2)}€</span>
                  </div>
                )}
                {extraKmCount === 0 && (
                  <div className="text-green-600 text-center pt-2 border-t">
                    ✓ Dans la limite des km inclus
                  </div>
                )}
              </div>

              <button onClick={() => setStep(isMotorRent ? 4 : 3)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg">
                Continuer
              </button>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === (isMotorRent ? 4 : 3) && (
            <div className="space-y-6">
              <h3 className="font-medium">Récapitulatif</h3>

              {/* Damages */}
              {deductions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">Dommages constatés :</p>
                  {deductions.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      {d.photoUrl && <img src={d.photoUrl} className="w-12 h-12 object-cover rounded" />}
                      <div className="flex-1">
                        <p className="font-medium">{d.name}</p>
                      </div>
                      <p className="font-bold text-red-600">-{d.price.toFixed(2)}€</p>
                      <button onClick={() => removeDeduction(d.id)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Fuel charge */}
              {fuelCharge > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span>Supplément carburant ({fuelLevel})</span>
                  <span className="font-bold text-orange-600">-{fuelCharge.toFixed(2)}€</span>
                </div>
              )}

              {/* Extra km charge */}
              {extraKmCharge > 0 && (
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span>Km supplémentaires ({extraKmCount} km)</span>
                  <span className="font-bold text-purple-600">-{extraKmCharge.toFixed(2)}€</span>
                </div>
              )}

              {/* No issues */}
              {deductions.length === 0 && fuelCharge === 0 && extraKmCharge === 0 && (
                <div className="p-4 bg-green-50 rounded-lg text-center text-green-700">✓ Aucun dommage</div>
              )}

              {/* Documents manquants */}
              {missingDocs.length > 0 && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <p className="font-medium text-red-700 mb-2">⚠️ Documents manquants - Caution bloquée</p>
                  <div className="grid grid-cols-2 gap-2">
                    {missingDocs.includes('idCardRecto') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'idCardRecto')} />
                        <span>🪪</span><span className="text-xs">CNI Recto</span>
                      </label>
                    )}
                    {missingDocs.includes('idCardVerso') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'idCardVerso')} />
                        <span>🪪</span><span className="text-xs">CNI Verso</span>
                      </label>
                    )}
                    {missingDocs.includes('licenseRecto') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'licenseRecto')} />
                        <span>🪪</span><span className="text-xs">Permis Recto</span>
                      </label>
                    )}
                    {missingDocs.includes('licenseVerso') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'licenseVerso')} />
                        <span>🪪</span><span className="text-xs">Permis Verso</span>
                      </label>
                    )}
                  </div>
                  {uploadingDoc && <p className="text-blue-600 text-sm mt-2 text-center">⏳ Upload...</p>}
                </div>
              )}

              {/* Deposit calculation */}
              <div className="p-4 border-2 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span>Caution versée</span>
                  <span className="font-medium">{depositAmount.toFixed(2)}€</span>
                </div>
                {totalDeductions > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Total déductions</span>
                    <span>-{totalDeductions.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t text-lg">
                  {additionalCharge > 0 ? (
                    <>
                      <span className="font-medium">Reste à payer par le client</span>
                      <span className="font-bold text-red-600">{additionalCharge.toFixed(2)}€</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Caution à rembourser</span>
                      <span className="font-bold text-green-600">{refundAmount.toFixed(2)}€</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg mt-4">
                  <span className="text-xl">{contract?.depositMethod === 'CASH' ? '💵' : '💳'}</span>
                  <div className="text-sm">
                    <p className="font-medium">Mode de remboursement: {paymentMethod}</p>
                    <p className="text-gray-500">Identique au dépôt de caution</p>
                  </div>
                </div>
              </div>

              <button onClick={handleFinalize} disabled={processing || missingDocs.length > 0}
                className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50">
                {processing ? '...' : missingDocs.length > 0 ? '⚠️ Docs requis' : '✅ Finaliser'}
              </button>
            </div>
          )}

          {/* Step 5: Success */}
          {step === (isMotorRent ? 5 : 4) && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-2">Check-out terminé !</h3>
              <p className="text-gray-600">Le véhicule est maintenant disponible.</p>
              <p className="text-sm text-gray-500 mt-4">Génération du rapport et de la facture...</p>
            </div>
          )}
        </div>

        {/* Footer navigation (for photo step) */}
        {step === 1 && !showDamageForm && checkInPhotos.length === 0 && (
          <div className="p-4 border-t bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">Annuler</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CheckOutModal
