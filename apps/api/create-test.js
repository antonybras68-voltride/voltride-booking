const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agency = await prisma.agency.findFirst();
  if (!agency) { console.log('No agency'); return; }
  console.log('Agency:', agency.name);

  // Get a fleet vehicle that is AVAILABLE
  let fleet = await prisma.fleet.findFirst({
    where: { agencyId: agency.id, status: 'AVAILABLE' },
    include: { vehicle: true }
  });
  
  if (!fleet) {
    // Reset one to available
    fleet = await prisma.fleet.findFirst({
      where: { agencyId: agency.id },
      include: { vehicle: true }
    });
    if (fleet) {
      await prisma.fleet.update({ where: { id: fleet.id }, data: { status: 'AVAILABLE' } });
    }
  }
  
  if (!fleet) { console.log('No fleet'); return; }
  console.log('Fleet:', fleet.vehicleNumber);

  let customer = await prisma.customer.findFirst({ where: { email: 'test.checkout2@example.com' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { firstName: 'Marie', lastName: 'Martin', email: 'test.checkout2@example.com', phone: '+34698765432' }
    });
  }
  console.log('Customer:', customer.firstName, customer.lastName);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 2);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);

  const reference = 'BOOK-CHK-' + Date.now();

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
      totalPrice: 120, 
      depositAmount: 200,
      status: 'CHECKED_IN',
      language: 'fr'
    }
  });
  console.log('Booking:', booking.id, 'Status:', booking.status);

  // Generic scooter photos from web
  const photos = {
    front: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400',
    left: 'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=400',
    right: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400',
    rear: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400',
    counter: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400'
  };

  const contract = await prisma.rentalContract.create({
    data: {
      contractNumber: 'CNT-CHK-' + Date.now(), 
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
      dailyRate: 40, 
      totalDays: 3, 
      subtotal: 120, 
      taxAmount: 0, 
      totalAmount: 120, 
      depositAmount: 200,
      depositMethod: 'CASH', 
      depositStatus: 'CAPTURED', 
      status: 'ACTIVE', 
      startMileage: 1500, 
      startFuelLevel: 'FULL',
      photoFront: photos.front,
      photoLeft: photos.left,
      photoRight: photos.right,
      photoRear: photos.rear,
      photoCounter: photos.counter
    }
  });
  console.log('Contract:', contract.contractNumber);
  console.log('Photos added: front, left, right, rear, counter');

  await prisma.fleet.update({ where: { id: fleet.id }, data: { status: 'RENTED' } });
  console.log('Fleet status: RENTED');
  
  console.log('\n✅ Test booking ready for checkout with photos!');
  console.log('Vehicle:', fleet.vehicleNumber);
  console.log('Customer:', customer.firstName, customer.lastName);
  console.log('Deposit:', booking.depositAmount, '€');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
