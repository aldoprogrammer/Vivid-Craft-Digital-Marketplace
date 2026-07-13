import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
