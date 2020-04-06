import {
  BUCKET_SIZE,
  BucketResultInterface,
  BucketStatsInterface,
  CompletedRunRecord,
  CompletedRunRecordInterface,
  RoutineStatsInterface,
  RUN_STATUS,
  RunRecordInterface,
  StatsResultInterface,
  StatusResultInterface,
  SummaryResultInterface,
  TIMELINE_EVENT_STATUS,
  TimelineEvent,
  TimelineEventInterface,
} from '@asserted/models';
import { last } from 'lodash';
import { DateTime, Duration } from 'luxon';

enum LOWER_BUCKET_SIZE {
  DAY = 'day',
  HOUR = 'hour',
  MINUTE = 'minute',
}

/**
 * @class
 */
export class Stats {
  /**
   * Initialize bucket
   * @param {Date} start
   * @param {Date} end
   * @return {StatsResultInterface}
   */
  static initializeBucket(start: Date, end: Date): StatsResultInterface {
    return {
      start,
      end,
      runs: {
        availability: 0,
        passes: 0,
        failures: 0,
        total: 0,
      },
      tests: {
        availability: 0,
        passes: 0,
        failures: 0,
        total: 0,
      },
    };
  }

  /**
   * Update bucket
   * @param {StatsResultInterface} bucket
   * @param {RunRecordInterface} runRecord
   * @returns {StatsResultInterface}
   */
  static updateBucket(bucket: StatsResultInterface, runRecord: RunRecordInterface | CompletedRunRecordInterface): StatsResultInterface {
    const { status, stats } = runRecord;

    if (!stats) {
      return bucket;
    }

    const { passes, failures } = stats;

    bucket.runs.passes += status === RUN_STATUS.PASSED ? 1 : 0;
    bucket.runs.failures += status === RUN_STATUS.PASSED ? 0 : 1;
    bucket.runs.total += 1;
    bucket.runs.availability = bucket.runs.passes / bucket.runs.total;

    bucket.tests.passes += passes;
    bucket.tests.failures += failures;
    bucket.tests.total += passes + failures;
    bucket.tests.availability = bucket.tests.passes / bucket.tests.total;

    return bucket;
  }

  /* eslint-disable max-params */
  /**
   * Increment bucket
   * @param {StatsResultInterface[]} buckets
   * @param {StatsResultInterface} bucket
   * @param {DateTime} bucketStart
   * @param {DateTime} bucketEnd
   * @param {number} bucketSize
   * @param {boolean} relative
   * @returns {{ bucket: StatsResultInterface, bucketEnd: DateTime, bucketStart: DateTime }}
   */
  static incrementBucket(
    buckets: StatsResultInterface[],
    bucket: StatsResultInterface,
    bucketStart: DateTime,
    bucketEnd: DateTime,
    bucketSize: BUCKET_SIZE,
    relative: boolean
  ): { bucket: StatsResultInterface; bucketEnd: DateTime; bucketStart: DateTime } {
    buckets.push(bucket);

    const bucketDuration = relative
      ? Duration.fromObject({ [bucketSize]: 1 }).shiftTo(Stats.shiftDown(bucketSize))
      : Duration.fromObject({ [bucketSize]: 1 });

    bucketStart = relative ? bucketStart.plus(bucketDuration) : bucketStart.plus(bucketDuration).startOf(bucketSize);
    bucketEnd = relative ? bucketEnd.plus(bucketDuration) : bucketEnd.plus(bucketDuration).endOf(bucketSize);
    bucket = Stats.initializeBucket(bucketStart.toJSDate(), bucketEnd.toJSDate());

    return {
      bucket,
      bucketStart,
      bucketEnd,
    };
  }
  /* eslint-enable max-params */

