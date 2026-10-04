import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Edit, ToggleLeft, ToggleRight, Loader2, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { handleApiError } from '../../api/client';
import { formatDate } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';
import { Role, User as UserType } from '../../types';
import clsx from 'clsx';

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGEMENT: 'bg-purple-100 text-purple-700',
  SALES: 'bg-blue-100 text-blue-700',
  APPROVER: 'bg-amber-100 text-amber-700',
};

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['ADMIN', 'MANAGEMENT', 'SALES', 'APPROVER']),
  employeeCode: z.string().optional(),
  phone: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN', 'MANAGEMENT', 'SALES', 'APPROVER']),
  employeeCode: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<UserType | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search: debouncedSearch, page }],
    queryFn: () => usersApi.getAll({ search: debouncedSearch, page, limit: 20 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => usersApi.create(d),
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      setModal(null);
      createForm.reset();
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      setModal(null);
    },
    onError: handleApiError,
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'SALES' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = (user: UserType) => {
    setEditTarget(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode || '',
      phone: user.phone || '',
      isActive: user.isActive,
    });
    setModal('edit');
  };

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..."
            className="input pl-9"
          />
        </div>
        <button onClick={() => setModal('create')} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : users.length === 0 ? (
          <EmptyState
            icon={User}
            title="No users found"
            description="Add a new user to get started"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Employee Code</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                            {user.name[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">{user.email}</td>
                      <td>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[user.role])}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-gray-500">{user.employeeCode || '—'}</span>
                      </td>
                      <td className="text-sm text-gray-600">{user.phone || '—'}</td>
                      <td>
                        <span className={clsx(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        )}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-xs text-gray-400">{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="btn-ghost btn-sm p-1.5"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateMutation.mutate({
                              id: user.id,
                              data: { ...user, isActive: !user.isActive },
                            })}
                            className="btn-ghost btn-sm p-1.5"
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive
                              ? <ToggleRight className="h-4 w-4 text-green-600" />
                              : <ToggleLeft className="h-4 w-4 text-gray-400" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Create New User" size="md">
        <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input {...createForm.register('name')} className={`input ${createForm.formState.errors.name ? 'input-error' : ''}`} />
              {createForm.formState.errors.name && <p className="error-text">{createForm.formState.errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Email *</label>
              <input {...createForm.register('email')} type="email" className={`input ${createForm.formState.errors.email ? 'input-error' : ''}`} />
              {createForm.formState.errors.email && <p className="error-text">{createForm.formState.errors.email.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Password *</label>
              <input {...createForm.register('password')} type="password" className={`input ${createForm.formState.errors.password ? 'input-error' : ''}`} />
              {createForm.formState.errors.password && <p className="error-text">{createForm.formState.errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Role *</label>
              <select {...createForm.register('role')} className="input">
                <option value="SALES">Sales</option>
                <option value="MANAGEMENT">Management</option>
                <option value="APPROVER">Approver</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Employee Code</label>
              <input {...createForm.register('employeeCode')} className="input" placeholder="EMP-001" />
            </div>
            <div className="col-span-2">
              <label className="label">Phone</label>
              <input {...createForm.register('phone')} className="input" placeholder="+91 98765 00000" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={modal === 'edit'} onClose={() => setModal(null)} title={`Edit User: ${editTarget?.name}`} size="md">
        <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editTarget!.id, data: d }))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input {...editForm.register('name')} className={`input ${editForm.formState.errors.name ? 'input-error' : ''}`} />
            </div>
            <div className="col-span-2">
              <label className="label">Email *</label>
              <input {...editForm.register('email')} type="email" className="input" />
            </div>
            <div>
              <label className="label">Role *</label>
              <select {...editForm.register('role')} className="input">
                <option value="SALES">Sales</option>
                <option value="MANAGEMENT">Management</option>
                <option value="APPROVER">Approver</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Employee Code</label>
              <input {...editForm.register('employeeCode')} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...editForm.register('phone')} className="input" />
            </div>
            <div className="flex items-center gap-3">
              <label className="label mb-0">Active</label>
              <input type="checkbox" {...editForm.register('isActive')} className="h-4 w-4 rounded text-brand-600" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
