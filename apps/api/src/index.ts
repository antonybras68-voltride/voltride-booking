import webpush from 'web-push';
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import customerPortalRouter from './routes/customerPortal'

const JWT_SECRET = process.env.JWT_SECRET || 'voltride-secret-key-2024'
import { generateContractPDF, generateInvoicePDF } from './pdfGenerator'
import QRCode from 'qrcode'

const stripeVoltride = process.env.STRIPE_SECRET_KEY_VOLTRIDE ? new Stripe(process.env.STRIPE_SECRET_KEY_VOLTRIDE, { apiVersion: '2024-12-18.acacia' as any }) : null
const stripeMotorrent = process.env.STRIPE_SECRET_KEY_MOTORRENT ? new Stripe(process.env.STRIPE_SECRET_KEY_MOTORRENT, { apiVersion: '2024-12-18.acacia' as any }) : null


const getStripeInstance = (brand: string) => {
  const stripe = brand === 'MOTOR-RENT' ? stripeMotorrent : stripeVoltride; if (!stripe) throw new Error('Stripe not configured'); return stripe
}




const app = express()
const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)
app.use(cors({ origin: true, credentials: true }))
app.use('/api/customer-portal', customerPortalRouter)
app.use((req, res, next) => { if (req.path === '/api/stripe-webhook') { next() } else { express.json()(req, res, next) } })

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
// ===== ENDPOINTS FILTRES PAR BRAND =====

// Get agencies by brand (VOLTRIDE or MOTOR-RENT)
app.get('/api/agencies/brand/:brand', async (req, res) => {
  try {
    const { brand } = req.params
    const agencies = await prisma.agency.findMany({
      where: { 
        isActive: true,
        brand: brand.toUpperCase()
      },
      orderBy: { code: 'asc' }
    })
    res.json(agencies)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agencies by brand' })
  }
})

// Get categories by brand (VOLTRIDE or MOTOR-RENT)
app.get('/api/categories/brand/:brand', async (req, res) => {
  try {
    const { brand } = req.params
    const categories = await prisma.category.findMany({
      where: {
        brand: brand.toUpperCase()
      },
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { vehicles: true } },
        options: { include: { option: true } }
      }
    })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories by brand' })
  }
})

// ===== FIN ENDPOINTS FILTRES PAR BRAND =====
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { code: 'asc' }, include: { _count: { select: { vehicles: true } }, options: { include: { option: true } } } })
    res.json(categories)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch categories' }) }
})

app.post('/api/categories', async (req, res) => {
  try {
    const category = await prisma.category.create({ data: { code: req.body.code, name: req.body.name, brand: req.body.brand || 'VOLTRIDE', bookingFee: req.body.bookingFee || 0, bookingFeePercentLow: req.body.bookingFeePercentLow || 50, bookingFeePercentHigh: req.body.bookingFeePercentHigh || 20 } })
    res.json(category)
  } catch (error) { res.status(500).json({ error: 'Failed to create category' }) }
})

app.put('/api/categories/:id', async (req, res) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: { code: req.body.code, name: req.body.name, brand: req.body.brand, bookingFee: req.body.bookingFee, bookingFeePercentLow: req.body.bookingFeePercentLow, bookingFeePercentHigh: req.body.bookingFeePercentHigh } })
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
    const vehicles = await prisma.vehicle.findMany({ where: { isActive: true }, include: { category: true, pricing: true, inventory: true, characteristics: { where: { isActive: true }, orderBy: { order: "asc" } } }, orderBy: { sku: 'asc' } })
    res.json(vehicles)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch vehicles' }) }
})

app.post('/api/vehicles', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.create({
      data: { sku: req.body.sku, name: req.body.name, description: req.body.description || {}, deposit: req.body.deposit, hasPlate: req.body.hasPlate || false, licenseType: req.body.licenseType || '', kmIncluded: req.body.kmIncluded || '', helmetIncluded: req.body.helmetIncluded ?? true, kmIncludedPerDay: req.body.kmIncludedPerDay || 100, extraKmPrice: req.body.extraKmPrice || 0.15, imageUrl: req.body.imageUrl, categoryId: req.body.categoryId, isActive: req.body.isActive ?? true, pricing: { create: req.body.pricing || {} } },
      include: { category: true, pricing: true, characteristics: { where: { isActive: true }, orderBy: { order: "asc" } } }
    })
    res.json(vehicle)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create vehicle' }) }
})

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: { sku: req.body.sku, name: req.body.name, description: req.body.description, deposit: req.body.deposit, hasPlate: req.body.hasPlate, licenseType: req.body.licenseType, kmIncluded: req.body.kmIncluded, helmetIncluded: req.body.helmetIncluded, kmIncludedPerDay: req.body.kmIncludedPerDay, extraKmPrice: req.body.extraKmPrice, imageUrl: req.body.imageUrl, categoryId: req.body.categoryId, isActive: req.body.isActive }, include: { category: true, pricing: true, characteristics: { where: { isActive: true }, orderBy: { order: "asc" } } } })
    if (req.body.pricing) { await prisma.pricing.updateMany({ where: { vehicleId: req.params.id }, data: req.body.pricing }) }
    res.json(vehicle)
  } catch (error) { res.status(500).json({ error: 'Failed to update vehicle' }) }
})
app.delete("/api/vehicles/:id", async (req, res) => {
  try { await prisma.vehicle.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ error: "Failed to delete vehicle" }) }
})


// ============== VEHICLE CHARACTERISTICS ==============
console.log("Vehicle characteristics routes loaded")
app.get("/api/vehicles/:vehicleId/characteristics", async (req, res) => {
  try {
    const characteristics = await prisma.vehicleCharacteristic.findMany({ where: { vehicleId: req.params.vehicleId }, orderBy: { order: "asc" } })
    res.json(characteristics)
  } catch (error) { res.status(500).json({ error: "Failed to fetch characteristics" }) }
})

app.post("/api/vehicles/:vehicleId/characteristics", async (req, res) => {
  try {
    const char = await prisma.vehicleCharacteristic.create({ data: { vehicleId: req.params.vehicleId, label: req.body.label, shortLabel: req.body.shortLabel, description: req.body.description, icon: req.body.icon || null, color: req.body.color || "#3b82f6", order: req.body.order || 0, isActive: req.body.isActive !== undefined ? req.body.isActive : true } })
    res.json(char)
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create characteristic" }) }
})

app.put("/api/characteristics/:id", async (req, res) => {
  try {
    const char = await prisma.vehicleCharacteristic.update({ where: { id: req.params.id }, data: { label: req.body.label, shortLabel: req.body.shortLabel, description: req.body.description, icon: req.body.icon, color: req.body.color, order: req.body.order, isActive: req.body.isActive } })
    res.json(char)
  } catch (error) { res.status(500).json({ error: "Failed to update characteristic" }) }
})

app.delete("/api/characteristics/:id", async (req, res) => {
  try {
    await prisma.vehicleCharacteristic.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) { res.status(500).json({ error: "Failed to delete characteristic" }) }
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
    
    // Vérifier si un autre client existe avec cet email ou téléphone (seulement si email/phone fournis)
    if (email || phone) {
      const orConditions = []
      if (email) orConditions.push({ email })
      if (phone) orConditions.push({ phone })
      const existingCustomer = await prisma.customer.findFirst({
        where: { AND: [{ id: { not: id } }, { OR: orConditions }] }
      })
      if (existingCustomer) {
        return res.status(400).json({ 
          error: 'duplicate',
          message: existingCustomer.email === email ? 'Un client avec cet email existe déjà' : 'Un client avec ce téléphone existe déjà',
          existingCustomer
        })
      }
    }
    
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(req.body.firstName && { firstName: req.body.firstName }),
        ...(req.body.lastName && { lastName: req.body.lastName }),
        ...(req.body.email && { email: req.body.email }),
        ...(req.body.phone && { phone: req.body.phone }),
        ...(req.body.address !== undefined && { address: req.body.address }),
        ...(req.body.postalCode !== undefined && { postalCode: req.body.postalCode }),
        ...(req.body.city !== undefined && { city: req.body.city }),
        ...(req.body.country && { country: req.body.country }),
        ...(req.body.language && { language: req.body.language }),
        ...(req.body.idDocumentUrl && { idDocumentUrl: req.body.idDocumentUrl }),
        ...(req.body.licenseDocumentUrl && { licenseDocumentUrl: req.body.licenseDocumentUrl }),
        ...(req.body.idDocumentExpiry && { idDocumentExpiry: new Date(req.body.idDocumentExpiry) }),
        ...(req.body.licenseDocumentExpiry && { licenseDocumentExpiry: new Date(req.body.licenseDocumentExpiry) }),
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
    const bookings = await prisma.booking.findMany({ include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } }, fleetVehicle: { include: { vehicle: true } } }, orderBy: { createdAt: 'desc' } })
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
    if (customer) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { firstName: req.body.customer.firstName, lastName: req.body.customer.lastName, phone: req.body.customer.phone, address: req.body.customer.address, postalCode: req.body.customer.postalCode, city: req.body.customer.city, country: req.body.customer.country || customer.country } })
    }
    if (!customer) {
      customer = await prisma.customer.create({ data: { firstName: req.body.customer.firstName, lastName: req.body.customer.lastName, email: req.body.customer.email, phone: req.body.customer.phone, address: req.body.customer.address, postalCode: req.body.customer.postalCode, city: req.body.customer.city, country: req.body.customer.country || 'ES', language: req.body.customer.language || 'es' } })
    }
    // Récupérer la caution du véhicule
    const vehicleId = req.body.items?.[0]?.vehicleId
    const vehicle = vehicleId ? await prisma.vehicle.findUnique({ where: { id: vehicleId } }) : null
    const vehicleDeposit = vehicle?.deposit || 100
    
    // paidAmount = acompte payé par le client (ce que le widget envoie comme depositAmount)
    // depositAmount = vraie caution du véhicule
    const paidAmount = req.body.depositAmount || 0
    
    // Créer la réservation d'abord
    const booking = await prisma.booking.create({
      data: {
        reference,
        agencyId: req.body.agencyId, customerId: customer.id, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate), startTime: req.body.startTime, endTime: req.body.endTime, totalPrice: req.body.totalPrice, depositAmount: vehicleDeposit, paidAmount: paidAmount, language: req.body.language || 'es',
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
    
    // Envoyer notification nouvelle réservation
    sendNotificationByType(
      'new_booking',
      '🆕 Nouvelle réservation',
      `${customer.firstName} ${customer.lastName} - ${new Date(req.body.startDate).toLocaleDateString('fr-FR')}`,
      { bookingId: booking.id, reference: booking.reference }
    )
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
    if (booking.fleetVehicleId) {
      await prisma.fleet.update({ where: { id: booking.fleetVehicleId }, data: { status: "AVAILABLE" } });
    }
    res.json(booking);
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }

})

