import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    const scope = withPassword ? 'withPassword' : 'defaultScope';
    return this.userModel.scope(scope).findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    return this.userModel.create({
      ...userData,
      email: userData.email?.toLowerCase().trim(),
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    await user.update(dto);
    return user;
  }

  async markVerified(id: string): Promise<void> {
    await this.userModel.update({ isVerified: true }, { where: { id } });
  }

  async updatePassword(id: string, newHashedPassword: string): Promise<void> {
    await this.userModel.update(
      { password: newHashedPassword },
      { where: { id } },
    );
  }
}
