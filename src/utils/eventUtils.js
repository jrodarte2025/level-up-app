/**
 * Utility functions for event sorting and filtering
 */

/**
 * Parse a time range string and extract the start time in minutes since midnight
 * @param {string} timeRange - Format like "10:00AM - 11:30AM" or "11:00AM - 2:00PM"
 * @returns {number} Minutes since midnight (e.g., 10:00AM = 600 minutes)
 */
export const getTimeMinutes = (timeRange) => {
  if (!timeRange) return 0;
  
  // Extract just the start time (before hyphen or en-dash)
  const startTime = timeRange.split(/[-–]/)[0]?.trim();
  if (!startTime) return 0;
  
  // Handle formats like "10:00AM" or "10:00 AM"
  let cleanTime = startTime;
  if (!/\s/.test(startTime) && /[AP]M$/i.test(startTime)) {
    // No space before AM/PM, add it
    cleanTime = startTime.replace(/([0-9]+:[0-9]+)([AP]M)/i, '$1 $2');
  }
  
  const parts = cleanTime.split(/\s+/);
  const timePart = parts[0];
  const period = parts[1]?.toUpperCase();
  
  const [hours, minutes = 0] = timePart.split(':').map(Number);
  
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  return hour24 * 60 + minutes;
};

/**
 * Filter events to show only upcoming events (today and future)
 * @param {Array} events - Array of event objects with date.seconds property
 * @returns {Array} Filtered events
 */
export const filterUpcomingEvents = (events) => {
  return events.filter(event => {
    // Filter out events that occurred yesterday or earlier
    const eventDate = new Date(event.date?.seconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });
};

/**
 * Sort events chronologically by date first, then by start time within the same day
 * @param {Array} events - Array of event objects
 * @returns {Array} Sorted events
 */
export const sortEventsByDateTime = (events) => {
  return events.sort((a, b) => {
    // Sort by date first
    const dateCompare = (a.date?.seconds || 0) - (b.date?.seconds || 0);
    if (dateCompare !== 0) return dateCompare;
    
    // If same date, sort by start time
    return getTimeMinutes(a.timeRange) - getTimeMinutes(b.timeRange);
  });
};

/**
 * Filter and sort events for display in upcoming events lists
 * @param {Array} events - Raw events array
 * @returns {Array} Filtered and sorted events
 */
export const processUpcomingEvents = (events) => {
  return sortEventsByDateTime(filterUpcomingEvents(events));
};