import webpush from 'web-push';
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'voltride-secret-key-2024'
import { generateContractPDF, generateInvoicePDF } from './pdfGenerator'

const stripeVoltride = process.env.STRIPE_SECRET_KEY_VOLTRIDE ? new Stripe(process.env.STRIPE_SECRET_KEY_VOLTRIDE, { apiVersion: '2024-12-18.acacia' as any }) : null
const stripeMotorrent = process.env.STRIPE_SECRET_KEY_MOTORRENT ? new Stripe(process.env.STRIPE_SECRET_KEY_MOTORRENT, { apiVersion: '2024-12-18.acacia' as any }) : null


const getStripeInstance = (brand: string) => {
  const stripe = brand === 'MOTOR-RENT' ? stripeMotorrent : stripeVoltride; if (!stripe) throw new Error('Stripe not configured'); return stripe
}




const app = express()
const prisma = new PrismaClient()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============== AGENCIES ==============
app.get('/api/agencies', async (req, res) => {
  try {
    const agencies = await prisma.agency.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } })
    res.json(agencies)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch agencies' }) }
})

app.post('/api/agencies', async (req, res) => {
  try {
    const agency = await prisma.agency.create({
      data: { code: req.body.code, name: req.body.name, address: req.body.address, city: req.body.city, postalCode: req.body.postalCode, country: req.body.country || 'ES', phone: req.body.phone, email: req.body.email, brand: req.body.brand || 'VOLTRIDE', isActive: req.body.isActive ?? true, closedOnSunday: req.body.closedOnSunday ?? false, agencyType: req.body.agencyType || 'OWN', commissionRate: req.body.commissionRate || null, commissionEmail: req.body.commissionEmail || null, showStockUrgency: req.body.showStockUrgency || false }
    })
    res.json(agency)
  } catch (error) { res.status(500).json({ error: 'Failed to create agency' }) }
})

app.put('/api/agencies/:id', async (req, res) => {
  try {
    const agency = await prisma.agency.update({ where: { id: req.params.id }, data: { code: req.body.code, name: req.body.name, address: req.body.address, city: req.body.city, postalCode: req.body.postalCode, country: req.body.country, phone: req.body.phone, email: req.body.email, brand: req.body.brand, isActive: req.body.isActive, closedOnSunday: req.body.closedOnSunday, agencyType: req.body.agencyType, commissionRate: req.body.commissionRate, commissionEmail: req.body.commissionEmail, showStockUrgency: req.body.showStockUrgency } })
    res.json(agency)
  } catch (error) { res.status(500).json({ error: 'Failed to update agency' }) }
})

app.delete('/api/agencies/:id', async (req, res) => {
  try { await prisma.agency.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ error: 'Failed to delete agency' }) }
})

// ============== CATEGORIES ==============
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { code: 'asc' }, include: { _count: { select: { vehicles: true } }, options: { include: { option: true } } } })
    res.json(categories)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch categories' }) }
})

app.post('/api/categories', async (req, res) => {
  try {
    const category = await prisma.category.create({ data: { code: req.body.code, name: req.body.name, brand: req.body.brand || 'VOLTRIDE', bookingFee: req.body.bookingFee || 0 } })
    res.json(category)
  } catch (error) { res.status(500).json({ error: 'Failed to create category' }) }
})

app.put('/api/categories/:id', async (req, res) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: { code: req.body.code, name: req.body.name, brand: req.body.brand, bookingFee: req.body.bookingFee } })
    res.json(category)
  } catch (error) { res.status(500).json({ error: 'Failed to update category' }) }
})

app.delete('/api/categories/:id', async (req, res) => {
  try { await prisma.category.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ error: 'Failed to delete category' }) }
})

// ============== VEHICLES ==============
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { isActive: true }, include: { category: true, pricing: true, inventory: true }, orderBy: { sku: 'asc' } })
    res.json(vehicles)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch vehicles' }) }
})

app.post('/api/vehicles', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.create({
      data: { sku: req.body.sku, name: req.body.name, description: req.body.description || {}, deposit: req.body.deposit, hasPlate: req.body.hasPlate || false, licenseType: req.body.licenseType || '', kmIncluded: req.body.kmIncluded || '', helmetIncluded: req.body.helmetIncluded ?? true, kmIncludedPerDay: req.body.kmIncludedPerDay || 100, extraKmPrice: req.body.extraKmPrice || 0.15, imageUrl: req.body.imageUrl, categoryId: req.body.categoryId, isActive: req.body.isActive ?? true, pricing: { create: req.body.pricing || {} } },
      include: { category: true, pricing: true }
    })
    res.json(vehicle)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create vehicle' }) }
})

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: { sku: req.body.sku, name: req.body.name, description: req.body.description, deposit: req.body.deposit, hasPlate: req.body.hasPlate, licenseType: req.body.licenseType, kmIncluded: req.body.kmIncluded, helmetIncluded: req.body.helmetIncluded, kmIncludedPerDay: req.body.kmIncludedPerDay, extraKmPrice: req.body.extraKmPrice, imageUrl: req.body.imageUrl, categoryId: req.body.categoryId, isActive: req.body.isActive }, include: { category: true, pricing: true } })
    if (req.body.pricing) { await prisma.pricing.updateMany({ where: { vehicleId: req.params.id }, data: req.body.pricing }) }
    res.json(vehicle)
  } catch (error) { res.status(500).json({ error: 'Failed to update vehicle' }) }
})

app.delete('/api/vehicles/:id', async (req, res) => {
  try { await prisma.vehicle.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ error: 'Failed to delete vehicle' }) }
})

// ============== FLEET AVAILABILITY FOR WIDGET ==============
// Retourne le nombre de véhicules Fleet disponibles par type de véhicule pour une agence et des dates
app.get('/api/fleet-availability', async (req, res) => {
  try {
    const { agencyId, startDate, endDate } = req.query
    
    if (!agencyId) {
      return res.status(400).json({ error: 'agencyId required' })
    }

    // Récupérer tous les véhicules Fleet de cette agence qui sont AVAILABLE
    const fleetVehicles = await prisma.fleet.findMany({
      where: {
        agencyId: agencyId as string,
        status: { in: ['AVAILABLE', 'RESERVED'] } // RESERVED peut être dispo pour d'autres dates
      },
      include: {
        vehicle: true,
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING', 'ACTIVE'] }
          }
        }
      }
    })

    // Si des dates sont fournies, filtrer par disponibilité
    const start = startDate ? new Date(startDate as string) : null
    const end = endDate ? new Date(endDate as string) : null

    // Compter les véhicules disponibles par type (vehicleId)
    const availabilityMap: Record<string, number> = {}

    fleetVehicles.forEach(fleet => {
      const vehicleId = fleet.vehicleId
      
      // Vérifier si ce véhicule Fleet est disponible pour les dates demandées
      let isAvailable = true
      
      if (start && end) {
        isAvailable = !fleet.bookings.some(booking => {
          const bookingStart = new Date(booking.startDate)
          const bookingEnd = new Date(booking.endDate)
          // Conflit si les périodes se chevauchent
          return !(end <= bookingStart || start >= bookingEnd)
        })
      }

      if (isAvailable) {
        availabilityMap[vehicleId] = (availabilityMap[vehicleId] || 0) + 1
      }
    })

    res.json(availabilityMap)
  } catch (error) {
    console.error('Fleet availability error:', error)
    res.status(500).json({ error: 'Failed to get fleet availability' })
  }
})



// ============== OPTIONS ==============
app.get('/api/options', async (req, res) => {
  try {
    const options = await prisma.option.findMany({ where: { isActive: true }, include: { categories: { include: { category: true } } }, orderBy: [{ includedByDefault: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }] })
    res.json(options)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch options' }) }
})

app.post('/api/options', async (req, res) => {
  try {
    const option = await prisma.option.create({
      data: {
        code: req.body.code, name: req.body.name, description: req.body.description, maxQuantity: req.body.maxQuantity || 10, includedByDefault: req.body.includedByDefault || false, imageUrl: req.body.imageUrl || null,
        day1: req.body.day1 || 0, day2: req.body.day2 || 0, day3: req.body.day3 || 0, day4: req.body.day4 || 0, day5: req.body.day5 || 0, day6: req.body.day6 || 0, day7: req.body.day7 || 0,
        day8: req.body.day8 || 0, day9: req.body.day9 || 0, day10: req.body.day10 || 0, day11: req.body.day11 || 0, day12: req.body.day12 || 0, day13: req.body.day13 || 0, day14: req.body.day14 || 0,
        isActive: req.body.isActive ?? true
      }
    })
    if (req.body.categoryIds && req.body.categoryIds.length > 0) {
      await prisma.optionCategory.createMany({ data: req.body.categoryIds.map((catId: string) => ({ optionId: option.id, categoryId: catId })) })
    }
    res.json(option)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create option' }) }
})

// Reorder options
app.put("/api/options/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const updates = orderedIds.map((id: string, index: number) =>
      prisma.option.update({ where: { id }, data: { sortOrder: index } })
    );
    await Promise.all(updates);
    res.json({ success: true });
  } catch (error) {
    console.error("Reorder options error:", error);
    res.status(500).json({ error: "Failed to reorder options" });
  }
});
app.put('/api/options/:id', async (req, res) => {
  try {
    const option = await prisma.option.update({
      where: { id: req.params.id },
      data: {
        code: req.body.code, name: req.body.name, description: req.body.description, maxQuantity: req.body.maxQuantity, includedByDefault: req.body.includedByDefault, imageUrl: req.body.imageUrl,
        day1: req.body.day1, day2: req.body.day2, day3: req.body.day3, day4: req.body.day4, day5: req.body.day5, day6: req.body.day6, day7: req.body.day7,
        day8: req.body.day8, day9: req.body.day9, day10: req.body.day10, day11: req.body.day11, day12: req.body.day12, day13: req.body.day13, day14: req.body.day14,
        isActive: req.body.isActive
      }
    })
    if (req.body.categoryIds) {
      await prisma.optionCategory.deleteMany({ where: { optionId: req.params.id } })
      if (req.body.categoryIds.length > 0) {
        await prisma.optionCategory.createMany({ data: req.body.categoryIds.map((catId: string) => ({ optionId: option.id, categoryId: catId })) })
      }
    }
    res.json(option)
  } catch (error) { res.status(500).json({ error: 'Failed to update option' }) }
})

app.delete('/api/options/:id', async (req, res) => {
  try { await prisma.option.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ error: 'Failed to delete option' }) }
})

// ============== INVENTORY ==============
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({ include: { vehicle: { include: { category: true, pricing: true } }, agency: true } })
    res.json(inventory)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch inventory' }) }
})


// ============== CUSTOMERS ==============
app.get('/api/customers', async (req, res) => {
  try { const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }); res.json(customers) }
  catch (error) { res.status(500).json({ error: 'Failed to fetch customers' }) }
})

// Supprimer un client
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.booking.deleteMany({ where: { customerId: id } });
    await prisma.rentalContract.deleteMany({ where: { customerId: id } });
    await prisma.customer.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// Créer un client (avec vérification doublons)
app.post('/api/customers', async (req, res) => {
  try {
    const { email, phone } = req.body
    
    // Vérifier si un client existe déjà avec cet email ou téléphone
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone }
        ]
      }
    })
    
    if (existingCustomer) {
      return res.status(400).json({ 
        error: 'duplicate',
        message: existingCustomer.email === email ? 'Un client avec cet email existe déjà' : 'Un client avec ce téléphone existe déjà',
        existingCustomer
      })
    }
    
    const customer = await prisma.customer.create({
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        postalCode: req.body.postalCode,
        city: req.body.city,
        country: req.body.country || 'ES',
        language: req.body.language || 'es'
      }
    })
    res.json(customer)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create customer' })
  }
})

