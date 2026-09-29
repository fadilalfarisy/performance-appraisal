import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiResponse, ok } from '../common/utils/response.util';
import { CriteriaRepository } from './criteria.repository';
import { ChildCriteriaPayload } from './interfaces/child-criteria.interface';
import { ParentCriteriaPayload } from './interfaces/parent-criteria.interface';
import { CreateCriteriaDto } from './dto/create-criteria.dto';

@Injectable()
export class CriteriaService {
  constructor(private readonly criteriaRepository: CriteriaRepository) { }

  async findAll(): Promise<ApiResponse<ParentCriteriaPayload[]>> {
    const data = await this.criteriaRepository.findAllParentCriterias();
    const criteria = data.map((row) => this.toParentCriteriaResponse(row));
    return ok(criteria);
  }

  async findOne(id: string): Promise<ApiResponse<ChildCriteriaPayload[]>> {
    const criterion =
      await this.criteriaRepository.findChildCriteriasByParentId(id);
    if (!criterion) {
      throw new NotFoundException(`Critera with ID ${id} not found`);
    }
    return ok(criterion.map((row) => this.toChildCriteriaResponse(row)));
  }

  async create(
    createCriteriaDto: CreateCriteriaDto,
  ): Promise<ApiResponse<ChildCriteriaPayload>> {
    // Create parent criteria
    const parentCriteria =
      await this.criteriaRepository.createAndSaveParentCriteria({
        version: createCriteriaDto.version,
        description: createCriteriaDto.description,
      });

    if (!parentCriteria) {
      throw new NotFoundException(`Failed to create parent criteria`);
    }

    // Create a new version of the criteria
    const newVersion = await this.criteriaRepository.createAndSaveChildCriteria(
      parentCriteria.id,
      createCriteriaDto.criterias,
    );

    return ok(this.toChildCriteriaResponse(newVersion));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private toParentCriteriaResponse(criteria: any): ParentCriteriaPayload {
    return {
      id: criteria.id,
      major: criteria.major,
      minor: criteria.minor,
      patch: criteria.patch,
      description: criteria.description,
    };
  }

  private toChildCriteriaResponse(criteria: any): ChildCriteriaPayload {
    return {
      id: criteria.id,
      name: criteria.name,
      weight: criteria.weight,
      description: criteria.description,
      type: criteria.type,
      version: criteria.version,
    };
  }
}
