import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new digital product listing' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(dto, user.sub, user.email);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all listings owned by the authenticated creator' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.productsService.findMine(user.sub);
  }

  @Get('favorites/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List product IDs favorited by the authenticated user' })
  findFavorites(@CurrentUser() user: JwtPayload) {
    return this.productsService.findFavoriteIds(user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all published products with optional filters' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('creator/:creatorId/listings')
  @ApiOperation({ summary: 'List published products by creator (public profile)' })
  findByCreator(@Param('creatorId') creatorId: string) {
    return this.productsService.findByCreator(creatorId);
  }

  @Get('favorites/user/:userId')
  @ApiOperation({ summary: 'List products favorited by a user (public profile)' })
  findUserFavorites(@Param('userId') userId: string) {
    return this.productsService.findFavoritesByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (cached)' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Favorite or unfavorite a digital product' })
  toggleFavorite(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.toggleFavorite(id, user.sub, user.email);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product listing' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.update(id, dto, user.sub, user.role === 'ADMIN');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product listing' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user.sub, user.role === 'ADMIN');
  }

  @Post(':id/watermark')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload preview image and apply VividCraft watermark via Flask processor' })
  async watermark(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required (field name: image)');
    }
    return this.productsService.watermarkPreview(id, file.buffer, user.sub, user.role === 'ADMIN');
  }

  @Post(':id/assets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('asset'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload digital asset file for purchase download' })
  async uploadAsset(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Asset file is required (field name: asset)');
    }
    return this.productsService.uploadAsset(
      id,
      file.buffer,
      file.originalname,
      file.mimetype,
      user.sub,
      user.role === 'ADMIN',
    );
  }
}
