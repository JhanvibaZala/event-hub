import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user and generates a verification OTP.
   * Email-less: Returns the OTP directly in the response payload for frontend verification.
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: dto.role || 'USER',
      isVerified: false,
    });

    const otpRecord = await this.otpService.generateOtp(
      user.email,
      'REGISTER',
      user.id,
    );

    return {
      message:
        'Registration successful! Please verify your account using the OTP below.',
      email: user.email,
      otp: otpRecord.code,
      expiresInSeconds: 300,
    };
  }

  /**
   * Verifies the 6-digit OTP code.
   * If verifying registration, activates user and issues single JWT Access Token.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    await this.otpService.verifyOtp(dto.email, dto.otp, dto.type);

    if (dto.type === 'REGISTER') {
      await this.usersService.markVerified(user.id);
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.role);

    return {
      message: 'Account verified successfully!',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: true,
      },
    };
  }

  /**
   * Authenticates user credentials and issues a JWT Access Token.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      // Regenerate OTP for convenience so user can verify immediately
      const otpRecord = await this.otpService.generateOtp(
        user.email,
        'REGISTER',
        user.id,
      );
      throw new BadRequestException({
        message:
          'Account is not verified yet. A new verification OTP has been generated for you.',
        email: user.email,
        otp: otpRecord.code,
        requiresVerification: true,
      });
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.role);

    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Requests a password reset OTP.
   * Email-less: Returns the OTP directly in response payload.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    const otpRecord = await this.otpService.generateOtp(
      user.email,
      'RESET_PASSWORD',
      user.id,
    );

    return {
      message:
        'Password reset OTP generated. Enter this OTP on the frontend to reset your password.',
      email: user.email,
      otp: otpRecord.code,
      expiresInSeconds: 300,
    };
  }

  /**
   * Resets password using verified OTP code.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    await this.otpService.verifyOtp(dto.email, dto.otp, 'RESET_PASSWORD');

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, newHashedPassword);

    return {
      message:
        'Password reset successful. You can now login with your new password.',
    };
  }

  private generateAccessToken(
    userId: string,
    email: string,
    role: 'USER' | 'ADMIN',
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }
}