// Send invoice by email
app.post('/api/bookings/:id/send-invoice', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } } }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const language = req.body.language || booking.language || 'es'
    const brand = booking.agency?.brand || 'VOLTRIDE'
    const brandName = brand === 'MOTOR-RENT' ? 'Motor-Rent' : 'Voltride'
    const fromEmail = brand === 'VOLTRIDE' ? 'reservations@voltride.es' : 'reservations@motor-rent.es'
    const translations: Record<string, any> = {
      fr: { subject: 'Votre facture', title: 'Facture', ref: 'Référence', date: 'Date', agency: 'Agence', vehicle: 'Véhicule', qty: 'Qté', period: 'Période', unitPrice: 'Prix unit.', total: 'Total', subtotal: 'Sous-total', tax: 'TVA (21%)', totalTTC: 'Total TTC', deposit: 'Acompte payé', remaining: 'Reste à payer', paid: 'Payé', thanks: 'Merci pour votre confiance !' },
      es: { subject: 'Su factura', title: 'Factura', ref: 'Referencia', date: 'Fecha', agency: 'Agencia', vehicle: 'Vehículo', qty: 'Cant.', period: 'Período', unitPrice: 'Precio unit.', total: 'Total', subtotal: 'Subtotal', tax: 'IVA (21%)', totalTTC: 'Total con IVA', deposit: 'Anticipo pagado', remaining: 'Pendiente de pago', paid: 'Pagado', thanks: '¡Gracias por su confianza!' },
      en: { subject: 'Your invoice', title: 'Invoice', ref: 'Reference', date: 'Date', agency: 'Agency', vehicle: 'Vehicle', qty: 'Qty', period: 'Period', unitPrice: 'Unit price', total: 'Total', subtotal: 'Subtotal', tax: 'VAT (21%)', totalTTC: 'Total incl. VAT', deposit: 'Deposit paid', remaining: 'Remaining', paid: 'Paid', thanks: 'Thank you for your trust!' }
    }
    const t = translations[language] || translations.es
    const formatD = (d: string | Date) => new Date(d).toLocaleDateString(language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : 'fr-FR')
    const totalTTC = booking.totalPrice
    const taxRate = 21
    const subtotal = Math.round(totalTTC / 1.21 * 100) / 100
    const taxAmount = Math.round((totalTTC - subtotal) * 100) / 100
    const paidAmount = booking.paidAmount || 0
    const remainingAmt = Math.max(0, totalTTC - paidAmount)





    const gn = (obj: any) => typeof obj === 'object' ? (obj[language] || obj.es || '') : (obj || '')
    let itemRows = ''
    for (const item of booking.items) {
      itemRows += '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + gn(item.vehicle?.name) + '</td>'
        + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">' + item.quantity + '</td>'
        + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">' + item.unitPrice.toFixed(2) + '&#8364;</td>'
        + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">' + item.totalPrice.toFixed(2) + '&#8364;</td></tr>'
    }
    for (const opt of booking.options) {
      itemRows += '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + gn(opt.option?.name) + '</td>'
        + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">' + opt.quantity + '</td>'
        + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">' + opt.unitPrice.toFixed(2) + '&#8364;</td>'
        + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">' + opt.totalPrice.toFixed(2) + '&#8364;</td></tr>'
    }
    const pc = brand === 'VOLTRIDE' ? '#ffaf10' : '#e53e3e'
    let totals = '<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span>' + t.subtotal + '</span><span>' + subtotal.toFixed(2) + '&#8364;</span></div>'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span>' + t.tax + '</span><span>' + taxAmount.toFixed(2) + '&#8364;</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;border-top:2px solid #ddd;padding-top:10px;margin-top:10px"><span>' + t.totalTTC + '</span><span>' + totalTTC.toFixed(2) + '&#8364;</span></div>'
    if (paidAmount > 0) totals += '<div style="display:flex;justify-content:space-between;margin-top:10px;color:green"><span>' + t.deposit + '</span><span>-' + paidAmount.toFixed(2) + '&#8364;</span></div>'
    if (remainingAmt > 0) totals += '<div style="display:flex;justify-content:space-between;font-weight:bold;color:#e53e3e"><span>' + t.remaining + '</span><span>' + remainingAmt.toFixed(2) + '&#8364;</span></div>'
    else totals += '<div style="text-align:center;color:green;font-weight:bold;margin-top:5px">&#10003; ' + t.paid + '</div>'
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
      + '<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">'
      + '<div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">'
      + '<div style="background:' + pc + ';color:white;padding:20px;text-align:center">'
      + '<h1 style="margin:0;font-size:24px">' + brandName + '</h1>'
      + '<p style="margin:5px 0 0;opacity:0.9">' + t.title + ' - ' + booking.reference + '</p></div>'
      + '<div style="padding:20px">'
      + '<table style="width:100%;margin-bottom:20px;font-size:14px">'
      + '<tr><td style="color:#666">' + t.ref + '</td><td style="font-weight:bold">' + booking.reference + '</td></tr>'
      + '<tr><td style="color:#666">' + t.date + '</td><td>' + formatD(booking.createdAt) + '</td></tr>'
      + '<tr><td style="color:#666">' + t.agency + '</td><td>' + gn(booking.agency?.name) + '</td></tr>'
      + '<tr><td style="color:#666">' + t.period + '</td><td>' + formatD(booking.startDate) + ' ' + booking.startTime + ' - ' + formatD(booking.endDate) + ' ' + booking.endTime + '</td></tr></table>'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f5f5f5">'
      + '<th style="padding:8px;text-align:left">' + t.vehicle + '</th><th style="padding:8px;text-align:center">' + t.qty + '</th>'
      + '<th style="padding:8px;text-align:right">' + t.unitPrice + '</th><th style="padding:8px;text-align:right">' + t.total + '</th></tr></thead>'
      + '<tbody>' + itemRows + '</tbody></table>'
      + '<div style="margin-top:20px;padding:15px;background:#f9f9f9;border-radius:8px;font-size:14px">' + totals + '</div>'
      + '<p style="text-align:center;color:#666;margin-top:20px">' + t.thanks + '</p></div>'
      + '<div style="text-align:center;padding:15px;color:#999;font-size:12px">' + brandName + '</div>'
      + '</div></body></html>'
    const result = await resend.emails.send({ from: brandName + ' <' + fromEmail + '>', to: booking.customer.email, subject: t.subject + ' - ' + booking.reference, html })
    console.log('[INVOICE] Sent to', booking.customer.email, 'for', booking.reference)
    res.json({ success: true, resendResponse: result })
  } catch (error: any) {
    console.error('[INVOICE] Error:', error)
    res.status(500).json({ error: 'Failed to send invoice', details: error?.message })
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
    const { brand, bookingId, amount, customerEmail, successUrl, cancelUrl, locale } = req.body
    const stripe = getStripeInstance(brand)
    
    // Mapper la langue pour Stripe (fr, es, en)
    const stripeLocale = locale === 'es' ? 'es' : locale === 'en' ? 'en' : 'fr'
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      locale: stripeLocale,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: brand === 'MOTOR-RENT' 
              ? (stripeLocale === 'es' ? 'Reserva Motor-Rent' : stripeLocale === 'en' ? 'Motor-Rent Booking' : 'Réservation Motor-Rent')
              : (stripeLocale === 'es' ? 'Reserva Voltride' : stripeLocale === 'en' ? 'Voltride Booking' : 'Réservation Voltride'),
            description: stripeLocale === 'es' ? `Anticipo reserva #${bookingId}` : stripeLocale === 'en' ? `Booking deposit #${bookingId}` : `Acompte réservation #${bookingId}`,
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
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_VOLTRIDE
    let event
    if (sig && webhookSecret) {
      const stripe = stripeVoltride || stripeMotorrent as any
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } else {
      event = JSON.parse(req.body.toString())
      console.warn('⚠️ Webhook sans vérification de signature!')
    }
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const bookingId = session.metadata?.bookingId
      
      if (bookingId) {
        // 1. Mettre à jour le statut de la réservation
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' }
        })

        // 2. Charger toutes les données du booking pour l'email
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            customer: true,
            agency: true,
            items: { include: { vehicle: true } },
            fleetVehicle: true
          }
        })

        // 3. Envoyer l'email de confirmation
        if (booking && booking.customer?.email) {
          const vehicleItem = booking.items?.[0]
          const brand = booking.agency?.brand || 'VOLTRIDE'
          const language = (booking.language || 'es') as 'fr' | 'es' | 'en'
          const rawVehicleName = vehicleItem?.vehicle?.name
          const vehicleName = typeof rawVehicleName === 'object' && rawVehicleName !== null
            ? ((rawVehicleName as any)[language] || (rawVehicleName as any).es || (rawVehicleName as any).fr || (rawVehicleName as any).en || 'Véhicule')
            : (rawVehicleName || 'Véhicule')
          const vehicleNumber = booking.fleetVehicle?.licensePlate || booking.fleetVehicle?.vehicleNumber || (typeof rawVehicleName === 'string' ? rawVehicleName : '') || ''
          const isRegisteredVehicle = vehicleItem?.vehicle?.hasPlate ?? false
          const t = emailTemplates[language] || emailTemplates.fr
          const brandName = brand === 'VOLTRIDE' ? 'Voltride' : brand === 'MOTOR-RENT' ? 'Motor-Rent' : 'Trivium Buggy'
          const brandColor = brand === 'VOLTRIDE' ? '#0e7490' : brand === 'MOTOR-RENT' ? '#ffaf10' : '#16a34a'
          const logoUrl = brand === 'VOLTRIDE' 
            ? 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1766883143/IMG-20251228-WA0001-removebg-preview_n0fsq5.png'
            : brand === 'MOTOR-RENT'
            ? 'https://res.cloudinary.com/dof8xnabp/image/upload/v1737372450/MOTOR_RENT_LOGO_copy_kxwqjk.png'
            : 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1766883143/IMG-20251228-WA0001-removebg-preview_n0fsq5.png'
          
          const documents = isRegisteredVehicle ? t.documentsRegistered : t.documentsNonRegistered
          const remainingAmount = booking.totalPrice - booking.paidAmount

          const formatDate = (date: Date) => {
            return date.toLocaleDateString(language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : 'fr-FR')
          }

          // Adresse de l'agence formatée
          const rawAgencyName = booking.agency?.name
          const agencyName = typeof rawAgencyName === 'object' && rawAgencyName !== null
            ? ((rawAgencyName as any)[language] || (rawAgencyName as any).es || (rawAgencyName as any).fr || (rawAgencyName as any).en || '')
            : (rawAgencyName || '')
          const agencyAddress = booking.agency 
            ? `${agencyName} - ${booking.agency.address}, ${booking.agency.postalCode} ${booking.agency.city}`
            : ''

          const agencyAddressLabel = language === 'es' ? 'Dirección de recogida' : language === 'en' ? 'Pick-up location' : 'Adresse de retrait'

          const html = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: ${brandColor}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <img src="${logoUrl}" alt="${brandName}" style="max-width: 200px; max-height: 80px; margin-bottom: 10px;" />
              <p style="margin: 10px 0 0 0; font-size: 18px;">${t.subject}</p>
            </div>
            <div style="padding: 25px; border: 1px solid #ddd; border-top: none; background: white;">
              <p style="font-size: 16px;">${t.greeting} ${booking.customer.firstName},</p>
              <p>${t.confirmationText}</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${brandColor};">
                <h3 style="margin-top: 0; color: ${brandColor};">🚲 ${t.vehicleLabel}</h3>
                <p style="margin: 0; font-size: 16px;"><strong>${vehicleNumber}</strong>${vehicleNumber !== vehicleName ? ' - ' + vehicleName : ''}</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${brandColor};">
                <h3 style="margin-top: 0; color: ${brandColor};">📅 ${t.periodLabel}</h3>
                <p style="margin: 0;">${t.from} <strong>${formatDate(booking.startDate)}</strong> ${t.at} <strong>${booking.startTime || ''}</strong></p>
                <p style="margin: 5px 0 0 0;">${t.to} <strong>${formatDate(booking.endDate)}</strong> ${t.at} <strong>${booking.endTime || ''}</strong></p>
              </div>

              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${brandColor};">
                <h3 style="margin-top: 0; color: ${brandColor};">📍 ${agencyAddressLabel}</h3>
                <p style="margin: 0;">${agencyAddress}</p>
              </div>
              
              <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0e7490;">💰 ${t.paymentTitle}</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0;">${t.totalLabel}</td><td style="text-align: right; padding: 8px 0;"><strong>${booking.totalPrice}€</strong></td></tr>
                  <tr><td style="padding: 8px 0;">${t.paidLabel} (${t.card})</td><td style="text-align: right; padding: 8px 0; color: green;"><strong>${booking.paidAmount}€</strong></td></tr>
                  ${remainingAmount > 0 ? '<tr><td style="padding: 8px 0;">' + t.remainingLabel + '</td><td style="text-align: right; padding: 8px 0; color: orange;"><strong>' + remainingAmount.toFixed(2) + '€</strong></td></tr>' : ''}
                  <tr style="border-top: 2px solid #ccc;"><td style="padding: 12px 0; font-weight: bold;">${t.depositLabel}</td><td style="text-align: right; padding: 12px 0;"><strong>${booking.depositAmount || 100}€</strong></td></tr>
                </table>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">📋 ${t.documentsTitle}</h3>
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                  ${documents.map((doc: string) => '<li style="margin-bottom: 8px;">' + doc + '</li>').join('')}
                </ul>
              </div>
              
              <p style="text-align: center; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f9ff; border-radius: 8px;">
          <p style="color: #555; margin-bottom: 15px;">${t.portalDescription}</p>
          <a href="${t.portalUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">${t.portalButton}</a>
        </div>
                ${t.footer}<br/>
                <strong>${t.team} ${brandName}</strong>
              </p>
            </div>
            <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} ${brandName} - Todos los derechos reservados
            </div>
          </body>
          </html>
          `

          const fromEmail = brand === 'VOLTRIDE' ? 'reservations@voltride.es' : brand === 'MOTOR-RENT' ? 'reservations@motor-rent.es' : 'reservations@voltride.es'

          try {
            const result = await resend.emails.send({
              from: brandName + ' <' + fromEmail + '>',
              to: booking.customer.email,
              subject: t.subject + ' - ' + booking.reference,
              html
            })
            console.log('[WEBHOOK EMAIL] Confirmation sent to', booking.customer.email, 'for booking', booking.reference, 'Result:', JSON.stringify(result))
          } catch (emailError) {
            console.error('[WEBHOOK EMAIL] Failed to send confirmation:', emailError)
            // On ne bloque pas le webhook si l'email échoue
          }
          // 4. Email notification admin
          try {
            const adminEmail2 = brand === 'VOLTRIDE' ? 'info@voltride.es' : 'info@motor-rent.es'
            await resend.emails.send({
              from: brandName + ' <' + fromEmail + '>',
              to: adminEmail2,
              subject: '🆕 Nueva reserva ' + booking.reference + ' (pago confirmado)',
              html: '<div style="font-family:Arial;max-width:600px;margin:0 auto">'
                + '<h2 style="color:#0e7490">🆕 Nueva reserva - ' + booking.reference + '</h2>'
                + '<p style="background:#d4edda;padding:10px;border-radius:8px;color:#155724">✅ Pago confirmado por Stripe</p>'
                + '<table style="width:100%;border-collapse:collapse">'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Cliente</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">' + booking.customer?.firstName + ' ' + booking.customer?.lastName + '</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px;border-bottom:1px solid #eee">' + booking.customer?.email + '</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Teléfono</td><td style="padding:8px;border-bottom:1px solid #eee">' + (booking.customer?.phone || '-') + '</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Vehículo</td><td style="padding:8px;border-bottom:1px solid #eee">' + vehicleName + '</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Período</td><td style="padding:8px;border-bottom:1px solid #eee">' + booking.startDate.toLocaleDateString('es-ES') + ' ' + booking.startTime + ' → ' + booking.endDate.toLocaleDateString('es-ES') + ' ' + booking.endTime + '</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Precio total</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#0e7490">' + booking.totalPrice.toFixed(2) + '€</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Anticipo pagado</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#28a745">' + booking.paidAmount.toFixed(2) + '€</td></tr>'
                + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Origen</td><td style="padding:8px;border-bottom:1px solid #eee">🌐 Widget (online)</td></tr>'
                + '<tr><td style="padding:8px;color:#666">Agencia</td><td style="padding:8px">' + agencyName + '</td></tr>'
                + '</table></div>'
            })
            console.log('[WEBHOOK] Admin email sent to', adminEmail2)
          } catch (adminErr) { console.error('[WEBHOOK] Admin email error:', adminErr) }
        }
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
        customerIdCardVersoUrl: req.body.idCardReversoUrl || undefined,
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
        customerIdCardVersoUrl: req.body.idCardReversoUrl || undefined,
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
        allowedApps: user.allowedApps || [],
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
      agencyIds: user.agencyIds,
      allowedApps: user.allowedApps || []
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
        allowedApps: req.body.allowedApps || [],
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
      select: { id: true, email: true, firstName: true, lastName: true, role: true, brands: true, agencyIds: true, allowedApps: true, language: true, isActive: true, lastLoginAt: true, createdAt: true }
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
        booking: true,
        fleetVehicle: { include: { vehicle: { include: { category: true } }, documents: { where: { sendToCustomer: true } } } },
        agency: true
      }
    })
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    
    const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE'
    const brandSettings = await prisma.brandSettings.findUnique({ where: { brand } })
    const clientLang = (contract as any).termsLanguage || (req.query.lang as string) || "fr"
    
    const pdfBuffer = await generateContractPDF(contract, brandSettings, clientLang)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="contrat-${contract.contractNumber}.pdf"`)
    res.send(pdfBuffer)
  } catch (e: any) {
    console.error('PDF generation error:', e)
    res.status(500).json({ error: 'Failed to generate PDF', details: e.message })
  }
})

