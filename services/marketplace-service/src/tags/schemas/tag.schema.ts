import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true, collection: 'tags' })
export class Tag {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ default: 0 })
  usageCount!: number;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
