import React from 'react';
import { ShieldCheck, Heart, PhoneCall, MapPin, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm py-12 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center space-x-2 text-white mb-3">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
            <span className="text-lg font-bold">SafeTrip Karnataka</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Karnataka's leading tourist discovery & travel safety platform. Empowering solo female travelers, families, and explorers with verified safety insights.
          </p>
          <p className="text-xs text-emerald-400 font-semibold">
            "More Women Exploring Karnataka — A Safer Tomorrow"
          </p>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">Quick Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#" className="hover:text-teal-400 transition-colors">Explore All 31 Districts</a></li>
            <li><a href="#" className="hover:text-teal-400 transition-colors">Smart Route Safety Checker</a></li>
            <li><a href="#" className="hover:text-teal-400 transition-colors">Women Traveler Mode</a></li>
            <li><a href="#" className="hover:text-teal-400 transition-colors">Download Safety Brief</a></li>
            <li><a href="#" className="hover:text-teal-400 transition-colors">Community Incident Log</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">Emergency Helplines</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center space-x-2 text-rose-400 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>National Emergency SOS: 112</span>
            </li>
            <li className="flex items-center space-x-2 text-pink-400 font-semibold">
              <Heart className="w-3.5 h-3.5" />
              <span>Women Helpline: 1091</span>
            </li>
            <li>Karnataka Tourism Toll Free: 1800-425-4646</li>
            <li>Ambulance Emergency: 108</li>
            <li>Highway Patrol SOS: 1033</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">Supported By</h4>
          <p className="text-xs text-slate-400 mb-3">
            Powered by Karnataka Police Women Safety Cell & Open Places Data.
          </p>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <span className="text-teal-400 font-bold block mb-1">Official SafeTrip Seal</span>
            Verified safety indices updated daily with crowd-sourced traveler reviews & police beat data.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 SafeTrip Karnataka. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Built for Karnataka Tourism & Women Safety</p>
      </div>
    </footer>
  );
}
