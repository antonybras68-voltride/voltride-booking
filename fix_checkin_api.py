#!/usr/bin/env python3
"""
Ajoute la route POST /api/bookings/:id/check-out (départ client)
et modifie le CheckInModal pour l'utiliser
"""

filepath_api = "/workspaces/voltride-booking/apps/api/src/index.ts"
filepath_operator = "/workspaces/voltride-booking/apps/operator/src/api.ts"
filepath_checkin = "/workspaces/voltride-booking/apps/operator/src/CheckInModal.tsx"

# 1. Ajouter la route dans l'API
new_route = '''
// ============== BOOKING CHECK-OUT (Départ client) ==============
app.post('/api/bookings/:id/check-out', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { customer: true, agency: true, items: { include: { vehicle: true } } }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    
    const agency = booking.agency
    const contractNumber = await generateContractNumber(agency.code)
    
    // Récupérer le véhicule de flotte
    const fleetVehicle = await prisma.fleet.findUnique({
      where: { id: req.body.fleetVehicleId },
      include: { vehicle: true }
    })
    if (!fleetVehicle) return res.status(400).json({ error: 'Fleet vehicle not found' })
    
    // Calculer les jours
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Commission si agence partenaire/franchise
    let commissionRate = null
    let commissionAmount = null
    let commissionType = null
    if (agency.agencyType === 'PARTNER' || agency.agencyType === 'FRANCHISE') {
      commissionRate = agency.commissionRate || 0
      commissionAmount = Math.round(booking.totalPrice * commissionRate * 100) / 100
      commissionType = agency.agencyType === 'PARTNER' ? 'REVERSAL' : 'DEDUCTION'
    }
    
    // Créer le contrat
    const contract = await prisma.rentalContract.create({
      data: {
        contractNumber,
        bookingId: booking.id,
        fleetVehicleId: req.body.fleetVehicleId,
        agencyId: booking.agencyId,
        customerId: booking.customerId,
        originalStartDate: startDate,
        originalEndDate: endDate,
        currentStartDate: startDate,
        currentEndDate: endDate,
        actualStartDate: new Date(),
        source: booking.source === 'WIDGET' ? 'ONLINE_WIDGET' : booking.source === 'WALK_IN' ? 'WALK_IN' : 'PHONE',
        dailyRate: booking.totalPrice / totalDays,
        totalDays,
        subtotal: booking.totalPrice,
        optionsTotal: 0,
        discountAmount: req.body.discountAmount || 0,
        discountReason: req.body.discountReason || null,
        taxRate: 21,
        taxAmount: Math.round(booking.totalPrice * 0.21 * 100) / 100,
        totalAmount: booking.totalPrice,
        depositAmount: fleetVehicle.vehicle?.deposit || 500,
        depositMethod: req.body.depositMethod || 'CARD',
        depositStatus: req.body.depositStatus || 'PENDING',
        depositCapturedAt: req.body.depositStatus === 'CAPTURED' ? new Date() : null,
        paymentMethod: req.body.paymentMethod || 'CARD',
        paymentStatus: req.body.paymentStatus || 'PENDING',
        paidAmount: booking.paidAmount || 0,
        startMileage: req.body.startMileage,
        startFuelLevel: req.body.startFuelLevel,
        photoFront: req.body.photoFront,
        photoLeft: req.body.photoLeft,
        photoRight: req.body.photoRight,
        photoRear: req.body.photoRear,
        photoCounter: req.body.photoCounter,
        damageSchema: req.body.damageSchema,
        equipmentChecklist: req.body.equipmentChecklist,
        customerIdCardUrl: req.body.customerIdCardUrl,
        customerIdCardVersoUrl: req.body.customerIdCardVersoUrl,
        customerLicenseUrl: req.body.customerLicenseUrl,
        customerLicenseVersoUrl: req.body.customerLicenseVersoUrl,
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null,
        termsAcceptedAt: req.body.termsAcceptedAt ? new Date(req.body.termsAcceptedAt) : null,
        termsLanguage: req.body.termsLanguage,
        status: 'ACTIVE',
        commissionRate,
        commissionAmount,
        commissionType,
        commissionStatus: commissionRate ? 'PENDING' : undefined
      }
    })
    
    // Mettre à jour la réservation
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        fleetVehicleId: req.body.fleetVehicleId,
        assignmentType: 'MANUAL',
        assignedAt: new Date()
      }
    })
    
    // Mettre à jour le véhicule
    await prisma.fleet.update({
      where: { id: req.body.fleetVehicleId },
      data: {
        status: 'RENTED',
        currentMileage: req.body.startMileage
      }
    })
    
    // Créer l'inspection de départ
    await prisma.fleetInspection.create({
      data: {
        fleetId: req.body.fleetVehicleId,
        contractId: contract.id,
        type: 'CHECK_OUT',
        mileage: req.body.startMileage,
        fuelLevel: req.body.startFuelLevel,
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null
      }
    })
    
    res.json(contract)
  } catch (error) {
    console.error('Check-out error:', error)
    res.status(500).json({ error: 'Failed to process check-out', details: error.message })
  }
})

'''

with open(filepath_api, 'r') as f:
    content = f.read()

# Ajouter avant la ligne "// ============== CONTRACT DEDUCTIONS =="
marker = "// ============== CONTRACT DEDUCTIONS =="
if marker in content and "POST /api/bookings/:id/check-out" not in content:
    content = content.replace(marker, new_route + marker)
    with open(filepath_api, 'w') as f:
        f.write(content)
    print("✓ Route /api/bookings/:id/check-out ajoutée à l'API")
else:
    print("⚠️ Route déjà existante ou marker non trouvé")

# 2. Modifier api.ts pour utiliser la nouvelle route
with open(filepath_operator, 'r') as f:
    api_content = f.read()

old_create = '''  createContract: async (data) => {
    const res = await fetch(API_URL + '/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },'''

new_create = '''  createContract: async (data) => {
    // Si on a un bookingId, utiliser la route check-out
    if (data.bookingId) {
      const res = await fetch(API_URL + '/api/bookings/' + data.bookingId + '/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return res.json()
    }
    // Sinon, créer un contrat walk-in
    const res = await fetch(API_URL + '/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },'''

if old_create in api_content:
    api_content = api_content.replace(old_create, new_create)
    with open(filepath_operator, 'w') as f:
        f.write(api_content)
    print("✓ api.ts modifié pour utiliser /api/bookings/:id/check-out")
else:
    print("⚠️ createContract non trouvé dans api.ts")

print("\n✅ Modifications terminées!")
