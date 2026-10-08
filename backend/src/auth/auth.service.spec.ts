import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let otpService: Partial<Record<keyof OtpService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      markVerified: jest.fn(),
      updatePassword: jest.fn(),
    };

    otpService = {
      generateOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: OtpService, useValue: otpService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException if user email already exists', async () => {
      usersService.findByEmail!.mockResolvedValue({ id: 'u1', email: 'test@example.com' });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user, generate OTP, and return OTP directly in response (email-less)', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      usersService.create!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'USER',
        isVerified: false,
      });
      otpService.generateOtp!.mockResolvedValue({ code: '654321', expiresInSeconds: 300 });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
      });

      expect(usersService.create).toHaveBeenCalled();
      expect(otpService.generateOtp).toHaveBeenCalledWith('test@example.com', 'REGISTER', 'u1');
      expect(result).toHaveProperty('otp', '654321');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('expiresInSeconds', 300);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP, mark user as verified, and return access token', async () => {
      usersService.findByEmail!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'USER',
        isVerified: false,
      });
      otpService.verifyOtp!.mockResolvedValue(true);
      usersService.markVerified!.mockResolvedValue(true);

      const result = await authService.verifyOtp({
        email: 'test@example.com',
        otp: '654321',
        type: 'REGISTER',
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith('test@example.com', '654321', 'REGISTER');
      expect(usersService.markVerified).toHaveBeenCalledWith('u1');
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.isVerified).toBe(true);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      await expect(
        authService.verifyOtp({
          email: 'unknown@example.com',
          otp: '123456',
          type: 'REGISTER',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('login', () => {
    it('should login verified user and return access token', async () => {
      usersService.findByEmail!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        password: 'hashed_pw',
        role: 'USER',
        fullName: 'Test User',
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      usersService.findByEmail!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        password: 'hashed_pw',
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException with new OTP if user is not verified', async () => {
      usersService.findByEmail!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        password: 'hashed_pw',
        isVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      otpService.generateOtp!.mockResolvedValue({ code: '999888' });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword & resetPassword', () => {
    it('should generate reset OTP and return it directly', async () => {
      usersService.findByEmail!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
      });
      otpService.generateOtp!.mockResolvedValue({ code: '112233', expiresInSeconds: 300 });

      const result = await authService.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.otp).toBe('112233');
      expect(result.email).toBe('test@example.com');
    });

    it('should reset password with verified OTP', async () => {
      usersService.findByEmail!.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
      });
      otpService.verifyOtp!.mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_pw');
      usersService.updatePassword!.mockResolvedValue(true);

      const result = await authService.resetPassword({
        email: 'test@example.com',
        otp: '112233',
        newPassword: 'BrandNewPassword123!',
      });

      expect(usersService.updatePassword).toHaveBeenCalledWith('u1', 'new_hashed_pw');
      expect(result.message).toContain('Password reset successful');
    });
  });
});
