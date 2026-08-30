import React, { useEffect, useMemo, useState } from 'react';
import { Trip, TripMember } from '../types';
import { InviteFriendsModal } from './InviteFriendsModal';
import { API_BASE } from '../api';
import { currencySymbol } from '../currency';
import { tripTotal } from '../utils/costs';

interface HotelSearchParams {
  destId: string | null;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  children: number;
}

interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  adults: number;
  childrenCount: number;
  infants: number;
}

interface FinalizePayViewProps {
  trip: Trip;
  hotelSearchParams: HotelSearchParams;
  flightSearchParams: FlightSearchParams;
  chatSessionId: string;
  onBack: () => void;
  onUpdateMembers: (members: TripMember[]) => void;
}

interface CheckoutSessionInfo {
  member_id: string;
  member_name: string;
  is_current_user: boolean;
  amount: number;
  currency: string;
  checkout_url: string;
  session_id: string;
}

export const FinalizePayView: React.FC<FinalizePayViewProps> = ({
  trip,
  hotelSearchParams,
  flightSearchParams,
  chatSessionId,
  onBack,
  onUpdateMembers,
}) => {
  const [isSplitGroup, setIsSplitGroup] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Sessions returned by the backend for the current "Confirm & Pay" click.
  // Only the current user's session is redirected into automatically —
  // sessions for other members are surfaced as shareable links, since
  // there's no per-member login yet to deliver these to them directly.
  const [memberSessions, setMemberSessions] = useState<CheckoutSessionInfo[]>(
    [],
  );
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  // Per-member paid status, checked on demand via /payment/session-status
  // (a stand-in for a real webhook, which this app doesn't have yet).
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});
  const [checkingStatusFor, setCheckingStatusFor] = useState<string | null>(
    null,
  );

  // Everything below used to be invented: the total came from `trip.budget`
  // (a per-person budget *input*, not a cost) with a 2500 fallback, and the
  // three itemized rows were literal hardcoded strings — "SFO to NRT",
  // "Keio Plaza Hotel Stay • 5 Nights", "$850.00", "$1,200.00", "$450.00" —
  // regardless of the actual trip. So the receipt never described the trip
  // being bought and its rows never added up to the amount charged. Derive
  // all of it from trip.costs / the itinerary instead.
  const currency = trip.costs.currency || 'USD';
  const symbol = currencySymbol(currency);
  const totalCost = tripTotal(trip.costs);
  // numTravelers is the trip's fixed HEADCOUNT (set once in NewTripModal),
  // not how many people have actually joined so far — trip.members only
  // holds real, joined travelers now (see App.tsx trip creation), so early
  // on it can be just "You" while numTravelers is still e.g. 4. Falling back
  // to trip.members.length is only for legacy/edge trips that somehow have
  // no travelersCount at all.
  const numTravelers = trip.travelersCount || trip.members.length || 1;
  const perPersonShare = totalCost / numTravelers;
  // How many seats are still unfilled. Adding/removing REAL members (via the
  // invite modal) is the only thing that changes this — the headcount itself
  // can't be edited from this screen.
  const emptySlots = Math.max(0, numTravelers - trip.members.length);

  const money = (amount: number) =>
    `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lineItems = useMemo(() => {
    const allItems = trip.days.flatMap((day) => day.items);
    const flights = allItems.filter((it) => it.type === 'flight');
    const hotel = allItems.find((it) => it.type === 'hotel');

    const route = flights.length
      ? Array.from(
          new Set(
            flights.flatMap((f) =>
              [f.flightDetails?.depAirport, f.flightDetails?.arrAirport].filter(Boolean),
            ),
          ),
        ).join(' → ')
      : trip.destination;

    const nights = hotel?.nights ?? hotel?.hotelDetails?.totalNights;
    const activityCount = allItems.filter(
      (it) => it.type !== 'flight' && it.type !== 'hotel',
    ).length;

    return [
      {
        key: 'flights',
        icon: 'flight',
        label: flights.length > 1 ? 'Flights (Round Trip)' : 'Flights',
        detail: `${route} • ${numTravelers} ${numTravelers === 1 ? 'passenger' : 'passengers'}`,
        amount: trip.costs.flights || 0,
      },
      {
        key: 'accommodation',
        icon: 'hotel',
        label: 'Accommodation',
        detail: [hotel?.hotelDetails?.name ?? hotel?.title, nights ? `${nights} nights` : null]
          .filter(Boolean)
          .join(' • ') || 'No stay booked yet',
        amount: trip.costs.accommodation || 0,
      },
      {
        key: 'activities',
        icon: 'local_activity',
        label: 'Activities & Dining',
        detail: `${activityCount} planned ${activityCount === 1 ? 'stop' : 'stops'} across ${trip.days.length} ${trip.days.length === 1 ? 'day' : 'days'}`,
        amount: trip.costs.activities || 0,
      },
    ];
  }, [trip, numTravelers]);

  // If we've just been redirected back from Stripe (success_url includes
  // ?session_id=...), verify the payment actually went through before
  // showing the success state — never trust the redirect alone.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    fetch(`${API_BASE}/payment/session-status/${sessionId}`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Could not verify payment (${res.status})`);
        return res.json();
      })
      .then(
        (data: {
          payment_status: string;
          metadata?: Record<string, string>;
        }) => {
          if (data.payment_status === 'paid') {
            setIsPaidSuccess(true);
            if (data.metadata?.member_id) {
              setPaidStatus((prev) => ({
                ...prev,
                [data.metadata!.member_id]: true,
              }));
            }
          } else {
            // cancel_url is the same page as success_url, so simply backing
            // out of Stripe's page landed here too. Reporting that as a flat
            // "Payment was not completed." error made a deliberate cancel look
            // like a failure.
            setError(
              data.payment_status === 'unpaid'
                ? 'Checkout was cancelled — nothing has been charged.'
                : `Payment is ${data.payment_status}. Nothing has been charged yet.`,
            );
          }
        },
      )
      .catch((err) => setError(err.message ?? 'Failed to verify payment'))
      .finally(() => {
        // Strip session_id from the URL so a page refresh doesn't re-check it.
        params.delete('session_id');
        const rest = params.toString();
        window.history.replaceState(
          {},
          '',
          window.location.pathname + (rest ? `?${rest}` : ''),
        );
      });
  }, []);

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const here = `${window.location.origin}${window.location.pathname}`;
      const res = await fetch(`${API_BASE}/payment/create-checkout-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // NOTE: falls back to destination as a stand-in trip id since
          // there's no trip database yet to have assigned a real one.
          trip_id: trip.id,
          destination: trip.destination,
          total_cost: totalCost,
          members: trip.members.map((m) => ({
            id: m.id,
            name: m.name,
            isCurrentUser: !!m.isCurrentUser,
          })),
          split: isSplitGroup,
          // Stripe wants a lowercase ISO code, but it must be the trip's
          // actual currency — hardcoding 'usd' charged e.g. a ¥-priced trip
          // as if the yen figures were dollars.
          currency: currency.toLowerCase(),
          success_url: here,
          cancel_url: here,
        }),
      });
      if (!res.ok) throw new Error(`Payment setup failed (${res.status})`);
      const data: { sessions?: CheckoutSessionInfo[] } = await res.json();
      const sessions = data.sessions ?? [];
      setMemberSessions(sessions);

      const mine = sessions.find((s) => s.is_current_user) ?? sessions[0];
      if (!mine) throw new Error('No payment session was created for you.');

      // Stripe's Checkout page is a full page navigation away from this
      // app, which wipes all in-memory React state on the way back — not
      // just `trip`, but also App.tsx's separate search/session state.
      // hotelSearchParams was already handled; flightSearchParams and
      // chatSessionId had the same problem, leaving "Change Flight" with an
      // empty origin/destination and the AI co-pilot on a fresh, contextless
      // server session after paying.
      sessionStorage.setItem(
        'pendingPaymentTrip',
        JSON.stringify({ trip, hotelSearchParams, flightSearchParams, chatSessionId }),
      );

      // Hand off to Stripe's hosted checkout page for the current user's
      // own share (or the full amount, in "Pay Individual" mode).
      window.location.href = mine.checkout_url;
    } catch (err: any) {
      setError(err.message ?? 'Failed to start payment');
      setIsProcessing(false);
    }
  };

  const copyLink = async (session: CheckoutSessionInfo) => {
    try {
      await navigator.clipboard.writeText(session.checkout_url);
      setCopiedMemberId(session.member_id);
      setTimeout(
        () =>
          setCopiedMemberId((cur) => (cur === session.member_id ? null : cur)),
        2000,
      );
    } catch {
      setError('Could not copy link — copy it manually from the browser.');
    }
  };

  const checkStatus = async (session: CheckoutSessionInfo) => {
    setCheckingStatusFor(session.member_id);
    try {
      const res = await fetch(
        `${API_BASE}/payment/session-status/${session.session_id}`,
      );
      if (!res.ok) throw new Error(`Could not check status (${res.status})`);
      const data: { payment_status: string } = await res.json();
      setPaidStatus((prev) => ({
        ...prev,
        [session.member_id]: data.payment_status === 'paid',
      }));
    } catch (err: any) {
      setError(err.message ?? 'Failed to check payment status');
    } finally {
      setCheckingStatusFor(null);
    }
  };

  const sessionFor = (memberId: string) =>
    memberSessions.find((s) => s.member_id === memberId);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f8f9fa] text-[#191c1d] flex flex-col items-center pt-8 pb-16 px-4 md:px-12">
      {/* Header Section */}
      <header className="w-full max-w-6xl mb-8 flex items-center">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-[#e7e8e9] transition-colors text-[#424754] mr-4 cursor-pointer"
          title="Back to Itinerary"
        >
          <span className="material-symbols-outlined text-[24px]">
            arrow_back
          </span>
        </button>
        <h1 className="font-semibold text-2xl md:text-3xl text-[#191c1d]">
          Finalize & Pay
        </h1>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        {/* Left Column: Receipt List */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 md:p-8 border border-[#e1e3e4]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-xl text-[#191c1d]">
                Trip Summary
              </h2>
              <span className="text-xs font-semibold bg-[#e7e8e9] text-[#424754] px-3.5 py-1 rounded-full">
                {/* Was: destination.includes('Tokyo') ? 'Tokyo Exploration' :
                    'Summer in Kyoto' — i.e. every non-Tokyo trip in the world
                    was labelled "Summer in Kyoto". */}
                {trip.title || trip.destination}
              </span>
            </div>

            {/* Itemized List */}
            <div className="flex flex-col gap-3">
              {lineItems.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center justify-between p-3.5 hover:bg-[#f8f9fa] rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[#001a42] shrink-0">
                      <span className="material-symbols-outlined text-[22px]">
                        {line.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#191c1d]">
                        {line.label}
                      </p>
                      <p className="text-xs text-[#727785]">{line.detail}</p>
                    </div>
                  </div>
                  <p className="text-base font-semibold text-[#191c1d]">
                    {money(line.amount)}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-8 pt-6 border-t border-[#e1e3e4] flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-[#727785] uppercase tracking-wider">
                  Total Trip Cost
                </p>
                <p className="text-[11px] text-[#727785] mt-0.5">
                  Estimated — includes taxes & fees where known
                </p>
              </div>
              <p className="font-bold text-3xl md:text-4xl text-[#191c1d]">
                {money(totalCost)}
              </p>
            </div>
          </div>

          {/* AI Note / Insight */}
          <div className="bg-[#f8f9fa] p-5 rounded-2xl flex items-start gap-3.5 border border-[#c2c6d6]/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#d8e2ff]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="material-symbols-outlined text-[#0058be] text-[22px] relative z-10">
              auto_awesome
            </span>
            <p className="text-xs md:text-sm text-[#424754] leading-relaxed relative z-10">
              {trip.budget
                ? `Your stated budget is ${money(trip.budget * numTravelers)} for the group. This plan comes to ${money(totalCost)}, or ${money(perPersonShare)} each when split evenly among ${numTravelers} ${numTravelers === 1 ? 'traveler' : 'travelers'}.`
                : `This plan comes to ${money(totalCost)}, or ${money(perPersonShare)} each when split evenly among ${numTravelers} ${numTravelers === 1 ? 'traveler' : 'travelers'}.`}
            </p>
          </div>
        </section>

        {/* Right Column: Payment & Splitting */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 md:p-8 border border-[#e1e3e4] sticky top-24">
            <h3 className="font-semibold text-xl text-[#191c1d] mb-5">
              Payment Options
            </h3>

            {/* Toggle */}
            <div className="bg-[#f3f4f5] rounded-full p-1 flex mb-6">
              <button
                onClick={() => setIsSplitGroup(false)}
                disabled={isProcessing}
                className={`flex-1 py-2 px-3 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                  !isSplitGroup
                    ? 'bg-white shadow-xs text-[#191c1d]'
                    : 'text-[#727785] hover:text-[#191c1d]'
                }`}
              >
                Pay Individual
              </button>
              <button
                onClick={() => setIsSplitGroup(true)}
                disabled={isProcessing}
                className={`flex-1 py-2 px-3 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
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
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold text-[#727785] uppercase tracking-wider">
                    Dividing evenly by {numTravelers}
                  </p>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="text-[11px] font-semibold text-[#0058be] hover:text-[#2170e4] cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">person_add</span>
                    Invite
                  </button>
                </div>

                {trip.members.map((member) => {
                  const session = sessionFor(member.id);
                  const paid = paidStatus[member.id] ?? member.hasPaid;
                  return (
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
                            {paid && (
                              <span className="text-[10px] bg-[#6cf8bb]/40 text-[#006c49] px-1.5 py-0.5 rounded font-medium">
                                Paid
                              </span>
                            )}
                          </p>
                          {/* Non-current-user members with a live session get
                              a share/check-status affordance, since we can't
                              charge their card ourselves in this session. */}
                          {!member.isCurrentUser && session && !paid && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={() => copyLink(session)}
                                className="text-[11px] text-[#0058be] hover:underline cursor-pointer"
                              >
                                {copiedMemberId === member.id
                                  ? 'Link copied!'
                                  : 'Copy payment link'}
                              </button>
                              <span className="text-[#c2c6d6]">•</span>
                              <button
                                onClick={() => checkStatus(session)}
                                disabled={checkingStatusFor === member.id}
                                className="text-[11px] text-[#727785] hover:text-[#191c1d] hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {checkingStatusFor === member.id
                                  ? 'Checking...'
                                  : 'Check status'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#191c1d]">
                        {money(perPersonShare)}
                      </p>
                    </div>
                  );
                })}

                {/* Unfilled seats — travelersCount minus real, joined members.
                    Each is just an entry point into the invite modal, not a
                    fabricated person; the pax count itself isn't editable
                    from here, only who fills the existing seats. */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <button
                    key={`empty-slot-${i}`}
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-[#c2c6d6] text-left hover:border-[#0058be] hover:bg-[#d8e2ff]/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#c2c6d6] flex items-center justify-center text-[#727785] shrink-0">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                      </div>
                      <p className="text-sm font-medium text-[#727785]">
                        Invite traveler
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#727785]">
                      {money(perPersonShare)}
                    </p>
                  </button>
                ))}

                <InviteFriendsModal
                  isOpen={isInviteModalOpen}
                  onClose={() => setIsInviteModalOpen(false)}
                  members={trip.members}
                  currentUserId={trip.members.find((m) => m.isCurrentUser)?.id ?? ''}
                  tripId={trip.id}
                  maxMembers={numTravelers}
                  onAddMember={(member) => onUpdateMembers([...trip.members, member])}
                  onRemoveMember={(memberId) => onUpdateMembers(trip.members.filter((m) => m.id !== memberId))}
                />
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-xl text-xs text-[#ba1a1a]">
                {error}
              </div>
            )}

            {/* CTA */}
            {isPaidSuccess ? (
              <div className="p-4 bg-[#6cf8bb]/20 border border-[#6cf8bb] rounded-2xl text-center animate-in zoom-in-95 duration-300">
                <span className="material-symbols-outlined text-[#006c49] text-[36px] mb-1">
                  check_circle
                </span>
                <h4 className="font-bold text-base text-[#006c49]">
                  Payment Confirmed!
                </h4>
                <p className="text-xs text-[#00714d] mt-1">
                  Your share is paid via Stripe. Share the payment links above
                  with the rest of the group to collect theirs.
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
                      <span className="material-symbols-outlined animate-spin text-[20px]">
                        progress_activity
                      </span>
                      <span>Redirecting to Stripe...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">
                        lock
                      </span>
                      <span>
                        {isSplitGroup
                          ? `Confirm & Pay Your Share (${money(perPersonShare)})`
                          : `Confirm & Pay Full (${money(totalCost)})`}
                      </span>
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-[#727785] mt-3 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    shield
                  </span>
                  Secure checkout powered by Stripe
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};