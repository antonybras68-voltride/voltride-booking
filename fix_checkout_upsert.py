#!/usr/bin/env python3
"""
Modifie la route check-out pour gérer le cas où un contrat existe déjà
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# Remplacer la création du contrat par un upsert
old_create = '''    // Créer le contrat
    console.log('Creating contract with:', {
      contractNumber,
      bookingId: booking.id,
      fleetVehicleId: req.body.fleetVehicleId,
      totalDays,
      depositAmount: fleetVehicle.vehicle?.deposit
    })
    const contract = await prisma.rentalContract.create({
      data: {'''

new_create = '''    // Vérifier si un contrat existe déjà pour cette réservation
    const existingContract = await prisma.rentalContract.findFirst({
      where: { bookingId: booking.id }
    })
    
    console.log('Existing contract:', existingContract?.id || 'none')
    console.log('Creating/updating contract with:', {
      contractNumber,
      bookingId: booking.id,
      fleetVehicleId: req.body.fleetVehicleId,
      totalDays,
      depositAmount: fleetVehicle.vehicle?.deposit
    })
    
    // Créer ou mettre à jour le contrat
    const contract = existingContract 
      ? await prisma.rentalContract.update({
          where: { id: existingContract.id },
          data: {'''

content = content.replace(old_create, new_create)

# Trouver la fin du bloc de données et ajouter la logique de création
old_contract_end = '''        commissionRate,
        commissionAmount,
        commissionType,
        commissionStatus: commissionRate ? 'PENDING' : undefined
      }
    })
    console.log('Contract created:', contract.id)'''

new_contract_end = '''        commissionRate,
        commissionAmount,
        commissionType,
        commissionStatus: commissionRate ? 'PENDING' as const : undefined
      }
    })
      : await prisma.rentalContract.create({
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
            paidAmount: 0,
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
            commissionStatus: commissionRate ? 'PENDING' as const : undefined
          }
        })
    console.log('Contract created/updated:', contract.id)'''

content = content.replace(old_contract_end, new_contract_end)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Route check-out modifiée pour gérer les contrats existants")
