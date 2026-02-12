import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import crypto from 'crypto'

const router = Router()
const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

// Stockage temporaire des codes (en prod → Redis)
const verificationCodes: Map<string, { code: string; expiresAt: Date; customerId: string }> = new Map()

// ============== AUTH ==============

// 1. Envoyer un code de vérification par email
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    // Chercher le client par email
    const customer = await prisma.customer.findFirst({ where: { email: email.toLowerCase().trim() } })
    if (!customer) {
      return res.status(404).json({ error: 'No bookings found for this email' })
    }

    // Générer un code à 6 chiffres
    const code = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Stocker le code
    verificationCodes.set(email.toLowerCase().trim(), { code, expiresAt, customerId: customer.id })

    // Envoyer le code par email
    const lang = customer.language || 'es'
    const subjects: Record<string, string> = {
      es: 'Tu código de acceso',
      fr: 'Votre code d\'accès',
      en: 'Your access code'
    }
    const messages: Record<string, string> = {
      es: `Tu código de verificación es: <strong>${code}</strong><br>Este código expira en 10 minutos.`,
      fr: `Votre code de vérification est : <strong>${code}</strong><br>Ce code expire dans 10 minutes.`,
      en: `Your verification code is: <strong>${code}</strong><br>This code expires in 10 minutes.`
    }

    await resend.emails.send({
      from: 'Voltride <noreply@voltride.es>',
      to: email,
      subject: subjects[lang] || subjects.es,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2>${subjects[lang] || subjects.es}</h2>
          <div style="background: #f5f5f5; padding: 30px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0;">${code}</p>
          </div>
          <p style="color: #666; font-size: 14px;">${messages[lang] || messages.es}</p>
        </div>
      `
    })

    console.log(`[PORTAL] Code sent to ${email}`)
    res.json({ success: true, message: 'Code sent' })
  } catch (error: any) {
    console.error('[PORTAL] Login error:', error)
    res.status(500).json({ error: 'Failed to send code' })
  }
})

// 2. Vérifier le code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' })

    const stored = verificationCodes.get(email.toLowerCase().trim())
    if (!stored) return res.status(400).json({ error: 'No code found, please request a new one' })
    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(email.toLowerCase().trim())
      return res.status(400).json({ error: 'Code expired' })
    }
    if (stored.code !== code) return res.status(400).json({ error: 'Invalid code' })

    // Code valide — supprimer et retourner le client
    verificationCodes.delete(email.toLowerCase().trim())

    const customer = await prisma.customer.findUnique({ where: { id: stored.customerId } })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    res.json({
      success: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        language: customer.language
      }
    })
  } catch (error: any) {
    console.error('[PORTAL] Verify error:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// ============== BOOKINGS ==============

// 3. Liste des réservations du client
router.get('/bookings', async (req, res) => {
  try {
    const { customerId } = req.query
    if (!customerId) return res.status(400).json({ error: 'customerId required' })

    const bookings = await prisma.booking.findMany({
      where: { customerId: customerId as string },
      include: {
        agency: true,
        fleetVehicle: { include: { vehicle: true } },
        items: { include: { vehicle: true } },
        options: { include: { option: true } },
        contract: {
          include: {
            extensions: { orderBy: { createdAt: 'desc' } }
          }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    const formatted = bookings.map(b => ({
      id: b.id,
      reference: b.reference,
      startDate: b.startDate.toISOString().split('T')[0],
      endDate: b.endDate.toISOString().split('T')[0],
      startTime: b.startTime,
      endTime: b.endTime,
      totalPrice: b.totalPrice,
      paidAmount: b.paidAmount,
      depositAmount: b.depositAmount,
      status: b.status,
      checkedIn: b.checkedIn,
      checkedOut: b.checkedOut,
      language: b.language,
      source: b.source,
      paymentMethod: b.paymentMethod,
      agency: {
        id: b.agency.id,
        name: b.agency.name,
        brand: b.agency.brand
      },
      fleetVehicle: b.fleetVehicle ? {
        id: b.fleetVehicle.id,
        vehicleNumber: b.fleetVehicle.vehicleNumber,
        vehicle: {
          name: b.fleetVehicle.vehicle?.name
        }
      } : null,
      options: b.options.map(o => ({
        option: { name: o.option?.name },
        quantity: o.quantity,
        unitPrice: o.unitPrice,
        totalPrice: o.totalPrice
      })),
      contract: b.contract ? {
        id: b.contract.id,
        contractNumber: b.contract.contractNumber,
        status: b.contract.status,
        currentEndDate: b.contract.currentEndDate.toISOString().split('T')[0],
        extensions: b.contract.extensions.map(ext => ({
          id: ext.id,
          extensionNumber: ext.extensionNumber,
          previousEndDate: ext.previousEndDate.toISOString().split('T')[0],
          requestedEndDate: ext.requestedEndDate.toISOString().split('T')[0],
          additionalDays: ext.additionalDays,
          totalAmount: Number(ext.totalAmount),
          paymentStatus: ext.paymentStatus,
          status: ext.status
        }))
      } : null
    }))

    res.json(formatted)
  } catch (error: any) {
    console.error('[PORTAL] Bookings error:', error)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

// 4. Détail d'une réservation
router.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        agency: true,
        customer: true,
        fleetVehicle: { include: { vehicle: true } },
        items: { include: { vehicle: true } },
        options: { include: { option: true } },
        contract: {
          include: {
            extensions: { orderBy: { createdAt: 'desc' } },
            contractOptions: true
          }
        }
      }
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    res.json({
      id: booking.id,
      reference: booking.reference,
      startDate: booking.startDate.toISOString().split('T')[0],
      endDate: booking.endDate.toISOString().split('T')[0],
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: booking.totalPrice,
      paidAmount: booking.paidAmount,
      depositAmount: booking.depositAmount,
      status: booking.status,
      checkedIn: booking.checkedIn,
      checkedOut: booking.checkedOut,
      language: booking.language,
      agency: { id: booking.agency.id, name: booking.agency.name, brand: booking.agency.brand },
      customer: {
        id: booking.customer.id,
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        email: booking.customer.email
      },
      fleetVehicle: booking.fleetVehicle ? {
        id: booking.fleetVehicle.id,
        vehicleNumber: booking.fleetVehicle.vehicleNumber,
        vehicle: { name: booking.fleetVehicle.vehicle?.name }
      } : null,
      options: booking.options.map(o => ({
        option: { name: o.option?.name },
        quantity: o.quantity,
        unitPrice: o.unitPrice,
        totalPrice: o.totalPrice
      })),
      contract: booking.contract ? {
        id: booking.contract.id,
        contractNumber: booking.contract.contractNumber,
        status: booking.contract.status,
        dailyRate: Number(booking.contract.dailyRate),
        currentStartDate: booking.contract.currentStartDate.toISOString().split('T')[0],
        currentEndDate: booking.contract.currentEndDate.toISOString().split('T')[0],
        totalAmount: Number(booking.contract.totalAmount),
        contractPdfUrl: booking.contract.contractPdfUrl,
        extensions: booking.contract.extensions.map(ext => ({
          id: ext.id,
          extensionNumber: ext.extensionNumber,
          previousEndDate: ext.previousEndDate.toISOString().split('T')[0],
          requestedEndDate: ext.requestedEndDate.toISOString().split('T')[0],
          additionalDays: ext.additionalDays,
          totalAmount: Number(ext.totalAmount),
          paymentStatus: ext.paymentStatus,
          status: ext.status
        }))
      } : null
    })
  } catch (error: any) {
    console.error('[PORTAL] Booking detail error:', error)
    res.status(500).json({ error: 'Failed to fetch booking' })
  }
})

// ============== MODIFY BOOKING ==============

// 5. Modifier les dates d'une réservation
router.put('/bookings/:id/modify', async (req, res) => {
  try {
    const { startDate, endDate, startTime, endTime } = req.body
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { fleetVehicle: { include: { vehicle: true } }, agency: true, customer: true, contract: true }
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.checkedIn) return res.status(400).json({ error: 'Cannot modify a checked-in booking' })
    if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Booking is cancelled' })

    // Calculer le nouveau prix
    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)
    const days = Math.ceil((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24))
    const originalDays = Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const pricePerDay = booking.totalPrice / originalDays
    const newTotalPrice = Math.round(days * pricePerDay * 100) / 100

    // Mettre à jour la réservation
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        startDate: newStart,
        endDate: newEnd,
        startTime: startTime || booking.startTime,
        endTime: endTime || booking.endTime,
        totalPrice: newTotalPrice
      }
    })

    // Mettre à jour le contrat si existant
    if (booking.contract) {
      await prisma.rentalContract.update({
        where: { bookingId: booking.id },
        data: {
          currentStartDate: newStart,
          currentEndDate: newEnd,
          totalDays: days,
          totalAmount: newTotalPrice
        }
      })
    }

    // Envoyer un email de confirmation
    const lang = booking.language || 'es'
    const subjects: Record<string, string> = {
      es: 'Reserva modificada',
      fr: 'Réservation modifiée',
      en: 'Booking modified'
    }

    try {
      await resend.emails.send({
        from: 'Voltride <reservations@voltride.es>',
        to: booking.customer.email,
        subject: `${subjects[lang]} - ${booking.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2>${subjects[lang]}</h2>
            <p>Ref: ${booking.reference}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>${startDate}</strong> ${startTime} → <strong>${endDate}</strong> ${endTime}</p>
              <p>Total: <strong>${newTotalPrice}€</strong></p>
            </div>
          </div>
        `
      })
    } catch (emailError) {
      console.error('[PORTAL] Email error (non-blocking):', emailError)
    }

    // Notifier les admins
    try {
      await prisma.notification.create({
        data: {
          title: `Reserva modificada - ${booking.reference}`,
          body: `${booking.customer.firstName} ${booking.customer.lastName} ha modificado su reserva. Nuevas fechas: ${startDate} → ${endDate}`,
          data: { bookingId: booking.id, type: 'BOOKING_MODIFIED' }
        }
      })
    } catch (notifError) {
      console.error('[PORTAL] Notification error (non-blocking):', notifError)
    }

    res.json({
      success: true,
      booking: {
        ...updated,
        startDate: updated.startDate.toISOString().split('T')[0],
        endDate: updated.endDate.toISOString().split('T')[0]
      }
    })
  } catch (error: any) {
    console.error('[PORTAL] Modify error:', error)
    res.status(500).json({ error: 'Failed to modify booking' })
  }
})

// ============== CANCEL BOOKING ==============

// 6. Annuler une réservation
router.put('/bookings/:id/cancel', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { customer: true, agency: true, contract: true }
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.checkedIn) return res.status(400).json({ error: 'Cannot cancel a checked-in booking' })
    if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Already cancelled' })

    // Vérifier si remboursable (48h avant)
    const startDateTime = new Date(`${booking.startDate.toISOString().split('T')[0]}T${booking.startTime}`)
    const hoursBeforeStart = (startDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
    const refundable = hoursBeforeStart >= 48

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    })

    // Annuler le contrat si existant
    if (booking.contract) {
      await prisma.rentalContract.updateMany({
        where: { bookingId: booking.id },
        data: { status: 'CANCELLED' }
      })
    }

    // Envoyer un email de confirmation d'annulation
    const lang = booking.language || 'es'
    const subjects: Record<string, string> = {
      es: 'Reserva cancelada',
      fr: 'Réservation annulée',
      en: 'Booking cancelled'
    }
    const refundMessages: Record<string, string> = {
      es: refundable ? `Se procederá al reembolso de ${booking.paidAmount}€.` : `El anticipo de ${booking.paidAmount}€ no será reembolsado.`,
      fr: refundable ? `Le remboursement de ${booking.paidAmount}€ sera effectué.` : `L'acompte de ${booking.paidAmount}€ ne sera pas remboursé.`,
      en: refundable ? `A refund of ${booking.paidAmount}€ will be processed.` : `The deposit of ${booking.paidAmount}€ will not be refunded.`
    }

    try {
      await resend.emails.send({
        from: 'Voltride <reservations@voltride.es>',
        to: booking.customer.email,
        subject: `${subjects[lang]} - ${booking.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2>${subjects[lang]}</h2>
            <p>Ref: ${booking.reference}</p>
            <p>${refundMessages[lang]}</p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('[PORTAL] Email error (non-blocking):', emailError)
    }

    // Notifier les admins
    try {
      await prisma.notification.create({
        data: {
          title: `Reserva cancelada - ${booking.reference}`,
          body: `${booking.customer.firstName} ${booking.customer.lastName} ha cancelado su reserva. ${refundable ? 'Reembolso pendiente.' : 'Sin reembolso (< 48h).'}`,
          data: { bookingId: booking.id, type: 'BOOKING_CANCELLED' }
        }
      })
    } catch (notifError) {
      console.error('[PORTAL] Notification error (non-blocking):', notifError)
    }

    res.json({ success: true, refundable, refundAmount: refundable ? booking.paidAmount : 0 })
  } catch (error: any) {
    console.error('[PORTAL] Cancel error:', error)
    res.status(500).json({ error: 'Failed to cancel booking' })
  }
})

// ============== EXTEND BOOKING ==============

// 7. Vérifier la disponibilité pour prolongation
router.post('/bookings/:id/extend/check', async (req, res) => {
  try {
    const { newEndDate, newEndTime } = req.body
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        fleetVehicle: { include: { vehicle: true } },
        contract: true,
        agency: true
      }
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot extend this booking' })
    }
    if (!booking.fleetVehicleId) {
      return res.status(400).json({ error: 'No vehicle assigned' })
    }

    // Vérifier si le véhicule est libre entre la date de fin actuelle et la nouvelle date
    const currentEndDate = booking.contract?.currentEndDate || booking.endDate
    const requestedEnd = new Date(newEndDate)

    const conflictingBookings = await prisma.booking.findMany({
      where: {
        fleetVehicleId: booking.fleetVehicleId,
        id: { not: booking.id },
        status: { notIn: ['CANCELLED'] },
        startDate: { lt: requestedEnd },
        endDate: { gt: currentEndDate }
      }
    })

    const isAvailable = conflictingBookings.length === 0

    // Calculer le prix
    const dailyRate = booking.contract ? Number(booking.contract.dailyRate) : booking.totalPrice / Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const additionalDays = Math.ceil((requestedEnd.getTime() - currentEndDate.getTime()) / (1000 * 60 * 60 * 24))
    const subtotal = Math.round(additionalDays * dailyRate * 100) / 100
    const taxRate = 21
    const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    res.json({
      available: isAvailable,
      conflictingBookings: conflictingBookings.length,
      pricing: {
        dailyRate,
        additionalDays,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount
      },
      currentEndDate: currentEndDate.toISOString().split('T')[0],
      requestedEndDate: newEndDate
    })
  } catch (error: any) {
    console.error('[PORTAL] Extend check error:', error)
    res.status(500).json({ error: 'Failed to check availability' })
  }
})

// 8. Confirmer la prolongation
router.post('/bookings/:id/extend/confirm', async (req, res) => {
  try {
    const { newEndDate, newEndTime, paymentMethod } = req.body // paymentMethod: 'stripe' | 'agency'
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        fleetVehicle: { include: { vehicle: true } },
        contract: true,
        agency: true,
        customer: true
      }
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (!booking.contract) return res.status(400).json({ error: 'No contract found' })

    const currentEndDate = booking.contract.currentEndDate
    const requestedEnd = new Date(newEndDate)
    const additionalDays = Math.ceil((requestedEnd.getTime() - currentEndDate.getTime()) / (1000 * 60 * 60 * 24))
    const dailyRate = Number(booking.contract.dailyRate)
    const subtotal = Math.round(additionalDays * dailyRate * 100) / 100
    const taxRate = Number(booking.contract.taxRate) || 21
    const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    // Générer le numéro d'extension
    const extCount = await prisma.contractExtension.count({ where: { contractId: booking.contract.id } })
    const extensionNumber = `${booking.contract.contractNumber}-EXT${extCount + 1}`

    // Créer l'extension
    const extension = await prisma.contractExtension.create({
      data: {
        extensionNumber,
        contractId: booking.contract.id,
        previousEndDate: currentEndDate,
        requestedEndDate: requestedEnd,
        approvedEndDate: requestedEnd,
        additionalDays,
        requestSource: 'CUSTOMER_SELF_SERVICE',
        availabilityStatus: 'AVAILABLE',
        availabilityCheckedAt: new Date(),
        currentVehicleAvailable: true,
        solutionType: 'SAME_VEHICLE',
        dailyRate,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        paymentStatus: paymentMethod === 'stripe' ? 'PENDING' : 'PENDING',
        status: paymentMethod === 'stripe' ? 'PENDING_PAYMENT' : 'APPROVED',
        notes: paymentMethod === 'agency' ? 'Pago en agencia al devolver' : null
      }
    })

    // Mettre à jour le contrat et la réservation
    await prisma.rentalContract.update({
      where: { id: booking.contract.id },
      data: {
        currentEndDate: requestedEnd,
        totalDays: Math.ceil((requestedEnd.getTime() - booking.contract.currentStartDate.getTime()) / (1000 * 60 * 60 * 24)),
        totalAmount: { increment: totalAmount }
      }
    })

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        endDate: requestedEnd,
        endTime: newEndTime || booking.endTime,
        totalPrice: { increment: totalAmount }
      }
    })

    // Envoyer email au client
    const lang = booking.language || 'es'
    const subjects: Record<string, string> = {
      es: 'Reserva prolongada',
      fr: 'Réservation prolongée',
      en: 'Booking extended'
    }
    const paymentMessages: Record<string, Record<string, string>> = {
      stripe: {
        es: `El pago de ${totalAmount}€ ha sido procesado.`,
        fr: `Le paiement de ${totalAmount}€ a été traité.`,
        en: `Payment of ${totalAmount}€ has been processed.`
      },
      agency: {
        es: `El importe de ${totalAmount}€ será cobrado en agencia al devolver el vehículo.`,
        fr: `Le montant de ${totalAmount}€ sera encaissé en agence au retour du véhicule.`,
        en: `The amount of ${totalAmount}€ will be charged at the agency upon return.`
      }
    }

    try {
      const formatDateEmail = (d: Date) => d.toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR')

      await resend.emails.send({
        from: 'Voltride <reservations@voltride.es>',
        to: booking.customer.email,
        subject: `${subjects[lang]} - ${booking.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2>${subjects[lang]}</h2>
            <p>Ref: ${booking.reference}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p>Nueva fecha de fin: <strong>${formatDateEmail(requestedEnd)}</strong></p>
              <p>+${additionalDays} día(s) — ${totalAmount}€</p>
            </div>
            <p>${paymentMessages[paymentMethod]?.[lang] || ''}</p>
            <p>Contrato: <strong>${extensionNumber}</strong></p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('[PORTAL] Email error (non-blocking):', emailError)
    }

    // Notifier les admins/opérateurs
    try {
      const paymentNote = paymentMethod === 'agency' ? '⚠️ PAGO PENDIENTE EN AGENCIA' : 'Pagado por Stripe'
      await prisma.notification.create({
        data: {
          title: `Prolongación - ${booking.reference}`,
          body: `${booking.customer.firstName} ${booking.customer.lastName} ha prolongado su reserva hasta ${newEndDate}. +${additionalDays} día(s) = ${totalAmount}€. ${paymentNote}`,
          data: {
            bookingId: booking.id,
            extensionId: extension.id,
            type: 'BOOKING_EXTENDED',
            paymentMethod,
            amount: totalAmount
          }
        }
      })
    } catch (notifError) {
      console.error('[PORTAL] Notification error (non-blocking):', notifError)
    }

    res.json({
      success: true,
      extension: {
        id: extension.id,
        extensionNumber: extension.extensionNumber,
        additionalDays,
        totalAmount,
        paymentMethod,
        status: extension.status
      }
    })
  } catch (error: any) {
    console.error('[PORTAL] Extend confirm error:', error)
    res.status(500).json({ error: 'Failed to extend booking' })
  }
})

export default router