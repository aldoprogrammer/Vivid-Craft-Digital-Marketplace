import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  role: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  website: true,
  twitter: true,
  instagram: true,
  discord: true,
  createdAt: true,
} as const;

const PRIVATE_PROFILE_SELECT = {
  ...PUBLIC_PROFILE_SELECT,
  email: true,
  isActive: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly imageProcessorUrl: string;

  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.imageProcessorUrl = configService.get<string>(
      'IMAGE_PROCESSOR_URL',
      'http://image-processor:5000',
    );
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PRIVATE_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: PUBLIC_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.website !== undefined && { website: dto.website || null }),
        ...(dto.twitter !== undefined && { twitter: dto.twitter || null }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram || null }),
        ...(dto.discord !== undefined && { discord: dto.discord || null }),
      },
      select: PRIVATE_PROFILE_SELECT,
    });

    return user;
  }

  async uploadImage(
    userId: string,
    imageBuffer: Buffer,
    kind: 'avatar' | 'banner',
  ) {
    const prefix = `user_${userId}_${kind}`;
    const response = await fetch(`${this.imageProcessorUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Upload-Prefix': prefix,
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      throw new Error(`Image processor failed: ${response.status}`);
    }

    const data = (await response.json()) as { publicUrl?: string; filename?: string };
    const publicUrl = data.publicUrl ?? `/api/images/files/${data.filename}`;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: kind === 'avatar' ? { avatarUrl: publicUrl } : { bannerUrl: publicUrl },
      select: PRIVATE_PROFILE_SELECT,
    });

    return user;
  }

  async findByRole(role: Role) {
    return this.prisma.user.findMany({
      where: { role, isActive: true },
      select: PUBLIC_PROFILE_SELECT,
    });
  }

  async findAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        bio: true,
      },
    });
  }
}
