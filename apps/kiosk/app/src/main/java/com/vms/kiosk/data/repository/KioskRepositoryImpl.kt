package com.vms.kiosk.data.repository

import android.content.Context
import android.util.Log
import com.vms.kiosk.data.local.KioskDatabase
import com.vms.kiosk.data.model.*
import com.vms.kiosk.data.remote.KioskApiService
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min
import kotlin.math.pow
import kotlin.random.Random

@Singleton
class KioskRepositoryImpl @Inject constructor(
    private val context: Context,
    private val database: KioskDatabase,
    private val apiService: KioskApiService,
    private val telemetryRepository: TelemetryRepository
) : KioskRepository {

    companion object {
        private const val TAG = "KioskRepository"
        private const val MAX_RETRY_ATTEMPTS = 5
        private const val BASE_DELAY_MS = 1000L
        private const val MAX_DELAY_MS = 30000L
    }

    override suspend fun submitVisit(visit: Visit): Result<Visit> {
        return try {
            val response = apiService.submitVisit(visit)
            if (response.isSuccessful) {
                response.body()?.let { submittedVisit ->
                    // Remove from offline queue if it was queued
                    database.visitDao().deleteByTempId(visit.id)
                    Result.success(submittedVisit)
                } ?: Result.failure(Exception("Empty response body"))
            } else {
                // If network fails, queue offline
                queueVisitOffline(visit)
                Result.failure(Exception("Network error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to submit visit", e)
            // Queue offline and return failure
            queueVisitOffline(visit)
            Result.failure(e)
        }
    }

    override suspend fun queueVisitOffline(visit: Visit): Result<Unit> {
        return try {
            val offlineVisit = visit.copy(
                status = VisitStatus.PENDING_SYNC,
                metadata = visit.metadata + ("queued_at" to System.currentTimeMillis().toString())
            )
            database.visitDao().insert(offlineVisit.toEntity())
            
            telemetryRepository.logEvent(
                "visit_queued_offline",
                mapOf(
                    "visit_id" to visit.id,
                    "reason" to "network_failure"
                )
            )
            
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to queue visit offline", e)
            telemetryRepository.logError("offline_queue_failed", e)
            Result.failure(e)
        }
    }

    override suspend fun syncPendingVisits(): Result<Int> {
        return try {
            val pendingVisits = database.visitDao().getPendingSync()
            var syncedCount = 0
            var failedCount = 0

            for (visitEntity in pendingVisits) {
                val visit = visitEntity.toModel()
                val result = submitVisitWithRetry(visit)
                
                result.fold(
                    onSuccess = { 
                        database.visitDao().delete(visitEntity)
                        syncedCount++
                        
                        telemetryRepository.logEvent(
                            "visit_synced",
                            mapOf(
                                "visit_id" to visit.id,
                                "sync_attempt" to "success"
                            )
                        )
                    },
                    onFailure = { error ->
                        failedCount++
                        
                        telemetryRepository.logEvent(
                            "visit_sync_failed",
                            mapOf(
                                "visit_id" to visit.id,
                                "error" to error.message,
                                "retry_count" to visitEntity.retryCount.toString()
                            )
                        )
                        
                        // Update retry count
                        database.visitDao().updateRetryCount(
                            visitEntity.id,
                            visitEntity.retryCount + 1
                        )
                        
                        // If max retries exceeded, mark as failed
                        if (visitEntity.retryCount >= MAX_RETRY_ATTEMPTS) {
                            database.visitDao().updateStatus(
                                visitEntity.id,
                                VisitStatus.SYNC_FAILED.name
                            )
                            
                            telemetryRepository.logError(
                                "visit_sync_max_retries_exceeded",
                                Exception("Max retries exceeded for visit ${visit.id}")
                            )
                        }
                    }
                )
            }

            telemetryRepository.logEvent(
                "sync_completed",
                mapOf(
                    "synced_count" to syncedCount.toString(),
                    "failed_count" to failedCount.toString(),
                    "total_pending" to pendingVisits.size.toString()
                )
            )

            Result.success(syncedCount)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sync pending visits", e)
            telemetryRepository.logError("sync_failed", e)
            Result.failure(e)
        }
    }

    private suspend fun submitVisitWithRetry(
        visit: Visit,
        attempt: Int = 1
    ): Result<Visit> {
        return try {
            val response = apiService.submitVisit(visit)
            if (response.isSuccessful) {
                response.body()?.let { submittedVisit ->
                    Result.success(submittedVisit)
                } ?: Result.failure(Exception("Empty response body"))
            } else {
                if (attempt < MAX_RETRY_ATTEMPTS && isRetryableError(response.code())) {
                    val delayMs = calculateBackoffDelay(attempt)
                    Log.d(TAG, "Retrying visit submission in ${delayMs}ms (attempt $attempt)")
                    delay(delayMs)
                    submitVisitWithRetry(visit, attempt + 1)
                } else {
                    Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            if (attempt < MAX_RETRY_ATTEMPTS && isRetryableException(e)) {
                val delayMs = calculateBackoffDelay(attempt)
                Log.d(TAG, "Retrying visit submission in ${delayMs}ms (attempt $attempt)", e)
                delay(delayMs)
                submitVisitWithRetry(visit, attempt + 1)
            } else {
                Result.failure(e)
            }
        }
    }

    private fun calculateBackoffDelay(attempt: Int): Long {
        val exponentialDelay = BASE_DELAY_MS * (2.0.pow(attempt - 1)).toLong()
        val jitter = Random.nextLong(0, BASE_DELAY_MS / 2)
        return min(exponentialDelay + jitter, MAX_DELAY_MS)
    }

    private fun isRetryableError(httpCode: Int): Boolean {
        return when (httpCode) {
            in 500..599 -> true // Server errors
            408 -> true // Request timeout
            429 -> true // Too many requests
            else -> false
        }
    }

    private fun isRetryableException(exception: Exception): Boolean {
        return when (exception) {
            is java.net.SocketTimeoutException -> true
            is java.net.ConnectException -> true
            is java.net.UnknownHostException -> true
            is javax.net.ssl.SSLException -> false // Don't retry SSL errors
            else -> false
        }
    }

    override suspend fun getPendingVisits(): List<Visit> {
        return try {
            database.visitDao().getPendingSync().map { it.toModel() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get pending visits", e)
            emptyList()
        }
    }

    override fun getHosts(): Flow<List<Host>> {
        return flow {
            try {
                val response = apiService.getHosts()
                if (response.isSuccessful) {
                    response.body()?.let { hosts ->
                        emit(hosts)
                    } ?: emit(emptyList())
                } else {
                    // Fallback to cached hosts
                    val cachedHosts = database.hostDao().getAll().map { it.toModel() }
                    emit(cachedHosts)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get hosts", e)
                // Fallback to cached hosts
                val cachedHosts = database.hostDao().getAll().map { it.toModel() }
                emit(cachedHosts)
            }
        }
    }

    override suspend fun getKioskConfig(): KioskConfig? {
        return try {
            val configEntity = database.configDao().getConfig()
            configEntity?.toModel()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get kiosk config", e)
            null
        }
    }

    override suspend fun saveKioskConfig(config: KioskConfig): Result<Unit> {
        return try {
            database.configDao().insertOrUpdate(config.toEntity())
            
            telemetryRepository.logEvent(
                "config_saved",
                mapOf(
                    "device_id" to config.deviceId,
                    "location_id" to config.locationId,
                    "organization_id" to config.organizationId
                )
            )
            
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save kiosk config", e)
            telemetryRepository.logError("config_save_failed", e)
            Result.failure(e)
        }
    }

    override suspend fun processQRCode(qrData: String): Result<KioskConfig> {
        return try {
            // Parse QR code data (assuming JSON format)
            val configData = parseQRData(qrData)
            
            // Validate with server
            val response = apiService.validateKioskSetup(
                deviceId = configData.deviceId,
                setupToken = configData.setupToken
            )
            
            if (response.isSuccessful) {
                response.body()?.let { config ->
                    // Save config locally
                    saveKioskConfig(config)
                    Result.success(config)
                } ?: Result.failure(Exception("Invalid server response"))
            } else {
                Result.failure(Exception("Setup validation failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process QR code", e)
            telemetryRepository.logError("qr_processing_failed", e)
            Result.failure(e)
        }
    }

    override suspend fun validateManualSetup(
        serverUrl: String,
        deviceId: String,
        locationId: String
    ): Result<KioskConfig> {
        return try {
            // Update API service base URL
            apiService.updateBaseUrl(serverUrl)
            
            val response = apiService.validateManualSetup(
                deviceId = deviceId,
                locationId = locationId
            )
            
            if (response.isSuccessful) {
                response.body()?.let { config ->
                    // Save config locally
                    saveKioskConfig(config)
                    Result.success(config)
                } ?: Result.failure(Exception("Invalid server response"))
            } else {
                Result.failure(Exception("Manual setup validation failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to validate manual setup", e)
            telemetryRepository.logError("manual_setup_failed", e)
            Result.failure(e)
        }
    }

    override suspend fun sendHeartbeat(): Result<Unit> {
        return try {
            val config = getKioskConfig()
            if (config == null) {
                return Result.failure(Exception("No kiosk config found"))
            }

            val heartbeat = HeartbeatData(
                deviceId = config.deviceId,
                timestamp = System.currentTimeMillis(),
                status = "ONLINE",
                version = getAppVersion(),
                pendingVisitsCount = getPendingVisits().size
            )

            val response = apiService.sendHeartbeat(heartbeat)
            if (response.isSuccessful) {
                telemetryRepository.logEvent(
                    "heartbeat_sent",
                    mapOf(
                        "device_id" to config.deviceId,
                        "pending_visits" to heartbeat.pendingVisitsCount.toString()
                    )
                )
                Result.success(Unit)
            } else {
                Result.failure(Exception("Heartbeat failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send heartbeat", e)
            telemetryRepository.logError("heartbeat_failed", e)
            Result.failure(e)
        }
    }

    private fun parseQRData(qrData: String): QRConfigData {
        // Parse QR code JSON data
        // This is a simplified implementation
        return QRConfigData(
            deviceId = "parsed_device_id",
            setupToken = "parsed_setup_token",
            serverUrl = "https://api.vms.example.com"
        )
    }

    private fun getAppVersion(): String {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName ?: "unknown"
        } catch (e: Exception) {
            "unknown"
        }
    }

    // Extension functions for entity conversion
    private fun Visit.toEntity(): VisitEntity {
        return VisitEntity(
            id = this.id,
            locationId = this.locationId,
            purpose = this.purpose.name,
            firstName = this.firstName,
            lastName = this.lastName,
            email = this.email,
            company = this.company,
            status = this.status.name,
            photoUri = this.photoUri,
            qrCode = this.qrCode,
            metadata = this.metadata.toString(),
            retryCount = 0,
            createdAt = System.currentTimeMillis()
        )
    }

    private fun VisitEntity.toModel(): Visit {
        return Visit(
            id = this.id,
            locationId = this.locationId,
            purpose = VisitPurpose.valueOf(this.purpose),
            firstName = this.firstName,
            lastName = this.lastName,
            email = this.email,
            company = this.company,
            status = VisitStatus.valueOf(this.status),
            photoUri = this.photoUri,
            qrCode = this.qrCode,
            metadata = parseMetadata(this.metadata)
        )
    }

    private fun KioskConfig.toEntity(): KioskConfigEntity {
        return KioskConfigEntity(
            id = 1, // Single config
            deviceId = this.deviceId,
            locationId = this.locationId,
            locationName = this.locationName,
            organizationId = this.organizationId,
            organizationName = this.organizationName,
            serverUrl = this.serverUrl,
            theme = this.theme,
            language = this.language,
            features = this.features.toString(),
            lastUpdated = System.currentTimeMillis()
        )
    }

    private fun KioskConfigEntity.toModel(): KioskConfig {
        return KioskConfig(
            deviceId = this.deviceId,
            locationId = this.locationId,
            locationName = this.locationName,
            organizationId = this.organizationId,
            organizationName = this.organizationName,
            serverUrl = this.serverUrl,
            theme = this.theme,
            language = this.language,
            features = parseFeatures(this.features)
        )
    }

    private fun parseMetadata(metadataString: String): Map<String, String> {
        return try {
            // Parse JSON string to map
            emptyMap() // Simplified implementation
        } catch (e: Exception) {
            emptyMap()
        }
    }

    private fun parseFeatures(featuresString: String): Map<String, Boolean> {
        return try {
            // Parse JSON string to map
            emptyMap() // Simplified implementation
        } catch (e: Exception) {
            emptyMap()
        }
    }
}

data class QRConfigData(
    val deviceId: String,
    val setupToken: String,
    val serverUrl: String
)

data class HeartbeatData(
    val deviceId: String,
    val timestamp: Long,
    val status: String,
    val version: String,
    val pendingVisitsCount: Int
)