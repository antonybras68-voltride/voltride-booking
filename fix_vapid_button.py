#!/usr/bin/env python3
import base64

app_path = 'apps/operator/src/App.tsx'

with open(app_path, 'r') as f:
    content = f.read()

# L'ancien code avec la mauvaise clé
old_code = '''onClick={async () => {
                          if ('Notification' in window && 'serviceWorker' in navigator) {
                            const permission = await Notification.requestPermission();
                            if (permission === 'granted') {
                              const reg = await navigator.serviceWorker.ready;
                              const sub = await reg.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: new Uint8Array([4,164,104,48,88,67,227,205,40,156,221,74,131,46,205,11,106,238,246,111,9,4,162,236,233,21,68,2,245,97,221,196,161,164,226,221,57,185,63,48,9,146,6,208,158,16,224,56,161,220,237,184,225,96,193,45,165,9,72,55,157,75,75,220].filter((_, i) => i < 65))
                              });
                              await fetch(API_URL + '/api/push/subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ subscription: sub, userId: user?.id })
                              });
                              alert('✅ Notifications activées !');
                            }
                          }
                        }}'''

# Le nouveau code avec la bonne clé
new_code = '''onClick={async () => {
                          if ('Notification' in window && 'serviceWorker' in navigator) {
                            const permission = await Notification.requestPermission();
                            if (permission === 'granted') {
                              const reg = await navigator.serviceWorker.ready;
                              // Convertir la clé VAPID base64 en Uint8Array
                              const vapidKey = 'BI8oq0NMfLo2iM3wQuOG5XYwEndPbAVyyu_vlXdfwHUI7IS1USHUWMWx2H6yAq04FObrkEBrG0sV9W8PyGSa7s0';
                              const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
                              const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
                              const rawData = atob(base64);
                              const applicationServerKey = new Uint8Array(rawData.length);
                              for (let i = 0; i < rawData.length; i++) applicationServerKey[i] = rawData.charCodeAt(i);
                              
                              const sub = await reg.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: applicationServerKey
                              });
                              await fetch(API_URL + '/api/push/subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ subscription: sub, userId: user?.id })
                              });
                              alert('✅ Notifications activées !');
                            }
                          }
                        }}'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(app_path, 'w') as f:
        f.write(content)
    print("✅ Bouton corrigé avec la nouvelle clé VAPID!")
else:
    print("⚠️ Code non trouvé - peut-être déjà modifié?")
