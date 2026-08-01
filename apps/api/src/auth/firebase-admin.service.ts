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
import { parseFirebaseServiceAccountJson } from './firebase-service-account.util';

export type VerifiedFirebaseUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;
  private lastInitError: string | null = null;

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
      if (serviceAccountJson?.trim()) {
        const parsed = parseFirebaseServiceAccountJson(
          serviceAccountJson,
        ) as ServiceAccount;
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

      this.lastInitError =
        'Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY';
      this.logger.warn(
        'Firebase Admin not configured — only legacy JWT auth is available',
      );
    } catch (err) {
      this.lastInitError =
        err instanceof Error ? err.message : 'Firebase Admin init failed';
      this.logger.error(
        'Failed to initialize Firebase Admin',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  get enabled(): boolean {
    return this.app != null;
  }

  get initError(): string | null {
    return this.enabled ? null : this.lastInitError;
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
