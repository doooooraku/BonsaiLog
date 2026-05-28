import { getAppExtra } from '@/src/core/appExtra';

const flag = getAppExtra().IAP_DEBUG;

export const IAP_DEBUG = __DEV__ || flag === true || flag === 'true' || flag === '1' || flag === 1;
