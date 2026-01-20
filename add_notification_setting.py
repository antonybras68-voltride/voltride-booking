#!/usr/bin/env python3
schema_path = 'packages/database/prisma/schema.prisma'

with open(schema_path, 'r') as f:
    content = f.read()

notification_model = '''
// ============== NOTIFICATION SETTINGS ==============
model NotificationSetting {
  id               String   @id @default(cuid())
  notificationType String   @unique
  roleAdmin        Boolean  @default(true)
  roleManager      Boolean  @default(true)
  roleOperator     Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
'''

if 'model NotificationSetting' not in content:
    # Ajouter avant PushSubscription
    content = content.replace('// ============== PUSH NOTIFICATIONS ==============', notification_model + '\n// ============== PUSH NOTIFICATIONS ==============')
    with open(schema_path, 'w') as f:
        f.write(content)
    print("✅ Model NotificationSetting ajouté!")
else:
    print("⚠️ NotificationSetting existe déjà")
