/** Platform fee added to USD shown to client (3.5%) */
export const PLATFORM_FEE_MULTIPLIER = 1.035;

/** Commission Synvora keeps from AED payout (1.75%) */
export const CLIENT_COMMISSION_RATE = 0.0175;

/** AED/USD fixed peg rate (Central Bank of the UAE) */
export const AED_USD_PEG = 3.6725;

/**
 * Business month start day.
 * The club operates past midnight, so orders placed after 00:00 on day N+1
 * belong to day N's session. This shifts the month filter window by 1 day:
 *   "January 2026" = Jan 2 00:00 → Feb 1 23:59 in Shopify timestamps.
 */
export const BUSINESS_MONTH_START_DAY = 2;
