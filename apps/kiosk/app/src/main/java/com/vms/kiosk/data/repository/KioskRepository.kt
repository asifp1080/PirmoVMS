package com.vms.kiosk.data.repository

import com.vms.kiosk.data.local.KioskDatabase
import com.vms.kiosk.data.local.entity.VisitEntity
import com.vms.kiosk.data.model.KioskConfig
import com.vms.kiosk.data.model.Visit
import com.vms.kiosk.data.remote.KioskApiService
import com.vms.kiosk.data.remote.dto.KioskSessionRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KioskRepository @Inject constructor(
    private val apiService: KioskApiService,
    private val database: KioskDatabase,
    private val preferencesRepository: PreferencesRepository
) {

    fun getKioskConfig(): Flow<KioskConfig?> = flow {
        try {
            val config = preferencesRepository.getKioskConfig()
            emit(config)
        } catch (e: Exception) {
            emit(null)
        }
    }

    suspend fun initializeKioskSession(
        deviceIdentifier: String,
        locationId: String,
        appVersion: String
    ): Result<KioskConfig> {
        return try {
            val request = KioskSessionRequest(
                deviceIdentifier = deviceIdentifier,
                locationId = locationId,
                appVersion = appVersion
            )
            
            val response = apiService.initializeSession(request)
            val config = response.toKioskConfig()
            
            // Save config locally
            preferencesRepository.saveKioskConfig(config)
            
            Result.success(config)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitVisit(visit: Visit): Result<Visit> {
        return try {
            // Try to submit online first
            val response = apiService.submitVisit(visit.toDto())
            val submittedVisit = response.toVisit()
            
            // Update local database
            database.visitDao().insert(submittedVisit.toEntity())
            
            Result.success(submittedVisit)
        } catch (e: Exception) {
            // If offline, queue for later sync
            val visitEntity = visit.copy(
                status = com.vms.kiosk.data.model.VisitStatus.PENDING
            ).toEntity()
            
            database.visitDao().insert(visitEntity)
            
            Result.failure(e)
        }
    }

    suspend fun checkOutVisit(
        visitId: String? = null,
        badgeNumber: String? = null,
        phone: String? = null
    ): Result<Visit> {
        return try {
            val response = apiService.checkOutVisit(
                visitId = visitId,
                badgeNumber = badgeNumber,
                phone = phone
            )
            
            val visit = response.toVisit()
            database.visitDao().update(visit.toEntity())
            
            Result.success(visit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPendingVisits(): List<VisitEntity> {
        return database.visitDao().getPendingVisits()
    }

    suspend fun syncPendingVisits(): Result<Int> {
        return try {
            val pendingVisits = getPendingVisits()
            var syncedCount = 0
            
            pendingVisits.forEach { visitEntity ->
                try {
                    val visit = visitEntity.toVisit()
                    val response = apiService.submitVisit(visit.toDto())
                    
                    // Update local record with server response
                    val updatedVisit = response.toVisit()
                    database.visitDao().update(updatedVisit.toEntity())
                    
                    syncedCount++
                } catch (e: Exception) {
                    // Log individual sync failures but continue
                }
            }
            
            Result.success(syncedCount)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getHosts(): List<com.vms.kiosk.data.model.Host> {
        return try {
            val response = apiService.getHosts()
            response.map { it.toHost() }
        } catch (e: Exception) {
            // Return cached hosts if available
            database.hostDao().getAllHosts().map { it.toHost() }
        }
    }

    suspend fun getAgreements(): List<com.vms.kiosk.data.model.Agreement> {
        return try {
            val response = apiService.getAgreements()
            response.map { it.toAgreement() }
        } catch (e: Exception) {
            // Return cached agreements if available
            database.agreementDao().getAllAgreements().map { it.toAgreement() }
        }
    }
}