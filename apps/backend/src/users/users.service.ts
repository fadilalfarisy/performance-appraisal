import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserPayload } from './interfaces/user.interface';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UsersRepository) {}

  async create(user: CreateUserDto): Promise<UserPayload> {
    const result = await this.userRepository.createAndSave(user);
    return this.toResponse(result);
  }

  async findAll(): Promise<UserPayload[]> {
    const results = await this.userRepository.findAllWithRelations();
    return results.map((r) => this.toResponse(r));
  }

  async findOne(id: string): Promise<UserPayload> {
    const result = await this.userRepository.findOneWithRelations(id);
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toResponse(result);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserPayload> {
    const existUser = await this.userRepository.findOneWithRelations(id);
    if (!existUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updates: Partial<UpdateUserDto> = { ...updateUserDto };

    if (updateUserDto.password !== undefined) {
      const salt = await bcrypt.genSalt();
      updates.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userRepository.updateAndSave(id, updates);

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const result = await this.userRepository.findOneWithRelations(
      updatedUser.id,
    );

    return this.toResponse(result);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  private toResponse(user: any): UserPayload {
    return {
      id: user.id,
      username: user.username,
      employee: user.employee
        ? {
            id: user.employee.id,
            fullName: user.employee.fullName,
          }
        : null,
      role: user.role ?? null,
    };
  }
}
