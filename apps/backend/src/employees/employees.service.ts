import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponse, ok, paginated } from '../common/utils/response.util';
import { EmployeesRepository } from './employees.repository';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeePayload } from './interfaces/employee.interface';
import { CreateContractDto } from './dto/create-contract.dto';
import { ContractPayload } from './interfaces/contract.interface';
import { UpdateContractDto } from './dto/update-contract.dto';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { ContractsRepository } from './contracts.repository';
import { sql } from 'drizzle-orm';
import { QueryEmployeeDto } from './dto/query-employee.dto';

const SORT_COLUMNS: Record<string, string> = {
  nip: 'e.nip',
  fullName: 'e.full_name',
  department: 'd.name',
  position: 'p.name',
  status: 'e.status',
  contractStatus: 'c.status',
  createdAt: 'e.created_at',
};

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private employeesRepository: EmployeesRepository,
    private contractRepository: ContractsRepository,
  ) { }

  async findAllEmployees(query: QueryEmployeeDto): Promise<ApiResponse<any[]>> {
    const {
      page,
      limit,
      sortBy,
      orderBy,
      search,
      department,
      position,
      status,
      contractStatus,
    } = query;

    // Pagination, sort, and order
    const offset = (page - 1) * limit;

    const column = SORT_COLUMNS[sortBy];

    const direction = orderBy === 'asc' ? sql`ASC` : sql`DESC`;

    const orderClause = sql`${sql.raw(column ?? 'e.nip')} ${direction}`;

    // Filters
    const whereParts = [sql`1=1`];

    if (search) {
      whereParts.push(
        sql`(e.full_name ILIKE ${'%' + search + '%'} OR e.nip ILIKE ${'%' + search + '%'})`,
      );
    }
    if (department) {
      whereParts.push(sql`d.name = ${department}`);
    }
    if (position) {
      whereParts.push(sql`p.name = ${position}`);
    }
    if (status) {
      whereParts.push(sql`e.status = ${status}`);
    }
    if (contractStatus) {
      whereParts.push(sql`c.status = ${contractStatus}`);
    }

    const whereClause = sql.join(whereParts, sql` AND `);

    const [result, total] = await Promise.all([
      this.employeesRepository.findAllWithRelationAndQuery(
        whereClause,
        orderClause,
        limit,
        offset,
      ),

      this.employeesRepository.countEmployees(whereClause),
    ]);

    return paginated(result, { total, page, limit });
  }

  async findOneEmployee(id: string): Promise<ApiResponse<EmployeePayload>> {
    const employee = await this.findOneOrFailEmployee(id);
    return ok(this.toResponseEmployee(employee));
  }

  async createEmployee(
    dto: CreateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    const savedEmployee = await this.db.transaction(async (tx) => {
      // Created new employee
      const employee = await this.employeesRepository.createAndSave(dto, tx);

      if (!employee) {
        throw new BadRequestException('Failed to create employee');
      }

      // Inserted data contracts to new employee
      const formattedContracts = dto.contracts.map((contract) => {
        return {
          employeeId: employee.id,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status,
        };
      });

      await this.contractRepository.bulkcreateAndSave(formattedContracts, tx);

      return employee;
    });

    const result = await this.employeesRepository.findOneWithRelations(
      savedEmployee.id,
    );
    return ok(this.toResponseEmployee(result));
  }

  async updateEmployee(
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<ApiResponse<EmployeePayload>> {
    await this.findOneOrFailEmployee(id);
    const updated = await this.employeesRepository.updateAndSave(id, dto);

    if (!updated) {
      throw new NotFoundException(`Failed to update employee with ID ${id}`);
    }

    const result = await this.employeesRepository.findOneWithRelations(
      updated.id,
    );
    return ok(this.toResponseEmployee(result));
  }

  async removeEmployee(id: string): Promise<void> {
    await this.findOneOrFailEmployee(id);

    const isLinked = await this.employeesRepository.isLinkedToUsers(id);
    if (isLinked) {
      throw new BadRequestException('Cannot delete employee linked to users');
    }

    await this.employeesRepository.delete(id);
  }

  async findAllContractsByEmployeeId(
    employeeId: string,
  ): Promise<ApiResponse<ContractPayload[]>> {
    const contracts =
      await this.contractRepository.findByEmployeeId(employeeId);
    return ok(contracts.map((c) => this.toResponseContract(c)));
  }

  async findOneContract(id: string): Promise<ApiResponse<ContractPayload>> {
    const contract = await this.findOneOrFailContract(id);
    return ok(this.toResponseContract(contract));
  }

  async createContract(
    id: string,
    dto: CreateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    const formattedContract = {
      employeeId: id,
      ...dto,
    };

    const contract =
      await this.contractRepository.createAndSave(formattedContract);
    return ok(this.toResponseContract(contract));
  }

  async updateContract(
    employeeId: string,
    contractId: string,
    dto: UpdateContractDto,
  ): Promise<ApiResponse<ContractPayload>> {
    await this.findOneOrFailEmployee(employeeId);
    await this.findOneOrFailContract(contractId);

    const updated = await this.contractRepository.updateAndSave(contractId, {
      employeeId: employeeId,
      ...dto,
    });

    return ok(this.toResponseContract(updated));
  }

  async removeContract(id: string): Promise<void> {
    await this.findOneOrFailContract(id);
    await this.contractRepository.delete(id);
  }

  // Private helpers

  private async findOneOrFailEmployee(id: string): Promise<any> {
    const employee = await this.employeesRepository.findOneWithRelations(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  private async findOneOrFailContract(id: string): Promise<any> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }
    return contract;
  }

  private toResponseEmployee(employee: any): EmployeePayload {
    return {
      id: employee.id,
      nip: employee.nip,
      fullName: employee.fullName,
      birthDate: employee.birthDate,
      gender: employee.gender,
      manager: employee.manager
        ? {
          id: employee.manager.id,
          fullName: employee.manager.fullName,
        }
        : null,
      position: employee.position
        ? {
          id: employee.position.id,
          name: employee.position.name,
        }
        : null,
      department: employee.department
        ? {
          id: employee.department.id,
          name: employee.department.name,
        }
        : null,
      status: employee.status,
      address: employee.address,
      contract: employee.contract
        ? {
          id: employee.contract.id,
          startDate: employee.contract.startDate,
          endDate: employee.contract.endDate,
          status: employee.contract.status,
        }
        : null,
    };
  }

  private toResponseContract(contract: any): ContractPayload {
    return {
      id: contract.id,
      employeeId: contract.employeeId,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
    };
  }
}
