import { BUCKET_SIZE, CompletedRunRecordInterface, RUN_STATUS, RUN_TIMEOUT_TYPE, RUN_TYPE, TIMELINE_EVENT_STATUS } from '@asserted/models';
import { expect } from 'chai';
import { DateTime } from 'luxon';

import { BucketStatsInterface, Stats } from '../../src/services/stats';

describe('stats bucket unit tests', () => {
  it('initialize bucket', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');

    const bucket = Stats.initializeBucket(curDate.toJSDate(), curDate.plus({ days: 1 }).toJSDate());

    const expected = {
      start: curDate.toJSDate(),
      end: curDate.plus({ days: 1 }).toJSDate(),
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

    expect(bucket).to.eql(expected);
  });

  it('update bucket with failure', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');
    const runRecord = {
      id: 'rs-run-id',
      status: RUN_STATUS.FAILED,
      projectId: 'project-id',
      routineId: 'routine-id',
      runId: 'rn-run-id',
      type: RUN_TYPE.MANUAL,
      runDurationMs: 0,
      testDurationMs: 0,
      console: null,
      failType: null,
      timeoutType: null,
      error: null,
      stats: {
        duration: null,
        end: undefined,
        suites: 3,
        tests: 5,
        passes: 3,
        pending: 0,
        failures: 2,
        start: curDate.toJSDate(),
      },
      results: [],
      createdAt: curDate.toJSDate(),
      updatedAt: curDate.toJSDate(),
      completedAt: curDate.toJSDate(),
    };

    const bucket = Stats.initializeBucket(curDate.toJSDate(), curDate.plus({ days: 1 }).toJSDate());

    const updatedBucket = Stats.updateBucket(bucket, runRecord);
    const expected = {
      start: curDate.toJSDate(),
      end: curDate.plus({ days: 1 }).toJSDate(),
      runs: {
        availability: 0,
        passes: 0,
        failures: 1,
        total: 1,
      },
      tests: {
        availability: 0.6,
        passes: 3,
        failures: 2,
        total: 5,
      },
    };

    expect(updatedBucket).to.eql(expected);
  });

  it('update bucket with success', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');
    const runRecord = {
      id: 'rs-run-id',
      status: RUN_STATUS.PASSED,
      projectId: 'project-id',
      routineId: 'routine-id',
      runId: 'rn-run-id',
      type: RUN_TYPE.MANUAL,
      runDurationMs: 0,
      testDurationMs: 0,
      console: null,
      failType: null,
      timeoutType: null,
      error: null,
      stats: {
        duration: null,
        end: undefined,
        suites: 3,
        tests: 5,
        passes: 3,
        pending: 0,
        failures: 0,
        start: curDate.toJSDate(),
      },
      results: [],
      createdAt: curDate.toJSDate(),
      updatedAt: curDate.toJSDate(),
      completedAt: curDate.toJSDate(),
    };

    const bucket = Stats.initializeBucket(curDate.toJSDate(), curDate.plus({ days: 1 }).toJSDate());

    const updatedBucket = Stats.updateBucket(bucket, runRecord);
    const expected = {
      start: curDate.toJSDate(),
      end: curDate.plus({ days: 1 }).toJSDate(),
      runs: {
        availability: 1,
        passes: 1,
        failures: 0,
        total: 1,
      },
      tests: {
        availability: 1,
        passes: 3,
        failures: 0,
        total: 3,
      },
    };

    expect(updatedBucket).to.eql(expected);
  });

  it('process records in range', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');

    const bucketSatsRequest = {
      bucketSize: BUCKET_SIZE.WEEK,
      start: curDate.toJSDate(),
      end: curDate.plus({ days: 10 }).toJSDate(),
    };

    const defaultRunRecord = {
      id: 'rs-run-id',
      status: RUN_STATUS.PASSED,
      projectId: 'project-id',
      routineId: 'routine-id',
      runId: 'rn-run-id',
      type: RUN_TYPE.MANUAL,
      runDurationMs: 0,
      testDurationMs: 0,
      console: null,
      failType: null,
      timeoutType: null,
      error: null,
      results: [],
      stats: {
        duration: null,
        end: undefined,
        suites: 3,
        tests: 5,
        passes: 3,
        pending: 0,
        failures: 0,
        start: curDate.toJSDate(),
      },
      createdAt: curDate.toJSDate(),
      updatedAt: curDate.toJSDate(),
    };

    const runRecords: CompletedRunRecordInterface[] = [
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ day: 1 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ day: 2 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ day: 3 }).toJSDate(),
      },
    ];

    const buckets = Stats.bucketRecords(runRecords, bucketSatsRequest);
    const expected = {
      end: new Date('2018-01-14T23:59:59.999Z'),
      start: new Date('2018-01-01T00:00:00.000Z'),
      bucketSize: 'week',
      overall: {
        end: new Date('2018-01-14T23:59:59.999Z'),
        start: new Date('2018-01-01T00:00:00.000Z'),
        runs: {
          availability: 1,
          passes: 3,
          failures: 0,
          total: 3,
        },
        tests: {
          availability: 1,
          passes: 9,
          failures: 0,
          total: 9,
        },
      },
      buckets: [
        {
          end: new Date('2018-01-07T23:59:59.999Z'),
          start: new Date('2018-01-01T00:00:00.000Z'),
          runs: {
            availability: 1,
            passes: 3,
            failures: 0,
            total: 3,
          },
          tests: {
            availability: 1,
            passes: 9,
            failures: 0,
            total: 9,
          },
        },
        {
          end: new Date('2018-01-14T23:59:59.999Z'),
          start: new Date('2018-01-08T00:00:00.000Z'),
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
        },
      ],
    };

    expect(buckets).to.eql(expected);
  });

  it('process records with some outside range', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z').toUTC();

    const bucketSatsRequest = {
      bucketSize: BUCKET_SIZE.WEEK,
      start: curDate.toJSDate(),
      end: curDate.plus({ days: 10 }).toJSDate(),
    };

    const defaultRunRecord = {
      id: 'rs-run-id',
      status: RUN_STATUS.PASSED,
      projectId: 'project-id',
      routineId: 'routine-id',
      runId: 'rn-run-id',
      type: RUN_TYPE.MANUAL,
      runDurationMs: 0,
      testDurationMs: 0,
      console: null,
      failType: null,
      timeoutType: null,
      error: null,
      results: [],
      stats: {
        duration: null,
        end: undefined,
        suites: 3,
        tests: 5,
        passes: 3,
        pending: 0,
        failures: 0,
        start: curDate.toJSDate(),
      },
      createdAt: curDate.toJSDate(),
      updatedAt: curDate.toJSDate(),
    };

    const runRecords: CompletedRunRecordInterface[] = [
      {
        ...defaultRunRecord,
        completedAt: curDate.minus({ week: 1 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ day: 2 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ week: 3 }).toJSDate(),
      },
    ];

    const buckets = Stats.bucketRecords(runRecords, bucketSatsRequest);
    const expected = {
      end: new Date('2018-01-14T23:59:59.999Z'),
      start: new Date('2018-01-01T00:00:00.000Z'),
      bucketSize: 'week',
      overall: {
        end: new Date('2018-01-14T23:59:59.999Z'),
        start: new Date('2018-01-01T00:00:00.000Z'),
        runs: {
          availability: 1,
          passes: 1,
          failures: 0,
          total: 1,
        },
        tests: {
          availability: 1,
          passes: 3,
          failures: 0,
          total: 3,
        },
      },
      buckets: [
        {
          end: new Date('2018-01-07T23:59:59.999Z'),
          start: new Date('2018-01-01T00:00:00.000Z'),
          runs: {
            availability: 1,
            passes: 1,
            failures: 0,
            total: 1,
          },
          tests: {
            availability: 1,
            passes: 3,
            failures: 0,
            total: 3,
          },
        },
        {
          end: new Date('2018-01-14T23:59:59.999Z'),
          start: new Date('2018-01-08T00:00:00.000Z'),
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
        },
      ],
    };

    expect(buckets).to.eql(expected);
  });

  it('process no records', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z').toUTC();

    const bucketSatsRequest: BucketStatsInterface = {
      bucketSize: BUCKET_SIZE.WEEK,
      start: curDate.toJSDate(),
      end: curDate.plus({ days: 10 }).toJSDate(),
    };

    const runRecords: CompletedRunRecordInterface[] = [];

    const buckets = Stats.bucketRecords(runRecords, bucketSatsRequest);
    const expected = {
      end: new Date('2018-01-14T23:59:59.999Z'),
      start: new Date('2018-01-01T00:00:00.000Z'),
      bucketSize: 'week',
      overall: {
        end: new Date('2018-01-14T23:59:59.999Z'),
        start: new Date('2018-01-01T00:00:00.000Z'),
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
      },
      buckets: [
        {
          end: new Date('2018-01-07T23:59:59.999Z'),
          start: new Date('2018-01-01T00:00:00.000Z'),
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
        },
        {
          end: new Date('2018-01-14T23:59:59.999Z'),
          start: new Date('2018-01-08T00:00:00.000Z'),
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
        },
      ],
    };

    expect(buckets).to.eql(expected);
  });

  it('absolute buckets - month', () => {
    const curDate = DateTime.fromISO('2018-01-03T00:00:00.000Z').toUTC();

    const bucketStatsRequest: BucketStatsInterface = {
      bucketSize: BUCKET_SIZE.MONTH,
      start: curDate.toJSDate(),
      end: curDate.plus({ month: 1 }).toJSDate(),
    };

    const runRecords: CompletedRunRecordInterface[] = [];

    const buckets = Stats.bucketRecords(runRecords, bucketStatsRequest, false);

    const expected = {
      start: curDate.startOf('month').toJSDate(),
      end: curDate.plus({ month: 1 }).endOf('month').toJSDate(),
      bucketSize: 'month',
      overall: {
        start: curDate.startOf('month').toJSDate(),
        end: curDate.plus({ month: 1 }).endOf('month').toJSDate(),
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
      },
      buckets: [
        {
          start: curDate.startOf('month').toJSDate(),
          end: curDate.endOf('month').toJSDate(),
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
        },
        {
          start: curDate.plus({ month: 1 }).startOf('month').toJSDate(),
          end: curDate.plus({ month: 1 }).endOf('month').toJSDate(),
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
        },
      ],
    };

    expect(buckets).to.eql(expected);
  });

  it('increment month bucket - relative', () => {
    const curDate = DateTime.fromISO('2018-01-04T00:00:00.000Z').toUTC();
    const buckets = [];
    const inputStart = curDate.startOf('day');
    const inputEnd = curDate.plus({ days: 29 }).endOf('day');

    expect(Math.round(inputEnd.diff(inputStart).as('days'))).to.eql(30);
    const { bucketStart, bucketEnd } = Stats.incrementBucket(buckets as any, {} as any, inputStart, inputEnd, BUCKET_SIZE.MONTH, true);

    expect(bucketStart.toISO()).to.eql('2018-02-03T00:00:00.000Z');
    expect(Math.round(bucketEnd.diff(bucketStart).as('days'))).to.eql(30);
    expect(bucketEnd.toISO()).to.eql('2018-03-04T23:59:59.999Z');
  });

  it('increment month bucket - absolute', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z').toUTC();
    const buckets = [];
    const inputStart = curDate;
    const inputEnd = curDate.endOf('month');
    const { bucketStart, bucketEnd } = Stats.incrementBucket(buckets as any, {} as any, inputStart, inputEnd, BUCKET_SIZE.MONTH, false);

    expect(bucketStart.toISO()).to.eql('2018-02-01T00:00:00.000Z');
    expect(bucketEnd.toISO()).to.eql('2018-02-28T23:59:59.999Z');
  });

  it('initialize buckets - relative', () => {
    const curDate = DateTime.fromISO('2018-01-02T00:00:00.000Z').toUTC();
    const inputStart = curDate;
    const inputEnd = curDate.plus({ days: 35 });

    const { rangeStart, rangeEnd, bucketStart, bucketEnd } = Stats.initializeBoundaries(inputStart, inputEnd, BUCKET_SIZE.MONTH, true);

    expect(rangeStart.toISO()).to.eql('2017-12-09T00:00:00.000Z'); // 60 days before
    expect(rangeEnd.toISO()).to.eql('2018-02-06T23:59:59.999Z');
    expect(Math.round(rangeEnd.diff(rangeStart).as('days'))).to.eql(60);
    expect(bucketStart.toISO()).to.eql('2017-12-09T00:00:00.000Z');
    expect(bucketEnd.toISO()).to.eql('2018-01-07T23:59:59.999Z');
    expect(Math.round(bucketEnd.diff(bucketStart).as('days'))).to.eql(30);

    const { bucketStart: nextBucketStart, bucketEnd: nextBucketEnd } = Stats.incrementBucket(
      [] as any,
      {} as any,
      bucketStart,
      bucketEnd,
      BUCKET_SIZE.MONTH,
      true
    );

    expect(nextBucketStart.toISO()).to.eql('2018-01-08T00:00:00.000Z');
    expect(nextBucketEnd.toISO()).to.eql(rangeEnd.toISO());
  });

  it('initialize buckets - absolute', () => {
    const curDate = DateTime.fromISO('2018-01-02T00:00:00.000Z').toUTC();
    const inputStart = curDate;
    const inputEnd = curDate.plus({ days: 35 });

    const { rangeStart, rangeEnd, bucketStart, bucketEnd } = Stats.initializeBoundaries(inputStart, inputEnd, BUCKET_SIZE.MONTH, false);

    expect(rangeStart.toISO()).to.eql('2018-01-01T00:00:00.000Z');
    expect(rangeEnd.toISO()).to.eql('2018-02-28T23:59:59.999Z');
    expect(Math.round(rangeEnd.diff(rangeStart).as('month'))).to.eql(2);
    expect(bucketStart.toISO()).to.eql('2018-01-01T00:00:00.000Z');
    expect(bucketEnd.toISO()).to.eql('2018-01-31T23:59:59.999Z');
    expect(Math.round(bucketEnd.diff(bucketStart).as('month'))).to.eql(1);

    const { bucketStart: nextBucketStart, bucketEnd: nextBucketEnd } = Stats.incrementBucket(
      [] as any,
      {} as any,
      bucketStart,
      bucketEnd,
      BUCKET_SIZE.MONTH,
      false
    );

    expect(nextBucketStart.toISO()).to.eql('2018-02-01T00:00:00.000Z');
    expect(nextBucketEnd.toISO()).to.eql(rangeEnd.toISO());
  });

  it('relative buckets - month', () => {
    const curDate = DateTime.fromISO('2018-01-03T00:00:00.000Z').toUTC();

    const bucketStatsRequest: BucketStatsInterface = {
      bucketSize: BUCKET_SIZE.MONTH,
      start: curDate.toJSDate(),
      end: curDate.plus({ month: 1 }).toJSDate(),
    };

    const runRecords: CompletedRunRecordInterface[] = [];

    const buckets = Stats.bucketRecords(runRecords, bucketStatsRequest, true);

    const expected = {
      start: new Date('2017-12-06T00:00:00.000Z'),
      end: curDate.plus({ month: 1 }).endOf('day').toJSDate(),
      bucketSize: 'month',
      overall: {
        start: new Date('2017-12-06T00:00:00.000Z'),
        end: curDate.plus({ month: 1 }).endOf('day').toJSDate(),
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
      },
      buckets: [
        {
          start: new Date('2017-12-06T00:00:00.000Z'),
          end: new Date('2018-01-04T23:59:59.999Z'),
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
        },
        {
          start: new Date('2018-01-05T00:00:00.000Z'),
          end: curDate.plus({ month: 1 }).endOf('day').toJSDate(),
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
        },
      ],
    };

    expect(buckets).to.eql(expected);
  });

  it('increment empty buckets', () => {
    const curDate = DateTime.fromISO('2018-01-02T00:00:00.000Z').toUTC();

    const defaultRunRecord = {
      id: 'foo-id',
      status: RUN_STATUS.CREATED,
      routineId: 'routine-id',
      projectId: 'project-id',
      events: [],
      runId: 'foo-id',
      type: RUN_TYPE.MANUAL,
      stats: null,
      console: null,
      failType: null,
      testDurationMs: null,
      runDurationMs: null,
      completedAt: null,
    };

    const defaultStats = {
      pending: 0,
      tests: 1,
      suites: 1,
      start: undefined,
      end: undefined,
      duration: null,
    };

    const buckets = [] as any;

    const failingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ minutes: 5 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    const updatedBuckets = Stats.incrementBuckets(buckets, failingRecord, BUCKET_SIZE.DAY);

    expect(updatedBuckets).to.eql([
      {
        start: new Date('2018-01-02T00:00:00.000Z'),
        end: new Date('2018-01-02T23:59:59.999Z'),
        runs: {
          availability: 0,
          passes: 0,
          failures: 1,
          total: 1,
        },
        tests: {
          availability: 0,
          passes: 0,
          failures: 1,
          total: 1,
        },
      },
    ]);
  });

  it('increment existing buckets', () => {
    const curDate = DateTime.fromISO('2018-01-02T00:00:00.000Z').toUTC();

    const defaultRunRecord = {
      id: 'foo-id',
      status: RUN_STATUS.CREATED,
      routineId: 'routine-id',
      projectId: 'project-id',
      events: [],
      runId: 'foo-id',
      type: RUN_TYPE.MANUAL,
      stats: null,
      console: null,
      failType: null,
      testDurationMs: null,
      runDurationMs: null,
      completedAt: null,
    };

    const defaultStats = {
      pending: 0,
      tests: 1,
      suites: 1,
      start: undefined,
      end: undefined,
      duration: null,
    };

    let buckets = [] as any;

    const failingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ minutes: 5 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    buckets = Stats.incrementBuckets(buckets, failingRecord, BUCKET_SIZE.DAY);

    const anotherFailingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ minutes: 10 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    buckets = Stats.incrementBuckets(buckets, anotherFailingRecord, BUCKET_SIZE.DAY);

    expect(buckets).to.eql([
      {
        start: new Date('2018-01-02T00:00:00.000Z'),
        end: new Date('2018-01-02T23:59:59.999Z'),
        runs: {
          availability: 0,
          passes: 0,
          failures: 2,
          total: 2,
        },
        tests: {
          availability: 0,
          passes: 0,
          failures: 2,
          total: 2,
        },
      },
    ]);
  });

  it('increment existing buckets and add bucket', () => {
    const curDate = DateTime.fromISO('2018-01-02T00:00:00.000Z').toUTC();

    const defaultRunRecord = {
      id: 'foo-id',
      status: RUN_STATUS.CREATED,
      routineId: 'routine-id',
      projectId: 'project-id',
      events: [],
      runId: 'foo-id',
      type: RUN_TYPE.MANUAL,
      stats: null,
      console: null,
      failType: null,
      testDurationMs: null,
      runDurationMs: null,
      completedAt: null,
    };

    const defaultStats = {
      pending: 0,
      tests: 1,
      suites: 1,
      start: undefined,
      end: undefined,
      duration: null,
    };

    let buckets = [] as any;

    const failingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ minutes: 5 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    buckets = Stats.incrementBuckets(buckets, failingRecord, BUCKET_SIZE.DAY);

    const anotherFailingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ days: 1 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    buckets = Stats.incrementBuckets(buckets, anotherFailingRecord, BUCKET_SIZE.DAY);

    expect(buckets).to.eql([
      {
        start: new Date('2018-01-02T00:00:00.000Z'),
        end: new Date('2018-01-02T23:59:59.999Z'),
        runs: {
          availability: 0,
          passes: 0,
          failures: 1,
          total: 1,
        },
        tests: {
          availability: 0,
          passes: 0,
          failures: 1,
          total: 1,
        },
      },
      {
        start: new Date('2018-01-03T00:00:00.000Z'),
        end: new Date('2018-01-03T23:59:59.999Z'),
        runs: {
          availability: 0,
          passes: 0,
          failures: 1,
          total: 1,
        },
        tests: {
          availability: 0,
          passes: 0,
          failures: 1,
          total: 1,
        },
      },
    ]);
  });
});

