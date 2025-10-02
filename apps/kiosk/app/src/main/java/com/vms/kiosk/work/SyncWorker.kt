package com.vms.kiosk.work

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.data.repository.TelemetryRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val kioskRepository: KioskRepository,
    private val telemetryRepository: TelemetryRepository
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            // Sync pending visits
            val syncResult = kioskRepository.syncPendingVisits()
            
            if (syncResult.isSuccess) {
                val syncedCount = syncResult.getOrDefault(0)
                telemetryRepository.recordSyncEvent("visits_synced", syncedCount)
                
                // Send heartbeat
                telemetryRepository.sendHeartbeat()
                
                Result.success()
            } else {
                // Retry with exponential backoff
                Result.retry()
            }
        } catch (e: Exception) {
            telemetryRepository.recordError("sync_worker_error", e.message ?: "Unknown error")
            Result.failure()
        }
    }

    companion object {
        const val WORK_NAME = "sync_work"
        
        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    syncRequest
                )
        }
    }
}