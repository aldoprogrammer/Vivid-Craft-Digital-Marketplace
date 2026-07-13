import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductType {
  COMIC = 'COMIC',
  ART = 'ART',
  ASSET = 'ASSET',
}

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, enum: ProductType })
  type!: ProductType;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  creatorId!: string;

  @Prop({ required: true })
  creatorName!: string;

  @Prop({ type: [String], default: [] })
  categories!: string[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop()
  previewImageUrl?: string;

  @Prop()
  watermarkedImagePath?: string;

  @Prop({ default: true })
  isPublished!: boolean;

  @Prop({ default: 0 })
  downloadCount!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ title: 'text', description: 'text' });
ProductSchema.index({ categories: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ creatorId: 1 });
