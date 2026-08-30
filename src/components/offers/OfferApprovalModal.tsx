import React, { useState } from 'react';
import { Offer } from '../../types/database';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OfferApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onSubmitApproval: () => Promise<void>;
}

export const OfferApprovalModal: React.FC<OfferApprovalModalProps> = ({
  isOpen,
  onClose,
  offer,
  onApprove,
  onReject,
  onSubmitApproval,
}) => {
  const { canApprove } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingMode, setIsRejectingMode] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!offer) return null;

  const handleApproveAction = async () => {
    setProcessing(true);
    try {
      await onApprove();
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    setProcessing(true);
    try {
      await onReject(rejectionReason.trim());
      setIsRejectingMode(false);
      setRejectionReason('');
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const isApproved = offer.approval_status === 'approved';
  const isRejected = offer.approval_status === 'rejected';
  const isPending = offer.approval_status === 'pending_approval' || offer.approval_status === 'draft';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsRejectingMode(false);
        onClose();
      }}
      title={`Offer Approval Workflow — ${offer.company?.name || 'Company Offer'}`}
      subtitle={`CTC: ${offer.ctc_lpa ? `${offer.ctc_lpa} LPA` : 'TBD'} | Current Status: ${offer.approval_status.replace('_', ' ').toUpperCase()}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-600">Approval State:</span>
            <span className={`font-extrabold px-2.5 py-0.5 rounded uppercase text-[11px] ${
              isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              isRejected ? 'bg-rose-100 text-rose-800 border border-rose-300' :
              'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {offer.approval_status.replace('_', ' ')}
            </span>
          </div>

          {isApproved && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">Offer Approved & Verified</p>
                <p className="text-[11px] text-emerald-700">
                  {offer.approved_at ? `Approved on ${new Date(offer.approved_at).toLocaleDateString()}. Registration Matrix unlocked.` : 'Offer is verified.'}
                </p>
              </div>
            </div>
          )}

          {isRejected && offer.rejection_reason && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-rose-600" /> Rejection Reason:
              </div>
              <p className="text-[11px] text-rose-700 pl-5">{offer.rejection_reason}</p>
            </div>
          )}
        </div>

        {isApproved ? (
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : canApprove && (isPending || isRejected) ? (
          <div className="space-y-4 pt-2">
            {!isRejectingMode ? (
              <div className="flex items-center gap-3">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                  onClick={handleApproveAction}
                  disabled={processing}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isRejected ? 'Re-Approve Offer' : 'Approve Offer'}</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50 gap-2 font-bold"
                  onClick={() => setIsRejectingMode(true)}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRejectAction} className="space-y-3 border-t pt-3">
                <Input
                  label="Rejection Reason *"
                  placeholder="Specify why this offer was rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsRejectingMode(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive" size="sm" disabled={processing}>
                    Confirm Rejection
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
