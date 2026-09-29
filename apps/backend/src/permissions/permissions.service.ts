import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionPayload } from './interface/permission.interface';
import { PermissionsRepository } from './permissions.repository';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionRepository: PermissionsRepository) {}

  async findAll(): Promise<PermissionPayload[]> {
    const permissions = await this.permissionRepository.findAll();
    return permissions.map((permission) => this.toResponse(permission));
  }

  async findOne(id: string): Promise<PermissionPayload> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return this.toResponse(permission);
  }

  async create(createDto: CreatePermissionDto) {
    const permission = await this.permissionRepository.createAndSave(createDto);
    return this.toResponse(permission);
  }

  async update(id: string, updateDto: UpdatePermissionDto) {
    const permission = await this.permissionRepository.updateAndSave(
      id,
      updateDto,
    );
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return this.toResponse(permission);
  }

  async delete(id: string) {
    const permission = await this.permissionRepository.delete(id);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return this.toResponse(permission);
  }

  private toResponse(permission: any): PermissionPayload {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
    };
  }
}