  /**
   * Only works for non-relative bucketing
   * @param {StatsResultInterface[]} buckets
   * @param {RunRecordInterface} runRecord
   * @param {BUCKET_SIZE} bucketSize
   * @returns {StatsResultInterface[]}
   */
  static incrementBuckets(buckets: StatsResultInterface[], runRecord: CompletedRunRecordInterface, bucketSize: BUCKET_SIZE): StatsResultInterface[] {
    if (!runRecord.completedAt) {
      throw new Error('Cannot include incomplete record in buckets');
    }

    // Buckets exist and latest record is in the last bucket
    if (buckets.length > 0 && buckets[0].end > runRecord.completedAt) {
      Stats.updateBucket(buckets[0], runRecord);
      return buckets;
    }

    // Otherwise there either are no buckets, or the record is out of range of the latest
    const { bucketStart, bucketEnd } = Stats.initializeBoundaries(
      DateTime.fromJSDate(runRecord.completedAt).toUTC(),
      DateTime.fromJSDate(runRecord.completedAt).toUTC(),
      bucketSize,
      false
    );

    let bucket = Stats.initializeBucket(bucketStart.toUTC().toJSDate(), bucketEnd.toUTC().toJSDate());
    bucket = Stats.updateBucket(bucket, runRecord);
    buckets.push(bucket);
    return buckets;
  }

  /**
   * Get next lower appropriate bucket size
   * @param {BUCKET_SIZE} bucketSize
   * @returns {LOWER_BUCKET_SIZE}
   */
  static shiftDown(bucketSize: BUCKET_SIZE): LOWER_BUCKET_SIZE {
    switch (bucketSize) {
      case BUCKET_SIZE.MONTH:
        return LOWER_BUCKET_SIZE.DAY;
      case BUCKET_SIZE.WEEK:
        return LOWER_BUCKET_SIZE.DAY;
      case BUCKET_SIZE.DAY:
        return LOWER_BUCKET_SIZE.HOUR;
      case BUCKET_SIZE.HOUR:
        return LOWER_BUCKET_SIZE.MINUTE;
      default: {
        throw new Error(`unexpected bucket size: ${bucketSize}`);
      }
    }
  }

  /**
   * Initialize range start and end, bucket start and end
   * @param {DateTime} start
   * @param {DateTime} end
   * @param {BUCKET_SIZE} bucketSize
   * @param {boolean} relative
   * @returns {{}}
   */
  static initializeBoundaries(
    start: DateTime,
    end: DateTime,
    bucketSize: BUCKET_SIZE,
    relative: boolean
  ): { rangeStart: DateTime; rangeEnd: DateTime; bucketStart: DateTime; bucketEnd: DateTime } {
    const bucketCount = Math.ceil(end.diff(start).as(bucketSize));
    const rangeDuration = Duration.fromObject({ [bucketSize]: bucketCount }).shiftTo(Stats.shiftDown(bucketSize));

    const rangeEnd = relative ? end.endOf(Stats.shiftDown(bucketSize)) : end.endOf(bucketSize);
    const rangeStart = relative
      ? rangeEnd
          .minus(rangeDuration)
          .plus({ [Stats.shiftDown(bucketSize)]: 1 })
          .startOf(Stats.shiftDown(bucketSize))
      : start.startOf(bucketSize);

    const bucketStart = rangeStart;

    const bucketDuration = relative
      ? Duration.fromObject({ [bucketSize]: 1 }).shiftTo(Stats.shiftDown(bucketSize))
      : Duration.fromObject({ [bucketSize]: 1 });

    const bucketEnd = bucketStart
      .plus(bucketDuration)
      .minus({ [relative ? Stats.shiftDown(bucketSize) : bucketSize]: 1 })
      .endOf(relative ? Stats.shiftDown(bucketSize) : bucketSize);

    return {
      rangeStart,
      rangeEnd,
      bucketStart,
      bucketEnd,
    };
  }