// Modifier un client
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { email, phone } = req.body
    
    // Vérifier si un autre client existe avec cet email ou téléphone
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { email: email },
              { phone: phone }
            ]
          }
        ]
      }
    })
    
    if (existingCustomer) {
      return res.status(400).json({ 
        error: 'duplicate',
        message: existingCustomer.email === email ? 'Un client avec cet email existe déjà' : 'Un client avec ce téléphone existe déjà',
        existingCustomer
      })
    }
    
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        postalCode: req.body.postalCode,
        city: req.body.city,
        country: req.body.country,
        language: req.body.language
      }
    })
    res.json(customer)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update customer' })
  }
})

// ============== BOOKINGS ==============
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({ include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } } }, orderBy: { createdAt: 'desc' } })
    res.json(bookings)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch bookings' }) }
})

// Generateur de numero de reservation sequentiel
const generateBookingReference = async (brand: string) => {
  const prefix = brand === 'MOTOR-RENT' ? 'MR-' : 'VR-'
  
  const lastBooking = await prisma.booking.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' }
  })
  
  let nextNumber = 1
  if (lastBooking) {
    const lastNumber = parseInt(lastBooking.reference.replace(prefix, ''))
    if (!isNaN(lastNumber)) nextNumber = lastNumber + 1
  }
  
  return prefix + String(nextNumber).padStart(5, '0')
}

app.post('/api/bookings', async (req, res) => {
  try {
    // Recuperer l'agence pour connaitre la marque
    const agency = await prisma.agency.findUnique({ where: { id: req.body.agencyId } })
    const reference = await generateBookingReference(agency?.brand || 'VOLTRIDE')
    let customer = await prisma.customer.findFirst({ where: { email: req.body.customer.email } })
    if (!customer) {
      customer = await prisma.customer.create({ data: { firstName: req.body.customer.firstName, lastName: req.body.customer.lastName, email: req.body.customer.email, phone: req.body.customer.phone, address: req.body.customer.address, postalCode: req.body.customer.postalCode, city: req.body.customer.city, country: req.body.customer.country || 'ES', language: req.body.customer.language || 'es' } })
    }
    // Créer la réservation d'abord
    const booking = await prisma.booking.create({
      data: {
        reference,
        agencyId: req.body.agencyId, customerId: customer.id, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate), startTime: req.body.startTime, endTime: req.body.endTime, totalPrice: req.body.totalPrice, depositAmount: req.body.depositAmount, language: req.body.language || 'es',
        source: 'WIDGET',
        items: { create: req.body.items.map((item: any) => ({ vehicleId: item.vehicleId, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice })) },
        options: { create: (req.body.options || []).map((opt: any) => ({ optionId: opt.optionId, quantity: opt.quantity, unitPrice: opt.unitPrice, totalPrice: opt.totalPrice })) }
      },
      include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } } }
    })

    // Auto-assignation pour les réservations WIDGET
    if (booking.items && booking.items.length > 0) {
      const vehicleTypeId = booking.items[0].vehicleId
      const { fleetId, reason } = await autoAssignVehicle(
        booking.id,
        vehicleTypeId,
        booking.agencyId,
        new Date(req.body.startDate),
        new Date(req.body.endDate)
      )
      
      if (fleetId) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            fleetVehicleId: fleetId,
            assignmentType: 'AUTOMATIC',
            assignedAt: new Date()
          }
        })
        console.log(`Booking ${booking.reference} auto-assigned to fleet ${fleetId}: ${reason}`)
      } else {
        console.log(`Booking ${booking.reference} not auto-assigned: ${reason}`)
      }
    }

    // Recharger le booking avec les infos d'assignation
    const finalBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } }, fleetVehicle: true }
    })
    
    res.json(finalBooking)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create booking' }) }
})

app.put('/api/bookings/:id/status', async (req, res) => {
  try { const booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status: req.body.status } }); res.json(booking) }
  catch (error) { res.status(500).json({ error: 'Failed to update booking status' }) }
})
// Cancel booking
app.put("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" }
    });
    res.json(booking);
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }

})

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    // Supprimer d'abord les items et options liés
    await prisma.bookingItem.deleteMany({ where: { bookingId: req.params.id } })
    await prisma.bookingOption.deleteMany({ where: { bookingId: req.params.id } })
    // Supprimer la réservation
    await prisma.booking.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete booking error:', error)
    res.status(500).json({ error: 'Failed to delete booking' })
  }
})

