import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET_AVATARS = 'avatars';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private bucket = BUCKET_AVATARS;

  constructor() {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (url && key) {
      this.client = createClient(url, key);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Upload un avatar et retourne l'URL publique.
   * Chemin: avatars/{userId}/{timestamp}-{random}.{ext}
   */
  async uploadAvatar(
    buffer: Buffer,
    mimetype: string,
    userId: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Supabase non configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    }
    const ext = mimetype.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
    const path = `${userId}/${filename}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload Supabase: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
