import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig ?? Constants.manifest;
const extra = (expoConfig as any)?.extra ?? {};
const flag = extra?.IAP_DEBUG;

export const IAP_DEBUG = __DEV__ || flag === true || flag === 'true' || flag === '1' || flag === 1;
