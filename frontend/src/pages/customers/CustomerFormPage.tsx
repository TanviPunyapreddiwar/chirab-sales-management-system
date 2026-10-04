import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { customersApi } from '../../api/customers.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { handleApiError } from '../../api/client';

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  industry: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!).then((r) => r.data.data),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'India' },
  });

  useEffect(() => {
    if (customerData) {
      reset({
        companyName: customerData.companyName,
        contactPerson: customerData.contactPerson || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        city: customerData.city || '',
        state: customerData.state || '',
        country: customerData.country || 'India',
        industry: customerData.industry || '',
        gstNumber: customerData.gstNumber || '',
        notes: customerData.notes || '',
      });
    }
  }, [customerData, reset]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => customersApi.create(data),
    onSuccess: (res) => {
      toast.success('Customer created successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customers/${res.data.data!.id}`);
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => customersApi.update(id!, data),
    onSuccess: () => {
      toast.success('Customer updated successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      navigate(`/customers/${id}`);
    },
    onError: handleApiError,
  });

  const onSubmit = (data: FormData) => {
    if (isEdit) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  if (isEdit && isLoading) return <PageLoader />;

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1>{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <div className="card">
          <div className="card-header">
            <h3>Company Information</h3>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Company Name *</label>
              <input {...register('companyName')} className={`input ${errors.companyName ? 'input-error' : ''}`} />
              {errors.companyName && <p className="error-text">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="label">Industry</label>
              <input {...register('industry')} className="input" placeholder="e.g. Automotive, Chemical" />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input {...register('gstNumber')} className="input" placeholder="27AAAAA0000A1Z5" />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <div className="card-header">
            <h3>Contact Information</h3>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input {...register('contactPerson')} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" placeholder="+91 98765 00000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Email</label>
              <input {...register('email')} type="email" className={`input ${errors.email ? 'input-error' : ''}`} />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <div className="card-header">
            <h3>Address</h3>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Street Address</label>
              <input {...register('address')} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <input {...register('country')} className="input" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header"><h3>Notes</h3></div>
          <div className="card-body">
            <textarea {...register('notes')} rows={3} className="input" placeholder="Any additional notes..." />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
