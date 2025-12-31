import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

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
      data: { code: req.body.code, name: req.body.name, address: req.body.address, city: req.body.city, postalCode: req.body.postalCode, country: req.body.country || 'ES', phone: req.body.phone, email: req.body.email, brand: req.body.brand || 'VOLTRIDE', isActive: req.body.isActive ?? true }
    })
    res.json(agency)
  } catch (error) { res.status(500).json({ error: 'Failed to create agency' }) }
})

app.put('/api/agencies/:id', async (req, res) => {
  try {
    const agency = await prisma.agency.update({ where: { id: req.params.id }, data: { code: req.body.code, name: req.body.name, address: req.body.address, city: req.body.city, postalCode: req.body.postalCode, country: req.body.country, phone: req.body.phone, email: req.body.email, brand: req.body.brand, isActive: req.body.isActive } })
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
      data: { sku: req.body.sku, name: req.body.name, description: req.body.description || {}, deposit: req.body.deposit, hasPlate: req.body.hasPlate || false, licenseType: req.body.licenseType || '', kmIncluded: req.body.kmIncluded || '', helmetIncluded: req.body.helmetIncluded ?? true, imageUrl: req.body.imageUrl, categoryId: req.body.categoryId, isActive: req.body.isActive ?? true, pricing: { create: req.body.pricing || {} } },
      include: { category: true, pricing: true }
    })
    res.json(vehicle)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create vehicle' }) }
})

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: { sku: req.body.sku, name: req.body.name, description: req.body.description, deposit: req.body.deposit, hasPlate: req.body.hasPlate, licenseType: req.body.licenseType, kmIncluded: req.body.kmIncluded, helmetIncluded: req.body.helmetIncluded, imageUrl: req.body.imageUrl, categoryId: req.body.categoryId, isActive: req.body.isActive }, include: { category: true, pricing: true } })
    if (req.body.pricing) { await prisma.pricing.updateMany({ where: { vehicleId: req.params.id }, data: req.body.pricing }) }
    res.json(vehicle)
  } catch (error) { res.status(500).json({ error: 'Failed to update vehicle' }) }
})

app.delete('/api/vehicles/:id', async (req, res) => {
  try { await prisma.vehicle.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (error) { res.status(500).json({ error: 'Failed to delete vehicle' }) }
})

// ============== OPTIONS ==============
app.get('/api/options', async (req, res) => {
  try {
    const options = await prisma.option.findMany({ where: { isActive: true }, include: { categories: { include: { category: true } } }, orderBy: { code: 'asc' } })
    res.json(options)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch options' }) }
})

app.post('/api/options', async (req, res) => {
  try {
    const option = await prisma.option.create({
      data: {
        code: req.body.code, name: req.body.name, maxQuantity: req.body.maxQuantity || 10, includedByDefault: req.body.includedByDefault || false,
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

app.put('/api/options/:id', async (req, res) => {
  try {
    const option = await prisma.option.update({
      where: { id: req.params.id },
      data: {
        code: req.body.code, name: req.body.name, maxQuantity: req.body.maxQuantity, includedByDefault: req.body.includedByDefault,
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
    const inventory = await prisma.inventory.findMany({ include: { vehicle: { include: { category: true } }, agency: true } })
    res.json(inventory)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch inventory' }) }
})

app.post('/api/inventory', async (req, res) => {
  try {
    const inventory = await prisma.inventory.upsert({ where: { vehicleId_agencyId: { vehicleId: req.body.vehicleId, agencyId: req.body.agencyId } }, update: { quantity: req.body.quantity }, create: { vehicleId: req.body.vehicleId, agencyId: req.body.agencyId, quantity: req.body.quantity } })
    res.json(inventory)
  } catch (error) { res.status(500).json({ error: 'Failed to update inventory' }) }
})

// ============== CUSTOMERS ==============
app.get('/api/customers', async (req, res) => {
  try { const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }); res.json(customers) }
  catch (error) { res.status(500).json({ error: 'Failed to fetch customers' }) }
})

// ============== BOOKINGS ==============
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({ include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } } }, orderBy: { createdAt: 'desc' } })
    res.json(bookings)
  } catch (error) { res.status(500).json({ error: 'Failed to fetch bookings' }) }
})

app.post('/api/bookings', async (req, res) => {
  try {
    const reference = 'VR-' + Date.now().toString(36).toUpperCase()
    let customer = await prisma.customer.findFirst({ where: { email: req.body.customer.email } })
    if (!customer) {
      customer = await prisma.customer.create({ data: { firstName: req.body.customer.firstName, lastName: req.body.customer.lastName, email: req.body.customer.email, phone: req.body.customer.phone, address: req.body.customer.address, postalCode: req.body.customer.postalCode, city: req.body.customer.city, country: req.body.customer.country || 'ES', language: req.body.customer.language || 'es' } })
    }
    const booking = await prisma.booking.create({
      data: {
        reference, agencyId: req.body.agencyId, customerId: customer.id, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate), startTime: req.body.startTime, endTime: req.body.endTime, totalPrice: req.body.totalPrice, depositAmount: req.body.depositAmount, language: req.body.language || 'es',
        items: { create: req.body.items.map((item: any) => ({ vehicleId: item.vehicleId, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice })) },
        options: { create: (req.body.options || []).map((opt: any) => ({ optionId: opt.optionId, quantity: opt.quantity, unitPrice: opt.unitPrice, totalPrice: opt.totalPrice })) }
      },
      include: { agency: true, customer: true, items: { include: { vehicle: true } }, options: { include: { option: true } } }
    })
    res.json(booking)
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to create booking' }) }
})

app.put('/api/bookings/:id/status', async (req, res) => {
  try { const booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status: req.body.status } }); res.json(booking) }
  catch (error) { res.status(500).json({ error: 'Failed to update booking status' }) }
})

const PORT = parseInt(process.env.PORT || '8080', 10)
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 API running on port ' + PORT) })
