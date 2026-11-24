import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  Wrench,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  AlertCircle,
  Clock,
  History,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../api/client';

export const CustomersPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [formError, setFormError] = useState('');

  // 1. Fetch Customers
  const { data: customersData, isLoading, isError } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get('/customers/', {
        params: { search: searchTerm },
      });
      return res.data?.results || res.data || [];
    },
  });

  // 2. Fetch Selected Customer Full History
  const { data: customerHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['customer-history', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await apiClient.get(`/customers/${selectedCustomerId}/full_history/`);
      return res.data;
    },
    enabled: !!selectedCustomerId,
  });

  // 3. React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const openCreateModal = () => {
    setEditingCustomer(null);
    reset({ name: '', phone: '', email: '', address: '', notes: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setValue('name', c.name);
    setValue('phone', c.phone);
    setValue('email', c.email || '');
    setValue('address', c.address || '');
    setValue('notes', c.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // 4. Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCustomer) {
        return await apiClient.put(`/customers/${editingCustomer.id}/`, payload);
      } else {
        return await apiClient.post('/customers/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setIsModalOpen(false);
      reset();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.phone?.[0] ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        'Failed to save customer.';
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/customers/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      if (selectedCustomerId) setSelectedCustomerId(null);
    },
  });

  const onSubmit = (formData) => {
    setFormError('');
    saveMutation.mutate(formData);
  };

  const customers = customersData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer CRM</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your repair shop clients, contact details, and device histories
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition"
          />
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium text-slate-600 self-end md:self-center">
          <span>Total Customers: <strong className="text-slate-900">{customers.length}</strong></span>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-center">Devices</th>
                <th className="py-3 px-4 text-center">Repairs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading customers from PostgreSQL...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customers found. Click <strong>New Customer</strong> to register one!
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-blue-600 hover:underline">{c.name}</div>
                      {c.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.address ? (
                        <div className="flex items-center space-x-1 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {c.device_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.repair_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete customer ${c.name}?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          title="Delete Customer"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {customerHistory?.customer?.name?.[0] || 'C'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{customerHistory?.customer?.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{customerHistory?.customer?.phone}</span>
                    {customerHistory?.customer?.email && <span>• {customerHistory?.customer?.email}</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Registered Devices */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  Registered Devices ({customerHistory?.devices?.length || 0})
                </h4>
                {customerHistory?.devices?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No devices registered for this customer yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerHistory?.devices?.map((d) => (
                      <div key={d.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                        <div className="font-semibold text-slate-900">{d.brand} {d.model_name}</div>
                        <div className="text-[11px] text-slate-500">Category: {d.category_name || 'General'}</div>
                        {d.serial_number && <div className="text-[10px] text-slate-400 font-mono">SN: {d.serial_number}</div>}
                        {d.imei && <div className="text-[10px] text-slate-400 font-mono">IMEI: {d.imei}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repair History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  Repair Tickets ({customerHistory?.repairs?.length || 0})
                </h4>
                {customerHistory?.repairs?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No repair tickets on record.</p>
                ) : (
                  <div className="space-y-2.5">
                    {customerHistory?.repairs?.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-200 transition bg-white text-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-blue-600">{r.ticket_number}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {r.status}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium mt-1">{r.device_info}</p>
                          <p className="text-slate-500 text-[11px]">{r.reported_problem}</p>
                        </div>
                        <div className="text-right">
                          <a
                            href={`/track/${r.tracking_token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 gap-1"
                          >
                            Track <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Register New Customer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Customer name is required' })}
                  placeholder="e.g. Johnathan Davis"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
                {errors.name && <p className="mt-1 text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number * (Primary ID)
                </label>
                <input
                  type="text"
                  {...register('phone', { required: 'Phone number is required' })}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
                {errors.phone && <p className="mt-1 text-red-600">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Address
                </label>
                <textarea
                  rows={2}
                  {...register('address')}
                  placeholder="Street address, city, zip..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  {...register('notes')}
                  placeholder="e.g. Preferred contact method, corporate account..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
