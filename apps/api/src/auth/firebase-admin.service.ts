import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export type VerifiedFirebaseUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.app) return;

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKeyRaw = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    const serviceAccountJson = this.config.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );

    try {
      if (serviceAccountJson) {
        const parsed = JSON.parse(serviceAccountJson) as ServiceAccount;
        this.app =
          getApps().length > 0
            ? getApps()[0]!
            : initializeApp({ credential: cert(parsed) });
        this.logger.log('Firebase Admin initialized (service account JSON)');
        return;
      }

      if (projectId && clientEmail && privateKeyRaw) {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        this.app =
          getApps().length > 0
            ? getApps()[0]!
            : initializeApp({
                credential: cert({
                  projectId,
                  clientEmail,
                  privateKey,
                }),
              });
        this.logger.log('Firebase Admin initialized');
        return;
      }

      this.logger.warn(
        'Firebase Admin not configured — only legacy JWT auth is available',
      );
    } catch (err) {
      this.logger.error(
        'Failed to initialize Firebase Admin',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  get enabled(): boolean {
    return this.app != null;
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
    if (!this.app) {
      throw new Error('Firebase Admin is not configured');
    }
    const decoded = await getAuth(this.app).verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
  }
}
