// Shows the state of the processing and the progress of the processing

import React, { useEffect, useState } from 'react';
import { EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueueStore } from '@/stores/queueStore';

export const ProcessingDisplay = () => {
  const { status, actions } = useQueueStore();
  const [clickedOutside, setClickedOutside] = useState(false);

  useEffect(() => {
    if (status.isProcessing) {
      setClickedOutside(false);
    }
  }, [status.isProcessing]);

  if (!status.maximized) {
    if (!status.isProcessing || status.minimized) return null;
  } else {
    if (!status.isProcessing) return null;
  }

  return (
    <>
      <div
        className={cn(
          'fixed top-0 left-0 w-full h-full bg-[#000000] bg-opacity-30 flex flex-col items-center justify-center backdrop-blur-sm z-[5]',
          '',
          (clickedOutside) ? 'hidden' : '',
        )}
        onClick={() => setClickedOutside(true)}
      ></div>
      <div className='fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center z-[6] pointer-events-none'>
        <div className='relative bg-background-primary p-4 rounded-m shadow-lg flex flex-col items-center gap-2 pointer-events-auto w-80'>
          <div className='absolute top-2 right-2 flex flex-col items-center justify-center gap-1'>
            <button
              aria-label='Toggle minimize'
              onClick={() => actions.toggleMinimized()}
              className='w-fit h-fit flex items-center justify-center cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className="lds-ellipsis text-accent opacity-50"><div></div><div></div><div></div><div></div></div>
          <div className='text-text-normal'>{status.message}</div>
          <div className='w-full h-2 bg-background-secondary rounded-full'>
            <div
              className='bg-background-secondary-alt h-full rounded-full transition-all duration-300'
              style={{ width: `${status.progress || 50}%` }}
            ></div>
          </div>
        </div>
      </div>
    </>
  );
};