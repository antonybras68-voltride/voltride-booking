// ============== API ==============

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

export const api = {
  // Agencies
  getAgencies: async () => {
    const res = await fetch(API_URL + '/api/agencies')
    return res.json()
  },

  // Fleet
  getFleet: async (params) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(API_URL + '/api/fleet' + query)
    return res.json()
  },

  getAvailableFleet: async (agencyId) => {
    const res = await fetch(API_URL + '/api/fleet/available?agencyId=' + agencyId)
    return res.json()
  },

  updateFleetVehicle: async (id, data) => {
    const res = await fetch(API_URL + '/api/fleet/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  // Bookings
  getBookings: async (params) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(API_URL + '/api/bookings' + query)
    return res.json()
  },

  createBooking: async (data) => {
    const res = await fetch(API_URL + '/api/bookings/operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  updateBooking: async (id, data) => {
    const res = await fetch(API_URL + '/api/bookings/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  cancelBooking: async (id, reason) => {
    const res = await fetch(API_URL + '/api/bookings/' + id + '/cancel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })
    return res.json()
  },

  // Customers
  getCustomers: async () => {
    const res = await fetch(API_URL + '/api/customers')
    return res.json()
  },

  searchCustomers: async (query) => {
    const res = await fetch(API_URL + '/api/customers/search?q=' + encodeURIComponent(query))
    return res.json()
  },

  // Contracts
  getContracts: async () => {
    const res = await fetch(API_URL + '/api/contracts')
    return res.json()
  },

  createContract: async (data) => {
    const res = await fetch(API_URL + '/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  // Upload
  uploadImage: async (file, folder) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'voltride_docs')
    formData.append('folder', folder || 'operator')
    const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/auto/upload', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    return data.secure_url
  }
}

export default api