// Send contract by email
app.post("/api/contracts/:id/send", async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { id: req.params.id },
      include: { customer: true, booking: true, fleetVehicle: { include: { vehicle: { include: { category: true } }, documents: { where: { sendToCustomer: true } } } }, agency: true }
    })
    if (!contract) return res.status(404).json({ error: "Contract not found" })
    const email = req.body.email || contract.customer?.email
    if (!email) return res.status(400).json({ error: "No email provided" })
    const brand = contract.fleetVehicle?.vehicle?.category?.brand || "VOLTRIDE"
    const brandSettings = await prisma.brandSettings.findUnique({ where: { brand } })
    const clientLang = (contract as any).termsLanguage || "fr"
    const pdfBuffer = await generateContractPDF(contract, brandSettings, clientLang)
    const vehicleName = contract.fleetVehicle?.vehicle?.name || "Vehículo"
    const parsed = typeof vehicleName === "string" ? (() => { try { return JSON.parse(vehicleName) } catch { return { es: vehicleName } } })() : vehicleName
    const vName = (parsed as any)?.es || "Vehículo"
    await resend.emails.send({
      from: "Voltride <no-reply@voltride.es>",
      to: email,
      subject: `Contrato de alquiler - ${contract.contractNumber}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="text-align:center;margin-bottom:20px"><img src="${brandSettings?.logoUrl || ""}" alt="Logo" style="height:50px"/></div>
        <h2 style="color:#f59e0b">Contrato de Alquiler</h2>
        <p>Estimado/a ${contract.customer?.firstName || ""} ${contract.customer?.lastName || ""},</p>
        <p>Adjunto encontrará su contrato de alquiler para el vehículo <strong>${vName}</strong>.</p>
        <p><strong>Número de contrato:</strong> ${contract.contractNumber}</p>
        <p><strong>Fecha inicio:</strong> ${new Date(contract.currentStartDate).toLocaleDateString("es-ES")}</p>
        <p><strong>Fecha fin:</strong> ${new Date(contract.currentEndDate).toLocaleDateString("es-ES")}</p>
        <p>Gracias por confiar en nosotros.</p>
        <p style="margin-top:30px;color:#666;font-size:12px">Voltride - Alquiler de vehículos eléctricos</p>
      </div>`,
      attachments: [{ filename: `contrato-${contract.contractNumber}.pdf`, content: pdfBuffer.toString("base64") }]
    })
    res.json({ success: true, message: "Contract sent to " + email })
  } catch (e: any) {
    console.error("Send contract error:", e)
    res.status(500).json({ error: "Failed to send contract", details: e.message })
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

// ============== NOTIFICATION HELPER ==============
async function sendNotificationByType(type: string, title: string, body: string, data?: any) {
  try {
    // Récupérer les paramètres de notification pour ce type
    const setting = await prisma.notificationSetting.findUnique({ where: { notificationType: type } })
    if (!setting) return { sent: 0 }
    
    // Déterminer les rôles à notifier
    const rolesToNotify: string[] = []
    if (setting.roleAdmin) rolesToNotify.push('ADMIN')
    if (setting.roleManager) rolesToNotify.push('MANAGER')
    if (setting.roleOperator) rolesToNotify.push('OPERATOR')
    
    if (rolesToNotify.length === 0) return { sent: 0 }
    
    // Récupérer les utilisateurs de ces rôles
    const users = await prisma.user.findMany({
      where: { role: { in: rolesToNotify as any }, isActive: true }
    })
    
    let sent = 0
    for (const user of users) {
      // Créer la notification dans l'historique
      await prisma.notification.create({
        data: { userId: user.id, title, body, icon: '/icon-192.png', data: data || {} }
      })
      
      // Envoyer push notification
      const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } })
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, icon: '/icon-192.png', data })
          )
          sent++
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
          }
        }
      }
    }
    return { sent, users: users.length }
  } catch (e) { console.error('sendNotificationByType error:', e); return { sent: 0, error: e } }
}





