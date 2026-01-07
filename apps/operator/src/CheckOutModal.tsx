import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import { getName } from './types'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface CheckOutModalProps {
  booking: any
  brand: string
  onClose: () => void
  onComplete: () => void
}

export function CheckOutModal({ booking, brand, onClose, onComplete }: CheckOutModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkInData, setCheckInData] = useState<any>(null)
  
  // Step 1: Photos
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  
  // Step 2: Vehicle state
  const [endMileage, setEndMileage] = useState(booking.fleetVehicle?.currentMileage || 0)
  const [fuelLevel, setFuelLevel] = useState('FULL') // FULL, THREE_QUARTER, HALF, QUARTER, EMPTY
  
  // Step 3: Damages & Deductions
  const [equipment, setEquipment] = useState<any[]>([])
  const [spareParts, setSpareParts] = useState<any[]>([])
  const [deductions, setDeductions] = useState<any[]>([])
  
  // Step 4: Payment
  const [depositRefund, setDepositRefund] = useState(0)
  const [totalDeductions, setTotalDeductions] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const total = deductions.reduce((sum, d) => sum + (d.quantity * d.unitPrice), 0)
    setTotalDeductions(total)
    setDepositRefund(Math.max(0, (booking.depositAmount || 0) - total))
  }, [deductions, booking.depositAmount])

  const loadData = async () => {
    try {
      // Load check-in contract data
      const contractRes = await fetch(`${API_URL}/api/contracts/booking/${booking.id}`)
      if (contractRes.ok) {
        const contract = await contractRes.json()
        setCheckInData(contract)
        setEndMileage(contract.startMileage || booking.fleetVehicle?.currentMileage || 0)
      }

      // Load equipment and spare parts for this fleet vehicle
      if (booking.fleetVehicle?.id) {
        const [eqRes, partsRes] = await Promise.all([
          fetch(`${API_URL}/api/fleet/${booking.fleetVehicle.id}/equipment`),
          fetch(`${API_URL}/api/fleet/${booking.fleetVehicle.id}/spare-parts`)
        ])
        setEquipment(await eqRes.json() || [])
        setSpareParts(await partsRes.json() || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    setUploading(true)
    for (const file of Array.from(files)) {
      try {
        const url = await api.uploadImage(file, `checkout/${booking.id}`)
        if (url) setPhotos(prev => [...prev, url])
      } catch (err) {
        console.error(err)
      }
    }
    setUploading(false)
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const addDeduction = (item: any, type: 'equipment' | 'part') => {
    const existing = deductions.find(d => d.itemId === item.id && d.type === type)
    if (existing) return

    setDeductions(prev => [...prev, {
      id: Date.now(),
      itemId: item.id,
      type,
      name: item.name,
      unitPrice: parseFloat(type === 'part' ? item.totalCost : item.price) || 0,
      quantity: 1,
      reason: ''
    }])
  }

  const updateDeduction = (id: number, field: string, value: any) => {
    setDeductions(prev => prev.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ))
  }

  const removeDeduction = (id: number) => {
    setDeductions(prev => prev.filter(d => d.id !== id))
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Update contract with checkout data
      if (checkInData?.id) {
        await fetch(`${API_URL}/api/contracts/${checkInData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETED',
            checkoutAt: new Date().toISOString(),
            endMileage,
            endFuelLevel: fuelLevel,
            checkoutPhotoUrls: photos,
            depositRefunded: depositRefund,
            totalDeductions
          })
        })

        // Create deductions
        for (const d of deductions) {
          await fetch(`${API_URL}/api/contracts/${checkInData.id}/deductions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: d.type === 'equipment' ? 'EQUIPMENT_DAMAGE' : 'PART_DAMAGE',
              description: `${d.name}${d.reason ? ' - ' + d.reason : ''}`,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              totalPrice: d.quantity * d.unitPrice,
              sparePartId: d.type === 'part' ? d.itemId : null,
              equipmentId: d.type === 'equipment' ? d.itemId : null
            })
          })
        }
      }

      // Update booking status
      await api.updateBooking(booking.id, { status: 'COMPLETED' })

      // Update fleet vehicle status and mileage
      await api.updateFleetVehicle(booking.fleetVehicle.id, { 
        status: 'AVAILABLE',
        currentMileage: endMileage
      })

      onComplete()
    } catch (e) {
      console.error(e)
      alert('Erreur lors du check-out')
    }
    setLoading(false)
  }

  const paymentMethodLabel = checkInData?.depositPaymentMethod === 'CASH' ? 'Espèces' : 'Carte bancaire'
  const paymentMethodIcon = checkInData?.depositPaymentMethod === 'CASH' ? '💵' : '💳'
  const isMotorRent = brand === 'MOTOR-RENT'

  const fuelLevels = [
    { id: 'FULL', label: 'Plein', icon: '⬛⬛⬛⬛', charge: 0 },
    { id: 'THREE_QUARTER', label: '3/4', icon: '⬛⬛⬛⬜', charge: booking.fleetVehicle?.vehicle?.fuelChargeQuarter || 5 },
    { id: 'HALF', label: '1/2', icon: '⬛⬛⬜⬜', charge: booking.fleetVehicle?.vehicle?.fuelChargeHalf || 10 },
    { id: 'QUARTER', label: '1/4', icon: '⬛⬜⬜⬜', charge: booking.fleetVehicle?.vehicle?.fuelChargeThreeQ || 15 },
    { id: 'EMPTY', label: 'Vide', icon: '⬜⬜⬜⬜', charge: booking.fleetVehicle?.vehicle?.fuelChargeEmpty || 20 }
  ]

  const selectedFuel = fuelLevels.find(f => f.id === fuelLevel)
  const fuelCharge = selectedFuel?.charge || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {booking.fleetVehicle?.vehicle?.imageUrl && (
                <img src={booking.fleetVehicle.vehicle.imageUrl} className="w-14 h-14 rounded-lg object-cover" />
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
        <div className="flex border-b">
          {['Photos', isMotorRent ? 'État / Carburant' : 'État', 'Déductions', 'Finaliser'].map((label, i) => (
            <button key={i} onClick={() => i + 1 <= step && setStep(i + 1)}
              className={'flex-1 py-3 text-center text-sm font-medium border-b-2 ' +
                (step === i + 1 ? 'border-blue-500 text-blue-600' :
                 i + 1 < step ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400')}>
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          
          {/* Step 1: Photos */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600">Prenez des photos de l'état du véhicule au retour</p>
              
              {/* Check-in photos comparison */}
              {checkInData?.vehiclePhotoUrls?.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Photos du check-in (référence)</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {checkInData.vehiclePhotoUrls.map((url: string, i: number) => (
                      <img key={i} src={url} className="w-24 h-24 object-cover rounded-lg" />
                    ))}
                  </div>
                </div>
              )}

              {/* Upload area */}
              <div className="border-2 border-dashed rounded-xl p-6 text-center">
                <label className="cursor-pointer">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-500">Cliquez pour ajouter des photos</p>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
                {uploading && <p className="text-blue-600 mt-2">Chargement...</p>}
              </div>

              {/* Uploaded photos */}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {photos.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} className="w-full h-24 object-cover rounded-lg" />
                      <button onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Vehicle State */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Mileage */}
              <div>
                <label className="block text-sm font-medium mb-2">Kilométrage au retour</label>
                <div className="flex items-center gap-4">
                  <input type="number" value={endMileage} onChange={e => setEndMileage(parseInt(e.target.value) || 0)}
                    className="w-40 border-2 rounded-lg p-3 text-lg font-mono" />
                  <span className="text-gray-500">km</span>
                  {checkInData?.startMileage && (
                    <span className="text-sm text-gray-500">
                      (Départ: {checkInData.startMileage} km → +{endMileage - checkInData.startMileage} km)
                    </span>
                  )}
                </div>
              </div>

              {/* Fuel level (Motor-Rent only) */}
              {isMotorRent && (
                <div>
                  <label className="block text-sm font-medium mb-2">Niveau de carburant</label>
                  <div className="grid grid-cols-5 gap-2">
                    {fuelLevels.map(level => (
                      <button key={level.id} onClick={() => setFuelLevel(level.id)}
                        className={'p-3 border-2 rounded-lg text-center transition ' +
                          (fuelLevel === level.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                        <div className="text-lg mb-1">{level.icon}</div>
                        <div className="text-sm font-medium">{level.label}</div>
                        {level.charge > 0 && (
                          <div className="text-xs text-red-600">+{level.charge}€</div>
                        )}
                      </button>
                    ))}
                  </div>
                  {fuelCharge > 0 && (
                    <p className="mt-2 text-sm text-red-600">
                      Supplément carburant: +{fuelCharge}€
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Deductions */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-gray-600">Ajoutez des déductions si équipements ou pièces endommagés</p>
              
              {/* Equipment */}
              <div>
                <h3 className="font-medium mb-2">Équipements fournis</h3>
                {equipment.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucun équipement configuré</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {equipment.map(eq => (
                      <button key={eq.id} onClick={() => addDeduction(eq, 'equipment')}
                        disabled={deductions.some(d => d.itemId === eq.id && d.type === 'equipment')}
                        className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        {eq.name} <span className="text-gray-500">({parseFloat(eq.price).toFixed(2)}€)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spare Parts */}
              <div>
                <h3 className="font-medium mb-2">Pièces détachées</h3>
                {spareParts.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune pièce configurée</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {spareParts.map(part => (
                      <button key={part.id} onClick={() => addDeduction(part, 'part')}
                        disabled={deductions.some(d => d.itemId === part.id && d.type === 'part')}
                        className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        {part.name} <span className="text-gray-500">({parseFloat(part.totalCost).toFixed(2)}€)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deductions list */}
              {deductions.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Déductions ajoutées</h3>
                  <div className="space-y-2">
                    {deductions.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{d.name}</p>
                          <input type="text" value={d.reason} onChange={e => updateDeduction(d.id, 'reason', e.target.value)}
                            placeholder="Raison (optionnel)" className="w-full text-sm border rounded p-1 mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" value={d.quantity} min="1"
                            onChange={e => updateDeduction(d.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 border rounded p-1 text-center" />
                          <span className="text-gray-500">×</span>
                          <span className="font-medium">{d.unitPrice.toFixed(2)}€</span>
                          <span className="text-gray-500">=</span>
                          <span className="font-bold text-red-600">{(d.quantity * d.unitPrice).toFixed(2)}€</span>
                        </div>
                        <button onClick={() => removeDeduction(d.id)} className="text-red-500 hover:text-red-700">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Finalize */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h3 className="font-medium">Récapitulatif</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Véhicule</p>
                    <p className="font-medium">{booking.fleetVehicle?.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-medium">{booking.customer?.firstName} {booking.customer?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Kilométrage parcouru</p>
                    <p className="font-medium">{endMileage - (checkInData?.startMileage || 0)} km</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Photos retour</p>
                    <p className="font-medium">{photos.length} photo(s)</p>
                  </div>
                </div>
              </div>

              {/* Deposit & Deductions */}
              <div className="p-4 border-2 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Caution versée</span>
                  <span className="font-medium">{(booking.depositAmount || 0).toFixed(2)}€</span>
                </div>
                
                {fuelCharge > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span>Supplément carburant</span>
                    <span>-{fuelCharge.toFixed(2)}€</span>
                  </div>
                )}

                {deductions.map(d => (
                  <div key={d.id} className="flex justify-between items-center text-red-600">
                    <span>{d.name} (×{d.quantity})</span>
                    <span>-{(d.quantity * d.unitPrice).toFixed(2)}€</span>
                  </div>
                ))}

                {(totalDeductions > 0 || fuelCharge > 0) && (
                  <div className="flex justify-between items-center pt-2 border-t text-red-600 font-medium">
                    <span>Total déductions</span>
                    <span>-{(totalDeductions + fuelCharge).toFixed(2)}€</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t text-lg">
                  <span className="font-medium">Caution à rembourser</span>
                  <span className="font-bold text-green-600">
                    {Math.max(0, (booking.depositAmount || 0) - totalDeductions - fuelCharge).toFixed(2)}€
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg mt-4">
                  <span className="text-2xl">{paymentMethodIcon}</span>
                  <div>
                    <p className="font-medium">Mode de remboursement: {paymentMethodLabel}</p>
                    <p className="text-xs text-gray-500">Même mode que le dépôt de caution au check-in</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
              Retour
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
            Annuler
          </button>
          <div className="flex-1" />
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Continuer
            </button>
          ) : (
            <button onClick={handleComplete} disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
              {loading ? 'Finalisation...' : 'Terminer le check-out'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckOutModal
