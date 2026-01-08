const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agency = await prisma.agency.findFirst();
  if (!agency) { console.log('No agency'); return; }
  console.log('Agency:', agency.name);

  const fleet = await prisma.fleet.findFirst({
    where: { agencyId: agency.id },
    include: { vehicle: true }
  });
  if (!fleet) { console.log('No fleet'); return; }
  console.log('Fleet:', fleet.vehicleNumber);

  let customer = await prisma.customer.findFirst({ where: { email: 'test.checkout@example.com' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { firstName: 'Jean', lastName: 'Dupont', email: 'test.checkout@example.com', phone: '+34612345678' }
    });
  }
  console.log('Customer:', customer.firstName, customer.lastName);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 2);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);

  const reference = 'BOOK-TEST-' + Date.now();

  const booking = await prisma.booking.create({
    data: {
      reference: reference,
      customerId: customer.id, 
      agencyId: agency.id, 
      fleetVehicleId: fleet.id,
      startDate, 
      endDate, 
      startTime: '10:00', 
      endTime: '10:00', 
      totalPrice: 90, 
      depositAmount: 150,
      status: 'CHECKED_IN',
      language: 'fr'
    }
  });
  console.log('Booking:', booking.id);

  const contract = await prisma.rentalContract.create({
    data: {
      contractNumber: 'CNT-TEST-' + Date.now(), 
      bookingId: booking.id, 
      fleetVehicleId: fleet.id,
      agencyId: agency.id, 
      customerId: customer.id, 
      originalStartDate: startDate, 
      originalEndDate: endDate,
      currentStartDate: startDate, 
      currentEndDate: endDate, 
      actualStartDate: startDate, 
      source: 'WALK_IN',
      dailyRate: 30, 
      totalDays: 3, 
      subtotal: 90, 
      taxAmount: 0, 
      totalAmount: 90, 
      depositAmount: 150,
      depositMethod: 'CASH', 
      depositStatus: 'CAPTURED', 
      status: 'ACTIVE', 
      startMileage: fleet.currentMileage || 1000, 
      startFuelLevel: 'FULL'
    }
  });
  console.log('Contract:', contract.contractNumber);

  await prisma.fleet.update({ where: { id: fleet.id }, data: { status: 'RENTED' } });
  console.log('Fleet status: RENTED');
  console.log('Done! You can now test checkout.');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
