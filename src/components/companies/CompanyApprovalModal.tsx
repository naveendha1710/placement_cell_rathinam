import React, { useState } from 'react';
import { Company } from '../../types/database';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CompanyApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onApprove: (reason?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onSubmitApproval: () => Promise<void>;
}

export const CompanyApprovalModal: React.FC<CompanyApprovalModalProps> = ({
  isOpen,
  onClose,
  company,
  onApprove,
  onReject,
  onSubmitApproval,
}) => {
  const { user, canApprove } = useAuth();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingMode, setIsRejectingMode] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!company) return null;

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

  const handleSubmitForApprovalAction = async () => {
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
      title={`Company Approval Workflow — ${company.name}`}
      subtitle={`Current Status: ${company.approval_status.toUpperCase()}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Status Info Box */}
        <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-700">Approval State:</span>
            <span className="font-bold text-zinc-900 uppercase">{company.approval_status}</span>
          </div>

          {company.approval_status === 'rejected' && company.rejection_reason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1 font-bold">
                <AlertCircle className="h-3.5 w-3.5" /> Rejection Reason:
              </div>
              <p>{company.rejection_reason}</p>
            </div>
          )}

          {company.approval_status === 'approved' && company.approved_at && (
            <p className="text-xs text-emerald-700 font-medium">
              Approved by Placement Cell on {new Date(company.approved_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Action Controls */}
        {canApprove ? (
          <div className="space-y-4 pt-2">
            {!isRejectingMode ? (
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleApproveAction}
                  disabled={processing || company.approval_status === 'approved'}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{company.approval_status === 'approved' ? 'Company Approved ✓' : 'Approve Company Now'}</span>
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
                  placeholder="Specify why this company was rejected..."
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
        ) : (company.approval_status === 'draft' || company.approval_status === 'rejected') ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p className="text-xs text-amber-900 font-medium">
              This company profile is currently in <span className="font-bold">{company.approval_status}</span> state. Submit it to Placement Cell for verification.
            </p>
            <Button
              className="w-full gap-2"
              onClick={handleSubmitForApprovalAction}
              disabled={processing}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit for Approval</span>
            </Button>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 text-center py-2">
            {company.approval_status === 'approved' 
              ? 'This company is fully approved and ready for attaching job offers.' 
              : 'Waiting for Placement Coordinator review.'}
          </p>
        )}
      </div>
    </Modal>
  );
};
