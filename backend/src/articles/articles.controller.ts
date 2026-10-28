import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { ArticleCategory, PublicationStatus, Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PublishArticleDto } from './dto/publish-article.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';

/** Images acceptées : JPEG, PNG et WebP, 5 Mo au plus (cahier des charges, section 9). */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Type déterminé sur le contenu du fichier, pas sur son extension. */
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const BUREAU_OR_ADMIN: Role[] = [
  Role.ADMIN,
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

/** Interception commune aux routes de dépôt d'image. */
const interceptImage = FileInterceptor('file', {
  storage: multer.memoryStorage ? multer.memoryStorage() : undefined,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(new Error('Formats acceptés : JPEG, PNG ou WebP.'), false);
      return;
    }
    cb(null, true);
  },
});

@Controller('articles')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard)
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  findAll(
    @Query('q') q?: string,
    @Query('statut') statut?: PublicationStatus,
    @Query('categorie') categorie?: ArticleCategory,
  ) {
    return this.articles.findAll({ q, statut, categorie });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  findOne(@Param('id') id: string) {
    return this.articles.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  create(
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!dto.title?.trim()) throw new BadRequestException('Le titre est obligatoire.');
    return this.articles.create(
      {
        title: dto.title,
        excerpt: dto.excerpt,
        contentHtml: dto.contentHtml,
        category: dto.category,
        authorName: dto.authorName,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
      user.id,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(id, dto);
  }

  /** Image de couverture de l'article. */
  @Post(':id/couverture')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  @UseInterceptors(interceptImage)
  async setCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('alt') alt: string | undefined,
  ) {
    await this.articles.findOne(id);
    const url = await this.rangerImage(file, id);
    return this.articles.setCover(id, { url, alt });
  }

  @Delete(':id/couverture')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  async removeCover(@Param('id') id: string) {
    await this.articles.findOne(id);
    return this.articles.setCover(id, null);
  }

  /**
   * Image déposée depuis l'éditeur, à insérer dans le corps de l'article.
   * Renvoie seulement son adresse : c'est l'éditeur qui place la balise.
   */
  @Post(':id/images')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  @UseInterceptors(interceptImage)
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.articles.findOne(id);
    return { url: await this.rangerImage(file, id) };
  }

  /** Publier, programmer, retirer ou archiver sur le site public. */
  @Patch(':id/publication')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  setPublication(
    @Param('id') id: string,
    @Body() dto: PublishArticleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.articles.setPublication(id, dto.status, dto.publishedAt, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  remove(@Param('id') id: string) {
    return this.articles.remove(id);
  }

  // ———————————————————————————————————————————————

  /**
   * Contrôle puis rangement de l'image : Supabase Storage s'il est configuré,
   * sinon le dossier uploads/ du serveur, comme pour les photos d'album.
   */
  private async rangerImage(
    file: Express.Multer.File | undefined,
    articleId: string,
  ): Promise<string> {
    if (!file) throw new BadRequestException('Aucun fichier envoyé');
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image trop lourde : 5 Mo au maximum.');
    }
    const sniffed = sniffImageType(file.buffer);
    if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) {
      throw new BadRequestException(
        'Formats acceptés : JPEG, PNG ou WebP. Le contenu de ce fichier ne correspond pas à son extension.',
      );
    }

    if (this.supabase.isConfigured()) {
      return this.supabase.uploadArticleImage(file.buffer, sniffed, articleId);
    }
    const dir = join(process.cwd(), 'uploads', 'articles', articleId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ext = sniffed.split('/')[1].replace('jpeg', 'jpg');
    const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
    writeFileSync(join(dir, name), file.buffer);
    return `/uploads/articles/${articleId}/${name}`;
  }
}
