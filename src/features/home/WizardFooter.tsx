import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

export const WizardFooter = ({
  step,
  totalSteps,
  onClose,
  onBack,
  onNext,
  onConfirm,
  nextDisabled,
  backDisabled,
  confirmDisabled,
  confirming,
  confirmLabel = 'Import',
  confirmingLabel = 'Importing…',
}: {
  step: number;
  totalSteps: number;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onConfirm: () => void;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  confirmDisabled?: boolean;
  confirming?: boolean;
  confirmLabel?: string;
  confirmingLabel?: string;
}): React.JSX.Element => {
  return (
    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={onClose} className="mr-auto">
        Cancel
      </Button>
      {step > 1 && (
        <Button variant="outline" onClick={onBack} disabled={backDisabled}>
          Back
        </Button>
      )}
      {step < totalSteps ? (
        <Button onClick={onNext} disabled={nextDisabled}>
          Next
        </Button>
      ) : (
        <Button onClick={onConfirm} disabled={confirmDisabled}>
          {confirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {confirmingLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      )}
    </DialogFooter>
  );
};
