//InviteFriendsModal.tsx

import React, { useState } from 'react';
import { TripMember } from '../types';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TripMember[];
  currentUserId: string;
  tripId: string;
  // The trip's fixed headcount (set once in NewTripModal). Adding members
  // here can't exceed it — this modal only fills existing seats, it doesn't
  // change how many seats the trip has.
  maxMembers: number;
  onAddMember: (member: TripMember) => void;
  onRemoveMember: (memberId: string) => void;
}

// Deterministic mock avatar from a name — no upload/storage needed for a
// mock invite flow, just something visually distinct per person.
const avatarFor = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=d8e2ff&color=001a42&bold=true`;

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUserId,
  tripId,
  maxMembers,
  onAddMember,
  onRemoveMember,
}) => {
  const [name, setName] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  if (!isOpen) return null;

  const slotsRemaining = Math.max(0, maxMembers - members.length);
  const isFull = slotsRemaining <= 0;

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed || isFull) return;
    // Mock invite: no email/SMS actually goes out and no server-side invite
    // record is created — this just adds the member locally so Finalize &
    // Pay can split against them. A real invite flow would create a pending
    // member server-side and send them a join link instead.
    onAddMember({
      id: `member-${Date.now()}`,
      name: trimmed,
      avatar: avatarFor(trimmed),
      shareAmount: 0,
      hasPaid: false,
      isCurrentUser: false,
    });
    setName('');
  };

  const copyMockInviteLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?join=${tripId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions/insecure context) — the link
      // is still selectable/visible in the input below, so this isn't fatal.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e3132]/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden border border-[#e1e3e4]">
        <header className="flex justify-between items-center px-6 py-4 border-b border-[#e1e3e4]">
          <h2 className="font-semibold text-xl text-[#191c1d] m-0">Invite Friends</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-[#727785] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <div className="p-6 flex flex-col gap-5">
          {/* Mock shareable link */}
          <div>
            <p className="text-xs font-semibold text-[#727785] uppercase tracking-wider mb-2">
              Share a link
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={`${window.location.origin}${window.location.pathname}?join=${tripId}`}
                className="flex-1 bg-[#f3f4f5] border border-[#e1e3e4] rounded-full px-4 py-2 text-xs text-[#727785] truncate"
              />
              <button
                onClick={copyMockInviteLink}
                className="shrink-0 bg-[#0058be] text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#2170e4] transition-colors cursor-pointer"
              >
                {linkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-[#727785] mt-1.5">
              Demo link — sharing it won't actually add anyone. Add friends manually below.
            </p>
          </div>

          {/* Add by name (mock invite — no real email/SMS sent) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#727785] uppercase tracking-wider">
                Add a friend
              </p>
              <span className="text-[10px] font-medium text-[#727785]">
                {isFull
                  ? 'All seats filled'
                  : `${slotsRemaining} ${slotsRemaining === 1 ? 'seat' : 'seats'} left`}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder={isFull ? 'No seats left to fill' : "Friend's name"}
                disabled={isFull}
                className="flex-1 bg-white border border-[#e1e3e4] focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 rounded-full px-4 py-2 text-sm outline-none transition-all disabled:bg-[#f3f4f5] disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAdd}
                disabled={!name.trim() || isFull}
                className="shrink-0 bg-[#0058be] text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#2170e4] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {isFull && (
              <p className="text-[10px] text-[#727785] mt-1.5">
                This trip is set for {maxMembers} {maxMembers === 1 ? 'traveler' : 'travelers'}. Remove someone below to invite someone else instead.
              </p>
            )}
          </div>

          {/* Current members */}
          <div>
            <p className="text-xs font-semibold text-[#727785] uppercase tracking-wider mb-2">
              In this trip ({members.length}/{maxMembers})
            </p>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f9fa]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover border border-white shadow-2xs"
                    />
                    <span className="text-sm font-medium text-[#191c1d]">
                      {member.name}
                      {member.id === currentUserId && (
                        <span className="text-[#727785] font-normal"> (you)</span>
                      )}
                    </span>
                  </div>
                  {member.id !== currentUserId && (
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      className="text-[#727785] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 p-1.5 rounded-full transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#f3f4f5] text-[#191c1d] py-3 rounded-full font-semibold hover:bg-[#e7e8e9] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};