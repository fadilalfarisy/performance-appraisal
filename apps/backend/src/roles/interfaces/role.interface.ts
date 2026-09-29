import { PermissionPayload } from '../../permissions/interface/permission.interface';

export interface RolePayload {
  id: string;
  name: string;
  description: string;
  permissions: PermissionPayload[];
}
