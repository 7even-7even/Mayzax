import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as shiftService from './shift.service';
import { getShiftWindowForDate } from './shift.service';
import { getBusinessDateString, getShiftWindowText } from '@/utils/businessDate';
import { env } from '@/config/env';

export const getMyShift = asyncHandler(async (req: Request, res: Response) => {
  const cfg = await shiftService.resolveUserShiftConfig(req.user!.sub);
  const today = getBusinessDateString(new Date());
  const window = getShiftWindowForDate(today, cfg);
  res.json({
    success: true,
    data: {
      config: cfg,
      today: {
        businessDate: today,
        startAt: window.start,
        endAt: window.end,
      },
    },
  });
});

/**
 * GET /shifts/config  (no auth required)
 * Returns the system-wide business shift configuration from env.
 * Used by the frontend to match its shift-date calculations to the backend's.
 */
export const getShiftConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      startHour:   env.BUSINESS_SHIFT_START_HOUR,
      startMinute: env.BUSINESS_SHIFT_START_MINUTE,
      endHour:     env.BUSINESS_SHIFT_END_HOUR,
      endMinute:   env.BUSINESS_SHIFT_END_MINUTE,
      timezone:    env.BUSINESS_TIMEZONE,
      shiftWindowText: getShiftWindowText(),
      currentBusinessDate: getBusinessDateString(new Date()),
    },
  });
});
