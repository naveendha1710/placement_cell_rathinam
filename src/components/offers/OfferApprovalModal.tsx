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

  const handleSubmitAction = async () => {
    setProcessing(true);
    try {
      await onSubmitApproval();
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsRejectingMode(false);
        onClose();
      }}
      title={`Offer Approval Workflow — ${offer.company?.name || 'Company Offer'}`}
      subtitle={`CTC: ${offer.ctc_lpa} LPA | Status: ${offer.approval_status.toUpperCase()}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-700">Approval State:</span>
            <span className="font-bold text-zinc-900 uppercase">{offer.approval_status}</span>
          </div>

          {offer.approval_status === 'rejected' && offer.rejection_reason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1 font-bold">
                <AlertCircle className="h-3.5 w-3.5" /> Rejection Reason:
              </div>
              <p>{offer.rejection_reason}</p>
            </div>
          )}

          {offer.approval_status === 'approved' && offer.approved_at && (
            <p className="text-xs text-emerald-700 font-medium">
              Approved on {new Date(offer.approved_at).toLocaleDateString()}. Registration Matrix unlocked.
            </p>
          )}
        </div>

        {offer.approval_status === 'draft' || offer.approval_status === 'rejected' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p className="text-xs text-amber-900 font-medium">
              This offer is in <span className="font-bold">{offer.approval_status}</span> state. Submit it to Placement Cell for approval.
            </p>
            <Button
              className="w-full gap-2"
              onClick={handleSubmitAction}
              disabled={processing}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit Offer for Approval</span>
            </Button>
          </div>
        ) : offer.approval_status === 'pending_approval' && canApprove ? (
          <div className="space-y-4 pt-2">
            {!isRejectingMode ? (
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleApproveAction}
                  disabled={processing}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approve Offer</span>
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
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
          <p className="text-xs text-zinc-500 text-center py-2">
            {offer.approval_status === 'approved' 
              ? 'This offer is approved and active for student registration.' 
              : 'Waiting for Placement Coordinator review.'}
          </p>
        )}
      </div>
    </Modal>
  );
};
