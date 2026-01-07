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
  { code: 'CH', name: 'Suisse', prefix: '+41', flag: '��🇭' },
  { code: 'AT', name: 'Österreich', prefix: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Polska', prefix: '+48', flag: '🇵🇱' },
  { code: 'SE', name: 'Sverige', prefix: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norge', prefix: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Danmark', prefix: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Suomi', prefix: '+358', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', prefix: '+353', flag: '🇮��' },
  { code: 'US', name: 'United States', prefix: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', prefix: '+1', flag: '🇨🇦' },
]

// Logos URLs
const VOLTRIDE_LOGO = 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1735555766/Logotipo_Voltride_Color_sin_fondo_z4grbt.png'
const MOTORRENT_LOGO = 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1735555766/Logotipo_Motor_rent_color_sin_fondo_bvnxyg.png'

// Floating Logo Component
function FloatingLogo({ src, initialX, initialY, speed, size }) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const [vel, setVel] = useState({ x: speed, y: speed * 0.7 })
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPos(p => {
        let newX = p.x + vel.x
        let newY = p.y + vel.y
        let newVelX = vel.x
        let newVelY = vel.y
        
        if (newX <= 0 || newX >= window.innerWidth - size) {
          newVelX = -vel.x
          setVel(v => ({ ...v, x: newVelX }))
        }
        if (newY <= 0 || newY >= window.innerHeight - size - 100) {
          newVelY = -vel.y
          setVel(v => ({ ...v, y: newVelY }))
        }
        
        return { x: Math.max(0, Math.min(newX, window.innerWidth - size)), y: Math.max(0, Math.min(newY, window.innerHeight - size - 100)) }
      })
    }, 50)
    return () => clearInterval(interval)
  }, [vel, size])
  
  return (
    <img src={src} alt="logo" 
      className="absolute pointer-events-none opacity-30"
      style={{ left: pos.x, top: pos.y, width: size, height: 'auto' }} />
  )
}

// Wave Animation Component
function WaveAnimation() {
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ height: '150px' }}>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 150" preserveAspectRatio="none" style={{ height: '150px' }}>
        <path fill="rgba(255,255,255,0.3)" d="M0,50 C360,150 1080,-50 1440,50 L1440,150 L0,150 Z">
          <animate attributeName="d" dur="8s" repeatCount="indefinite"
            values="M0,50 C360,150 1080,-50 1440,50 L1440,150 L0,150 Z;
                    M0,100 C360,0 1080,150 1440,50 L1440,150 L0,150 Z;
                    M0,50 C360,150 1080,-50 1440,50 L1440,150 L0,150 Z" />
        </path>
      </svg>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 150" preserveAspectRatio="none" style={{ height: '120px' }}>
        <path fill="rgba(255,255,255,0.5)" d="M0,100 C360,0 1080,150 1440,50 L1440,150 L0,150 Z">
          <animate attributeName="d" dur="6s" repeatCount="indefinite"
            values="M0,100 C360,0 1080,150 1440,50 L1440,150 L0,150 Z;
                    M0,50 C360,150 1080,0 1440,100 L1440,150 L0,150 Z;
                    M0,100 C360,0 1080,150 1440,50 L1440,150 L0,150 Z" />
        </path>
      </svg>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 150" preserveAspectRatio="none" style={{ height: '80px' }}>
        <path fill="rgba(255,255,255,0.8)" d="M0,80 C480,150 960,0 1440,80 L1440,150 L0,150 Z">
          <animate attributeName="d" dur="4s" repeatCount="indefinite"
            values="M0,80 C480,150 960,0 1440,80 L1440,150 L0,150 Z;
                    M0,50 C480,0 960,150 1440,100 L1440,150 L0,150 Z;
                    M0,80 C480,150 960,0 1440,80 L1440,150 L0,150 Z" />
        </path>
      </svg>
    </div>
  )
}

