import { IsEmail, IsString, Length, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from '../models/otp-code.model';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({
    enum: ['REGISTER', 'RESET_PASSWORD'],
    example: 'REGISTER',
    description: 'Purpose of the OTP verification',
  })
  @IsIn(['REGISTER', 'RESET_PASSWORD'])
  type!: OtpType;
}