// ============== CRON NOTIFICATIONS (à appeler toutes les 5-10 min) ==============
app.get('/api/cron/check-notifications', async (req, res) => {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const results = { checkinImminent: 0, checkoutImminent: 0, lateReturn: 0 }
    
    // Récupérer les réservations du jour
    const todayBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { startDate: { gte: new Date(today), lt: new Date(today + 'T23:59:59') } },
          { endDate: { gte: new Date(today), lt: new Date(today + 'T23:59:59') } }
        ],
        status: { in: ['CONFIRMED', 'CHECKED_IN'] }
      },
      include: { customer: true, fleetVehicle: true, agency: true }
    })
    
    for (const booking of todayBookings) {
      // Parse l'heure de début (format "HH:MM")
      const [startHour, startMin] = booking.startTime.split(':').map(Number)
      const [endHour, endMin] = booking.endTime.split(':').map(Number)
      
      // Check-in inminente (30 min antes)
      if (!booking.checkedIn && booking.startDate.toISOString().split('T')[0] === today) {
        const startMinutes = startHour * 60 + startMin
        const nowMinutes = currentHour * 60 + currentMinute
        const diff = startMinutes - nowMinutes
        
        if (diff > 0 && diff <= 30) {
          // Vérifier si notification déjà envoyée (via tag unique)
          const existing = await prisma.notification.findFirst({
            where: { 
              data: { path: ['bookingId'], equals: booking.id },
              title: { contains: 'Check-in inminente' },
              createdAt: { gte: new Date(today) }
            }
          })
          
          if (!existing) {
            await sendNotificationByType(
              'checkin_imminent',
              '⏰ Check-in inminente',
              `${booking.customer?.firstName} ${booking.customer?.lastName} llega en ${diff} min (${booking.startTime})`,
              { bookingId: booking.id, reference: booking.reference }
            )
            results.checkinImminent++
          }
        }
      }
      
      // Check-out inminente (30 min antes)
      if (booking.checkedIn && !booking.checkedOut && booking.endDate.toISOString().split('T')[0] === today) {
        const endMinutes = endHour * 60 + endMin
        const nowMinutes = currentHour * 60 + currentMinute
        const diff = endMinutes - nowMinutes
        
        if (diff > 0 && diff <= 30) {
          const existing = await prisma.notification.findFirst({
            where: { 
              data: { path: ['bookingId'], equals: booking.id },
              title: { contains: 'Check-out inminente' },
              createdAt: { gte: new Date(today) }
            }
          })
          
          if (!existing) {
            await sendNotificationByType(
              'checkout_imminent',
              '⏰ Check-out inminente',
              `${booking.customer?.firstName} ${booking.customer?.lastName} debe devolver en ${diff} min (${booking.endTime})`,
              { bookingId: booking.id, reference: booking.reference }
            )
            results.checkoutImminent++
          }
        }
      }
      
      // Retraso en devolución
      if (booking.checkedIn && !booking.checkedOut && booking.endDate.toISOString().split('T')[0] === today) {
        const endMinutes = endHour * 60 + endMin
        const nowMinutes = currentHour * 60 + currentMinute
        
        if (nowMinutes > endMinutes) {
          const lateMinutes = nowMinutes - endMinutes
          
          // Enviar notificación cada 15 min de retraso
          if (lateMinutes % 15 < 5) {
            const existing = await prisma.notification.findFirst({
              where: { 
                data: { path: ['bookingId'], equals: booking.id },
                title: { contains: 'Retraso' },
                createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } // 10 min
              }
            })
            
            if (!existing) {
              await sendNotificationByType(
                'late_return',
                '⚠️ Retraso en devolución',
                `${booking.customer?.firstName} ${booking.customer?.lastName} tiene ${lateMinutes} min de retraso`,
                { bookingId: booking.id, reference: booking.reference, lateMinutes }
              )
              results.lateReturn++
            }
          }
        }
      }
    }
    
    res.json({ success: true, checked: todayBookings.length, notifications: results })
  } catch (error) { 
    console.error('Cron notifications error:', error)
    res.status(500).json({ error: 'Failed to check notifications' }) 
  }
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
    if (customer) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { firstName: req.body.customer.firstName, lastName: req.body.customer.lastName, phone: req.body.customer.phone, address: req.body.customer.address, postalCode: req.body.customer.postalCode, city: req.body.customer.city, country: req.body.customer.country || customer.country } })
    }
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
    const { startDate, endDate, startTime, endTime, fleetVehicleId, status, checkedIn, checkedInAt, checkedOut, checkedOutAt, options } = req.body
    
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
    
    // Check-in fields
    if (req.body.startMileage !== undefined) updateData.startMileage = req.body.startMileage
    if (req.body.fuelLevelStart) updateData.fuelLevelStart = req.body.fuelLevelStart
    if (req.body.depositMethod) updateData.depositMethod = req.body.depositMethod
    if (req.body.paidAmount !== undefined) updateData.paidAmount = req.body.paidAmount
    if (req.body.idCardUrl) updateData.idCardUrl = req.body.idCardUrl
    if (req.body.idCardReversoUrl) updateData.idCardVersoUrl = req.body.idCardReversoUrl
    if (req.body.licenseUrl) updateData.licenseUrl = req.body.licenseUrl
    if (req.body.licenseReversoUrl) updateData.licenseVersoUrl = req.body.licenseReversoUrl
    if (req.body.signatureUrl) updateData.signatureUrl = req.body.signatureUrl
    // Check-in photos
    if (req.body.checkInPhotos) {
      const photos = req.body.checkInPhotos
      if (photos.front) updateData.photoFront = photos.front
      if (photos.left) updateData.photoLeft = photos.left
      if (photos.right) updateData.photoRight = photos.right
      if (photos.rear) updateData.photoRear = photos.rear
      if (photos.counter) updateData.photoCounter = photos.counter
    }
    
    // Mise à jour des options si fournies
    if (options && Array.isArray(options)) {
      console.log('Updating options for booking:', id, 'Options:', JSON.stringify(options))
      
      // Supprimer les anciennes options
      await prisma.bookingOption.deleteMany({ where: { bookingId: id } })
      console.log('Deleted old options')
      
      // Récupérer les dates de la réservation
      const existingBooking = await prisma.booking.findUnique({ where: { id } })
      const start = updateData.startDate || existingBooking?.startDate
      const end = updateData.endDate || existingBooking?.endDate
      const days = start && end ? Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))) : 1
      console.log('Days calculated:', days)
      
      // Ajouter les nouvelles options
      for (const opt of options) {
        if (opt.quantity > 0 && opt.optionId) {
          console.log('Processing option:', opt.optionId, 'quantity:', opt.quantity)
          
          const optionData = await prisma.option.findUnique({ where: { id: opt.optionId } })
          if (optionData) {
            const dayKey = days <= 14 ? 'day' + days : 'day14'
            const pricePerDay = (optionData as any)[dayKey] || 0
            const totalPrice = pricePerDay * opt.quantity
            
            console.log('Creating option:', { optionId: opt.optionId, quantity: opt.quantity, unitPrice: pricePerDay, totalPrice })
            
            await prisma.bookingOption.create({
              data: {
                bookingId: id,
                optionId: opt.optionId,
                quantity: opt.quantity,
                unitPrice: pricePerDay,
                totalPrice: totalPrice
              }
            })
            console.log('Option created successfully')
          } else {
            console.log('Option not found:', opt.optionId)
          }
        }
      }
    }
    // Recalculer le prix si les dates ont changé
    if (startDate || endDate) {
      const existingBooking = await prisma.booking.findUnique({ 
        where: { id },
        include: { items: { include: { vehicle: { include: { pricing: true } } } } }
      })
      if (existingBooking) {
        const newStart = updateData.startDate || existingBooking.startDate
        const newEnd = updateData.endDate || existingBooking.endDate
        const days = Math.max(1, Math.ceil((new Date(newEnd).getTime() - new Date(newStart).getTime()) / (1000 * 60 * 60 * 24)))
        
        let newTotal = 0
        for (const item of existingBooking.items) {
          const pricing = item.vehicle?.pricing?.[0]
          if (pricing) {
            const dayKey = 'day' + Math.min(days, 14)
            let itemPrice = Number((pricing as any)[dayKey]) || 0
            if (days > 14) {
              const dailyRate = (Number((pricing as any).day14) || 0) / 14
              itemPrice += Math.floor((days - 14) * dailyRate)
            }
            newTotal += itemPrice * item.quantity
          }
        }
        
        if (newTotal > 0) {
          updateData.totalPrice = newTotal
          console.log('Recalculated price:', { days, newTotal })
        }
      }
    }
    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        agency: true,
        customer: true,
        fleetVehicle: { include: { vehicle: true } },
        options: { include: { option: true } },
        items: { include: { vehicle: true } }
      }
    })
    
    // Mettre à jour le contrat avec les docs CNI
    if (req.body.idCardReversoUrl || req.body.idCardUrl) {
      const existingContract = await prisma.rentalContract.findUnique({ where: { bookingId: id } })
      if (existingContract) {
        await prisma.rentalContract.update({
          where: { id: existingContract.id },
          data: {
            ...(req.body.idCardUrl && { customerIdCardUrl: req.body.idCardUrl }),
            ...(req.body.idCardReversoUrl && { customerIdCardVersoUrl: req.body.idCardReversoUrl })
          }
        })
      }
    }
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
      paidAmount = 0,
      paymentMethod,
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
        paidAmount: paidAmount || 0,
        paymentMethod: paymentMethod || null,
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
   // Email notification admin
    try {
      const adminEmail = booking.agency?.brand === 'VOLTRIDE' ? 'info@voltride.es' : 'info@motor-rent.es'
      const fromEmail2 = booking.agency?.brand === 'VOLTRIDE' ? 'reservations@voltride.es' : 'reservations@motor-rent.es'
      const brandName2 = booking.agency?.brand === 'VOLTRIDE' ? 'Voltride' : 'Motor-Rent'
      const vehicleName2 = booking.items?.[0]?.vehicle?.name
      const vName2 = typeof vehicleName2 === 'object' ? ((vehicleName2 as any)?.es || (vehicleName2 as any)?.fr || '') : (vehicleName2 || '')
      await resend.emails.send({
        from: brandName2 + ' <' + fromEmail2 + '>',
        to: adminEmail,
        subject: '🆕 Nueva reserva ' + booking.reference,
        html: '<div style="font-family:Arial;max-width:600px;margin:0 auto">'
          + '<h2 style="color:#0e7490">🆕 Nueva reserva - ' + booking.reference + '</h2>'
          + '<table style="width:100%;border-collapse:collapse">'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Cliente</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">' + booking.customer?.firstName + ' ' + booking.customer?.lastName + '</td></tr>'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px;border-bottom:1px solid #eee">' + booking.customer?.email + '</td></tr>'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Teléfono</td><td style="padding:8px;border-bottom:1px solid #eee">' + (booking.customer?.phone || '-') + '</td></tr>'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Vehículo</td><td style="padding:8px;border-bottom:1px solid #eee">' + vName2 + '</td></tr>'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Período</td><td style="padding:8px;border-bottom:1px solid #eee">' + new Date(booking.startDate).toLocaleDateString('es-ES') + ' ' + booking.startTime + ' → ' + new Date(booking.endDate).toLocaleDateString('es-ES') + ' ' + booking.endTime + '</td></tr>'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Precio</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#0e7490">' + booking.totalPrice?.toFixed(2) + '€</td></tr>'
          + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Origen</td><td style="padding:8px;border-bottom:1px solid #eee">🏪 Agencia (operador)</td></tr>'
          + '<tr><td style="padding:8px;color:#666">Agencia</td><td style="padding:8px">' + ((booking.agency?.name as any)?.es || (booking.agency?.name as any)?.fr || '') + '</td></tr>'
          + '</table></div>'
      })
    } catch (emailErr) { console.error('Admin notification email error:', emailErr) } 
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
// ============== APP SETTINGS (ENTREPRISE) ==============
// GET - Récupérer un paramètre par clé
app.get('/api/settings/:key', async (req, res) => {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: req.params.key }
    })
    if (setting) {
      res.json(setting.value)
    } else {
      res.json(null)
    }
  } catch (error) {
    console.error('Error fetching setting:', error)
    res.status(500).json({ error: 'Failed to fetch setting' })
  }
})

