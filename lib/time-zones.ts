import { timeZonesNames } from "@vvo/tzdb";

export const TIME_ZONES = [...new Set(["UTC", ...timeZonesNames])].sort();
export const TIME_ZONE_SET = new Set(TIME_ZONES);