// ============== STRIPE CHECKOUT ==============
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { brand, bookingId, amount, customerEmail, successUrl, cancelUrl } = req.body
    const stripe = getStripeInstance(brand)
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: brand === 'MOTOR-RENT' ? 'Réservation Motor-Rent' : 'Réservation Voltride',
            description: `Acompte réservation #${bookingId}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: bookingId,
        brand: brand
      }
    })
    
    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// ============== STRIPE WEBHOOK ==============
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const bookingId = session.metadata?.bookingId
      
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' }
        })
      }
    }
    
    res.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(400).json({ error: 'Webhook error' })
  }
})

const PORT = parseInt(process.env.PORT || '8080', 10)

// ============== TABLET SESSIONS ==============

// Get pending session for agency (tablet polls this)
app.get('/api/tablet-sessions/agency/:agencyId', async (req, res) => {
  try {
    const session = await prisma.tabletSession.findFirst({
      where: {
        agencyId: req.params.agencyId,
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Get session by ID
app.get('/api/tablet-sessions/:sessionId', async (req, res) => {
  try {
    const session = await prisma.tabletSession.findUnique({
      where: { sessionId: req.params.sessionId }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Create new session (from operator app)
app.post('/api/tablet-sessions', async (req, res) => {
  try {
    const session = await prisma.tabletSession.create({
      data: {
        sessionId: req.body.sessionId,
        bookingId: req.body.bookingId,
        agencyId: req.body.agencyId,
        type: req.body.type || 'checkin',
        language: req.body.language || 'fr',
        customerName: req.body.customerName,
        cgvText: req.body.cgvText,
        rgpdText: req.body.rgpdText,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
      }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Update session (signature from tablet)
app.put('/api/tablet-sessions/:sessionId', async (req, res) => {
  try {
    const session = await prisma.tabletSession.update({
      where: { sessionId: req.params.sessionId },
      data: {
        signature: req.body.signature,
        termsAccepted: req.body.termsAccepted,
        rgpdAccepted: req.body.rgpdAccepted,
        status: req.body.status || 'signed',
        signedAt: req.body.status === 'signed' ? new Date() : undefined
      }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Delete/cancel session
app.delete('/api/tablet-sessions/:sessionId', async (req, res) => {
  try {
    await prisma.tabletSession.delete({
      where: { sessionId: req.params.sessionId }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})



// ============== WALKIN SESSIONS ==============

// Get pending walkin for agency (tablet polls this)
app.get('/api/walkin-sessions/agency/:agencyId', async (req, res) => {
  try {
    const session = await prisma.walkinSession.findFirst({
      where: {
        agencyId: req.params.agencyId,
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Get pending walkin for multiple agencies (tablet polls this)
app.get('/api/walkin-sessions/agencies', async (req, res) => {
  try {
    const agencyIds = (req.query.ids as string)?.split(',') || []
    const session = await prisma.walkinSession.findFirst({
      where: {
        agencyId: { in: agencyIds },
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Get walkin by sessionId
app.get('/api/walkin-sessions/:sessionId', async (req, res) => {
  try {
    const session = await prisma.walkinSession.findUnique({
      where: { sessionId: req.params.sessionId }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Create walkin session (from operator app)
app.post('/api/walkin-sessions', async (req, res) => {
  try {
    const session = await prisma.walkinSession.create({
      data: {
        sessionId: req.body.sessionId,
        agencyId: req.body.agencyId,
        language: req.body.language || 'fr',
        brand: req.body.brand,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Update walkin session (customer data from tablet)
app.put('/api/walkin-sessions/:sessionId', async (req, res) => {
  try {
    const session = await prisma.walkinSession.update({
      where: { sessionId: req.params.sessionId },
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        phonePrefix: req.body.phonePrefix,
        address: req.body.address,
        city: req.body.city,
        postalCode: req.body.postalCode,
        country: req.body.country,
        status: req.body.status || 'completed',
        completedAt: req.body.status === 'completed' ? new Date() : undefined
      }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Delete walkin session
app.delete('/api/walkin-sessions/:sessionId', async (req, res) => {
  try {
    await prisma.walkinSession.delete({
      where: { sessionId: req.params.sessionId }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Update tablet-sessions to support multiple agencies
app.get('/api/tablet-sessions/agencies', async (req, res) => {
  try {
    const agencyIds = (req.query.ids as string)?.split(',') || []
    const session = await prisma.tabletSession.findFirst({
      where: {
        agencyId: { in: agencyIds },
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(session)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})



// ============== FLEET EQUIPMENT ==============

app.get('/api/fleet/:fleetId/equipment', async (req, res) => {
  try {
    const equipment = await prisma.fleetEquipment.findMany({
      where: { fleetId: req.params.fleetId, isActive: true },
      orderBy: { name: 'asc' }
    })
    res.json(equipment)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/fleet/:fleetId/equipment', async (req, res) => {
  try {
    const equipment = await prisma.fleetEquipment.create({
      data: {
        fleetId: req.params.fleetId,
        name: req.body.name,
        description: req.body.description,
        quantity: req.body.quantity || 1,
        price: req.body.price || 0,
        condition: req.body.condition || 'GOOD',
        isIncluded: req.body.isIncluded ?? true
      }
    })
    res.json(equipment)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/fleet/equipment/:id', async (req, res) => {
  try {
    const equipment = await prisma.fleetEquipment.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(equipment)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/fleet/equipment/:id', async (req, res) => {
  try {
    await prisma.fleetEquipment.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ============== FLEET CONTRACT FIELDS ==============

app.get('/api/fleet/:fleetId/contract-fields', async (req, res) => {
  try {
    const fields = await prisma.fleetContractField.findMany({
      where: { fleetId: req.params.fleetId },
      orderBy: { displayOrder: 'asc' }
    })
    res.json(fields)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/fleet/:fleetId/contract-fields', async (req, res) => {
  try {
    const field = await prisma.fleetContractField.upsert({
      where: { 
        fleetId_fieldName: { 
          fleetId: req.params.fleetId, 
          fieldName: req.body.fieldName 
        } 
      },
      update: {
        displayOrder: req.body.displayOrder,
        showInContract: req.body.showInContract
      },
      create: {
        fleetId: req.params.fleetId,
        fieldName: req.body.fieldName,
        displayOrder: req.body.displayOrder || 0,
        showInContract: req.body.showInContract ?? true
      }
    })
    res.json(field)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/fleet/:fleetId/contract-fields/batch', async (req, res) => {
  try {
    const fields = req.body.fields || []
    for (const field of fields) {
      await prisma.fleetContractField.upsert({
        where: { 
          fleetId_fieldName: { 
            fleetId: req.params.fleetId, 
            fieldName: field.fieldName 
          } 
        },
        update: {
          displayOrder: field.displayOrder,
          showInContract: field.showInContract
        },
        create: {
          fleetId: req.params.fleetId,
          fieldName: field.fieldName,
          displayOrder: field.displayOrder || 0,
          showInContract: field.showInContract ?? true
        }
      })
    }
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ============== FLEET DOCUMENTS ==============

app.get('/api/fleet/:fleetId/documents', async (req, res) => {
  try {
    const documents = await prisma.fleetDocument.findMany({
      where: { fleetId: req.params.fleetId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(documents)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/fleet/:fleetId/documents', async (req, res) => {
  try {
    const document = await prisma.fleetDocument.create({
      data: {
        fleetId: req.params.fleetId,
        type: req.body.type,
        name: req.body.name,
        fileUrl: req.body.fileUrl,
        fileType: req.body.fileType || 'image',
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : null,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        sendToCustomer: req.body.sendToCustomer || false,
        description: req.body.description
      }
    })
    res.json(document)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/fleet/documents/:id', async (req, res) => {
  try {
    const document = await prisma.fleetDocument.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(document)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/fleet/documents/:id', async (req, res) => {
  try {
    await prisma.fleetDocument.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ============== FLEET SPARE PARTS ==============

app.get('/api/fleet/:fleetId/spare-parts', async (req, res) => {
  try {
    const parts = await prisma.fleetSparePart.findMany({
      where: { fleetId: req.params.fleetId, isActive: true },
      orderBy: { name: 'asc' }
    })
    res.json(parts)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/fleet/:fleetId/spare-parts', async (req, res) => {
  try {
    const part = await prisma.fleetSparePart.create({
      data: {
        fleetId: req.params.fleetId,
        name: req.body.name,
        partNumber: req.body.partNumber,
        category: req.body.category || 'OTHER',
        location: req.body.location || 'OTHER',
        price: req.body.price || 0,
        laborCost: req.body.laborCost || 0,
        totalCost: (parseFloat(req.body.price) || 0) + (parseFloat(req.body.laborCost) || 0),
        supplierName: req.body.supplierName,
        supplierRef: req.body.supplierRef
      }
    })
    res.json(part)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/fleet/spare-parts/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.price !== undefined || data.laborCost !== undefined) {
      const current = await prisma.fleetSparePart.findUnique({ where: { id: req.params.id } })
      data.totalCost = (parseFloat(data.price?.toString() || '0') || parseFloat(current?.price?.toString() || '0') || 0) + 
                       (parseFloat(data.laborCost?.toString() || '0') || parseFloat(current?.laborCost?.toString() || '0') || 0)
    }
    const part = await prisma.fleetSparePart.update({
      where: { id: req.params.id },
      data
    })
    res.json(part)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/fleet/spare-parts/:id', async (req, res) => {
  try {
    await prisma.fleetSparePart.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ============== FLEET MAINTENANCE ==============

app.get('/api/fleet/:fleetId/maintenance', async (req, res) => {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      where: { fleetId: req.params.fleetId },
      orderBy: { scheduledDate: 'desc' }
    })
    res.json(records)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/fleet/:fleetId/maintenance', async (req, res) => {
  try {
    const record = await prisma.maintenanceRecord.create({
      data: {
        fleetId: req.params.fleetId,
        type: req.body.type || 'OTHER',
        status: req.body.status || 'COMPLETED',
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : new Date(),
        completedAt: req.body.completedDate ? new Date(req.body.completedDate) : null,
        description: req.body.description,
        mileage: req.body.mileageAtService || 0,
        totalCost: req.body.cost || 0,
        laborCost: req.body.laborCost || 0,
        partsCost: req.body.partsCost || 0,
        performedBy: req.body.providerName,
        invoiceNumber: req.body.invoiceNumber,
        notes: req.body.notes,
      }
    })
    res.json(record)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/fleet/maintenance/:id', async (req, res) => {
  try {
    await prisma.maintenanceRecord.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Update fleet with new fields
app.put('/api/fleet/:id', async (req, res) => {
  try {
    // Trouver l'agence par son code pour mettre a jour agencyId
    let agencyId = undefined
    if (req.body.locationCode) {
      const agency = await prisma.agency.findFirst({ where: { code: req.body.locationCode } })
      if (agency) agencyId = agency.id
    }
    const fleet = await prisma.fleet.update({
      where: { id: req.params.id },
      data: {
        vehicleNumber: req.body.vehicleNumber,
        licensePlate: req.body.licensePlate,
        locationCode: req.body.locationCode,
        agencyId: agencyId,
        chassisNumber: req.body.chassisNumber,
        brand: req.body.brand,
        model: req.body.model,
        engineSize: req.body.engineSize,
        year: req.body.year,
        color: req.body.color,
        status: req.body.status,
        currentMileage: req.body.currentMileage,
        itvDate: req.body.itvDate ? new Date(req.body.itvDate) : undefined,
        itvExpiryDate: req.body.itvExpiryDate ? new Date(req.body.itvExpiryDate) : undefined,
        insuranceExpiryDate: req.body.insuranceExpiryDate ? new Date(req.body.insuranceExpiryDate) : undefined,
        insuranceCompany: req.body.insuranceCompany,
        insurancePolicyNumber: req.body.insurancePolicyNumber,
        maintenanceIntervalKm: req.body.maintenanceIntervalKm,
        maintenanceIntervalDays: req.body.maintenanceIntervalDays,
        notes: req.body.notes,
        vehicleId: req.body.vehicleId,
      },
      include: {
        vehicle: true,
        agency: true,
        documents: true,
        equipment: { where: { isActive: true } },
        spareParts: { where: { isActive: true } }
      }
    })
    res.json(fleet)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})



// Create new fleet vehicle
app.post('/api/fleet', async (req, res) => {
  try {
    const fleet = await prisma.fleet.create({
      data: {
        vehicleNumber: req.body.vehicleNumber,
        licensePlate: req.body.licensePlate || null,
        locationCode: req.body.locationCode || null,
        chassisNumber: req.body.chassisNumber,
        brand: req.body.brand || null,
        model: req.body.model || null,
        engineSize: req.body.engineSize || null,
        year: req.body.year || null,
        color: req.body.color || null,
        currentMileage: req.body.currentMileage || 0,
        vehicleId: req.body.vehicleId,
        agencyId: req.body.agencyId,
        status: 'AVAILABLE'
      },
      include: {
        vehicle: { include: { category: true } },
        agency: true
      }
    })
    res.json(fleet)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Delete fleet vehicle
app.delete('/api/fleet/:id', async (req, res) => {
  try {
    await prisma.fleet.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Get single fleet with all relations
app.get('/api/fleet/:id', async (req, res) => {
  try {
    const fleet = await prisma.fleet.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: { include: { category: true } },
        agency: true,
        documents: true,
        equipment: { where: { isActive: true } },
        spareParts: { where: { isActive: true } },
        contractFields: { orderBy: { displayOrder: 'asc' } },
        maintenanceRecords: { orderBy: { scheduledDate: 'desc' }, take: 10 }
      }
    })
    res.json(fleet)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})



// ============== BOOKING CHECK-OUT (Départ client) ==============
app.post('/api/bookings/:id/check-out', async (req, res) => {
  console.log('=== CHECK-OUT START ===')
  console.log('Booking ID:', req.params.id)
  console.log('Body keys:', Object.keys(req.body))
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
      commissionType = agency.agencyType === 'PARTNER' ? 'REVERSAL' as const : 'DEDUCTION' as const
    }
    
    // Vérifier si un contrat existe déjà pour cette réservation
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
        paidAmount: 0,  // Le paiement est géré séparément
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
        customerLicenseUrl: req.body.customerLicenseUrl,
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
            customerLicenseUrl: req.body.customerLicenseUrl,
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
    console.log('Contract created/updated:', contract.id)
    
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
    console.log('Booking updated')
    
    // Mettre à jour le véhicule
    await prisma.fleet.update({
      where: { id: req.body.fleetVehicleId },
      data: {
        status: 'RENTED',
        currentMileage: req.body.startMileage
      }
    })
    console.log('Fleet updated')
    
    // Créer l'inspection de départ
    await prisma.fleetInspection.create({
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
    })
    console.log('Inspection created')
    console.log('=== CHECK-OUT SUCCESS ===')
    
    res.json(contract)
  } catch (error: any) {
    console.error('=== CHECK-OUT ERROR ===')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error meta:', error?.meta)
    console.error('Full error:', JSON.stringify(error, null, 2))
    res.status(500).json({ 
      error: 'Failed to process check-out', 
      details: error?.message,
      code: error?.code,
      meta: error?.meta
    })
  }
})

// ============== CONTRACT DEDUCTIONS ==============

app.post('/api/contracts/:contractId/deductions', async (req, res) => {
  try {
    const deduction = await prisma.contractDeduction.create({
      data: {
        contractId: req.params.contractId,
        type: req.body.type || 'OTHER',
        description: req.body.description,
        quantity: req.body.quantity || 1,
        unitPrice: req.body.unitPrice || 0,
        totalPrice: req.body.totalPrice || 0,
        sparePartId: req.body.sparePartId || null,
        equipmentId: req.body.equipmentId || null,
        photoUrls: req.body.photoUrls || null
      }
    })
    res.json(deduction)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/contracts/:contractId/deductions', async (req, res) => {
  try {
    const deductions = await prisma.contractDeduction.findMany({
      where: { contractId: req.params.contractId },
      include: { sparePart: true, equipment: true }
    })
    res.json(deductions)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Get contract by booking ID
app.get('/api/contracts/booking/:bookingId', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findFirst({
      where: { bookingId: req.params.bookingId },
      include: { deductions: true }
    })
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' })
    }
    res.json(contract)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Update contract
app.put('/api/contracts/:id', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        actualEndDate: req.body.checkoutAt ? new Date(req.body.checkoutAt) : undefined,
        endMileage: req.body.endMileage,
        endFuelLevel: req.body.endFuelLevel,
        finalDepositRefund: req.body.depositRefunded,
        totalDeductions: req.body.totalDeductions
      }
    })
    res.json(contract)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Supprimer un contrat
app.delete('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.fleetInspection.deleteMany({ where: { contractId: id } })
    await prisma.contractDeduction.deleteMany({ where: { contractId: id } })
    await prisma.contractExtension.deleteMany({ where: { contractId: id } })
    const contract = await prisma.rentalContract.findUnique({ where: { id } })
    if (contract?.fleetVehicleId) {
      await prisma.fleet.update({ where: { id: contract.fleetVehicleId }, data: { status: 'AVAILABLE' } })
    }
    await prisma.rentalContract.delete({ where: { id } })
    res.json({ success: true })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to delete contract' })
  }
})


// Extension de contrat (avenant)
app.post('/api/contracts/:id/extend', async (req, res) => {
  try {
    const { id } = req.params
    const { newEndDate, additionalAmount, reason } = req.body
    
    const contract = await prisma.rentalContract.findUnique({ where: { id } })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    const oldEndDate = contract.currentEndDate
    const newEnd = new Date(newEndDate)
    const additionalDays = Math.ceil((newEnd.getTime() - new Date(oldEndDate).getTime()) / (1000 * 60 * 60 * 24))
    
    // Mettre à jour le contrat directement (sans créer d'extension complexe)
    const updatedContract = await prisma.rentalContract.update({
      where: { id },
      data: {
        currentEndDate: newEnd,
        totalDays: contract.totalDays + additionalDays,
        totalAmount: Number(contract.totalAmount || 0) + Number(additionalAmount || 0),
        customerNotes: (contract.customerNotes || '') + '\n[Extension ' + new Date().toLocaleDateString('fr-FR') + '] ' + (reason || 'Extension') + ' - +' + additionalDays + ' jours, +' + (additionalAmount || 0) + '€'
      }
    })
    
    res.json(updatedContract)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to extend contract' })
  }
})
// ============== SETTINGS ==============

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.appSettings.findFirst({
      where: { key: 'legal_texts' }
    })
    if (settings) {
      res.json(settings.value)
    } else {
      res.json(null)
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// Save settings
app.post('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { key: 'legal_texts' },
      update: { value: req.body },
      create: { key: 'legal_texts', value: req.body }
    })
    res.json(settings)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})





// ============== AUTO-ASSIGNMENT FUNCTION ==============
// Logique: Privilégier les véhicules qui ont déjà des réservations proches
// pour garder des véhicules complètement libres pour les longues locations
async function autoAssignVehicle(bookingId: string, vehicleTypeId: string, agencyId: string, startDate: Date, endDate: Date): Promise<{ fleetId: string | null, reason: string }> {
  try {
    // 1. Trouver tous les véhicules de la flotte du même type et agence, disponibles
    const fleetVehicles = await prisma.fleet.findMany({
      where: {
        vehicleId: vehicleTypeId,
        agencyId: agencyId,
        status: 'AVAILABLE'
      },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            id: { not: bookingId }
          },
          orderBy: { endDate: 'desc' }
        }
      }
    })

    if (fleetVehicles.length === 0) {
      return { fleetId: null, reason: 'Aucun véhicule disponible dans la flotte' }
    }

    // 2. Filtrer les véhicules vraiment disponibles pour la période demandée
    const availableVehicles = fleetVehicles.filter(fleet => {
      const hasConflict = fleet.bookings.some(booking => {
        const bookingStart = new Date(booking.startDate)
        const bookingEnd = new Date(booking.endDate)
        // Vérifier si les périodes se chevauchent
        return !(endDate <= bookingStart || startDate >= bookingEnd)
      })
      return !hasConflict
    })

    if (availableVehicles.length === 0) {
      return { fleetId: null, reason: 'Tous les véhicules sont occupés pour cette période' }
    }

    // 3. Calculer le score de chaque véhicule
    // Score élevé = véhicule avec réservation proche (à privilégier)
    // Score bas = véhicule complètement libre (à garder pour longues locations)
    const scoredVehicles = availableVehicles.map(fleet => {
      let score = 0
      
      if (fleet.bookings.length > 0) {
        // Trouver la réservation la plus proche avant ou après
        fleet.bookings.forEach(booking => {
          const bookingEnd = new Date(booking.endDate)
          const bookingStart = new Date(booking.startDate)
          
          // Jours entre la fin d'une réservation et le début de celle-ci
          const daysAfterPrevious = Math.floor((startDate.getTime() - bookingEnd.getTime()) / (1000 * 60 * 60 * 24))
          // Jours entre la fin de celle-ci et le début d'une autre
          const daysBeforeNext = Math.floor((bookingStart.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
          
          // Plus la réservation est proche, plus le score est élevé
          if (daysAfterPrevious >= 0 && daysAfterPrevious <= 3) {
            score += (4 - daysAfterPrevious) * 10 // 0 jours = 40pts, 1 jour = 30pts, etc.
          }
          if (daysBeforeNext >= 0 && daysBeforeNext <= 3) {
            score += (4 - daysBeforeNext) * 10
          }
        })
        
        // Bonus pour véhicules déjà utilisés récemment
        score += fleet.bookings.length * 5
      }
      
      return { fleet, score }
    })

    // 4. Trier par score décroissant (privilégier les véhicules avec réservations proches)
    scoredVehicles.sort((a, b) => b.score - a.score)

    const selectedVehicle = scoredVehicles[0]
    const reason = selectedVehicle.score > 0 
      ? `Assigné automatiquement (suite de location, score: ${selectedVehicle.score})`
      : `Assigné automatiquement (véhicule libre)`

    return { fleetId: selectedVehicle.fleet.id, reason }
  } catch (error) {
    console.error('Auto-assign error:', error)
    return { fleetId: null, reason: 'Erreur lors de l\'assignation automatique' }
  }
}

// ============== AUTHENTICATION ==============
// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }
    
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, brands: user.brands, agencyIds: user.agencyIds },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        brands: user.brands,
        agencyIds: user.agencyIds,
        language: user.language
      }
    })
  } catch (e: any) {
    console.error('Login error:', e)
    res.status(500).json({ error: 'Erreur de connexion' })
  }
})

// Verify token
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' })
    }
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' })
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      brands: user.brands,
      agencyIds: user.agencyIds
    })
  } catch (e) {
    res.status(401).json({ error: 'Token invalide' })
  }
})

// Create user (admin only)
app.post('/api/users', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        password: hashedPassword,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: req.body.role || 'OPERATOR',
        brands: req.body.brands || ['VOLTRIDE', 'MOTOR-RENT'],
        agencyIds: req.body.agencyIds || [],
        language: req.body.language || 'es'
      }
    })
    res.json({ ...user, password: undefined })
  } catch (e: any) {
    console.error('Create user error:', e)
    res.status(500).json({ error: 'Erreur création utilisateur' })
  }
})

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, brands: true, agencyIds: true, language: true, isActive: true, lastLoginAt: true, createdAt: true }
    })
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: 'Erreur récupération utilisateurs' })
  }
})

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const data: any = { ...req.body }
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10)
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    })
    res.json({ ...user, password: undefined })
  } catch (e) {
    res.status(500).json({ error: 'Erreur mise à jour utilisateur' })
  }
})

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Erreur suppression utilisateur' })
  }
})


// ============== ROLE PERMISSIONS ==============
// Get all permissions
app.get('/api/permissions', async (req, res) => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      orderBy: [{ role: 'asc' }, { permission: 'asc' }]
    })
    res.json(permissions)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch permissions' })
  }
})

// Get permissions by role
app.get('/api/permissions/:role', async (req, res) => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      where: { role: req.params.role as any }
    })
    res.json(permissions)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch permissions' })
  }
})

// Update or create permission
app.post('/api/permissions', async (req, res) => {
  try {
    const { role, permission, allowed } = req.body
    const result = await prisma.rolePermission.upsert({
      where: { role_permission: { role, permission } },
      update: { allowed },
      create: { role, permission, allowed }
    })
    res.json(result)
  } catch (e: any) {
    console.error('Permission error:', e)
    res.status(500).json({ error: 'Failed to update permission' })
  }
})

// Bulk update permissions
app.post('/api/permissions/bulk', async (req, res) => {
  try {
    const { permissions } = req.body // Array of { role, permission, allowed }
    const results = await Promise.all(
      permissions.map((p: any) =>
        prisma.rolePermission.upsert({
          where: { role_permission: { role: p.role, permission: p.permission } },
          update: { allowed: p.allowed },
          create: { role: p.role, permission: p.permission, allowed: p.allowed }
        })
      )
    )
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: 'Failed to update permissions' })
  }
})

// Initialize default permissions
app.post('/api/permissions/init', async (req, res) => {
  try {
    const roles = ['ADMIN', 'MANAGER', 'OPERATOR']
    const perms = ['dashboard', 'planning', 'bookings', 'fleet', 'checkout', 'customers', 'contracts', 'invoices', 'settings', 'users']
    
    const defaults: Record<string, Record<string, boolean>> = {
      ADMIN: { dashboard: true, planning: true, bookings: true, fleet: true, checkout: true, customers: true, contracts: true, invoices: true, settings: true, users: true },
      MANAGER: { dashboard: true, planning: true, bookings: true, fleet: true, checkout: true, customers: true, contracts: true, invoices: true, settings: false, users: false },
      OPERATOR: { dashboard: true, planning: true, bookings: true, fleet: false, checkout: true, customers: false, contracts: false, invoices: false, settings: false, users: false }
    }
    
    const results = []
    for (const role of roles) {
      for (const perm of perms) {
        const result = await prisma.rolePermission.upsert({
          where: { role_permission: { role: role as any, permission: perm } },
          update: { allowed: defaults[role][perm] },
          create: { role: role as any, permission: perm, allowed: defaults[role][perm] }
        })
        results.push(result)
      }
    }
    res.json({ message: 'Permissions initialized', count: results.length })
  } catch (e: any) {
    console.error('Init permissions error:', e)
    res.status(500).json({ error: 'Failed to initialize permissions' })
  }
})

// ============== PDF GENERATION ==============
// Générer le PDF du contrat
app.get('/api/contracts/:id/pdf', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        fleetVehicle: { include: { vehicle: { include: { category: true } } } },
        agency: true
      }
    })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE'
    const brandSettings = await prisma.brandSettings.findUnique({ where: { brand } })
    const lang = (req.query.lang as string) || 'fr'
    
    const pdfBuffer = await generateContractPDF(contract, brandSettings, lang)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="contrat-${contract.contractNumber}.pdf"`)
    res.send(pdfBuffer)
  } catch (e: any) {
    console.error('PDF generation error:', e)
    res.status(500).json({ error: 'Failed to generate PDF', details: e.message })
  }
})

