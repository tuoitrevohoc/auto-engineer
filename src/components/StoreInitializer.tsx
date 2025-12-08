'use client';

import { useDataStore } from '@/store/dataStore';
import { useEffect, useRef } from 'react';

export function StoreInitializer() {
  const initialized = useRef(false);
  
  useEffect(() => {
    if (!initialized.current) {
      useDataStore.getState().init();
      initialized.current = true;
    }
  }, []);

  return null;
}