  /**
   * Bucket records
   * @param {RunRecordInterface[]} runRecords
   * @param {BucketStatsInterface} bucketStats
   * @param {boolean} relative
   * @returns {BucketStatsInterface}
   */
  static bucketRecords(
    runRecords: RunRecordInterface[],
    bucketStats: Pick<BucketStatsInterface, 'bucketSize' | 'start' | 'end'>,
    relative = false
  ): BucketResultInterface {
    runRecords = [...runRecords];

    const { bucketSize } = bucketStats;

    const start = DateTime.fromJSDate(bucketStats.start).toUTC();
    const end = DateTime.fromJSDate(bucketStats.end).toUTC();

    const initialBoundaries = Stats.initializeBoundaries(start, end, bucketSize, relative);

    const { rangeStart, rangeEnd } = initialBoundaries;
    let { bucketStart, bucketEnd } = initialBoundaries;

    let overallBucket = Stats.initializeBucket(rangeStart.toJSDate(), rangeEnd.toJSDate());

    const buckets = [] as StatsResultInterface[];

    let currentRecord = runRecords.shift();
    let bucket = Stats.initializeBucket(bucketStart.toJSDate(), bucketEnd.toJSDate());

    while (bucketStart < rangeEnd) {
      // Have a record for the current bucket
      while (currentRecord) {
        const completedAt = DateTime.fromJSDate(currentRecord.completedAt as Date).toUTC();

        if (completedAt >= bucketStart && completedAt < bucketEnd) {
          bucket = Stats.updateBucket(bucket, currentRecord);
          overallBucket = Stats.updateBucket(overallBucket, currentRecord);
        }

        // Keep the current record, but time for a new bucket
        if (completedAt >= bucketEnd) {
          break;
        }

        // Record is in the current bucket, or preceding the current bucket, drop it and check the next
        currentRecord = runRecords.shift();
      }

      ({ bucket, bucketEnd, bucketStart } = Stats.incrementBucket(buckets, bucket, bucketStart, bucketEnd, bucketSize, relative));
    }

    return {
      start: rangeStart.toJSDate(),
      end: rangeEnd.toJSDate(),
      bucketSize,
      overall: overallBucket,
      buckets,
    };
  }

  /**
   * Get timeline event status
   * @param {RunRecordInterface} runRecord
   * @returns {TIMELINE_EVENT_STATUS}
   */
  static getTimelineEventStatus(runRecord: RunRecordInterface | CompletedRunRecordInterface): TIMELINE_EVENT_STATUS {
    const { stats } = runRecord;

    if (!stats) {
      return TIMELINE_EVENT_STATUS.UNKNOWN;
    }

    const { passes, failures } = stats;

    if (passes > 0 && failures > 0) {
      return TIMELINE_EVENT_STATUS.IMPAIRED;
    }
    if (passes === 0 && failures > 0) {
      return TIMELINE_EVENT_STATUS.DOWN;
    }
    if (passes > 0 && failures === 0) {
      return TIMELINE_EVENT_STATUS.UP;
    }
    return TIMELINE_EVENT_STATUS.UNKNOWN;
  }

  /**
   * Initialize timeline event
   * @param {RunRecordInterface} runRecord
   * @returns {TimelineEvent}
   */
  static initializeTimelineEvent(runRecord: RunRecordInterface | CompletedRunRecordInterface): TimelineEventInterface {
    return new TimelineEvent({
      start: runRecord.completedAt as Date,
      end: runRecord.completedAt as Date,
      records: [new CompletedRunRecord(runRecord)],
      status: Stats.getTimelineEventStatus(runRecord),
    });
  }

  /**
   * Increment timeline event
   * @param {TimelineEvent[]} events
   * @param {RunRecordInterface} runRecord
   * @returns {TimelineEvent[]}
   */
  static incrementTimelineEvent(
    events: TimelineEventInterface[],
    runRecord: RunRecordInterface | CompletedRunRecordInterface
  ): TimelineEventInterface[] {
    if (!runRecord.completedAt) {
      throw new Error('Cannot include incomplete record in timeline');
    }

    if (events.length === 0) {
      events.push(Stats.initializeTimelineEvent(runRecord));
      return events;
    }

    const status = Stats.getTimelineEventStatus(runRecord);

    if (events[0].end >= runRecord.completedAt) {
      // Ignore out-of-order events
      return events;
    }

    events[0].end = runRecord.completedAt as Date;

    if (events[0].status !== status) {
      events.unshift(
        new TimelineEvent({
          start: runRecord.completedAt as Date,
          end: runRecord.completedAt as Date,
          status: Stats.getTimelineEventStatus(runRecord),
          records: [new CompletedRunRecord(runRecord)],
        })
      );
    } else {
      events[0].records.unshift(new CompletedRunRecord(runRecord));
    }

    return events;
  }

