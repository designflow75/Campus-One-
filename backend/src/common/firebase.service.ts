import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;
  private isSimulatorMode = true;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // 1. Check if firebase-service-account.json exists in the root backend directory
      const jsonKeyPath = path.resolve(process.cwd(), 'firebase-service-account.json');
      
      if (fs.existsSync(jsonKeyPath)) {
        this.logger.log(`Loading Firebase credentials from JSON key file at: ${jsonKeyPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(jsonKeyPath, 'utf8'));
        
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        this.isSimulatorMode = false;
        this.logger.log('Firebase Admin SDK initialized successfully via JSON key.');
        return;
      }

      // 2. Check if credentials exist in environment variables
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        this.logger.log('Loading Firebase credentials from Environment Variables...');
        // Private key might contain escaped newlines
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
        
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedPrivateKey,
          }),
        });

        this.isSimulatorMode = false;
        this.logger.log('Firebase Admin SDK initialized successfully via Env Variables.');
        return;
      }

      // 3. Fallback to Simulator Mode
      this.logger.warn(
        'No Firebase credentials found (missing firebase-service-account.json or environment keys). Running in SIMULATOR mode.',
      );
      this.isSimulatorMode = true;
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK. Falling back to SIMULATOR mode.', error.stack);
      this.isSimulatorMode = true;
    }
  }

  async sendNotification(token: string, title: string, body: string): Promise<boolean> {
    if (this.isSimulatorMode || !this.firebaseApp) {
      this.logger.log(`[SIMULATION] Sending FCM Notification to Device Token: "${token}"`);
      this.logger.log(`[SIMULATION] Title: "${title}" | Body: "${body}"`);
      return true;
    }

    try {
      this.logger.log(`Sending real FCM Notification to Device Token: "${token.substring(0, 12)}..."`);
      await admin.messaging().send({
        token,
        notification: {
          title,
          body,
        },
      });
      this.logger.log('FCM Notification sent successfully.');
      return true;
    } catch (error) {
      this.logger.error(`Failed to send FCM notification: ${error.message}`, error.stack);
      return false;
    }
  }
}
