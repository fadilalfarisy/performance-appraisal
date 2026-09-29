import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService', () => {
    let service: DepartmentsService;
    let repository: {
        findAllWithCount: jest.Mock;
        findById: jest.Mock;
        createAndSave: jest.Mock;
        updateAndSave: jest.Mock;
        isLinkedToEmployees: jest.Mock;
        delete: jest.Mock;
    };

    beforeEach(() => {
        repository = {
            findAllWithCount: jest.fn(),
            findById: jest.fn(),
            createAndSave: jest.fn(),
            updateAndSave: jest.fn(),
            isLinkedToEmployees: jest.fn(),
            delete: jest.fn(),
        };

        service = new DepartmentsService(repository as any);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('findAll should return paginated departments', async () => {
        const query = { page: 1, limit: 10, search: 'eng' } as any;
        const departments = [
            {
                id: 'dep-1',
                name: 'Engineering',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-02T00:00:00.000Z',
            },
        ];

        repository.findAllWithCount.mockResolvedValue([departments, 1]);

        const result = await service.findAll(query);

        expect(repository.findAllWithCount).toHaveBeenCalledWith(query);
        expect(result).toEqual({
            message: 'Departments retrieved successfully',
            status: 200,
            success: true,
            data: [
                {
                    id: 'dep-1',
                    name: 'Engineering',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-02T00:00:00.000Z',
                },
            ],
            meta: {
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            },
        });
    });

    it('findOne should return department when exists', async () => {
        const department = {
            id: 'dep-1',
            name: 'Engineering',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
        };

        repository.findById.mockResolvedValue(department);

        const result = await service.findOne('dep-1');

        expect(repository.findById).toHaveBeenCalledWith('dep-1');
        expect(result).toEqual({
            message: 'Department retrieved successfully',
            status: 200,
            success: true,
            data: {
                id: 'dep-1',
                name: 'Engineering',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-02T00:00:00.000Z',
            },
        });
    });

    it('findOne should throw NotFoundException when department does not exist', async () => {
        repository.findById.mockResolvedValue(null);

        await expect(service.findOne('missing-id')).rejects.toThrow(
            NotFoundException,
        );
    });

    it('create should save and return the created department', async () => {
        const dto = { name: 'Engineering' };
        const created = {
            id: 'dep-1',
            name: 'Engineering',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        };

        repository.createAndSave.mockResolvedValue(created);

        const result = await service.create(dto);

        expect(repository.createAndSave).toHaveBeenCalledWith(dto);
        expect(result).toEqual({
            message: 'Department created successfully',
            status: 201,
            success: true,
            data: {
                id: 'dep-1',
                name: 'Engineering',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            },
        });
    });

    it('update should return updated department when found', async () => {
        const dto = { name: 'HR' };
        const existing = {
            id: 'dep-1',
            name: 'Engineering',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
        };
        const updated = {
            id: 'dep-1',
            name: 'HR',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-03T00:00:00.000Z',
        };

        repository.findById.mockResolvedValue(existing);
        repository.updateAndSave.mockResolvedValue(updated);

        const result = await service.update('dep-1', dto);

        expect(repository.findById).toHaveBeenCalledWith('dep-1');
        expect(repository.updateAndSave).toHaveBeenCalledWith('dep-1', dto);
        expect(result).toEqual({
            data: {
                id: 'dep-1',
                name: 'HR',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-03T00:00:00.000Z',
            },
        });
    });

    it('update should throw NotFoundException when department does not exist', async () => {
        repository.findById.mockResolvedValue(null);

        await expect(service.update('missing-id', { name: 'HR' })).rejects.toThrow(
            NotFoundException,
        );
    });

    it('remove should throw BadRequestException when department is linked to employees', async () => {
        const department = {
            id: 'dep-1',
            name: 'Engineering',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
        };

        repository.findById.mockResolvedValue(department);
        repository.isLinkedToEmployees.mockResolvedValue(true);

        await expect(service.remove('dep-1')).rejects.toThrow(BadRequestException);
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('remove should delete department when not linked', async () => {
        const department = {
            id: 'dep-1',
            name: 'Engineering',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
        };

        repository.findById.mockResolvedValue(department);
        repository.isLinkedToEmployees.mockResolvedValue(false);
        repository.delete.mockResolvedValue(department);

        await expect(service.remove('dep-1')).resolves.toBeUndefined();
        expect(repository.delete).toHaveBeenCalledWith('dep-1');
    });
});