  /**
   * Bucket records
   * @param {RunRecordInterface[]} runRecords
   * @param {Date} start
   * @param {Date} end
   * @returns {BucketStatsInterface}
   */
  static timelineRecords(runRecords: RunRecordInterface[], start: Date, end: Date): TimelineEventInterface[] {
    runRecords = [...runRecords];

    const rangeStart = DateTime.fromJSDate(start).toUTC();
    const rangeEnd = DateTime.fromJSDate(end).toUTC();

    const timelineEvents = [] as TimelineEventInterface[];

    let currentRecord = runRecords.shift();

    while (currentRecord) {
      const completedAt = DateTime.fromJSDate(currentRecord.completedAt as Date).toUTC();

      if (completedAt >= rangeStart && completedAt < rangeEnd) {
        Stats.incrementTimelineEvent(timelineEvents, currentRecord);
      }

      // Done
      if (completedAt >= rangeEnd) {
        break;
      }

      // Check the next record
      currentRecord = runRecords.shift();
    }

    return timelineEvents;
  }

  /**
   * Summary of events
   * @param {RunRecordInterface[]} runRecords
   * @param {Date} curDate
   * @returns {SummaryResultInterface}
   */
  static summarizeRecords(runRecords: RunRecordInterface[], curDate = DateTime.utc().toJSDate()): SummaryResultInterface {
    runRecords = [...runRecords];

    // Want to select enough runs for any month and/or 30 days
    const start = DateTime.fromJSDate(curDate).minus({ days: 31 });
    const end = DateTime.fromJSDate(curDate);

    const events = Stats.timelineRecords(runRecords, start.toJSDate(), end.toJSDate());

    const latestStatus = last(events) || null;

    // Assumes the timeline is in ascending order
    const latestDowntime = events.reduce((result, event) => {
      if (event.status !== TIMELINE_EVENT_STATUS.UP && event.status !== TIMELINE_EVENT_STATUS.UNKNOWN) {
        return event;
      }

      return result;
    }, null as null | TimelineEventInterface);

    const dayBucket = last(
      Stats.bucketRecords(
        runRecords,
        {
          bucketSize: BUCKET_SIZE.DAY,
          start: end.minus({ day: 1 }).toJSDate(),
          end: end.toJSDate(),
        },
        true
      ).buckets
    ) as StatsResultInterface;
    const weekBucket = last(
      Stats.bucketRecords(
        runRecords,
        {
          bucketSize: BUCKET_SIZE.WEEK,
          start: end.minus({ week: 1 }).toJSDate(),
          end: end.toJSDate(),
        },
        true
      ).buckets
    ) as StatsResultInterface;
    const monthBucket = last(
      Stats.bucketRecords(
        runRecords,
        {
          bucketSize: BUCKET_SIZE.MONTH,
          start: end.minus({ months: 1 }).toJSDate(),
          end: end.toJSDate(),
        },
        true
      ).buckets
    ) as StatsResultInterface;

    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
      latestStatus,
      latestDowntime,
      day: dayBucket,
      week: weekBucket,
      month: monthBucket,
    };
  }

  /**
   * Get current stats for a routine
   * @param {RunRecordInterface[]} runRecords
   * @param {Date} curDate
   * @returns {RoutineStatsInterface}
   */
  static current(runRecords: RunRecordInterface[], curDate = DateTime.utc().toJSDate()): RoutineStatsInterface {
    // Want to select enough runs for any month and/or 30 days
    const start = DateTime.fromJSDate(curDate).minus({ week: 1 });
    const end = DateTime.fromJSDate(curDate);

    const timeline = Stats.timelineRecords(runRecords, start.toJSDate(), end.toJSDate());
    const { buckets, bucketSize } = Stats.bucketRecords(
      runRecords,
      {
        bucketSize: BUCKET_SIZE.HOUR,
        start: start.toJSDate(),
        end: end.toJSDate(),
      },
      true
    );

    const records = runRecords.map((runRecord) => new CompletedRunRecord(runRecord));
    const latestRecord = last(records) || null;

    return {
      latestRecord,
      timeline,
      buckets,
      bucketSize,
    };
  }

  /**
   * Get latest status
   * @param {RunRecordInterface[]} runRecords
   * @param {Date} curDate
   * @returns {StatsResultInterface}
   */
  static status(runRecords: RunRecordInterface[], curDate = DateTime.utc().toJSDate()): StatusResultInterface {
    const start = DateTime.fromJSDate(curDate).minus({ day: 1 });
    const end = DateTime.fromJSDate(curDate);

    const events = Stats.timelineRecords(runRecords, start.toJSDate(), end.toJSDate());

    const [latestStatus] = events;

    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
      latestStatus,
      records: runRecords.reverse(),
    };
  }
}
