
import React, { useState } from 'react';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import TripBriefModal from './components/TripBriefModal';
import ReportIncidentModal from './components/ReportIncidentModal';
import ChatbotWidget from './components/ChatbotWidget';

import HomePage from './pages/HomePage';
import PlanTripPage from './pages/PlanTripPage';
import DistrictPlacesPage from './pages/DistrictPlacesPage';
import PlaceDetailsPage from './pages/PlaceDetailsPage';
import SafeRoutePage from './pages/SafeRoutePage';
import RouteMapPage from './pages/RouteMapPage';
import ReviewsCommunityPage from './pages/ReviewsCommunityPage';
import WomenModePage from './pages/WomenModePage';
import AdminDashboard from './pages/AdminDashboard';

import { generateTripBrief } from './services/api';

// Restore admin session after page refresh
function getSavedAdmin() {
  try {
    const savedUser = localStorage.getItem('safetrip_user');
    const accessToken = localStorage.getItem('safetrip_access_token');

    if (!savedUser || !accessToken) return null;

    const user = JSON.parse(savedUser);

    return user?.is_admin ? user : null;
  } catch (error) {
    console.error('Unable to restore admin session:', error);
    return null;
  }
}

export default function App() {
  // Admin session
  const [adminUser, setAdminUser] = useState(getSavedAdmin);

  // Main navigation
  const [activeTab, setActiveTab] = useState('home');

  // Women Safety Mode
  const [womenMode, setWomenMode] = useState(false);

  // Selected tourist place
  const [selectedPlace, setSelectedPlace] = useState(null);

  // Selected district
  const [selectedDistrict, setSelectedDistrict] = useState('Mangaluru');

  // Trip brief modal
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefData, setBriefData] = useState(null);

  // Incident report modal
  const [showReportModal, setShowReportModal] = useState(false);

  // Called when an administrator logs in through Navbar
  const handleAdminLogin = (user) => {
    if (user?.is_admin) {
      setAdminUser(user);
    }
  };

  // Admin logout: clear stored session and return to traveler website
  const handleAdminLogout = () => {
    localStorage.removeItem('safetrip_access_token');
    localStorage.removeItem('safetrip_refresh_token');
    localStorage.removeItem('safetrip_user');

    setAdminUser(null);
    setActiveTab('home');
    setWomenMode(false);
    setSelectedPlace(null);
    setShowBriefModal(false);
    setShowReportModal(false);
  };

  // Generate trip brief
  const handleOpenBrief = async () => {
    try {
      const data = await generateTripBrief({
        origin: 'Bengaluru',
        destination: selectedPlace?.name || selectedDistrict,
        travel_date: new Date().toISOString().slice(0, 10),
      });

      setBriefData(data);
      setShowBriefModal(true);
    } catch (error) {
      console.error('Failed to generate trip brief:', error);
    }
  };

  // Open routes for the selected tourist place
  const handleOpenRoute = (place = selectedPlace) => {
    if (!place) {
      console.warn(
        'Please select a tourist place before opening routes.'
      );
      return;
    }

    setSelectedPlace(place);
    setActiveTab('route-map');
  };

  // Show separate admin dashboard
  if (adminUser) {
    return (
      <AdminDashboard
        adminUser={adminUser}
        onLogout={handleAdminLogout}
      />
    );
  }

  // Normal traveler website
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-teal-500 selection:text-white">

      {/* Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        womenMode={womenMode}
        setWomenMode={setWomenMode}
        onOpenReport={() => setShowReportModal(true)}
        onOpenBrief={handleOpenBrief}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* Home */}
        {activeTab === 'home' && (
          <HomePage
            setActiveTab={setActiveTab}
            setWomenMode={setWomenMode}
            setSelectedDistrict={setSelectedDistrict}
            onOpenReport={() => setShowReportModal(true)}
          />
        )}

        {/* Plan trip */}
        {activeTab === 'plan' && (
          <PlanTripPage
            setActiveTab={setActiveTab}
            onOpenBrief={handleOpenBrief}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
          />
        )}

        {/* Tourist places */}
        {activeTab === 'places' && (
          <DistrictPlacesPage
            setActiveTab={setActiveTab}
            setSelectedPlace={setSelectedPlace}
            selectedDistrict={selectedDistrict}
          />
        )}

        {/* Place details */}
        {activeTab === 'details' && (
          <PlaceDetailsPage
            place={selectedPlace}
            setActiveTab={setActiveTab}
            onOpenBrief={handleOpenBrief}
            onOpenRoute={handleOpenRoute}
          />
        )}

        {/* Safe route comparison */}
        {activeTab === 'route' && (
          <SafeRoutePage
            setActiveTab={setActiveTab}
          />
        )}

        {/* Interactive route map */}
        {activeTab === 'route-map' && (
          <RouteMapPage
            setActiveTab={setActiveTab}
            origin="Bengaluru"
            destination={selectedPlace?.name || selectedDistrict}
            destinationLatitude={
              selectedPlace?.latitude ??
              selectedPlace?.lat ??
              null
            }
            destinationLongitude={
              selectedPlace?.longitude ??
              selectedPlace?.lon ??
              selectedPlace?.lng ??
              null
            }
          />
        )}

        {/* Community reviews */}
        {activeTab === 'reviews' && (
          <ReviewsCommunityPage />
        )}

        {/* Women Safety Mode */}
        {activeTab === 'women' && (
          <WomenModePage
            onOpenReport={() => setShowReportModal(true)}
          />
        )}

      </main>

      {/* Footer */}
      <Footer />

      {/* Trip brief modal */}
      <TripBriefModal
        isOpen={showBriefModal}
        onClose={() => setShowBriefModal(false)}
        briefData={briefData}
      />

      {/* Incident report modal */}
      <ReportIncidentModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {/* SafeTrip AI Chatbot */}
      <ChatbotWidget />

    </div>
  );
}
