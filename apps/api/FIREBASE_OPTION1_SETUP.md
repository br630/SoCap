# Firebase Setup - Option 1: Service Account JSON

## Quick Setup Guide

### Step 1: Get Your Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Select **"Project settings"**
5. Go to the **"Service accounts"** tab
6. Click **"Generate new private key"**
7. A JSON file will download - **keep this secure!**

### Step 2: Add to Your .env File

Open your `.env` file in `apps/api/.env` and add:

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

### Step 3: Format the JSON String

You have two options for formatting:

#### Option A: Single Line (Easiest)
Copy the entire JSON from the downloaded file, remove all newlines, and wrap it in single quotes:

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"my-project",...}'
```

#### Option B: Escaped JSON String
If you want to keep it readable, escape the newlines and quotes:

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",\n"project_id":"my-project",\n...}'
```

### Step 4: Verify Setup

The Firebase Admin SDK will automatically:
- Parse the JSON string
- Initialize with the service account credentials
- Be ready to use in your application

## Example .env File

```bash
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"

# Firebase Admin SDK (Option 1: Service Account JSON)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"my-firebase-project","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@my-firebase-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40my-firebase-project.iam.gserviceaccount.com"}'
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your `.env` file to version control
- The service account JSON contains sensitive credentials
- Keep it secure and rotate keys regularly
- Use environment variables in production (not hardcoded values)

## Testing

After setting up, you can test the configuration:

```typescript
import { firebaseAdmin } from './config/firebase';

// If no error is thrown, Firebase is initialized correctly
console.log('Firebase Admin initialized:', firebaseAdmin.name);
```

## Troubleshooting

### Error: "Failed to parse FIREBASE_SERVICE_ACCOUNT JSON"
- Make sure the JSON is valid
- Check that all quotes are properly escaped
- Ensure the entire JSON is on one line (or properly escaped)

### Error: "Firebase Admin SDK initialization failed"
- Verify the JSON contains all required fields
- Check that `project_id`, `private_key`, and `client_email` are present
- Ensure the private key includes the `\n` newline characters (or they're escaped as `\\n`)

### Still having issues?
Try using Option 2 (Individual Environment Variables) instead - see `FIREBASE_SETUP.md` for details.
