import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  Search,
  Plus,
  User,
  Hash,
  ShieldAlert,
  Camera,
  Trash2,
  Wrench,
  X,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../api/client';

export const DevicesPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // 1. Fetch Devices
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices', searchTerm, selectedCategory],
    queryFn: async () => {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      const res = await apiClient.get('/devices/', { params });
      return res.data?.results || res.data || [];
    },
  });

  // 2. Fetch Customers for registration dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/customers/');
      return res.data?.results || res.data || [];
    },
  });

  // 3. Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['device-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/devices/categories/');
      return res.data?.results || res.data || [];
    },
  });

  // 4. React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const openCreateModal = () => {
    reset();
    setFormError('');
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiClient.post('/devices/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['devices']);
      setIsModalOpen(false);
      reset();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to register device. Check inputs.';
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/devices/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['devices']);
    },
  });

  const onSubmit = (formData) => {
    setFormError('');
    createMutation.mutate(formData);
  };

  const devices = devicesData || [];
  const categories = categoriesData || [];
  const customers = customersData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Device Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered customer hardware, serial numbers, conditions, and active tickets
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Device</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search brand, model, IMEI, serial number..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition"
          />
        </div>
      </div>

      {/* Devices Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading device registry from PostgreSQL...
        </div>
      ) : devices.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No devices found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{d.brand} {d.model_name}</h3>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {d.category_name || 'Electronics'}
                      </span>
                    </div>
                  </div>

                  {d.active_repairs_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      In Repair
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{d.customer_name}</span>
                    <span className="text-slate-400">({d.customer_phone})</span>
                  </div>

                  {d.serial_number && (
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>SN: {d.serial_number}</span>
                    </div>
                  )}

                  {d.imei && (
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>IMEI: {d.imei}</span>
                    </div>
                  )}

                  {d.physical_condition && (
                    <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                      "{d.physical_condition}"
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={`/repairs?new=true&device_id=${d.id}&customer_id=${d.customer}`}
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Ticket
                </a>

                <button
                  onClick={() => {
                    if (window.confirm(`Delete device ${d.brand} ${d.model_name}?`)) {
                      deleteMutation.mutate(d.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                  title="Delete Device"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Register New Device</h3>
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
                  Device Owner (Customer) *
                </label>
                <select
                  {...register('customer', { required: 'Please select a customer' })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
                {errors.customer && <p className="mt-1 text-red-600">{errors.customer.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                  >
                    <option value="">-- Select --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-red-600">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    {...register('brand', { required: 'Brand is required' })}
                    placeholder="Apple, Samsung, Dell..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                  />
                  {errors.brand && <p className="mt-1 text-red-600">{errors.brand.message}</p>}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Model Name *
                </label>
                <input
                  type="text"
                  {...register('model_name', { required: 'Model is required' })}
                  placeholder="e.g. iPhone 14 Pro Max / XPS 15"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
                {errors.model_name && <p className="mt-1 text-red-600">{errors.model_name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    {...register('serial_number')}
                    placeholder="SN / Service Tag"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    IMEI (For Phones)
                  </label>
                  <input
                    type="text"
                    {...register('imei')}
                    placeholder="15-digit IMEI"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Passcode / Unlock Pattern
                </label>
                <input
                  type="text"
                  {...register('passcode_pattern')}
                  placeholder="PIN or pattern description for testing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Condition Inspection
                </label>
                <textarea
                  rows={2}
                  {...register('physical_condition')}
                  placeholder="Note scratches, dents, cracked glass, or pre-existing flaws..."
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
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
