import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Search,
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Smartphone,
  ExternalLink,
  QrCode,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  FileText,
  UserCheck,
  Send,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_TABS = [
  { id: '', label: 'All Repairs' },
  { id: 'RECEIVED', label: 'Received' },
  { id: 'UNDER_DIAGNOSIS', label: 'In Diagnosis' },
  { id: 'WAITING_FOR_APPROVAL', label: 'Approval Pending' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'QUALITY_CHECK', label: 'Quality Check' },
  { id: 'READY_FOR_DELIVERY', label: 'Ready' },
  { id: 'DELIVERED', label: 'Delivered' },
];

const STATUS_COLORS = {
  RECEIVED: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_DIAGNOSIS: 'bg-purple-50 text-purple-700 border-purple-200',
  WAITING_FOR_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  WAITING_FOR_PARTS: 'bg-pink-50 text-pink-700 border-pink-200',
  IN_PROGRESS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  QUALITY_CHECK: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  READY_FOR_DELIVERY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERED: 'bg-slate-100 text-slate-700 border-slate-300',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  UNREPAIRABLE: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_BADGES = {
  LOW: 'text-slate-500 bg-slate-100',
  MEDIUM: 'text-blue-600 bg-blue-50',
  HIGH: 'text-amber-600 bg-amber-50',
  URGENT: 'text-red-600 bg-red-50 font-bold',
};

export const RepairsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModalTicket, setQrModalTicket] = useState(null);
  const [formError, setFormError] = useState('');

  // Selected customer for dynamic device filtering in create modal
  const [modalCustomerId, setModalCustomerId] = useState('');

  // 1. Fetch Repairs
  const { data: repairsData, isLoading } = useQuery({
    queryKey: ['repairs', searchTerm, selectedStatus],
    queryFn: async () => {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedStatus) params.status = selectedStatus;
      const res = await apiClient.get('/repairs/', { params });
      return res.data?.results || res.data || [];
    },
  });

  // 2. Fetch Single Ticket Details when drawer is open
  const { data: ticketDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['repair-ticket', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await apiClient.get(`/repairs/${selectedTicketId}/`);
      return res.data;
    },
    enabled: !!selectedTicketId,
  });

  // 3. Dropdowns data: Customers, Devices, Technicians
  const { data: customersData } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/customers/');
      return res.data?.results || res.data || [];
    },
    enabled: isCreateModalOpen,
  });

  const { data: devicesData } = useQuery({
    queryKey: ['devices-by-customer', modalCustomerId],
    queryFn: async () => {
      if (!modalCustomerId) return [];
      const res = await apiClient.get('/devices/', { params: { customer: modalCustomerId } });
      return res.data?.results || res.data || [];
    },
    enabled: !!modalCustomerId && isCreateModalOpen,
  });

  const { data: techniciansData } = useQuery({
    queryKey: ['technicians-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/staff/', { params: { role__name: 'TECHNICIAN' } });
      return res.data?.results || res.data || [];
    },
  });

  // 4. Create Ticket Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      priority: 'MEDIUM',
      estimated_cost: 0,
    },
  });

  // 5. Status Transition & Note Form States
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiClient.post('/repairs/', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['repairs']);
      queryClient.invalidateQueries(['dashboard-metrics']);
      setIsCreateModalOpen(false);
      reset();
      setModalCustomerId('');
      setSelectedTicketId(res.data.id); // Open details immediately
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to create ticket. Verify inputs.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status, notes }) => {
      return await apiClient.patch(`/repairs/${ticketId}/status/`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['repairs']);
      queryClient.invalidateQueries(['repair-ticket', selectedTicketId]);
      queryClient.invalidateQueries(['dashboard-metrics']);
      setStatusNotes('');
    },
  });

  const assignTechMutation = useMutation({
    mutationFn: async ({ ticketId, technicianId }) => {
      return await apiClient.post(`/repairs/${ticketId}/assign/`, { technician_id: technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['repairs']);
      queryClient.invalidateQueries(['repair-ticket', selectedTicketId]);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ ticketId, note, isInternal }) => {
      return await apiClient.post(`/repairs/${ticketId}/notes/`, {
        note,
        is_internal: isInternal,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-ticket', selectedTicketId]);
      setNoteText('');
    },
  });

  const onSubmitCreate = (formData) => {
    setFormError('');
    createTicketMutation.mutate(formData);
  };

  const repairs = repairsData || [];
  const customers = customersData || [];
  const devices = devicesData || [];
  const technicians = techniciansData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Repair Tickets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active repair workflow, status history, technician assignments, and QR tracking
          </p>
        </div>

        <button
          onClick={() => {
            reset();
            setModalCustomerId('');
            setFormError('');
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Repair Ticket</span>
        </button>
      </div>

      {/* Status Pipeline Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              selectedStatus === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ticket #, customer, phone, device, IMEI..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{repairs.length}</strong> repairs
        </div>
      </div>

      {/* Repairs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Est. Cost</th>
                <th className="py-3 px-4 text-right">QR / Track</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading repair pipeline from PostgreSQL...
                  </td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No repair tickets found. Click <strong>New Repair Ticket</strong> to create one!
                  </td>
                </tr>
              ) : (
                repairs.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => setSelectedTicketId(r.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-blue-600">{r.ticket_number}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{r.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.device_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{r.reported_problem}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">{r.technician_name || 'Unassigned'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${PRIORITY_BADGES[r.priority]}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">
                      ${parseFloat(r.estimated_cost).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setQrModalTicket(r)}
                          title="Show QR Code"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <a
                          href={`/track/${r.tracking_token}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Customer Tracking Page"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Drawer / Modal */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">{ticketDetail?.ticket_number}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[ticketDetail?.status]}`}>
                      {ticketDetail?.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Created on {ticketDetail?.created_at && new Date(ticketDetail.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/track/${ticketDetail?.tracking_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Public QR Link
                </a>
                <button
                  onClick={() => setSelectedTicketId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Customer & Device Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-600" /> Customer Information
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{ticketDetail?.customer?.name}</div>
                  <div className="text-slate-600">{ticketDetail?.customer?.phone}</div>
                  {ticketDetail?.customer?.email && <div className="text-slate-500">{ticketDetail?.customer?.email}</div>}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-blue-600" /> Device Information
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {ticketDetail?.device?.brand} {ticketDetail?.device?.model_name}
                  </div>
                  {ticketDetail?.device?.serial_number && (
                    <div className="text-slate-600 font-mono text-[11px]">SN: {ticketDetail?.device?.serial_number}</div>
                  )}
                  {ticketDetail?.device?.imei && (
                    <div className="text-slate-600 font-mono text-[11px]">IMEI: {ticketDetail?.device?.imei}</div>
                  )}
                </div>
              </div>

              {/* Reported Problem & Physical Condition */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                  Reported Problem & Symptoms
                </span>
                <p className="text-slate-800 text-sm">{ticketDetail?.reported_problem}</p>
                {ticketDetail?.accessories_received && (
                  <p className="text-slate-500 pt-1 border-t border-slate-100">
                    Accessories Received: <strong>{ticketDetail.accessories_received}</strong>
                  </p>
                )}
                {ticketDetail?.physical_condition && (
                  <p className="text-slate-500">
                    Condition: <em>{ticketDetail.physical_condition}</em>
                  </p>
                )}
              </div>

              {/* Status Transition & Technician Assignment Control */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                {/* Status Transition */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 text-xs block">Update Repair Status</label>
                  <select
                    value={newStatus || ticketDetail?.status}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
                  >
                    {STATUS_TABS.filter((t) => t.id !== '').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Status update note (optional)..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <button
                    onClick={() => {
                      if (!newStatus || newStatus === ticketDetail?.status) return;
                      updateStatusMutation.mutate({
                        ticketId: ticketDetail.id,
                        status: newStatus,
                        notes: statusNotes,
                      });
                    }}
                    disabled={updateStatusMutation.isPending || (!newStatus || newStatus === ticketDetail?.status)}
                    className="w-full py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending ? 'Updating...' : 'Commit Status Change'}
                  </button>
                </div>

                {/* Technician Assignment */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 text-xs block">Assigned Technician</label>
                  <select
                    value={ticketDetail?.assigned_technician?.id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        assignTechMutation.mutate({
                          ticketId: ticketDetail.id,
                          technicianId: e.target.value,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
                  >
                    <option value="">-- Unassigned --</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name} ({tech.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Assigning a technician logs an audit event and updates the technician's workload dashboard.
                  </p>
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Workflow Audit Trail ({ticketDetail?.status_history?.length || 0})
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                  {ticketDetail?.status_history?.map((h) => (
                    <div key={h.id} className="text-xs space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{h.new_status}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{h.changed_by_name || 'System'}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400 text-[10px]">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      {h.notes && <p className="text-slate-600 italic">"{h.notes}"</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Repair Notes */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Internal & Customer Notes
                </h4>
                <div className="space-y-2">
                  {ticketDetail?.notes?.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border text-xs ${
                        n.is_internal
                          ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px]">{n.author_name}</span>
                        <span className="text-[10px] uppercase font-semibold">
                          {n.is_internal ? '🔒 Internal Only' : '🌐 Customer Visible'}
                        </span>
                      </div>
                      <p>{n.note}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write a note..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                  <label className="flex items-center space-x-1 text-[11px] text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Internal</span>
                  </label>
                  <button
                    onClick={() => {
                      if (!noteText.trim()) return;
                      addNoteMutation.mutate({
                        ticketId: ticketDetail.id,
                        note: noteText,
                        isInternal: isInternalNote,
                      });
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1 font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Customer QR Tracking</span>
              <button onClick={() => setQrModalTicket(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ticket: <strong>{qrModalTicket.ticket_number}</strong>
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block">
              <img
                src={`http://127.0.0.1:8000/api/v1/repairs/${qrModalTicket.id}/qr/`}
                alt="QR Code"
                className="w-48 h-48 mx-auto rounded"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Customers can scan this QR code with any phone camera to view live repair progress and warranty.
            </p>

            <div className="pt-2">
              <a
                href={`/track/${qrModalTicket.tracking_token}`}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition"
              >
                Open Tracking Page
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create New Repair Ticket</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmitCreate)} className="mt-4 space-y-4 text-xs">
              {/* Step 1: Customer */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  1. Select Customer *
                </label>
                <select
                  {...register('customer', { required: 'Customer is required' })}
                  value={modalCustomerId}
                  onChange={(e) => {
                    setModalCustomerId(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
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

              {/* Step 2: Device */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  2. Select Customer Device *
                </label>
                <select
                  {...register('device', { required: 'Device is required' })}
                  disabled={!modalCustomerId}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white disabled:opacity-50"
                >
                  <option value="">
                    {!modalCustomerId ? '-- Select customer first --' : '-- Choose Device --'}
                  </option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.model_name} {d.serial_number ? `(SN: ${d.serial_number})` : ''}
                    </option>
                  ))}
                </select>
                {modalCustomerId && devices.length === 0 && (
                  <p className="mt-1 text-amber-600 text-[11px]">
                    No devices registered for this customer. Please register one in the Devices section first.
                  </p>
                )}
                {errors.device && <p className="mt-1 text-red-600">{errors.device.message}</p>}
              </div>

              {/* Step 3: Reported Problem */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  3. Customer Reported Problem / Symptoms *
                </label>
                <textarea
                  rows={3}
                  {...register('reported_problem', { required: 'Please describe the problem' })}
                  placeholder="e.g. Broken display, phone won't charge, water damage..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
                {errors.reported_problem && <p className="mt-1 text-red-600">{errors.reported_problem.message}</p>}
              </div>

              {/* Step 4: Accessories & Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Accessories Received
                  </label>
                  <input
                    type="text"
                    {...register('accessories_received')}
                    placeholder="Case, Charger, SIM Tray..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Physical Condition
                  </label>
                  <input
                    type="text"
                    {...register('physical_condition')}
                    placeholder="Existing scratches, dents..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Step 5: Cost, Date, Priority */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('estimated_cost')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expected Delivery
                  </label>
                  <input
                    type="date"
                    {...register('expected_delivery_date')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Step 6: Assign Technician */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Initial Technician (Optional)
                </label>
                <select
                  {...register('assigned_technician')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="">-- Assign Later --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                >
                  {createTicketMutation.isPending ? 'Generating Ticket...' : 'Create Repair Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
