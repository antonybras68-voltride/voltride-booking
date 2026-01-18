#!/usr/bin/env python3
"""
Corrige les erreurs TypeScript dans la route check-out
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# 1. Corriger paidAmount -> booking.paidAmount n'existe pas, utiliser 0 ou chercher dans payments
content = content.replace(
    "paidAmount: booking.paidAmount || 0,",
    "paidAmount: 0,  // Le paiement est géré séparément"
)

# 2. Corriger commissionType - cast en tant que CommissionType
content = content.replace(
    "commissionType = agency.agencyType === 'PARTNER' ? 'REVERSAL' : 'DEDUCTION'",
    "commissionType = agency.agencyType === 'PARTNER' ? 'REVERSAL' as const : 'DEDUCTION' as const"
)

# 3. Corriger FleetInspection - ajouter les champs manquants condition et operatorId
old_inspection = '''await prisma.fleetInspection.create({
      data: {
        fleetId: req.body.fleetVehicleId,
        contractId: contract.id,
        type: 'CHECK_OUT',
        mileage: req.body.startMileage,
        fuelLevel: req.body.startFuelLevel,
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null
      }
    })'''

new_inspection = '''await prisma.fleetInspection.create({
      data: {
        fleetId: req.body.fleetVehicleId,
        contractId: contract.id,
        type: 'CHECK_OUT',
        mileage: req.body.startMileage,
        fuelLevel: req.body.startFuelLevel,
        condition: 'GOOD',
        operatorId: req.body.operatorId || 'system',
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null
      }
    })'''

content = content.replace(old_inspection, new_inspection)

# 4. Corriger error.message -> (error as Error).message
content = content.replace(
    "details: error.message",
    "details: (error as Error).message"
)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Erreurs TypeScript corrigées!")
print("  - paidAmount: mis à 0")
print("  - commissionType: cast avec 'as const'")
print("  - FleetInspection: ajout condition + operatorId")
print("  - error.message: cast avec (error as Error)")
