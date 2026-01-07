import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

const COUNTRIES = [
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'France', prefix: '+33', flag: '🇫🇷' },
  { code: 'GB', name: 'United Kingdom', prefix: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Deutschland', prefix: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italia', prefix: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Nederland', prefix: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgique', prefix: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', prefix: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Österreich', prefix: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Polska', prefix: '+48', flag: '🇵🇱' },
  { code: 'SE', name: 'Sverige', prefix: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norge', prefix: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Danmark', prefix: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Suomi', prefix: '+358', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', prefix: '+353', flag: '🇮🇪' },
  { code: 'US', name: 'United States', prefix: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', prefix: '+1', flag: '🇨🇦' },
]

export default function App() {
  // Config: store multiple agency IDs per location
  const [agencyIds, setAgencyIds] = useState(() => {
    const stored = localStorage.getItem('tablet_agencies')
    return stored ? JSON.parse(stored) : []
  })
  const [configMode, setConfigMode] = useState(agencyIds.length === 0)
  const [agencies, setAgencies] = useState([])
  const [locationName, setLocationName] = useState(() => localStorage.getItem('tablet_location') || '')
  
  // Session state
  const [signatureSession, setSignatureSession] = useState(null)
  const [walkinSession, setWalkinSession] = useState(null)
  
  // Signature state
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successType, setSuccessType] = useState('')
  const canvasRef = useRef(null)

  // Walkin form state
  const [walkinForm, setWalkinForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES'
  })

  // Load agencies for config
  useEffect(() => {
    fetch(API_URL + '/api/agencies')
      .then(r => r.json())
      .then(data => setAgencies(data))
      .catch(e => console.error(e))
  }, [])

  // Poll for pending sessions (signature OR walkin)
  useEffect(() => {
    if (agencyIds.length === 0 || configMode || signatureSession || walkinSession) return
    
    const pollInterval = setInterval(async () => {
      try {
        // Check for signature sessions
        const sigRes = await fetch(API_URL + '/api/tablet-sessions/agencies?ids=' + agencyIds.join(','))
        const sigData = await sigRes.json()
        if (sigData && sigData.status === 'pending') {
          setSignatureSession(sigData)
          return
        }
        
        // Check for walkin sessions
        const walkRes = await fetch(API_URL + '/api/walkin-sessions/agencies?ids=' + agencyIds.join(','))
        const walkData = await walkRes.json()
        if (walkData && walkData.status === 'pending') {
          setWalkinSession(walkData)
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [agencyIds, configMode, signatureSession, walkinSession])

  // Setup canvas when signature session arrives
  useEffect(() => {
    if (signatureSession && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
    }
  }, [signatureSession])

  // Save config
  const saveConfig = () => {
    if (agencyIds.length > 0 && locationName) {
      localStorage.setItem('tablet_agencies', JSON.stringify(agencyIds))
      localStorage.setItem('tablet_location', locationName)
      setConfigMode(false)
    }
  }

  const toggleAgency = (id) => {
    setAgencyIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  // Drawing handlers
  const startDrawing = (e) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignature(canvasRef.current.toDataURL())
    }
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  // Submit signature
  const submitSignature = async () => {
    if (!termsAccepted || !rgpdAccepted || !signature) return
    
    setSending(true)
    try {
      await fetch(API_URL + '/api/tablet-sessions/' + signatureSession.sessionId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          termsAccepted: true,
          rgpdAccepted: true,
          status: 'signed'
        })
      })
      setSuccessType('signature')
      setSuccess(true)
      
      setTimeout(() => {
        setSignatureSession(null)
        setTermsAccepted(false)
        setRgpdAccepted(false)
        setSignature('')
        setSuccess(false)
      }, 3000)
    } catch (e) {
      alert('Erreur lors de l\'envoi')
    }
    setSending(false)
  }

  // Cancel walkin session (return to waiting)
  const cancelWalkinSession = async () => {
    if (walkinSession?.sessionId) {
      try {
        await fetch(API_URL + '/api/walkin-sessions/' + walkinSession.sessionId, {
          method: 'DELETE'
        })
      } catch (e) {}
    }
    setWalkinSession(null)
    setWalkinForm({
      firstName: '', lastName: '', email: '', phone: '',
      phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES'
    })
  }

  // Cancel signature session (return to waiting)
  const cancelSignatureSession = async () => {
    if (signatureSession?.sessionId) {
      try {
        await fetch(API_URL + '/api/tablet-sessions/' + signatureSession.sessionId, {
          method: 'DELETE'
        })
      } catch (e) {}
    }
    setSignatureSession(null)
    setTermsAccepted(false)
    setRgpdAccepted(false)
    setSignature('')
  }

  // Submit walkin form
  const submitWalkin = async () => {
    if (!walkinForm.firstName || !walkinForm.lastName || !walkinForm.email || !walkinForm.phone) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    setSending(true)
    try {
      await fetch(API_URL + '/api/walkin-sessions/' + walkinSession.sessionId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...walkinForm,
          status: 'completed'
        })
      })
      setSuccessType('walkin')
      setSuccess(true)
      
      setTimeout(() => {
        setWalkinSession(null)
        setWalkinForm({
          firstName: '', lastName: '', email: '', phone: '',
          phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES'
        })
        setSuccess(false)
      }, 3000)
    } catch (e) {
      alert('Erreur lors de l\'envoi')
    }
    setSending(false)
  }

  // Get brand logo/color
  const getBrandStyle = (brand) => {
    if (brand === 'VOLTRIDE') return { color: '#abdee6', icon: '⚡' }
    if (brand === 'MOTOR-RENT') return { color: '#ffaf10', icon: '🏍️' }
    return { color: '#3b82f6', icon: '📋' }
  }

  // Texts
  const lang = signatureSession?.language || walkinSession?.language || 'fr'
  const texts = {
    fr: {
      waiting: 'En attente d\'un client...',
      welcome: 'Bienvenue',
      readTerms: 'Veuillez lire et accepter les conditions ci-dessous',
      cgv: 'Conditions Générales de Vente',
      rgpd: 'Protection des données (RGPD)',
      acceptCgv: 'J\'ai lu et j\'accepte les CGV',
      acceptRgpd: 'J\'accepte la politique de protection des données',
      signature: 'Votre signature',
      clear: 'Effacer',
      submit: 'Valider',
      success: 'Merci !',
      successMsg: 'Votre signature a été enregistrée.',
      walkinTitle: 'Vos informations',
      walkinMsg: 'Veuillez remplir vos coordonnées',
      walkinSuccess: 'Vos informations ont été enregistrées.',
      firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone',
      address: 'Adresse', city: 'Ville', postalCode: 'Code postal', country: 'Pays'
    },
    es: {
      waiting: 'Esperando un cliente...',
      welcome: 'Bienvenido',
      readTerms: 'Por favor lea y acepte las condiciones',
      cgv: 'Condiciones Generales de Venta',
      rgpd: 'Protección de datos (RGPD)',
      acceptCgv: 'He leído y acepto las CGV',
      acceptRgpd: 'Acepto la política de protección de datos',
      signature: 'Su firma',
      clear: 'Borrar',
      submit: 'Validar',
      success: '¡Gracias!',
      successMsg: 'Su firma ha sido registrada.',
      walkinTitle: 'Sus datos',
      walkinMsg: 'Por favor complete sus datos de contacto',
      walkinSuccess: 'Sus datos han sido registrados.',
      firstName: 'Nombre', lastName: 'Apellido', email: 'Email', phone: 'Teléfono',
      address: 'Dirección', city: 'Ciudad', postalCode: 'Código postal', country: 'País'
    },
    en: {
      waiting: 'Waiting for customer...',
      welcome: 'Welcome',
      readTerms: 'Please read and accept the conditions below',
      cgv: 'Terms and Conditions',
      rgpd: 'Data Protection (GDPR)',
      acceptCgv: 'I have read and accept the T&C',
      acceptRgpd: 'I accept the data protection policy',
      signature: 'Your signature',
      clear: 'Clear',
      submit: 'Submit',
      success: 'Thank you!',
      successMsg: 'Your signature has been recorded.',
      walkinTitle: 'Your information',
      walkinMsg: 'Please fill in your contact details',
      walkinSuccess: 'Your information has been recorded.',
      firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone',
      address: 'Address', city: 'City', postalCode: 'Postal code', country: 'Country'
    }
  }
  const t = texts[lang] || texts.fr

  // Config screen
  if (configMode) {
    const groupedAgencies = agencies.reduce((acc, a) => {
      if (!acc[a.city]) acc[a.city] = []
      acc[a.city].push(a)
      return acc
    }, {})

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">⚙️ Configuration Tablette</h1>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Nom du lieu</label>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              placeholder="Ex: Comptoir Torrevieja"
              className="w-full border-2 rounded-xl p-3"
            />
          </div>
          
          <p className="text-gray-600 mb-4">Sélectionnez les agences pour ce lieu :</p>
          
          {Object.entries(groupedAgencies).map(([city, cityAgencies]) => (
            <div key={city} className="mb-4">
              <h3 className="font-bold text-gray-700 mb-2">📍 {city}</h3>
              {cityAgencies.map(a => (
                <label key={a.id} className={'flex items-center gap-3 p-3 border-2 rounded-xl mb-2 cursor-pointer ' + 
                  (agencyIds.includes(a.id) ? 'border-green-500 bg-green-50' : 'border-gray-200')}>
                  <input
                    type="checkbox"
                    checked={agencyIds.includes(a.id)}
                    onChange={() => toggleAgency(a.id)}
                    className="w-5 h-5 accent-green-600"
                  />
                  <span style={{ color: a.brand === 'VOLTRIDE' ? '#abdee6' : '#ffaf10' }}>
                    {a.brand === 'VOLTRIDE' ? '⚡' : '🏍️'}
                  </span>
                  <span>{a.brand} - {a.code}</span>
                </label>
              ))}
            </div>
          ))}
          
          <button 
            onClick={saveConfig}
            disabled={agencyIds.length === 0 || !locationName}
            className="w-full py-4 bg-green-600 text-white rounded-xl text-xl font-bold disabled:opacity-50 mt-4"
          >
            ✓ Enregistrer
          </button>
        </div>
      </div>
    )
  }

  // Success screen
  if (success) {
    const brandStyle = getBrandStyle(signatureSession?.brand || walkinSession?.brand)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: brandStyle.color }}>
        <div className="text-center text-white">
          <div className="text-8xl mb-6">✅</div>
          <h1 className="text-4xl font-bold mb-2">{t.success}</h1>
          <p className="text-xl opacity-90">{successType === 'walkin' ? t.walkinSuccess : t.successMsg}</p>
        </div>
      </div>
    )
  }

  // Walkin form screen
  if (walkinSession) {
    const brandStyle = getBrandStyle(walkinSession.brand)
    const selectedCountry = COUNTRIES.find(c => c.code === walkinForm.country) || COUNTRIES[0]
    
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-xl mx-auto">
          <div className="text-white rounded-t-2xl p-6 text-center" style={{ backgroundColor: brandStyle.color }}>
            <div className="text-4xl mb-2">{brandStyle.icon}</div>
            <h1 className="text-2xl font-bold">{t.walkinTitle}</h1>
            <p className="opacity-90">{t.walkinMsg}</p>
          </div>

          <div className="bg-white rounded-b-2xl shadow-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.firstName} *</label>
                <input type="text" value={walkinForm.firstName}
                  onChange={e => setWalkinForm({...walkinForm, firstName: e.target.value})}
                  className="w-full border-2 rounded-xl p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.lastName} *</label>
                <input type="text" value={walkinForm.lastName}
                  onChange={e => setWalkinForm({...walkinForm, lastName: e.target.value})}
                  className="w-full border-2 rounded-xl p-3" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.email} *</label>
              <input type="email" value={walkinForm.email}
                onChange={e => setWalkinForm({...walkinForm, email: e.target.value})}
                className="w-full border-2 rounded-xl p-3" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.phone} *</label>
              <div className="flex gap-2">
                <select value={walkinForm.phonePrefix}
                  onChange={e => setWalkinForm({...walkinForm, phonePrefix: e.target.value})}
                  className="border-2 rounded-xl p-3 w-28">
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.prefix}>{c.flag} {c.prefix}</option>
                  ))}
                </select>
                <input type="tel" value={walkinForm.phone}
                  onChange={e => setWalkinForm({...walkinForm, phone: e.target.value})}
                  className="flex-1 border-2 rounded-xl p-3" placeholder="612345678" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.address} *</label>
              <input type="text" value={walkinForm.address}
                onChange={e => setWalkinForm({...walkinForm, address: e.target.value})}
                className="w-full border-2 rounded-xl p-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.city} *</label>
                <input type="text" value={walkinForm.city}
                  onChange={e => setWalkinForm({...walkinForm, city: e.target.value})}
                  className="w-full border-2 rounded-xl p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.postalCode} *</label>
                <input type="text" value={walkinForm.postalCode}
                  onChange={e => setWalkinForm({...walkinForm, postalCode: e.target.value})}
                  className="w-full border-2 rounded-xl p-3" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.country} *</label>
              <select value={walkinForm.country}
                onChange={e => setWalkinForm({...walkinForm, country: e.target.value})}
                className="w-full border-2 rounded-xl p-3">
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            <button onClick={submitWalkin} disabled={sending}
              className="w-full py-4 text-white rounded-xl text-xl font-bold disabled:opacity-50"
              style={{ backgroundColor: brandStyle.color }}>
              {sending ? '⏳ Envoi...' : '✅ ' + t.submit}
            </button>
            <button onClick={cancelWalkinSession}
              className="w-full py-3 text-gray-500 text-sm mt-2">
              ❌ Annuler
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Signature screen
  if (signatureSession) {
    const brandStyle = getBrandStyle(signatureSession.brand)
    
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-white rounded-t-2xl p-6 text-center" style={{ backgroundColor: brandStyle.color }}>
            <div className="text-3xl mb-2">{brandStyle.icon}</div>
            <h1 className="text-2xl font-bold">{t.welcome}, {signatureSession.customerName}</h1>
            <p className="opacity-90">{t.readTerms}</p>
          </div>

          <div className="bg-white rounded-b-2xl shadow-xl p-6 space-y-6">
            <div>
              <h2 className="font-bold text-lg mb-2">{t.cgv}</h2>
              <div className="border rounded-xl p-4 h-40 overflow-auto bg-gray-50 text-sm whitespace-pre-wrap">
                {signatureSession.cgvText || 'CGV non disponibles'}
              </div>
              <label className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={termsAccepted} 
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="w-6 h-6 accent-green-600" />
                <span className="font-medium">{t.acceptCgv}</span>
              </label>
            </div>

            <div>
              <h2 className="font-bold text-lg mb-2">{t.rgpd}</h2>
              <div className="border rounded-xl p-4 h-32 overflow-auto bg-gray-50 text-sm whitespace-pre-wrap">
                {signatureSession.rgpdText || 'RGPD non disponible'}
              </div>
              <label className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={rgpdAccepted} 
                  onChange={e => setRgpdAccepted(e.target.checked)}
                  className="w-6 h-6 accent-green-600" />
                <span className="font-medium">{t.acceptRgpd}</span>
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-lg">{t.signature}</h2>
                <button onClick={clearSignature} className="text-red-600 text-sm">{t.clear}</button>
              </div>
              <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white">
                <canvas ref={canvasRef} width={600} height={200}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
              </div>
            </div>

            <button onClick={submitSignature}
              disabled={!termsAccepted || !rgpdAccepted || !signature || sending}
              className="w-full py-5 text-white rounded-xl text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandStyle.color }}>
              {sending ? '⏳ Envoi...' : '✅ ' + t.submit}
            </button>
            <button onClick={cancelSignatureSession}
              className="w-full py-3 text-gray-500 text-sm mt-2">
              ❌ Annuler
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Waiting screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700">
      <div className="text-white text-center">
        <div className="text-6xl mb-8 animate-pulse">📱</div>
        <h1 className="text-3xl font-bold mb-2">{locationName}</h1>
        <p className="text-xl mb-4 opacity-90">{t.waiting}</p>
        <div className="flex gap-2 justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
      <button onClick={() => setConfigMode(true)}
        className="absolute bottom-4 right-4 text-white/50 text-sm">
        ⚙️ Config
      </button>
    </div>
  )
}
