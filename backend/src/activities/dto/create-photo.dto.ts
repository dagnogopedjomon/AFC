import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePhotoDto {
  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  activityId?: string;
}