// PUT - Sauvegarder un paramètre
app.put('/api/settings/:key', async (req, res) => {
  try {
    const setting = await prisma.appSettings.upsert({
      where: { key: req.params.key },
      update: { value: req.body },
      create: { key: req.params.key, value: req.body }
    })
    res.json(setting)
  } catch (error) {
    console.error('Error saving setting:', error)
    res.status(500).json({ error: 'Failed to save setting' })
  }
})

console.log('App settings routes loaded')


// Generate and save QR code for a single fleet vehicle
app.post('/api/fleet/:id/generate-qr', async (req, res) => {
  try {
    const fleet = await prisma.fleet.findUnique({
      where: { id: req.params.id },
      include: { vehicle: { include: { category: true } }, agency: true }
    })
    if (!fleet) return res.status(404).json({ error: 'Vehicle not found' })
    
    const brand = (fleet.vehicle as any)?.category?.brand || 'VOLTRIDE'
    const operatorUrl = brand === 'VOLTRIDE' ? 'https://operator-production-188c.up.railway.app' : 'https://motor-rent-operator-production.up.railway.app'
    const qrUrl = operatorUrl + '?vehicle=' + fleet.id
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 400, margin: 1 })
    
    // Upload to Cloudinary
    const crypto = require('crypto')
    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'qrcodes/vehicles'
    const publicId = 'qr-' + fleet.vehicleNumber
    const apiSecret = process.env.CLOUDINARY_API_SECRET || ''
    const signStr = 'folder=' + folder + '&public_id=' + publicId + '&timestamp=' + timestamp + apiSecret
    const signature = crypto.createHash('sha1').update(signStr).digest('hex')
    
    const formData = new URLSearchParams()
    formData.append('file', qrDataUrl)
    formData.append('folder', folder)
    formData.append('public_id', publicId)
    formData.append('timestamp', String(timestamp))
    formData.append('api_key', process.env.CLOUDINARY_API_KEY || '485395684484158')
    formData.append('signature', signature)
    
    const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload', { method: 'POST', body: formData })
    const cloudData: any = await cloudRes.json()
    
    if (!cloudData.secure_url) return res.status(500).json({ error: 'Cloudinary upload failed', details: cloudData })
    
    await prisma.fleet.update({
      where: { id: req.params.id },
      data: { qrCodeUrl: cloudData.secure_url }
    })
    
    res.json({ success: true, qrCodeUrl: cloudData.secure_url, vehicleNumber: fleet.vehicleNumber })
  } catch (e: any) {
    console.error('Generate QR error:', e)
    res.status(500).json({ error: 'Failed to generate QR', details: e.message })
  }
})

// Generate QR codes for all vehicles of an agency
app.post('/api/fleet/generate-qr-all/:agencyId', async (req, res) => {
  try {
    const vehicles = await prisma.fleet.findMany({
      where: { agencyId: req.params.agencyId, isActive: true },
      include: { vehicle: { include: { category: true } } },
      orderBy: { vehicleNumber: 'asc' }
    })
    
    const results: any[] = []
    for (const fleet of vehicles) {
      const brand = (fleet.vehicle as any)?.category?.brand || 'VOLTRIDE'
      const operatorUrl = brand === 'VOLTRIDE' ? 'https://operator-production-188c.up.railway.app' : 'https://motor-rent-operator-production.up.railway.app'
      const qrUrl = operatorUrl + '?vehicle=' + fleet.id
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 400, margin: 1 })
      
      const crypto = require('crypto')
      const timestamp = Math.round(Date.now() / 1000)
      const folder = 'qrcodes/vehicles'
      const publicId = 'qr-' + fleet.vehicleNumber
      const apiSecret = process.env.CLOUDINARY_API_SECRET || ''
      const signStr = 'folder=' + folder + '&public_id=' + publicId + '&timestamp=' + timestamp + apiSecret
      const signature = crypto.createHash('sha1').update(signStr).digest('hex')
      
      const formData = new URLSearchParams()
      formData.append('file', qrDataUrl)
      formData.append('folder', folder)
      formData.append('public_id', publicId)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', process.env.CLOUDINARY_API_KEY || '485395684484158')
      formData.append('signature', signature)
      
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload', { method: 'POST', body: formData })
      const cloudData: any = await cloudRes.json()
      
      if (cloudData.secure_url) {
        await prisma.fleet.update({ where: { id: fleet.id }, data: { qrCodeUrl: cloudData.secure_url } })
        results.push({ vehicleNumber: fleet.vehicleNumber, qrCodeUrl: cloudData.secure_url })
      }
    }
    
    res.json({ success: true, count: results.length, vehicles: results })
  } catch (e: any) {
    console.error('Generate all QR error:', e)
    res.status(500).json({ error: 'Failed to generate QR codes', details: e.message })
  }
})


// ============== CANCEL CHECK-IN ==============
app.post('/api/bookings/:id/cancel-checkin', async (req, res) => {
  try {
    const { id } = req.params
    const { reason, switchToMaintenance, maintenanceNote } = req.body
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { fleetVehicle: true }
    })
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (!booking.checkedIn) return res.status(400).json({ error: 'Booking is not checked in' })
    if (booking.checkedOut) return res.status(400).json({ error: 'Booking is already checked out' })
    
    // 1. Cancel the booking
    await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        checkedOut: true,
        checkedOutAt: new Date(),
        depositCaptureReason: reason || 'Check-in cancelled'
      }
    })
    
    // 2. Update vehicle status
    if (booking.fleetVehicleId) {
      await prisma.fleet.update({
        where: { id: booking.fleetVehicleId },
        data: {
          status: switchToMaintenance ? 'MAINTENANCE' : 'AVAILABLE',
          ...(switchToMaintenance && maintenanceNote ? { maintenanceNotes: maintenanceNote } : {})
        }
      })
    }
    
    // 3. Cancel the contract if exists
    const contract = await prisma.rentalContract.findFirst({ where: { bookingId: id } })
    if (contract) {
      await prisma.rentalContract.update({
        where: { id: contract.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED'
        }
      })
    }
    
    res.json({ success: true, message: 'Check-in cancelled', switchedToMaintenance: switchToMaintenance || false })
  } catch (e: any) {
    console.error('Cancel check-in error:', e)
    res.status(500).json({ error: 'Failed to cancel check-in', details: e.message })
  }
})

