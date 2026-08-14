import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsPhoneNumber('IN')
  phone: string;
}

export class VerifyOtpDto {
  @IsPhoneNumber('IN')
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
