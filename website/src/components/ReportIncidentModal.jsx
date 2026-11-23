import React, { useState } from 'react';
import { X, AlertTriangle, Send, MapPin, ShieldAlert } from 'lucide-react';

export default function ReportIncidentModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    district: 'Mangaluru',
    location: 'Tannirbhavi Beach Outer Parking',
    incidentType: 'Poor Lighting',
    description: '',
    lightingLevel: '2',
    isAnonymous: true
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-rose-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Report Safety Incident</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-slate-900">Incident Submitted</h3>
            <p className="text-xs text-slate-500">
              Thank you for keeping Karnataka safe. Our team and local police patrol unit will verify this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select District / City</label>
              <select 
                value={formData.district} 
                onChange={(e) => setFormData({...formData, district: e.target.value})}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium"
              >
                <option value="Mangaluru">Mangaluru</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Coorg">Coorg</option>
                <option value="Hampi">Hampi</option>
                <option value="Udupi">Udupi</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Exact Location / Road Name</label>
              <input 
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g. Tannirbhavi Beach Parking Area"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Incident Category</label>
              <select 
                value={formData.incidentType}
                onChange={(e) => setFormData({...formData, incidentType: e.target.value})}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium"
              >
                <option value="Harassment Report">Harassment Report</option>
                <option value="Suspicious Activity">Suspicious Activity</option>
                <option value="Poor Lighting">Poor Lighting</option>
                <option value="Isolated Stretch">Isolated Stretch</option>
                <option value="Road Hazard">Road Hazard</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Description & Safety Details</label>
              <textarea 
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Provide details about what you observed (e.g. non-functional streetlights, unpatrolled stretch...)"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium"
                required
              ></textarea>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox"
                id="anon"
                checked={formData.isAnonymous}
                onChange={(e) => setFormData({...formData, isAnonymous: e.target.checked})}
                className="w-4 h-4 text-teal-600 rounded"
              />
              <label htmlFor="anon" className="text-slate-600 font-medium">Submit Anonymously</label>
            </div>

            <button 
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Safety Incident Report</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