// ============== QR CODE - ACTIVE BOOKING BY VEHICLE ==============
app.get('/api/fleet/:id/active-booking', async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        fleetVehicleId: req.params.id,
        checkedIn: true,
        checkedOut: false,
        status: { in: ['CHECKED_IN', 'CONFIRMED'] }
      },
      include: {
        customer: true,
        fleetVehicle: { include: { vehicle: true } },
        agency: true
      },
      orderBy: { checkedInAt: 'desc' }
    })
    if (!booking) return res.status(404).json({ error: 'No active booking for this vehicle' })
    res.json(booking)
  } catch (e: any) {
    console.error('Active booking error:', e)
    res.status(500).json({ error: 'Failed to find active booking' })
  }
})


// Generate QR codes for all fleet vehicles of an agency (for printing labels)
app.get('/api/fleet/qr-labels/:agencyId', async (req, res) => {
  try {
    const vehicles = await prisma.fleet.findMany({
      where: { agencyId: req.params.agencyId, status: { not: 'OUT_OF_SERVICE' } },
      include: { vehicle: { include: { category: true } } },
      orderBy: { vehicleNumber: 'asc' }
    })
    const brand = vehicles[0]?.vehicle?.category?.brand || 'VOLTRIDE'
    const operatorUrl = brand === 'VOLTRIDE' ? 'https://operator-production-188c.up.railway.app' : 'https://motor-rent-operator-production.up.railway.app'
    
    const labels = await Promise.all(vehicles.map(async (v: any) => {
      const qrUrl = operatorUrl + '?vehicle=' + v.id
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 1 })
      return {
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicle?.name,
        qrDataUrl,
        qrUrl
      }
    }))
    res.json(labels)
  } catch (e: any) {
    console.error('QR labels error:', e)
    res.status(500).json({ error: 'Failed to generate QR labels' })
  }
})

// ============== EMAIL CONFIRMATION ==============

const emailTemplates = {
  fr: {
    subject: 'Confirmation de réservation',
    greeting: 'Bonjour',
    confirmationText: 'Votre réservation a bien été enregistrée.',
    vehicleLabel: 'Véhicule',
    periodLabel: 'Période de location',
    from: 'du',
    to: 'au',
    at: 'à',
    totalLabel: 'Total de la réservation',
    paidLabel: 'Montant payé',
    remainingLabel: 'Reste à payer sur place',
    depositLabel: 'Caution (à prévoir au check-in)',
    documentsTitle: 'Documents à prévoir le jour de la location',
    documentsRegistered: [
      "Pièce d'identité ou passeport (le permis de conduire étranger ne fait pas office de pièce d'identité)",
      "Permis de conduire physique valide",
      "Carte de crédit ou espèces (pas de carte de débit)"
    ],
    documentsNonRegistered: [
      "Pièce d'identité ou passeport (le permis de conduire étranger ne fait pas office de pièce d'identité)",
      "Carte de crédit ou espèces (pas de carte de débit)"
    ],
    paymentTitle: 'Récapitulatif du paiement',
    paymentMethod: 'Mode de paiement',
    card: 'Carte bancaire',
    cash: 'Espèces',
    portalUrl: 'https://voltride.es/espace-client',
    portalButton: 'Accéder à mon espace client',
    portalDescription: 'Suivez, modifiez ou prolongez votre réservation depuis votre espace client :',
    footer: "Merci pour votre confiance. À bientôt !",
    team: "L'équipe"
  },
  es: {
    subject: 'Confirmación de reserva',
    greeting: 'Hola',
    confirmationText: 'Su reserva ha sido registrada correctamente.',
    vehicleLabel: 'Vehículo',
    periodLabel: 'Período de alquiler',
    from: 'del',
    to: 'al',
    at: 'a las',
    totalLabel: 'Total de la reserva',
    paidLabel: 'Importe pagado',
    remainingLabel: 'Resto a pagar en el local',
    depositLabel: 'Fianza (a prever en el check-in)',
    documentsTitle: 'Documentos necesarios el día del alquiler',
    documentsRegistered: [
      "Documento de identidad o pasaporte (el permiso de conducir extranjero no sirve como documento de identidad)",
      "Permiso de conducir físico válido",
      "Tarjeta de crédito o efectivo (no tarjeta de débito)"
    ],
    documentsNonRegistered: [
      "Documento de identidad o pasaporte (el permiso de conducir extranjero no sirve como documento de identidad)",
      "Tarjeta de crédito o efectivo (no tarjeta de débito)"
    ],
    paymentTitle: 'Resumen del pago',
    paymentMethod: 'Método de pago',
    card: 'Tarjeta bancaria',
    cash: 'Efectivo',
    portalUrl: 'https://voltride.es/mi-cuenta',
    portalButton: 'Acceder a mi espacio cliente',
    portalDescription: 'Consulte, modifique o prolongue su reserva desde su espacio cliente :',
    footer: "Gracias por su confianza. ¡Hasta pronto!",
    team: "El equipo"
  },
  en: {
    subject: 'Booking Confirmation',
    greeting: 'Hello',
    confirmationText: 'Your booking has been successfully registered.',
    vehicleLabel: 'Vehicle',
    periodLabel: 'Rental period',
    from: 'from',
    to: 'to',
    at: 'at',
    totalLabel: 'Total booking amount',
    paidLabel: 'Amount paid',
    remainingLabel: 'Remaining to pay on site',
    depositLabel: 'Deposit (required at check-in)',
    documentsTitle: 'Documents required on rental day',
    documentsRegistered: [
      "ID card or passport (foreign driving license does not serve as ID)",
      "Valid physical driving license",
      "Credit card or cash (no debit card)"
    ],
    documentsNonRegistered: [
      "ID card or passport (foreign driving license does not serve as ID)",
      "Credit card or cash (no debit card)"
    ],
    paymentTitle: 'Payment summary',
    paymentMethod: 'Payment method',
    card: 'Credit card',
    cash: 'Cash',
    portalUrl: 'https://voltride.es/my-account',
    portalButton: 'Access my customer portal',
    portalDescription: 'Track, modify or extend your booking from your customer portal :',
    footer: "Thank you for your trust. See you soon!",
    team: "The team"
  }
}

