// ============== TYPES ==============

export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'ACCOUNTANT'
  agencyIds: string[]
  brands: ('VOLTRIDE' | 'MOTOR-RENT')[]
}

export interface Agency {
  id: string
  code: string
  name: any
  city: string
  brand: 'VOLTRIDE' | 'MOTOR-RENT'
  address?: string
  phone?: string
  email?: string
}

export interface Category {
  id: string
  code: string
  name: any
  brand: 'VOLTRIDE' | 'MOTOR-RENT'
}

export interface Vehicle {
  id: string
  sku: string
  name: any
  description?: any
  imageUrl?: string
  deposit: number
  hasPlate: boolean
  helmetIncluded?: boolean
  category: Category
  pricing?: Pricing[]
}

export interface Pricing {
  id: string
  day1: number
  day2: number
  day3: number
  day4: number
  day5: number
  day6: number
  day7: number
  day8: number
  day9: number
  day10: number
  day11: number
  day12: number
  day13: number
  day14: number
  extraDayPrice?: number
  extraHour1: number
  extraHour2: number
  extraHour3: number
  extraHour4: number
}

export interface FleetVehicle {
  id: string
  vehicleNumber: string
  licensePlate?: string
  chassisNumber?: string
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  currentMileage: number
  lastFuelLevel?: string
  year?: number
  color?: string
  vehicle: Vehicle
  agency: Agency
  documents?: FleetDocument[]
  spareParts?: SparePart[]
}

export interface FleetDocument {
  id: string
  type: string
  name: string
  url: string
  sendToCustomer: boolean
  expiryDate?: string
}

export interface SparePart {
  id: string
  name: string
  reference: string
  price: number
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  idCardUrl?: string
  licenseUrl?: string
  notes?: string
  createdAt: string
}

export interface Booking {
  id: string
  reference: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  totalPrice: number
  depositAmount: number
  paidAmount: number
  language: 'fr' | 'es' | 'en'
  source: 'WIDGET' | 'OPERATOR' | 'WALK_IN' | 'PHONE'
  customer: Customer
  agency: Agency
  fleetVehicle?: FleetVehicle
  fleetVehicleId?: string
  items: BookingItem[]
  checkedIn: boolean
  checkedInAt?: string
  checkedOut: boolean
  checkedOutAt?: string
  cancellationReason?: string
  cancelledAt?: string
  createdAt: string
}

export interface BookingItem {
  id: string
  quantity: number
  unitPrice: number
  vehicle: Vehicle
}

export interface Contract {
  id: string
  contractNumber: string
  booking?: Booking
  fleetVehicle: FleetVehicle
  customer: Customer
  agency: Agency
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  startDate: string
  endDate: string
  totalAmount: number
  depositAmount: number
  depositStatus: 'PENDING' | 'CAPTURED' | 'RELEASED'
  depositMethod?: 'CARD' | 'CASH'
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID'
  paidAmount: number
  startMileage?: number
  endMileage?: number
  startFuelLevel?: string
  endFuelLevel?: string
  customerSignature?: string
  photoFront?: string
  photoLeft?: string
  photoRight?: string
  photoRear?: string
  photoCounter?: string
  damageSchema?: any
  equipmentChecklist?: any
  extensions?: ContractExtension[]
  createdAt: string
}

export interface ContractExtension {
  id: string
  contractId: string
  originalEndDate: string
  newEndDate: string
  extraAmount: number
  paymentMethod: 'IMMEDIATE' | 'STRIPE_LINK' | 'ON_RETURN'
  paid: boolean
  createdAt: string
}

export type Brand = 'VOLTRIDE' | 'MOTOR-RENT'
export type Language = 'fr' | 'es' | 'en'

// Helper
export const getName = (obj: any, lang: Language = 'fr'): string => {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj[lang] || obj.fr || obj.es || obj.en || ''
}
