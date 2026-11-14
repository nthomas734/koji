'use client';

import { createContext, useContext } from 'react';

// Whether this trip's generated map links go to Apple Maps (China trips) rather
// than Google. Set once at the top of a trip page; see lib/maps.ts.
const AppleMapsCtx = createContext(false);

export const AppleMapsProvider = AppleMapsCtx.Provider;
export const useAppleMaps = () => useContext(AppleMapsCtx);