describe('stats timeline unit tests', () => {
  it('get timeline event status', () => {
    expect(Stats.getTimelineEventStatus({ stats: { passes: 0, failures: 0 }, timeoutType: RUN_TIMEOUT_TYPE.REPORTER } as any)).to.eql(
      TIMELINE_EVENT_STATUS.TIMEOUT
    );
    expect(Stats.getTimelineEventStatus({ stats: { passes: 0, failures: 0 } } as any)).to.eql(TIMELINE_EVENT_STATUS.UNKNOWN);
    expect(Stats.getTimelineEventStatus({ stats: { passes: 1, failures: 0 } } as any)).to.eql(TIMELINE_EVENT_STATUS.UP);
    expect(Stats.getTimelineEventStatus({ stats: { passes: 0, failures: 1 } } as any)).to.eql(TIMELINE_EVENT_STATUS.DOWN);
    expect(Stats.getTimelineEventStatus({ stats: { passes: 1, failures: 1 } } as any)).to.eql(TIMELINE_EVENT_STATUS.IMPAIRED);
  });

  it('increment timeline event', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');

    const defaultRunRecord = {
      id: 'foo-id',
      status: RUN_STATUS.CREATED,
      routineId: 'routine-id',
      projectId: 'project-id',
      results: [],
      runId: 'foo-id',
      type: RUN_TYPE.MANUAL,
      stats: null,
      console: null,
      failType: null,
      testDurationMs: null,
      runDurationMs: null,
      timeoutType: null,
      completedAt: null,
    };

    const defaultStats = {
      pending: 0,
      tests: 1,
      suites: 1,
      start: undefined,
      end: undefined,
      duration: null,
    };

    const events = [
      {
        end: curDate.toJSDate(),
        start: curDate.toJSDate(),
        status: TIMELINE_EVENT_STATUS.DOWN,
        durationSec: 0,
        records: [],
      },
    ];

    const failingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ minutes: 5 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    Stats.incrementTimelineEvent(events, failingRecord);
    expect(events).to.eql([
      {
        status: TIMELINE_EVENT_STATUS.DOWN,
        start: curDate.toJSDate(),
        end: curDate.plus({ minutes: 5 }).toJSDate(),
        durationSec: 300,
        records: [failingRecord],
      },
    ]);

    const passingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 1, failures: 0 },
      completedAt: curDate.plus({ minutes: 10 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    Stats.incrementTimelineEvent(events as any, passingRecord);
    expect(events).to.eql([
      {
        status: TIMELINE_EVENT_STATUS.UP,
        durationSec: 0,
        start: curDate.plus({ minutes: 10 }).toJSDate(),
        end: curDate.plus({ minutes: 10 }).toJSDate(),
        records: [passingRecord],
      },
      {
        status: TIMELINE_EVENT_STATUS.DOWN,
        start: curDate.toJSDate(),
        end: curDate.plus({ minutes: 10 }).toJSDate(),
        durationSec: 600,
        records: [failingRecord],
      },
    ]);
  });

  it('drop out of order timeline events', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');

    const defaultRunRecord = {
      id: 'foo-id',
      status: RUN_STATUS.CREATED,
      routineId: 'routine-id',
      projectId: 'project-id',
      results: [],
      runId: 'foo-id',
      type: RUN_TYPE.MANUAL,
      stats: null,
      console: null,
      failType: null,
      error: null,
      testDurationMs: null,
      runDurationMs: null,
      timeoutType: null,
      completedAt: null,
    };

    const defaultStats = {
      pending: 0,
      tests: 1,
      suites: 1,
      start: undefined,
      end: undefined,
      duration: null,
    };

    const events = [
      {
        end: curDate.toJSDate(),
        start: curDate.toJSDate(),
        status: TIMELINE_EVENT_STATUS.DOWN,
        durationSec: 0,
        records: [],
      },
    ];

    const failingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 0, failures: 1 },
      completedAt: curDate.plus({ minutes: 5 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    Stats.incrementTimelineEvent(events, failingRecord);
    expect(events).to.eql([
      {
        status: TIMELINE_EVENT_STATUS.DOWN,
        start: curDate.toJSDate(),
        end: curDate.plus({ minutes: 5 }).toJSDate(),
        durationSec: 300,
        records: [failingRecord],
      },
    ]);

    const passingRecord = {
      ...defaultRunRecord,
      stats: { ...defaultStats, passes: 1, failures: 0 },
      completedAt: curDate.minus({ minutes: 10 }).toJSDate(),
      runDurationMs: 0,
    } as any;

    Stats.incrementTimelineEvent(events as any, passingRecord);
    expect(events).to.eql([
      {
        status: TIMELINE_EVENT_STATUS.DOWN,
        start: curDate.toJSDate(),
        end: curDate.plus({ minutes: 5 }).toJSDate(),
        durationSec: 300,
        records: [failingRecord],
      },
    ]);
  });

  it('get timeline', () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z');

    const defaultRunRecord = {
      id: 'rs-run-id',
      status: RUN_STATUS.PASSED,
      projectId: 'project-id',
      routineId: 'routine-id',
      runId: 'rn-run-id',
      type: RUN_TYPE.MANUAL,
      runDurationMs: 0,
      testDurationMs: 0,
      console: null,
      failType: null,
      timeoutType: null,
      error: null,
      stats: {
        duration: null,
        end: undefined,
        suites: 3,
        tests: 5,
        passes: 3,
        pending: 0,
        failures: 0,
        start: curDate.toJSDate(),
      },
      results: [],
      createdAt: curDate.toJSDate(),
      updatedAt: curDate.toJSDate(),
    };

    const runRecords: CompletedRunRecordInterface[] = [
      {
        ...defaultRunRecord,
        completedAt: curDate.minus({ week: 1 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ day: 2 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        stats: {
          duration: null,
          end: undefined,
          suites: 3,
          tests: 5,
          passes: 3,
          pending: 0,
          failures: 1,
          start: curDate.toJSDate(),
        },
        completedAt: curDate.plus({ day: 3 }).toJSDate(),
      },
      {
        ...defaultRunRecord,
        completedAt: curDate.plus({ day: 4 }).toJSDate(),
      },
    ];

    const events = Stats.timelineRecords(runRecords, curDate.toJSDate(), curDate.plus({ day: 5 }).toJSDate());

    const expected = [
      {
        start: curDate.plus({ day: 4 }).toJSDate(),
        end: curDate.plus({ day: 4 }).toJSDate(),
        status: 'up',
        durationSec: 0,
      },
      {
        start: curDate.plus({ day: 3 }).toJSDate(),
        end: curDate.plus({ day: 4 }).toJSDate(),
        status: 'impaired',
        durationSec: 86400,
      },
      {
        start: curDate.plus({ day: 2 }).toJSDate(),
        end: curDate.plus({ day: 3 }).toJSDate(),
        status: 'up',
        durationSec: 86400,
      },
    ];
    expect(events.map(({ records, ...rest }) => rest)).to.eql(expected);
  });
});
