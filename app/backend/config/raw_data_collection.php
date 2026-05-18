<?php

return [
  'max_cameras_per_node' => (int) env('RAW_DATA_COLLECTION_MAX_CAMERAS_PER_NODE', 50),
  'max_dispatch_per_tick' => (int) env('RAW_DATA_COLLECTION_MAX_DISPATCH_PER_TICK', 10),
  'max_active_jobs' => (int) env('RAW_DATA_COLLECTION_MAX_ACTIVE_JOBS', 10),
  'capture_job_lock_ttl_seconds' => (int) env('RAW_DATA_COLLECTION_CAPTURE_JOB_LOCK_TTL_SECONDS', 120),
  'interval_due_cache_ttl_floor_seconds' => (int) env('RAW_DATA_COLLECTION_INTERVAL_DUE_CACHE_TTL_FLOOR_SECONDS', 60),
  'active_jobs_counter_cache_key' => (string) env('RAW_DATA_COLLECTION_ACTIVE_JOBS_COUNTER_CACHE_KEY', 'raw-data-collection:active-jobs'),
];
