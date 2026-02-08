import { router as baselineRouter } from './baseline.js';
import { router as snapshotRouter } from './snapshot.js';
import { router as driftRouter } from './drift.js';
import { router as ciCheckRouter } from './ciCheck.js';

export function setupRoutes(app) {
    app.use('/api/v1/baselines', baselineRouter);
    app.use('/api/v1/config-snapshots', snapshotRouter);
    app.use('/api/v1/drifts', driftRouter);
    app.use('/api/v1/ci-check', ciCheckRouter);
}
