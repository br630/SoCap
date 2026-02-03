import { googleCalendarService, BusyTime } from './googleCalendarService';
import { prisma } from '../lib/prisma';

// Types
export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface RankedTimeSlot extends TimeSlot {
  score: number;
  reasons: string[];
}

export interface AvailabilityParams {
  userIds: string[];
  startDate: Date;
  endDate: Date;
  minDurationMinutes: number;
  preferences?: {
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
    preferWeekends?: boolean;
    avoidEarlyMorning?: boolean; // Before 9am
    avoidLateNight?: boolean; // After 9pm
    preferredDays?: number[]; // 0-6, Sunday = 0
  };
}

export interface AvailabilityResult {
  slots: RankedTimeSlot[];
  participantsChecked: number;
  participantsWithCalendar: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    id?: string;
    summary?: string;
    start: string;
    end: string;
  }>;
}

/**
 * Availability Service
 * Finds common free times across multiple users' calendars
 */
export class AvailabilityService {
  /**
   * Find available time slots for multiple users
   */
  async findAvailability(params: AvailabilityParams): Promise<AvailabilityResult> {
    const {
      userIds,
      startDate,
      endDate,
      minDurationMinutes,
      preferences = {},
    } = params;

    // Get busy times for all users who have connected calendars
    const busyTimesPerUser: BusyTime[][] = [];
    let participantsWithCalendar = 0;

    for (const userId of userIds) {
      try {
        const isConnected = await googleCalendarService.isConnected(userId);
        if (!isConnected) continue;

        participantsWithCalendar++;

        const primaryCalendarId = await googleCalendarService.getPrimaryCalendarId(userId);
        if (!primaryCalendarId) continue;

        const busyTimes = await googleCalendarService.getBusyTimes(
          userId,
          [primaryCalendarId],
          startDate,
          endDate
        );

        const userBusy = busyTimes[primaryCalendarId] || [];
        busyTimesPerUser.push(userBusy);
      } catch (error) {
        console.error(`Error getting busy times for user ${userId}:`, error);
        // Continue with other users
      }
    }

    // If no calendars are connected, return empty slots with all working hours
    if (participantsWithCalendar === 0) {
      return {
        slots: this.generateDefaultSlots(startDate, endDate, minDurationMinutes, preferences),
        participantsChecked: userIds.length,
        participantsWithCalendar: 0,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    }

    // Merge all busy times
    const allBusyTimes = this.mergeBusyTimes(busyTimesPerUser.flat());

    // Find free slots
    const freeSlots = this.findFreeSlots(startDate, endDate, allBusyTimes, minDurationMinutes);

    // Rank slots by preferences
    const rankedSlots = this.rankSlots(freeSlots, preferences);

    // Return top 5 slots
    return {
      slots: rankedSlots.slice(0, 5),
      participantsChecked: userIds.length,
      participantsWithCalendar,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  /**
   * Check for calendar conflicts
   */
  async getConflicts(
    userId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<ConflictResult> {
    try {
      const isConnected = await googleCalendarService.isConnected(userId);
      if (!isConnected) {
        return { hasConflict: false, conflicts: [] };
      }

      // Build datetime range
      const dateStr = date.toISOString().split('T')[0];
      const startDateTime = new Date(`${dateStr}T${startTime}:00`);
      const endDateTime = new Date(`${dateStr}T${endTime}:00`);

      // Get events for the time range
      const events = await googleCalendarService.getEvents(
        userId,
        'primary',
        startDateTime,
        endDateTime
      );

      if (events.length === 0) {
        return { hasConflict: false, conflicts: [] };
      }

      const conflicts = events.map((event) => ({
        id: event.id || undefined,
        summary: event.summary || undefined,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
      }));

      return {
        hasConflict: true,
        conflicts,
      };
    } catch (error) {
      console.error('Error checking conflicts:', error);
      // Return no conflicts if we can't check
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * Merge overlapping busy times
   */
  private mergeBusyTimes(busyTimes: BusyTime[]): BusyTime[] {
    if (busyTimes.length === 0) return [];

    // Sort by start time
    const sorted = [...busyTimes].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const merged: BusyTime[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (new Date(current.start) <= new Date(last.end)) {
        // Overlapping - extend the end time if needed
        last.end = new Date(Math.max(
          new Date(last.end).getTime(),
          new Date(current.end).getTime()
        )).toISOString();
      } else {
        // No overlap - add as new busy period
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Find free time slots between busy times
   */
  private findFreeSlots(
    startDate: Date,
    endDate: Date,
    busyTimes: BusyTime[],
    minDurationMinutes: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentTime = new Date(startDate);

    // Define working hours (9am - 9pm)
    const workingHours = { start: 9, end: 21 };

    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      // Find free time before this busy period
      while (currentTime < busyStart && currentTime < endDate) {
        const slotStart = this.adjustToWorkingHours(currentTime, workingHours);
        
        if (slotStart >= endDate) break;
        
        // Find the end of this potential slot
        let slotEnd = new Date(slotStart);
        slotEnd.setHours(workingHours.end, 0, 0, 0);

        // Constrain to busy start or end date
        if (slotEnd > busyStart) slotEnd = new Date(busyStart);
        if (slotEnd > endDate) slotEnd = new Date(endDate);

        const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / 60000;

        if (durationMinutes >= minDurationMinutes) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            durationMinutes,
          });
        }

        // Move to next day
        currentTime = new Date(slotStart);
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(workingHours.start, 0, 0, 0);
      }

      // Move past busy period
      if (busyEnd > currentTime) {
        currentTime = new Date(busyEnd);
      }
    }

    // Check for free time after last busy period
    while (currentTime < endDate) {
      const slotStart = this.adjustToWorkingHours(currentTime, workingHours);
      
      if (slotStart >= endDate) break;

      let slotEnd = new Date(slotStart);
      slotEnd.setHours(workingHours.end, 0, 0, 0);

      if (slotEnd > endDate) slotEnd = new Date(endDate);

      const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / 60000;

      if (durationMinutes >= minDurationMinutes) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          durationMinutes,
        });
      }

      // Move to next day
      currentTime = new Date(slotStart);
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(workingHours.start, 0, 0, 0);
    }

    return slots;
  }

  /**
   * Adjust time to working hours
   */
  private adjustToWorkingHours(
    time: Date,
    workingHours: { start: number; end: number }
  ): Date {
    const adjusted = new Date(time);
    
    if (adjusted.getHours() < workingHours.start) {
      adjusted.setHours(workingHours.start, 0, 0, 0);
    } else if (adjusted.getHours() >= workingHours.end) {
      // Move to next day
      adjusted.setDate(adjusted.getDate() + 1);
      adjusted.setHours(workingHours.start, 0, 0, 0);
    }

    return adjusted;
  }

  /**
   * Rank time slots by preferences
   */
  private rankSlots(
    slots: TimeSlot[],
    preferences: AvailabilityParams['preferences']
  ): RankedTimeSlot[] {
    const prefs = preferences || {};

    return slots
      .map((slot) => {
        let score = 50; // Base score
        const reasons: string[] = [];

        const hour = slot.start.getHours();
        const dayOfWeek = slot.start.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Time of day preferences
        if (prefs.preferredTimeOfDay === 'morning' && hour >= 9 && hour < 12) {
          score += 20;
          reasons.push('Morning time (preferred)');
        } else if (prefs.preferredTimeOfDay === 'afternoon' && hour >= 12 && hour < 17) {
          score += 20;
          reasons.push('Afternoon time (preferred)');
        } else if (prefs.preferredTimeOfDay === 'evening' && hour >= 17 && hour < 21) {
          score += 20;
          reasons.push('Evening time (preferred)');
        }

        // Default: prefer afternoon
        if (!prefs.preferredTimeOfDay && hour >= 14 && hour < 18) {
          score += 10;
          reasons.push('Prime afternoon time');
        }

        // Avoid early morning
        if (prefs.avoidEarlyMorning !== false && hour < 9) {
          score -= 30;
          reasons.push('Early morning (less convenient)');
        }

        // Avoid late night
        if (prefs.avoidLateNight !== false && hour >= 21) {
          score -= 30;
          reasons.push('Late evening (less convenient)');
        }

        // Weekend preferences
        if (prefs.preferWeekends && isWeekend) {
          score += 15;
          reasons.push('Weekend (preferred)');
        } else if (!prefs.preferWeekends && !isWeekend) {
          score += 5;
          reasons.push('Weekday');
        }

        // Preferred days
        if (prefs.preferredDays?.includes(dayOfWeek)) {
          score += 15;
          reasons.push('Preferred day');
        }

        // Bonus for longer slots
        if (slot.durationMinutes >= 180) {
          score += 10;
          reasons.push('Extended availability');
        }

        return {
          ...slot,
          score,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Generate default time slots when no calendars are connected
   */
  private generateDefaultSlots(
    startDate: Date,
    endDate: Date,
    minDurationMinutes: number,
    preferences: AvailabilityParams['preferences']
  ): RankedTimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(startDate);

    while (current < endDate) {
      // Morning slot (10am - 12pm)
      const morningStart = new Date(current);
      morningStart.setHours(10, 0, 0, 0);
      const morningEnd = new Date(current);
      morningEnd.setHours(12, 0, 0, 0);

      if (morningEnd <= endDate && morningStart >= startDate) {
        slots.push({
          start: morningStart,
          end: morningEnd,
          durationMinutes: 120,
        });
      }

      // Afternoon slot (2pm - 5pm)
      const afternoonStart = new Date(current);
      afternoonStart.setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(current);
      afternoonEnd.setHours(17, 0, 0, 0);

      if (afternoonEnd <= endDate && afternoonStart >= startDate) {
        slots.push({
          start: afternoonStart,
          end: afternoonEnd,
          durationMinutes: 180,
        });
      }

      // Evening slot (6pm - 8pm)
      const eveningStart = new Date(current);
      eveningStart.setHours(18, 0, 0, 0);
      const eveningEnd = new Date(current);
      eveningEnd.setHours(20, 0, 0, 0);

      if (eveningEnd <= endDate && eveningStart >= startDate) {
        slots.push({
          start: eveningStart,
          end: eveningEnd,
          durationMinutes: 120,
        });
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    // Filter by minimum duration and rank
    return this.rankSlots(
      slots.filter((s) => s.durationMinutes >= minDurationMinutes),
      preferences
    ).slice(0, 5);
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();
