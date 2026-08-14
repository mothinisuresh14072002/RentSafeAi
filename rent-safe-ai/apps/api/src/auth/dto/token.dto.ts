import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  familyId: string;
}