// Language Selector Component
function LanguageSelector({ lang, setLang }) {
  return (
    <div className="flex gap-2 justify-center mb-4">
      {[
        { code: 'fr', flag: '🇫🇷' },
        { code: 'es', flag: '🇪🇸' },
        { code: 'en', flag: '🇬🇧' }
      ].map(l => (
        <button key={l.code} onClick={() => setLang(l.code)}
          className={'px-4 py-2 rounded-xl text-2xl transition-all ' + 
            (lang === l.code ? 'bg-white shadow-lg scale-110' : 'bg-white/30 hover:bg-white/50')}>
          {l.flag}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [agencyIds, setAgencyIds] = useState(() => {
    const stored = localStorage.getItem('tablet_agencies')
    return stored ? JSON.parse(stored) : []
  })
  const [configMode, setConfigMode] = useState(agencyIds.length === 0)
  const [agencies, setAgencies] = useState([])
  const [locationName, setLocationName] = useState(() => localStorage.getItem('tablet_location') || 'Torrevieja')
  
  const [signatureSession, setSignatureSession] = useState(null)
  const [walkinSession, setWalkinSession] = useState(null)
  
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successType, setSuccessType] = useState('')
  const canvasRef = useRef(null)

  const [walkinLang, setWalkinLang] = useState('fr')
  const [walkinForm, setWalkinForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES'
  })

  useEffect(() => {
    fetch(API_URL + '/api/agencies')
      .then(r => r.json())
      .then(data => setAgencies(data))
      .catch(e => console.error(e))
  }, [])

  useEffect(() => {
    if (agencyIds.length === 0 || configMode || signatureSession || walkinSession) return
    
    const pollInterval = setInterval(async () => {
      try {
        const sigRes = await fetch(API_URL + '/api/tablet-sessions/agencies?ids=' + agencyIds.join(','))
        const sigData = await sigRes.json()
        if (sigData && sigData.status === 'pending') {
          setSignatureSession(sigData)
          return
        }
        
        const walkRes = await fetch(API_URL + '/api/walkin-sessions/agencies?ids=' + agencyIds.join(','))
        const walkData = await walkRes.json()
        if (walkData && walkData.status === 'pending') {
          setWalkinSession(walkData)
          setWalkinLang(walkData.language || 'fr')
        }
      } catch (e) {}
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [agencyIds, configMode, signatureSession, walkinSession])

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

  const saveConfig = () => {
    if (agencyIds.length > 0 && locationName) {
      localStorage.setItem('tablet_agencies', JSON.stringify(agencyIds))
      localStorage.setItem('tablet_location', locationName)
      setConfigMode(false)
    }
  }

  const toggleAgency = (id) => {
    setAgencyIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

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
    if (isDrawing && canvasRef.current) setSignature(canvasRef.current.toDataURL())
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  const cancelWalkinSession = async () => {
    if (walkinSession?.sessionId) {
      try { await fetch(API_URL + '/api/walkin-sessions/' + walkinSession.sessionId, { method: 'DELETE' }) } catch (e) {}
    }
    setWalkinSession(null)
    setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
  }

  const cancelSignatureSession = async () => {
    if (signatureSession?.sessionId) {
      try { await fetch(API_URL + '/api/tablet-sessions/' + signatureSession.sessionId, { method: 'DELETE' }) } catch (e) {}
    }
    setSignatureSession(null)
    setTermsAccepted(false)
    setRgpdAccepted(false)
    setSignature('')
  }

  const submitSignature = async () => {
    if (!termsAccepted || !rgpdAccepted || !signature) return
    setSending(true)
    try {
      await fetch(API_URL + '/api/tablet-sessions/' + signatureSession.sessionId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, termsAccepted: true, rgpdAccepted: true, status: 'signed' })
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
    } catch (e) { alert('Erreur') }
    setSending(false)
  }

  const submitWalkin = async () => {
    if (!walkinForm.firstName || !walkinForm.lastName || !walkinForm.email || !walkinForm.phone) {
      alert(walkinLang === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 
            walkinLang === 'es' ? 'Por favor complete todos los campos obligatorios' : 
            'Please fill in all required fields')
      return
    }
    setSending(true)
    try {
      await fetch(API_URL + '/api/walkin-sessions/' + walkinSession.sessionId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...walkinForm, status: 'completed' })
      })
      setSuccessType('walkin')
      setSuccess(true)
      setTimeout(() => {
        setWalkinSession(null)
        setWalkinForm({ firstName: '', lastName: '', email: '', phone: '', phonePrefix: '+34', address: '', city: '', postalCode: '', country: 'ES' })
        setSuccess(false)
      }, 3000)
    } catch (e) { alert('Erreur') }
    setSending(false)
  }

  const getBrandStyle = (brand) => {
    if (brand === 'VOLTRIDE') return { color: '#abdee6', icon: '⚡' }
    if (brand === 'MOTOR-RENT') return { color: '#ffaf10', icon: '🏍️' }
    return { color: '#3b82f6', icon: '📋' }
  }

  const lang = signatureSession?.language || walkinLang || 'fr'
  const texts = {
    fr: {
      welcome: 'Bienvenue', readTerms: 'Veuillez lire et accepter les conditions ci-dessous',
      cgv: 'Conditions Générales de Vente', rgpd: 'Protection des données (RGPD)',
      acceptCgv: 'J\'ai lu et j\'accepte les CGV', acceptRgpd: 'J\'accepte la politique de protection des données',
      signature: 'Votre signature', clear: 'Effacer', submit: 'Valider', cancel: 'Annuler',
      success: 'Merci !', successMsg: 'Votre signature a été enregistrée.',
      walkinTitle: 'Vos informations', walkinMsg: 'Veuillez remplir vos coordonnées',
      walkinSuccess: 'Vos informations ont été enregistrées.',
      firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone',
      address: 'Adresse', city: 'Ville', postalCode: 'Code postal', country: 'Pays'
    },
    es: {
      welcome: 'Bienvenido', readTerms: 'Por favor lea y acepte las condiciones',
      cgv: 'Condiciones Generales', rgpd: 'Protección de datos (RGPD)',
      acceptCgv: 'He leído y acepto las condiciones', acceptRgpd: 'Acepto la política de protección de datos',
      signature: 'Su firma', clear: 'Borrar', submit: 'Validar', cancel: 'Cancelar',
      success: '¡Gracias!', successMsg: 'Su firma ha sido registrada.',
      walkinTitle: 'Sus datos', walkinMsg: 'Por favor complete sus datos de contacto',
      walkinSuccess: 'Sus datos han sido registrados.',
      firstName: 'Nombre', lastName: 'Apellido', email: 'Email', phone: 'Teléfono',
      address: 'Dirección', city: 'Ciudad', postalCode: 'Código postal', country: 'País'
    },
    en: {
      welcome: 'Welcome', readTerms: 'Please read and accept the conditions below',
      cgv: 'Terms and Conditions', rgpd: 'Data Protection (GDPR)',
      acceptCgv: 'I have read and accept the T&C', acceptRgpd: 'I accept the data protection policy',
      signature: 'Your signature', clear: 'Clear', submit: 'Submit', cancel: 'Cancel',
      success: 'Thank you!', successMsg: 'Your signature has been recorded.',
      walkinTitle: 'Your information', walkinMsg: 'Please fill in your contact details',
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
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">⚙️ Configuration Tablette</h1>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Nom du lieu</label>
            <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)}
              placeholder="Ex: Torrevieja" className="w-full border-2 rounded-xl p-3" />
          </div>
          <p className="text-gray-600 mb-4">Sélectionnez les agences :</p>
          {Object.entries(groupedAgencies).map(([city, cityAgencies]) => (
            <div key={city} className="mb-4">
              <h3 className="font-bold text-gray-700 mb-2">📍 {city}</h3>
              {cityAgencies.map(a => (
                <label key={a.id} className={'flex items-center gap-3 p-3 border-2 rounded-xl mb-2 cursor-pointer ' + 
                  (agencyIds.includes(a.id) ? 'border-green-500 bg-green-50' : 'border-gray-200')}>
                  <input type="checkbox" checked={agencyIds.includes(a.id)} onChange={() => toggleAgency(a.id)}
                    className="w-5 h-5 accent-green-600" />
                  <span style={{ color: a.brand === 'VOLTRIDE' ? '#abdee6' : '#ffaf10' }}>
                    {a.brand === 'VOLTRIDE' ? '⚡' : '🏍️'}
                  </span>
                  <span>{a.brand} - {a.code}</span>
                </label>
              ))}
            </div>
          ))}
          <button onClick={saveConfig} disabled={agencyIds.length === 0 || !locationName}
            className="w-full py-4 bg-green-600 text-white rounded-xl text-xl font-bold disabled:opacity-50 mt-4">
            ✓ Enregistrer
          </button>
        </div>
      </div>
    )
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
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
    
    return (
      <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
        <div className="max-w-xl mx-auto">
          <LanguageSelector lang={walkinLang} setLang={setWalkinLang} />
          
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
              <label className="block text-sm font-medium mb-1">{t.address}</label>
              <input type="text" value={walkinForm.address}
                onChange={e => setWalkinForm({...walkinForm, address: e.target.value})}
                className="w-full border-2 rounded-xl p-3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.city}</label>
                <input type="text" value={walkinForm.city}
                  onChange={e => setWalkinForm({...walkinForm, city: e.target.value})}
                  className="w-full border-2 rounded-xl p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.postalCode}</label>
                <input type="text" value={walkinForm.postalCode}
                  onChange={e => setWalkinForm({...walkinForm, postalCode: e.target.value})}
                  className="w-full border-2 rounded-xl p-3" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.country}</label>
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
              {sending ? '⏳...' : '✅ ' + t.submit}
            </button>
            <button onClick={cancelWalkinSession} className="w-full py-3 text-gray-500 text-sm">
              ❌ {t.cancel}
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
      <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
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
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
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
                <input type="checkbox" checked={rgpdAccepted} onChange={e => setRgpdAccepted(e.target.checked)}
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
                <canvas ref={canvasRef} width={600} height={200} className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
              </div>
            </div>
            <button onClick={submitSignature}
              disabled={!termsAccepted || !rgpdAccepted || !signature || sending}
              className="w-full py-5 text-white rounded-xl text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandStyle.color }}>
              {sending ? '⏳...' : '✅ ' + t.submit}
            </button>
            <button onClick={cancelSignatureSession} className="w-full py-3 text-gray-500 text-sm">
              ❌ {t.cancel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Waiting screen with animation
  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
      
      {/* Floating logos */}
      <FloatingLogo src={VOLTRIDE_LOGO} initialX={100} initialY={100} speed={1.5} size={120} />
      <FloatingLogo src={MOTORRENT_LOGO} initialX={300} initialY={200} speed={-1.2} size={100} />
      <FloatingLogo src={VOLTRIDE_LOGO} initialX={500} initialY={150} speed={1} size={80} />
      <FloatingLogo src={MOTORRENT_LOGO} initialX={200} initialY={300} speed={-0.8} size={90} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">{locationName}</h1>
      </div>
      
      {/* Waves */}
      <WaveAnimation />
      
      {/* Config button */}
      <button onClick={() => setConfigMode(true)}
        className="absolute bottom-4 right-4 text-white/50 text-sm z-20">
        ⚙️ Config
      </button>
    </div>
  )
}
