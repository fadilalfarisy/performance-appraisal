import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './roles.repository';
import { ApiResponse, ok } from '../common/utils/response.util';
import { RolePayload } from './interfaces/role.interface';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DB_CONNECTION } from '../db/db.module';
import { PermissionPayload } from '../permissions/interface/permission.interface';

@Injectable()
export class RolesService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly roleRepository: RolesRepository,
  ) { }

  async findAll(): Promise<ApiResponse<RolePayload[]>> {
    const result = await this.roleRepository.findAllWithRelations();
    return ok(result.map((r) => this.toResponse(r)));
  }

  async findOne(id: string): Promise<ApiResponse<RolePayload>> {
    const result = await this.roleRepository.findOneWithRelations(id);
    return ok(this.toResponse(result));
  }

  async create(createDto: CreateRoleDto): Promise<ApiResponse<RolePayload>> {
    const isExist = await this.roleRepository.findOneByName(createDto.name);
    if (isExist) {
      throw new BadRequestException(
        `Role with name ${createDto.name} already exists`,
      );
    }

    const createRoleAndAssignRole = await this.db.transaction(async (tx) => {
      // Create new role
      const savedRole = await this.roleRepository.createAndSave(createDto, tx);

      if (!savedRole) {
        throw new BadRequestException('Failed to create role');
      }

      // Assign new permissions to role
      const insertedPermissions = createDto.permissions.map((permission) => ({
        roleId: savedRole.id,
        permissionId: permission,
      }));
      await this.roleRepository.assignPermissions(insertedPermissions, tx);

      return savedRole;
    });

    const result = await this.roleRepository.findOne(
      createRoleAndAssignRole.id,
    );

    return ok(this.toResponse(result));
  }

  async update(
    id: string,
    updateDto: UpdateRoleDto,
  ): Promise<ApiResponse<RolePayload>> {
    await this.findOneOrFail(id);

    const updateRoleAndResetPermissions = await this.db.transaction(
      async (tx) => {
        // Update role
        const updatedRole = await this.roleRepository.updateAndSave(
          id,
          updateDto,
        );

        // Reset permissions role
        await this.roleRepository.deleteAllPermissionsByRoleId(id);

        // Assign new permissions
        if (updateDto.permissions) {
          const insertedPermissions = updateDto.permissions.map(
            (permission) => ({
              roleId: id,
              permissionId: permission,
            }),
          );
          await this.roleRepository.assignPermissions(insertedPermissions, tx);
        }

        return updatedRole;
      },
    );

    if (!updateRoleAndResetPermissions) {
      throw new BadRequestException('Failed to update role');
    }

    const result = await this.roleRepository.findOneWithRelations(
      updateRoleAndResetPermissions.id,
    );
    return ok(this.toResponse(result));
  }

  async remove(id: string) {
    await this.findOneOrFail(id);

    const isLinked = await this.roleRepository.isLinkedToUsers(id);
    if (isLinked) {
      throw new BadRequestException(`Role with ID ${id} is linked to users`);
    }

    const result = await this.roleRepository.delete(id);
    return ok(this.toResponse(result));
  }

  // Private helper methods

  private async findOneOrFail(id: string): Promise<any> {
    const result = await this.roleRepository.findOne(id);
    if (!result) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return result;
  }

  private toResponse(role: any): RolePayload {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions
        ? role.permissions.map((permission: PermissionPayload) => {
          return {
            id: permission.id,
            name: permission.name,
            description: permission.description,
          };
        })
        : [],
    };
  }
}
