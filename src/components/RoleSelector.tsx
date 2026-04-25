import React from 'react';
import { UserRole } from '../lib/firebase';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleChange }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Role</label>
      <div className="flex space-x-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="user"
            checked={selectedRole === 'user'}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
          />
          <span className="ml-2 text-sm text-gray-700">User</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="admin"
            checked={selectedRole === 'admin'}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
          />
          <span className="ml-2 text-sm text-gray-700">Admin</span>
        </label>
      </div>
      <p className="text-xs text-gray-500">
        {selectedRole === 'admin' 
          ? 'Admin users have access to all features and can manage system settings.'
          : 'Regular users can schedule notifications and manage their own content.'
        }
      </p>
    </div>
  );
};

export default RoleSelector;