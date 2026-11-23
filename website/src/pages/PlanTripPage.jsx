import React, { useEffect, useState } from 'react';

import {
  Navigation,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  FileText,
  Loader2
} from 'lucide-react';


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000/api';


export default function PlanTripPage({
  setActiveTab,
  onOpenBrief,
  selectedDistrict,
  setSelectedDistrict
}) {

  // ============================================================
  // DISTRICTS
  // ============================================================

  const [districts, setDistricts] = useState([]);

  const [districtsLoading, setDistrictsLoading] =
    useState(true);

  const [districtError, setDistrictError] =
    useState('');


  // ============================================================
  // TRIP FORM
  // ============================================================

  const [fromLocation, setFromLocation] =
    useState('Bengaluru');

  const [toLocation, setToLocation] =
    useState(selectedDistrict || 'Mangaluru');

  const [travelDate, setTravelDate] =
    useState('');


  // ============================================================
  // LOAD REAL KARNATAKA DISTRICTS
  // ============================================================

  useEffect(() => {

    const loadDistricts = async () => {

      setDistrictsLoading(true);
      setDistrictError('');

      try {

        const response = await fetch(
          `${API_BASE_URL}/districts/`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load districts: ${response.status}`
          );
        }

        const data = await response.json();

        const districtList =
          Array.isArray(data)
            ? data
            : data.results || [];

        setDistricts(districtList);

        // ------------------------------------------------------
        // Set initial destination
        // ------------------------------------------------------

        if (districtList.length > 0) {

          const existingDestination =
            districtList.find(
              (district) =>
                district.name ===
                (selectedDistrict || 'Mangaluru')
            );

          if (existingDestination) {

            setToLocation(
              existingDestination.name
            );

            setSelectedDistrict(
              existingDestination.name
            );

          } else {

            setToLocation(
              districtList[0].name
            );

            setSelectedDistrict(
              districtList[0].name
            );

          }

        }

      } catch (error) {

        console.error(
          'District loading error:',
          error
        );

        setDistrictError(
          'Unable to load Karnataka districts.'
        );

      } finally {

        setDistrictsLoading(false);

      }

    };

    loadDistricts();

  }, []);


  // ============================================================
  // HANDLE DESTINATION CHANGE
  // ============================================================

  const handleDestinationChange = (event) => {

    const destination =
      event.target.value;

    setToLocation(destination);

    setSelectedDistrict(destination);

  };


  // ============================================================
  // SEARCH
  // ============================================================

  const handleSearch = (event) => {

    event.preventDefault();

    if (!toLocation) {
      return;
    }

    // Store the selected destination
    setSelectedDistrict(toLocation);

    // Open the real places page
    setActiveTab('places');

  };


  return (

    <div className="max-w-4xl mx-auto space-y-8 pb-12">

      {/* ========================================================
          PAGE HEADER
      ========================================================= */}

      <div className="text-center space-y-2">

        <div className="inline-flex items-center space-x-2 text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-xs font-bold border border-teal-200">

          <Navigation className="w-3.5 h-3.5" />

          <span>
            Smart Trip Planner
          </span>

        </div>


        <h1 className="text-3xl font-black text-slate-900">

          Plan Your Trip

        </h1>


        <p className="text-xs text-slate-500 font-medium">

          Discover real tourist places and safety information
          across Karnataka.

        </p>

      </div>


      {/* ========================================================
          STEPPER
      ========================================================= */}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">

        <div className="flex items-center space-x-3">

          <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-sm flex items-center justify-center">

            1

          </div>

          <span className="font-bold text-teal-700 text-xs md:text-sm">

            Select

          </span>

        </div>


        <div className="h-0.5 flex-1 bg-slate-200 mx-3"></div>


        <div className="flex items-center space-x-3">

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center">

            2

          </div>

          <span className="font-medium text-slate-500 text-xs md:text-sm">

            Explore

          </span>

        </div>


        <div className="h-0.5 flex-1 bg-slate-200 mx-3"></div>


        <div className="flex items-center space-x-3">

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center">

            3

          </div>

          <span className="font-medium text-slate-500 text-xs md:text-sm">

            Plan

          </span>

        </div>


        <div className="h-0.5 flex-1 bg-slate-200 mx-3"></div>


        <div className="flex items-center space-x-3">

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center">

            4

          </div>

          <span className="font-medium text-slate-500 text-xs md:text-sm">

            Confirm

          </span>

        </div>

      </div>


      {/* ========================================================
          DISTRICT SELECTION
      ========================================================= */}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-6">

        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >

          {/* ====================================================
              FROM
          ==================================================== */}

          <div>

            <label className="text-xs font-bold text-slate-700 block mb-1.5">

              From

            </label>


            <div className="relative">

              <select
                value={fromLocation}
                onChange={(event) =>
                  setFromLocation(
                    event.target.value
                  )
                }
                disabled={districtsLoading}
                className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-60"
              >

                {districts.length === 0 ? (

                  <option>
                    Loading districts...
                  </option>

                ) : (

                  districts.map((district) => (

                    <option
                      key={district.id}
                      value={district.name}
                    >
                      {district.name}
                    </option>

                  ))

                )}

              </select>

            </div>

          </div>


          {/* ====================================================
              TO
          ==================================================== */}

          <div>

            <label className="text-xs font-bold text-slate-700 block mb-1.5">

              Destination

            </label>


            <div className="relative">

              <select
                value={toLocation}
                onChange={handleDestinationChange}
                disabled={districtsLoading}
                className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-60"
              >

                {districts.length === 0 ? (

                  <option>
                    Loading districts...
                  </option>

                ) : (

                  districts.map((district) => (

                    <option
                      key={district.id}
                      value={district.name}
                    >
                      {district.name}
                    </option>

                  ))

                )}

              </select>

            </div>

          </div>


          {/* ====================================================
              TRAVEL DATE
          ==================================================== */}

          <div>

            <label className="text-xs font-bold text-slate-700 block mb-1.5">

              Travel Date

            </label>


            <div className="relative">

              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

              <input
                type="date"
                value={travelDate}
                onChange={(event) =>
                  setTravelDate(
                    event.target.value
                  )
                }
                className="w-full p-3 pl-10 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />

            </div>

          </div>


          {/* ====================================================
              ERROR
          ==================================================== */}

          {districtError && (

            <div className="md:col-span-3">

              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">

                {districtError}

              </div>

            </div>

          )}


          {/* ====================================================
              SEARCH BUTTON
          ==================================================== */}

          <div className="md:col-span-3 pt-2">

            <button
              type="submit"
              disabled={
                districtsLoading ||
                !toLocation
              }
              className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center space-x-2"
            >

              {districtsLoading ? (

                <>
                  <Loader2 className="w-4 h-4 animate-spin" />

                  <span>
                    Loading Districts...
                  </span>
                </>

              ) : (

                <>
                  <span>
                    Find Tourist Places
                  </span>

                  <ArrowRight className="w-4 h-4" />
                </>

              )}

            </button>

          </div>

        </form>

      </div>


      {/* ========================================================
          CURRENT SELECTION
      ========================================================= */}

      {!districtsLoading && toLocation && (

        <div className="bg-white p-5 rounded-2xl border border-slate-200">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">

              <MapPin className="w-5 h-5 text-teal-600" />

            </div>


            <div>

              <p className="text-xs text-slate-500 font-medium">

                Selected destination

              </p>

              <h3 className="font-black text-slate-900">

                {toLocation}

              </h3>

            </div>

          </div>

        </div>

      )}


      {/* ========================================================
          TRAVEL SAFETY TIP
      ========================================================= */}

      <div className="p-5 rounded-2xl bg-pink-50 border border-pink-200 flex flex-col md:flex-row items-center justify-between gap-4">

        <div className="flex items-center space-x-3">

          <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">

            <Sparkles className="w-5 h-5" />

          </div>


          <div>

            <h4 className="font-bold text-slate-900 text-sm">

              Travel Safety Tip

            </h4>


            <p className="text-xs text-slate-600">

              Explore real places first, then use
              SafeTrip's safety information to plan
              your journey.

            </p>

          </div>

        </div>


        <button
          onClick={onOpenBrief}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 flex-shrink-0"
        >

          <FileText className="w-4 h-4" />

          <span>
            Get Personalized Safety Brief
          </span>

        </button>

      </div>

    </div>

  );
}