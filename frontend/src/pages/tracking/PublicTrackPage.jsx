import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  ShieldCheck,
  FileText,
  DollarSign,
  Phone,
  MapPin,
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const STATUS_ICONS = {
  RECEIVED: Clock,
  UNDER_DIAGNOSIS: Wrench,
  WAITING_FOR_APPROVAL: AlertTriangle,
  WAITING_FOR_PARTS: Clock,
  IN_PROGRESS: Wrench,
  QUALITY_CHECK: ShieldCheck,
  READY_FOR_DELIVERY: CheckCircle2,
  DELIVERED: CheckCircle2,
  CANCELLED: AlertTriangle,
  UNREPAIRABLE: AlertTriangle,
};

export const PublicTrackPage = () => {
  const { token } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-track', token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/public/track/${token}/`);
      return res.data;
    },
    refetchInterval: 15000, // Live poll every 15s
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-3 p-4">
        <Wrench className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Looking up live repair ticket...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Tracking Token Not Found</h2>
          <p className="text-xs text-slate-400">
            This repair tracking link is invalid, expired, or was entered incorrectly. Please check your QR code or receipt.
          </p>
        </div>
      </div>
    );
  }

  const {
    ticket_number,
    status,
    status_display,
    device,
    reported_problem,
    expected_delivery_date,
    estimated_cost,
    timeline = [],
    notes = [],
    quotation,
    warranty,
    shop,
  } = data;

  const currency = shop?.currency_symbol || '$';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-base">FixFlow Live Tracking</div>
              <div className="text-[11px] text-slate-400">{shop?.name || 'Authorized Repair Shop'}</div>
            </div>
          </div>

          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Realtime
          </span>
        </div>

        {/* Current Status Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ticket Number</p>
              <h2 className="text-xl font-extrabold text-blue-400 tracking-tight">{ticket_number}</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
              {status_display}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white">
              <Smartphone className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>{device?.brand} {device?.model_name}</span>
            </div>
            <p className="text-xs text-slate-400">{reported_problem}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            {expected_delivery_date && (
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Est. Delivery</span>
                <span className="font-bold text-white mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  {expected_delivery_date}
                </span>
              </div>
            )}
            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Estimated Cost</span>
              <span className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                {currency}{estimated_cost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Repair Timeline */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Repair Progress Timeline
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timeline.map((step, idx) => {
              const isLatest = idx === timeline.length - 1;
              return (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isLatest
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/50'
                        : 'bg-slate-950 border-slate-700 text-slate-500'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isLatest ? 'text-white' : 'text-slate-300'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(step.timestamp).toLocaleDateString()} {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {step.notes && <p className="text-xs text-slate-400 mt-1">{step.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warranty Certificate if applicable */}
        {warranty && (
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 shadow-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Active Warranty Certificate
              </span>
              <span className="font-mono text-emerald-400 font-bold">{warranty.warranty_code}</span>
            </div>
            <p className="text-emerald-200/80 text-[11px]">
              Valid until <strong>{warranty.end_date}</strong> ({warranty.duration_days} days).
            </p>
            <p className="text-emerald-300/70 text-[11px]">Covered: {warranty.covered_components}</p>
          </div>
        )}

        {/* Shop Contact Footer */}
        {shop && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-white">{shop.name}</p>
            {shop.phone && <p className="flex items-center justify-center gap-1 text-[11px]"><Phone className="w-3 h-3 text-slate-500" /> {shop.phone}</p>}
            {shop.address && <p className="flex items-center justify-center gap-1 text-[11px]"><MapPin className="w-3 h-3 text-slate-500" /> {shop.address}</p>}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-600 mt-8">
        Powered by FixFlow Enterprise Smart Repair Platform
      </div>
    </div>
  );
};
