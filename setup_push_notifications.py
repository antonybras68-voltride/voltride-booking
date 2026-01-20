#!/usr/bin/env python3

# 1. Ajouter le model PushSubscription au schema Prisma
schema_path = 'packages/database/prisma/schema.prisma'

with open(schema_path, 'r') as f:
    content = f.read()

push_model = '''
// ============== PUSH NOTIFICATIONS ==============
model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  userId    String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}
'''

if 'PushSubscription' not in content:
    content = content + push_model
    with open(schema_path, 'w') as f:
        f.write(content)
    print("✅ Model PushSubscription ajouté au schema Prisma")
else:
    print("⚠️ PushSubscription existe déjà")

print("\n📋 Prochaines étapes:")
print("1. git add -A && git commit -m 'feat: add PushSubscription model' && git push")
print("2. Dans Railway, ajouter ces variables d'environnement:")
print("   VAPID_PUBLIC_KEY=BKRoMFhD4-MNKJzdSoMuzQtq7vZvCQSi7OkVRAL1Yd3EoaTi3Tm5PzAJkgbQnhDgOKHc7bjhYMEtpQlIN51LS9w")
print("   VAPID_PRIVATE_KEY=<ta clé privée>")
print("   VAPID_EMAIL=mailto:contact@voltride.com")
print("3. Redéployer l'API")
