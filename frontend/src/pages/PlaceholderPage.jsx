import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export const PlaceholderPage = ({ title }) => {
  const location = useLocation();
  const pageName = title || location.pathname.replace('/', '').toUpperCase();

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-xl shadow-xs text-center max-w-xl mx-auto my-12 space-y-3">
      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
        <Construction className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{pageName} Module</h2>
      <p className="text-xs text-slate-500">
        Connected to Django REST API & PostgreSQL backend. Full CRUD views scheduled in Phase 2-4.
      </p>
    </div>
  );
};
