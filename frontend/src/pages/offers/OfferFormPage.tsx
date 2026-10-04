import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Search, X, Plus, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { offersApi } from '../../api/offers.api';
import { usersApi } from '../../api/users.api';
import { customersApi } from '../../api/customers.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { handleApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Customer } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency } from '../../utils/format';

const schema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  salespersonId: z.string().uuid('Please select a salesperson'),
  contactPerson: z.string().optional(),
  customerRfqNumber: z.string().optional(),
  businessDivision: z.string().optional(),
  product: z.string().min(1, 'Product is required'),
  applicationDescription: z.string().optional(),
  currency: z.string().default('INR'),
  offerValue: z.coerce.number().min(0, 'Value cannot be negative'),
  validityDays: z.coerce.number().int().min(1).default(30),
  offerDate: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  source: z.string().optional(),
  commercialRemarks: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const DIVISIONS = ['Automation', 'Instrumentation', 'Process', 'Power', 'IT Solutions', 'Other'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'GBP'];
const SOURCES = ['Direct', 'Reference', 'Exhibition', 'Online', 'Repeat Order', 'Tender', 'Other'];

export function OfferFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  const { data: offerData, isLoading: offerLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersApi.getById(id!).then((r) => r.data.data!),
    enabled: isEdit,
  });

  const { data: salespeopleData } = useQuery({
    queryKey: ['salespeople'],
    queryFn: () => usersApi.getSalespeople().then((r) => r.data.data || []),
  });

  const { data: customerSearchData } = useQuery({
    queryKey: ['customer-search', debouncedCustomerSearch],
    queryFn: () => customersApi.getAll({ search: debouncedCustomerSearch, limit: 10 }).then((r) => r.data.data || []),
    enabled: debouncedCustomerSearch.length >= 1 || customerModalOpen,
  });

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'INR',
      validityDays: 30,
      offerDate: new Date().toISOString().split('T')[0],
      salespersonId: user?.role === 'SALES' ? user.id : '',
    },
  });

  // Pre-fill customer from URL param (coming from customer detail page)
  const prefilledCustomerId = searchParams.get('customerId');
  useEffect(() => {
    if (prefilledCustomerId && !isEdit) {
      customersApi.getById(prefilledCustomerId).then((r) => {
        if (r.data.data) {
          setSelectedCustomer(r.data.data);
          setValue('customerId', r.data.data.id);
        }
      }).catch(() => {});
    }
  }, [prefilledCustomerId, isEdit, setValue]);

  // Pre-fill form for edit mode
  useEffect(() => {
    if (offerData && isEdit) {
      setSelectedCustomer(offerData.customer as Customer);
      reset({
        customerId: offerData.customerId,
        salespersonId: offerData.salespersonId,
        contactPerson: offerData.contactPerson || '',
        customerRfqNumber: offerData.customerRfqNumber || '',
        businessDivision: offerData.businessDivision || '',
        product: offerData.product,
        applicationDescription: offerData.applicationDescription || '',
        currency: offerData.currency,
        offerValue: Number(offerData.offerValue),
        validityDays: offerData.validityDays,
        offerDate: offerData.offerDate?.split('T')[0],
        nextFollowUpDate: offerData.nextFollowUpDate?.split('T')[0] || '',
        source: offerData.source || '',
        commercialRemarks: offerData.commercialRemarks || '',
      });
    }
  }, [offerData, isEdit, reset]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => offersApi.create(data),
    onSuccess: (res) => {
      toast.success(`Offer ${res.data.data?.offerNumber} created`);
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      navigate(`/offers/${res.data.data?.id}`);
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => offersApi.update(id!, data),
    onSuccess: () => {
      toast.success('Offer updated');
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offer', id] });
      navigate(`/offers/${id}`);
    },
    onError: handleApiError,
  });

  const onSubmit = (data: FormData) => {
    if (isEdit) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  if (isEdit && offerLoading) return <PageLoader />;

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;
  const offerValue = watch('offerValue');
  const currency = watch('currency');

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1>{isEdit ? `Edit Offer: ${offerData?.offerNumber}` : 'New Offer'}</h1>
          {!isEdit && <p className="text-xs text-gray-500 mt-0.5">Offer number will be auto-generated by the system</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* === CUSTOMER SECTION === */}
        <div className="card">
          <div className="card-header">
            <h3>Customer</h3>
          </div>
          <div className="card-body space-y-3">
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">Customer *</label>
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{selectedCustomer.companyName}</p>
                        <p className="text-xs text-gray-500">
                          {selectedCustomer.customerCode}
                          {selectedCustomer.contactPerson && ` · ${selectedCustomer.contactPerson}`}
                          {selectedCustomer.city && ` · ${selectedCustomer.city}`}
                        </p>
                      </div>
                      {!isEdit && (
                        <button
                          type="button"
                          onClick={() => { setSelectedCustomer(null); field.onChange(''); }}
                          className="btn-ghost btn-sm p-1 text-gray-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCustomerModalOpen(true)}
                      className={`input text-left flex items-center justify-between ${errors.customerId ? 'input-error' : ''}`}
                    >
                      <span className="text-gray-400">Search and select customer...</span>
                      <Search className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                  {errors.customerId && <p className="error-text">{errors.customerId.message}</p>}
                </div>
              )}
            />
            {selectedCustomer && (
              <div>
                <label className="label">Contact Person</label>
                <input
                  {...register('contactPerson')}
                  defaultValue={selectedCustomer.contactPerson || ''}
                  className="input"
                  placeholder="Override contact person if different"
                />
              </div>
            )}
          </div>
        </div>

        {/* === OFFER INFORMATION === */}
        <div className="card">
          <div className="card-header"><h3>Offer Information</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer RFQ Number</label>
              <input {...register('customerRfqNumber')} className="input" placeholder="e.g. ABC/RFQ/2024/001" />
            </div>
            <div>
              <label className="label">Business Division</label>
              <select {...register('businessDivision')} className="input">
                <option value="">Select division</option>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Product / Solution *</label>
              <input
                {...register('product')}
                className={`input ${errors.product ? 'input-error' : ''}`}
                placeholder="e.g. Industrial Automation Controller AC-500"
              />
              {errors.product && <p className="error-text">{errors.product.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Application / Description</label>
              <textarea
                {...register('applicationDescription')}
                rows={3}
                className="input"
                placeholder="Describe the application and scope of supply..."
              />
            </div>
            <div>
              <label className="label">Source / Lead Origin</label>
              <select {...register('source')} className="input">
                <option value="">Select source</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Offer Date</label>
              <input type="date" {...register('offerDate')} className="input" />
            </div>
          </div>
        </div>

        {/* === COMMERCIAL === */}
        <div className="card">
          <div className="card-header"><h3>Commercial Information</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Currency</label>
              <select {...register('currency')} className="input">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Offer Value *</label>
              <input
                {...register('offerValue')}
                type="number"
                min="0"
                step="0.01"
                className={`input ${errors.offerValue ? 'input-error' : ''}`}
                placeholder="0.00"
              />
              {errors.offerValue && <p className="error-text">{errors.offerValue.message}</p>}
              {offerValue > 0 && <p className="text-xs text-gray-400 mt-1">{formatCurrency(offerValue, currency)}</p>}
            </div>
            <div>
              <label className="label">Validity (Days)</label>
              <input
                {...register('validityDays')}
                type="number"
                min="1"
                max="365"
                className="input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="label">Commercial Remarks</label>
              <textarea
                {...register('commercialRemarks')}
                rows={2}
                className="input"
                placeholder="e.g. Ex-works Pune, Freight extra, 30% advance with order..."
              />
            </div>
          </div>
        </div>

        {/* === SALESPERSON & FOLLOW-UP === */}
        <div className="card">
          <div className="card-header"><h3>Sales & Follow-up</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Salesperson *</label>
              <select
                {...register('salespersonId')}
                className={`input ${errors.salespersonId ? 'input-error' : ''}`}
                disabled={user?.role === 'SALES'}
              >
                <option value="">Select salesperson</option>
                {salespeopleData?.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name} ({sp.role})</option>
                ))}
              </select>
              {errors.salespersonId && <p className="error-text">{errors.salespersonId.message}</p>}
            </div>
            <div>
              <label className="label">Next Follow-up Date</label>
              <input type="date" {...register('nextFollowUpDate')} className="input" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="btn-primary px-8">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Offer' : 'Create Offer'}
          </button>
        </div>
      </form>

      {/* Customer Search Modal */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Select Customer"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                autoFocus
                placeholder="Search by company, contact, email..."
                className="input pl-9"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate('/customers/new')}
              className="btn-secondary shrink-0"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {!customerSearchData?.length && (
              <p className="text-sm text-gray-400 text-center py-8">
                {customerSearch ? 'No customers found' : 'Start typing to search customers...'}
              </p>
            )}
            {customerSearchData?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCustomer(c);
                  setValue('customerId', c.id, { shouldValidate: true });
                  setCustomerModalOpen(false);
                  setCustomerSearch('');
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-semibold text-gray-900">{c.companyName}</p>
                <p className="text-xs text-gray-500">
                  {c.customerCode}
                  {c.contactPerson && ` · ${c.contactPerson}`}
                  {c.city && ` · ${c.city}, ${c.state || c.country}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
