import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MailAttachmentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(255)
  contentType!: string;

  @IsString()
  contentBase64!: string;
}

export class SubmitMessageDto {
  @IsString()
  @MaxLength(200)
  idempotencyKey!: string;

  @IsEmail()
  from!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to!: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @IsString()
  @MaxLength(998)
  subject!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MailAttachmentDto)
  attachments?: MailAttachmentDto[];
}

