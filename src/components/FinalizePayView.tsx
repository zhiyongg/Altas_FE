import React, { useState } from 'react';
import { Trip } from '../types';

interface FinalizePayViewProps {
  trip: Trip;
  onBack: () => void;
}

export const FinalizePayView: React.FC<FinalizePayViewProps> = ({ trip, onBack }) => {
  const [isSplitGroup, setIsSplitGroup] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);
  const [selectedPaymentCard, setSelectedPaymentCard] = useState<string>('•••• 4242');

  const totalCost = trip.budget || 2500.00;
  const numTravelers = trip.members.length || 4;
  const perPersonShare = (totalCost / numTravelers);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaidSuccess(true);
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f8f9fa] text-[#191c1d] flex flex-col items-center pt-8 pb-16 px-4 md:px-12">
      {/* Header Section */}
      <header className="w-full max-w-6xl mb-8 flex items-center">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-[#e7e8e9] transition-colors text-[#424754] mr-4 cursor-pointer"
          title="Back to Itinerary"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-semibold text-2xl md:text-3xl text-[#191c1d]">Finalize & Pay</h1>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        {/* Left Column: Receipt List */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 md:p-8 border border-[#e1e3e4]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-xl text-[#191c1d]">Trip Summary</h2>
              <span className="text-xs font-semibold bg-[#e7e8e9] text-[#424754] px-3.5 py-1 rounded-full">
                {trip.destination.includes('Tokyo') ? 'Tokyo Exploration' : 'Summer in Kyoto'}
              </span>
            </div>

            {/* Itemized List */}
            <div className="flex flex-col gap-3">
              {/* Flight */}
              <div className="flex items-center justify-between p-3.5 hover:bg-[#f8f9fa] rounded-xl transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[#001a42] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">flight</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#191c1d]">Flights (Round Trip)</p>
                    <p className="text-xs text-[#727785]">SFO to NRT • {numTravelers} Passengers</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-[#191c1d]">$850.00</p>
              </div>

              {/* Hotel */}
              <div className="flex items-center justify-between p-3.5 hover:bg-[#f8f9fa] rounded-xl transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[#001a42] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">hotel</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#191c1d]">Accommodations</p>
                    <p className="text-xs text-[#727785]">Keio Plaza Hotel Stay • 5 Nights</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-[#191c1d]">$1,200.00</p>
              </div>

              {/* Attractions */}
              <div className="flex items-center justify-between p-3.5 hover:bg-[#f8f9fa] rounded-xl transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[#001a42] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">local_activity</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#191c1d]">Attractions & Tours</p>
                    <p className="text-xs text-[#727785]">teamLab & Guided Temple Tour Pass</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-[#191c1d]">$450.00</p>
              </div>
            </div>

            {/* Total */}
            <div className="mt-8 pt-6 border-t border-[#e1e3e4] flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-[#727785] uppercase tracking-wider">Total Trip Cost</p>
                <p className="text-[11px] text-[#727785] mt-0.5">Includes taxes & fees</p>
              </div>
              <p className="font-bold text-3xl md:text-4xl text-[#191c1d]">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* AI Note / Insight */}
          <div className="bg-[#f8f9fa] p-5 rounded-2xl flex items-start gap-3.5 border border-[#c2c6d6]/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#d8e2ff]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="material-symbols-outlined text-[#0058be] text-[22px] relative z-10">auto_awesome</span>
            <p className="text-xs md:text-sm text-[#424754] leading-relaxed relative z-10">
              This total is within your estimated budget. Splitting this bill evenly among {numTravelers} travelers results in an optimal cost-per-person for this itinerary class.
            </p>
          </div>
        </section>

        {/* Right Column: Payment & Splitting */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 md:p-8 border border-[#e1e3e4] sticky top-24">
            <h3 className="font-semibold text-xl text-[#191c1d] mb-5">Payment Options</h3>

            {/* Toggle */}
            <div className="bg-[#f3f4f5] rounded-full p-1 flex mb-6">
              <button
                onClick={() => setIsSplitGroup(false)}
                className={`flex-1 py-2 px-3 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  !isSplitGroup
                    ? 'bg-white shadow-xs text-[#191c1d]'
                    : 'text-[#727785] hover:text-[#191c1d]'
                }`}
              >
                Pay Individual
              </button>
              <button
                onClick={() => setIsSplitGroup(true)}
                className={`flex-1 py-2 px-3 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  isSplitGroup
                    ? 'bg-white shadow-xs text-[#191c1d]'
                    : 'text-[#727785] hover:text-[#191c1d]'
                }`}
              >
                Split Bill with Group
              </button>
            </div>

            {/* Group Members List (when Split is active) */}
            {isSplitGroup && (
              <div className="flex flex-col gap-2.5 mb-6 animate-in fade-in duration-200">
                <p className="text-[11px] font-semibold text-[#727785] uppercase tracking-wider mb-1">
                  Dividing evenly by {numTravelers}
                </p>

                {trip.members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      member.isCurrentUser ? 'bg-[#f3f4f5]' : 'bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover shadow-2xs border border-white"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#191c1d] flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {member.hasPaid && (
                            <span className="text-[10px] bg-[#6cf8bb]/40 text-[#006c49] px-1.5 py-0.5 rounded font-medium">
                              Paid
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#191c1d]">
                      ${perPersonShare.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Method */}
            <div className="mb-6">
              <p className="text-[11px] font-semibold text-[#727785] uppercase tracking-wider mb-2">
                Payment Method
              </p>
              <div
                onClick={() => {
                  const newCard = selectedPaymentCard === '•••• 4242' ? '•••• 8819 (Apple Pay)' : '•••• 4242';
                  setSelectedPaymentCard(newCard);
                }}
                className="flex items-center justify-between p-3.5 border border-[#e1e3e4] rounded-xl cursor-pointer hover:bg-[#f8f9fa] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-7 bg-[#e7e8e9] rounded flex items-center justify-center text-[#424754]">
                    <span className="material-symbols-outlined text-[18px]">credit_card</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#191c1d]">{selectedPaymentCard}</p>
                    <span className="text-[10px] text-[#727785]">Click to switch card</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[20px] text-[#727785]">chevron_right</span>
              </div>
            </div>

            {/* CTA */}
            {isPaidSuccess ? (
              <div className="p-4 bg-[#6cf8bb]/20 border border-[#6cf8bb] rounded-2xl text-center animate-in zoom-in-95 duration-300">
                <span className="material-symbols-outlined text-[#006c49] text-[36px] mb-1">check_circle</span>
                <h4 className="font-bold text-base text-[#006c49]">Payment Confirmed!</h4>
                <p className="text-xs text-[#00714d] mt-1">
                  Receipt sent to all group members. Your bookings are now synced with AetherPlan.
                </p>
                <button
                  onClick={onBack}
                  className="mt-3 text-xs bg-[#006c49] text-white px-4 py-1.5 rounded-full font-semibold hover:bg-[#005236] transition-colors cursor-pointer"
                >
                  Return to Workspace
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full bg-[#006c49] hover:bg-[#005236] text-white font-semibold text-sm py-4 rounded-full flex items-center justify-center gap-2 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                      <span>
                        {isSplitGroup
                          ? `Confirm & Pay Your Share ($${perPersonShare.toFixed(2)})`
                          : `Confirm & Pay Full ($${totalCost.toFixed(2)})`}
                      </span>
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-[#727785] mt-3 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  Secure 256-bit encrypted transaction
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