// Générer le PDF de la facture
app.get('/api/contracts/:id/invoice-pdf', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        fleetVehicle: { include: { vehicle: { include: { category: true } } } },
        agency: true
      }
    })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE'
    const brandSettings = await prisma.brandSettings.findUnique({ where: { brand } })
    const lang = (req.query.lang as string) || 'fr'
    
    const pdfBuffer = await generateInvoicePDF(contract, brandSettings, lang)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="facture-${contract.contractNumber}.pdf"`)
    res.send(pdfBuffer)
  } catch (e: any) {
    console.error('Invoice PDF generation error:', e)
    res.status(500).json({ error: 'Failed to generate invoice PDF', details: e.message })
  }
})

console.log('PDF routes loaded')

// ============== PUSH NOTIFICATIONS ==============
webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:contact@voltride.com', process.env.VAPID_PUBLIC_KEY || '', process.env.VAPID_PRIVATE_KEY || '')

app.get('/api/push/vapid-public-key', (req, res) => { res.json({ publicKey: process.env.VAPID_PUBLIC_KEY }) })

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint } })
    const result = existing
      ? await prisma.pushSubscription.update({ where: { endpoint: subscription.endpoint }, data: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId, userAgent: req.headers['user-agent'] } })
      : await prisma.pushSubscription.create({ data: { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userId, userAgent: req.headers['user-agent'] } })
    res.json({ success: true, subscription: result })
  } catch (error) { console.error('Push subscribe error:', error); res.status(500).json({ error: 'Failed to subscribe' }) }
})

app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body
    await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => {})
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to unsubscribe' }) }
})

app.post('/api/push/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body
    
    // Stocker la notification dans l'historique
    await prisma.notification.create({
      data: { userId, title, body, icon: '/icon-192.png', data: data || {} }
    })
    if (!title || !body) return res.status(400).json({ error: 'Title et body requis' })
    
    const subs = userId 
      ? await prisma.pushSubscription.findMany({ where: { userId } })
      : await prisma.pushSubscription.findMany()
    
    const results = await Promise.allSettled(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, icon: '/icon-192.png', data })
        )
        return { success: true }
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
        }
        throw err
      }
    }))
    
    res.json({ 
      total: subs.length, 
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length 
    })
  } catch (error) { console.error('Push send error:', error); res.status(500).json({ error: 'Failed to send' }) }
})

app.post('/api/push/test', async (req, res) => {
  try {
    const { endpoint } = req.body
    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } })
    if (!sub) return res.status(404).json({ error: "Not found" })
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: "Test OK!", body: "Les notifications fonctionnent", icon: "/icon-192.png" }))
    res.json({ success: true })
  } catch (error) { console.error('Push test error:', error); res.status(500).json({ error: 'Failed to send test' }) }
})

console.log('Push notification routes loaded')


// ============== INTERNAL MESSAGING ==============
app.get('/api/messages', async (req, res) => {
  try {
    const { userId, role } = req.query
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { toUserId: userId as string },
          { toUserId: null },
          { toRole: role as string }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    res.json(messages)
  } catch (error) { res.status(500).json({ error: 'Failed to get messages' }) }
})

app.get('/api/messages/sent', async (req, res) => {
  try {
    const { userId } = req.query
    const messages = await prisma.message.findMany({
      where: { fromUserId: userId as string },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    res.json(messages)
  } catch (error) { res.status(500).json({ error: 'Failed to get sent messages' }) }
})

app.get('/api/messages/unread-count', async (req, res) => {
  try {
    const { userId, role } = req.query
    const count = await prisma.message.count({
      where: {
        isRead: false,
        OR: [
          { toUserId: userId as string },
          { toUserId: null },
          { toRole: role as string }
        ]
      }
    })
    res.json({ count })
  } catch (error) { res.status(500).json({ error: 'Failed to count' }) }
})

app.post('/api/messages', async (req, res) => {
  try {
    const { fromUserId, toUserId, toRole, subject, body } = req.body
    if (!fromUserId || !body) return res.status(400).json({ error: 'fromUserId et body requis' })
    
    const message = await prisma.message.create({
      data: { fromUserId, toUserId, toRole, subject, body }
    })
    
    // Envoyer une notification push
    const notifTitle = subject || 'Nouveau message'
    const notifBody = body.substring(0, 100) + (body.length > 100 ? '...' : '')
    
    // Créer la notification dans l'historique
    await prisma.notification.create({
      data: { 
        userId: toUserId, 
        title: '💬 ' + notifTitle, 
        body: notifBody, 
        icon: '/icon-192.png',
        data: { messageId: message.id }
      }
    })
    
    // Envoyer push si destinataire spécifique
    if (toUserId) {
      const subs = await prisma.pushSubscription.findMany({ where: { userId: toUserId } })
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: '💬 ' + notifTitle, body: notifBody, icon: '/icon-192.png' })
          )
        } catch (e) { console.log('Push error:', e) }
      }
    }
    
    res.json(message)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to send message' }) }
})

app.put('/api/messages/:id/read', async (req, res) => {
  try {
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() }
    })
    res.json(message)
  } catch (error) { res.status(500).json({ error: 'Failed to mark as read' }) }
})

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await prisma.message.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to delete' }) }
})


// ============== NOTIFICATIONS HISTORY ==============
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query
    const where = userId ? { userId: userId as string } : {}
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(notifications)
  } catch (error) { res.status(500).json({ error: 'Failed to get notifications' }) }
})

app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const { userId } = req.query
    const where = userId ? { userId: userId as string, isRead: false } : { isRead: false }
    const count = await prisma.notification.count({ where })
    res.json({ count })
  } catch (error) { res.status(500).json({ error: 'Failed to count' }) }
})

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    })
    res.json(notification)
  } catch (error) { res.status(500).json({ error: 'Failed to mark as read' }) }
})

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.body
    const where = userId ? { userId } : {}
    await prisma.notification.updateMany({ where, data: { isRead: true } })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to mark all as read' }) }
})

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to delete' }) }
})




// ============== VEHICLE NUMBERING CATEGORIES ==============
app.get('/api/numbering-categories', async (req, res) => {
  try {
    const categories = await prisma.vehicleNumberingCategory.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, include: { categories: true } })
    res.json(categories)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch numbering categories' }) }
})

app.post('/api/numbering-categories', async (req, res) => {
  try {
    const category = await prisma.vehicleNumberingCategory.create({
      data: { code: req.body.code, prefix: req.body.prefix, name: req.body.name, description: req.body.description, numberPadding: req.body.numberPadding || 3, inspectionType: req.body.inspectionType || 'FULL', isActive: true }
    })
    res.json(category)
  } catch (error) { res.status(500).json({ error: 'Failed to create numbering category' }) }
})

app.put('/api/numbering-categories/:id', async (req, res) => {
  try {
    const category = await prisma.vehicleNumberingCategory.update({ where: { id: req.params.id }, data: { code: req.body.code, prefix: req.body.prefix, name: req.body.name, description: req.body.description, numberPadding: req.body.numberPadding, inspectionType: req.body.inspectionType, isActive: req.body.isActive } })
    res.json(category)
  } catch (error) { res.status(500).json({ error: 'Failed to update numbering category' }) }
})

// ============== FLEET ==============
app.get('/api/fleet', async (req, res) => {
  try {
    const { agencyId, status, vehicleId } = req.query
    const where: any = { isActive: true }
    if (agencyId) where.agencyId = agencyId
    if (status) where.status = status
    if (vehicleId) where.vehicleId = vehicleId
    
    const fleet = await prisma.fleet.findMany({
      where,
      include: { vehicle: { include: { category: true, pricing: true } }, agency: true, documents: true, damages: { where: { isResolved: false } } },
      orderBy: { vehicleNumber: 'asc' }
    })
    res.json(fleet)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch fleet' }) }
})


// Get available fleet vehicles (MUST BE BEFORE /:id route!)
app.get('/api/fleet/available', async (req, res) => {
  try {
    const { agencyId, vehicleId, startDate, endDate } = req.query
    const where: any = { isActive: true, status: { in: ['AVAILABLE', 'RESERVED'] } }
    if (agencyId) where.agencyId = agencyId
    if (vehicleId) where.vehicleId = vehicleId
    
    const fleetVehicles = await prisma.fleet.findMany({
      where,
      include: { vehicle: { include: { category: true, pricing: true } }, agency: true }
    })
    
    if (!startDate || !endDate) return res.json(fleetVehicles)
    
    const start = new Date(startDate as string)
    const end = new Date(endDate as string)
    
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        fleetVehicleId: { in: fleetVehicles.map(f => f.id) },
        status: { in: ['CONFIRMED', 'PENDING'] },
        startDate: { lte: end },
        endDate: { gte: start }
      },
      select: { fleetVehicleId: true }
    })
    
    const conflictingIds = new Set(conflictingBookings.map(b => b.fleetVehicleId))
    res.json(fleetVehicles.filter(f => !conflictingIds.has(f.id)))
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to get available vehicles' })
  }
})



app.put('/api/fleet/:id/status', async (req, res) => {
  try {
    const fleetVehicle = await prisma.fleet.update({ where: { id: req.params.id }, data: { status: req.body.status } })
    res.json(fleetVehicle)
  } catch (error) { res.status(500).json({ error: 'Failed to update fleet status' }) }
})


// ============== FLEET DOCUMENTS ==============



// ============== FLEET DAMAGES ==============
app.get('/api/fleet/:fleetId/damages', async (req, res) => {
  try {
    const { resolved } = req.query
    const where: any = { fleetId: req.params.fleetId }
    if (resolved !== undefined) where.isResolved = resolved === 'true'
    const damages = await prisma.fleetDamage.findMany({ where, orderBy: { reportedAt: 'desc' } })
    res.json(damages)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch damages' }) }
})

app.post('/api/fleet/:fleetId/damages', async (req, res) => {
  try {
    const damage = await prisma.fleetDamage.create({
      data: {
        fleetId: req.params.fleetId,
        description: req.body.description,
        location: req.body.location,
        locationDetail: req.body.locationDetail,
        severity: req.body.severity || 'MINOR',
        photoUrl: req.body.photoUrl,
        photoThumbnail: req.body.photoThumbnail,
        reportedBy: req.body.reportedBy,
        inspectionId: req.body.inspectionId,
        contractId: req.body.contractId
      }
    })
    res.json(damage)
  } catch (error) { res.status(500).json({ error: 'Failed to create damage report' }) }
})

app.put('/api/fleet/damages/:id/resolve', async (req, res) => {
  try {
    const damage = await prisma.fleetDamage.update({
      where: { id: req.params.id },
      data: { isResolved: true, resolvedAt: new Date(), resolvedBy: req.body.resolvedBy, resolutionNote: req.body.resolutionNote }
    })
    res.json(damage)
  } catch (error) { res.status(500).json({ error: 'Failed to resolve damage' }) }
})

// ============== FLEET INSPECTIONS ==============
app.get('/api/fleet/:fleetId/inspections', async (req, res) => {
  try {
    const inspections = await prisma.fleetInspection.findMany({
      where: { fleetId: req.params.fleetId, isDeleted: false },
      include: { photos: true, damages: true, contract: true },
      orderBy: { inspectedAt: 'desc' }
    })
    res.json(inspections)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch inspections' }) }
})

app.get('/api/inspections/:id', async (req, res) => {
  try {
    const inspection = await prisma.fleetInspection.findUnique({
      where: { id: req.params.id },
      include: { photos: true, damages: true, fleet: { include: { vehicle: true } }, contract: true }
    })
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' })
    res.json(inspection)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch inspection' }) }
})

app.post('/api/fleet/:fleetId/inspections', async (req, res) => {
  try {
    const inspection = await prisma.fleetInspection.create({
      data: {
        fleetId: req.params.fleetId,
        contractId: req.body.contractId,
        type: req.body.type,
        mileage: req.body.mileage,
        condition: req.body.condition,
        fuelLevel: req.body.fuelLevel,
        operatorId: req.body.operatorId,
        operatorNotes: req.body.operatorNotes,
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null,
        customerIpAddress: req.body.customerIpAddress,
        customerDeviceInfo: req.body.customerDeviceInfo
      },
      include: { photos: true }
    })
    
    // Update fleet mileage
    await prisma.fleet.update({ where: { id: req.params.fleetId }, data: { currentMileage: req.body.mileage, lastMileageUpdate: new Date() } })
    
    // Create mileage log
    const fleet = await prisma.fleet.findUnique({ where: { id: req.params.fleetId } })
    if (fleet) {
      await prisma.mileageLog.create({
        data: {
          fleetId: req.params.fleetId,
          previousMileage: fleet.currentMileage,
          newMileage: req.body.mileage,
          difference: req.body.mileage - fleet.currentMileage,
          source: req.body.type === 'CHECK_OUT' ? 'CHECK_OUT' : req.body.type === 'CHECK_IN' ? 'CHECK_IN' : 'MANUAL',
          referenceId: inspection.id,
          recordedBy: req.body.operatorId
        }
      })
    }
    
    res.json(inspection)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create inspection' }) }
})

app.post('/api/inspections/:id/photos', async (req, res) => {
  try {
    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId: req.params.id,
        angle: req.body.angle,
        photoUrl: req.body.photoUrl,
        photoThumbnail: req.body.photoThumbnail
      }
    })
    res.json(photo)
  } catch (error) { res.status(500).json({ error: 'Failed to add inspection photo' }) }
})

app.post('/api/inspections/:id/sign', async (req, res) => {
  try {
    const inspection = await prisma.fleetInspection.update({
      where: { id: req.params.id },
      data: {
        customerSignature: req.body.signature,
        customerSignedAt: new Date(),
        customerIpAddress: req.body.ipAddress,
        customerDeviceInfo: req.body.deviceInfo
      }
    })
    res.json(inspection)
  } catch (error) { res.status(500).json({ error: 'Failed to sign inspection' }) }
})

// ============== MAINTENANCE RECORDS ==============

app.get('/api/maintenance', async (req, res) => {
  try {
    const { status, priority, agencyId } = req.query
    const where: any = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (agencyId) where.fleet = { agencyId }
    
    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: { fleet: { include: { vehicle: { include: { category: true } }, agency: true } } },
      orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }]
    })
    res.json(records)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch maintenance records' }) }
})


app.put('/api/maintenance/:id', async (req, res) => {
  try {
    const record = await prisma.maintenanceRecord.update({
      where: { id: req.params.id },
      data: {
        type: req.body.type,
        description: req.body.description,
        mileage: req.body.mileage,
        laborCost: req.body.laborCost,
        partsCost: req.body.partsCost,
        totalCost: req.body.totalCost,
        performedBy: req.body.performedBy,
        invoiceNumber: req.body.invoiceNumber,
        invoiceUrl: req.body.invoiceUrl,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
        startedAt: req.body.startedAt ? new Date(req.body.startedAt) : undefined,
        completedAt: req.body.completedAt ? new Date(req.body.completedAt) : undefined,
        status: req.body.status,
        priority: req.body.priority,
        partsReplaced: req.body.partsReplaced,
        technicianNotes: req.body.technicianNotes,
        notes: req.body.notes,
      },
      include: { fleet: true }
    })
    
    // Update fleet status based on maintenance status
    if (req.body.status === 'IN_PROGRESS') {
      await prisma.fleet.update({ where: { id: record.fleetId }, data: { status: 'MAINTENANCE' } })
    } else if (req.body.status === 'COMPLETED') {
      await prisma.fleet.update({
        where: { id: record.fleetId },
        data: { status: 'AVAILABLE', lastMaintenanceDate: new Date(), lastMaintenanceMileage: record.mileage }
      })
    }
    
    res.json(record)
  } catch (error) { res.status(500).json({ error: 'Failed to update maintenance record' }) }
})

// ============== SPARE PARTS ==============


app.put('/api/spare-parts/:id', async (req, res) => {
  try {
    const part = await prisma.fleetSparePart.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        partNumber: req.body.partNumber,
        category: req.body.category,
        location: req.body.location,
        price: req.body.price,
        laborCost: req.body.laborCost,
        totalCost: req.body.price + (req.body.laborCost || 0),
        quantityInStock: req.body.quantityInStock,
        minimumStock: req.body.minimumStock,
        supplierName: req.body.supplierName,
        supplierRef: req.body.supplierRef,
        isActive: req.body.isActive
      }
    })
    res.json(part)
  } catch (error) { res.status(500).json({ error: 'Failed to update spare part' }) }
})

// ============== SPARE PART TEMPLATES ==============
app.get('/api/vehicles/:vehicleId/spare-part-templates', async (req, res) => {
  try {
    const templates = await prisma.vehicleSparePartTemplate.findMany({ where: { vehicleId: req.params.vehicleId, isActive: true }, orderBy: { name: 'asc' } })
    res.json(templates)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch spare part templates' }) }
})

app.post('/api/vehicles/:vehicleId/spare-part-templates', async (req, res) => {
  try {
    const template = await prisma.vehicleSparePartTemplate.create({
      data: {
        vehicleId: req.params.vehicleId,
        name: req.body.name,
        partNumber: req.body.partNumber,
        category: req.body.category,
        location: req.body.location,
        defaultPrice: req.body.defaultPrice,
        defaultLaborCost: req.body.defaultLaborCost
      }
    })
    res.json(template)
  } catch (error) { res.status(500).json({ error: 'Failed to create spare part template' }) }
})

// Copy templates to fleet vehicle
app.post('/api/fleet/:fleetId/copy-spare-parts-from-templates', async (req, res) => {
  try {
    const fleet = await prisma.fleet.findUnique({ where: { id: req.params.fleetId }, include: { vehicle: true } })
    if (!fleet) return res.status(404).json({ error: 'Fleet vehicle not found' })
    
    const templates = await prisma.vehicleSparePartTemplate.findMany({ where: { vehicleId: fleet.vehicleId, isActive: true } })
    
    const parts = await Promise.all(templates.map(t => 
      prisma.fleetSparePart.create({
        data: {
          fleetId: req.params.fleetId,
          name: t.name,
          partNumber: t.partNumber,
          category: t.category,
          location: t.location,
          price: t.defaultPrice,
          laborCost: t.defaultLaborCost || 0,
          totalCost: Number(t.defaultPrice) + Number(t.defaultLaborCost || 0)
        }
      })
    ))
    
    res.json(parts)
  } catch (error) { res.status(500).json({ error: 'Failed to copy spare parts from templates' }) }
})

// ============== RENTAL CONTRACTS ==============
app.get('/api/contracts', async (req, res) => {
  try {
    const { agencyId, status, customerId } = req.query
    const where: any = {}
    if (agencyId) where.agencyId = agencyId
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    
    const contracts = await prisma.rentalContract.findMany({
      where,
      include: { fleetVehicle: { include: { vehicle: true } }, agency: true, customer: true, booking: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(contracts)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch contracts' }) }
})

app.get('/api/contracts/:id', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { id: req.params.id },
      include: {
        fleetVehicle: { include: { vehicle: { include: { category: true, pricing: true } }, documents: { where: { sendToCustomer: true } } } },
        agency: true,
        customer: true,
        booking: true,
        inspections: { include: { photos: true } },
        deductions: { include: { sparePart: true } },
        contractOptions: { include: { rentalOption: true } },
        extensions: true,
        payments: true
      }
    })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    res.json(contract)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch contract' }) }
})

// Generate contract number
const generateContractNumber = async (agencyCode: string) => {
  const year = new Date().getFullYear()
  const prefix = `CTR-${agencyCode}-${year}-`
  
  const lastContract = await prisma.rentalContract.findFirst({
    where: { contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: 'desc' }
  })
  
  let nextNumber = 1
  if (lastContract) {
    const lastNumber = parseInt(lastContract.contractNumber.replace(prefix, ''))
    nextNumber = lastNumber + 1
  }
  
  return prefix + String(nextNumber).padStart(5, '0')
}

app.post('/api/contracts', async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({ where: { id: req.body.agencyId } })
    if (!agency) return res.status(400).json({ error: 'Agency not found' })
    
    const contractNumber = await generateContractNumber(agency.code)
    
    // Find or create customer
    let customer = await prisma.customer.findFirst({ where: { email: req.body.customer.email } })
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: req.body.customer.firstName,
          lastName: req.body.customer.lastName,
          email: req.body.customer.email,
          phone: req.body.customer.phone,
          address: req.body.customer.address,
          postalCode: req.body.customer.postalCode,
          city: req.body.customer.city,
          country: req.body.customer.country || 'ES',
          language: req.body.customer.language || 'es'
        }
      })
    }
    
    // Calcul de la commission si agence partenaire ou franchise
    let commissionRate = null
    let commissionAmount = null
    let commissionType = null
    if (agency.agencyType === 'PARTNER' || agency.agencyType === 'FRANCHISE') {
      commissionRate = agency.commissionRate || 0
      // Calcul sur le prix HT (subtotal + options - discount)
      const totalHT = (req.body.subtotal || 0) + (req.body.optionsTotal || 0) - (req.body.discountAmount || 0)
      commissionAmount = Math.round(totalHT * commissionRate * 100) / 100
      commissionType = agency.agencyType === 'PARTNER' ? 'REVERSAL' as const : 'DEDUCTION' as const
    }
    
    const contract = await prisma.rentalContract.create({
      data: {
        contractNumber,
        bookingId: req.body.bookingId,
        fleetVehicleId: req.body.fleetVehicleId,
        agencyId: req.body.agencyId,
        customerId: customer.id,
        originalStartDate: new Date(req.body.startDate),
        originalEndDate: new Date(req.body.endDate),
        currentStartDate: new Date(req.body.startDate),
        currentEndDate: new Date(req.body.endDate),
        source: req.body.source || 'WALK_IN',
        dailyRate: req.body.dailyRate,
        totalDays: req.body.totalDays,
        subtotal: req.body.subtotal,
        optionsTotal: req.body.optionsTotal || 0,
        discountAmount: req.body.discountAmount || 0,
        discountReason: req.body.discountReason,
        taxRate: req.body.taxRate || 21,
        taxAmount: req.body.taxAmount,
        totalAmount: req.body.totalAmount,
        depositAmount: req.body.depositAmount,
        depositMethod: req.body.depositMethod,
        status: 'DRAFT',
        internalNotes: req.body.internalNotes,
        customerNotes: req.body.customerNotes,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        commissionType: commissionType,
        commissionStatus: commissionRate ? 'PENDING' as const : undefined
      },
      include: { fleetVehicle: { include: { vehicle: true } }, agency: true, customer: true }
    })
    
    // Update fleet status
    await prisma.fleet.update({ where: { id: req.body.fleetVehicleId }, data: { status: 'RESERVED' } })
    
    // Link booking if exists
    if (req.body.bookingId) {
      await prisma.booking.update({ where: { id: req.body.bookingId }, data: { fleetVehicleId: req.body.fleetVehicleId, assignmentType: 'MANUAL', assignedAt: new Date() } })
    }
    
    res.json(contract)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create contract' }) }
})


app.put('/api/contracts/:id/status', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    })
    
    // Update fleet status based on contract status
    if (req.body.status === 'ACTIVE') {
      await prisma.fleet.update({ where: { id: contract.fleetVehicleId }, data: { status: 'RENTED' } })
    } else if (req.body.status === 'COMPLETED' || req.body.status === 'CANCELLED') {
      await prisma.fleet.update({ where: { id: contract.fleetVehicleId }, data: { status: 'AVAILABLE' } })
    }
    
    res.json(contract)
  } catch (error) { res.status(500).json({ error: 'Failed to update contract status' }) }
})

// Sign contract
app.post('/api/contracts/:id/sign', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.update({
      where: { id: req.params.id },
      data: {
        customerSignature: req.body.customerSignature,
        customerSignedAt: new Date(),
        customerIpAddress: req.body.ipAddress,
        customerDeviceInfo: req.body.deviceInfo,
        operatorSignature: req.body.operatorSignature,
        operatorSignedAt: req.body.operatorSignature ? new Date() : undefined,
        operatorId: req.body.operatorId,
        status: 'PENDING_SIGNATURE'
      }
    })
    res.json(contract)
  } catch (error) { res.status(500).json({ error: 'Failed to sign contract' }) }
})

// Check-out (start rental)
app.post('/api/contracts/:id/check-out', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({ where: { id: req.params.id }, include: { fleetVehicle: true } })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    // Create inspection
    const inspection = await prisma.fleetInspection.create({
      data: {
        fleetId: contract.fleetVehicleId,
        contractId: contract.id,
        type: 'CHECK_OUT',
        mileage: req.body.mileage,
        condition: req.body.condition,
        fuelLevel: req.body.fuelLevel,
        operatorId: req.body.operatorId,
        operatorNotes: req.body.notes,
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null
      }
    })
    
    // Update contract
    await prisma.rentalContract.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', actualStartDate: new Date(), startMileage: req.body.mileage }
    })
    
    // Update fleet
    await prisma.fleet.update({
      where: { id: contract.fleetVehicleId },
      data: { status: 'RENTED', currentMileage: req.body.mileage }
    })
    
    res.json({ contract, inspection })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to check-out' }) }
})

// Check-in (end rental)
app.post('/api/contracts/:id/check-in', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({ where: { id: req.params.id }, include: { fleetVehicle: true } })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    // Create inspection
    const inspection = await prisma.fleetInspection.create({
      data: {
        fleetId: contract.fleetVehicleId,
        contractId: contract.id,
        type: 'CHECK_IN',
        mileage: req.body.mileage,
        condition: req.body.condition,
        fuelLevel: req.body.fuelLevel,
        operatorId: req.body.operatorId,
        operatorNotes: req.body.notes,
        customerSignature: req.body.customerSignature,
        customerSignedAt: req.body.customerSignature ? new Date() : null
      }
    })
    
    const totalMileage = req.body.mileage - (contract.startMileage || 0)
    
    // Update contract
    await prisma.rentalContract.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        actualEndDate: new Date(),
        endMileage: req.body.mileage,
        totalMileage
      }
    })
    
    // Update fleet
    await prisma.fleet.update({
      where: { id: contract.fleetVehicleId },
      data: {
        status: 'AVAILABLE',
        currentMileage: req.body.mileage,
        totalRentals: { increment: 1 },
        totalRentalDays: { increment: contract.totalDays }
      }
    })
    
    res.json({ contract, inspection })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to check-in' }) }
})


// ============== BOOKING CHECK-OUT (Départ client) ==============
// ============== CONTRACT DEDUCTIONS ==============


app.put('/api/deductions/:id/customer-agree', async (req, res) => {
  try {
    const deduction = await prisma.contractDeduction.update({
      where: { id: req.params.id },
      data: { customerAgreed: true }
    })
    res.json(deduction)
  } catch (error) { res.status(500).json({ error: 'Failed to update deduction' }) }
})

// ============== CONTRACT EXTENSIONS ==============
app.get('/api/contracts/:contractId/extensions', async (req, res) => {
  try {
    const extensions = await prisma.contractExtension.findMany({
      where: { contractId: req.params.contractId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(extensions)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch extensions' }) }
})

// Generate extension number
const generateExtensionNumber = async (contractNumber: string) => {
  const prefix = `EXT-${contractNumber}-`
  const lastExtension = await prisma.contractExtension.findFirst({
    where: { extensionNumber: { startsWith: prefix } },
    orderBy: { extensionNumber: 'desc' }
  })
  
  let nextNumber = 1
  if (lastExtension) {
    const lastNumber = parseInt(lastExtension.extensionNumber.replace(prefix, ''))
    nextNumber = lastNumber + 1
  }
  
  return prefix + String(nextNumber).padStart(2, '0')
}

// Check availability for extension
app.post('/api/contracts/:contractId/extensions/check-availability', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { id: req.params.contractId },
      include: { fleetVehicle: { include: { vehicle: true } }, agency: true }
    })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    const requestedEndDate = new Date(req.body.requestedEndDate)
    
    // Check if current vehicle is available
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        fleetVehicleId: contract.fleetVehicleId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        startDate: { lt: requestedEndDate },
        endDate: { gt: contract.currentEndDate },
        id: { not: contract.bookingId || undefined }
      }
    })
    
    if (!conflictingBooking) {
      return res.json({
        available: true,
        status: 'AVAILABLE',
        currentVehicleAvailable: true,
        solutionType: 'SAME_VEHICLE'
      })
    }
    
    // Find alternative vehicles
    const alternativeVehicles = await prisma.fleet.findMany({
      where: {
        vehicleId: contract.fleetVehicle.vehicleId,
        agencyId: contract.agencyId,
        id: { not: contract.fleetVehicleId },
        status: 'AVAILABLE',
        isActive: true
      },
      include: { vehicle: true }
    })
    
    if (alternativeVehicles.length > 0) {
      return res.json({
        available: true,
        status: 'AVAILABLE_WITH_CHANGE',
        currentVehicleAvailable: false,
        conflictingBooking,
        solutionType: 'ALTERNATIVE_VEHICLE',
        alternativeVehicles
      })
    }
    
    return res.json({
      available: false,
      status: 'UNAVAILABLE',
      currentVehicleAvailable: false,
      conflictingBooking,
      reason: 'No vehicles available for the requested period'
    })
  } catch (error) { res.status(500).json({ error: 'Failed to check availability' }) }
})

// Create extension request
app.post('/api/contracts/:contractId/extensions', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { id: req.params.contractId },
      include: { fleetVehicle: { include: { vehicle: { include: { category: true, pricing: true } } } }, agency: true }
    })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    const extensionNumber = await generateExtensionNumber(contract.contractNumber)
    const requestedEndDate = new Date(req.body.requestedEndDate)
    const additionalDays = Math.ceil((requestedEndDate.getTime() - contract.currentEndDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const subtotal = Number(contract.dailyRate) * additionalDays
    const taxAmount = subtotal * (Number(contract.taxRate) / 100)
    const totalAmount = subtotal + taxAmount
    
    const extension = await prisma.contractExtension.create({
      data: {
        extensionNumber,
        contractId: req.params.contractId,
        previousEndDate: contract.currentEndDate,
        requestedEndDate,
        additionalDays,
        requestSource: req.body.requestSource || 'OPERATOR_PHONE',
        requestedBy: req.body.requestedBy,
        availabilityStatus: req.body.availabilityStatus || 'PENDING_CHECK',
        currentVehicleAvailable: req.body.currentVehicleAvailable || false,
        solutionType: req.body.solutionType,
        alternativeVehicleId: req.body.alternativeVehicleId,
        dailyRate: contract.dailyRate,
        subtotal,
        taxRate: contract.taxRate,
        taxAmount,
        totalAmount,
        status: 'PENDING_PAYMENT'
      }
    })
    
    res.json(extension)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create extension' }) }
})

// Create Stripe payment link for extension
app.post('/api/extensions/:id/create-payment-link', async (req, res) => {
  try {
    const extension = await prisma.contractExtension.findUnique({
      where: { id: req.params.id },
      include: { contract: { include: { customer: true, fleetVehicle: { include: { vehicle: { include: { category: true, pricing: true } } } }, agency: true } } }
    })
    if (!extension) return res.status(404).json({ error: 'Extension not found' })
    
    const brand = extension.contract.fleetVehicle.vehicle.category.brand
    const stripe = getStripeInstance(brand)
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: extension.contract.customer.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Prolongation ${extension.additionalDays} jour(s)`,
            description: `Contrat ${extension.contract.contractNumber} - ${extension.contract.fleetVehicle.vehicleNumber}`
          },
          unit_amount: Math.round(Number(extension.totalAmount) * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.body.successUrl}?extensionId=${extension.id}`,
      cancel_url: req.body.cancelUrl,
      metadata: {
        extensionId: extension.id,
        contractId: extension.contractId,
        type: 'CONTRACT_EXTENSION'
      }
    })
    
    await prisma.contractExtension.update({
      where: { id: req.params.id },
      data: {
        stripeSessionId: session.id,
        stripePaymentLinkUrl: session.url,
        status: 'PAYMENT_LINK_SENT'
      }
    })
    
    // Create payment link record
    await prisma.stripePaymentLink.create({
      data: {
        referenceType: 'CONTRACT_EXTENSION',
        referenceId: extension.id,
        stripePaymentLinkId: session.id,
        stripePaymentLinkUrl: session.url || '',
        amount: extension.totalAmount,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: req.body.operatorId,
        sentToEmail: extension.contract.customer.email
      }
    })
    
    res.json({ sessionId: session.id, url: session.url })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create payment link' }) }
})

// Approve extension (after payment)
app.post('/api/extensions/:id/approve', async (req, res) => {
  try {
    const extension = await prisma.contractExtension.findUnique({
      where: { id: req.params.id },
      include: { contract: true }
    })
    if (!extension) return res.status(404).json({ error: 'Extension not found' })
    
    // Update extension
    await prisma.contractExtension.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedEndDate: extension.requestedEndDate,
        paymentStatus: 'PAID',
        paidAt: new Date(),
        paidAmount: extension.totalAmount
      }
    })
    
    // Update contract
    await prisma.rentalContract.update({
      where: { id: extension.contractId },
      data: {
        currentEndDate: extension.requestedEndDate,
        totalDays: { increment: extension.additionalDays },
        totalAmount: { increment: Number(extension.totalAmount) }
      }
    })
    
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to approve extension' }) }
})

// ============== BRAND SETTINGS ==============
app.get('/api/brand-settings', async (req, res) => {
  try {
    const settings = await prisma.brandSettings.findMany({ orderBy: { brand: 'asc' } })
    res.json(settings)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch brand settings' }) }
})

app.get('/api/brand-settings/:brand', async (req, res) => {
  try {
    const settings = await prisma.brandSettings.findUnique({ where: { brand: req.params.brand } })
    if (!settings) return res.status(404).json({ error: 'Brand settings not found' })
    res.json(settings)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch brand settings' }) }
})

app.post('/api/brand-settings', async (req, res) => {
  try {
    const settings = await prisma.brandSettings.create({
      data: {
        brand: req.body.brand,
        name: req.body.name,
        legalName: req.body.legalName,
        logoUrl: req.body.logoUrl,
        primaryColor: req.body.primaryColor,
        secondaryColor: req.body.secondaryColor,
        email: req.body.email,
        phone: req.body.phone,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        postalCode: req.body.postalCode,
        country: req.body.country || 'ES',
        taxId: req.body.taxId,
        stripePublishableKey: req.body.stripePublishableKey,
        stripeSecretKey: req.body.stripeSecretKey,
        stripeWebhookSecret: req.body.stripeWebhookSecret,
        stripeAccountId: req.body.stripeAccountId,
        contractTemplateUrl: req.body.contractTemplateUrl,
        invoiceTemplateUrl: req.body.invoiceTemplateUrl,
        termsAndConditionsUrl: req.body.termsAndConditionsUrl,
        privacyPolicyUrl: req.body.privacyPolicyUrl,
        emailFromName: req.body.emailFromName,
        emailFromAddress: req.body.emailFromAddress,
        cgvResume: req.body.cgvResume,
        cgvComplete: req.body.cgvComplete,
        rgpd: req.body.rgpd,
        mentionsLegales: req.body.mentionsLegales
      }
    })
    res.json(settings)
  } catch (error) { res.status(500).json({ error: 'Failed to create brand settings' }) }
})

app.put('/api/brand-settings/:brand', async (req, res) => {
  try {
    const settings = await prisma.brandSettings.update({
      where: { brand: req.params.brand },
      data: {
        name: req.body.name,
        legalName: req.body.legalName,
        logoUrl: req.body.logoUrl,
        primaryColor: req.body.primaryColor,
        secondaryColor: req.body.secondaryColor,
        email: req.body.email,
        phone: req.body.phone,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        postalCode: req.body.postalCode,
        country: req.body.country,
        taxId: req.body.taxId,
        stripePublishableKey: req.body.stripePublishableKey,
        stripeSecretKey: req.body.stripeSecretKey,
        stripeWebhookSecret: req.body.stripeWebhookSecret,
        stripeAccountId: req.body.stripeAccountId,
        contractTemplateUrl: req.body.contractTemplateUrl,
        invoiceTemplateUrl: req.body.invoiceTemplateUrl,
        termsAndConditionsUrl: req.body.termsAndConditionsUrl,
        privacyPolicyUrl: req.body.privacyPolicyUrl,
        emailFromName: req.body.emailFromName,
        emailFromAddress: req.body.emailFromAddress,
        isActive: req.body.isActive,
        cgvResume: req.body.cgvResume,
        cgvComplete: req.body.cgvComplete,
        rgpd: req.body.rgpd,
        mentionsLegales: req.body.mentionsLegales
      }
    })
    res.json(settings)
  } catch (error) { res.status(500).json({ error: 'Failed to update brand settings' }) }
})

// ============== EXTENSION SETTINGS ==============
app.get('/api/extension-settings', async (req, res) => {
  try {
    const { agencyId } = req.query
    const settings = await prisma.extensionSettings.findFirst({
      where: agencyId ? { agencyId: agencyId as string } : { agencyId: null }
    })
    res.json(settings)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch extension settings' }) }
})

app.post('/api/extension-settings', async (req, res) => {
  try {
    const settings = await prisma.extensionSettings.upsert({
      where: { agencyId: req.body.agencyId || 'global' },
      update: req.body,
      create: req.body
    })
    res.json(settings)
  } catch (error) { res.status(500).json({ error: 'Failed to save extension settings' }) }
})

// ============== BOOKING ASSIGNMENT ==============

// Assign fleet vehicle to booking
app.put('/api/bookings/:id/assign', async (req, res) => {
  try {
    const { id } = req.params
    const { fleetVehicleId } = req.body
    
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        fleetVehicleId,
        assignmentType: 'MANUAL',
        assignedAt: new Date()
      },
      include: {
        agency: true,
        customer: true,
        items: { include: { vehicle: true } }
      }
    })
    
    // Update fleet vehicle status if booking starts today
    const today = new Date().toISOString().split('T')[0]
    const startDate = booking.startDate.toISOString().split('T')[0]
    if (startDate === today && fleetVehicleId) {
      await prisma.fleet.update({
        where: { id: fleetVehicleId },
        data: { status: 'RESERVED' }
      })
    }
    
    res.json(booking)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to assign vehicle' })
  }
})

// Update booking dates/times
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate, startTime, endTime, fleetVehicleId, status, checkedIn, checkedInAt, checkedOut, checkedOutAt } = req.body
    
    const updateData: any = {}
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (startTime) updateData.startTime = startTime
    if (endTime) updateData.endTime = endTime
    if (fleetVehicleId !== undefined) {
      updateData.fleetVehicleId = fleetVehicleId
      updateData.assignmentType = fleetVehicleId ? 'MANUAL' : null
      updateData.assignedAt = fleetVehicleId ? new Date() : null
    }
    if (status) updateData.status = status
    if (checkedIn !== undefined) updateData.checkedIn = checkedIn
    if (checkedInAt) updateData.checkedInAt = new Date(checkedInAt)
    if (checkedOut !== undefined) updateData.checkedOut = checkedOut
    if (checkedOutAt) updateData.checkedOutAt = new Date(checkedOutAt)
    
    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        agency: true,
        customer: true,
        items: { include: { vehicle: true } }
      }
    })
    
    res.json(booking)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to update booking' })
  }
})

// Create new booking (operator)
app.post('/api/bookings/operator', async (req, res) => {
  try {
    const {
      agencyId,
      fleetVehicleId,
      customerId,
      customerData, // { firstName, lastName, email, phone }
      startDate,
      endDate,
      startTime,
      endTime,
      vehicleId,
      quantity = 1,
      unitPrice,
      totalPrice,
      depositAmount,
      language = 'fr'
    } = req.body
    
    // Create or find customer
    let customer
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } })
    } else if (customerData) {
      // Check if customer exists by email
      customer = await prisma.customer.findFirst({ where: { email: customerData.email } })
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            email: customerData.email,
            phone: customerData.phone,
            language
          }
        })
      }
    }
    
    if (!customer) {
      return res.status(400).json({ error: 'Customer required' })
    }
    
    // Generate reference avec la marque de l'agence
    const agencyForRef = await prisma.agency.findUnique({ where: { id: agencyId } })
    const reference = await generateBookingReference(agencyForRef?.brand || 'VOLTRIDE')
    
    // Create booking
    const booking = await prisma.booking.create({
      data: {
        reference,
        agencyId,
        customerId: customer.id,
        fleetVehicleId,
        assignmentType: fleetVehicleId ? 'MANUAL' : null,
        assignedAt: fleetVehicleId ? new Date() : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        totalPrice,
        depositAmount,
        status: 'CONFIRMED',
        language,
        source: 'WALK_IN',
        items: {
          create: [{
            vehicleId,
            quantity,
            unitPrice: unitPrice || totalPrice,
            totalPrice: (unitPrice || totalPrice) * quantity
          }]
        }
      },
      include: {
        agency: true,
        customer: true,
        items: { include: { vehicle: true } }
      }
    })
    
    // Update fleet vehicle status
    if (fleetVehicleId) {
      const today = new Date().toISOString().split('T')[0]
      const startDateStr = new Date(startDate).toISOString().split('T')[0]
      if (startDateStr === today) {
        await prisma.fleet.update({
          where: { id: fleetVehicleId },
          data: { status: 'RESERVED' }
        })
      }
    }
    
    res.json(booking)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create booking' })
  }
})

// Get available fleet vehicles for a date range

// Search customers
app.get('/api/customers/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || (q as string).length < 2) {
      return res.json([])
    }
    
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: q as string, mode: 'insensitive' } },
          { lastName: { contains: q as string, mode: 'insensitive' } },
          { email: { contains: q as string, mode: 'insensitive' } },
          { phone: { contains: q as string } }
        ]
      },
      take: 10
    })
    
    res.json(customers)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'Failed to search customers' })
  }
})

console.log('Booking assignment and operator routes loaded')

// ============== DELETE FLEET VEHICLE ==============

// ============== DELETE DOCUMENT ==============

// ============== DELETE SPARE PART ==============

// ============== UPDATE SPARE PART ==============

console.log('Delete and update routes loaded')

// ============== AGENCY SCHEDULE PERIODS ==============
app.get('/api/agencies/:agencyId/schedule-periods', async (req, res) => {
  try {
    const periods = await prisma.agencySchedulePeriod.findMany({
      where: { agencyId: req.params.agencyId },
      orderBy: { startDate: 'asc' }
    })
    res.json(periods)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch schedule periods' }) }
})

app.post('/api/agencies/:agencyId/schedule-periods', async (req, res) => {
  try {
    const period = await prisma.agencySchedulePeriod.create({
      data: {
        agencyId: req.params.agencyId,
        name: req.body.name,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        isDefault: req.body.isDefault || false,
        mondayOpen: req.body.mondayOpen,
        mondayClose: req.body.mondayClose,
        mondayIsClosed: req.body.mondayIsClosed || false,
        tuesdayOpen: req.body.tuesdayOpen,
        tuesdayClose: req.body.tuesdayClose,
        tuesdayIsClosed: req.body.tuesdayIsClosed || false,
        wednesdayOpen: req.body.wednesdayOpen,
        wednesdayClose: req.body.wednesdayClose,
        wednesdayIsClosed: req.body.wednesdayIsClosed || false,
        thursdayOpen: req.body.thursdayOpen,
        thursdayClose: req.body.thursdayClose,
        thursdayIsClosed: req.body.thursdayIsClosed || false,
        fridayOpen: req.body.fridayOpen,
        fridayClose: req.body.fridayClose,
        fridayIsClosed: req.body.fridayIsClosed || false,
        saturdayOpen: req.body.saturdayOpen,
        saturdayClose: req.body.saturdayClose,
        saturdayIsClosed: req.body.saturdayIsClosed || false,
        sundayOpen: req.body.sundayOpen,
        sundayClose: req.body.sundayClose,
        sundayIsClosed: req.body.sundayIsClosed ?? true
      }
    })
    res.json(period)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create schedule period' }) }
})

app.put('/api/schedule-periods/:id', async (req, res) => {
  try {
    const period = await prisma.agencySchedulePeriod.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        isDefault: req.body.isDefault,
        mondayOpen: req.body.mondayOpen,
        mondayClose: req.body.mondayClose,
        mondayIsClosed: req.body.mondayIsClosed,
        tuesdayOpen: req.body.tuesdayOpen,
        tuesdayClose: req.body.tuesdayClose,
        tuesdayIsClosed: req.body.tuesdayIsClosed,
        wednesdayOpen: req.body.wednesdayOpen,
        wednesdayClose: req.body.wednesdayClose,
        wednesdayIsClosed: req.body.wednesdayIsClosed,
        thursdayOpen: req.body.thursdayOpen,
        thursdayClose: req.body.thursdayClose,
        thursdayIsClosed: req.body.thursdayIsClosed,
        fridayOpen: req.body.fridayOpen,
        fridayClose: req.body.fridayClose,
        fridayIsClosed: req.body.fridayIsClosed,
        saturdayOpen: req.body.saturdayOpen,
        saturdayClose: req.body.saturdayClose,
        saturdayIsClosed: req.body.saturdayIsClosed,
        sundayOpen: req.body.sundayOpen,
        sundayClose: req.body.sundayClose,
        sundayIsClosed: req.body.sundayIsClosed
      }
    })
    res.json(period)
  } catch (error) { res.status(500).json({ error: 'Failed to update schedule period' }) }
})

app.delete('/api/schedule-periods/:id', async (req, res) => {
  try {
    await prisma.agencySchedulePeriod.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to delete schedule period' }) }
})

// ============== AGENCY CLOSURES ==============
app.get('/api/agencies/:agencyId/closures', async (req, res) => {
  try {
    const closures = await prisma.agencyClosure.findMany({
      where: { agencyId: req.params.agencyId },
      orderBy: { startDate: 'asc' }
    })
    res.json(closures)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch closures' }) }
})

app.post('/api/agencies/:agencyId/closures', async (req, res) => {
  try {
    const closure = await prisma.agencyClosure.create({
      data: {
        agencyId: req.params.agencyId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        reason: req.body.reason
      }
    })
    res.json(closure)
  } catch (error) { res.status(500).json({ error: 'Failed to create closure' }) }
})

app.delete('/api/closures/:id', async (req, res) => {
  try {
    await prisma.agencyClosure.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: 'Failed to delete closure' }) }
})

// Get agency schedule for a specific date
app.get('/api/agencies/:agencyId/schedule', async (req, res) => {
  try {
    const { date } = req.query
    const targetDate = date ? new Date(date as string) : new Date()
    
    // Check if closed
    const closure = await prisma.agencyClosure.findFirst({
      where: {
        agencyId: req.params.agencyId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      }
    })
    if (closure) {
      return res.json({ isClosed: true, reason: closure.reason })
    }
    
    // Find applicable period
    const period = await prisma.agencySchedulePeriod.findFirst({
      where: {
        agencyId: req.params.agencyId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      }
    }) || await prisma.agencySchedulePeriod.findFirst({
      where: { agencyId: req.params.agencyId, isDefault: true }
    })
    
    if (!period) {
      return res.json({ isClosed: false, schedule: null })
    }
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[targetDate.getDay()]
    
    res.json({
      isClosed: (period as any)[`${dayName}IsClosed`],
      openTime: (period as any)[`${dayName}Open`],
      closeTime: (period as any)[`${dayName}Close`],
      periodName: period.name
    })
  } catch (error) { res.status(500).json({ error: 'Failed to get schedule' }) }
})

console.log('Agency schedule routes loaded')

// ============== COMMISSION REPORT ==============
// Route pour générer et envoyer le rapport de commissions
app.post('/api/commissions/report', async (req, res) => {
  try {
    const { agencyId, startDate, endDate, sendEmail } = req.body
    
    // Récupérer l'agence
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
    if (!agency) return res.status(404).json({ error: 'Agency not found' })
    if (agency.agencyType === 'OWN') return res.status(400).json({ error: 'Commission report only for PARTNER or FRANCHISE agencies' })
    
    // Récupérer les contrats avec commission pour cette agence et période
    const contracts = await prisma.rentalContract.findMany({
      where: {
        agencyId,
        commissionAmount: { not: null },
        currentStartDate: { gte: new Date(startDate) },
        currentEndDate: { lte: new Date(endDate) },
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      include: {
        fleetVehicle: { include: { vehicle: true } },
        customer: true
      },
      orderBy: { currentStartDate: 'asc' }
    })
    
    // Calculer les totaux
    const totalHT = contracts.reduce((sum, c) => sum + (Number(c.subtotal || 0) + Number(c.optionsTotal || 0) - Number(c.discountAmount || 0)), 0)
    const totalCommission = contracts.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0)
    
    const report = {
      agency: {
        name: agency.name,
        code: agency.code,
        agencyType: agency.agencyType,
        commissionRate: agency.commissionRate
      },
      period: { startDate, endDate },
      contracts: contracts.map(c => ({
        contractNumber: c.contractNumber,
        vehicleNumber: c.fleetVehicle?.vehicleNumber,
        vehicleName: c.fleetVehicle?.vehicle?.name,
        customer: `${c.customer?.firstName} ${c.customer?.lastName}`,
        startDate: c.currentStartDate,
        endDate: c.currentEndDate,
        totalHT: Number(c.subtotal || 0) + Number(c.optionsTotal || 0) - Number(c.discountAmount || 0),
        commissionRate: c.commissionRate,
        commissionAmount: c.commissionAmount
      })),
      totals: {
        contractsCount: contracts.length,
        totalHT: Math.round(totalHT * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100
      }
    }
    
    // Envoyer par email si demandé
    if (sendEmail && agency.email) {
      // TODO: Implémenter l'envoi d'email avec le rapport
      // Pour l'instant on retourne juste le rapport
    }
    
    res.json(report)
  } catch (error) {
    console.error('Commission report error:', error)
    res.status(500).json({ error: 'Failed to generate commission report' })
  }
})

// Route pour obtenir les commissions en attente
app.get('/api/commissions/pending', async (req, res) => {
  try {
    const { agencyId } = req.query
    
    const where: any = {
      commissionAmount: { not: null },
      commissionStatus: 'PENDING'
    }
    if (agencyId) where.agencyId = agencyId
    
    const contracts = await prisma.rentalContract.findMany({
      where,
      include: {
        agency: true,
        fleetVehicle: { include: { vehicle: true } },
        customer: true
      },
      orderBy: { currentStartDate: 'desc' }
    })
    
    res.json(contracts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending commissions' })
  }
})

// Route pour marquer une commission comme payée
app.put('/api/commissions/:contractId/paid', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.update({
      where: { id: req.params.contractId },
      data: { commissionStatus: 'PAID' }
    })
    res.json(contract)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update commission status' })
  }
})


// ============== NOTIFICATION SETTINGS ==============
// GET - Récupérer tous les paramètres de notifications
app.get('/api/notification-settings', async (req, res) => {
  try {
    const settings = await prisma.notificationSetting.findMany()
    res.json(settings)
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    res.status(500).json({ error: 'Failed to fetch notification settings' })
  }
})

// POST - Initialiser ou mettre à jour les paramètres
app.post('/api/notification-settings', async (req, res) => {
  try {
    const { notificationType, roleAdmin, roleManager, roleOperator } = req.body
    const setting = await prisma.notificationSetting.upsert({
      where: { notificationType },
      update: { roleAdmin, roleManager, roleOperator },
      create: { notificationType, roleAdmin, roleManager, roleOperator }
    })
    res.json(setting)
  } catch (error) {
    console.error('Error saving notification setting:', error)
    res.status(500).json({ error: 'Failed to save notification setting' })
  }
})

// POST - Sauvegarder tous les paramètres en une fois
app.post('/api/notification-settings/bulk', async (req, res) => {
  try {
    const { settings } = req.body // Array of { notificationType, roleAdmin, roleManager, roleOperator }
    const results = await Promise.all(
      settings.map((s: any) => 
        prisma.notificationSetting.upsert({
          where: { notificationType: s.notificationType },
          update: { roleAdmin: s.roleAdmin, roleManager: s.roleManager, roleOperator: s.roleOperator },
          create: { notificationType: s.notificationType, roleAdmin: s.roleAdmin, roleManager: s.roleManager, roleOperator: s.roleOperator }
        })
      )
    )
    res.json({ success: true, count: results.length })
  } catch (error) {
    console.error('Error saving notification settings:', error)
    res.status(500).json({ error: 'Failed to save notification settings' })
  }
})

console.log('Notification settings routes loaded')

app.listen(PORT, '0.0.0.0', () => { console.log('🚀 API running on port ' + PORT) })
