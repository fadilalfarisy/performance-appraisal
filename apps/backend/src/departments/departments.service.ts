import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { DepartmentPayload } from './interfaces/department.interface';

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  async findAll(
    query: DepartmentQueryDto,
  ): Promise<ApiResponse<DepartmentPayload[]>> {
    const [departments, total] =
      await this.departmentsRepository.findAllWithCount(query);
    return paginated(
      departments.map((d) => this.toPayload(d)),
      { total, limit: query.limit, page: query.page },
    );
  }

  async findOne(id: string): Promise<ApiResponse<DepartmentPayload>> {
    const department = await this.findOneOrFail(id);
    return ok(this.toPayload(department));
  }

  async create(
    dto: CreateDepartmentDto,
  ): Promise<ApiResponse<DepartmentPayload>> {
    const result = await this.departmentsRepository.createAndSave(dto);
    return ok(this.toPayload(result));
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<ApiResponse<DepartmentPayload>> {
    await this.findOneOrFail(id);
    const result = await this.departmentsRepository.updateAndSave(id, dto);
    return ok(this.toPayload(result));
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id);

    const isLinked = await this.departmentsRepository.isLinkedToEmployees(id);
    if (isLinked) {
      throw new BadRequestException(
        'Cannot delete department linked to employees',
      );
    }

    await this.departmentsRepository.delete(id);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<any> {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  private toPayload(department: any): DepartmentPayload {
    return {
      id: department.id,
      name: department.name,
      createdAt: new Date(department.createdAt).toISOString(),
      updatedAt: new Date(department.updatedAt).toISOString(),
    };
  }
}
