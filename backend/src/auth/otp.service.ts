import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as crypto from 'crypto';
import { OtpCode, OtpType } from './models/otp-code.model';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(OtpCode)
    private readonly otpModel: typeof OtpCode,
  ) {}

  /**
   * Generates a 6-digit OTP, stores it in the database with 5-min TTL,
   * and returns the created OtpCode record.
   * Strictly email-less: The returned code is sent back directly in API responses for frontend display.
   */
  async generateOtp(
    email: string,
    type: OtpType,
    userId?: string,
  ): Promise<OtpCode> {
    const normalizedEmail = email.toLowerCase().trim();

    // Invalidate previous active OTPs for the same email and type
    await this.otpModel.update(
      { isUsed: true },
      {
        where: {
          email: normalizedEmail,
          type,
          isUsed: false,
        },
      },
    );

    // Cryptographically secure 6-digit numeric string
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otpRecord = await this.otpModel.create({
      userId,
      email: normalizedEmail,
      code,
      type,
      expiresAt,
      isUsed: false,
    });

    this.logger.log(
      `[EMAIL-LESS OTP] Generated ${type} OTP: ${code} for ${normalizedEmail} (Expires: ${expiresAt.toISOString()})`,
    );

    return otpRecord;
  }

  /**
   * Verifies an OTP code for an email and purpose type.
   * Marks it used upon success, throws semantic BadRequestException upon failure.
   */
  async verifyOtp(
    email: string,
    code: string,
    type: OtpType,
  ): Promise<OtpCode> {
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await this.otpModel.findOne({
      where: {
        email: normalizedEmail,
        type,
        isUsed: false,
      },
      order: [['created_at', 'DESC']],
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'Invalid or expired OTP. Please request a new verification code.',
      );
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await otpRecord.update({ isUsed: true });
      throw new BadRequestException(
        'OTP code has expired. Please request a new verification code.',
      );
    }

    if (otpRecord.code !== code.trim()) {
      throw new BadRequestException('Incorrect OTP code. Please try again.');
    }

    // Mark as consumed
    await otpRecord.update({ isUsed: true });

    return otpRecord;
  }
}
