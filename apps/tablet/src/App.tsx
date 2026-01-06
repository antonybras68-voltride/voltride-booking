import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

export default function App() {
  // Get agencyId from URL params or localStorage
  const [agencyId, setAgencyId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('agency') || localStorage.getItem('tablet_agency') || ''
  })
  const [configMode, setConfigMode] = useState(!agencyId)
  const [agencies, setAgencies] = useState([])
  
  // Session state
  const [session, setSession] = useState(null)
  const [polling, setPolling] = useState(true)
  
  // Signature state
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const canvasRef = useRef(null)

  // Load agencies for config
  useEffect(() => {
    if (configMode) {
      fetch(API_URL + '/api/agencies')
        .then(r => r.json())
        .then(data => setAgencies(data))
        .catch(e => console.error(e))
    }
  }, [configMode])

  // Poll for pending sessions
  useEffect(() => {
    if (!agencyId || configMode || session) return
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(API_URL + '/api/tablet-sessions/agency/' + agencyId)
        const data = await res.json()
        if (data && data.status === 'pending') {
          setSession(data)
          setPolling(false)
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [agencyId, configMode, session])

  // Setup canvas when session arrives
  useEffect(() => {
    if (session && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
    }
  }, [session])

  // Save agency config
  const saveConfig = () => {
    if (agencyId) {
      localStorage.setItem('tablet_agency', agencyId)
      setConfigMode(false)
    }
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
      await fetch(API_URL + '/api/tablet-sessions/' + session.sessionId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          termsAccepted: true,
          rgpdAccepted: true,
          status: 'signed'
        })
      })
      setSuccess(true)
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSession(null)
        setTermsAccepted(false)
        setRgpdAccepted(false)
        setSignature('')
        setSuccess(false)
        setPolling(true)
      }, 3000)
    } catch (e) {
      alert('Erreur lors de l\'envoi')
    }
    setSending(false)
  }

  // Get text based on language
  const lang = session?.language || 'fr'
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
      successMsg: 'Votre signature a été enregistrée.'
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
      successMsg: 'Su firma ha sido registrada.'
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
      successMsg: 'Your signature has been recorded.'
    }
  }
  const t = texts[lang] || texts.fr

  // Config screen
  if (configMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">⚙️ Configuration Tablette</h1>
          <p className="text-gray-600 mb-4">Sélectionnez l'agence pour cette tablette :</p>
          <select 
            value={agencyId} 
            onChange={e => setAgencyId(e.target.value)}
            className="w-full border-2 rounded-xl p-4 text-lg mb-6"
          >
            <option value="">-- Choisir une agence --</option>
            {agencies.map(a => (
              <option key={a.id} value={a.id}>{a.city} - {a.brand}</option>
            ))}
          </select>
          <button 
            onClick={saveConfig}
            disabled={!agencyId}
            className="w-full py-4 bg-green-600 text-white rounded-xl text-xl font-bold disabled:opacity-50"
          >
            ✓ Enregistrer
          </button>
          <p className="text-sm text-gray-500 mt-4 text-center">
            Cette configuration sera mémorisée sur cette tablette.
          </p>
        </div>
      </div>
    )
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-500">
        <div className="text-center text-white">
          <div className="text-8xl mb-6">✅</div>
          <h1 className="text-4xl font-bold mb-2">{t.success}</h1>
          <p className="text-xl opacity-90">{t.successMsg}</p>
        </div>
      </div>
    )
  }

  // Waiting screen
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700">
        <div className="text-white text-center">
          <div className="text-6xl mb-8 animate-pulse">📱</div>
          <h1 className="text-3xl font-bold mb-4">{t.waiting}</h1>
          <div className="flex gap-2 justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
        <button 
          onClick={() => setConfigMode(true)}
          className="absolute bottom-4 right-4 text-white/50 text-sm"
        >
          ⚙️ Config
        </button>
      </div>
    )
  }

  // Signature screen
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-green-600 text-white rounded-t-2xl p-6 text-center">
          <h1 className="text-2xl font-bold">{t.welcome}, {session.customerName}</h1>
          <p className="opacity-90">{t.readTerms}</p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-xl p-6 space-y-6">
          {/* CGV */}
          <div>
            <h2 className="font-bold text-lg mb-2">{t.cgv}</h2>
            <div className="border rounded-xl p-4 h-40 overflow-auto bg-gray-50 text-sm whitespace-pre-wrap">
              {session.cgvText || 'CGV non disponibles'}
            </div>
            <label className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                checked={termsAccepted} 
                onChange={e => setTermsAccepted(e.target.checked)}
                className="w-6 h-6 accent-green-600"
              />
              <span className="font-medium">{t.acceptCgv}</span>
            </label>
          </div>

          {/* RGPD */}
          <div>
            <h2 className="font-bold text-lg mb-2">{t.rgpd}</h2>
            <div className="border rounded-xl p-4 h-32 overflow-auto bg-gray-50 text-sm whitespace-pre-wrap">
              {session.rgpdText || 'RGPD non disponible'}
            </div>
            <label className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                checked={rgpdAccepted} 
                onChange={e => setRgpdAccepted(e.target.checked)}
                className="w-6 h-6 accent-green-600"
              />
              <span className="font-medium">{t.acceptRgpd}</span>
            </label>
          </div>

          {/* Signature */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg">{t.signature}</h2>
              <button onClick={clearSignature} className="text-red-600 text-sm">{t.clear}</button>
            </div>
            <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white">
              <canvas 
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={submitSignature}
            disabled={!termsAccepted || !rgpdAccepted || !signature || sending}
            className="w-full py-5 bg-green-600 text-white rounded-xl text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '⏳ Envoi...' : '✅ ' + t.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
