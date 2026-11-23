import React from 'react';
import { X, ShieldCheck, Download, Printer, CheckCircle, AlertCircle, PhoneCall, Heart } from 'lucide-react';

export default function TripBriefModal({ isOpen, onClose, briefData }) {
  if (!isOpen || !briefData) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-teal-700 text-white p-6 rounded-t-2xl flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Personalized Safety Brief • SafeTrip Karnataka</span>
            </div>
            <h2 className="text-xl font-black">{briefData.title}</h2>
            <p className="text-xs text-teal-100 mt-1">Generated for {briefData.generated_for} • Date: {briefData.travel_date}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-teal-600 text-teal-100 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 text-slate-800">
          {/* Status Badge */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {briefData.overall_trip_safety_score}
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Route Safety Status</span>
                <h4 className="text-sm font-black text-emerald-900">{briefData.status}</h4>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-700 font-semibold">Recommended Highway:</span>
              <p className="text-xs font-bold text-slate-900">{briefData.route_summary?.recommended_highway}</p>
            </div>
          </div>

          {/* Destinaton Safety Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Destinations Included</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {briefData.destinations?.map((dest, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{dest.place_name}</h5>
                    <span className="text-xs text-slate-500">{dest.category} • Best time: {dest.best_time}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                    ★ {dest.safety_score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Advisories */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Solo & Women Safety Advisories</span>
            </h3>
            <ul className="space-y-2">
              {briefData.safety_advisories?.map((adv, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency Contacts */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-1.5 text-rose-700">
              <PhoneCall className="w-4 h-4" />
              <span>24x7 Verified Helplines</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {briefData.emergency_contacts?.map((contact, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-600 block">{contact.name}</span>
                  <span className="text-xs font-black text-rose-600">{contact.number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
          <button onClick={() => window.print()} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center space-x-1.5">
            <Printer className="w-4 h-4" />
            <span>Print Brief</span>
          </button>
          <button onClick={() => alert("Downloading SafeTrip Safety Brief PDF...")} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/30">
            <Download className="w-4 h-4" />
            <span>Download PDF Safety Brief</span>
          </button>
        </div>
      </div>
    </div>
  );
}
