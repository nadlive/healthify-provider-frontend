import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, addDays, addWeeks } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../src/store/hooks';
import * as appointmentActions from '../../src/store/slices/appointmentSlice';
import { COLORS } from '../../constants/colors';
import { info } from '../../components/PlatformAlert';

const START_HOUR = 0;
const END_HOUR = 24;
const INTERVAL_MINUTES = 30;

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayTime = `${displayHour}:${minute
        .toString()
        .padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      slots.push({ time: timeString, display: displayTime });
    }
  }
  return slots;
};

const getWeekDays = (weekStart, timezone = 'UTC') => {
  const days = [];
  const shortDayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayInTz = formatTz(day, 'EEE yyyy-MM-dd', { timeZone: timezone });
    const parts = dayInTz.split(' ');
    const fullDate = parts.slice(1).join(' ');

    days.push({
      date: day,
      dayName: shortDayNames[i],
      dayNumber: formatTz(day, 'd', { timeZone: timezone }),
      fullDate: fullDate,
    });
  }
  return days;
};

const TimeSlot = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { loading, timeSlots: fetchedTimeSlots } = useAppSelector(
    (state) => state.appointment,
  );
  const { timezone } = useAppSelector((state) => state.settings);
  const selectedTimezone = timezone || 'UTC';
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [timeSlotIds, setTimeSlotIds] = useState(new Map());
  const [bookedSlots, setBookedSlots] = useState(new Set());
  const [highlightedCell, setHighlightedCell] = useState(null);
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const headerScrollRef = useRef(null);
  const contentScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);

  const cellHeight = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    const numberOfRows = timeSlots.length;
    const headerHeight = 60;
    const dayHeaderHeight = 30;
    const tabBarHeight = 52;
    const padding = 20;

    const availableHeight =
      screenHeight - headerHeight - dayHeaderHeight - tabBarHeight - padding;

    const calculatedHeight = availableHeight / numberOfRows;
    const minHeight = 25;
    const maxHeight = 50;

    return Math.max(
      minHeight,
      Math.min(maxHeight, Math.floor(calculatedHeight)),
    );
  }, [timeSlots.length]);

  const getWeekStartInTimezone = useCallback((timezone) => {
    const now = new Date();
    const zonedNow = toZonedTime(now, timezone);
    const weekStartInTz = startOfWeek(zonedNow, { weekStartsOn: 1 });
    return weekStartInTz;
  }, []);

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getWeekStartInTimezone(selectedTimezone),
  );

  const fetchTimeSlotsForWeek = async (weekStart) => {
    const dayBefore = formatTz(addDays(weekStart, -1), 'yyyy-MM-dd', {
      timeZone: selectedTimezone,
    });
    const dayAfter = formatTz(addDays(weekStart, 7), 'yyyy-MM-dd', {
      timeZone: selectedTimezone,
    });

    try {
      const result = await dispatch(
        appointmentActions.fetchTimeSlots({
          fromDate: dayBefore,
          toDate: dayAfter,
        }),
      );
      if (result.type?.endsWith('/rejected')) {
        throw new Error(result.error?.message || 'Failed to fetch');
      }
    } catch {
      info('Error', 'Failed to fetch time slots. Please try again.');
      return;
    }
  };

  useEffect(() => {
    if (!fetchedTimeSlots || fetchedTimeSlots.length === 0) {
      setSelectedSlots(new Set());
      setTimeSlotIds(new Map());
      setBookedSlots(new Set());
      return;
    }

    const newSelectedSlots = new Set();
    const newTimeSlotIds = new Map();
    const newBookedSlots = new Set();

    fetchedTimeSlots.forEach((timeSlot) => {
      if (!timeSlot.start_time || !timeSlot.end_time) return;

      const utcDate = new Date(timeSlot.start_time);
      const zonedDate = toZonedTime(utcDate, selectedTimezone);
      const dateStr = formatTz(zonedDate, 'yyyy-MM-dd', {
        timeZone: selectedTimezone,
      });
      const startTime = formatTz(zonedDate, 'HH:mm', {
        timeZone: selectedTimezone,
      });
      const slotKey = `${dateStr}-${startTime}`;

      newSelectedSlots.add(slotKey);
      if (timeSlot.time_slot_id || timeSlot.id) {
        newTimeSlotIds.set(slotKey, timeSlot.time_slot_id || timeSlot.id);
      }
      if (timeSlot.is_booked === true) {
        newBookedSlots.add(slotKey);
      }
    });

    setSelectedSlots(newSelectedSlots);
    setTimeSlotIds(newTimeSlotIds);
    setBookedSlots(newBookedSlots);
  }, [fetchedTimeSlots, selectedTimezone]);

  useEffect(() => {
    const newWeekStart = getWeekStartInTimezone(selectedTimezone);
    setCurrentWeekStart(newWeekStart);
  }, [selectedTimezone, getWeekStartInTimezone]);

  useEffect(() => {
    fetchTimeSlotsForWeek(currentWeekStart);
  }, [currentWeekStart, selectedTimezone]);

  useFocusEffect(
    useCallback(() => {
      fetchTimeSlotsForWeek(currentWeekStart);
    }, [currentWeekStart, selectedTimezone]),
  );

  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const newWeekStart = addWeeks(prev, -1);
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
      contentScrollRef.current?.scrollTo({ x: 0, animated: false });
      return newWeekStart;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const newWeekStart = addWeeks(prev, 1);
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
      contentScrollRef.current?.scrollTo({ x: 0, animated: false });
      return newWeekStart;
    });
  };

  const toggleSlot = async (day, time) => {
    const slotKey = `${day}-${time}`;
    const newSelectedSlots = new Set(selectedSlots);
    const newTimeSlotIds = new Map(timeSlotIds);

    const [hours, minutes] = time.split(':').map(Number);
    const [year, month, date] = day.split('-').map(Number);

    const timeString = `${year}-${month.toString().padStart(2, '0')}-${date
      .toString()
      .padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:00`;
    const zonedDate = new Date(timeString);

    const utcDate = fromZonedTime(zonedDate, selectedTimezone);
    const endUtcDate = new Date(
      utcDate.getTime() + INTERVAL_MINUTES * 60 * 1000,
    );

    const startTimeISO = utcDate.toISOString();
    const endTimeISO = endUtcDate.toISOString();

    if (newSelectedSlots.has(slotKey)) {
      const timeSlotId = newTimeSlotIds.get(slotKey);
      if (timeSlotId) {
        try {
          const result = await dispatch(
            appointmentActions.deleteTimeSlot(timeSlotId),
          );
          if (result.type?.endsWith('/rejected')) {
            throw new Error(result.error?.message || 'Failed to delete');
          }
          newTimeSlotIds.delete(slotKey);
        } catch (error) {
          info('Error', 'Failed to delete time slot. Please try again.');
          return;
        }
      }
      newSelectedSlots.delete(slotKey);
    } else {
      try {
        const result = await dispatch(
          appointmentActions.createTimeSlot({
            startTime: startTimeISO,
            endTime: endTimeISO,
          }),
        );
        if (result.type?.endsWith('/rejected')) {
          throw new Error(result.error?.message || 'Failed to create');
        }
        const response = result.payload;
        const createdTimeSlotId =
          response?.time_slot_id ||
          response?.id ||
          response?.data?.time_slot_id;
        if (createdTimeSlotId) {
          newTimeSlotIds.set(slotKey, createdTimeSlotId);
        }

        newSelectedSlots.add(slotKey);
      } catch (error) {
        info('Error', 'Failed to create time slot. Please try again.');
        return;
      }
    }

    setSelectedSlots(newSelectedSlots);
    setTimeSlotIds(newTimeSlotIds);
  };

  const isSlotSelected = (day, time) => {
    return selectedSlots.has(`${day}-${time}`);
  };

  const isSlotBooked = (day, time) => {
    return bookedSlots.has(`${day}-${time}`);
  };

  const isTimeHighlighted = (time) => {
    return highlightedCell?.time === time;
  };

  const isDayHighlighted = (day) => {
    return highlightedCell?.day === day;
  };

  const currentWeekDays = getWeekDays(currentWeekStart, selectedTimezone);

  const isLoadingTimeSlots = loading && fetchedTimeSlots === undefined;

  if (isLoadingTimeSlots) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.logo} />
          <Text style={styles.loadingText}>Loading time slots...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekNavigation}>
        <TouchableOpacity style={styles.navButton} onPress={handlePreviousWeek}>
          <Ionicons name="chevron-back" size={24} color={COLORS.logo} />
        </TouchableOpacity>

        <View style={styles.weekInfo}>
          <Text style={styles.weekText}>
            {formatTz(currentWeekDays[0].date, 'MMM d', {
              timeZone: selectedTimezone,
            })}{' '}
            -{' '}
            {formatTz(currentWeekDays[6].date, 'MMM d', {
              timeZone: selectedTimezone,
            })}
          </Text>
          <View style={styles.timezoneContainer}>
            <Ionicons
              name="time-outline"
              size={14}
              color={COLORS.error}
              style={styles.timezoneIcon}
            />
            <Text style={styles.timezoneText}>{selectedTimezone}</Text>
            <Text style={styles.timezoneNote}>
              {' '}
              • All times displayed in this timezone
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/timezone')}
              style={styles.changeLink}
            >
              <Text style={styles.changeLinkText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.navButton} onPress={handleNextWeek}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.logo} />
        </TouchableOpacity>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.fixedHeaderRow}>
          <View style={styles.fixedTimeColumnHeader}>
            <View style={[styles.timeHeader, { height: cellHeight + 8 }]} />
          </View>

          <ScrollView
            ref={headerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.headerScrollContainer}
            scrollEnabled={false}
          >
            <View style={styles.daysHeaderContainer}>
              {currentWeekDays.map((day, dayIndex) => {
                const isHighlighted = isDayHighlighted(day.fullDate);
                return (
                  <View
                    key={dayIndex}
                    style={[
                      styles.dayHeader,
                      { height: cellHeight + 8 },
                      isHighlighted && styles.dayHeaderHighlighted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        isHighlighted && styles.dayNameHighlighted,
                      ]}
                    >
                      {day.dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        isHighlighted && styles.dayNumberHighlighted,
                      ]}
                    >
                      {day.dayNumber}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <ScrollView
          ref={verticalScrollRef}
          showsVerticalScrollIndicator={true}
          style={styles.verticalScrollView}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          <View style={styles.gridWrapper}>
            <View style={styles.fixedTimeColumn}>
              {timeSlots.map((slot, index) => {
                const isHighlighted = isTimeHighlighted(slot.time);
                return (
                  <View
                    key={index}
                    style={[
                      styles.timeCell,
                      { height: cellHeight },
                      isHighlighted && styles.timeCellHighlighted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        isHighlighted && styles.timeTextHighlighted,
                      ]}
                    >
                      {slot.display}
                    </Text>
                  </View>
                );
              })}
            </View>

            <ScrollView
              ref={contentScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scrollContainer}
              onScroll={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                headerScrollRef.current?.scrollTo({
                  x: offsetX,
                  animated: false,
                });
              }}
              scrollEventThrottle={16}
            >
              <View style={styles.daysContainer}>
                {currentWeekDays.map((day, dayIndex) => (
                  <View key={dayIndex} style={styles.dayColumn}>
                    {timeSlots.map((slot, slotIndex) => {
                      const isSelected = isSlotSelected(
                        day.fullDate,
                        slot.time,
                      );
                      const isBooked = isSlotBooked(day.fullDate, slot.time);
                      return (
                        <TouchableOpacity
                          key={slotIndex}
                          style={[
                            styles.slotCell,
                            { height: cellHeight },
                            isSelected && styles.slotCellSelected,
                            isBooked && styles.slotCellBooked,
                          ]}
                          onPress={() => {
                            if (!isBooked) {
                              if (isSelected) {
                                setHighlightedCell(null);
                              } else {
                                setHighlightedCell({
                                  day: day.fullDate,
                                  time: slot.time,
                                });
                              }
                              toggleSlot(day.fullDate, slot.time);
                            }
                          }}
                          disabled={isBooked}
                        >
                          {isBooked ? (
                            <Ionicons
                              name="lock-closed"
                              size={16}
                              color={COLORS.txt_secondary}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.slotText,
                                isSelected && styles.slotTextSelected,
                              ]}
                            >
                              {isSelected ? '✓' : ''}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_light,
    paddingTop: 5,
    paddingHorizontal: 5,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_dark,
  },
  navButton: {
    padding: 8,
  },
  weekInfo: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.txt_primary,
  },
  timezoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.bg_light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    flexWrap: 'wrap',
  },
  timezoneIcon: {
    marginRight: 4,
  },
  timezoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  timezoneNote: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.txt_secondary,
    fontStyle: 'italic',
  },
  changeLink: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  changeLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.logo,
    textDecorationLine: 'underline',
  },
  gridContainer: {
    flex: 1,
  },
  fixedHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg_dark,
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    paddingVertical: 8,
  },
  fixedTimeColumnHeader: {
    width: 65,
    backgroundColor: COLORS.bg_dark,
  },
  headerScrollContainer: {
    flex: 1,
  },
  daysHeaderContainer: {
    flexDirection: 'row',
  },
  verticalScrollView: {
    flex: 1,
  },
  gridWrapper: {
    flexDirection: 'row',
  },
  fixedTimeColumn: {
    width: 65,
    backgroundColor: COLORS.white,
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timeHeader: {
    borderRightWidth: 1,
    borderRightColor: COLORS.bg_dark,
    backgroundColor: COLORS.bg_dark,
    flex: 1,
  },
  timeCell: {
    justifyContent: 'center',
    paddingLeft: 5,
    borderRightWidth: 1,
    borderRightColor: COLORS.bg_dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_dark,
    backgroundColor: COLORS.white,
  },
  scrollContainer: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.txt_secondary,
  },
  timeCellHighlighted: {
    backgroundColor: COLORS.logo,
  },
  timeTextHighlighted: {
    color: COLORS.white,
    fontWeight: '700',
  },
  dayColumn: {
    width: 45,
    borderRightWidth: 1,
    borderRightColor: COLORS.bg_dark,
  },
  dayHeader: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg_dark,
    borderRightWidth: 1,
    borderRightColor: COLORS.bg_dark,
    paddingTop: 3,
    paddingBottom: 5,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.txt_primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.txt_primary,
    marginTop: 2,
  },
  dayHeaderHighlighted: {
    backgroundColor: COLORS.logo,
  },
  dayNameHighlighted: {
    color: COLORS.white,
  },
  dayNumberHighlighted: {
    color: COLORS.white,
  },
  slotCell: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_dark,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  slotCellSelected: {
    backgroundColor: COLORS.logo,
  },
  slotCellBooked: {
    backgroundColor: COLORS.bg_dark,
    opacity: 0.6,
  },
  slotText: {
    fontSize: 14,
    color: COLORS.txt_secondary,
  },
  slotTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg_light,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.txt_secondary,
  },
});

export default TimeSlot;
