import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Nettoyer
  await prisma.bookingOption.deleteMany()
  await prisma.bookingItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.vehicleOptionLink.deleteMany()
  await prisma.vehiclePricing.deleteMany()
  await prisma.vehicleOption.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.vehicleCategory.deleteMany()
  await prisma.agency.deleteMany()

  // Agences
  const agencies = await Promise.all([
    prisma.agency.create({
      data: {
        code: 'AG-01',
        name: { fr: 'Orihuela Costa', es: 'Orihuela Costa', en: 'Orihuela Costa' },
        address: 'Calle Example 1',
        city: 'Orihuela Costa',
        postalCode: '03189',
        country: 'ES',
        phone: '+34 600 000 001',
        email: 'orihuela@voltride.es',
        brand: 'VOLTRIDE',
        openingHours: {
          monday: { open: '09:00', close: '19:00' },
          tuesday: { open: '09:00', close: '19:00' },
          wednesday: { open: '09:00', close: '19:00' },
          thursday: { open: '09:00', close: '19:00' },
          friday: { open: '09:00', close: '19:00' },
          saturday: { open: '10:00', close: '14:00' },
          sunday: { open: null, close: null }
        }
      }
    }),
    prisma.agency.create({
      data: {
        code: 'AG-02',
        name: { fr: 'Torrevieja', es: 'Torrevieja', en: 'Torrevieja' },
        address: 'Calle Example 2',
        city: 'Torrevieja',
        postalCode: '03181',
        country: 'ES',
        phone: '+34 600 000 002',
        email: 'torrevieja@voltride.es',
        brand: 'VOLTRIDE',
        openingHours: {
          monday: { open: '09:00', close: '19:00' },
          tuesday: { open: '09:00', close: '19:00' },
          wednesday: { open: '09:00', close: '19:00' },
          thursday: { open: '09:00', close: '19:00' },
          friday: { open: '09:00', close: '19:00' },
          saturday: { open: '10:00', close: '14:00' },
          sunday: { open: null, close: null }
        }
      }
    }),
    prisma.agency.create({
      data: {
        code: 'AG-03',
        name: { fr: 'San Miguel de Salinas', es: 'San Miguel de Salinas', en: 'San Miguel de Salinas' },
        address: 'Calle Example 3',
        city: 'San Miguel de Salinas',
        postalCode: '03193',
        country: 'ES',
        phone: '+34 600 000 003',
        email: 'sanmiguel@voltride.es',
        brand: 'VOLTRIDE',
        openingHours: {
          monday: { open: '09:00', close: '19:00' },
          tuesday: { open: '09:00', close: '19:00' },
          wednesday: { open: '09:00', close: '19:00' },
          thursday: { open: '09:00', close: '19:00' },
          friday: { open: '09:00', close: '19:00' },
          saturday: { open: '10:00', close: '14:00' },
          sunday: { open: null, close: null }
        }
      }
    })
  ])
  console.log('✅ Agencies created')

  // Catégories
  const categories = await Promise.all([
    prisma.vehicleCategory.create({
      data: {
        name: { fr: 'VTT', es: 'BTT', en: 'Mountain Bike' },
        description: { fr: 'Vélos tout terrain', es: 'Bicicletas todo terreno', en: 'Mountain bikes' },
        brand: 'VOLTRIDE'
      }
    }),
    prisma.vehicleCategory.create({
      data: {
        name: { fr: 'E-Bike', es: 'E-Bike', en: 'E-Bike' },
        description: { fr: 'Vélos électriques', es: 'Bicicletas eléctricas', en: 'Electric bikes' },
        brand: 'VOLTRIDE'
      }
    }),
    prisma.vehicleCategory.create({
      data: {
        name: { fr: 'Scooter', es: 'Scooter', en: 'Scooter' },
        description: { fr: 'Scooters 125cc', es: 'Scooters 125cc', en: '125cc Scooters' },
        brand: 'MOTOR-RENT'
      }
    }),
    prisma.vehicleCategory.create({
      data: {
        name: { fr: 'Moto Cross Électrique', es: 'Moto Cross Eléctrica', en: 'Electric Motocross' },
        description: { fr: 'Motos cross électriques', es: 'Motos cross eléctricas', en: 'Electric motocross bikes' },
        brand: 'VOLTRIDE'
      }
    })
  ])
  console.log('✅ Categories created')

  // Véhicules
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        sku: 'VTT-001',
        name: { fr: 'VTT Sport 26"', es: 'BTT Sport 26"', en: 'Sport MTB 26"' },
        description: { fr: 'VTT sportif 26 pouces', es: 'BTT deportiva 26 pulgadas', en: 'Sport mountain bike 26 inch' },
        deposit: 50,
        hasPlate: false,
        categoryId: categories[0].id,
        pricing: {
          create: {
            day1: 12, day2: 22, day3: 30, day4: 38, day5: 45,
            day6: 52, day7: 58, day8: 64, day9: 70, day10: 75,
            day11: 80, day12: 85, day13: 90, day14: 95,
            extraHour1: 2, extraHour2: 4, extraHour3: 5, extraHour4: 6
          }
        }
      }
    }),
    prisma.vehicle.create({
      data: {
        sku: 'EBIKE-001',
        name: { fr: 'E-Bike City 28"', es: 'E-Bike City 28"', en: 'City E-Bike 28"' },
        description: { fr: 'Vélo électrique urbain', es: 'Bicicleta eléctrica urbana', en: 'Urban electric bike' },
        deposit: 100,
        hasPlate: false,
        categoryId: categories[1].id,
        pricing: {
          create: {
            day1: 25, day2: 45, day3: 60, day4: 75, day5: 90,
            day6: 105, day7: 115, day8: 125, day9: 135, day10: 145,
            day11: 155, day12: 165, day13: 175, day14: 185,
            extraHour1: 4, extraHour2: 7, extraHour3: 10, extraHour4: 12
          }
        }
      }
    }),
    prisma.vehicle.create({
      data: {
        sku: 'SCOOT-001',
        name: { fr: 'Honda PCX 125', es: 'Honda PCX 125', en: 'Honda PCX 125' },
        description: { fr: 'Scooter 125cc automatique', es: 'Scooter 125cc automático', en: '125cc automatic scooter' },
        deposit: 200,
        hasPlate: true,
        categoryId: categories[2].id,
        pricing: {
          create: {
            day1: 35, day2: 65, day3: 90, day4: 115, day5: 135,
            day6: 155, day7: 170, day8: 185, day9: 200, day10: 215,
            day11: 230, day12: 245, day13: 260, day14: 275,
            extraHour1: 6, extraHour2: 10, extraHour3: 14, extraHour4: 18
          }
        }
      }
    }),
    prisma.vehicle.create({
      data: {
        sku: 'EMOTOCROSS-001',
        name: { fr: 'Sur-Ron Light Bee', es: 'Sur-Ron Light Bee', en: 'Sur-Ron Light Bee' },
        description: { fr: 'Moto cross électrique légère', es: 'Moto cross eléctrica ligera', en: 'Light electric motocross' },
        deposit: 300,
        hasPlate: false,
        categoryId: categories[3].id,
        pricing: {
          create: {
            day1: 60, day2: 110, day3: 150, day4: 190, day5: 225,
            day6: 260, day7: 290, day8: 320, day9: 350, day10: 380,
            day11: 410, day12: 440, day13: 470, day14: 500,
            extraHour1: 10, extraHour2: 18, extraHour3: 25, extraHour4: 30
          }
        }
      }
    })
  ])
  console.log('✅ Vehicles created')

  // Options
  const options = await Promise.all([
    prisma.vehicleOption.create({
      data: {
        code: 'HELMET-BIKE',
        name: { fr: 'Casque vélo', es: 'Casco bicicleta', en: 'Bike helmet' },
        description: { fr: 'Casque de protection pour vélo', es: 'Casco de protección para bicicleta', en: 'Protective bike helmet' },
        type: 'free',
        day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0,
        day8: 0, day9: 0, day10: 0, day11: 0, day12: 0, day13: 0, day14: 0
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'HELMET-MOTO',
        name: { fr: 'Casque moto', es: 'Casco moto', en: 'Motorcycle helmet' },
        description: { fr: 'Casque homologué pour moto/scooter', es: 'Casco homologado para moto/scooter', en: 'Approved motorcycle/scooter helmet' },
        type: 'free',
        day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0,
        day8: 0, day9: 0, day10: 0, day11: 0, day12: 0, day13: 0, day14: 0
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'LOCK-BIKE',
        name: { fr: 'Antivol vélo', es: 'Candado bicicleta', en: 'Bike lock' },
        description: { fr: 'Antivol inclus avec chaque location', es: 'Candado incluido con cada alquiler', en: 'Lock included with each rental' },
        type: 'included',
        day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0,
        day8: 0, day9: 0, day10: 0, day11: 0, day12: 0, day13: 0, day14: 0
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'LOCK-MOTO',
        name: { fr: 'Antivol moto', es: 'Candado moto', en: 'Motorcycle lock' },
        description: { fr: 'Antivol inclus avec chaque location', es: 'Candado incluido con cada alquiler', en: 'Lock included with each rental' },
        type: 'included',
        day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0,
        day8: 0, day9: 0, day10: 0, day11: 0, day12: 0, day13: 0, day14: 0
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'SADDLEBAGS',
        name: { fr: 'Sacoches latérales', es: 'Alforjas laterales', en: 'Saddlebags' },
        description: { fr: 'Sacoches pratiques pour le transport', es: 'Alforjas prácticas para el transporte', en: 'Practical bags for transport' },
        type: 'paid',
        day1: 3, day2: 5, day3: 7, day4: 9, day5: 11, day6: 13, day7: 15,
        day8: 17, day9: 19, day10: 21, day11: 23, day12: 25, day13: 27, day14: 29
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'PHONE-HOLDER',
        name: { fr: 'Support téléphone', es: 'Soporte teléfono', en: 'Phone holder' },
        description: { fr: 'Support pour smartphone', es: 'Soporte para smartphone', en: 'Smartphone holder' },
        type: 'paid',
        day1: 2, day2: 3, day3: 4, day4: 5, day5: 6, day6: 7, day7: 8,
        day8: 9, day9: 10, day10: 11, day11: 12, day12: 13, day13: 14, day14: 15
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'CHILD-SEAT',
        name: { fr: 'Siège enfant', es: 'Silla infantil', en: 'Child seat' },
        description: { fr: 'Siège enfant pour vélo', es: 'Silla infantil para bicicleta', en: 'Child seat for bike' },
        type: 'paid',
        day1: 5, day2: 8, day3: 11, day4: 14, day5: 17, day6: 20, day7: 23,
        day8: 26, day9: 29, day10: 32, day11: 35, day12: 38, day13: 41, day14: 44
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'INSURANCE-THEFT',
        name: { fr: 'Assurance vol', es: 'Seguro robo', en: 'Theft insurance' },
        description: { fr: 'Protection contre le vol', es: 'Protección contra robo', en: 'Theft protection' },
        type: 'paid',
        day1: 5, day2: 10, day3: 15, day4: 20, day5: 25, day6: 30, day7: 35,
        day8: 40, day9: 45, day10: 50, day11: 55, day12: 60, day13: 65, day14: 70
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'ASSISTANCE-20KM',
        name: { fr: 'Assistance 20km', es: 'Asistencia 20km', en: 'Roadside assistance 20km' },
        description: { fr: 'Assistance en cas de panne dans un rayon de 20km', es: 'Asistencia en caso de avería en un radio de 20km', en: 'Roadside assistance within 20km radius' },
        type: 'paid',
        day1: 3, day2: 6, day3: 9, day4: 12, day5: 15, day6: 18, day7: 21,
        day8: 24, day9: 27, day10: 30, day11: 33, day12: 36, day13: 39, day14: 42
      }
    }),
    prisma.vehicleOption.create({
      data: {
        code: 'INSURANCE-FULL',
        name: { fr: 'Assurance tous risques', es: 'Seguro todo riesgo', en: 'Full coverage insurance' },
        description: { fr: 'Vol + Assistance + Dommages', es: 'Robo + Asistencia + Daños', en: 'Theft + Assistance + Damages' },
        type: 'paid',
        day1: 10, day2: 20, day3: 30, day4: 40, day5: 50, day6: 60, day7: 70,
        day8: 80, day9: 90, day10: 100, day11: 110, day12: 120, day13: 130, day14: 140
      }
    })
  ])
  console.log('✅ Options created')

  // Lier options aux véhicules
  const bikeOptions = [options[0], options[2], options[4], options[5], options[6], options[7], options[8], options[9]]
  const motoOptions = [options[1], options[3], options[7], options[8], options[9]]

  for (const opt of bikeOptions) {
    await prisma.vehicleOptionLink.create({ data: { vehicleId: vehicles[0].id, optionId: opt.id } })
    await prisma.vehicleOptionLink.create({ data: { vehicleId: vehicles[1].id, optionId: opt.id } })
  }
  for (const opt of motoOptions) {
    await prisma.vehicleOptionLink.create({ data: { vehicleId: vehicles[2].id, optionId: opt.id } })
    await prisma.vehicleOptionLink.create({ data: { vehicleId: vehicles[3].id, optionId: opt.id } })
  }
  console.log('✅ Vehicle-Option links created')

  // Inventaire
  for (const agency of agencies) {
    await prisma.inventory.create({ data: { agencyId: agency.id, vehicleId: vehicles[0].id, quantity: 10 } })
    await prisma.inventory.create({ data: { agencyId: agency.id, vehicleId: vehicles[1].id, quantity: 5 } })
    await prisma.inventory.create({ data: { agencyId: agency.id, vehicleId: vehicles[2].id, quantity: 3 } })
    await prisma.inventory.create({ data: { agencyId: agency.id, vehicleId: vehicles[3].id, quantity: 2 } })
  }
  console.log('✅ Inventory created')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