app.post('/api/send-booking-confirmation', async (req, res) => {
  console.log('[EMAIL] === Starting email send ===')
  console.log('[EMAIL] Request body:', JSON.stringify(req.body, null, 2))
  
  try {
    const { 
      bookingId, email, firstName, lastName, vehicleName, vehicleNumber,
      startDate, endDate, startTime, endTime, totalPrice, paidAmount, 
      remainingAmount, paymentMethod, brand, language = 'fr', isRegisteredVehicle = false
    } = req.body

    console.log('[EMAIL] Parsed data - email:', email, 'brand:', brand, 'language:', language, 'isRegistered:', isRegisteredVehicle)

    const t = emailTemplates[language as keyof typeof emailTemplates] || emailTemplates.fr
    const brandName = brand === 'VOLTRIDE' ? 'Voltride' : 'Motor-Rent'
    const brandColor = brand === 'VOLTRIDE' ? '#0e7490' : '#ffaf10'
    const logoUrl = brand === 'VOLTRIDE' 
      ? 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1766883143/IMG-20251228-WA0001-removebg-preview_n0fsq5.png'
      : 'https://res.cloudinary.com/dof8xnabp/image/upload/v1737372450/MOTOR_RENT_LOGO_copy_kxwqjk.png'

    const documents = isRegisteredVehicle ? t.documentsRegistered : t.documentsNonRegistered

    const formatDate = (date: string) => {
      const d = new Date(date)
      return d.toLocaleDateString(language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : 'fr-FR')
    }
    // Generate QR code for booking and upload to Cloudinary
    const operatorUrl = brand === 'VOLTRIDE' ? 'https://operator-production-188c.up.railway.app' : 'https://motor-rent-operator-production.up.railway.app'
    const qrUrl = operatorUrl + '?scan=' + bookingId
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 1 })
    let qrImageUrl = qrDataUrl
    try {
      const timestamp = Math.round(Date.now() / 1000)
      const folder = 'qrcodes/bookings'
      const publicId = 'qr-' + bookingId
      const crypto = require('crypto')
      const apiSecret = process.env.CLOUDINARY_API_SECRET || ''
      const signStr = 'folder=' + folder + '&public_id=' + publicId + '&timestamp=' + timestamp + apiSecret
      const signature = crypto.createHash('sha1').update(signStr).digest('hex')
      
      const formData = new URLSearchParams()
      formData.append('file', qrDataUrl)
      formData.append('folder', folder)
      formData.append('public_id', publicId)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', process.env.CLOUDINARY_API_KEY || '485395684484158')
      formData.append('signature', signature)
      
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload', {
        method: 'POST',
        body: formData
      })
      const cloudData: any = await cloudRes.json()
      if (cloudData.secure_url) {
        qrImageUrl = cloudData.secure_url
        console.log('[QR] Uploaded to Cloudinary:', qrImageUrl)
      } else {
        console.error('[QR] Cloudinary error:', cloudData)
      }
    } catch (e) { console.error('[QR] Upload error:', e) }

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: ${brandColor}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="${logoUrl}" alt="${brandName}" style="max-width: 200px; max-height: 80px; margin-bottom: 10px;" />
        <p style="margin: 10px 0 0 0; font-size: 18px;">${t.subject}</p>
      </div>
      <div style="padding: 25px; border: 1px solid #ddd; border-top: none; background: white;">
        <p style="font-size: 16px;">${t.greeting} ${firstName},</p>
        <p>${t.confirmationText}</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${brandColor};">
          <h3 style="margin-top: 0; color: ${brandColor};">🚲 ${t.vehicleLabel}</h3>
          <p style="margin: 0; font-size: 16px;"><strong>${vehicleNumber}</strong> - ${vehicleName}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${brandColor};">
          <h3 style="margin-top: 0; color: ${brandColor};">📅 ${t.periodLabel}</h3>
          <p style="margin: 0;">${t.from} <strong>${formatDate(startDate)}</strong> ${t.at} <strong>${startTime}</strong></p>
          <p style="margin: 5px 0 0 0;">${t.to} <strong>${formatDate(endDate)}</strong> ${t.at} <strong>${endTime}</strong></p>
        </div>
        
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0e7490;">💰 ${t.paymentTitle}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;">${t.totalLabel}</td><td style="text-align: right; padding: 8px 0;"><strong>${totalPrice}€</strong></td></tr>
            <tr><td style="padding: 8px 0;">${t.paidLabel} (${paymentMethod === 'card' ? t.card : t.cash})</td><td style="text-align: right; padding: 8px 0; color: green;"><strong>${paidAmount}€</strong></td></tr>
            ${remainingAmount > 0 ? '<tr><td style="padding: 8px 0;">' + t.remainingLabel + '</td><td style="text-align: right; padding: 8px 0; color: orange;"><strong>' + remainingAmount + '€</strong></td></tr>' : ''}
            <tr style="border-top: 2px solid #ccc;"><td style="padding: 12px 0; font-weight: bold;">${t.depositLabel}</td><td style="text-align: right; padding: 12px 0;"><strong>${req.body.depositAmount || 100}€</strong></td></tr>
          </table>
        </div>
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f9ff; border-radius: 8px;">
          <p style="color: #555; margin-bottom: 15px;">${t.portalDescription}</p>
          <a href="${t.portalUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">${t.portalButton}</a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">📋 ${t.documentsTitle}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${documents.map((doc: string) => '<li style="margin-bottom: 8px;">' + doc + '</li>').join('')}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px dashed #ddd;">
          <p style="font-weight: bold; color: #333; margin-bottom: 10px;">📱 QR Code - Check-in</p>
          <img src="${qrImageUrl}" alt="QR Code" style="width: 180px; height: 180px;" />
          <p style="font-size: 12px; color: #888; margin-top: 8px;">${vehicleNumber}</p>
        </div>

        <p style="text-align: center; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          ${t.footer}<br/>
          <strong>${t.team} ${brandName}</strong>
        </p>
      </div>
      <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} ${brandName} - Tous droits réservés
      </div>
    </body>
    </html>
    `

    const fromEmail = brand === 'VOLTRIDE' ? 'reservations@voltride.es' : 'reservations@motor-rent.es'
    
    console.log('[EMAIL] Sending email from:', fromEmail, 'to:', email)
    
    const result = await resend.emails.send({
      from: brandName + ' <' + fromEmail + '>',
      to: email,
      subject: t.subject + ' - ' + vehicleNumber,
      html
    })

    console.log('[EMAIL] Resend response:', JSON.stringify(result, null, 2))
    console.log('[EMAIL] Confirmation sent to ' + email + ' for booking ' + bookingId)
    res.json({ success: true, resendResponse: result })
  } catch (error: any) {
    console.error('[EMAIL] Error details:', error)
    res.status(500).json({ error: error.message || 'Failed to send email' })
  }
})

console.log('Email confirmation routes loaded')
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 API running on port ' + PORT) })

// ============== DEPOSIT/CAUTION SYSTEM ==============

// 1. Créer un SetupIntent pour enregistrer la carte du client (sans débiter)
app.post('/api/create-setup-intent', async (req, res) => {
  try {
    const { brand, customerId, customerEmail, customerName, bookingId, depositAmount } = req.body
    const stripe = getStripeInstance(brand)
    
    // Créer ou récupérer le customer Stripe
    let stripeCustomerId = null
    const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 })
    
    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: { customerId, brand }
      })
      stripeCustomerId = customer.id
    }
    
    // Créer le SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        bookingId,
        depositAmount: depositAmount.toString(),
        brand,
        type: 'deposit'
      }
    })
    
    res.json({
      clientSecret: setupIntent.client_secret,
      stripeCustomerId
    })
  } catch (error) {
    console.error('SetupIntent error:', error)
    res.status(500).json({ error: 'Failed to create setup intent' })
  }
})

// 2. Pré-autoriser la caution (appeler J-1 ou manuellement)
app.post('/api/authorize-deposit', async (req, res) => {
  try {
    const { bookingId, brand } = req.body
    const stripe = getStripeInstance(brand)
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true }
    })
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    
    if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) {
      return res.status(400).json({ error: 'No payment method registered for this booking' })
    }
    
    // Créer une pré-autorisation (capture: false)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.depositAmount * 100), // en centimes
      currency: 'eur',
      customer: booking.stripeCustomerId,
      payment_method: booking.stripePaymentMethodId,
      capture_method: 'manual', // NE PAS capturer automatiquement
      confirm: true,
      off_session: true,
      metadata: {
        bookingId,
        type: 'deposit_hold',
        brand
      }
    })
    
    // Sauvegarder le paymentIntent ID
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        depositPaymentIntentId: paymentIntent.id,
        depositStatus: 'AUTHORIZED'
      }
    })
    
    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    })
  } catch (error: any) {
    console.error('Authorize deposit error:', error)
    res.status(500).json({ error: error.message || 'Failed to authorize deposit' })
  }
})

// 3. Libérer la caution (check-out sans problème)
app.post('/api/release-deposit', async (req, res) => {
  try {
    const { bookingId, brand } = req.body
    const stripe = getStripeInstance(brand)
    
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    
    if (!booking?.depositPaymentIntentId) {
      return res.status(400).json({ error: 'No deposit authorization found' })
    }
    
    // Annuler la pré-autorisation (libérer les fonds)
    await stripe.paymentIntents.cancel(booking.depositPaymentIntentId)
    
    await prisma.booking.update({
      where: { id: bookingId },
      data: { depositStatus: 'RELEASED' }
    })
    
    res.json({ success: true, message: 'Deposit released' })
  } catch (error: any) {
    console.error('Release deposit error:', error)
    res.status(500).json({ error: error.message || 'Failed to release deposit' })
  }
})

// 4. Capturer la caution (partiellement ou totalement si dommages)
app.post('/api/capture-deposit', async (req, res) => {
  try {
    const { bookingId, brand, amount, reason } = req.body
    const stripe = getStripeInstance(brand)
    
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    
    if (!booking?.depositPaymentIntentId) {
      return res.status(400).json({ error: 'No deposit authorization found' })
    }
    
    // Capturer le montant spécifié (ou total si non spécifié)
    const captureAmount = amount ? Math.round(amount * 100) : undefined
    
    await stripe.paymentIntents.capture(booking.depositPaymentIntentId, {
      amount_to_capture: captureAmount
    })
    
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        depositStatus: 'CAPTURED',
        depositCapturedAmount: amount || booking.depositAmount,
        depositCaptureReason: reason
      }
    })
    
    res.json({ success: true, capturedAmount: amount || booking.depositAmount })
  } catch (error: any) {
    console.error('Capture deposit error:', error)
    res.status(500).json({ error: error.message || 'Failed to capture deposit' })
  }
})

// 5. Sauvegarder le payment method après SetupIntent
app.post('/api/save-payment-method', async (req, res) => {
  try {
    const { bookingId, stripeCustomerId, paymentMethodId } = req.body
    
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        stripeCustomerId,
        stripePaymentMethodId: paymentMethodId,
        depositStatus: 'CARD_SAVED'
      }
    })
    
    res.json({ success: true })
  } catch (error) {
    console.error('Save payment method error:', error)
    res.status(500).json({ error: 'Failed to save payment method' })
  }
})

// 6. Récupérer les settings widget
app.get('/api/widget-settings/:brand', async (req, res) => {
  try {
    const key = `widget-${req.params.brand.toLowerCase()}`
    const setting = await prisma.appSettings.findUnique({ where: { key } })
    res.json(setting?.value || null)
  } catch (error) {
    console.error('Widget settings error:', error)
    res.status(500).json({ error: 'Failed to fetch widget settings' })
  }
})
// 7. CRON - Pré-autoriser les cautions J-1
app.post('/api/cron/authorize-deposits', async (req, res) => {
  try {
    // Vérifier le secret (optionnel mais recommandé pour sécuriser)
    const cronSecret = req.headers['x-cron-secret']
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Calculer la date de demain
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    // Trouver les réservations qui commencent demain avec une carte enregistrée
    const bookings = await prisma.booking.findMany({
      where: {
        startDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        },
        depositStatus: 'CARD_SAVED',
        stripeCustomerId: { not: null },
        stripePaymentMethodId: { not: null }
      },
      include: {
        agency: true,
        customer: true
      }
    })

    console.log(`[CRON] Found ${bookings.length} bookings to authorize for tomorrow`)

    const results = []
    
    for (const booking of bookings) {
      try {
        const brand = booking.agency?.brand || 'VOLTRIDE'
        const stripe = getStripeInstance(brand)
        
        // Calculer le montant de la caution (somme des deposits des véhicules)
        const bookingWithItems = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: { items: { include: { vehicle: true } } }
        })
        
        let depositAmount = 0
        bookingWithItems?.items.forEach(item => {
          depositAmount += (item.vehicle?.deposit || 0) * item.quantity
        })

        if (depositAmount <= 0) {
          console.log(`[CRON] Booking ${booking.reference}: No deposit amount, skipping`)
          results.push({ reference: booking.reference, status: 'skipped', reason: 'No deposit amount' })
          continue
        }

        // Créer une pré-autorisation
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(depositAmount * 100),
          currency: 'eur',
          customer: booking.stripeCustomerId!,
          payment_method: booking.stripePaymentMethodId!,
          capture_method: 'manual',
          confirm: true,
          off_session: true,
          metadata: {
            bookingId: booking.id,
            bookingRef: booking.reference,
            type: 'deposit_hold',
            brand
          }
        })

        // Mettre à jour la réservation
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            depositPaymentIntentId: paymentIntent.id,
            depositStatus: 'AUTHORIZED'
          }
        })

        console.log(`[CRON] Booking ${booking.reference}: Authorized ${depositAmount}€`)
        results.push({ reference: booking.reference, status: 'authorized', amount: depositAmount })

      } catch (err: any) {
        console.error(`[CRON] Booking ${booking.reference}: Error - ${err.message}`)
        results.push({ reference: booking.reference, status: 'error', error: err.message })
      }
    }

    res.json({
      success: true,
      date: tomorrow.toISOString().split('T')[0],
      processed: bookings.length,
      results
    })

  } catch (error: any) {
    console.error('[CRON] authorize-deposits error:', error)
    res.status(500).json({ error: error.message || 'Failed to process deposits' })
  }
})

// GET version pour tester manuellement
app.get('/api/cron/authorize-deposits/preview', async (req, res) => {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    const bookings = await prisma.booking.findMany({
      where: {
        startDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        },
        depositStatus: 'CARD_SAVED',
        stripeCustomerId: { not: null },
        stripePaymentMethodId: { not: null }
      },
      include: {
        agency: true,
        customer: true,
        items: { include: { vehicle: true } }
      }
    })

    const preview = bookings.map(b => ({
      reference: b.reference,
      customer: `${b.customer?.firstName} ${b.customer?.lastName}`,
      startDate: b.startDate,
      depositAmount: b.items.reduce((sum, item) => sum + (item.vehicle?.deposit || 0) * item.quantity, 0)
    }))

    res.json({
      date: tomorrow.toISOString().split('T')[0],
      count: bookings.length,
      bookings: preview
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
console.log('Deposit/Caution routes loaded')

// ============== INVOICE ROUTES ==============

// GET /api/invoices - List invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const { brand, status } = req.query
    const where: any = {}
    if (brand) where.brand = brand
    if (status) where.status = status
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { date: 'desc' }
    })
    // Enrich with customer/booking/agency data
    const enriched = await Promise.all(invoices.map(async (inv) => {
      const [customer, booking, agency] = await Promise.all([
        prisma.customer.findUnique({ where: { id: inv.customerId } }),
        prisma.booking.findUnique({ where: { id: inv.bookingId }, include: { items: { include: { vehicle: true } }, fleetVehicle: { include: { vehicle: true } } } }),
        prisma.agency.findUnique({ where: { id: inv.agencyId } })
      ])
      const agencyName = agency?.name || ''
      const parsedName = typeof agencyName === 'string' ? (() => { try { return JSON.parse(agencyName) } catch { return { es: agencyName } } })() : agencyName
      return {
        ...inv,
        customerName: customer ? customer.firstName + ' ' + customer.lastName : 'N/A',
        customerEmail: customer?.email || '',
        bookingRef: booking?.reference || '',
        agencyName: (parsedName as any)?.es || (parsedName as any)?.en || JSON.stringify(parsedName),
        vehicleName: booking?.fleetVehicle?.vehicle?.name ? ((typeof booking.fleetVehicle.vehicle.name === 'string' ? (() => { try { return JSON.parse(booking.fleetVehicle.vehicle.name) } catch { return { es: booking.fleetVehicle.vehicle.name } } })() : booking.fleetVehicle.vehicle.name) as any)?.es || '' : ''
      }
    }))
    res.json(enriched)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/invoices - Create invoice from booking
app.post('/api/invoices', async (req, res) => {
  try {
    const { bookingId } = req.body
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' })
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: { include: { vehicle: true } }, options: { include: { option: true } }, customer: true, agency: true, fleetVehicle: { include: { vehicle: true } } }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    // Check if invoice already exists
    const existing = await prisma.invoice.findFirst({ where: { bookingId } })
    if (existing) return res.status(400).json({ error: 'Invoice already exists', invoice: existing })
    // Generate invoice number: VR-YYYY-XXXXX
    const year = new Date().getFullYear()
    const count = await prisma.invoice.count({ where: { brand: booking.agency?.brand || 'VOLTRIDE' } })
    const invoiceNumber = 'VR-' + year + '-' + String(count + 1).padStart(5, '0')
    const totalTTC = booking.totalPrice
    const taxRate = 21
    const subtotal = Math.round(totalTTC / 1.21 * 100) / 100
    const taxAmount = Math.round((totalTTC - subtotal) * 100) / 100
    const paidAmount = booking.paidAmount || 0
    const items = booking.items.map(item => {
      const vName = item.vehicle?.name
      const parsed = typeof vName === 'string' ? (() => { try { return JSON.parse(vName) } catch { return { es: vName } } })() : vName
      return {
        description: (parsed as any)?.es || (parsed as any)?.en || 'Vehicle',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice
      }
    })
    const options = booking.options.map(opt => {
      const oName = opt.option?.name
      const parsed = typeof oName === 'string' ? (() => { try { return JSON.parse(oName) } catch { return { es: oName } } })() : oName
      return {
        description: (parsed as any)?.es || (parsed as any)?.en || 'Option',
        quantity: opt.quantity,
        unitPrice: opt.unitPrice,
        total: opt.totalPrice
      }
    })
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        customerId: booking.customerId,
        agencyId: booking.agencyId,
        brand: booking.agency?.brand || 'VOLTRIDE',
        subtotal,
        taxRate,
        taxAmount,
        totalTTC,
        paidAmount,
        remainingAmount: Math.max(0, totalTTC - paidAmount),
        items,
        options,
        status: 'DRAFT'
      }
    })
    res.status(201).json(invoice)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/invoices/:id - Update invoice
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { status, paidAmount, notes, deductions, depositRefunded } = req.body
    const data: any = {}
    if (status) data.status = status
    if (paidAmount !== undefined) {
      data.paidAmount = paidAmount
      const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } })
      if (inv) data.remainingAmount = Math.max(0, inv.totalTTC - paidAmount)
    }
    if (notes !== undefined) data.notes = notes
    if (deductions !== undefined) data.deductions = deductions
    if (depositRefunded !== undefined) data.depositRefunded = depositRefunded
    const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data })
    res.json(invoice)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/invoices/:id/send - Send invoice by email
app.post('/api/invoices/:id/send', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } })
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } })
    if (!customer?.email) return res.status(400).json({ error: 'Customer has no email' })
    // Update status to SENT
    await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'SENT' } })
    // TODO: Send actual email with PDF
    res.json({ success: true, message: 'Invoice marked as sent to ' + customer.email })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/invoices/generate-from-checkout - Auto-generate after checkout
app.post('/api/invoices/generate-from-checkout', async (req, res) => {
  try {
    const { bookingId } = req.body
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' })
    // Check if already exists
    const existing = await prisma.invoice.findFirst({ where: { bookingId } })
    if (existing) return res.json(existing)
    // Trigger creation via the POST /api/invoices logic
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: { include: { vehicle: true } }, options: { include: { option: true } }, customer: true, agency: true, fleetVehicle: { include: { vehicle: true } } }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const year = new Date().getFullYear()
    const count = await prisma.invoice.count({ where: { brand: booking.agency?.brand || 'VOLTRIDE' } })
    const invoiceNumber = 'VR-' + year + '-' + String(count + 1).padStart(5, '0')
    const totalTTC = booking.totalPrice
    const taxRate = 21
    const subtotal = Math.round(totalTTC / 1.21 * 100) / 100
    const taxAmount = Math.round((totalTTC - subtotal) * 100) / 100
    const paidAmount = booking.paidAmount || 0
    const items = booking.items.map(item => {
      const vName = item.vehicle?.name
      const parsed = typeof vName === 'string' ? (() => { try { return JSON.parse(vName) } catch { return { es: vName } } })() : vName
      return { description: (parsed as any)?.es || 'Vehicle', quantity: item.quantity, unitPrice: item.unitPrice, total: item.totalPrice }
    })
    const options = booking.options.map(opt => {
      const oName = opt.option?.name
      const parsed = typeof oName === 'string' ? (() => { try { return JSON.parse(oName) } catch { return { es: oName } } })() : oName
      return { description: (parsed as any)?.es || 'Option', quantity: opt.quantity, unitPrice: opt.unitPrice, total: opt.totalPrice }
    })
    const invoice = await prisma.invoice.create({
      data: { invoiceNumber, bookingId, customerId: booking.customerId, agencyId: booking.agencyId, brand: booking.agency?.brand || 'VOLTRIDE', subtotal, taxRate, taxAmount, totalTTC, paidAmount, remainingAmount: Math.max(0, totalTTC - paidAmount), items, options, status: 'DRAFT' }
    })
    res.status(201).json(invoice)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

console.log('Invoice routes loaded')

// ============== EXPENSE ROUTES ==============

// GET /api/expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const { brand, category } = req.query
    const where: any = {}
    if (brand) where.brand = brand
    if (category) where.category = category
    const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } })
    res.json(expenses)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/expenses
app.post('/api/expenses', async (req, res) => {
  try {
    const { date, supplier, description, category, brand, subtotal, taxRate, taxAmount, totalTTC, paidAmount, status, documentUrl, notes } = req.body
    if (!supplier || !description) return res.status(400).json({ error: 'supplier and description required' })
    const year = new Date().getFullYear()
    const count = await prisma.expense.count({ where: { brand: brand || 'VOLTRIDE' } })
    const expenseNumber = 'EX-' + year + '-' + String(count + 1).padStart(5, '0')
    const expense = await prisma.expense.create({
      data: {
        expenseNumber, date: date ? new Date(date) : new Date(), supplier, description, category: category || 'Otros',
        brand: brand || 'VOLTRIDE', subtotal: subtotal || 0, taxRate: taxRate || 21, taxAmount: taxAmount || 0,
        totalTTC: totalTTC || 0, paidAmount: paidAmount || 0, status: status || 'PENDING', documentUrl, notes
      }
    })
    res.status(201).json(expense)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/expenses/:id
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data: req.body })
    res.json(expense)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/expenses/:id
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

console.log('Expense routes loaded')
// force deploy
